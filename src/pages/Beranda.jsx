import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, LogIn, Video, Download, Monitor, Apple, Share, SquarePlus, X, BookOpen, IdCard, Wallet, MessageCircle, Settings, Users, ShoppingBag, Phone, Send, Fish, Shell, Shirt, Pencil, Building2, Landmark, Megaphone, FileText, Library, ClipboardCheck } from 'lucide-react'
// PENTING: sesuaikan path import ini dengan lokasi client Supabase Anda
// yang sudah ada di project (biasanya di src/lib/ atau src/services/).
import { supabase } from '../lib/supabaseClient'
// Widget "Tanya AI" — ditempatkan di pojok KIRI bawah supaya tidak
// bertabrakan dengan tombol WhatsApp/Live Chat yang sudah ada di kanan bawah.
// Sesuaikan path import ini dengan lokasi file TanyaAI.jsx di project Anda.
import TanyaAI from '../components/TanyaAI'

// Halaman utama publik (landing page) — ditampilkan di "/" untuk pengunjung
// yang belum login. Tombol "Daftar" & "Masuk" mengarah ke rute React Router
// internal (/register, /login), BUKAN link keluar ke domain lain.
//
// Tema visual: navy-indigo sebagai identitas brand, motif batik emas tipis
// sebagai overlay, satu warna aksen oranye untuk aksi utama, dan satu warna
// biru langit terpisah khusus untuk fitur Toko Sekolah (menandakan area yang
// bisa diakses tanpa login). Area 1-6 dibedakan lewat warna datar yang lebih
// bersahaja (bukan gradasi terang) supaya tetap mudah dipindai tanpa terasa
// seperti pelangi. Gerakan dibatasi pada satu momen saja (ring di tombol
// kontak mengambang) — bukan berkedip/berputar/berjalan di banyak tempat
// sekaligus, supaya situs terasa tepercaya untuk sistem resmi sekolah & kantor.
//
// DUA INSTANSI: halaman ini melayani dua mitra tetap — Sekolah dan KUA
// (Kantor Urusan Agama) — bukan platform pendaftaran terbuka untuk banyak
// instansi sembarang. Karena itu semua copy di bawah SENGAJA menyebut
// "Sekolah & KUA" secara eksplisit, dan modul yang sifatnya khusus
// pendidikan diberi badge "Khusus sekolah" supaya pengguna dari KUA tidak
// salah ekspektasi.

const NOMOR_WA_ADMIN = '6282197574897'

// Foto/ilustrasi "Ibu Guru" yang dipakai sebagai logo tombol kontak
// mengambang & header panel Live Chat, menggantikan ikon generik. Taruh
// file gambarnya di folder public proyek Anda dengan nama persis di bawah
// ini — ganti nama filenya di sini kalau nama file Anda berbeda.
const FOTO_ADMIN_CHAT = '/ibu-guru-chat.jpg'

// ============================================================
// DATA AREA — sumber tunggal untuk tile & kartu di bagian "area".
//
// untuk : jenis instansi yang melihat area ini. Nilainya harus cocok dengan
//         id di OPSI_UNTUK di bawah. Untuk menambah jenis instansi baru
//         (mis. puskesmas): tambah satu entri di OPSI_UNTUK, lalu isi
//         `untuk` di area yang relevan.
// items : string  -> tampil untuk semua jenis instansi pemilik area.
//         {t, u}  -> hanya tampil bila jenis instansi yang dipilih ada di `u`
//                    (pada tampilan "Semua", semuanya tampil).
// link  : bila diisi, tile & kartu menjadi tautan (dipakai Toko Sekolah).
//
// Nama modul KUA di bawah mengikuti rute di App.jsx.
// ============================================================
const OPSI_UNTUK = [
  { id: 'semua', label: 'Semua' },
  { id: 'sekolah', label: 'Sekolah' },
  { id: 'kua', label: 'KUA' },
]

const DAFTAR_AREA = [
  {
    id: 'akademik', warna: '#2E5AAC', ikon: BookOpen, untuk: ['sekolah'],
    nama: 'Akademik & Ujian', judul: 'Akademik & ujian',
    items: [
      'Ujian online & bank soal',
      'Kuis seru untuk kelas rendah',
      'Nilai, rapor & nilai asesmen',
      'RPP & arsip RPP guru',
      'Portofolio & sertifikat siswa',
      'Perpustakaan digital',
    ],
  },
  {
    id: 'admin-siswa', warna: '#1F7A5C', ikon: IdCard, untuk: ['sekolah'],
    nama: 'Administrasi Siswa', judul: 'Administrasi siswa',
    items: [
      'Data siswa, kelas & jadwal',
      'Presensi harian',
      'Kartu siswa, ijazah & SKL',
      'Pendaftaran siswa baru (PPDB) online',
      'Pengajuan surat & perbaikan data',
    ],
  },
  {
    id: 'penyuluhan', warna: '#2F7D32', ikon: Megaphone, untuk: ['kua'],
    nama: 'Layanan Penyuluhan', judul: 'Layanan penyuluhan',
    items: [
      'Laporan penyuluhan masyarakat bermoral & harmonis',
      'RKTP Penyuluh Agama (rencana kerja tahunan)',
      'Pusat & pengelolaan kelompok binaan',
    ],
  },
  {
    id: 'kepenghuluan', warna: '#7A4B1E', ikon: FileText, untuk: ['kua'],
    nama: 'Kepenghuluan & Nikah', judul: 'Kepenghuluan & nikah',
    items: [
      'Pendaftaran nikah online untuk jamaah & pegawai',
      'Verifikasi pengajuan nikah oleh Kepala KUA',
      'Laporan kepenghuluan bulanan',
    ],
  },
  {
    id: 'materi-majelis', warna: '#5B6B1A', ikon: Library, untuk: ['kua'],
    nama: 'Pusat Materi Majelis', judul: 'Pusat materi majelis',
    items: [
      'Keluarga sakinah',
      'Pengelolaan zakat & wakaf',
      'Akhlak & moderasi beragama',
      'Materi majelis taklim',
    ],
  },
  {
    id: 'laporan-kua', warna: '#3B4A8C', ikon: ClipboardCheck, untuk: ['kua'],
    nama: 'Laporan & Perencanaan', judul: 'Laporan & perencanaan KUA',
    items: [
      'Laporan Kepala KUA dengan tanda tangan otomatis',
      'Laporan bulanan KUA',
      'Rencana kerja tahunan',
      'Ringkasan aset: inventaris & kondisi bangunan',
    ],
  },
  {
    id: 'keuangan', warna: '#B15A17', ikon: Wallet, untuk: ['sekolah', 'kua'],
    nama: 'Keuangan Sekolah & KUA', judul: 'Keuangan sekolah & KUA',
    items: [
      { t: 'Keuangan sekolah & kas kelas', u: ['sekolah'] },
      { t: 'Keuangan & anggaran KUA', u: ['kua'] },
      'Kuitansi & nota otomatis',
      'Laporan bulanan',
      'Backup data terjadwal',
    ],
  },
  {
    id: 'komunikasi', warna: '#6B4FA0', ikon: MessageCircle, untuk: ['sekolah', 'kua'],
    nama: 'Komunikasi', judul: 'Komunikasi & publikasi',
    items: [
      'Pengumuman & agenda',
      { t: 'Pesan langsung antar warga sekolah', u: ['sekolah'] },
      { t: 'Pesan langsung antar staf KUA', u: ['kua'] },
      'Rapat online lewat video',
      'Galeri foto kegiatan',
      'Scan dokumen jadi Word',
      'Surat & surat keterangan resmi',
    ],
  },
  {
    id: 'manajemen', warna: '#146B71', ikon: Settings, untuk: ['sekolah', 'kua'],
    nama: 'Manajemen Sekolah & KUA', judul: 'Manajemen sekolah & KUA',
    items: [
      { t: 'Data guru & inventaris sekolah', u: ['sekolah'] },
      { t: 'Data pegawai, presensi & daftar hadir KUA', u: ['kua'] },
      { t: 'Inventaris & kondisi bangunan KUA', u: ['kua'] },
      { t: 'Profil & identitas sekolah', u: ['sekolah'] },
      { t: 'Profil kantor, kop surat & tanda tangan otomatis', u: ['kua'] },
      'Kalender kerja & hari libur',
      'Persetujuan akun pengguna baru',
    ],
  },
  {
    id: 'orang-tua', warna: '#A23E56', ikon: Users, untuk: ['sekolah'],
    nama: 'Portal Orang Tua', judul: 'Portal orang tua',
    items: [
      'Pantau rapor & nilai anak',
      'Presensi & portofolio anak',
      'Galeri foto khusus orang tua',
    ],
  },
  {
    id: 'toko', warna: '#0F6FA3', ikon: ShoppingBag, untuk: ['sekolah'],
    nama: 'Toko Sekolah', judul: 'Toko sekolah',
    link: '/toko', tanpaLogin: true, ctaLabel: 'Buka Toko Sekolah',
    items: [
      'Belanja kebutuhan sekolah secara online',
      'Keranjang, checkout & riwayat pesanan',
      'Kelola pesanan masuk & pencairan dana untuk penjual',
    ],
  },
]

function BatikOverlay({ patternId, strokeColor = '#d4af37', opacity = 1, size = 72 }) {
  return (
    <svg className="batik-overlay" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(8)"
        >
          <g fill="none" stroke={strokeColor} strokeWidth="1.1" opacity={opacity}>
            <ellipse cx={size / 2} cy={size * 0.333} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size / 2} cy={size * 0.667} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size * 0.333} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <ellipse cx={size * 0.667} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <circle cx={size / 2} cy={size / 2} r={size * 0.042} opacity="0.7" />
          </g>
          <path
            d={`M0 ${size} L${size * 0.25} ${size * 0.75} L${size * 0.5} ${size} L${size * 0.75} ${size * 0.75} L${size} ${size}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.8"
            opacity={opacity * 0.35}
          />
          <path
            d={`M0 0 L${size * 0.25} ${size * 0.25} L0 ${size * 0.5}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.8"
            opacity={opacity * 0.3}
          />
          <circle cx={size * 0.11} cy={size * 0.11} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
          <circle cx={size * 0.89} cy={size * 0.22} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
          <circle cx={size * 0.22} cy={size * 0.89} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

export default function Beranda() {
  const navigate = useNavigate()

  // Jenis instansi yang sedang dilihat pengunjung: Semua / Sekolah / KUA.
  // Disimpan di URL (?untuk=kua) supaya bisa dibagikan — mis. link khusus
  // untuk KUA: https://situs-anda/?untuk=kua
  const [searchParams, setSearchParams] = useSearchParams()
  const paramUntuk = searchParams.get('untuk')
  const untuk = OPSI_UNTUK.some((o) => o.id === paramUntuk) ? paramUntuk : 'semua'
  function pilihUntuk(id) {
    setSearchParams(id === 'semua' ? {} : { untuk: id }, { replace: true })
  }
  const areaTampil = DAFTAR_AREA
    .filter((a) => untuk === 'semua' || a.untuk.includes(untuk))
    .map((a, i) => ({
      ...a,
      nomor: i + 1,
      daftarItem: a.items
        .filter((it) => typeof it === 'string' || untuk === 'semua' || it.u.includes(untuk))
        .map((it) => (typeof it === 'string' ? it : it.t)),
    }))
  // Gabung rapat langsung dari beranda lewat link/kode yang dibagikan
  // host (misal lewat WhatsApp). Menerima link penuh (.../rapat/xxxx) atau
  // kode ruangan saja.
  const [kodeRapat, setKodeRapat] = useState('')
  // Panduan instal untuk iPhone/iPad — Apple tidak punya file installer
  // seperti APK/MSIX, jadi guru pengguna iOS dituntun lewat panduan manual
  // (Safari > Share > Tambah ke Layar Utama) alih-alih tombol download.
  const [showIosGuide, setShowIosGuide] = useState(false)

  // Menu pilihan kontak (WhatsApp / Live Chat) dari tombol mengambang.
  const [showFabMenu, setShowFabMenu] = useState(false)
  const [showLiveChat, setShowLiveChat] = useState(false)

  // Live chat — pesan pengunjung disimpan ke tabel Supabase
  // "live_chat_pesan" supaya langsung muncul di aplikasi/dashboard admin.
  // Setiap pengunjung punya sesi_id unik (disimpan di localStorage) agar
  // balasan admin bisa diarahkan ke percakapan yang tepat.
  const [namaPengunjung, setNamaPengunjung] = useState(
    () => localStorage.getItem('simak_nama_pengunjung') || ''
  )
  const [inputNama, setInputNama] = useState('')
  const [sesiId] = useState(() => {
    let id = localStorage.getItem('simak_sesi_chat')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('simak_sesi_chat', id)
    }
    return id
  })
  const [pesanList, setPesanList] = useState([])
  const [pesanBaru, setPesanBaru] = useState('')
  const [mengirim, setMengirim] = useState(false)
  const chatBodyRef = useRef(null)

  // Ambil riwayat chat + dengarkan pesan baru (balasan admin) secara realtime
  // begitu panel live chat dibuka dan pengunjung sudah mengisi nama.
  useEffect(() => {
    if (!showLiveChat || !namaPengunjung) return

    let aktif = true

    async function muatRiwayat() {
      const { data, error } = await supabase
        .from('live_chat_pesan')
        .select('*')
        .eq('sesi_id', sesiId)
        .order('dibuat_pada', { ascending: true })
      if (!error && aktif && data) setPesanList(data)
    }
    muatRiwayat()

    const channel = supabase
      .channel(`live-chat-${sesiId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_pesan',
          filter: `sesi_id=eq.${sesiId}`,
        },
        (payload) => {
          setPesanList((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      aktif = false
      supabase.removeChannel(channel)
    }
  }, [showLiveChat, namaPengunjung, sesiId])

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight
    }
  }, [pesanList, showLiveChat])

  function mulaiLiveChat(e) {
    e.preventDefault()
    const nama = inputNama.trim()
    if (!nama) return
    localStorage.setItem('simak_nama_pengunjung', nama)
    setNamaPengunjung(nama)
  }

  async function kirimPesanLiveChat(e) {
    e.preventDefault()
    const isi = pesanBaru.trim()
    if (!isi || mengirim) return
    setMengirim(true)
    setPesanBaru('')
    const { error } = await supabase.from('live_chat_pesan').insert({
      sesi_id: sesiId,
      nama_pengirim: namaPengunjung,
      pengirim: 'pengunjung',
      pesan: isi,
    })
    if (error) {
      // Kembalikan teks ke input kalau gagal terkirim, supaya tidak hilang
      setPesanBaru(isi)
    }
    setMengirim(false)
  }

  function gabungRapat(e) {
    e.preventDefault()
    const nilai = kodeRapat.trim()
    if (!nilai) return
    const cocokRute = nilai.match(/\/rapat\/([^/?#]+)/)
    const roomId = cocokRute ? cocokRute[1] : nilai
    navigate(`/rapat/${roomId}`)
  }

  return (
    <div className="beranda-canvas">
      <div className="beranda-wrap">

        <div className="beranda-side">
          <div className="side-avatar">S</div>
          <div className="side-dot active"></div>
          <div className="side-dot"></div>
          <div className="side-dot"></div>
          <div className="side-dot"></div>
          <div className="side-dot"></div>
          <div className="side-dot"></div>
        </div>

        <div className="beranda-main">

          <div className="beranda-header">
            <BatikOverlay patternId="batikHero" strokeColor="#d4af37" opacity={0.9} />

            <div className="header-content">
              <div className="brand-logo">
                <div className="brand-logo-icon"><Landmark size={22} strokeWidth={2.5} /></div>
                <span className="brand-logo-text">SIMAK</span>
                {/* Badge kecil di samping logo menandaskan bahwa platform ini
                    sekarang melayani dua jenis pendaftar: sekolah & kantor. */}
                <span className="brand-logo-badge">
                  <Building2 size={11} strokeWidth={2.6} />
                  Sekolah &amp; KUA
                </span>
              </div>
              <h1 className="beranda-title">Satu aplikasi, untuk Sekolah &amp; KUA</h1>
              <p className="beranda-sub">
                Sistem informasi terpadu untuk Sekolah dan Kantor Urusan Agama (KUA), dengan{' '}
                {DAFTAR_AREA.length} area utama dan puluhan modul siap pakai — dari akademik dan
                administrasi siswa, penyuluhan dan kepenghuluan, hingga keuangan, komunikasi,
                dan laporan pimpinan.
              </p>
              <div className="header-actions">
                <Link to="/register" className="btn-primary">
                  Daftar sekarang
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
                <Link to="/login" className="btn-ghost">
                  <LogIn size={15} strokeWidth={2.5} />
                  Sudah punya akun? Masuk
                </Link>
                {/* Link ke Toko Sekolah — sengaja pakai <Link> biasa (bukan
                    tombol instal/daftar) supaya pengunjung publik bisa
                    langsung lihat-lihat toko TANPA perlu login/daftar dulu.
                    Route "/toko" memang sudah publik di App.jsx. Diberi
                    gaya outline (bukan solid) supaya tidak bersaing dengan
                    CTA utama "Daftar sekarang". */}
                <Link to="/toko" className="btn-outline-toko">
                  <ShoppingBag size={16} strokeWidth={2.5} />
                  Lihat Toko Sekolah
                </Link>
              </div>

              <div className="install-row">
                <span className="install-label">Instal aplikasi:</span>
                <a href="/simak-app.apk" download className="install-chip">
                  <Download size={14} strokeWidth={2.4} />
                  Android
                </a>
                <a href="/simak-app-windows.msix" download className="install-chip">
                  <Monitor size={14} strokeWidth={2.4} />
                  Windows
                </a>
                <button
                  type="button"
                  onClick={() => setShowIosGuide(true)}
                  className="install-chip"
                >
                  <Apple size={14} strokeWidth={2.4} />
                  iPhone/iPad
                </button>
              </div>
            </div>
          </div>

          <div className="aru-banner">
            <div className="aru-icon"><Users size={20} /></div>
            <p className="aru-text">
              Salam hangat untuk Bapak/Ibu Guru dan staf KUA (Kantor Urusan Agama) di Kabupaten
              Kepulauan Aru — SIMAK dibuat untuk membantu sekolah maupun KUA Anda mengelola data
              lebih ringan, dari ruang kelas hingga meja kerja.
            </p>
          </div>

          <div className="meet-join">
            <div className="meet-icon"><Video size={18} /></div>
            <div className="meet-text">
              <p className="meet-title">Sudah punya link rapat/miting?</p>
              <p className="meet-sub">Tempel link atau kode ruangan yang dibagikan oleh host untuk langsung bergabung.</p>
            </div>
            <form className="meet-form" onSubmit={gabungRapat}>
              <input
                type="text"
                value={kodeRapat}
                onChange={(e) => setKodeRapat(e.target.value)}
                placeholder="Tempel link atau kode ruangan"
                className="meet-input"
              />
              <button type="submit" className="meet-btn" disabled={!kodeRapat.trim()}>
                Gabung
              </button>
            </form>
          </div>

          <div className="area-showcase">
            {/* Ilustrasi kelas ditampilkan sangat samar sebagai latar
                dekoratif, statis (tanpa animasi timbul-tenggelam). Letakkan
                file kelas-ilustrasi.png di folder public proyek Anda. */}
            <img
              src="/kelas-ilustrasi.png"
              alt=""
              aria-hidden="true"
              className="area-bg-image"
            />

            <div className="area-showcase-heading">
              <h2 className="area-showcase-title">
                {untuk === 'kua'
                  ? `${areaTampil.length} area untuk KUA`
                  : untuk === 'sekolah'
                    ? `${areaTampil.length} area untuk Sekolah`
                    : `${areaTampil.length} area, untuk Sekolah & KUA`}
              </h2>
              <p className="area-showcase-sub">
                {untuk === 'semua' ? (
                  <>
                    Pilih jenis instansi Anda untuk melihat modul yang tersedia. Badge{' '}
                    <span className="badge-sekolah-inline">Khusus sekolah</span> dan{' '}
                    <span className="badge-kua-inline">Khusus KUA</span> menandai modul yang hanya
                    tampil untuk jenis akun tersebut.
                  </>
                ) : (
                  <>
                    Semua modul di bawah tersedia untuk akun {untuk === 'kua' ? 'KUA' : 'sekolah'}.
                    Kewenangan tiap pengguna (admin, kepala, pegawai) diatur setelah login.
                  </>
                )}
              </p>
              <div className="aud-switch" role="tablist" aria-label="Pilih jenis instansi">
                {OPSI_UNTUK.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="tab"
                    aria-selected={untuk === o.id}
                    className={`aud-btn${untuk === o.id ? ' active' : ''}`}
                    onClick={() => pilihUntuk(o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="tile-strip">
              {areaTampil.map((a) => {
                const Ikon = a.ikon
                // Badge "Khusus ..." hanya perlu di tampilan Semua — kalau
                // sudah difilter, badge itu redundan.
                const badgeJenis =
                  untuk === 'semua' && !a.tanpaLogin && a.untuk.length === 1 ? a.untuk[0] : null
                const isi = (
                  <>
                    {badgeJenis === 'sekolah' && <span className="tile-badge-sekolah">Khusus sekolah</span>}
                    {badgeJenis === 'kua' && <span className="tile-badge-kua">Khusus KUA</span>}
                    {a.tanpaLogin && <span className="tile-toko-badge">Tanpa login</span>}
                    <div className="tile-icon"><Ikon size={15} strokeWidth={2.4} /></div>
                    <p className="tile-label">Area {a.nomor}</p>
                    <p className="tile-name">{a.nama}</p>
                  </>
                )
                return a.link ? (
                  <Link
                    key={a.id}
                    to={a.link}
                    className="tile tile-link tile-toko"
                    style={{ background: a.warna }}
                  >
                    {isi}
                  </Link>
                ) : (
                  <div key={a.id} className="tile" style={{ background: a.warna }}>
                    {isi}
                  </div>
                )
              })}
            </div>

            <div className="cat-section">
              {areaTampil.map((a) => {
                const Ikon = a.ikon
                const badgeJenis =
                  untuk === 'semua' && !a.tanpaLogin && a.untuk.length === 1 ? a.untuk[0] : null
                const judul = (
                  <h2 className="cat-title">
                    <Ikon size={17} strokeWidth={2.2} className="cat-icon" style={{ color: a.warna }} />
                    {a.judul}
                  </h2>
                )
                const daftar = (
                  <ul className="cat-list" style={{ '--accent': a.warna }}>
                    {a.daftarItem.map((teks) => (
                      <li key={teks}>{teks}</li>
                    ))}
                  </ul>
                )

                if (a.link) {
                  // Kartu berupa tautan (Toko Sekolah): border biru tipis +
                  // badge "Tanpa login" statis, panah CTA bergeser saat di-hover.
                  return (
                    <Link key={a.id} to={a.link} className="cat-card wide cat-card-link cat-card-toko">
                      <span className="cat-card-toko-badge">Tanpa login</span>
                      <span className="cat-tag" style={{ background: a.warna }}>
                        Area {a.nomor} — bisa diakses tanpa login
                      </span>
                      {judul}
                      {daftar}
                      <span className="cat-card-link-cta">
                        {a.ctaLabel}
                        <ArrowRight size={14} strokeWidth={2.5} className="cat-card-cta-arrow" />
                      </span>
                      {/* Ikon dekoratif produk toko (hasil laut, pakaian, ATK) —
                          statis dan samar, merujuk pada hasil bumi/laut khas
                          Kepulauan Aru yang bisa dijual lewat toko ini. */}
                      <span className="cat-card-toko-deco" aria-hidden="true">
                        <Fish size={22} strokeWidth={2} className="deco-icon" />
                        <Shell size={18} strokeWidth={2} className="deco-icon deco-icon-kerang" />
                        <Shirt size={22} strokeWidth={2} className="deco-icon deco-icon-pakaian" />
                        <Pencil size={18} strokeWidth={2} className="deco-icon deco-icon-atk" />
                      </span>
                    </Link>
                  )
                }

                return (
                  <div key={a.id} className="cat-card">
                    <span className="cat-tag" style={{ background: a.warna }}>Area {a.nomor}</span>
                    {badgeJenis === 'sekolah' && <span className="cat-card-badge-sekolah">Khusus sekolah</span>}
                    {badgeJenis === 'kua' && <span className="cat-card-badge-kua">Khusus KUA</span>}
                    {judul}
                    {daftar}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="beranda-footer">
            <BatikOverlay patternId="batikFooter" strokeColor="#d4af37" opacity={0.7} size={56} />
            <div className="footer-content">
              <div>
                <p className="beranda-footer-title">Tertarik menerapkannya di sekolah atau KUA Anda?</p>
                <p className="beranda-footer-sub">Gratis selama masa promo berlaku. Daftar akun untuk sekolah maupun KUA Anda sekarang.</p>
              </div>
              <Link to="/register" className="beranda-cta">
                Daftar sekarang
                <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Modal panduan instal untuk iPhone/iPad, muncul saat tombol
          "iPhone/iPad" diklik. */}
      {showIosGuide && (
        <div className="ios-overlay" onClick={() => setShowIosGuide(false)}>
          <div className="ios-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ios-modal-header">
              <h3 className="ios-modal-title">Cara instal di iPhone/iPad</h3>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="ios-modal-close"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>
            <p className="ios-modal-sub">
              Apple belum mengizinkan instal 1 klik seperti Android/Windows, jadi ikuti 3 langkah singkat ini lewat Safari.
            </p>
            <ol className="ios-steps">
              <li>
                <span className="ios-step-num">1</span>
                <span>Buka <strong>www.simaksdnwaria.site</strong> lewat browser <strong>Safari</strong> (bukan Chrome).</span>
              </li>
              <li>
                <span className="ios-step-num">2</span>
                <span>Tap ikon <strong>Share</strong> <Share size={14} className="ios-inline-icon" /> di bagian bawah layar.</span>
              </li>
              <li>
                <span className="ios-step-num">3</span>
                <span>Scroll lalu pilih <strong>Tambah ke Layar Utama</strong> <SquarePlus size={14} className="ios-inline-icon" />, lalu tap <strong>Tambah</strong>.</span>
              </li>
            </ol>
            <p className="ios-modal-note">Setelah itu, ikon SIMAK akan muncul di layar utama seperti aplikasi biasa.</p>
          </div>
        </div>
      )}

      {/* Tombol kontak mengambang — tap untuk memilih WhatsApp atau
          Live Chat. Nomor WA memakai konstanta NOMOR_WA_ADMIN di atas.
          Ring di sekeliling tombol adalah satu-satunya animasi berulang
          yang dipertahankan di halaman ini — dipakai khusus untuk menarik
          perhatian ke titik kontak, bukan disebar ke banyak elemen. */}
      <div className="contact-fab-wrap">
        {showFabMenu && (
          <div className="fab-menu">
            <a
              href={`https://wa.me/${NOMOR_WA_ADMIN}?text=Halo%20SIMAK%2C%20saya%20ingin%20bertanya`}
              target="_blank"
              rel="noopener noreferrer"
              className="fab-menu-item"
              onClick={() => setShowFabMenu(false)}
            >
              <span className="fab-menu-icon fab-menu-icon-wa"><Phone size={17} strokeWidth={2.4} fill="currentColor" /></span>
              WhatsApp
            </a>
            <button
              type="button"
              className="fab-menu-item"
              onClick={() => {
                setShowFabMenu(false)
                setShowLiveChat(true)
              }}
            >
              <span className="fab-menu-icon fab-menu-icon-chat">
                <img src={FOTO_ADMIN_CHAT} alt="" className="fab-menu-icon-img" />
              </span>
              Live Chat
            </button>
          </div>
        )}

        <button
          type="button"
          className="wa-fab"
          aria-label="Hubungi kami"
          onClick={() => setShowFabMenu((v) => !v)}
        >
          {showFabMenu ? (
            <X size={24} strokeWidth={2.4} />
          ) : (
            <img src={FOTO_ADMIN_CHAT} alt="Hubungi kami" className="wa-fab-avatar" />
          )}
          {!showFabMenu && <span className="wa-fab-ring"></span>}
        </button>
      </div>

      {/* Panel live chat. Pesan pengunjung tersimpan ke tabel Supabase
          "live_chat_pesan" sehingga langsung masuk ke aplikasi/dashboard
          admin. */}
      {showLiveChat && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div className="chat-panel-title">
              <img src={FOTO_ADMIN_CHAT} alt="" className="chat-panel-avatar" />
              Live Chat SIMAK
            </div>
            <button
              type="button"
              className="chat-panel-close"
              onClick={() => setShowLiveChat(false)}
              aria-label="Tutup live chat"
            >
              <X size={16} />
            </button>
          </div>

          {!namaPengunjung ? (
            <form className="chat-nama-form" onSubmit={mulaiLiveChat}>
              <p className="chat-nama-label">Masukkan nama Anda untuk memulai percakapan:</p>
              <input
                type="text"
                value={inputNama}
                onChange={(e) => setInputNama(e.target.value)}
                placeholder="Nama Anda"
                className="chat-nama-input"
                autoFocus
              />
              <button type="submit" className="chat-nama-btn" disabled={!inputNama.trim()}>
                Mulai Chat
              </button>
            </form>
          ) : (
            <>
              <div className="chat-panel-body" ref={chatBodyRef}>
                {pesanList.length === 0 && (
                  <p className="chat-empty">
                    Halo {namaPengunjung}, silakan tulis pertanyaan Anda. Tim kami akan segera membalas.
                  </p>
                )}
                {pesanList.map((p) => (
                  <div
                    key={p.id}
                    className={`chat-bubble ${p.pengirim === 'admin' ? 'chat-bubble-admin' : 'chat-bubble-user'}`}
                  >
                    {p.pesan}
                  </div>
                ))}
              </div>
              <form className="chat-input-row" onSubmit={kirimPesanLiveChat}>
                <input
                  type="text"
                  value={pesanBaru}
                  onChange={(e) => setPesanBaru(e.target.value)}
                  placeholder="Tulis pesan..."
                  className="chat-input"
                />
                <button type="submit" className="chat-send-btn" disabled={!pesanBaru.trim() || mengirim}>
                  <Send size={16} strokeWidth={2.4} />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Widget Tanya AI — ditempatkan terpisah di pojok KIRI bawah agar
          tidak bertumpuk dengan tombol WhatsApp/Live Chat di kanan bawah.
          Komponen ini sudah mengatur floating button + panel chat-nya
          sendiri (lihat TanyaAI.jsx). */}
      <TanyaAI />

      {/* Style khusus halaman Beranda — pola sama dengan Login.jsx (style
          ditulis inline lewat <style> di dalam komponen). */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .beranda-canvas * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .beranda-canvas {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: #E7E9F5;
          padding: 22px;
          min-height: 100vh;
          touch-action: manipulation;
        }
        .beranda-wrap {
          max-width: 1360px;
          margin: 0 auto;
          display: flex;
          border-radius: 26px;
          overflow: hidden;
          box-shadow: 0 24px 50px rgba(21, 23, 55, 0.18);
          background: #fff;
        }

        .beranda-side {
          width: 68px;
          flex-shrink: 0;
          background: linear-gradient(180deg, #14162C 0%, #2D3072 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 22px 0;
          gap: 16px;
        }
        .side-avatar {
          width: 38px; height: 38px;
          border-radius: 12px;
          background: #E8683F;
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700;
          font-size: 15px;
        }
        .side-dot {
          width: 30px; height: 30px;
          border-radius: 9px;
          background: rgba(255,255,255,0.08);
        }
        .side-dot.active { background: rgba(255,255,255,0.16); }

        .beranda-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #F1F3FA;
          min-width: 0;
        }

        .batik-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .beranda-header {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          background: linear-gradient(120deg, #14162C 0%, #2D3072 100%);
          padding: 34px 36px 28px;
        }
        .header-content { position: relative; }
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 22px;
          flex-wrap: wrap;
        }
        .brand-logo-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: #F2762B;
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .brand-logo-text {
          font-size: 18px;
          font-weight: 800;
          color: #fff;
          letter-spacing: 1px;
        }
        .brand-logo-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          font-weight: 700;
          color: #C9F0FF;
          background: rgba(125, 211, 252, 0.14);
          border: 1px solid rgba(125, 211, 252, 0.35);
          padding: 4px 10px 4px 8px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .beranda-title {
          font-size: 32px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 10px;
          line-height: 1.2;
        }
        .beranda-sub {
          font-size: 14.5px;
          color: #B7BAD6;
          margin: 0 0 24px;
          max-width: 54ch;
          line-height: 1.6;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #F2762B;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 13px 22px;
          min-height: 44px;
          border-radius: 999px;
          white-space: nowrap;
          text-decoration: none;
        }
        .btn-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 13.5px;
          font-weight: 600;
          color: #fff;
          background: rgba(255,255,255,0.1);
          padding: 12px 18px;
          min-height: 44px;
          border-radius: 999px;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.18);
        }
        .btn-outline-toko {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: transparent;
          color: #7DD3FC;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 20px;
          min-height: 44px;
          border-radius: 999px;
          white-space: nowrap;
          text-decoration: none;
          border: 1.5px solid rgba(125, 211, 252, 0.5);
        }
        .install-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 16px;
        }
        .install-label {
          font-size: 12.5px;
          color: #8285A8;
        }
        .install-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 600;
          color: #D8DBF5;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.14);
          padding: 7px 13px;
          border-radius: 999px;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }

        .contact-fab-wrap {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 1100;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }
        .fab-menu {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: #fff;
          border-radius: 16px;
          padding: 8px;
          box-shadow: 0 16px 34px rgba(21, 23, 55, 0.22);
          animation: fabMenuMasuk 0.18s ease-out;
        }
        @keyframes fabMenuMasuk {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fab-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 700;
          color: #171A2E;
          background: none;
          border: none;
          padding: 9px 14px 9px 9px;
          border-radius: 11px;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }
        .fab-menu-item:hover { background: #F1F3FA; }
        .fab-menu-icon {
          width: 30px; height: 30px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
          overflow: hidden;
        }
        .fab-menu-icon-wa { background: #25D366; }
        .fab-menu-icon-chat { background: #4E5FE0; }
        .fab-menu-icon-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .wa-fab {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #4E5FE0;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 26px rgba(78, 95, 224, 0.5);
          border: none;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          padding: 0;
        }
        .wa-fab-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        .wa-fab-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid rgba(78, 95, 224, 0.6);
          animation: waPulse 2.2s ease-out infinite;
          pointer-events: none;
        }
        @keyframes waPulse {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wa-fab-ring { animation: none; }
        }
        @media (max-width: 560px) {
          .contact-fab-wrap { right: 16px; bottom: 16px; }
          .wa-fab { width: 52px; height: 52px; }
        }

        .chat-panel {
          position: fixed;
          right: 24px;
          bottom: 96px;
          width: 320px;
          max-height: 460px;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 20px 44px rgba(21, 23, 55, 0.26);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1100;
          animation: fabMenuMasuk 0.18s ease-out;
        }
        .chat-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(120deg, #14162C 0%, #2D3072 100%);
          color: #fff;
          padding: 14px 16px;
          flex-shrink: 0;
        }
        .chat-panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
        }
        .chat-panel-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        .chat-panel-close {
          width: 28px; height: 28px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: none;
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .chat-nama-form {
          padding: 20px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .chat-nama-label { font-size: 12.5px; color: #5B6172; margin: 0; line-height: 1.5; }
        .chat-nama-input {
          font-size: 14px;
          padding: 11px 14px;
          border-radius: 11px;
          border: 1px solid #E2E5F0;
          background: #F7F8FC;
          color: #171A2E;
        }
        .chat-nama-input:focus { outline: none; border-color: #4E5FE0; background: #fff; }
        .chat-nama-btn {
          font-size: 13.5px;
          font-weight: 700;
          color: #fff;
          background: #4E5FE0;
          padding: 11px;
          border-radius: 11px;
          border: none;
          cursor: pointer;
        }
        .chat-nama-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .chat-panel-body {
          flex: 1;
          overflow-y: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: #F7F8FC;
          min-height: 200px;
        }
        .chat-empty { font-size: 12.5px; color: #7A8094; line-height: 1.6; margin: 0; }
        .chat-bubble {
          max-width: 78%;
          font-size: 13px;
          line-height: 1.45;
          padding: 9px 12px;
          border-radius: 14px;
          word-break: break-word;
        }
        .chat-bubble-user {
          align-self: flex-end;
          background: #4E5FE0;
          color: #fff;
          border-bottom-right-radius: 4px;
        }
        .chat-bubble-admin {
          align-self: flex-start;
          background: #fff;
          color: #171A2E;
          border: 1px solid #E2E5F0;
          border-bottom-left-radius: 4px;
        }
        .chat-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border-top: 1px solid #EEF0F7;
          flex-shrink: 0;
        }
        .chat-input {
          flex: 1;
          min-width: 0;
          font-size: 14px;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid #E2E5F0;
          background: #F7F8FC;
          color: #171A2E;
        }
        .chat-input:focus { outline: none; border-color: #4E5FE0; background: #fff; }
        .chat-send-btn {
          flex-shrink: 0;
          width: 38px; height: 38px;
          border-radius: 999px;
          background: #4E5FE0;
          color: #fff;
          border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        }
        .chat-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 560px) {
          .chat-panel { right: 12px; left: 12px; width: auto; bottom: 84px; max-height: 66vh; }
        }

        .ios-overlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 22, 44, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }
        .ios-modal {
          background: #fff;
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 380px;
          max-height: 88vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          box-shadow: 0 30px 60px rgba(21, 23, 55, 0.3);
        }
        .ios-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .ios-modal-title { font-size: 17px; font-weight: 800; color: #171A2E; margin: 0; }
        .ios-modal-close {
          background: #F1F3FA;
          border: none;
          border-radius: 999px;
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          color: #5B6172;
          cursor: pointer;
          flex-shrink: 0;
        }
        .ios-modal-sub {
          font-size: 12.5px;
          color: #7A8094;
          margin: 0 0 18px;
          line-height: 1.5;
        }
        .ios-steps {
          list-style: none;
          margin: 0 0 14px;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ios-steps li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 13.5px;
          color: #3A3D4B;
          line-height: 1.5;
        }
        .ios-step-num {
          flex-shrink: 0;
          width: 24px; height: 24px;
          border-radius: 999px;
          background: #1C1D22;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .ios-inline-icon {
          display: inline-block;
          vertical-align: -2px;
          margin: 0 2px;
          color: #3E82F1;
        }
        .ios-modal-note {
          font-size: 12px;
          color: #9AA0B4;
          margin: 0;
          padding-top: 12px;
          border-top: 1px solid #EEF0F7;
        }

        .aru-banner {
          margin: 18px 36px 0;
          display: flex;
          align-items: center;
          gap: 14px;
          background: #FDF6E7;
          border: 1px solid #F0DFAE;
          border-radius: 14px;
          padding: 14px 18px;
        }
        .aru-icon {
          width: 40px; height: 40px;
          border-radius: 12px;
          background: #D9A441;
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .aru-text {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.55;
          color: #8A6620;
          margin: 0;
        }

        .meet-join {
          margin: 14px 36px 0;
          display: flex;
          align-items: center;
          gap: 14px;
          background: #fff;
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: 0 6px 18px rgba(23, 26, 46, 0.06);
          flex-wrap: wrap;
        }
        .meet-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: #4E5FE0;
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .meet-text { flex: 1; min-width: 180px; }
        .meet-title { font-size: 13px; font-weight: 700; color: #171A2E; margin: 0 0 2px; }
        .meet-sub { font-size: 11.5px; color: #7A8094; margin: 0; }
        .meet-form {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 240px;
        }
        .meet-input {
          flex: 1;
          min-width: 0;
          font-size: 16px;
          padding: 10px 14px;
          min-height: 44px;
          border-radius: 999px;
          border: 1px solid #E2E5F0;
          background: #F7F8FC;
          color: #171A2E;
        }
        .meet-input:focus {
          outline: none;
          border-color: #4E5FE0;
          background: #fff;
        }
        .meet-btn {
          flex-shrink: 0;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          background: #4E5FE0;
          padding: 10px 20px;
          min-height: 44px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
        }
        .meet-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .area-showcase {
          position: relative;
        }
        .area-bg-image {
          position: absolute;
          right: -10px;
          bottom: -30px;
          width: 34%;
          max-width: 360px;
          object-fit: contain;
          opacity: 0.08;
          filter: grayscale(35%);
          pointer-events: none;
          z-index: 0;
        }
        @media (max-width: 560px) {
          .area-bg-image { width: 55%; opacity: 0.06; }
        }

        .area-showcase-heading {
          position: relative;
          z-index: 1;
          padding: 22px 36px 0;
        }
        .area-showcase-title {
          font-size: 17px;
          font-weight: 800;
          color: #171A2E;
          margin: 0 0 4px;
        }
        .area-showcase-sub {
          font-size: 12.5px;
          color: #7A8094;
          margin: 0;
          line-height: 1.6;
        }
        .badge-sekolah-inline {
          display: inline-block;
          background: #FBBF24;
          color: #78350F;
          font-size: 10.5px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 999px;
          vertical-align: 1px;
        }

        .tile-strip {
          position: relative;
          z-index: 1;
          padding: 20px 36px 6px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .tile {
          flex: 1;
          min-width: 150px;
          border-radius: 18px;
          padding: 14px 16px;
          color: #fff;
          position: relative;
          transition: transform 0.15s ease;
        }
        .tile:hover { transform: translateY(-2px); }
        .tile-link {
          text-decoration: none;
          display: block;
          cursor: pointer;
        }
        .tile-icon {
          width: 28px; height: 28px;
          border-radius: 9px;
          background: rgba(255,255,255,0.24);
          display: flex;
          align-items: center;
          justify-content: center;
          float: right;
        }
        .tile-label { font-size: 11.5px; opacity: 0.85; margin: 0 0 20px; }
        .tile-name { font-size: 15px; font-weight: 700; line-height: 1.25; margin: 0; }

        .tile-badge-sekolah {
          position: absolute;
          top: -8px;
          left: -6px;
          background: #FBBF24;
          color: #78350F;
          font-size: 9.5px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.18);
          z-index: 2;
          white-space: nowrap;
        }

        .tile-toko { overflow: visible; }
        .tile-toko-badge {
          position: absolute;
          top: -8px;
          right: -6px;
          background: #FBBF24;
          color: #78350F;
          font-size: 9.5px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.18);
          z-index: 2;
        }

        .cat-section {
          position: relative;
          z-index: 1;
          padding: 18px 36px 30px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .cat-card {
          position: relative;
          background: #fff;
          border-radius: 18px;
          padding: 16px 18px;
          box-shadow: 0 6px 18px rgba(23, 26, 46, 0.06);
        }
        .cat-card.wide { grid-column: span 2; }
        .cat-card-badge-sekolah {
          position: absolute;
          top: -9px;
          right: 14px;
          background: #FBBF24;
          color: #78350F;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 999px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.18);
          white-space: nowrap;
        }
        .cat-card-link {
          display: block;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          transition: box-shadow 0.15s ease, transform 0.15s ease;
        }
        .cat-card-link:hover {
          box-shadow: 0 10px 26px rgba(15, 111, 163, 0.18);
          transform: translateY(-2px);
        }
        .cat-card-link-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          font-size: 12.5px;
          font-weight: 700;
          color: #0F6FA3;
        }
        .cat-card-toko {
          position: relative;
          overflow: visible;
          border: 1.5px solid rgba(15, 111, 163, 0.25);
        }
        .cat-card-toko-badge {
          position: absolute;
          top: -10px;
          right: 16px;
          background: #FBBF24;
          color: #78350F;
          font-size: 10.5px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 999px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.18);
          z-index: 2;
        }
        .cat-card-cta-arrow {
          transition: transform 0.2s ease;
        }
        .cat-card-link:hover .cat-card-cta-arrow {
          transform: translateX(4px);
        }
        .cat-card-toko-deco {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
          border-radius: inherit;
        }
        .deco-icon {
          position: absolute;
          opacity: 0.14;
          color: #0F6FA3;
        }
        .deco-icon { top: 44px; right: 62px; }
        .deco-icon-kerang { top: 92px; right: 22px; }
        .deco-icon-pakaian { bottom: 56px; right: 76px; }
        .deco-icon-atk { bottom: 22px; right: 26px; }
        @media (max-width: 560px) {
          .cat-card-toko-deco { display: none; }
        }
        .cat-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          padding: 4px 10px;
          border-radius: 999px;
          margin-bottom: 10px;
        }
        .cat-title {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 15.5px;
          font-weight: 700;
          color: #171A2E;
          margin: 0 0 10px;
        }
        .cat-icon { flex-shrink: 0; }
        .cat-list { list-style: none; margin: 0; padding: 0; font-size: 12.5px; line-height: 1.75; color: #5B6172; }
        .cat-list li { padding-left: 14px; position: relative; }
        .cat-list li::before {
          content: "";
          position: absolute;
          left: 0; top: 8px;
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--accent);
        }

        .beranda-footer {
          position: relative;
          overflow: hidden;
          margin-top: auto;
          background: linear-gradient(90deg, #14162C 0%, #2D3072 100%);
          color: #fff;
          padding: 24px 36px;
        }
        .footer-content {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .beranda-footer-title { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
        .beranda-footer-sub { font-size: 12.5px; color: #B7BAD6; margin: 0; }
        .beranda-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #3E82F1;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 13px 22px;
          min-height: 44px;
          border-radius: 999px;
          text-decoration: none;
          white-space: nowrap;
        }

        /* Pemilih jenis instansi (Semua / Sekolah / KUA) */
        .aud-switch {
          display: inline-flex;
          gap: 4px;
          margin-top: 14px;
          padding: 4px;
          background: #fff;
          border-radius: 999px;
          box-shadow: 0 6px 18px rgba(23, 26, 46, 0.06);
        }
        .aud-btn {
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          color: #5B6172;
          background: transparent;
          border: none;
          padding: 9px 20px;
          min-height: 40px;
          border-radius: 999px;
          cursor: pointer;
          white-space: nowrap;
        }
        .aud-btn:hover { background: #F1F3FA; }
        .aud-btn.active { background: #2D3072; color: #fff; }
        .aud-btn:focus-visible { outline: 2px solid #4E5FE0; outline-offset: 2px; }

        .badge-kua-inline {
          display: inline-block;
          background: #86EFAC;
          color: #14532D;
          font-size: 10.5px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 999px;
          vertical-align: 1px;
        }
        .tile-badge-kua {
          position: absolute;
          top: -8px;
          left: -6px;
          background: #86EFAC;
          color: #14532D;
          font-size: 9.5px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.18);
          z-index: 2;
          white-space: nowrap;
        }
        .cat-card-badge-kua {
          position: absolute;
          top: -9px;
          right: 14px;
          background: #86EFAC;
          color: #14532D;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 999px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.18);
          white-space: nowrap;
        }
        @media (max-width: 560px) {
          .aud-switch { display: flex; width: 100%; }
          .aud-btn { flex: 1; padding: 9px 8px; }
        }

        /* Tablet / layar sedang (mis. Android tablet, iPad mini) */
        @media (max-width: 900px) {
          .beranda-canvas { padding: 0; }
          .beranda-wrap { flex-direction: column; border-radius: 0; min-height: 100vh; }
          .beranda-side { width: 100%; flex-direction: row; justify-content: center; padding: 12px; gap: 10px; }
          .side-dot { width: 26px; height: 26px; }
          .beranda-header { padding: 26px 20px 24px; }
          .beranda-title { font-size: 26px; }
          .cat-section { grid-template-columns: repeat(2, 1fr); padding: 16px 20px 24px; }
          .cat-card.wide { grid-column: span 2; }
          .aru-banner { margin: 16px 20px 0; padding: 12px 14px; }
          .meet-join { margin: 14px 20px 0; padding: 12px 14px; }
          .tile-strip { padding: 16px 20px 4px; }
          .area-showcase-heading { padding: 20px 20px 0; }
          .beranda-footer { padding: 20px; }
        }

        /* Ponsel Android umum (360–412px) dan ponsel kecil lainnya */
        @media (max-width: 560px) {
          .beranda-header { padding: 22px 16px 20px; }
          .beranda-title { font-size: 22px; }
          .beranda-sub { font-size: 13px; margin-bottom: 18px; }
          .cat-section { grid-template-columns: 1fr; padding: 14px 16px 24px; gap: 12px; }
          .cat-card.wide { grid-column: span 1; }
          .header-actions { flex-direction: column; align-items: stretch; gap: 10px; }
          .btn-primary, .btn-ghost, .btn-outline-toko { justify-content: center; width: 100%; }
          .install-row { justify-content: center; }
          .aru-banner { margin: 14px 16px 0; }
          .aru-text { font-size: 13.5px; }
          .meet-join { margin: 12px 16px 0; padding: 12px; flex-direction: column; align-items: stretch; }
          .meet-icon { display: none; }
          .meet-form { flex-direction: column; align-items: stretch; width: 100%; min-width: 0; }
          .meet-btn { width: 100%; }
          .tile-strip { padding: 14px 16px 4px; gap: 10px; }
          .tile { min-width: 130px; padding: 12px 14px; }
          .area-showcase-heading { padding: 16px 16px 0; }
          .footer-content { flex-direction: column; align-items: stretch; text-align: center; }
          .beranda-cta { width: 100%; }
          .ios-modal { padding: 20px; border-radius: 16px; }
        }

        /* Ponsel Android sempit (mis. Galaxy S, layar <380px) */
        @media (max-width: 380px) {
          .beranda-title { font-size: 20px; }
          .tile { min-width: 100%; }
        }
      `}</style>
    </div>
  )
}
