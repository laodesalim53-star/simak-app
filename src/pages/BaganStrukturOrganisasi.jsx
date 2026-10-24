import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2, Users } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

/*
  Bagan Struktur Organisasi (hanya lihat & cetak).
  Data diambil dari tabel `profil` milik sekolah yang sama (akun aktif):
    - jabatan 'kepala_sekolah'            -> puncak bagan
    - jabatan/role 'guru'                 -> cabang Dewan Guru
    - akun lain (admin, pegawai, dll)     -> cabang Tenaga Kependidikan
  Akun orang tua dan superadmin tidak ditampilkan.
  Foto memakai kolom foto_profil_path (bucket "foto-profil"), sama seperti Sidebar.
*/

const WARNA = {
  aksen: '#1e3a8a',
  emas: '#c9a227',
  garis: '#94a3b8',
}

function getFotoUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('foto-profil').getPublicUrl(path)
  return data?.publicUrl || null
}

function getInisial(nama) {
  if (!nama) return '?'
  const kata = nama.trim().split(/\s+/)
  const ini = kata.length > 1 ? kata[0][0] + kata[1][0] : kata[0].slice(0, 2)
  return ini.toUpperCase()
}

function rapikanJabatan(jabatan) {
  if (!jabatan || jabatan === 'pegawai') return 'Tenaga Kependidikan'
  return jabatan
    .split('_')
    .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
    .join(' ')
}

function Foto({ nama, path, ukuran = 64, cincin = WARNA.garis }) {
  const url = getFotoUrl(path)
  const gaya = {
    width: ukuran,
    height: ukuran,
    borderRadius: '50%',
    border: `3px solid ${cincin}`,
    flexShrink: 0,
  }
  if (url) {
    return <img src={url} alt={nama} style={{ ...gaya, objectFit: 'cover' }} />
  }
  return (
    <div
      style={{
        ...gaya,
        background: WARNA.aksen,
        color: '#fff',
        fontWeight: 700,
        fontSize: ukuran * 0.34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {getInisial(nama)}
    </div>
  )
}

function KartuOrang({ orang, besar = false }) {
  return (
    <div
      className="flex flex-col items-center text-center bg-white rounded-xl border border-slate-200 px-3 py-3"
      style={{
        breakInside: 'avoid',
        width: besar ? 220 : '100%',
        borderTop: `4px solid ${besar ? WARNA.emas : WARNA.aksen}`,
      }}
    >
      <Foto nama={orang.nama_lengkap} path={orang.foto_profil_path} ukuran={besar ? 92 : 64} cincin={besar ? WARNA.emas : WARNA.garis} />
      <p className={`mt-2 font-semibold text-slate-900 leading-tight ${besar ? 'text-base' : 'text-[13px]'}`}>
        {orang.nama_lengkap || 'Tanpa nama'}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{orang.labelJabatan}</p>
    </div>
  )
}

function GarisTegak({ tinggi = 24 }) {
  return <div style={{ width: 2, height: tinggi, background: WARNA.garis, margin: '0 auto' }} />
}

function Cabang({ judul, daftar }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center">
      <GarisTegak tinggi={20} />
      <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3" style={{ breakInside: 'avoid' }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <Users size={15} color={WARNA.aksen} />
          <h3 className="text-sm font-bold text-blue-900">{judul}</h3>
          <span className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-full px-2 py-0.5">
            {daftar.length}
          </span>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4">
          {daftar.map((o) => (
            <KartuOrang key={o.id} orang={o} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BaganStrukturOrganisasi() {
  const { profil } = useAuth()
  const sekolahId = profil?.sekolah_id

  const [sekolah, setSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [orang, setOrang] = useState([])
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState('')

  useEffect(() => {
    if (!sekolahId) return
    let batal = false
    async function muat() {
      setLoading(true)
      setGalat('')
      const [pr, ps] = await Promise.all([
        supabase
          .from('profil')
          .select('id, nama_lengkap, jabatan, role, foto_profil_path, status_akun')
          .eq('sekolah_id', sekolahId)
          .eq('status_akun', 'aktif'),
        supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
      ])
      if (batal) return
      if (ps.data) {
        setSekolah({ nama: ps.data.nama_sekolah, alamat: ps.data.alamat })
        if (ps.data.logo_path) {
          const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(ps.data.logo_path)
          setLogoUrl(pub.publicUrl)
        }
      }
      if (pr.error) {
        setGalat(`Data tidak bisa dimuat: ${pr.error.message}`)
        setOrang([])
      } else {
        setOrang(pr.data || [])
      }
      setLoading(false)
    }
    muat()
    return () => {
      batal = true
    }
  }, [sekolahId])

  const { kepala, tendik, guru } = useMemo(() => {
    const urut = (a, b) => (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '', 'id')
    const layak = orang
      .filter((o) => o.role !== 'orang_tua' && o.role !== 'superadmin')
      .map((o) => ({ ...o, labelJabatan: rapikanJabatan(o.jabatan) }))
    const kepala = layak
      .filter((o) => o.jabatan === 'kepala_sekolah')
      .map((o) => ({ ...o, labelJabatan: 'Kepala Sekolah' }))
    const guru = layak
      .filter((o) => o.jabatan !== 'kepala_sekolah' && (o.jabatan === 'guru' || o.role === 'guru'))
      .map((o) => ({ ...o, labelJabatan: 'Guru' }))
      .sort(urut)
    const idDipakai = new Set([...kepala, ...guru].map((o) => o.id))
    const tendik = layak.filter((o) => !idDipakai.has(o.id)).sort(urut)
    return { kepala, tendik, guru }
  }, [orang])

  const adaData = kepala.length + tendik.length + guru.length > 0

  return (
    <Layout title="Bagan Struktur Organisasi" subtitle="Susunan kepala sekolah, tenaga kependidikan, dan guru.">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body * { visibility: hidden; }
          #area-bagan, #area-bagan * { visibility: visible; }
          #area-bagan {
            position: absolute; left: 0; top: 0; width: 100%;
            box-shadow: none !important; border-radius: 0 !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="max-w-6xl mx-auto p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} /> Dasbor
          </Link>
          <button
            onClick={() => window.print()}
            disabled={!adaData}
            className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Printer size={16} /> Cetak
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 py-10">
            <Loader2 className="animate-spin" size={18} /> Memuat data…
          </div>
        )}

        {!loading && galat && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{galat}</p>
        )}

        {!loading && !galat && !adaData && (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-6 text-center">
            Belum ada akun aktif di sekolah ini yang bisa ditampilkan dalam bagan.
          </p>
        )}

        {!loading && adaData && (
          <div
            id="area-bagan"
            className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {/* Kepala dokumen */}
            <div className="text-center mb-5">
              {logoUrl && (
                <img src={logoUrl} alt="Logo sekolah" style={{ height: 60, width: 'auto', margin: '0 auto 6px', objectFit: 'contain' }} />
              )}
              <p className="text-xs font-semibold text-slate-500 tracking-wide">Bagan Struktur Organisasi</p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-blue-900">{sekolah?.nama || 'Nama Sekolah'}</h2>
              {sekolah?.alamat && <p className="text-xs text-slate-500">{sekolah.alamat}</p>}
            </div>

            {/* Puncak: kepala sekolah */}
            <div className="flex flex-wrap justify-center gap-4">
              {kepala.length > 0 ? (
                kepala.map((o) => <KartuOrang key={o.id} orang={o} besar />)
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 px-6 py-5 text-center">
                  Akun Kepala Sekolah belum terdaftar
                </div>
              )}
            </div>

            {/* Cabang */}
            {(tendik.length > 0 || guru.length > 0) && (
              <>
                <GarisTegak tinggi={20} />
                {tendik.length > 0 && guru.length > 0 && (
                  <div className="hidden lg:block" style={{ height: 2, background: WARNA.garis, margin: '0 25%' }} />
                )}
                <div className="flex flex-col lg:flex-row gap-0 lg:gap-4">
                  {tendik.length > 0 && <Cabang judul="Tenaga Kependidikan" daftar={tendik} />}
                  {guru.length > 0 && <Cabang judul="Dewan Guru" daftar={guru} />}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
