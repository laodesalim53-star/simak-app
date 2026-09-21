import { ArrowLeft, Printer } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

// ─────────────────────────────────────────────────────────────────────────────
// CetakSK.jsx — sistem cetak bersama untuk semua halaman di Gudang SK
// (SK Beban Mengajar, SK Honor Guru, SK Tenaga Kebersihan, dst).
//
// Polanya SAMA dengan LaporanKepangkatanGuru.jsx dan laporan guru lainnya:
//   • halaman berdiri sendiri (tanpa <Layout>), latar bg-slate-100
//   • toolbar sticky `no-print` berisi tombol Kembali dan Cetak
//   • panel isian `no-print`
//   • lembar kertas berkelas `lembar-cetak print-only` dengan override
//     `position: static` dan `@media screen { display: block }` yang sama
//     persis, supaya aturan global `.print-only` di index.css tidak
//     menyembunyikannya di layar
//   • `@page` + `@media print` di <style> halaman itu sendiri
//
// Cara memakai di halaman SK baru:
//
//   <div className="min-h-screen bg-slate-100">
//     <GayaCetakSK />
//     <BarAtasCetak onKembali={() => navigate('/gudang-sk')} judul="SK Honor Guru" />
//     <div className="no-print max-w-3xl mx-auto px-3 pt-4"> …formulir… </div>
//     <AreaLembar>
//       <HalamanKeputusan sk={sk} sekolah={sekolah} tentang="…" menimbang={[…]} mengingat={[…]} diktum={[…]} />
//       <HalamanLampiran sk={sk} sekolah={sekolah} judul={['…', '…']}> <table className="sk-tabel">…</table> </HalamanLampiran>
//     </AreaLembar>
//   </div>
//
// Kolom `sk` yang dibaca di sini: nomor, tempat, tanggal (yyyy-mm-dd).
// Kolom `sekolah`: kopAtas, nama, npsn, alamat, kepala, nipKepala, logoUrl.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Utilitas ────────────────────────────────────────────────────────────────
export const isi = (v, pengganti = '…………') => (v && String(v).trim() ? v : pengganti)

export const pecahBaris = (teks) =>
  (teks || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

export function tahunPelajaranSekarang() {
  const t = new Date()
  const y = t.getFullYear()
  return t.getMonth() + 1 >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`
}

export function isoHariIni() {
  const t = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`
}

export function formatTanggalSK(iso) {
  if (!iso) return '…………'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatKabupaten(teks) {
  if (!teks) return ''
  return teks
    .replace(/^PEMERINTAH\s+KABUPATEN\s+/i, '')
    .replace(/^KABUPATEN\s+/i, '')
    .trim()
}

// ─── Ambil Profil Sekolah untuk kop & tanda tangan ───────────────────────────
export const SEKOLAH_KOSONG = {
  kopAtas: '',
  nama: '',
  npsn: '',
  alamat: '',
  kepala: '',
  nipKepala: '',
  logoUrl: '',
}

// Mengembalikan { profil, sekolah, tempat }. `sekolah` siap dipakai KopSK/BlokTTD,
// `tempat` = tempat_ttd untuk "Ditetapkan di". Melempar error kalau query gagal.
export async function ambilProfilSekolah(sekolahId) {
  const { data: profil, error } = await supabase
    .from('profil_sekolah')
    .select('*')
    .eq('sekolah_id', sekolahId)
    .maybeSingle()
  if (error) throw error

  let logoUrl = ''
  if (profil?.logo_path) {
    const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(profil.logo_path)
    logoUrl = pub?.publicUrl || ''
  }

  const kab = formatKabupaten(profil?.kabupaten)
  const sekolah = {
    kopAtas: [kab ? `Pemerintah Kabupaten ${kab}` : '', profil?.dinas_pendidikan || 'Dinas Pendidikan']
      .filter(Boolean)
      .join('\n'),
    nama: profil?.nama_sekolah || '',
    npsn: profil?.npsn || '',
    alamat:
      [profil?.alamat, profil?.kecamatan, profil?.kabupaten, profil?.provinsi].filter(Boolean).join(', ') +
      (profil?.kode_pos ? ` ${profil.kode_pos}` : ''),
    kepala: profil?.kepala_sekolah || '',
    nipKepala: profil?.nip_kepala_sekolah || '',
    logoUrl,
  }

  // Hanya tempat_ttd — kolom kecamatan berisi teks kop lengkap ("KECAMATAN ..."),
  // kurang pantas dipakai sebagai "Ditetapkan di".
  return { profil: profil || null, sekolah, tempat: profil?.tempat_ttd || '' }
}

// ─── CSS layar + cetak ───────────────────────────────────────────────────────
const CSS = `
.lembar-sk {
  width: 210mm;
  margin: 0 auto 16px;
  padding: 20mm 22mm;
  background: #fff;
  color: #000;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18), 0 8px 24px rgba(15, 23, 42, 0.08);
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 1.45;
  box-sizing: border-box;
}
.lembar-sk p { margin: 0; }

/* Override pola laporan guru: position static + tampil di layar */
.lembar-cetak.print-only {
  position: static !important;
  top: auto !important;
  left: auto !important;
  right: auto !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
@media screen {
  .lembar-cetak.print-only { display: block !important; min-height: 297mm; }
}

.sk-kop { display: flex; align-items: center; gap: 12px; border-bottom: 3px double #000; padding-bottom: 6px; margin-bottom: 14px; }
.sk-kop-logo { width: 20mm; height: 20mm; object-fit: contain; flex: none; }
.sk-kop-teks { flex: 1; text-align: center; }
.sk-kop-atas { font-size: 12pt; font-weight: 700; text-transform: uppercase; }
.sk-kop-nama { font-size: 15pt; font-weight: 700; text-transform: uppercase; line-height: 1.25; }
.sk-kop-alamat { font-size: 10.5pt; }

.sk-judul { text-align: center; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
.sk-judul .tentang { margin: 4px 0; }

.sk-def { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
.sk-def td { vertical-align: top; padding: 0 0 4px; }
.sk-def td.k { width: 30mm; }
.sk-def td.t { width: 5mm; }
.sk-def tr { page-break-inside: avoid; }

.sk-item { display: flex; }
.sk-item .no { width: 8mm; flex: none; }
.sk-item .isi { text-align: justify; }
.sk-justify { text-align: justify; }

.sk-tengah { text-align: center; font-weight: 700; text-transform: uppercase; margin: 10px 0; }

.sk-ttd { margin-left: 52%; margin-top: 18px; page-break-inside: avoid; }
.sk-ttd table { border-collapse: collapse; }
.sk-ttd td { padding: 0 6px 0 0; vertical-align: top; }
.sk-ttd .ruang { height: 20mm; }

.sk-meta { border-collapse: collapse; margin-left: 50%; margin-bottom: 14px; font-size: 11pt; }
.sk-meta td { vertical-align: top; padding: 0 6px 0 0; }

.sk-tabel { width: 100%; border-collapse: collapse; font-size: 11pt; }
.sk-tabel th, .sk-tabel td { border: 1px solid #000; padding: 5px 6px; vertical-align: top; }
.sk-tabel th { text-align: center; font-weight: 700; vertical-align: middle; }
.sk-tabel thead { display: table-header-group; }
.sk-tabel tr { page-break-inside: avoid; }
.sk-tabel td.c { text-align: center; }
.sk-tabel .nip { font-size: 10pt; }

/* ── Format surat keterangan ── */
.sk-surat-judul { text-align: center; margin-bottom: 14px; }
.sk-surat-judul .judul { font-weight: 700; text-decoration: underline; text-transform: uppercase; font-size: 13pt; }
.sk-data { border-collapse: collapse; margin: 4px 0 10px 8mm; }
.sk-data td { vertical-align: top; padding: 1px 0; }
.sk-data td.k { width: 44mm; }
.sk-data td.t { width: 5mm; }
.sk-paragraf { text-align: justify; text-indent: 12mm; margin-bottom: 8px; }
.sk-ttd-surat { margin-left: 55%; margin-top: 22px; page-break-inside: avoid; }
.sk-ttd-surat .ruang { height: 22mm; }

@media print {
  .no-print { display: none !important; }
  body { background: white; }
  .pembungkus-lembar { padding: 0 !important; overflow: visible !important; }
  .lembar-cetak {
    box-shadow: none !important;
    margin: 0 !important;
    width: 100% !important;
  }
  .lembar-sk { padding: 0 !important; min-height: 0 !important; }
  .lembar-sk + .lembar-sk { page-break-before: always; }
}
@page {
  size: A4;
  margin: 18mm 20mm;
}
`

export function GayaCetakSK() {
  return <style>{CSS}</style>
}

// ─── Kerangka halaman cetak ──────────────────────────────────────────────────
export function BarAtasCetak({ onKembali, judul }) {
  return (
    <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
      <button
        onClick={onKembali}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft size={16} /> Kembali
      </button>
      {judul && <span className="hidden sm:block truncate text-sm font-medium text-slate-700">{judul}</span>}
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        <Printer size={16} /> Cetak
      </button>
    </div>
  )
}

// Pembungkus lembar: di layar bisa digulir ke samping (HP), saat cetak polos.
export function AreaLembar({ children }) {
  return <div className="pembungkus-lembar overflow-x-auto p-3 sm:p-6">{children}</div>
}

export function LembarSK({ children }) {
  return <div className="lembar-cetak print-only lembar-sk">{children}</div>
}

// ─── Bagian dokumen ──────────────────────────────────────────────────────────
export function KopSK({ sekolah }) {
  return (
    <div className="sk-kop">
      {sekolah.logoUrl && <img src={sekolah.logoUrl} alt="Logo sekolah" className="sk-kop-logo" />}
      <div className="sk-kop-teks">
        {pecahBaris(sekolah.kopAtas).map((teks, i) => (
          <div key={i} className="sk-kop-atas">
            {teks}
          </div>
        ))}
        <div className="sk-kop-nama">{isi(sekolah.nama, 'NAMA SEKOLAH')}</div>
        {sekolah.npsn && <div className="sk-kop-alamat">NPSN: {sekolah.npsn}</div>}
        {sekolah.alamat && <div className="sk-kop-alamat">{sekolah.alamat}</div>}
      </div>
    </div>
  )
}

export function BlokTTD({ sk, sekolah }) {
  return (
    <div className="sk-ttd">
      <table>
        <tbody>
          <tr>
            <td>Ditetapkan di</td>
            <td>: {isi(sk.tempat)}</td>
          </tr>
          <tr>
            <td>Pada tanggal</td>
            <td>: {formatTanggalSK(sk.tanggal)}</td>
          </tr>
        </tbody>
      </table>
      <p style={{ marginTop: 6 }}>Kepala {isi(sekolah.nama, 'Sekolah')},</p>
      <div className="ruang" />
      <p>
        <strong>
          <u>{isi(sekolah.kepala, 'Nama Kepala Sekolah')}</u>
        </strong>
      </p>
      <p>NIP. {isi(sekolah.nipKepala)}</p>
    </div>
  )
}

function Daftar({ items, gaya }) {
  return items.map((teks, i) => (
    <div key={i} className="sk-item">
      <span className="no">{gaya === 'huruf' ? `${String.fromCharCode(97 + i)}.` : `${i + 1}.`}</span>
      <span className="isi">{teks}</span>
    </div>
  ))
}

// Halaman 1: Keputusan (kop, judul, Menimbang, Mengingat, Memutuskan, diktum, TTD).
//   tentang  : string, judul lengkap setelah kata "TENTANG"
//   menimbang: string[]   mengingat: string[]   diktum: [label, teks][]
export function HalamanKeputusan({ sk, sekolah, tentang, menimbang, mengingat, diktum }) {
  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  return (
    <LembarSK>
      <KopSK sekolah={sekolah} />

      <div className="sk-judul">
        <p>Keputusan Kepala {namaSekolah}</p>
        <p>Nomor: {isi(sk.nomor)}</p>
        <p className="tentang">Tentang</p>
        <p>{tentang}</p>
      </div>

      <p className="sk-tengah" style={{ marginTop: 4 }}>
        Kepala {namaSekolah},
      </p>

      <table className="sk-def">
        <tbody>
          <tr>
            <td className="k">Menimbang</td>
            <td className="t">:</td>
            <td>
              <Daftar items={menimbang} gaya="huruf" />
            </td>
          </tr>
          <tr>
            <td className="k">Mengingat</td>
            <td className="t">:</td>
            <td>
              <Daftar items={mengingat} gaya="angka" />
            </td>
          </tr>
        </tbody>
      </table>

      <p className="sk-tengah">Memutuskan:</p>

      <table className="sk-def">
        <tbody>
          <tr>
            <td className="k">Menetapkan</td>
            <td className="t">:</td>
            <td className="sk-justify">
              KEPUTUSAN KEPALA {namaSekolah.toUpperCase()} TENTANG {tentang.toUpperCase()}.
            </td>
          </tr>
          {diktum.map(([label, teks]) => (
            <tr key={label}>
              <td className="k">{label}</td>
              <td className="t">:</td>
              <td className="sk-justify">{teks}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <BlokTTD sk={sk} sekolah={sekolah} />
    </LembarSK>
  )
}

// Halaman 2: Lampiran (blok LAMPIRAN/NOMOR/TANGGAL, judul, isi bebas, TTD).
//   judul: string[] — baris judul lampiran di atas isi.
export function HalamanLampiran({ sk, sekolah, judul, children }) {
  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  return (
    <LembarSK>
      <table className="sk-meta">
        <tbody>
          <tr>
            <td>LAMPIRAN</td>
            <td>: Keputusan Kepala {namaSekolah}</td>
          </tr>
          <tr>
            <td>NOMOR</td>
            <td>: {isi(sk.nomor)}</td>
          </tr>
          <tr>
            <td>TANGGAL</td>
            <td>: {formatTanggalSK(sk.tanggal)}</td>
          </tr>
        </tbody>
      </table>

      <div className="sk-judul">
        {judul.map((baris, i) => (
          <p key={i}>{baris}</p>
        ))}
      </div>

      {children}

      <BlokTTD sk={sk} sekolah={sekolah} />
    </LembarSK>
  )
}

// ─── Komponen formulir kecil (dipakai bersama supaya tampilan panel isian
// seragam di semua halaman SK) ───────────────────────────────────────────────
export const inputSK =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300'

export function FieldSK({ label, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  )
}

export function BagianSK({ judul, keterangan, aksi, children }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-sm sm:text-[15px] font-semibold text-slate-900">{judul}</h3>
          {keterangan && <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5">{keterangan}</p>}
        </div>
        {aksi}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

// ─── Format SURAT (surat keterangan, dst) ────────────────────────────────────
// Beda dari Keputusan: tanpa Menimbang/Mengingat/diktum; tanda tangan berformat
// "Tempat, tanggal / Jabatan / nama / NIP".
export function TabelData({ baris }) {
  return (
    <table className="sk-data">
      <tbody>
        {baris.map(([label, nilai]) => (
          <tr key={label}>
            <td className="k">{label}</td>
            <td className="t">:</td>
            <td>{nilai}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function BlokTTDSurat({ tempat, tanggal, jabatan, nama, nip }) {
  return (
    <div className="sk-ttd-surat">
      <p>
        {isi(tempat)}, {formatTanggalSK(tanggal)}
      </p>
      <p>{jabatan},</p>
      <div className="ruang" />
      <p>
        <strong>
          <u>{isi(nama, 'Nama Penandatangan')}</u>
        </strong>
      </p>
      <p>NIP. {isi(nip)}</p>
    </div>
  )
}

// Satu lembar surat lengkap: kop, judul bergaris bawah, nomor, isi (children), tanda tangan.
//   ttd: { tempat, tanggal, jabatan, nama, nip }
export function HalamanSurat({ sekolah, judul, nomor, ttd, children }) {
  return (
    <LembarSK>
      <KopSK sekolah={sekolah} />
      <div className="sk-surat-judul">
        <p className="judul">{judul}</p>
        <p>Nomor: {isi(nomor)}</p>
      </div>
      {children}
      <BlokTTDSurat {...ttd} />
    </LembarSK>
  )
}

// Nomor berurutan untuk cetak banyak surat sekaligus: angka di awal nomor
// dinaikkan sesuai urutan ("001/SK/2026" → "002/SK/2026"). Kalau nomor tidak
// diawali angka, semua surat memakai nomor yang sama.
export function nomorKe(nomor, indeks) {
  const cocok = String(nomor || '').match(/^(\d+)(.*)$/)
  if (!cocok || indeks === 0) return nomor
  return String(Number(cocok[1]) + indeks).padStart(cocok[1].length, '0') + cocok[2]
}

// Ganti penanda {nama}, {tugas}, dst di template teks dengan nilainya.
export function isiTemplate(template, nilai) {
  return (template || '').replace(/\{(\w+)\}/g, (semua, kunci) => (kunci in nilai ? nilai[kunci] : semua))
}

// ─── Data guru & kelas (dipakai halaman SK yang butuh daftar guru) ───────────
// Deteksi & urutan sama dengan LaporanKepangkatanGuru.jsx.
export function isKepalaSekolah(g) {
  const jabatan = `${g.tugas_tambahan || ''} ${g.jenis_ptk || ''}`.toLowerCase()
  return jabatan.includes('kepala sekolah')
}

function peringkatGolongan(teks) {
  if (!teks) return 0
  const cocok = teks.toUpperCase().match(/(IX|VIII|VII|VI|IV|III|II|I|V)[\s./-]?([A-D])?/)
  if (!cocok) return 0
  const romawi = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 }
  const huruf = cocok[2] ? cocok[2].charCodeAt(0) - 64 : 0
  return (romawi[cocok[1]] || 0) * 10 + huruf
}

// Kepala Sekolah paling atas, lalu golongan tertinggi, lalu abjad.
export function urutkanGuru(daftar) {
  return [...daftar].sort((a, b) => {
    const aKS = isKepalaSekolah(a) ? 0 : 1
    const bKS = isKepalaSekolah(b) ? 0 : 1
    if (aKS !== bKS) return aKS - bKS
    const selisih = peringkatGolongan(b.pangkat_golongan) - peringkatGolongan(a.pangkat_golongan)
    if (selisih !== 0) return selisih
    return (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '')
  })
}

export async function ambilGuruDanKelas(sekolahId) {
  const [rg, rk] = await Promise.all([
    supabase
      .from('guru')
      .select('id, nip, nama_lengkap, pangkat_golongan, tugas_tambahan, jenis_ptk, tmt_pengangkatan, tmt_pns, status')
      .eq('sekolah_id', sekolahId)
      .eq('status', 'aktif'),
    supabase
      .from('kelas')
      .select('id, nama_kelas, tingkat, wali_kelas_id')
      .eq('sekolah_id', sekolahId)
      .order('nama_kelas'),
  ])
  const galat = rg.error || rk.error
  if (galat) throw galat
  return { guru: rg.data || [], kelas: rk.data || [] }
}
