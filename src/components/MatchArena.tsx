import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FastForward, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { getCharacterById, getEffectiveStats } from '../data/characters';
import { BasicAction, CharacterDef, OwnedCharacter, Role, StoryEpisode, TeamLineup } from '../types/game';
import { soundEngine } from '../utils/audio';
import { startElementCanvasEffect } from '../utils/elementCanvasLibrary';
import { AnimePortrait } from './AnimePortrait';
import { CourtPlayerSprite, PlayerAnimType, PlayerVisualState } from './CourtPlayerSprite';
import { TacticalController } from './TacticalController';
import { UltimateCutscene } from './UltimateCutscene';

interface MatchArenaProps {
  episode: StoryEpisode;
  playerLineup: TeamLineup;
  ownedCharacters: Record<string, OwnedCharacter>;
  muted: boolean;
  onToggleMute: () => void;
  onFinishMatch: (result: {
    won: boolean;
    playerScore: number;
    opponentScore: number;
    coinsEarned: number;
    expEarned: number;
  }) => void;
  onExitToMenu: () => void;
}

type Side = 'player' | 'opponent';
type RallyPhase =
  | 'SERVE_TOSS'
  | 'IN_FLIGHT'
  | 'PLAYER_PROMPT'
  | 'POINT_SCORED'
  | 'CUTSCENE_PAUSE'
  | 'MATCH_OVER';

interface CourtPlayer {
  id: string;
  role: Role;
  side: Side;
  char: CharacterDef;
  level: number;
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
  incomingPower: number;
  isOpponentUlt: boolean;
}

const TARGET_SCORE = 21;
const COURT_W = 1120;
const COURT_H = 560;
const FLOOR_Y = 442;
const NET_X = COURT_W / 2;
const NET_TOP_FRONT = 278;
const NET_TOP_BACK = 248;
const NET_BOT_FRONT = 382;
const NET_BOT_BACK = 336;
const GRAVITY = 880;

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

export const MatchArena: React.FC<MatchArenaProps> = ({
  episode,
  playerLineup,
  ownedCharacters,
  muted,
  onToggleMute,
  onFinishMatch,
  onExitToMenu,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const elementCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [playerEnergy, setPlayerEnergy] = useState(25);
  const [opponentEnergy, setOpponentEnergy] = useState(episode.opponent.isBoss ? 35 : 15);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [paused, setPaused] = useState(false);
  const [speedMult, setSpeedMult] = useState<1 | 1.5 | 2>(1);
  const [autoAssist, setAutoAssist] = useState(false);
  const [callout, setCallout] = useState<{
    text: string;
    subtext: string;
    side: Side;
    color: string;
  } | null>(null);
  const [cutscene, setCutscene] = useState<{
    char: CharacterDef;
    isOpponent: boolean;
    pendingAttackPower: number;
  } | null>(null);
  const [matchResult, setMatchResult] = useState<{
    won: boolean;
    pScore: number;
    oScore: number;
  } | null>(null);
  const [playerSprites, setPlayerSprites] = useState<PlayerVisualState[]>([]);
  const lastSpriteKeyRef = useRef<string>('');

  const pSpiker = getCharacterById(playerLineup.SPIKER);
  const pSetter = getCharacterById(playerLineup.SETTER);
  const pBlocker = getCharacterById(playerLineup.BLOCKER);

  const oSpiker = getCharacterById(episode.opponent.spikerId);
  const oSetter = getCharacterById(episode.opponent.setterId);
  const oBlocker = getCharacterById(episode.opponent.blockerId);

  const getLvl = (id: string) => ownedCharacters[id]?.level || 1;

  const simRef = useRef({
    phase: 'SERVE_TOSS' as RallyPhase,
    servingSide: 'player' as Side,
    serveSubTimer: 0,
    serveStruck: false,
    pScore: 0,
    oScore: 0,
    pEnergy: 25,
    oEnergy: episode.opponent.isBoss ? 35 : 15,
    ball: {
      x: 115,
      y: FLOOR_Y - 70,
      vx: 0,
      vy: 0,
      magnusDrop: 0,
      targetX: 840,
      targetY: FLOOR_Y - 38,
      flightT: 0,
      flightDur: 1.0,
      bounced: false,
      trail: [] as { x: number; y: number }[],
      spin: 0,
      spinRate: 8,
      isUltimateShot: false,
      shotColor: '#FACC15',
      incomingPower: 65,
      lastTouchSide: 'player' as Side,
      nextActionPhase: 'RECEIVE' as Exclude<BasicAction, 'ULTIMATE'>,
    },
    hitstop: 0,
    shake: 0,
    netShake: 0,
    pointTimer: 0.75,
    promptTimer: 0,
    promptMax: 3.5,
    promptTargetRole: 'SPIKER' as Role,
    promptRecommended: 'RECEIVE' as Exclude<BasicAction, 'ULTIMATE'>,
    isOpponentUltIncoming: false,
    particles: [] as Particle[],
    players: [] as CourtPlayer[],
    paused: false,
    speed: 1,
    autoAssist: false,
  });

  useEffect(() => {
    simRef.current.paused = paused || Boolean(cutscene) || Boolean(matchResult);
  }, [paused, cutscene, matchResult]);

  useEffect(() => {
    simRef.current.speed = speedMult;
  }, [speedMult]);

  useEffect(() => {
    simRef.current.autoAssist = autoAssist;
  }, [autoAssist]);

  const showBanner = useCallback((text: string, subtext: string, side: Side, color: string) => {
    setCallout({ text, subtext, side, color });
  }, []);

  useEffect(() => {
    if (!callout) return;
    const t = window.setTimeout(() => setCallout(null), 1650);
    return () => window.clearTimeout(t);
  }, [callout]);

  // Initialize 3v3 Court Players
  useEffect(() => {
    const aiLvl = Math.max(1, Math.floor(episode.opponent.aiLevel / 8));
    const players: CourtPlayer[] = [
      {
        id: 'p_spiker',
        role: 'SPIKER',
        side: 'player',
        char: pSpiker,
        level: getLvl(pSpiker.id),
        baseX: 205,
        baseY: FLOOR_Y + 8,
        x: 205,
        y: FLOOR_Y + 8,
        targetX: 205,
        anim: 'IDLE',
        phaseStep: 0,
        animTimer: 0,
        animDuration: 0.5,
        facing: 1,
      },
      {
        id: 'p_setter',
        role: 'SETTER',
        side: 'player',
        char: pSetter,
        level: getLvl(pSetter.id),
        baseX: 350,
        baseY: FLOOR_Y - 10,
        x: 350,
        y: FLOOR_Y - 10,
        targetX: 350,
        anim: 'IDLE',
        phaseStep: 0,
        animTimer: 0,
        animDuration: 0.5,
        facing: 1,
      },
      {
        id: 'p_blocker',
        role: 'BLOCKER',
        side: 'player',
        char: pBlocker,
        level: getLvl(pBlocker.id),
        baseX: 486,
        baseY: FLOOR_Y + 2,
        x: 486,
        y: FLOOR_Y + 2,
        targetX: 486,
        anim: 'IDLE',
        phaseStep: 0,
        animTimer: 0,
        animDuration: 0.5,
        facing: 1,
      },
      {
        id: 'o_blocker',
        role: 'BLOCKER',
        side: 'opponent',
        char: oBlocker,
        level: aiLvl,
        baseX: 634,
        baseY: FLOOR_Y + 2,
        x: 634,
        y: FLOOR_Y + 2,
        targetX: 634,
        anim: 'IDLE',
        phaseStep: 0,
        animTimer: 0,
        animDuration: 0.5,
        facing: -1,
      },
      {
        id: 'o_setter',
        role: 'SETTER',
        side: 'opponent',
        char: oSetter,
        level: aiLvl,
        baseX: 770,
        baseY: FLOOR_Y - 10,
        x: 770,
        y: FLOOR_Y - 10,
        targetX: 770,
        anim: 'IDLE',
        phaseStep: 0,
        animTimer: 0,
        animDuration: 0.5,
        facing: -1,
      },
      {
        id: 'o_spiker',
        role: 'SPIKER',
        side: 'opponent',
        char: oSpiker,
        level: aiLvl,
        baseX: 915,
        baseY: FLOOR_Y + 8,
        x: 915,
        y: FLOOR_Y + 8,
        targetX: 915,
        anim: 'IDLE',
        phaseStep: 0,
        animTimer: 0,
        animDuration: 0.5,
        facing: -1,
      },
    ];
    simRef.current.players = players;
    setPlayerSprites(
      players.map((pl) => ({
        id: pl.id,
        role: pl.role,
        side: pl.side,
        char: pl.char,
        x: pl.x,
        y: pl.y,
        anim: pl.anim,
        phaseStep: pl.phaseStep,
        facing: pl.facing,
        isActivePrompt: false,
      }))
    );
    soundEngine.playWhistle('start');
  }, [episode, pSpiker, pSetter, pBlocker, oSpiker, oSetter, oBlocker]);

  const spawnBurst = (x: number, y: number, color: string, count = 18) => {
    const sim = simRef.current;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 130 + Math.random() * 260;
      sim.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 50,
        life: 0.45 + Math.random() * 0.3,
        maxLife: 0.75,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  };

  /**
   * True 2D ballistic trajectory launch: solves initial vx, vy so ball follows
   * natural gravity + optional topspin Magnus dive to reach (toX, toY) in `duration` seconds.
   */
  const launchBall = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    duration: number,
    magnusDrop: number,
    lastTouchSide: Side,
    nextActionPhase: Exclude<BasicAction, 'ULTIMATE'>,
    incomingPower: number,
    shotColor: string,
    isUltimateShot = false
  ) => {
    const b = simRef.current.ball;
    const effG = GRAVITY + magnusDrop;
    b.x = fromX;
    b.y = fromY;
    b.targetX = toX;
    b.targetY = toY;
    b.flightT = 0;
    b.flightDur = duration;
    b.magnusDrop = magnusDrop;
    b.vx = (toX - fromX) / duration;
    b.vy = (toY - fromY - 0.5 * effG * duration * duration) / duration;
    b.bounced = false;
    b.lastTouchSide = lastTouchSide;
    b.nextActionPhase = nextActionPhase;
    b.incomingPower = incomingPower;
    b.shotColor = shotColor;
    b.isUltimateShot = isUltimateShot;
    b.spinRate = isUltimateShot ? 26 : nextActionPhase === 'RECEIVE' ? 16 : 6;
  };

  const syncPlayerSprites = useCallback(() => {
    const sim = simRef.current;
    const key = sim.players
      .map((pl) => {
        const active =
          sim.phase === 'PLAYER_PROMPT' &&
          pl.side === 'player' &&
          pl.role === sim.promptTargetRole;
        return `${pl.id}:${Math.round(pl.targetX)}:${pl.anim}:${pl.phaseStep}:${active ? 1 : 0}`;
      })
      .join('|');
    if (key === lastSpriteKeyRef.current) return;
    lastSpriteKeyRef.current = key;
    setPlayerSprites(
      sim.players.map((pl) => ({
        id: pl.id,
        role: pl.role,
        side: pl.side,
        char: pl.char,
        x: pl.targetX,
        y: pl.y,
        anim: pl.anim,
        phaseStep: pl.phaseStep,
        facing: pl.facing,
        isActivePrompt:
          sim.phase === 'PLAYER_PROMPT' &&
          pl.side === 'player' &&
          pl.role === sim.promptTargetRole,
      }))
    );
  }, []);

  const setPlayerPose = useCallback(
    (pl: CourtPlayer, anim: PlayerAnimType, duration: number, targetX?: number) => {
      pl.anim = anim;
      pl.phaseStep = 0;
      pl.animTimer = duration;
      pl.animDuration = duration;
      if (typeof targetX === 'number') {
        pl.x = targetX;
        pl.targetX = targetX;
      }
      syncPlayerSprites();
    },
    [syncPlayerSprites]
  );

  const awardPoint = useCallback(
    (winner: Side, reason: string) => {
      const sim = simRef.current;
      if (sim.phase === 'POINT_SCORED' || sim.phase === 'MATCH_OVER') return;

      soundEngine.playWhistle('point');
      sim.phase = 'POINT_SCORED';
      sim.pointTimer = 1.25;
      sim.ball.bounced = true;
      sim.ball.vy = -210;
      sim.ball.vx *= 0.45;
      setPrompt(null);

      if (winner === 'player') {
        sim.pScore += 1;
        setPlayerScore(sim.pScore);
        sim.servingSide = 'player';
        showBanner(`POIN UNTUK KITA! (${sim.pScore}-${sim.oScore})`, reason, 'player', '#38BDF8');
      } else {
        sim.oScore += 1;
        setOpponentScore(sim.oScore);
        sim.servingSide = 'opponent';
        showBanner(`POIN LAWAN! (${sim.pScore}-${sim.oScore})`, reason, 'opponent', '#FB7185');
      }

      if (sim.pScore >= TARGET_SCORE || sim.oScore >= TARGET_SCORE) {
        sim.phase = 'MATCH_OVER';
        soundEngine.playWhistle('end');
        const won = sim.pScore >= TARGET_SCORE;
        setMatchResult({ won, pScore: sim.pScore, oScore: sim.oScore });
      }
    },
    [showBanner]
  );

  // Execute Player Chosen Skill Action
  const handlePlayerAction = useCallback(
    (action: BasicAction) => {
      const sim = simRef.current;
      if (sim.phase !== 'PLAYER_PROMPT') return;

      const activePlayer =
        sim.players.find((p) => p.side === 'player' && p.role === sim.promptTargetRole) ||
        sim.players[0];
      const stats = getEffectiveStats(activePlayer.char, activePlayer.level);

      if (action === 'ULTIMATE') {
        if (sim.pEnergy < 100) return;
        sim.pEnergy = 0;
        setPlayerEnergy(0);
        setPrompt(null);
        sim.phase = 'CUTSCENE_PAUSE';
        soundEngine.playUltimateCutscene();

        const ultPower =
          (stats.power * 1.12 + stats.technique * 0.5) *
          activePlayer.char.ultimate.powerMultiplier;

        setCutscene({
          char: activePlayer.char,
          isOpponent: false,
          pendingAttackPower: ultPower,
        });
        return;
      }

      setPrompt(null);
      sim.phase = 'IN_FLIGHT';

      const matched = action === sim.promptRecommended;
      const skill =
        activePlayer.char.signatureSkill.actionType === action
          ? activePlayer.char.signatureSkill
          : activePlayer.char.secondarySkill.actionType === action
          ? activePlayer.char.secondarySkill
          : null;

      const matchBonus = matched ? 1.18 : 0.78;
      const skillBonus = skill ? skill.powerBonus : 8;
      const energyGain = matched ? 22 : 12;
      sim.pEnergy = Math.min(100, sim.pEnergy + energyGain);
      setPlayerEnergy(sim.pEnergy);

      const oppGain = Math.round(14 * episode.opponent.bossUltimateChargeRate);
      sim.oEnergy = Math.min(100, sim.oEnergy + oppGain);
      setOpponentEnergy(sim.oEnergy);

      const pSetterObj =
        sim.players.find((p) => p.side === 'player' && p.role === 'SETTER') || activePlayer;
      const pSpikerObj =
        sim.players.find((p) => p.side === 'player' && p.role === 'SPIKER') || activePlayer;
      const oSpikerObj =
        sim.players.find((p) => p.side === 'opponent' && p.role === 'SPIKER') || activePlayer;
      const incomingPower = sim.ball.incomingPower;
      const defenseRoll =
        (stats.defense * 0.65 + stats.technique * 0.35 + skillBonus) * matchBonus;

      if (action === 'RECEIVE') {
        setPlayerPose(activePlayer, 'PASS_UNDER', 0.56);
        const breakChance = (incomingPower - defenseRoll) / 140;
        if (
          (sim.isOpponentUltIncoming && Math.random() < Math.max(0.32, breakChance + 0.24)) ||
          (!matched && Math.random() < 0.45) ||
          (breakChance > 0.35 && Math.random() < 0.45)
        ) {
          soundEngine.playBallHit('heavy');
          spawnBurst(activePlayer.x, FLOOR_Y - 12, '#FB7185', 22);
          sim.shake = 10;
          awardPoint('opponent', `${oSpiker.name} menembus passing bawah kita!`);
          return;
        }

        soundEngine.playBallHit('soft');
        spawnBurst(activePlayer.x + 10, activePlayer.y - 45, activePlayer.char.visual.auraColor, 15);
        showBanner(
          skill ? skill.indonesianName : 'Passing Bawah Stabil',
          `${activePlayer.char.name} mengangkat bola dengan sempurna!`,
          'player',
          activePlayer.char.visual.auraColor
        );
        launchBall(
          activePlayer.x + 12,
          activePlayer.y - 46,
          pSetterObj.baseX,
          pSetterObj.baseY - 98,
          0.86,
          0,
          'player',
          'SET',
          stats.technique + skillBonus,
          activePlayer.char.visual.auraColor
        );
      } else if (action === 'SET') {
        setPlayerPose(activePlayer, 'SET', 0.54);
        soundEngine.playBallHit('soft');
        spawnBurst(activePlayer.x, activePlayer.y - 98, activePlayer.char.visual.auraColor, 15);
        showBanner(
          skill ? skill.indonesianName : 'Umpan Atas Presisi',
          `${activePlayer.char.name} melambungkan umpan ke titik pukul!`,
          'player',
          activePlayer.char.visual.auraColor
        );
        // Spiker begins smooth CSS run approach toward attack position
        pSpikerObj.targetX = 435;
        pSpikerObj.anim = 'RUN';
        syncPlayerSprites();
        launchBall(
          activePlayer.x + 4,
          activePlayer.y - 98,
          445,
          FLOOR_Y - 155,
          0.78,
          0,
          'player',
          'SPIKE',
          stats.technique * 0.9 + skillBonus,
          activePlayer.char.visual.auraColor
        );
      } else if (action === 'SPIKE') {
        setPlayerPose(activePlayer, 'SPIKE', 0.68, 445);
        soundEngine.playBallHit('heavy');
        sim.hitstop = 0.055;
        sim.shake = 9;
        spawnBurst(activePlayer.x + 20, activePlayer.y - 135, activePlayer.char.visual.auraColor, 24);
        const attackPower = (stats.power * 0.95 + stats.speed * 0.35 + skillBonus) * matchBonus;

        showBanner(
          skill ? skill.indonesianName : 'Spike Keras!',
          `${activePlayer.char.name} melompat tinggi dan menyambar bola!`,
          'player',
          activePlayer.char.visual.auraColor
        );
        const targetX = 720 + Math.random() * 195;
        const targetY = FLOOR_Y - 42;
        const fromY = activePlayer.y - 142;
        const traj = computeSpikeGravityTrajectory(fromY, targetY, attackPower, false);
        launchBall(
          activePlayer.x + 22,
          fromY,
          targetX,
          targetY,
          traj.duration,
          traj.magnusDrop,
          'player',
          'RECEIVE',
          attackPower,
          activePlayer.char.visual.auraColor
        );
      } else if (action === 'BLOCK') {
        setPlayerPose(activePlayer, 'BLOCK', 0.62);
        soundEngine.playBallHit('heavy');
        sim.hitstop = 0.045;
        sim.shake = 7;
        const blockPower = (stats.defense * 0.7 + stats.power * 0.4 + skillBonus) * matchBonus;

        if (blockPower >= incomingPower * 0.92 && Math.random() < 0.58) {
          spawnBurst(NET_X - 18, NET_TOP_FRONT + 12, '#FACC15', 26);
          sim.netShake = 1;
          awardPoint('player', `KILL BLOCK oleh ${activePlayer.char.name}!`);
          return;
        }
        if (sim.isOpponentUltIncoming || blockPower < incomingPower * 0.68) {
          spawnBurst(NET_X - 10, NET_TOP_FRONT + 25, '#FB7185', 20);
          sim.netShake = 1;
          awardPoint('opponent', `Blok tertembus oleh hantaman ${oSpikerObj.char.name}!`);
          return;
        }

        spawnBurst(activePlayer.x + 10, NET_TOP_FRONT + 16, activePlayer.char.visual.auraColor, 16);
        showBanner(
          skill ? skill.indonesianName : 'Soft Block!',
          `${activePlayer.char.name} membelokkan laju spike di atas net!`,
          'player',
          activePlayer.char.visual.auraColor
        );
        launchBall(
          activePlayer.x,
          NET_TOP_FRONT + 16,
          pSetterObj.baseX,
          pSetterObj.baseY - 96,
          0.76,
          0,
          'player',
          'SET',
          blockPower,
          activePlayer.char.visual.auraColor
        );
      }
    },
    [awardPoint, episode.opponent.bossUltimateChargeRate, oSpiker.name, setPlayerPose, showBanner, syncPlayerSprites]
  );

  // Keyboard shortcuts (PC: 1-4 / QWER / ASDF + Space Ultimate + Enter Recommended + Esc/P Pause)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === 'Escape' || k === 'p') {
        if (!cutscene && !matchResult) {
          setPaused((p) => !p);
        }
        return;
      }
      if (simRef.current.paused || simRef.current.phase !== 'PLAYER_PROMPT') return;
      if (k === '1' || k === 'q' || k === 'a') handlePlayerAction('RECEIVE');
      else if (k === '2' || k === 'w' || k === 's') handlePlayerAction('SET');
      else if (k === '3' || k === 'e' || k === 'd') handlePlayerAction('SPIKE');
      else if (k === '4' || k === 'r' || k === 'f') handlePlayerAction('BLOCK');
      else if (e.key === 'Enter') {
        e.preventDefault();
        handlePlayerAction(simRef.current.promptRecommended);
      } else if (k === '5' || e.key === ' ') {
        e.preventDefault();
        handlePlayerAction('ULTIMATE');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cutscene, handlePlayerAction, matchResult]);

  // Execute Ultimate Shot after Cutscene
  const handleCutsceneComplete = useCallback(() => {
    if (!cutscene) return;
    const sim = simRef.current;
    const { char, isOpponent, pendingAttackPower } = cutscene;
    setCutscene(null);
    sim.phase = 'IN_FLIGHT';
    soundEngine.playBallHit('heavy');
    sim.hitstop = 0.08;
    sim.shake = 18;

    if (!isOpponent) {
      const spikerObj =
        sim.players.find((p) => p.side === 'player' && p.role === 'SPIKER') || sim.players[0];
      if (!spikerObj) return;
      setPlayerPose(spikerObj, 'SPIKE', 0.72, 455);
      spawnBurst(spikerObj.x + 20, FLOOR_Y - 150, char.visual.auraColor, 38);

      showBanner(
        char.ultimate.indonesianName,
        `${char.name} melepaskan serangan pamungkas!`,
        'player',
        char.visual.auraColor
      );

      const ultFromY = FLOOR_Y - 152;
      const ultToX = 855 + Math.random() * 120;
      const ultToY = FLOOR_Y - 36;
      const ultTraj = computeSpikeGravityTrajectory(ultFromY, ultToY, pendingAttackPower, true);
      launchBall(
        spikerObj.x + 24,
        ultFromY,
        ultToX,
        ultToY,
        ultTraj.duration,
        ultTraj.magnusDrop,
        'player',
        'RECEIVE',
        pendingAttackPower,
        char.visual.auraColor,
        true
      );
    } else {
      const oSpikerObj =
        sim.players.find((p) => p.side === 'opponent' && p.role === 'SPIKER') ||
        sim.players[sim.players.length - 1];
      if (!oSpikerObj) return;
      setPlayerPose(oSpikerObj, 'SPIKE', 0.72, 665);
      spawnBurst(oSpikerObj.x - 20, FLOOR_Y - 150, char.visual.auraColor, 38);

      showBanner(
        char.ultimate.indonesianName,
        `AWAS! Serangan Ultimate dari ${char.name}!`,
        'opponent',
        char.visual.auraColor
      );

      sim.isOpponentUltIncoming = true;
      const oppUltFromY = FLOOR_Y - 152;
      const oppUltToY = FLOOR_Y - 46;
      const oppUltTraj = computeSpikeGravityTrajectory(oppUltFromY, oppUltToY, pendingAttackPower, true);
      launchBall(
        oSpikerObj.x - 24,
        oppUltFromY,
        225,
        oppUltToY,
        oppUltTraj.duration,
        oppUltTraj.magnusDrop,
        'opponent',
        'RECEIVE',
        pendingAttackPower,
        char.visual.auraColor,
        true
      );
    }
  }, [cutscene, setPlayerPose, showBanner]);

  // Mount dynamic Element Canvas Particles (Api, Petir, Air) over the screen during Ultimate Cutscene
  useEffect(() => {
    if (!cutscene || !elementCanvasRef.current) return;
    return startElementCanvasEffect(
      elementCanvasRef.current,
      cutscene.char.ultimate.theme,
      cutscene.char.visual.auraColor
    );
  }, [cutscene]);

  // ==============================================================
  // 60FPS CANVAS SIMULATION + ARTICULATED VOLLEYBALL RENDERER
  // ==============================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = COURT_W;
    canvas.height = COURT_H;

    let raf = 0;
    let lastTime = performance.now();

    const triggerOpponentAction = (
      side: Side,
      role: Role,
      incomingPower: number,
      isUltShot: boolean
    ) => {
      const sim = simRef.current;
      const oppPlayer =
        sim.players.find((p) => p.side === side && p.role === role) || sim.players[0];
      const oppSpiker =
        sim.players.find((p) => p.side === side && p.role === 'SPIKER') || oppPlayer;
      const oppSetter =
        sim.players.find((p) => p.side === side && p.role === 'SETTER') || oppPlayer;
      if (!oppPlayer || !oppSpiker || !oppSetter) return;
      const aiRating = 55 + episode.opponent.aiLevel * 0.72;

      if (sim.ball.nextActionPhase === 'RECEIVE') {
        setPlayerPose(oppPlayer, 'PASS_UNDER', 0.56);
        const saveThreshold = aiRating * (episode.opponent.isBoss ? 1.18 : 1.0);
        const failChance = isUltShot
          ? Math.max(0.55, (incomingPower - saveThreshold) / 140)
          : Math.max(0.14, (incomingPower - saveThreshold) / 130);

        if (Math.random() < failChance) {
          soundEngine.playBallHit('heavy');
          spawnBurst(oppPlayer.x, FLOOR_Y - 12, '#FACC15', 26);
          sim.shake = 12;
          awardPoint('player', `${pSpiker.name} mencetak poin langsung di sisi lawan!`);
          return;
        }

        soundEngine.playBallHit('soft');
        spawnBurst(oppPlayer.x - 10, oppPlayer.y - 46, oppPlayer.char.visual.auraColor, 13);
        launchBall(
          oppPlayer.x - 10,
          oppPlayer.y - 46,
          oppSetter.baseX,
          oppSetter.baseY - 98,
          0.84,
          0,
          'opponent',
          'SET',
          aiRating,
          oppPlayer.char.visual.auraColor
        );
      } else if (sim.ball.nextActionPhase === 'SET') {
        setPlayerPose(oppSetter, 'SET', 0.54);
        soundEngine.playBallHit('soft');
        oppSpiker.targetX = 685;
        oppSpiker.anim = 'RUN';
        syncPlayerSprites();
        launchBall(
          oppSetter.x - 4,
          oppSetter.y - 98,
          675,
          FLOOR_Y - 155,
          0.74,
          0,
          'opponent',
          'SPIKE',
          aiRating,
          oppSetter.char.visual.auraColor
        );
      } else if (sim.ball.nextActionPhase === 'SPIKE') {
        if (sim.oEnergy >= 100) {
          sim.oEnergy = 0;
          setOpponentEnergy(0);
          sim.phase = 'CUTSCENE_PAUSE';
          soundEngine.playUltimateCutscene();

          const bossPower =
            aiRating *
            oppSpiker.char.ultimate.powerMultiplier *
            episode.opponent.bossPowerMultiplier;
          setCutscene({
            char: oppSpiker.char,
            isOpponent: true,
            pendingAttackPower: bossPower,
          });
          return;
        }

        setPlayerPose(oppSpiker, 'SPIKE', 0.66, 675);
        soundEngine.playBallHit('heavy');
        sim.shake = 7;
        const oppAtk =
          (aiRating + oppSpiker.char.signatureSkill.powerBonus * 0.65) *
          episode.opponent.bossPowerMultiplier;

        showBanner(
          oppSpiker.char.signatureSkill.indonesianName,
          `${oppSpiker.char.name} melancarkan serangan!`,
          'opponent',
          oppSpiker.char.visual.auraColor
        );

        sim.isOpponentUltIncoming = false;
        const aimBlock = Math.random() < 0.44;
        const oppFromY = oppSpiker.y - 142;
        const oppTargetY = aimBlock ? NET_TOP_FRONT + 22 : FLOOR_Y - 42;
        const oppTraj = computeSpikeGravityTrajectory(oppFromY, oppTargetY, oppAtk, false);
        const oppBlockDur = Math.max(0.24, 0.5 - Math.min(1.4, Math.max(0, (oppAtk - 55) / 185)) * 0.16);
        launchBall(
          oppSpiker.x - 20,
          oppFromY,
          aimBlock ? 486 : 225,
          oppTargetY,
          aimBlock ? oppBlockDur : oppTraj.duration,
          aimBlock ? 420 : oppTraj.magnusDrop,
          'opponent',
          aimBlock ? 'BLOCK' : 'RECEIVE',
          oppAtk,
          oppSpiker.char.visual.auraColor
        );
      }
    };

    const drawPerspectiveCourtAndNet = (now: number, netShake: number) => {
      // Arena dark lower surround
      ctx.fillStyle = '#0A101F';
      ctx.fillRect(0, 326, COURT_W, COURT_H - 326);

      // Outer Blue-Slate Court Apron (Trapezoid in 3D perspective)
      ctx.fillStyle = '#17253B';
      ctx.beginPath();
      ctx.moveTo(155, 336);
      ctx.lineTo(COURT_W - 155, 336);
      ctx.lineTo(COURT_W - 22, 496);
      ctx.lineTo(22, 496);
      ctx.closePath();
      ctx.fill();

      // Inner Polished Hardwood Court Floor (Trapezoid)
      const woodGrad = ctx.createLinearGradient(0, 344, 0, 486);
      woodGrad.addColorStop(0, '#A86228');
      woodGrad.addColorStop(0.5, '#C47735');
      woodGrad.addColorStop(1, '#8A4C19');
      ctx.fillStyle = woodGrad;
      ctx.beginPath();
      ctx.moveTo(185, 344);
      ctx.lineTo(COURT_W - 185, 344);
      ctx.lineTo(COURT_W - 55, 484);
      ctx.lineTo(55, 484);
      ctx.closePath();
      ctx.fill();

      // Hardwood Plank Perspective Lines
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.28)';
      ctx.lineWidth = 1.2;
      for (let p = 1; p < 12; p++) {
        const f = p / 12;
        const topX = 185 + (COURT_W - 370) * f;
        const botX = 55 + (COURT_W - 110) * f;
        ctx.beginPath();
        ctx.moveTo(topX, 344);
        ctx.lineTo(botX, 484);
        ctx.stroke();
      }

      // Glossy Spotlight Reflection on Court
      const sheen = ctx.createRadialGradient(NET_X, 410, 20, NET_X, 410, 360);
      sheen.addColorStop(0, 'rgba(255, 247, 214, 0.16)');
      sheen.addColorStop(1, 'transparent');
      ctx.fillStyle = sheen;
      ctx.fillRect(60, 340, COURT_W - 120, 150);

      // Attack Zone Subtle Team Tints (3-Meter Zones)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.10)';
      ctx.beginPath();
      ctx.moveTo(NET_X - 125, 344);
      ctx.lineTo(NET_X, 344);
      ctx.lineTo(NET_X, 484);
      ctx.lineTo(NET_X - 170, 484);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(251, 113, 133, 0.10)';
      ctx.beginPath();
      ctx.moveTo(NET_X, 344);
      ctx.lineTo(NET_X + 125, 344);
      ctx.lineTo(NET_X + 170, 484);
      ctx.lineTo(NET_X, 484);
      ctx.closePath();
      ctx.fill();

      // Crisp White Boundary Lines, Center Line & 3m Attack Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Far sideline
      ctx.moveTo(185, 344);
      ctx.lineTo(COURT_W - 185, 344);
      // Near sideline
      ctx.moveTo(55, 484);
      ctx.lineTo(COURT_W - 55, 484);
      // Left baseline
      ctx.moveTo(185, 344);
      ctx.lineTo(55, 484);
      // Right baseline
      ctx.moveTo(COURT_W - 185, 344);
      ctx.lineTo(COURT_W - 55, 484);
      // Center line
      ctx.moveTo(NET_X, 344);
      ctx.lineTo(NET_X, 484);
      // Left 3m Attack Line
      ctx.moveTo(NET_X - 125, 344);
      ctx.lineTo(NET_X - 170, 484);
      // Right 3m Attack Line
      ctx.moveTo(NET_X + 125, 344);
      ctx.lineTo(NET_X + 170, 484);
      ctx.stroke();

      // Referee Stand on Far Side
      ctx.fillStyle = '#334155';
      ctx.fillRect(NET_X - 14, 290, 28, 52);
      ctx.fillStyle = '#475569';
      ctx.fillRect(NET_X - 18, 286, 36, 7);

      // =====================================================
      // HIGH-DETAIL 3D PERSPECTIVE VOLLEYBALL NET
      // =====================================================
      const backX = NET_X + 16;
      const frontX = NET_X - 16;
      const wave = Math.sin(now * 0.045) * netShake * 9;

      // Far Post + Protective Navy/Amber Pad
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(backX, 342);
      ctx.lineTo(backX, NET_TOP_BACK - 14);
      ctx.stroke();
      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(backX - 6, 285, 12, 56);

      // Net Shadow on Court Floor
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(backX, 344);
      ctx.lineTo(frontX, 484);
      ctx.stroke();

      // Net Mesh Body (Semi-transparent backing + crisp diamond/grid mesh)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(backX, NET_TOP_BACK);
      ctx.lineTo(frontX + wave, NET_TOP_FRONT);
      ctx.lineTo(frontX + wave * 0.4, NET_BOT_FRONT);
      ctx.lineTo(backX, NET_BOT_BACK);
      ctx.closePath();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
      ctx.fill();
      ctx.clip();

      // Vertical & Horizontal Mesh Strings
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
      ctx.lineWidth = 1.2;
      const cols = 12;
      for (let c = 0; c <= cols; c++) {
        const f = c / cols;
        const tx = backX + (frontX + wave - backX) * f;
        const ty = NET_TOP_BACK + (NET_TOP_FRONT - NET_TOP_BACK) * f;
        const bx = backX + (frontX + wave * 0.4 - backX) * f;
        const by = NET_BOT_BACK + (NET_BOT_FRONT - NET_BOT_BACK) * f;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      const rows = 8;
      for (let r = 0; r <= rows; r++) {
        const f = r / rows;
        const ly = NET_TOP_BACK + (NET_BOT_BACK - NET_TOP_BACK) * f;
        const ry = NET_TOP_FRONT + (NET_BOT_FRONT - NET_TOP_FRONT) * f;
        ctx.beginPath();
        ctx.moveTo(backX, ly);
        ctx.lineTo(frontX + wave * (1 - f * 0.5), ry);
        ctx.stroke();
      }
      ctx.restore();

      // Bottom Tension Cable & Side White Sleeves
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(backX, NET_BOT_BACK);
      ctx.lineTo(frontX + wave * 0.4, NET_BOT_FRONT);
      ctx.stroke();

      // Top Crisp White Canvas Net Tape
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(backX, NET_TOP_BACK);
      ctx.lineTo(frontX + wave, NET_TOP_FRONT);
      ctx.stroke();

      // Red & White Striped Fiberglass Antennas (Both Sidelines)
      const drawAntenna = (ax: number, topY: number, botY: number) => {
        for (let seg = 0; seg < 6; seg++) {
          const y1 = botY + ((topY - botY) * seg) / 6;
          const y2 = botY + ((topY - botY) * (seg + 1)) / 6;
          ctx.strokeStyle = seg % 2 === 0 ? '#EF4444' : '#FFFFFF';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(ax, y1);
          ctx.lineTo(ax, y2);
          ctx.stroke();
        }
      };
      drawAntenna(backX, NET_TOP_BACK - 38, NET_BOT_BACK);
      drawAntenna(frontX + wave, NET_TOP_FRONT - 42, NET_BOT_FRONT);

      // Near Post + Protective Navy/Amber Pad + Crank Wheel
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(frontX, 486);
      ctx.lineTo(frontX + wave * 0.35, NET_TOP_FRONT - 10);
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(frontX - 8, 396, 16, 86, 4);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(frontX - 8, 396, 16, 86);
        ctx.strokeRect(frontX - 8, 396, 16, 86);
      }
    };

    let lastServeStarted = false;

    const step = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const sim = simRef.current;

      if (!sim.paused) {
        const dt = rawDt * sim.speed;

        if (sim.hitstop > 0) {
          sim.hitstop -= rawDt;
        } else {
          sim.shake = Math.max(0, sim.shake - rawDt * 28);
          sim.netShake = Math.max(0, sim.netShake - rawDt * 3.2);

          // Update particles
          for (let i = sim.particles.length - 1; i >= 0; i--) {
            const pt = sim.particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vy += 520 * dt;
            pt.life -= dt;
            if (pt.life <= 0) sim.particles.splice(i, 1);
          }

          // Update player animation phaseSteps & CSS-transition target coordinates
          for (const pl of sim.players) {
            if (pl.animTimer > 0) {
              pl.animTimer -= dt;
              const progress = 1 - Math.max(0, pl.animTimer / pl.animDuration);
              pl.phaseStep = progress > 0.7 ? 2 : progress > 0.28 ? 1 : 0;
              if (pl.animTimer <= 0) {
                pl.anim = 'IDLE';
                pl.phaseStep = 0;
                pl.targetX = pl.baseX;
              }
            } else {
              const dx = pl.baseX - pl.x;
              if (Math.abs(dx) > 10) {
                pl.anim = 'RUN';
                pl.targetX = pl.baseX;
              } else {
                pl.anim = 'IDLE';
                pl.targetX = pl.baseX;
              }
            }
            pl.x += (pl.targetX - pl.x) * Math.min(1, dt * 6);
          }
          syncPlayerSprites();

          // State Machine
          if (sim.phase === 'POINT_SCORED') {
            sim.pointTimer -= rawDt;
            // Realistic floor bounce physics after point scored
            const b = sim.ball;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.vy += GRAVITY * dt;
            b.spin += b.spinRate * dt;
            if (b.y > FLOOR_Y - 10) {
              b.y = FLOOR_Y - 10;
              b.vy = -Math.abs(b.vy) * 0.52;
              b.vx *= 0.8;
            }

            if (sim.pointTimer <= 0) {
              sim.phase = 'SERVE_TOSS';
              sim.serveSubTimer = 0;
              sim.serveStruck = false;
              lastServeStarted = false;
              sim.ball.trail = [];
              sim.isOpponentUltIncoming = false;
            }
          } else if (sim.phase === 'SERVE_TOSS') {
            const server =
              sim.players.find((p) => p.side === sim.servingSide && p.role === 'SPIKER') ||
              sim.players[0];
            if (!server) return;
            const serveX = sim.servingSide === 'player' ? 115 : COURT_W - 115;

            if (!lastServeStarted) {
              lastServeStarted = true;
              setPlayerPose(server, 'SERVE', 0.92, serveX);
              sim.ball.x = serveX + server.facing * 14;
              sim.ball.y = server.baseY - 62;
              sim.ball.vx = server.facing * 22;
              sim.ball.vy = -440;
            }

            sim.serveSubTimer += dt;
            const b = sim.ball;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.vy += GRAVITY * dt;
            b.spin += 6 * dt;

            if (sim.serveSubTimer >= 0.56 && !sim.serveStruck) {
              sim.serveStruck = true;
              soundEngine.playBallHit('medium');
              spawnBurst(b.x, b.y, server.char.visual.auraColor, 14);

              if (sim.servingSide === 'player') {
                launchBall(
                  b.x,
                  b.y,
                  845,
                  FLOOR_Y - 46,
                  0.98,
                  180,
                  'player',
                  'RECEIVE',
                  68 + server.level * 2,
                  server.char.visual.auraColor
                );
              } else {
                launchBall(
                  b.x,
                  b.y,
                  220,
                  FLOOR_Y - 46,
                  1.04,
                  165,
                  'opponent',
                  'RECEIVE',
                  62 + episode.opponent.aiLevel * 0.65,
                  server.char.visual.auraColor
                );
              }
              sim.phase = 'IN_FLIGHT';
            }
          } else if (sim.phase === 'IN_FLIGHT') {
            const b = sim.ball;
            const effG = GRAVITY + b.magnusDrop;
            const prevX = b.x;

            b.flightT += dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.vy += effG * dt;
            b.spin += b.spinRate * dt;

            b.trail.push({ x: b.x, y: b.y });
            if (b.trail.length > 16) b.trail.shift();

            // Net crossing ripple check
            if ((prevX < NET_X && b.x >= NET_X) || (prevX > NET_X && b.x <= NET_X)) {
              if (b.y > NET_TOP_FRONT - 16) sim.netShake = 0.85;
            }

            // Target player runs smoothly toward incoming landing coordinate
            const onPlayerSide = b.targetX < NET_X;
            const role: Role =
              b.nextActionPhase === 'SET'
                ? 'SETTER'
                : b.nextActionPhase === 'BLOCK'
                ? 'BLOCKER'
                : 'SPIKER';
            const targetP = sim.players.find(
              (p) => p.side === (onPlayerSide ? 'player' : 'opponent') && p.role === role
            );
            if (targetP && targetP.animTimer <= 0) {
              targetP.targetX = b.targetX;
              if (Math.abs(b.targetX - targetP.x) > 10) {
                targetP.anim = 'RUN';
              }
            }

            // Arrival at contact window!
            if (b.flightT >= b.flightDur) {
              if (onPlayerSide) {
                sim.phase = 'PLAYER_PROMPT';
                sim.promptTargetRole = role;
                sim.promptRecommended = b.nextActionPhase;
                sim.promptMax = sim.autoAssist ? 0.25 : 3.6;
                sim.promptTimer = sim.promptMax;

                if (!sim.autoAssist) {
                  const resolvedChar = targetP ? targetP.char : pSpiker;
                  setPrompt({
                    active: true,
                    role,
                    char: resolvedChar,
                    recommended: b.nextActionPhase,
                    timeLeft: sim.promptMax,
                    maxTime: sim.promptMax,
                    incomingPower: b.incomingPower,
                    isOpponentUlt: sim.isOpponentUltIncoming,
                  });
                }
              } else {
                triggerOpponentAction('opponent', role, b.incomingPower, b.isUltimateShot);
              }
            }
          } else if (sim.phase === 'PLAYER_PROMPT') {
            sim.promptTimer -= rawDt;
            // Subtle slow-motion drift during prompt so ball feels alive!
            sim.ball.spin += sim.ball.spinRate * rawDt * 0.15;
            if (sim.autoAssist && sim.promptTimer <= 0) {
              if (sim.pEnergy >= 100 && sim.promptRecommended === 'SPIKE') {
                handlePlayerAction('ULTIMATE');
              } else {
                handlePlayerAction(sim.promptRecommended);
              }
            } else if (!sim.autoAssist) {
              setPrompt((prev) => (prev ? { ...prev, timeLeft: Math.max(0, sim.promptTimer) } : null));
              if (sim.promptTimer <= 0) {
                setPrompt(null);
                spawnBurst(sim.ball.x, FLOOR_Y - 6, '#FB7185', 18);
                awardPoint('opponent', 'Terlambat bereaksi—bola jatuh di lapangan kita!');
              }
            }
          }
        }
      }

      // =====================================================
      // RENDER LIVE COURT + NET + PLAYERS + REALISTIC BALL
      // =====================================================
      ctx.save();
      if (sim.shake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * sim.shake,
          (Math.random() - 0.5) * sim.shake
        );
      }

      ctx.clearRect(0, 0, COURT_W, COURT_H);
      drawPerspectiveCourtAndNet(now, sim.netShake);

      // Draw Ball Motion Trail
      const b = sim.ball;
      for (let i = 0; i < b.trail.length; i++) {
        const pt = b.trail[i];
        const alpha = ((i + 1) / b.trail.length) * (b.isUltimateShot ? 0.65 : 0.32);
        ctx.fillStyle = b.shotColor;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5 + (i / b.trail.length) * (b.isUltimateShot ? 11 : 6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Ball Floor Shadow (scales softly with height)
      const ballAlt = Math.max(0, FLOOR_Y - b.y);
      const bShadowR = Math.max(6, 17 - ballAlt * 0.032);
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath();
      ctx.ellipse(b.x, FLOOR_Y + 6, bShadowR, bShadowR * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Realistic 3D-Shaded Volleyball with Rotating Panel Seams
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

      // Curved Blue Volleyball Panel Bands
      ctx.strokeStyle = '#1D4ED8';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, 11, -0.5, 1.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 11, 2.5, 4.4);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.quadraticCurveTo(0, 2, 10, -4);
      ctx.stroke();
      ctx.restore();

      // Slow-Mo Tactical Ring around Ball during PLAYER_PROMPT
      if (sim.phase === 'PLAYER_PROMPT') {
        const ratio = Math.max(0, sim.promptTimer / sim.promptMax);
        ctx.save();
        ctx.strokeStyle = sim.isOpponentUltIncoming ? '#FB7185' : '#FACC15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 33, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Impact Particles
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
  }, [awardPoint, episode.opponent.aiLevel, episode.opponent.bossPowerMultiplier, handlePlayerAction, pSpiker.name, setPlayerPose, showBanner, syncPlayerSprites]);

  const activePromptSkill =
    prompt &&
    (prompt.char.signatureSkill.actionType === prompt.recommended
      ? prompt.char.signatureSkill
      : prompt.char.secondarySkill.actionType === prompt.recommended
      ? prompt.char.secondarySkill
      : null);

  return (
    <div className="relative w-full h-[100dvh] min-h-0 bg-[#070B14] overflow-hidden flex flex-col justify-between select-none">
      {/* Arena Background Art (hidden during cutscene) */}
      {!cutscene && (
        <>
          <img
            src="/src/assets/images/court_arena_backdrop_1795623799824.jpg"
            alt="Latar Stadion Pertandingan"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070B14]/85 via-transparent to-[#070B14]/95 pointer-events-none" />
        </>
      )}

      {/* TOP SCOREBOARD HUD (hidden during cutscene) */}
      <header className={`relative z-20 flex items-center justify-between gap-2 px-3 md:px-8 pt-2 md:pt-3 pb-1 md:pb-2 transition-opacity duration-150 ${cutscene ? 'opacity-0 pointer-events-none' : 'pointer-events-auto'}`}>
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={() => {
              soundEngine.playClick();
              setPaused(true);
            }}
            className="p-2 md:p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Jeda Pertandingan (Esc)"
          >
            <Pause className="w-4 h-4" />
          </button>
          <div className="hidden sm:block min-w-0">
            <p className="text-[11px] md:text-xs text-slate-400">
              Chapter {episode.chapterNumber} · Ep. {episode.episodeNumber}
              {episode.opponent.isBoss ? ' · FINAL BOSS' : ''}
            </p>
            <p className="font-display text-base md:text-lg font-bold tracking-wide text-white truncate max-w-[160px] md:max-w-xs">
              {episode.title}
            </p>
          </div>
        </div>

        {/* Center Match Scoreboard 0-21 */}
        <div className="flex items-center gap-3 sm:gap-4 md:gap-7 px-3 sm:px-5 py-1.5 md:py-2 rounded-xl bg-slate-950/90 border border-slate-700/70 shadow-lg">
          <div className="text-right">
            <p className="text-[10px] md:text-[11px] uppercase tracking-wider text-sky-400 font-semibold">Tim Kita</p>
            <p className="font-mono-num text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-none">
              {playerScore}
            </p>
          </div>
          <div className="text-center px-1 sm:px-2">
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400">Target 21</p>
            <p className="font-display text-base sm:text-xl text-amber-400 font-bold">VS</p>
          </div>
          <div className="text-left">
            <p className="text-[10px] md:text-[11px] uppercase tracking-wider text-rose-400 font-semibold truncate max-w-[78px] sm:max-w-[120px]">
              {episode.opponent.teamName}
            </p>
            <p className="font-mono-num text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-none">
              {opponentScore}
            </p>
          </div>
        </div>

        {/* Utility Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundEngine.playClick();
              setAutoAssist((a) => !a);
            }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
              autoAssist
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {autoAssist ? 'Auto: ON' : 'Manual'}
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setSpeedMult((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1));
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700 text-xs font-mono-num font-bold text-amber-300 hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <FastForward className="w-3.5 h-3.5" />
            {speedMult}x
          </button>
          <button
            onClick={onToggleMute}
            className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 hover:bg-slate-800 cursor-pointer"
            title={muted ? 'Aktifkan Suara' : 'Bisukan Suara'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Energy Meters Strip */}
      <div className={`relative z-20 max-w-4xl w-full mx-auto px-4 flex items-center justify-between gap-6 pointer-events-none transition-opacity duration-150 ${cutscene ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-sky-300 font-semibold">Energi Ultimate Tim</span>
            <span className="font-mono-num text-amber-300 font-bold">{playerEnergy}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                playerEnergy >= 100
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                  : 'bg-gradient-to-r from-sky-500 to-cyan-300'
              }`}
              style={{ width: `${playerEnergy}%` }}
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-mono-num text-rose-300 font-bold">{opponentEnergy}%</span>
            <span className="text-rose-300 font-semibold">
              {episode.opponent.isBoss ? 'Energi Final Boss' : 'Energi Lawan'}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-rose-500 to-orange-400 transition-all duration-200 ml-auto"
              style={{ width: `${opponentEnergy}%` }}
            />
          </div>
        </div>
      </div>

      {/* LIVE 3v3 COURT CANVAS + CSS-TRANSITIONED PLAYERS LAYER (hidden during Ultimate Cutscene) */}
      <div className={`relative flex-1 min-h-0 flex items-center justify-center px-2 md:px-6 py-1 overflow-hidden transition-opacity duration-150 ${cutscene ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div
          onClick={() => {
            if (prompt) handlePlayerAction(prompt.recommended);
          }}
          className={`relative w-full h-full max-w-[1120px] max-h-[540px] flex items-center justify-center ${
            prompt ? 'cursor-pointer' : ''
          }`}
        >
          <div className="relative w-full max-h-full aspect-[2/1] rounded-xl shadow-2xl border border-slate-800/70 bg-slate-950/35 overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
            />
            {!cutscene && (
              <div className="absolute inset-0 pointer-events-none">
                {playerSprites.map((pl) => (
                  <CourtPlayerSprite key={pl.id} player={pl} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Skill / Point Callout Banner */}
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

      {/* BOTTOM TACTICAL SKILL CONTROL BAR (Mobile Thumb Pad + PC Keyboard Deck) */}
      <TacticalController
        prompt={
          prompt
            ? {
                role: prompt.role,
                char: prompt.char,
                recommended: prompt.recommended,
                timeLeft: prompt.timeLeft,
                maxTime: prompt.maxTime,
                skillName: activePromptSkill?.indonesianName,
              }
            : null
        }
        energy={playerEnergy}
        idleText="Reli berlangsung... Ketuk tombol skill / lapangan (HP) atau 1-4 · QWER · Enter · Spasi (PC)"
        hidden={Boolean(cutscene)}
        onAction={handlePlayerAction}
      />

      {/* DRAMATIC ULTIMATE CUTSCENE OVERLAY + FULLSCREEN ELEMENT PARTICLES CANVAS */}
      {cutscene && (
        <>
          <UltimateCutscene
            character={cutscene.char}
            isOpponent={cutscene.isOpponent}
            onComplete={handleCutsceneComplete}
          />
          <canvas
            ref={elementCanvasRef}
            className="fixed inset-0 z-[55] w-full h-full pointer-events-none"
          />
        </>
      )}

      {/* PAUSE MODAL */}
      {paused && !matchResult && (
        <div className="fixed inset-0 z-40 bg-slate-950/85 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111827] border border-slate-700 p-6 space-y-5 shadow-2xl">
            <div>
              <p className="text-xs text-slate-400">Pertandingan Dijeda</p>
              <h3 className="font-display text-3xl font-bold text-white">{episode.title}</h3>
              <p className="text-sm text-slate-300 mt-1">
                Skor Saat Ini: {playerScore} – {opponentScore} (Target 21)
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setPaused(false)}
                className="w-full py-3 rounded-xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-2 hover:bg-amber-300 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Lanjutkan Pertandingan
              </button>
              <button
                onClick={onExitToMenu}
                className="w-full py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Keluar ke Menu Peta
              </button>
            </div>
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
                  {matchResult.won ? 'Kemenangan Mutlak!' : 'Kalah di Poin Penentuan'}
                </p>
                <h3 className="font-display text-4xl font-extrabold text-white">
                  {matchResult.pScore} – {matchResult.oScore}
                </h3>
                <p className="text-sm text-slate-300 mt-1">
                  {matchResult.won
                    ? `Tim kita menaklukkan ${episode.opponent.teamName}!`
                    : `${episode.opponent.teamName} unggul lebih dulu mencapai 21 poin.`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs text-slate-400">Koin Diperoleh</p>
                <p className="font-mono-num text-2xl font-bold text-amber-400">+100 Koin</p>
                <p className="text-[11px] text-slate-400">100 Koin tetap didapat setiap tanding</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">EXP Tim Aktif</p>
                <p className="font-mono-num text-2xl font-bold text-sky-400">
                  +{matchResult.won ? episode.rewardExp : Math.round(episode.rewardExp * 0.6)} EXP
                </p>
                <p className="text-[11px] text-slate-400">Semua 3 pemain naik level</p>
              </div>
            </div>

            {episode.unlocksAwakening && matchResult.won && (
              <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-200 text-sm">
                <strong>Bakat Tersembunyi Terbangun!</strong> Raka Pratama (Awakened) kini terbuka di
                Inventori & Tim!
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  onFinishMatch({
                    won: matchResult.won,
                    playerScore: matchResult.pScore,
                    opponentScore: matchResult.oScore,
                    coinsEarned: 100,
                    expEarned: matchResult.won
                      ? episode.rewardExp
                      : Math.round(episode.rewardExp * 0.6),
                  })
                }
                className="flex-1 py-3 px-5 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition-colors cursor-pointer"
              >
                {matchResult.won ? 'Simpan & Lanjutkan' : 'Kembali & Latih Tim'}
              </button>
              {!matchResult.won && (
                <button
                  onClick={() => {
                    const sim = simRef.current;
                    sim.pScore = 0;
                    sim.oScore = 0;
                    sim.pEnergy = 25;
                    sim.oEnergy = episode.opponent.isBoss ? 35 : 15;
                    sim.phase = 'SERVE_TOSS';
                    sim.serveSubTimer = 0;
                    sim.serveStruck = false;
                    setPaused(false);
                    setPrompt(null);
                    setCallout(null);
                    setPlayerScore(0);
                    setOpponentScore(0);
                    setPlayerEnergy(25);
                    setOpponentEnergy(episode.opponent.isBoss ? 35 : 15);
                    setMatchResult(null);
                    soundEngine.playWhistle('start');
                  }}
                  className="py-3 px-4 rounded-xl bg-slate-800 text-white font-semibold flex items-center gap-2 hover:bg-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Ulangi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
