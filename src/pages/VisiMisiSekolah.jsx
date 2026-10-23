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

  return (
    <Layout
      title="Visi, Misi, dan Tujuan Sekolah"
      subtitle="Isi sekali, lalu cetak sebagai dokumen resmi sekolah."
    >
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-cetak, #area-cetak * { visibility: visible; }
          #area-cetak { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
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
          ].map(([k, t]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                tab === k ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t}
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
              <p className="text-xs text-slate-500 mb-1">Satu kalimat tentang sekolah yang dicita-citakan.</p>
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
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-sm font-medium mb-4"
          >
            <Printer size={16} /> Cetak
          </button>
        )}
      </div>

      {!loading && tab === 'cetak' && (
        <div className="max-w-3xl mx-auto px-4 pb-10">
          <div id="area-cetak" className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-slate-900 leading-relaxed">
            <div className="text-center border-b-2 border-slate-800 pb-3 mb-6">
              <p className="text-sm">VISI, MISI, DAN TUJUAN</p>
              <h2 className="text-lg font-bold">{sekolah?.nama || 'NAMA SEKOLAH'}</h2>
              {sekolah?.alamat && <p className="text-xs text-slate-600">{sekolah.alamat}</p>}
              {form.tahun_ajaran && <p className="text-xs text-slate-600">Tahun Ajaran {form.tahun_ajaran}</p>}
            </div>

            <h3 className="font-bold mb-1">A. Visi</h3>
            <p className="mb-5 text-justify">{form.visi || '—'}</p>
            {form.motto && (
              <p className="mb-5 italic">Motto: {form.motto}</p>
            )}

            <h3 className="font-bold mb-1">B. Misi</h3>
            {misi.length ? (
              <ol className="list-decimal pl-6 mb-5 space-y-1 text-justify">
                {misi.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ol>
            ) : (
              <p className="mb-5">—</p>
            )}

            <h3 className="font-bold mb-1">C. Tujuan Sekolah</h3>
            {tujuan.length ? (
              <ol className="list-decimal pl-6 mb-8 space-y-1 text-justify">
                {tujuan.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            ) : (
              <p className="mb-8">—</p>
            )}

            <div className="flex justify-end">
              <div className="text-center text-sm min-w-[220px]">
                <p>{sekolah?.kota ? `${sekolah.kota}, ` : ''}……………………</p>
                <p>Kepala Sekolah,</p>
                <div className="h-20" />
                <p className="font-bold underline">{form.kepala_sekolah || '……………………'}</p>
                <p>NIP. {form.nip_kepala || '……………………'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
