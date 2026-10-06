import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Search, Pencil, Trash2, Printer, X, Download, FileText, RefreshCw, Wallet, CalendarRange } from 'lucide-react'
import Layout from '../components/Layout'
import KopSurat from '../components/KopSurat'
import KalenderTahunan from '../components/KalenderTahunan'
// SESUAIKAN dua impor ini dengan lokasi di repo Anda:
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { CONFIG } from '../lib/administrasiKepsekConfig'
// Template isi KOSP jenjang SD (file kosp-sd.js diletakkan di folder yang sama dengan file ini)
import { KOSP_SD } from './kosp-sd'
// Template isi KOSP jenjang SMP (file kosp-smp.js di folder yang sama)
import { KOSP_SMP } from './kosp-smp'
// Kertas Kerja ARKAS (src/lib/kertasKerja.js; file ini mengimpor nilaiItem dari src/lib/aturanBos.js)
import { susunKertasKerja, KODE_PENERIMAAN } from '../lib/kertasKerja'

const TABEL = 'administrasi_kepsek'

const tgl = (v) => (v ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const tampil = (fld, v) => {
  if (v === undefined || v === null || v === '') return '-'
  if (fld.t === 'date') return tgl(v)
  if (fld.t === 'rp') return 'Rp ' + Number(v).toLocaleString('id-ID')
  return String(v)
}

// Teks panjang (textarea) dipotong 4 baris di layar, tetapi tampil penuh saat cetak.
const gayaPotong = {
  whiteSpace: 'pre-line',
  display: '-webkit-box',
  WebkitLineClamp: 4,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

const bersih = (v) => String(v ?? '').trim()

// Jenjang sekolah (SD/SMP) dibaca dari profil sekolah.
const deteksiJenjang = (p) =>
  /smp|sltp/i.test(bersih(p?.nama_sekolah || p?.nama)) || bersih(p?.jenjang).toUpperCase().includes('SMP') ? 'SMP' : 'SD'

const angka = (v) => Number(v) || 0
// Nilai satu item RKAS: kolom jumlah, atau volume x harga bila jumlah kosong.
const nilaiRkas = (d) => angka(d?.jumlah) || angka(d?.volume) * angka(d?.harga)

// Gaya tabel Lembar Kerja ARKAS
const sel = { border: '1px solid #000', padding: '4px 6px', verticalAlign: 'top' }
const gayaBaris = {
  standar: { background: '#e2e2e2', fontWeight: 700 },
  komponen: { background: '#efefef', fontWeight: 700 },
  kegiatan: { background: '#f7f7f7', fontWeight: 600 },
  rekening: { fontWeight: 600 },
  uraian: {},
}
const geser = { standar: 0, komponen: 6, kegiatan: 12, rekening: 18, uraian: 24 }
const angkaId = (n) => (n ? Number(n).toLocaleString('id-ID') : '0')
const POLA_KEG = /^\d{2}\.\d{2}\.\d{2}$/
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const KATA_UMUM = new Set(['pada', 'dengan', 'yang', 'untuk', 'dari', 'dan', 'atau', 'belanja', 'kegiatan', 'pelaksanaan', 'sekolah', 'dalam', 'serta', 'oleh'])
const kataKunci = (t) => bersih(t).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  .filter((w) => w.length > 3 && !KATA_UMUM.has(w))
// Cari kode referensi ARKAS yang namanya paling mirip dengan teks (kemiripan kata, ambang 0,35).
const cariRef = (daftar, teks, saring) => {
  const tk = new Set(kataKunci(teks))
  if (!tk.size) return ''
  let terbaik = ''
  let skor = 0
  daftar.forEach((x) => {
    if (saring && !saring(x)) return
    const tn = kataKunci(x.nama)
    if (!tn.length) return
    const s = tn.filter((w) => tk.has(w)).length / Math.sqrt(tn.length * tk.size)
    if (s > skor) { skor = s; terbaik = x.kode }
  })
  return skor >= 0.35 ? terbaik : ''
}

// Program kerja turunan KOSP. Baris RKT dibuat hanya jika bagian KOSP-nya sudah ada di halaman KOSP.
// `bagian` = nilai "Bagian Dokumen" di KOSP. {awal} diganti sesuai jenjang.
const PROGRAM_KOSP = [
  { bagian: 'Pengorganisasian Pembelajaran', program: 'Pembelajaran Intrakurikuler', kegiatan: 'Pelaksanaan pembelajaran intrakurikuler sesuai struktur kurikulum dan pembagian tugas guru', sasaran: 'Seluruh peserta didik', pj: 'Kepala Sekolah dan Guru', waktu: 'Sepanjang tahun ajaran' },
  { bagian: 'Pengorganisasian Pembelajaran', program: 'Penguatan Literasi dan Numerasi', kegiatan: 'Gerakan membaca 15 menit sebelum pembelajaran dan pembiasaan berhitung', sasaran: 'Seluruh peserta didik', pj: 'Guru Kelas / Guru Mapel', waktu: 'Setiap hari belajar' },
  { bagian: 'Pengorganisasian Pembelajaran', program: 'Pembiasaan Karakter', kegiatan: 'Pembiasaan ibadah, 5S (senyum, sapa, salam, sopan, santun), piket kebersihan, dan upacara bendera', sasaran: 'Seluruh peserta didik', pj: 'Wali Kelas', waktu: 'Setiap hari / setiap pekan' },
  { bagian: 'Pengorganisasian Pembelajaran', program: 'Ekstrakurikuler', kegiatan: 'Pelaksanaan ekstrakurikuler Pramuka dan ekstrakurikuler pilihan', sasaran: 'Peserta didik', pj: 'Pembina Ekstrakurikuler', waktu: 'Setiap pekan' },
  { bagian: 'Pengorganisasian Pembelajaran', program: 'Pengenalan Lingkungan Sekolah', kegiatan: 'Masa pengenalan lingkungan sekolah dan transisi bagi peserta didik {awal}', sasaran: 'Peserta didik {awal}', pj: 'Wali Kelas {awal}', waktu: 'Awal tahun ajaran' },
  { bagian: 'Perencanaan Pembelajaran', program: 'Perencanaan Pembelajaran', kegiatan: 'Penyusunan dan verifikasi ATP serta modul ajar oleh guru', sasaran: 'Seluruh guru', pj: 'Kepala Sekolah', waktu: 'Awal semester' },
  { bagian: 'Perencanaan Pembelajaran', program: 'Asesmen Pembelajaran', kegiatan: 'Asesmen diagnostik, formatif, dan sumatif', sasaran: 'Seluruh peserta didik', pj: 'Guru', waktu: 'Awal tahun ajaran dan setiap akhir semester' },
  { bagian: 'Perencanaan Pembelajaran', program: 'Pembelajaran Berdiferensiasi', kegiatan: 'Pembelajaran berdiferensiasi, remedial, dan pengayaan berdasarkan hasil asesmen', sasaran: 'Seluruh peserta didik', pj: 'Guru', waktu: 'Sepanjang tahun ajaran' },
  { bagian: 'Perencanaan Pembelajaran', program: 'Pelaporan Hasil Belajar', kegiatan: 'Penyusunan dan pembagian rapor peserta didik', sasaran: 'Seluruh peserta didik', pj: 'Wali Kelas', waktu: 'Akhir semester' },
  { bagian: 'Pendampingan dan Evaluasi', program: 'Supervisi dan Pendampingan Guru', kegiatan: 'Supervisi akademik oleh kepala sekolah beserta refleksi dan tindak lanjut', sasaran: 'Seluruh guru', pj: 'Kepala Sekolah', waktu: 'Setiap semester' },
  { bagian: 'Pendampingan dan Evaluasi', program: 'Komunitas Belajar', kegiatan: 'Komunitas belajar sekolah dan KKG/MGMP untuk berbagi praktik baik dan menyusun perangkat bersama', sasaran: 'Seluruh guru', pj: 'Kepala Sekolah', waktu: 'Setiap bulan' },
  { bagian: 'Pendampingan dan Evaluasi', program: 'Bimbingan Belajar Peserta Didik', kegiatan: 'Bimbingan belajar tambahan literasi dan numerasi serta pembinaan karakter', sasaran: 'Peserta didik yang membutuhkan', pj: 'Wali Kelas', waktu: 'Sepanjang tahun ajaran' },
  { bagian: 'Pendampingan dan Evaluasi', program: 'Evaluasi Pelaksanaan Kurikulum', kegiatan: 'Rapat evaluasi dewan guru, evaluasi tahunan, dan revisi KOSP', sasaran: 'Seluruh warga sekolah', pj: 'Kepala Sekolah dan Tim Pengembang Kurikulum', waktu: 'Akhir semester dan akhir tahun ajaran' },
]

// Ambil butir misi dari uraian KOSP. Baris yang masih berisi [placeholder] dilewati.
const ambilMisi = (uraian = '') => {
  const m = String(uraian).match(/B\. Misi Satuan Pendidikan\n([\s\S]*?)(?=\n\s*C\. |$)/)
  if (!m) return []
  return m[1].split('\n')
    .map((s) => s.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim())
    .filter((s) => s && !s.includes('['))
    .slice(0, 10)
}

// Ambil tema projek P5 dari uraian KOSP (kosong jika masih placeholder).
const ambilTemaP5 = (uraian = '') => {
  const m = String(uraian).match(/dengan tema:\s*([^\n]+?)\.?\s*(?:\n|$)/)
  return m && !m[1].includes('[') ? m[1].trim() : ''
}

// Mengganti placeholder [ ... ] pada teks KOSP dengan data sekolah.
// Hanya placeholder yang datanya tersedia yang diganti; sisanya dibiarkan agar diisi manual.
function isiTemplate(teks, c) {
  let t = teks
  const ganti = (dari, ke) => { if (ke) t = t.split(dari).join(ke) }
  const gantiRegex = (re, ke) => { if (ke) t = t.replace(re, () => ke) }

  ganti('[NAMA SD]', c.nama)
  ganti('[NAMA SMP]', c.nama)
  ganti('[NPSN]', c.npsn)
  ganti('[PERINGKAT/TAHUN]', c.akreditasi)
  ganti('[ALAMAT LENGKAP]', c.alamat)
  ganti('[NEGERI/SWASTA]', c.status)
  ganti('[DESA/KELURAHAN, KECAMATAN, KABUPATEN]', c.wilayah)
  ganti('[NAMA KEPALA SEKOLAH]', c.kepsek)
  ganti('[KOTA/ KABUPATEN]', c.tempat)

  // Peserta didik dan rombongan belajar
  gantiRegex(
    /Jumlah peserta didik: \[JUMLAH\] siswa dalam \[JUMLAH\] rombongan belajar \(kelas (?:1 s\.d\. 6|7 s\.d\. 9)\)\./,
    c.kalimatSiswa
  )

  // Guru: seluruh mata pelajaran diampu guru kelas
  if (c.jumlahGuru > 0) {
    gantiRegex(
      /Pendidik dan tenaga kependidikan: \[JUMLAH GURU KELAS\], \[JUMLAH GURU MAPEL \(PAI, PJOK, dll\)\], \[JUMLAH TENDIK\]\./,
      `Pendidik dan tenaga kependidikan: ${c.jumlahGuru} guru kelas (seluruh mata pelajaran, termasuk PAI dan PJOK, diampu guru kelas), [JUMLAH TENDIK].`
    )
    gantiRegex(
      /Pendidik dan tenaga kependidikan: \[JUMLAH GURU MAPEL\], \[JUMLAH GURU BK\], \[JUMLAH TENDIK\]\./,
      `Pendidik dan tenaga kependidikan: ${c.jumlahGuru} guru (guru mata pelajaran dan guru BK), [JUMLAH TENDIK].`
    )
    ganti(
      'Sistem guru kelas untuk kelas 1-6; guru mata pelajaran untuk PAI dan PJOK dan [LAINNYA].',
      'Sistem guru kelas untuk kelas 1-6; seluruh mata pelajaran, termasuk PAI dan PJOK, diampu oleh guru kelas.'
    )
  }

  // Visi dan misi dari profil sekolah
  if (c.visi) {
    gantiRegex(/"\[RUMUSAN VISI SEKOLAH\]"\nContoh arah rumusan:[^\n]*/, `"${c.visi}"`)
  }
  if (c.misi) {
    gantiRegex(
      /B\. Misi Satuan Pendidikan\n[\s\S]*?\[Sesuaikan jumlah dan redaksi misi dengan dokumen visi misi sekolah yang sudah ditetapkan\.\]/,
      `B. Misi Satuan Pendidikan\n${c.misi}`
    )
  }

  // Tim pengembang dan pengesahan
  if (c.namaGuru) {
    ganti('Anggota: [NAMA GURU/ KOMITE SEKOLAH]', `Anggota: ${c.namaGuru}; [UNSUR KOMITE SEKOLAH]`)
  }
  if (c.kepsek) {
    gantiRegex(/Kepala Sekolah, \[NAMA\] NIP\. \[NIP\]/, `Kepala Sekolah, ${c.kepsek} NIP. ${c.nipKepsek || '-'}`)
  }
  if (c.pengawas) {
    gantiRegex(
      /Mengetahui\/ Mengesahkan: Pengawas Sekolah atau Dinas Pendidikan setempat \[NAMA\/ NIP\]\./,
      `Mengetahui/ Mengesahkan: Pengawas Sekolah, ${c.pengawas} NIP. ${c.nipPengawas || '-'}.`
    )
  }
  return t
}

export default function AdministrasiKepsekItem() {
  const { slug } = useParams()
  const cfg = CONFIG[slug]
  const { sekolahId } = useAuth()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null) // { id?, tanggal, data }
  const [saving, setSaving] = useState(false)
  const [guruList, setGuruList] = useState([])
  const [profil, setProfil] = useState(null)
  const [importing, setImporting] = useState(false)
  const [memuatKosp, setMemuatKosp] = useState(false)
  const [sinkron, setSinkron] = useState(false)
  const [menarik, setMenarik] = useState(false)
  const [menarikRkt, setMenarikRkt] = useState(false)
  const [paguList, setPaguList] = useState([]) // baris jenis 'pagu' (khusus halaman RKAS)
  const [formPagu, setFormPagu] = useState(null) // { id?, data }
  const [savingPagu, setSavingPagu] = useState(false)
  const [ref, setRef] = useState({ kegiatan: [], rekening: [], penerimaan: [] }) // referensi ARKAS
  const [lembar, setLembar] = useState(null) // { tahun, sumber } -> Lembar Kerja ARKAS
  const [tampilKal, setTampilKal] = useState('tahunan') // 'tahunan' | 'daftar' (halaman Kalender Pendidikan)

  const kolom = useMemo(() => (cfg ? cfg.fields.filter((x) => x.tab) : []), [cfg])

  const muat = useCallback(async () => {
    if (!sekolahId || !cfg) return
    setLoading(true)
    setErr('')
    const { data, error } = await supabase
      .from(TABEL).select('*')
      .eq('sekolah_id', sekolahId).eq('jenis', slug)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setErr(error.message)
    else setRows(data || [])
    setLoading(false)
  }, [sekolahId, slug, cfg])

  useEffect(() => { setQ(''); setForm(null); setLembar(null); muat() }, [muat])

  const muatPagu = useCallback(async () => {
    if (!sekolahId || slug !== 'rkas') { setPaguList([]); return }
    const { data, error } = await supabase
      .from(TABEL).select('*').eq('sekolah_id', sekolahId).eq('jenis', 'pagu')
      .order('created_at', { ascending: false })
    if (!error) setPaguList(data || [])
  }, [sekolahId, slug])

  useEffect(() => { muatPagu() }, [muatPagu])

  // Referensi kode kegiatan, rekening, dan penerimaan ARKAS (khusus halaman RKAS)
  useEffect(() => {
    if (slug !== 'rkas' && slug !== 'rkt') return
    Promise.all([
      supabase.from('ref_arkas_kegiatan').select('kode, tingkat, induk, nama').order('kode'),
      supabase.from('ref_arkas_rekening').select('kode, nama').order('kode'),
      supabase.from('ref_arkas_penerimaan').select('kode, nama').order('kode'),
    ]).then(([k, r, p]) => setRef({ kegiatan: k.data || [], rekening: r.data || [], penerimaan: p.data || [] }))
  }, [slug])

  // Saat Lembar Kerja terbuka, area cetak tabel biasa dinonaktifkan agar tidak ikut tercetak
  useEffect(() => {
    document.body.classList.toggle('cetak-lembar', !!lembar)
    return () => document.body.classList.remove('cetak-lembar')
  }, [lembar])

  // Kalender tahunan tampil: cetak memakai area cetak kalender, bukan tabel daftar
  const kalTahunan = slug === 'kalender-pendidikan' && tampilKal === 'tahunan'
  useEffect(() => {
    document.body.classList.toggle('cetak-kalender', kalTahunan)
    return () => document.body.classList.remove('cetak-kalender')
  }, [kalTahunan])

  useEffect(() => {
    if (!sekolahId || !cfg) return
    if (cfg.fields.some((x) => x.t === 'guru')) {
      supabase.from('guru').select('nama_lengkap').eq('sekolah_id', sekolahId).order('nama_lengkap')
        .then(({ data }) => setGuruList((data || []).map((g) => g.nama_lengkap).filter(Boolean)))
    }
    // Data kop cetak: cocokkan lewat sekolah_id (kolom id di profil_sekolah bertipe angka).
    supabase.from('profil_sekolah').select('*')
      .eq('sekolah_id', sekolahId).limit(1).maybeSingle()
      .then(({ data }) => setProfil(data || null))
  }, [sekolahId, cfg])

  const tersaring = useMemo(() => {
    const kata = q.trim().toLowerCase()
    if (!kata) return rows
    return rows.filter((r) => JSON.stringify(r.data).toLowerCase().includes(kata))
  }, [rows, q])

  // Rekap pagu: terpakai dihitung otomatis dari item RKAS (tahun + sumber dana sama)
  const ringkasPagu = useMemo(() => paguList.map((p) => {
    const terpakai = rows
      .filter((r) => String(r.data?.tahun) === String(p.data?.tahun) && r.data?.sumber === p.data?.sumber)
      .reduce((n, r) => n + nilaiRkas(r.data), 0)
    const pagu = angka(p.data?.pagu_tahun)
    return { ...p, pagu, terpakai, sisa: pagu - terpakai }
  }).sort((a, b) => String(b.data?.tahun).localeCompare(String(a.data?.tahun))), [paguList, rows])

  if (!cfg) {
    return (
      <Layout title="Administrasi Kepala Sekolah">
        <p className="text-sm text-slate-600">Halaman tidak ditemukan.</p>
        <Link to="/administrasi-kepsek" className="text-blue-600 text-sm underline">Kembali</Link>
      </Layout>
    )
  }

  const bukaBaru = () => setForm({ tanggal: new Date().toISOString().slice(0, 10), data: {} })
  const bukaEdit = (r) => setForm({ id: r.id, tanggal: r.tanggal || '', data: { ...r.data } })
  // ---- Isi otomatis form RKAS: kode kegiatan, kode rekening, dan jumlah ----
  const punyaKode = slug === 'rkas' || slug === 'rkt' // halaman dengan isian kode kegiatan/rekening ARKAS
  const adaField = (k) => cfg.fields.some((x) => x.k === k)
  const namaKeg = (kode) => ref.kegiatan.find((x) => x.kode === kode)?.nama || ''
  const namaRek = (kode) => ref.rekening.find((x) => x.kode === kode)?.nama || ''
  const hitungJumlah = (data) => {
    const total = angka(data.volume) * angka(data.harga)
    if (total > 0) data.jumlah = total
  }

  const setField = (k, v) => setForm((p) => {
    const data = { ...p.data, [k]: v }
    if (punyaKode) {
      // RKAS: jumlah = volume x harga satuan (tetap bisa diubah manual setelahnya)
      if (slug === 'rkas' && (k === 'volume' || k === 'harga')) hitungJumlah(data)
      // kode kegiatan -> nama kegiatan dan komponen (bila field-nya ada di form)
      if (k === 'kode_kegiatan' && POLA_KEG.test(bersih(v))) {
        const kode = bersih(v)
        if (slug === 'rkas' && adaField('kegiatan') && namaKeg(kode)) data.kegiatan = namaKeg(kode)
        if (adaField('komponen') && namaKeg(kode.slice(0, 5))) data.komponen = namaKeg(kode.slice(0, 5))
      }
      // kode rekening -> nama rekening
      if (k === 'kode_rekening' && adaField('rekening') && namaRek(bersih(v))) data.rekening = namaRek(bersih(v))
    }
    return { ...p, data }
  })

  // Setelah uraian diisi: pinjam kode, satuan, dan harga dari item RKAS terdahulu yang uraiannya sama.
  // Hanya mengisi kolom yang masih kosong.
  const sarankanDariUraian = () => {
    if (slug !== 'rkas') return
    setForm((p) => {
      const u = bersih(p.data.uraian).toLowerCase()
      if (!u) return p
      const cocok = rows.find((r) => r.id !== p.id && bersih(r.data?.uraian).toLowerCase() === u
        && (bersih(r.data?.kode_kegiatan) || bersih(r.data?.kode_rekening)))
      if (!cocok) return p
      const data = { ...p.data }
      ;['kode_kegiatan', 'kode_rekening', 'kegiatan', 'komponen', 'rekening', 'satuan', 'harga'].forEach((k) => {
        if (!bersih(data[k]) && bersih(cocok.data?.[k])) data[k] = cocok.data[k]
      })
      if (!angka(data.jumlah)) hitungJumlah(data)
      return { ...p, data }
    })
  }

  // Sisa pagu (setelah item ini) untuk tahun + sumber dana yang dipilih; null jika pagu belum diatur.
  const sisaPaguUntuk = (data, idEdit) => {
    const pg = ringkasPagu.find((x) => String(x.data?.tahun) === String(data.tahun) && x.data?.sumber === data.sumber)
    if (!pg) return null
    const lama = idEdit ? rows.find((r) => r.id === idEdit) : null
    const nilaiLama = lama && String(lama.data?.tahun) === String(pg.data?.tahun) && lama.data?.sumber === pg.data?.sumber
      ? nilaiRkas(lama.data) : 0
    return pg.sisa + nilaiLama - nilaiRkas(data)
  }

  const simpan = async (e) => {
    e.preventDefault()
    const kurang = cfg.fields.find((x) => x.req && !String(form.data[x.k] ?? '').trim())
    if (kurang) return alert(`${kurang.l} wajib diisi.`)
    if (slug === 'rkas') {
      const sisa = sisaPaguUntuk(form.data, form.id)
      if (sisa !== null && sisa < 0 &&
        !window.confirm(`Item ini melebihi sisa pagu sebesar Rp ${Math.abs(sisa).toLocaleString('id-ID')}.\nTetap simpan?`)) return
    }
    setSaving(true)
    const payload = { sekolah_id: sekolahId, jenis: slug, tanggal: form.tanggal || null, data: form.data }
    const { error } = form.id
      ? await supabase.from(TABEL).update(payload).eq('id', form.id)
      : await supabase.from(TABEL).insert(payload)
    setSaving(false)
    if (error) return alert('Gagal menyimpan: ' + error.message)
    setForm(null)
    muat()
  }

  const hapus = async (r) => {
    if (!window.confirm('Hapus catatan ini?')) return
    const { error } = await supabase.from(TABEL).delete().eq('id', r.id)
    if (error) return alert('Gagal menghapus: ' + error.message)
    muat()
  }

  // ---- Pagu anggaran (halaman RKAS) ----
  const bukaPagu = (p) => setFormPagu(p
    ? { id: p.id, data: { ...p.data } }
    : { data: { tahun: String(new Date().getFullYear()), sumber: cfg.fields.find((x) => x.k === 'sumber')?.o?.[0] || 'BOS Reguler' } })

  const setPaguField = (k, v) => setFormPagu((p) => {
    const data = { ...p.data, [k]: v }
    if (k === 'jumlah_siswa' || k === 'pagu_per_siswa') {
      const total = angka(data.jumlah_siswa) * angka(data.pagu_per_siswa)
      if (total > 0) { data.pagu_tahun = total; data.tahap1 = Math.round(total / 2) }
    }
    if (k === 'pagu_tahun') data.tahap1 = Math.round(angka(v) / 2)
    return { ...p, data }
  })

  const simpanPagu = async (e) => {
    e.preventDefault()
    const d = formPagu.data
    if (!bersih(d.tahun) || !bersih(d.sumber)) return alert('Tahun dan sumber dana wajib diisi.')
    if (angka(d.pagu_tahun) <= 0) return alert('Pagu tahunan harus lebih dari 0.')
    if (angka(d.tahap1) > angka(d.pagu_tahun)) return alert('Pagu tahap 1 tidak boleh melebihi pagu tahunan.')
    const kembar = paguList.find((x) => x.id !== formPagu.id && String(x.data?.tahun) === String(d.tahun) && x.data?.sumber === d.sumber)
    if (kembar) return alert(`Pagu ${d.sumber} tahun ${d.tahun} sudah ada. Ubah yang sudah ada.`)
    setSavingPagu(true)
    const payload = { sekolah_id: sekolahId, jenis: 'pagu', tanggal: new Date().toISOString().slice(0, 10), data: d }
    const { error } = formPagu.id
      ? await supabase.from(TABEL).update(payload).eq('id', formPagu.id)
      : await supabase.from(TABEL).insert(payload)
    setSavingPagu(false)
    if (error) return alert('Gagal menyimpan pagu: ' + error.message)
    setFormPagu(null)
    muatPagu()
  }

  const hapusPagu = async () => {
    if (!formPagu?.id || !window.confirm('Hapus pagu ini? Item RKAS tidak ikut terhapus.')) return
    const { error } = await supabase.from(TABEL).delete().eq('id', formPagu.id)
    if (error) return alert('Gagal menghapus: ' + error.message)
    setFormPagu(null)
    muatPagu()
  }

  // Impor Buku Induk Siswa. Tabel siswa tidak punya sekolah_id, jadi sekolahnya
  // ditentukan lewat tabel kelas. Hanya siswa berstatus aktif yang diimpor.
  const imporSiswa = async () => {
    const { peta } = cfg.impor
    setImporting(true)
    try {
      const { data: kls, error: ek } = await supabase.from('kelas').select('id, nama_kelas').eq('sekolah_id', sekolahId)
      if (ek) throw new Error('Gagal membaca data kelas: ' + ek.message)
      const namaKelas = Object.fromEntries((kls || []).map((k) => [k.id, k.nama_kelas]))
      const ids = Object.keys(namaKelas)
      if (ids.length === 0) throw new Error('Belum ada data kelas untuk sekolah ini.')

      const { data: siswa, error } = await supabase.from('siswa').select('*').in('kelas_id', ids).eq('status', 'aktif')
      if (error) throw new Error('Gagal membaca data siswa: ' + error.message)

      const ada = new Set(rows.map((r) => `${r.data.nama}|${r.data.nis || ''}`))
      const baru = (siswa || [])
        .map((s) => {
          const data = { status: 'Aktif', kelas: namaKelas[s.kelas_id] || '' }
          Object.entries(peta).forEach(([k, kol]) => { if (s[kol] != null && s[kol] !== '') data[k] = s[kol] })
          if (data.jk === 'L') data.jk = 'Laki-laki'
          if (data.jk === 'P') data.jk = 'Perempuan'
          return { sekolah_id: sekolahId, jenis: slug, tanggal: null, data }
        })
        .filter((x) => x.data.nama && !ada.has(`${x.data.nama}|${x.data.nis || ''}`))

      if (baru.length === 0) throw new Error('Tidak ada siswa baru untuk diimpor.')
      const { error: e2 } = await supabase.from(TABEL).insert(baru)
      if (e2) throw new Error('Gagal impor: ' + e2.message)
      alert(`${baru.length} siswa berhasil diimpor.`)
      muat()
    } catch (e) {
      alert(e.message)
    } finally {
      setImporting(false)
    }
  }

  // Muat template KOSP SD. Bagian yang sudah ada (bagian + tahun ajaran sama) dilewati,
  // jadi aman jika tombol tertekan lebih dari sekali.
  const muatTemplateKosp = async () => {
    const jenjangKosp = deteksiJenjang(profil)
    const TEMPLATE = jenjangKosp === 'SMP' ? KOSP_SMP : KOSP_SD
    const baru = TEMPLATE.filter(
      (d) => !rows.some((r) => r.data?.bagian === d.bagian && r.data?.tahun_ajaran === d.tahun_ajaran)
    )
    if (baru.length === 0) return alert(`Semua bagian template KOSP ${jenjangKosp} sudah ada.`)
    if (!window.confirm(`Muat ${baru.length} bagian template KOSP ${jenjangKosp} ke halaman ini?`)) return
    setMemuatKosp(true)
    const tanggal = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from(TABEL).insert(
      baru.map((d) => ({ sekolah_id: sekolahId, jenis: slug, tanggal, data: { ...d } }))
    )
    setMemuatKosp(false)
    if (error) return alert('Gagal memuat template: ' + error.message)
    alert(`${baru.length} bagian KOSP ${jenjangKosp} berhasil dimuat. Klik "Sinkronkan Data Sekolah" untuk mengisi otomatis, lalu lengkapi sisanya.`)
    muat()
  }

  // Isi placeholder KOSP dari profil sekolah, data guru, dan data siswa.
  // Hanya menyentuh bagian berstatus Draf, dan hanya kolom Uraian.
  const sinkronkan = async () => {
    const draf = rows.filter((r) => r.data?.status === 'Draf')
    if (draf.length === 0) return alert('Tidak ada bagian berstatus Draf untuk disinkronkan.')
    if (!window.confirm(`Isi otomatis ${draf.length} bagian berstatus Draf dari data sekolah, guru, dan siswa?\nBagian berstatus Final tidak diubah.`)) return
    setSinkron(true)
    try {
      const [pr, gr, kl] = await Promise.all([
        supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).limit(1).maybeSingle(),
        supabase.from('guru').select('nama_lengkap, jenis_ptk, status').eq('sekolah_id', sekolahId),
        supabase.from('kelas').select('id, nama_kelas').eq('sekolah_id', sekolahId),
      ])
      if (pr.error) throw new Error('Profil sekolah: ' + pr.error.message)
      if (gr.error) throw new Error('Data guru: ' + gr.error.message)
      if (kl.error) throw new Error('Data kelas: ' + kl.error.message)

      const p = pr.data || {}

      // Guru kelas: jenis_ptk mengandung kata "guru" (Kepala Sekolah dan yang kosong tidak dihitung)
      const guru = (gr.data || []).filter(
        (g) => bersih(g.status).toLowerCase() === 'aktif' && /guru/i.test(g.jenis_ptk || '')
      )

      // Siswa aktif per kelas
      const kelas = kl.data || []
      const idKelas = kelas.map((k) => k.id)
      let hitung = {}
      if (idKelas.length) {
        const { data: sw, error: es } = await supabase
          .from('siswa').select('kelas_id').in('kelas_id', idKelas).eq('status', 'aktif')
        if (es) throw new Error('Data siswa: ' + es.message)
        ;(sw || []).forEach((s) => { hitung[s.kelas_id] = (hitung[s.kelas_id] || 0) + 1 })
      }
      const perKelas = kelas
        .filter((k) => hitung[k.id] > 0)
        .sort((a, b) => String(a.nama_kelas).localeCompare(String(b.nama_kelas), 'id', { numeric: true }))
      const totalSiswa = perKelas.reduce((n, k) => n + hitung[k.id], 0)

      const nama = bersih(p.nama_sekolah)
      const ctx = {
        nama,
        npsn: bersih(p.npsn),
        akreditasi: bersih(p.akreditasi),
        alamat: [p.alamat, p.kelurahan_desa, p.kecamatan, p.kabupaten, p.provinsi].map(bersih).filter(Boolean).join(', '),
        wilayah: [p.kelurahan_desa, p.kecamatan, p.kabupaten].map(bersih).filter(Boolean).join(', '),
        status: /negeri/i.test(nama) ? 'Negeri' : /swasta/i.test(nama) ? 'Swasta' : '',
        kepsek: bersih(p.kepala_sekolah),
        nipKepsek: bersih(p.nip_kepala_sekolah),
        tempat: bersih(p.tempat_ttd) || bersih(p.kabupaten),
        pengawas: bersih(p.pengawas),
        nipPengawas: bersih(p.nip_pengawas),
        visi: bersih(p.visi),
        misi: bersih(p.misi),
        jumlahGuru: guru.length,
        namaGuru: guru.map((g) => bersih(g.nama_lengkap)).filter(Boolean).join(', '),
        kalimatSiswa: totalSiswa
          ? `Jumlah peserta didik: ${totalSiswa} siswa dalam ${perKelas.length} rombongan belajar (${perKelas.map((k) => `${k.nama_kelas}: ${hitung[k.id]}`).join(', ')}).`
          : '',
      }

      let berubah = 0
      for (const r of draf) {
        const lama = r.data?.uraian || ''
        const baru = isiTemplate(lama, ctx)
        if (baru !== lama) {
          const { error } = await supabase.from(TABEL).update({ data: { ...r.data, uraian: baru } }).eq('id', r.id)
          if (error) throw new Error('Gagal menyimpan: ' + error.message)
          berubah++
        }
      }

      const kosong = []
      if (!ctx.npsn) kosong.push('NPSN')
      if (!ctx.visi) kosong.push('visi')
      if (!ctx.misi) kosong.push('misi')
      if (!ctx.kepsek) kosong.push('kepala sekolah')
      if (!totalSiswa) kosong.push('data siswa aktif')
      const pesan = berubah === 0
        ? 'Tidak ada placeholder yang bisa diisi (mungkin sudah tersinkron sebelumnya).'
        : `${berubah} bagian berhasil diisi otomatis.`
      alert(
        pesan
        + (kosong.length ? `\nData belum tersedia di sistem: ${kosong.join(', ')}.` : '')
        + '\nLengkapi sisa [dalam kurung siku] secara manual.'
      )
      muat()
    } catch (e) {
      alert('Gagal sinkronisasi: ' + e.message)
    } finally {
      setSinkron(false)
    }
  }

  // Susun draf RKT dari RKAS, Kalender Pendidikan, Inventaris, Evaluasi Diri, data siswa, dan guru.
  // Baris yang sudah ada (sumber + program + kegiatan + tahun sama) dilewati, jadi aman ditekan berulang.
  // Jenjang (SD/SMP) dibaca dari profil sekolah.
  const tarikRKT = async () => {
    const jenjang = deteksiJenjang(profil)
    const tahunIn = window.prompt(`Tarik data untuk RKT ${jenjang}. Tahun anggaran?`, String(new Date().getFullYear()))
    if (!tahunIn) return
    const tahun = tahunIn.trim()

    setMenarik(true)
    try {
      const [src, gr, kl] = await Promise.all([
        supabase.from(TABEL).select('jenis, tanggal, data').eq('sekolah_id', sekolahId)
          .in('jenis', ['rkas', 'kalender-pendidikan', 'inventaris', 'evaluasi-diri', 'kosp']),
        supabase.from('guru').select('jenis_ptk, status').eq('sekolah_id', sekolahId),
        supabase.from('kelas').select('id, nama_kelas').eq('sekolah_id', sekolahId),
      ])
      if (src.error) throw new Error('Data sumber: ' + src.error.message)
      if (gr.error) throw new Error('Data guru: ' + gr.error.message)
      if (kl.error) throw new Error('Data kelas: ' + kl.error.message)

      const per = (j) => (src.data || []).filter((r) => r.jenis === j)
      const dasar = { jenjang, tahun, status: 'Rencana' }
      const draf = []

      // 1) RKAS -> kegiatan + anggaran
      per('rkas').filter((r) => String(r.data?.tahun) === tahun).forEach(({ data: d }) => {
        draf.push({
          ...dasar, sumber_data: 'RKAS', program: d.sumber || 'RKAS', kegiatan: d.uraian,
          sasaran: d.volume ? `${d.volume} ${d.satuan || ''}`.trim() : '',
          pj: 'Kepala Sekolah / Bendahara', waktu: tahun,
          anggaran: Number(d.jumlah) || (Number(d.volume) || 0) * (Number(d.harga) || 0) || '',
        })
      })

      // 2) Kalender Pendidikan -> waktu pelaksanaan (ujian & kegiatan sekolah)
      per('kalender-pendidikan')
        .filter((r) => ['Ujian', 'Kegiatan Sekolah'].includes(r.data?.jenis) && r.tanggal && String(new Date(r.tanggal).getFullYear()) === tahun)
        .forEach((r) => {
          const d = r.data
          draf.push({
            ...dasar, sumber_data: 'Kalender',
            program: d.jenis === 'Ujian' ? 'Penilaian dan Ujian' : 'Kegiatan Sekolah',
            kegiatan: d.kegiatan, sasaran: `Seluruh warga ${jenjang}`, pj: 'Wakil Kepala Sekolah / Panitia',
            waktu: d.selesai && d.selesai !== r.tanggal ? `${tgl(r.tanggal)} s.d. ${tgl(d.selesai)}` : tgl(r.tanggal),
            anggaran: '',
          })
        })

      // 3) Inventaris rusak -> sarana prasarana
      per('inventaris').filter((r) => r.data?.kondisi && r.data.kondisi !== 'Baik').forEach(({ data: d }) => {
        draf.push({
          ...dasar, sumber_data: 'Inventaris', program: 'Sarana dan Prasarana',
          kegiatan: `${d.kondisi === 'Rusak Berat' ? 'Penggantian' : 'Perbaikan'} ${d.nama}${d.lokasi ? ` (${d.lokasi})` : ''}`,
          sasaran: `${d.jumlah || 1} unit`, pj: 'Wakil Sarana Prasarana', waktu: tahun, anggaran: '',
        })
      })

      // 4) Evaluasi Diri yang belum tercapai -> peningkatan mutu
      per('evaluasi-diri').filter((r) => r.data?.status !== 'Tercapai' && r.data?.rencana).forEach(({ data: d }) => {
        draf.push({
          ...dasar, sumber_data: 'Evaluasi Diri', program: `Peningkatan Mutu - ${d.standar}`,
          kegiatan: d.rencana, sasaran: 'Tercapainya standar', pj: 'Kepala Sekolah / Tim Pengembang Sekolah',
          waktu: tahun, anggaran: '',
        })
      })

      // 5) Siswa aktif -> sasaran layanan peserta didik
      const kelas = kl.data || []
      if (kelas.length) {
        const { data: sw, error: es } = await supabase.from('siswa').select('kelas_id')
          .in('kelas_id', kelas.map((k) => k.id)).eq('status', 'aktif')
        if (es) throw new Error('Data siswa: ' + es.message)
        const rombel = new Set((sw || []).map((s) => s.kelas_id)).size
        if (sw?.length) {
          draf.push({
            ...dasar, sumber_data: 'Data Siswa', program: 'Layanan Peserta Didik',
            kegiatan: `Pelaksanaan pembelajaran dan layanan peserta didik ${jenjang}`,
            sasaran: `${sw.length} peserta didik dalam ${rombel} rombongan belajar`,
            pj: 'Kepala Sekolah dan Guru', waktu: tahun, anggaran: '',
          })
        }
      }

      // 6) Guru aktif -> pengembangan kompetensi
      const jmlGuru = (gr.data || []).filter((g) => bersih(g.status).toLowerCase() === 'aktif' && /guru/i.test(g.jenis_ptk || '')).length
      if (jmlGuru) {
        draf.push({
          ...dasar, sumber_data: 'Data Guru', program: 'Pengembangan Pendidik dan Tenaga Kependidikan',
          kegiatan: 'Peningkatan kompetensi guru melalui KKG/MGMP, pelatihan, dan supervisi akademik',
          sasaran: `${jmlGuru} guru`, pj: 'Kepala Sekolah', waktu: tahun, anggaran: '',
        })
      }

      // 7) KOSP -> program kerja turunan KOSP (tahun ajaran diawali tahun anggaran, mis. 2026/2027)
      const kosp = per('kosp').filter((r) => String(r.data?.tahun_ajaran || '').trim().startsWith(tahun))
      if (kosp.length) {
        const awal = jenjang === 'SMP' ? 'kelas 7' : 'kelas 1'
        const bagianAda = new Set(kosp.map((r) => r.data?.bagian))

        // Misi sekolah -> satu baris per butir misi
        const misi = kosp.filter((r) => r.data?.bagian === 'Visi, Misi, Tujuan').flatMap((r) => ambilMisi(r.data?.uraian))
        misi.forEach((m) => {
          draf.push({
            ...dasar, sumber_data: 'KOSP', program: 'Pelaksanaan Misi Sekolah', kegiatan: m,
            sasaran: 'Seluruh warga sekolah', pj: 'Kepala Sekolah', waktu: tahun, anggaran: '',
          })
        })

        // Program kerja per bagian KOSP
        PROGRAM_KOSP.filter((p) => bagianAda.has(p.bagian)).forEach((p) => {
          draf.push({
            ...dasar, sumber_data: 'KOSP', program: p.program,
            kegiatan: p.kegiatan.replace('{awal}', awal),
            sasaran: p.sasaran.replace('{awal}', awal),
            pj: p.pj.replace('{awal}', awal), waktu: p.waktu, anggaran: '',
          })
        })

        // Projek penguatan profil pelajar Pancasila (tema diambil dari KOSP bila sudah diisi)
        const tema = kosp.filter((r) => r.data?.bagian === 'Pengorganisasian Pembelajaran')
          .map((r) => ambilTemaP5(r.data?.uraian)).find(Boolean)
        if (bagianAda.has('Pengorganisasian Pembelajaran')) {
          draf.push({
            ...dasar, sumber_data: 'KOSP', program: 'Projek Penguatan Profil Pelajar Pancasila',
            kegiatan: `Pelaksanaan projek penguatan profil pelajar Pancasila${tema ? ` dengan tema ${tema}` : ''}`,
            sasaran: 'Seluruh peserta didik', pj: 'Tim Fasilitator Projek', waktu: 'Sesuai jadwal projek', anggaran: '',
          })
        }
      }

      // Lewati yang sudah ada
      const kunci = (d) => `${d.sumber_data}|${d.program}|${d.kegiatan}|${d.tahun}`
      const ada = new Set(rows.map((r) => kunci(r.data || {})))
      const baru = draf.filter((d) => d.kegiatan && !ada.has(kunci(d)))

      if (baru.length === 0) {
        return alert(draf.length === 0
          ? `Belum ada data sumber untuk tahun ${tahun}. Isi dulu RKAS / Kalender Pendidikan / Inventaris.`
          : 'Semua baris draf sudah ada di RKT.')
      }
      if (!window.confirm(`Tambahkan ${baru.length} baris draf RKT ${jenjang} tahun ${tahun}?`)) return

      const tanggal = new Date().toISOString().slice(0, 10)
      const { error } = await supabase.from(TABEL).insert(
        baru.map((d) => ({ sekolah_id: sekolahId, jenis: slug, tanggal, data: d }))
      )
      if (error) throw new Error('Gagal menyimpan: ' + error.message)
      alert(`${baru.length} baris draf RKT berhasil ditambahkan. Lengkapi penanggung jawab dan anggaran bila perlu.`)
      muat()
    } catch (e) {
      alert('Gagal menarik data: ' + e.message)
    } finally {
      setMenarik(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 text-base sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400'
  const namaSekolah = profil?.nama_sekolah || profil?.nama || ''
  const nipKepsek = bersih(profil?.nip_kepala_sekolah || profil?.nip_kepsek || profil?.nip)

  // Total anggaran: RKT memakai kolom `anggaran`, RKAS memakai kolom `jumlah`. Mengikuti hasil pencarian.
  const kunciTotal = slug === 'rkt' ? 'anggaran' : slug === 'rkas' ? 'jumlah' : null
  const idxTotal = kunciTotal ? kolom.findIndex((c) => c.k === kunciTotal) : -1
  const totalAnggaran = idxTotal >= 0
    ? tersaring.reduce((n, r) => n + (Number(r.data?.[kunciTotal]) || 0), 0)
    : 0
  const rupiah = (n) => 'Rp ' + Number(n).toLocaleString('id-ID')
  const tombol = 'inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors'

  // ---- Lembar Kerja ARKAS (halaman RKAS) ----
  const bukaLembar = () => {
    const p = ringkasPagu[0]
    const r = rows[0]
    setLembar({
      tahun: String(p?.data?.tahun ?? r?.data?.tahun ?? new Date().getFullYear()),
      sumber: p?.data?.sumber ?? r?.data?.sumber ?? Object.keys(KODE_PENERIMAAN)[0],
    })
  }
  const opsiSumber = cfg.fields.find((x) => x.k === 'sumber')?.o || Object.keys(KODE_PENERIMAAN)

  // ---- Tarik otomatis dari RKT -> item RKAS ----
  // RKT jadi sumber utama. Baris RKT yang punya anggaran (selain yang berasal dari RKAS sendiri):
  //  - belum ada di RKAS  -> dibuat sebagai item baru, lengkap (komponen, kode kegiatan, kode rekening,
  //                          volume, satuan, harga, jumlah, bulan, tahap)
  //  - sudah ada di RKAS  -> item itu dilengkapi: hanya kolom yang masih kosong yang diisi.
  //                          Jumlah ikut disamakan dengan RKT bila item itu dulu hasil tarikan (asal RKT).
  // Kecocokan: tahun + sumber dana + uraian sama. Aman ditekan berulang.
  const tebakKode = (teks) => {
    const t = bersih(teks).toLowerCase()
    if (!t) return ''
    return ref.kegiatan.find((x) => POLA_KEG.test(x.kode) && x.nama && x.nama.length >= 8
      && (t === x.nama.toLowerCase() || t.includes(x.nama.toLowerCase())))?.kode || ''
  }

  const tarikDariRKT = async () => {
    const tahunIn = window.prompt('Tarik item RKAS dari RKT. Tahun anggaran?', String(new Date().getFullYear()))
    if (!tahunIn) return
    const tahun = tahunIn.trim()
    const sumberIn = window.prompt(`Sumber dana untuk item yang ditarik?\n(${opsiSumber.join(' / ')})`, opsiSumber[0])
    if (!sumberIn) return
    const sumber = opsiSumber.find((o) => o.toLowerCase() === sumberIn.trim().toLowerCase())
    if (!sumber) return alert('Sumber dana tidak dikenali.')

    setMenarikRkt(true)
    try {
      const { data, error } = await supabase.from(TABEL).select('data')
        .eq('sekolah_id', sekolahId).eq('jenis', 'rkt')
      if (error) throw new Error('Data RKT: ' + error.message)

      const rkt = (data || []).map((r) => r.data || {})
        .filter((d) => String(d.tahun) === tahun && d.sumber_data !== 'RKAS')
      const berAnggaran = rkt.filter((d) => angka(d.anggaran) > 0 && bersih(d.kegiatan))
      const tanpaAnggaran = rkt.length - berAnggaran.length

      const kunci = (u) => bersih(u).toLowerCase()
      const sama = rows.filter((r) => String(r.data?.tahun) === tahun && r.data?.sumber === sumber)
      const petaAda = new Map(sama.map((r) => [kunci(r.data?.uraian), r]))
      const pg = ringkasPagu.find((x) => String(x.data?.tahun) === tahun && x.data?.sumber === sumber)
      const batasT1 = pg ? angka(pg.data?.tahap1) : Infinity
      const opsiBulan = cfg.fields.find((x) => x.k === 'bulan')?.o || BULAN
      const kanonBulan = (nama) => opsiBulan.find((o) => o.toLowerCase() === String(nama).toLowerCase()) || nama
      let t1 = sama.filter((r) => r.data?.tahap === 'Tahap 1').reduce((n, r) => n + nilaiRkas(r.data), 0)

      const tambah = []
      const ubah = []
      let selisihTotal = 0
      let ditebak = 0
      const sudah = new Set()

      berAnggaran.forEach((d) => {
        const uraian = bersih(d.kegiatan)
        const k = kunci(uraian)
        if (sudah.has(k)) return
        sudah.add(k)
        const anggaran = angka(d.anggaran)
        const ada = petaAda.get(k)
        const lama = ada?.data || {}
        const pinjam = rows.find((r) => r !== ada && kunci(r.data?.uraian) === k
          && (bersih(r.data?.kode_kegiatan) || bersih(r.data?.kode_rekening)))?.data

        // Kode kegiatan dan rekening: isian RKT -> item RKAS lain yang uraiannya sama -> tebakan dari nama referensi
        let kodeKeg = [d.kode_kegiatan, pinjam?.kode_kegiatan].map(bersih).find((x) => POLA_KEG.test(x)) || ''
        let kodeRek = [d.kode_rekening, pinjam?.kode_rekening].map(bersih).find(Boolean) || ''
        let tebak = false
        if (!kodeKeg) {
          kodeKeg = tebakKode(uraian) || tebakKode(d.program)
            || cariRef(ref.kegiatan, `${uraian} ${bersih(d.program)}`, (x) => POLA_KEG.test(x.kode))
          if (kodeKeg) tebak = true
        }
        if (!kodeRek) {
          kodeRek = cariRef(ref.rekening, uraian)
          if (kodeRek) tebak = true
        }
        const komponen = bersih(d.komponen) || (kodeKeg ? namaKeg(kodeKeg.slice(0, 5)) : '')

        // Volume, satuan, harga: isian RKT, atau sasaran berbentuk "3 unit"; selain itu 1 paket
        let volume = angka(d.volume) || 1
        let satuan = bersih(d.satuan) || 'Paket'
        let harga = Math.round(anggaran / volume)
        const m = bersih(d.sasaran).match(/^(\d+)\s+([^\d]{1,20})$/)
        if (!angka(d.volume) && m && !/dalam/i.test(m[2]) && Number(m[1]) > 0 && anggaran % Number(m[1]) === 0) {
          volume = Number(m[1]); satuan = m[2].trim(); harga = anggaran / volume
        }

        // Bulan dan tahap: isian RKT, atau bulan yang disebut di kolom waktu; selain itu dibagi mengikuti pagu tahap 1
        const idxB = BULAN.findIndex((b) => (bersih(d.bulan) || bersih(d.waktu)).toLowerCase().includes(b.toLowerCase()))
        let bulan = bersih(d.bulan) || (idxB >= 0 ? kanonBulan(BULAN[idxB]) : '')
        let tahap = bersih(d.tahap) || (idxB >= 0 ? (idxB < 6 ? 'Tahap 1' : 'Tahap 2') : '')

        if (ada) {
          const patch = {}
          const isi = (kol, nilai) => { if (!bersih(lama[kol]) && nilai) patch[kol] = nilai }
          isi('komponen', komponen); isi('kode_kegiatan', kodeKeg); isi('kode_rekening', kodeRek); isi('satuan', satuan)
          if (!tahap && !bersih(lama.tahap)) tahap = t1 + anggaran <= batasT1 ? 'Tahap 1' : 'Tahap 2'
          isi('tahap', tahap)
          const tahapAkhir = bersih(lama.tahap) || patch.tahap
          if (!bersih(lama.tahap) && patch.tahap === 'Tahap 1') t1 += anggaran
          isi('bulan', bulan || kanonBulan(tahapAkhir === 'Tahap 2' ? 'Juli' : 'Januari'))
          if (!angka(lama.jumlah)) {
            patch.volume = volume; patch.harga = harga; patch.jumlah = anggaran
            selisihTotal += anggaran
          } else if (lama.asal === 'RKT' && angka(lama.volume) <= 1 && angka(lama.jumlah) !== anggaran) {
            selisihTotal += anggaran - angka(lama.jumlah)
            patch.volume = 1; patch.harga = anggaran; patch.jumlah = anggaran
          }
          if (Object.keys(patch).length) {
            if (tebak && (patch.kode_kegiatan || patch.kode_rekening)) ditebak++
            ubah.push({ id: ada.id, data: { ...lama, ...patch } })
          }
        } else {
          if (!tahap) tahap = t1 + anggaran <= batasT1 ? 'Tahap 1' : 'Tahap 2'
          if (tahap === 'Tahap 1') t1 += anggaran
          if (!bulan) bulan = kanonBulan(tahap === 'Tahap 2' ? 'Juli' : 'Januari')
          if (tebak) ditebak++
          selisihTotal += anggaran
          const item = { tahun, sumber, uraian, volume, satuan, harga, jumlah: anggaran, bulan, tahap, asal: 'RKT' }
          if (komponen) item.komponen = komponen
          if (kodeKeg) item.kode_kegiatan = kodeKeg
          if (kodeRek) item.kode_rekening = kodeRek
          tambah.push(item)
        }
      })

      if (tambah.length === 0 && ubah.length === 0) {
        return alert(rkt.length === 0
          ? `Belum ada baris RKT tahun ${tahun} yang bisa ditarik (baris yang berasal dari RKAS tidak ikut ditarik).`
          : berAnggaran.length === 0
            ? `Ada ${rkt.length} baris RKT tahun ${tahun}, tetapi belum ada yang diisi anggarannya. Isi kolom anggaran di RKT dulu.`
            : 'Semua item RKAS sudah lengkap dan sesuai RKT.')
      }

      const sisaSetelah = pg ? pg.sisa - selisihTotal : null
      const catatan = [
        tanpaAnggaran > 0 ? `${tanpaAnggaran} baris RKT tanpa anggaran dilewati.` : '',
        ditebak > 0 ? `${ditebak} item memakai kode hasil tebakan otomatis, mohon diperiksa.` : '',
        sisaSetelah === null ? 'Pagu belum diatur untuk tahun dan sumber dana ini.'
          : sisaSetelah < 0 ? `PERHATIAN: melebihi sisa pagu sebesar ${rupiah(Math.abs(sisaSetelah))}.`
          : `Sisa pagu setelah ditarik: ${rupiah(sisaSetelah)}.`,
      ].filter(Boolean).join('\n')
      if (!window.confirm(`${sumber} ${tahun}:\n- ${tambah.length} item baru ditambahkan\n- ${ubah.length} item yang sudah ada dilengkapi\nPerubahan total anggaran: ${rupiah(selisihTotal)}.\n${catatan}\n\nLanjutkan?`)) return

      const tanggal = new Date().toISOString().slice(0, 10)
      if (tambah.length) {
        const { error: e2 } = await supabase.from(TABEL).insert(
          tambah.map((item) => ({ sekolah_id: sekolahId, jenis: slug, tanggal, data: item }))
        )
        if (e2) throw new Error('Gagal menyimpan item baru: ' + e2.message)
      }
      for (const u of ubah) {
        const { error: e3 } = await supabase.from(TABEL).update({ data: u.data }).eq('id', u.id)
        if (e3) throw new Error('Gagal melengkapi item: ' + e3.message)
      }
      const tanpaRek = [...tambah, ...ubah.map((u) => u.data)].filter((x) => !bersih(x.kode_rekening)).length
      alert(`${tambah.length} item baru dan ${ubah.length} item dilengkapi dari RKT.`
        + (tanpaRek ? `\n${tanpaRek} item belum punya kode rekening (tidak ada yang cocok otomatis). Isi lewat tombol ubah.` : ''))
      muat()
    } catch (e) {
      alert('Gagal menarik dari RKT: ' + e.message)
    } finally {
      setMenarikRkt(false)
    }
  }

  const hitungLembar = (lb) => {
    const items = rows.filter((r) => String(r.data?.tahun) === String(lb.tahun) && r.data?.sumber === lb.sumber)
    const kk = susunKertasKerja(
      items.map((r) => ({ id: r.id, tanggal: r.tanggal, created_at: r.created_at, data: r.data })),
      ref,
    )
    const sumT = (t) => items.filter((r) => r.data?.tahap === t).reduce((n, r) => n + nilaiRkas(r.data), 0)
    const pg = ringkasPagu.find((x) => String(x.data?.tahun) === String(lb.tahun) && x.data?.sumber === lb.sumber)
    return { ...lb, ...kk, t1: sumT('Tahap 1'), t2: sumT('Tahap 2'), pagu: pg?.pagu || 0 }
  }
  const dataLembar = lembar ? hitungLembar(lembar) : null

  const unduhCsv = (d) => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const baris = [['Kode Kegiatan', 'Kode Rekening', 'Uraian', 'Volume', 'Satuan', 'Harga Satuan', 'Jumlah', 'Jenis Belanja', 'Bulan', 'Tahap']]
    d.baris.filter((b) => b.tingkat === 'uraian').forEach((b) => baris.push([
      b.kodeKeg, b.kodeRek, b.nama, b.volume, b.satuan, b.harga, b.jumlah,
      b.modal > 0 ? 'Belanja Modal' : 'Belanja Operasi', b.bulan, b.tahap,
    ]))
    const csv = '\uFEFF' + baris.map((b) => b.map(esc).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `kertas-kerja-arkas-${d.sumber.replace(/\s+/g, '-')}-${d.tahun}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tabelLembar = (d) => {
    const kodePen = KODE_PENERIMAAN[d.sumber]
    const daftarPen = ref.penerimaan.length ? ref.penerimaan : (kodePen ? [{ kode: kodePen, nama: d.sumber }] : [])
    const selisih = d.pagu - d.total
    return (
      <>
        <p style={{ fontWeight: 700, margin: '0 0 4px' }}>A. PENERIMAAN</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: 12 }}>
          <thead>
            <tr>{['No', 'Kode Penerimaan', 'Sumber Dana', 'Jumlah'].map((h) => (
              <th key={h} style={{ ...sel, background: '#eee', textAlign: 'center' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {daftarPen.map((p, i) => (
              <tr key={p.kode}>
                <td style={{ ...sel, textAlign: 'center' }}>{i + 1}</td>
                <td style={sel}>{p.kode}</td>
                <td style={sel}>{p.nama}</td>
                <td style={{ ...sel, textAlign: 'right' }}>{angkaId(p.kode === kodePen ? d.pagu : 0)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ ...sel, textAlign: 'right', fontWeight: 700 }}>Total Penerimaan</td>
              <td style={{ ...sel, textAlign: 'right', fontWeight: 700 }}>{angkaId(d.pagu)}</td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontWeight: 700, margin: '0 0 4px' }}>B. BELANJA ({d.sumber})</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
          <thead>
            <tr>{['No', 'Kode Rekening', 'Kode Kegiatan', 'Uraian Kegiatan', 'Jumlah', 'Belanja Operasi', 'Belanja Modal'].map((h) => (
              <th key={h} style={{ ...sel, background: '#eee', textAlign: 'center' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {d.baris.length === 0 && (
              <tr><td colSpan={7} style={{ ...sel, textAlign: 'center' }}>Belum ada item RKAS untuk sumber dana dan tahun ini.</td></tr>
            )}
            {d.baris.map((b, i) => {
              const teks = b.tingkat === 'uraian' ? `${b.no}. ${b.nama}`
                : b.tingkat === 'rekening' ? b.nama
                : `${b.kode}${b.kode ? '. ' : ''}${b.nama}`
              return (
                <tr key={i} style={{ pageBreakInside: 'avoid', ...gayaBaris[b.tingkat] }}>
                  <td style={{ ...sel, textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ ...sel, whiteSpace: 'nowrap' }}>{b.kodeRek || ''}</td>
                  <td style={{ ...sel, whiteSpace: 'nowrap' }}>{b.kodeKeg || ''}</td>
                  <td style={{ ...sel, paddingLeft: 6 + geser[b.tingkat], whiteSpace: 'pre-line' }}>
                    {teks}
                    {b.rincian && <div style={{ fontWeight: 400, fontSize: '9pt', color: '#444' }}>{b.rincian}</div>}
                  </td>
                  <td style={{ ...sel, textAlign: 'right', whiteSpace: 'nowrap' }}>{angkaId(b.jumlah)}</td>
                  <td style={{ ...sel, textAlign: 'right', whiteSpace: 'nowrap' }}>{angkaId(b.operasi)}</td>
                  <td style={{ ...sel, textAlign: 'right', whiteSpace: 'nowrap' }}>{angkaId(b.modal)}</td>
                </tr>
              )
            })}
            <tr style={{ pageBreakInside: 'avoid', fontWeight: 700 }}>
              <td colSpan={4} style={{ ...sel, textAlign: 'right' }}>Jumlah</td>
              <td style={{ ...sel, textAlign: 'right', whiteSpace: 'nowrap' }}>{angkaId(d.total)}</td>
              <td style={{ ...sel, textAlign: 'right', whiteSpace: 'nowrap' }}>{angkaId(d.operasi)}</td>
              <td style={{ ...sel, textAlign: 'right', whiteSpace: 'nowrap' }}>{angkaId(d.modal)}</td>
            </tr>
            {[['Belanja Tahap 1', d.t1], ['Belanja Tahap 2', d.t2], ['Pagu Tahunan', d.pagu], ['Sisa Pagu', selisih]].map(([lbl, nilai]) => (
              <tr key={lbl} style={{ pageBreakInside: 'avoid' }}>
                <td colSpan={4} style={{ ...sel, textAlign: 'right' }}>{lbl}</td>
                <td style={{ ...sel, textAlign: 'right', whiteSpace: 'nowrap' }}>{angkaId(nilai)}</td>
                <td colSpan={2} style={sel} />
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )
  }

  return (
    <Layout title={cfg.judul} subtitle={cfg.ket}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #cetak-area, #cetak-area * { visibility: visible; }
          #cetak-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
          body.cetak-lembar #cetak-area { display: none !important; }
          body.cetak-kalender #cetak-area { display: none !important; }
          #cetak-kalender, #cetak-kalender * { visibility: visible; }
          #cetak-kalender { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
          #cetak-lembar, #cetak-lembar * { visibility: visible; }
          #cetak-lembar { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: A4 landscape; margin: 12mm; }
        }
      `}</style>

      <Link to="/administrasi-kepsek" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
        <ArrowLeft size={15} /> Administrasi Kepala Sekolah
      </Link>

      {/* Bilah aksi: menumpuk di HP, sebaris di layar lebar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <div className="relative sm:flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari catatan"
            aria-label="Cari catatan" className={`${inputCls} pl-9`} />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 sm:ml-auto">
          {cfg.impor && (
            <button onClick={imporSiswa} disabled={importing}
              className={`${tombol} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 col-span-2 sm:col-span-1`}>
              <Download size={16} /> {importing ? 'Mengimpor...' : 'Impor dari Data Siswa'}
            </button>
          )}
          {slug === 'kosp' && (
            <>
              <button onClick={muatTemplateKosp} disabled={memuatKosp || loading}
                className={`${tombol} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 col-span-2 sm:col-span-1`}>
                <FileText size={16} /> {memuatKosp ? 'Memuat...' : `Muat Template KOSP ${deteksiJenjang(profil)}`}
              </button>
              <button onClick={sinkronkan} disabled={sinkron || loading || rows.length === 0}
                className={`${tombol} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 col-span-2 sm:col-span-1`}>
                <RefreshCw size={16} /> {sinkron ? 'Menyinkronkan...' : 'Sinkronkan Data Sekolah'}
              </button>
            </>
          )}
          {slug === 'rkas' && (
            <>
              <button onClick={() => bukaPagu(null)}
                className={`${tombol} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 col-span-2 sm:col-span-1`}>
                <Wallet size={16} /> Atur Pagu Anggaran
              </button>
              <button onClick={bukaLembar}
                className={`${tombol} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 col-span-2 sm:col-span-1`}>
                <FileText size={16} /> Lembar Kerja ARKAS
              </button>
              <button onClick={tarikDariRKT} disabled={menarikRkt || loading}
                className={`${tombol} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 col-span-2 sm:col-span-1`}>
                <Download size={16} /> {menarikRkt ? 'Menarik data...' : 'Tarik dari RKT'}
              </button>
            </>
          )}
          {slug === 'kalender-pendidikan' && (
            <button onClick={() => setTampilKal((v) => (v === 'tahunan' ? 'daftar' : 'tahunan'))}
              className={`${tombol} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 col-span-2 sm:col-span-1`}>
              <CalendarRange size={16} /> {tampilKal === 'tahunan' ? 'Daftar Agenda' : 'Kalender Tahunan'}
            </button>
          )}
          {slug === 'rkt' && (
            <button onClick={tarikRKT} disabled={menarik || loading}
              className={`${tombol} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 col-span-2 sm:col-span-1`}>
              <Download size={16} /> {menarik ? 'Menarik data...' : 'Tarik Data Otomatis'}
            </button>
          )}
          <button onClick={() => window.print()} disabled={rows.length === 0 && !kalTahunan}
            className={`${tombol} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40`}>
            <Printer size={16} /> Cetak
          </button>
          <button onClick={bukaBaru} className={`${tombol} bg-blue-700 text-white hover:bg-blue-800`}>
            <Plus size={16} /> Tambah
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Gagal memuat data: {err}
        </div>
      )}

      {slug === 'rkas' && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {ringkasPagu.length === 0 ? (
            <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              Pagu belum diatur. Tekan "Atur Pagu Anggaran" untuk mengisi pagu BOS per tahun; sisa pagu akan berkurang otomatis setiap item ditambahkan.
            </div>
          ) : ringkasPagu.map((pg) => {
            const persen = pg.pagu > 0 ? Math.min(100, Math.round((pg.terpakai / pg.pagu) * 100)) : 0
            const lebih = pg.sisa < 0
            return (
              <div key={pg.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{pg.data.sumber} - {pg.data.tahun}</p>
                    <p className="text-xs text-slate-500">
                      {angka(pg.data.jumlah_siswa) > 0 && `${pg.data.jumlah_siswa} siswa | `}
                      Tahap 1 {rupiah(angka(pg.data.tahap1))} | Tahap 2 {rupiah(pg.pagu - angka(pg.data.tahap1))}
                    </p>
                  </div>
                  <button onClick={() => bukaPagu(pg)} aria-label="Ubah pagu" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil size={15} /></button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div><p className="text-slate-500">Pagu tahunan</p><p className="font-semibold text-slate-900">{rupiah(pg.pagu)}</p></div>
                  <div><p className="text-slate-500">Terpakai</p><p className="font-semibold text-slate-900">{rupiah(pg.terpakai)}</p></div>
                  <div><p className="text-slate-500">Sisa pagu</p><p className={`font-semibold ${lebih ? 'text-rose-600' : 'text-emerald-700'}`}>{rupiah(pg.sisa)}</p></div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${lebih ? 'bg-rose-500' : 'bg-blue-600'}`} style={{ width: `${persen}%` }} />
                </div>
                {lebih && <p className="mt-2 text-xs text-rose-600">Anggaran melebihi pagu sebesar {rupiah(Math.abs(pg.sisa))}.</p>}
              </div>
            )
          })}
        </div>
      )}

      {kalTahunan ? (
        <KalenderTahunan agenda={rows} kepsek={profil?.kepala_sekolah || ''} nip={nipKepsek}
          tempat={bersih(profil?.tempat_ttd || profil?.kabupaten)} />
      ) : loading ? (
        <p className="text-sm text-slate-500">Memuat data...</p>
      ) : tersaring.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          {rows.length === 0 ? `Belum ada catatan. Tekan "Tambah" untuk mengisi ${cfg.judul}.` : `Tidak ada catatan yang cocok dengan "${q}".`}
        </div>
      ) : (
        <>
          {/* Tabel (layar >= md) */}
          <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-3 py-2.5 w-10">No</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">{cfg.tanggalLabel}</th>
                  {kolom.map((c) => <th key={c.k} className="px-3 py-2.5">{c.l}</th>)}
                  <th className="px-3 py-2.5 w-24" />
                </tr>
              </thead>
              <tbody>
                {tersaring.map((r, i) => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2.5">{i + 1}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{tgl(r.tanggal) || '-'}</td>
                    {kolom.map((c) => (
                      <td key={c.k} className="px-3 py-2.5 max-w-xs break-words">
                        {c.t === 'textarea'
                          ? <div style={gayaPotong}>{tampil(c, r.data[c.k])}</div>
                          : tampil(c, r.data[c.k])}
                      </td>
                    ))}
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => bukaEdit(r)} aria-label="Ubah" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil size={15} /></button>
                        <button onClick={() => hapus(r)} aria-label="Hapus" className="p-2 rounded-lg hover:bg-rose-50 text-rose-600"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kartu (HP & tablet kecil) */}
          <div className="md:hidden space-y-3">
            {tersaring.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-3.5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm break-words">{tampil(kolom[0], r.data[kolom[0].k])}</p>
                    <p className="text-xs text-slate-500">{tgl(r.tanggal) || '-'}</p>
                  </div>
                  <div className="flex shrink-0">
                    <button onClick={() => bukaEdit(r)} aria-label="Ubah" className="p-2.5 rounded-lg text-slate-600 active:bg-slate-100"><Pencil size={16} /></button>
                    <button onClick={() => hapus(r)} aria-label="Hapus" className="p-2.5 rounded-lg text-rose-600 active:bg-rose-50"><Trash2 size={16} /></button>
                  </div>
                </div>
                <dl className="space-y-1">
                  {kolom.slice(1).map((c) => (
                    r.data[c.k] ? (
                      <div key={c.k} className="flex gap-2 text-xs">
                        <dt className="w-24 shrink-0 text-slate-500">{c.l}</dt>
                        <dd className="min-w-0 break-words text-slate-800">
                          {c.t === 'textarea'
                            ? <div style={gayaPotong}>{tampil(c, r.data[c.k])}</div>
                            : tampil(c, r.data[c.k])}
                        </dd>
                      </div>
                    ) : null
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </>
      )}

      {idxTotal >= 0 && tersaring.length > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <span className="text-slate-600">Jumlah total anggaran ({tersaring.length} baris)</span>
          <span className="font-semibold text-slate-900">{rupiah(totalAnggaran)}</span>
        </div>
      )}

      {/* Modal form: lembar bawah penuh di HP, dialog di layar lebar */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setForm(null)}>
          <form onSubmit={simpan} onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="font-display font-semibold text-slate-900">{form.id ? 'Ubah' : 'Tambah'} {cfg.judul}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Tutup" className="p-2 -mr-2 text-slate-500"><X size={18} /></button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-slate-600">{cfg.tanggalLabel}</span>
                <input type="date" value={form.tanggal} onChange={(e) => setForm((p) => ({ ...p, tanggal: e.target.value }))} className={`${inputCls} mt-1`} />
              </label>
              {cfg.fields.map((fld) => {
                const v = form.data[fld.k] ?? ''
                const lebar = fld.t === 'textarea' ? 'sm:col-span-2' : ''
                return (
                  <label key={fld.k} className={`block text-sm ${lebar}`}>
                    <span className="text-slate-600">{fld.l}{fld.req && <span className="text-rose-500"> *</span>}</span>
                    {fld.t === 'textarea' ? (
                      <textarea rows={String(v).length > 300 ? 14 : 3} value={v} onChange={(e) => setField(fld.k, e.target.value)}
                        onBlur={fld.k === 'uraian' ? sarankanDariUraian : undefined} className={`${inputCls} mt-1`} />
                    ) : fld.t === 'select' || fld.t === 'guru' ? (
                      <select value={v} onChange={(e) => setField(fld.k, e.target.value)} className={`${inputCls} mt-1`}>
                        <option value="">Pilih...</option>
                        {(fld.t === 'guru' ? guruList : fld.o).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={fld.t === 'rp' ? 'number' : fld.t}
                        inputMode={fld.t === 'number' || fld.t === 'rp' ? 'numeric' : undefined}
                        list={punyaKode && fld.k === 'kode_kegiatan' ? 'dl-keg' : punyaKode && fld.k === 'kode_rekening' ? 'dl-rek' : undefined}
                        autoComplete={punyaKode && (fld.k === 'kode_kegiatan' || fld.k === 'kode_rekening') ? 'off' : undefined}
                        onBlur={fld.k === 'uraian' ? sarankanDariUraian : undefined}
                        value={v} onChange={(e) => setField(fld.k, e.target.value)} className={`${inputCls} mt-1`} />
                    )}
                  </label>
                )
              })}
              {punyaKode && (
                <>
                  <datalist id="dl-keg">
                    {ref.kegiatan.filter((x) => POLA_KEG.test(x.kode)).map((x) => <option key={x.kode} value={x.kode}>{x.nama}</option>)}
                  </datalist>
                  <datalist id="dl-rek">
                    {ref.rekening.map((x) => <option key={x.kode} value={x.kode}>{x.nama}</option>)}
                  </datalist>
                </>
              )}
              {punyaKode && (() => {
                const kk = bersih(form.data.kode_kegiatan)
                const kr = bersih(form.data.kode_rekening)
                if (!kk && !kr) return null
                const total = angka(form.data.volume) * angka(form.data.harga)
                return (
                  <div className="sm:col-span-2 text-xs space-y-0.5">
                    {kk && (POLA_KEG.test(kk)
                      ? <p className={namaKeg(kk) ? 'text-emerald-700' : 'text-amber-700'}>Kegiatan: {namaKeg(kk) || 'kode tidak ada di referensi ARKAS'}</p>
                      : <p className="text-amber-700">Kode kegiatan harus berformat 00.00.00.</p>)}
                    {kr && (
                      <p className={namaRek(kr) ? 'text-emerald-700' : 'text-amber-700'}>
                        Rekening: {namaRek(kr) || 'kode tidak ada di referensi ARKAS'}{kr.startsWith('5.2') ? ' (Belanja Modal)' : kr.startsWith('5.1') ? ' (Belanja Operasi)' : ''}
                      </p>
                    )}
                    {total > 0 && angka(form.data.jumlah) !== total && (
                      <p className="text-amber-700">Jumlah ({rupiah(angka(form.data.jumlah))}) berbeda dari volume x harga ({rupiah(total)}).</p>
                    )}
                  </div>
                )
              })()}
              {slug === 'rkas' && (() => {
                const sisa = sisaPaguUntuk(form.data, form.id)
                if (sisa === null) return <p className="sm:col-span-2 text-xs text-slate-500">Pagu untuk tahun dan sumber dana ini belum diatur.</p>
                return (
                  <p className={`sm:col-span-2 text-xs ${sisa < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    Sisa pagu setelah item ini: {rupiah(sisa)}{sisa < 0 ? ' (melebihi pagu)' : ''}
                  </p>
                )
              })()}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <button type="button" onClick={() => setForm(null)} className={`${tombol} border border-slate-200 text-slate-700`}>Batal</button>
              <button type="submit" disabled={saving} className={`${tombol} bg-blue-700 text-white disabled:opacity-60`}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {formPagu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setFormPagu(null)}>
          <form onSubmit={simpanPagu} onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="font-display font-semibold text-slate-900">{formPagu.id ? 'Ubah' : 'Atur'} Pagu Anggaran</h2>
              <button type="button" onClick={() => setFormPagu(null)} aria-label="Tutup" className="p-2 -mr-2 text-slate-500"><X size={18} /></button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-slate-600">Tahun Anggaran <span className="text-rose-500">*</span></span>
                <input type="text" value={formPagu.data.tahun ?? ''} onChange={(e) => setPaguField('tahun', e.target.value)} className={`${inputCls} mt-1`} />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Sumber Dana <span className="text-rose-500">*</span></span>
                <select value={formPagu.data.sumber ?? ''} onChange={(e) => setPaguField('sumber', e.target.value)} className={`${inputCls} mt-1`}>
                  {(cfg.fields.find((x) => x.k === 'sumber')?.o || []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Jumlah Siswa</span>
                <input type="number" inputMode="numeric" value={formPagu.data.jumlah_siswa ?? ''} onChange={(e) => setPaguField('jumlah_siswa', e.target.value)} className={`${inputCls} mt-1`} />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Pagu per Siswa (Rp)</span>
                <input type="number" inputMode="numeric" value={formPagu.data.pagu_per_siswa ?? ''} onChange={(e) => setPaguField('pagu_per_siswa', e.target.value)} className={`${inputCls} mt-1`} />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-slate-600">Pagu Tahunan (Rp) <span className="text-rose-500">*</span></span>
                <input type="number" inputMode="numeric" value={formPagu.data.pagu_tahun ?? ''} onChange={(e) => setPaguField('pagu_tahun', e.target.value)} className={`${inputCls} mt-1`} />
                <span className="text-xs text-slate-500">Terisi otomatis dari siswa x pagu per siswa, dan boleh diubah langsung.</span>
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Pagu Tahap 1 (Rp)</span>
                <input type="number" inputMode="numeric" value={formPagu.data.tahap1 ?? ''} onChange={(e) => setPaguField('tahap1', e.target.value)} className={`${inputCls} mt-1`} />
              </label>
              <div className="text-sm">
                <span className="text-slate-600">Pagu Tahap 2 (Rp)</span>
                <div className={`${inputCls} mt-1 bg-slate-50`}>{Math.max(0, angka(formPagu.data.pagu_tahun) - angka(formPagu.data.tahap1)).toLocaleString('id-ID')}</div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-3 flex gap-2 justify-end">
              {formPagu.id && (
                <button type="button" onClick={hapusPagu} className={`${tombol} border border-rose-200 text-rose-600 mr-auto`}>Hapus</button>
              )}
              <button type="button" onClick={() => setFormPagu(null)} className={`${tombol} border border-slate-200 text-slate-700`}>Batal</button>
              <button type="submit" disabled={savingPagu} className={`${tombol} bg-blue-700 text-white disabled:opacity-60`}>
                {savingPagu ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Lembar Kerja ARKAS */}
      {lembar && dataLembar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setLembar(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-6xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 bg-white flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100">
              <h2 className="font-display font-semibold text-slate-900 mr-2">Lembar Kerja ARKAS</h2>
              <input type="text" value={lembar.tahun} aria-label="Tahun anggaran"
                onChange={(e) => setLembar((p) => ({ ...p, tahun: e.target.value }))}
                className={`${inputCls} !w-24`} />
              <select value={lembar.sumber} aria-label="Sumber dana"
                onChange={(e) => setLembar((p) => ({ ...p, sumber: e.target.value }))}
                className={`${inputCls} !w-44`}>
                {opsiSumber.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={() => unduhCsv(dataLembar)} disabled={dataLembar.baris.length === 0}
                  className={`${tombol} bg-white border border-slate-200 text-slate-700 disabled:opacity-40`}>
                  <Download size={16} /> CSV
                </button>
                <button type="button" onClick={() => window.print()}
                  className={`${tombol} bg-blue-700 text-white`}>
                  <Printer size={16} /> Cetak
                </button>
                <button type="button" onClick={() => setLembar(null)} aria-label="Tutup" className="p-2 text-slate-500"><X size={18} /></button>
              </div>
            </div>

            <div className="p-4 overflow-x-auto">
              {dataLembar.belumBerkode > 0 && (
                <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                  {dataLembar.belumBerkode} item belum punya kode kegiatan yang valid (format 00.00.00), jadi dikelompokkan di "Belum berkode kegiatan".
                </p>
              )}
              {dataLembar.tanpaRekening > 0 && (
                <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                  {dataLembar.tanpaRekening} item belum punya kode rekening, dihitung sebagai Belanja Operasi.
                </p>
              )}
              {dataLembar.pagu > 0 && Math.round(dataLembar.pagu - dataLembar.total) !== 0 && (
                <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                  Penerimaan dan belanja tidak sama: pagu {rupiah(dataLembar.pagu)}, belanja {rupiah(dataLembar.total)}. ARKAS menandai kondisi ini dengan tanda ~.
                </p>
              )}
              {tabelLembar(dataLembar)}
            </div>
          </div>
        </div>
      )}

      {/* Area cetak Lembar Kerja ARKAS (hanya tampil saat print) */}
      {lembar && dataLembar && (
        <div id="cetak-lembar" className="hidden" style={{ color: '#000', fontSize: '11pt' }}>
          <KopSurat />
          <div style={{ textAlign: 'center', marginBottom: 12, fontWeight: 700, fontSize: '13pt' }}>
            KERTAS KERJA RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS)<br />TAHUN ANGGARAN {dataLembar.tahun}
          </div>
          {tabelLembar(dataLembar)}
          <div style={{ marginTop: 24, pageBreakInside: 'avoid' }}>
            <div style={{ textAlign: 'right', marginBottom: 8 }}>
              {bersih(profil?.tempat_ttd || profil?.kabupaten)}{bersih(profil?.tempat_ttd || profil?.kabupaten) ? ', ' : ''}{tgl(new Date().toISOString())}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
              {[
                ['Mengetahui,', 'Komite Sekolah', '........................', ''],
                ['', 'Bendahara Sekolah', '........................', ''],
                ['', 'Kepala Sekolah', profil?.kepala_sekolah || '........................', nipKepsek],
              ].map(([atas, jabatan, nama, nip]) => (
                <div key={jabatan} style={{ width: '30%' }}>
                  <div style={{ minHeight: '1.3em' }}>{atas}</div>
                  <div>{jabatan}</div>
                  <div style={{ height: 64 }} />
                  <div style={{ fontWeight: 700, textDecoration: 'underline' }}>{nama}</div>
                  <div>{nip ? `NIP. ${nip}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Area cetak (hanya tampil saat print) */}
      <div id="cetak-area" className="hidden" style={{ color: '#000', fontSize: '11pt' }}>
        <KopSurat />
        <div style={{ textAlign: 'center', marginBottom: 12, fontWeight: 700, fontSize: '13pt' }}>{cfg.judul.toUpperCase()}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
          <thead>
            <tr>
              {['No', cfg.tanggalLabel, ...kolom.map((c) => c.l)].map((h) => (
                <th key={h} style={{ border: '1px solid #000', padding: '4px 6px', background: '#eee' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tersaring.map((r, i) => (
              <tr key={r.id} style={{ pageBreakInside: 'avoid' }}>
                <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{tgl(r.tanggal)}</td>
                {kolom.map((c) => (
                  <td key={c.k} style={{ border: '1px solid #000', padding: '4px 6px', verticalAlign: 'top', whiteSpace: 'pre-line' }}>{tampil(c, r.data[c.k])}</td>
                ))}
              </tr>
            ))}
            {idxTotal >= 0 && (
              <tr style={{ pageBreakInside: 'avoid' }}>
                <td colSpan={2 + idxTotal} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>JUMLAH TOTAL</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 700, whiteSpace: 'nowrap' }}>{rupiah(totalAnggaran)}</td>
                {kolom.length - idxTotal - 1 > 0 && (
                  <td colSpan={kolom.length - idxTotal - 1} style={{ border: '1px solid #000', padding: '4px 6px' }} />
                )}
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ marginTop: 28, marginLeft: '65%', textAlign: 'center', pageBreakInside: 'avoid' }}>
          <div>Kepala Sekolah</div>
          <div style={{ height: 64 }} />
          <div style={{ fontWeight: 700, textDecoration: 'underline' }}>{profil?.kepala_sekolah || '........................'}</div>
          <div>NIP. {nipKepsek || '........................'}</div>
        </div>
      </div>
    </Layout>
  )
}
