import { Link } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'

// Halaman publik "Syarat & Ketentuan Layanan" — pasangan dari
// KebijakanPrivasi.jsx, gaya visual & struktur style identik supaya
// konsisten. Rute disarankan: /syarat-layanan (tambahkan di App.jsx,
// bisa diakses tanpa login).
//
// CATATAN ISI: ganti semua teks bertanda [ ... ] sebelum dipublikasikan,
// terutama Bagian 6 (Biaya Layanan) — isi sesuai kebijakan harga aktual
// setelah masa promo berakhir.

const TANGGAL_UPDATE = '[isi tanggal saat dipublikasikan]'

function BatikOverlay({ patternId, strokeColor = '#d4af37', opacity = 1, size = 72 }) {
  return (
    <svg className="batik-overlay" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id={patternId} x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
          <g fill="none" stroke={strokeColor} strokeWidth="1.1" opacity={opacity}>
            <ellipse cx={size / 2} cy={size * 0.333} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size / 2} cy={size * 0.667} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size * 0.333} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <ellipse cx={size * 0.667} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <circle cx={size / 2} cy={size / 2} r={size * 0.042} opacity="0.7" />
          </g>
          <circle cx={size * 0.11} cy={size * 0.11} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
          <circle cx={size * 0.89} cy={size * 0.22} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
          <circle cx={size * 0.22} cy={size * 0.89} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

const BAGIAN = [
  {
    judul: '1. Penerimaan Syarat',
    isi: (
      <p>
        Dengan mendaftar, mengakses, atau menggunakan Aplikasi SIMAK, Anda (baik sebagai
        Instansi Mitra maupun pengguna individu di dalamnya) menyetujui Syarat & Ketentuan ini
        beserta <Link to="/kebijakan-privasi">Kebijakan Privasi</Link> kami.
      </p>
    ),
  },
  {
    judul: '2. Siapa yang Boleh Menggunakan Layanan',
    isi: (
      <p>
        Layanan ini disediakan untuk tiga jenis Instansi Mitra: Sekolah, Kantor Urusan Agama
        (KUA), dan Puskesmas, beserta pengguna yang berwenang di dalamnya (kepala instansi,
        guru/pegawai/tenaga medis, staf administrasi, siswa/orang tua/pasien sesuai modul yang
        relevan).
      </p>
    ),
  },
  {
    judul: '3. Akun & Tanggung Jawab Pengguna',
    isi: (
      <ul>
        <li>Setiap pengguna bertanggung jawab menjaga kerahasiaan kata sandi akunnya.</li>
        <li>Instansi Mitra bertanggung jawab memastikan hanya pengguna yang berwenang yang diberi akses ke akun.</li>
        <li>
          <strong>Akun Demo</strong>: kredensial akun demo bersifat publik dan hanya untuk
          keperluan uji coba fitur; data yang dimasukkan ke akun demo tidak dijamin tersimpan
          permanen dan dapat direset sewaktu-waktu.
        </li>
      </ul>
    ),
  },
  {
    judul: '4. Kewajiban Pengguna',
    isi: (
      <>
        <p>Pengguna dilarang:</p>
        <ul>
          <li>Memasukkan data yang melanggar hukum, memfitnah, atau melanggar privasi pihak lain</li>
          <li>Menggunakan fitur Live Chat/komunikasi untuk spam, penipuan, atau pelecehan</li>
          <li>Mencoba mengakses data yang bukan wewenangnya, termasuk membobol sistem keamanan Aplikasi</li>
          <li>Menyalahgunakan data rekam medis atau data siswa untuk kepentingan di luar tujuan layanan resmi</li>
        </ul>
      </>
    ),
  },
  {
    judul: '5. Ketersediaan Layanan',
    isi: (
      <p>
        Kami berupaya menjaga Aplikasi tetap dapat diakses, namun tidak menjamin layanan bebas
        gangguan 100% (misalnya karena pemeliharaan server, gangguan penyedia domain/hosting,
        atau force majeure). Kami akan berupaya memberi tahu Instansi Mitra sebelum pemeliharaan
        terjadwal.
      </p>
    ),
  },
  {
    judul: '6. Biaya Layanan',
    isi: (
      <p>
        [Isi sesuai kebijakan aktual Anda — misalnya: "Layanan ini gratis selama masa promo yang
        berlaku hingga [tanggal]. Setelah masa promo berakhir, biaya berlangganan akan
        diinformasikan melalui [saluran komunikasi] minimal [X] hari sebelumnya, dan Instansi
        Mitra dapat memilih untuk melanjutkan atau menghentikan penggunaan Layanan."]
      </p>
    ),
  },
  {
    judul: '7. Hak Kekayaan Intelektual',
    isi: (
      <p>
        Aplikasi, termasuk kode, desain, dan mereknya, adalah milik pengembang SIMAK. Instansi
        Mitra hanya diberikan hak pakai (lisensi) untuk menggunakan Layanan sesuai tujuan yang
        dimaksud, bukan hak kepemilikan atas Aplikasi.
      </p>
    ),
  },
  {
    judul: '8. Batasan Tanggung Jawab',
    isi: (
      <p>
        Sepanjang diizinkan oleh hukum yang berlaku, kami tidak bertanggung jawab atas kerugian
        tidak langsung yang timbul dari gangguan layanan, kehilangan data akibat kelalaian
        pengguna (misalnya kata sandi bocor), atau penggunaan Layanan yang menyimpang dari
        tujuannya.
      </p>
    ),
  },
  {
    judul: '9. Penghentian Layanan',
    isi: (
      <p>
        Kami berhak menangguhkan atau menghentikan akses akun yang terbukti melanggar Syarat
        ini, termasuk penyalahgunaan data pasien/siswa atau upaya membahayakan keamanan sistem.
      </p>
    ),
  },
  {
    judul: '10. Perubahan Syarat',
    isi: (
      <p>
        Kami dapat memperbarui Syarat & Ketentuan ini maupun Kebijakan Privasi dari waktu ke
        waktu. Perubahan signifikan akan diinformasikan melalui Aplikasi sebelum berlaku
        efektif.
      </p>
    ),
  },
  {
    judul: '11. Hukum yang Berlaku',
    isi: <p>Syarat & Ketentuan ini tunduk pada hukum Negara Republik Indonesia.</p>,
  },
]

export default function SyaratLayanan() {
  return (
    <div className="beranda-canvas">
      <div className="beranda-wrap kp-wrap">
        <div className="beranda-main">
          <div className="beranda-header kp-header">
            <BatikOverlay patternId="batikSyarat" strokeColor="#d4af37" opacity={0.9} />
            <div className="kp-header-content">
              <Link to="/" className="kp-back-link">
                <ArrowLeft size={15} strokeWidth={2.4} />
                Kembali ke Beranda
              </Link>
              <div className="brand-logo">
                <div className="brand-logo-icon"><FileText size={22} strokeWidth={2.5} /></div>
                <span className="brand-logo-text">SIMAK</span>
              </div>
              <h1 className="beranda-title kp-title">Syarat & Ketentuan Layanan</h1>
              <p className="beranda-sub">
                Ketentuan penggunaan aplikasi SIMAK bagi Sekolah, KUA, dan Puskesmas beserta
                penggunanya.
              </p>
              <p className="kp-updated">Terakhir diperbarui: {TANGGAL_UPDATE}</p>
            </div>
          </div>

          <div className="kp-content">
            {BAGIAN.map((b) => (
              <section key={b.judul} className="kp-card">
                <h2 className="kp-card-title">{b.judul}</h2>
                <div className="kp-card-body">{b.isi}</div>
              </section>
            ))}

            <p className="kp-disclaimer">
              Lihat juga <Link to="/kebijakan-privasi">Kebijakan Privasi</Link> kami untuk
              penjelasan lebih lengkap mengenai data yang kami kelola.
            </p>
          </div>

          <div className="beranda-footer">
            <BatikOverlay patternId="batikSyaratFooter" strokeColor="#d4af37" opacity={0.7} size={56} />
            <div className="footer-content">
              <div>
                <p className="beranda-footer-title">Ada pertanyaan seputar Syarat Layanan ini?</p>
                <p className="beranda-footer-sub">Hubungi kami melalui tombol kontak di aplikasi.</p>
              </div>
              <Link to="/" className="beranda-cta">
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .beranda-canvas * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .beranda-canvas {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
          background: #E7E9F5;
          padding: 22px;
          min-height: 100vh;
        }
        .beranda-canvas a:focus-visible, .beranda-canvas button:focus-visible {
          outline: 3px solid #4E5FE0;
          outline-offset: 2px;
        }
        .beranda-header a:focus-visible, .beranda-footer a:focus-visible { outline-color: #fff; }

        .beranda-wrap {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          border-radius: 26px;
          overflow: hidden;
          box-shadow: 0 24px 50px rgba(21, 23, 55, 0.18);
          background: #fff;
        }
        .beranda-main { flex: 1; display: flex; flex-direction: column; background: #F1F3FA; min-width: 0; }

        .batik-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }

        .beranda-header {
          position: relative; overflow: hidden; isolation: isolate;
          background: linear-gradient(120deg, #14162C 0%, #2D3072 100%);
          padding: 34px 36px 30px;
        }
        .kp-header-content { position: relative; }
        .kp-back-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 700; color: #C9F0FF;
          text-decoration: none; margin-bottom: 20px;
        }
        .brand-logo { display: flex; align-items: center; gap: 9px; margin-bottom: 16px; }
        .brand-logo-icon {
          width: 36px; height: 36px; border-radius: 10px; background: #F2762B; color: #fff;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .brand-logo-text { font-size: 18px; font-weight: 800; color: #fff; letter-spacing: 1px; }
        .beranda-title { font-size: 30px; font-weight: 800; color: #fff; margin: 0 0 10px; line-height: 1.2; }
        .beranda-sub { font-size: 14.5px; color: #C4C7E0; margin: 0 0 10px; max-width: 60ch; line-height: 1.6; }
        .kp-updated { font-size: 12.5px; color: #8B90BE; margin: 0; }

        .kp-content { padding: 28px 36px; display: flex; flex-direction: column; gap: 16px; }
        .kp-card {
          background: #fff; border-radius: 16px; padding: 20px 22px;
          box-shadow: 0 6px 18px rgba(23, 26, 46, 0.06);
        }
        .kp-card-title { font-size: 15.5px; font-weight: 800; color: #171A2E; margin: 0 0 12px; }
        .kp-card-body { font-size: 13.5px; color: #3A3D4B; line-height: 1.65; }
        .kp-card-body p { margin: 0 0 10px; }
        .kp-card-body p:last-child { margin-bottom: 0; }
        .kp-card-body ul { margin: 0 0 12px; padding-left: 18px; }
        .kp-card-body ul:last-child { margin-bottom: 0; }
        .kp-card-body li { margin-bottom: 6px; }

        .kp-disclaimer {
          font-size: 12.5px; color: #5B6172; text-align: center; line-height: 1.6;
          padding: 6px 8px 0;
        }
        .kp-disclaimer a { color: #2D3072; font-weight: 700; }

        .beranda-footer {
          position: relative; overflow: hidden; margin-top: auto;
          background: linear-gradient(90deg, #14162C 0%, #2D3072 100%);
          color: #fff; padding: 24px 36px;
        }
        .footer-content {
          position: relative; display: flex; justify-content: space-between;
          align-items: center; gap: 20px; flex-wrap: wrap;
        }
        .beranda-footer-title { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
        .beranda-footer-sub { font-size: 13px; color: #C4C7E0; margin: 0; }
        .beranda-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          background: #3E82F1; color: #fff; font-weight: 700; font-size: 14px;
          padding: 13px 22px; min-height: 44px; border-radius: 999px;
          text-decoration: none; white-space: nowrap;
        }

        @media (max-width: 900px) {
          .beranda-canvas { padding: 0; }
          .beranda-wrap { border-radius: 0; min-height: 100vh; }
          .beranda-header { padding: 26px 20px 24px; }
          .beranda-title { font-size: 24px; }
          .kp-content { padding: 20px; }
          .beranda-footer { padding: 20px; }
        }
        @media (max-width: 560px) {
          .footer-content { flex-direction: column; align-items: stretch; text-align: center; }
          .beranda-cta { width: 100%; }
        }
      `}</style>
    </div>
  )
}
