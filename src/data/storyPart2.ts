import { DialogueLine, OpponentLineup, StoryChapter, StoryEpisode } from '../types/game';
import { getCharacterById } from './characters';

interface EpisodeSeed {
  title: string;
  location: string;
  summary: string;
  rivalId: string;
  setterId: string;
  blockerId: string;
  teamName: string;
  dialogues: DialogueLine[];
  unlocksAwakening?: boolean;
}

function buildEpisode(
  chapterNumber: number,
  epNum: number,
  seed: EpisodeSeed,
  baseAi: number
): StoryEpisode {
  const isBoss = epNum === 12;
  const aiLevel = baseAi + epNum * 2 + (isBoss ? 8 : 0);
  const opponent: OpponentLineup = {
    teamName: seed.teamName,
    spikerId: seed.rivalId,
    setterId: seed.setterId,
    blockerId: seed.blockerId,
    aiLevel,
    isBoss,
    bossUltimateChargeRate: isBoss ? 1.65 + chapterNumber * 0.08 : 1.05 + chapterNumber * 0.04,
    bossPowerMultiplier: isBoss ? 1.2 + chapterNumber * 0.035 : 1.0 + chapterNumber * 0.015,
  };

  return {
    id: `c${chapterNumber}-e${epNum}`,
    chapterNumber,
    episodeNumber: epNum,
    title: seed.title,
    location: seed.location,
    summary: seed.summary,
    dialogues: seed.dialogues,
    opponent,
    rewardCoins: 100,
    rewardExp: 55 + chapterNumber * 22 + epNum * 5 + (isBoss ? 80 : 0),
    unlocksAwakening: seed.unlocksAwakening,
  };
}

const d = (
  speakerId: string,
  side: 'left' | 'right',
  emotion: DialogueLine['emotion'],
  text: string,
  actionTag?: string
): DialogueLine => {
  const char = getCharacterById(speakerId);
  return {
    speakerId,
    speakerName: char.name,
    side,
    emotion,
    text,
    actionTag,
  };
};

// CHAPTER 6: Babak Baru: Liga Mahasiswa Divisi 2 (12 Episodes)
const ch6Seeds: EpisodeSeed[] = [
  {
    title: 'Mahasiswa Baru Universitas Garuda',
    location: 'GOR Kampus Universitas Garuda',
    summary: 'Lulus SMA, Raka masuk universitas dan langsung ditantang senior kampus yang lebih keras dan licik.',
    rivalId: 'tama_artileri',
    setterId: 'angga_umpan',
    blockerId: 'tegar_maulana',
    teamName: 'Tim Senior Garuda',
    dialogues: [
      d('raka_pratama', 'left', 'confident', 'Akhirnya resmi jadi mahasiswa! Katanya liga kampus jauh lebih brutal dari SMA?'),
      d('tama_artileri', 'right', 'laughing', 'Jangan samakan pertandingan anak sekolah dengan liga mahasiswa, adik tingkat! Di sini kami bermain dengan beban penuh!'),
      d('bagas_setiawan', 'left', 'determined', 'Kita satu universitas lagi, Raka. Ayo tunjukkan bahwa juara SMA bukan sekadar kenangan!'),
    ],
  },
  {
    title: 'Benteng Kampus yang Berubah',
    location: 'Arena Universitas Cendrawasih',
    summary: 'Tim mahasiswa menggabungkan pertahanan libero tingkat tinggi dengan serangan balik cepat.',
    rivalId: 'tari_ayu',
    setterId: 'nadia_kirana',
    blockerId: 'hera_phoenix',
    teamName: 'Universitas Pelita',
    dialogues: [
      d('hera_phoenix', 'right', 'confident', 'Selamat datang di Divisi 2! Kalian akan melihat kenapa banyak bintang SMA tenggelam di tahun pertama kuliah.'),
      d('dimas_perkasa', 'left', 'determined', 'Kami tidak datang untuk tenggelam! Blokirku sudah naik ke level mahasiswa!'),
    ],
  },
  {
    title: 'Jaring Laba-Laba Taktik Ganda',
    location: 'GOR Universitas Nusantara',
    summary: 'Komunikasi rotasi rapat membuat celah kosong selalu tertutup sebelum bola turun.',
    rivalId: 'ilham_kencana',
    setterId: 'angga_umpan',
    blockerId: 'tegar_maulana',
    teamName: 'Universitas Nusantara',
    dialogues: [
      d('angga_umpan', 'right', 'confident', 'Rotasi kami bergerak seperti jarum jam. Tidak ada satu jengkal lantai pun yang dibiarkan kosong!'),
      d('raka_pratama', 'left', 'whisper', 'Kalau lantai tertutup, berarti kita harus memantulkan bola lewat ujung tangan mereka!'),
    ],
  },
  {
    title: 'Pertarungan Tanpa Ekspresi',
    location: 'Aula Kampus Barat',
    summary: 'Silent Assassin membuat pembacaan emosi tim Raka menjadi buntu.',
    rivalId: 'ilham_kencana',
    setterId: 'rio_santoso',
    blockerId: 'citra_pegasus',
    teamName: 'Universitas Elang Hitam',
    dialogues: [
      d('ilham_kencana', 'right', 'whisper', 'Tidak ada teriakan, tidak ada ekspresi. Kalian tidak akan tahu apakah aku akan memukul keras atau menjatuhkan bola pelan.'),
      d('bagas_setiawan', 'left', 'injured', 'Susah sekali membaca matanya... dia bahkan tidak berkedip saat melompat!'),
      d('raka_pratama', 'left', 'charging', 'Kalau wajahnya tidak bicara, baca gerakan lutut dan pusat berat badannya!'),
    ],
  },
  {
    title: 'Rival Lama di Seragam Baru',
    location: 'GOR Kampus Timur',
    summary: 'Renji Bara kini membela Universitas Vulkanik dengan kekuatan fisik dewasa.',
    rivalId: 'renji_bara',
    setterId: 'angga_umpan',
    blockerId: 'bayu_samudra',
    teamName: 'Universitas Vulkanik',
    dialogues: [
      d('renji_bara', 'right', 'laughing', 'Sudah kuduga kita bertemu lagi di liga kampus, Raka! Kekuatan pukulanku sekarang dua kali lebih berat!'),
      d('raka_pratama', 'left', 'confident', 'Senang melihatmu makin kuat, Renji! Ayo panaskan arena kampus ini!'),
    ],
  },
  {
    title: 'Distorsi Ruang di Garis Luar',
    location: 'Arena Kampus Selatan',
    summary: 'Angga meluncurkan Warp Toss dari luar lapangan yang melengkung tajam ke bibir net.',
    rivalId: 'alex_nebula',
    setterId: 'angga_umpan',
    blockerId: 'citra_pegasus',
    teamName: 'Universitas Orbit',
    dialogues: [
      d('angga_umpan', 'right', 'confident', 'Bola hampir keluar arena? Tidak masalah—dari posisi mustahil pun umpanku tetap jatuh di depan net!'),
      d('dimas_perkasa', 'left', 'shocked', 'Bola itu baru saja membelok melewati tiang antena net dari sisi luar?!'),
      d('raka_pratama', 'left', 'determined', 'Jangan pernah menganggap bola sudah mati sebelum wasit meniup peluit!'),
    ],
  },
  {
    title: 'Lompatan Pegasus Divisi Atas',
    location: 'GOR Universitas Pelita Jaya',
    summary: 'Citra Angkasa berduet dengan penyerang tajam untuk merebut posisi puncak klasemen.',
    rivalId: 'surya_angga',
    setterId: 'nadia_kirana',
    blockerId: 'citra_pegasus',
    teamName: 'Universitas Pelita Jaya',
    dialogues: [
      d('citra_pegasus', 'right', 'determined', 'Universitas kami mengejar promosi Divisi 1. Kami tidak akan terpeleset melawan tim promosi baru!'),
      d('raka_pratama', 'left', 'charging', 'Promosi juga target kami! Mari kita buktikan di lapangan!'),
    ],
  },
  {
    title: 'Tekanan Libero Cakrawala',
    location: 'Arena Mahasiswa Tengah',
    summary: 'Membaca lintasan bola sebelum dipukul membuat serangan lurus Raka selalu terbaca.',
    rivalId: 'kenji_katana',
    setterId: 'nadia_kirana',
    blockerId: 'hera_phoenix',
    teamName: 'Universitas Rajawali',
    dialogues: [
      d('kenji_katana', 'right', 'confident', 'Permainan mahasiswa menuntut bukan hanya tenaga, tapi juga perang psikologi di udara.'),
      d('raka_pratama', 'left', 'determined', 'Aku mulai mengerti... setiap lompatan adalah permainan catur berkecepatan tinggi!'),
    ],
  },
  {
    title: 'Efek Domino yang Menghancurkan',
    location: 'GOR Kampus Cendrawasih',
    summary: 'Viona dan timnya menjalankan rangkaian serangan beruntun dari kiri ke kanan tanpa henti.',
    rivalId: 'viona_beludak',
    setterId: 'angga_umpan',
    blockerId: 'kai_samudra',
    teamName: 'Universitas Cendrawasih B',
    dialogues: [
      d('viona_beludak', 'right', 'laughing', 'Satu sisi runtuh, sisi lain langsung menyusul! Itulah efek domino pasukan kami!'),
      d('bagas_setiawan', 'left', 'charging', 'Dimas, jangan terpancing rotasi mereka! Kunci blok tengah agar dominonya terputus!'),
    ],
  },
  {
    title: 'Pintu Semifinal Divisi 2',
    location: 'Stadion Mahasiswa Nasional',
    summary: 'Kemenangan tipis membawa trio Raka satu langkah menuju perebutan gelar Divisi 2.',
    rivalId: 'komandan_zaki',
    setterId: 'angga_umpan',
    blockerId: 'kai_samudra',
    teamName: 'Akademi Tinggi Militer',
    dialogues: [
      d('komandan_zaki', 'right', 'confident', 'Bagus sekali kalian menyusul hingga tingkat mahasiswa, Raka. Tapi seragam baruku tidak mengenal belas kasihan.'),
      d('raka_pratama', 'left', 'charging', 'Justru itulah yang kusukai dari setiap pertarungan melawanmu, Zaki!'),
    ],
  },
  {
    title: 'Bisa Mematikan di Laga Penentu',
    location: 'Stadion Mahasiswa Nasional',
    summary: 'Persiapan taktik menghadapi serangan cambuk Viona sebelum partai final.',
    rivalId: 'viona_beludak',
    setterId: 'damien_dalang',
    blockerId: 'citra_pegasus',
    teamName: 'All-Star Divisi 2',
    dialogues: [
      d('damien_dalang', 'right', 'whisper', 'Menarik... mari kita lihat seberapa kuat benang kalian sebelum berhadapan dengan Viona di final nanti.'),
      d('raka_pratama', 'left', 'determined', 'Damien Arka... kenapa rasanya setiap gerakanku seperti sedang diamati olehnya?!'),
    ],
  },
  {
    title: 'FINAL BOSS CH.6: Pagutan Ratu Divisi 2',
    location: 'Panggung Final Divisi 2 Nasional',
    summary: 'Viona Beludak mengerahkan Viper Strike dan Eagle Eye penuh demi trofi Divisi 2!',
    rivalId: 'viona_beludak',
    setterId: 'nadia_kirana',
    blockerId: 'citra_pegasus',
    teamName: 'Universitas Cendrawasih',
    dialogues: [
      d('viona_beludak', 'right', 'charging', 'Selamat telah sampai di panggung final! Tapi mahkota Divisi 2 dan tiket Divisi 1 hanya milik Universitas Cendrawasih!'),
      d('raka_pratama', 'left', 'charging', 'Kami memulai semua ini dari lapangan tua sekolah. Tidak mungkin kami berhenti di sini!'),
      d('bagas_setiawan', 'left', 'determined', 'Ayo Raka! Patahkan bisa beludaknya dan rebut gelar juara Divisi 2!'),
    ],
  },
];

// CHAPTER 7: Turnamen Kampus Nasional (12 Episodes)
const ch7Seeds: EpisodeSeed[] = [
  {
    title: 'Panggung Elite Kampus Nasional',
    location: 'Arena Mahasiswa Istora',
    summary: 'Promosi ke Divisi Utama Kampus mempertemukan Raka dengan kekuatan Kosmik dan Psikis.',
    rivalId: 'alex_nebula',
    setterId: 'damien_dalang',
    blockerId: 'hera_phoenix',
    teamName: 'Universitas Bintang Hitam B',
    dialogues: [
      d('damien_dalang', 'right', 'laughing', 'Selamat datang di panggung utama, Raka. Di sini, kekuatan fisik saja hanya mainan bagi para pengendali ilusi dan ruang.'),
      d('raka_pratama', 'left', 'determined', 'Benang ilusimu itu tidak akan bisa mengikat kecepatan kami, Damien!'),
    ],
  },
  {
    title: 'Putaran Nebula yang Membelok',
    location: 'Arena Istora Lapangan 1',
    summary: 'Servis dan umpan Alex Nebula berbelok dua kali di udara melawan hukum fisika biasa.',
    rivalId: 'alex_nebula',
    setterId: 'angga_umpan',
    blockerId: 'citra_pegasus',
    teamName: 'Universitas Bintang Orbit',
    dialogues: [
      d('alex_nebula', 'right', 'confident', 'Pertama berbelok ke kanan, lalu menukik ke kiri! Itulah putaran ganda Nebula!'),
      d('dimas_perkasa', 'left', 'shocked', 'Dua kali berubah arah di udara?! Bagaimana caranya menangkap bola seperti itu?!'),
      d('raka_pratama', 'left', 'charging', 'Terima bola tepat sebelum putaran keduanya bekerja!'),
    ],
  },
  {
    title: 'Serangan Hantu Tanpa Sentuhan',
    location: 'Arena Istora Lapangan 2',
    summary: 'Spiker depan mengayunkan tangan kosong, sementara pemukul kedua menghantam dari belakang.',
    rivalId: 'kenji_katana',
    setterId: 'damien_dalang',
    blockerId: 'kai_samudra',
    teamName: 'Universitas Bayangan',
    dialogues: [
      d('damien_dalang', 'right', 'confident', 'Blocker kalian baru saja melompat untuk ayunan hantu yang bahkan tidak menyentuh bola!'),
      d('dimas_perkasa', 'left', 'angry', 'Licik sekali! Mereka mengorbankan lompatan pemain depan demi umpan bayangan!'),
    ],
  },
  {
    title: 'Jeda Waktu yang Membingungkan',
    location: 'Arena Istora Pusat',
    summary: 'Lawan memperlambat ayunan tangan di detik terakhir untuk menghancurkan timing blokir.',
    rivalId: 'aris_chameleon',
    setterId: 'aris_chameleon',
    blockerId: 'drago_cerberus',
    teamName: 'Universitas Kronos',
    dialogues: [
      d('aris_chameleon', 'right', 'laughing', 'Terlalu cepat melompat! Kalian sudah mulai turun saat lenganku baru akan menghantam bola!'),
      d('raka_pratama', 'left', 'whisper', 'Mereka memanipulasi jeda waktu di udara... maka kita harus menahan lompatan blok lebih lama lagi!'),
    ],
  },
  {
    title: 'Aura Pertahanan Mutlak',
    location: 'Arena Istora Pusat',
    summary: 'Tekanan mental libero membuat setiap sudut lapangan terasa tertutup rapat.',
    rivalId: 'tama_artileri',
    setterId: 'nadia_kirana',
    blockerId: 'hera_phoenix',
    teamName: 'Universitas Perisai',
    dialogues: [
      d('hera_phoenix', 'right', 'charging', 'Lihat sekelilingmu, penyerang. Tidak ada ruang kosong di mana pun!'),
      d('raka_pratama', 'left', 'injured', 'Kenapa setiap sudut terasa sempit sekali... tekanan auranya nyata!'),
      d('bagas_setiawan', 'left', 'determined', 'Jangan lihat seluruh lapangan! Fokus saja pada ruang sekecil kepalan tangan yang kubuka lewat umpanku!'),
    ],
  },
  {
    title: 'Pertarungan Cermin Kembar',
    location: 'Arena Istora 3',
    summary: 'Dua penyerang dengan gaya identik membelah konsentrasi pertahanan Universitas Garuda.',
    rivalId: 'viona_beludak',
    setterId: 'damien_dalang',
    blockerId: 'citra_pegasus',
    teamName: 'Universitas Ilusi',
    dialogues: [
      d('damien_dalang', 'right', 'confident', 'Kiri atau kanan? Pilihan yang salah berarti satu poin langsung untuk kami!'),
      d('raka_pratama', 'left', 'charging', 'Aku akan menjaga tengah dan menyergap ke mana pun bola pergi!'),
    ],
  },
  {
    title: 'Kembali Menghadapi Sang Peniru',
    location: 'Dome Kampus Nasional',
    summary: 'Aris Kameleon memamerkan Mode Zone di babak perempat final kampus.',
    rivalId: 'aris_chameleon',
    setterId: 'aris_chameleon',
    blockerId: 'kai_samudra',
    teamName: 'Universitas Zenith',
    dialogues: [
      d('aris_chameleon', 'right', 'charging', 'Kali ini aku sudah memetakan seluruh pola kalian sejak SMA hingga hari ini!'),
      d('raka_pratama', 'left', 'determined', 'Kalau kau meniru diriku yang kemarin, berarti kau pasti kalah dari diriku yang hari ini!'),
    ],
  },
  {
    title: 'Sumur Gravitasi Alex Nebula',
    location: 'Dome Kampus Nasional',
    summary: 'Alex menarik bola menukik dengan percepatan tak wajar di bawah bayangan gerhana.',
    rivalId: 'alex_nebula',
    setterId: 'damien_dalang',
    blockerId: 'valen_meteor',
    teamName: 'Universitas Astral',
    dialogues: [
      d('alex_nebula', 'right', 'charging', 'Rasakan tarikan Sumur Gravitasi! Bola ini jatuh lebih cepat daripada refleks mata kalian!'),
      d('raka_pratama', 'left', 'awakened', 'Tunggu... kenapa bola cepat itu tiba-tiba melambat di penglihatanku?!'),
      d('valen_meteor', 'right', 'shocked', 'Apa?! Anak itu baru saja mematahkan efek gerhana Alex dengan refleks mata telanjang?!'),
    ],
  },
  {
    title: 'Semifinal: Panggung Boneka Damien',
    location: 'Arena Utama Nasional',
    summary: 'Damien mulai menarik seluruh pergerakan blocker lewat tipuan fatamorgana.',
    rivalId: 'kenji_katana',
    setterId: 'damien_dalang',
    blockerId: 'hera_phoenix',
    teamName: 'Universitas Bintang Hitam',
    dialogues: [
      d('damien_dalang', 'right', 'laughing', 'Kalian bermain bagus, tapi setiap langkah kalian di set ini sudah kutulis di naskahku!'),
      d('bagas_setiawan', 'left', 'angry', 'Sebagai sesama setter, aku tidak akan membiarkanmu mengendalikan ritme teman-temanku!'),
    ],
  },
  {
    title: 'Mencari Kunci Pemutus Benang',
    location: 'Ruang Taktik Garuda',
    summary: 'Bagas menyadari cara mengacaukan kendali Damien lewat umpan minus-tempo mendadak.',
    rivalId: 'komandan_zaki',
    setterId: 'damien_dalang',
    blockerId: 'drago_cerberus',
    teamName: 'Tim Gabungan Nasional',
    dialogues: [
      d('bagas_setiawan', 'left', 'determined', 'Raka, kita harus memukul sebelum Damien selesai membaca arah tatapanku!'),
      d('raka_pratama', 'left', 'confident', 'Umpan super cepat tanpa aba-aba? Ayo kita coba di arena pemanasan!'),
    ],
  },
  {
    title: 'Gerbang Menuju Final Kampus',
    location: 'Arena Utama Nasional',
    summary: 'Laga keras penentuan finalis menghadapi komandan pertahanan paling solid.',
    rivalId: 'drago_cerberus',
    setterId: 'nadia_kirana',
    blockerId: 'drago_cerberus',
    teamName: 'Universitas Titan',
    dialogues: [
      d('drago_cerberus', 'right', 'confident', 'Di final nanti Damien menunggumu, Raka. Tapi pastikan tanganmu tidak patah lebih dulu di hadapanku!'),
      d('raka_pratama', 'left', 'charging', 'Tidak akan! Kami sudah membidik trofi nasional kampus!'),
    ],
  },
  {
    title: 'FINAL BOSS CH.7: Teater Benang Dalang',
    location: 'Panggung Final Turnamen Kampus Nasional',
    summary: 'Damien Arka menggerakkan seluruh arena dengan Puppeteer Strings dan Mirage Toss!',
    rivalId: 'kenji_katana',
    setterId: 'damien_dalang',
    blockerId: 'hera_phoenix',
    teamName: 'Universitas Bintang Hitam (Inti)',
    dialogues: [
      d('damien_dalang', 'right', 'charging', 'Tirai pertunjukan final telah dibuka! Menarilah di ujung benang dalangku hingga poin ke-21!'),
      d('raka_pratama', 'left', 'charging', 'Kami bukan boneka di panggungmu, Damien! Putuskan benang itu dengan kecepatan murni!'),
      d('bagas_setiawan', 'left', 'determined', 'Adu strategi setter terhebat dimulai sekarang!'),
    ],
  },
];

// CHAPTER 8: Draft Liga Pro: Pintu Dunia Profesional (12 Episodes)
const ch8Seeds: EpisodeSeed[] = [
  {
    title: 'Hari Draft Klub Profesional',
    location: 'Markas Liga Pro Nusantara',
    summary: 'Menjuarai kampus nasional membawa Raka direkrut ke klub pro Nusantara Thunder. Kini lawannya adalah para atlet bayaran kelas dunia!',
    rivalId: 'alex_nebula',
    setterId: 'aris_chameleon',
    blockerId: 'hera_phoenix',
    teamName: 'Tim Uji Coba Pro',
    dialogues: [
      d('hera_phoenix', 'left', 'confident', 'Selamat datang di Nusantara Thunder, anak baru. Di Liga Pro, setiap kesalahan berarti kehilangan kontrak dan kehormatan!'),
      d('raka_pratama', 'left', 'determined', 'Aku tidak menyangka anak yang dulu cuma cari nilai ekskul kini memakai jersey klub profesional!'),
      d('alex_nebula', 'right', 'laughing', 'Jangan terlalu cepat bangga, rookie! Di liga pro, serangan level nasional masih dianggap pemanasan!'),
    ],
  },
  {
    title: 'Debut Liga Pro: Nusantara Thunder',
    location: 'Arena Pro Senayan',
    summary: 'Laga debut profesional melawan klub elit penuh pemain berpengalaman.',
    rivalId: 'kenji_katana',
    setterId: 'angga_umpan',
    blockerId: 'kai_samudra',
    teamName: 'Klub Pro Garuda Steel',
    dialogues: [
      d('kenji_katana', 'right', 'confident', 'Akhirnya kita bertemu di panggung profesional, Raka! Tunjukkan apakah refleks gila itu masih bekerja di sini!'),
      d('raka_pratama', 'left', 'charging', 'Lebih tajam dari sebelumnya! Mari kita lihat siapa yang mendominasi debut ini!'),
    ],
  },
  {
    title: 'Penerimaan Lubang Hitam',
    location: 'Arena Galaxy Pro',
    summary: 'Valen Kosmos menyerap putaran dan tenaga spike Raka hingga memantul tenang seperti tak terjadi apa-apa.',
    rivalId: 'alex_nebula',
    setterId: 'damien_dalang',
    blockerId: 'valen_meteor',
    teamName: 'Klub Pro Galaxy Titans',
    dialogues: [
      d('valen_meteor', 'right', 'whisper', 'Putaranmu terlalu ringan... semua momentum pukulan itu baru saja kuserap habis.', 'Menangkap bola tanpa suara'),
      d('raka_pratama', 'left', 'shocked', 'Spike terkerasku... langsung berhenti diam di lengannya seperti kehilangan seluruh tenaga?!'),
      d('valen_meteor', 'right', 'confident', 'Itu disebut Black Hole Dig. Latih lagi kekuatanmu, rookie.'),
    ],
  },
  {
    title: 'Taktik Event Horizon',
    location: 'Arena Galaxy Pro',
    summary: 'Valen membaca lintasan bola bahkan sebelum Raka mengayunkan tangan.',
    rivalId: 'tama_artileri',
    setterId: 'aris_chameleon',
    blockerId: 'valen_meteor',
    teamName: 'Galaxy Titans B',
    dialogues: [
      d('valen_meteor', 'right', 'confident', 'Begitu bola terlepas dari tangan settermu, titik jatuhnya sudah terkunci dalam cakrawalaku.'),
      d('bagas_setiawan', 'left', 'determined', 'Kalau begitu aku harus mengubah titik lepas bola hingga detik paling akhir!'),
    ],
  },
  {
    title: 'Duel Sang Samurai dan Meriam Rel',
    location: 'Arena Tokyo Dome Tour',
    summary: 'Pertarungan sengit antarklub menghadapi duet senjata Kenji dan Komandan Zaki.',
    rivalId: 'komandan_zaki',
    setterId: 'angga_umpan',
    blockerId: 'kenji_katana',
    teamName: 'Klub Pro Tokyo Blade',
    dialogues: [
      d('komandan_zaki', 'right', 'laughing', 'Di dunia profesional, aku dan Kenji menyatukan Railgun dan Katana! Siap menahan gempuran kami?'),
      d('raka_pratama', 'left', 'confident', 'Kombinasi mengerikan... tapi tim kami juga terus berkembang!'),
    ],
  },
  {
    title: 'Jatuhnya Meteor di Lantai Pro',
    location: 'Arena Pro Senayan',
    summary: 'Umpan super tinggi memanfaatkan gravitasi penuh saat turun untuk menghantam pertahanan.',
    rivalId: 'valen_meteor',
    setterId: 'damien_dalang',
    blockerId: 'citra_pegasus',
    teamName: 'Klub Pro Meteor Strike',
    dialogues: [
      d('valen_meteor', 'right', 'angry', 'Dari ketinggian puncak dome, gaya gravitasi penuh akan mendorong bola ini menembus lantai kalian!'),
      d('dimas_perkasa', 'left', 'charging', 'Jangan mundur! Kita tahan bersama di garis belakang!'),
    ],
  },
  {
    title: 'Ujian Mental Melawan Sang Raja',
    location: 'Lorong Stadion Pro',
    summary: 'Kaiser Noir muncul di liga pro dan memaksa Raka merasakan Intimidasi Raja.',
    rivalId: 'splus_kaiser_noir',
    setterId: 'damien_dalang',
    blockerId: 'valen_meteor',
    teamName: 'Imperial Crown (Ekshibisi)',
    dialogues: [
      d('splus_kaiser_noir', 'right', 'confident', 'Jadi kaulah pendatang baru yang disebut memiliki bakat tersembunyi? Mata yang masih penuh keraguan.'),
      d('raka_pratama', 'left', 'shocked', 'Tekanan apa ini... kakiku mendadak terasa berat hanya dengan menatapnya di seberang net!'),
      d('splus_kaiser_noir', 'right', 'whisper', 'Tumbuhlah lebih cepat. Kalau tidak, kau hanya akan jadi bidak di papan caturku.'),
    ],
  },
  {
    title: 'Kebangkitan Kepercayaan Diri',
    location: 'Pusat Latihan Nusantara Thunder',
    summary: 'Raka berlatih menembus rasa takut di bawah bimbingan Hera Phoenix.',
    rivalId: 'renji_bara',
    setterId: 'bagas_setiawan',
    blockerId: 'hera_phoenix',
    teamName: 'Latihan Internal Thunder',
    dialogues: [
      d('hera_phoenix', 'right', 'determined', 'Jangan biarkan aura pemain rank S+ membekukan langkahmu! Di saat kau ragu, kau sudah kalah sebelum melompat!'),
      d('raka_pratama', 'left', 'charging', 'Benar! Fokusku hanya pada bola dan rekan setimku!'),
    ],
  },
  {
    title: 'Laga Playoff: Badai Kosmik',
    location: 'Arena Pro Nusantara',
    summary: 'Babak playoff liga pro memaksa Raka melawan kombinasi teknik kosmik Alex dan Aris.',
    rivalId: 'alex_nebula',
    setterId: 'aris_chameleon',
    blockerId: 'kai_samudra',
    teamName: 'Klub Pro Seoul Orbit',
    dialogues: [
      d('alex_nebula', 'right', 'confident', 'Playoff Liga Pro tidak memberi ruang untuk coba-coba. Mari kita selesaikan ini dengan cepat!'),
      d('raka_pratama', 'left', 'determined', 'Kami tidak akan menyerahkan tiket semifinal liga pro begitu saja!'),
    ],
  },
  {
    title: 'Semifinal Pro: Gerbang Eropa',
    location: 'Arena Pro Nusantara',
    summary: 'Drago Varga datang sebagai pemain impor dengan kekuatan blok tiga kepala yang ditingkatkan.',
    rivalId: 'drago_cerberus',
    setterId: 'damien_dalang',
    blockerId: 'drago_cerberus',
    teamName: 'Klub Pro Cerberus Eropa',
    dialogues: [
      d('drago_cerberus', 'right', 'laughing', 'Masih ingat rasa dihantam blok Cerberus di Seleknas dulu, Raka? Di liga pro kekuatanku sudah berlipat ganda!'),
      d('raka_pratama', 'left', 'confident', 'Justru itu, Drago—aku ingin melihat seberapa kuat aku sekarang dibanding masa SMA!'),
    ],
  },
  {
    title: 'Detik Sebelum Singularitas',
    location: 'Arena Final Playoff Pro',
    summary: 'Pemanasan panas menjelang duel puncak melawan Valen Kosmos.',
    rivalId: 'valen_meteor',
    setterId: 'aris_chameleon',
    blockerId: 'hera_phoenix',
    teamName: 'Galaxy Titans (Skuad Inti)',
    dialogues: [
      d('valen_meteor', 'right', 'determined', 'Hanya tinggal satu langkah menuju final draft pro. Tunjukkan apakah seranganmu kini bisa menembus lubang hitamku.'),
      d('raka_pratama', 'left', 'charging', 'Kali ini bola tidak akan mati di lenganmu, Valen!'),
    ],
  },
  {
    title: 'FINAL BOSS CH.8: Singularitas Meteor Jatuh',
    location: 'Panggung Final Liga Pro Nasional',
    summary: 'Valen Kosmos melepaskan kekuatan penuh Black Hole Dig & Meteor Fall untuk menguji sang rookie!',
    rivalId: 'valen_meteor',
    setterId: 'damien_dalang',
    blockerId: 'valen_meteor',
    teamName: 'Klub Pro Galaxy Titans',
    dialogues: [
      d('valen_meteor', 'right', 'charging', 'Segala cahaya dan kekuatan pukulan akan tenggelam di Event Horizon! Bersiaplah menerima Meteor Fall!'),
      d('raka_pratama', 'left', 'awakened', 'Bola ini tidak akan ditelan kegelapan! Energi kita akan memecahkan lubang hitam itu!'),
      d('bagas_setiawan', 'left', 'determined', 'Tembus cakrawalanya, Raka!'),
    ],
  },
];

// CHAPTER 9: Kejuaraan Klub Pro Asia (12 Episodes)
const ch9Seeds: EpisodeSeed[] = [
  {
    title: 'Terbang ke Kejuaraan Klub Asia',
    location: 'Arena Internasional Asia',
    summary: 'Juara Liga Pro Nusantara terbang menghadapi raja-raja voli dari seluruh benua Asia.',
    rivalId: 'kenji_katana',
    setterId: 'aris_chameleon',
    blockerId: 'kai_samudra',
    teamName: 'Tokyo Blade All-Stars',
    dialogues: [
      d('raka_pratama', 'left', 'confident', 'Turnamen Klub Asia... bendera berbagai negara berkibar di tribun!'),
      d('kenji_katana', 'right', 'determined', 'Selamat datang di level benua, Raka. Lawan terberat kita nanti adalah sosok berjuluk Raja Skakmat—Kaiser Noir.'),
    ],
  },
  {
    title: 'Kecepatan Tanpa Jeda',
    location: 'Arena Asia Court A',
    summary: 'Pertarungan kecepatan penuh melawan para pengguna refleks ekstrem.',
    rivalId: 'surya_angga',
    setterId: 'aris_chameleon',
    blockerId: 'citra_pegasus',
    teamName: 'Bangkok Thunder',
    dialogues: [
      d('aris_chameleon', 'right', 'confident', 'Di Asia, tempo standar saja sudah secepat serangan kilat!'),
      d('raka_pratama', 'left', 'determined', 'Maka kita percepat lagi ritme serangan kita!'),
    ],
  },
  {
    title: 'Dinding Aegis Berlapis Baja',
    location: 'Arena Asia Court B',
    summary: 'Pertahanan tiga blocker seimbang menahan serangan dari segala sudut.',
    rivalId: 'komandan_zaki',
    setterId: 'angga_umpan',
    blockerId: 'drago_cerberus',
    teamName: 'Iron Fortress Asia',
    dialogues: [
      d('komandan_zaki', 'right', 'confident', 'Tiga tembok di depan net tidak menyisakan satu celah pun!'),
      d('dimas_perkasa', 'left', 'charging', 'Kita pun punya tiga pemain yang saling menutupi!'),
    ],
  },
  {
    title: 'Servis Nebula & Pengacau Tempo',
    location: 'Arena Asia Utama',
    summary: 'Alex Nebula memadukan servis ganda dengan umpan telepati yang membingungkan.',
    rivalId: 'alex_nebula',
    setterId: 'nadia_kirana',
    blockerId: 'valen_meteor',
    teamName: 'Seoul Orbit Pro',
    dialogues: [
      d('alex_nebula', 'right', 'laughing', 'Dua belokan di udara dan umpan tanpa suara! Coba kejar kombinasi benua ini!'),
      d('raka_pratama', 'left', 'charging', 'Penglihatanku makin lama makin jernih setiap kali bola berputar!'),
    ],
  },
  {
    title: 'Bidak Pertama Sang Raja',
    location: 'Arena Asia Utama',
    summary: 'Menghadapi tim satelit klub Imperial Crown sebelum bertemu langsung Kaiser Noir.',
    rivalId: 'viona_beludak',
    setterId: 'damien_dalang',
    blockerId: 'hera_phoenix',
    teamName: 'Imperial Crown Vanguard',
    dialogues: [
      d('damien_dalang', 'right', 'confident', 'Kaiser Noir ingin melihat apakah kalian layak berhadapan langsung dengannya di babak akhir Asia.'),
      d('raka_pratama', 'left', 'angry', 'Katakan padanya kami bukan bidak! Kami datang untuk membalikkan seluruh papan caturnya!'),
    ],
  },
  {
    title: 'Api Phoenix Tak Pernah Padam',
    location: 'Stadion Asia 2',
    summary: 'Duel ketahanan panjang menghadapi pertahanan mutlak dan kebangkitan bertubi-tubi.',
    rivalId: 'renji_bara',
    setterId: 'aris_chameleon',
    blockerId: 'hera_phoenix',
    teamName: 'Shanghai Phoenix',
    dialogues: [
      d('hera_phoenix', 'right', 'charging', 'Reli ke-20! Ayo lihat siapa yang jatuh lebih dulu!'),
      d('raka_pratama', 'left', 'determined', 'Kaki kami tidak akan berhenti sebelum bola menempel di lantai kalian!'),
    ],
  },
  {
    title: 'Bayangan Jam Sang Pengendali',
    location: 'Lorong Stadion Asia',
    summary: 'Chronos Vex muncul sebagai pengamat misterius dari klub juara dunia, memperingatkan soal bakat Raka.',
    rivalId: 'valen_meteor',
    setterId: 'splus_chronos_vex',
    blockerId: 'citra_pegasus',
    teamName: 'Tim Pengamat Astral',
    dialogues: [
      d('splus_chronos_vex', 'right', 'whisper', 'Menarik... ritme napasmu mulai berdetak di luar alur waktu normal, anak muda.', 'Menatap arloji kosmik'),
      d('raka_pratama', 'left', 'shocked', 'Siapa orang ini?! Hanya dengan melemparkan umpan latihan, waktu seakan berhenti sesaat!'),
      d('splus_chronos_vex', 'right', 'confident', 'Jika kau berhasil menaklukkan Raja Skakmat Asia, temui aku di Kejuaraan Dunia.'),
    ],
  },
  {
    title: 'Perempat Final Asia: Badai Naga Kecil',
    location: 'Arena Utama Asia',
    summary: 'Murid Ryuga Drakon menantang Raka dengan versi awal pukulan Taring Naga.',
    rivalId: 'drago_cerberus',
    setterId: 'damien_dalang',
    blockerId: 'valen_meteor',
    teamName: 'Dragon Academy Asia',
    dialogues: [
      d('drago_cerberus', 'right', 'angry', 'Jika kau bahkan kesulitan melawan taringku, jangan bermimpi menatap Kaisar Naga Ryuga!'),
      d('raka_pratama', 'left', 'charging', 'Ayo! Tunjukkan seberapa buas taring naga kalian!'),
    ],
  },
  {
    title: 'Semifinal Asia: Pengendali Benang vs Raja',
    location: 'Arena Utama Asia',
    summary: 'Pertarungan taktis untuk menembus pertahanan berlapis dan merebut tiket final Asia.',
    rivalId: 'kenji_katana',
    setterId: 'damien_dalang',
    blockerId: 'valen_meteor',
    teamName: 'Klub Pro Crimson',
    dialogues: [
      d('kenji_katana', 'right', 'determined', 'Ini semifinal Asia! Hanya pemenang yang berhak menantang Kaiser Noir di puncak!'),
      d('bagas_setiawan', 'left', 'determined', 'Seluruh kemampuan kita dari SMA hingga pro akan kita pertaruhkan di sini!'),
    ],
  },
  {
    title: 'Tekanan Tahta Imperial Crown',
    location: 'Arena Final Asia',
    summary: 'Babak pembuka menghadapi Intimidasi Raja yang memaksa spiker mengubah arah pukulan.',
    rivalId: 'splus_kaiser_noir',
    setterId: 'aris_chameleon',
    blockerId: 'hera_phoenix',
    teamName: 'Imperial Crown Reserve',
    dialogues: [
      d('splus_kaiser_noir', 'right', 'confident', 'Setiap gerakan kalian sudah tertebak tiga langkah sebelumnya. Mengapa masih berjuang?'),
      d('raka_pratama', 'left', 'injured', 'Gila... bahkan sebelum aku melompat, rasanya semua jalur seranganku sudah terkunci...'),
      d('dimas_perkasa', 'left', 'determined', 'Jangan menatap matanya, Raka! Kami akan mendobrak celah baru untukmu!'),
    ],
  },
  {
    title: 'Menembus Papan Catur',
    location: 'Ruang Ganti Final Asia',
    summary: 'Trio Raka merancang serangan tak terduga di luar teori taktik untuk merusak skema skakmat Kaiser.',
    rivalId: 'valen_meteor',
    setterId: 'damien_dalang',
    blockerId: 'splus_kaiser_noir',
    teamName: 'Imperial Guard',
    dialogues: [
      d('bagas_setiawan', 'left', 'whisper', 'Kalau dia membaca langkah logis, maka kita harus memainkan langkah yang bahkan tidak masuk akal bagi komputer sekalipun!'),
      d('raka_pratama', 'left', 'charging', 'Benar! Biarkan insting liar yang memimpin serangan terakhir kita!'),
    ],
  },
  {
    title: 'FINAL BOSS CH.9: Voli Skakmat Sang Raja',
    location: 'Panggung Grand Final Klub Pro Asia',
    summary: 'Kaiser Noir (S+) turun penuh dengan Intimidasi Raja dan Checkmate Volley demi tahta Asia!',
    rivalId: 'splus_kaiser_noir',
    setterId: 'damien_dalang',
    blockerId: 'splus_kaiser_noir',
    teamName: 'Klub Pro Imperial Crown',
    dialogues: [
      d('splus_kaiser_noir', 'right', 'charging', 'Papan catur telah digelar! Semua pemain di lapangan ini hanyalah pion di bawah kendali Raja!'),
      d('raka_pratama', 'left', 'charging', 'Kalau begitu akan kuhancurkan papan caturmu di atas net ini, Kaiser Noir!'),
      d('splus_kaiser_noir', 'right', 'laughing', 'Coba saja! Mari kita lihat apakah kau sanggup bertahan dari Checkmate Volley hingga poin 21!'),
    ],
  },
];

// CHAPTER 10: Puncak Dunia: Kebangkitan Bakat Tersembunyi (12 Episodes)
const ch10Seeds: EpisodeSeed[] = [
  {
    title: 'Undangan Kejuaraan Dunia Antar-Klub',
    location: 'Grand World Dome',
    summary: 'Menumbangkan Asia mengantar Nusantara Thunder ke Kejuaraan Dunia. Para legenda S+ menunggu di puncak!',
    rivalId: 'drago_cerberus',
    setterId: 'aris_chameleon',
    blockerId: 'valen_meteor',
    teamName: 'Tim Juara Eropa',
    dialogues: [
      d('raka_pratama', 'left', 'confident', 'Akhirnya... panggung tertinggi bola voli di muka bumi!'),
      d('drago_cerberus', 'right', 'laughing', 'Selamat datang di panggung dunia, Raka! Di sini berkumpul Ryuga Drakon dan Chronos Vex—dua monster yang berada di level berbeda!'),
      d('bagas_setiawan', 'left', 'determined', 'Sejauh ini kita melangkah bersama sejak kelas 10. Tidak ada alasan untuk gentar sekarang!'),
    ],
  },
  {
    title: 'Denyut Bakat yang Terpendam',
    location: 'Lapangan Utama World Dome',
    summary: 'Raka mulai merasakan getaran waktu yang aneh di setiap sentuhan bola berkecepatan tinggi.',
    rivalId: 'alex_nebula',
    setterId: 'damien_dalang',
    blockerId: 'hera_phoenix',
    teamName: 'Klub Dunia Amerika',
    dialogues: [
      d('alex_nebula', 'right', 'shocked', 'Apa-apaan refleks Raka itu?! Bola berkecepatan 130 km/jam baru saja ditangkapnya dengan satu tangan sambil tersenyum?!'),
      d('raka_pratama', 'left', 'awakened', 'Bola itu... terlihat melambat tepat di depan mataku...'),
    ],
  },
  {
    title: 'Ujian Para Penguasa Elemen Dunia',
    location: 'World Dome Court 1',
    summary: 'Kombinasi puncak Api, Petir, dan Tsunami dalam kecepatan liga dunia.',
    rivalId: 'renji_bara',
    setterId: 'nadia_kirana',
    blockerId: 'kai_samudra',
    teamName: 'World Elemental All-Stars',
    dialogues: [
      d('renji_bara', 'right', 'charging', 'Kami pun ikut dipanggil memperkuat tim dunia! Jangan biarkan dirimu melemah, Raka!'),
      d('raka_pratama', 'left', 'determined', 'Ayo bertarung habis-habisan di panggung terbaik dunia!'),
    ],
  },
  {
    title: 'Perang Senjata Kelas Dunia',
    location: 'World Dome Court 2',
    summary: 'Railgun, Katana, dan Sniper berpadu dalam satu serangan tanpa jeda.',
    rivalId: 'komandan_zaki',
    setterId: 'angga_umpan',
    blockerId: 'kenji_katana',
    teamName: 'World Arsenal Squad',
    dialogues: [
      d('komandan_zaki', 'right', 'determined', 'Semua senjata taktis sudah mencapai batas maksimal. Mari kita uji ketahananmu sebelum bertemu Chronos Vex!'),
      d('dimas_perkasa', 'left', 'charging', 'Tembok kita sudah menebal sepuluh kali lipat sejak Dome Nasional dulu!'),
    ],
  },
  {
    title: 'Pertemuan Kembali Sang Raja',
    location: 'World Dome Utama',
    summary: 'Kaiser Noir bergabung di turnamen dunia dengan kekuatan penuh tanpa menahan diri.',
    rivalId: 'splus_kaiser_noir',
    setterId: 'damien_dalang',
    blockerId: 'splus_kaiser_noir',
    teamName: 'Imperial Crown World',
    dialogues: [
      d('splus_kaiser_noir', 'right', 'confident', 'Di Asia kau hampir mematahkan papan caturku. Di Kejuaraan Dunia, seluruh pionku berada di level S!'),
      d('raka_pratama', 'left', 'charging', 'Maka kali ini aku akan menumbangkan Rajanya secara langsung!'),
    ],
  },
  {
    title: 'Distorsi Ruang Astral Zero',
    location: 'Arena Pusat World Dome',
    summary: 'Benturan pertama melawan anak buah Chronos Vex yang memainkan umpan minus-tempo.',
    rivalId: 'valen_meteor',
    setterId: 'splus_chronos_vex',
    blockerId: 'valen_meteor',
    teamName: 'Astral Zero Vanguard',
    dialogues: [
      d('splus_chronos_vex', 'right', 'confident', 'Umpan minus-tempo terjadi sebelum otak kalian sempat memproses lompatan spiker. Rasakan selisih dimensi ini.'),
      d('bagas_setiawan', 'left', 'shocked', 'Spiker mereka sudah berada di puncak udara sebelum bola disentuh Chronos?!'),
      d('raka_pratama', 'left', 'whisper', 'Kalau mereka melompat mendahului waktu... aku hanya perlu melihat lebih jauh ke depan daripada waktu itu sendiri!'),
    ],
  },
  {
    title: 'Perempat Final Dunia: Sayap Kaisar Naga',
    location: 'Grand World Dome',
    summary: 'Ryuga Drakon memperlihatkan sekilas pukulan Taring Naga yang meretakkan pertahanan lawan.',
    rivalId: 'splus_s_ryuga_preview',
    setterId: 'aris_chameleon',
    blockerId: 'drago_cerberus',
    teamName: 'Dragon Empire Vanguard',
    dialogues: [
      d('drago_cerberus', 'right', 'confident', 'Bersiaplah! Kaisar Naga sudah menunggumu di babak akhir!'),
      d('raka_pratama', 'left', 'determined', 'Akan kurebut kemenangan ini demi berdiri di hadapan Ryuga dan Chronos!'),
    ],
  },
  {
    title: 'Detik Kritis: Overdrive Reflex',
    location: 'Grand World Dome',
    summary: 'Di bawah tekanan bertubi-tubi, bakat lahiriah Raka mulai memecahkan segel pertamanya.',
    rivalId: 'splus_chronos_vex',
    setterId: 'splus_chronos_vex',
    blockerId: 'valen_meteor',
    teamName: 'Astral Zero (Semi-Inti)',
    dialogues: [
      d('splus_chronos_vex', 'right', 'shocked', 'Mustahil! Bagaimana manusia biasa bisa menyamakan kecepatan minus-tempo Chronos Sync?!'),
      d('raka_pratama', 'left', 'awakened', 'Segalanya... suara sorak penonton, putaran bola, hentakan kaki... semuanya bergerak pelan untukku sekarang!'),
    ],
  },
  {
    title: 'Semifinal Dunia: Ledakan Supernova',
    location: 'Grand World Dome',
    summary: 'Chronos Vex (S+) mengeluarkan kekuatan penuh Supernova Penghenti Waktu di semifinal dunia!',
    rivalId: 'valen_meteor',
    setterId: 'splus_chronos_vex',
    blockerId: 'splus_kaiser_noir',
    teamName: 'Klub Dunia Astral Zero',
    dialogues: [
      d('splus_chronos_vex', 'right', 'charging', 'Jika kau ingin mencapai Final Dunia melawan Ryuga Drakon, lewati dulu Supernova Chronos Judgment milikku!'),
      d('raka_pratama', 'left', 'awakened', 'Bakat yang tertidur dalam diriku sejak kecil... akhirnya mulai bersinar! Ayo, Bagas, Dimas!'),
    ],
  },
  {
    title: 'Pesan dari Masa Lalu',
    location: 'Ruang Ganti Grand Final Dunia',
    summary: 'Mengenang perjalanan dari siswa kelas 10 SMA Harapan Jaya hingga berdiri di Grand Final Dunia.',
    rivalId: 'bima_satria',
    setterId: 'bagas_setiawan',
    blockerId: 'dimas_perkasa',
    teamName: 'Kilas Balik Harapan Jaya',
    dialogues: [
      d('dimas_perkasa', 'left', 'laughing', 'Raka... ingat tidak waktu kita hampir keluar ekskul gara-gara tangan memar di hari pertama?!'),
      d('bagas_setiawan', 'left', 'confident', 'Sekarang seluruh dunia menonton kita di Grand Final Kejuaraan Dunia!'),
      d('raka_pratama', 'left', 'determined', 'Terima kasih telah bertahan bersamaku sampai sini. Mari kita uji semua kenangan kita dalam satu pemanasan terakhir sebelum final!'),
    ],
  },
  {
    title: 'Auman Kaisar Naga Langit',
    location: 'Panggung Grand Final Dunia (Set 1)',
    summary: 'Pertarungan pembuka menghadapi Ryuga Drakon sang Kaisar Naga dengan kekuatan penghancur mutlak.',
    rivalId: 'splus_ryuga_drakon',
    setterId: 'aris_chameleon',
    blockerId: 'drago_cerberus',
    teamName: 'Dragon Empire (Skuad Naga)',
    dialogues: [
      d('splus_ryuga_drakon', 'right', 'laughing', 'Hahaha! Akhirnya ada penantang yang mampu menembus Skakmat Kaiser dan Waktu Chronos!'),
      d('raka_pratama', 'left', 'charging', 'Ryuga Drakon! Aku bukan hanya bertarung untuk trofi—aku bertarung untuk menembus langitmu!'),
      d('splus_ryuga_drakon', 'right', 'charging', 'Maka buktikan apakah taringmu cukup tajam melawan Auman Naga Langit!'),
    ],
  },
  {
    title: 'FINAL BOSS CH.10: Kebangkitan Bakat Chrono-Genesis',
    location: 'Grand Final Kejuaraan Dunia Antar-Klub',
    summary: 'Pertarungan pamungkas melawan tiga kekuatan S+ sekaligus! Bakat tersembunyi Raka bangkit sepenuhnya!',
    rivalId: 'splus_ryuga_drakon',
    setterId: 'splus_chronos_vex',
    blockerId: 'splus_kaiser_noir',
    teamName: 'Tim Legenda Dunia S+ (Dragon-Chronos-Kaiser)',
    unlocksAwakening: true,
    dialogues: [
      d('splus_ryuga_drakon', 'right', 'charging', 'Ini adalah puncak tertinggi dunia voli! Aku, Chronos, dan Kaiser berdiri di satu sisi lapangan yang sama!'),
      d('splus_chronos_vex', 'right', 'confident', 'Tidak ada tim mana pun yang pernah mencetak 21 poin menghadapi kombinasi tiga S+.'),
      d('splus_kaiser_noir', 'right', 'determined', 'Tunjukkan kepada kami bakat tersembunyi yang kau bawa dari lapangan sekolah kecilmu itu, Raka Pratama!'),
      d('raka_pratama', 'left', 'awakened', 'Dari seorang siswa kelas 10 yang sekadar ikut ekskul... hingga berdiri di puncak dunia bersama sahabatku...'),
      d('raka_pratama', 'left', 'awakened', 'Batas waktu telah patah! Saksikan kebangkitan penuh bakatku—CHRONO-GENESIS!', 'Aura Emas & Biru Meledak'),
    ],
  },
];

// Fix minor id typo in ch10 ep 7 seed
ch10Seeds[6].rivalId = 'drago_cerberus';

export const CHAPTERS_PART_2: StoryChapter[] = [
  {
    chapterNumber: 6,
    title: 'Babak Baru: Liga Mahasiswa Divisi 2',
    era: 'Universitas · Divisi 2',
    description:
      'Memasuki dunia kuliah, Raka menghadapi senior kampus yang keras serta ancaman cambuk mematikan Viona Beludak.',
    accentColor: '#84CC16',
    episodes: ch6Seeds.map((s, i) => buildEpisode(6, i + 1, s, 64)),
  },
  {
    chapterNumber: 7,
    title: 'Turnamen Kampus Nasional',
    era: 'Universitas · Divisi Utama',
    description:
      'Persaingan antar-universitas terbaik yang dipenuhi teknik kosmik dan manipulasi psikis Damien sang Dalang.',
    accentColor: '#A855F7',
    episodes: ch7Seeds.map((s, i) => buildEpisode(7, i + 1, s, 78)),
  },
  {
    chapterNumber: 8,
    title: 'Draft Liga Pro: Pintu Dunia Profesional',
    era: 'Klub Pro · Liga Nusantara',
    description:
      'Direkrut klub pro Nusantara Thunder, Raka harus menembus pertahanan Black Hole Dig milik Valen Kosmos.',
    accentColor: '#6366F1',
    episodes: ch8Seeds.map((s, i) => buildEpisode(8, i + 1, s, 92)),
  },
  {
    chapterNumber: 9,
    title: 'Kejuaraan Klub Pro Asia',
    era: 'Klub Pro · Tingkat Benua Asia',
    description:
      'Pertarungan benua menghadapi para ace terbaik Asia dan sang Raja Skakmat S+, Kaiser Noir.',
    accentColor: '#FB7185',
    episodes: ch9Seeds.map((s, i) => buildEpisode(9, i + 1, s, 108)),
  },
  {
    chapterNumber: 10,
    title: 'Puncak Dunia: Bakat Tersembunyi Bangkit',
    era: 'Kejuaraan Dunia · Puncak Legenda',
    description:
      'Melawan para dewa lapangan S+ di panggung dunia, bakat lahiriah Chrono-Genesis milik Raka akhirnya bangkit sempurna!',
    accentColor: '#FACC15',
    episodes: ch10Seeds.map((s, i) => buildEpisode(10, i + 1, s, 124)),
  },
];
