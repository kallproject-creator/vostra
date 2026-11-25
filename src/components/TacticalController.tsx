import React, { useRef } from 'react';
import { Shield, Sparkles, Zap } from 'lucide-react';
import { BasicAction, CharacterDef, Role } from '../types/game';

export interface TacticalPromptInfo {
  role: Role;
  char: CharacterDef;
  recommended: Exclude<BasicAction, 'ULTIMATE'>;
  timeLeft: number;
  maxTime: number;
  skillName?: string;
}

interface TacticalControllerProps {
  prompt: TacticalPromptInfo | null;
  energy: number;
  waitingText?: string | null;
  idleText: string;
  hidden?: boolean;
  onAction: (action: BasicAction) => void;
}

const ACTION_BUTTONS: {
  id: Exclude<BasicAction, 'ULTIMATE'>;
  label: string;
  keyHint: string;
  icon: typeof Shield;
}[] = [
  { id: 'RECEIVE', label: 'Receive', keyHint: '1·Q', icon: Shield },
  { id: 'SET', label: 'Set', keyHint: '2·W', icon: Sparkles },
  { id: 'SPIKE', label: 'Spike', keyHint: '3·E', icon: Zap },
  { id: 'BLOCK', label: 'Block', keyHint: '4·R', icon: Shield },
];

export const TacticalController: React.FC<TacticalControllerProps> = ({
  prompt,
  energy,
  waitingText,
  idleText,
  hidden = false,
  onAction,
}) => {
  const lastTouchTsRef = useRef(0);

  const fireAction = (action: BasicAction, isTouch: boolean) => {
    const now = performance.now();
    if (isTouch) {
      lastTouchTsRef.current = now;
      onAction(action);
      return;
    }
    // Ignore synthetic click fired immediately after touch pointerDown
    if (now - lastTouchTsRef.current < 320) return;
    onAction(action);
  };

  const timerPct = prompt
    ? Math.max(0, Math.min(100, (prompt.timeLeft / Math.max(0.1, prompt.maxTime)) * 100))
    : 0;

  return (
    <footer
      className={`relative z-20 w-full px-3 sm:px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-1.5 sm:pt-2 flex flex-col items-center gap-1.5 sm:gap-2 transition-opacity duration-150 ${
        hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {prompt ? (
        <div className="w-full max-w-2xl rounded-xl bg-slate-900/95 border border-slate-700/90 px-3 py-1.5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px] sm:text-xs text-slate-200">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-amber-300 truncate">
                {prompt.char.name} ({prompt.role})
              </span>
              <span className="text-slate-500">·</span>
              <span className="truncate">
                Saran: <strong className="text-sky-300">{prompt.recommended}</strong>
                {prompt.skillName ? ` (${prompt.skillName})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden md:inline text-[11px] text-slate-400">
                Enter = Cepat
              </span>
              <span className="sm:hidden text-[10px] text-sky-300/90">
                Ketuk lapangan = Cepat
              </span>
              <span className="font-mono-num text-amber-400 font-bold">
                {prompt.timeLeft.toFixed(1)}s
              </span>
            </div>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-sky-400 transition-[width] duration-75"
              style={{ width: `${timerPct}%` }}
            />
          </div>
        </div>
      ) : waitingText ? (
        <p className="text-xs sm:text-sm text-rose-300 font-semibold text-center px-2">
          {waitingText}
        </p>
      ) : (
        <p className="text-[11px] sm:text-xs text-slate-400 text-center px-2">
          {idleText}
        </p>
      )}

      {/* Mobile: Ergonomic 2x2 Thumb Grid + Full-Width Ultimate | PC: Single Row 5-Key Deck */}
      <div className="w-full max-w-md sm:max-w-none grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-2.5 md:gap-3">
        {ACTION_BUTTONS.map((btn) => {
          const Icon = btn.icon;
          const isActive = Boolean(prompt);
          const isRecommended = prompt?.recommended === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              disabled={!isActive}
              onPointerDown={(e) => {
                if (!isActive || e.pointerType !== 'touch') return;
                e.preventDefault();
                fireAction(btn.id, true);
              }}
              onClick={() => {
                if (!isActive) return;
                fireAction(btn.id, false);
              }}
              className={`relative min-h-[48px] sm:min-h-[46px] sm:min-w-[118px] md:min-w-[136px] px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all duration-100 select-none touch-manipulation active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isRecommended
                  ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.45)] sm:scale-105'
                  : isActive
                  ? 'bg-slate-800/95 text-white border-slate-600 hover:bg-slate-700'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{btn.label}</span>
              <span className="hidden sm:inline font-mono-num text-[11px] opacity-70">
                [{btn.keyHint}]
              </span>
            </button>
          );
        })}

        <button
          type="button"
          disabled={!prompt || energy < 100}
          onPointerDown={(e) => {
            if (!prompt || energy < 100 || e.pointerType !== 'touch') return;
            e.preventDefault();
            fireAction('ULTIMATE', true);
          }}
          onClick={() => {
            if (!prompt || energy < 100) return;
            fireAction('ULTIMATE', false);
          }}
          className={`col-span-2 sm:col-span-1 min-h-[46px] sm:min-w-[152px] px-5 py-2.5 sm:py-3 rounded-xl font-display text-base sm:text-lg font-extrabold tracking-wide uppercase flex items-center justify-center gap-2 border transition-all duration-100 select-none touch-manipulation active:scale-95 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
            prompt && energy >= 100
              ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 border-yellow-200 shadow-[0_0_26px_rgba(245,158,11,0.7)] animate-pulse'
              : 'bg-slate-900/90 text-amber-400/70 border-amber-500/30'
          }`}
        >
          <Zap className="w-5 h-5 shrink-0" />
          <span>Ultimate ({Math.min(100, Math.round(energy))}%)</span>
          <span className="hidden sm:inline font-mono-num text-xs">[Spasi]</span>
        </button>
      </div>
    </footer>
  );
};
