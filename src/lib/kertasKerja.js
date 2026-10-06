// src/lib/kertasKerja.js
// Menyusun item RKAS menjadi baris Kertas Kerja ala ARKAS:
// Standar (XX) -> Komponen (XX.YY) -> Kegiatan (XX.YY.ZZ) -> Rekening -> Uraian bernomor 001, 002, ...
// Belanja Operasi/Modal ditentukan dari awalan rekening: 5.1.* operasi, 5.2.* modal.
import { nilaiItem } from './aturanBos'

const bersih = (v) => String(v ?? '').trim()
const POLA_KEG = /^\d{2}\.\d{2}\.\d{2}$/

// Pemetaan sumber dana di simak-app ke kode penerimaan ARKAS (bagian A Kertas Kerja)
export const KODE_PENERIMAAN = {
  'BOS Reguler': '4.3.1.01',
  'BOS Kinerja': '4.3.1.12',
  'BOS Afirmasi': '4.3.1.61',
  Lainnya: '4.3.1.99',
}

const jumlahkan = (arr, kunci) => arr.reduce((n, x) => n + x[kunci], 0)

/**
 * items: [{ id, tanggal, created_at, data }]  (satu tahun anggaran + satu sumber dana)
 * ref:   { kegiatan: [{kode, nama}], rekening: [{kode, nama}] }
 * Hasil: { baris, total, operasi, modal, belumBerkode, tanpaRekening }
 */
export function susunKertasKerja(items, ref = {}) {
  const namaRef = new Map([...(ref.kegiatan || []), ...(ref.rekening || [])].map((x) => [x.kode, x.nama]))
  const urut = [...items].sort((a, b) =>
    bersih(a.tanggal).localeCompare(bersih(b.tanggal)) || bersih(a.created_at).localeCompare(bersih(b.created_at)))

  // Siapkan item bernilai
  const bahan = urut.map((r) => {
    const d = r.data || {}
    const kodeKeg = POLA_KEG.test(bersih(d.kode_kegiatan)) ? bersih(d.kode_kegiatan) : ''
    const kodeRek = bersih(d.kode_rekening)
    const jumlah = nilaiItem(d)
    const modal = kodeRek.startsWith('5.2') ? jumlah : 0
    return {
      d, kodeKeg, kodeRek, jumlah, modal, operasi: jumlah - modal,
      standar: kodeKeg.slice(0, 2), komponen: kodeKeg.slice(0, 5),
    }
  })

  const nama = (kode, cadangan) => namaRef.get(kode) || bersih(cadangan) || kode
  const baris = []
  const kelompok = (arr, kunci) => {
    const m = new Map()
    arr.forEach((x) => { const k = x[kunci]; if (!m.has(k)) m.set(k, []); m.get(k).push(x) })
    return [...m.entries()].sort((a, b) => (a[0] === '' ? 1 : b[0] === '' ? -1 : a[0].localeCompare(b[0])))
  }
  const tambahBaris = (tingkat, kode, namaBaris, arr, ekstra = {}) =>
    baris.push({ tingkat, kode, nama: namaBaris, jumlah: jumlahkan(arr, 'jumlah'), operasi: jumlahkan(arr, 'operasi'), modal: jumlahkan(arr, 'modal'), ...ekstra })

  for (const [stdKode, stdItems] of kelompok(bahan, 'standar')) {
    if (stdKode === '') {
      tambahBaris('standar', '', 'Belum berkode kegiatan', stdItems)
    } else {
      tambahBaris('standar', stdKode, nama(stdKode), stdItems)
    }
    for (const [kompKode, kompItems] of kelompok(stdItems, 'komponen')) {
      if (kompKode !== '') tambahBaris('komponen', kompKode, nama(kompKode, kompItems[0].d.komponen), kompItems)
      for (const [kegKode, kegItems] of kelompok(kompItems, 'kodeKeg')) {
        if (kegKode !== '') tambahBaris('kegiatan', kegKode, nama(kegKode, kegItems[0].d.kegiatan), kegItems, { kodeKeg: kegKode })
        for (const [rekKode, rekItems] of kelompok(kegItems, 'kodeRek')) {
          tambahBaris('rekening', rekKode, rekKode ? nama(rekKode, rekItems[0].d.rekening) : 'Belum berkode rekening', rekItems, { kodeKeg: kegKode, kodeRek: rekKode })
          rekItems.forEach((x, i) => {
            const vol = x.d.volume
            const rincian = vol ? `${vol} ${bersih(x.d.satuan)}${x.d.harga ? ` x Rp ${Number(x.d.harga).toLocaleString('id-ID')}` : ''}`.trim() : ''
            baris.push({
              tingkat: 'uraian', kode: rekKode, no: String(i + 1).padStart(3, '0'), nama: bersih(x.d.uraian),
              rincian, jumlah: x.jumlah, operasi: x.operasi, modal: x.modal, kodeKeg: kegKode, kodeRek: rekKode,
              volume: x.d.volume, satuan: x.d.satuan, harga: x.d.harga, bulan: x.d.bulan, tahap: x.d.tahap,
            })
          })
        }
      }
    }
  }

  return {
    baris,
    total: jumlahkan(bahan, 'jumlah'),
    operasi: jumlahkan(bahan, 'operasi'),
    modal: jumlahkan(bahan, 'modal'),
    belumBerkode: bahan.filter((x) => !x.kodeKeg).length,
    tanpaRekening: bahan.filter((x) => !x.kodeRek).length,
  }
}
