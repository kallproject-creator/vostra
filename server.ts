import { execSync } from 'child_process';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Role = 'SPIKER' | 'SETTER' | 'BLOCKER';
type Side = 'host' | 'guest';
type ActionType = 'RECEIVE' | 'SET' | 'SPIKE' | 'BLOCK' | 'ULTIMATE';
type PoseType = 'PASS_UNDER' | 'SET' | 'SPIKE' | 'BLOCK' | 'SERVE';

interface RosterSlot {
  charId: string;
  level: number;
}

interface PlayerStatBundle {
  name: string;
  power: number;
  speed: number;
  technique: number;
  defense: number;
  auraColor: string;
  sigAction: string;
  sigName: string;
  sigBonus: number;
  secAction: string;
  secName: string;
  secBonus: number;
  ultName: string;
  ultMult: number;
}

type TeamStatsMap = Record<Role, PlayerStatBundle>;
type RosterMap = Record<Role, RosterSlot>;

interface RoomMember {
  clientId: string;
  playerName: string;
  side: Side;
  roster: RosterMap;
  teamStats: TeamStatsMap;
  ready: boolean;
  connected: boolean;
  ws: WebSocket | null;
}

interface ActiveMatch {
  phase: 'SERVE_TOSS' | 'IN_FLIGHT' | 'PROMPT' | 'CUTSCENE' | 'POINT_WAIT' | 'OVER';
  servingSide: Side;
  pScore: number; // host score
  oScore: number; // guest score
  pEnergy: number; // host energy (0..100)
  oEnergy: number; // guest energy (0..100)
  turnSide: Side | null;
  turnRole: Role | null;
  recommended: Exclude<ActionType, 'ULTIMATE'>;
  incomingPower: number;
  isUltIncoming: boolean;
  phaseTimer: NodeJS.Timeout | null;
  ballX: number;
  ballY: number;
}

interface Room {
  code: string;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  host: RoomMember;
  guest: RoomMember | null;
  winnerSide?: Side;
  rematchVotes: { host: boolean; guest: boolean };
  match: ActiveMatch | null;
  cleanupTimer: NodeJS.Timeout | null;
}

const COURT_W = 1120;
const FLOOR_Y = 442;
const GRAVITY = 880;
const TARGET_SCORE = 21;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function computeSpikeGravityTrajectory(
  fromY: number,
  toY: number,
  powerRating: number,
  isUltimate = false
): { duration: number; magnusDrop: number } {
  const powerNorm = Math.max(0, Math.min(1.45, (powerRating - 55) / 185));
  const boost = isUltimate ? 0.35 : 0;
  const effG = 680 + (powerNorm + boost) * 2150;
  const dy = Math.max(20, toY - fromY);
  const vy0 = -85 + (powerNorm + boost) * 245;
  const disc = Math.max(0, vy0 * vy0 + 2 * effG * dy);
  const duration = Math.max(0.2, Math.min(0.86, (-vy0 + Math.sqrt(disc)) / effG));
  return {
    duration,
    magnusDrop: effG - GRAVITY,
  };
}

const rooms = new Map<string, Room>();
const socketMeta = new WeakMap<WebSocket, { roomCode: string; clientId: string; side: Side }>();

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function sanitizeName(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.trim().slice(0, 18);
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeStatBundle(raw: unknown): PlayerStatBundle {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    name: typeof obj.name === 'string' ? obj.name.slice(0, 30) : 'Pemain',
    power: clamp(Number(obj.power) || 70, 40, 350),
    speed: clamp(Number(obj.speed) || 70, 40, 350),
    technique: clamp(Number(obj.technique) || 70, 40, 350),
    defense: clamp(Number(obj.defense) || 70, 40, 350),
    auraColor: typeof obj.auraColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(obj.auraColor) ? obj.auraColor : '#38BDF8',
    sigAction: typeof obj.sigAction === 'string' ? obj.sigAction : 'SPIKE',
    sigName: typeof obj.sigName === 'string' ? obj.sigName.slice(0, 40) : 'Spike Kilat',
    sigBonus: clamp(Number(obj.sigBonus) || 18, 0, 80),
    secAction: typeof obj.secAction === 'string' ? obj.secAction : 'RECEIVE',
    secName: typeof obj.secName === 'string' ? obj.secName.slice(0, 40) : 'Receive Cepat',
    secBonus: clamp(Number(obj.secBonus) || 15, 0, 80),
    ultName: typeof obj.ultName === 'string' ? obj.ultName.slice(0, 50) : 'Skyward Spike',
    ultMult: clamp(Number(obj.ultMult) || 2.1, 1.4, 3.2),
  };
}

function sanitizeRoster(raw: unknown): RosterMap {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const parseSlot = (slotRaw: unknown, defId: string): RosterSlot => {
    const s = (slotRaw && typeof slotRaw === 'object' ? slotRaw : {}) as Record<string, unknown>;
    return {
      charId: typeof s.charId === 'string' && s.charId.length > 0 ? s.charId.slice(0, 40) : defId,
      level: clamp(Math.floor(Number(s.level) || 1), 1, 99),
    };
  };
  return {
    SPIKER: parseSlot(obj.SPIKER, 'raka_pratama'),
    SETTER: parseSlot(obj.SETTER, 'bagas_setiawan'),
    BLOCKER: parseSlot(obj.BLOCKER, 'dimas_perkasa'),
  };
}

function sanitizeTeamStats(raw: unknown): TeamStatsMap {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    SPIKER: sanitizeStatBundle(obj.SPIKER),
    SETTER: sanitizeStatBundle(obj.SETTER),
    BLOCKER: sanitizeStatBundle(obj.BLOCKER),
  };
}

function generateRoomCode(): string {
  for (let attempt = 0; attempt < 25; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return `V${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

function serializeRoom(room: Room) {
  return {
    code: room.code,
    status: room.status,
    winnerSide: room.winnerSide,
    host: {
      clientId: room.host.clientId,
      playerName: room.host.playerName,
      side: 'host' as const,
      roster: room.host.roster,
      ready: room.host.ready,
      connected: room.host.connected,
    },
    guest: room.guest
      ? {
          clientId: room.guest.clientId,
          playerName: room.guest.playerName,
          side: 'guest' as const,
          roster: room.guest.roster,
          ready: room.guest.ready,
          connected: room.guest.connected,
        }
      : null,
  };
}

function sendJson(ws: WebSocket | null | undefined, payload: unknown) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(room: Room, payload: unknown) {
  sendJson(room.host.ws, payload);
  if (room.guest) sendJson(room.guest.ws, payload);
}

function getBasePos(side: Side, role: Role): { x: number; y: number } {
  if (side === 'host') {
    if (role === 'SPIKER') return { x: 245, y: FLOOR_Y - 6 };
    if (role === 'SETTER') return { x: 355, y: FLOOR_Y - 12 };
    return { x: 465, y: FLOOR_Y - 16 };
  }
  if (role === 'BLOCKER') return { x: 655, y: FLOOR_Y - 16 };
  if (role === 'SETTER') return { x: 765, y: FLOOR_Y - 12 };
  return { x: 875, y: FLOOR_Y - 6 };
}

function clearMatchTimer(match: ActiveMatch | null) {
  if (match && match.phaseTimer) {
    clearTimeout(match.phaseTimer);
    match.phaseTimer = null;
  }
}

function getMember(room: Room, side: Side): RoomMember | null {
  return side === 'host' ? room.host : room.guest;
}

function getRoleSkillBonus(stats: PlayerStatBundle, action: Exclude<ActionType, 'ULTIMATE'>): { bonus: number; skillName: string | null } {
  if (stats.sigAction === action) return { bonus: stats.sigBonus, skillName: stats.sigName };
  if (stats.secAction === action) return { bonus: stats.secBonus, skillName: stats.secName };
  return { bonus: 0, skillName: null };
}

function scheduleServeToss(room: Room) {
  const match = room.match;
  if (!match || match.phase === 'OVER') return;
  clearMatchTimer(match);

  match.phase = 'SERVE_TOSS';
  const serverX = match.servingSide === 'host' ? 115 : COURT_W - 115;
  match.ballX = serverX;
  match.ballY = FLOOR_Y - 72;

  broadcastRoom(room, {
    type: 'match_event',
    event: 'serve_toss',
    servingSide: match.servingSide,
    pScore: match.pScore,
    oScore: match.oScore,
    pEnergy: match.pEnergy,
    oEnergy: match.oEnergy,
  });

  match.phaseTimer = setTimeout(() => {
    if (!room.match || room.match.phase !== 'SERVE_TOSS') return;
    const serverMember = getMember(room, match.servingSide);
    if (!serverMember) return;
    const isHostServe = match.servingSide === 'host';
    const targetSide: Side = isHostServe ? 'guest' : 'host';
    const fromX = isHostServe ? 132 : COURT_W - 132;
    const fromY = FLOOR_Y - 132;
    const targetPos = getBasePos(targetSide, 'SPIKER');
    const serverStats = serverMember.teamStats.SPIKER;
    const power = serverStats.power * 0.85 + 20;

    launchMatchBall(room, {
      actorSide: match.servingSide,
      actorRole: 'SPIKER',
      pose: 'SERVE',
      fromX,
      fromY,
      toX: targetPos.x,
      toY: FLOOR_Y - 46,
      flightDur: 1.08,
      magnusDrop: 40,
      shotColor: '#38BDF8',
      isUltimateShot: false,
      targetSide,
      targetRole: 'SPIKER',
      nextAction: 'RECEIVE',
      incomingPower: power,
      isUltIncoming: false,
      netShake: 0,
      shake: 4,
    });
  }, 720);
}

interface LaunchConfig {
  actorSide: Side;
  actorRole: Role;
  pose: PoseType;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  flightDur: number;
  magnusDrop: number;
  shotColor: string;
  isUltimateShot: boolean;
  targetSide: Side;
  targetRole: Role;
  nextAction: Exclude<ActionType, 'ULTIMATE'>;
  incomingPower: number;
  isUltIncoming: boolean;
  netShake: number;
  shake: number;
  callout?: { text: string; subtext: string; side: Side; color: string };
}

function launchMatchBall(room: Room, cfg: LaunchConfig) {
  const match = room.match;
  if (!match || match.phase === 'OVER') return;
  clearMatchTimer(match);

  match.phase = 'IN_FLIGHT';
  match.ballX = cfg.toX;
  match.ballY = cfg.toY;
  match.incomingPower = cfg.incomingPower;
  match.isUltIncoming = cfg.isUltIncoming;

  broadcastRoom(room, {
    type: 'match_event',
    event: 'ball_launch',
    ...cfg,
    pEnergy: match.pEnergy,
    oEnergy: match.oEnergy,
  });

  match.phaseTimer = setTimeout(() => {
    if (!room.match || room.match.phase !== 'IN_FLIGHT') return;
    match.phase = 'PROMPT';
    match.turnSide = cfg.targetSide;
    match.turnRole = cfg.targetRole;
    match.recommended = cfg.nextAction;

    const timeLimit = 3.8;
    broadcastRoom(room, {
      type: 'match_event',
      event: 'prompt_turn',
      turnSide: cfg.targetSide,
      role: cfg.targetRole,
      recommended: cfg.nextAction,
      timeLimit,
      incomingPower: cfg.incomingPower,
      isUltIncoming: cfg.isUltIncoming,
    });

    match.phaseTimer = setTimeout(() => {
      if (!room.match || room.match.phase !== 'PROMPT') return;
      const winner: Side = cfg.targetSide === 'host' ? 'guest' : 'host';
      awardMatchPoint(room, winner, 'Terlambat bereaksi — bola jatuh di lapangan!', cfg.toX, FLOOR_Y - 8);
    }, timeLimit * 1000);
  }, Math.round(cfg.flightDur * 1000));
}

function awardMatchPoint(room: Room, scoringSide: Side, reason: string, burstX: number, burstY: number) {
  const match = room.match;
  if (!match || match.phase === 'OVER') return;
  clearMatchTimer(match);

  if (scoringSide === 'host') {
    match.pScore += 1;
  } else {
    match.oScore += 1;
  }
  match.pEnergy = Math.min(100, match.pEnergy + 12);
  match.oEnergy = Math.min(100, match.oEnergy + 12);
  match.servingSide = scoringSide;
  match.turnSide = null;
  match.turnRole = null;

  const burstColor = scoringSide === 'host' ? '#38BDF8' : '#FB7185';
  broadcastRoom(room, {
    type: 'match_event',
    event: 'point_scored',
    scoringSide,
    pScore: match.pScore,
    oScore: match.oScore,
    pEnergy: match.pEnergy,
    oEnergy: match.oEnergy,
    reason,
    burstX,
    burstY,
    burstColor,
  });

  if (match.pScore >= TARGET_SCORE || match.oScore >= TARGET_SCORE) {
    match.phase = 'OVER';
    room.status = 'FINISHED';
    room.winnerSide = match.pScore >= TARGET_SCORE ? 'host' : 'guest';
    room.rematchVotes = { host: false, guest: false };

    match.phaseTimer = setTimeout(() => {
      broadcastRoom(room, {
        type: 'match_event',
        event: 'match_over',
        winnerSide: room.winnerSide,
        pScore: match.pScore,
        oScore: match.oScore,
        reason,
      });
      broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
    }, 950);
    return;
  }

  match.phase = 'POINT_WAIT';
  match.phaseTimer = setTimeout(() => {
    scheduleServeToss(room);
  }, 1300);
}

function handleMatchPlayerAction(room: Room, side: Side, action: ActionType) {
  const match = room.match;
  if (!match || match.phase !== 'PROMPT' || match.turnSide !== side || !match.turnRole) return;

  const actorMember = getMember(room, side);
  const otherSide: Side = side === 'host' ? 'guest' : 'host';
  const otherMember = getMember(room, otherSide);
  if (!actorMember || !otherMember) return;

  const role = match.turnRole;
  const actorStats = actorMember.teamStats[role];
  const actorSlot = actorMember.roster[role];
  const actorPos = getBasePos(side, role);
  const mySetterPos = getBasePos(side, 'SETTER');
  const mySpikerPos = getBasePos(side, 'SPIKER');
  const oppSpikerPos = getBasePos(otherSide, 'SPIKER');
  const oppBlockerPos = getBasePos(otherSide, 'BLOCKER');
  const isHost = side === 'host';

  const currentEnergy = isHost ? match.pEnergy : match.oEnergy;

  if (action === 'ULTIMATE') {
    if (currentEnergy < 100) return;
    clearMatchTimer(match);
    match.phase = 'CUTSCENE';
    match.turnSide = null;
    if (isHost) match.pEnergy = 0;
    else match.oEnergy = 0;

    const ultPower = actorStats.power * actorStats.ultMult * 1.35;
    broadcastRoom(room, {
      type: 'match_event',
      event: 'ultimate_cutscene',
      actorSide: side,
      actorRole: role,
      charId: actorSlot.charId,
      pendingAttackPower: ultPower,
      pEnergy: match.pEnergy,
      oEnergy: match.oEnergy,
    });

    match.phaseTimer = setTimeout(() => {
      if (!room.match || room.match.phase !== 'CUTSCENE') return;
      const toX = isHost ? 865 : 255;
      const fromY = FLOOR_Y - 175;
      const toY = FLOOR_Y - 38;
      const traj = computeSpikeGravityTrajectory(fromY, toY, ultPower, true);
      launchMatchBall(room, {
        actorSide: side,
        actorRole: role,
        pose: 'SPIKE',
        fromX: isHost ? 465 : COURT_W - 465,
        fromY,
        toX,
        toY,
        flightDur: traj.duration,
        magnusDrop: traj.magnusDrop,
        shotColor: actorStats.auraColor,
        isUltimateShot: true,
        targetSide: otherSide,
        targetRole: 'SPIKER',
        nextAction: 'RECEIVE',
        incomingPower: ultPower,
        isUltIncoming: true,
        netShake: 1,
        shake: 16,
        callout: {
          text: actorStats.ultName,
          subtext: `${actorStats.name} melepaskan Ultimate!`,
          side,
          color: actorStats.auraColor,
        },
      });
    }, 3150);
    return;
  }

  clearMatchTimer(match);
  const { bonus: skillBonus, skillName } = getRoleSkillBonus(actorStats, action);
  const mismatchPenalty = match.recommended !== action ? 0.65 : 1.0;
  const addEnergy = (amt: number) => {
    if (isHost) match.pEnergy = Math.min(100, match.pEnergy + amt);
    else match.oEnergy = Math.min(100, match.oEnergy + amt);
  };

  if (action === 'RECEIVE') {
    const defPower = (actorStats.defense + skillBonus) * mismatchPenalty;
    const failChance = match.isUltIncoming
      ? clamp((match.incomingPower - defPower * 1.1) / 170, 0.28, 0.85)
      : clamp((match.incomingPower - defPower * 1.2) / 140, 0.04, 0.68);

    if (Math.random() < failChance) {
      awardMatchPoint(
        room,
        otherSide,
        match.isUltIncoming
          ? `Ultimate ${otherMember.teamStats.SPIKER.name} menghancurkan pertahanan!`
          : `Pukulan ${otherMember.teamStats.SPIKER.name} menembus receive!`,
        actorPos.x,
        FLOOR_Y - 12
      );
      return;
    }

    addEnergy(14);
    launchMatchBall(room, {
      actorSide: side,
      actorRole: role,
      pose: 'PASS_UNDER',
      fromX: actorPos.x,
      fromY: FLOOR_Y - 46,
      toX: mySetterPos.x,
      toY: FLOOR_Y - 76,
      flightDur: 0.66,
      magnusDrop: 0,
      shotColor: actorStats.auraColor,
      isUltimateShot: false,
      targetSide: side,
      targetRole: 'SETTER',
      nextAction: 'SET',
      incomingPower: 40,
      isUltIncoming: false,
      netShake: 0,
      shake: 3,
      callout: skillName
        ? { text: skillName, subtext: `${actorStats.name} menyelamatkan bola!`, side, color: actorStats.auraColor }
        : undefined,
    });
  } else if (action === 'SET') {
    addEnergy(16);
    launchMatchBall(room, {
      actorSide: side,
      actorRole: role,
      pose: 'SET',
      fromX: actorPos.x,
      fromY: FLOOR_Y - 78,
      toX: mySpikerPos.x + (isHost ? 35 : -35),
      toY: FLOOR_Y - 155,
      flightDur: 0.64,
      magnusDrop: -15,
      shotColor: actorStats.auraColor,
      isUltimateShot: false,
      targetSide: side,
      targetRole: 'SPIKER',
      nextAction: 'SPIKE',
      incomingPower: (actorStats.technique + skillBonus) * 0.4,
      isUltIncoming: false,
      netShake: 0,
      shake: 2,
      callout: skillName
        ? { text: skillName, subtext: `Umpan matang dari ${actorStats.name}!`, side, color: actorStats.auraColor }
        : undefined,
    });
  } else if (action === 'SPIKE') {
    addEnergy(20);
    const attackPower = (actorStats.power + actorStats.technique * 0.4 + skillBonus) * mismatchPenalty;
    const oppGoesBlock = Math.random() < 0.42;
    const targetRole: Role = oppGoesBlock ? 'BLOCKER' : 'SPIKER';
    const targetPos = oppGoesBlock ? oppBlockerPos : oppSpikerPos;
    const fromY = FLOOR_Y - 155;
    const toY = oppGoesBlock ? FLOOR_Y - 135 : FLOOR_Y - 42;
    const traj = computeSpikeGravityTrajectory(fromY, toY, attackPower, false);
    const blockDur = Math.max(0.24, 0.56 - Math.min(1.4, Math.max(0, (attackPower - 55) / 185)) * 0.18);

    launchMatchBall(room, {
      actorSide: side,
      actorRole: role,
      pose: 'SPIKE',
      fromX: mySpikerPos.x + (isHost ? 40 : -40),
      fromY,
      toX: targetPos.x,
      toY,
      flightDur: oppGoesBlock ? blockDur : traj.duration,
      magnusDrop: oppGoesBlock ? 420 : traj.magnusDrop,
      shotColor: actorStats.auraColor,
      isUltimateShot: false,
      targetSide: otherSide,
      targetRole,
      nextAction: oppGoesBlock ? 'BLOCK' : 'RECEIVE',
      incomingPower: attackPower,
      isUltIncoming: false,
      netShake: 0.45,
      shake: 9,
      callout: skillName
        ? { text: skillName, subtext: `${actorStats.name} melepas spike!`, side, color: actorStats.auraColor }
        : undefined,
    });
  } else if (action === 'BLOCK') {
    const blockPower = (actorStats.defense + actorStats.power * 0.4 + skillBonus) * mismatchPenalty;
    const blockSuccess = clamp(0.45 + (blockPower - match.incomingPower) / 140, 0.22, 0.85);

    if (Math.random() < blockSuccess) {
      addEnergy(22);
      if (Math.random() < 0.45) {
        awardMatchPoint(
          room,
          side,
          `MONSTER BLOCK! ${actorStats.name} menutup spike lawan!`,
          actorPos.x + (isHost ? 35 : -35),
          FLOOR_Y - 20
        );
        return;
      }

      launchMatchBall(room, {
        actorSide: side,
        actorRole: 'BLOCKER',
        pose: 'BLOCK',
        fromX: actorPos.x + (isHost ? 20 : -20),
        fromY: FLOOR_Y - 138,
        toX: oppSpikerPos.x,
        toY: FLOOR_Y - 48,
        flightDur: 0.74,
        magnusDrop: 95,
        shotColor: actorStats.auraColor,
        isUltimateShot: false,
        targetSide: otherSide,
        targetRole: 'SPIKER',
        nextAction: 'RECEIVE',
        incomingPower: blockPower * 0.85,
        isUltIncoming: false,
        netShake: 0.9,
        shake: 10,
        callout: {
          text: skillName || 'Tembok Besi',
          subtext: `${actorStats.name} memblok balik bola!`,
          side,
          color: actorStats.auraColor,
        },
      });
    } else {
      awardMatchPoint(
        room,
        otherSide,
        `Blok ${actorStats.name} ditembus spike keras!`,
        actorPos.x,
        FLOOR_Y - 12
      );
    }
  }
}

function startNewMatch(room: Room) {
  if (!room.guest) return;
  if (room.match) clearMatchTimer(room.match);

  const servingSide: Side = Math.random() > 0.5 ? 'host' : 'guest';
  room.status = 'PLAYING';
  room.winnerSide = undefined;
  room.rematchVotes = { host: false, guest: false };
  room.match = {
    phase: 'SERVE_TOSS',
    servingSide,
    pScore: 0,
    oScore: 0,
    pEnergy: 25,
    oEnergy: 25,
    turnSide: null,
    turnRole: null,
    recommended: 'RECEIVE',
    incomingPower: 60,
    isUltIncoming: false,
    phaseTimer: null,
    ballX: 115,
    ballY: FLOOR_Y - 72,
  };

  broadcastRoom(room, {
    type: 'match_started',
    room: serializeRoom(room),
    servingSide,
  });

  room.match.phaseTimer = setTimeout(() => {
    if (room.match && room.status === 'PLAYING') {
      scheduleServeToss(room);
    }
  }, 650);
}

function handleLeaveOrDisconnect(ws: WebSocket, isExplicitLeave: boolean) {
  const meta = socketMeta.get(ws);
  if (!meta) return;
  socketMeta.delete(ws);

  const room = rooms.get(meta.roomCode);
  if (!room) return;

  const member = getMember(room, meta.side);
  if (!member || member.ws !== ws) return;

  member.ws = null;
  member.connected = false;

  if (isExplicitLeave) {
    if (meta.side === 'host') {
      if (room.match) clearMatchTimer(room.match);
      if (room.guest) {
        sendJson(room.guest.ws, {
          type: 'room_closed',
          reason: `${room.host.playerName} (Host) menutup room.`,
        });
      }
      rooms.delete(room.code);
      return;
    }

    // Guest left explicitly
    const guestName = room.guest?.playerName || 'Lawan';
    if (room.status === 'PLAYING' && room.match && room.match.phase !== 'OVER') {
      clearMatchTimer(room.match);
      room.match.phase = 'OVER';
      room.match.pScore = TARGET_SCORE;
      room.status = 'FINISHED';
      room.winnerSide = 'host';
      sendJson(room.host.ws, {
        type: 'match_event',
        event: 'match_over',
        winnerSide: 'host',
        pScore: room.match.pScore,
        oScore: room.match.oScore,
        reason: `${guestName} keluar dari room.`,
      });
    }
    room.guest = null;
    if (room.status === 'FINISHED') {
      room.status = 'LOBBY';
      room.match = null;
    }
    broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
    return;
  }

  // Temporary disconnect: notify other player and schedule cleanup if not reconnected in 20s
  broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.cleanupTimer = setTimeout(() => {
    const r = rooms.get(meta.roomCode);
    if (!r) return;
    if (!r.host.connected && (!r.guest || !r.guest.connected)) {
      if (r.match) clearMatchTimer(r.match);
      rooms.delete(r.code);
    } else if (!r.host.connected && r.guest && r.guest.connected) {
      if (r.match) clearMatchTimer(r.match);
      sendJson(r.guest.ws, {
        type: 'room_closed',
        reason: `${r.host.playerName} (Host) terputus dari koneksi.`,
      });
      rooms.delete(r.code);
    } else if (r.host.connected && r.guest && !r.guest.connected) {
      const droppedName = r.guest.playerName;
      if (r.status === 'PLAYING' && r.match && r.match.phase !== 'OVER') {
        clearMatchTimer(r.match);
        r.match.phase = 'OVER';
        r.match.pScore = TARGET_SCORE;
        sendJson(r.host.ws, {
          type: 'match_event',
          event: 'match_over',
          winnerSide: 'host',
          pScore: r.match.pScore,
          oScore: r.match.oScore,
          reason: `${droppedName} terputus terlalu lama.`,
        });
      }
      r.guest = null;
      r.status = 'LOBBY';
      r.match = null;
      broadcastRoom(r, { type: 'room_state', room: serializeRoom(r) });
    }
  }, 20000);
}

async function bootstrapServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  app.get('/api/download-html', (_req, res) => {
    const singleHtmlPath = path.resolve(__dirname, 'dist', 'skyward-spike.html');
    try {
      if (!fs.existsSync(singleHtmlPath)) {
        execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
      }
      if (!fs.existsSync(singleHtmlPath)) {
        res.status(500).send('Gagal membuat file HTML tunggal.');
        return;
      }
      res.download(singleHtmlPath, 'Skyward-Spike-Offline.html');
    } catch (err) {
      console.error('Failed to build/serve single HTML:', err);
      res.status(500).send('Gagal menyiapkan file HTML untuk diunduh.');
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('error', (err) => {
    console.error('WebSocketServer error:', err);
  });

  wss.on('connection', (ws) => {
    ws.on('error', () => {
      handleLeaveOrDisconnect(ws, false);
    });

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = msg.type;
      if (typeof type !== 'string') return;

      if (type === 'create_room') {
        handleLeaveOrDisconnect(ws, true);
        const clientId = typeof msg.clientId === 'string' && msg.clientId ? msg.clientId.slice(0, 48) : `c_${Date.now()}`;
        const code = generateRoomCode();
        const host: RoomMember = {
          clientId,
          playerName: sanitizeName(msg.playerName, 'Host Voli'),
          side: 'host',
          roster: sanitizeRoster(msg.roster),
          teamStats: sanitizeTeamStats(msg.teamStats),
          ready: true,
          connected: true,
          ws,
        };
        const room: Room = {
          code,
          status: 'LOBBY',
          host,
          guest: null,
          rematchVotes: { host: false, guest: false },
          match: null,
          cleanupTimer: null,
        };
        rooms.set(code, room);
        socketMeta.set(ws, { roomCode: code, clientId, side: 'host' });
        sendJson(ws, { type: 'room_joined', code, side: 'host', room: serializeRoom(room) });
        return;
      }

      if (type === 'join_room') {
        const rawCode = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : '';
        const clientId = typeof msg.clientId === 'string' && msg.clientId ? msg.clientId.slice(0, 48) : `c_${Date.now()}`;
        const room = rooms.get(rawCode);
        if (!room) {
          sendJson(ws, { type: 'room_error', message: `Room dengan kode "${rawCode}" tidak ditemukan.` });
          return;
        }
        if (room.cleanupTimer) {
          clearTimeout(room.cleanupTimer);
          room.cleanupTimer = null;
        }

        // Reconnect existing slot if clientId matches
        if (room.host.clientId === clientId) {
          room.host.ws = ws;
          room.host.connected = true;
          socketMeta.set(ws, { roomCode: room.code, clientId, side: 'host' });
          sendJson(ws, { type: 'room_joined', code: room.code, side: 'host', room: serializeRoom(room) });
          broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
          return;
        }
        if (room.guest && room.guest.clientId === clientId) {
          room.guest.ws = ws;
          room.guest.connected = true;
          socketMeta.set(ws, { roomCode: room.code, clientId, side: 'guest' });
          sendJson(ws, { type: 'room_joined', code: room.code, side: 'guest', room: serializeRoom(room) });
          broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
          return;
        }

        if (room.guest !== null) {
          sendJson(ws, { type: 'room_error', message: 'Room sudah penuh (2/2 pemain).' });
          return;
        }
        if (room.status !== 'LOBBY') {
          sendJson(ws, { type: 'room_error', message: 'Pertandingan di room ini sudah berlangsung.' });
          return;
        }

        handleLeaveOrDisconnect(ws, true);
        const guest: RoomMember = {
          clientId,
          playerName: sanitizeName(msg.playerName, 'Penantang'),
          side: 'guest',
          roster: sanitizeRoster(msg.roster),
          teamStats: sanitizeTeamStats(msg.teamStats),
          ready: false,
          connected: true,
          ws,
        };
        room.guest = guest;
        socketMeta.set(ws, { roomCode: room.code, clientId, side: 'guest' });
        sendJson(ws, { type: 'room_joined', code: room.code, side: 'guest', room: serializeRoom(room) });
        broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
        return;
      }

      const meta = socketMeta.get(ws);
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const member = getMember(room, meta.side);
      if (!member) return;

      if (type === 'update_setup') {
        if (typeof msg.playerName === 'string') {
          member.playerName = sanitizeName(msg.playerName, member.playerName);
        }
        if (typeof msg.ready === 'boolean' && meta.side === 'guest') {
          member.ready = msg.ready;
        }
        if (msg.roster) member.roster = sanitizeRoster(msg.roster);
        if (msg.teamStats) member.teamStats = sanitizeTeamStats(msg.teamStats);
        broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
        return;
      }

      if (type === 'start_match') {
        if (meta.side !== 'host') return;
        if (!room.guest || !room.guest.connected) {
          sendJson(ws, { type: 'room_error', message: 'Menunggu lawan masuk ke room.' });
          return;
        }
        if (!room.guest.ready) {
          sendJson(ws, { type: 'room_error', message: 'Tunggu lawan menekan tombol Siap terlebih dahulu.' });
          return;
        }
        startNewMatch(room);
        return;
      }

      if (type === 'player_action') {
        const action = msg.action;
        if (
          action === 'RECEIVE' ||
          action === 'SET' ||
          action === 'SPIKE' ||
          action === 'BLOCK' ||
          action === 'ULTIMATE'
        ) {
          handleMatchPlayerAction(room, meta.side, action);
        }
        return;
      }

      if (type === 'rematch_request') {
        if (room.status !== 'FINISHED' || !room.guest) return;
        room.rematchVotes[meta.side] = true;
        if (room.rematchVotes.host && room.rematchVotes.guest) {
          startNewMatch(room);
        } else {
          broadcastRoom(room, {
            type: 'rematch_status',
            votes: room.rematchVotes,
          });
        }
        return;
      }

      if (type === 'leave_room') {
        handleLeaveOrDisconnect(ws, true);
      }
    });

    ws.on('close', () => {
      handleLeaveOrDisconnect(ws, false);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await import('vite');
    const viteServer = await vite.createServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`Skyward Spike server running on port ${port}`);
  });
}

bootstrapServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
