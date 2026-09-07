import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LogIn, GraduationCap, Video, Download, Monitor } from 'lucide-react'

// Halaman utama publik (landing page) — ditampilkan di "/" untuk pengunjung
// yang belum login. Tombol "Daftar" & "Masuk" mengarah ke rute React Router
// internal (/register, /login), BUKAN link keluar ke domain lain.
//
// Tema visual disamakan dengan Dashboard: gradasi navy–indigo, motif batik
// emas tipis sebagai overlay, dan kartu-kartu gradien warna-warni.

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
              <span className="header-eyebrow">Sistem informasi sekolah terpadu</span>
              <h1 className="beranda-title">Satu aplikasi, seluruh sekolah</h1>
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
                <a href="/simak-app.apk" download className="install-pill">
                  <Download size={16} strokeWidth={2.5} />
                  Instal untuk Android
                </a>
                <a href="/simak-app-windows.msix" download className="install-pill install-pill-windows">
                  <Monitor size={16} strokeWidth={2.5} />
                  Instal untuk Windows
                </a>
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

          <div className="tile-strip">
            <div className="tile" style={{ background: 'linear-gradient(135deg,#3B82F6,#2563EB)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 1</p>
              <p className="tile-name">Akademik &amp; Ujian</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 2</p>
              <p className="tile-name">Administrasi Siswa</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 3</p>
              <p className="tile-name">Keuangan Sekolah</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#A855F7,#9333EA)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 4</p>
              <p className="tile-name">Komunikasi</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#14B8A6,#0D9488)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 5</p>
              <p className="tile-name">Manajemen Sekolah</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#F43F5E,#E11D48)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 6</p>
              <p className="tile-name">Portal Orang Tua</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#0EA5E9,#0284C7)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 7</p>
              <p className="tile-name">Toko Sekolah</p>
            </div>
          </div>

          <div className="cat-section">

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#2563EB' }}>Area 1</span>
              <h2 className="cat-title">Akademik &amp; ujian</h2>
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
              <h2 className="cat-title">Administrasi siswa</h2>
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
              <h2 className="cat-title">Keuangan sekolah</h2>
              <ul className="cat-list" style={{ '--accent': '#EA580C' }}>
                <li>Keuangan sekolah &amp; kas kelas</li>
                <li>Kuitansi &amp; nota otomatis</li>
                <li>Laporan bulanan</li>
                <li>Backup data terjadwal</li>
              </ul>
            </div>

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#9333EA' }}>Area 4</span>
              <h2 className="cat-title">Komunikasi &amp; publikasi</h2>
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
              <h2 className="cat-title">Manajemen sekolah</h2>
              <ul className="cat-list" style={{ '--accent': '#0D9488' }}>
                <li>Data guru &amp; inventaris</li>
                <li>Profil &amp; identitas sekolah</li>
                <li>Kalender pendidikan &amp; hari libur</li>
                <li>Persetujuan akun pengguna baru</li>
              </ul>
            </div>

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#E11D48' }}>Area 6</span>
              <h2 className="cat-title">Portal orang tua</h2>
              <ul className="cat-list" style={{ '--accent': '#E11D48' }}>
                <li>Pantau rapor &amp; nilai anak</li>
                <li>Presensi &amp; portofolio anak</li>
                <li>Galeri foto khusus orang tua</li>
              </ul>
            </div>

            <div className="cat-card wide">
              <span className="cat-tag" style={{ background: '#0284C7' }}>Area 7 — fitur unggulan</span>
              <h2 className="cat-title">Toko sekolah</h2>
              <ul className="cat-list" style={{ '--accent': '#0284C7' }}>
                <li>Belanja kebutuhan sekolah secara online</li>
                <li>Keranjang, checkout &amp; riwayat pesanan</li>
                <li>Kelola pesanan masuk &amp; pencairan dana untuk penjual</li>
              </ul>
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

      {/* Style khusus halaman Beranda — pola sama dengan Login.jsx (style
          ditulis inline lewat <style> di dalam komponen). */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .beranda-canvas * { box-sizing: border-box; }
        .beranda-canvas {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: #E7E9F5;
          padding: 22px;
          min-height: 100vh;
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
          margin: 0 0 8px;
          line-height: 1.15;
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
          gap: 8px;
          background: linear-gradient(135deg, #FF9A52, #F2762B);
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 13px 22px;
          border-radius: 999px;
          white-space: nowrap;
          text-decoration: none;
          box-shadow: 0 10px 24px rgba(242, 118, 43, 0.35);
        }
        .login-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13.5px;
          font-weight: 600;
          color: #fff;
          background: rgba(255,255,255,0.1);
          padding: 12px 18px;
          border-radius: 999px;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.18);
        }
        .install-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #16C79A, #0EA57B);
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 13px 22px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 10px 24px rgba(14, 165, 123, 0.35);
        }
        .install-pill-windows {
          background: linear-gradient(135deg, #4E5FE0, #2F6FE0);
          box-shadow: 0 10px 24px rgba(47, 111, 224, 0.35);
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
          font-size: 13px;
          padding: 10px 14px;
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
          border-radius: 999px;
          border: none;
          cursor: pointer;
        }
        .meet-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .tile-strip {
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
          overflow: hidden;
        }
        .tile-icon {
          width: 28px; height: 28px;
          border-radius: 9px;
          background: rgba(255,255,255,0.28);
          float: right;
        }
        .tile-label { font-size: 11.5px; opacity: 0.9; margin: 0 0 20px; }
        .tile-name { font-size: 15px; font-weight: 700; line-height: 1.25; margin: 0; }

        .cat-section {
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
        .cat-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          padding: 4px 10px;
          border-radius: 999px;
          margin-bottom: 10px;
        }
        .cat-title { font-size: 15.5px; font-weight: 700; color: #171A2E; margin: 0 0 10px; }
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
          gap: 8px;
          background: #3E82F1;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 13px 22px;
          border-radius: 999px;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: 0 10px 24px rgba(62, 130, 241, 0.35);
        }

        @media (max-width: 900px) {
          .beranda-wrap { flex-direction: column; }
          .beranda-side { width: 100%; flex-direction: row; justify-content: center; padding: 12px; }
          .cat-section { grid-template-columns: repeat(2, 1fr); }
          .cat-card.wide { grid-column: span 2; }
          .aru-banner { margin: 16px 20px 0; }
          .meet-join { margin: 14px 20px 0; }
        }
        @media (max-width: 560px) {
          .cat-section { grid-template-columns: 1fr; }
          .cat-card.wide { grid-column: span 1; }
          .header-actions { flex-direction: column; align-items: stretch; }
          .promo-pill, .login-link, .install-pill { justify-content: center; }
          .meet-form { flex-direction: column; align-items: stretch; width: 100%; }
        }
      `}</style>
    </div>
  )
}
