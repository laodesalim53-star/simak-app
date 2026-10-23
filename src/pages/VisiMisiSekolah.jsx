import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Printer, Loader2 } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const KOSONG = {
  visi: '',
  motto: '',
  misi: [''],
  tujuan: [''],
  kepala_sekolah: '',
  nip_kepala: '',
  tahun_ajaran: '',
}

// Tema kertas untuk hasil cetak. Warna dipakai lewat inline style agar ikut tercetak.
const TEMA = {
  klasik: {
    nama: 'Klasik Emas',
    kertas: '#fbf6e9',
    kertasDalam: '#fffdf6',
    aksen: '#8a6508',
    garis: '#b8860b',
    tinta: '#2b2417',
    redup: '#6b5a33',
    kotak: '#f6ecce',
    batik: '#b8860b',
    batikOpacity: 0.16,
  },
  batik: {
    nama: 'Biru Batik',
    kertas: '#eef3fb',
    kertasDalam: '#fbfdff',
    aksen: '#1e3a8a',
    garis: '#c9a227',
    tinta: '#0f1d3d',
    redup: '#475a85',
    kotak: '#e1eaf8',
    batik: '#c9a227',
    batikOpacity: 0.28,
  },
  hijau: {
    nama: 'Hijau Daun',
    kertas: '#eef7ee',
    kertasDalam: '#fbfffb',
    aksen: '#166534',
    garis: '#4d9a63',
    tinta: '#10261a',
    redup: '#44624d',
    kotak: '#dcefdf',
    batik: '#4d9a63',
    batikOpacity: 0.2,
  },
}

function BatikOverlay({ patternId, warna, opacity = 1, size = 72 }) {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id={patternId} x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
          <g fill="none" stroke={warna} strokeWidth="1.1" opacity={opacity}>
            <ellipse cx={size / 2} cy={size * 0.333} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size / 2} cy={size * 0.667} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size * 0.333} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <ellipse cx={size * 0.667} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <circle cx={size / 2} cy={size / 2} r={size * 0.042} opacity="0.7" />
          </g>
          <circle cx={size * 0.11} cy={size * 0.11} r="1.3" fill={warna} opacity={opacity * 0.4} />
          <circle cx={size * 0.89} cy={size * 0.22} r="1.3" fill={warna} opacity={opacity * 0.4} />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

function Sudut({ warna, posisi }) {
  const putar = { 'kiri-atas': 0, 'kanan-atas': 90, 'kanan-bawah': 180, 'kiri-bawah': 270 }[posisi]
  const letak = {
    'kiri-atas': { top: 10, left: 10 },
    'kanan-atas': { top: 10, right: 10 },
    'kanan-bawah': { bottom: 10, right: 10 },
    'kiri-bawah': { bottom: 10, left: 10 },
  }[posisi]
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      stroke={warna}
      strokeWidth="1.6"
      style={{ position: 'absolute', transform: `rotate(${putar}deg)`, ...letak }}
      aria-hidden="true"
    >
      <path d="M2 54 V14 Q2 2 14 2 H54" />
      <path d="M10 54 V20 Q10 10 20 10 H54" opacity="0.5" />
      <circle cx="14" cy="14" r="3.2" fill={warna} stroke="none" />
    </svg>
  )
}

function Pemisah({ warna }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px auto', width: '70%' }}>
      <div style={{ flex: 1, height: 1, background: warna, opacity: 0.6 }} />
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" transform="rotate(45 7 7)" fill={warna} />
      </svg>
      <div style={{ flex: 1, height: 1, background: warna, opacity: 0.6 }} />
    </div>
  )
}

function JudulBagian({ huruf, teks, t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 10px' }}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          background: t.aksen,
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {huruf}
      </span>
      <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15, letterSpacing: '0.12em', color: t.aksen, textTransform: 'uppercase' }}>
        {teks}
      </h3>
      <div style={{ flex: 1, height: 1, background: t.garis, opacity: 0.5 }} />
    </div>
  )
}

function DaftarBernomor({ items, t }) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((m, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, breakInside: 'avoid' }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: `1.5px solid ${t.aksen}`,
              color: t.aksen,
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            {i + 1}
          </span>
          <span style={{ textAlign: 'justify', color: t.tinta }}>{m}</span>
        </li>
      ))}
    </ol>
  )
}

function ListEditor({ label, hint, items, onChange }) {
  const ubah = (i, v) => onChange(items.map((x, idx) => (idx === i ? v : x)))
  const hapus = (i) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-semibold text-slate-800">{label}</label>
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:text-blue-950"
        >
          <Plus size={14} /> Tambah
        </button>
      </div>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
      <div className="space-y-2">
        {items.map((v, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="mt-2 w-5 text-sm text-slate-500 text-right shrink-0">{i + 1}.</span>
            <textarea
              rows={2}
              value={v}
              onChange={(e) => ubah(i, e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              type="button"
              onClick={() => hapus(i)}
              disabled={items.length === 1}
              className="mt-1 p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30"
              aria-label={`Hapus ${label} nomor ${i + 1}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function VisiMisiSekolah() {
  const { profil } = useAuth()
  const sekolahId = profil?.sekolah_id

  const [form, setForm] = useState(KOSONG)
  const [sekolah, setSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [tema, setTema] = useState('klasik')
  const [tab, setTab] = useState('isi')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pesan, setPesan] = useState(null)

  useEffect(() => {
    if (!sekolahId) return
    let batal = false
    async function muat() {
      setLoading(true)
      const [vm, ps] = await Promise.all([
        supabase.from('visi_misi_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
        supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
      ])
      if (batal) return
      if (ps.data) {
        setSekolah({ nama: ps.data.nama_sekolah, alamat: ps.data.alamat, kota: ps.data.kabupaten })
        if (ps.data.logo_path) {
          const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(ps.data.logo_path)
          setLogoUrl(pub.publicUrl)
        }
      }
      if (vm.data) {
        setForm({
          ...KOSONG,
          ...vm.data,
          misi: vm.data.misi?.length ? vm.data.misi : [''],
          tujuan: vm.data.tujuan?.length ? vm.data.tujuan : [''],
        })
      } else {
        const now = new Date()
        const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
        setForm({ ...KOSONG, tahun_ajaran: `${y}/${y + 1}` })
      }
      setLoading(false)
    }
    muat()
    return () => {
      batal = true
    }
  }, [sekolahId])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function simpan() {
    setSaving(true)
    setPesan(null)
    const payload = {
      sekolah_id: sekolahId,
      visi: form.visi,
      motto: form.motto,
      misi: form.misi.map((s) => s.trim()).filter(Boolean),
      tujuan: form.tujuan.map((s) => s.trim()).filter(Boolean),
      kepala_sekolah: form.kepala_sekolah,
      nip_kepala: form.nip_kepala,
      tahun_ajaran: form.tahun_ajaran,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('visi_misi_sekolah')
      .upsert(payload, { onConflict: 'sekolah_id' })
    setSaving(false)
    setPesan(error ? { ok: false, teks: `Gagal menyimpan: ${error.message}` } : { ok: true, teks: 'Tersimpan.' })
  }

  const misi = form.misi.filter((s) => s.trim())
  const tujuan = form.tujuan.filter((s) => s.trim())
  const t = TEMA[tema]

  return (
    <Layout
      title="Visi, Misi, dan Tujuan Sekolah"
      subtitle="Isi sekali, lalu cetak sebagai dokumen resmi sekolah."
    >
      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          body * { visibility: hidden; }
          #area-cetak, #area-cetak * { visibility: visible; }
          #area-cetak {
            position: absolute; left: 0; top: 0; width: 100%;
            box-shadow: none !important; border-radius: 0 !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto p-4 print:hidden">
        <Link to="/administrasi-kepsek" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-3">
          <ArrowLeft size={16} /> Administrasi Kepala Sekolah
        </Link>

        <div className="flex gap-2 mb-4">
          {[
            ['isi', 'Isi Dokumen'],
            ['cetak', 'Pratinjau & Cetak'],
          ].map(([k, tt]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                tab === k ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tt}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 py-10">
            <Loader2 className="animate-spin" size={18} /> Memuat data…
          </div>
        )}

        {!loading && tab === 'isi' && (
          <div className="space-y-5 bg-white border border-slate-200 rounded-2xl p-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-800">Tahun ajaran</label>
                <input
                  value={form.tahun_ajaran}
                  onChange={(e) => set('tahun_ajaran', e.target.value)}
                  placeholder="2026/2027"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-800">Motto sekolah (opsional)</label>
                <input
                  value={form.motto}
                  onChange={(e) => set('motto', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">Visi</label>
              <p className="text-xs text-slate-500 mb-1">Satu kalimat tentang sekolah yang dicita-citakan. Tidak perlu memakai tanda kutip.</p>
              <textarea
                rows={3}
                value={form.visi}
                onChange={(e) => set('visi', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <ListEditor
              label="Misi"
              hint="Langkah-langkah untuk mewujudkan visi. Satu poin per kolom."
              items={form.misi}
              onChange={(v) => set('misi', v)}
            />
            <ListEditor
              label="Tujuan sekolah"
              hint="Hasil yang ingin dicapai dalam periode tertentu, sebaiknya terukur."
              items={form.tujuan}
              onChange={(v) => set('tujuan', v)}
            />

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-800">Nama kepala sekolah</label>
                <input
                  value={form.kepala_sekolah}
                  onChange={(e) => set('kepala_sekolah', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-800">NIP kepala sekolah</label>
                <input
                  value={form.nip_kepala}
                  onChange={(e) => set('nip_kepala', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={simpan}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan
              </button>
              {pesan && (
                <span className={`text-sm ${pesan.ok ? 'text-green-700' : 'text-red-600'}`}>{pesan.teks}</span>
              )}
            </div>
          </div>
        )}

        {!loading && tab === 'cetak' && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Printer size={16} /> Cetak
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Tema kertas:</span>
              {Object.entries(TEMA).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTema(k)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    tema === k ? 'border-blue-900 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: v.aksen, display: 'inline-block' }} />
                  {v.nama}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!loading && tab === 'cetak' && (
        <div className="max-w-3xl mx-auto px-4 pb-10">
          <div
            id="area-cetak"
            style={{
              position: 'relative',
              background: t.kertas,
              color: t.tinta,
              borderRadius: 16,
              padding: 14,
              lineHeight: 1.6,
              fontSize: 14,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            {/* Bingkai ganda */}
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                border: `4px double ${t.garis}`,
                background: t.kertasDalam,
                padding: '44px 48px 40px',
              }}
            >
              <BatikOverlay patternId={`batikVisiMisi-${tema}`} warna={t.batik} opacity={t.batikOpacity} />
              <Sudut warna={t.garis} posisi="kiri-atas" />
              <Sudut warna={t.garis} posisi="kanan-atas" />
              <Sudut warna={t.garis} posisi="kanan-bawah" />
              <Sudut warna={t.garis} posisi="kiri-bawah" />

              <div style={{ position: 'relative' }}>
                {/* Kepala dokumen */}
                <div style={{ textAlign: 'center' }}>
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="Logo sekolah"
                      style={{ height: 72, width: 'auto', objectFit: 'contain', margin: '0 auto 8px', display: 'block' }}
                    />
                  )}
                  <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.35em', color: t.redup, fontWeight: 600 }}>
                    VISI, MISI, DAN TUJUAN
                  </p>
                  <h2 style={{ margin: '4px 0 2px', fontSize: 24, fontWeight: 800, color: t.aksen, letterSpacing: '0.04em' }}>
                    {sekolah?.nama || 'NAMA SEKOLAH'}
                  </h2>
                  {sekolah?.alamat && <p style={{ margin: 0, fontSize: 11, color: t.redup }}>{sekolah.alamat}</p>}
                  {form.tahun_ajaran && (
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: t.redup }}>Tahun Ajaran {form.tahun_ajaran}</p>
                  )}
                  <Pemisah warna={t.garis} />
                </div>

                {/* Visi */}
                <JudulBagian huruf="A" teks="Visi" t={t} />
                <div
                  style={{
                    background: t.kotak,
                    borderLeft: `5px solid ${t.aksen}`,
                    borderRadius: 6,
                    padding: '14px 18px',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: -6,
                      left: 10,
                      fontSize: 40,
                      lineHeight: 1,
                      color: t.garis,
                      opacity: 0.5,
                      fontFamily: 'Georgia, serif',
                    }}
                  >
                    “
                  </span>
                  <p style={{ margin: 0, fontStyle: 'italic', fontSize: 15, textAlign: 'center', color: t.tinta }}>
                    {form.visi || '—'}
                  </p>
                </div>
                {form.motto && (
                  <p style={{ textAlign: 'center', margin: '12px 0 0', fontWeight: 700, color: t.aksen, letterSpacing: '0.06em' }}>
                    ✦ {form.motto} ✦
                  </p>
                )}

                {/* Misi */}
                <JudulBagian huruf="B" teks="Misi" t={t} />
                {misi.length ? <DaftarBernomor items={misi} t={t} /> : <p style={{ margin: 0 }}>—</p>}

                {/* Tujuan */}
                <JudulBagian huruf="C" teks="Tujuan Sekolah" t={t} />
                {tujuan.length ? <DaftarBernomor items={tujuan} t={t} /> : <p style={{ margin: 0 }}>—</p>}

                {/* Tanda tangan */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28, breakInside: 'avoid' }}>
                  <div style={{ textAlign: 'center', minWidth: 230, fontSize: 13 }}>
                    <p style={{ margin: 0 }}>{sekolah?.kota ? `${sekolah.kota}, ` : ''}……………………</p>
                    <p style={{ margin: 0 }}>Kepala Sekolah,</p>
                    <div style={{ height: 72 }} />
                    <p style={{ margin: 0, fontWeight: 700, textDecoration: 'underline' }}>
                      {form.kepala_sekolah || '……………………'}
                    </p>
                    <p style={{ margin: 0 }}>NIP. {form.nip_kepala || '……………………'}</p>
                  </div>
                </div>

                <Pemisah warna={t.garis} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
