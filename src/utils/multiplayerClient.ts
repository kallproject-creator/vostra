import { getCharacterById, getEffectiveStats } from '../data/characters';
import {
  BasicAction,
  MultiplayerRoomState,
  MultiplayerRoster,
  Role,
  SaveData,
} from '../types/game';

export type ServerSide = 'host' | 'guest';

export interface MatchEventPayload {
  type: 'match_event';
  event:
    | 'serve_toss'
    | 'ball_launch'
    | 'prompt_turn'
    | 'ultimate_cutscene'
    | 'point_scored'
    | 'match_over';
  servingSide?: ServerSide;
  pScore?: number;
  oScore?: number;
  pEnergy?: number;
  oEnergy?: number;
  actorSide?: ServerSide;
  actorRole?: Role;
  pose?: 'PASS_UNDER' | 'SET' | 'SPIKE' | 'BLOCK' | 'SERVE';
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
  flightDur?: number;
  magnusDrop?: number;
  shotColor?: string;
  isUltimateShot?: boolean;
  targetSide?: ServerSide;
  targetRole?: Role;
  nextAction?: Exclude<BasicAction, 'ULTIMATE'>;
  incomingPower?: number;
  isUltIncoming?: boolean;
  netShake?: number;
  shake?: number;
  callout?: { text: string; subtext: string; side: ServerSide; color: string };
  turnSide?: ServerSide;
  role?: Role;
  recommended?: Exclude<BasicAction, 'ULTIMATE'>;
  timeLimit?: number;
  charId?: string;
  pendingAttackPower?: number;
  scoringSide?: ServerSide;
  winnerSide?: ServerSide;
  reason?: string;
  burstX?: number;
  burstY?: number;
  burstColor?: string;
}

export type MpListener = (msg: Record<string, unknown>) => void;

function getOrCreateClientId(): string {
  try {
    const existing = window.sessionStorage.getItem('skyward_mp_client_id');
    if (existing) return existing;
    const created = `cli_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    window.sessionStorage.setItem('skyward_mp_client_id', created);
    return created;
  } catch {
    return `cli_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function buildRosterAndStats(save: SaveData): {
  roster: MultiplayerRoster;
  teamStats: Record<Role, unknown>;
} {
  const roles: Role[] = ['SPIKER', 'SETTER', 'BLOCKER'];
  const roster = {} as MultiplayerRoster;
  const teamStats = {} as Record<Role, unknown>;

  for (const r of roles) {
    const charId = save.lineup[r];
    const char = getCharacterById(charId);
    const level = save.ownedCharacters[charId]?.level || 1;
    const stats = getEffectiveStats(char, level);
    roster[r] = { charId: char.id, level };
    teamStats[r] = {
      name: char.name,
      power: stats.power,
      speed: stats.speed,
      technique: stats.technique,
      defense: stats.defense,
      auraColor: char.visual.auraColor,
      sigAction: char.signatureSkill.actionType,
      sigName: char.signatureSkill.indonesianName,
      sigBonus: char.signatureSkill.powerBonus,
      secAction: char.secondarySkill.actionType,
      secName: char.secondarySkill.indonesianName,
      secBonus: char.secondarySkill.powerBonus,
      ultName: char.ultimate.indonesianName,
      ultMult: char.ultimate.powerMultiplier,
    };
  }

  return { roster, teamStats };
}

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<MpListener>();
  public clientId: string = getOrCreateClientId();
  public mySide: ServerSide | null = null;
  public currentRoom: MultiplayerRoomState | null = null;

  public subscribe(fn: MpListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(msg: Record<string, unknown>) {
    for (const fn of this.listeners) {
      fn(msg);
    }
  }

  public ensureConnected(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      if (this.ws) {
        try {
          this.ws.close();
        } catch {
          // ignore
        }
      }

      if (window.location.protocol === 'file:' || !window.location.host) {
        reject(new Error('Mode Multiplayer online hanya aktif saat dibuka lewat server online.'));
        return;
      }

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/ws`;
      const socket = new WebSocket(url);
      this.ws = socket;

      const timeout = window.setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          reject(new Error('Koneksi ke server multiplayer timeout.'));
        }
      }, 6000);

      socket.onopen = () => {
        window.clearTimeout(timeout);
        this.emit({ type: 'ws_open' });
        resolve();
      };

      socket.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Gagal terhubung ke server multiplayer.'));
      };

      socket.onclose = () => {
        this.emit({ type: 'ws_closed' });
      };

      socket.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data as string) as Record<string, unknown>;
          if (data.type === 'room_joined') {
            this.mySide = (data.side as ServerSide) || null;
            this.currentRoom = (data.room as MultiplayerRoomState) || null;
          } else if (data.type === 'room_state' || data.type === 'match_started') {
            if (data.room) {
              this.currentRoom = data.room as MultiplayerRoomState;
            }
          } else if (data.type === 'room_closed') {
            this.currentRoom = null;
            this.mySide = null;
          }
          this.emit(data);
        } catch {
          // ignore malformed payload
        }
      };
    });
  }

  private send(payload: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public async createRoom(playerName: string, save: SaveData): Promise<void> {
    await this.ensureConnected();
    const { roster, teamStats } = buildRosterAndStats(save);
    this.send({
      type: 'create_room',
      clientId: this.clientId,
      playerName,
      roster,
      teamStats,
    });
  }

  public async joinRoom(code: string, playerName: string, save: SaveData): Promise<void> {
    await this.ensureConnected();
    const { roster, teamStats } = buildRosterAndStats(save);
    this.send({
      type: 'join_room',
      code: code.trim().toUpperCase(),
      clientId: this.clientId,
      playerName,
      roster,
      teamStats,
    });
  }

  public updateSetup(opts: { playerName?: string; ready?: boolean; save?: SaveData }) {
    const payload: Record<string, unknown> = { type: 'update_setup' };
    if (opts.playerName !== undefined) payload.playerName = opts.playerName;
    if (opts.ready !== undefined) payload.ready = opts.ready;
    if (opts.save) {
      const { roster, teamStats } = buildRosterAndStats(opts.save);
      payload.roster = roster;
      payload.teamStats = teamStats;
    }
    this.send(payload);
  }

  public startMatch() {
    this.send({ type: 'start_match' });
  }

  public sendAction(action: BasicAction) {
    this.send({ type: 'player_action', action });
  }

  public requestRematch() {
    this.send({ type: 'rematch_request' });
  }

  public leaveRoom() {
    this.send({ type: 'leave_room' });
    this.currentRoom = null;
    this.mySide = null;
  }
}

export const mpClient = new MultiplayerClient();
