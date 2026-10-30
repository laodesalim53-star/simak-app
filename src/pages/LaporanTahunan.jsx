// src/pages/LaporanTahunan.jsx  ->  rute /administrasi-kepsek/laporan-tahunan
// Dibuat dengan pola yang sama seperti BukuKerjaKepsek.jsx: komponen cetak, KopSurat, TandaTanganKepsek,
// dan penyimpanan lewat useDokumenTersimpan (dokumen: 'laporan-tahunan'), jadi TIDAK perlu tabel baru.
//
// Sumber data otomatis:
//  - Murid & guru     : useKeadaanSekolah (components/LaporanTahunanOtomatis.jsx)
//                       siswa.kelas_id -> kelas.tingkat, status 'aktif' (sinkron dengan Keadaan Murid)
//  - Anggaran (ARKAS) : arkas_anggaran  (sekolah_id, tahun_anggaran, is_item, jumlah)
//                       HANYA baris is_item = true yang dijumlahkan (baris lain judul/subtotal).
//  - Realisasi (BKU)  : bku_kas         (tahun, bulan, penerimaan, pengeluaran)
//  - Buku Kerja Kepsek: dokumen 'buku-kerja' yang sudah tersimpan
//  - Rekap administrasi (surat, tamu, dll): lihat SUMBER + hitung(); galat query ditampilkan di Bagian E.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, RefreshCw } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { KopSurat, TandaTanganKepsek, KotakSimpan, Th, Td, Baris, cssCetak, tombolKecil } from '../components/AdministrasiKepsekKomponen'
import { IsianTtd } from '../components/AdministrasiKepsekIsian'
import { useDataSekolah, useDokumenTersimpan } from '../lib/administrasiKepsek'
import {
  useKeadaanSekolah,
  TabelKeadaanMurid,
  RekapGuru,
  RekapDemografi,
  PanelOtomatis,
} from '../components/LaporanTahunanOtomatis'

// Rekap jumlah dari tabel modul lain.
// tabel / tgl boleh berupa daftar kandidat; dicoba berurutan sampai ada yang berhasil.
// SESUAIKAN dengan nama tabel / kolom tanggal yang sebenarnya di Supabase (lihat kotak merah di Bagian E bila gagal).
const SUMBER = [
  { id: 'mutasi', label: 'Mutasi siswa', tabel: ['mutasi_siswa'], tgl: ['tanggal'] },
  { id: 'tamu', label: 'Kunjungan tamu', tabel: ['buku_tamu'], tgl: ['tanggal'] },
  {
    id: 'surat_masuk',
    label: 'Surat masuk',
    tabel: ['surat_masuk', 'agenda_surat_masuk', 'arsip_surat_masuk'],
    tgl: ['tanggal', 'tanggal_surat', 'tanggal_terima', 'tanggal_diterima', 'created_at'],
  },
  {
    id: 'surat_keluar',
    label: 'Surat keluar',
    tabel: ['surat_keluar', 'agenda_surat_keluar', 'arsip_surat_keluar'],
    tgl: ['tanggal', 'tanggal_surat', 'tanggal_kirim', 'created_at'],
  },
  { id: 'inventaris', label: 'Barang inventaris', tabel: ['inventaris'], tgl: null },
  { id: 'notulen', label: 'Rapat (notulen)', tabel: ['notulen_rapat'], tgl: ['tanggal'] },
]

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const rupiah = (n) =>
  n == null ? '–' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const persen = (n) => (n == null ? '–' : `${n.toFixed(1).replace('.', ',')}%`)

// Mengembalikan { jumlah, galat }. Jumlah null = semua kandidat gagal; galat berisi pesan terakhir.
async function hitung(s, sekolahId, tahun) {
  const daftarTabel = [].concat(s.tabel)
  const daftarTgl = s.tgl ? [].concat(s.tgl) : [null]
  let galat = ''
  for (const tabel of daftarTabel) {
    for (const kolom of daftarTgl) {
      let q = supabase.from(tabel).select('*', { count: 'exact', head: true }).eq('sekolah_id', sekolahId)
      // lt awal tahun berikutnya: aman untuk kolom date maupun timestamp
      if (kolom) q = q.gte(kolom, `${tahun}-01-01`).lt(kolom, `${tahun + 1}-01-01`)
      const { count, error } = await q
      if (!error) return { jumlah: count ?? 0, galat: '' }
      galat = `${tabel}.${kolom || '-'}: ${error.message}`
    }
  }
  return { jumlah: null, galat }
}

// Supabase membatasi 1000 baris per permintaan; ARKAS/BKU setahun bisa lebih, jadi diambil bertahap.
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

const KEUANGAN_KOSONG = {
  anggaran: null,
  penerimaan: null,
  pengeluaran: null,
  perBulan: Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1, penerimaan: 0, pengeluaran: 0 })),
  error: '',
}

// Anggaran dari ARKAS (arkas_anggaran) + realisasi dari BKU (bku_kas), sama seperti halaman Keuangan.
async function muatKeuangan(sekolahId, tahun) {
  const [ark, bku] = await Promise.all([
    ambilSemua(() =>
      supabase
        .from('arkas_anggaran')
        .select('id, jumlah, is_item')
        .eq('sekolah_id', sekolahId)
        .eq('tahun_anggaran', String(tahun))
        .order('id')
    ),
    ambilSemua(() =>
      supabase.from('bku_kas').select('id, bulan, tanggal, penerimaan, pengeluaran').eq('tahun', tahun).order('id')
    ),
  ])

  const pesan = []
  if (ark.error) pesan.push(`ARKAS: ${ark.error.message}`)
  if (bku.error) pesan.push(`BKU: ${bku.error.message}`)

  const baris = ark.data || []
  const anggaran = baris.length ? baris.filter((r) => r.is_item).reduce((t, r) => t + (Number(r.jumlah) || 0), 0) : null

  const perBulan = KEUANGAN_KOSONG.perBulan.map((b) => ({ ...b }))
  const bkuRows = bku.data || []
  bkuRows.forEach((r) => {
    const b = Number(r.bulan) || (r.tanggal ? new Date(r.tanggal).getMonth() + 1 : 0)
    if (b < 1 || b > 12) return
    perBulan[b - 1].penerimaan += Number(r.penerimaan) || 0
    perBulan[b - 1].pengeluaran += Number(r.pengeluaran) || 0
  })
  const penerimaan = bkuRows.length ? perBulan.reduce((t, b) => t + b.penerimaan, 0) : null
  const pengeluaran = bkuRows.length ? perBulan.reduce((t, b) => t + b.pengeluaran, 0) : null

  return { anggaran, penerimaan, pengeluaran, perBulan, error: pesan.join(' | ') }
}

const NARASI_KOSONG = { pendahuluan: '', capaian: '', kendala: '', tindak_lanjut: '' }
const bawaan = () => ({ tempat: '', tanggal: '', narasi: {} })
const bawaanBukuKerja = () => ({ jurnal: [], program: [], pembinaan: [] })

function Bagian({ huruf, judul, children }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-sm font-bold uppercase" style={{ breakAfter: 'avoid' }}>{huruf}. {judul}</h3>
      {children}
    </section>
  )
}

function Narasi({ nilai, onUbah, label, baris = 4 }) {
  return (
    <>
      <textarea
        rows={baris}
        value={nilai}
        onChange={(e) => onUbah(e.target.value)}
        placeholder={label}
        className="no-print w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <p className="hidden whitespace-pre-line text-justify print:block">{nilai || '-'}</p>
    </>
  )
}

// Prestasi: diisi manual per tahun laporan, disimpan bersama dokumen (data.prestasi[tahun]), tanpa tabel baru.
const TINGKAT_PRESTASI = ['Sekolah', 'Kecamatan', 'Kabupaten', 'Provinsi', 'Nasional', 'Internasional']
const prestasiBaru = () => ({ nama: '', peraih: '', tingkat: 'Kecamatan', juara: '' })

function DaftarPrestasi({ rows, onUbah }) {
  const ubah = (i, k, v) => onUbah(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const hapus = (i) => onUbah(rows.filter((_, j) => j !== i))
  const terisi = rows.filter((r) => r.nama?.trim())
  const inp = 'w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300'
  return (
    <>
      <div className="no-print space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_130px_120px_auto]">
            <input className={inp} placeholder="Nama prestasi / lomba" value={r.nama} onChange={(e) => ubah(i, 'nama', e.target.value)} />
            <input className={inp} placeholder="Peraih (siswa / guru / sekolah)" value={r.peraih} onChange={(e) => ubah(i, 'peraih', e.target.value)} />
            <select className={inp} value={r.tingkat} onChange={(e) => ubah(i, 'tingkat', e.target.value)}>
              {TINGKAT_PRESTASI.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className={inp} placeholder="Juara / peringkat" value={r.juara} onChange={(e) => ubah(i, 'juara', e.target.value)} />
            <button type="button" className={tombolKecil} onClick={() => hapus(i)}>Hapus</button>
          </div>
        ))}
        <button type="button" className={tombolKecil} onClick={() => onUbah([...rows, prestasiBaru()])}>+ Tambah prestasi</button>
      </div>
      {terisi.length > 0 ? (
        <div className="hidden print:block">
          <table className="w-full border-collapse">
            <thead><tr><Th className="w-8">No</Th><Th>Prestasi / Lomba</Th><Th>Peraih</Th><Th className="w-24">Tingkat</Th><Th className="w-28">Juara</Th></tr></thead>
            <tbody>
              {terisi.map((r, i) => (
                <tr key={i}><Td className="text-center">{i + 1}</Td><Td>{r.nama}</Td><Td>{r.peraih}</Td><Td>{r.tingkat}</Td><Td>{r.juara}</Td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="hidden print:block">-</p>
      )}
    </>
  )
}

// Draf Capaian Program: hanya merangkum angka yang tercatat di sistem (tidak mengarang hasil/prestasi).
function buatCapaian({ tahun, ks, bk, angka, uang, serapan, jumlahPrestasi }) {
  const p = []
  if (ks.totalSiswa > 0) {
    p.push(`Pada tahun ${tahun}, sekolah melayani ${ks.totalSiswa} peserta didik dalam ${ks.totalRombel} rombongan belajar dengan dukungan ${ks.guru.total} guru dan tenaga kependidikan.`)
  }
  if (bk.program.length) {
    const daftar = bk.program.slice(0, 5).map((r) => r.program.trim()).join('; ')
    p.push(`Program kerja kepala sekolah yang tercatat dalam Buku Kerja berjumlah ${bk.program.length} program, antara lain: ${daftar}${bk.program.length > 5 ? ', dan lainnya' : ''}.`)
  }
  if (bk.jurnal || bk.pembinaan) {
    p.push(`Pelaksanaan tugas kepala sekolah terdokumentasi melalui ${bk.jurnal} kegiatan pada jurnal harian dan ${bk.pembinaan} kali pembinaan guru dan tenaga kependidikan.`)
  }
  const adm = [['surat masuk', angka.surat_masuk], ['surat keluar', angka.surat_keluar], ['rapat', angka.notulen], ['kunjungan tamu', angka.tamu]]
    .filter(([, n]) => n > 0)
    .map(([l, n]) => `${n} ${l}`)
  if (adm.length) p.push(`Administrasi sekolah tercatat sebanyak ${adm.join(', ')}.`)
  if (serapan != null) {
    p.push(`Realisasi belanja mencapai ${rupiah(uang.pengeluaran)} atau ${persen(serapan)} dari total anggaran ${rupiah(uang.anggaran)}.`)
  }
  if (jumlahPrestasi > 0) p.push(`Prestasi yang diraih sepanjang tahun ${tahun} berjumlah ${jumlahPrestasi} (rincian pada tabel prestasi).`)
  p.push('[Tambahkan capaian lain, mis. hasil asesmen, kegiatan penguatan karakter, perbaikan sarana prasarana, atau akreditasi.]')
  return p.join('\n\n')
}

// Grafik penerimaan vs pengeluaran per bulan (SVG, ikut tercetak; angka lengkap ada di tabel di bawahnya).
function GrafikKeuangan({ data }) {
  const W = 560
  const H = 190
  const kiri = 6
  const bawah = 22
  const atas = 26
  const maks = Math.max(1, ...data.flatMap((d) => [d.penerimaan, d.pengeluaran]))
  const grup = (W - kiri) / 12
  const tinggi = (v) => (v / maks) * (H - atas - bawah)
  return (
    <figure className="mt-3" style={{ breakInside: 'avoid' }}>
      <figcaption className="mb-1 text-xs font-semibold">Grafik Penerimaan dan Pengeluaran per Bulan</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-2xl" role="img" aria-label="Grafik penerimaan dan pengeluaran per bulan">
        <rect x={kiri} y={4} width={10} height={10} fill="#1e3a8a" />
        <text x={kiri + 14} y={13} fontSize="10" fill="#0f172a">Penerimaan</text>
        <rect x={kiri + 80} y={4} width={10} height={10} fill="#db2777" />
        <text x={kiri + 94} y={13} fontSize="10" fill="#0f172a">Pengeluaran</text>
        <text x={W - 4} y={13} fontSize="10" textAnchor="end" fill="#475569">Skala maks {rupiah(maks)}</text>
        <line x1={kiri} x2={W} y1={H - bawah} y2={H - bawah} stroke="#94a3b8" strokeWidth="1" />
        {data.map((d, i) => {
          const x = kiri + i * grup
          const w = grup * 0.36
          return (
            <g key={d.bulan}>
              <rect x={x + grup * 0.1} y={H - bawah - tinggi(d.penerimaan)} width={w} height={tinggi(d.penerimaan)} fill="#1e3a8a" />
              <rect x={x + grup * 0.1 + w + 1} y={H - bawah - tinggi(d.pengeluaran)} width={w} height={tinggi(d.pengeluaran)} fill="#db2777" />
              <text x={x + grup / 2} y={H - 8} fontSize="9" textAnchor="middle" fill="#0f172a">{BULAN_SINGKAT[i]}</text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

export default function LaporanTahunan() {
  const { sekolahId } = useAuth()
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [vm, setVm] = useState(null)
  const [angka, setAngka] = useState({})
  const [galatAngka, setGalatAngka] = useState([])
  const [uang, setUang] = useState(KEUANGAN_KOSONG)
  const [memuatAngka, setMemuatAngka] = useState(false)

  // Murid, guru, dan rekap demografi (usia, agama, kewarganegaraan)
  const ks = useKeadaanSekolah(sekolahId)

  const { info } = useDataSekolah(sekolahId)
  const dok = useDokumenTersimpan({ sekolahId, dokumen: 'laporan-tahunan', buatBawaan: bawaan })
  const { data, setData } = dok
  // Hanya dibaca: rekap dari dokumen Buku Kerja Kepala Sekolah yang sudah tersimpan.
  const bukuKerja = useDokumenTersimpan({ sekolahId, dokumen: 'buku-kerja', buatBawaan: bawaanBukuKerja })

  const namaSekolah = info.sekolah?.nama_sekolah || info.sekolah?.nama || ''
  const narasi = { ...NARASI_KOSONG, ...(data.narasi?.[tahun] || {}) }
  const setNarasi = (k) => (v) =>
    setData((d) => ({ ...d, narasi: { ...(d.narasi || {}), [tahun]: { ...NARASI_KOSONG, ...(d.narasi?.[tahun] || {}), [k]: v } } }))
  const set = (k) => (v) => setData((d) => ({ ...d, [k]: v }))
  const prestasi = data.prestasi?.[tahun] || []
  const setPrestasi = (rows) => setData((d) => ({ ...d, prestasi: { ...(d.prestasi || {}), [tahun]: rows } }))

  const muat = useCallback(async () => {
    if (!sekolahId) return
    setMemuatAngka(true)

    const { data: v } = await supabase.from('visi_misi_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle()
    setVm(v || null)

    const [hasil, keu] = await Promise.all([
      Promise.all(SUMBER.map((s) => hitung(s, sekolahId, tahun))),
      muatKeuangan(sekolahId, tahun),
    ])
    setAngka(Object.fromEntries(SUMBER.map((s, i) => [s.id, hasil[i].jumlah])))
    setGalatAngka(SUMBER.map((s, i) => (hasil[i].galat ? `${s.label} → ${hasil[i].galat}` : null)).filter(Boolean))
    setUang(keu)
    setMemuatAngka(false)
  }, [sekolahId, tahun])

  useEffect(() => { muat() }, [muat])

  // Turunan keuangan
  const selisih = uang.anggaran != null && uang.penerimaan != null ? uang.penerimaan - uang.anggaran : null
  const sisaKas = uang.penerimaan != null && uang.pengeluaran != null ? uang.penerimaan - uang.pengeluaran : null
  const serapan = uang.anggaran > 0 && uang.pengeluaran != null ? (uang.pengeluaran / uang.anggaran) * 100 : null

  // Baris per bulan (hanya bulan yang ada transaksinya) + saldo kumulatif
  const barisBulan = useMemo(() => {
    let saldo = 0
    return uang.perBulan
      .map((b) => {
        saldo += b.penerimaan - b.pengeluaran
        return { ...b, saldo }
      })
      .filter((b) => b.penerimaan || b.pengeluaran)
  }, [uang.perBulan])

  // Rekap Buku Kerja Kepala Sekolah (hanya baris yang benar-benar terisi)
  const bk = useMemo(() => {
    const d = bukuKerja.data || {}
    // array biasa, atau objek berisi array (mis. per bulan)
    const daftar = (x) => (Array.isArray(x) ? x : Object.values(x || {}).flat())
    // baris dianggap terisi bila ada isian teks apa pun selain id
    const terisi = (r) =>
      r && typeof r === 'object' &&
      Object.entries(r).some(([k, v]) => k !== 'id' && typeof v === 'string' && v.trim())
    return {
      jurnal: daftar(d.jurnal).filter(terisi).length,
      program: daftar(d.program).filter((r) => r?.program?.trim()),
      pembinaan: daftar(d.pembinaan).filter(terisi).length,
      tahunAjaran: d.tahunAjaran || '',
    }
  }, [bukuKerja.data])

  const isiCapaian = () => {
    if (narasi.capaian.trim() && !window.confirm('Isian capaian yang sudah ada akan ditimpa. Lanjutkan?')) return
    setNarasi('capaian')(
      buatCapaian({ tahun, ks, bk, angka, uang, serapan, jumlahPrestasi: prestasi.filter((r) => r.nama?.trim()).length })
    )
  }

  return (
    <Layout title="Laporan Tahunan" subtitle="Disusun otomatis dari data administrasi yang sudah ada.">
      <style>{cssCetak('portrait')}</style>
      <style>{`
        @media print {
          /* Bagian panjang (mis. Visi-Misi) boleh terpotong antar halaman, supaya tidak meninggalkan celah kosong. */
          #area-cetak-adm [style*="break-inside"] { break-inside: auto !important; }
          #area-cetak-adm figure[style*="break-inside"] { break-inside: avoid !important; }
          #area-cetak-adm tr { break-inside: avoid; }
          #area-cetak-adm thead { display: table-header-group; }
          #area-cetak-adm h3 { break-after: avoid; }
        }
      `}</style>

      <KotakSimpan
        judul="Laporan Tahunan"
        status={dok.status}
        waktu={dok.waktu}
        memuat={dok.memuat}
        menyimpan={dok.menyimpan}
        pesan={dok.pesan}
        onSimpan={dok.simpan}
        disabled={!sekolahId}
      />

      <div className="no-print mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <Link to="/administrasi-kepsek" className="text-sm text-slate-600 hover:text-slate-900">← Kembali</Link>
        <label className="flex flex-col gap-1">
          Tahun laporan
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          >
            {[0, 1, 2, 3, 4].map((i) => {
              const t = new Date().getFullYear() - i
              return <option key={t} value={t}>{t}</option>
            })}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className={tombolKecil} onClick={() => { muat(); ks.muat() }}>
            <RefreshCw size={13} className={`mr-1 inline ${memuatAngka || ks.memuat ? 'animate-spin' : ''}`} /> Muat ulang angka
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
          >
            <Printer size={16} /> Cetak
          </button>
        </div>
      </div>

      <PanelOtomatis
        ks={ks}
        tahun={tahun}
        namaSekolah={namaSekolah}
        vm={vm}
        angka={angka}
        uang={uang}
        bk={bk}
        narasi={narasi}
        selisih={selisih}
        onTerapkan={(n) => setData((d) => ({ ...d, narasi: { ...(d.narasi || {}), [tahun]: n } }))}
      />

      <IsianTtd tempat={data.tempat} tanggal={data.tanggal} onTempat={set('tempat')} onTanggal={set('tanggal')} tempatBawaan={info.tempat} />

      <div id="area-cetak-adm" className="rounded-xl border border-slate-200 bg-white p-4 text-[13px] text-slate-900 sm:p-6">
        <KopSurat info={info} namaSekolah={namaSekolah} />

        <div className="mb-4 text-center">
          <p className="text-base font-bold uppercase underline underline-offset-4">Laporan Tahunan Kepala Sekolah</p>
          <p>Tahun {tahun}{vm?.tahun_ajaran ? ` (Tahun Ajaran ${vm.tahun_ajaran})` : ''}</p>
        </div>

        <div className="mb-3">
          <Baris label="Nama Sekolah" nilai={namaSekolah || '…………'} />
          <Baris label="Kepala Sekolah" nilai={info.kepalaNama || '…………'} />
          <Baris label="NIP" nilai={info.kepalaNip || '…………'} />
        </div>

        <Bagian huruf="A" judul="Pendahuluan">
          <Narasi nilai={narasi.pendahuluan} onUbah={setNarasi('pendahuluan')} label="Latar belakang dan tujuan laporan" />
        </Bagian>

        <Bagian huruf="B" judul="Visi, Misi, dan Tujuan Sekolah">
          {vm?.visi || vm?.misi?.length || vm?.tujuan?.length ? (
            <div className="space-y-2">
              {vm.motto && <p><b>Motto:</b> {vm.motto}</p>}
              {vm.visi && <p className="text-justify"><b>Visi:</b> {vm.visi}</p>}
              {vm.misi?.length > 0 && (
                <div><b>Misi:</b>
                  <ol className="list-decimal space-y-1 pl-6 text-justify">{vm.misi.map((m, i) => <li key={i}>{m}</li>)}</ol>
                </div>
              )}
              {vm.tujuan?.length > 0 && (
                <div><b>Tujuan:</b>
                  <ol className="list-decimal space-y-1 pl-6 text-justify">{vm.tujuan.map((m, i) => <li key={i}>{m}</li>)}</ol>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500">
              Belum diisi. Isi dulu di <Link to="/administrasi-kepsek/visi-misi" className="text-blue-700 underline">Visi, Misi, dan Tujuan</Link>.
            </p>
          )}
        </Bagian>

        <Bagian huruf="C" judul="Data Peserta Didik dan Pendidik">
          {ks.error && <p className="no-print mb-2 rounded bg-red-50 p-2 text-xs text-red-700">{ks.error}</p>}
          <TabelKeadaanMurid ks={ks} />
          <RekapGuru ks={ks} />
          <RekapDemografi ks={ks} />
        </Bagian>

        <Bagian huruf="D" judul="Pelaksanaan Tugas Kepala Sekolah">
          <p>
            Jurnal kegiatan harian terisi: <b>{bk.jurnal}</b> kegiatan. Pembinaan guru dan tenaga kependidikan tercatat: <b>{bk.pembinaan}</b> kali
            {bk.tahunAjaran ? ` (Tahun Ajaran ${bk.tahunAjaran})` : ''}.
          </p>
          {bk.program.length > 0 && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr><Th className="w-8">No</Th><Th>Bidang</Th><Th>Program / Kegiatan</Th><Th>Target</Th><Th className="w-28">Waktu</Th></tr></thead>
                <tbody>
                  {bk.program.map((r, i) => (
                    <tr key={i}><Td className="text-center">{i + 1}</Td><Td>{r.bidang}</Td><Td>{r.program}</Td><Td>{r.target}</Td><Td>{r.waktu}</Td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Bagian>

        <Bagian huruf="E" judul={`Rekap Administrasi Tahun ${tahun}`}>
          {galatAngka.length > 0 && (
            <div className="no-print mb-2 rounded bg-red-50 p-2 text-xs text-red-700">
              Sebagian data gagal dimuat (nama tabel/kolom, atau izin RLS):
              <ul className="list-disc pl-5">{galatAngka.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </div>
          )}
          <table className="w-full border-collapse">
            <thead><tr><Th className="w-8">No</Th><Th>Jenis</Th><Th className="w-28">Jumlah</Th></tr></thead>
            <tbody>
              {SUMBER.map((s, i) => (
                <tr key={s.id}><Td className="text-center">{i + 1}</Td><Td>{s.label}</Td><Td className="text-center">{angka[s.id] ?? '–'}</Td></tr>
              ))}
            </tbody>
          </table>
        </Bagian>

        <Bagian huruf="F" judul="Keuangan (ARKAS dan BKU)">
          {uang.error && <p className="no-print mb-2 rounded bg-red-50 p-2 text-xs text-red-700">Gagal memuat sebagian data keuangan. {uang.error}</p>}

          <table className="w-full border-collapse">
            <tbody>
              <tr><Td>Total anggaran RKAS/ARKAS tahun {tahun}</Td><Td className="text-right">{rupiah(uang.anggaran)}</Td></tr>
              <tr><Td>Realisasi penerimaan (BKU)</Td><Td className="text-right">{rupiah(uang.penerimaan)}</Td></tr>
              <tr><Td>Realisasi pengeluaran / belanja (BKU)</Td><Td className="text-right">{rupiah(uang.pengeluaran)}</Td></tr>
              <tr><Td>Sisa kas (penerimaan dikurangi pengeluaran)</Td><Td className="text-right">{rupiah(sisaKas)}</Td></tr>
              <tr><Td>Serapan anggaran (pengeluaran terhadap anggaran)</Td><Td className="text-right">{persen(serapan)}</Td></tr>
              <tr className="font-bold"><Td>Selisih penerimaan terhadap anggaran</Td><Td className="text-right">{rupiah(selisih)}</Td></tr>
            </tbody>
          </table>

          {uang.anggaran == null && (
            <p className="no-print mt-2 text-xs text-amber-700">
              Belum ada data ARKAS tahun {tahun}. Impor di menu Keuangan, tab ARKAS.
            </p>
          )}

          {barisBulan.length > 0 ? (
            <>
              <GrafikKeuangan data={uang.perBulan} />
              <div className="mt-3 overflow-x-auto" style={{ breakInside: 'avoid' }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr><Th className="w-8">No</Th><Th>Bulan</Th><Th>Penerimaan</Th><Th>Pengeluaran</Th><Th>Saldo Kumulatif</Th></tr>
                  </thead>
                  <tbody>
                    {barisBulan.map((b, i) => (
                      <tr key={b.bulan}>
                        <Td className="text-center">{i + 1}</Td>
                        <Td>{NAMA_BULAN[b.bulan - 1]}</Td>
                        <Td className="text-right">{rupiah(b.penerimaan)}</Td>
                        <Td className="text-right">{rupiah(b.pengeluaran)}</Td>
                        <Td className="text-right">{rupiah(b.saldo)}</Td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <Td className="text-center" colSpan={2}>Total</Td>
                      <Td className="text-right">{rupiah(uang.penerimaan)}</Td>
                      <Td className="text-right">{rupiah(uang.pengeluaran)}</Td>
                      <Td className="text-right">{rupiah(sisaKas)}</Td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="no-print mt-2 text-xs text-amber-700">
              Belum ada data BKU tahun {tahun}. Impor di menu Keuangan, tab BKU.
            </p>
          )}
        </Bagian>

        <Bagian huruf="G" judul="Capaian Program dan Prestasi">
          <div className="no-print mb-2">
            <button type="button" className={tombolKecil} onClick={isiCapaian}>Isi draf capaian dari data</button>
          </div>
          <p className="mb-1 font-semibold">1. Capaian Program</p>
          <Narasi nilai={narasi.capaian} onUbah={setNarasi('capaian')} label="Capaian program sekolah" baris={6} />
          <p className="mb-1 mt-3 font-semibold">2. Prestasi</p>
          <DaftarPrestasi rows={prestasi} onUbah={setPrestasi} />
        </Bagian>
        <Bagian huruf="H" judul="Kendala dan Hambatan">
          <Narasi nilai={narasi.kendala} onUbah={setNarasi('kendala')} label="Kendala yang dihadapi" />
        </Bagian>
        <Bagian huruf="I" judul="Tindak Lanjut dan Rencana Tahun Berikutnya">
          <Narasi nilai={narasi.tindak_lanjut} onUbah={setNarasi('tindak_lanjut')} label="Tindak lanjut" />
        </Bagian>

        <TandaTanganKepsek tempat={data.tempat || info.tempat} tanggal={data.tanggal} nama={info.kepalaNama} nip={info.kepalaNip} />
      </div>
    </Layout>
  )
}
