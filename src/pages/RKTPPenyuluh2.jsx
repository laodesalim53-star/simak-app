import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, ClipboardList } from 'lucide-react'
import Layout from '../components/Layout'

// Ganti 'profil-kantor' di bawah ini kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

// Ganti tujuan tombol "Kembali" sesuai menu tempat halaman ini diletakkan
const HALAMAN_KEMBALI = '/pusat-materi-majelis'

const PLACEHOLDER = '..............................'

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

// Tanggal berformat 'YYYY-MM-DD' dibaca sebagai tanggal lokal (bukan UTC)
// supaya tidak bergeser sehari.
function formatTanggalIndonesia(dateInput) {
  let date
  if (dateInput instanceof Date) {
    date = dateInput
  } else if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-').map(Number)
    date = new Date(y, m - 1, d)
  } else {
    date = new Date(dateInput)
  }
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function todayISO() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// Nilai kosong ditampilkan sebagai titik-titik supaya bisa ditulis tangan
const isi = (v) => (v && String(v).trim() ? v : PLACEHOLDER)

/* ------------------------------------------------------------------ */
/*  Isi dokumen RKTP — edit di sini kalau ada perubahan format         */
/* ------------------------------------------------------------------ */

const LATAR_BELAKANG =
  'Rencana Kerja Tahunan Penyuluh Agama (RKTP) merupakan dokumen perencanaan pelaksanaan tugas penyuluhan dan pembinaan keagamaan selama satu tahun. Dokumen ini disusun sebagai pedoman kerja agar kegiatan penyuluhan terlaksana secara terarah, terukur, terdokumentasi, dan sesuai dengan kebutuhan masyarakat di wilayah binaan.'

const MAKSUD_TUJUAN = [
  'Menjadi pedoman pelaksanaan tugas penyuluh agama selama tahun {tahun}.',
  'Meningkatkan kualitas pelayanan, bimbingan, dan penyuluhan keagamaan kepada masyarakat.',
  'Meningkatkan pemahaman dan pengamalan nilai-nilai agama dalam kehidupan bermasyarakat.',
  'Mendukung pembinaan keluarga, generasi muda, kerukunan umat, dan pemberdayaan masyarakat.',
  'Menjadi dasar monitoring, evaluasi, dokumentasi, dan pelaporan kegiatan penyuluh agama.',
]

const DASAR_PELAKSANAAN = [
  'Ketentuan peraturan perundang-undangan yang mengatur tugas dan fungsi Kementerian Agama.',
  'Ketentuan mengenai jabatan dan pelaksanaan tugas Penyuluh Agama yang berlaku.',
  'Program kerja Kantor Kementerian Agama Kabupaten/Kota dan KUA Kecamatan.',
  'Hasil identifikasi kebutuhan masyarakat dan pemetaan kelompok binaan.',
  'Ketentuan lain yang berkaitan dengan pelaksanaan penyuluhan agama.',
]

const MITRA_KERJA =
  'KUA, pemerintah desa/kelurahan, tokoh agama, tokoh masyarakat, organisasi/kelompok masyarakat, dan pihak terkait.'

const PROGRAM_KERJA = [
  ['Penyuluhan keagamaan', 'Masyarakat umum', 'Ceramah, dialog, diskusi', '24', 'Masyarakat memperoleh pemahaman keagamaan'],
  ['Pembinaan kelompok binaan', 'Majelis taklim/kelompok binaan', 'Pembinaan rutin dan kunjungan', '24', 'Kelompok binaan aktif dan terbina'],
  ['Pembinaan generasi muda', 'Remaja/pemuda', 'Kajian, diskusi, pembinaan karakter', '12', 'Meningkatnya pembinaan keagamaan generasi muda'],
  ['Pembinaan keluarga', 'Keluarga/pasangan', 'Konsultasi dan bimbingan', '12', 'Meningkatnya ketahanan dan keharmonisan keluarga'],
  ['Bimbingan calon pengantin', 'Calon pengantin', 'Bimbingan/konsultasi', 'Sesuai kebutuhan', 'Calon pengantin memperoleh bekal kehidupan berkeluarga'],
  ['Pembinaan baca Al-Qur\'an', 'Anak, remaja, dewasa', 'Tahsin/pembelajaran', '24', 'Meningkatnya kemampuan baca Al-Qur\'an'],
  ['Kerukunan umat beragama', 'Tokoh agama/masyarakat', 'Dialog dan silaturahmi', '4', 'Terpeliharanya komunikasi dan kerukunan'],
  ['Penyuluhan sosial keagamaan', 'Masyarakat', 'Sosialisasi/pendampingan', '4', 'Masyarakat memperoleh informasi dan pendampingan'],
  ['Konsultasi keagamaan', 'Individu/kelompok', 'Konsultasi', '12 bulan', 'Permasalahan keagamaan mendapat layanan'],
  ['Peringatan hari besar keagamaan', 'Masyarakat', 'Ceramah/kegiatan keagamaan', 'Sesuai kalender', 'Partisipasi masyarakat meningkat'],
  ['Dokumentasi dan pelaporan', 'Internal', 'Administrasi, dokumentasi, laporan', '12 laporan', 'Tersedianya laporan kegiatan yang tertib'],
]

const RENCANA_BULANAN = [
  ['Januari', 'Pemetaan kelompok binaan; koordinasi dengan KUA dan pemerintah setempat; penyusunan jadwal.'],
  ['Februari', 'Pembinaan majelis taklim; penyuluhan keluarga; pembinaan generasi muda.'],
  ['Maret', 'Penyuluhan keagamaan; pembinaan baca Al-Qur\'an; konsultasi masyarakat.'],
  ['April', 'Pembinaan keluarga; majelis taklim; kegiatan sosial keagamaan.'],
  ['Mei', 'Pembinaan generasi muda; dialog kerukunan; penyuluhan masyarakat.'],
  ['Juni', 'Evaluasi Semester I; kunjungan dan penguatan kelompok binaan.'],
  ['Juli', 'Pembinaan majelis taklim; keluarga; generasi muda.'],
  ['Agustus', 'Penyuluhan sosial kemasyarakatan; pembinaan kerukunan.'],
  ['September', 'Pembinaan keagamaan; konsultasi; pendampingan kelompok.'],
  ['Oktober', 'Pembinaan keluarga; majelis taklim; generasi muda.'],
  ['November', 'Evaluasi kelompok binaan; penguatan program pembinaan.'],
  ['Desember', 'Evaluasi tahunan; penyusunan laporan; rancangan program tahun berikutnya.'],
]

const MATERI_METODE = [
  ['Akidah, ibadah, akhlak, Al-Qur\'an dan Hadis', 'Ceramah, diskusi, tanya jawab'],
  ['Keluarga sakinah dan pembinaan rumah tangga', 'Bimbingan, konsultasi, pendampingan'],
  ['Pembinaan remaja dan generasi muda', 'Diskusi, kajian, pembinaan kelompok'],
  ['Moderasi dan kerukunan umat beragama', 'Dialog, silaturahmi, sosialisasi'],
  ['Pemberdayaan dan kepedulian sosial', 'Pelatihan, pendampingan, praktik'],
  ['Literasi keagamaan dan penggunaan media digital', 'Sosialisasi, edukasi, konsultasi'],
]

const INDIKATOR_KINERJA = [
  ['Kegiatan penyuluhan terlaksana', 'Sesuai RKTP', 'Jadwal, daftar hadir, foto, laporan'],
  ['Kelompok binaan mendapat pembinaan', 'Sesuai pemetaan', 'Daftar kelompok dan catatan pembinaan'],
  ['Layanan konsultasi keagamaan', '12 bulan', 'Rekap konsultasi'],
  ['Pelaporan kegiatan', '12 laporan bulanan', 'Laporan bulanan'],
  ['Evaluasi pelaksanaan', 'Minimal 2 kali', 'Berita/catatan evaluasi'],
]

const MONEV = [
  'Monitoring dilakukan melalui kunjungan lapangan, koordinasi dengan kelompok binaan, pemeriksaan dokumentasi, dan pencatatan hasil kegiatan.',
  'Evaluasi dilakukan secara berkala setiap bulan, triwulan, semester, dan akhir tahun sesuai kebutuhan.',
  'Setiap kegiatan dilengkapi bukti pendukung berupa daftar hadir, materi, dokumentasi foto, catatan hasil kegiatan, dan laporan.',
  'Hasil monitoring dan evaluasi digunakan untuk memperbaiki pelaksanaan program dan menjadi bahan penyusunan rencana kerja periode berikutnya.',
]

const PENUTUP =
  'RKTP ini disusun sebagai pedoman pelaksanaan tugas Penyuluh Agama selama tahun {tahun}. Rencana kegiatan dapat disesuaikan dengan kondisi lapangan, kebutuhan masyarakat, arahan pimpinan, kalender kegiatan, dan kebijakan yang berlaku.'

/* ------------------------------------------------------------------ */
/*  Komponen kecil untuk form                                          */
/* ------------------------------------------------------------------ */

const inputClass =
  'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500'

function FieldText({ label, value, onChange, placeholder, type = 'text', ...rest }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
        {...rest}
      />
    </div>
  )
}

function FieldArea({ label, value, onChange, placeholder }) {
  return (
    <div className="sm:col-span-2">
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Halaman                                                            */
/* ------------------------------------------------------------------ */

export default function RKTPPenyuluh2() {
  const { profil, sekolahId } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)

  // === DATA RKTP — DAPAT DIISI ULANG SETIAP KALI DIPAKAI ===
  // Kolom yang dikosongkan akan otomatis ditarik dari profil kantor / akun login.
  const [tahun, setTahun] = useState(2026)
  const [namaPenyuluh, setNamaPenyuluh] = useState('YENNY YUSUF, S.HI')
  const [nipPenyuluh, setNipPenyuluh] = useState('')
  const [jabatan, setJabatan] = useState('Penyuluh Agama Islam')
  const [pangkatGolongan, setPangkatGolongan] = useState('')
  const [statusPenyuluh, setStatusPenyuluh] = useState('PNS')
  const [satuanKerja, setSatuanKerja] = useState('')
  const [wilayahKerja, setWilayahKerja] = useState('')
  const [desaBinaan, setDesaBinaan] = useState('Desa Tabarfane')
  const [kelompokBinaan, setKelompokBinaan] = useState('Masyarakat')
  const [jumlahDesa, setJumlahDesa] = useState('')
  const [karakteristik, setKarakteristik] = useState('')
  const [isuPrioritas, setIsuPrioritas] = useState('')
  const [potensiWilayah, setPotensiWilayah] = useState('')
  const [tanggalDokumen, setTanggalDokumen] = useState(todayISO())

  // Query profil_kantor di-scope per kantor lewat sekolah_id (sama seperti
  // ProfilKantor.jsx, KopSurat.jsx, dan halaman laporan penyuluhan).
  useEffect(() => {
    if (!sekolahId) {
      setProfilKantor(null)
      return
    }
    supabase
      .from('profil_kantor')
      .select('nama_kantor, alamat, kabupaten, kecamatan, telepon, email, kepala_kua, nip_kepala_kua, tempat_ttd, logo_path, ttd_kepala_kua_path')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data }) => setProfilKantor(data))
  }, [sekolahId])

  const logoUrl = profilKantor?.logo_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.logo_path).data.publicUrl
    : null

  const ttdKepalaKuaUrl = profilKantor?.ttd_kepala_kua_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.ttd_kepala_kua_path).data.publicUrl
    : null

  // Nilai efektif: isian manual > data profil kantor / akun login
  const namaEfektif = namaPenyuluh || profil?.nama_lengkap || ''
  const nipEfektif = nipPenyuluh || profil?.nip || ''
  const satuanKerjaEfektif = satuanKerja || profilKantor?.nama_kantor || ''
  const wilayahEfektif = wilayahKerja || profilKantor?.kecamatan || ''

  const tempatTtd = profilKantor?.tempat_ttd || profilKantor?.kabupaten || ''
  const tanggalDokumenFormatted = formatTanggalIndonesia(tanggalDokumen)
  const tahunTampil = tahun || new Date().getFullYear()
  const sisipTahun = (teks) => teks.replace('{tahun}', tahunTampil)

  const cellHead = 'border border-slate-400 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-800'
  const cell = 'border border-slate-400 px-2 py-1.5 align-top'
  const cellCenter = `${cell} text-center`

  const identitas = [
    ['Nama Penyuluh', isi(namaEfektif)],
    ['NIP/NI PPPK', isi(nipEfektif)],
    ['Jabatan', isi(jabatan)],
    ['Pangkat/Golongan', isi(pangkatGolongan)],
    ['Status Penyuluh', statusPenyuluh || PLACEHOLDER],
    ['Kantor/Satuan Kerja', isi(satuanKerjaEfektif)],
    ['Kecamatan/Wilayah Kerja', isi(wilayahEfektif)],
    ['Desa/Kelurahan Binaan', isi(desaBinaan)],
    ['Kelompok Binaan', isi(kelompokBinaan)],
    ['Tahun Pelaksanaan', String(tahunTampil)],
  ]

  const gambaranWilayah = [
    ['Wilayah kerja', isi([wilayahEfektif, desaBinaan].filter(Boolean).join(' — '))],
    ['Jumlah desa/kelurahan binaan', isi(jumlahDesa)],
    ['Kelompok binaan utama', isi(kelompokBinaan)],
    ['Karakteristik masyarakat', isi(karakteristik)],
    ['Permasalahan/isu prioritas', isi(isuPrioritas)],
    ['Potensi wilayah', isi(potensiWilayah)],
    ['Mitra kerja', MITRA_KERJA],
  ]

  return (
    <Layout
      title="RKTP Penyuluh 2"
      subtitle="Rencana Kerja Tahunan Penyuluh Agama (RKTP), otomatis terisi dari profil kantor dan siap cetak."
    >
      <div className="no-print flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-5">
        <Link
          to={HALAMAN_KEMBALI}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Kembali ke Pusat Materi
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
        >
          <Printer size={16} /> Cetak RKTP
        </button>
      </div>

      {/* === FORM DATA RKTP — TIDAK IKUT TERCETAK === */}
      <div className="no-print bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 mb-5">
        <h2 className="font-display text-sm font-semibold text-slate-900 mb-3">
          Identitas &amp; Data RKTP
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldText label="Nama Penyuluh" value={namaPenyuluh} onChange={setNamaPenyuluh} />
          <FieldText
            label="NIP / NI PPPK"
            value={nipPenyuluh}
            onChange={setNipPenyuluh}
            placeholder={profil?.nip ? `Otomatis: ${profil.nip}` : 'Opsional'}
          />
          <FieldText label="Jabatan" value={jabatan} onChange={setJabatan} />
          <FieldText
            label="Pangkat / Golongan"
            value={pangkatGolongan}
            onChange={setPangkatGolongan}
            placeholder="Contoh: Penata Muda Tk.I (III/b)"
          />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status Penyuluh</label>
            <select
              value={statusPenyuluh}
              onChange={(e) => setStatusPenyuluh(e.target.value)}
              className={inputClass}
            >
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="Non-PNS">Non-PNS</option>
            </select>
          </div>
          <FieldText
            label="Tahun Pelaksanaan"
            type="number"
            min="2000"
            value={tahun}
            onChange={setTahun}
          />
          <FieldText
            label="Kantor / Satuan Kerja"
            value={satuanKerja}
            onChange={setSatuanKerja}
            placeholder={profilKantor?.nama_kantor ? `Otomatis: ${profilKantor.nama_kantor}` : 'Otomatis dari Profil Kantor'}
          />
          <FieldText
            label="Kecamatan / Wilayah Kerja"
            value={wilayahKerja}
            onChange={setWilayahKerja}
            placeholder={profilKantor?.kecamatan ? `Otomatis: ${profilKantor.kecamatan}` : 'Otomatis dari Profil Kantor'}
          />
          <FieldText label="Desa / Kelurahan Binaan" value={desaBinaan} onChange={setDesaBinaan} />
          <FieldText label="Kelompok Binaan" value={kelompokBinaan} onChange={setKelompokBinaan} />
          <FieldText
            label="Jumlah Desa/Kelurahan Binaan"
            value={jumlahDesa}
            onChange={setJumlahDesa}
            placeholder="Contoh: 2 desa"
          />
          <FieldText
            label="Tanggal Dokumen"
            type="date"
            value={tanggalDokumen}
            onChange={setTanggalDokumen}
          />
          <FieldArea
            label="Karakteristik Masyarakat"
            value={karakteristik}
            onChange={setKarakteristik}
            placeholder="Kosongkan bila ingin ditulis tangan"
          />
          <FieldArea
            label="Permasalahan / Isu Prioritas"
            value={isuPrioritas}
            onChange={setIsuPrioritas}
            placeholder="Kosongkan bila ingin ditulis tangan"
          />
          <FieldArea
            label="Potensi Wilayah"
            value={potensiWilayah}
            onChange={setPotensiWilayah}
            placeholder="Kosongkan bila ingin ditulis tangan"
          />
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Kop surat, nama Kepala KUA, NIP, tempat tanda tangan, dan tanda tangan Kepala KUA
          ditarik otomatis dari Profil Kantor. Kolom Kantor/Satuan Kerja, Kecamatan/Wilayah Kerja,
          NIP, dan nama penyuluh yang dikosongkan akan terisi otomatis dari Profil Kantor atau akun
          yang sedang login. Kolom yang tetap kosong akan tercetak sebagai titik-titik untuk diisi
          tangan.
        </p>
      </div>

      {/* === PRATINJAU CETAK — dibungkus scroll horizontal di layar HP,
          supaya lembar A4 (210mm) tidak merusak tata letak layar sempit === */}
      <div className="print:overflow-visible overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-4">
        <div
          className="lembar-cetak print-only bg-white rounded-2xl border border-slate-100 p-5 sm:p-8 mx-auto"
          style={{ width: '210mm', maxWidth: 'none' }}
        >
          {/* === KOP SURAT OTOMATIS === */}
          <div className="kop-surat flex items-center gap-4 border-b-2 border-slate-800 pb-3 mb-6">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo Instansi"
                className="w-16 h-16 object-contain shrink-0"
              />
            )}
            <div className="text-center flex-1">
              <p className="font-display text-sm font-bold uppercase text-slate-900 leading-tight">
                Kementerian Agama Republik Indonesia
              </p>
              <p className="font-display text-base font-bold uppercase text-slate-900 leading-tight">
                {profilKantor?.nama_kantor || 'Nama Kantor Belum Diatur'}
              </p>
              <p className="text-xs text-slate-600 leading-tight">
                {[profilKantor?.alamat, profilKantor?.kecamatan, profilKantor?.kabupaten]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {(profilKantor?.telepon || profilKantor?.email) && (
                <p className="text-xs text-slate-600 leading-tight">
                  {[profilKantor?.telepon && `Telp. ${profilKantor.telepon}`, profilKantor?.email]
                    .filter(Boolean)
                    .join(' | ')}
                </p>
              )}
            </div>
          </div>

          {/* === JUDUL === */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <ClipboardList size={20} />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-slate-900">
                Rencana Kerja Tahunan Penyuluh Agama (RKTP)
              </h1>
              <p className="text-xs text-slate-500">Tahun {tahunTampil}</p>
            </div>
          </div>

          {/* === TABEL IDENTITAS === */}
          <div className="my-5 border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-56 px-3 py-2 text-left font-semibold text-slate-700">Identitas</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {identitas.map(([label, nilai], i) => (
                  <tr key={label} className={i < identitas.length - 1 ? 'border-b border-slate-200' : ''}>
                    <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50">{label}</td>
                    <td className="px-3 py-2 text-slate-800">{nilai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-slate-700">
            {/* I. PENDAHULUAN */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                I. Pendahuluan
              </h2>
              <h3 className="font-medium text-slate-800 mt-2 mb-1">A. Latar Belakang</h3>
              <p className="text-justify">{LATAR_BELAKANG}</p>

              <h3 className="font-medium text-slate-800 mt-3 mb-1">B. Maksud dan Tujuan</h3>
              <ol className="list-decimal pl-5 space-y-1">
                {MAKSUD_TUJUAN.map((t) => (
                  <li key={t}>{sisipTahun(t)}</li>
                ))}
              </ol>

              <h3 className="font-medium text-slate-800 mt-3 mb-1">C. Dasar Pelaksanaan</h3>
              <ol className="list-decimal pl-5 space-y-1">
                {DASAR_PELAKSANAAN.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </section>

            {/* II. GAMBARAN WILAYAH */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                II. Gambaran Wilayah dan Sasaran Binaan
              </h2>
              <table className="rktp-table w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={`${cellHead} w-10 text-center`}>No</th>
                    <th className={`${cellHead} w-48`}>Unsur</th>
                    <th className={cellHead}>Uraian</th>
                  </tr>
                </thead>
                <tbody>
                  {gambaranWilayah.map(([unsur, uraian], i) => (
                    <tr key={unsur}>
                      <td className={cellCenter}>{i + 1}</td>
                      <td className={cell}>{unsur}</td>
                      <td className={cell}>{uraian}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* III. PROGRAM */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                III. Program dan Rencana Kerja Tahunan
              </h2>
              <table className="rktp-table w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={`${cellHead} w-8 text-center`}>No</th>
                    <th className={cellHead}>Program</th>
                    <th className={cellHead}>Sasaran</th>
                    <th className={cellHead}>Bentuk</th>
                    <th className={`${cellHead} text-center`}>Target</th>
                    <th className={cellHead}>Output/Indikator</th>
                  </tr>
                </thead>
                <tbody>
                  {PROGRAM_KERJA.map(([program, sasaran, bentuk, target, output], i) => (
                    <tr key={program}>
                      <td className={cellCenter}>{i + 1}</td>
                      <td className={cell}>{program}</td>
                      <td className={cell}>{sasaran}</td>
                      <td className={cell}>{bentuk}</td>
                      <td className={cellCenter}>{target}</td>
                      <td className={cell}>{output}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* IV. RENCANA BULANAN */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                IV. Rencana Kerja Bulanan
              </h2>
              <table className="rktp-table w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={`${cellHead} w-28`}>Bulan</th>
                    <th className={cellHead}>Rencana Kegiatan</th>
                  </tr>
                </thead>
                <tbody>
                  {RENCANA_BULANAN.map(([bulan, kegiatan]) => (
                    <tr key={bulan}>
                      <td className={`${cell} font-medium`}>{bulan}</td>
                      <td className={cell}>{kegiatan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* V. MATERI & METODE */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                V. Materi dan Metode Penyuluhan
              </h2>
              <table className="rktp-table w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={cellHead}>Materi Prioritas</th>
                    <th className={cellHead}>Metode</th>
                  </tr>
                </thead>
                <tbody>
                  {MATERI_METODE.map(([materi, metode]) => (
                    <tr key={materi}>
                      <td className={cell}>{materi}</td>
                      <td className={cell}>{metode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* VI. INDIKATOR */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                VI. Indikator Kinerja
              </h2>
              <table className="rktp-table w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={`${cellHead} w-8 text-center`}>No</th>
                    <th className={cellHead}>Indikator</th>
                    <th className={cellHead}>Target Tahunan</th>
                    <th className={cellHead}>Bukti/Dokumen</th>
                  </tr>
                </thead>
                <tbody>
                  {INDIKATOR_KINERJA.map(([indikator, target, bukti], i) => (
                    <tr key={indikator}>
                      <td className={cellCenter}>{i + 1}</td>
                      <td className={cell}>{indikator}</td>
                      <td className={cell}>{target}</td>
                      <td className={cell}>{bukti}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* VII. MONEV */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                VII. Monitoring, Evaluasi, dan Pelaporan
              </h2>
              <ol className="list-decimal pl-5 space-y-1">
                {MONEV.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </section>

            {/* VIII. PENUTUP */}
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                VIII. Penutup
              </h2>
              <p className="text-justify">{sisipTahun(PENUTUP)}</p>
            </section>
          </div>

          {/* === TANDA TANGAN OTOMATIS === */}
          <div className="ttd-block flex justify-between mt-10 text-sm text-slate-700">
            <div className="text-center w-56">
              <p>Mengetahui,</p>
              <p>Kepala KUA Kecamatan {profilKantor?.kecamatan || '................'}</p>
              <div className="h-20 flex items-end justify-center">
                {ttdKepalaKuaUrl && (
                  <img
                    src={ttdKepalaKuaUrl}
                    alt="Tanda Tangan Kepala KUA"
                    className="max-h-20 object-contain"
                  />
                )}
              </div>
              <p className="font-semibold border-t border-slate-400 pt-1">
                ({profilKantor?.kepala_kua || PLACEHOLDER})
              </p>
              <p className="text-xs text-slate-500">
                NIP. {profilKantor?.nip_kepala_kua || PLACEHOLDER}
              </p>
            </div>
            <div className="text-center w-56">
              <p>
                {tempatTtd && tanggalDokumenFormatted
                  ? `${tempatTtd}, ${tanggalDokumenFormatted}`
                  : '\u00A0'}
              </p>
              <p>Dibuat oleh, Penyuluh Agama</p>
              <div className="h-20" />
              <p className="font-semibold border-t border-slate-400 pt-1">
                ({namaEfektif || PLACEHOLDER})
              </p>
              <p className="text-xs text-slate-500">
                NIP/NI PPPK. {nipEfektif || PLACEHOLDER}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .lembar-cetak.print-only {
          position: static !important;
          top: auto !important;
          left: auto !important;
          right: auto !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }

        @media screen {
          .lembar-cetak.print-only {
            display: block !important;
          }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .rktp-table {
            page-break-inside: auto;
          }
          .rktp-table thead {
            display: table-header-group;
          }
          .rktp-table tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .lembar-cetak section h2 {
            page-break-after: avoid;
            break-after: avoid;
          }
          .ttd-block {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
        @page {
          size: A4;
          margin: 15mm;
        }
      `}</style>
    </Layout>
  )
}
