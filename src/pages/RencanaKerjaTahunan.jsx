import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import {
  Printer,
  ArrowLeft,
  ClipboardList,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Save,
  Loader2,
  ListChecks,
  Award,
} from 'lucide-react'
import Layout from '../components/Layout'
import KopSurat from '../components/KopSurat'

// === DAFTAR MATERI UNTUK REKOMENDASI OTOMATIS ===
// Tambahkan entri baru di sini setiap kali ada materi/laporan baru yang
// ingin ikut direkomendasikan berdasarkan kata kunci pada Butir/Tahapan
// Kegiatan.
const DAFTAR_MATERI_REKOMENDASI = [
  {
    id: 'keluarga-sakinah',
    judul: 'Keluarga Sakinah',
    path: '/materi-keluarga-sakinah',
    kataKunci: ['keluarga', 'sakinah', 'rumah tangga', 'mawaddah', 'rahmah', 'pernikahan', 'perkawinan', 'suami istri'],
  },
  {
    id: 'pengelolaan-zakat',
    judul: 'Pengelolaan Zakat',
    path: '/materi-pengelolaan-zakat',
    kataKunci: ['zakat', 'mustahik', 'nisab', 'amil', 'baznas', 'infak', 'sedekah', 'muzaki'],
  },
  {
    id: 'wakaf',
    judul: 'Wakaf',
    path: '/materi-wakaf',
    kataKunci: ['wakaf', 'nazhir', 'wakif', 'harta wakaf', 'ikrar wakaf', 'aiw'],
  },
  {
    id: 'akhlak',
    judul: 'Akhlak',
    path: '/materi-akhlak',
    kataKunci: ['akhlak', 'moral', 'budi pekerti', 'sabar', 'taubat', 'jujur', 'amanah', 'lisan', 'muhasabah'],
  },
  {
    id: 'moderasi-beragama',
    judul: 'Moderasi Beragama',
    path: '/materi-moderasi-beragama',
    kataKunci: ['moderasi', 'toleransi', 'radikal', 'ekstrem', 'ukhuwah', 'kerukunan', 'kebangsaan', 'wasathiyah'],
  },
  {
    id: 'laporan-masyarakat-bermoral-harmonis',
    judul: 'Laporan: Masyarakat Bermoral & Harmonis',
    path: '/laporan-masyarakat-bermoral-harmonis',
    kataKunci: ['masyarakat', 'harmonis', 'konflik sosial', 'gotong royong', 'silaturahmi', 'pemetaan', 'binaan', 'kelompok sasaran', 'sosial'],
  },
]

function cariRekomendasi(teks) {
  const teksLower = (teks || '').toLowerCase()
  if (!teksLower.trim()) return []
  return DAFTAR_MATERI_REKOMENDASI
    .map((materi) => ({
      ...materi,
      skor: materi.kataKunci.filter((kata) => teksLower.includes(kata)).length,
    }))
    .filter((materi) => materi.skor > 0)
    .sort((a, b) => b.skor - a.skor)
}

// === DAFTAR KEGIATAN MASTER — RKT (DIAMBIL DARI RKT_2025.xlsx, sheet "RKT 2025") ===
// "Bank data" 12 butir kegiatan RKT Penyuluh Agama Islam beserta tahapan,
// sasaran, tempat, waktu, volume, satuan, dan output-nya. Saat dipilih dari
// dropdown pada sebuah baris kegiatan, seluruh kolom baris tsb terisi otomatis.
const DAFTAR_KEGIATAN_RKT = [
  {
    id: 'rkt-01',
    no: 1,
    butirKegiatan:
      'Mengidentifikasi informasi dari sumber yang terpercaya tentang situasi faktual, isu, permasalahan dan potensi wilayah sasaran',
    tahapanKegiatan:
      'a. Menentukan data apa saja yang ingin di cari\nb. Menyusun instrumen pengumpulan data yang diperlukan : data Masjid, Musholla, Majilis Taklim, BKMT, Penduduk, Data Mubaligh, Organisasi Islam, dan Lembaga Dakwah, Kelompok binaan',
    sasaran: 'Masyarakat Kec. Pulau-Pulau Aru',
    tempatKegiatan: 'Kec. Pulau-Pulau Aru Kab. Kepulauan Aru',
    waktuPelaksanaan: 'Januari - Maret',
    satuan: 'Paket',
    volume: '1',
    output: 'Tersedianya Informasi Data dari Sumber Terpercaya',
  },
  {
    id: 'rkt-02',
    no: 2,
    butirKegiatan:
      'Menyusun rekomendasi hasil pendataan atau inventarisasi data wilayah sasaran yang disusun',
    tahapanKegiatan:
      'a. Mengolah Data\nb. Hasil Rekomendasi Sasaran Binaan\nc. Rekomendasi Program-program binaan',
    sasaran: 'Rekomendasi',
    tempatKegiatan: 'Kec. Pulau-Pulau Aru Kab. Kepulauan Aru',
    waktuPelaksanaan: 'April S.d Desember',
    satuan: 'Paket',
    volume: '1',
    output: 'Hasil Rekomendasi',
  },
  {
    id: 'rkt-03',
    no: 3,
    butirKegiatan: 'Melakukan Pemetaan Kebutuhan Kelompok sasaran',
    tahapanKegiatan: 'a. Terpetakannya kebutuhan kelompok sasaran',
    sasaran: 'Peta Kebutuhan',
    tempatKegiatan: 'Kec. Pulau-Pulau Aru',
    waktuPelaksanaan: 'Januari - Maret',
    satuan: 'Paket',
    volume: '1',
    output: 'Hasil Peta Kebutuhan',
  },
  {
    id: 'rkt-04',
    no: 4,
    butirKegiatan: 'Menyusun Rencana Kerja Operasional',
    tahapanKegiatan:
      'a. Membuat latar belakang penyuluhan\nb. Membuat maksud dan tujuan pelaksanaan bimbingan dan penyuluhan\nc. Menentukan sasaran pelaksanaan bimbingan dan penyuluhan\nd. Menentukan waktu pelaksanaan bimbingan dan penyuluhan\ne. Menentukan materi pokok pelaksanaan bimbingan dan penyuluhan\nf. Menentukan teknis pelaksanaan bimbingan penyuluhan',
    sasaran: 'Lapas Kelas III Dobo, RSUD Cendrawasih Dobo, dan Majelis Taklim',
    tempatKegiatan: 'Kabupaten Kepulauan Aru',
    waktuPelaksanaan: 'Januari S.d Desember',
    satuan: 'Dokumen',
    volume: '4',
    output: 'Tersusunnya RKO',
  },
  {
    id: 'rkt-05',
    no: 5,
    butirKegiatan: 'Menyusun materi konseling atau informasi',
    tahapanKegiatan: 'a. Menyusun materi konseling dalam bentuk Naskah',
    sasaran: 'Naskah Materi',
    tempatKegiatan: 'Kec. Pulau-Pulau Aru Kab. Kepulauan Aru',
    waktuPelaksanaan: 'Januari S.d Desember',
    satuan: 'Naskah',
    volume: '36',
    output: 'Naskah Materi',
  },
  {
    id: 'rkt-06',
    no: 6,
    butirKegiatan: 'Melakukan pelayanan konseling atau informasi (kelompok)',
    tahapanKegiatan: 'a. Terlaksananya pelayanan bimbingan konseling untuk kelompok',
    sasaran: 'Layanan Bimbingan Konsultasi',
    tempatKegiatan: 'Kec. Pulau-Pulau Aru Kab. Kepulauan Aru',
    waktuPelaksanaan: 'Januari S.d Desember',
    satuan: 'Kali',
    volume: '4',
    output: 'Laporan Pelaksanaan',
  },
  {
    id: 'rkt-07',
    no: 7,
    butirKegiatan: 'Melakukan pelayanan konseling atau informasi (perorangan)',
    tahapanKegiatan: 'a. Terlaksananya pelayanan bimbingan konseling untuk perorangan',
    sasaran: 'Layanan Bimbingan Konsultasi',
    tempatKegiatan: 'Kec. Pulau-Pulau Aru Kab. Kepulauan Aru',
    waktuPelaksanaan: 'Januari S.d Desember',
    satuan: 'Kali',
    volume: '6',
    output: 'Laporan Pelaksanaan',
  },
  {
    id: 'rkt-08',
    no: 8,
    butirKegiatan: 'Menyusun konsep tertulis materi bimbingan atau penyuluhan dalam bentuk naskah',
    tahapanKegiatan:
      'a. Mempersiapkan bahan-bahan untuk membuat materi bimbingan dan penyuluhan\nb. Membuat konsep materi tertulis bimbingan dan penyuluhan dalam bentuk naskah',
    sasaran: 'Kelompok binaan',
    tempatKegiatan: 'Kec. Pulau-Pulau Aru Kab. Kepulauan Aru',
    waktuPelaksanaan: 'Januari S.d Desember',
    satuan: 'Kali',
    volume: '36',
    output: 'Disusunnya Konsep Tertulis Materi BP dalam Bentuk Naskah',
  },
  {
    id: 'rkt-09',
    no: 9,
    butirKegiatan: 'Melaksanakan bimbingan atau penyuluhan melalui tatap muka kepada kelompok umum dan khusus',
    tahapanKegiatan:
      'a. Mengabsen kehadiran kelompok\nb. Memberikan bimbingan dan penyuluhan secara tatap muka',
    sasaran: 'Kelompok Masyarakat',
    tempatKegiatan: 'Kec. Pulau-Pulau Aru Kab. Kepulauan Aru',
    waktuPelaksanaan: 'Januari S.d Desember',
    satuan: 'Kali',
    volume: '36',
    output: 'Terlaksananya Bimbingan Penyuluhan secara Tatap Muka dengan Kelompok Binaan',
  },
  {
    id: 'rkt-10',
    no: 10,
    butirKegiatan: 'Menyusun instrumen pemantauan pelaksanaan Bimbingan atau Penyuluhan (BP)',
    tahapanKegiatan:
      'a. Menyusun dan membuat instrumen berupa formulir dan blangko berkaitan dengan pemantau hasil bimbingan',
    sasaran: 'Kelompok Binaan',
    tempatKegiatan: 'Kec. Pulau-Pulau Aru Kab. Kepulauan Aru',
    waktuPelaksanaan: 'Januari S.d Desember',
    satuan: 'Instrumen',
    volume: '1',
    output: 'Tersedianya Instrumen',
  },
  {
    id: 'rkt-11',
    no: 11,
    butirKegiatan:
      'Melaksanakan pemantauan dan evaluasi hasil pelaksanaan bimbingan atau penyuluhan pada kelompok sasaran masyarakat umum dan atau khusus',
    tahapanKegiatan:
      'a. Melaksanakan pemantauan pelaksanaan bimbingan penyuluhan dan melaksanakan evaluasi',
    sasaran: 'Kelompok Binaan',
    tempatKegiatan: 'Kec. Pulau-Pulau Aru Kab. Kepulauan Aru',
    waktuPelaksanaan: 'Januari S.d Desember',
    satuan: 'Dokumen',
    volume: '1',
    output: 'Hasil Evaluasi Pemantauan',
  },
  {
    id: 'rkt-12',
    no: 12,
    butirKegiatan: 'Menyusun Laporan mingguan pelaksanaan bimbingan atau penyuluhan',
    tahapanKegiatan: 'a. Menyusun laporan mingguan bimbingan penyuluhan setiap minggunya',
    sasaran: 'Masyarakat Kecamatan',
    tempatKegiatan: 'Kec. Pulau-Pulau Aru Kab. Kepulauan Aru',
    waktuPelaksanaan: 'Januari S.d Desember',
    satuan: 'Laporan Bimbingan',
    volume: '16',
    output: 'Tersedianya Laporan Bimbingan Penyuluhan',
  },
]

// === DAFTAR KEGIATAN MASTER — RENCANA PENCAPAIAN ANGKA KREDIT ===
// (DIAMBIL DARI RKT_2025.xlsx, sheet "Sheet2")
const DAFTAR_KEGIATAN_ANGKA_KREDIT = [
  { id: 'ak-1a', kategori: '1. Persiapan', butirKegiatan: 'a. Mengolah data identifikasi potensi wilayah atau kelompok sasaran', waktuPelaksanaan: 'Bulan Januari 2025', volumeKegiatan: '4', satuanWaktuJam: '2', jumlahWaktu: '8', buktiFisik: 'Instrumen' },
  { id: 'ak-2a', kategori: '2. Perencanaan', butirKegiatan: 'a. Menyusun rencana kerja operasional', waktuPelaksanaan: 'Januari, April, Juli & Oktober 2025', volumeKegiatan: '12', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: 'Dokumen RKO' },
  { id: 'ak-3a', kategori: '3. Pelaksanaan Bimbingan atau Penyuluhan', butirKegiatan: 'a. Menyusun konsep materi bimbingan atau penyuluhan dalam bentuk naskah dan infografis', waktuPelaksanaan: 'Jan - Des 2025', volumeKegiatan: '24', satuanWaktuJam: '48', jumlahWaktu: '', buktiFisik: 'Naskah dan Infografis' },
  { id: 'ak-3b', kategori: '3. Pelaksanaan Bimbingan atau Penyuluhan', butirKegiatan: 'b. Mendiskusikan konsep materi bimbingan atau penyuluhan sebagai penyaji', waktuPelaksanaan: 'Jan - Des 2025', volumeKegiatan: '', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: 'Surat Keterangan' },
  { id: 'ak-3c', kategori: '3. Pelaksanaan Bimbingan atau Penyuluhan', butirKegiatan: 'c. Merumuskan materi bimbingan atau penyuluhan', waktuPelaksanaan: 'Jan - Des 2025', volumeKegiatan: '', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: 'Naskah dan Infografis' },
  { id: 'ak-3d', kategori: '3. Pelaksanaan Bimbingan atau Penyuluhan', butirKegiatan: 'd. Melaksanakan bimbingan atau penyuluhan melalui tatap muka kepada kelompok Masyarakat Perkotaan', waktuPelaksanaan: 'Jan - Des 2025', volumeKegiatan: '', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: 'Surat Keterangan' },
  { id: 'ak-3e', kategori: '3. Pelaksanaan Bimbingan atau Penyuluhan', butirKegiatan: 'e. Melaksanakan bimbingan atau penyuluhan melalui tatap muka kepada kelompok Binaan Khusus (Lapas dan RSUD)', waktuPelaksanaan: 'Jan - Des 2025', volumeKegiatan: '', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: 'Surat Keterangan' },
  { id: 'ak-3f', kategori: '3. Pelaksanaan Bimbingan atau Penyuluhan', butirKegiatan: 'f. Melaksanakan Konsultasi secara perorangan', waktuPelaksanaan: 'Jan - Des 2025', volumeKegiatan: '', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: 'Surat Keterangan' },
  { id: 'ak-3g', kategori: '3. Pelaksanaan Bimbingan atau Penyuluhan', butirKegiatan: 'g. Melaksanakan konsultasi secara kelompok', waktuPelaksanaan: 'Jan - Des 2025', volumeKegiatan: '', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: 'Surat Keterangan' },
  { id: 'ak-3h', kategori: '3. Pelaksanaan Bimbingan atau Penyuluhan', butirKegiatan: 'h. Menjadi pengurus aktif organisasi keagamaan', waktuPelaksanaan: 'Jan - Des 2025', volumeKegiatan: '3', satuanWaktuJam: '0', jumlahWaktu: '0', buktiFisik: 'Surat Keputusan' },
  { id: 'ak-4a', kategori: '4. Pemantauan dan Evaluasi', butirKegiatan: 'a. Menyusun Instrumen pemantauan hasil pelaksanaan bimbingan atau penyuluhan', waktuPelaksanaan: '', volumeKegiatan: '', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: 'Dokumen' },
  { id: 'ak-4b', kategori: '4. Pemantauan dan Evaluasi', butirKegiatan: 'b. Mengumpulkan instrumen evaluasi hasil pelaksanaan bimbingan atau penyuluhan', waktuPelaksanaan: '', volumeKegiatan: '', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: 'Dokumen' },
  { id: 'ak-4c', kategori: '4. Pemantauan dan Evaluasi', butirKegiatan: 'c. Mengumpulkan data pemantauan/evaluasi hasil pelaksanaan bimbingan atau penyuluhan', waktuPelaksanaan: '', volumeKegiatan: '', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: '' },
  { id: 'ak-5a', kategori: '5. Pelaporan Kegiatan', butirKegiatan: 'a. Menyusun Laporan mingguan pelaksanaan bimbingan atau penyuluhan', waktuPelaksanaan: 'Jan - Des 2025', volumeKegiatan: '', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: 'Laporan' },
  { id: 'ak-5b', kategori: '5. Pelaporan Kegiatan', butirKegiatan: 'b. Menyusun Laporan hasil konsultasi perorangan/kelompok', waktuPelaksanaan: 'Jan - Des 2025', volumeKegiatan: '', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: 'Laporan' },
  { id: 'ak-5c', kategori: '5. Pelaporan Kegiatan', butirKegiatan: 'c. Menyusun konsep petunjuk pelaksanaan/petunjuk teknis bimbingan atau penyuluhan sebagai penyaji', waktuPelaksanaan: '', volumeKegiatan: '', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: '' },
  { id: 'ak-5d', kategori: '5. Pelaporan Kegiatan', butirKegiatan: 'd. Menyusun laporan pelaksanaan program bimbingan atau penyuluhan tahun 2025', waktuPelaksanaan: 'Des 2025 - Jan 2026', volumeKegiatan: '', satuanWaktuJam: '', jumlahWaktu: '', buktiFisik: 'Laporan' },
]

function buatItemKosong() {
  return {
    id: crypto.randomUUID(),
    butirKegiatan: '',
    tahapanKegiatan: '',
    sasaran: '',
    tempatKegiatan: '',
    waktuPelaksanaan: '',
    volume: '',
    satuan: '',
    output: '',
  }
}

function buatItemAKKosong() {
  return {
    id: crypto.randomUUID(),
    kategori: '',
    butirKegiatan: '',
    waktuPelaksanaan: '',
    volumeKegiatan: '',
    satuanWaktuJam: '',
    jumlahWaktu: '',
    buktiFisik: '',
  }
}

export default function RencanaKerjaTahunan() {
  const { user, profil } = useAuth()
  const userId = user?.id || profil?.id

  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [namaLengkap, setNamaLengkap] = useState('')
  const [nip, setNip] = useState('')
  const [pangkatGolongan, setPangkatGolongan] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [unitKerja, setUnitKerja] = useState('')
  const [items, setItems] = useState([buatItemKosong()])
  const [itemsAK, setItemsAK] = useState([buatItemAKKosong()])
  const [rekomendasiPerItem, setRekomendasiPerItem] = useState({})
  const [rktId, setRktId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pesanStatus, setPesanStatus] = useState('')

  // Muat data RKT untuk tahun yang dipilih (kalau sudah pernah disimpan)
  const muatData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setPesanStatus('')
    const { data, error } = await supabase
      .from('rencana_kerja_tahunan')
      .select('*')
      .eq('user_id', userId)
      .eq('tahun', tahun)
      .maybeSingle()

    if (!error && data) {
      setRktId(data.id)
      setNamaLengkap(data.nama_lengkap || profil?.nama_lengkap || '')
      setNip(data.nip || profil?.nip || '')
      setPangkatGolongan(data.pangkat_golongan || '')
      setJabatan(data.jabatan || '')
      setUnitKerja(data.unit_kerja || '')
      setItems(
        Array.isArray(data.items) && data.items.length > 0
          ? data.items.map((it) => ({ id: crypto.randomUUID(), ...it }))
          : [buatItemKosong()]
      )
      setItemsAK(
        Array.isArray(data.items_angka_kredit) && data.items_angka_kredit.length > 0
          ? data.items_angka_kredit.map((it) => ({ id: crypto.randomUUID(), ...it }))
          : [buatItemAKKosong()]
      )
    } else {
      // Belum ada data tersimpan untuk tahun ini — mulai dari form kosong,
      // tapi identitas penyuluh tetap diisi otomatis dari profil akun.
      setRktId(null)
      setNamaLengkap(profil?.nama_lengkap || '')
      setNip(profil?.nip || '')
      setPangkatGolongan('')
      setJabatan('')
      setUnitKerja('')
      setItems([buatItemKosong()])
      setItemsAK([buatItemAKKosong()])
    }
    setRekomendasiPerItem({})
    setLoading(false)
  }, [userId, tahun, profil])

  useEffect(() => {
    muatData()
  }, [muatData])

  function ubahItem(id, field, value) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }

  function tambahBaris() {
    setItems((prev) => [...prev, buatItemKosong()])
  }

  function hapusBaris(id) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev))
    setRekomendasiPerItem((prev) => {
      const salinan = { ...prev }
      delete salinan[id]
      return salinan
    })
  }

  // Mengisi seluruh kolom pada satu baris kegiatan RKT secara otomatis,
  // berdasarkan butir kegiatan master yang dipilih dari dropdown.
  function terapkanKegiatanMaster(id, kegiatanId) {
    const kegiatan = DAFTAR_KEGIATAN_RKT.find((k) => k.id === kegiatanId)
    if (!kegiatan) return
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              butirKegiatan: kegiatan.butirKegiatan,
              tahapanKegiatan: kegiatan.tahapanKegiatan,
              sasaran: kegiatan.sasaran,
              tempatKegiatan: kegiatan.tempatKegiatan,
              waktuPelaksanaan: kegiatan.waktuPelaksanaan,
              volume: kegiatan.volume,
              satuan: kegiatan.satuan,
              output: kegiatan.output,
            }
          : it
      )
    )
    // Langsung tampilkan rekomendasi materi terkait untuk baris yang baru diisi
    const hasil = cariRekomendasi(`${kegiatan.butirKegiatan} ${kegiatan.tahapanKegiatan} ${kegiatan.output}`)
    setRekomendasiPerItem((prev) => ({ ...prev, [id]: hasil }))
  }

  function tampilkanRekomendasi(item) {
    const hasil = cariRekomendasi(`${item.butirKegiatan} ${item.tahapanKegiatan} ${item.output}`)
    setRekomendasiPerItem((prev) => ({ ...prev, [item.id]: hasil }))
  }

  function ubahItemAK(id, field, value) {
    setItemsAK((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }

  function tambahBarisAK() {
    setItemsAK((prev) => [...prev, buatItemAKKosong()])
  }

  function hapusBarisAK(id) {
    setItemsAK((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev))
  }

  // Mengisi seluruh kolom pada satu baris Angka Kredit secara otomatis,
  // berdasarkan butir kegiatan master (Sheet2) yang dipilih dari dropdown.
  function terapkanKegiatanMasterAK(id, kegiatanId) {
    const kegiatan = DAFTAR_KEGIATAN_ANGKA_KREDIT.find((k) => k.id === kegiatanId)
    if (!kegiatan) return
    setItemsAK((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              kategori: kegiatan.kategori,
              butirKegiatan: kegiatan.butirKegiatan,
              waktuPelaksanaan: kegiatan.waktuPelaksanaan,
              volumeKegiatan: kegiatan.volumeKegiatan,
              satuanWaktuJam: kegiatan.satuanWaktuJam,
              jumlahWaktu: kegiatan.jumlahWaktu,
              buktiFisik: kegiatan.buktiFisik,
            }
          : it
      )
    )
  }

  async function simpanData() {
    if (!userId) {
      setPesanStatus('Tidak dapat menyimpan: akun tidak terdeteksi.')
      return
    }
    setSaving(true)
    setPesanStatus('')

    const payload = {
      user_id: userId,
      tahun: Number(tahun),
      nama_lengkap: namaLengkap,
      nip,
      pangkat_golongan: pangkatGolongan,
      jabatan,
      unit_kerja: unitKerja,
      items: items.map(({ id, ...rest }) => rest),
      // Catatan: kolom "items_angka_kredit" (tipe jsonb) perlu ditambahkan
      // pada tabel "rencana_kerja_tahunan" di Supabase agar data ini tersimpan.
      items_angka_kredit: itemsAK.map(({ id, ...rest }) => rest),
    }

    const { data, error } = await supabase
      .from('rencana_kerja_tahunan')
      .upsert(payload, { onConflict: 'user_id,tahun' })
      .select()
      .maybeSingle()

    setSaving(false)
    if (error) {
      setPesanStatus(`Gagal menyimpan: ${error.message}`)
    } else {
      setRktId(data?.id || rktId)
      setPesanStatus('Tersimpan.')
    }
  }

  return (
    <Layout
      title="Rencana Kerja Tahunan Penyuluh"
      subtitle="Susun RKT, simpan per tahun, dan dapatkan rekomendasi materi terkait secara otomatis."
    >
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-5">
        <Link
          to="/pusat-materi-majelis"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Kembali ke Pusat Materi
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={simpanData}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Printer size={16} /> Cetak
          </button>
        </div>
      </div>

      {pesanStatus && (
        <div className="no-print mb-4 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          {pesanStatus}
        </div>
      )}

      {/* === FORM IDENTITAS & TAHUN — TIDAK IKUT TERCETAK === */}
      <div className="no-print bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 mb-5">
        <h2 className="font-display text-sm font-semibold text-slate-900 mb-3">Identitas Penyuluh</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tahun RKT</label>
            <input
              type="number"
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">NIP</label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pangkat / Golongan / TMT</label>
            <input
              type="text"
              value={pangkatGolongan}
              onChange={(e) => setPangkatGolongan(e.target.value)}
              placeholder="Ahli Pertama - Penyuluh Agama Islam / IX"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Jabatan</label>
            <input
              type="text"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Unit Kerja</label>
            <input
              type="text"
              value={unitKerja}
              onChange={(e) => setUnitKerja(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
      </div>

      {/* === DAFTAR KEGIATAN RKT — TIDAK IKUT TERCETAK, INI ADALAH FORM INPUT === */}
      <div className="no-print mb-3">
        <h2 className="font-display text-sm font-semibold text-slate-900">Rencana Kerja Tahunan</h2>
      </div>
      <div className="no-print space-y-4 mb-8">
        {items.map((item, idx) => (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Kegiatan #{idx + 1}</span>
              <button
                onClick={() => hapusBaris(item.id)}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
              >
                <Trash2 size={13} /> Hapus
              </button>
            </div>

            {/* Dropdown pilih kegiatan master — isi otomatis dari RKT_2025.xlsx */}
            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-xs font-medium text-violet-700 mb-1">
                <ListChecks size={13} /> Pilih dari Master Kegiatan RKT (isi otomatis)
              </label>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    terapkanKegiatanMaster(item.id, e.target.value)
                    e.target.value = ''
                  }
                }}
                className="w-full text-sm border border-violet-200 bg-violet-50/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">-- Pilih Butir Kegiatan --</option>
                {DAFTAR_KEGIATAN_RKT.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.no}. {k.butirKegiatan.length > 80 ? `${k.butirKegiatan.slice(0, 80)}…` : k.butirKegiatan}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Butir Kegiatan</label>
                <textarea
                  rows={2}
                  value={item.butirKegiatan}
                  onChange={(e) => ubahItem(item.id, 'butirKegiatan', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Tahapan Kegiatan</label>
                <textarea
                  rows={4}
                  value={item.tahapanKegiatan}
                  onChange={(e) => ubahItem(item.id, 'tahapanKegiatan', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sasaran</label>
                <input
                  type="text"
                  value={item.sasaran}
                  onChange={(e) => ubahItem(item.id, 'sasaran', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tempat Kegiatan</label>
                <input
                  type="text"
                  value={item.tempatKegiatan}
                  onChange={(e) => ubahItem(item.id, 'tempatKegiatan', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Pelaksanaan</label>
                <input
                  type="text"
                  value={item.waktuPelaksanaan}
                  onChange={(e) => ubahItem(item.id, 'waktuPelaksanaan', e.target.value)}
                  placeholder="Januari - Maret"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Volume</label>
                <input
                  type="text"
                  value={item.volume}
                  onChange={(e) => ubahItem(item.id, 'volume', e.target.value)}
                  placeholder="1"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Satuan</label>
                <input
                  type="text"
                  value={item.satuan}
                  onChange={(e) => ubahItem(item.id, 'satuan', e.target.value)}
                  placeholder="Paket / Dokumen"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Output</label>
                <input
                  type="text"
                  value={item.output}
                  onChange={(e) => ubahItem(item.id, 'output', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={() => tampilkanRekomendasi(item)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Sparkles size={13} /> Rekomendasi Materi Terkait
              </button>

              {rekomendasiPerItem[item.id] && (
                <div className="mt-2 space-y-1 pl-1">
                  {rekomendasiPerItem[item.id].length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Belum ada materi yang cocok dengan kata kunci Butir/Tahapan Kegiatan di atas.
                    </p>
                  ) : (
                    rekomendasiPerItem[item.id].map((materi) => (
                      <Link
                        key={materi.id}
                        to={materi.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-violet-700 hover:underline"
                      >
                        <ArrowRight size={12} /> {materi.judul}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={tambahBaris}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg px-4 py-2 w-full justify-center transition-colors"
        >
          <Plus size={16} /> Tambah Kegiatan
        </button>
      </div>

      {/* === RENCANA PENCAPAIAN ANGKA KREDIT — TIDAK IKUT TERCETAK, FORM INPUT TERPISAH === */}
      <div className="no-print mb-3">
        <h2 className="font-display text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Award size={16} className="text-amber-600" /> Rencana Pencapaian Angka Kredit
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Tabel terpisah, mengikuti struktur kolom pada dokumen "Rencana Pencapaian Angka Kredit Penyuluh Agama".
        </p>
      </div>
      <div className="no-print space-y-4 mb-5">
        {itemsAK.map((item, idx) => (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Kegiatan Angka Kredit #{idx + 1}</span>
              <button
                onClick={() => hapusBarisAK(item.id)}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
              >
                <Trash2 size={13} /> Hapus
              </button>
            </div>

            {/* Dropdown pilih kegiatan master — isi otomatis dari Sheet2 RKT_2025.xlsx */}
            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-xs font-medium text-amber-700 mb-1">
                <ListChecks size={13} /> Pilih dari Master Angka Kredit (isi otomatis)
              </label>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    terapkanKegiatanMasterAK(item.id, e.target.value)
                    e.target.value = ''
                  }
                }}
                className="w-full text-sm border border-amber-200 bg-amber-50/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Pilih Butir Kegiatan --</option>
                {DAFTAR_KEGIATAN_ANGKA_KREDIT.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.kategori} — {k.butirKegiatan.length > 60 ? `${k.butirKegiatan.slice(0, 60)}…` : k.butirKegiatan}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Kategori</label>
                <input
                  type="text"
                  value={item.kategori}
                  onChange={(e) => ubahItemAK(item.id, 'kategori', e.target.value)}
                  placeholder="1. Persiapan"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Butir Kegiatan</label>
                <textarea
                  rows={2}
                  value={item.butirKegiatan}
                  onChange={(e) => ubahItemAK(item.id, 'butirKegiatan', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Pelaksanaan</label>
                <input
                  type="text"
                  value={item.waktuPelaksanaan}
                  onChange={(e) => ubahItemAK(item.id, 'waktuPelaksanaan', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Volume Kegiatan</label>
                <input
                  type="text"
                  value={item.volumeKegiatan}
                  onChange={(e) => ubahItemAK(item.id, 'volumeKegiatan', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Satuan Waktu (Jam)</label>
                <input
                  type="text"
                  value={item.satuanWaktuJam}
                  onChange={(e) => ubahItemAK(item.id, 'satuanWaktuJam', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Jumlah Waktu</label>
                <input
                  type="text"
                  value={item.jumlahWaktu}
                  onChange={(e) => ubahItemAK(item.id, 'jumlahWaktu', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Bukti Fisik</label>
                <input
                  type="text"
                  value={item.buktiFisik}
                  onChange={(e) => ubahItemAK(item.id, 'buktiFisik', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={tambahBarisAK}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg px-4 py-2 w-full justify-center transition-colors"
        >
          <Plus size={16} /> Tambah Kegiatan Angka Kredit
        </button>
      </div>

      {/* === LEMBAR CETAK 1: RENCANA KERJA TAHUNAN === */}
      <div
        className="lembar-cetak print-only bg-white rounded-2xl border border-slate-100 p-5 sm:p-8 mx-auto"
        style={{ width: '277mm' }}
      >
        <KopSurat />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">
              Rencana Kerja Tahunan Penyuluh Agama Islam
            </h1>
            <p className="text-xs text-slate-500">Tahun {tahun}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-700 mb-5 border border-slate-200 rounded-xl p-3">
          <p><span className="font-medium">Nama Lengkap</span> : {namaLengkap || '-'}</p>
          <p><span className="font-medium">NIP.</span> : {nip || '-'}</p>
          <p><span className="font-medium">Pangkat/Golongan/TMT</span> : {pangkatGolongan || '-'}</p>
          <p><span className="font-medium">Jabatan</span> : {jabatan || '-'}</p>
          <p className="col-span-2"><span className="font-medium">Unit Kerja</span> : {unitKerja || '-'}</p>
        </div>

        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-1.5 text-left w-8">No</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Butir Kegiatan</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Tahapan Kegiatan</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Sasaran</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Tempat Kegiatan</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Waktu Pelaksanaan</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Volume</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Satuan</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Output</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id}>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{idx + 1}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top whitespace-pre-wrap">{item.butirKegiatan}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top whitespace-pre-wrap">{item.tahapanKegiatan}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.sasaran}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.tempatKegiatan}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.waktuPelaksanaan}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.volume}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.satuan}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.output}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* === LEMBAR CETAK 2: RENCANA PENCAPAIAN ANGKA KREDIT === */}
      <div
        className="lembar-cetak lembar-cetak-ak print-only bg-white rounded-2xl border border-slate-100 p-5 sm:p-8 mx-auto mt-6"
        style={{ width: '277mm' }}
      >
        <KopSurat />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">
              Rencana Pencapaian Angka Kredit Penyuluh Agama
            </h1>
            <p className="text-xs text-slate-500">Tahun {tahun}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-700 mb-5 border border-slate-200 rounded-xl p-3">
          <p><span className="font-medium">Nama Lengkap</span> : {namaLengkap || '-'}</p>
          <p><span className="font-medium">NIP.</span> : {nip || '-'}</p>
        </div>

        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-1.5 text-left w-8">No</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Kategori</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Butir Kegiatan</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Waktu Pelaksanaan</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Volume Kegiatan</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Satuan Waktu (Jam)</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Jumlah Waktu</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Bukti Fisik</th>
            </tr>
          </thead>
          <tbody>
            {itemsAK.map((item, idx) => (
              <tr key={item.id}>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{idx + 1}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.kategori}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top whitespace-pre-wrap">{item.butirKegiatan}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.waktuPelaksanaan}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.volumeKegiatan}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.satuanWaktuJam}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.jumlahWaktu}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.buktiFisik}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
            width: 100% !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .lembar-cetak-ak {
            page-break-before: always;
            break-before: page;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
        }
        @page {
          size: A4 landscape;
          margin: 12mm;
        }
      `}</style>
    </Layout>
  )
}
