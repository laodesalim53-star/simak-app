import { Link } from 'react-router-dom'

// Halaman utama publik (landing page) — ditampilkan di "/" untuk pengunjung
// yang belum login. Tombol "Daftar" & "Masuk" mengarah ke rute React Router
// internal (/register, /login), BUKAN link keluar ke domain lain.
export default function Beranda() {
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
            <div>
              <span className="header-eyebrow">Sistem informasi sekolah terpadu</span>
              <h1 className="beranda-title">Satu aplikasi, seluruh sekolah</h1>
              <p className="beranda-sub">
                Tujuh area utama dengan puluhan modul siap pakai — akademik, administrasi,
                keuangan, komunikasi, hingga toko sekolah, dalam satu sistem yang sama.
              </p>
              <div className="header-actions">
                <Link to="/register" className="promo-pill">Daftar sekarang</Link>
                <Link to="/login" className="login-link">Sudah punya akun? Masuk</Link>
              </div>
            </div>
          </div>

          <div className="tile-strip">
            <div className="tile" style={{ background: 'linear-gradient(135deg,#4F8EF7,#2F6FE0)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 1</p>
              <p className="tile-name">Akademik &amp; Ujian</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#16C79A,#0EA57B)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 2</p>
              <p className="tile-name">Administrasi Siswa</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#FF9A52,#F2762B)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 3</p>
              <p className="tile-name">Keuangan Sekolah</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#9B6BF2,#7C4FE0)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 4</p>
              <p className="tile-name">Komunikasi</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#6C7CF0,#4E5FE0)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 5</p>
              <p className="tile-name">Manajemen Sekolah</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#FB7C99,#E85277)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 6</p>
              <p className="tile-name">Portal Orang Tua</p>
            </div>
            <div className="tile" style={{ background: 'linear-gradient(135deg,#35C2E8,#159EC9)' }}>
              <div className="tile-icon"></div>
              <p className="tile-label">Area 7</p>
              <p className="tile-name">Toko Sekolah</p>
            </div>
          </div>

          <div className="cat-section">

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#2F6FE0' }}>Area 1</span>
              <h2 className="cat-title" style={{ '--accent': '#2F6FE0' }}>Akademik &amp; ujian</h2>
              <ul className="cat-list" style={{ '--accent': '#2F6FE0' }}>
                <li>Ujian online &amp; bank soal</li>
                <li>Kuis seru untuk kelas rendah</li>
                <li>Nilai, rapor &amp; nilai asesmen</li>
                <li>RPP &amp; arsip RPP guru</li>
                <li>Portofolio &amp; sertifikat siswa</li>
                <li>Perpustakaan digital</li>
              </ul>
            </div>

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#0EA57B' }}>Area 2</span>
              <h2 className="cat-title">Administrasi siswa</h2>
              <ul className="cat-list" style={{ '--accent': '#0EA57B' }}>
                <li>Data siswa, kelas &amp; jadwal</li>
                <li>Presensi harian</li>
                <li>Kartu siswa, ijazah &amp; SKL</li>
                <li>Pendaftaran siswa baru (PPDB) online</li>
                <li>Pengajuan surat &amp; perbaikan data</li>
              </ul>
            </div>

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#F2762B' }}>Area 3</span>
              <h2 className="cat-title">Keuangan sekolah</h2>
              <ul className="cat-list" style={{ '--accent': '#F2762B' }}>
                <li>Keuangan sekolah &amp; kas kelas</li>
                <li>Kuitansi &amp; nota otomatis</li>
                <li>Laporan bulanan</li>
                <li>Backup data terjadwal</li>
              </ul>
            </div>

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#7C4FE0' }}>Area 4</span>
              <h2 className="cat-title">Komunikasi &amp; publikasi</h2>
              <ul className="cat-list" style={{ '--accent': '#7C4FE0' }}>
                <li>Pengumuman &amp; agenda sekolah</li>
                <li>Pesan langsung antar warga sekolah</li>
                <li>Rapat online lewat video</li>
                <li>Galeri foto kegiatan</li>
                <li>Scan dokumen jadi Word</li>
                <li>Surat &amp; surat keterangan resmi</li>
              </ul>
            </div>

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#4E5FE0' }}>Area 5</span>
              <h2 className="cat-title">Manajemen sekolah</h2>
              <ul className="cat-list" style={{ '--accent': '#4E5FE0' }}>
                <li>Data guru &amp; inventaris</li>
                <li>Profil &amp; identitas sekolah</li>
                <li>Kalender pendidikan &amp; hari libur</li>
                <li>Persetujuan akun pengguna baru</li>
              </ul>
            </div>

            <div className="cat-card">
              <span className="cat-tag" style={{ background: '#E85277' }}>Area 6</span>
              <h2 className="cat-title">Portal orang tua</h2>
              <ul className="cat-list" style={{ '--accent': '#E85277' }}>
                <li>Pantau rapor &amp; nilai anak</li>
                <li>Presensi &amp; portofolio anak</li>
                <li>Galeri foto khusus orang tua</li>
              </ul>
            </div>

            <div className="cat-card wide">
              <span className="cat-tag" style={{ background: '#159EC9' }}>Area 7 — fitur unggulan</span>
              <h2 className="cat-title">Toko sekolah</h2>
              <ul className="cat-list" style={{ '--accent': '#159EC9' }}>
                <li>Belanja kebutuhan sekolah secara online</li>
                <li>Keranjang, checkout &amp; riwayat pesanan</li>
                <li>Kelola pesanan masuk &amp; pencairan dana untuk penjual</li>
              </ul>
            </div>

          </div>

          <div className="beranda-footer">
            <div>
              <p className="beranda-footer-title">Tertarik menerapkannya di sekolah Anda?</p>
              <p className="beranda-footer-sub">Gratis selama masa promo berlaku. Daftar akun untuk sekolah Anda sekarang.</p>
            </div>
            <Link to="/register" className="beranda-cta">Daftar sekarang</Link>
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

        .beranda-header {
          background: #fff;
          padding: 26px 36px 20px;
          border-bottom: 1px solid #E9EBF4;
        }
        .header-eyebrow {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          color: #5B6172;
          background: #F1F3FA;
          padding: 5px 12px;
          border-radius: 999px;
          margin-bottom: 10px;
        }
        .beranda-title {
          font-size: 30px;
          font-weight: 800;
          color: #171A2E;
          margin: 0 0 6px;
          line-height: 1.15;
        }
        .beranda-sub {
          font-size: 14px;
          color: #7A8094;
          margin: 0 0 16px;
          max-width: 52ch;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .promo-pill {
          display: inline-block;
          background: linear-gradient(135deg, #FF9A52, #F2762B);
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          padding: 10px 18px;
          border-radius: 999px;
          white-space: nowrap;
          text-decoration: none;
        }
        .login-link {
          font-size: 13px;
          font-weight: 600;
          color: #3E82F1;
          text-decoration: underline;
        }

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
          margin-top: auto;
          background: linear-gradient(90deg, #14162C 0%, #2D3072 100%);
          color: #fff;
          padding: 22px 36px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .beranda-footer-title { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
        .beranda-footer-sub { font-size: 12.5px; color: #B7BAD6; margin: 0; }
        .beranda-cta {
          background: #3E82F1;
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          padding: 11px 20px;
          border-radius: 999px;
          text-decoration: none;
          white-space: nowrap;
        }

        @media (max-width: 900px) {
          .beranda-wrap { flex-direction: column; }
          .beranda-side { width: 100%; flex-direction: row; justify-content: center; padding: 12px; }
          .cat-section { grid-template-columns: repeat(2, 1fr); }
          .cat-card.wide { grid-column: span 2; }
        }
        @media (max-width: 560px) {
          .cat-section { grid-template-columns: 1fr; }
          .cat-card.wide { grid-column: span 1; }
        }
      `}</style>
    </div>
  )
}
