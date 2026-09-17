import { useEffect, useState } from 'react'
import {
  Home,
  ChevronRight,
  ChevronDown,
  Check,
  Loader2,
  Send,
  Save,
  Clock3,
  CheckCircle2,
  XCircle,
  Upload,
  ImagePlus,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'

// Nama bucket Supabase Storage untuk pas foto. Pastikan bucket ini sudah
// dibuat (public) dengan policy upload untuk role 'authenticated'.
const BUCKET_FOTO = 'pas-foto-nikah'
const MAKS_UKURAN_FOTO = 2 * 1024 * 1024 // 2MB

// Urutan langkah wizard. Model N1/N3/N6 (surat keterangan dari desa/
// kelurahan) sengaja tidak ada di sini — di luar cakupan yang diisi
// jamaah lewat aplikasi.
const LANGKAH = [
  { id: 'n1_suami', label: 'Data Calon Suami', model: 'N1' },
  { id: 'n1_istri', label: 'Data Calon Istri', model: 'N1' },
  { id: 'n2', label: 'Rencana Akad', model: 'N2' },
  { id: 'n4', label: 'Persetujuan Mempelai', model: 'N4' },
  { id: 'n5', label: 'Izin Orang Tua/Wali', model: 'N5' },
  { id: 'ringkasan', label: 'Ringkasan & Ajukan', model: null },
]

const DATA_KOSONG = {
  calon_suami: {
    nama_lengkap: '', nik: '', tempat_lahir: '', tanggal_lahir: '',
    kewarganegaraan: 'WNI', agama: '', pekerjaan: '', alamat: '',
    status_perkawinan: 'belum_kawin', foto_url: '',
  },
  calon_istri: {
    nama_lengkap: '', nik: '', tempat_lahir: '', tanggal_lahir: '',
    kewarganegaraan: 'WNI', agama: '', pekerjaan: '', alamat: '',
    status_perkawinan: 'belum_kawin', foto_url: '',
  },
  n2: {
    rencana_tanggal_akad: '', rencana_waktu_akad: '', tempat_akad: '',
    kua_tujuan: '', catatan: '',
  },
  n4: {
    persetujuan_calon_suami: false,
    persetujuan_calon_istri: false,
  },
  n5: {
    suami: {
      ayah: { nama_lengkap: '', nik: '', alamat: '' },
      ibu: { nama_lengkap: '', nik: '', alamat: '' },
      persetujuan: false,
    },
    istri: {
      ayah: { nama_lengkap: '', nik: '', alamat: '' },
      ibu: { nama_lengkap: '', nik: '', alamat: '' },
      persetujuan: false,
    },
  },
}

export default function PendaftaranNikah() {
  const { session, sekolahId } = useAuth()
  const [pendaftaranId, setPendaftaranId] = useState(null)
  const [statusPendaftaran, setStatusPendaftaran] = useState('draft')
  const [catatanAdmin, setCatatanAdmin] = useState('')
  const [langkahAktif, setLangkahAktif] = useState(0)
  const [data, setData] = useState(DATA_KOSONG)
  const [loading, setLoading] = useState(true)
  const [menyimpan, setMenyimpan] = useState(false)
  const [mengajukan, setMengajukan] = useState(false)
  const [sedangUnggah, setSedangUnggah] = useState({ calon_suami: false, calon_istri: false })

  // Muat draft/pengajuan terakhir milik jamaah ini (kalau ada). Satu
  // jamaah bisa punya banyak baris riwayat (mis. sudah pernah menikah
  // lewat aplikasi ini sebelumnya) — yang diambil hanya yang terbaru
  // dan MASIH AKTIF (draft/menunggu/ditolak, supaya ditolak bisa
  // diperbaiki & diajukan ulang). Yang sudah 'diverifikasi' dianggap
  // selesai dan tidak dimuat ulang sebagai draft.
  useEffect(() => {
    async function muat() {
      if (!session?.user?.id) return
      setLoading(true)
      const { data: baris } = await supabase
        .from('pendaftaran_nikah')
        .select('*')
        .eq('profil_id', session.user.id)
        .neq('status', 'diverifikasi')
        .order('dibuat_pada', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (baris) {
        setPendaftaranId(baris.id)
        setStatusPendaftaran(baris.status)
        setCatatanAdmin(baris.catatan_admin || '')
        setData({
          calon_suami: { ...DATA_KOSONG.calon_suami, ...(baris.data_n1?.calon_suami || {}) },
          calon_istri: { ...DATA_KOSONG.calon_istri, ...(baris.data_n1?.calon_istri || {}) },
          n2: { ...DATA_KOSONG.n2, ...(baris.data_n2 || {}) },
          n4: { ...DATA_KOSONG.n4, ...(baris.data_n4 || {}) },
          n5: {
            suami: { ...DATA_KOSONG.n5.suami, ...(baris.data_n5?.suami || {}) },
            istri: { ...DATA_KOSONG.n5.istri, ...(baris.data_n5?.istri || {}) },
          },
        })
        // Kalau sebelumnya ditolak, langsung buka dari awal supaya jamaah
        // meninjau ulang semua data sebelum mengajukan lagi.
        setLangkahAktif(baris.status === 'ditolak' ? 0 : Math.min(baris.tahap_selesai, 5))
      }
      setLoading(false)
    }
    muat()
  }, [session?.user?.id])

  function ubahField(bagian, field, nilai) {
    setData((d) => ({ ...d, [bagian]: { ...d[bagian], [field]: nilai } }))
  }

  function ubahFieldN5(pihak, siapa, field, nilai) {
    setData((d) => ({
      ...d,
      n5: {
        ...d.n5,
        [pihak]: {
          ...d.n5[pihak],
          [siapa]: { ...d.n5[pihak][siapa], [field]: nilai },
        },
      },
    }))
  }

  // Unggah pas foto calon pengantin (suami/istri) ke Supabase Storage,
  // lalu simpan URL publiknya ke field foto_url masing-masing.
  async function unggahFoto(bagian, file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      window.alert('File harus berupa gambar (JPG/PNG).')
      return
    }
    if (file.size > MAKS_UKURAN_FOTO) {
      window.alert('Ukuran foto maksimal 2MB.')
      return
    }

    setSedangUnggah((s) => ({ ...s, [bagian]: true }))

    const ekstensi = file.name.split('.').pop()
    const namaFile = `${session.user.id}/${bagian}-${Date.now()}.${ekstensi}`

    const { error: errorUpload } = await supabase.storage
      .from(BUCKET_FOTO)
      .upload(namaFile, file, { upsert: true })

    if (errorUpload) {
      window.alert('Gagal mengunggah foto: ' + errorUpload.message)
      setSedangUnggah((s) => ({ ...s, [bagian]: false }))
      return
    }

    const { data: publik } = supabase.storage.from(BUCKET_FOTO).getPublicUrl(namaFile)
    ubahField(bagian, 'foto_url', publik.publicUrl)
    setSedangUnggah((s) => ({ ...s, [bagian]: false }))
  }

  function hapusFoto(bagian) {
    ubahField(bagian, 'foto_url', '')
  }

  // Simpan progres saat ini sebagai draft (upsert). Dipanggil tiap kali
  // jamaah pindah langkah supaya tidak kehilangan data kalau menutup
  // aplikasi di tengah jalan.
  async function simpanProgres(langkahBaru) {
    if (!session?.user?.id) return
    setMenyimpan(true)

    const payload = {
      profil_id: session.user.id,
      sekolah_id: sekolahId,
      status: statusPendaftaran === 'ditolak' ? 'draft' : statusPendaftaran,
      tahap_selesai: Math.max(langkahBaru, 0),
      data_n1: { calon_suami: data.calon_suami, calon_istri: data.calon_istri },
      data_n2: data.n2,
      data_n4: data.n4,
      data_n5: data.n5,
    }

    if (pendaftaranId) {
      const { error } = await supabase
        .from('pendaftaran_nikah')
        .update(payload)
        .eq('id', pendaftaranId)
      if (error) window.alert('Gagal menyimpan progres: ' + error.message)
      else if (statusPendaftaran === 'ditolak') setStatusPendaftaran('draft')
    } else {
      const { data: baru, error } = await supabase
        .from('pendaftaran_nikah')
        .insert(payload)
        .select('id')
        .single()
      if (error) window.alert('Gagal menyimpan progres: ' + error.message)
      else setPendaftaranId(baru.id)
    }

    setMenyimpan(false)
  }

  async function lanjutKeLangkah(langkahBaru) {
    await simpanProgres(langkahBaru)
    setLangkahAktif(langkahBaru)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function ajukanPendaftaran() {
    if (!data.calon_suami.foto_url || !data.calon_istri.foto_url) {
      window.alert('Pas foto calon suami dan calon istri wajib diunggah (lihat langkah Data Calon Suami/Istri).')
      return
    }
    if (!data.n4.persetujuan_calon_suami || !data.n4.persetujuan_calon_istri) {
      window.alert('Persetujuan kedua calon pengantin (langkah Persetujuan Mempelai) wajib dicentang.')
      return
    }
    if (!data.n5.suami.persetujuan || !data.n5.istri.persetujuan) {
      window.alert('Persetujuan orang tua/wali kedua pihak (langkah Izin Orang Tua/Wali) wajib dicentang.')
      return
    }
    if (!window.confirm('Ajukan pendaftaran nikah ini untuk diverifikasi admin? Pastikan semua data sudah benar.')) return

    setMengajukan(true)
    const payload = {
      profil_id: session.user.id,
      sekolah_id: sekolahId,
      status: 'menunggu',
      tahap_selesai: 6,
      catatan_admin: null,
      data_n1: { calon_suami: data.calon_suami, calon_istri: data.calon_istri },
      data_n2: data.n2,
      data_n4: data.n4,
      data_n5: data.n5,
    }

    let error
    if (pendaftaranId) {
      ;({ error } = await supabase.from('pendaftaran_nikah').update(payload).eq('id', pendaftaranId))
    } else {
      const hasil = await supabase.from('pendaftaran_nikah').insert(payload).select('id').single()
      error = hasil.error
      if (hasil.data) setPendaftaranId(hasil.data.id)
    }

    setMengajukan(false)
    if (error) {
      window.alert('Gagal mengajukan pendaftaran: ' + error.message)
      return
    }
    setStatusPendaftaran('menunggu')
  }

  if (loading) {
    return (
      <Layout title="Pendaftaran Nikah" subtitle="Isi data pendaftaran nikah secara bertahap.">
        <p className="p-6 text-sm text-slate-400 text-center">Memuat data...</p>
      </Layout>
    )
  }

  // Kalau sudah menunggu verifikasi atau sudah disetujui, tampilkan status
  // saja — tidak bisa diedit lagi (kecuali admin menolak, ditangani di atas).
  if (statusPendaftaran === 'menunggu' || statusPendaftaran === 'diverifikasi') {
    return (
      <Layout title="Pendaftaran Nikah" subtitle="Status pendaftaran nikah Anda.">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-sm">
          {statusPendaftaran === 'menunggu' ? (
            <>
              <Clock3 className="mx-auto text-amber-500 mb-3" size={40} />
              <h2 className="font-semibold text-slate-800 mb-1">Menunggu Verifikasi</h2>
              <p className="text-sm text-slate-500">
                Pendaftaran nikah Anda sudah diajukan dan sedang menunggu verifikasi dari admin kantor.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto text-emerald-600 mb-3" size={40} />
              <h2 className="font-semibold text-slate-800 mb-1">Sudah Diverifikasi</h2>
              <p className="text-sm text-slate-500">
                Pendaftaran nikah Anda sudah diverifikasi admin.
                {catatanAdmin ? ` Catatan: "${catatanAdmin}"` : ''}
              </p>
            </>
          )}
        </div>
      </Layout>
    )
  }

  const langkah = LANGKAH[langkahAktif]
  const indeksLangkah = LANGKAH.findIndex((l) => l.id === langkah.id)

  return (
    <Layout title="Pendaftaran Nikah" subtitle="Isi data pendaftaran nikah secara bertahap.">
      {/* Breadcrumb ala SIMKAH */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
        <Home size={13} className="text-emerald-700" />
        <ChevronRight size={12} className="text-slate-300" />
        <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-500">
          Pendaftaran Nikah
        </span>
        <ChevronRight size={12} className="text-slate-300" />
        <span className="px-2 py-0.5 rounded bg-emerald-50 font-semibold text-emerald-800">
          {langkah.model ? `Model ${langkah.model} — ` : ''}
          {langkah.label}
        </span>
      </div>

      {statusPendaftaran === 'ditolak' && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-2">
          <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-600">
            Pengajuan sebelumnya ditolak admin{catatanAdmin ? `: "${catatanAdmin}"` : '.'} Silakan
            perbaiki data di bawah lalu ajukan ulang.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 items-start">
        {/* Sidebar navigasi tahap, vertikal dengan panah — meniru pola SIMKAH */}
        <nav className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
          {LANGKAH.map((l, i) => {
            const selesai = i < langkahAktif
            const aktif = i === langkahAktif
            const terkunci = i > langkahAktif
            return (
              <div key={l.id}>
                <button
                  onClick={() => !terkunci && lanjutKeLangkah(i)}
                  disabled={terkunci}
                  className={`w-full text-left text-xs font-semibold uppercase tracking-wide rounded-lg px-3 py-2.5 flex items-center gap-2 transition-colors ${
                    aktif
                      ? 'bg-emerald-700 text-white'
                      : selesai
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'text-slate-300 cursor-not-allowed'
                  }`}
                >
                  {selesai ? (
                    <Check size={13} className="shrink-0" />
                  ) : (
                    <span className={`w-4 text-center shrink-0 ${aktif ? 'text-white' : ''}`}>{i + 1}</span>
                  )}
                  {l.label}
                </button>
                {i < LANGKAH.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ChevronDown size={13} className="text-slate-300" />
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Kartu konten tahap aktif */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-emerald-700 px-5 py-3">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
              {langkah.model ? `Model ${langkah.model} — ` : ''}
              {langkah.label}
            </h2>
          </div>

          <div className="p-5">
            {langkah.id === 'n1_suami' && (
              <FormDataCalon
                nilai={data.calon_suami}
                onUbah={(f, v) => ubahField('calon_suami', f, v)}
                sedangUpload={sedangUnggah.calon_suami}
                onUploadFoto={(file) => unggahFoto('calon_suami', file)}
                onHapusFoto={() => hapusFoto('calon_suami')}
              />
            )}
            {langkah.id === 'n1_istri' && (
              <FormDataCalon
                nilai={data.calon_istri}
                onUbah={(f, v) => ubahField('calon_istri', f, v)}
                sedangUpload={sedangUnggah.calon_istri}
                onUploadFoto={(file) => unggahFoto('calon_istri', file)}
                onHapusFoto={() => hapusFoto('calon_istri')}
              />
            )}
            {langkah.id === 'n2' && <FormRencanaAkad nilai={data.n2} onUbah={(f, v) => ubahField('n2', f, v)} />}
            {langkah.id === 'n4' && (
              <FormPersetujuanMempelai
                nilai={data.n4}
                namaSuami={data.calon_suami.nama_lengkap}
                namaIstri={data.calon_istri.nama_lengkap}
                onUbah={(f, v) => ubahField('n4', f, v)}
              />
            )}
            {langkah.id === 'n5' && (
              <FormIzinOrangTua
                nilai={data.n5}
                namaSuami={data.calon_suami.nama_lengkap}
                namaIstri={data.calon_istri.nama_lengkap}
                onUbah={ubahFieldN5}
                onUbahPersetujuan={(pihak, v) =>
                  setData((d) => ({ ...d, n5: { ...d.n5, [pihak]: { ...d.n5[pihak], persetujuan: v } } }))
                }
              />
            )}
            {langkah.id === 'ringkasan' && <Ringkasan data={data} />}

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => lanjutKeLangkah(Math.max(indeksLangkah - 1, 0))}
                disabled={langkahAktif === 0 || menyimpan}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-40"
              >
                Sebelumnya
              </button>

              {langkah.id !== 'ringkasan' ? (
                <button
                  onClick={() => lanjutKeLangkah(Math.min(langkahAktif + 1, LANGKAH.length - 1))}
                  disabled={menyimpan}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60"
                >
                  {menyimpan ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Simpan & Lanjut
                </button>
              ) : (
                <button
                  onClick={ajukanPendaftaran}
                  disabled={mengajukan}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60"
                >
                  {mengajukan ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Ajukan Pendaftaran
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

// ---------------------------------------------------------------------
// Komponen field kecil, dipakai berulang di semua langkah
// ---------------------------------------------------------------------
function Input({ label, value, onChange, required, type = 'text', placeholder, className = '' }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-slate-500 mb-1 block">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function Textarea({ label, value, onChange, required, className = '' }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-slate-500 mb-1 block">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <textarea
        rows={2}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Select({ label, value, onChange, options, className = '' }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
      <select
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// Upload pas foto dengan preview, tombol ganti & hapus. Dipakai di
// FormDataCalon untuk calon suami maupun calon istri.
function UploadFoto({ label, fotoUrl, sedangUpload, onUpload, onHapus }) {
  return (
    <div className="col-span-2">
      <label className="text-xs font-medium text-slate-500 mb-1 block">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="flex items-center gap-3">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={label}
            className="w-20 h-24 object-cover rounded-lg border border-slate-200"
          />
        ) : (
          <div className="w-20 h-24 rounded-lg border border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
            <ImagePlus size={20} className="text-slate-300" />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-emerald-50 w-fit">
            {sedangUpload ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {fotoUrl ? 'Ganti Foto' : 'Unggah Foto'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={sedangUpload}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onUpload(file)
                e.target.value = ''
              }}
            />
          </label>
          {fotoUrl && !sedangUpload && (
            <button
              type="button"
              onClick={onHapus}
              className="flex items-center gap-1.5 text-xs font-medium text-red-500 px-3 py-1.5 w-fit hover:underline"
            >
              <Trash2 size={13} /> Hapus
            </button>
          )}
          <p className="text-[10px] text-slate-400">Pas foto terbaru, format JPG/PNG, maks 2MB.</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Model N1 — Data satu calon pengantin (dipakai 2x: suami & istri)
// ---------------------------------------------------------------------
function FormDataCalon({ nilai, onUbah, sedangUpload, onUploadFoto, onHapusFoto }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <UploadFoto
        label="Pas Foto"
        fotoUrl={nilai.foto_url}
        sedangUpload={sedangUpload}
        onUpload={onUploadFoto}
        onHapus={onHapusFoto}
      />
      <Input label="Nama Lengkap & Alias" required value={nilai.nama_lengkap} onChange={(v) => onUbah('nama_lengkap', v)} className="col-span-2" />
      <Input label="NIK" required value={nilai.nik} onChange={(v) => onUbah('nik', v)} />
      <Select
        label="Status Perkawinan"
        value={nilai.status_perkawinan}
        onChange={(v) => onUbah('status_perkawinan', v)}
        options={[
          { value: 'belum_kawin', label: 'Belum Kawin' },
          { value: 'cerai_hidup', label: 'Duda/Janda Cerai Hidup' },
          { value: 'cerai_mati', label: 'Duda/Janda Cerai Mati' },
        ]}
      />
      <Input label="Tempat Lahir" required value={nilai.tempat_lahir} onChange={(v) => onUbah('tempat_lahir', v)} />
      <Input label="Tanggal Lahir" required type="date" value={nilai.tanggal_lahir} onChange={(v) => onUbah('tanggal_lahir', v)} />
      <Input label="Kewarganegaraan" value={nilai.kewarganegaraan} onChange={(v) => onUbah('kewarganegaraan', v)} />
      <Input label="Agama" required value={nilai.agama} onChange={(v) => onUbah('agama', v)} />
      <Input label="Pekerjaan" value={nilai.pekerjaan} onChange={(v) => onUbah('pekerjaan', v)} />
      <Textarea label="Alamat (sesuai KTP)" required value={nilai.alamat} onChange={(v) => onUbah('alamat', v)} className="col-span-2" />
    </div>
  )
}

// ---------------------------------------------------------------------
// Model N2 — Rencana akad
// ---------------------------------------------------------------------
function FormRencanaAkad({ nilai, onUbah }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input label="Rencana Tanggal Akad" required type="date" value={nilai.rencana_tanggal_akad} onChange={(v) => onUbah('rencana_tanggal_akad', v)} />
      <Input label="Rencana Waktu Akad" type="time" value={nilai.rencana_waktu_akad} onChange={(v) => onUbah('rencana_waktu_akad', v)} />
      <Input label="Tempat Akad" required value={nilai.tempat_akad} onChange={(v) => onUbah('tempat_akad', v)} className="col-span-2" />
      <Input label="KUA Tujuan" required value={nilai.kua_tujuan} onChange={(v) => onUbah('kua_tujuan', v)} className="col-span-2" placeholder="KUA Kecamatan tempat akad dilangsungkan" />
      <Textarea label="Catatan Tambahan (opsional)" value={nilai.catatan} onChange={(v) => onUbah('catatan', v)} className="col-span-2" />
    </div>
  )
}

// ---------------------------------------------------------------------
// Model N4 — Persetujuan calon pengantin
// ---------------------------------------------------------------------
function FormPersetujuanMempelai({ nilai, namaSuami, namaIstri, onUbah }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Sesuai Model N4, kedua calon pengantin menyatakan bahwa atas dasar suka rela, dengan
        kesadaran sendiri, tanpa ada paksaan dari siapapun juga, setuju untuk melangsungkan
        perkawinan.
      </p>
      <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-200">
        <input
          type="checkbox"
          className="mt-0.5 accent-emerald-700"
          checked={nilai.persetujuan_calon_suami}
          onChange={(e) => onUbah('persetujuan_calon_suami', e.target.checked)}
        />
        <span className="text-sm text-slate-700">
          Saya, <strong>{namaSuami || 'calon suami'}</strong>, menyatakan setuju untuk menikah tanpa
          paksaan.
        </span>
      </label>
      <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-200">
        <input
          type="checkbox"
          className="mt-0.5 accent-emerald-700"
          checked={nilai.persetujuan_calon_istri}
          onChange={(e) => onUbah('persetujuan_calon_istri', e.target.checked)}
        />
        <span className="text-sm text-slate-700">
          Saya, <strong>{namaIstri || 'calon istri'}</strong>, menyatakan setuju untuk menikah tanpa
          paksaan.
        </span>
      </label>
    </div>
  )
}

// ---------------------------------------------------------------------
// Model N5 — Izin/persetujuan orang tua kedua pihak
// ---------------------------------------------------------------------
function FormOrangTua({ label, nilai, onUbah }) {
  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <p className="text-xs font-semibold text-slate-600 mb-2">{label}</p>
      <p className="text-[11px] text-slate-400 mb-2">
        Bila orang tua telah meninggal dunia, cukup isi nama lengkap saja tanpa NIK/alamat.
      </p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Input label="Nama Ayah" value={nilai.ayah.nama_lengkap} onChange={(v) => onUbah('ayah', 'nama_lengkap', v)} />
        <Input label="NIK Ayah" value={nilai.ayah.nik} onChange={(v) => onUbah('ayah', 'nik', v)} />
        <Input label="Nama Ibu" value={nilai.ibu.nama_lengkap} onChange={(v) => onUbah('ibu', 'nama_lengkap', v)} />
        <Input label="NIK Ibu" value={nilai.ibu.nik} onChange={(v) => onUbah('ibu', 'nik', v)} />
      </div>
    </div>
  )
}

function FormIzinOrangTua({ nilai, namaSuami, namaIstri, onUbah, onUbahPersetujuan }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <FormOrangTua
          label={`Orang Tua Calon Suami${namaSuami ? ` (${namaSuami})` : ''}`}
          nilai={nilai.suami}
          onUbah={(siapa, f, v) => onUbah('suami', siapa, f, v)}
        />
        <label className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-200">
          <input
            type="checkbox"
            className="mt-0.5 accent-emerald-700"
            checked={nilai.suami.persetujuan}
            onChange={(e) => onUbahPersetujuan('suami', e.target.checked)}
          />
          <span className="text-xs text-slate-700">Orang tua/wali calon suami menyetujui pernikahan ini.</span>
        </label>
      </div>
      <div className="space-y-2">
        <FormOrangTua
          label={`Orang Tua Calon Istri${namaIstri ? ` (${namaIstri})` : ''}`}
          nilai={nilai.istri}
          onUbah={(siapa, f, v) => onUbah('istri', siapa, f, v)}
        />
        <label className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-200">
          <input
            type="checkbox"
            className="mt-0.5 accent-emerald-700"
            checked={nilai.istri.persetujuan}
            onChange={(e) => onUbahPersetujuan('istri', e.target.checked)}
          />
          <span className="text-xs text-slate-700">Orang tua/wali calon istri menyetujui pernikahan ini.</span>
        </label>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Ringkasan sebelum diajukan
// ---------------------------------------------------------------------
function Baris({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 text-right">{value || '—'}</span>
    </div>
  )
}

function Ringkasan({ data }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-emerald-700 mb-1">Calon Suami</p>
        <div className="flex gap-3">
          {data.calon_suami.foto_url ? (
            <img
              src={data.calon_suami.foto_url}
              alt="Foto calon suami"
              className="w-16 h-20 object-cover rounded-lg border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-16 h-20 rounded-lg border border-dashed border-red-200 bg-red-50 flex items-center justify-center text-[10px] text-red-400 text-center px-1 shrink-0">
              Foto belum ada
            </div>
          )}
          <div className="flex-1">
            <Baris label="Nama" value={data.calon_suami.nama_lengkap} />
            <Baris label="NIK" value={data.calon_suami.nik} />
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-emerald-700 mb-1">Calon Istri</p>
        <div className="flex gap-3">
          {data.calon_istri.foto_url ? (
            <img
              src={data.calon_istri.foto_url}
              alt="Foto calon istri"
              className="w-16 h-20 object-cover rounded-lg border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-16 h-20 rounded-lg border border-dashed border-red-200 bg-red-50 flex items-center justify-center text-[10px] text-red-400 text-center px-1 shrink-0">
              Foto belum ada
            </div>
          )}
          <div className="flex-1">
            <Baris label="Nama" value={data.calon_istri.nama_lengkap} />
            <Baris label="NIK" value={data.calon_istri.nik} />
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-emerald-700 mb-1">Rencana Akad</p>
        <Baris label="Tanggal" value={data.n2.rencana_tanggal_akad} />
        <Baris label="Tempat" value={data.n2.tempat_akad} />
        <Baris label="KUA Tujuan" value={data.n2.kua_tujuan} />
      </div>
      <div>
        <p className="text-xs font-semibold text-emerald-700 mb-1">Persetujuan</p>
        <Baris label="Persetujuan mempelai" value={data.n4.persetujuan_calon_suami && data.n4.persetujuan_calon_istri ? 'Lengkap' : 'Belum lengkap'} />
        <Baris label="Persetujuan orang tua" value={data.n5.suami.persetujuan && data.n5.istri.persetujuan ? 'Lengkap' : 'Belum lengkap'} />
      </div>
      <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
        Pastikan semua data di atas benar. Setelah diajukan, data akan diverifikasi admin kantor dan
        tidak bisa diubah sampai ada keputusan.
      </p>
    </div>
  )
}
