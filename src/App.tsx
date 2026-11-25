import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Coins, Globe, Play, RotateCcw, Sparkles, Users, Volume2, VolumeX } from 'lucide-react';
import { ChapterMap } from './components/ChapterMap';
import { GachaView } from './components/GachaView';
import { InventoryView } from './components/InventoryView';
import { MatchArena } from './components/MatchArena';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { MultiplayerMatchArena } from './components/MultiplayerMatchArena';
import { StoryView } from './components/StoryView';
import { AnimePortrait } from './components/AnimePortrait';
import { getCharacterById } from './data/characters';
import { getEpisodeByNumbers, getNextEpisodePosition } from './data/story';
import { MultiplayerRoomState, SaveData, ScreenMode, StoryEpisode, TeamLineup } from './types/game';
import { soundEngine } from './utils/audio';
import { ServerSide } from './utils/multiplayerClient';
import {
  addExpToOwned,
  applyGachaPulls,
  loadSaveData,
  persistSaveData,
  resetSaveData,
  rollSingleGacha,
  sellBulkBenchByMaxRank,
  sellCharacter,
} from './utils/storage';

export default function App() {
  const [save, setSave] = useState<SaveData>(() => {
    const loaded = loadSaveData();
    soundEngine.setMuted(loaded.muted);
    return loaded;
  });
  const [screen, setScreen] = useState<ScreenMode>('TITLE');
  const [activeEpisode, setActiveEpisode] = useState<StoryEpisode>(
    () =>
      getEpisodeByNumbers(save.highestUnlockedChapter, save.highestUnlockedEpisode) ||
      getEpisodeByNumbers(1, 1)!
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [mpSession, setMpSession] = useState<{
    room: MultiplayerRoomState;
    mySide: ServerSide;
  } | null>(null);

  const updateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSave((prev) => {
      const next = updater(prev);
      persistSaveData(next);
      return next;
    });
  }, []);

  const toggleMute = useCallback(() => {
    updateSave((prev) => {
      const nextMuted = !prev.muted;
      soundEngine.setMuted(nextMuted);
      return { ...prev, muted: nextMuted };
    });
  }, [updateSave]);

  const startEpisode = useCallback((ep: StoryEpisode) => {
    setActiveEpisode(ep);
    setScreen('STORY');
  }, []);

  const handleContinueStory = useCallback(() => {
    soundEngine.playClick();
    const ep =
      getEpisodeByNumbers(save.highestUnlockedChapter, save.highestUnlockedEpisode) ||
      getEpisodeByNumbers(1, 1)!;
    startEpisode(ep);
  }, [save.highestUnlockedChapter, save.highestUnlockedEpisode, startEpisode]);

  // Enter / Space shortcut on Title Screen
  useEffect(() => {
    if (screen !== 'TITLE' || confirmReset) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleContinueStory();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, confirmReset, handleContinueStory]);

  const handleFinishMatch = useCallback(
    (result: {
      won: boolean;
      playerScore: number;
      opponentScore: number;
      coinsEarned: number;
      expEarned: number;
    }) => {
      const activeIds = [save.lineup.SPIKER, save.lineup.SETTER, save.lineup.BLOCKER];

      updateSave((prev) => {
        const { updated } = addExpToOwned(prev.ownedCharacters, activeIds, result.expEarned);

        // Unlock Raka Awakened on Chapter 10 Episode 12 victory
        let rakaAwakened = prev.rakaAwakened;
        if (result.won && activeEpisode.unlocksAwakening && !updated.raka_awakened) {
          rakaAwakened = true;
          updated.raka_awakened = {
            charId: 'raka_awakened',
            level: Math.max(10, updated.raka_pratama?.level || 10),
            exp: 0,
            copies: 1,
            matchesPlayed: 0,
          };
        }

        const cleared = new Set(prev.clearedEpisodes);
        let nextCh = prev.highestUnlockedChapter;
        let nextEp = prev.highestUnlockedEpisode;

        if (result.won) {
          cleared.add(activeEpisode.id);
          const isAtFrontier =
            activeEpisode.chapterNumber === prev.highestUnlockedChapter &&
            activeEpisode.episodeNumber === prev.highestUnlockedEpisode;
          if (isAtFrontier) {
            const nxt = getNextEpisodePosition(
              activeEpisode.chapterNumber,
              activeEpisode.episodeNumber
            );
            if (nxt) {
              nextCh = nxt.chapter;
              nextEp = nxt.episode;
            }
          }
        }

        return {
          ...prev,
          coins: prev.coins + result.coinsEarned,
          ownedCharacters: updated,
          clearedEpisodes: Array.from(cleared),
          highestUnlockedChapter: nextCh,
          highestUnlockedEpisode: nextEp,
          rakaAwakened,
          totalMatchesPlayed: prev.totalMatchesPlayed + 1,
          totalMatchesWon: prev.totalMatchesWon + (result.won ? 1 : 0),
        };
      });

      setScreen('CHAPTER_MAP');
    },
    [activeEpisode, save.lineup.BLOCKER, save.lineup.SETTER, save.lineup.SPIKER, updateSave]
  );

  const handleGachaPull = useCallback(
    (count: 1 | 5) => {
      const cost = count === 1 ? 100 : 450;
      if (save.coins < cost) return [];
      const pulled = Array.from({ length: count }, () => rollSingleGacha());
      const applied = applyGachaPulls(save, pulled);

      const nextSave: SaveData = {
        ...save,
        coins: save.coins - cost,
        ownedCharacters: applied.nextOwned,
        gachaPullsCount: save.gachaPullsCount + count,
      };
      setSave(nextSave);
      persistSaveData(nextSave);

      return applied.results;
    },
    [save]
  );

  const handleUpdateLineup = useCallback(
    (nextLineup: TeamLineup) => {
      updateSave((prev) => ({ ...prev, lineup: nextLineup }));
    },
    [updateSave]
  );

  const handleSellCharacter = useCallback(
    (charId: string, mode: 'full' | 'duplicate') => {
      const res = sellCharacter(save, charId, mode);
      if (!res.error) {
        setSave(res.nextSave);
        persistSaveData(res.nextSave);
      }
      return { coinsEarned: res.coinsEarned, error: res.error };
    },
    [save]
  );

  const handleSellBulkBench = useCallback(
    (maxRank: 'D' | 'C') => {
      const res = sellBulkBenchByMaxRank(save, maxRank);
      if (res.soldCount > 0) {
        setSave(res.nextSave);
        persistSaveData(res.nextSave);
      }
      return { soldCount: res.soldCount, coinsEarned: res.coinsEarned };
    },
    [save]
  );

  const handleFinishMultiplayerMatch = useCallback(
    (result: {
      won: boolean;
      myScore: number;
      oppScore: number;
      coinsEarned: number;
      expEarned: number;
    }) => {
      const activeIds = [save.lineup.SPIKER, save.lineup.SETTER, save.lineup.BLOCKER];
      updateSave((prev) => {
        const { updated } = addExpToOwned(prev.ownedCharacters, activeIds, result.expEarned);
        return {
          ...prev,
          coins: prev.coins + result.coinsEarned,
          ownedCharacters: updated,
          totalMatchesPlayed: prev.totalMatchesPlayed + 1,
          totalMatchesWon: prev.totalMatchesWon + (result.won ? 1 : 0),
        };
      });
      setMpSession(null);
      setScreen('TITLE');
    },
    [save.lineup.BLOCKER, save.lineup.SETTER, save.lineup.SPIKER, updateSave]
  );

  const handleResetProgress = () => {
    const fresh = resetSaveData();
    soundEngine.setMuted(fresh.muted);
    setSave(fresh);
    setConfirmReset(false);
  };

  if (screen === 'CHAPTER_MAP') {
    return (
      <ChapterMap
        save={save}
        onSelectEpisode={startEpisode}
        onBack={() => setScreen('TITLE')}
      />
    );
  }

  if (screen === 'STORY') {
    return (
      <StoryView
        episode={activeEpisode}
        onStartMatch={() => setScreen('MATCH')}
        onBack={() => setScreen('CHAPTER_MAP')}
      />
    );
  }

  if (screen === 'MATCH') {
    return (
      <MatchArena
        episode={activeEpisode}
        playerLineup={save.lineup}
        ownedCharacters={save.ownedCharacters}
        muted={save.muted}
        onToggleMute={toggleMute}
        onFinishMatch={handleFinishMatch}
        onExitToMenu={() => setScreen('CHAPTER_MAP')}
      />
    );
  }

  if (screen === 'GACHA') {
    return (
      <GachaView
        save={save}
        onPull={handleGachaPull}
        onBack={() => setScreen('TITLE')}
      />
    );
  }

  if (screen === 'INVENTORY') {
    return (
      <InventoryView
        save={save}
        onUpdateLineup={handleUpdateLineup}
        onSellCharacter={handleSellCharacter}
        onSellBulkBench={handleSellBulkBench}
        onOpenGacha={() => setScreen('GACHA')}
        onBack={() => setScreen('TITLE')}
      />
    );
  }

  if (screen === 'MULTIPLAYER') {
    return (
      <MultiplayerLobby
        save={save}
        onMatchStarted={(room, mySide) => {
          setMpSession({ room, mySide });
          setScreen('MULTIPLAYER_MATCH');
        }}
        onBack={() => setScreen('TITLE')}
      />
    );
  }

  if (screen === 'MULTIPLAYER_MATCH' && mpSession) {
    return (
      <MultiplayerMatchArena
        initialRoom={mpSession.room}
        mySide={mpSession.mySide}
        muted={save.muted}
        onToggleMute={toggleMute}
        onFinishMatch={handleFinishMultiplayerMatch}
        onExitToLobby={() => {
          setMpSession(null);
          setScreen('MULTIPLAYER');
        }}
      />
    );
  }

  // TITLE SCREEN — Full-Viewport Game Shell
  const leadChar = getCharacterById(save.lineup.SPIKER);
  const currentEp =
    getEpisodeByNumbers(save.highestUnlockedChapter, save.highestUnlockedEpisode) ||
    getEpisodeByNumbers(1, 1)!;

  return (
    <div className="relative w-full min-h-screen bg-[#070B14] text-slate-100 overflow-hidden flex flex-col justify-between select-none">
      {/* Stadium Key Art Backdrop */}
      <img
        src="/src/assets/images/title_arena_backdrop_1795623799937.jpg"
        alt="Stadion Utama Skyward Spike"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#070B14]/95 via-[#070B14]/70 to-[#070B14]/55 pointer-events-none" />

      {/* Top Minimal Perimeter Status */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 pt-6">
        <div className="flex items-center gap-4 text-xs md:text-sm text-slate-300">
          <span className="flex items-center gap-1.5 font-mono-num font-bold text-amber-400">
            <Coins className="w-4 h-4" />
            {save.coins} Koin
          </span>
          <span className="text-slate-600">·</span>
          <span className="font-mono-num">
            Progres: {save.clearedEpisodes.length}/120 Episode
          </span>
          <span className="hidden sm:inline text-slate-600">·</span>
          <span className="hidden sm:inline text-slate-400">
            Tersimpan otomatis di perangkat
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-lg bg-slate-900/85 border border-slate-700 text-slate-200 hover:bg-slate-800 cursor-pointer"
            title={save.muted ? 'Aktifkan Suara' : 'Bisukan Suara'}
          >
            {save.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setConfirmReset(true)}
            className="p-2.5 rounded-lg bg-slate-900/85 border border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
            title="Reset Data Tersimpan"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Title Centerpiece */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-6 md:px-12 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          {/* Bespoke Inline SVG Title Emblem Lockup */}
          <div className="space-y-3">
            <svg viewBox="0 0 460 110" className="w-full max-w-md h-auto overflow-visible" aria-label="Skyward Spike">
              <defs>
                <linearGradient id="titleGold" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FACC15" />
                  <stop offset="55%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>
              <path d="M8 94 L110 94 L126 84 L20 84 Z" fill="#38BDF8" opacity="0.85" />
              <text
                x="6"
                y="54"
                fill="url(#titleGold)"
                fontFamily="Barlow Condensed, sans-serif"
                fontWeight="800"
                fontStyle="italic"
                fontSize="58"
                letterSpacing="2"
              >
                SKYWARD SPIKE
              </text>
              <text
                x="136"
                y="93"
                fill="#E2E8F0"
                fontFamily="Barlow Condensed, sans-serif"
                fontWeight="700"
                fontSize="24"
                letterSpacing="6"
              >
                LEGENDA VOLI 3V3
              </text>
            </svg>

            <p className="text-base md:text-lg text-slate-300 max-w-xl leading-relaxed">
              Ikuti kisah Raka Pratama dari ekstrakurikuler kelas 10 SMA hingga liga profesional dunia dalam pertandingan voli 3v3 berkecepatan tinggi dengan cutscene Ultimate unik dan sistem rekrutmen Gacha Rank D–S+.
            </p>
          </div>

          {/* Primary Start CTA + Direct Game Mode Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1">
            <button
              onClick={handleContinueStory}
              className="px-7 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display text-2xl font-extrabold uppercase tracking-wide flex items-center justify-center gap-3 shadow-[0_0_32px_rgba(245,158,11,0.4)] transition-transform active:scale-95 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>
                {save.clearedEpisodes.length === 0
                  ? 'Mulai Cerita (Ch.1)'
                  : `Lanjut Ch.${currentEp.chapterNumber} Ep.${currentEp.episodeNumber}`}
              </span>
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                setScreen('CHAPTER_MAP');
              }}
              className="px-5 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-semibold flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <BookOpen className="w-5 h-5 text-sky-400" />
              <span>10 Chapter Cerita</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                soundEngine.playClick();
                setScreen('INVENTORY');
              }}
              className="px-5 py-3 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Tim & Inventori ({Object.keys(save.ownedCharacters).length})</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                setScreen('GACHA');
              }}
              className="px-5 py-3 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Gacha Pemain (100 Koin)</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                setScreen('MULTIPLAYER');
              }}
              className="px-5 py-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/50 text-sky-300 text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Globe className="w-4 h-4 text-sky-400" />
              <span>Multiplayer (Room Kode)</span>
            </button>
          </div>

          <p className="text-xs text-slate-400 tracking-wide">
            Kontrol PC: 1–4 / QWER / ASDF · Enter Aksi Cepat · Spasi Ultimate · HP: Tombol Jempol 2×2 atau Ketuk Lapangan
          </p>
        </div>

        {/* Right Hero Anchor: Active Ace Spotlight */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-end">
          <div className="rounded-2xl bg-[#0D1426]/85 border border-slate-700/70 p-6 flex flex-col items-center text-center max-w-xs w-full shadow-2xl">
            <p className="text-[11px] font-bold uppercase tracking-widest text-sky-400">
              Ace Tim Aktif · Spiker
            </p>
            <AnimePortrait
              character={leadChar}
              emotion={leadChar.id === 'raka_awakened' || leadChar.rank === 'S+' ? 'awakened' : 'confident'}
              size="lg"
              className="my-2"
            />
            <h3 className="font-display text-2xl font-extrabold text-white">{leadChar.name}</h3>
            <p className="text-xs text-slate-400">
              {leadChar.rank} · Lv.{save.ownedCharacters[leadChar.id]?.level || 1} ·{' '}
              {leadChar.ultimate.indonesianName}
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-6 md:px-12 pb-5 text-xs text-slate-500 flex items-center justify-between">
        <span>Skyward Spike · Pertandingan 3v3 Skor 0–21</span>
        <span className="font-mono-num">
          Menang {save.totalMatchesWon} / {save.totalMatchesPlayed} Match
        </span>
      </footer>

      {/* Reset Progress Confirmation Modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#111827] border border-slate-700 p-6 space-y-4">
            <h3 className="font-display text-2xl font-bold text-white">Reset Semua Progres?</h3>
            <p className="text-sm text-slate-300">
              Semua progres cerita, koin, level pemain, dan koleksi gacha di perangkat ini akan dihapus dan dimulai ulang dari awal.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleResetProgress}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 cursor-pointer"
              >
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
