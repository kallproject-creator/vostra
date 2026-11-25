import React, { useEffect, useState } from 'react';
import { ArrowRight, FastForward, Play, Swords } from 'lucide-react';
import { getCharacterById } from '../data/characters';
import { StoryEpisode } from '../types/game';
import { soundEngine } from '../utils/audio';
import { AnimePortrait } from './AnimePortrait';

interface StoryViewProps {
  episode: StoryEpisode;
  onStartMatch: () => void;
  onBack: () => void;
}

export const StoryView: React.FC<StoryViewProps> = ({
  episode,
  onStartMatch,
  onBack,
}) => {
  const [lineIdx, setLineIdx] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const lines = episode.dialogues;
  const currentLine = lines[lineIdx] || lines[0];
  const fullText = currentLine.text;
  const isTyping = charCount < fullText.length;

  useEffect(() => {
    setLineIdx(0);
    setCharCount(0);
  }, [episode.id]);

  // Typewriter subtitle effect + subtle voice blip
  useEffect(() => {
    if (!isTyping) return;
    const timer = window.setTimeout(() => {
      setCharCount((c) => {
        const next = c + 1;
        if (next % 4 === 1) {
          const pitch = currentLine.side === 'left' ? 1.05 : 0.86;
          soundEngine.playDialogueBlip(pitch);
        }
        return next;
      });
    }, 22);
    return () => window.clearTimeout(timer);
  }, [charCount, isTyping, currentLine.side]);

  // Auto-play advance
  useEffect(() => {
    if (!autoPlay || isTyping) return;
    const timer = window.setTimeout(() => {
      if (lineIdx < lines.length - 1) {
        setLineIdx((i) => i + 1);
        setCharCount(0);
      } else {
        onStartMatch();
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [autoPlay, isTyping, lineIdx, lines.length, onStartMatch]);

  const handleAdvance = React.useCallback(() => {
    if (isTyping) {
      setCharCount(fullText.length);
      return;
    }
    soundEngine.playClick();
    if (lineIdx < lines.length - 1) {
      setLineIdx((i) => i + 1);
      setCharCount(0);
    } else {
      onStartMatch();
    }
  }, [fullText.length, isTyping, lineIdx, lines.length, onStartMatch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleAdvance]);

  // Determine left and right characters currently displayed
  const leftLine =
    [...lines.slice(0, lineIdx + 1)].reverse().find((l) => l.side === 'left') ||
    lines.find((l) => l.side === 'left');
  const rightLine =
    [...lines.slice(0, lineIdx + 1)].reverse().find((l) => l.side === 'right') ||
    lines.find((l) => l.side === 'right');

  const leftChar = getCharacterById(leftLine ? leftLine.speakerId : 'raka_pratama');
  const rightChar = getCharacterById(
    rightLine ? rightLine.speakerId : episode.opponent.spikerId
  );

  const isLeftSpeaking = currentLine.side === 'left';
  const isRightSpeaking = currentLine.side === 'right';

  return (
    <div className="relative w-full h-[100dvh] min-h-0 bg-[#080C18] overflow-hidden flex flex-col justify-between select-none">
      {/* Atmospheric Arena Backdrop */}
      <img
        src="/src/assets/images/court_arena_backdrop_1795623799824.jpg"
        alt="Latar Cerita"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#060913] via-[#060913]/45 to-[#060913]/85 pointer-events-none" />

      {/* Top Story Header */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-slate-950/65">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">
            Chapter {episode.chapterNumber} · Episode {episode.episodeNumber} · {episode.location}
          </p>
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-wide truncate">
            {episode.title}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAutoPlay((a) => !a)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
              autoPlay
                ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {autoPlay ? 'Auto Dialog: ON' : 'Auto Dialog'}
          </button>
          <button
            onClick={onStartMatch}
            className="px-4 py-2 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-300 cursor-pointer whitespace-nowrap"
          >
            <FastForward className="w-3.5 h-3.5" />
            Langsung Tanding
          </button>
          <button
            onClick={onBack}
            className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            Kembali
          </button>
        </div>
      </header>

      {/* Center Stage: Expressive Character Portraits */}
      <div className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 flex items-end justify-between pb-4">
        {/* Left Character */}
        <div
          className={`transition-all duration-300 flex flex-col items-center ${
            isLeftSpeaking ? 'opacity-100 scale-100' : 'opacity-45 scale-95 brightness-75'
          }`}
        >
          <AnimePortrait
            character={leftChar}
            emotion={isLeftSpeaking ? currentLine.emotion : 'neutral'}
            isSpeaking={isLeftSpeaking && isTyping}
            facing="right"
            size="xl"
          />
          <span className="mt-1 text-xs font-semibold text-sky-300">
            {leftChar.name}
          </span>
        </div>

        {/* Episode Summary Watermark-free Center Card */}
        <div className="hidden lg:flex flex-col items-center text-center max-w-xs self-center px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[11px] uppercase tracking-widest text-amber-400 font-bold">
            {episode.opponent.isBoss ? 'Pertandingan Final Boss' : 'Alur Cerita'}
          </span>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed">{episode.summary}</p>
          <p className="mt-2 text-[11px] text-slate-400">
            Lawan: <strong className="text-rose-300">{episode.opponent.teamName}</strong>
          </p>
        </div>

        {/* Right Character */}
        <div
          className={`transition-all duration-300 flex flex-col items-center ${
            isRightSpeaking ? 'opacity-100 scale-100' : 'opacity-45 scale-95 brightness-75'
          }`}
        >
          <AnimePortrait
            character={rightChar}
            emotion={isRightSpeaking ? currentLine.emotion : 'neutral'}
            isSpeaking={isRightSpeaking && isTyping}
            facing="left"
            size="xl"
          />
          <span className="mt-1 text-xs font-semibold text-rose-300">
            {rightChar.name}
          </span>
        </div>
      </div>

      {/* Bottom Subtitle Dialogue Box */}
      <div className="relative z-20 max-w-5xl w-full mx-auto px-4 pb-6">
        <div
          onClick={handleAdvance}
          className="rounded-2xl bg-[#0D1426]/95 border border-slate-700/90 p-5 md:p-6 shadow-2xl cursor-pointer hover:border-slate-500 transition-colors"
        >
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <span
                className={`font-display text-xl md:text-2xl font-bold tracking-wide ${
                  currentLine.side === 'left' ? 'text-sky-400' : 'text-rose-400'
                }`}
              >
                {currentLine.speakerName}
              </span>
              {currentLine.actionTag && (
                <span className="text-xs text-amber-300 italic">
                  · {currentLine.actionTag}
                </span>
              )}
            </div>
            <span className="font-mono-num text-xs text-slate-400">
              {lineIdx + 1} / {lines.length}
            </span>
          </div>

          <p className="text-base md:text-lg text-slate-100 leading-relaxed min-h-[3.5rem]">
            {fullText.slice(0, charCount)}
            {isTyping && <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse" />}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Klik kotak dialog atau tekan Enter / Spasi untuk melanjutkan
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAdvance();
              }}
              className="px-4 py-2 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-300 cursor-pointer"
            >
              {lineIdx === lines.length - 1 && !isTyping ? (
                <>
                  <Swords className="w-4 h-4" />
                  Mulai Pertandingan 0-21
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Lanjut
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
