// Konstanta & helper bersama untuk semua tab Keuangan BOK.

// Komponen BOK baku disimpan sebagai teks bebas (bukan enum) supaya admin
// bisa menyesuaikan nomenklatur mengikuti juknis BOK tahun berjalan —
// daftar ini hanya SARAN/opsi cepat di dropdown, bukan pembatas.
export const OPSI_KOMPONEN_BOK = [
  'UKM Esensial',
  'UKM Pengembangan',
  'Manajemen BOK (Dukungan Manajemen)',
  'Dukungan Operasional UKM Tim Nusantara Sehat',
  'Pengawasan Obat dan Makanan',
  'Penyediaan Tenaga dengan Perjanjian Kerja',
]

export const OPSI_SATUAN = ['OH', 'OK', 'Paket', 'Bulan', 'Orang', 'Kali', 'Unit', 'Dokumen']

export const OPSI_JABATAN_TIM = ['Penanggung Jawab', 'Bendahara', 'Pelaksana Kegiatan', 'Anggota']

export const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function formatRupiah(angka) {
  const n = Number(angka) || 0
  return 'Rp ' + n.toLocaleString('id-ID')
}

export function formatTanggal(tgl) {
  if (!tgl) return '-'
  try {
    return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return tgl
  }
}

// Konversi angka ke terbilang bahasa Indonesia, dipakai di kwitansi
// ("Sudah terima uang sejumlah ... rupiah"). Mendukung sampai triliunan.
const SATUAN_ANGKA = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan']

function terbilangSampaiSeribu(n) {
  if (n === 0) return ''
  if (n < 10) return SATUAN_ANGKA[n]
  if (n < 20) return (n === 10 ? 'sepuluh' : n === 11 ? 'sebelas' : SATUAN_ANGKA[n - 10] + ' belas')
  if (n < 100) return (SATUAN_ANGKA[Math.floor(n / 10)] + ' puluh' + (n % 10 ? ' ' + SATUAN_ANGKA[n % 10] : '')).trim()
  if (n < 200) return ('seratus' + (n % 100 ? ' ' + terbilangSampaiSeribu(n % 100) : '')).trim()
  if (n < 1000) return (SATUAN_ANGKA[Math.floor(n / 100)] + ' ratus' + (n % 100 ? ' ' + terbilangSampaiSeribu(n % 100) : '')).trim()
  return ''
}

export function terbilang(angka) {
  let n = Math.floor(Number(angka) || 0)
  if (n === 0) return 'nol'
  const bagian = []
  const triliun = Math.floor(n / 1_000_000_000_000)
  n %= 1_000_000_000_000
  const miliar = Math.floor(n / 1_000_000_000)
  n %= 1_000_000_000
  const juta = Math.floor(n / 1_000_000)
  n %= 1_000_000
  const ribu = Math.floor(n / 1000)
  n %= 1000
  const sisa = n

  if (triliun) bagian.push(`${terbilangSampaiSeribu(triliun)} triliun`)
  if (miliar) bagian.push(`${terbilangSampaiSeribu(miliar)} miliar`)
  if (juta) bagian.push(`${terbilangSampaiSeribu(juta)} juta`)
  if (ribu) bagian.push(ribu === 1 ? 'seribu' : `${terbilangSampaiSeribu(ribu)} ribu`)
  if (sisa) bagian.push(terbilangSampaiSeribu(sisa))

  return bagian.join(' ').trim()
}

export function kapitalKalimat(teks) {
  if (!teks) return ''
  return teks.charAt(0).toUpperCase() + teks.slice(1)
}
