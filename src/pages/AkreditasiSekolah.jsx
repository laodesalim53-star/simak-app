import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import {
  ShieldCheck, ChevronDown, Upload, Link2, ExternalLink, Loader2, Search,
  Trash2, Save, FileText, ArrowRight,
} from 'lucide-react'

// ============================================================
// BERKAS AKREDITASI SD & SMP
//
// Checklist berkas untuk persiapan akreditasi, dikelompokkan menurut
// komponen instrumen BAN-S/M (IASP 2020: Mutu Lulusan, Proses
// Pembelajaran, Mutu Guru, Manajemen Sekolah) ditambah kelompok
// "Identitas & Legalitas". Setiap butir punya status, berkas unggahan
// (bucket Supabase "akreditasi"), tautan (mis. Google Drive), dan catatan.
//
// PENTING: daftar butir di KOMPONEN di bawah adalah daftar kerja yang
// bisa Anda ubah bebas. Cocokkan dengan instrumen & petunjuk teknis
// akreditasi terbaru dari BAN-S/M sebelum dipakai sebagai acuan resmi.
//
// j : bila diisi, butir hanya tampil untuk jenjang itu ('sd' / 'smp').
//
// SUMBER_APP : pintasan dari tiap butir ke halaman di aplikasi yang
// menyimpan datanya (Data Guru, Inventaris, Gudang SK, dst).
//
// Tabel & kebijakan akses: lihat akreditasi_berkas.sql.
//
// PERUBAHAN:
// 1) sekolahId & hak edit sekarang diambil langsung dari AuthContext
//    (sekolahId, isAdmin), sama seperti halaman lain. Fallback query ke
//    tabel "profil" dihapus. Hak edit memakai isAdmin, yang sudah mencakup
//    admin, admin_utama, superadmin, dan kepala_sekolah (role).
//    PASTIKAN kebijakan RLS tabel akreditasi_berkas & bucket "akreditasi"
//    mengizinkan peran yang sama.
// 2) Catatan/tautan yang belum disimpan tidak lagi hilang saat unggah
//    berkas: isi draft ikut disimpan bersama unggahan.
// 3) Kalau berkas sudah terunggah tapi penyimpanan ke tabel gagal,
//    berkas di storage ikut dihapus (tidak jadi berkas yatim).
// 4) Hitungan ARKAS, BKU, dan siswa disaring per sekolah (sekolah_id);
//    siswa hanya yang berstatus aktif.
// ============================================================

const BUCKET = 'akreditasi'
const BATAS_MB = 10

const OPSI_JENJANG = [
  { id: 'sd', label: 'SD' },
  { id: 'smp', label: 'SMP' },
]

const STATUS = [
  { v: 'belum', label: 'Belum ada', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  { v: 'proses', label: 'Sedang disiapkan', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  { v: 'lengkap', label: 'Lengkap', cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
]

const KOMPONEN = [
  {
    id: 'legalitas', nama: 'Identitas & Legalitas', bar: 'bg-slate-600',
    items: [
      { kode: 'LEG-01', judul: 'Profil sekolah & NPSN', bukti: 'Data pokok sekolah (Dapodik), NPSN' },
      { kode: 'LEG-02', judul: 'SK Izin Operasional / pendirian', bukti: 'SK dari dinas pendidikan' },
      { kode: 'LEG-03', judul: 'Sertifikat akreditasi sebelumnya', bukti: 'Sertifikat & hasil akreditasi terakhir' },
      { kode: 'LEG-04', judul: 'Surat permohonan akreditasi / visitasi', bukti: 'Surat dari sekolah ke BAN-S/M atau dinas' },
      { kode: 'LEG-05', judul: 'Bukti kepemilikan lahan & bangunan', bukti: 'Sertifikat tanah / hibah / sewa' },
    ],
  },
  {
    id: 'lulusan', nama: 'Mutu Lulusan', bar: 'bg-blue-600',
    items: [
      { kode: 'LUL-01', judul: 'Hasil belajar peserta didik', bukti: 'Rekap nilai rapor 3 tahun terakhir' },
      { kode: 'LUL-02', judul: 'Hasil asesmen nasional & Rapor Pendidikan', bukti: 'Laporan hasil asesmen, Rapor Pendidikan' },
      { kode: 'LUL-03', judul: 'Penguatan Profil Pelajar Pancasila (P5)', bukti: 'Modul projek, dokumentasi, laporan P5' },
      { kode: 'LUL-04', judul: 'Prestasi peserta didik', bukti: 'Piagam & sertifikat lomba (akademik/non-akademik)' },
      { kode: 'LUL-05', judul: 'Ekstrakurikuler & pembinaan karakter', bukti: 'SK pembina, jadwal, dokumentasi kegiatan' },
      { kode: 'LUL-06', judul: 'Data kelulusan & kelanjutan studi ke SMP', j: ['sd'], bukti: 'Daftar lulusan & sekolah tujuan' },
      { kode: 'LUL-07', judul: 'Data kelulusan & kelanjutan studi ke SMA/SMK/MA', j: ['smp'], bukti: 'Daftar lulusan & sekolah tujuan' },
    ],
  },
  {
    id: 'pembelajaran', nama: 'Proses Pembelajaran', bar: 'bg-emerald-600',
    items: [
      { kode: 'PRO-01', judul: 'Kurikulum Operasional Satuan Pendidikan (KOSP)', bukti: 'Dokumen KOSP & SK pengesahan' },
      { kode: 'PRO-02', judul: 'Perangkat ajar (ATP, modul ajar)', bukti: 'Modul ajar per mata pelajaran/kelas' },
      { kode: 'PRO-03', judul: 'Kalender pendidikan & jadwal pelajaran', bukti: 'Kalender pendidikan, jadwal semester berjalan' },
      { kode: 'PRO-04', judul: 'Rombel kelas 1–6 & wali kelas', j: ['sd'], bukti: 'SK pembagian kelas & wali kelas' },
      { kode: 'PRO-05', judul: 'Rombel kelas 7–9 & wali kelas', j: ['smp'], bukti: 'SK pembagian kelas & wali kelas' },
      { kode: 'PRO-06', judul: 'Asesmen pembelajaran & tindak lanjutnya', bukti: 'Soal, analisis hasil, program remedial/pengayaan' },
      { kode: 'PRO-07', judul: 'Supervisi & observasi pembelajaran', bukti: 'Instrumen supervisi, hasil, tindak lanjut' },
      { kode: 'PRO-08', judul: 'Jurnal mengajar & dokumentasi pembelajaran', bukti: 'Jurnal mengajar, foto/video kegiatan belajar' },
      { kode: 'PRO-09', judul: 'Layanan bimbingan konseling (BK)', j: ['smp'], bukti: 'Program BK, catatan layanan, SK guru BK' },
    ],
  },
  {
    id: 'guru', nama: 'Mutu Guru', bar: 'bg-violet-600',
    items: [
      { kode: 'GUR-01', judul: 'Data guru & kualifikasi akademik', bukti: 'Rekap guru, ijazah, sertifikat pendidik' },
      { kode: 'GUR-02', judul: 'SK pembagian tugas & beban kerja', bukti: 'SK tugas mengajar & tugas tambahan' },
      { kode: 'GUR-03', judul: 'Pengembangan kompetensi guru', bukti: 'Sertifikat pelatihan, bukti kegiatan' },
      { kode: 'GUR-04', judul: 'Kegiatan KKG (kelompok kerja guru)', j: ['sd'], bukti: 'Jadwal, notulen, daftar hadir KKG' },
      { kode: 'GUR-05', judul: 'Kegiatan MGMP (musyawarah guru mata pelajaran)', j: ['smp'], bukti: 'Jadwal, notulen, daftar hadir MGMP' },
      { kode: 'GUR-06', judul: 'Penilaian kinerja guru', bukti: 'Hasil penilaian kinerja & refleksi' },
      { kode: 'GUR-07', judul: 'Presensi & kedisiplinan guru', bukti: 'Rekap presensi guru' },
    ],
  },
  {
    id: 'manajemen', nama: 'Manajemen Sekolah', bar: 'bg-orange-600',
    items: [
      { kode: 'MAN-01', judul: 'Visi, misi & tujuan sekolah', bukti: 'Dokumen visi-misi, bukti sosialisasi' },
      { kode: 'MAN-02', judul: 'Perencanaan berbasis data (RKT/RKS)', bukti: 'Rencana kerja tahunan/jangka menengah, hasil refleksi' },
      { kode: 'MAN-03', judul: 'RKAS & pengelolaan dana BOS', bukti: 'RKAS, BKU, laporan penggunaan BOS' },
      { kode: 'MAN-04', judul: 'Struktur organisasi & tim kerja', bukti: 'Bagan organisasi, SK tim' },
      { kode: 'MAN-05', judul: 'Sarana & prasarana', bukti: 'Inventaris, daftar ruang, kondisi bangunan' },
      { kode: 'MAN-06', judul: 'Komite sekolah & kemitraan', bukti: 'SK komite, notulen rapat, MoU' },
      { kode: 'MAN-07', judul: 'Tata tertib & pedoman sekolah', bukti: 'Tata tertib, kode etik, SOP layanan' },
      { kode: 'MAN-08', judul: 'Data peserta didik & PPDB', bukti: 'Dapodik, panitia & hasil PPDB' },
    ],
  },
]

// Butir akreditasi -> halaman di aplikasi yang menyimpan datanya.
// Alamat (to) harus sama dengan rute di App.jsx. Ubah bebas bila ada yang kurang pas.
const SUMBER_APP = {
  'LEG-01': [{ to: '/profil-sekolah', label: 'Profil Sekolah' }],
  'LEG-02': [{ to: '/dokumen', label: 'Dokumen Penting' }],
  'LEG-03': [{ to: '/dokumen', label: 'Dokumen Penting' }],
  'LEG-04': [{ to: '/surat', label: 'Surat Masuk/Keluar' }],
  'LEG-05': [{ to: '/dokumen', label: 'Dokumen Penting' }],
  'LUL-01': [{ to: '/administrasi-kelas', label: 'Administrasi Kelas (Rapor)' }],
  'LUL-02': [{ to: '/nilai-asesmen', label: 'Nilai Asesmen' }],
  'LUL-03': [{ to: '/portofolio-siswa', label: 'Portofolio Siswa' }],
  'LUL-04': [{ to: '/sertifikat', label: 'Sertifikat & Penghargaan' }],
  'LUL-05': [{ to: '/gudang-sk/pembina-ekstrakurikuler', label: 'SK Pembina Ekstrakurikuler' }],
  'LUL-06': [{ to: '/siswa', label: 'Data Siswa' }],
  'LUL-07': [{ to: '/siswa', label: 'Data Siswa' }],
  'PRO-01': [{ to: '/administrasi-kepsek', label: 'Administrasi Kepsek' }],
  'PRO-02': [{ to: '/administrasi-kelas', label: 'Administrasi Kelas' }],
  'PRO-03': [{ to: '/kalender-pendidikan', label: 'Kalender Pendidikan' }],
  'PRO-04': [{ to: '/gudang-sk/wali-kelas', label: 'SK Wali Kelas' }],
  'PRO-05': [{ to: '/gudang-sk/wali-kelas', label: 'SK Wali Kelas' }],
  'PRO-06': [{ to: '/hasil-ujian', label: 'Hasil Ujian' }],
  'PRO-07': [{ to: '/administrasi-kepsek/supervisi-akademik', label: 'Supervisi Akademik' }],
  'PRO-08': [{ to: '/administrasi-kelas', label: 'Administrasi Kelas' }],
  'GUR-01': [{ to: '/guru', label: 'Data Guru' }],
  'GUR-02': [
    { to: '/gudang-sk/beban-mengajar', label: 'SK Beban Mengajar' },
    { to: '/gudang-sk/keterangan-melaksanakan-tugas', label: 'Keterangan Melaksanakan Tugas' },
  ],
  'GUR-03': [{ to: '/laporan-guru', label: 'Pusat Laporan Kepegawaian' }],
  'GUR-06': [{ to: '/administrasi-kepsek/kinerja-tendik', label: 'Kinerja Tendik' }],
  'GUR-07': [{ to: '/daftar-hadir-pegawai', label: 'Daftar Hadir Guru & Tendik' }],
  'MAN-01': [{ to: '/administrasi-kepsek', label: 'Administrasi Kepsek' }],
  'MAN-02': [{ to: '/administrasi-kepsek', label: 'Administrasi Kepsek' }],
  'MAN-03': [
    { to: '/bku-bank', label: 'BKU Bank' },
    { to: '/keuangan', label: 'Keuangan' },
    { to: '/gudang-sk/tim-bos', label: 'SK Tim BOS' },
    { to: '/gudang-sk/bendahara-bos', label: 'SK Bendahara BOS' },
  ],
  'MAN-04': [
    { to: '/gudang-sk/tim-bos', label: 'SK Tim BOS' },
    { to: '/gudang-sk/panitia-ujian', label: 'SK Panitia Ujian' },
    { to: '/gudang-sk/panitia-ppdb', label: 'SK Panitia PPDB' },
  ],
  'MAN-05': [
    { to: '/inventaris', label: 'Inventaris' },
    { to: '/bangunan', label: 'Kondisi Bangunan' },
  ],
  'MAN-06': [{ to: '/gudang-sk', label: 'Gudang SK' }],
  'MAN-07': [{ to: '/administrasi-kepsek', label: 'Administrasi Kepsek' }],
  'MAN-08': [
    { to: '/siswa', label: 'Data Siswa' },
    { to: '/ppdb-admin', label: 'PPDB Siswa Baru' },
    { to: '/gudang-sk/panitia-ppdb', label: 'SK Panitia PPDB' },
  ],
}

// ---- Pembantu -----------------------------------------------------------
function itemUntuk(komponen, jenjang) {
  return komponen.items.filter((it) => !it.j || it.j.includes(jenjang))
}

function namaAman(nama) {
  return nama.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80)
}

function Batang({ persen, warna = 'bg-blue-600' }) {
  return (
    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden" role="presentation">
      <div className={`h-full rounded-full ${warna} transition-all`} style={{ width: `${persen}%` }} />
    </div>
  )
}

// ---- Satu baris butir (di LUAR komponen utama supaya state-nya stabil) --
function BarisButir({ item, data, info = [], terbuka, onToggle, bisaEdit, sibuk, onSimpan, onUnggah, onHapusFile, onBukaFile }) {
  const status = data?.status || 'belum'
  const st = STATUS.find((s) => s.v === status) || STATUS[0]
  const [draft, setDraft] = useState({ status, tautan: data?.tautan || '', catatan: data?.catatan || '' })
  const [galat, setGalat] = useState('')
  const sumber = SUMBER_APP[item.kode]

  useEffect(() => {
    setDraft({ status, tautan: data?.tautan || '', catatan: data?.catatan || '' })
    setGalat('')
  }, [terbuka, status, data?.tautan, data?.catatan])

  // Tautan harus http(s). Mengembalikan null kalau tidak valid.
  function tautanBersih() {
    const tautan = draft.tautan.trim()
    if (tautan && !/^https?:\/\//i.test(tautan)) return null
    return tautan
  }

  async function simpanDraft() {
    const tautan = tautanBersih()
    if (tautan === null) {
      setGalat('Tautan harus diawali http:// atau https://')
      return
    }
    setGalat('')
    await onSimpan(item.kode, {
      status: draft.status,
      tautan: tautan || null,
      catatan: draft.catatan.trim() || null,
    })
  }

  function unggahBerkas(f) {
    const tautan = tautanBersih()
    if (tautan === null) {
      setGalat('Tautan harus diawali http:// atau https://')
      return
    }
    setGalat('')
    // Isi draft ikut disimpan bersama unggahan, supaya catatan/tautan yang
    // belum disimpan tidak hilang ketika status berubah otomatis.
    onUnggah(item.kode, f, {
      tautan: tautan || null,
      catatan: draft.catatan.trim() || null,
    })
  }

  return (
    <li className="border-t border-slate-200 first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={terbuka}
        className="w-full flex items-start gap-3 text-left px-4 py-3 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <span className="mt-0.5 shrink-0 text-[11px] font-bold text-slate-500 w-14">{item.kode}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-slate-900">{item.judul}</span>
          <span className="block text-xs text-slate-500 mt-0.5">{item.bukti}</span>
          {(data?.file_path || data?.tautan) && (
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-blue-700">
              <FileText size={12} />
              {data?.file_path ? 'Berkas terunggah' : 'Ada tautan'}
              {data?.file_path && data?.tautan ? ' + tautan' : ''}
            </span>
          )}
        </span>
        <span className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full border ${st.cls}`}>{st.label}</span>
        <ChevronDown size={16} className={`shrink-0 mt-1 text-slate-400 transition-transform ${terbuka ? 'rotate-180' : ''}`} />
      </button>

      {terbuka && (
        <div className="px-4 pb-4 pt-1 space-y-3 bg-slate-50/60">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`st-${item.kode}`} className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                id={`st-${item.kode}`}
                value={draft.status}
                disabled={!bisaEdit}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
              >
                {STATUS.map((s) => (
                  <option key={s.v} value={s.v}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`tl-${item.kode}`} className="block text-xs font-medium text-slate-600 mb-1">
                Tautan berkas (opsional, mis. Google Drive)
              </label>
              <div className="relative">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id={`tl-${item.kode}`}
                  type="url"
                  inputMode="url"
                  disabled={!bisaEdit}
                  placeholder="https://..."
                  value={draft.tautan}
                  onChange={(e) => setDraft((d) => ({ ...d, tautan: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor={`ct-${item.kode}`} className="block text-xs font-medium text-slate-600 mb-1">Catatan</label>
            <textarea
              id={`ct-${item.kode}`}
              rows={2}
              disabled={!bisaEdit}
              placeholder="Mis. menunggu tanda tangan kepala sekolah, tahun 2024 belum ada..."
              value={draft.catatan}
              onChange={(e) => setDraft((d) => ({ ...d, catatan: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>

          {sumber && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">Data di aplikasi:</span>
              {sumber.map((s) => (
                <Link
                  key={s.to + s.label}
                  to={s.to}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <ArrowRight size={12} />
                  {s.label}
                </Link>
              ))}
              {info.map((t) => (
                <span key={t} className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 font-medium text-slate-700">
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {data?.file_path && (
              <>
                <button
                  type="button"
                  onClick={() => onBukaFile(data.file_path)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <ExternalLink size={13} />
                  Buka {data.file_nama || 'berkas'}
                </button>
                {bisaEdit && (
                  <button
                    type="button"
                    onClick={() => onHapusFile(item.kode)}
                    disabled={sibuk}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 size={13} />
                    Hapus berkas
                  </button>
                )}
              </>
            )}
            {data?.tautan && (
              <a
                href={data.tautan}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Link2 size={13} />
                Buka tautan
              </a>
            )}
            {bisaEdit && (
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">
                <Upload size={13} />
                {data?.file_path ? 'Ganti berkas' : 'Unggah berkas'}
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  disabled={sibuk}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) unggahBerkas(f)
                  }}
                />
              </label>
            )}
            {bisaEdit && (
              <button
                type="button"
                onClick={simpanDraft}
                disabled={sibuk}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {sibuk ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Simpan
              </button>
            )}
          </div>

          {galat && <p role="alert" className="text-xs text-red-700">{galat}</p>}
          {!bisaEdit && (
            <p className="text-xs text-slate-500">Hanya admin dan kepala sekolah yang dapat mengubah berkas akreditasi.</p>
          )}
          {data?.diperbarui_pada && (
            <p className="text-[11px] text-slate-400">
              Terakhir diperbarui {new Date(data.diperbarui_pada).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

// ---- Kartu ringkas untuk Dasbor / hub menu -------------------------------
// Pasang di daftar kartu menu Anda: <KartuAkreditasi to="/administrasi-kepsek/akreditasi" />
export function KartuAkreditasi({ to = '/administrasi-kepsek/akreditasi' }) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">Berkas Akreditasi</p>
          <p className="text-xs text-slate-500">Checklist & arsip berkas akreditasi SD dan SMP</p>
        </div>
        <ArrowRight size={16} className="ml-auto text-slate-400 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  )
}

// ---- Halaman utama --------------------------------------------------------
export default function AkreditasiSekolah() {
  // sekolahId & isAdmin langsung dari AuthContext. isAdmin mencakup admin,
  // admin_utama, superadmin, dan kepala_sekolah.
  const { sekolahId, isAdmin, loading: loadingAuth } = useAuth()
  const bisaEdit = Boolean(isAdmin)

  const [jenjang, setJenjang] = useState('sd')
  const [baris, setBaris] = useState({}) // kode -> baris tabel
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState('')
  const [cari, setCari] = useState('')
  const [filter, setFilter] = useState('semua')
  const [terbuka, setTerbuka] = useState(null)
  const [sibuk, setSibuk] = useState('')

  // Muat data tiap kali sekolah / jenjang berubah.
  useEffect(() => {
    if (!sekolahId) {
      setLoading(false)
      return
    }
    let aktif = true
    setLoading(true)
    setGalat('')
    supabase
      .from('akreditasi_berkas')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .eq('jenjang', jenjang)
      .then(({ data, error }) => {
        if (!aktif) return
        if (error) setGalat('Data tidak bisa dimuat. Periksa koneksi lalu muat ulang halaman.')
        const peta = {}
        ;(data || []).forEach((r) => {
          peta[r.kode] = r
        })
        setBaris(peta)
        setLoading(false)
      })
    return () => {
      aktif = false
    }
  }, [sekolahId, jenjang])

  // Hitungan data dari halaman lain di aplikasi (hanya tampilan, tidak mengubah status).
  // Tabel: arkas_anggaran, bku_kas, siswa (sama seperti yang dipakai Keuangan.jsx).
  // ARKAS dan BKU sering diisi untuk tahun yang bukan tahun berjalan, jadi yang
  // dihitung adalah tahun TERBARU yang ada datanya, bukan tahun kalender ini.
  // Semua query disaring per sekolah (sekolah_id) supaya akun superadmin tidak
  // menjumlahkan data semua sekolah. Kalau salah satu tabel tidak punya kolom
  // sekolah_id, query-nya gagal dan chip hitungannya tidak ditampilkan.
  const [hitung, setHitung] = useState({})

  useEffect(() => {
    if (!sekolahId) return
    let aktif = true

    // Cari tahun terbaru pada tabel, lalu hitung baris pada tahun itu.
    async function terbaru(tabel, kolom, tahunSebagaiTeks) {
      const { data: t, error: e1 } = await supabase
        .from(tabel)
        .select(kolom)
        .eq('sekolah_id', sekolahId)
        .order(kolom, { ascending: false })
        .limit(1)
      if (e1) return null
      if (!t || t.length === 0) return { tahun: null, n: 0 }
      const tahun = t[0][kolom]
      const { count, error: e2 } = await supabase
        .from(tabel)
        .select('id', { count: 'exact', head: true })
        .eq('sekolah_id', sekolahId)
        .eq(kolom, tahunSebagaiTeks ? String(tahun) : tahun)
      if (e2) return null
      return { tahun, n: count || 0 }
    }

    Promise.all([
      terbaru('arkas_anggaran', 'tahun_anggaran', true),
      terbaru('bku_kas', 'tahun', false),
      supabase
        .from('siswa')
        .select('id', { count: 'exact', head: true })
        .eq('sekolah_id', sekolahId)
        .eq('status', 'aktif')
        .then((r) => (r.error ? null : r.count)),
    ]).then(([arkas, bku, siswa]) => {
      if (aktif) setHitung({ arkas, bku, siswa })
    })
    return () => {
      aktif = false
    }
  }, [sekolahId])

  function infoUntuk(kode) {
    if (kode === 'MAN-03') {
      const label = (d, nama) => {
        if (!d) return null
        return d.n > 0 ? `${nama} ${d.tahun}: ${d.n} baris` : `${nama} belum diisi`
      }
      return [label(hitung.arkas, 'ARKAS'), label(hitung.bku, 'BKU')].filter(Boolean)
    }
    if (kode === 'MAN-08') {
      const n = hitung.siswa
      if (n === null || n === undefined) return []
      return [n > 0 ? `${n} siswa aktif terdata` : 'Data siswa belum diisi']
    }
    return []
  }

  const simpan = useCallback(
    async (kode, patch) => {
      if (!sekolahId) return false
      setSibuk(kode)
      setGalat('')
      const lama = baris[kode] || {}
      const baru = {
        sekolah_id: sekolahId,
        jenjang,
        kode,
        status: lama.status || 'belum',
        tautan: lama.tautan || null,
        catatan: lama.catatan || null,
        file_path: lama.file_path || null,
        file_nama: lama.file_nama || null,
        ...patch,
        diperbarui_pada: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('akreditasi_berkas')
        .upsert(baru, { onConflict: 'sekolah_id,jenjang,kode' })
        .select()
        .single()
      setSibuk('')
      if (error) {
        setGalat(`Gagal menyimpan: ${error.message}`)
        return false
      }
      setBaris((b) => ({ ...b, [kode]: data }))
      return true
    },
    [baris, jenjang, sekolahId]
  )

  // draftSaatIni: { tautan, catatan } dari form, disimpan bersama unggahan.
  async function unggah(kode, file, draftSaatIni = {}) {
    if (file.size > BATAS_MB * 1024 * 1024) {
      setGalat(`Ukuran berkas maksimal ${BATAS_MB} MB.`)
      return
    }
    setSibuk(kode)
    setGalat('')
    const path = `${sekolahId}/${jenjang}/${kode}/${Date.now()}-${namaAman(file.name)}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
    if (error) {
      setSibuk('')
      setGalat(`Gagal mengunggah: ${error.message}`)
      return
    }
    const lamaPath = baris[kode]?.file_path
    const ok = await simpan(kode, {
      ...draftSaatIni,
      file_path: path,
      file_nama: file.name,
      status: baris[kode]?.status === 'lengkap' ? 'lengkap' : 'proses',
    })
    if (ok && lamaPath) {
      // Bersihkan berkas lama; kegagalan di sini tidak perlu ditampilkan.
      supabase.storage.from(BUCKET).remove([lamaPath])
    }
    if (!ok) {
      // Penyimpanan ke tabel gagal: hapus berkas baru supaya tidak jadi yatim.
      supabase.storage.from(BUCKET).remove([path])
    }
    setSibuk('')
  }

  async function hapusFile(kode) {
    const path = baris[kode]?.file_path
    if (!path) return
    if (!window.confirm('Hapus berkas ini? Tindakan ini tidak bisa dibatalkan.')) return
    const ok = await simpan(kode, { file_path: null, file_nama: null })
    if (ok) supabase.storage.from(BUCKET).remove([path])
  }

  async function bukaFile(path) {
    // Jendela dibuka dulu (sinkron) supaya tidak diblokir pop-up blocker.
    const w = window.open('', '_blank')
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300)
    if (error || !data?.signedUrl) {
      if (w) w.close()
      setGalat('Berkas tidak bisa dibuka. Coba lagi sebentar lagi.')
      return
    }
    if (w) w.location.href = data.signedUrl
    else window.location.href = data.signedUrl
  }

  // ---- Turunan data ---------------------------------------------------
  const kelompok = useMemo(
    () => KOMPONEN.map((k) => ({ ...k, daftar: itemUntuk(k, jenjang) })),
    [jenjang]
  )

  const ringkasan = useMemo(() => {
    let total = 0
    let lengkap = 0
    let proses = 0
    kelompok.forEach((k) =>
      k.daftar.forEach((it) => {
        total += 1
        const s = baris[it.kode]?.status || 'belum'
        if (s === 'lengkap') lengkap += 1
        else if (s === 'proses') proses += 1
      })
    )
    return { total, lengkap, proses, belum: total - lengkap - proses }
  }, [kelompok, baris])

  const persen = ringkasan.total ? Math.round((ringkasan.lengkap / ringkasan.total) * 100) : 0
  const kataCari = cari.trim().toLowerCase()

  function lolos(it) {
    const s = baris[it.kode]?.status || 'belum'
    if (filter !== 'semua' && s !== filter) return false
    if (!kataCari) return true
    return (
      it.judul.toLowerCase().includes(kataCari) ||
      it.kode.toLowerCase().includes(kataCari) ||
      it.bukti.toLowerCase().includes(kataCari)
    )
  }

  const adaHasil = kelompok.some((k) => k.daftar.some(lolos))
  const labelJenjang = jenjang === 'smp' ? 'SMP' : 'SD'

  // ---- Tampilan -------------------------------------------------------
  if (loadingAuth) {
    return (
      <Layout title="Berkas Akreditasi" subtitle="Checklist dan arsip berkas persiapan akreditasi.">
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Memuat...
        </div>
      </Layout>
    )
  }

  if (!sekolahId) {
    return (
      <Layout title="Berkas Akreditasi" subtitle="Checklist dan arsip berkas persiapan akreditasi.">
        <div className="max-w-xl mx-auto p-6 text-center">
          <p className="text-sm text-slate-600">
            Akun Anda belum terhubung ke sekolah, jadi berkas akreditasi belum bisa ditampilkan.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Berkas Akreditasi" subtitle="Checklist dan arsip berkas persiapan akreditasi.">
    <div className="max-w-5xl mx-auto space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Persiapan akreditasi {labelJenjang}. Pilih jenjang di kanan.</p>

        <div role="group" aria-label="Pilih jenjang" className="inline-flex p-1 rounded-full bg-slate-100 border border-slate-200">
          {OPSI_JENJANG.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={jenjang === o.id}
              onClick={() => {
                setJenjang(o.id)
                setTerbuka(null)
              }}
              className={`px-5 py-2 min-h-[40px] rounded-full text-sm font-bold transition ${
                jenjang === o.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </header>

      {/* Ringkasan keseluruhan */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm" aria-label="Ringkasan kelengkapan">
        <div className="flex items-end justify-between gap-3 mb-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kelengkapan berkas {labelJenjang}</p>
            <p className="text-3xl font-extrabold text-slate-900">{persen}%</p>
          </div>
          <p className="text-xs text-slate-500 text-right">
            {ringkasan.lengkap} dari {ringkasan.total} butir lengkap
          </p>
        </div>
        <Batang persen={persen} warna="bg-emerald-600" />
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-300">Lengkap {ringkasan.lengkap}</span>
          <span className="px-2.5 py-1 rounded-full border bg-amber-50 text-amber-800 border-amber-300">Disiapkan {ringkasan.proses}</span>
          <span className="px-2.5 py-1 rounded-full border bg-slate-100 text-slate-700 border-slate-300">Belum ada {ringkasan.belum}</span>
        </div>
      </section>

      {/* Pencarian & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari butir, kode, atau jenis bukti..."
            aria-label="Cari butir berkas"
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2.5 min-h-[44px] text-base"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Saring menurut status"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 min-h-[44px] text-base"
        >
          <option value="semua">Semua status</option>
          {STATUS.map((s) => (
            <option key={s.v} value={s.v}>{s.label}</option>
          ))}
        </select>
      </div>

      {galat && (
        <p role="alert" className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {galat}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Memuat berkas...
        </div>
      ) : !adaHasil ? (
        <p className="text-center text-sm text-slate-500 py-10">Tidak ada butir yang cocok dengan pencarian atau saringan.</p>
      ) : (
        kelompok.map((k) => {
          const tampil = k.daftar.filter(lolos)
          if (tampil.length === 0) return null
          const lengkapK = k.daftar.filter((it) => baris[it.kode]?.status === 'lengkap').length
          const persenK = k.daftar.length ? Math.round((lengkapK / k.daftar.length) * 100) : 0
          return (
            <section key={k.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h2 className="text-sm font-extrabold text-slate-900">{k.nama}</h2>
                  <span className="text-xs font-semibold text-slate-500">
                    {lengkapK}/{k.daftar.length} lengkap
                  </span>
                </div>
                <Batang persen={persenK} warna={k.bar} />
              </div>
              <ul>
                {tampil.map((it) => (
                  <BarisButir
                    key={it.kode}
                    item={it}
                    data={baris[it.kode]}
                    info={infoUntuk(it.kode)}
                    terbuka={terbuka === it.kode}
                    onToggle={() => setTerbuka((t) => (t === it.kode ? null : it.kode))}
                    bisaEdit={bisaEdit}
                    sibuk={sibuk === it.kode}
                    onSimpan={simpan}
                    onUnggah={unggah}
                    onHapusFile={hapusFile}
                    onBukaFile={bukaFile}
                  />
                ))}
              </ul>
            </section>
          )
        })
      )}

      <p className="text-xs text-slate-400 leading-relaxed">
        Daftar butir ini adalah panduan kerja. Selalu cocokkan dengan instrumen dan petunjuk teknis akreditasi terbaru dari BAN-S/M.
      </p>
    </div>
    </Layout>
  )
}
