import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Form tambah/edit "PEGAWAI KANTOR" — dipakai oleh LaporanNominatifPegawai.jsx
// untuk mengisi tabel `pegawai_kantor`. Field mengikuti kolom yang benar-benar
// ada di tabel (dicek langsung lewat information_schema), dikelompokkan jadi
// 4 bagian supaya tidak jadi satu form panjang tanpa struktur:
// 1. Data Pribadi, 2. Data Kepegawaian, 3. Kontak & Alamat, 4. Data Bank.
//
// Mode: /pegawai-kantor/baru -> tambah baru (insert).
//       /pegawai-kantor/:id/edit -> ubah data (update), data awal di-fetch.
//
// sekolah_id otomatis diambil dari akun yang login (useAuth), TIDAK bisa
// diisi manual dari form — supaya tidak terulang kasus data "kesasar" ke
// sekolah lain seperti yang terjadi sebelumnya.
export default function FormPegawaiKantor() {
  const navigate = useNavigate()
  const { id } = useParams()
  const modeEdit = Boolean(id)
  const { sekolahId: sekolahIdSaya } = useAuth()

  const [loading, setLoading] = useState(modeEdit)
  const [menyimpan, setMenyimpan] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nama_lengkap: '',
    nip: '',
    nuptk: '',
    jenis_kelamin: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    agama: '',
    status: 'aktif',

    jabatan: '',
    pangkat_golongan: '',
    status_kepegawaian: '',
    jenis_ptk: '',
    tugas_tambahan: '',
    pendidikan_terakhir: '',
    sk_pengangkatan: '',
    tmt_pengangkatan: '',

    no_hp: '',
    email: '',
    alamat: '',
    nik: '',
    npwp: '',

    bank: '',
    no_rekening: '',
    rekening_atas_nama: '',
  })

  useEffect(() => {
    if (!modeEdit) return

    async function muatData() {
      setLoading(true)
      const { data, error: errFetch } = await supabase
        .from('pegawai_kantor')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (errFetch) {
        setError('Gagal memuat data pegawai: ' + errFetch.message)
      } else if (data) {
        setForm((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.keys(prev).map((key) => [key, data[key] ?? prev[key]])
          ),
        }))
      }
      setLoading(false)
    }
    muatData()
  }, [id, modeEdit])

  function ubahField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function simpan(e) {
    e.preventDefault()
    setError('')

    if (!form.nama_lengkap.trim()) {
      setError('Nama lengkap wajib diisi.')
      return
    }
    if (!sekolahIdSaya) {
      setError('Sekolah tidak terdeteksi pada akun ini. Coba muat ulang halaman.')
      return
    }

    setMenyimpan(true)

    const payload = {
      ...form,
      sekolah_id: sekolahIdSaya,
      tanggal_lahir: form.tanggal_lahir || null,
      tmt_pengangkatan: form.tmt_pengangkatan || null,
    }

    const query = modeEdit
      ? supabase.from('pegawai_kantor').update(payload).eq('id', id)
      : supabase.from('pegawai_kantor').insert(payload)

    const { error: errSimpan } = await query

    setMenyimpan(false)

    if (errSimpan) {
      setError('Gagal menyimpan data: ' + errSimpan.message)
      return
    }

    navigate(-1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        <h1 className="text-sm font-semibold text-slate-800">
          {modeEdit ? 'Ubah Data Pegawai Kantor' : 'Tambah Pegawai Kantor'}
        </h1>
        <button
          onClick={simpan}
          disabled={menyimpan}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {menyimpan ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Simpan
        </button>
      </div>

      <form onSubmit={simpan} className="max-w-3xl mx-auto mt-6 px-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <Bagian judul="Data Pribadi">
          <Field label="Nama Lengkap" required span={2}>
            <Input value={form.nama_lengkap} onChange={(v) => ubahField('nama_lengkap', v)} placeholder="Nama, gelar (mis. Budi Santoso, S.E.)" />
          </Field>
          <Field label="NIP">
            <Input value={form.nip} onChange={(v) => ubahField('nip', v)} />
          </Field>
          <Field label="NUPTK">
            <Input value={form.nuptk} onChange={(v) => ubahField('nuptk', v)} />
          </Field>
          <Field label="Jenis Kelamin">
            <Select value={form.jenis_kelamin} onChange={(v) => ubahField('jenis_kelamin', v)} options={['Laki-laki', 'Perempuan']} />
          </Field>
          <Field label="Agama">
            <Select
              value={form.agama}
              onChange={(v) => ubahField('agama', v)}
              options={['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Khonghucu']}
            />
          </Field>
          <Field label="Tempat Lahir">
            <Input value={form.tempat_lahir} onChange={(v) => ubahField('tempat_lahir', v)} />
          </Field>
          <Field label="Tanggal Lahir">
            <Input type="date" value={form.tanggal_lahir} onChange={(v) => ubahField('tanggal_lahir', v)} />
          </Field>
          <Field label="Status Aktif">
            <Select value={form.status} onChange={(v) => ubahField('status', v)} options={['aktif', 'nonaktif']} />
          </Field>
        </Bagian>

        <Bagian judul="Data Kepegawaian">
          <Field label="Jabatan" span={2}>
            <Input value={form.jabatan} onChange={(v) => ubahField('jabatan', v)} placeholder="mis. Tenaga Administrasi, Bendahara, Penjaga Sekolah" />
          </Field>
          <Field label="Pangkat / Golongan">
            <Input value={form.pangkat_golongan} onChange={(v) => ubahField('pangkat_golongan', v)} />
          </Field>
          <Field label="Status Kepegawaian">
            <Select
              value={form.status_kepegawaian}
              onChange={(v) => ubahField('status_kepegawaian', v)}
              options={['PNS', 'PPPK', 'GTY/PTY', 'Honorer', 'Kontrak']}
            />
          </Field>
          <Field label="Jenis PTK">
            <Input value={form.jenis_ptk} onChange={(v) => ubahField('jenis_ptk', v)} />
          </Field>
          <Field label="Tugas Tambahan">
            <Input value={form.tugas_tambahan} onChange={(v) => ubahField('tugas_tambahan', v)} />
          </Field>
          <Field label="Pendidikan Terakhir">
            <Input value={form.pendidikan_terakhir} onChange={(v) => ubahField('pendidikan_terakhir', v)} />
          </Field>
          <Field label="SK Pengangkatan">
            <Input value={form.sk_pengangkatan} onChange={(v) => ubahField('sk_pengangkatan', v)} />
          </Field>
          <Field label="TMT Pengangkatan">
            <Input type="date" value={form.tmt_pengangkatan} onChange={(v) => ubahField('tmt_pengangkatan', v)} />
          </Field>
        </Bagian>

        <Bagian judul="Kontak & Alamat">
          <Field label="No. HP">
            <Input value={form.no_hp} onChange={(v) => ubahField('no_hp', v)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(v) => ubahField('email', v)} />
          </Field>
          <Field label="NIK">
            <Input value={form.nik} onChange={(v) => ubahField('nik', v)} />
          </Field>
          <Field label="NPWP">
            <Input value={form.npwp} onChange={(v) => ubahField('npwp', v)} />
          </Field>
          <Field label="Alamat" span={2}>
            <Textarea value={form.alamat} onChange={(v) => ubahField('alamat', v)} />
          </Field>
        </Bagian>

        <Bagian judul="Data Bank">
          <Field label="Bank">
            <Input value={form.bank} onChange={(v) => ubahField('bank', v)} />
          </Field>
          <Field label="No. Rekening">
            <Input value={form.no_rekening} onChange={(v) => ubahField('no_rekening', v)} />
          </Field>
          <Field label="Atas Nama" span={2}>
            <Input value={form.rekening_atas_nama} onChange={(v) => ubahField('rekening_atas_nama', v)} />
          </Field>
        </Bagian>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm font-medium text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={menyimpan}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {menyimpan ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Data
          </button>
        </div>
      </form>
    </div>
  )
}

function Bagian({ judul, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-slate-800 mb-3">{judul}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function Field({ label, required, span, children }) {
  return (
    <div className={span === 2 ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder = '' }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}

function Textarea({ value, onChange }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">— Pilih —</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}
