import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

// Halaman publik "Kebijakan Privasi" — mengikuti pola visual Beranda.jsx:
// header navy-indigo dengan batik overlay, konten dalam kartu putih, font
// Plus Jakarta Sans. Rute disarankan: /kebijakan-privasi (tambahkan di
// App.jsx, bisa diakses tanpa login, sama seperti /toko).
//
// SEBELUM DIPUBLIKASIKAN, isi 3 konstanta di bawah ini, lalu cari teks
// bertanda [ ... ] yang tersisa (masa proses hapus data, layanan pihak
// ketiga) dan sesuaikan dengan kenyataan.
//
// PERIKSA JUGA (klaim di Bagian 6 harus benar-benar sesuai):
//  - RLS Supabase aktif di semua tabel, terutama rekam medis & keuangan
//  - Backup berkala memang berjalan
//  - Lokasi GPS hanya diambil saat pengguna menekan tombol deteksi lokasi
//    (tidak dilacak di latar belakang)
//  - Halaman /syarat-layanan sudah ada, atau hapus tautannya di bagian bawah

const TANGGAL_UPDATE = '[01 Oktober 2026]'
const NAMA_PENGELOLA = '[LD SALIM,]'
const EMAIL_KONTAK = '[laodesalim53@gmail.com]'

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
    judul: '1. Tentang Dokumen Ini',
    isi: (
      <>
        <p>
          Kebijakan Privasi ini berlaku untuk aplikasi <strong>SIMAK</strong> ("Aplikasi",
          "Layanan"), sistem informasi terpadu yang digunakan oleh Sekolah, Kantor Urusan Agama
          (KUA), dan Puskesmas ("Instansi Mitra") untuk mengelola data akademik, administrasi,
          pelayanan kesehatan, keuangan, dan komunikasi. Aplikasi dikelola oleh{' '}
          <strong>{NAMA_PENGELOLA}</strong> ("kami").
        </p>
        <p>
          Kebijakan ini menjelaskan data apa yang kami kumpulkan, bagaimana data itu digunakan
          dan dilindungi, serta hak-hak Anda sebagai pengguna. Kebijakan ini disusun dengan
          memperhatikan Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU
          PDP).
        </p>
        <p>
          Aplikasi ditujukan untuk pengguna dewasa, yaitu guru, pegawai, tenaga kesehatan, dan
          petugas Instansi Mitra. Data siswa atau pasien dimasukkan oleh petugas Instansi Mitra,
          bukan oleh anak atau pasien itu sendiri.
        </p>
      </>
    ),
  },
  {
    judul: '2. Siapa yang Bertanggung Jawab atas Data',
    isi: (
      <p>
        Setiap Instansi Mitra (sekolah, KUA, atau puskesmas) bertindak sebagai <strong>pengendali
        data</strong> untuk data yang mereka input ke dalam Aplikasi. SIMAK bertindak sebagai
        <strong> penyedia sistem/pemroses data</strong> yang menyediakan infrastruktur teknis
        untuk menyimpan dan mengelola data tersebut atas instruksi Instansi Mitra. Untuk
        pertanyaan mengenai data pribadi Anda, silakan hubungi Instansi Mitra tempat data Anda
        terdaftar terlebih dahulu, atau hubungi kami melalui kontak di Bagian 10.
      </p>
    ),
  },
  {
    judul: '3. Data yang Kami Kumpulkan',
    isi: (
      <>
        <p className="kp-sub-label">a. Data akun & identitas dasar</p>
        <ul>
          <li>Nama, e-mail, nomor telepon, jabatan/peran, kata sandi (disimpan terenkripsi)</li>
        </ul>
        <p className="kp-sub-label">b. Data khusus Sekolah</p>
        <ul>
          <li>Data siswa: NISN/NIS, data Dapodik, nilai, presensi, portofolio, ijazah/SKL</li>
          <li>Data guru/pegawai: kepegawaian, presensi, dokumen SK</li>
        </ul>
        <p className="kp-sub-label">c. Data khusus KUA</p>
        <ul>
          <li>Data pendaftar nikah, data penyuluhan, data pegawai/penyuluh, laporan kepenghuluan</li>
        </ul>
        <p className="kp-sub-label">d. Data khusus Puskesmas</p>
        <ul>
          <li><strong>Rekam medis pasien</strong> (kategori data spesifik menurut UU PDP): diagnosis, resep, hasil pemeriksaan</li>
          <li>Data pendaftaran/antrean pasien, jadwal dokter/poli, data kesehatan masyarakat</li>
        </ul>
        <p className="kp-sub-label">e. Data keuangan</p>
        <ul>
          <li>Transaksi kas, anggaran, kuitansi/nota operasional Instansi Mitra, serta data rekening koran yang diunggah Instansi Mitra untuk pembukuan</li>
        </ul>
        <p className="kp-sub-label">f. Berkas yang Anda unggah</p>
        <ul>
          <li>Dokumen dan gambar yang diunggah pengguna, misalnya SK, ijazah/SKL, kuitansi, dan hasil pindai (scan) PDF. Berkas dapat diproses untuk keperluan fitur Aplikasi seperti konversi dan kompresi berkas.</li>
        </ul>
        <p className="kp-sub-label">g. Data lokasi</p>
        <ul>
          <li>Koordinat lokasi (lintang/bujur) dari perangkat Anda, yang hanya diambil setelah Anda memberi izin lokasi dan menggunakan fitur deteksi lokasi pada saat mengisi atau memperbarui profil. Lokasi tidak dilacak di latar belakang.</li>
        </ul>
        <p className="kp-sub-label">h. Data komunikasi</p>
        <ul>
          <li>Pesan Live Chat & komunikasi internal, riwayat rapat daring</li>
          <li>Untuk pengunjung belum login: nama & isi pesan Live Chat, disertai ID sesi anonim di perangkat Anda</li>
        </ul>
        <p className="kp-sub-label">i. Data teknis</p>
        <ul>
          <li>Alamat IP, jenis perangkat/browser, cookie/local storage untuk sesi & preferensi</li>
        </ul>
      </>
    ),
  },
  {
    judul: '4. Dasar & Tujuan Pemrosesan Data',
    isi: (
      <>
        <p>Kami memproses data untuk:</p>
        <ul>
          <li>Menyediakan dan mengoperasikan fitur inti Aplikasi</li>
          <li>Memenuhi kewajiban administratif ke instansi induk (Dapodik, Kementerian Agama, Dinas Kesehatan)</li>
          <li>Menjaga keamanan akun dan mencegah penyalahgunaan</li>
          <li>Memberikan dukungan teknis melalui Live Chat/WhatsApp</li>
        </ul>
        <p>
          Untuk data sensitif (data anak-anak melalui Dapodik, data kesehatan pasien), pemrosesan
          dilakukan atas dasar kepentingan pelaksanaan layanan publik oleh Instansi Mitra, dengan
          persetujuan yang diperoleh melalui mekanisme pendaftaran/pendataan resmi masing-masing
          instansi.
        </p>
        <p>
          Kami tidak menggunakan data Anda untuk iklan dan tidak membuat profil pengguna untuk
          keperluan pemasaran.
        </p>
      </>
    ),
  },
  {
    judul: '5. Izin Perangkat yang Digunakan',
    isi: (
      <ul>
        <li><strong>Lokasi:</strong> hanya untuk fitur deteksi lokasi pada profil, dan hanya setelah Anda mengizinkan.</li>
        <li><strong>Kamera/berkas:</strong> hanya bila Anda memilih mengunggah foto atau dokumen.</li>
        <li><strong>Internet:</strong> diperlukan agar Aplikasi dapat terhubung ke server.</li>
      </ul>
    ),
  },
  {
    judul: '6. Bagaimana Data Disimpan & Diamankan',
    isi: (
      <>
        <ul>
          <li>Data dikirim melalui koneksi terenkripsi (HTTPS)</li>
          <li>Data disimpan di Supabase, akses dibatasi lewat Row Level Security (RLS) sesuai peran & instansi</li>
          <li>Kata sandi disimpan terenkripsi (hash), tidak pernah sebagai teks biasa</li>
          <li>Akses rekam medis & keuangan dibatasi hanya untuk peran berwenang</li>
          <li>Pencadangan (backup) data dilakukan secara berkala</li>
        </ul>
        <p>
          Server penyedia infrastruktur dapat berada di luar Indonesia, sehingga data Anda dapat
          diproses dan disimpan di luar wilayah Indonesia. Kami memilih penyedia yang menerapkan
          perlindungan data yang memadai.
        </p>
        <p>
          Tidak ada sistem yang sepenuhnya bebas risiko. Jika terjadi insiden yang berdampak pada
          data pribadi Anda, kami akan memberi tahu Instansi Mitra dan pihak terkait sesuai
          ketentuan yang berlaku.
        </p>
      </>
    ),
  },
  {
    judul: '7. Berapa Lama Data Disimpan',
    isi: (
      <p>
        Data disimpan selama akun/instansi masih aktif menggunakan Layanan, atau selama
        diwajibkan oleh peraturan instansi terkait (misalnya masa retensi rekam medis sesuai
        ketentuan Kementerian Kesehatan, atau arsip akademik sesuai ketentuan Dinas Pendidikan).
        Instansi Mitra dapat meminta penghapusan data yang sudah tidak diperlukan sesuai
        prosedur masing-masing.
      </p>
    ),
  },
  {
    judul: '8. Dengan Siapa Data Dibagikan',
    isi: (
      <>
        <p>Kami <strong>tidak menjual</strong> data pribadi kepada pihak ketiga. Data hanya dibagikan:</p>
        <ul>
          <li>Kepada Instansi Mitra terkait, sebatas kewenangannya</li>
          <li>Kepada penyedia infrastruktur teknis sebagai pemroses data teknis</li>
          <li>Jika diwajibkan oleh hukum atau permintaan resmi dari lembaga berwenang</li>
        </ul>
        <p className="kp-sub-label">Layanan pihak ketiga yang digunakan Aplikasi</p>
        <ul>
          <li>Supabase: penyimpanan database, autentikasi, dan berkas</li>
          <li>Google Fonts: memuat font tampilan; alamat IP perangkat Anda ikut terkirim ke Google saat font dimuat</li>
          <li>WhatsApp: hanya bila Anda memilih menghubungi kami melalui tombol kontak WhatsApp</li>
          <li>[tambahkan layanan lain yang benar-benar dipakai, misalnya penyedia rapat daring, atau hapus baris ini]</li>
        </ul>
      </>
    ),
  },
  {
    judul: '9. Hak Anda sebagai Pemilik Data',
    isi: (
      <>
        <p>Sesuai UU PDP, Anda berhak untuk:</p>
        <ul>
          <li>Mengetahui data pribadi apa yang tersimpan tentang Anda</li>
          <li>Meminta perbaikan data yang tidak akurat</li>
          <li>Meminta penghapusan data pribadi Anda (dengan memperhatikan kewajiban retensi hukum)</li>
          <li>Menarik persetujuan pemrosesan data, sepanjang tidak bertentangan dengan kewajiban layanan publik</li>
        </ul>
        <p>Permintaan dapat diajukan melalui Instansi Mitra Anda atau kontak di Bagian 10.</p>
        <p className="kp-sub-label" id="hapus-akun">Penghapusan akun & data</p>
        <p>
          Untuk meminta penghapusan akun beserta data terkait, kirim e-mail ke{' '}
          <strong>{EMAIL_KONTAK}</strong> dengan subjek "Hapus Akun SIMAK" dari alamat e-mail
          yang terdaftar di akun Anda, dan sebutkan nama serta Instansi Mitra Anda. Permintaan
          diproses dalam [isi jumlah] hari kerja. Data yang wajib disimpan menurut ketentuan
          hukum (misalnya rekam medis) tetap disimpan sampai masa retensinya berakhir. Data yang
          dimasukkan atas nama Instansi Mitra mungkin perlu persetujuan instansi tersebut sebelum
          dihapus.
        </p>
      </>
    ),
  },
  {
    judul: '10. Kontak',
    isi: (
      <ul>
        <li>Pengelola: {NAMA_PENGELOLA}</li>
        <li>E-mail: {EMAIL_KONTAK}</li>
        <li>WhatsApp / Live Chat: melalui tombol kontak di Aplikasi</li>
      </ul>
    ),
  },
]

export default function KebijakanPrivasi() {
  return (
    <div className="beranda-canvas">
      <div className="beranda-wrap kp-wrap">
        <div className="beranda-main">
          <div className="beranda-header kp-header">
            <BatikOverlay patternId="batikKebijakan" strokeColor="#d4af37" opacity={0.9} />
            <div className="kp-header-content">
              <Link to="/" className="kp-back-link">
                <ArrowLeft size={15} strokeWidth={2.4} />
                Kembali ke Beranda
              </Link>
              <div className="brand-logo">
                <div className="brand-logo-icon"><ShieldCheck size={22} strokeWidth={2.5} /></div>
                <span className="brand-logo-text">SIMAK</span>
              </div>
              <h1 className="beranda-title kp-title">Kebijakan Privasi</h1>
              <p className="beranda-sub">
                Bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda di dalam
                aplikasi SIMAK, untuk pengguna Sekolah, KUA, maupun Puskesmas.
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
              Dokumen ini adalah bagian dari komitmen kami menjaga data Anda, dan dapat
              diperbarui dari waktu ke waktu. Lihat juga{' '}
              <Link to="/syarat-layanan">Syarat & Ketentuan Layanan</Link>.
            </p>
          </div>

          <div className="beranda-footer">
            <BatikOverlay patternId="batikKebijakanFooter" strokeColor="#d4af37" opacity={0.7} size={56} />
            <div className="footer-content">
              <div>
                <p className="beranda-footer-title">Ada pertanyaan lain seputar data Anda?</p>
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
        .kp-sub-label { font-weight: 700; color: #171A2E; margin: 0 0 6px !important; }

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
