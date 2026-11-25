import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LogOut, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { getCharacterById } from '../data/characters';
import {
  BasicAction,
  CharacterDef,
  MultiplayerRoomState,
  Role,
} from '../types/game';
import { soundEngine } from '../utils/audio';
import { startElementCanvasEffect } from '../utils/elementCanvasLibrary';
import { MatchEventPayload, mpClient, ServerSide } from '../utils/multiplayerClient';
import { AnimePortrait } from './AnimePortrait';
import { CourtPlayerSprite, PlayerAnimType, PlayerVisualState } from './CourtPlayerSprite';
import { TacticalController } from './TacticalController';
import { UltimateCutscene } from './UltimateCutscene';

interface MultiplayerMatchArenaProps {
  initialRoom: MultiplayerRoomState;
  mySide: ServerSide;
  muted: boolean;
  onToggleMute: () => void;
  onFinishMatch: (result: {
    won: boolean;
    myScore: number;
    oppScore: number;
    coinsEarned: number;
    expEarned: number;
  }) => void;
  onExitToLobby: () => void;
}

interface CourtPlayer {
  id: string;
  role: Role;
  side: 'player' | 'opponent';
  char: CharacterDef;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  targetX: number;
  anim: PlayerAnimType;
  phaseStep: 0 | 1 | 2;
  animTimer: number;
  animDuration: number;
  facing: 1 | -1;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface PromptState {
  active: boolean;
  role: Role;
  char: CharacterDef;
  recommended: Exclude<BasicAction, 'ULTIMATE'>;
  timeLeft: number;
  maxTime: number;
  isUltIncoming: boolean;
}

const COURT_W = 1120;
const COURT_H = 560;
const FLOOR_Y = 442;
const NET_X = COURT_W / 2;
const NET_TOP_FRONT = 278;
const NET_TOP_BACK = 248;
const NET_BOT_FRONT = 382;
const NET_BOT_BACK = 336;
const GRAVITY = 880;

export const MultiplayerMatchArena: React.FC<MultiplayerMatchArenaProps> = ({
  initialRoom,
  mySide,
  muted,
  onToggleMute,
  onFinishMatch,
  onExitToLobby,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const elementCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [room, setRoom] = useState<MultiplayerRoomState>(initialRoom);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [myEnergy, setMyEnergy] = useState(25);
  const [oppEnergy, setOppEnergy] = useState(25);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [waitingOpponentRole, setWaitingOpponentRole] = useState<Role | null>(null);
  const [callout, setCallout] = useState<{
    text: string;
    subtext: string;
    color: string;
  } | null>(null);
  const [cutscene, setCutscene] = useState<{
    char: CharacterDef;
    isOpponent: boolean;
  } | null>(null);
  const [matchResult, setMatchResult] = useState<{
    won: boolean;
    myScore: number;
    oppScore: number;
    reason: string;
  } | null>(null);
  const [rematchVoted, setRematchVoted] = useState(false);
  const [oppRematchVoted, setOppRematchVoted] = useState(false);
  const [roomNotice, setRoomNotice] = useState<string | null>(null);
  const [playerSprites, setPlayerSprites] = useState<PlayerVisualState[]>([]);
  const lastSpriteKeyRef = useRef('');

  const fallbackOppMember = {
    clientId: 'fallback_opp',
    playerName: 'Lawan',
    side: (mySide === 'host' ? 'guest' : 'host') as ServerSide,
    roster: initialRoom.host.roster,
    ready: true,
    connected: false,
  };
  const initialMyMemberRef = useRef(
    (mySide === 'host' ? initialRoom.host : initialRoom.guest) || initialRoom.host
  );
  const initialOppMemberRef = useRef(
    (mySide === 'host' ? initialRoom.guest : initialRoom.host) || fallbackOppMember
  );

  const myMember = (mySide === 'host' ? room.host : room.guest) || initialMyMemberRef.current;
  const oppMember = (mySide === 'host' ? room.guest : room.host) || initialOppMemberRef.current;

  const pSpiker = getCharacterById(myMember.roster.SPIKER.charId);
  const pSetter = getCharacterById(myMember.roster.SETTER.charId);
  const pBlocker = getCharacterById(myMember.roster.BLOCKER.charId);
  const oSpiker = getCharacterById(oppMember.roster.SPIKER.charId);
  const oSetter = getCharacterById(oppMember.roster.SETTER.charId);
  const oBlocker = getCharacterById(oppMember.roster.BLOCKER.charId);

  const mirrorX = useCallback(
    (rawX: number) => (mySide === 'guest' ? COURT_W - rawX : rawX),
    [mySide]
  );

  const toLocalSide = useCallback(
    (srvSide: ServerSide): 'player' | 'opponent' =>
      srvSide === mySide ? 'player' : 'opponent',
    [mySide]
  );

  const simRef = useRef({
    inFlight: false,
    promptActive: false,
    promptSide: null as 'player' | 'opponent' | null,
    promptRole: null as Role | null,
    promptTimer: 0,
    promptMax: 3.8,
    isUltIncoming: false,
    ball: {
      x: 115,
      y: FLOOR_Y - 72,
      startX: 115,
      startY: FLOOR_Y - 72,
      targetX: 245,
      targetY: FLOOR_Y - 46,
      flightT: 0,
      flightDur: 0.9,
      vy0: -260,
      vx: 0,
      magnusDrop: 0,
      spin: 0,
      spinRate: 4,
      shotColor: '#FACC15',
      isUltimateShot: false,
      trail: [] as { x: number; y: number }[],
    },
    particles: [] as Particle[],
    shake: 0,
    netShake: 0,
    players: [
      { id: 'p-spiker', role: 'SPIKER', side: 'player', char: pSpiker, baseX: 245, baseY: FLOOR_Y - 6, x: 245, y: FLOOR_Y - 6, targetX: 245, anim: 'IDLE', phaseStep: 0, animTimer: 0, animDuration: 0.4, facing: 1 },
      { id: 'p-setter', role: 'SETTER', side: 'player', char: pSetter, baseX: 355, baseY: FLOOR_Y - 12, x: 355, y: FLOOR_Y - 12, targetX: 355, anim: 'IDLE', phaseStep: 0, animTimer: 0, animDuration: 0.4, facing: 1 },
      { id: 'p-blocker', role: 'BLOCKER', side: 'player', char: pBlocker, baseX: 465, baseY: FLOOR_Y - 16, x: 465, y: FLOOR_Y - 16, targetX: 465, anim: 'IDLE', phaseStep: 0, animTimer: 0, animDuration: 0.4, facing: 1 },
      { id: 'o-blocker', role: 'BLOCKER', side: 'opponent', char: oBlocker, baseX: 655, baseY: FLOOR_Y - 16, x: 655, y: FLOOR_Y - 16, targetX: 655, anim: 'IDLE', phaseStep: 0, animTimer: 0, animDuration: 0.4, facing: -1 },
      { id: 'o-setter', role: 'SETTER', side: 'opponent', char: oSetter, baseX: 765, baseY: FLOOR_Y - 12, x: 765, y: FLOOR_Y - 12, targetX: 765, anim: 'IDLE', phaseStep: 0, animTimer: 0, animDuration: 0.4, facing: -1 },
      { id: 'o-spiker', role: 'SPIKER', side: 'opponent', char: oSpiker, baseX: 875, baseY: FLOOR_Y - 6, x: 875, y: FLOOR_Y - 6, targetX: 875, anim: 'IDLE', phaseStep: 0, animTimer: 0, animDuration: 0.4, facing: -1 },
    ] as CourtPlayer[],
  });

  const syncPlayerSprites = useCallback(() => {
    const sim = simRef.current;
    const key = sim.players
      .map(
        (p) =>
          `${p.id}:${Math.round(p.targetX)}:${p.anim}:${p.phaseStep}:${
            sim.promptActive && sim.promptSide === p.side && sim.promptRole === p.role ? 1 : 0
          }`
      )
      .join('|');
    if (key === lastSpriteKeyRef.current) return;
    lastSpriteKeyRef.current = key;

    setPlayerSprites(
      sim.players.map((p) => ({
        id: p.id,
        role: p.role,
        side: p.side,
        char: p.char,
        x: p.targetX,
        y: p.y,
        anim: p.anim,
        phaseStep: p.phaseStep,
        facing: p.facing,
        isActivePrompt: sim.promptActive && sim.promptSide === p.side && sim.promptRole === p.role,
      }))
    );
  }, []);

  const setPlayerPose = useCallback(
    (pl: CourtPlayer, anim: PlayerAnimType, duration: number, targetX?: number) => {
      if (targetX !== undefined) pl.targetX = targetX;
      pl.anim = anim;
      pl.phaseStep = 0;
      pl.animTimer = duration;
      pl.animDuration = duration;
      syncPlayerSprites();
    },
    [syncPlayerSprites]
  );

  const calloutTimerRef = useRef<number | null>(null);

  const showBanner = useCallback((text: string, subtext: string, color: string) => {
    if (calloutTimerRef.current !== null) {
      window.clearTimeout(calloutTimerRef.current);
    }
    setCallout({ text, subtext, color });
    calloutTimerRef.current = window.setTimeout(() => {
      setCallout(null);
      calloutTimerRef.current = null;
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (calloutTimerRef.current !== null) {
        window.clearTimeout(calloutTimerRef.current);
      }
    };
  }, []);

  const spawnBurst = useCallback((x: number, y: number, color: string, count = 20) => {
    const sim = simRef.current;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 85 + Math.random() * 210;
      sim.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 45,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.7,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }, []);

  const handleAction = useCallback(
    (action: BasicAction) => {
      if (!prompt) return;
      if (action === 'ULTIMATE' && myEnergy < 100) return;
      soundEngine.playClick();
      setPrompt(null);
      simRef.current.promptActive = false;
      mpClient.sendAction(action);
    },
    [myEnergy, prompt]
  );

  // Keyboard shortcuts (PC: 1-4 / QWER / ASDF + Space Ultimate + Enter Recommended)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!prompt || cutscene || matchResult || roomNotice) return;
      const k = e.key.toLowerCase();
      if (k === '1' || k === 'q' || k === 'a') handleAction('RECEIVE');
      else if (k === '2' || k === 'w' || k === 's') handleAction('SET');
      else if (k === '3' || k === 'e' || k === 'd') handleAction('SPIKE');
      else if (k === '4' || k === 'r' || k === 'f') handleAction('BLOCK');
      else if (e.key === 'Enter') {
        e.preventDefault();
        handleAction(prompt.recommended);
      } else if (k === '5' || e.key === ' ') {
        e.preventDefault();
        if (myEnergy >= 100) handleAction('ULTIMATE');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cutscene, handleAction, matchResult, myEnergy, prompt, roomNotice]);

  // Element Canvas Overlay during Ultimate Cutscene
  useEffect(() => {
    if (!cutscene || !elementCanvasRef.current) return;
    return startElementCanvasEffect(
      elementCanvasRef.current,
      cutscene.char.ultimate.theme,
      cutscene.char.visual.auraColor
    );
  }, [cutscene]);

  // Subscribe to Server Authoritative Match Events
  useEffect(() => {
    syncPlayerSprites();
    soundEngine.playWhistle('start');

    const unsub = mpClient.subscribe((raw) => {
      if (raw.type === 'room_state') {
        const nextRoom = raw.room as MultiplayerRoomState;
        if (nextRoom) setRoom(nextRoom);
        return;
      }

      if (raw.type === 'room_closed') {
        setRoomNotice(typeof raw.reason === 'string' ? raw.reason : 'Room ditutup.');
        return;
      }

      if (raw.type === 'rematch_status') {
        const votes = raw.votes as { host: boolean; guest: boolean } | undefined;
        if (votes) {
          setRematchVoted(mySide === 'host' ? votes.host : votes.guest);
          setOppRematchVoted(mySide === 'host' ? votes.guest : votes.host);
        }
        return;
      }

      if (raw.type === 'match_started') {
        const nextRoom = raw.room as MultiplayerRoomState;
        if (nextRoom) setRoom(nextRoom);
        const sim = simRef.current;
        sim.inFlight = false;
        sim.promptActive = false;
        sim.ball.trail = [];
        sim.particles = [];
        for (const pl of sim.players) {
          pl.x = pl.baseX;
          pl.targetX = pl.baseX;
          pl.anim = 'IDLE';
          pl.phaseStep = 0;
          pl.animTimer = 0;
        }
        syncPlayerSprites();
        setMyScore(0);
        setOppScore(0);
        setMyEnergy(25);
        setOppEnergy(25);
        setMatchResult(null);
        setRematchVoted(false);
        setOppRematchVoted(false);
        setCutscene(null);
        setPrompt(null);
        setWaitingOpponentRole(null);
        soundEngine.playWhistle('start');
        return;
      }

      if (raw.type !== 'match_event') return;
      const evt = raw as unknown as MatchEventPayload;
      const sim = simRef.current;

      const updateMeters = () => {
        if (evt.pScore !== undefined && evt.oScore !== undefined) {
          setMyScore(mySide === 'host' ? evt.pScore : evt.oScore);
          setOppScore(mySide === 'host' ? evt.oScore : evt.pScore);
        }
        if (evt.pEnergy !== undefined && evt.oEnergy !== undefined) {
          setMyEnergy(mySide === 'host' ? evt.pEnergy : evt.oEnergy);
          setOppEnergy(mySide === 'host' ? evt.oEnergy : evt.pEnergy);
        }
      };

      if (evt.event === 'serve_toss') {
        updateMeters();
        setPrompt(null);
        setWaitingOpponentRole(null);
        sim.promptActive = false;
        sim.inFlight = false;
        const localServeSide = toLocalSide(evt.servingSide || 'host');
        for (const pl of sim.players) {
          pl.targetX = pl.baseX;
          pl.x = pl.baseX;
          pl.anim = 'IDLE';
          pl.phaseStep = 0;
        }
        const serverPl = sim.players.find((p) => p.side === localServeSide && p.role === 'SPIKER');
        if (serverPl) {
          const sx = localServeSide === 'player' ? 115 : COURT_W - 115;
          setPlayerPose(serverPl, 'SERVE', 0.95, sx);
          sim.ball.x = sx + (localServeSide === 'player' ? 14 : -14);
          sim.ball.y = FLOOR_Y - 78;
          sim.ball.trail = [];
        }
        syncPlayerSprites();
      } else if (evt.event === 'ball_launch') {
        updateMeters();
        setPrompt(null);
        setWaitingOpponentRole(null);
        sim.promptActive = false;

        const actorLocalSide = toLocalSide(evt.actorSide || 'host');
        const actorPl = sim.players.find(
          (p) => p.side === actorLocalSide && p.role === (evt.actorRole || 'SPIKER')
        );
        if (actorPl && evt.pose) {
          const lx = evt.pose === 'SERVE' ? actorPl.x : actorPl.baseX;
          setPlayerPose(actorPl, evt.pose, evt.pose === 'SPIKE' ? 0.62 : 0.52, lx);
        }

        const fx = mirrorX(evt.fromX || 200);
        const fy = evt.fromY || FLOOR_Y - 80;
        const tx = mirrorX(evt.toX || 860);
        const ty = evt.toY || FLOOR_Y - 46;
        const dur = evt.flightDur || 0.75;
        const mag = evt.magnusDrop || 0;

        sim.inFlight = true;
        sim.ball.startX = fx;
        sim.ball.startY = fy;
        sim.ball.targetX = tx;
        sim.ball.targetY = ty;
        sim.ball.x = fx;
        sim.ball.y = fy;
        const effG = GRAVITY + mag;
        sim.ball.flightT = 0;
        sim.ball.flightDur = dur;
        sim.ball.vx = (tx - fx) / dur;
        sim.ball.vy0 = (ty - fy - 0.5 * effG * dur * dur) / dur;
        sim.ball.magnusDrop = mag;
        sim.ball.shotColor = evt.shotColor || '#FACC15';
        sim.ball.isUltimateShot = Boolean(evt.isUltimateShot);
        sim.ball.spinRate = evt.isUltimateShot ? 26 : evt.pose === 'SPIKE' ? 18 : 7;
        sim.ball.trail = [];
        sim.netShake = evt.netShake || 0;
        sim.shake = evt.shake || 0;

        soundEngine.playBallHit(evt.isUltimateShot || evt.pose === 'SPIKE' ? 'heavy' : 'soft');
        spawnBurst(fx, fy, evt.shotColor || '#FACC15', evt.isUltimateShot ? 28 : 12);
        if (evt.callout) {
          showBanner(evt.callout.text, evt.callout.subtext, evt.callout.color);
        }
      } else if (evt.event === 'prompt_turn') {
        sim.inFlight = false;
        const turnLocalSide = toLocalSide(evt.turnSide || 'host');
        const targetRole: Role = evt.role || 'SPIKER';
        const targetPl = sim.players.find(
          (p) => p.side === turnLocalSide && p.role === targetRole
        );

        sim.promptActive = true;
        sim.promptSide = turnLocalSide;
        sim.promptRole = targetRole;
        sim.promptMax = evt.timeLimit || 3.8;
        sim.promptTimer = sim.promptMax;
        sim.isUltIncoming = Boolean(evt.isUltIncoming);
        syncPlayerSprites();

        if (turnLocalSide === 'player' && targetPl) {
          setWaitingOpponentRole(null);
          setPrompt({
            active: true,
            role: targetRole,
            char: targetPl.char,
            recommended: evt.recommended || 'RECEIVE',
            timeLeft: sim.promptMax,
            maxTime: sim.promptMax,
            isUltIncoming: Boolean(evt.isUltIncoming),
          });
        } else {
          setPrompt(null);
          setWaitingOpponentRole(targetRole);
        }
      } else if (evt.event === 'ultimate_cutscene') {
        updateMeters();
        setPrompt(null);
        setWaitingOpponentRole(null);
        sim.promptActive = false;
        const actorLocalSide = toLocalSide(evt.actorSide || 'host');
        const char = getCharacterById(evt.charId || 'raka_pratama');
        soundEngine.playUltimateCutscene();
        setCutscene({
          char,
          isOpponent: actorLocalSide === 'opponent',
        });
      } else if (evt.event === 'point_scored') {
        updateMeters();
        setPrompt(null);
        setWaitingOpponentRole(null);
        setCutscene(null);
        sim.inFlight = false;
        sim.promptActive = false;
        const bx = mirrorX(evt.burstX || 560);
        const by = evt.burstY || FLOOR_Y - 12;
        const localScorer = toLocalSide(evt.scoringSide || 'host');
        spawnBurst(bx, by, localScorer === 'player' ? '#38BDF8' : '#FB7185', 24);
        soundEngine.playWhistle('point');
        showBanner(
          localScorer === 'player' ? '+1 POIN KITA!' : '+1 POIN LAWAN!',
          evt.reason || '',
          localScorer === 'player' ? '#38BDF8' : '#FB7185'
        );
        syncPlayerSprites();
      } else if (evt.event === 'match_over') {
        updateMeters();
        setPrompt(null);
        setWaitingOpponentRole(null);
        setCutscene(null);
        const won = evt.winnerSide === mySide;
        soundEngine.playWhistle('end');
        setMatchResult({
          won,
          myScore: mySide === 'host' ? evt.pScore || 0 : evt.oScore || 0,
          oppScore: mySide === 'host' ? evt.oScore || 0 : evt.pScore || 0,
          reason: evt.reason || '',
        });
      }
    });

    return unsub;
  }, [mirrorX, mySide, setPlayerPose, showBanner, spawnBurst, syncPlayerSprites, toLocalSide]);

  // 60FPS Court Canvas Renderer + Smooth Local Ball Interpolation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = COURT_W;
    canvas.height = COURT_H;

    let raf = 0;
    let lastTime = performance.now();

    const drawPerspectiveCourtAndNet = (now: number, netShakeAmt: number) => {
      const courtTopY = 342;
      const courtBotY = 486;
      const topLeftX = 160;
      const topRightX = 960;
      const botLeftX = 28;
      const botRightX = 1092;

      ctx.fillStyle = '#0B1222';
      ctx.fillRect(0, 0, COURT_W, COURT_H);

      const floorGrad = ctx.createLinearGradient(0, courtTopY, 0, courtBotY);
      floorGrad.addColorStop(0, '#B45309');
      floorGrad.addColorStop(0.55, '#D97706');
      floorGrad.addColorStop(1, '#92400E');
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.moveTo(topLeftX, courtTopY);
      ctx.lineTo(topRightX, courtTopY);
      ctx.lineTo(botRightX, courtBotY);
      ctx.lineTo(botLeftX, courtBotY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.86)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Attack lines
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(430, courtTopY);
      ctx.lineTo(395, courtBotY);
      ctx.moveTo(690, courtTopY);
      ctx.lineTo(725, courtBotY);
      ctx.stroke();

      // Center line
      ctx.beginPath();
      ctx.moveTo(NET_X, courtTopY);
      ctx.lineTo(NET_X, courtBotY);
      ctx.stroke();

      // 3D Net
      const wave = netShakeAmt > 0 ? Math.sin(now * 0.04) * netShakeAmt * 8 : 0;
      const backX = NET_X - 6;
      const frontX = NET_X + 6;

      ctx.fillStyle = '#334155';
      ctx.fillRect(backX - 4, NET_TOP_BACK - 14, 8, courtTopY - NET_TOP_BACK + 18);
      ctx.fillRect(frontX - 4 + wave * 0.3, NET_TOP_FRONT - 14, 9, courtBotY - NET_TOP_FRONT - 26);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
      ctx.beginPath();
      ctx.moveTo(backX, NET_TOP_BACK);
      ctx.lineTo(frontX + wave, NET_TOP_FRONT);
      ctx.lineTo(frontX + wave * 0.4, NET_BOT_FRONT);
      ctx.lineTo(backX, NET_BOT_BACK);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(226, 232, 240, 0.38)';
      ctx.lineWidth = 1;
      for (let r = 0; r <= 7; r++) {
        const f = r / 7;
        ctx.beginPath();
        ctx.moveTo(backX, NET_TOP_BACK + (NET_BOT_BACK - NET_TOP_BACK) * f);
        ctx.lineTo(frontX + wave * (1 - f * 0.5), NET_TOP_FRONT + (NET_BOT_FRONT - NET_TOP_FRONT) * f);
        ctx.stroke();
      }

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(backX, NET_TOP_BACK);
      ctx.lineTo(frontX + wave, NET_TOP_FRONT);
      ctx.stroke();
    };

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const sim = simRef.current;

      // Advance player multi-phase animation steps smoothly
      let spriteChanged = false;
      for (const pl of sim.players) {
        if (pl.animTimer > 0) {
          pl.animTimer -= dt;
          if (pl.animTimer <= 0) {
            pl.anim = 'IDLE';
            pl.phaseStep = 0;
            pl.targetX = pl.baseX;
            spriteChanged = true;
          } else {
            const elapsed = 1 - pl.animTimer / Math.max(0.1, pl.animDuration);
            const nextStep: 0 | 1 | 2 = elapsed < 0.25 ? 0 : elapsed < 0.72 ? 1 : 2;
            if (nextStep !== pl.phaseStep) {
              pl.phaseStep = nextStep;
              spriteChanged = true;
            }
          }
        }
        pl.x += (pl.targetX - pl.x) * Math.min(1, dt * 11);
      }
      if (spriteChanged) syncPlayerSprites();

      // Particles & screen shake decay
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const pt = sim.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 320 * dt;
        pt.life -= dt;
        if (pt.life <= 0) sim.particles.splice(i, 1);
      }
      if (sim.shake > 0) sim.shake = Math.max(0, sim.shake - dt * 26);
      if (sim.netShake > 0) sim.netShake = Math.max(0, sim.netShake - dt * 2.2);

      // Smooth Ball Flight Interpolation
      const b = sim.ball;
      if (sim.inFlight) {
        const effG = GRAVITY + b.magnusDrop;
        b.flightT = Math.min(b.flightDur, b.flightT + dt);
        b.x = b.startX + b.vx * b.flightT;
        b.y = b.startY + b.vy0 * b.flightT + 0.5 * effG * b.flightT * b.flightT;
        b.spin += b.spinRate * dt;
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > (b.isUltimateShot ? 16 : 9)) b.trail.shift();
      } else if (sim.promptActive) {
        sim.promptTimer = Math.max(0, sim.promptTimer - dt);
        b.spin += b.spinRate * dt * 0.15;
        if (sim.promptSide === 'player') {
          setPrompt((prev) => (prev ? { ...prev, timeLeft: sim.promptTimer } : null));
        }
      }

      // Render Court Canvas
      ctx.save();
      if (sim.shake > 0) {
        ctx.translate((Math.random() - 0.5) * sim.shake, (Math.random() - 0.5) * sim.shake);
      }
      ctx.clearRect(0, 0, COURT_W, COURT_H);
      drawPerspectiveCourtAndNet(now, sim.netShake);

      for (let i = 0; i < b.trail.length; i++) {
        const pt = b.trail[i];
        ctx.fillStyle = b.shotColor;
        ctx.globalAlpha = ((i + 1) / b.trail.length) * (b.isUltimateShot ? 0.65 : 0.32);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5 + (i / b.trail.length) * (b.isUltimateShot ? 11 : 6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const ballAlt = Math.max(0, FLOOR_Y - b.y);
      const bShadowR = Math.max(6, 17 - ballAlt * 0.032);
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath();
      ctx.ellipse(b.x, FLOOR_Y + 6, bShadowR, bShadowR * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.spin);
      if (b.isUltimateShot) {
        ctx.shadowBlur = 26;
        ctx.shadowColor = b.shotColor;
      }
      const ballGrad = ctx.createRadialGradient(-4, -5, 2, 0, 0, 15);
      ballGrad.addColorStop(0, '#FEF08A');
      ballGrad.addColorStop(0.55, '#FACC15');
      ballGrad.addColorStop(1, '#CA8A04');
      ctx.fillStyle = ballGrad;
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#1D4ED8';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, 11, -0.5, 1.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 11, 2.5, 4.4);
      ctx.stroke();
      ctx.restore();

      if (sim.promptActive && sim.promptSide === 'player') {
        const ratio = Math.max(0, sim.promptTimer / sim.promptMax);
        ctx.save();
        ctx.strokeStyle = sim.isUltIncoming ? '#FB7185' : '#FACC15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 33, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
        ctx.stroke();
        ctx.restore();
      }

      for (const pt of sim.particles) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [syncPlayerSprites]);

  return (
    <div className="relative w-full h-[100dvh] min-h-0 bg-[#070B14] overflow-hidden flex flex-col justify-between select-none">
      {!cutscene && (
        <>
          <img
            src="/src/assets/images/court_arena_backdrop_1795623799824.jpg"
            alt="Latar Stadion Pertandingan Multiplayer"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070B14]/85 via-transparent to-[#070B14]/95 pointer-events-none" />
        </>
      )}

      {/* TOP SCOREBOARD HUD */}
      <header
        className={`relative z-20 flex items-center justify-between gap-2 px-3 md:px-8 pt-2 md:pt-3 pb-1 md:pb-2 transition-opacity duration-150 ${
          cutscene ? 'opacity-0 pointer-events-none' : 'pointer-events-auto'
        }`}
      >
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={() => {
              soundEngine.playClick();
              mpClient.leaveRoom();
              onExitToLobby();
            }}
            className="p-2 md:p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:bg-slate-800 cursor-pointer shrink-0"
            title="Keluar Pertandingan"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <div className="hidden sm:block min-w-0">
            <p className="text-[11px] md:text-xs text-sky-400 font-mono-num font-bold">
              ROOM {room.code} · ONLINE PVP
            </p>
            <p className="font-display text-base md:text-lg font-bold tracking-wide text-white truncate max-w-[160px] md:max-w-[200px]">
              {myMember.playerName} vs {oppMember.playerName}
            </p>
          </div>
        </div>

        {/* Center Scoreboard 0-21 */}
        <div className="flex items-center gap-3 sm:gap-4 md:gap-7 px-3 sm:px-5 py-1.5 md:py-2 rounded-xl bg-slate-950/90 border border-slate-700/70 shadow-lg">
          <div className="text-right">
            <p className="text-[10px] md:text-[11px] uppercase tracking-wider text-sky-400 font-semibold truncate max-w-[78px] sm:max-w-[110px]">
              {myMember.playerName}
            </p>
            <p className="font-mono-num text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-none">
              {myScore}
            </p>
          </div>
          <div className="text-center px-1 sm:px-2">
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400">Target 21</p>
            <p className="font-display text-base sm:text-xl text-amber-400 font-bold">VS</p>
          </div>
          <div className="text-left">
            <p className="text-[10px] md:text-[11px] uppercase tracking-wider text-rose-400 font-semibold truncate max-w-[78px] sm:max-w-[110px]">
              {oppMember.playerName}
            </p>
            <p className="font-mono-num text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-none">
              {oppScore}
            </p>
          </div>
        </div>

        <button
          onClick={onToggleMute}
          className="p-2 md:p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 hover:bg-slate-800 cursor-pointer shrink-0"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </header>

      {/* Energy Meters */}
      <div
        className={`relative z-20 max-w-4xl w-full mx-auto px-4 flex items-center justify-between gap-6 pointer-events-none transition-opacity duration-150 ${
          cutscene ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-sky-300 font-semibold">Energi Tim Kamu</span>
            <span className="font-mono-num text-amber-300 font-bold">{myEnergy}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-amber-400 transition-all duration-200"
              style={{ width: `${myEnergy}%` }}
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-mono-num text-rose-300 font-bold">{oppEnergy}%</span>
            <span className="text-rose-300 font-semibold">Energi {oppMember.playerName}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-rose-500 to-orange-400 transition-all duration-200 ml-auto"
              style={{ width: `${oppEnergy}%` }}
            />
          </div>
        </div>
      </div>

      {/* LIVE 3v3 COURT + CSS PLAYERS */}
      <div
        className={`relative flex-1 min-h-0 flex items-center justify-center px-2 md:px-6 py-1 overflow-hidden transition-opacity duration-150 ${
          cutscene ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div
          onClick={() => {
            if (prompt) handleAction(prompt.recommended);
          }}
          className={`relative w-full h-full max-w-[1120px] max-h-[540px] flex items-center justify-center ${
            prompt ? 'cursor-pointer' : ''
          }`}
        >
          <div className="relative w-full max-h-full aspect-[2/1] rounded-xl shadow-2xl border border-slate-800/70 bg-slate-950/35 overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full block" />
            {!cutscene && (
              <div className="absolute inset-0 pointer-events-none">
                {playerSprites.map((pl) => (
                  <CourtPlayerSprite key={pl.id} player={pl} />
                ))}
              </div>
            )}
          </div>
        </div>

        {!cutscene && callout && (
          <div className="absolute top-3 sm:top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-center px-4 sm:px-6 py-2 rounded-xl bg-slate-950/90 border border-slate-700 shadow-2xl max-w-[92vw]">
            <p
              className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold italic uppercase tracking-wide"
              style={{ color: callout.color }}
            >
              {callout.text}
            </p>
            <p className="text-[11px] sm:text-xs md:text-sm text-slate-200">{callout.subtext}</p>
          </div>
        )}
      </div>

      {/* BOTTOM TACTICAL CONTROLS (Mobile Thumb Pad + PC Keyboard Deck) */}
      <TacticalController
        prompt={
          prompt
            ? {
                role: prompt.role,
                char: prompt.char,
                recommended: prompt.recommended,
                timeLeft: prompt.timeLeft,
                maxTime: prompt.maxTime,
              }
            : null
        }
        energy={myEnergy}
        waitingText={
          waitingOpponentRole
            ? `Menunggu aksi ${oppMember.playerName} (${waitingOpponentRole})...`
            : null
        }
        idleText="Reli PvP berlangsung... Ketuk tombol skill / lapangan (HP) atau 1-4 · QWER · Enter · Spasi (PC)"
        hidden={Boolean(cutscene)}
        onAction={handleAction}
      />

      {/* SYNCHRONIZED ULTIMATE CUTSCENE + DYNAMIC ELEMENT CANVAS */}
      {cutscene && (
        <>
          <UltimateCutscene
            character={cutscene.char}
            isOpponent={cutscene.isOpponent}
            onComplete={() => setCutscene(null)}
          />
          <canvas
            ref={elementCanvasRef}
            className="fixed inset-0 z-[55] w-full h-full pointer-events-none"
          />
        </>
      )}

      {/* ROOM CLOSED NOTICE */}
      {roomNotice && !matchResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111827] border border-slate-700 p-6 space-y-4">
            <h3 className="font-display text-3xl font-bold text-white">Room Ditutup</h3>
            <p className="text-sm text-slate-300">{roomNotice}</p>
            <button
              onClick={() => {
                soundEngine.playClick();
                mpClient.leaveRoom();
                onExitToLobby();
              }}
              className="w-full py-3 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 cursor-pointer"
            >
              Kembali ke Menu Multiplayer
            </button>
          </div>
        </div>
      )}

      {/* MATCH RESULT MODAL */}
      {matchResult && (
        <div className="fixed inset-0 z-40 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#111827] border border-slate-700 p-7 space-y-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <AnimePortrait
                character={pSpiker}
                emotion={matchResult.won ? 'confident' : 'injured'}
                size="md"
              />
              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-widest ${
                    matchResult.won ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {matchResult.won ? 'Kemenangan Multiplayer!' : 'Kekalahan PvP'}
                </p>
                <h3 className="font-display text-4xl font-extrabold text-white">
                  {matchResult.myScore} – {matchResult.oppScore}
                </h3>
                <p className="text-sm text-slate-300 mt-1">{matchResult.reason}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs text-slate-400">Hadiah Koin PvP</p>
                <p className="font-mono-num text-2xl font-bold text-amber-400">+100 Koin</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">EXP Tim Aktif</p>
                <p className="font-mono-num text-2xl font-bold text-sky-400">
                  +{matchResult.won ? 180 : 100} EXP
                </p>
              </div>
            </div>

            {oppRematchVoted && !rematchVoted && (
              <p className="text-xs text-emerald-300 font-semibold text-center">
                {oppMember.playerName} mengajak tanding ulang!
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                disabled={rematchVoted || !room.guest}
                onClick={() => {
                  soundEngine.playClick();
                  setRematchVoted(true);
                  mpClient.requestRematch();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-sky-500 text-slate-950 font-bold flex items-center justify-center gap-2 hover:bg-sky-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {!room.guest
                    ? 'Lawan Sudah Keluar'
                    : rematchVoted
                    ? 'Menunggu Lawan...'
                    : 'Main Lagi (Rematch)'}
                </span>
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  mpClient.leaveRoom();
                  onFinishMatch({
                    won: matchResult.won,
                    myScore: matchResult.myScore,
                    oppScore: matchResult.oppScore,
                    coinsEarned: 100,
                    expEarned: matchResult.won ? 180 : 100,
                  });
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 cursor-pointer"
              >
                Klaim & Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
