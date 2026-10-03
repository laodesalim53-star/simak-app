import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { Loader2, Save, Upload, Building2, Shield } from 'lucide-react'

// Laman Profil Polres (tenant jenis_organisasi === 'polres').
// Satu baris per tenant di tabel profil_polres (kunci: sekolah_id),
// disimpan dengan upsert onConflict 'sekolah_id'. Logo & tanda tangan
// Kapolres diunggah ke bucket storage "profil-polres". Data ini dipakai
// untuk kop & tanda tangan dokumen arsip yang dicetak.
//
// Butuh kolom: alter table profil_polres add column if not exists ttd_kapolres_path text;

const BUCKET = 'profil-polres'

const KOSONG = {
  tempat_ttd: '',
  logo_path: '',
  ttd_kapolres_path: '',
  nama_satuan: '',
  polda: '',
  alamat: '',
  kabupaten_kota: '',
  provinsi: '',
  kode_pos: '',
  telepon: '',
  email: '',
  kapolres: '',
  pangkat_kapolres: '',
  nrp_kapolres: '',
  jabatan_pejabat_arsip: '',
  pejabat_arsip: '',
  pangkat_pejabat_arsip: '',
  nrp_pejabat_arsip: '',
}

function urlLogo(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data?.publicUrl || null
}

function kapital(teks) {
  return teks ? teks.charAt(0).toUpperCase() + teks.slice(1) : ''
}

function Isian({ label, nama, form, ubah, placeholder, className = '' }) {
  return (
    <div className={className}>
      <label className="label-field">{label}</label>
      <input
        className="input-field"
        value={form[nama] ?? ''}
        placeholder={placeholder}
        onChange={(e) => ubah(nama, e.target.value)}
      />
    </div>
  )
}

export default function ProfilPolres() {
  const { sekolahId } = useAuth()
  const [form, setForm] = useState(KOSONG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  function ubah(nama, nilai) {
    setForm((prev) => ({ ...prev, [nama]: nilai }))
  }

  useEffect(() => {
    let aktif = true

    async function muat() {
      if (!sekolahId) {
        setLoading(false)
        return
      }
      setLoading(true)
      const { data, error } = await supabase
        .from('profil_polres')
        .select('*')
        .eq('sekolah_id', sekolahId)
        .maybeSingle()

      if (!aktif) return
      if (error) {
        alert('Gagal memuat profil Polres: ' + error.message)
      } else if (data) {
        const isi = { ...KOSONG }
        for (const kunci of Object.keys(KOSONG)) isi[kunci] = data[kunci] ?? ''
        setForm(isi)
      }
      setLoading(false)
    }

    muat()
    return () => {
      aktif = false
    }
  }, [sekolahId])

  async function handleSimpan(e) {
    e.preventDefault()
    if (!sekolahId) return
    setSaving(true)

    const payload = { sekolah_id: sekolahId, diperbarui_pada: new Date().toISOString() }
    for (const kunci of Object.keys(KOSONG)) {
      payload[kunci] = form[kunci]?.toString().trim() || null
    }

    const { error } = await supabase
      .from('profil_polres')
      .upsert(payload, { onConflict: 'sekolah_id' })

    setSaving(false)
    if (error) {
      alert('Gagal menyimpan profil Polres: ' + error.message)
    } else {
      alert('Profil Polres berhasil disimpan.')
    }
  }

  // Unggah gambar umum (logo / tanda tangan Kapolres) ke bucket profil-polres
  async function unggahGambar(e, { kolom, awalan, label, maksMB }) {
    const berkas = e.target.files?.[0]
    e.target.value = ''
    if (!berkas || !sekolahId) return

    if (!berkas.type.startsWith('image/')) {
      alert(`File ${label} harus berupa gambar (PNG atau JPG).`)
      return
    }
    if (berkas.size > maksMB * 1024 * 1024) {
      alert(`Ukuran ${label} maksimal ${maksMB} MB.`)
      return
    }

    setUploading(true)
    const ekstensi = (berkas.name.split('.').pop() || 'png').toLowerCase()
    const path = `${sekolahId}/${awalan}-${Date.now()}.${ekstensi}`

    const { error: errUnggah } = await supabase.storage
      .from(BUCKET)
      .upload(path, berkas, { upsert: true, contentType: berkas.type })

    if (errUnggah) {
      setUploading(false)
      alert(`Gagal mengunggah ${label}: ` + errUnggah.message)
      return
    }

    // Simpan path langsung supaya gambar tidak hilang kalau halaman ditutup
    // sebelum tombol Simpan ditekan.
    const { error: errSimpan } = await supabase
      .from('profil_polres')
      .upsert(
        { sekolah_id: sekolahId, [kolom]: path, diperbarui_pada: new Date().toISOString() },
        { onConflict: 'sekolah_id' }
      )

    setUploading(false)
    if (errSimpan) {
      alert(`${kapital(label)} terunggah, tetapi gagal disimpan ke profil: ` + errSimpan.message)
      return
    }
    ubah(kolom, path)
  }

  async function hapusTtd() {
    if (!form.ttd_kapolres_path || !sekolahId) return
    if (!confirm('Hapus tanda tangan Kapolres?')) return
    const lama = form.ttd_kapolres_path

    const { error } = await supabase
      .from('profil_polres')
      .upsert(
        { sekolah_id: sekolahId, ttd_kapolres_path: null, diperbarui_pada: new Date().toISOString() },
        { onConflict: 'sekolah_id' }
      )
    if (error) {
      alert('Gagal menghapus tanda tangan: ' + error.message)
      return
    }

    ubah('ttd_kapolres_path', '')
    // Hapus berkasnya juga; kalau gagal tidak masalah (hanya sisa file)
    if (!lama.startsWith('http')) await supabase.storage.from(BUCKET).remove([lama])
  }

  const logo = urlLogo(form.logo_path)
  const ttd = urlLogo(form.ttd_kapolres_path)

  return (
    <Layout title="Profil Polres" subtitle="Identitas satuan dan pejabat penandatangan dokumen arsip">
      {loading ? (
        <div className="card p-8 text-center text-ink-700/50">
          <Loader2 size={20} className="animate-spin inline-block mr-2" />
          Memuat data...
        </div>
      ) : (
        <form onSubmit={handleSimpan} className="space-y-5">
          {/* Identitas satuan + logo */}
          <div className="card p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Building2 size={16} /> Identitas Satuan
            </h2>

            <div className="flex flex-wrap gap-5 mb-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-lg border border-ink-700/15 bg-white flex items-center justify-center overflow-hidden">
                  {logo ? (
                    <img src={logo} alt="Logo Polres" className="w-full h-full object-contain" />
                  ) : (
                    <Shield size={32} className="text-ink-700/30" />
                  )}
                </div>
                <label className="btn-secondary cursor-pointer text-xs">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {logo ? 'Ganti Logo' : 'Unggah Logo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      unggahGambar(e, { kolom: 'logo_path', awalan: 'logo', label: 'logo', maksMB: 2 })
                    }
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="flex-1 min-w-[240px] grid gap-3 sm:grid-cols-2 content-start">
                <Isian
                  label="Nama Satuan"
                  nama="nama_satuan"
                  form={form}
                  ubah={ubah}
                  placeholder="Contoh: Polres Kepulauan Aru"
                  className="sm:col-span-2"
                />
                <Isian
                  label="Polda"
                  nama="polda"
                  form={form}
                  ubah={ubah}
                  placeholder="Contoh: Polda Maluku"
                  className="sm:col-span-2"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Isian label="Alamat" nama="alamat" form={form} ubah={ubah} className="sm:col-span-2" />
              <Isian label="Kabupaten / Kota" nama="kabupaten_kota" form={form} ubah={ubah} />
              <Isian label="Provinsi" nama="provinsi" form={form} ubah={ubah} />
              <Isian label="Kode Pos" nama="kode_pos" form={form} ubah={ubah} />
              <Isian label="Telepon" nama="telepon" form={form} ubah={ubah} />
              <Isian label="Email" nama="email" form={form} ubah={ubah} className="sm:col-span-2" />
            </div>
          </div>

          {/* Pejabat penandatangan */}
          <div className="card p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Shield size={16} /> Pejabat Penandatangan
            </h2>

            <p className="text-sm font-medium mb-2">Kapolres</p>
            <div className="grid gap-3 sm:grid-cols-3 mb-4">
              <Isian label="Nama" nama="kapolres" form={form} ubah={ubah} />
              <Isian label="Pangkat" nama="pangkat_kapolres" form={form} ubah={ubah} placeholder="Contoh: AKBP" />
              <Isian label="NRP" nama="nrp_kapolres" form={form} ubah={ubah} />
            </div>

            {/* Tanda tangan Kapolres (gambar) */}
            <div className="flex flex-wrap items-center gap-4 mb-5">
              <div className="w-40 h-20 rounded-lg border border-ink-700/15 bg-white flex items-center justify-center overflow-hidden">
                {ttd ? (
                  <img src={ttd} alt="Tanda tangan Kapolres" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-ink-700/40">Belum ada</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="btn-secondary cursor-pointer text-xs">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {ttd ? 'Ganti Tanda Tangan' : 'Unggah Tanda Tangan'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      unggahGambar(e, {
                        kolom: 'ttd_kapolres_path',
                        awalan: 'ttd',
                        label: 'tanda tangan',
                        maksMB: 1,
                      })
                    }
                    disabled={uploading}
                  />
                </label>
                {ttd && (
                  <button type="button" className="text-xs text-red-600 text-left" onClick={hapusTtd}>
                    Hapus tanda tangan
                  </button>
                )}
                <p className="text-xs text-ink-700/50">PNG berlatar transparan, maks 1 MB.</p>
              </div>
            </div>

            <p className="text-sm font-medium mb-2">Pejabat Pengesah Arsip</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Isian
                label="Jabatan"
                nama="jabatan_pejabat_arsip"
                form={form}
                ubah={ubah}
                placeholder="Contoh: Kaur Min / Kasubbag"
                className="sm:col-span-2"
              />
              <Isian label="Nama" nama="pejabat_arsip" form={form} ubah={ubah} />
              <Isian label="Pangkat" nama="pangkat_pejabat_arsip" form={form} ubah={ubah} />
              <Isian label="NRP" nama="nrp_pejabat_arsip" form={form} ubah={ubah} />
            </div>

            <div className="mt-5 max-w-sm">
              <Isian
                label="Tempat Tanda Tangan"
                nama="tempat_ttd"
                form={form}
                ubah={ubah}
                placeholder="Contoh: Dobo"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={saving || uploading}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Profil
          </button>
        </form>
      )}
    </Layout>
  )
}
