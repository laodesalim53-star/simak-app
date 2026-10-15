// Penarik data keuangan ARKAS untuk halaman Administrasi Kepala Sekolah.
// Sumber: tabel arkas_anggaran (rencana) dan bku_kas (realisasi).
// Dipakai oleh halaman RKAS, Laporan Bulanan, Buku Inventaris, dan Evaluasi Diri Sekolah.
//
// SESUAIKAN: jalur import `supabase` di bawah dengan klien Supabase di proyek Anda.
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const UKURAN_HALAMAN = 1000

// Supabase membatasi 1000 baris per permintaan; ambil bertahap sampai habis.
async function ambilSemua(buatQuery) {
  const hasil = []
  for (let dari = 0; ; dari += UKURAN_HALAMAN) {
    const { data, error } = await buatQuery().range(dari, dari + UKURAN_HALAMAN - 1)
    if (error) throw error
    hasil.push(...(data || []))
    if (!data || data.length < UKURAN_HALAMAN) break
  }
  return hasil
}

// Hanya baris item (is_item = true). Baris program/kegiatan/rekening adalah subtotal,
// jadi ikut dijumlahkan akan menghitung dua kali.
export function ambilAnggaran({ sekolahId, tahun }) {
  return ambilSemua(() =>
    supabase
      .from('arkas_anggaran')
      .select(
        'id, tahun_anggaran, level, no_urut, kode_kegiatan, kode_rekening, item_no, uraian, jumlah, volume, satuan, harga_satuan, status, ' +
          'bosp_reguler_operasi, bosp_reguler_modal, bosp_daerah_operasi, bosp_daerah_modal, ' +
          'afirmasi_kinerja_operasi, afirmasi_kinerja_modal, silpa_operasi, silpa_modal, ' +
          'bosp_lainnya_operasi, bosp_lainnya_modal',
      )
      .eq('sekolah_id', sekolahId)
      .eq('tahun_anggaran', String(tahun)) // kolom bertipe text
      .eq('is_item', true)
      .order('no_urut', { ascending: true })
      .order('id', { ascending: true }),
  )
}

export function ambilBku({ sekolahId, tahun }) {
  return ambilSemua(() =>
    supabase
      .from('bku_kas')
      .select('id, tahun, bulan, tanggal, no_bukti, uraian, kode_kegiatan, kode_rekening, penerimaan, pengeluaran, arkas_id, inventaris_id')
      .eq('sekolah_id', sekolahId)
      .eq('tahun', Number(tahun)) // kolom bertipe integer
      .order('tanggal', { ascending: true })
      .order('id', { ascending: true }),
  )
}

function useMuat(ambil, sekolahId, tahun) {
  const [state, setState] = useState({ data: [], loading: true, error: null })

  useEffect(() => {
    if (!sekolahId || !tahun) {
      setState({ data: [], loading: false, error: null })
      return
    }
    let batal = false
    setState((s) => ({ ...s, loading: true, error: null }))
    ambil({ sekolahId, tahun })
      .then((data) => !batal && setState({ data, loading: false, error: null }))
      .catch((error) => !batal && setState({ data: [], loading: false, error }))
    return () => {
      batal = true
    }
  }, [ambil, sekolahId, tahun])

  return state
}

export const useAnggaranArkas = (sekolahId, tahun) => useMuat(ambilAnggaran, sekolahId, tahun)
export const useBkuKas = (sekolahId, tahun) => useMuat(ambilBku, sekolahId, tahun)

const angka = (v) => Number(v) || 0

// Rekap per bulan (1-12): penerimaan, pengeluaran, dan saldo berjalan.
// Untuk halaman Laporan Bulanan.
export function rekapBulanan(bku) {
  const bulan = Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1, penerimaan: 0, pengeluaran: 0, saldo: 0 }))
  for (const b of bku) {
    const baris = bulan[(Number(b.bulan) || 1) - 1]
    if (!baris) continue
    baris.penerimaan += angka(b.penerimaan)
    baris.pengeluaran += angka(b.pengeluaran)
  }
  let saldo = 0
  for (const baris of bulan) {
    saldo += baris.penerimaan - baris.pengeluaran
    baris.saldo = saldo
  }
  return bulan
}

// Serapan anggaran per kegiatan + rekening: dianggarkan vs dibelanjakan.
// Untuk halaman RKAS (realisasi) dan Evaluasi Diri Sekolah (ringkasan serapan).
// Pencocokan memakai kode_kegiatan + kode_rekening di kedua tabel.
export function serapanAnggaran(anggaran, bku) {
  const kunci = (k, r) => `${k || ''}|${r || ''}`
  const peta = new Map()

  for (const a of anggaran) {
    const k = kunci(a.kode_kegiatan, a.kode_rekening)
    const baris = peta.get(k) || { kode_kegiatan: a.kode_kegiatan, kode_rekening: a.kode_rekening, uraian: a.uraian, dianggarkan: 0, dibelanjakan: 0 }
    baris.dianggarkan += angka(a.jumlah)
    peta.set(k, baris)
  }
  for (const b of bku) {
    const k = kunci(b.kode_kegiatan, b.kode_rekening)
    const baris = peta.get(k) || { kode_kegiatan: b.kode_kegiatan, kode_rekening: b.kode_rekening, uraian: b.uraian, dianggarkan: 0, dibelanjakan: 0 }
    baris.dibelanjakan += angka(b.pengeluaran)
    peta.set(k, baris)
  }

  const baris = [...peta.values()].map((r) => ({
    ...r,
    sisa: r.dianggarkan - r.dibelanjakan,
    persen: r.dianggarkan > 0 ? (r.dibelanjakan / r.dianggarkan) * 100 : null, // null = belanja tanpa anggaran
  }))
  const total = baris.reduce(
    (t, r) => ({ dianggarkan: t.dianggarkan + r.dianggarkan, dibelanjakan: t.dibelanjakan + r.dibelanjakan }),
    { dianggarkan: 0, dibelanjakan: 0 },
  )
  return {
    baris,
    total: {
      ...total,
      sisa: total.dianggarkan - total.dibelanjakan,
      persen: total.dianggarkan > 0 ? (total.dibelanjakan / total.dianggarkan) * 100 : null,
    },
  }
}

// Belanja modal (aset) untuk Buku Inventaris. Pada kode rekening ARKAS, belanja modal
// berawalan "5.2". Transaksi BKU yang sudah tercatat sebagai inventaris punya inventaris_id.
// SESUAIKAN awalan bila kode rekening di data Anda berbeda.
export function belanjaModal(bku, awalan = '5.2') {
  return bku
    .filter((b) => String(b.kode_rekening || '').startsWith(awalan) && angka(b.pengeluaran) > 0)
    .map((b) => ({ ...b, sudahDiInventaris: Boolean(b.inventaris_id) }))
}

// Sumber dana: kolom di arkas_anggaran dikelompokkan per sumber (operasi + modal).
const SUMBER_DANA = [
  ['BOSP Reguler', ['bosp_reguler_operasi', 'bosp_reguler_modal']],
  ['BOSP Daerah', ['bosp_daerah_operasi', 'bosp_daerah_modal']],
  ['BOSP Afirmasi/Kinerja', ['afirmasi_kinerja_operasi', 'afirmasi_kinerja_modal']],
  ['SILPA', ['silpa_operasi', 'silpa_modal']],
  ['BOSP Lainnya', ['bosp_lainnya_operasi', 'bosp_lainnya_modal']],
]

// Ubah baris item ARKAS menjadi baris RKAS di Administrasi Kepsek.
// Bentuk keluaran mengikuti entri rkas: tahun, sumber, uraian, volume, satuan, harga, jumlah.
// kode_kegiatan & kode_rekening ikut disertakan; hapus dari hasil bila tidak dipakai.
export function anggaranKeBarisRkas(anggaran) {
  return anggaran.map((a) => {
    let sumber = ''
    let terbesar = 0
    for (const [label, kolom] of SUMBER_DANA) {
      const total = kolom.reduce((t, k) => t + angka(a[k]), 0)
      if (total > terbesar) {
        terbesar = total
        sumber = label
      }
    }
    const volume = angka(a.volume)
    const harga = angka(a.harga_satuan)
    const jumlah = angka(a.jumlah) || volume * harga
    return {
      tahun: String(a.tahun_anggaran || ''),
      sumber,
      uraian: a.uraian || '',
      volume,
      satuan: a.satuan || '',
      harga,
      jumlah,
      kode_kegiatan: a.kode_kegiatan || '',
      kode_rekening: a.kode_rekening || '',
    }
  })
}
