import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import { Save, Loader2, CheckCircle2, ImagePlus } from 'lucide-react'

const emptyForm = {
  nama_puskesmas: '',
  kode_puskesmas: '',
  alamat: '',
  telepon: '',
  email: '',
  kabupaten: '',
  kecamatan: '',
  provinsi: '',
  kepala_puskesmas: '',
  nip_kepala_puskesmas: '',
  dokter_penanggung_jawab: '',
  nip_dokter_penanggung_jawab: '',
  tempat_ttd: '',
  logo_path: '',
  logo_kabupaten_path: '',
}

const BUCKET = 'profil-puskesmas'

function getLogoUrl(path) {
  if (!path) return ''
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// Satu puskesmas = satu baris, di-scope lewat sekolah_id (tenant), sama
// polanya dengan ProfilKantor.jsx. Data ini sekarang didaftarkan di
// AuthContext (profilPuskesmas) supaya halaman lain (kop surat, tanda
// tangan dokumen, dsb) bisa langsung pakai tanpa fetch ulang sendiri.
export default function ProfilPuskesmas() {
  const { sekolahId, profilPuskesmas, refreshProfilPuskesmas } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(profilPuskesmas === undefined)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingLogoKab, setUploadingLogoKab] = useState(false)
  const [tersimpan, setTersimpan] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [logoKabUrl, setLogoKabUrl] = useState('')

  // Isi form dari data yang sudah dimuat di AuthContext, bukan fetch sendiri.
  useEffect(() => {
    if (profilPuskesmas === undefined) {
      setLoading(true)
      return
    }
    setLoading(false)

    if (profilPuskesmas) {
      setForm({ ...emptyForm, ...profilPuskesmas })
      setLogoUrl(getLogoUrl(profilPuskesmas.logo_path))
      setLogoKabUrl(getLogoUrl(profilPuskesmas.logo_kabupaten_path))
    } else {
      // Puskesmas ini belum punya baris profil_puskesmas sama sekali — normal untuk tenant baru
      setForm(emptyForm)
      setLogoUrl('')
      setLogoKabUrl('')
    }
  }, [profilPuskesmas])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId) return
    setSaving(true)
    setTersimpan(false)
    const { id, diperbarui_pada, sekolah_id, ...payload } = form
    const { error } = await supabase
      .from('profil_puskesmas')
      .upsert(
        { sekolah_id: sekolahId, ...payload, diperbarui_pada: new Date().toISOString() },
        { onConflict: 'sekolah_id' }
      )
    setSaving(false)
    if (!error) {
      setTersimpan(true)
      setTimeout(() => setTersimpan(false), 3000)
      await refreshProfilPuskesmas()
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  // Upload generik dipakai untuk logo puskesmas & logo kabupaten.
  //  - field   : nama kolom di tabel (logo_path / logo_kabupaten_path)
  //  - prefix  : awalan nama file di storage
  //  - setUrl / setUploading : setter state untuk preview & status loading
  async function uploadLogo(e, { field, prefix, label, setUrl, setUploading }) {
    const file = e.target.files?.[0]
    if (!file || !sekolahId) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${sekolahId}/${prefix}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
    })

    if (uploadError) {
      alert(`Gagal upload ${label}: ` + uploadError.message)
      setUploading(false)
      e.target.value = ''
      return
    }

    setUrl(getLogoUrl(path))
    setForm((f) => ({ ...f, [field]: path }))

    // Langsung simpan ke DB supaya logo tidak hilang kalau lupa klik "Simpan Perubahan"
    const { error: saveError } = await supabase
      .from('profil_puskesmas')
      .upsert(
        { sekolah_id: sekolahId, [field]: path, diperbarui_pada: new Date().toISOString() },
        { onConflict: 'sekolah_id' }
      )

    if (saveError) {
      alert(`${label} terunggah tapi gagal disimpan ke profil: ` + saveError.message)
    } else {
      await refreshProfilPuskesmas()
    }

    setUploading(false)
    e.target.value = ''
  }

  function handleLogoChange(e) {
    return uploadLogo(e, {
      field: 'logo_path',
      prefix: 'logo',
      label: 'logo puskesmas',
      setUrl: setLogoUrl,
      setUploading: setUploadingLogo,
    })
  }

  function handleLogoKabChange(e) {
    return uploadLogo(e, {
      field: 'logo_kabupaten_path',
      prefix: 'logo-kabupaten',
      label: 'logo kabupaten',
      setUrl: setLogoKabUrl,
      setUploading: setUploadingLogoKab,
    })
  }

  function ubah(field, value) {
    setForm({ ...form, [field]: value })
  }

  if (loading) {
    return (
      <Layout title="Profil Puskesmas" subtitle="Data puskesmas, Kepala Puskesmas & Dokter Penanggung Jawab">
        <p className="text-center py-8 text-ink-700/50 text-sm">Memuat data...</p>
      </Layout>
    )
  }

  return (
    <Layout
      title="Profil Puskesmas"
      subtitle="Data ini dipakai otomatis di kop & tanda tangan setiap materi/dokumen yang dicetak"
    >
      <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
        <div className="card p-6">
          <h3 className="font-display font-semibold text-ink-950 mb-1">Logo Kop Surat</h3>
          <p className="text-xs text-ink-700/60 mb-4">
            Logo kabupaten tampil di sisi kiri kop, logo puskesmas di sisi kanan.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Logo Kabupaten */}
            <div>
              <p className="label-field mb-2">Logo Kabupaten/Kota</p>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg border border-ink-900/[0.1] flex items-center justify-center overflow-hidden bg-ink-900/[0.02] shrink-0">
                  {logoKabUrl ? (
                    <img src={logoKabUrl} alt="Logo kabupaten" className="w-full h-full object-contain" />
                  ) : (
                    <ImagePlus size={24} className="text-ink-700/30" />
                  )}
                </div>
                <label className="btn-secondary cursor-pointer inline-flex">
                  {uploadingLogoKab ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                  {uploadingLogoKab ? 'Mengunggah...' : 'Upload Logo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoKabChange}
                    disabled={uploadingLogoKab}
                  />
                </label>
              </div>
            </div>

            {/* Logo Puskesmas */}
            <div>
              <p className="label-field mb-2">Logo Puskesmas</p>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg border border-ink-900/[0.1] flex items-center justify-center overflow-hidden bg-ink-900/[0.02] shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo puskesmas" className="w-full h-full object-contain" />
                  ) : (
                    <ImagePlus size={24} className="text-ink-700/30" />
                  )}
                </div>
                <label className="btn-secondary cursor-pointer inline-flex">
                  {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                  {uploadingLogo ? 'Mengunggah...' : 'Upload Logo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                    disabled={uploadingLogo}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-display font-semibold text-ink-950 mb-4">Data Puskesmas, Kepala Puskesmas & Dokter Penanggung Jawab</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label-field">Nama Puskesmas</label>
              <input className="input-field" placeholder="Puskesmas ..." value={form.nama_puskesmas} onChange={(e) => ubah('nama_puskesmas', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Kode Puskesmas (opsional)</label>
              <input className="input-field" placeholder="Kode registrasi Kemenkes" value={form.kode_puskesmas || ''} onChange={(e) => ubah('kode_puskesmas', e.target.value)} />
            </div>
            <div />
            <div>
              <label className="label-field">Kepala Puskesmas</label>
              <input className="input-field" value={form.kepala_puskesmas} onChange={(e) => ubah('kepala_puskesmas', e.target.value)} />
            </div>
            <div>
              <label className="label-field">NIP Kepala Puskesmas</label>
              <input className="input-field" value={form.nip_kepala_puskesmas} onChange={(e) => ubah('nip_kepala_puskesmas', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Dokter Penanggung Jawab</label>
              <input className="input-field" placeholder="Nama dokter penandatangan surat medis" value={form.dokter_penanggung_jawab || ''} onChange={(e) => ubah('dokter_penanggung_jawab', e.target.value)} />
            </div>
            <div>
              <label className="label-field">NIP/NRPTT Dokter Penanggung Jawab</label>
              <input className="input-field" value={form.nip_dokter_penanggung_jawab || ''} onChange={(e) => ubah('nip_dokter_penanggung_jawab', e.target.value)} />
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
              <label className="label-field">Provinsi</label>
              <input className="input-field" value={form.provinsi || ''} onChange={(e) => ubah('provinsi', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Telepon</label>
              <input className="input-field" value={form.telepon} onChange={(e) => ubah('telepon', e.target.value)} />
            </div>
            <div>
              <label className="label-field">Email Puskesmas</label>
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
