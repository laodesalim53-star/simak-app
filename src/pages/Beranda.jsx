import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LogIn, GraduationCap, Video, Download, Monitor, Apple, Share, SquarePlus, X, BookOpen, IdCard, Wallet, MessageCircle, Settings, Users, ShoppingBag, Phone, Send, Headset } from 'lucide-react'
// PENTING: sesuaikan path import ini dengan lokasi client Supabase Anda
// yang sudah ada di project (biasanya di src/lib/ atau src/services/).
import { supabase } from '../lib/supabaseClient'
// BARU: widget "Tanya AI" — ditempatkan di pojok KIRI bawah supaya tidak
// bertabrakan dengan tombol WhatsApp/Live Chat yang sudah ada di kanan bawah.
// Sesuaikan path import ini dengan lokasi file TanyaAI.jsx di project Anda.
import TanyaAI from '../components/TanyaAI'

// Halaman utama publik (landing page) — ditampilkan di "/" untuk pengunjung
// yang belum login. Tombol "Daftar" & "Masuk" mengarah ke rute React Router
// internal (/register, /login), BUKAN link keluar ke domain lain.
//
// Tema visual disamakan dengan Dashboard: gradasi navy–indigo, motif batik
// emas tipis sebagai overlay, dan kartu-kartu gradien warna-warni.

// BARU: nomor WhatsApp sekolah — dipakai di tombol WhatsApp pada menu
// kontak mengambang. Format wa.me: kode negara (62) TANPA angka 0 di
// depan, langsung disambung nomornya.
const NOMOR_WA_SEKOLAH = '6282197574897'

// BARU: foto/ilustrasi "Ibu Guru" yang dipakai sebagai logo tombol kontak
// mengambang & header panel Live Chat, menggantikan ikon generik. Taruh
// file gambarnya di folder public proyek Anda dengan nama persis di bawah
// ini (sama seperti pola /kelas-ilustrasi.png yang sudah ada) — ganti nama
// filenya di sini kalau nama file Anda berbeda.
const FOTO_ADMIN_CHAT = '/ibu-guru-chat.jpg'

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
  // BARU: gabung rapat langsung dari beranda lewat link/kode yang dibagikan
  // host (misal lewat WhatsApp). Menerima link penuh (.../rapat/xxxx) atau
  // kode ruangan saja.
  const [kodeRapat, setKodeRapat] = useState('')
  // BARU: panduan instal untuk iPhone/iPad — Apple tidak punya file installer
  // seperti APK/MSIX, jadi guru pengguna iOS dituntun lewat panduan manual
  // (Safari > Share > Tambah ke Layar Utama) alih-alih tombol download.
  const [showIosGuide, setShowIosGuide] = useState(false)

  // BARU: menu pilihan kontak (WhatsApp / Live Chat) dari tombol mengambang.
  const [showFabMenu, setShowFabMenu] = useState(false)
  const [showLiveChat, setShowLiveChat] = useState(false)

  // BARU: live chat — pesan pengunjung disimpan ke tabel Supabase
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
            <div className="header-glow header-glow-a"></div>
            <div className="header-glow header-glow-b"></div>

            <div className="header-content">
              <div className="brand-logo">
                <div className="brand-logo-icon"><GraduationCap size={22} strokeWidth={2.5} /></div>
                <span className="brand-logo-text">SIMAK</span>
              </div>
              <span className="header-eyebrow">Sistem informasi sekolah terpadu</span>
              <h1 className="beranda-title">
                {'Satu aplikasi, seluruh sekolah'.split('').map((huruf, i) => (
                  <span
                    key={i}
                    className="title-letter"
                    style={{ animationDelay: `${i * 0.12}s` }}
                  >
                    {huruf === ' ' ? '\u00A0' : huruf}
                  </span>
                ))}
              </h1>
              <p className="beranda-sub">
                Tujuh area utama dengan puluhan modul siap pakai — akademik, administrasi,
                keuangan, komunikasi, hingga toko sekolah, dalam satu sistem yang sama.
              </p>
              <div className="header-actions">
                <Link to="/register" className="promo-pill">
                  Daftar sekarang
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
                <Link to="/login" className="login-link">
                  <LogIn size={15} strokeWidth={2.5} />
                  Sudah punya akun? Masuk
                </Link>
                {/* BARU: link ke Toko Sekolah — sengaja pakai <Link> biasa
                    (bukan tombol instal/daftar) supaya pengunjung publik bisa
                    langsung lihat-lihat toko TANPA perlu login/daftar dulu.
                    Route "/toko" memang sudah publik di App.jsx. */}
                <Link to="/toko" className="toko-pill">
                  <ShoppingBag size={16} strokeWidth={2.5} />
                  Lihat Toko Sekolah
                </Link>
                <a href="/simak-app.apk" download className="install-pill">
                  <Download size={16} strokeWidth={2.5} />
                  Instal untuk Android
                </a>
                <a href="/simak-app-windows.msix" download className="install-pill install-pill-windows">
                  <Monitor size={16} strokeWidth={2.5} />
                  Instal untuk Windows
                </a>
                <button
                  type="button"
                  onClick={() => setShowIosGuide(true)}
                  className="install-pill install-pill-ios"
                >
                  <Apple size={16} strokeWidth={2.5} />
                  Instal untuk iPhone/iPad
                </button>
              </div>
            </div>
          </div>

          <div className="aru-banner">
            <div className="aru-icon"><GraduationCap size={20} /></div>
            <div className="aru-marquee">
              <p className="aru-text">
                ✨ Salam hangat untuk Bapak/Ibu Guru di Kabupaten Kepulauan Aru — SIMAK dibuat untuk membantu sekolah Anda mengelola data lebih ringan, dari kelas hingga kantor. ✨
              </p>
            </div>
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
            {/* Ilustrasi kelas dipindah ke area putih di bawah (bukan di
                header gelap), ditampilkan sangat samar sebagai latar
                dekoratif dengan animasi naik-turun pelan ("timbul
                tenggelam"). Letakkan file kelas-ilustrasi.png di folder
                public proyek Anda. */}
            <img
              src="/kelas-ilustrasi.png"
              alt=""
              aria-hidden="true"
              className="area-bg-image"
            />

            <div className="tile-strip">
            <div className="tile" style={{ background: 'linear-gradient(135deg,#3B82F6,#2563EB)' }}>
              <div className="tile-icon"><BookOpen size={15} strokeWidth={2.4} /></div>
              <p className="tile-label">Area 1</p>
              <p className="tile-name">Akademik &amp; Ujian</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
              <div className="tile-icon"><IdCard size={15} strokeWidth={2.4} /></div>
              <p className="tile-label">Area 2</p>
              <p className="tile-name">Administrasi Siswa</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)' }}>
              <div className="tile-icon"><Wallet size={15} strokeWidth={2.4} /></div>
              <p className="tile-label">Area 3</p>
              <p className="tile-name">Keuangan Sekolah</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#A855F7,#9333EA)' }}>
              <div className="tile-icon"><MessageCircle size={15} strokeWidth={2.4} /></div>
              <p className="tile-label">Area 4</p>
              <p className="tile-name">Komunikasi</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#14B8A6,#0D9488)' }}>
              <div className="tile-icon"><Settings size={15} strokeWidth={2.4} /></div>
              <p className="tile-label">Area 5</p>
              <p className="tile-name">Manajemen Sekolah</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#F43F5E,#E11D48)' }}>
              <div className="tile-icon"><Users size={15} strokeWidth={2.4} /></div>
              <p className="tile-label">Area 6</p>
              <p className="tile-name">Portal Orang Tua</p>
            </div>
            {/* BARU: tile Area 7 (Toko Sekolah) dijadikan <Link> langsung ke
                /toko — dulunya cuma <div> dekoratif, sekarang jadi tautan
                yang bisa diklik pengunjung untuk lihat-lihat toko. */}
            <Link
              to="/toko"
              className="tile tile-link"
              style={{ background: 'linear-gradient(135deg,#0EA5E9,#0284C7)' }}
            >
              <div className="tile-icon"><ShoppingBag size={15} strokeWidth={2.4} /></div>
              <p className="tile-label">Area 7</p>
              <p className="tile-name">Toko Sekolah</p>
            </Link>
            </div>

            <div className="cat-section">

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#2563EB' }}>Area 1</span>
              <h2 className="cat-title"><BookOpen size={17} strokeWidth={2.2} className="cat-icon" style={{ color: '#2563EB' }} />Akademik &amp; ujian</h2>
              <ul className="cat-list" style={{ '--accent': '#2563EB' }}>
                <li>Ujian online &amp; bank soal</li>
                <li>Kuis seru untuk kelas rendah</li>
                <li>Nilai, rapor &amp; nilai asesmen</li>
                <li>RPP &amp; arsip RPP guru</li>
                <li>Portofolio &amp; sertifikat siswa</li>
                <li>Perpustakaan digital</li>
              </ul>
            </div>

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#059669' }}>Area 2</span>
              <h2 className="cat-title"><IdCard size={17} strokeWidth={2.2} className="cat-icon" style={{ color: '#059669' }} />Administrasi siswa</h2>
              <ul className="cat-list" style={{ '--accent': '#059669' }}>
                <li>Data siswa, kelas &amp; jadwal</li>
                <li>Presensi harian</li>
                <li>Kartu siswa, ijazah &amp; SKL</li>
                <li>Pendaftaran siswa baru (PPDB) online</li>
                <li>Pengajuan surat &amp; perbaikan data</li>
              </ul>
            </div>

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#EA580C' }}>Area 3</span>
              <h2 className="cat-title"><Wallet size={17} strokeWidth={2.2} className="cat-icon" style={{ color: '#EA580C' }} />Keuangan sekolah</h2>
              <ul className="cat-list" style={{ '--accent': '#EA580C' }}>
                <li>Keuangan sekolah &amp; kas kelas</li>
                <li>Kuitansi &amp; nota otomatis</li>
                <li>Laporan bulanan</li>
                <li>Backup data terjadwal</li>
              </ul>
            </div>

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#9333EA' }}>Area 4</span>
              <h2 className="cat-title"><MessageCircle size={17} strokeWidth={2.2} className="cat-icon" style={{ color: '#9333EA' }} />Komunikasi &amp; publikasi</h2>
              <ul className="cat-list" style={{ '--accent': '#9333EA' }}>
                <li>Pengumuman &amp; agenda sekolah</li>
                <li>Pesan langsung antar warga sekolah</li>
                <li>Rapat online lewat video</li>
                <li>Galeri foto kegiatan</li>
                <li>Scan dokumen jadi Word</li>
                <li>Surat &amp; surat keterangan resmi</li>
              </ul>
            </div>

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#0D9488' }}>Area 5</span>
              <h2 className="cat-title"><Settings size={17} strokeWidth={2.2} className="cat-icon" style={{ color: '#0D9488' }} />Manajemen sekolah</h2>
              <ul className="cat-list" style={{ '--accent': '#0D9488' }}>
                <li>Data guru &amp; inventaris</li>
                <li>Profil &amp; identitas sekolah</li>
                <li>Kalender pendidikan &amp; hari libur</li>
                <li>Persetujuan akun pengguna baru</li>
              </ul>
            </div>

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#E11D48' }}>Area 6</span>
              <h2 className="cat-title"><Users size={17} strokeWidth={2.2} className="cat-icon" style={{ color: '#E11D48' }} />Portal orang tua</h2>
              <ul className="cat-list" style={{ '--accent': '#E11D48' }}>
                <li>Pantau rapor &amp; nilai anak</li>
                <li>Presensi &amp; portofolio anak</li>
                <li>Galeri foto khusus orang tua</li>
              </ul>
            </div>

            {/* BARU: kartu Area 7 (Toko Sekolah) dijadikan <Link> langsung ke
                /toko juga — dulunya <div> biasa, sekarang bisa diklik dari
                mana pun teksnya untuk membuka Toko tanpa perlu login. */}
            <Link to="/toko" className="cat-card wide cat-card-link">
              <span className="cat-tag" style={{ background: '#0284C7' }}>Area 7 — fitur unggulan</span>
              <h2 className="cat-title"><ShoppingBag size={17} strokeWidth={2.2} className="cat-icon" style={{ color: '#0284C7' }} />Toko sekolah</h2>
              <ul className="cat-list" style={{ '--accent': '#0284C7' }}>
                <li>Belanja kebutuhan sekolah secara online</li>
                <li>Keranjang, checkout &amp; riwayat pesanan</li>
                <li>Kelola pesanan masuk &amp; pencairan dana untuk penjual</li>
              </ul>
              <span className="cat-card-link-cta">
                Buka Toko Sekolah
                <ArrowRight size={14} strokeWidth={2.5} />
              </span>
            </Link>

            </div>
          </div>

          <div className="beranda-footer">
            <BatikOverlay patternId="batikFooter" strokeColor="#d4af37" opacity={0.7} size={56} />
            <div className="footer-content">
              <div>
                <p className="beranda-footer-title">Tertarik menerapkannya di sekolah Anda?</p>
                <p className="beranda-footer-sub">Gratis selama masa promo berlaku. Daftar akun untuk sekolah Anda sekarang.</p>
              </div>
              <Link to="/register" className="beranda-cta">
                Daftar sekarang
                <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* BARU: modal panduan instal untuk iPhone/iPad, muncul saat tombol
          "Instal untuk iPhone/iPad" diklik. */}
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

      {/* BARU: tombol kontak mengambang — tap untuk memilih WhatsApp atau
          Live Chat. Nomor WA memakai konstanta NOMOR_WA_SEKOLAH di atas. */}
      <div className="contact-fab-wrap">
        {showFabMenu && (
          <div className="fab-menu">
            <a
              href={`https://wa.me/${NOMOR_WA_SEKOLAH}?text=Halo%20SIMAK%2C%20saya%20ingin%20bertanya`}
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

      {/* BARU: panel live chat. Pesan pengunjung tersimpan ke tabel
          Supabase "live_chat_pesan" (lihat catatan setup di bawah kode
          ini) sehingga langsung masuk ke aplikasi/dashboard admin. */}
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

      {/* BARU: widget Tanya AI — ditempatkan terpisah di pojok KIRI bawah
          agar tidak bertumpuk dengan tombol WhatsApp/Live Chat di kanan
          bawah. Komponen ini sudah mengatur floating button + panel
          chat-nya sendiri (lihat TanyaAI.jsx). */}
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
          background: linear-gradient(135deg, #FF9A52, #E85277);
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
          padding: 34px 36px 30px;
        }
        .header-glow {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          pointer-events: none;
        }
        .header-glow-a { width: 220px; height: 220px; top: -80px; right: -60px; }
        .header-glow-b { width: 160px; height: 160px; bottom: -90px; left: -30px; }
        .header-content { position: relative; }
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 14px;
        }
        .brand-logo-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #FF9A52, #F2762B);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 14px rgba(242, 118, 43, 0.4);
          flex-shrink: 0;
        }
        .brand-logo-text {
          font-size: 18px;
          font-weight: 800;
          color: #fff;
          letter-spacing: 1px;
        }
        .header-eyebrow {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          color: #D8DBF5;
          background: rgba(255,255,255,0.1);
          padding: 5px 12px;
          border-radius: 999px;
          margin-bottom: 12px;
        }
        .beranda-title {
          font-size: 32px;
          font-weight: 800;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 8px;
          line-height: 1.15;
          perspective: 700px;
        }
        .title-letter {
          display: inline-block;
          transform-style: preserve-3d;
          text-shadow:
            2px 3px 0 rgba(20, 22, 44, 0.4),
            4px 7px 12px rgba(20, 22, 44, 0.3);
          animation: putarHuruf 5.5s linear infinite;
        }
        @keyframes putarHuruf {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .title-letter { animation: none; }
        }
        .beranda-sub {
          font-size: 14px;
          color: #B7BAD6;
          margin: 0 0 22px;
          max-width: 52ch;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }
        .promo-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #FF9A52, #F2762B);
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 13px 22px;
          min-height: 44px;
          border-radius: 999px;
          white-space: nowrap;
          text-decoration: none;
          box-shadow: 0 10px 24px rgba(242, 118, 43, 0.35);
          animation: kedipTeks 1.6s ease-in-out infinite;
        }
        .login-link {
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
          animation: kedipTeks 1.6s ease-in-out infinite;
        }
        /* BARU: tombol "Lihat Toko Sekolah" — warna biru langit (senada
           dengan tile & cat-card Area 7 "Toko Sekolah" di bawah) supaya
           konsisten sebagai identitas warna fitur Toko di seluruh halaman. */
        .toko-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #0EA5E9, #0284C7);
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 13px 22px;
          min-height: 44px;
          border-radius: 999px;
          white-space: nowrap;
          text-decoration: none;
          box-shadow: 0 10px 24px rgba(2, 132, 199, 0.35);
        }
        .install-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #16C79A, #0EA57B);
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 13px 22px;
          min-height: 44px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 10px 24px rgba(14, 165, 123, 0.35);
          animation: kedipTeks 1.6s ease-in-out infinite;
        }
        .install-pill-windows {
          background: linear-gradient(135deg, #4E5FE0, #2F6FE0);
          box-shadow: 0 10px 24px rgba(47, 111, 224, 0.35);
        }
        .install-pill-ios {
          background: linear-gradient(135deg, #3A3D45, #1C1D22);
          box-shadow: 0 10px 24px rgba(28, 29, 34, 0.35);
          font-family: inherit;
          animation: none; /* tombol iOS tidak ikut berkedip */
        }
        /* BARU: efek berkedip-kedip untuk 4 tombol utama di header */
        @keyframes kedipTeks {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @media (prefers-reduced-motion: reduce) {
          .promo-pill, .login-link, .install-pill { animation: none; }
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
          background: linear-gradient(135deg, #4E5FE0, #2F6FE0);
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
          background: linear-gradient(135deg, #4E5FE0, #2F6FE0);
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
          background: linear-gradient(135deg, #4E5FE0, #2F6FE0);
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
          background: linear-gradient(90deg, #FDF6E7 0%, #FBEBC4 100%);
          border: 1px solid #F0DFAE;
          border-radius: 14px;
          padding: 14px 18px;
          overflow: hidden;
        }
        .aru-icon {
          width: 40px; height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #E8B84B, #D9A441);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 6px 14px rgba(217, 164, 65, 0.35);
        }
        .aru-marquee {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .aru-text {
          display: inline-block;
          white-space: nowrap;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.4;
          color: #8A6620;
          margin: 0;
          padding-left: 100%;
          animation: aruMarquee 18s linear infinite;
        }
        @keyframes aruMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .aru-text {
            animation: none;
            padding-left: 0;
            white-space: normal;
          }
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
          background: linear-gradient(135deg, #4E5FE0, #2F6FE0);
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
          background: linear-gradient(135deg, #4E5FE0, #2F6FE0);
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
          opacity: 0.09;
          filter: grayscale(35%);
          pointer-events: none;
          z-index: 0;
          animation: timbulTenggelam 7s ease-in-out infinite;
        }
        @keyframes timbulTenggelam {
          0%, 100% { opacity: 0.06; transform: translateY(10px) scale(1); }
          50% { opacity: 0.14; transform: translateY(-10px) scale(1.03); }
        }
        @media (prefers-reduced-motion: reduce) {
          .area-bg-image { animation: none; opacity: 0.08; }
        }
        @media (max-width: 560px) {
          .area-bg-image { width: 55%; opacity: 0.07; }
        }

        .tile-strip {
          position: relative;
          z-index: 1;
          padding: 20px 36px 6px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          perspective: 900px;
        }
        .tile {
          flex: 1;
          min-width: 150px;
          border-radius: 18px;
          padding: 14px 16px;
          color: #fff;
          position: relative;
          overflow: hidden;
          transform-style: preserve-3d;
          animation: tileGoyangPelan 3.6s ease-in-out infinite;
        }
        /* BARU: tile Area 7 sekarang <Link> — pastikan gaya link default
           (underline, warna ungu kunjungan, dsb) tidak ikut tampil supaya
           terlihat identik dengan 6 tile lain yang masih <div>. */
        .tile-link {
          text-decoration: none;
          display: block;
          cursor: pointer;
        }
        /* Jeda berbeda tiap kartu supaya tidak bergoyang bersamaan */
        .tile:nth-child(1) { animation-delay: 0s; }
        .tile:nth-child(2) { animation-delay: 0.3s; }
        .tile:nth-child(3) { animation-delay: 0.6s; }
        .tile:nth-child(4) { animation-delay: 0.9s; }
        .tile:nth-child(5) { animation-delay: 1.2s; }
        .tile:nth-child(6) { animation-delay: 1.5s; }
        .tile:nth-child(7) { animation-delay: 1.8s; }
        /* BARU: goyang pelan (bukan putar penuh) agar teks tetap mudah dibaca */
        @keyframes tileGoyangPelan {
          0%, 100% { transform: rotate(0deg); }
          50%      { transform: rotate(2.5deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tile { animation: none; }
        }
        .tile-icon {
          width: 28px; height: 28px;
          border-radius: 9px;
          background: rgba(255,255,255,0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          float: right;
        }
        .tile-label { font-size: 11.5px; opacity: 0.9; margin: 0 0 20px; }
        .tile-name { font-size: 15px; font-weight: 700; line-height: 1.25; margin: 0; }

        .cat-section {
          position: relative;
          z-index: 1;
          padding: 18px 36px 30px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .cat-card {
          background: #fff;
          border-radius: 18px;
          padding: 16px 18px;
          box-shadow: 0 6px 18px rgba(23, 26, 46, 0.06);
        }
        .cat-card.wide { grid-column: span 2; }
        /* BARU: kartu Area 7 sekarang <Link> — reset gaya link default,
           tambahkan hover halus, dan siapkan tempat untuk teks CTA
           "Buka Toko Sekolah" di bagian bawah kartu. */
        .cat-card-link {
          display: block;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          transition: box-shadow 0.15s ease, transform 0.15s ease;
        }
        .cat-card-link:hover {
          box-shadow: 0 10px 26px rgba(2, 132, 199, 0.18);
          transform: translateY(-2px);
        }
        .cat-card-link-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          font-size: 12.5px;
          font-weight: 700;
          color: #0284C7;
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
          box-shadow: 0 10px 24px rgba(62, 130, 241, 0.35);
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
          .beranda-footer { padding: 20px; }
        }

        /* Ponsel Android umum (360–412px) dan ponsel kecil lainnya */
        @media (max-width: 560px) {
          .beranda-header { padding: 22px 16px 20px; }
          .header-eyebrow { font-size: 11px; }
          .beranda-title { font-size: 22px; }
          .beranda-sub { font-size: 13px; margin-bottom: 18px; }
          .cat-section { grid-template-columns: 1fr; padding: 14px 16px 24px; gap: 12px; }
          .cat-card.wide { grid-column: span 1; }
          .header-actions { flex-direction: column; align-items: stretch; gap: 10px; }
          .promo-pill, .login-link, .install-pill, .toko-pill { justify-content: center; width: 100%; }
          .aru-banner { margin: 14px 16px 0; }
          .aru-text { font-size: 14px; }
          .meet-join { margin: 12px 16px 0; padding: 12px; flex-direction: column; align-items: stretch; }
          .meet-icon { display: none; }
          .meet-form { flex-direction: column; align-items: stretch; width: 100%; min-width: 0; }
          .meet-btn { width: 100%; }
          .tile-strip { padding: 14px 16px 4px; gap: 10px; }
          .tile { min-width: 130px; padding: 12px 14px; }
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
