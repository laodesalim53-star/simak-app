// src/lib/dataKeuanganLaporan.js
// Mengambil anggaran (ARKAS) dan realisasi (BKU) per tahun anggaran, dikelompokkan per kode rekening,
// untuk dipakai halaman laporan (LPJ Kepala Sekolah). Sumber sama dengan halaman Keuangan:
//   arkas_anggaran : sekolah_id, tahun_anggaran, kode_rekening, jumlah, is_item  (hanya is_item = true dijumlahkan)
//   bku_kas        : tahun, kode_rekening, penerimaan, pengeluaran
import { supabase } from './supabaseClient'

export const KEUANGAN_LPJ_KOSONG = {
  anggaran: null,
  penerimaan: null,
  pengeluaran: null,
  perKelompok: [],
  error: '',
  dimuat: false,
}

// Nama umum kode rekening belanja (Permendagri 90/2019). Kode lain tetap tampil dengan kodenya.
const NAMA_REKENING = {
  '5.1.01': 'Belanja Pegawai',
  '5.1.02': 'Belanja Barang dan Jasa',
  '5.2.02': 'Belanja Modal Peralatan dan Mesin',
  '5.2.03': 'Belanja Modal Gedung dan Bangunan',
  '5.2.04': 'Belanja Modal Jalan, Jaringan, dan Irigasi',
  '5.2.05': 'Belanja Modal Aset Tetap Lainnya',
}

const TANPA = 'TANPA'

function kelompokRekening(kode) {
  const k = String(kode || '').trim()
  return k ? k.split('.').slice(0, 3).join('.') : TANPA
}

function labelKelompok(kode) {
  if (kode === TANPA) return 'Belanja tanpa kode rekening'
  return NAMA_REKENING[kode] ? `${NAMA_REKENING[kode]} (${kode})` : `Belanja kode rekening ${kode}`
}

// Supabase membatasi 1000 baris per permintaan, jadi diambil bertahap.
async function ambilSemua(buatQuery) {
  const hasil = []
  for (let dari = 0; ; dari += 1000) {
    const { data, error } = await buatQuery().range(dari, dari + 999)
    if (error) return { data: null, error }
    hasil.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return { data: hasil, error: null }
}

export async function muatKeuanganTahun(sekolahId, tahun) {
  const [ark, bku] = await Promise.all([
    ambilSemua(() =>
      supabase
        .from('arkas_anggaran')
        .select('id, kode_rekening, jumlah, is_item')
        .eq('sekolah_id', sekolahId)
        .eq('tahun_anggaran', String(tahun))
        .order('id')
    ),
    ambilSemua(() =>
      supabase.from('bku_kas').select('id, kode_rekening, penerimaan, pengeluaran').eq('tahun', tahun).order('id')
    ),
  ])

  const pesan = []
  if (ark.error) pesan.push(`ARKAS: ${ark.error.message}`)
  if (bku.error) pesan.push(`BKU: ${bku.error.message}`)

  const arkRows = ark.data || []
  const bkuRows = bku.data || []
  const peta = {}
  const ambil = (kode) => (peta[kode] = peta[kode] || { kode, anggaran: 0, realisasi: 0 })

  arkRows.filter((r) => r.is_item).forEach((r) => {
    ambil(kelompokRekening(r.kode_rekening)).anggaran += Number(r.jumlah) || 0
  })
  bkuRows.forEach((r) => {
    const out = Number(r.pengeluaran) || 0
    if (out > 0) ambil(kelompokRekening(r.kode_rekening)).realisasi += out
  })

  const perKelompok = Object.values(peta)
    .filter((g) => g.anggaran > 0 || g.realisasi > 0)
    .sort((a, b) => (a.kode === TANPA) - (b.kode === TANPA) || a.kode.localeCompare(b.kode, 'id', { numeric: true }))
    .map((g) => ({ ...g, label: labelKelompok(g.kode) }))

  return {
    anggaran: arkRows.length ? arkRows.filter((r) => r.is_item).reduce((t, r) => t + (Number(r.jumlah) || 0), 0) : null,
    penerimaan: bkuRows.length ? bkuRows.reduce((t, r) => t + (Number(r.penerimaan) || 0), 0) : null,
    pengeluaran: bkuRows.length ? bkuRows.reduce((t, r) => t + (Number(r.pengeluaran) || 0), 0) : null,
    perKelompok,
    error: pesan.join(' | '),
    dimuat: true,
  }
}
