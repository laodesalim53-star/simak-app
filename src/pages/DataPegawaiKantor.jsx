import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import TeleponLink from '../components/TeleponLink'
import { Plus, Pencil, Trash2, Search, X, Loader2, Briefcase, UploadCloud } from 'lucide-react'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

// Halaman "Data Pegawai" KHUSUS tenant kantor — menulis ke tabel `pegawai_kantor`
// (dibuat lewat migrasi-pegawai-kantor-kepegawaian.sql +
// migrasi-tambah-kolom-kepegawaian-pegawai-kantor.sql), BUKAN ke tabel `guru`.
// Ini SENGAJA dipisah dari Guru.jsx/Data Guru supaya:
//  1) Data pegawai kantor tidak tercampur dengan data guru sekolah.
//  2) Field-field di sini relevan untuk kantor (tidak ada NUPTK, mata
//     pelajaran, karpeg, dsb — itu semua konsep khusus tenaga pendidik).
//     Sejak migrasi-hapus-kolom-nuptk-jenis-ptk-pegawai-kantor.sql, kolom
//     `nuptk` dan `jenis_ptk` juga sudah tidak ada lagi di tabel
//     `pegawai_kantor` itu sendiri — jadi pemisahan ini sekarang ditegakkan
//     di level skema database, bukan cuma konvensi di form/JS ini.
//
// FITUR "Isi dari SK": mengunggah dokumen SK (PDF/gambar/Word) ATAU rekap
// Excel lalu mengisi form secara otomatis. Ada dua jalur ekstraksi:
//  1) PDF/gambar/Word -> dikirim ke Supabase Edge Function `ekstrak-sk`
//     (lihat supabase/functions/ekstrak-sk/index.ts) yang memakai Gemini
//     untuk membaca dokumen dan mengembalikan field kepegawaian sebagai JSON.
//  2) Excel (.xlsx/.xls) -> TIDAK dikirim ke Gemini. Datanya diasumsikan
//     sudah terstruktur rapi dalam dua kolom "Field"/"Nilai" (format yang
//     sama seperti rekap SK manual), jadi cukup dibaca & dipetakan langsung
//     di browser dengan SheetJS (`xlsx`). Ini lebih cepat, tidak kena biaya
//     panggilan AI, dan tidak mengirim data pegawai ke pihak ketiga.
// Kedua jalur menghasilkan bentuk objek `hasil` yang sama, lalu HANYA mengisi
// state form di browser — tidak pernah menulis langsung ke tabel — sehingga
// isolasi multi-tenant tetap terjaga karena penyimpanan akhir selalu lewat
// handleSubmit yang sudah scoped ke sekolahId.
const emptyForm = {
  nama_lengkap: '',
  nip: '',
  nik: '',
  jenis_kelamin: 'L',
  tempat_lahir: '',
  tanggal_lahir: '',
  agama: '',
  pendidikan_terakhir: '',
  jabatan: '',
  status_kepegawaian: '',
  pangkat_golongan: '',
  sk_pengangkatan: '',
  tmt_pengangkatan: '',
  tugas_tambahan: '',
  // --- Detail SK & penempatan (kolom baru dari migrasi-tambah-kolom-sk-pegawai-kantor.sql) ---
  tentang: '',
  masa_kerja_selesai: '',
  gaji: '',
  unit_kerja: '',
  instansi: '',
  ditetapkan_di: '',
  tanggal_ditetapkan: '',
  alamat: '',
  telepon_kantor: '', // (tidak dipakai, dibiarkan konsisten dgn no_hp saja di bawah)
  no_hp: '',
  email: '',
  npwp: '',
  bank: '',
  no_rekening: '',
  rekening_atas_nama: '',
  foto_profil_path: '',
  status: 'aktif',
}

function formatTanggal(tgl) {
  if (!tgl) return null
  try {
    return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return tgl
  }
}

// --- Bantuan untuk membaca file Excel rekap SK (format kolom Field/Nilai) ---

const BULAN_ID = {
  januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
  juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
}

// "17 Mei 2000" -> "2000-05-17" (format yang dipakai <input type="date">).
// Kalau formatnya tidak dikenali, dikembalikan string kosong supaya field
// tanggal di form tidak terisi nilai yang salah/tidak valid.
function tanggalIndoKeISO(teks) {
  if (!teks) return ''
  const m = String(teks).trim().toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/)
  if (!m) return ''
  const [, tgl, namaBulan, tahun] = m
  const bulan = BULAN_ID[namaBulan]
  if (!bulan) return ''
  return `${tahun}-${bulan}-${tgl.padStart(2, '0')}`
}

// "Rp 3.203.600" -> 3203600. Kalau tidak ada angka sama sekali, null.
function angkaDariTeksRupiah(teks) {
  if (!teks) return null
  const bersih = String(teks).replace(/[^0-9]/g, '')
  if (!bersih) return null
  return Number(bersih)
}

// 3203600 -> "Rp 3.203.600" (untuk tampilan di kartu profil).
function formatRupiah(angka) {
  if (angka === null || angka === undefined || angka === '') return null
  const n = Number(angka)
  if (Number.isNaN(n)) return null
  return 'Rp ' + n.toLocaleString('id-ID')
}

function jenisKelaminDariTeks(teks) {
  if (!teks) return ''
  const t = String(teks).trim().toLowerCase()
  if (t.includes('wanita') || t.includes('perempuan') || t === 'p') return 'P'
  if (t.includes('pria') || t.includes('laki') || t === 'l') return 'L'
  return ''
}

function statusKepegawaianDariTeks(teks) {
  if (!teks) return ''
  const t = String(teks).trim().toLowerCase()
  // "Tentang" SK PPPK biasanya berbunyi "...dengan Perjanjian Kerja..." dan
  // tidak selalu menyebut singkatan "PPPK" secara eksplisit.
  if (t.includes('pppk') || t.includes('perjanjian kerja')) return 'PPPK'
  if (t.includes('pegawai negeri sipil') || /\bpns\b/.test(t)) return 'PNS'
  if (t.includes('honorer')) return 'Honorer'
  return ''
}

// Ubah lembar Excel (dibaca dengan header:1, jadi array-of-arrays) menjadi
// peta { "label huruf kecil": "nilai" }. Baris judul tabel ("Field"/"Nilai")
// dan baris kosong dilewati. Cukup ambil 2 sel pertama yang tidak kosong di
// tiap baris supaya tetap toleran walau ada kolom kosong di antaranya.
function parseBarisExcelSk(baris) {
  const peta = {}
  for (const row of baris) {
    if (!Array.isArray(row)) continue
    const isi = row
      .map((v) => (v === undefined || v === null ? '' : String(v).trim()))
      .filter((v) => v !== '')
    if (isi.length < 2) continue
    const [label, nilai] = isi
    if (label.toLowerCase() === 'field' && nilai.toLowerCase() === 'nilai') continue
    peta[label.toLowerCase()] = nilai
  }
  return peta
}

// Ambil bagian utama sebuah label kolom, tanpa keterangan tambahan dalam
// tanda kurung — mis. "Ditetapkan oleh (a.n. Menteri Agama)" -> "ditetapkan
// oleh". Tanpa ini, pencarian label pendek seperti "Agama" bisa salah
// menemukan baris ini hanya karena kata "Agama" ikut disebut di keterangan.
function labelUtama(label) {
  return label.split('(')[0].trim()
}

// Cari nilai di peta berdasarkan satu atau beberapa kemungkinan nama label
// (dicocokkan pada bagian utama label saja, tidak peka huruf besar/kecil),
// supaya tetap jalan walau format Excel sedikit berbeda-beda (mis. "NIP" vs
// "Nomor Induk PPPK"). Baris yang labelnya menyebut "... Penetap" (pejabat
// penanda tangan SK) sengaja DILEWATI di sini karena itu bukan data pegawai
// yang bersangkutan — mencegah mis. "NIP Penetap" ikut tertukar jadi NIP
// pegawai.
function cariNilaiExcel(peta, ...kemungkinanLabel) {
  for (const label of kemungkinanLabel) {
    const labelLower = label.toLowerCase()
    const cocok = Object.keys(peta).find((k) => {
      if (k.includes('penetap')) return false
      const utama = labelUtama(k)
      return utama === labelLower || utama.startsWith(labelLower) || utama.includes(labelLower)
    })
    if (cocok) return peta[cocok]
  }
  return ''
}

// Petakan peta Field/Nilai hasil parse Excel ke bentuk yang sama seperti
// respons Edge Function `ekstrak-sk`, supaya bisa dipakai lewat alur
// setForm yang sama persis dengan hasil ekstraksi PDF/gambar/Word.
function hasilDariExcelSk(peta) {
  const tentang = cariNilaiExcel(peta, 'tentang')
  return {
    nama_lengkap: cariNilaiExcel(peta, 'nama'),
    nip: cariNilaiExcel(peta, 'nomor induk', 'nip'),
    jabatan_definitif: cariNilaiExcel(peta, 'jabatan'),
    pangkat_golongan: cariNilaiExcel(peta, 'golongan', 'pangkat'),
    status_kepegawaian: statusKepegawaianDariTeks(tentang) || cariNilaiExcel(peta, 'status kepegawaian'),
    no_sk: cariNilaiExcel(peta, 'nomor sk'),
    tmt: tanggalIndoKeISO(cariNilaiExcel(peta, 'masa kerja mulai', 'tmt')),
    tempat_lahir: cariNilaiExcel(peta, 'tempat lahir'),
    tanggal_lahir: tanggalIndoKeISO(cariNilaiExcel(peta, 'tanggal lahir')),
    jenis_kelamin: jenisKelaminDariTeks(cariNilaiExcel(peta, 'jenis kelamin')),
    pendidikan_terakhir: cariNilaiExcel(peta, 'pendidikan'),
    agama: cariNilaiExcel(peta, 'agama'),
    // --- Detail SK & penempatan ---
    tentang_sk: tentang,
    masa_kerja_selesai: tanggalIndoKeISO(cariNilaiExcel(peta, 'masa kerja selesai')),
    gaji: angkaDariTeksRupiah(cariNilaiExcel(peta, 'gaji')),
    unit_kerja: cariNilaiExcel(peta, 'unit kerja'),
    instansi: cariNilaiExcel(peta, 'instansi'),
    ditetapkan_di: cariNilaiExcel(peta, 'ditetapkan di'),
    tanggal_ditetapkan: tanggalIndoKeISO(cariNilaiExcel(peta, 'tanggal ditetapkan')),
  }
}

// Ambil pesan error asli dari Edge Function (kalau ada) alih-alih pesan
// generik "non-2xx status code" dari Supabase JS.
async function ambilPesanErrorFungsi(error) {
  let pesanAsli = error.message
  try {
    if (error.context && typeof error.context.json === 'function') {
      const bodyError = await error.context.json()
      if (bodyError?.error) pesanAsli = bodyError.error
    }
  } catch {
    // biarkan pesanAsli tetap yang generik kalau body tidak bisa dibaca
  }
  return pesanAsli
}

export default function DataPegawaiKantor() {
  const { sekolahId } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [profilLihat, setProfilLihat] = useState(null)

  // --- state untuk fitur "Isi dari SK" ---
  const [skLoading, setSkLoading] = useState(false)
  const [skError, setSkError] = useState('')
  // Info ringkas hasil ekstraksi SK ditampilkan sekilas di atas form (mis.
  // kalau SK ini juga berisi tugas tambahan) — TAPI datanya sendiri sudah
  // langsung ditulis ke field form.tugas_tambahan (kolom asli di tabel
  // pegawai_kantor), jadi kotak info ini murni informasi, bukan satu-satunya
  // tempat datanya tersimpan seperti versi sebelumnya.
  const [skCatatanTambahan, setSkCatatanTambahan] = useState(null)
  const fileInputRef = useRef(null)

  async function loadData() {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: pegawai, error } = await supabase
      .from('pegawai_kantor')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('nama_lengkap')

    if (error) {
      console.error('Gagal memuat data pegawai:', error)
      alert('Gagal memuat data pegawai: ' + error.message)
    }

    setData(pegawai || [])
    setLoading(false)
    if (profilLihat) {
      const updated = (pegawai || []).find((p) => p.id === profilLihat.id)
      if (updated) setProfilLihat(updated)
    }
  }

  useEffect(() => {
    loadData()
  }, [sekolahId])

  function fotoUrl(path) {
    if (!path) return null
    return supabase.storage.from('foto-profil').getPublicUrl(path).data.publicUrl
  }

  function openAdd() {
    setForm(emptyForm)
    setEditingId(null)
    setSkError('')
    setSkCatatanTambahan(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      ...emptyForm,
      ...row,
      tanggal_lahir: row.tanggal_lahir ? String(row.tanggal_lahir).slice(0, 10) : '',
      tmt_pengangkatan: row.tmt_pengangkatan ? String(row.tmt_pengangkatan).slice(0, 10) : '',
      masa_kerja_selesai: row.masa_kerja_selesai ? String(row.masa_kerja_selesai).slice(0, 10) : '',
      tanggal_ditetapkan: row.tanggal_ditetapkan ? String(row.tanggal_ditetapkan).slice(0, 10) : '',
      gaji: row.gaji !== null && row.gaji !== undefined ? String(row.gaji) : '',
    })
    setEditingId(row.id)
    setSkError('')
    setSkCatatanTambahan(null)
    setShowForm(true)
  }

  // Konversi file ke base64 (untuk PDF/gambar) atau teks (untuk Word), kirim
  // ke Edge Function `ekstrak-sk`, ATAU — khusus Excel — baca & petakan
  // langsung di browser tanpa memanggil Edge Function sama sekali. Field
  // form yang MASIH KOSONG akan diisi hasil ekstraksi (tidak menimpa field
  // yang sudah diisi manual oleh admin).
  const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  const XLSX_MIME_LIST = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]

  async function handleSkFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSkError('')
    setSkCatatanTambahan(null)
    setSkLoading(true)

    try {
      const namaFile = file.name.toLowerCase()
      const isExcel = XLSX_MIME_LIST.includes(file.type) || namaFile.endsWith('.xlsx') || namaFile.endsWith('.xls')
      const isDocx = !isExcel && (file.type === DOCX_MIME || namaFile.endsWith('.docx'))

      let hasil

      if (isExcel) {
        // File Excel rekap SK (format kolom "Field"/"Nilai"). Data sudah
        // terstruktur, jadi cukup dibaca dengan SheetJS di browser — tidak
        // dikirim ke Gemini/Edge Function.
        const arrayBuffer = await file.arrayBuffer()
        const wb = XLSX.read(arrayBuffer, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const baris = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
        const peta = parseBarisExcelSk(baris)
        if (Object.keys(peta).length === 0) {
          throw new Error(
            'Tidak ada data yang bisa dibaca dari file Excel ini. Pastikan formatnya kolom "Field" dan "Nilai".'
          )
        }
        hasil = hasilDariExcelSk(peta)
      } else if (isDocx) {
        // File Word (.docx) bukan gambar/PDF, jadi tidak bisa dikirim sebagai
        // inline_data ke Gemini. Ekstrak dulu teksnya di browser pakai
        // mammoth, baru teks itu yang dikirim ke Edge Function.
        const arrayBuffer = await file.arrayBuffer()
        const { value: extractedText } = await mammoth.extractRawText({ arrayBuffer })
        if (!extractedText || !extractedText.trim()) {
          throw new Error('Tidak ada teks yang bisa dibaca dari file Word ini.')
        }
        const { data, error } = await supabase.functions.invoke('ekstrak-sk', {
          body: { extracted_text: extractedText },
        })
        if (error) throw new Error(await ambilPesanErrorFungsi(error))
        if (data?.error) throw new Error(data.error)
        hasil = data
      } else {
        // Gambar (JPG/PNG) atau PDF: dikirim langsung sebagai base64,
        // Gemini bisa "membaca" file ini secara visual.
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        const { data, error } = await supabase.functions.invoke('ekstrak-sk', {
          body: { file_base64: base64, media_type: file.type },
        })
        if (error) throw new Error(await ambilPesanErrorFungsi(error))
        if (data?.error) throw new Error(data.error)
        hasil = data
      }

      // Kolom "jabatan" di tabel diisi dari jabatan definitif. Kalau SK ini
      // ternyata tidak menyebutkan jabatan definitif (mis. SK-nya murni SK
      // tugas tambahan), pakai jabatan tambahan sebagai fallback supaya
      // field tidak kosong.
      const jabatanUntukForm = hasil.jabatan_definitif || hasil.jabatan_tambahan || hasil.jabatan || ''

      // Ringkasan tugas tambahan (Plt./Plh./Kepala unit dsb) dalam satu
      // kalimat, dipakai untuk mengisi field form.tugas_tambahan secara
      // otomatis — sebelumnya info ini cuma ditampilkan sekilas dan tidak
      // pernah benar-benar tersimpan ke database.
      const ringkasanTugasTambahan = hasil.jabatan_tambahan
        ? [
            hasil.jabatan_tambahan,
            hasil.unit_kerja_tambahan && `di ${hasil.unit_kerja_tambahan}`,
            hasil.masa_tugas_tambahan && `selama ${hasil.masa_tugas_tambahan}`,
          ]
            .filter(Boolean)
            .join(' ')
        : ''

      setForm((prev) => ({
        ...prev,
        nama_lengkap: prev.nama_lengkap || hasil.nama_lengkap || '',
        nip: prev.nip || hasil.nip || '',
        jabatan: prev.jabatan || jabatanUntukForm,
        pangkat_golongan: prev.pangkat_golongan || hasil.pangkat_golongan || '',
        status_kepegawaian: prev.status_kepegawaian || hasil.status_kepegawaian || '',
        sk_pengangkatan: prev.sk_pengangkatan || hasil.no_sk || '',
        tmt_pengangkatan: prev.tmt_pengangkatan || hasil.tmt || '',
        tugas_tambahan: prev.tugas_tambahan || ringkasanTugasTambahan,
        tempat_lahir: prev.tempat_lahir || hasil.tempat_lahir || '',
        tanggal_lahir: prev.tanggal_lahir || hasil.tanggal_lahir || '',
        // jenis_kelamin punya default 'L' di emptyForm, jadi cuma ditimpa
        // kalau field-nya memang masih 'L' bawaan DAN hasil ekstraksi
        // menemukan nilai — supaya tidak menimpa pilihan 'P' yang sudah
        // dipilih manual.
        jenis_kelamin:
          prev.jenis_kelamin === 'L' && hasil.jenis_kelamin ? hasil.jenis_kelamin : prev.jenis_kelamin,
        pendidikan_terakhir: prev.pendidikan_terakhir || hasil.pendidikan_terakhir || '',
        agama: prev.agama || hasil.agama || '',
        // --- Detail SK & penempatan ---
        // Catatan: field-field ini baru terisi otomatis kalau sumbernya file
        // Excel. Untuk PDF/gambar/Word, Edge Function `ekstrak-sk` (Gemini)
        // perlu diperbarui juga supaya ikut mengembalikan field-field ini —
        // sampai saat itu, field ini tetap bisa diisi manual di form.
        tentang: prev.tentang || hasil.tentang_sk || '',
        masa_kerja_selesai: prev.masa_kerja_selesai || hasil.masa_kerja_selesai || '',
        gaji: prev.gaji || (hasil.gaji !== null && hasil.gaji !== undefined ? String(hasil.gaji) : ''),
        unit_kerja: prev.unit_kerja || hasil.unit_kerja || '',
        instansi: prev.instansi || hasil.instansi || '',
        ditetapkan_di: prev.ditetapkan_di || hasil.ditetapkan_di || '',
        tanggal_ditetapkan: prev.tanggal_ditetapkan || hasil.tanggal_ditetapkan || '',
      }))

      // Kalau SK ini menyebutkan tugas tambahan (Plt./Plh./Kepala unit dsb),
      // tetap tampilkan sebagai info sekilas di atas form — datanya sendiri
      // sudah otomatis masuk ke field "Tugas Tambahan" di atas, admin
      // tinggal cek/koreksi kalau perlu.
      if (hasil.jabatan_tambahan) {
        setSkCatatanTambahan({
          jabatan: hasil.jabatan_tambahan,
          unitKerja: hasil.unit_kerja_tambahan || '',
          masaTugas: hasil.masa_tugas_tambahan || '',
        })
      }
    } catch (err) {
      console.error('Gagal mengekstrak SK:', err)
      // Tampilkan pesan error asli (dari Edge Function/Gemini, atau dari
      // pembacaan Excel) di layar, supaya admin/Anda tidak perlu buka
      // DevTools untuk tahu penyebabnya.
      const pesanAsli = err?.message || 'Kesalahan tidak diketahui'
      setSkError(`Gagal membaca SK: ${pesanAsli}`)
    } finally {
      setSkLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId) {
      alert('Belum ada kantor aktif.')
      return
    }
    setSaving(true)
    const { telepon_kantor, ...rest } = form
    const payload = {
      ...rest,
      sekolah_id: sekolahId,
      tanggal_lahir: form.tanggal_lahir || null,
      tmt_pengangkatan: form.tmt_pengangkatan || null,
      masa_kerja_selesai: form.masa_kerja_selesai || null,
      tanggal_ditetapkan: form.tanggal_ditetapkan || null,
      gaji: form.gaji !== '' ? angkaDariTeksRupiah(form.gaji) : null,
    }
    const { error } = editingId
      ? await supabase.from('pegawai_kantor').update(payload).eq('id', editingId).eq('sekolah_id', sekolahId)
      : await supabase.from('pegawai_kantor').insert(payload)
    setSaving(false)
    if (!error) {
      setShowForm(false)
      loadData()
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  async function handleDelete(id) {
    if (!sekolahId) return
    if (!confirm('Hapus data pegawai ini?')) return
    const { error } = await supabase.from('pegawai_kantor').delete().eq('id', id).eq('sekolah_id', sekolahId)
    if (!error) loadData()
    else alert('Gagal menghapus: ' + error.message)
  }

  const filtered = data.filter((p) =>
    `${p.nama_lengkap} ${p.nip} ${p.jabatan}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout
      title="Data Pegawai"
      subtitle={`${data.length} pegawai terdaftar`}
      actions={
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Tambah Pegawai
        </button>
      }
    >
      <div className="card relative overflow-hidden p-4 mb-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-red-900" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0">
            <Briefcase size={18} />
          </div>
          <div className="relative max-w-sm w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
            <input
              className="input-field pl-9"
              placeholder="Cari nama, NIP, atau jabatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr className="border-b-2 border-blue-600/20">
              <th>Nama Lengkap</th>
              <th>NIP</th>
              <th>Jabatan</th>
              <th>Pangkat/Golongan</th>
              <th>No. HP</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-ink-700/50">Memuat data...</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-ink-700/50">Belum ada data pegawai.</td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-blue-600/[0.03] transition-colors">
                <td className="font-medium">
                  <button type="button" onClick={() => setProfilLihat(p)} className="hover:underline hover:text-blue-700 text-left">
                    {p.nama_lengkap}
                  </button>
                </td>
                <td className="font-mono text-xs">{p.nip}</td>
                <td>{p.jabatan}</td>
                <td>{p.pangkat_golongan}</td>
                <td>
                  <span className="inline-flex items-center gap-1.5">
                    {p.no_hp}
                    <TeleponLink nomor={p.no_hp} />
                  </span>
                </td>
                <td>
                  <span className={`badge ${p.status === 'aktif' ? 'bg-blue-600/15 text-blue-700' : 'bg-red-900/10 text-red-900'}`}>
                    {p.status}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(p)} className="p-2 hover:bg-blue-600/10 rounded-lg text-blue-700/70">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-900/10 rounded-lg text-red-900/70">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-red-900" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0">
                <Briefcase size={19} />
              </div>
              <h2 className="font-display text-xl font-semibold">{editingId ? 'Ubah Data Pegawai' : 'Tambah Pegawai'}</h2>
            </div>

            {/* --- Kotak "Isi dari SK" --- */}
            <div className="mb-4 p-3 rounded-xl border border-dashed border-blue-600/30 bg-blue-600/[0.03] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-ink-700/70">
                <UploadCloud size={16} className="text-blue-700 shrink-0" />
                <span>Punya file SK (PDF/gambar/Word) atau rekap Excel? Unggah untuk mengisi data otomatis.</span>
              </div>
              <label className="btn-secondary cursor-pointer shrink-0">
                {skLoading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                {skLoading ? 'Memproses...' : 'Unggah SK'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={handleSkFile}
                  disabled={skLoading}
                />
              </label>
            </div>
            {skError && <p className="text-xs text-red-900 mb-3">{skError}</p>}

            {skCatatanTambahan && (
              <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-sm text-ink-700">
                <p className="font-medium text-amber-800 mb-1">SK ini juga berisi tugas tambahan</p>
                <p>
                  Terdeteksi tugas tambahan sebagai <strong>{skCatatanTambahan.jabatan}</strong>
                  {skCatatanTambahan.unitKerja && <> di <strong>{skCatatanTambahan.unitKerja}</strong></>}
                  {skCatatanTambahan.masaTugas && <> selama <strong>{skCatatanTambahan.masaTugas}</strong></>}.
                </p>
                <p className="text-xs text-ink-700/60 mt-1">
                  Sudah otomatis diisikan ke field "Tugas Tambahan" di bawah — silakan cek/koreksi kalau perlu.
                </p>
              </div>
            )}

            <SeksiForm judul="Data Pribadi">
              <Field label="Nama Lengkap" full>
                <input required className="input-field" value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} />
              </Field>
              <Field label="NIK"><input className="input-field" value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} /></Field>
              <Field label="Jenis Kelamin">
                <select className="input-field" value={form.jenis_kelamin} onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })}>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </Field>
              <Field label="Agama"><input className="input-field" value={form.agama} onChange={(e) => setForm({ ...form, agama: e.target.value })} /></Field>
              <Field label="Tempat Lahir"><input className="input-field" value={form.tempat_lahir} onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })} /></Field>
              <Field label="Tanggal Lahir"><input type="date" className="input-field" value={form.tanggal_lahir} onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })} /></Field>
              <Field label="Pendidikan Terakhir"><input className="input-field" value={form.pendidikan_terakhir} onChange={(e) => setForm({ ...form, pendidikan_terakhir: e.target.value })} /></Field>
            </SeksiForm>

            <SeksiForm judul="Kepegawaian">
              <Field label="NIP"><input className="input-field" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} /></Field>
              <Field label="Jabatan"><input className="input-field" value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} /></Field>
              <Field label="Status Kepegawaian">
                <input className="input-field" placeholder="PNS / PPPK / Honorer..." value={form.status_kepegawaian} onChange={(e) => setForm({ ...form, status_kepegawaian: e.target.value })} />
              </Field>
              <Field label="Pangkat / Golongan"><input className="input-field" value={form.pangkat_golongan} onChange={(e) => setForm({ ...form, pangkat_golongan: e.target.value })} /></Field>
              <Field label="SK Pengangkatan"><input className="input-field" value={form.sk_pengangkatan} onChange={(e) => setForm({ ...form, sk_pengangkatan: e.target.value })} /></Field>
              <Field label="TMT Pengangkatan"><input type="date" className="input-field" value={form.tmt_pengangkatan} onChange={(e) => setForm({ ...form, tmt_pengangkatan: e.target.value })} /></Field>
              <Field label="Tugas Tambahan (Plt./Plh./Kepala Unit, jika ada)" full>
                <input className="input-field" value={form.tugas_tambahan} onChange={(e) => setForm({ ...form, tugas_tambahan: e.target.value })} />
              </Field>
            </SeksiForm>

            <SeksiForm judul="Detail SK & Penempatan">
              <Field label="Tentang (perihal SK)" full>
                <input className="input-field" value={form.tentang} onChange={(e) => setForm({ ...form, tentang: e.target.value })} />
              </Field>
              <Field label="Masa Kerja Selesai"><input type="date" className="input-field" value={form.masa_kerja_selesai} onChange={(e) => setForm({ ...form, masa_kerja_selesai: e.target.value })} /></Field>
              <Field label="Gaji (Rp)"><input type="number" min="0" className="input-field" value={form.gaji} onChange={(e) => setForm({ ...form, gaji: e.target.value })} /></Field>
              <Field label="Unit Kerja" full><input className="input-field" value={form.unit_kerja} onChange={(e) => setForm({ ...form, unit_kerja: e.target.value })} /></Field>
              <Field label="Instansi"><input className="input-field" value={form.instansi} onChange={(e) => setForm({ ...form, instansi: e.target.value })} /></Field>
              <Field label="Ditetapkan di"><input className="input-field" value={form.ditetapkan_di} onChange={(e) => setForm({ ...form, ditetapkan_di: e.target.value })} /></Field>
              <Field label="Tanggal Ditetapkan"><input type="date" className="input-field" value={form.tanggal_ditetapkan} onChange={(e) => setForm({ ...form, tanggal_ditetapkan: e.target.value })} /></Field>
            </SeksiForm>

            <SeksiForm judul="Kontak & Alamat">
              <Field label="Alamat" full><textarea className="input-field" rows={2} value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></Field>
              <Field label="No. HP"><input className="input-field" value={form.no_hp} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} /></Field>
              <Field label="Email"><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            </SeksiForm>

            <SeksiForm judul="Lainnya">
              <Field label="NPWP"><input className="input-field" value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} /></Field>
              <Field label="Bank"><input className="input-field" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} /></Field>
              <Field label="Nomor Rekening"><input className="input-field" value={form.no_rekening} onChange={(e) => setForm({ ...form, no_rekening: e.target.value })} /></Field>
              <Field label="Rekening Atas Nama"><input className="input-field" value={form.rekening_atas_nama} onChange={(e) => setForm({ ...form, rekening_atas_nama: e.target.value })} /></Field>
              <Field label="Status di Aplikasi" full>
                <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </Field>
            </SeksiForm>

            <div className="mt-5 flex justify-end gap-3 sticky bottom-0 bg-white pt-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {profilLihat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-0 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setProfilLihat(null)}
              className="absolute top-4 right-4 z-10 text-white/80 hover:text-white bg-ink-950/20 rounded-full p-1"
            >
              <X size={18} />
            </button>

            <div className="relative bg-gradient-to-br from-blue-900 to-blue-950 pt-8 pb-16 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/20 bg-white/10 flex items-center justify-center shrink-0">
                {fotoUrl(profilLihat.foto_profil_path) ? (
                  <img src={fotoUrl(profilLihat.foto_profil_path)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-semibold text-white/60">{profilLihat.nama_lengkap?.[0]}</span>
                )}
              </div>
              <p className="font-display font-semibold text-lg text-white mt-3 text-center px-6">{profilLihat.nama_lengkap}</p>
              <span className={`badge mt-1.5 ${profilLihat.status === 'aktif' ? 'bg-sage-500/20 text-sage-100' : 'bg-white/10 text-white/70'}`}>
                {profilLihat.status}
              </span>
            </div>

            <div className="px-6 -mt-12 pb-6">
              <div className="card p-4 space-y-4 bg-white shadow-md">
                <SeksiProfil judul="Data Pribadi">
                  <ProfilRow label="NIK" value={profilLihat.nik} />
                  <ProfilRow label="Jenis Kelamin" value={profilLihat.jenis_kelamin === 'L' ? 'Laki-laki' : profilLihat.jenis_kelamin === 'P' ? 'Perempuan' : null} />
                  <ProfilRow label="Agama" value={profilLihat.agama} />
                  <ProfilRow
                    label="Tempat, Tgl Lahir"
                    value={profilLihat.tempat_lahir || profilLihat.tanggal_lahir ? `${profilLihat.tempat_lahir || '-'}, ${formatTanggal(profilLihat.tanggal_lahir) || '-'}` : null}
                  />
                  <ProfilRow label="Pendidikan Terakhir" value={profilLihat.pendidikan_terakhir} />
                </SeksiProfil>

                <SeksiProfil judul="Kepegawaian">
                  <ProfilRow label="NIP" value={profilLihat.nip} />
                  <ProfilRow label="Jabatan" value={profilLihat.jabatan} />
                  <ProfilRow label="Status Kepegawaian" value={profilLihat.status_kepegawaian} />
                  <ProfilRow label="Pangkat / Golongan" value={profilLihat.pangkat_golongan} />
                  <ProfilRow label="SK Pengangkatan" value={profilLihat.sk_pengangkatan} />
                  <ProfilRow label="TMT Pengangkatan" value={formatTanggal(profilLihat.tmt_pengangkatan)} />
                  <ProfilRow label="Tugas Tambahan" value={profilLihat.tugas_tambahan} />
                </SeksiProfil>

                <SeksiProfil judul="Detail SK & Penempatan">
                  <ProfilRow label="Tentang" value={profilLihat.tentang} />
                  <ProfilRow label="Masa Kerja Selesai" value={formatTanggal(profilLihat.masa_kerja_selesai)} />
                  <ProfilRow label="Gaji" value={formatRupiah(profilLihat.gaji)} />
                  <ProfilRow label="Unit Kerja" value={profilLihat.unit_kerja} />
                  <ProfilRow label="Instansi" value={profilLihat.instansi} />
                  <ProfilRow label="Ditetapkan di" value={profilLihat.ditetapkan_di} />
                  <ProfilRow label="Tanggal Ditetapkan" value={formatTanggal(profilLihat.tanggal_ditetapkan)} />
                </SeksiProfil>

                <SeksiProfil judul="Kontak">
                  <ProfilRow label="Alamat" value={profilLihat.alamat} />
                  <ProfilRow label="No. HP" value={profilLihat.no_hp} telepon />
                  <ProfilRow label="Email" value={profilLihat.email} />
                </SeksiProfil>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => { setProfilLihat(null); openEdit(profilLihat) }}
                  className="btn-secondary flex-1 justify-center"
                >
                  <Pencil size={15} /> Ubah Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function SeksiForm({ judul, children }) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="eyebrow text-blue-700 mb-2">{judul}</p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function SeksiProfil({ judul, children }) {
  return (
    <div>
      <p className="eyebrow text-blue-700/70 mb-2">{judul}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Field({ label, children, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="eyebrow mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

function ProfilRow({ label, value, telepon }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-ink-700/50 shrink-0">{label}</span>
      <span className="text-ink-950 font-medium text-right inline-flex items-center gap-1.5">
        {value}
        {telepon && <TeleponLink nomor={value} />}
      </span>
    </div>
  )
}
