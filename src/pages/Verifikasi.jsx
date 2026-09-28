import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ShieldCheck, ShieldAlert, ShieldX, Search, Copy, Check, Printer, Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase' // sesuaikan path client Supabase Anda

// Halaman PUBLIK (tanpa login). Daftarkan di App.jsx di luar route yang butuh auth:
//   <Route path="/verifikasi-dokumen/:kode?" element={<Verifikasi />} />

const NAMA_MODUL = {
  sekolah: 'Sekolah',
  kua: 'Kantor Urusan Agama',
  puskesmas: 'Puskesmas',
  umum: 'Umum',
}

const STATUS = {
  aktif: {
    ikon: ShieldCheck,
    judul: 'Dokumen sah',
    teks: 'Dokumen ini tercatat dan diterbitkan melalui aplikasi.',
    warna: 'border-emerald-700 text-emerald-800 bg-emerald-50',
  },
  diganti: {
    ikon: ShieldAlert,
    judul: 'Dokumen sudah diganti',
    teks: 'Dokumen ini pernah sah, tetapi sudah digantikan oleh dokumen lain.',
    warna: 'border-amber-600 text-amber-800 bg-amber-50',
  },
  dicabut: {
    ikon: ShieldX,
    judul: 'Dokumen dicabut',
    teks: 'Dokumen ini sudah dicabut dan tidak berlaku.',
    warna: 'border-red-700 text-red-800 bg-red-50',
  },
}

const bersihkanKode = (v) => (v || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
const tampilkanKode = (v) => bersihkanKode(v).replace(/(.{4})(?=.)/g, '$1-')
const formatTanggal = (iso) =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })

export default function Verifikasi() {
  const { kode } = useParams()
  const navigate = useNavigate()
  const [input, setInput] = useState(tampilkanKode(kode))
  const [fase, setFase] = useState(kode ? 'memuat' : 'kosong') // kosong | memuat | ada | tidakAda | gagal
  const [data, setData] = useState(null)
  const [tersalin, setTersalin] = useState(false)

  useEffect(() => {
    const k = bersihkanKode(kode)
    setInput(tampilkanKode(k))
    if (!k) {
      setFase('kosong')
      setData(null)
      return
    }
    let batal = false
    setFase('memuat')
    ;(async () => {
      const { data: baris, error } = await supabase.rpc('verifikasi_dokumen', { p_kode: k })
      if (batal) return
      if (error) {
        setFase('gagal')
        return
      }
      const hasil = Array.isArray(baris) ? baris[0] : baris
      setData(hasil || null)
      setFase(hasil ? 'ada' : 'tidakAda')
    })()
    return () => {
      batal = true
    }
  }, [kode])

  const cari = (e) => {
    e.preventDefault()
    const k = bersihkanKode(input)
    if (k) navigate(`/verifikasi-dokumen/${k}`)
  }

  const salinLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setTersalin(true)
      setTimeout(() => setTersalin(false), 2000)
    } catch {
      /* clipboard tidak tersedia */
    }
  }

  const st = data ? STATUS[data.status] || STATUS.aktif : null
  const Ikon = st?.ikon

  return (
    <main className="min-h-screen bg-paper text-ink-950 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Verifikasi dokumen</h1>
        <p className="mt-2 text-ink-950/70">
          Masukkan kode yang tercetak pada dokumen, atau pindai kode QR di dokumen.
        </p>

        <form onSubmit={cari} className="mt-6 flex gap-2 print:hidden">
          <label htmlFor="kode-dokumen" className="sr-only">Kode dokumen</label>
          <input
            id="kode-dokumen"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-md border border-ink-950/30 bg-white px-3 py-2.5 font-mono tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c2e]"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-ink-950 px-4 py-2.5 font-medium text-paper hover:bg-ink-950/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c2e] focus-visible:ring-offset-2"
          >
            <Search size={18} aria-hidden="true" />
            Periksa
          </button>
        </form>

        <div className="mt-8" aria-live="polite">
          {fase === 'memuat' && (
            <p className="flex items-center gap-2 text-ink-950/70">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Memeriksa dokumen…
            </p>
          )}

          {fase === 'tidakAda' && (
            <div className="rounded-md border-l-4 border-red-700 bg-red-50 p-4 text-red-900">
              <p className="font-semibold">Kode tidak ditemukan</p>
              <p className="mt-1 text-sm">
                Periksa kembali kode pada dokumen. Dokumen tanpa kode yang valid tidak dapat
                dianggap sebagai dokumen resmi dari aplikasi ini.
              </p>
            </div>
          )}

          {fase === 'gagal' && (
            <div className="rounded-md border-l-4 border-amber-600 bg-amber-50 p-4 text-amber-900">
              <p className="font-semibold">Verifikasi belum berhasil</p>
              <p className="mt-1 text-sm">Sambungan bermasalah. Coba muat ulang halaman beberapa saat lagi.</p>
            </div>
          )}

          {fase === 'ada' && data && (
            <section className="rounded-md border border-ink-950/15 bg-white">
              <div className={`flex items-start gap-3 border-l-4 p-4 ${st.warna}`}>
                <Ikon size={28} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="text-lg font-semibold">{st.judul}</h2>
                  <p className="text-sm">{st.teks}</p>
                </div>
              </div>

              <dl className="divide-y divide-ink-950/10 px-4">
                <Baris label="Jenis dokumen" nilai={data.jenis} />
                {data.judul && <Baris label="Judul / nomor" nilai={data.judul} />}
                <Baris label="Penerbit" nilai={data.instansi_nama || '—'} />
                <Baris label="Bidang" nilai={NAMA_MODUL[data.modul] || data.modul} />
                <Baris label="Diterbitkan" nilai={formatTanggal(data.dibuat_pada)} />
                <Baris label="Kode" nilai={tampilkanKode(kode)} mono />
                {data.status !== 'aktif' && data.alasan_status && (
                  <Baris label="Keterangan" nilai={data.alasan_status} />
                )}
                {data.status === 'diganti' && data.digantikan_oleh_kode && (
                  <div className="py-3 print:hidden">
                    <dt className="text-sm text-ink-950/60">Dokumen pengganti</dt>
                    <dd>
                      <button
                        type="button"
                        onClick={() => navigate(`/verifikasi-dokumen/${data.digantikan_oleh_kode}`)}
                        className="font-mono tracking-wider text-[#8a6620] underline underline-offset-2 hover:text-ink-950"
                      >
                        {tampilkanKode(data.digantikan_oleh_kode)}
                      </button>
                    </dd>
                  </div>
                )}
              </dl>

              <div className="flex flex-wrap gap-2 border-t border-ink-950/10 p-4 print:hidden">
                <button
                  type="button"
                  onClick={salinLink}
                  className="inline-flex items-center gap-2 rounded-md border border-ink-950/30 px-3 py-2 text-sm hover:bg-ink-950/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c2e]"
                >
                  {tersalin ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                  {tersalin ? 'Link tersalin' : 'Salin link'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-md border border-ink-950/30 px-3 py-2 text-sm hover:bg-ink-950/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c2e]"
                >
                  <Printer size={16} aria-hidden="true" />
                  Cetak halaman ini
                </button>
              </div>
            </section>
          )}
        </div>

        <p className="mt-8 text-xs text-ink-950/60">
          Halaman ini hanya menampilkan informasi umum dokumen. Isi dan data pribadi di dalam
          dokumen tidak ditampilkan.
        </p>
      </div>
    </main>
  )
}

function Baris({ label, nilai, mono = false }) {
  return (
    <div className="py-3">
      <dt className="text-sm text-ink-950/60">{label}</dt>
      <dd className={mono ? 'font-mono tracking-wider' : ''}>{nilai}</dd>
    </div>
  )
}
