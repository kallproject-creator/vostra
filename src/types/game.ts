export type Rank = 'D' | 'C' | 'B' | 'A' | 'S' | 'S+';

export type Role = 'SPIKER' | 'SETTER' | 'BLOCKER';

export type SkillCategory = 'ELEMENT' | 'WEAPON' | 'COSMIC' | 'BEAST' | 'PSYCHIC';

export type CutsceneTheme =
  | 'dragon'
  | 'fire'
  | 'water'
  | 'lightning'
  | 'wind'
  | 'earth'
  | 'railgun'
  | 'katana'
  | 'sniper'
  | 'guillotine'
  | 'meteor'
  | 'blackhole'
  | 'chronos'
  | 'viper'
  | 'eagle'
  | 'cerberus'
  | 'pegasus'
  | 'kraken'
  | 'phoenix'
  | 'king'
  | 'puppeteer'
  | 'phantom'
  | 'checkmate'
  | 'genesis';

export type BasicAction = 'RECEIVE' | 'SET' | 'SPIKE' | 'BLOCK' | 'ULTIMATE';

export type DialogueEmotion =
  | 'neutral'
  | 'confident'
  | 'shocked'
  | 'angry'
  | 'charging'
  | 'laughing'
  | 'determined'
  | 'whisper'
  | 'injured'
  | 'awakened';

export type HairStyle =
  | 'spiky'
  | 'swept'
  | 'undercut'
  | 'long'
  | 'ponytail'
  | 'bob'
  | 'wild'
  | 'crown'
  | 'hood'
  | 'twin';

export interface SkillSpec {
  name: string;
  indonesianName: string;
  category: SkillCategory;
  description: string;
  actionType: Exclude<BasicAction, 'ULTIMATE'>;
  powerBonus: number;
}

export interface UltimateSpec {
  name: string;
  indonesianName: string;
  category: SkillCategory;
  theme: CutsceneTheme;
  description: string;
  callout: string;
  powerMultiplier: number;
}

export interface CharacterVisual {
  hairColor: string;
  hairHighlight: string;
  skinTone: string;
  eyeColor: string;
  jerseyColor: string;
  jerseyAccent: string;
  auraColor: string;
  hairStyle: HairStyle;
  accessory?: 'headband' | 'visor' | 'scar' | 'glasses' | 'crown' | 'mask' | 'none';
  jerseyNumber: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  affiliation: string;
  rank: Rank;
  preferredRole: Role;
  baseStats: {
    power: number;
    speed: number;
    technique: number;
    defense: number;
  };
  signatureSkill: SkillSpec;
  secondarySkill: SkillSpec;
  ultimate: UltimateSpec;
  levelUnlocks: {
    lv3: string;
    lv5: string;
    lv8: string;
  };
  visual: CharacterVisual;
  isGachaPool: boolean;
  isBossExclusive?: boolean;
  bio: string;
}

export interface OwnedCharacter {
  charId: string;
  level: number;
  exp: number;
  copies: number;
  matchesPlayed: number;
}

export interface DialogueLine {
  speakerId: string;
  speakerName: string;
  side: 'left' | 'right';
  emotion: DialogueEmotion;
  text: string;
  actionTag?: string;
}

export interface OpponentLineup {
  teamName: string;
  spikerId: string;
  setterId: string;
  blockerId: string;
  aiLevel: number; // 1 to 120 scaling
  isBoss: boolean;
  bossUltimateChargeRate: number; // 1.0 normal, up to 2.2 for bosses
  bossPowerMultiplier: number;
}

export interface StoryEpisode {
  id: string; // e.g. "c1-e1"
  chapterNumber: number;
  episodeNumber: number;
  title: string;
  location: string;
  summary: string;
  dialogues: DialogueLine[];
  opponent: OpponentLineup;
  rewardCoins: number;
  rewardExp: number;
  unlocksAwakening?: boolean;
}

export interface StoryChapter {
  chapterNumber: number;
  title: string;
  era: string;
  description: string;
  accentColor: string;
  episodes: StoryEpisode[];
}

export interface TeamLineup {
  SPIKER: string;
  SETTER: string;
  BLOCKER: string;
}

export interface SaveData {
  version: number;
  coins: number;
  ownedCharacters: Record<string, OwnedCharacter>;
  lineup: TeamLineup;
  clearedEpisodes: string[];
  highestUnlockedChapter: number;
  highestUnlockedEpisode: number;
  rakaAwakened: boolean;
  totalMatchesWon: number;
  totalMatchesPlayed: number;
  gachaPullsCount: number;
  muted: boolean;
}

export type ScreenMode =
  | 'TITLE'
  | 'CHAPTER_MAP'
  | 'STORY'
  | 'MATCH'
  | 'GACHA'
  | 'INVENTORY'
  | 'MULTIPLAYER'
  | 'MULTIPLAYER_MATCH';

export interface MultiplayerRosterSlot {
  charId: string;
  level: number;
}

export type MultiplayerRoster = Record<Role, MultiplayerRosterSlot>;

export interface RoomMemberInfo {
  clientId: string;
  playerName: string;
  side: 'host' | 'guest';
  roster: MultiplayerRoster;
  ready: boolean;
  connected: boolean;
}

export interface MultiplayerRoomState {
  code: string;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  host: RoomMemberInfo;
  guest: RoomMemberInfo | null;
  winnerSide?: 'host' | 'guest';
}

