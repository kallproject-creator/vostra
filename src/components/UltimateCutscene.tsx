import React, { useEffect, useRef, useState } from 'react';
import { CharacterDef, CutsceneTheme } from '../types/game';
import { AnimePortrait } from './AnimePortrait';

interface UltimateCutsceneProps {
  character: CharacterDef;
  isOpponent: boolean;
  onComplete: () => void;
}

const THEME_PALETTES: Record<
  CutsceneTheme,
  { bgGlow: string; primary: string; secondary: string; core: string; badge: string }
> = {
  dragon: { bgGlow: '#7C2D12', primary: '#F59E0B', secondary: '#EF4444', core: '#FEF3C7', badge: 'NAGA KAISAR' },
  fire: { bgGlow: '#991B1B', primary: '#F97316', secondary: '#FDE047', core: '#FFFBEB', badge: 'SUAR SURYA' },
  water: { bgGlow: '#0E7490', primary: '#22D3EE', secondary: '#38BDF8', core: '#ECFEFF', badge: 'TSUNAMI' },
  kraken: { bgGlow: '#0F766E', primary: '#2DD4BF', secondary: '#5EEAD4', core: '#F0FDFA', badge: 'KRAKEN PALUNG' },
  lightning: { bgGlow: '#1E1B4B', primary: '#FACC15', secondary: '#38BDF8', core: '#FFFFFF', badge: 'HALILINTAR' },
  wind: { bgGlow: '#065F46', primary: '#34D399', secondary: '#A7F3D0', core: '#ECFDF5', badge: 'BADAI ANGIN' },
  earth: { bgGlow: '#78350F', primary: '#F59E0B', secondary: '#D97706', core: '#FEF3C7', badge: 'TEKTONIK' },
  railgun: { bgGlow: '#1E3A8A', primary: '#38BDF8', secondary: '#F43F5E', core: '#F0F9FF', badge: 'RAILGUN' },
  katana: { bgGlow: '#881337', primary: '#FB7185', secondary: '#F43F5E', core: '#FFFFFF', badge: 'KATANA SLASH' },
  sniper: { bgGlow: '#14532D', primary: '#4ADE80', secondary: '#FACC15', core: '#F0FDF4', badge: 'SNIPER CROSS' },
  guillotine: { bgGlow: '#3F3F46', primary: '#EF4444', secondary: '#E2E8F0', core: '#FFFFFF', badge: 'GUILLOTINE' },
  meteor: { bgGlow: '#4C1D95', primary: '#F97316', secondary: '#C084FC', core: '#FFF7ED', badge: 'METEOR FALL' },
  blackhole: { bgGlow: '#3B0764', primary: '#A855F7', secondary: '#F472B6', core: '#FAF5FF', badge: 'EVENT HORIZON' },
  chronos: { bgGlow: '#1E3A8A', primary: '#38BDF8', secondary: '#FACC15', core: '#FFFFFF', badge: 'CHRONOS SYNC' },
  viper: { bgGlow: '#166534', primary: '#A3E635', secondary: '#4ADE80', core: '#F7FEE7', badge: 'VIPER STRIKE' },
  eagle: { bgGlow: '#713F12', primary: '#FBBF24', secondary: '#FEF08A', core: '#FFFFFF', badge: 'EAGLE EYE' },
  cerberus: { bgGlow: '#7F1D1D', primary: '#EF4444', secondary: '#F59E0B', core: '#FEF2F2', badge: 'CERBERUS' },
  pegasus: { bgGlow: '#0369A1', primary: '#BAE6FD', secondary: '#38BDF8', core: '#FFFFFF', badge: 'PEGASUS' },
  phoenix: { bgGlow: '#B91C1C', primary: '#FB923C', secondary: '#FEF08A', core: '#FFFFFF', badge: 'PHOENIX' },
  king: { bgGlow: '#831843', primary: '#FB7185', secondary: '#FACC15', core: '#FFF1F2', badge: 'INTIMIDASI RAJA' },
  puppeteer: { bgGlow: '#581C87', primary: '#C084FC', secondary: '#F0ABFC', core: '#FAF5FF', badge: 'BENANG DALANG' },
  phantom: { bgGlow: '#334155', primary: '#818CF8', secondary: '#E2E8F0', core: '#FFFFFF', badge: 'PHANTOM' },
  checkmate: { bgGlow: '#881337', primary: '#FB7185', secondary: '#FACC15', core: '#FFFFFF', badge: 'SKAKMAT' },
  genesis: { bgGlow: '#1E3A8A', primary: '#FACC15', secondary: '#38BDF8', core: '#FFFFFF', badge: 'CHRONO-GENESIS' },
};

const DURATION_MS = 3100;

interface BoltSeed {
  appearAt: number;
  xFrac: number;
  topYFrac: number;
  botYFrac: number;
  jitterSeed: number;
  width: number;
  colorType: 'primary' | 'secondary' | 'core';
}

const BOLT_SEEDS: BoltSeed[] = [
  // Act 1: Appear one by one around the character
  { appearAt: 0.08, xFrac: 0.24, topYFrac: 0.0, botYFrac: 0.85, jitterSeed: 1.1, width: 4, colorType: 'primary' },
  { appearAt: 0.17, xFrac: 0.76, topYFrac: 0.0, botYFrac: 0.88, jitterSeed: 2.3, width: 4.5, colorType: 'secondary' },
  { appearAt: 0.25, xFrac: 0.36, topYFrac: 0.02, botYFrac: 0.72, jitterSeed: 3.7, width: 5, colorType: 'primary' },
  // Act 2: Escalate rapidly — filling the black screen
  { appearAt: 0.32, xFrac: 0.65, topYFrac: 0.0, botYFrac: 0.78, jitterSeed: 4.9, width: 5, colorType: 'core' },
  { appearAt: 0.37, xFrac: 0.15, topYFrac: 0.05, botYFrac: 0.92, jitterSeed: 5.5, width: 4, colorType: 'secondary' },
  { appearAt: 0.41, xFrac: 0.86, topYFrac: 0.03, botYFrac: 0.9, jitterSeed: 6.8, width: 4.5, colorType: 'primary' },
  { appearAt: 0.45, xFrac: 0.43, topYFrac: 0.0, botYFrac: 0.66, jitterSeed: 7.4, width: 5.5, colorType: 'secondary' },
  { appearAt: 0.49, xFrac: 0.58, topYFrac: 0.0, botYFrac: 0.7, jitterSeed: 8.2, width: 5.5, colorType: 'primary' },
  { appearAt: 0.53, xFrac: 0.29, topYFrac: 0.08, botYFrac: 0.95, jitterSeed: 9.6, width: 6, colorType: 'core' },
  { appearAt: 0.56, xFrac: 0.71, topYFrac: 0.05, botYFrac: 0.95, jitterSeed: 10.9, width: 6, colorType: 'primary' },
  { appearAt: 0.59, xFrac: 0.19, topYFrac: 0.0, botYFrac: 0.8, jitterSeed: 11.3, width: 6.5, colorType: 'secondary' },
  { appearAt: 0.62, xFrac: 0.81, topYFrac: 0.0, botYFrac: 0.82, jitterSeed: 12.7, width: 6.5, colorType: 'core' },
];

export const UltimateCutscene: React.FC<UltimateCutsceneProps> = ({
  character,
  isOpponent,
  onComplete,
}) => {
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const [actPhase, setActPhase] = useState<0 | 1 | 2>(0);

  const theme = character.ultimate.theme;
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.fire;

  useEffect(() => {
    const t1 = window.setTimeout(() => setActPhase(1), Math.round(DURATION_MS * 0.3));
    const t2 = window.setTimeout(() => setActPhase(2), Math.round(DURATION_MS * 0.66));
    const tEnd = window.setTimeout(() => onCompleteRef.current(), DURATION_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(tEnd);
    };
  }, []);

  useEffect(() => {
    const backCanvas = backCanvasRef.current;
    const frontCanvas = frontCanvasRef.current;
    if (!backCanvas || !frontCanvas) return;
    const bCtx = backCanvas.getContext('2d');
    const fCtx = frontCanvas.getContext('2d');
    if (!bCtx || !fCtx) return;

    let raf = 0;
    const start = performance.now();
    const W = (backCanvas.width = frontCanvas.width = 1280);
    const H = (backCanvas.height = frontCanvas.height = 720);
    const dir = isOpponent ? -1 : 1;

    // Target volleyball resting beside normal-sized center character during buildup, then blasted on climax
    const restBallX = W * 0.5 + dir * 165;
    const restBallY = H * 0.41;
    const climaxT = 0.66;

    const drawJaggedBolt = (
      ctx: CanvasRenderingContext2D,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      segments: number,
      spread: number,
      seed: number,
      t: number,
      strokeColor: string,
      lineWidth: number,
      glowColor: string
    ) => {
      ctx.save();
      ctx.shadowBlur = 28;
      ctx.shadowColor = glowColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      for (let i = 1; i < segments; i++) {
        const f = i / segments;
        const bx = x1 + (x2 - x1) * f;
        const by = y1 + (y2 - y1) * f;
        const flicker = Math.sin(t * 58 + i * 7.3 + seed * 11.7) * spread;
        const offsetY = Math.cos(t * 42 + i * 5.1 + seed * 4.3) * (spread * 0.35);
        ctx.lineTo(bx + flicker, by + offsetY);
      }
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    };

    const drawVolleyBall = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      r: number,
      spin: number,
      chargeLevel: number
    ) => {
      ctx.save();
      ctx.translate(x, y);

      // Outer energy halo around the ball as it charges
      if (chargeLevel > 0.05) {
        const haloR = r * (1.5 + chargeLevel * 1.4);
        const halo = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, haloR);
        halo.addColorStop(0, palette.core);
        halo.addColorStop(0.45, palette.primary);
        halo.addColorStop(1, 'transparent');
        ctx.globalAlpha = Math.min(0.95, 0.25 + chargeLevel * 0.75);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, haloR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.rotate(spin);
      ctx.shadowBlur = 24 + chargeLevel * 32;
      ctx.shadowColor = palette.primary;

      const ballGrad = ctx.createRadialGradient(-r * 0.28, -r * 0.28, r * 0.1, 0, 0, r);
      ballGrad.addColorStop(0, '#FFFFFF');
      ballGrad.addColorStop(0.55, '#FACC15');
      ballGrad.addColorStop(1, '#2563EB');
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Classic volleyball panel seams
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, -0.5, 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, 2.5, 4.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, 0);
      ctx.quadraticCurveTo(0, r * 0.35, r * 0.85, 0);
      ctx.stroke();

      ctx.restore();
    };

    const drawDragonHead = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      scale: number,
      t: number,
      facingDir: number
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(facingDir * scale, scale);
      ctx.shadowBlur = 35;
      ctx.shadowColor = palette.primary;

      ctx.fillStyle = palette.secondary;
      ctx.beginPath();
      ctx.moveTo(-30, -30);
      ctx.lineTo(-135, -96 + Math.sin(t * 20) * 10);
      ctx.lineTo(-70, -16);
      ctx.lineTo(-150, -38);
      ctx.lineTo(-55, 6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = palette.primary;
      ctx.beginPath();
      ctx.moveTo(-40, -38);
      ctx.lineTo(54, -28);
      ctx.lineTo(94, -6);
      ctx.lineTo(42, 8);
      ctx.lineTo(-38, 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = palette.secondary;
      ctx.beginPath();
      ctx.moveTo(-32, 14);
      ctx.lineTo(74, 28);
      ctx.lineTo(40, 44);
      ctx.lineTo(-30, 32);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      for (const fx of [22, 44, 66]) {
        ctx.beginPath();
        ctx.moveTo(fx, -2);
        ctx.lineTo(fx + 5, 14);
        ctx.lineTo(fx + 10, -2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(8, -15, 10, 4.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const renderFrame = (t: number) => {
      bCtx.clearRect(0, 0, W, H);
      fCtx.clearRect(0, 0, W, H);

      const cx = W * 0.5;
      const cy = H * 0.56;
      const buildup = Math.min(1, t / climaxT);
      const post = t > climaxT ? (t - climaxT) / (1 - climaxT) : 0;

      // Subtle ball hover & charge tremor, then violent launch after climax strike
      const ballShake = buildup > 0.35 && post === 0 ? Math.sin(t * 95) * (buildup * 6) : 0;
      const launchDist = post > 0.14 ? Math.pow((post - 0.14) / 0.86, 1.5) * 980 : 0;
      const ballX = restBallX + ballShake + dir * launchDist;
      const ballY =
        restBallY +
        Math.sin(t * 9) * 8 * (1 - post) +
        (post > 0.14 ? Math.pow((post - 0.14) / 0.86, 1.3) * 320 : 0);

      // Camera shake (gentle during escalation, heavy on climax strike)
      const shakePower =
        post > 0 && post < 0.45 ? (1 - post / 0.45) * 20 : buildup > 0.4 ? (buildup - 0.4) * 7 : 0;
      const sx = shakePower > 0 ? (Math.random() - 0.5) * shakePower : 0;
      const sy = shakePower > 0 ? (Math.random() - 0.5) * shakePower : 0;

      bCtx.save();
      fCtx.save();
      bCtx.translate(sx, sy);
      fCtx.translate(sx, sy);

      // ============================================================
      // 1. PITCH-BLACK DRAMATIC SCREEN + GROWING ELEMENTAL CORE AURA
      // ============================================================
      bCtx.fillStyle = '#020307';
      bCtx.fillRect(-30, -30, W + 60, H + 60);

      // Aura behind centered character grows gradually 0 -> 1
      const auraRadius = 110 + buildup * 460 + (post > 0 ? 180 * (1 - post) : 0);
      const auraGrad = bCtx.createRadialGradient(cx, cy - 20, 20, cx, cy - 20, auraRadius);
      auraGrad.addColorStop(0, palette.primary + (buildup > 0.5 ? '88' : '44'));
      auraGrad.addColorStop(0.45, palette.bgGlow + '99');
      auraGrad.addColorStop(1, 'transparent');
      bCtx.fillStyle = auraGrad;
      bCtx.fillRect(0, 0, W, H);

      // Subtle rising floor ring beneath centered character
      bCtx.save();
      bCtx.strokeStyle = palette.primary;
      bCtx.globalAlpha = 0.25 + buildup * 0.55;
      bCtx.lineWidth = 2 + buildup * 3;
      bCtx.beginPath();
      bCtx.ellipse(cx, H * 0.88, 130 + buildup * 180, 24 + buildup * 26, 0, 0, Math.PI * 2);
      bCtx.stroke();
      bCtx.restore();

      // ============================================================
      // 2. THEME-SPECIFIC ESCALATION (1 BY 1 -> SWARM -> GIANT CLIMAX!)
      // ============================================================
      if (theme === 'lightning') {
        // --- LIGHTNING: 1 by 1 bolts -> storm of lightning -> GIANT bolt strikes the ball! ---
        for (const seed of BOLT_SEEDS) {
          if (t < seed.appearAt) continue;
          const age = Math.min(1, (t - seed.appearAt) / 0.14);
          const flashPulse = 0.55 + 0.45 * Math.abs(Math.sin(t * 28 + seed.jitterSeed));
          const col =
            seed.colorType === 'core'
              ? palette.core
              : seed.colorType === 'secondary'
              ? palette.secondary
              : palette.primary;

          // Alternate drawing behind and in front of character for real depth
          const targetCtx = seed.jitterSeed % 2 > 1 ? fCtx : bCtx;
          targetCtx.save();
          targetCtx.globalAlpha = age * flashPulse;
          drawJaggedBolt(
            targetCtx,
            W * seed.xFrac,
            H * seed.topYFrac,
            W * seed.xFrac + Math.sin(seed.jitterSeed * 4) * 55,
            H * seed.botYFrac * age,
            9,
            34,
            seed.jitterSeed,
            t,
            col,
            seed.width,
            palette.primary
          );
          targetCtx.restore();
        }

        // Raijin Thunder Ring builds orb by orb behind character
        const activeDrums = Math.min(6, Math.floor((t / climaxT) * 7));
        if (activeDrums > 0) {
          bCtx.save();
          bCtx.translate(cx, cy - 35);
          bCtx.strokeStyle = palette.primary;
          bCtx.lineWidth = 3;
          bCtx.globalAlpha = 0.35 + buildup * 0.45;
          bCtx.beginPath();
          bCtx.arc(0, 0, 215, 0, Math.PI * 2 * Math.min(1, t * 2.1));
          bCtx.stroke();
          for (let d = 0; d < activeDrums; d++) {
            const ang = (d / 6) * Math.PI * 2 - Math.PI / 2 + t * 1.4;
            bCtx.fillStyle = d % 2 === 0 ? palette.primary : palette.secondary;
            bCtx.shadowBlur = 22;
            bCtx.shadowColor = palette.primary;
            bCtx.beginPath();
            bCtx.arc(Math.cos(ang) * 215, Math.sin(ang) * 215, 16, 0, Math.PI * 2);
            bCtx.fill();
          }
          bCtx.restore();
        }

        // Arcing sparks leap from character's aura straight into the hovering volleyball
        if (t > 0.25 && post < 0.25) {
          const arcCount = Math.min(5, Math.floor((t - 0.22) * 12));
          for (let a = 0; a < arcCount; a++) {
            drawJaggedBolt(
              fCtx,
              cx + dir * 45,
              cy - 40 + (a - 2) * 18,
              ballX,
              ballY,
              7,
              24,
              a * 3.1,
              t,
              a % 2 === 0 ? palette.secondary : palette.primary,
              3.5,
              palette.secondary
            );
          }
        }

        // CLIMAX: ONE COLOSSAL LIGHTNING PILLAR STRIKES THE VOLLEYBALL!
        if (post > 0) {
          const strikeFade = Math.max(0, 1 - post * 1.15);
          if (strikeFade > 0.02) {
            fCtx.save();
            fCtx.globalAlpha = strikeFade;
            // Outer sky pillar
            drawJaggedBolt(fCtx, ballX - dir * 50, -20, ballX, ballY, 12, 48, 99, t, palette.secondary, 52, palette.secondary);
            // Mid golden core
            drawJaggedBolt(fCtx, ballX - dir * 50, -20, ballX, ballY, 12, 34, 99, t, palette.primary, 28, palette.primary);
            // Blinding white inner bolt
            drawJaggedBolt(fCtx, ballX - dir * 50, -20, ballX, ballY, 12, 18, 99, t, '#FFFFFF', 12, '#FFFFFF');
            // Grounded secondary branch radiating off the ball
            drawJaggedBolt(fCtx, ballX, ballY, ballX + dir * 260, H, 8, 42, 77, t, palette.primary, 14, palette.primary);
            drawJaggedBolt(fCtx, ballX, ballY, ballX - dir * 180, H, 8, 36, 55, t, palette.secondary, 10, palette.secondary);
            fCtx.restore();
          }
        }
      } else if (theme === 'fire' || theme === 'phoenix') {
        // --- FIRE / PHOENIX: Embers appear 1 by 1 -> Twin fire pillars -> Giant Phoenix Wings & Solar Dive onto Ball! ---
        const flameCount = Math.min(18, Math.floor(t * 28));
        for (let i = 0; i < flameCount; i++) {
          const px = cx + Math.sin(i * 2.4 + t * 5) * (120 + (i % 5) * 85);
          const py = H - ((t * 580 + i * 95) % (H * 0.9));
          const rad = 10 + (i % 4) * 12 + buildup * 14;
          const tCtx = i % 3 === 0 ? fCtx : bCtx;
          tCtx.save();
          const fg = tCtx.createRadialGradient(px, py, 2, px, py, rad);
          fg.addColorStop(0, '#FFFFFF');
          fg.addColorStop(0.45, palette.secondary);
          fg.addColorStop(1, 'transparent');
          tCtx.fillStyle = fg;
          tCtx.beginPath();
          tCtx.arc(px, py, rad, 0, Math.PI * 2);
          tCtx.fill();
          tCtx.restore();
        }

        // Giant Phoenix Wings unfurling gradually behind character
        if (t > 0.24) {
          const wingOpen = Math.min(1, (t - 0.24) / 0.38);
          bCtx.save();
          bCtx.translate(cx, cy - 30);
          bCtx.shadowBlur = 40;
          bCtx.shadowColor = palette.primary;
          const flap = Math.sin(t * 16) * 26;
          for (const side of [-1, 1]) {
            const wg = bCtx.createLinearGradient(0, 0, side * 460 * wingOpen, -180);
            wg.addColorStop(0, '#FFFFFF');
            wg.addColorStop(0.35, palette.secondary);
            wg.addColorStop(1, palette.primary);
            bCtx.fillStyle = wg;
            bCtx.globalAlpha = 0.85 * wingOpen;
            bCtx.beginPath();
            bCtx.moveTo(0, 10);
            bCtx.quadraticCurveTo(side * 220 * wingOpen, -260 + flap, side * 480 * wingOpen, -150 - flap);
            bCtx.quadraticCurveTo(side * 330 * wingOpen, -20, side * 400 * wingOpen, 90);
            bCtx.quadraticCurveTo(side * 180 * wingOpen, 30, 0, 75);
            bCtx.fill();
          }
          bCtx.restore();
        }

        // CLIMAX: Giant Solar Fireball / Phoenix Beam engulfs the ball!
        if (post > 0) {
          const fade = Math.max(0, 1 - post * 1.1);
          fCtx.save();
          fCtx.globalAlpha = fade;
          const blast = fCtx.createRadialGradient(ballX, ballY, 12, ballX, ballY, 260 * Math.min(1, post * 3.5));
          blast.addColorStop(0, '#FFFFFF');
          blast.addColorStop(0.3, palette.secondary);
          blast.addColorStop(0.65, palette.primary);
          blast.addColorStop(1, 'transparent');
          fCtx.fillStyle = blast;
          fCtx.beginPath();
          fCtx.arc(ballX, ballY, 260, 0, Math.PI * 2);
          fCtx.fill();
          fCtx.restore();
        }
      } else if (theme === 'dragon' || theme === 'cerberus') {
        // --- DRAGON / CERBERUS: Glowing eyes in black -> Coiling dragon segments build -> Colossal Dragon strikes ball! ---
        const maxSegs = Math.min(26, Math.floor((t / climaxT) * 28));
        if (maxSegs > 2) {
          bCtx.save();
          bCtx.strokeStyle = palette.primary;
          bCtx.shadowBlur = 35;
          bCtx.shadowColor = palette.secondary;
          bCtx.lineWidth = 38 + buildup * 18;
          bCtx.lineCap = 'round';
          bCtx.beginPath();
          for (let s = 0; s <= maxSegs; s++) {
            const ang = (s / 26) * Math.PI * 2.4 + t * 3.2;
            const r = 210 + Math.sin(s * 0.6) * 45;
            const px = cx + Math.cos(ang) * r * 1.25;
            const py = cy - 40 + Math.sin(ang) * (r * 0.65);
            if (s === 0) bCtx.moveTo(px, py);
            else bCtx.lineTo(px, py);
          }
          bCtx.stroke();

          bCtx.strokeStyle = palette.core;
          bCtx.lineWidth = 10;
          bCtx.stroke();
          bCtx.restore();
        }

        // Climax: Colossal Dragon Head lunges straight onto the volleyball!
        if (t > 0.45) {
          const lunge = post > 0 ? Math.min(1, post * 3.2) : (t - 0.45) / 0.21 * 0.25;
          const headX = cx - dir * 320 + (ballX - (cx - dir * 320)) * lunge;
          const headY = H * 0.16 + (ballY - H * 0.16) * lunge;
          drawDragonHead(fCtx, headX, headY, 1.35 + lunge * 0.55, t, dir);
          if (theme === 'cerberus' && lunge > 0.3) {
            drawDragonHead(fCtx, headX - dir * 40, headY - 75, 1.0, t + 0.5, dir);
            drawDragonHead(fCtx, headX - dir * 40, headY + 75, 1.0, t + 1.1, dir);
          }
        }
      } else if (theme === 'water' || theme === 'kraken') {
        // --- WATER / KRAKEN: Droplets appear 1 by 1 -> Swirling kraken tentacles/waves -> Tsunami crashes onto ball! ---
        const dropCount = Math.min(14, Math.floor(t * 22));
        for (let d = 0; d < dropCount; d++) {
          const ang = (d / 14) * Math.PI * 2 + t * 2.4;
          const rad = 180 + (d % 3) * 55;
          const dx = cx + Math.cos(ang) * rad;
          const dy = cy - 20 + Math.sin(ang) * rad * 0.55;
          const targetCtx = d % 2 === 0 ? fCtx : bCtx;
          targetCtx.save();
          targetCtx.fillStyle = d % 2 === 0 ? palette.primary : palette.secondary;
          targetCtx.shadowBlur = 18;
          targetCtx.shadowColor = palette.primary;
          targetCtx.beginPath();
          targetCtx.arc(dx, dy, 8 + buildup * 9, 0, Math.PI * 2);
          targetCtx.fill();
          targetCtx.restore();
        }

        // Emerging tentacles / wave ribbons behind character
        if (t > 0.22) {
          const tentCount = Math.min(6, Math.floor((t - 0.2) * 14));
          bCtx.save();
          bCtx.strokeStyle = palette.primary;
          bCtx.lineWidth = 16;
          bCtx.lineCap = 'round';
          for (let k = 0; k < tentCount; k++) {
            const side = k % 2 === 0 ? -1 : 1;
            const spread = 140 + Math.floor(k / 2) * 95;
            bCtx.beginPath();
            bCtx.moveTo(cx + side * spread, H);
            bCtx.quadraticCurveTo(
              cx + side * (spread + Math.sin(t * 10 + k) * 65),
              cy,
              cx + side * (spread * 0.75),
              H * (0.22 + (k % 3) * 0.12)
            );
            bCtx.stroke();
          }
          bCtx.restore();
        }

        // Climax: Towering Tsunami Wave slams directly into the volleyball!
        if (post > 0) {
          const waveP = Math.min(1, post * 2.2);
          fCtx.save();
          fCtx.globalAlpha = Math.max(0, 1 - post * 0.85);
          const wg = fCtx.createLinearGradient(0, H * 0.1, 0, H);
          wg.addColorStop(0, '#FFFFFF');
          wg.addColorStop(0.3, palette.primary);
          wg.addColorStop(1, palette.bgGlow);
          fCtx.fillStyle = wg;
          fCtx.beginPath();
          fCtx.moveTo(isOpponent ? W : 0, H);
          fCtx.quadraticCurveTo(ballX - dir * 180, ballY - 220 * waveP, ballX + dir * 80, ballY - 40);
          fCtx.quadraticCurveTo(ballX + dir * 210, ballY + 80, ballX + dir * 160, H);
          fCtx.closePath();
          fCtx.fill();
          fCtx.restore();
        }
      } else if (theme === 'katana' || theme === 'guillotine') {
        // --- KATANA / GUILLOTINE: Slashes appear 1 by 1 -> Rapid blade storm -> Screen-splitting strike on ball! ---
        const slashSpecs = [
          { at: 0.1, x: W * 0.3, y: H * 0.4, ang: -0.5, len: 320 },
          { at: 0.19, x: W * 0.72, y: H * 0.38, ang: 0.45, len: 360 },
          { at: 0.28, x: W * 0.24, y: H * 0.62, ang: 0.25, len: 420 },
          { at: 0.36, x: W * 0.76, y: H * 0.6, ang: -0.32, len: 440 },
          { at: 0.44, x: cx, y: H * 0.26, ang: 0.1, len: 560 },
          { at: 0.51, x: cx - 120, y: H * 0.52, ang: -0.9, len: 520 },
          { at: 0.57, x: cx + 140, y: H * 0.48, ang: 0.85, len: 540 },
        ];
        for (let i = 0; i < slashSpecs.length; i++) {
          const sl = slashSpecs[i];
          if (t < sl.at) continue;
          const p = Math.min(1, (t - sl.at) * 5.5);
          const tCtx = i % 2 === 0 ? fCtx : bCtx;
          tCtx.save();
          tCtx.translate(sl.x, sl.y);
          tCtx.rotate(sl.ang);
          tCtx.shadowBlur = 24;
          tCtx.shadowColor = palette.primary;
          tCtx.fillStyle = '#FFFFFF';
          tCtx.strokeStyle = palette.primary;
          tCtx.lineWidth = 4;
          tCtx.beginPath();
          tCtx.ellipse(0, 0, p * sl.len, 7 * (1 - p * 0.35), 0, 0, Math.PI * 2);
          tCtx.fill();
          tCtx.stroke();
          tCtx.restore();
        }

        // Climax: Colossal Slash / Guillotine Blade cleaves right through the ball!
        if (post > 0) {
          const fade = Math.max(0, 1 - post * 1.1);
          fCtx.save();
          fCtx.globalAlpha = fade;
          if (theme === 'guillotine') {
            const dropY = -120 + Math.min(1, post * 3.5) * (ballY + 140);
            fCtx.fillStyle = '#E2E8F0';
            fCtx.strokeStyle = palette.primary;
            fCtx.lineWidth = 6;
            fCtx.beginPath();
            fCtx.moveTo(ballX - 130, dropY - 260);
            fCtx.lineTo(ballX + 130, dropY - 260);
            fCtx.lineTo(ballX + 130, dropY);
            fCtx.lineTo(ballX - 130, dropY + 95);
            fCtx.closePath();
            fCtx.fill();
            fCtx.stroke();
          } else {
            fCtx.translate(ballX, ballY);
            fCtx.rotate(-0.42 * dir);
            fCtx.shadowBlur = 45;
            fCtx.shadowColor = palette.primary;
            fCtx.fillStyle = '#FFFFFF';
            fCtx.beginPath();
            fCtx.ellipse(0, 0, 1050, 26 * (1 - post * 0.5), 0, 0, Math.PI * 2);
            fCtx.fill();
            fCtx.strokeStyle = palette.primary;
            fCtx.lineWidth = 8;
            fCtx.stroke();
          }
          fCtx.restore();
        }
      } else if (theme === 'railgun' || theme === 'sniper') {
        // --- RAILGUN / SNIPER: Target locks & magnetic rings appear 1 by 1 -> Hypervelocity Beam blasts the ball! ---
        const activeRings = Math.min(7, Math.floor((t / climaxT) * 8));
        for (let r = 0; r < activeRings; r++) {
          const f = (r + 1) / 8;
          const rx = cx + (ballX - cx) * f;
          const ry = cy - 40 + (ballY - (cy - 40)) * f;
          fCtx.save();
          fCtx.strokeStyle = r % 2 === 0 ? palette.primary : palette.secondary;
          fCtx.lineWidth = 4;
          fCtx.shadowBlur = 18;
          fCtx.shadowColor = palette.primary;
          fCtx.beginPath();
          fCtx.ellipse(rx, ry, 22, 58, -0.35 * dir, 0, Math.PI * 2);
          fCtx.stroke();
          fCtx.restore();
        }

        // Crosshair narrowing onto the volleyball
        const lockR = Math.max(42, 220 * (1 - buildup * 0.85));
        fCtx.save();
        fCtx.strokeStyle = palette.primary;
        fCtx.lineWidth = 3;
        fCtx.beginPath();
        fCtx.arc(ballX, ballY, lockR, 0, Math.PI * 2);
        fCtx.moveTo(ballX - lockR - 25, ballY);
        fCtx.lineTo(ballX + lockR + 25, ballY);
        fCtx.moveTo(ballX, ballY - lockR - 25);
        fCtx.lineTo(ballX, ballY + lockR + 25);
        fCtx.stroke();
        fCtx.restore();

        // Climax: Blinding Railgun Cannon fires straight through the ball!
        if (post > 0) {
          const fade = Math.max(0, 1 - post * 1.1);
          fCtx.save();
          fCtx.globalAlpha = fade;
          fCtx.shadowBlur = 45;
          fCtx.shadowColor = palette.primary;
          fCtx.strokeStyle = palette.primary;
          fCtx.lineWidth = 62 * (1 - post * 0.5);
          fCtx.beginPath();
          fCtx.moveTo(cx, cy - 45);
          fCtx.lineTo(ballX + dir * 700, ballY + 120);
          fCtx.stroke();
          fCtx.strokeStyle = '#FFFFFF';
          fCtx.lineWidth = 22 * (1 - post * 0.5);
          fCtx.stroke();
          fCtx.restore();
        }
      } else if (theme === 'chronos' || theme === 'genesis' || theme === 'blackhole' || theme === 'meteor') {
        // --- CHRONOS / GENESIS / BLACKHOLE / METEOR: Orbiting rings & celestial runes build 1 by 1 -> Giant supernova/meteor hits ball! ---
        const ringCount = Math.min(5, Math.floor((t / climaxT) * 6));
        bCtx.save();
        bCtx.translate(cx, cy - 35);
        for (let i = 0; i < ringCount; i++) {
          const rad = 115 + i * 58;
          bCtx.save();
          bCtx.rotate(t * (i % 2 === 0 ? 1.8 : -2.4));
          bCtx.strokeStyle = i % 2 === 0 ? palette.primary : palette.secondary;
          bCtx.lineWidth = 3.5;
          bCtx.shadowBlur = 22;
          bCtx.shadowColor = palette.primary;
          bCtx.beginPath();
          bCtx.arc(0, 0, rad, 0, Math.PI * 2);
          bCtx.stroke();
          for (let tick = 0; tick < 12; tick++) {
            const a = (tick / 12) * Math.PI * 2;
            bCtx.beginPath();
            bCtx.moveTo(Math.cos(a) * (rad - 12), Math.sin(a) * (rad - 12));
            bCtx.lineTo(Math.cos(a) * (rad + 10), Math.sin(a) * (rad + 10));
            bCtx.stroke();
          }
          bCtx.restore();
        }
        bCtx.restore();

        // Climax: Falling Meteor / Chrono-Genesis Starburst crashes into the volleyball!
        if (post > 0) {
          const fade = Math.max(0, 1 - post * 1.05);
          fCtx.save();
          fCtx.globalAlpha = fade;
          fCtx.strokeStyle = palette.primary;
          fCtx.shadowBlur = 45;
          fCtx.shadowColor = palette.secondary;
          fCtx.lineWidth = 46 * (1 - post * 0.45);
          fCtx.beginPath();
          fCtx.moveTo(ballX - dir * 320, -40);
          fCtx.lineTo(ballX, ballY);
          fCtx.stroke();
          fCtx.strokeStyle = '#FFFFFF';
          fCtx.lineWidth = 16;
          fCtx.stroke();
          fCtx.restore();
        }
      } else if (theme === 'wind' || theme === 'earth') {
        // --- WIND / EARTH: Spiraling cyclone rings or rising tectonic stone pillars 1 by 1 -> Giant Vortex / Boulder Smash! ---
        const itemCount = Math.min(8, Math.floor((t / climaxT) * 9));
        for (let i = 0; i < itemCount; i++) {
          const tCtx = i % 2 === 0 ? bCtx : fCtx;
          tCtx.save();
          if (theme === 'earth') {
            // Rising floating rock/magma monoliths one by one around center character
            const side = i % 2 === 0 ? -1 : 1;
            const rx = cx + side * (160 + Math.floor(i / 2) * 85);
            const rise = Math.min(1, (t - i * 0.06) * 4);
            const ry = H - rise * (180 + (i % 3) * 95);
            tCtx.fillStyle = '#292524';
            tCtx.strokeStyle = palette.primary;
            tCtx.lineWidth = 3.5;
            tCtx.shadowBlur = 20;
            tCtx.shadowColor = palette.primary;
            tCtx.beginPath();
            tCtx.moveTo(rx - 28, H);
            tCtx.lineTo(rx - 22, ry);
            tCtx.lineTo(rx, ry - 32);
            tCtx.lineTo(rx + 24, ry + 6);
            tCtx.lineTo(rx + 30, H);
            tCtx.closePath();
            tCtx.fill();
            tCtx.stroke();
          } else {
            // Swirling emerald hurricane arcs tightening around center character
            const r = 135 + i * 36;
            tCtx.strokeStyle = i % 2 === 0 ? palette.primary : palette.secondary;
            tCtx.lineWidth = 5;
            tCtx.shadowBlur = 22;
            tCtx.shadowColor = palette.primary;
            tCtx.beginPath();
            tCtx.ellipse(cx, cy - 10, r * 1.45, r * 0.42, (i % 3 - 1) * 0.28 + t * 3.5, 0, Math.PI * 1.55);
            tCtx.stroke();
          }
          tCtx.restore();
        }

        if (post > 0) {
          const fade = Math.max(0, 1 - post * 1.05);
          fCtx.save();
          fCtx.globalAlpha = fade;
          fCtx.shadowBlur = 42;
          fCtx.shadowColor = palette.primary;
          if (theme === 'earth') {
            // Giant Glowing Magma-Crusted Tectonic Meteor slams onto the ball!
            const dropP = Math.min(1, post * 3.4);
            const rx = ballX;
            const ry = -80 + (ballY + 80) * dropP;
            fCtx.fillStyle = '#44403C';
            fCtx.strokeStyle = palette.primary;
            fCtx.lineWidth = 6;
            fCtx.beginPath();
            fCtx.arc(rx, ry, 74, 0, Math.PI * 2);
            fCtx.fill();
            fCtx.stroke();
          } else {
            // Colossal Emerald Cyclone Lance blasts through the ball!
            fCtx.strokeStyle = palette.primary;
            fCtx.lineWidth = 48 * (1 - post * 0.45);
            fCtx.beginPath();
            fCtx.moveTo(cx, cy - 45);
            fCtx.lineTo(ballX + dir * 650, ballY + 90);
            fCtx.stroke();
            fCtx.strokeStyle = '#FFFFFF';
            fCtx.lineWidth = 16;
            fCtx.stroke();
          }
          fCtx.restore();
        }
      } else if (theme === 'viper' || theme === 'eagle' || theme === 'pegasus') {
        // --- VIPER / EAGLE / PEGASUS: Radiant feathers / twin fangs appear 1 by 1 -> Giant Wing/Fang Strike on Ball! ---
        const featherCount = Math.min(12, Math.floor(t * 20));
        for (let i = 0; i < featherCount; i++) {
          const tCtx = i % 3 === 0 ? fCtx : bCtx;
          const ang = (i / 12) * Math.PI * 2 + t * 1.6;
          const rad = 185 + (i % 3) * 52;
          const fx = cx + Math.cos(ang) * rad * 1.2;
          const fy = cy - 30 + Math.sin(ang) * rad * 0.6;
          tCtx.save();
          tCtx.translate(fx, fy);
          tCtx.rotate(ang + Math.PI / 2);
          tCtx.fillStyle = i % 2 === 0 ? palette.primary : palette.secondary;
          tCtx.shadowBlur = 18;
          tCtx.shadowColor = palette.primary;
          tCtx.beginPath();
          tCtx.ellipse(0, 0, 7, 26, 0, 0, Math.PI * 2);
          tCtx.fill();
          tCtx.restore();
        }

        // Giant Eagle / Pegasus Wings or Viper Aura behind character
        if (t > 0.25 && theme !== 'viper') {
          const wOpen = Math.min(1, (t - 0.25) / 0.35);
          bCtx.save();
          bCtx.translate(cx, cy - 40);
          bCtx.shadowBlur = 35;
          bCtx.shadowColor = palette.primary;
          for (const side of [-1, 1]) {
            bCtx.fillStyle = palette.primary;
            bCtx.globalAlpha = 0.72 * wOpen;
            bCtx.beginPath();
            bCtx.moveTo(0, 0);
            bCtx.quadraticCurveTo(side * 240 * wOpen, -240, side * 460 * wOpen, -110);
            bCtx.quadraticCurveTo(side * 300 * wOpen, 20, 0, 60);
            bCtx.fill();
          }
          bCtx.restore();
        }

        // Climax Strike: Twin Venom Fangs clamp the ball (viper) or Radiant Wing Dive Beam hits the ball!
        if (post > 0) {
          const fade = Math.max(0, 1 - post * 1.05);
          fCtx.save();
          fCtx.globalAlpha = fade;
          fCtx.shadowBlur = 40;
          fCtx.shadowColor = palette.primary;
          if (theme === 'viper') {
            const clamp = Math.sin(Math.min(1, post * 3.5) * Math.PI * 0.5);
            fCtx.fillStyle = palette.primary;
            // Upper & Lower Giant Venom Fangs clamping onto the ball
            fCtx.beginPath();
            fCtx.moveTo(ballX - 75, ballY - 220 + clamp * 145);
            fCtx.lineTo(ballX - 30, ballY - 220 + clamp * 145);
            fCtx.lineTo(ballX - 50, ballY - 60 + clamp * 60);
            fCtx.closePath();
            fCtx.fill();
            fCtx.beginPath();
            fCtx.moveTo(ballX + 30, ballY - 220 + clamp * 145);
            fCtx.lineTo(ballX + 75, ballY - 220 + clamp * 145);
            fCtx.lineTo(ballX + 50, ballY - 60 + clamp * 60);
            fCtx.closePath();
            fCtx.fill();
          } else {
            fCtx.strokeStyle = palette.primary;
            fCtx.lineWidth = 46 * (1 - post * 0.45);
            fCtx.beginPath();
            fCtx.moveTo(cx, cy - 50);
            fCtx.lineTo(ballX + dir * 650, ballY + 80);
            fCtx.stroke();
            fCtx.strokeStyle = '#FFFFFF';
            fCtx.lineWidth = 16;
            fCtx.stroke();
          }
          fCtx.restore();
        }
      } else {
        // --- KING / CHECKMATE / PUPPETEER / PHANTOM ---
        // Glowing puppeteer strings, royal rays, or phantom chess aura build 1 by 1 around center character
        const elemCount = Math.min(10, Math.floor(t * 16));
        for (let i = 0; i < elemCount; i++) {
          const tCtx = i % 2 === 0 ? bCtx : fCtx;
          tCtx.save();
          tCtx.strokeStyle = i % 2 === 0 ? palette.primary : palette.secondary;
          tCtx.shadowBlur = 22;
          tCtx.shadowColor = palette.primary;
          tCtx.lineWidth = 2.5 + buildup * 2;
          tCtx.beginPath();
          tCtx.moveTo(W * ((i + 0.5) / 10), 0);
          tCtx.lineTo(ballX, ballY);
          tCtx.stroke();
          tCtx.restore();
        }

        // Climax: Giant Chess King Slam / Puppeteer Snap hits directly onto the ball!
        if (post > 0) {
          const fade = Math.max(0, 1 - post * 1.05);
          fCtx.save();
          fCtx.globalAlpha = fade;
          fCtx.shadowBlur = 42;
          fCtx.shadowColor = palette.primary;
          if (theme === 'checkmate' || theme === 'king') {
            const dropP = Math.min(1, post * 3.4);
            const ky = -120 + (ballY + 120) * dropP;
            fCtx.translate(ballX, ky);
            fCtx.fillStyle = '#09090B';
            fCtx.strokeStyle = palette.secondary;
            fCtx.lineWidth = 5;
            fCtx.beginPath();
            fCtx.moveTo(-48, 70);
            fCtx.lineTo(-32, -40);
            fCtx.lineTo(-56, -78);
            fCtx.lineTo(0, -112);
            fCtx.lineTo(56, -78);
            fCtx.lineTo(32, -40);
            fCtx.lineTo(48, 70);
            fCtx.closePath();
            fCtx.fill();
            fCtx.stroke();
            fCtx.fillStyle = palette.secondary;
            fCtx.fillRect(-5, -142, 10, 30);
            fCtx.fillRect(-16, -132, 32, 10);
          } else {
            fCtx.strokeStyle = palette.primary;
            fCtx.lineWidth = 44 * (1 - post * 0.45);
            fCtx.beginPath();
            fCtx.moveTo(cx, cy - 50);
            fCtx.lineTo(ballX, ballY);
            fCtx.stroke();
            fCtx.strokeStyle = '#FFFFFF';
            fCtx.lineWidth = 14;
            fCtx.stroke();
          }
          fCtx.restore();
        }
      }

      // ============================================================
      // 3. FOREGROUND VOLLEYBALL & CLIMAX IMPACT SHOCKWAVE + FLASH
      // ============================================================
      // Volleyball appears right as energy awakens (t >= 0.14)
      if (t >= 0.14) {
        const ballAppear = Math.min(1, (t - 0.14) / 0.15);
        drawVolleyBall(
          fCtx,
          ballX,
          ballY,
          (28 + buildup * 10) * ballAppear,
          t * 18,
          buildup
        );
      }

      // Massive Impact Shockwave Rings expanding from the volleyball at climax!
      if (post > 0) {
        const ringR = 45 + post * 540;
        fCtx.save();
        fCtx.globalAlpha = Math.max(0, 1 - post * 0.9);
        fCtx.strokeStyle = palette.primary;
        fCtx.lineWidth = Math.max(2, 18 * (1 - post));
        fCtx.beginPath();
        fCtx.arc(restBallX, restBallY, ringR, 0, Math.PI * 2);
        fCtx.stroke();

        fCtx.strokeStyle = '#FFFFFF';
        fCtx.lineWidth = Math.max(1, 10 * (1 - post));
        fCtx.beginPath();
        fCtx.arc(restBallX, restBallY, ringR * 0.68, 0, Math.PI * 2);
        fCtx.stroke();

        // Radial impact spikes bursting outward from the struck ball
        for (let r = 0; r < 14; r++) {
          const a = (r / 14) * Math.PI * 2 + 0.2;
          fCtx.strokeStyle = r % 2 === 0 ? '#FFFFFF' : palette.secondary;
          fCtx.lineWidth = 3.5;
          fCtx.beginPath();
          fCtx.moveTo(restBallX + Math.cos(a) * (ringR * 0.35), restBallY + Math.sin(a) * (ringR * 0.35));
          fCtx.lineTo(restBallX + Math.cos(a) * (ringR * 0.95), restBallY + Math.sin(a) * (ringR * 0.95));
          fCtx.stroke();
        }
        fCtx.restore();
      }

      // Crisp screen-flash right at climax impact (t = 0.66 -> 0.77)
      if (t >= climaxT && t <= climaxT + 0.12) {
        const flashAlpha = (1 - (t - climaxT) / 0.12) * 0.65;
        fCtx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, flashAlpha)})`;
        fCtx.fillRect(-30, -30, W + 60, H + 60);
      }

      bCtx.restore();
      fCtx.restore();
    };

    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - start) / DURATION_MS);
      renderFrame(elapsed);
      if (elapsed < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [palette, theme, isOpponent]);

  const charTransform =
    actPhase === 0
      ? 'translateY(4px) scale(0.95)'
      : actPhase === 1
      ? 'translateY(-4px) scale(1.0)'
      : `translateY(-10px) scale(1.05) rotate(${isOpponent ? -3 : 3}deg)`;

  return (
    <div className="fixed inset-0 z-50 bg-[#020307] overflow-hidden select-none">
      {/* LAYER 1 (Back): Pitch-black sky & escalating elemental buildup behind character */}
      <canvas ref={backCanvasRef} className="absolute inset-0 z-10 w-full h-full object-cover" />

      {/* LAYER 2 (Center Stage): Normal-sized anime character centered with ultimate background */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none pb-8">
        <div
          className="relative flex items-end justify-center"
          style={{
            transform: charTransform,
            transition: 'transform 360ms cubic-bezier(0.16, 1, 0.3, 1)',
            filter: `drop-shadow(0 0 ${actPhase === 2 ? 26 : 14}px ${palette.primary})`,
          }}
        >
          <AnimePortrait
            character={character}
            emotion={
              character.id === 'raka_awakened'
                ? 'awakened'
                : actPhase === 2
                ? 'angry'
                : 'charging'
            }
            isSpeaking
            facing={isOpponent ? 'left' : 'right'}
            size="lg"
          />
        </div>
      </div>

      {/* LAYER 3 (Front): Foreground elements, hovering volleyball, and colossal climax strike */}
      <canvas ref={frontCanvasRef} className="absolute inset-0 z-30 w-full h-full object-cover pointer-events-none" />

      {/* Top Cinema Letterbox Bar */}
      <div className="absolute top-0 inset-x-0 z-40 h-10 bg-black/95 border-b border-white/15 flex items-center justify-between px-6 pointer-events-none">
        <span className="font-mono-num text-[11px] tracking-widest uppercase" style={{ color: palette.primary }}>
          {isOpponent ? 'ULTIMATE LAWAN' : 'ULTIMATE TIM KITA'} · {palette.badge}
        </span>
        <span className="font-mono-num text-[11px] text-slate-400">
          {character.name}
        </span>
      </div>

      {/* Bottom Cinema Letterbox Bar with Skill Title & Callout */}
      <div className="absolute bottom-0 inset-x-0 z-40 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-4 px-6 text-center pointer-events-none">
        <h2
          className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold italic uppercase text-white tracking-tight leading-none"
          style={{ textShadow: `0 0 24px ${palette.primary}` }}
        >
          {character.ultimate.indonesianName}
        </h2>
        <p className="mt-1.5 text-sm md:text-base font-semibold text-amber-200 italic">
          “{character.ultimate.callout}”
        </p>
      </div>
    </div>
  );
};
