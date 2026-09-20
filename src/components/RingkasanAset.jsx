import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Komponen "tempel jadi": menarik data dari tabel `bangunan` dan `inventaris`
// lalu menampilkannya sebagai tabel ringkasan kondisi yang siap cetak.
// Dipakai di laporan Kepala Sekolah dan Laporan Kepala KUA.
//
// Contoh pemakaian:
//   <RingkasanAset />                                   // ketiga tabel
//   <RingkasanAset tampil={['bangunan']} />             // hanya bangunan
//   <RingkasanAset tampil={['peralatan', 'inventaris']} rinci />
//        ^ rinci: dirinci per nama barang, bukan per kategori
//   <RingkasanAset judulBangunan="B. Kondisi Bangunan" judulPeralatan="C. Kondisi Peralatan" />
//
// Data dibatasi oleh aturan akses (RLS) di database, sama seperti halaman
// Inventaris. Kalau perlu memaksa satu sekolah/kantor tertentu, kirim prop
// sekolahId.

// Isi kolom "kondisi" ditulis bebas oleh pengguna (mis. "baik", "Baik",
// "rusak ringan", "Rusak_Berat"), jadi dinormalisasi dulu sebelum dihitung.
function normalisasiKondisi(nilai) {
  const t = String(nilai || '').toLowerCase().replace(/[_-]+/g, ' ').trim()
  if (t.includes('berat')) return 'rusak_berat'
  if (t.includes('ringan') || t.includes('sedang')) return 'rusak_ringan'
  if (t.startsWith('tidak')) return 'lainnya'
  if (t.includes('baik')) return 'baik'
  return 'lainnya'
}

const kosong = () => ({ baik: 0, rusak_ringan: 0, rusak_berat: 0, lainnya: 0 })
const jumlahBaris = (r) => r.baik + r.rusak_ringan + r.rusak_berat + r.lainnya

function ringkasPerKunci(baris, ambilKunci) {
  const peta = new Map()
  for (const b of baris) {
    const kunci = (ambilKunci(b) || '').toString().trim().toUpperCase() || 'TANPA KATEGORI'
    const r = peta.get(kunci) || { nama: kunci, ...kosong() }
    r[normalisasiKondisi(b.kondisi)] += Number(b.jumlah) || 0
    peta.set(kunci, r)
  }
  return [...peta.values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
}

const TH = 'border border-black px-2 py-1 text-center font-semibold align-middle'
const TD = 'border border-black px-2 py-1'
const TD_ANGKA = `${TD} text-center`

// Tabel kondisi untuk barang (dipakai dua kali: Peralatan & Barang Inventaris).
function TabelBarang({ judul, baris, kolomNama, pesanKosong }) {
  const adaLainnya = baris.some((r) => r.lainnya > 0)
  const total = baris.reduce(
    (t, r) => ({
      baik: t.baik + r.baik,
      rusak_ringan: t.rusak_ringan + r.rusak_ringan,
      rusak_berat: t.rusak_berat + r.rusak_berat,
      lainnya: t.lainnya + r.lainnya,
    }),
    kosong()
  )

  return (
    <section className="break-inside-avoid">
      <h3 className="mb-1 text-[11pt] font-semibold">{judul}</h3>
      <table className="w-full border-collapse text-[10pt]">
        <thead>
          <tr>
            <th rowSpan={2} className={TH}>No</th>
            <th rowSpan={2} className={TH}>{kolomNama}</th>
            <th colSpan={adaLainnya ? 4 : 3} className={TH}>Kondisi</th>
            <th rowSpan={2} className={TH}>Jumlah</th>
          </tr>
          <tr>
            <th className={TH}>Baik</th>
            <th className={TH}>Rusak Ringan</th>
            <th className={TH}>Rusak Berat</th>
            {adaLainnya && <th className={TH}>Lainnya</th>}
          </tr>
        </thead>
        <tbody>
          {baris.length === 0 ? (
            <tr>
              <td colSpan={adaLainnya ? 7 : 6} className={`${TD} text-center italic`}>
                {pesanKosong}
              </td>
            </tr>
          ) : (
            baris.map((r, i) => (
              <tr key={r.nama}>
                <td className={TD_ANGKA}>{i + 1}</td>
                <td className={TD}>{r.nama}</td>
                <td className={TD_ANGKA}>{r.baik}</td>
                <td className={TD_ANGKA}>{r.rusak_ringan}</td>
                <td className={TD_ANGKA}>{r.rusak_berat}</td>
                {adaLainnya && <td className={TD_ANGKA}>{r.lainnya}</td>}
                <td className={TD_ANGKA}>{jumlahBaris(r)}</td>
              </tr>
            ))
          )}
          {baris.length > 0 && (
            <tr className="font-semibold">
              <td colSpan={2} className={`${TD} text-center`}>Jumlah</td>
              <td className={TD_ANGKA}>{total.baik}</td>
              <td className={TD_ANGKA}>{total.rusak_ringan}</td>
              <td className={TD_ANGKA}>{total.rusak_berat}</td>
              {adaLainnya && <td className={TD_ANGKA}>{total.lainnya}</td>}
              <td className={TD_ANGKA}>{jumlahBaris(total)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

export default function RingkasanAset({
  sekolahId = null, // opsional; bawaan: dibatasi oleh aturan akses database
  tampil = ['bangunan', 'peralatan', 'inventaris'],
  rinci = false,
  judulBangunan = 'Kondisi Bangunan',
  judulPeralatan = 'Kondisi Peralatan',
  judulInventaris = 'Kondisi Barang Inventaris',
  className = '',
}) {
  const tampilBangunan = tampil.includes('bangunan')
  const tampilPeralatan = tampil.includes('peralatan')
  const tampilInventaris = tampil.includes('inventaris')
  const perluBarang = tampilPeralatan || tampilInventaris

  const [bangunan, setBangunan] = useState([])
  const [barang, setBarang] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')

  useEffect(() => {
    let aktif = true

    async function muat() {
      setMemuat(true)
      setGalat('')

      let qB = supabase
        .from('bangunan')
        .select('nama, jenis, jumlah, luas_m2, tahun_dibangun, status_kepemilikan, kondisi')
        .order('nama')
      let qA = supabase.from('inventaris').select('nama_barang, kategori, jenis, jumlah, kondisi')
      if (sekolahId) {
        qB = qB.eq('sekolah_id', sekolahId)
        qA = qA.eq('sekolah_id', sekolahId)
      }

      const [hasilB, hasilA] = await Promise.all([
        tampilBangunan ? qB : Promise.resolve({ data: [] }),
        perluBarang ? qA : Promise.resolve({ data: [] }),
      ])

      if (!aktif) return
      const pesan = [hasilB.error?.message, hasilA.error?.message].filter(Boolean).join(' | ')
      if (pesan) setGalat(pesan)
      setBangunan(hasilB.data || [])
      setBarang(hasilA.data || [])
      setMemuat(false)
    }

    muat()
    return () => {
      aktif = false
    }
  }, [sekolahId, tampilBangunan, perluBarang])

  const kunciBarang = (b) => (rinci ? b.nama_barang : b.kategori)
  const kolomNama = rinci ? 'Nama Barang' : 'Kategori'

  const barisPeralatan = useMemo(
    () => ringkasPerKunci(barang.filter((b) => b.jenis === 'peralatan'), kunciBarang),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [barang, rinci]
  )
  const barisInventaris = useMemo(
    () => ringkasPerKunci(barang.filter((b) => b.jenis !== 'peralatan'), kunciBarang),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [barang, rinci]
  )

  const totalBangunan = bangunan.reduce((t, b) => {
    t[normalisasiKondisi(b.kondisi)] += Number(b.jumlah) || 0
    return t
  }, kosong())

  if (memuat) {
    return <p className="text-sm text-slate-500 print:hidden">Memuat data aset...</p>
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Pesan galat hanya tampil di layar, tidak ikut tercetak */}
      {galat && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 print:hidden">
          Sebagian data gagal dimuat: {galat}. Pastikan file SQL tabel bangunan &amp; kolom jenis
          inventaris sudah dijalankan.
        </p>
      )}

      {tampilBangunan && (
        <section className="break-inside-avoid">
          <h3 className="mb-1 text-[11pt] font-semibold">{judulBangunan}</h3>
          <table className="w-full border-collapse text-[10pt]">
            <thead>
              <tr>
                <th rowSpan={2} className={TH}>No</th>
                <th rowSpan={2} className={TH}>Nama Bangunan / Ruang</th>
                <th rowSpan={2} className={TH}>Luas (m²)</th>
                <th rowSpan={2} className={TH}>Tahun</th>
                <th rowSpan={2} className={TH}>Status</th>
                <th colSpan={3} className={TH}>Kondisi</th>
                <th rowSpan={2} className={TH}>Jumlah</th>
              </tr>
              <tr>
                <th className={TH}>Baik</th>
                <th className={TH}>Rusak Ringan</th>
                <th className={TH}>Rusak Berat</th>
              </tr>
            </thead>
            <tbody>
              {bangunan.length === 0 ? (
                <tr>
                  <td colSpan={9} className={`${TD} text-center italic`}>
                    Belum ada data bangunan
                  </td>
                </tr>
              ) : (
                bangunan.map((b, i) => {
                  const k = normalisasiKondisi(b.kondisi)
                  const jml = Number(b.jumlah) || 0
                  return (
                    <tr key={`${b.nama}-${i}`}>
                      <td className={TD_ANGKA}>{i + 1}</td>
                      <td className={TD}>{b.nama}</td>
                      <td className={TD_ANGKA}>{b.luas_m2 ?? '-'}</td>
                      <td className={TD_ANGKA}>{b.tahun_dibangun ?? '-'}</td>
                      <td className={TD}>{b.status_kepemilikan || '-'}</td>
                      <td className={TD_ANGKA}>{k === 'baik' ? jml : '-'}</td>
                      <td className={TD_ANGKA}>{k === 'rusak_ringan' ? jml : '-'}</td>
                      <td className={TD_ANGKA}>{k === 'rusak_berat' ? jml : '-'}</td>
                      <td className={TD_ANGKA}>{jml}</td>
                    </tr>
                  )
                })
              )}
              {bangunan.length > 0 && (
                <tr className="font-semibold">
                  <td colSpan={5} className={`${TD} text-center`}>Jumlah</td>
                  <td className={TD_ANGKA}>{totalBangunan.baik}</td>
                  <td className={TD_ANGKA}>{totalBangunan.rusak_ringan}</td>
                  <td className={TD_ANGKA}>{totalBangunan.rusak_berat}</td>
                  <td className={TD_ANGKA}>{jumlahBaris(totalBangunan)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {tampilPeralatan && (
        <TabelBarang
          judul={judulPeralatan}
          baris={barisPeralatan}
          kolomNama={kolomNama}
          pesanKosong="Belum ada data peralatan"
        />
      )}

      {tampilInventaris && (
        <TabelBarang
          judul={judulInventaris}
          baris={barisInventaris}
          kolomNama={kolomNama}
          pesanKosong="Belum ada data barang inventaris"
        />
      )}
    </div>
  )
}
