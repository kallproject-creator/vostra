import { CHARACTER_MAP, GACHA_POOL, getExpForNextLevel } from '../data/characters';
import { CharacterDef, OwnedCharacter, Rank, SaveData } from '../types/game';

const STORAGE_KEY = 'skyward_spike_save_v1';

export const DEFAULT_SAVE: SaveData = {
  version: 1,
  coins: 250, // Starting coins so players can try gacha early or save up
  ownedCharacters: {
    raka_pratama: {
      charId: 'raka_pratama',
      level: 1,
      exp: 0,
      copies: 1,
      matchesPlayed: 0,
    },
    bagas_setiawan: {
      charId: 'bagas_setiawan',
      level: 1,
      exp: 0,
      copies: 1,
      matchesPlayed: 0,
    },
    dimas_perkasa: {
      charId: 'dimas_perkasa',
      level: 1,
      exp: 0,
      copies: 1,
      matchesPlayed: 0,
    },
  },
  lineup: {
    SPIKER: 'raka_pratama',
    SETTER: 'bagas_setiawan',
    BLOCKER: 'dimas_perkasa',
  },
  clearedEpisodes: [],
  highestUnlockedChapter: 1,
  highestUnlockedEpisode: 1,
  rakaAwakened: false,
  totalMatchesWon: 0,
  totalMatchesPlayed: 0,
  gachaPullsCount: 0,
  muted: false,
};

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const mergedOwned: Record<string, OwnedCharacter> = {};
    const rawOwned = {
      ...DEFAULT_SAVE.ownedCharacters,
      ...(parsed.ownedCharacters && typeof parsed.ownedCharacters === 'object'
        ? parsed.ownedCharacters
        : {}),
    };

    for (const [id, entry] of Object.entries(rawOwned)) {
      if (!CHARACTER_MAP[id] || !entry || typeof entry !== 'object') continue;
      mergedOwned[id] = {
        charId: id,
        level: Math.max(1, Math.min(50, Math.floor(Number(entry.level) || 1))),
        exp: Math.max(0, Math.floor(Number(entry.exp) || 0)),
        copies: Math.max(1, Math.floor(Number(entry.copies) || 1)),
        matchesPlayed: Math.max(0, Math.floor(Number(entry.matchesPlayed) || 0)),
      };
    }

    // Guarantee at least the 3 starter characters exist if save was severely corrupted
    for (const starterId of ['raka_pratama', 'bagas_setiawan', 'dimas_perkasa'] as const) {
      if (Object.keys(mergedOwned).length >= 3) break;
      if (!mergedOwned[starterId]) {
        mergedOwned[starterId] = structuredClone(DEFAULT_SAVE.ownedCharacters[starterId]);
      }
    }

    const ownedIds = Object.keys(mergedOwned);
    const rawLineup = parsed.lineup && typeof parsed.lineup === 'object' ? parsed.lineup : DEFAULT_SAVE.lineup;
    const pickValid = (candidate: unknown, fallbackIdx: number) =>
      typeof candidate === 'string' && mergedOwned[candidate]
        ? candidate
        : ownedIds[fallbackIdx % ownedIds.length] || 'raka_pratama';

    return {
      ...structuredClone(DEFAULT_SAVE),
      ...parsed,
      coins: Math.max(0, Math.floor(Number(parsed.coins ?? DEFAULT_SAVE.coins) || 0)),
      highestUnlockedChapter: Math.max(1, Math.min(10, Math.floor(Number(parsed.highestUnlockedChapter) || 1))),
      highestUnlockedEpisode: Math.max(1, Math.min(12, Math.floor(Number(parsed.highestUnlockedEpisode) || 1))),
      totalMatchesWon: Math.max(0, Math.floor(Number(parsed.totalMatchesWon) || 0)),
      totalMatchesPlayed: Math.max(0, Math.floor(Number(parsed.totalMatchesPlayed) || 0)),
      gachaPullsCount: Math.max(0, Math.floor(Number(parsed.gachaPullsCount) || 0)),
      ownedCharacters: mergedOwned,
      lineup: {
        SPIKER: pickValid(rawLineup.SPIKER, 0),
        SETTER: pickValid(rawLineup.SETTER, 1),
        BLOCKER: pickValid(rawLineup.BLOCKER, 2),
      },
      clearedEpisodes: Array.isArray(parsed.clearedEpisodes)
        ? parsed.clearedEpisodes.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetSaveData(): SaveData {
  const fresh = structuredClone(DEFAULT_SAVE);
  persistSaveData(fresh);
  return fresh;
}

export function addExpToOwned(
  owned: Record<string, OwnedCharacter>,
  charIds: string[],
  expGain: number
): {
  updated: Record<string, OwnedCharacter>;
  leveledUp: { charId: string; from: number; to: number }[];
} {
  const updated = { ...owned };
  const leveledUp: { charId: string; from: number; to: number }[] = [];

  for (const id of charIds) {
    const entry = updated[id];
    if (!entry) continue;
    const prevLevel = entry.level;
    let level = entry.level;
    let exp = entry.exp + expGain;
    let needed = getExpForNextLevel(level);
    while (exp >= needed && level < 50) {
      exp -= needed;
      level += 1;
      needed = getExpForNextLevel(level);
    }
    updated[id] = {
      ...entry,
      level,
      exp,
      matchesPlayed: entry.matchesPlayed + 1,
    };
    if (level > prevLevel) {
      leveledUp.push({ charId: id, from: prevLevel, to: level });
    }
  }

  return { updated, leveledUp };
}

/**
 * Exact Gacha Probability Engine:
 * - Rank S+: 0.0000001 (1 in 10,000,000) — strictly 3 characters
 * - Rank S : 0.0149999 (~1.5%)
 * - Rank A : 0.085 (8.5%)
 * - Rank B : 0.20 (20%)
 * - Rank C : 0.35 (35%)
 * - Rank D : 0.35 (35%)
 */
export function rollSingleGacha(): CharacterDef {
  const r = Math.random();
  let targetRank: Rank;

  if (r < 0.0000001) {
    targetRank = 'S+';
  } else if (r < 0.015) {
    targetRank = 'S';
  } else if (r < 0.1) {
    targetRank = 'A';
  } else if (r < 0.3) {
    targetRank = 'B';
  } else if (r < 0.65) {
    targetRank = 'C';
  } else {
    targetRank = 'D';
  }

  const candidates = GACHA_POOL.filter((c) => c.rank === targetRank);
  if (candidates.length === 0) {
    return GACHA_POOL[0];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function applyGachaPulls(
  save: SaveData,
  pulled: CharacterDef[]
): {
  nextOwned: Record<string, OwnedCharacter>;
  results: { char: CharacterDef; isNew: boolean; bonusExp: number; leveledUpTo?: number }[];
} {
  const nextOwned = { ...save.ownedCharacters };
  const results: { char: CharacterDef; isNew: boolean; bonusExp: number; leveledUpTo?: number }[] = [];

  for (const char of pulled) {
    const existing = nextOwned[char.id];
    if (!existing) {
      nextOwned[char.id] = {
        charId: char.id,
        level: 1,
        exp: 0,
        copies: 1,
        matchesPlayed: 0,
      };
      results.push({ char, isNew: true, bonusExp: 0 });
    } else {
      const rankBonus: Record<Rank, number> = {
        D: 60,
        C: 90,
        B: 140,
        A: 220,
        S: 380,
        'S+': 900,
      };
      const bonusExp = rankBonus[char.rank];
      const { updated, leveledUp } = addExpToOwned(nextOwned, [char.id], bonusExp);
      nextOwned[char.id] = {
        ...updated[char.id],
        copies: existing.copies + 1,
        matchesPlayed: existing.matchesPlayed, // don't increment matchesPlayed on dupe
      };
      results.push({
        char,
        isNew: false,
        bonusExp,
        leveledUpTo: leveledUp[0]?.to,
      });
    }
  }

  // Ensure every lineup slot points to a valid owned character
  for (const role of ['SPIKER', 'SETTER', 'BLOCKER'] as const) {
    if (!CHARACTER_MAP[save.lineup[role]]) {
      save.lineup[role] = 'raka_pratama';
    }
  }

  return { nextOwned, results };
}

const BASE_SELL_BY_RANK: Record<Rank, number> = {
  D: 35,
  C: 60,
  B: 110,
  A: 220,
  S: 480,
  'S+': 1500,
};

const LEVEL_SELL_BONUS_BY_RANK: Record<Rank, number> = {
  D: 5,
  C: 8,
  B: 15,
  A: 25,
  S: 50,
  'S+': 150,
};

const DUPLICATE_SELL_BY_RANK: Record<Rank, number> = {
  D: 15,
  C: 25,
  B: 45,
  A: 90,
  S: 180,
  'S+': 500,
};

export function getCharacterSellValue(
  char: CharacterDef,
  owned: OwnedCharacter
): { fullSellCoins: number; duplicateSellCoins: number } {
  const duplicateSellCoins = DUPLICATE_SELL_BY_RANK[char.rank];
  const levelBonus = Math.max(0, owned.level - 1) * LEVEL_SELL_BONUS_BY_RANK[char.rank];
  const extraCopiesBonus = Math.max(0, owned.copies - 1) * duplicateSellCoins;
  const fullSellCoins = BASE_SELL_BY_RANK[char.rank] + levelBonus + extraCopiesBonus;
  return { fullSellCoins, duplicateSellCoins };
}

export function sellCharacter(
  save: SaveData,
  charId: string,
  mode: 'full' | 'duplicate'
): { nextSave: SaveData; coinsEarned: number; error?: string } {
  const owned = save.ownedCharacters[charId];
  const char = CHARACTER_MAP[charId];
  if (!owned || !char) {
    return { nextSave: save, coinsEarned: 0, error: 'Pemain tidak ditemukan di inventori.' };
  }

  const { fullSellCoins, duplicateSellCoins } = getCharacterSellValue(char, owned);

  if (mode === 'duplicate') {
    if (owned.copies <= 1) {
      return { nextSave: save, coinsEarned: 0, error: 'Tidak ada duplikat tersisa untuk dijual.' };
    }
    const nextOwned = {
      ...save.ownedCharacters,
      [charId]: {
        ...owned,
        copies: owned.copies - 1,
      },
    };
    return {
      nextSave: {
        ...save,
        coins: save.coins + duplicateSellCoins,
        ownedCharacters: nextOwned,
      },
      coinsEarned: duplicateSellCoins,
    };
  }

  const isInLineup =
    save.lineup.SPIKER === charId ||
    save.lineup.SETTER === charId ||
    save.lineup.BLOCKER === charId;
  if (isInLineup) {
    return {
      nextSave: save,
      coinsEarned: 0,
      error: 'Pemain sedang terpasang di Tim Inti! Ganti dulu posisinya sebelum dijual.',
    };
  }

  if (Object.keys(save.ownedCharacters).length <= 3) {
    return {
      nextSave: save,
      coinsEarned: 0,
      error: 'Minimal harus menyisakan 3 pemain di inventori untuk bertanding.',
    };
  }

  const nextOwned = { ...save.ownedCharacters };
  delete nextOwned[charId];

  return {
    nextSave: {
      ...save,
      coins: save.coins + fullSellCoins,
      ownedCharacters: nextOwned,
    },
    coinsEarned: fullSellCoins,
  };
}

export function sellBulkBenchByMaxRank(
  save: SaveData,
  maxRank: 'D' | 'C'
): { nextSave: SaveData; soldCount: number; coinsEarned: number } {
  const equipped = new Set([save.lineup.SPIKER, save.lineup.SETTER, save.lineup.BLOCKER]);
  const allowedRanks = new Set<Rank>(maxRank === 'D' ? ['D'] : ['D', 'C']);

  const nextOwned = { ...save.ownedCharacters };
  let totalOwned = Object.keys(nextOwned).length;
  let soldCount = 0;
  let coinsEarned = 0;

  for (const [charId, owned] of Object.entries(save.ownedCharacters)) {
    if (totalOwned <= 3) break;
    if (equipped.has(charId)) continue;
    const char = CHARACTER_MAP[charId];
    if (!char || !allowedRanks.has(char.rank)) continue;

    const { fullSellCoins } = getCharacterSellValue(char, owned);
    delete nextOwned[charId];
    totalOwned -= 1;
    soldCount += 1;
    coinsEarned += fullSellCoins;
  }

  if (soldCount === 0) {
    return { nextSave: save, soldCount: 0, coinsEarned: 0 };
  }

  return {
    nextSave: {
      ...save,
      coins: save.coins + coinsEarned,
      ownedCharacters: nextOwned,
    },
    soldCount,
    coinsEarned,
  };
}

