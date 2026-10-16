import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { APP } from '../lib/appConfig'
import { Loader2, UserPlus, Eye, EyeOff } from 'lucide-react'

const JENIS_ORGANISASI = 'puskesmas'

const JABATAN_PUSKESMAS = [
  { value: 'pegawai', label: 'Pegawai' },
  { value: 'admin', label: 'Admin' },
  { value: 'kepala_puskesmas', label: 'Kepala Puskesmas' },
]

const inputClass =
  'w-full bg-slate-900/60 border border-blue-500/30 rounded-lg px-3 py-2.5 min-h-[44px] text-base text-white placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60'
const labelClass = 'text-xs font-medium text-blue-100/85 mb-1 block tracking-wide'
const hintClass = 'text-xs text-blue-200/75 mt-1 leading-relaxed'

function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      {children}
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  )
}

export default function RegisterPuskesmas() {
  const { session, daftar } = useAuth()

  const [mode, setMode] = useState('gabung') // 'gabung' | 'baru'
  const [daftarPkm, setDaftarPkm] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [galatList, setGalatList] = useState(false)
  const [form, setForm] = useState({
    nama: '',
    nip: '',
    email: '',
    password: '',
    konfirmasi: '',
    jabatan: 'pegawai',
    sekolahId: '',
    namaBaru: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tampilSandi, setTampilSandi] = useState(false)

  function ubah(kunci, nilai) {
    setForm((f) => ({ ...f, [kunci]: nilai }))
  }

  // Muat daftar puskesmas yang sudah terdaftar (untuk mode bergabung).
  useEffect(() => {
    let aktif = true
    supabase
      .from('sekolah')
      .select('id, nama_sekolah')
      .eq('jenis_organisasi', JENIS_ORGANISASI)
      .order('nama_sekolah')
      .then(({ data, error: galat }) => {
        if (aktif === false) return
        setGalatList(Boolean(galat))
        setDaftarPkm(data || [])
        setLoadingList(false)
      })
    return () => {
      aktif = false
    }
  }, [])

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const nama = form.nama.trim()
    const nip = form.nip.trim()
    const email = form.email.trim()

    if (nama === '') return setError('Isi nama lengkap Anda.')
    if (nip === '') return setError('NIP wajib diisi untuk akun Puskesmas.')
    if (email === '') return setError('Isi email aktif Anda.')
    if (form.password.length < 6) return setError('Kata sandi minimal 6 karakter.')
    if (form.password !== form.konfirmasi) return setError('Konfirmasi kata sandi tidak sama.')
    if (mode === 'gabung' && form.sekolahId === '') return setError('Pilih puskesmas terlebih dahulu.')
    if (mode === 'baru' && form.namaBaru.trim() === '') return setError('Isi nama puskesmas yang akan didaftarkan.')

    setLoading(true)
    const { error: galat } = await daftar({
      mode,
      jenisOrganisasi: JENIS_ORGANISASI,
      namaLengkap: nama,
      jabatan: form.jabatan,
      nip,
      email,
      password: form.password,
      sekolahId: form.sekolahId,
      namaSekolah: form.namaBaru.trim(),
    })
    setLoading(false)

    if (galat) {
      setError(galat.message || 'Pendaftaran gagal, silakan coba lagi.')
    }
    // Bila berhasil, akun otomatis login dan halaman ini mengalihkan ke beranda.
  }

  const teksPilih = loadingList
    ? 'Memuat daftar...'
    : galatList
      ? 'Gagal memuat daftar'
      : daftarPkm.length === 0
        ? 'Belum ada puskesmas terdaftar'
        : '-- Pilih Puskesmas --'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-blue-950 px-4 py-8 flex items-start justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-slate-900/70 backdrop-blur-xl p-6 sm:p-7 rounded-2xl border border-blue-400/30 space-y-4"
      >
        <div className="text-center mb-2">
          <div className="mx-auto mb-3 w-14 h-14 rounded-full border border-blue-400/40 flex items-center justify-center bg-blue-400/10">
            <UserPlus className="text-blue-300" size={24} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-widest uppercase">Daftar Akun</h1>
          <p className="text-xs font-semibold tracking-widest uppercase text-blue-200/70 mt-0.5">{APP.nama}</p>
          <p className="text-sm text-blue-100/80 mt-1">Akun akan aktif setelah disetujui admin.</p>
        </div>

        <div>
          <span className={labelClass}>Pendaftaran</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: 'gabung', t: 'Bergabung' },
              { v: 'baru', t: 'Puskesmas Baru' },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setMode(o.v)}
                className={
                  'min-h-[44px] rounded-lg border text-sm font-medium transition ' +
                  (mode === o.v
                    ? 'bg-blue-500/30 border-blue-400 text-white'
                    : 'bg-slate-900/60 border-blue-500/30 text-blue-100/80')
                }
              >
                {o.t}
              </button>
            ))}
          </div>
        </div>

        {mode === 'gabung' ? (
          <Field id="reg-pkm" label="Puskesmas">
            <select
              id="reg-pkm"
              className={inputClass}
              value={form.sekolahId}
              onChange={(e) => ubah('sekolahId', e.target.value)}
            >
              <option value="" className="bg-slate-900">{teksPilih}</option>
              {daftarPkm.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900">{p.nama_sekolah}</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field
            id="reg-pkm-baru"
            label="Nama Puskesmas"
            hint="Karena mendaftarkan puskesmas baru, akun Anda otomatis jadi Admin Utama."
          >
            <input
              id="reg-pkm-baru"
              className={inputClass}
              value={form.namaBaru}
              onChange={(e) => ubah('namaBaru', e.target.value)}
            />
          </Field>
        )}

        <Field id="reg-jabatan" label="Jabatan">
          <select
            id="reg-jabatan"
            className={inputClass}
            value={form.jabatan}
            onChange={(e) => ubah('jabatan', e.target.value)}
          >
            {JABATAN_PUSKESMAS.map((j) => (
              <option key={j.value} value={j.value} className="bg-slate-900">{j.label}</option>
            ))}
          </select>
        </Field>

        <Field id="reg-nama" label="Nama Lengkap">
          <input
            id="reg-nama"
            className={inputClass}
            autoComplete="name"
            value={form.nama}
            onChange={(e) => ubah('nama', e.target.value)}
          />
        </Field>

        <Field id="reg-nip" label="NIP">
          <input
            id="reg-nip"
            className={inputClass}
            inputMode="numeric"
            value={form.nip}
            onChange={(e) => ubah('nip', e.target.value)}
          />
        </Field>

        <Field
          id="reg-email"
          label="Email"
          hint="Gunakan email yang aktif. Dipakai untuk masuk dan memulihkan kata sandi."
        >
          <input
            id="reg-email"
            type="email"
            className={inputClass}
            autoComplete="email"
            value={form.email}
            onChange={(e) => ubah('email', e.target.value)}
          />
        </Field>

        <Field id="reg-sandi" label="Kata Sandi">
          <div className="relative">
            <input
              id="reg-sandi"
              type={tampilSandi ? 'text' : 'password'}
              className={inputClass + ' pr-11'}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => ubah('password', e.target.value)}
            />
            <button
              type="button"
              onClick={() => setTampilSandi((v) => v === false)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-200/80"
              aria-label="Tampilkan atau sembunyikan kata sandi"
            >
              {tampilSandi ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        <Field id="reg-konfirmasi" label="Konfirmasi Kata Sandi">
          <input
            id="reg-konfirmasi"
            type={tampilSandi ? 'text' : 'password'}
            className={inputClass}
            autoComplete="new-password"
            value={form.konfirmasi}
            onChange={(e) => ubah('konfirmasi', e.target.value)}
          />
        </Field>

        {error ? (
          <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-white font-semibold flex items-center justify-center gap-2 transition"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
          {loading ? 'Memproses...' : 'Daftar'}
        </button>

        <p className="text-center text-sm text-blue-100/80">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-blue-300 underline">Masuk</Link>
        </p>
      </form>
    </div>
  )
}