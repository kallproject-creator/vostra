import { CutsceneTheme } from '../types/game';

export type ElementKind = 'fire' | 'lightning' | 'water';

interface ElementParticle {
  kind: ElementKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  hue: string;
  phase: number;
}

interface DynamicBolt {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  color: string;
  width: number;
  seed: number;
}

export function resolveElementMix(theme: CutsceneTheme): ElementKind[] {
  switch (theme) {
    case 'fire':
    case 'phoenix':
    case 'meteor':
    case 'earth':
      return ['fire', 'fire', 'lightning'];
    case 'dragon':
    case 'cerberus':
      return ['fire', 'lightning', 'fire'];
    case 'lightning':
    case 'railgun':
    case 'sniper':
      return ['lightning', 'lightning', 'fire'];
    case 'water':
    case 'kraken':
    case 'wind':
    case 'pegasus':
      return ['water', 'water', 'lightning'];
    case 'chronos':
    case 'genesis':
    case 'blackhole':
      return ['lightning', 'fire', 'water'];
    default:
      return ['fire', 'lightning', 'water'];
  }
}

/**
 * Lightweight Canvas2D Element Particle Engine mounted in MatchArena.tsx
 * dynamically rendering Fire (Api), Lightning (Petir), and Water (Air) particles
 * across the entire viewport during an Ultimate cutscene.
 */
export function startElementCanvasEffect(
  canvas: HTMLCanvasElement,
  theme: CutsceneTheme,
  accentColor: string
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = window.innerWidth;
  let height = window.innerHeight;

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const mix = resolveElementMix(theme);
  const particles: ElementParticle[] = [];
  const bolts: DynamicBolt[] = [];

  const spawnParticle = (initial = false) => {
    const kind = mix[Math.floor(Math.random() * mix.length)];
    if (kind === 'fire') {
      particles.push({
        kind: 'fire',
        x: Math.random() * width,
        y: initial ? Math.random() * height : height + 20,
        vx: (Math.random() - 0.5) * 90,
        vy: -(140 + Math.random() * 240),
        size: 5 + Math.random() * 14,
        alpha: 0.45 + Math.random() * 0.45,
        life: 0,
        maxLife: 1.1 + Math.random() * 1.1,
        hue: Math.random() > 0.4 ? '#F97316' : Math.random() > 0.5 ? '#FACC15' : '#EF4444',
        phase: Math.random() * Math.PI * 2,
      });
    } else if (kind === 'water') {
      const fromLeft = Math.random() > 0.5;
      particles.push({
        kind: 'water',
        x: initial ? Math.random() * width : fromLeft ? -20 : width + 20,
        y: Math.random() * height,
        vx: (fromLeft ? 1 : -1) * (180 + Math.random() * 300),
        vy: -40 + Math.random() * 140,
        size: 4 + Math.random() * 10,
        alpha: 0.4 + Math.random() * 0.45,
        life: 0,
        maxLife: 1.0 + Math.random() * 0.9,
        hue: Math.random() > 0.45 ? '#22D3EE' : '#BAE6FD',
        phase: Math.random() * Math.PI * 2,
      });
    } else {
      particles.push({
        kind: 'lightning',
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 260,
        vy: (Math.random() - 0.5) * 260,
        size: 2.5 + Math.random() * 5,
        alpha: 0.75 + Math.random() * 0.25,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.45,
        hue: Math.random() > 0.4 ? '#FACC15' : '#38BDF8',
        phase: Math.random() * Math.PI * 2,
      });
    }
  };

  for (let i = 0; i < 95; i++) {
    spawnParticle(true);
  }

  let raf = 0;
  let last = performance.now();
  const start = last;

  const render = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const elapsedSec = (now - start) / 1000;
    const intensity = Math.min(1.6, 0.45 + elapsedSec * 0.5);

    ctx.clearRect(0, 0, width, height);

    // Maintain dynamic particle population across the viewport
    const desiredCount = Math.floor(85 * intensity);
    while (particles.length < desiredCount) {
      spawnParticle(false);
    }

    // Spawn crackling lightning arcs across screen edges/center dynamically
    if ((mix.includes('lightning') || elapsedSec > 0.7) && Math.random() < 0.26 * intensity) {
      const startTop = Math.random() > 0.35;
      const x1 = startTop ? Math.random() * width : (Math.random() > 0.5 ? 0 : width);
      const y1 = startTop ? 0 : Math.random() * height * 0.7;
      bolts.push({
        x1,
        y1,
        x2: x1 + (Math.random() - 0.5) * width * 0.45,
        y2: y1 + 160 + Math.random() * (height * 0.65),
        life: 0,
        maxLife: 0.16 + Math.random() * 0.14,
        color: Math.random() > 0.45 ? '#FACC15' : accentColor || '#38BDF8',
        width: 2 + Math.random() * 3.5,
        seed: Math.random() * 100,
      });
    }

    // Update & Draw Element Particles (Fire, Water, Lightning Sparks)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }

      const lifeRatio = 1 - p.life / p.maxLife;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      ctx.save();
      ctx.globalAlpha = p.alpha * lifeRatio;

      if (p.kind === 'fire') {
        p.x += Math.sin(elapsedSec * 7 + p.phase) * 35 * dt;
        const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size * 1.7);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.35, p.hue);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'water') {
        p.vy += 90 * dt;
        ctx.strokeStyle = p.hue;
        ctx.lineWidth = Math.max(1.5, p.size * 0.35);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
        ctx.stroke();

        ctx.fillStyle = '#ECFEFF';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.shadowBlur = 14;
        ctx.shadowColor = p.hue;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Update & Draw Dynamic Screen-Covering Lightning Arcs
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.life += dt;
      if (b.life >= b.maxLife) {
        bolts.splice(i, 1);
        continue;
      }

      const fade = 1 - b.life / b.maxLife;
      ctx.save();
      ctx.globalAlpha = fade * 0.85;
      ctx.shadowBlur = 20;
      ctx.shadowColor = b.color;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      const segs = 7;
      for (let s = 1; s < segs; s++) {
        const f = s / segs;
        const jx = Math.sin(b.seed + s * 9.3 + elapsedSec * 30) * 32;
        const jy = Math.cos(b.seed + s * 6.1) * 18;
        ctx.lineTo(b.x1 + (b.x2 - b.x1) * f + jx, b.y1 + (b.y2 - b.y1) * f + jy);
      }
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1, b.width * 0.42);
      ctx.stroke();
      ctx.restore();
    }

    raf = requestAnimationFrame(render);
  };

  raf = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  };
}
