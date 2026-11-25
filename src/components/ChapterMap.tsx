import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Lock, Play, ShieldAlert } from 'lucide-react';
import { getCharacterById } from '../data/characters';
import { STORY_CHAPTERS } from '../data/story';
import { SaveData, StoryEpisode } from '../types/game';
import { soundEngine } from '../utils/audio';

interface ChapterMapProps {
  save: SaveData;
  onSelectEpisode: (ep: StoryEpisode) => void;
  onBack: () => void;
}

export const ChapterMap: React.FC<ChapterMapProps> = ({
  save,
  onSelectEpisode,
  onBack,
}) => {
  const [selectedChapter, setSelectedChapter] = useState(
    Math.min(10, Math.max(1, save.highestUnlockedChapter))
  );

  const chapter =
    STORY_CHAPTERS.find((c) => c.chapterNumber === selectedChapter) || STORY_CHAPTERS[0];

  const isEpisodeUnlocked = (chNum: number, epNum: number) => {
    if (chNum < save.highestUnlockedChapter) return true;
    if (chNum === save.highestUnlockedChapter && epNum <= save.highestUnlockedEpisode) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#090E1A] text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                soundEngine.playClick();
                onBack();
              }}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                Peta Perjalanan · 10 Chapter × 12 Cerita
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                Kronik Karier Raka Pratama
              </h1>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400">Total Episode Selesai</p>
            <p className="font-mono-num text-2xl font-bold text-sky-400">
              {save.clearedEpisodes.length} / 120
            </p>
          </div>
        </div>

        {/* 10 Chapter Selector Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {STORY_CHAPTERS.map((ch) => {
            const unlocked = ch.chapterNumber <= save.highestUnlockedChapter;
            const active = ch.chapterNumber === selectedChapter;
            const clearedCount = ch.episodes.filter((e) =>
              save.clearedEpisodes.includes(e.id)
            ).length;

            return (
              <button
                key={ch.chapterNumber}
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedChapter(ch.chapterNumber);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-800 border-amber-400 shadow-lg'
                    : unlocked
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-600'
                    : 'bg-slate-950/70 border-slate-900 opacity-60 hover:opacity-85'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-num text-xs font-bold text-amber-400">
                    CH {ch.chapterNumber}
                  </span>
                  {!unlocked && <Lock className="w-3.5 h-3.5 text-slate-500" />}
                </div>
                <p className="mt-1 text-xs font-semibold text-white truncate">
                  {ch.title}
                </p>
                <p className="mt-1 font-mono-num text-[11px] text-slate-400">
                  {clearedCount}/12
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Chapter Overview Banner */}
        <div
          className="rounded-2xl p-6 bg-[#111827] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="space-y-1 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: chapter.accentColor }}>
              Chapter {chapter.chapterNumber} · {chapter.era}
            </p>
            <h2 className="font-display text-3xl font-extrabold text-white">
              {chapter.title}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">{chapter.description}</p>
          </div>
          <div className="shrink-0 text-left md:text-right">
            <p className="text-xs text-slate-400">Hadiah Tiap Match</p>
            <p className="font-mono-num text-xl font-bold text-amber-400">100 Koin + EXP</p>
          </div>
        </div>

        {/* 12 Episodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapter.episodes.map((ep) => {
            const unlocked = isEpisodeUnlocked(ep.chapterNumber, ep.episodeNumber);
            const cleared = save.clearedEpisodes.includes(ep.id);
            const isBoss = ep.opponent.isBoss;
            const bossChar = getCharacterById(ep.opponent.spikerId);

            return (
              <div
                key={ep.id}
                className={`rounded-xl p-5 border flex flex-col justify-between gap-4 transition-colors ${
                  isBoss
                    ? 'bg-[#19101C] border-rose-500/45'
                    : 'bg-[#111827] border-slate-800'
                } ${!unlocked ? 'opacity-55' : ''}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-num font-bold text-slate-400">
                      Ep. {ep.episodeNumber} · {ep.location}
                    </span>
                    {cleared ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selesai
                      </span>
                    ) : isBoss ? (
                      <span className="flex items-center gap-1 text-rose-400 font-bold">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        FINAL BOSS
                      </span>
                    ) : null}
                  </div>

                  <h3 className="font-display text-xl font-bold text-white leading-snug">
                    {ep.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{ep.summary}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-400">
                    <span>Lawan: </span>
                    <span className="text-slate-200 font-medium">{ep.opponent.teamName}</span>
                    {isBoss && (
                      <span className="block text-[11px] text-rose-300">
                        Ace: {bossChar.name} ({bossChar.rank})
                      </span>
                    )}
                  </div>

                  <button
                    disabled={!unlocked}
                    onClick={() => {
                      soundEngine.playClick();
                      onSelectEpisode(ep);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap ${
                      unlocked
                        ? isBoss
                          ? 'bg-rose-500 text-white hover:bg-rose-400'
                          : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {unlocked ? (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        {cleared ? 'Mainkan Ulang' : 'Mulai'}
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Terkunci
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
