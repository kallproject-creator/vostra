import React, { useState } from 'react';
import { ArrowLeft, Coins, Sparkles, Star } from 'lucide-react';
import { CHARACTERS, RANK_META, RANK_ORDER } from '../data/characters';
import { CharacterDef, Rank, SaveData } from '../types/game';
import { soundEngine } from '../utils/audio';
import { AnimePortrait } from './AnimePortrait';

interface GachaViewProps {
  save: SaveData;
  onPull: (count: 1 | 5) => {
    char: CharacterDef;
    isNew: boolean;
    bonusExp: number;
    leveledUpTo?: number;
  }[];
  onBack: () => void;
}

export const GachaView: React.FC<GachaViewProps> = ({ save, onPull, onBack }) => {
  const [revealing, setRevealing] = useState(false);
  const [pullResults, setPullResults] = useState<
    { char: CharacterDef; isNew: boolean; bonusExp: number; leveledUpTo?: number }[] | null
  >(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState<Rank | 'ALL'>('ALL');

  const sPlusChars = CHARACTERS.filter((c) => c.rank === 'S+');
  const gachaCatalog = CHARACTERS.filter((c) => c.isGachaPool)
    .filter((c) => catalogFilter === 'ALL' || c.rank === catalogFilter)
    .sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);

  const triggerPull = (count: 1 | 5) => {
    const cost = count === 1 ? 100 : 450;
    if (save.coins < cost) {
      setErrorMsg(`Koin tidak cukup! Butuh ${cost} Koin (Mainkan match untuk dapat +100 Koin).`);
      return;
    }
    setErrorMsg(null);
    soundEngine.playUltimateCutscene();
    setRevealing(true);

    const results = onPull(count);
    if (!results || results.length === 0) {
      setRevealing(false);
      setErrorMsg('Gagal memproses rekrutmen. Silakan coba lagi.');
      return;
    }
    const highest = [...results].sort(
      (a, b) => RANK_ORDER[b.char.rank] - RANK_ORDER[a.char.rank]
    )[0];

    window.setTimeout(() => {
      setRevealing(false);
      setPullResults(results);
      if (highest) {
        soundEngine.playGachaReveal(highest.char.rank);
      }
    }, 850);
  };

  return (
    <div className="min-h-screen bg-[#090E1A] text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
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
                Rekrutmen Atlet · Rank D hingga S+
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white">
                Gacha Rekrutmen Pemain
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700">
            <Coins className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-[11px] text-slate-400">Saldo Koin</p>
              <p className="font-mono-num text-xl font-bold text-amber-400">{save.coins}</p>
            </div>
          </div>
        </div>

        {/* Main Showcase Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 rounded-2xl bg-[#111827] border border-slate-800 p-6 flex flex-col justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-36 h-36 rounded-2xl overflow-hidden border border-amber-400/40 shrink-0 bg-slate-950">
                <img
                  src="/src/assets/images/gacha_emblem_crest_1795623800083.jpg"
                  alt="Emblem Gacha Legenda"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-400">
                  3 Legenda Final Boss S+ Tersedia
                </p>
                <h2 className="font-display text-3xl font-extrabold text-white leading-tight">
                  Rekrut Pemilik Skill Elemen, Senjata, Kosmik & Mitologi
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Gunakan koin hasil pertandingan untuk merekrut pemain baru. Pemain duplikat otomatis memberi bonus EXP besar untuk menaikkan level dan membuka efek skill lanjutan.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-sm text-rose-200">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                disabled={revealing}
                onClick={() => triggerPull(1)}
                className="py-4 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  1x Rekrutmen
                </span>
                <span className="font-mono-num text-amber-400">100 Koin</span>
              </button>

              <button
                disabled={revealing}
                onClick={() => triggerPull(5)}
                className="py-4 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-extrabold flex items-center justify-between shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  5x Rekrutmen (Hemat 50)
                </span>
                <span className="font-mono-num">450 Koin</span>
              </button>
            </div>
          </div>

          {/* Drop Rate Table (Exact 0.0000001 for S+) */}
          <div className="lg:col-span-5 rounded-2xl bg-[#111827] border border-slate-800 p-6 space-y-4">
            <div>
              <h3 className="font-display text-xl font-bold text-white">
                Tabel Peluang Gacha Resmi
              </h3>
              <p className="text-xs text-slate-400">
                Total rekrutmen dilakukan: <span className="font-mono-num text-slate-200">{save.gachaPullsCount}x</span>
              </p>
            </div>

            <div className="space-y-2">
              {(['S+', 'S', 'A', 'B', 'C', 'D'] as Rank[]).map((rank) => {
                const meta = RANK_META[rank];
                const count = CHARACTERS.filter((c) => c.rank === rank && c.isGachaPool).length;
                return (
                  <div
                    key={rank}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono-num font-bold w-8" style={{ color: meta.color }}>
                        {rank}
                      </span>
                      <span className="text-slate-300">{count} Pemain</span>
                    </div>
                    <span className="font-mono-num text-slate-200">
                      {rank === 'S+' ? '0.0000001 (0.00001%)' : meta.rateText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Showcase of the Strictly 3 S+ Legends */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl font-bold text-white">
              Tiga Legenda Rank S+ (Peluang 0.0000001)
            </h3>
            <span className="text-xs text-rose-400 font-semibold">
              Hanya 3 Pemain S+ di Seluruh Game
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sPlusChars.map((ch) => {
              const owned = Boolean(save.ownedCharacters[ch.id]);
              return (
                <div
                  key={ch.id}
                  className="rounded-xl p-4 bg-[#160C18] border border-rose-500/40 flex items-center gap-4"
                >
                  <AnimePortrait character={ch} emotion="awakened" size="md" />
                  <div className="min-w-0">
                    <p className="font-mono-num text-xs font-bold text-rose-400">
                      RANK S+ · {owned ? 'DIMILIKI' : 'TERSEGEL'}
                    </p>
                    <h4 className="font-display text-xl font-bold text-white truncate">
                      {ch.name}
                    </h4>
                    <p className="text-xs text-amber-300 truncate">{ch.ultimate.indonesianName}</p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {ch.signatureSkill.indonesianName} · {ch.preferredRole}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full Gacha Pool Catalog (Rank D to S+) */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl font-bold text-white">
                Katalog Pemain Rekrutmen ({CHARACTERS.filter((c) => c.isGachaPool).length} Pemain)
              </h3>
              <p className="text-xs text-slate-400">
                Lihat seluruh daftar pemain Rank D hingga S+ beserta skill elemen, senjata, kosmik, beast, dan psikisnya.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
              {(['ALL', 'D', 'C', 'B', 'A', 'S', 'S+'] as const).map((r) => {
                const cnt =
                  r === 'ALL'
                    ? CHARACTERS.filter((c) => c.isGachaPool).length
                    : CHARACTERS.filter((c) => c.isGachaPool && c.rank === r).length;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      soundEngine.playClick();
                      setCatalogFilter(r);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      catalogFilter === r
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {r === 'ALL' ? `Semua (${cnt})` : `${r} (${cnt})`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gachaCatalog.map((ch) => {
              const meta = RANK_META[ch.rank];
              const owned = save.ownedCharacters[ch.id];
              return (
                <div
                  key={ch.id}
                  className={`rounded-xl p-3.5 bg-[#111827] border ${meta.border} flex items-center gap-3.5`}
                >
                  <AnimePortrait
                    character={ch}
                    emotion={ch.rank === 'S+' || ch.rank === 'S' ? 'awakened' : 'confident'}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono-num font-bold" style={{ color: meta.color }}>
                        {meta.label} · {ch.preferredRole}
                      </span>
                      <span
                        className={`font-semibold ${
                          owned ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {owned ? `Lv.${owned.level}` : 'Belum'}
                      </span>
                    </div>
                    <h4 className="font-display text-lg font-bold text-white truncate">
                      {ch.name}
                    </h4>
                    <p className="text-[11px] text-sky-300 truncate">
                      {ch.signatureSkill.indonesianName} · {ch.secondarySkill.indonesianName}
                    </p>
                    <p className="text-[11px] text-amber-300 truncate">
                      Ult: {ch.ultimate.indonesianName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Capsule Spinning Transition */}
      {revealing && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center gap-5">
          <div className="w-32 h-32 rounded-full border-4 border-amber-400 border-t-sky-400 animate-spin flex items-center justify-center">
            <img
              src="/src/assets/images/gacha_emblem_crest_1795623800083.jpg"
              alt="Membuka Rekrutmen"
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-full object-cover"
            />
          </div>
          <p className="font-display text-3xl font-extrabold tracking-widest text-amber-300 uppercase">
            Memanggil Pemain...
          </p>
        </div>
      )}

      {/* Gacha Reveal Results Modal */}
      {pullResults && (
        <div className="fixed inset-0 z-50 bg-slate-950/92 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-[#111827] border border-slate-700 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-400 uppercase tracking-widest font-bold">
                  Hasil Rekrutmen
                </p>
                <h3 className="font-display text-3xl font-extrabold text-white">
                  {pullResults.length === 1 ? 'Pemain Ditemukan!' : '5 Pemain Bergabung!'}
                </h3>
              </div>
              <button
                onClick={() => setPullResults(null)}
                className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div
              className={`grid gap-4 ${
                pullResults.length === 1
                  ? 'grid-cols-1 max-w-sm mx-auto'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {pullResults.map((res, idx) => {
                const meta = RANK_META[res.char.rank];
                return (
                  <div
                    key={`${res.char.id}-${idx}`}
                    className={`rounded-xl p-4 bg-slate-900/95 border ${meta.border} flex flex-col items-center text-center gap-2`}
                    style={{ boxShadow: `0 0 28px ${meta.bgGlow}` }}
                  >
                    <div className="w-full flex items-center justify-between text-xs">
                      <span className="font-mono-num font-bold" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                      <span className="font-semibold text-sky-300">
                        {res.isNew ? 'BARU!' : `+${res.bonusExp} EXP`}
                      </span>
                    </div>
                    <AnimePortrait
                      character={res.char}
                      emotion={res.char.rank === 'S+' || res.char.rank === 'S' ? 'awakened' : 'confident'}
                      size="md"
                    />
                    <div>
                      <h4 className="font-display text-xl font-bold text-white">{res.char.name}</h4>
                      <p className="text-xs text-slate-400">{res.char.preferredRole} · {res.char.affiliation}</p>
                      <p className="mt-1 text-xs text-amber-300 font-medium">
                        Ult: {res.char.ultimate.indonesianName}
                      </p>
                      {res.leveledUpTo && (
                        <p className="mt-1 text-xs text-emerald-400 font-bold">
                          Naik ke Level {res.leveledUpTo}!
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
