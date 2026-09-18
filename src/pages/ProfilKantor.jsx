import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import { Save, Loader2, CheckCircle2, ImagePlus } from 'lucide-react'

const emptyForm = {
  nama_kantor: '',
  alamat: '',
  telepon: '',
  email: '',
  kabupaten: '',
  kecamatan: '',
  kepala_kua: '',
  nip_kepala_kua: '',
  tempat_ttd: '',
  logo_path: '',
}

// Satu kantor = satu baris, di-scope lewat sekolah_id (bukan lagi id=1
// yang di-hardcode). sekolah_id didapat dari profil user yang login.
export default function ProfilKantor() {
  const { sekolahId } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [tersimpan, setTersimpan] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')

  async function muatData() {
    if (!sekolahId) return
    setLoading(true)
    const { data } = await supabase
      .from('profil_kantor')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()

    if (data) {
      setForm({ ...emptyForm, ...data })
      if (data.logo_path) {
        const { data: pub } = supabase.storage.from('profil-kantor').getPublicUrl(data.logo_path)
        setLogoUrl(pub.publicUrl)
      } else {
        setLogoUrl('')
      }
    } else {
      // Kantor ini belum punya baris profil_kantor sama sekali — normal untuk kantor baru
      setForm(emptyForm)
      setLogoUrl('')
    }
    setLoading(false)
  }

  useEffect(() => {
    muatData()
  }, [sekolahId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId) return
    setSaving(true)
    setTersimpan(false)
    const { id, diperbarui_pada, sekolah_id, ...payload } = form
    const { error } = await supabase
      .from('profil_kantor')
      .upsert(
        { sekolah_id: sekolahId, ...payload, diperbarui_pada: new Date().toISOString() },
        { onConflict: 'sekolah_id' }
      )
    setSaving(false)
    if (!error) {
      setTersimpan(true)
      setTimeout(() => setTersimpan(false), 3000)
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file || !sekolahId) return
    setUploadingLogo(true)

    const ext = file.name.split('.').pop()
    const path = `${sekolahId}/logo-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('profil-kantor').upload(path, file, {
      upsert: true,
    })

    if (uploadError) {
      alert('Gagal upload logo: ' + uploadError.message)
      setUploadingLogo(false)
      return
    }

    const { data: pub } = supabase.storage.from('profil-kantor').getPublicUrl(path)
    setLogoUrl(pub.publicUrl)
    setForm((f) => ({ ...f, logo_path: path }))

    // Langsung simpan ke DB supaya logo tidak hilang kalau lupa klik "Simpan Perubahan"
    const { error: saveError } = await supabase
      .from('profil_kantor')
      .upsert(
        { sekolah_id: sekolahId, logo_path: path, diperbarui_pada: new Date().toISOString() },
        { onConflict: 'sekolah_id' }
      )

    if (saveError) {
      alert('Logo terunggah tapi gagal disimpan ke profil: ' + saveError.message)
    }

    setUploadingLogo(false)
  }

  function ubah(field, value) {
    setForm({ ...form, [field]: value })
  }

  if (loading) {
    return (
      <Layout title="Profil Kantor" subtitle="Data kantor & Kepala KUA">
        <p className="text-center py-8 text-ink-700/50 text-sm">Memuat data...</p>
      </Layout>
    )
  }

  return (
    <Layout
      title="Profil Kantor"
      subtitle="Data ini dipakai otomatis di kop & tanda tangan setiap materi/dokumen yang dicetak"
    >
      <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
        <div className="card p-6">
          <h3 className="font-display font-semibold text-ink-950 mb-4">Logo Kantor</h3>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg border border-ink-900/[0.1] flex items-center justify-center overflow-hidden bg-ink-900/[0.02] shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo kantor" className="w-full h-full object-contain" />
              ) : (
                <ImagePlus size={24} className="text-ink-700/30" />
              )}
            </div>
            <label className="btn-secondary cursor-pointer inline-flex">
              {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              {uploadingLogo ? 'Mengunggah...' : 'Upload Logo'}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={uploadingLogo} />
            </label>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-display font-semibold text-ink-950 mb-4">Data Kantor & Kepala KUA</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label-field">Nama Kantor</label>
              <input className="input-field" placeholder="KUA Kecamatan ..." value={form.nama_kantor} onChange={(e) => ubah('nama_kantor', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Kepala KUA</label>
              <input className="input-field" value={form.kepala_kua} onChange={(e) => ubah('kepala_kua', e.target.value)} />
            </div>
            <div>
              <label className="label-field">NIP Kepala KUA</label>
              <input className="input-field" value={form.nip_kepala_kua} onChange={(e) => ubah('nip_kepala_kua', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Kabupaten/Kota</label>
              <input className="input-field" value={form.kabupaten} onChange={(e) => ubah('kabupaten', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Kecamatan</label>
              <input className="input-field" value={form.kecamatan} onChange={(e) => ubah('kecamatan', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Telepon</label>
              <input className="input-field" value={form.telepon} onChange={(e) => ubah('telepon', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Email Kantor</label>
              <input className="input-field" value={form.email} onChange={(e) => ubah('email', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label-field">Nama Tempat (untuk tanggal di dokumen)</label>
              <input className="input-field" placeholder="Contoh: Sorong" value={form.tempat_ttd} onChange={(e) => ubah('tempat_ttd', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label-field">Alamat</label>
              <textarea className="input-field" rows={2} value={form.alamat} onChange={(e) => ubah('alamat', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Perubahan
          </button>
          {tersimpan && (
            <span className="flex items-center gap-1.5 text-sm text-sage-500">
              <CheckCircle2 size={16} /> Tersimpan
            </span>
          )}
        </div>
      </form>
    </Layout>
  )
}
