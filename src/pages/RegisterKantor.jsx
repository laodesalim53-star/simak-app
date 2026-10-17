import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { APP } from '../lib/appConfig'
import { Loader2, HeartPulse, CheckCircle2, Eye, EyeOff, ChevronDown, Info } from 'lucide-react'

// Pendaftaran akun untuk tenant kantor (KUA). Jabatan mengikuti daftar yang
// diizinkan di AuthContext.daftar(): kepala_kantor, admin, pegawai.
const JABATAN = [
  { value: 'pegawai', label: 'Pegawai KUA' },
  { value: 'admin', label: 'Admin KUA' },
  { value: 'kepala_kantor', label: 'Kepala KUA' },
]

const inputClass =
  'w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 min-h-[44px] text-base text-gray-900 placeholder-gray-400 outline-none transition focus:border-[var(--w)] focus:ring-1 focus:ring-[var(--w)] disabled:bg-gray-100 disabled:text-gray-500'
const labelClass = 'text-sm font-medium text-gray-700 mb-1 block'
const hintClass = 'text-xs text-gray-500 mt-1 leading-relaxed'

function terjemahGalat(pesan) {
  const p = (pesan || '').toLowerCase()
  if (p.includes('already registered') || p.includes('already been registered')) {
    return 'Email ini sudah terdaftar. Silakan masuk, atau pakai "Lupa kata sandi?" di halaman masuk.'
  }
  if (p.includes('rate limit') || p.includes('too many')) {
    return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.'
  }
  if (p.includes('password')) return 'Kata sandi belum memenuhi syarat. Gunakan minimal 6 karakter.'
  return pesan || 'Gagal mendaftar. Coba lagi.'
}

function Field({ id, label, hint, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input id={id} name={id} className={inputClass} {...inputProps} />
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  )
}

function SelectField({ id, label, hint, children, ...selectProps }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <select id={id} name={id} className={`${inputClass} appearance-none pr-10`} {...selectProps}>
          {children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
      </div>
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  )
}

function PasswordField({ id, label, value, onChange, tampil, onToggle, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={tampil ? 'text' : 'password'}
          required
          autoComplete="new-password"
          placeholder={placeholder}
          className={`${inputClass} pr-12`}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={tampil ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          aria-pressed={tampil}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-800"
        >
          {tampil ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}

function Segmen({ label, opsi, nilai, onPilih, warna }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg text-sm font-medium">
      {opsi.map((o) => {
        const aktif = nilai === o.value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={aktif}
            onClick={() => onPilih(o.value)}
            className={`py-2.5 min-h-[40px] rounded-md transition ${aktif ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            style={aktif ? { backgroundColor: warna } : undefined}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default function RegisterKantor() {
  const { session, daftar } = useAuth()
  const warna = APP.warna

  const [mode, setMode] = useState('gabung') // 'gabung' | 'baru'
  const [daftarKantor, setDaftarKantor] = useState([])
  const [loadingDaftar, setLoadingDaftar] = useState(true)
  const [galatDaftar, setGalatDaftar] = useState(false)
  const [form, setForm] = useState({
    nama: '', nip: '', email: '', password: '', konfirmasi: '',
    jabatan: JABATAN[0].value, sekolahId: '', namaBaru: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sukses, setSukses] = useState(false)
  const [tampilSandi, setTampilSandi] = useState(false)

  useEffect(() => {
    let aktif = true
    supabase
      .from('sekolah')
      .select('id, nama_sekolah')
      .eq('jenis_organisasi', 'kantor')
      .order('nama_sekolah')
      .then(({ data, error }) => {
        if (!aktif) return
        setGalatDaftar(Boolean(error))
        setDaftarKantor(data || [])
        setLoadingDaftar(false)
      })
    return () => { aktif = false }
  }, [])

  if (session) return <Navigate to="/dashboard" replace />

  const ubah = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const nama = form.nama.trim()
    const nip = form.nip.trim()
    const email = form.email.trim().toLowerCase()

    if (!nama) return setError('Isi nama lengkap Anda.')
    if (!nip) return setError('NIP wajib diisi.')
    if (form.password !== form.konfirmasi) return setError('Konfirmasi kata sandi tidak sama.')
    if (form.password.length < 6) return setError('Kata sandi minimal 6 karakter.')
    if (mode === 'gabung' && !form.sekolahId) return setError('Pilih KUA terlebih dahulu.')
    if (mode === 'baru' && !form.namaBaru.trim()) return setError('Isi nama KUA yang akan didaftarkan.')

    setLoading(true)
    const { error: galat } = await daftar({
      mode,
      jenisOrganisasi: 'kantor',
      namaLengkap: nama,
      nip,
      jabatan: form.jabatan,
      email,
      password: form.password,
      sekolahId: form.sekolahId,
      namaSekolah: form.namaBaru.trim(),
    })
    setLoading(false)

    if (galat) return setError(terjemahGalat(galat.message))
    setSukses(true)
  }

  const teksPilih = loadingDaftar
    ? 'Memuat daftar...'
    : galatDaftar
      ? 'Gagal memuat daftar'
      : daftarKantor.length === 0
        ? 'Belum ada KUA terdaftar'
        : '-- Pilih KUA --'

  const Kepala = (
    <div className="text-center">
      <div className="mx-auto mb-3 w-14 h-14 rounded-2xl grid place-items-center text-white" style={{ backgroundColor: warna }}>
        <HeartPulse size={28} aria-hidden />
      </div>
      <p className="text-sm font-semibold" style={{ color: warna }}>{APP.nama}</p>
    </div>
  )

  if (sukses) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-10" style={{ '--w': warna }}>
        <div className="w-full max-w-sm bg-white rounded-2xl border shadow-sm p-7 text-center">
          <CheckCircle2 className="mx-auto text-emerald-600" size={44} aria-hidden />
          <h1 className="text-xl font-bold mt-3">Pendaftaran berhasil</h1>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            {mode === 'baru'
              ? 'KUA dan akun Anda sudah dibuat dan menunggu persetujuan Superadmin. Anda bisa masuk setelah disetujui.'
              : 'Akun Anda sudah dibuat dan menunggu persetujuan admin KUA. Anda bisa masuk setelah disetujui.'}
          </p>
          <Link to="/login" className="inline-block mt-5 text-sm font-semibold underline underline-offset-4" style={{ color: warna }}>
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-10" style={{ '--w': warna }}>
      <div className="w-full max-w-md">
        <div className="mb-5">{Kepala}</div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-sm p-6 sm:p-7 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Daftar akun KUA</h1>
            <p className="text-sm text-gray-600 mt-1">Akun aktif setelah disetujui admin KUA.</p>
          </div>

          <SelectField
            id="reg-jabatan"
            label="Jabatan"
            value={form.jabatan}
            onChange={(e) => ubah('jabatan', e.target.value)}
          >
            {JABATAN.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
          </SelectField>

          <Field id="reg-nama" label="Nama lengkap" required autoComplete="name" value={form.nama} onChange={(e) => ubah('nama', e.target.value)} />

          <Field
            id="reg-nip"
            label="NIP"
            required
            inputMode="numeric"
            autoComplete="off"
            hint="Isi NIP Anda."
            value={form.nip}
            onChange={(e) => ubah('nip', e.target.value)}
          />

          <Segmen
            label="Gabung atau daftarkan KUA"
            opsi={[{ value: 'gabung', label: 'Gabung KUA' }, { value: 'baru', label: 'KUA baru' }]}
            nilai={mode}
            onPilih={setMode}
            warna={warna}
          />

          {mode === 'gabung' ? (
            <SelectField
              id="reg-puskesmas"
              label="KUA"
              required
              value={form.sekolahId}
              onChange={(e) => ubah('sekolahId', e.target.value)}
              disabled={loadingDaftar}
              hint={
                !loadingDaftar && !galatDaftar && daftarKantor.length === 0
                  ? 'Belum ada KUA terdaftar. Pilih "KUA baru" di atas.'
                  : galatDaftar
                    ? 'Daftar tidak bisa dimuat. Periksa koneksi internet lalu muat ulang halaman.'
                    : undefined
              }
            >
              <option value="">{teksPilih}</option>
              {daftarKantor.map((s) => <option key={s.id} value={s.id}>{s.nama_sekolah}</option>)}
            </SelectField>
          ) : (
            <Field
              id="reg-nama-baru"
              label="Nama KUA"
              required
              autoComplete="off"
              placeholder="Contoh: KUA Kecamatan Contoh"
              hint="Anda menjadi penanggung jawab akun untuk KUA ini."
              value={form.namaBaru}
              onChange={(e) => ubah('namaBaru', e.target.value)}
            />
          )}

          <Field
            id="reg-email"
            label="Email"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nama@email.com"
            hint="Pakai email aktif. Dipakai untuk masuk dan memulihkan kata sandi."
            value={form.email}
            onChange={(e) => ubah('email', e.target.value)}
          />

          <PasswordField id="reg-password" label="Kata sandi" placeholder="Minimal 6 karakter" value={form.password} onChange={(e) => ubah('password', e.target.value)} tampil={tampilSandi} onToggle={() => setTampilSandi((v) => !v)} />
          <PasswordField id="reg-konfirmasi" label="Ulangi kata sandi" placeholder="Ketik ulang kata sandi" value={form.konfirmasi} onChange={(e) => ubah('konfirmasi', e.target.value)} tampil={tampilSandi} onToggle={() => setTampilSandi((v) => !v)} />

          <div className="flex gap-2.5 rounded-lg bg-gray-50 border p-3 text-[13px] leading-relaxed text-gray-600">
            <Info size={16} className="shrink-0 mt-0.5" style={{ color: warna }} aria-hidden />
            <span>
              Akun baru berstatus menunggu sampai disetujui. Ada kendala? Hubungi admin KUA Anda.
            </span>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-lg shadow-sm hover:brightness-110 transition disabled:opacity-60"
            style={{ backgroundColor: warna }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Daftar'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-semibold underline underline-offset-4" style={{ color: warna }}>Masuk</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
