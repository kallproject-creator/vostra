import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  LogIn,
  Play,
  PlusCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { getCharacterById } from '../data/characters';
import { MultiplayerRoomState, Role, SaveData } from '../types/game';
import { soundEngine } from '../utils/audio';
import { mpClient, ServerSide } from '../utils/multiplayerClient';
import { AnimePortrait } from './AnimePortrait';

interface MultiplayerLobbyProps {
  save: SaveData;
  onMatchStarted: (room: MultiplayerRoomState, mySide: ServerSide) => void;
  onBack: () => void;
}

const ROLES: Role[] = ['SPIKER', 'SETTER', 'BLOCKER'];

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  save,
  onMatchStarted,
  onBack,
}) => {
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return window.localStorage.getItem('skyward_mp_name') || 'Kapten Voli';
    } catch {
      return 'Kapten Voli';
    }
  });
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<MultiplayerRoomState | null>(mpClient.currentRoom);
  const [mySide, setMySide] = useState<ServerSide | null>(mpClient.mySide);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = mpClient.subscribe((msg) => {
      if (msg.type === 'room_joined') {
        setBusy(false);
        setErrorMsg(null);
        setMySide((msg.side as ServerSide) || null);
        setRoom((msg.room as MultiplayerRoomState) || null);
      } else if (msg.type === 'room_state') {
        setRoom((msg.room as MultiplayerRoomState) || null);
      } else if (msg.type === 'room_error') {
        setBusy(false);
        setErrorMsg(typeof msg.message === 'string' ? msg.message : 'Terjadi kesalahan room.');
      } else if (msg.type === 'room_closed') {
        setBusy(false);
        setRoom(null);
        setMySide(null);
        setErrorMsg(typeof msg.reason === 'string' ? msg.reason : 'Room ditutup oleh Host.');
      } else if (msg.type === 'match_started') {
        const startedRoom = msg.room as MultiplayerRoomState;
        const side = mpClient.mySide || mySide;
        if (startedRoom && side) {
          onMatchStarted(startedRoom, side);
        }
      }
    });
    return unsub;
  }, [mySide, onMatchStarted]);

  const persistName = (name: string) => {
    setPlayerName(name);
    try {
      window.localStorage.setItem('skyward_mp_name', name);
    } catch {
      // ignore
    }
  };

  const handleCreateRoom = async () => {
    soundEngine.playClick();
    setErrorMsg(null);
    setBusy(true);
    try {
      await mpClient.createRoom(playerName.trim() || 'Host Voli', save);
    } catch (err) {
      setBusy(false);
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat room.');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = joinCode.trim().toUpperCase();
    if (cleaned.length < 4) {
      setErrorMsg('Masukkan kode room yang valid (contoh: V7K92P).');
      return;
    }
    soundEngine.playClick();
    setErrorMsg(null);
    setBusy(true);
    try {
      await mpClient.joinRoom(cleaned, playerName.trim() || 'Penantang', save);
    } catch (err) {
      setBusy(false);
      setErrorMsg(err instanceof Error ? err.message : 'Gagal masuk ke room.');
    }
  };

  const handleCopyCode = async () => {
    if (!room) return;
    soundEngine.playClick();
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleToggleReady = () => {
    if (!room || mySide !== 'guest' || !room.guest) return;
    soundEngine.playClick();
    mpClient.updateSetup({ ready: !room.guest.ready, save });
  };

  const handleLeave = () => {
    soundEngine.playClick();
    mpClient.leaveRoom();
    setRoom(null);
    setMySide(null);
    setErrorMsg(null);
  };

  const handleBackToTitle = () => {
    soundEngine.playClick();
    if (room) mpClient.leaveRoom();
    onBack();
  };

  const renderRosterCard = (
    title: string,
    member: MultiplayerRoomState['host'] | null,
    isHostSlot: boolean
  ) => {
    if (!member) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
          <Users className="w-10 h-10 text-slate-600 mb-3" />
          <h3 className="font-display text-2xl font-bold text-slate-300">Menunggu Lawan Masuk</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            Bagikan kode room di atas kepada temanmu agar mereka bisa bergabung membawa tim 3v3 mereka.
          </p>
        </div>
      );
    }

    const isSelf = mySide === member.side;
    return (
      <div
        className={`rounded-2xl border p-5 space-y-4 ${
          isHostSlot
            ? 'bg-sky-950/25 border-sky-500/40'
            : 'bg-rose-950/25 border-rose-500/40'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {title} {isSelf ? '· Kamu' : ''}
            </p>
            <h3 className="font-display text-2xl font-extrabold text-white flex items-center gap-2">
              {isHostSlot && <Crown className="w-5 h-5 text-amber-400" />}
              <span>{member.playerName}</span>
            </h3>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
                !member.connected
                  ? 'bg-slate-800 text-slate-400'
                  : member.ready
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {!member.connected ? 'Terputus' : member.ready ? 'Siap' : 'Menyiapkan Tim'}
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          {ROLES.map((role) => {
            const slot = member.roster[role];
            const char = getCharacterById(slot.charId);
            return (
              <div
                key={role}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/75 border border-slate-800"
              >
                <AnimePortrait character={char} size="sm" emotion="confident" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {role} · {char.rank} · Lv.{slot.level}
                  </p>
                  <p className="font-semibold text-sm text-white truncate">{char.name}</p>
                  <p className="text-xs text-amber-300 truncate">{char.ultimate.indonesianName}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 px-4 md:px-10 py-6 flex flex-col">
      {/* Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToTitle}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider">
              PvP Online Real-Time · Skor 0–21
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Multiplayer Room
            </h1>
          </div>
        </div>

        {room && (
          <button
            onClick={handleLeave}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-rose-500/40 text-rose-300 text-sm font-semibold hover:bg-rose-950/40 cursor-pointer whitespace-nowrap"
          >
            {mySide === 'host' ? 'Tutup Room' : 'Keluar Room'}
          </button>
        )}
      </header>

      <main className="max-w-5xl w-full mx-auto flex-1 py-8 space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/50 text-rose-200 text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {!room ? (
          <>
            {/* Player Profile & Active Team Strip */}
            <section className="rounded-2xl bg-[#0D1426] border border-slate-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1.5 flex-1 max-w-sm">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nama Kamu di Room
                </label>
                <input
                  type="text"
                  maxLength={18}
                  value={playerName}
                  onChange={(e) => persistName(e.target.value)}
                  placeholder="Masukkan nama..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {ROLES.map((role) => {
                  const ch = getCharacterById(save.lineup[role]);
                  const lvl = save.ownedCharacters[ch.id]?.level || 1;
                  return (
                    <div
                      key={role}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800"
                    >
                      <AnimePortrait character={ch} size="sm" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold">{role} · Lv.{lvl}</p>
                        <p className="text-xs font-semibold text-white">{ch.name.split(' ')[0]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Create vs Join Room Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="rounded-2xl bg-[#0D1426] border border-sky-500/30 p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <h2 className="font-display text-3xl font-extrabold text-white">
                    Buat Room (Host)
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Buat room pertandingan baru dan dapatkan kode acak 6 karakter. Bagikan kode tersebut ke temanmu untuk bertanding 3v3 real-time.
                  </p>
                </div>

                <button
                  disabled={busy}
                  onClick={handleCreateRoom}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-500 hover:from-sky-300 hover:to-cyan-400 text-slate-950 font-display text-xl font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>{busy ? 'Menghubungkan...' : 'Buat Room Sekarang'}</span>
                </button>
              </section>

              <section className="rounded-2xl bg-[#0D1426] border border-amber-500/30 p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <h2 className="font-display text-3xl font-extrabold text-white">
                    Gabung Room
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Sudah punya kode room dari Host? Masukkan kode acak 6 karakter di bawah ini untuk langsung masuk ke arena lawan.
                  </p>
                </div>

                <form onSubmit={handleJoinRoom} className="space-y-3">
                  <input
                    type="text"
                    maxLength={8}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="CONTOH: V7K92P"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-center font-mono-num text-2xl font-extrabold tracking-[0.22em] text-amber-300 uppercase focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display text-xl font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>{busy ? 'Memasuki Room...' : 'Masuk Room'}</span>
                  </button>
                </form>
              </section>
            </div>
          </>
        ) : (
          /* ACTIVE ROOM LOBBY */
          <div className="space-y-6">
            {/* Room Code Banner */}
            <section className="rounded-2xl bg-[#0D1426] border border-slate-700 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Kode Room Pertandingan
                </p>
                <p className="font-mono-num text-4xl md:text-5xl font-extrabold tracking-[0.22em] text-amber-300 mt-1">
                  {room.code}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Kode Tersalin!' : 'Salin Kode'}</span>
                </button>

                {mySide === 'host' ? (
                  <button
                    disabled={!room.guest || !room.guest.connected || !room.guest.ready}
                    onClick={() => {
                      soundEngine.playClick();
                      mpClient.startMatch();
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display text-xl font-extrabold uppercase tracking-wide flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Mulai Pertandingan</span>
                  </button>
                ) : (
                  <button
                    onClick={handleToggleReady}
                    className={`px-6 py-3 rounded-xl font-display text-xl font-extrabold uppercase tracking-wide flex items-center gap-2 cursor-pointer ${
                      room.guest?.ready
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        : 'bg-sky-400 text-slate-950 hover:bg-sky-300'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>{room.guest?.ready ? 'Siap! (Klik Batal)' : 'Siap Bertanding'}</span>
                  </button>
                )}
              </div>
            </section>

            {/* Teams Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderRosterCard('Host · Tim Kiri', room.host, true)}
              {renderRosterCard('Penantang · Tim Kanan', room.guest, false)}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
