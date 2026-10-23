import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileBarChart, Printer, Save, RefreshCw, ArrowLeft } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

/*
  Laporan Tahunan Kepala Sekolah  ->  route: /administrasi-kepsek/laporan-tahunan

  Semua angka ditarik otomatis dari modul yang sudah ada. Nama tabel & kolom tanggal
  ada di SUMBER di bawah: SESUAIKAN dengan nama tabel di Supabase Anda. Tabel yang
  tidak ditemukan tidak membuat halaman error, hanya tampil "–".

  Bagian narasi (capaian, kendala, tindak lanjut) disimpan di tabel laporan_tahunan:

    create table if not exists laporan_tahunan (
      id uuid primary key default gen_random_uuid(),
      sekolah_id uuid not null,
      tahun int not null,
      isi jsonb not null default '{}',
      updated_at timestamptz default now(),
      unique (sekolah_id, tahun)
    );
    alter table laporan_tahunan enable row level security;
    create policy "laporan_tahunan tenant" on laporan_tahunan for all
      using (sekolah_id = (select sekolah_id from profil where id = auth.uid()))
      with check (sekolah_id = (select sekolah_id from profil where id = auth.uid()));
*/

// tgl: kolom tanggal untuk menyaring per tahun (null = jumlah saat ini, tanpa filter tahun)
const SUMBER = [
  { id: 'siswa', label: 'Peserta didik', tabel: 'siswa', tgl: null },
  { id: 'guru', label: 'Guru', tabel: 'guru', tgl: null },
  { id: 'mutasi', label: 'Mutasi siswa', tabel: 'mutasi_siswa', tgl: 'tanggal' },
  { id: 'tamu', label: 'Kunjungan tamu', tabel: 'buku_tamu', tgl: 'tanggal' },
  { id: 'surat_masuk', label: 'Surat masuk', tabel: 'surat_masuk', tgl: 'tanggal' },
  { id: 'surat_keluar', label: 'Surat keluar', tabel: 'surat_keluar', tgl: 'tanggal' },
  { id: 'inventaris', label: 'Barang inventaris', tabel: 'inventaris', tgl: null },
  { id: 'supervisi', label: 'Supervisi akademik', tabel: 'supervisi_akademik', tgl: 'tanggal' },
  { id: 'notulen', label: 'Rapat (notulen)', tabel: 'notulen_rapat', tgl: 'tanggal' },
  { id: 'laporan', label: 'Laporan bulanan', tabel: 'laporan_bulanan', tgl: 'tanggal' },
]

// Keuangan dari impor ARKAS. Kolom jumlah/tahun: sesuaikan bila berbeda.
const KEUANGAN = {
  anggaran: { tabel: 'arkas_anggaran', kolomJumlah: 'jumlah', kolomTahun: 'tahun' },
  penerimaan: { tabel: 'arkas_penerimaan', kolomJumlah: 'jumlah', kolomTahun: 'tahun' },
}

const rupiah = (n) =>
  n == null ? '–' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

async function hitung(s, sid, tahun) {
  let q = supabase.from(s.tabel).select('*', { count: 'exact', head: true })
  if (sid) q = q.eq('sekolah_id', sid)
  if (s.tgl) q = q.gte(s.tgl, `${tahun}-01-01`).lte(s.tgl, `${tahun}-12-31`)
  const { count, error } = await q
  return error ? null : count
}

async function jumlahkan(cfg, tahun) {
  // Tabel ARKAS memakai npsn, bukan sekolah_id; isolasi tenant ditangani RLS.
  const { data, error } = await supabase.from(cfg.tabel).select('*').eq(cfg.kolomTahun, tahun)
  if (error || !data) return null
  return data.reduce((t, r) => t + (Number(r[cfg.kolomJumlah]) || 0), 0)
}

const Judul = ({ huruf, children }) => (
  <h2 className="font-display text-base font-semibold text-slate-900 mt-6 mb-2 break-after-avoid">
    {huruf}. {children}
  </h2>
)

export default function LaporanTahunan() {
  const { profil } = useAuth()
  const sid = profil?.sekolah_id
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [sekolah, setSekolah] = useState(null)
  const [angka, setAngka] = useState({})
  const [sebaran, setSebaran] = useState([])
  const [uang, setUang] = useState({ anggaran: null, penerimaan: null })
  const [narasi, setNarasi] = useState({ pendahuluan: '', capaian: '', kendala: '', tindak_lanjut: '' })
  const [memuat, setMemuat] = useState(true)
  const [pesan, setPesan] = useState('')

  const muat = useCallback(async () => {
    if (!sid) return
    setMemuat(true)

    // Identitas, visi, misi, tujuan, moto (dibaca bila kolomnya ada di profil_sekolah)
    const { data: ps } = await supabase.from('profil_sekolah').select('*').eq('sekolah_id', sid).maybeSingle()
    setSekolah(ps || null)

    // Jumlah tiap modul secara paralel
    const hasil = await Promise.all(SUMBER.map((s) => hitung(s, sid, tahun)))
    setAngka(Object.fromEntries(SUMBER.map((s, i) => [s.id, hasil[i]])))

    // Sebaran siswa per kelas dan jenis kelamin
    const { data: sw } = await supabase.from('siswa').select('kelas, jenis_kelamin').eq('sekolah_id', sid)
    const peta = {}
    ;(sw || []).forEach((r) => {
      const k = r.kelas || 'Tanpa kelas'
      peta[k] = peta[k] || { kelas: k, L: 0, P: 0 }
      const jk = String(r.jenis_kelamin || '').trim().toUpperCase()[0]
      if (jk === 'L') peta[k].L++
      else if (jk === 'P') peta[k].P++
    })
    setSebaran(Object.values(peta).sort((a, b) => String(a.kelas).localeCompare(String(b.kelas), 'id', { numeric: true })))

    // Keuangan
    const [a, p] = await Promise.all([jumlahkan(KEUANGAN.anggaran, tahun), jumlahkan(KEUANGAN.penerimaan, tahun)])
    setUang({ anggaran: a, penerimaan: p })

    // Narasi tersimpan
    const { data: lt } = await supabase.from('laporan_tahunan').select('isi').eq('sekolah_id', sid).eq('tahun', tahun).maybeSingle()
    setNarasi({ pendahuluan: '', capaian: '', kendala: '', tindak_lanjut: '', ...(lt?.isi || {}) })

    setMemuat(false)
  }, [sid, tahun])

  useEffect(() => { muat() }, [muat])

  async function simpan() {
    const { error } = await supabase
      .from('laporan_tahunan')
      .upsert({ sekolah_id: sid, tahun, isi: narasi, updated_at: new Date().toISOString() }, { onConflict: 'sekolah_id,tahun' })
    setPesan(error ? 'Gagal menyimpan: ' + error.message : 'Tersimpan.')
    setTimeout(() => setPesan(''), 3000)
  }

  const totalSiswa = useMemo(() => sebaran.reduce((t, r) => t + r.L + r.P, 0), [sebaran])
  const nama = sekolah?.nama_sekolah || 'SD Negeri Waria'
  const sisa = uang.anggaran != null && uang.penerimaan != null ? uang.penerimaan - uang.anggaran : null

  const Isian = ({ k, label, baris = 4 }) => (
    <div className="mb-3">
      <label className="no-print block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <textarea
        rows={baris}
        value={narasi[k]}
        onChange={(e) => setNarasi({ ...narasi, [k]: e.target.value })}
        className="no-print w-full text-base sm:text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
        placeholder={label}
      />
      <p className="print-only hidden text-sm text-justify whitespace-pre-line">{narasi[k] || '-'}</p>
    </div>
  )

  return (
    <Layout title="Laporan Tahunan" subtitle="Disusun otomatis dari data modul administrasi yang sudah ada.">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          @page { size: A4; margin: 20mm; }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-center gap-2 mb-4">
        <Link to="/administrasi-kepsek" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Kembali
        </Link>
        <div className="flex-1" />
        <select
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value))}
          className="text-base sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white"
          aria-label="Tahun laporan"
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const t = new Date().getFullYear() - i
            return <option key={t} value={t}>{t}</option>
          })}
        </select>
        <button onClick={muat} className="inline-flex items-center gap-1.5 text-sm border border-slate-200 bg-white rounded-xl px-3 py-2 hover:bg-slate-50">
          <RefreshCw size={15} className={memuat ? 'animate-spin' : ''} /> Muat ulang
        </button>
        <button onClick={simpan} className="inline-flex items-center gap-1.5 text-sm bg-blue-900 text-white rounded-xl px-3 py-2 hover:bg-blue-950">
          <Save size={15} /> Simpan narasi
        </button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-sm bg-emerald-600 text-white rounded-xl px-3 py-2 hover:bg-emerald-700">
          <Printer size={15} /> Cetak
        </button>
      </div>
      {pesan && <p className="no-print text-sm text-emerald-700 mb-2">{pesan}</p>}

      <article className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 text-slate-800">
        <header className="text-center border-b-2 border-slate-800 pb-3 mb-4">
          <FileBarChart className="no-print mx-auto mb-1 text-blue-900" size={24} />
          <h1 className="font-display text-lg font-bold uppercase">Laporan Tahunan Kepala Sekolah</h1>
          <p className="font-semibold uppercase">{nama}</p>
          <p className="text-sm">Tahun {tahun}</p>
        </header>

        <Judul huruf="A">Pendahuluan</Judul>
        <Isian k="pendahuluan" label="Latar belakang dan tujuan laporan" />

        <Judul huruf="B">Visi, Misi, dan Tujuan Sekolah</Judul>
        {sekolah?.visi || sekolah?.misi || sekolah?.tujuan ? (
          <div className="text-sm space-y-2">
            {sekolah.moto && <p><b>Moto:</b> {sekolah.moto}</p>}
            {sekolah.visi && <p><b>Visi:</b> {sekolah.visi}</p>}
            {sekolah.misi && <div><b>Misi:</b><p className="whitespace-pre-line">{sekolah.misi}</p></div>}
            {sekolah.tujuan && <div><b>Tujuan:</b><p className="whitespace-pre-line">{sekolah.tujuan}</p></div>}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Isi visi, misi, dan tujuan belum terbaca dari profil_sekolah. Sesuaikan nama kolomnya (visi, misi, tujuan, moto) atau
            tabel tempat laman Visi, Misi, dan Tujuan menyimpan datanya.
          </p>
        )}

        <Judul huruf="C">Data Peserta Didik dan Pendidik</Judul>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 px-2 py-1 text-left">Kelas</th>
                <th className="border border-slate-300 px-2 py-1">Laki-laki</th>
                <th className="border border-slate-300 px-2 py-1">Perempuan</th>
                <th className="border border-slate-300 px-2 py-1">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {sebaran.map((r) => (
                <tr key={r.kelas}>
                  <td className="border border-slate-300 px-2 py-1">{r.kelas}</td>
                  <td className="border border-slate-300 px-2 py-1 text-center">{r.L}</td>
                  <td className="border border-slate-300 px-2 py-1 text-center">{r.P}</td>
                  <td className="border border-slate-300 px-2 py-1 text-center">{r.L + r.P}</td>
                </tr>
              ))}
              <tr className="font-semibold bg-slate-50">
                <td className="border border-slate-300 px-2 py-1">Total</td>
                <td className="border border-slate-300 px-2 py-1 text-center">{sebaran.reduce((t, r) => t + r.L, 0)}</td>
                <td className="border border-slate-300 px-2 py-1 text-center">{sebaran.reduce((t, r) => t + r.P, 0)}</td>
                <td className="border border-slate-300 px-2 py-1 text-center">{totalSiswa}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm mt-2">Jumlah guru terdata: <b>{angka.guru ?? '–'}</b> orang.</p>

        <Judul huruf="D">Rekap Kegiatan Administrasi {tahun}</Judul>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUMBER.filter((s) => !['siswa', 'guru'].includes(s.id)).map((s) => (
            <div key={s.id} className="border border-slate-200 rounded-xl p-3">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="font-display text-xl font-semibold">{angka[s.id] ?? '–'}</p>
            </div>
          ))}
        </div>

        <Judul huruf="E">Keuangan</Judul>
        <table className="w-full text-sm border border-slate-300">
          <tbody>
            <tr><td className="border border-slate-300 px-2 py-1">Total anggaran (RKAS/ARKAS)</td><td className="border border-slate-300 px-2 py-1 text-right">{rupiah(uang.anggaran)}</td></tr>
            <tr><td className="border border-slate-300 px-2 py-1">Total penerimaan</td><td className="border border-slate-300 px-2 py-1 text-right">{rupiah(uang.penerimaan)}</td></tr>
            <tr className="font-semibold bg-slate-50"><td className="border border-slate-300 px-2 py-1">Selisih penerimaan terhadap anggaran</td><td className="border border-slate-300 px-2 py-1 text-right">{rupiah(sisa)}</td></tr>
          </tbody>
        </table>

        <Judul huruf="F">Capaian Program</Judul>
        <Isian k="capaian" label="Capaian program dan prestasi sekolah" baris={6} />

        <Judul huruf="G">Kendala dan Hambatan</Judul>
        <Isian k="kendala" label="Kendala yang dihadapi" />

        <Judul huruf="H">Tindak Lanjut dan Rencana Tahun Berikutnya</Judul>
        <Isian k="tindak_lanjut" label="Tindak lanjut" />

        <footer className="mt-8 grid grid-cols-2 text-sm text-center break-inside-avoid">
          <div>Mengetahui,<br />Komite Sekolah<br /><br /><br /><br />(......................................)</div>
          <div>Kepala {nama}<br /><br /><br /><br /><br />(......................................)<br />NIP. ..........................</div>
        </footer>
      </article>
    </Layout>
  )
}
