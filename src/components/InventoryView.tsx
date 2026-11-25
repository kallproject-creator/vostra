import React, { useState } from 'react';
import { ArrowLeft, Check, Coins, Shield, Sparkles, Trash2, Zap } from 'lucide-react';
import {
  CHARACTERS,
  RANK_META,
  RANK_ORDER,
  getCharacterById,
  getEffectiveStats,
  getExpForNextLevel,
} from '../data/characters';
import { Rank, Role, SaveData, TeamLineup } from '../types/game';
import { soundEngine } from '../utils/audio';
import { getCharacterSellValue } from '../utils/storage';
import { AnimePortrait } from './AnimePortrait';

interface InventoryViewProps {
  save: SaveData;
  onUpdateLineup: (next: TeamLineup) => void;
  onSellCharacter: (
    charId: string,
    mode: 'full' | 'duplicate'
  ) => { coinsEarned: number; error?: string };
  onSellBulkBench: (maxRank: 'D' | 'C') => { soldCount: number; coinsEarned: number };
  onOpenGacha: () => void;
  onBack: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  save,
  onUpdateLineup,
  onSellCharacter,
  onSellBulkBench,
  onOpenGacha,
  onBack,
}) => {
  const [activeSlot, setActiveSlot] = useState<Role>('SPIKER');
  const [rankFilter, setRankFilter] = useState<Rank | 'ALL'>('ALL');
  const [inspectedId, setInspectedId] = useState<string>(save.lineup.SPIKER);
  const [confirmSellId, setConfirmSellId] = useState<string | null>(null);
  const [confirmBulkRank, setConfirmBulkRank] = useState<'D' | 'C' | null>(null);
  const [sellFeedback, setSellFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  const ownedList = CHARACTERS.filter((c) => Boolean(save.ownedCharacters[c.id]))
    .sort((a, b) => {
      const rankDiff = RANK_ORDER[b.rank] - RANK_ORDER[a.rank];
      if (rankDiff !== 0) return rankDiff;
      return (save.ownedCharacters[b.id]?.level || 1) - (save.ownedCharacters[a.id]?.level || 1);
    })
    .filter((c) => rankFilter === 'ALL' || c.rank === rankFilter);

  const inspectedChar = getCharacterById(
    save.ownedCharacters[inspectedId] ? inspectedId : save.lineup.SPIKER
  );
  const inspectedOwned = save.ownedCharacters[inspectedChar.id] || {
    charId: inspectedChar.id,
    level: 1,
    exp: 0,
    copies: 1,
    matchesPlayed: 0,
  };
  const inspectedStats = getEffectiveStats(inspectedChar, inspectedOwned.level);
  const neededExp = getExpForNextLevel(inspectedOwned.level);
  const inspectedSell = getCharacterSellValue(inspectedChar, inspectedOwned);
  const isInspectedEquipped =
    save.lineup.SPIKER === inspectedChar.id ||
    save.lineup.SETTER === inspectedChar.id ||
    save.lineup.BLOCKER === inspectedChar.id;

  const equippedSet = new Set([save.lineup.SPIKER, save.lineup.SETTER, save.lineup.BLOCKER]);
  const totalOwnedCount = Object.keys(save.ownedCharacters).length;
  const benchDPreview = Object.values(save.ownedCharacters).reduce(
    (acc, o) => {
      if (equippedSet.has(o.charId)) return acc;
      const c = getCharacterById(o.charId);
      if (c.rank !== 'D') return acc;
      return {
        count: acc.count + 1,
        coins: acc.coins + getCharacterSellValue(c, o).fullSellCoins,
      };
    },
    { count: 0, coins: 0 }
  );
  const benchDCPreview = Object.values(save.ownedCharacters).reduce(
    (acc, o) => {
      if (equippedSet.has(o.charId)) return acc;
      const c = getCharacterById(o.charId);
      if (c.rank !== 'D' && c.rank !== 'C') return acc;
      return {
        count: acc.count + 1,
        coins: acc.coins + getCharacterSellValue(c, o).fullSellCoins,
      };
    },
    { count: 0, coins: 0 }
  );

  const assignToActiveSlot = (charId: string) => {
    soundEngine.playClick();
    const next = { ...save.lineup };
    // Swap if already assigned to another slot so all 3 court players remain distinct
    for (const r of ['SPIKER', 'SETTER', 'BLOCKER'] as Role[]) {
      if (next[r] === charId && r !== activeSlot) {
        next[r] = next[activeSlot];
      }
    }
    next[activeSlot] = charId;
    onUpdateLineup(next);
    setInspectedId(charId);
    setConfirmSellId(null);
  };

  const handleSellOne = (charId: string, mode: 'full' | 'duplicate') => {
    const res = onSellCharacter(charId, mode);
    if (res.error) {
      setSellFeedback({ text: res.error, isError: true });
      return;
    }
    soundEngine.playClick();
    setConfirmSellId(null);
    if (mode === 'full' && inspectedId === charId) {
      setInspectedId(save.lineup.SPIKER);
    }
    setSellFeedback({
      text:
        mode === 'duplicate'
          ? `1 duplikat terjual! +${res.coinsEarned} Koin ditambahkan.`
          : `Pemain dijual! +${res.coinsEarned} Koin siap dipakai gacha.`,
    });
  };

  const handleBulkSell = (maxRank: 'D' | 'C') => {
    if (confirmBulkRank !== maxRank) {
      soundEngine.playClick();
      setConfirmBulkRank(maxRank);
      return;
    }
    const res = onSellBulkBench(maxRank);
    setConfirmBulkRank(null);
    if (res.soldCount === 0) {
      setSellFeedback({ text: 'Tidak ada pemain cadangan pada rank tersebut.', isError: true });
      return;
    }
    soundEngine.playClick();
    setInspectedId(save.lineup.SPIKER);
    setSellFeedback({
      text: `${res.soldCount} pemain cadangan terjual! +${res.coinsEarned} Koin ditambahkan.`,
    });
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
              <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider">
                Formasi 3v3 & Progres Level Pemain
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white">
                Tim Inti & Inventori Pemain
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700">
              <Coins className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Koin Gacha</p>
                <p className="font-mono-num text-lg font-bold text-amber-400">{save.coins}</p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenGacha();
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Ke Gacha
            </button>

            <div className="text-right pl-2">
              <p className="text-xs text-slate-400">Koleksi Terbuka</p>
              <p className="font-mono-num text-2xl font-bold text-amber-400">
                {Object.keys(save.ownedCharacters).length} / {CHARACTERS.length}
              </p>
            </div>
          </div>
        </div>

        {sellFeedback && (
          <div
            className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between ${
              sellFeedback.isError
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <span>{sellFeedback.text}</span>
            <button
              onClick={() => setSellFeedback(null)}
              className="text-xs underline opacity-80 hover:opacity-100 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Top 3-Player Active Lineup Slots */}
        <div className="space-y-2">
          <p className="text-xs text-slate-400">
            Pilih posisi (Spiker / Setter / Blocker), lalu klik pemain di bawah untuk menggantinya.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['SPIKER', 'SETTER', 'BLOCKER'] as Role[]).map((role) => {
              const char = getCharacterById(save.lineup[role]);
              const owned = save.ownedCharacters[char.id];
              const isSelected = activeSlot === role;
              const meta = RANK_META[char.rank];
              return (
                <button
                  key={role}
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveSlot(role);
                    setInspectedId(char.id);
                  }}
                  className={`p-4 rounded-2xl border text-left flex items-center gap-4 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-amber-400 shadow-lg'
                      : 'bg-[#111827] border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <AnimePortrait character={char} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-sky-400">{role}</span>
                      <span className="font-mono-num font-bold" style={{ color: meta.color }}>
                        {char.rank} · Lv.{owned?.level || 1}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-white truncate">
                      {char.name}
                    </h3>
                    <p className="text-[11px] text-amber-300 truncate">
                      Ult: {char.ultimate.indonesianName}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Roster Grid + Detailed Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Owned Roster */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-bold text-white">
                Pemain Dimiliki ({ownedList.length})
              </h2>
              <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
                {(['ALL', 'S+', 'S', 'A', 'B', 'C', 'D'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRankFilter(r)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      rankFilter === r
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {r === 'ALL' ? 'Semua' : r}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Sell Unwanted Bench Players Bar */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  Jual Cepat Pemain Cadangan
                </p>
                <p className="text-[11px] text-slate-400">
                  Menjual pemain cadangan yang tidak terpasang di Tim Inti untuk menambah Koin Gacha.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={benchDPreview.count === 0}
                  onClick={() => handleBulkSell('D')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    confirmBulkRank === 'D'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {confirmBulkRank === 'D'
                    ? `Yakin Jual ${benchDPreview.count} Rank D? (+${benchDPreview.coins})`
                    : `Jual Cadangan D (${benchDPreview.count}) · +${benchDPreview.coins} Koin`}
                </button>
                <button
                  disabled={benchDCPreview.count === 0}
                  onClick={() => handleBulkSell('C')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    confirmBulkRank === 'C'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {confirmBulkRank === 'C'
                    ? `Yakin Jual ${benchDCPreview.count} D & C? (+${benchDCPreview.coins})`
                    : `Jual Cadangan D–C (${benchDCPreview.count}) · +${benchDCPreview.coins} Koin`}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ownedList.map((char) => {
                const owned = save.ownedCharacters[char.id]!;
                const meta = RANK_META[char.rank];
                const equippedRole = (['SPIKER', 'SETTER', 'BLOCKER'] as Role[]).find(
                  (r) => save.lineup[r] === char.id
                );
                const isInspected = inspectedChar.id === char.id;
                const sellInfo = getCharacterSellValue(char, owned);

                return (
                  <div
                    key={char.id}
                    onClick={() => {
                      soundEngine.playClick();
                      setInspectedId(char.id);
                      setConfirmSellId(null);
                    }}
                    className={`rounded-xl p-3.5 border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isInspected
                        ? 'bg-slate-800/95 border-sky-400'
                        : 'bg-[#111827] border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AnimePortrait character={char} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono-num font-bold" style={{ color: meta.color }}>
                            {char.rank}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono-num text-slate-300">Lv.{owned.level}</span>
                          {owned.copies > 1 && (
                            <span className="font-mono-num text-[11px] font-bold text-amber-300">
                              x{owned.copies}
                            </span>
                          )}
                        </div>
                        <p className="font-display text-lg font-bold text-white truncate">
                          {char.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {char.preferredRole} ·{' '}
                          {equippedRole
                            ? `Aktif (${equippedRole})`
                            : `Jual +${sellInfo.fullSellCoins} Koin`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        assignToActiveSlot(char.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer ${
                        equippedRole === activeSlot
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                      }`}
                    >
                      {equippedRole === activeSlot ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Terpasang
                        </span>
                      ) : (
                        `Pasang ke ${activeSlot}`
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Character Inspector & Skill Unlocks */}
          <div className="lg:col-span-5 rounded-2xl bg-[#111827] border border-slate-800 p-6 space-y-5">
            <div className="flex items-center gap-4">
              <AnimePortrait
                character={inspectedChar}
                emotion={inspectedChar.rank === 'S+' ? 'awakened' : 'confident'}
                size="md"
              />
              <div>
                <p
                  className="font-mono-num text-xs font-bold uppercase"
                  style={{ color: RANK_META[inspectedChar.rank].color }}
                >
                  {RANK_META[inspectedChar.rank].label} · {inspectedChar.preferredRole}
                </p>
                <h3 className="font-display text-3xl font-extrabold text-white">
                  {inspectedChar.name}
                </h3>
                <p className="text-xs text-slate-400">{inspectedChar.affiliation}</p>
              </div>
            </div>

            {/* Level & EXP Bar */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">
                  Level {inspectedOwned.level}
                </span>
                <span className="font-mono-num text-sky-400">
                  {inspectedOwned.exp} / {neededExp} EXP · {inspectedOwned.matchesPlayed} Match
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all"
                  style={{ width: `${Math.min(100, (inspectedOwned.exp / neededExp) * 100)}%` }}
                />
              </div>
            </div>

            {/* Sell Player / Duplicate Actions */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" />
                  Jual Pemain (Tukar Koin Gacha)
                </span>
                <span className="font-mono-num text-slate-400">
                  Duplikat: {Math.max(0, inspectedOwned.copies - 1)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {inspectedOwned.copies > 1 && (
                  <button
                    onClick={() => handleSellOne(inspectedChar.id, 'duplicate')}
                    className="flex-1 min-w-[140px] py-2 px-3 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold cursor-pointer"
                  >
                    Jual 1 Duplikat (+{inspectedSell.duplicateSellCoins} Koin)
                  </button>
                )}

                {isInspectedEquipped ? (
                  <div className="flex-1 min-w-[160px] py-2 px-3 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 text-xs text-center">
                    Sedang Terpasang di Tim Inti
                  </div>
                ) : totalOwnedCount <= 3 ? (
                  <div className="flex-1 min-w-[160px] py-2 px-3 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 text-xs text-center">
                    Minimal 3 Pemain Tersisa
                  </div>
                ) : confirmSellId === inspectedChar.id ? (
                  <div className="flex-1 flex gap-2">
                    <button
                      onClick={() => handleSellOne(inspectedChar.id, 'full')}
                      className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Konfirmasi Jual (+{inspectedSell.fullSellCoins} Koin)
                    </button>
                    <button
                      onClick={() => setConfirmSellId(null)}
                      className="py-2 px-3 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setConfirmSellId(inspectedChar.id);
                    }}
                    className="flex-1 min-w-[160px] py-2 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Jual Pemain (+{inspectedSell.fullSellCoins} Koin)
                  </button>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Power', val: inspectedStats.power },
                { label: 'Speed', val: inspectedStats.speed },
                { label: 'Teknik', val: inspectedStats.technique },
                { label: 'Defense', val: inspectedStats.defense },
              ].map((st) => (
                <div key={st.label} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-[11px] text-slate-400">{st.label}</p>
                  <p className="font-mono-num text-xl font-bold text-white">{st.val}</p>
                </div>
              ))}
            </div>

            {/* Skills & Ultimate Breakdown */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Skill Utama ({inspectedChar.signatureSkill.actionType})
                </p>
                <p className="font-semibold text-sm text-white mt-0.5">
                  {inspectedChar.signatureSkill.indonesianName} ({inspectedChar.signatureSkill.name})
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  {inspectedChar.signatureSkill.description}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Skill Kedua ({inspectedChar.secondarySkill.actionType})
                </p>
                <p className="font-semibold text-sm text-white mt-0.5">
                  {inspectedChar.secondarySkill.indonesianName} ({inspectedChar.secondarySkill.name})
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  {inspectedChar.secondarySkill.description}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/35">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Ultimate Cutscene ({inspectedChar.ultimate.powerMultiplier.toFixed(2)}x)
                </p>
                <p className="font-semibold text-sm text-white mt-0.5">
                  {inspectedChar.ultimate.indonesianName}
                </p>
                <p className="text-xs text-amber-100/80 mt-1">
                  {inspectedChar.ultimate.description}
                </p>
              </div>
            </div>

            {/* Level Unlock Progression */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Skill Tambahan Naik Level
              </p>
              {[
                { lv: 3, text: inspectedChar.levelUnlocks.lv3 },
                { lv: 5, text: inspectedChar.levelUnlocks.lv5 },
                { lv: 8, text: inspectedChar.levelUnlocks.lv8 },
              ].map((u) => {
                const unlocked = inspectedOwned.level >= u.lv;
                return (
                  <div
                    key={u.lv}
                    className={`flex items-center justify-between text-xs py-1.5 px-3 rounded-lg border ${
                      unlocked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span>{u.text}</span>
                    <span className="font-mono-num font-bold">
                      {unlocked ? 'AKTIF' : `Lv.${u.lv}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
