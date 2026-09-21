import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { Loader2, UserPlus, CheckCircle2, ListChecks, Info, Eye, EyeOff, ChevronDown } from 'lucide-react'

// Jabatan yang tersedia per jenis institusi. Kantor tidak punya konsep
// "orang_tua" (tidak ada relasi siswa), jadi daftarnya lebih pendek.
const JABATAN_SEKOLAH = [
  { value: 'guru', label: 'Guru' },
  { value: 'admin', label: 'Admin' },
  { value: 'kepala_sekolah', label: 'Kepala Sekolah' },
  { value: 'orang_tua', label: 'Orang Tua / Wali Murid' },
]

const JABATAN_KANTOR = [
  { value: 'pegawai', label: 'Pegawai' },
  { value: 'admin', label: 'Admin' },
  { value: 'kepala_kantor', label: 'Kepala Kantor / Kepala KUA' },
]

// Nilai internal ('sekolah' | 'kantor') TIDAK diubah karena sama dengan
// kolom jenis_organisasi di database. Yang berubah hanya tulisan di layar:
// "Kantor" diberi keterangan (KUA) supaya pengunjung dari KUA yakin ini
// pintu yang benar — sama dengan istilah di beranda.
const OPSI_JENIS = [
  { value: 'sekolah', label: 'Sekolah' },
  { value: 'kantor', label: 'Kantor (KUA)' },
]

const inputClass =
  'w-full bg-slate-900/60 border border-blue-500/30 rounded-lg px-3 py-2.5 min-h-[44px] text-base text-white placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60'
const labelClass = 'text-xs font-medium text-blue-100/85 mb-1 block tracking-wide'
const hintClass = 'text-xs text-blue-200/75 mt-1 leading-relaxed'

// Terjemahkan pesan galat bawaan Supabase yang berbahasa Inggris.
function terjemahGalat(pesan) {
  const p = (pesan || '').toLowerCase()
  if (p.includes('already registered') || p.includes('already been registered')) {
    return 'Email ini sudah terdaftar. Silakan masuk, atau pakai "Lupa kata sandi?" di halaman masuk.'
  }
  if (p.includes('rate limit') || p.includes('too many')) {
    return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.'
  }
  if (p.includes('password')) {
    return 'Kata sandi belum memenuhi syarat. Gunakan minimal 6 karakter.'
  }
  return pesan || 'Gagal mendaftar. Coba lagi.'
}

// ---- Komponen kecil di LUAR komponen utama ---------------------------
// Sebelumnya Background dan InfoBox didefinisikan di dalam Register(), jadi
// dibuat ulang (dan dipasang ulang) di setiap ketikan. Dipindah ke sini
// supaya tidak dibangun ulang terus-menerus.

function Latar() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,#1e3a8a_0%,transparent_45%),radial-gradient(circle_at_85%_80%,#1d4ed8_0%,transparent_50%),linear-gradient(160deg,#05061a_0%,#0a0f2e_45%,#0d1440_100%)]" />
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M 46 0 L 0 0 0 46" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl" />
    </div>
  )
}

// Kolom isian teks dengan label yang terhubung (klik label -> fokus ke kolom).
function Field({ id, label, hint, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input id={id} name={id} className={inputClass} {...inputProps} />
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  )
}

// Kolom sandi dengan tombol lihat/sembunyikan.
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
          className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-md text-blue-200/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"
        >
          {tampil ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}

// Kolom pilihan (select) dengan panah sendiri supaya menyatu dengan tema
// gelap, bukan panah putih bawaan browser.
function SelectField({ id, label, hint, children, ...selectProps }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <select
          id={id}
          name={id}
          className={`${inputClass} appearance-none pr-10 [color-scheme:dark]`}
          {...selectProps}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-200/80"
          aria-hidden
        />
      </div>
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  )
}

// Tombol pilihan dua arah (segmented control) dengan status tekan.
function Segmen({ label, opsi, nilai, onPilih }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid grid-cols-2 gap-2 p-1 bg-slate-900/60 border border-blue-500/30 rounded-lg text-sm font-medium"
    >
      {opsi.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={nilai === o.value}
          onClick={() => onPilih(o.value)}
          className={`py-2.5 min-h-[40px] rounded-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300 ${
            nilai === o.value ? 'bg-blue-500/80 text-white' : 'text-blue-100/75 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function Register() {
  const { session, daftar } = useAuth()

  // Link dari beranda membawa ?untuk=kua atau ?untuk=sekolah, jadi pengunjung
  // yang sudah memilih jenis instansinya di beranda tidak perlu memilih lagi.
  const [searchParams] = useSearchParams()
  const awalKantor = searchParams.get('untuk') === 'kua'

  // Jenis institusi dipilih dulu sebelum jabatan, karena menentukan
  // daftar jabatan yang tersedia dan daftar institusi (sekolah/kantor)
  // yang dimuat dari tabel "sekolah" (dibedakan lewat jenis_organisasi).
  const [jenisInstitusi, setJenisInstitusi] = useState(awalKantor ? 'kantor' : 'sekolah') // 'sekolah' | 'kantor'
  const [mode, setMode] = useState('gabung') // 'gabung' | 'baru'
  const [daftarInstitusi, setDaftarInstitusi] = useState([])
  const [loadingInstitusi, setLoadingInstitusi] = useState(true)
  const [galatInstitusi, setGalatInstitusi] = useState(false)
  const [form, setForm] = useState({
    nama: '',
    email: '',
    password: '',
    konfirmasi: '',
    jabatan: awalKantor ? JABATAN_KANTOR[0].value : JABATAN_SEKOLAH[0].value,
    sekolahId: '',
    namaSekolahBaru: '',
    siswaId: '',
    hubungan: '',
    nip: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sukses, setSukses] = useState(false)
  const [tampilSandi, setTampilSandi] = useState(false)

  // Daftar siswa untuk sekolah yang dipilih — hanya relevan kalau
  // jenisInstitusi adalah "sekolah" DAN jabatan yang dipilih "orang_tua",
  // karena mereka wajib memilih anak. Kantor tidak punya siswa sama sekali.
  const [daftarSiswa, setDaftarSiswa] = useState([])
  const [loadingSiswa, setLoadingSiswa] = useState(false)

  const isKantor = jenisInstitusi === 'kantor'
  const isOrangTua = !isKantor && form.jabatan === 'orang_tua'
  const opsiJabatan = isKantor ? JABATAN_KANTOR : JABATAN_SEKOLAH
  const kata = isKantor ? 'kantor' : 'sekolah'
  const Kata = isKantor ? 'Kantor' : 'Sekolah'

  // Muat daftar institusi (sekolah ATAU kantor) sesuai jenis yang dipilih.
  // Keduanya disimpan di tabel "sekolah" yang sama, dibedakan lewat
  // jenis_organisasi, jadi cukup difilter di sini.
  useEffect(() => {
    let aktif = true
    setLoadingInstitusi(true)
    setGalatInstitusi(false)

    supabase
      .from('sekolah')
      .select('id, nama_sekolah')
      .eq('jenis_organisasi', jenisInstitusi)
      .order('nama_sekolah')
      .then(({ data, error }) => {
        if (!aktif) return
        setGalatInstitusi(Boolean(error))
        setDaftarInstitusi(data || [])
        setLoadingInstitusi(false)
      })

    return () => {
      aktif = false
    }
  }, [jenisInstitusi])

  useEffect(() => {
    if (!isOrangTua || !form.sekolahId) {
      setDaftarSiswa([])
      return
    }

    let aktif = true
    setLoadingSiswa(true)

    supabase
      .from('siswa_publik_registrasi')
      .select('id, nama_lengkap, nis, nisn')
      .eq('sekolah_id', form.sekolahId)
      .order('nama_lengkap')
      .then(({ data }) => {
        if (!aktif) return
        setDaftarSiswa(data || [])
        setLoadingSiswa(false)
      })

    return () => {
      aktif = false
    }
  }, [isOrangTua, form.sekolahId])

  // Sudah login → tidak perlu mendaftar lagi, langsung ke dashboard
  if (session) return <Navigate to="/dashboard" replace />

  if (sukses) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <Latar />
        <div className="relative max-w-sm w-full text-center bg-slate-900/70 backdrop-blur-xl p-7 rounded-2xl border border-blue-400/30 shadow-[0_0_40px_-10px_rgba(59,130,246,0.35)]">
          <div className="mx-auto mb-3 w-14 h-14 rounded-full border border-emerald-400/40 flex items-center justify-center bg-emerald-400/10">
            <CheckCircle2 className="text-emerald-400" size={28} />
          </div>
          <h1 className="text-lg font-semibold text-white tracking-wide">Pendaftaran Berhasil</h1>
          <p className="text-sm text-blue-100/80 mt-2 leading-relaxed">
            {mode === 'baru'
              ? `${Kata} dan akun Anda sudah dibuat, sedang menunggu persetujuan Superadmin. Anda akan bisa login setelah disetujui.`
              : isOrangTua
                ? 'Akun Anda sudah dibuat dan permintaan menghubungkan Anda dengan anak sedang menunggu persetujuan admin sekolah. Anda akan bisa login setelah disetujui.'
                : `Akun Anda sudah dibuat dan sedang menunggu persetujuan admin ${kata}. Anda akan bisa login setelah disetujui.`}
          </p>
          <Link to="/login" className="inline-block mt-4 text-sm font-medium text-blue-300 hover:text-white underline-offset-4 hover:underline">
            Kembali ke halaman Masuk
          </Link>
        </div>
      </div>
    )
  }

  function ubah(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  // Ganti jenis institusi → reset semua field yang tergantung padanya,
  // karena jabatan, daftar institusi, dan mode bisa jadi tidak valid lagi
  // untuk jenis yang baru (mis. jabatan "orang_tua" tidak ada di Kantor).
  function ubahJenisInstitusi(value) {
    setJenisInstitusi(value)
    setMode('gabung')
    setError('')
    setForm((f) => ({
      ...f,
      jabatan: value === 'kantor' ? JABATAN_KANTOR[0].value : JABATAN_SEKOLAH[0].value,
      sekolahId: '',
      namaSekolahBaru: '',
      siswaId: '',
      hubungan: '',
      nip: '',
    }))
  }

  // Jabatan "orang_tua" hanya boleh bergabung ke sekolah yang sudah ada
  // (tidak bisa sekaligus mendaftarkan sekolah baru), jadi mode dikunci
  // ke 'gabung' begitu jabatan ini dipilih. siswaId & hubungan direset
  // setiap kali jabatan berganti supaya tidak salah bawa data lama.
  function ubahJabatan(value) {
    setForm((f) => ({ ...f, jabatan: value, siswaId: '', hubungan: '' }))
    if (value === 'orang_tua') {
      setMode('gabung')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const nama = form.nama.trim()
    const email = form.email.trim().toLowerCase()

    if (!nama) {
      setError('Isi nama lengkap Anda.')
      return
    }
    if (form.password !== form.konfirmasi) {
      setError('Konfirmasi kata sandi tidak sama.')
      return
    }
    if (form.password.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }
    if (mode === 'gabung' && !form.sekolahId) {
      setError(`Pilih ${kata} terlebih dahulu.`)
      return
    }
    if (mode === 'baru' && !form.namaSekolahBaru.trim()) {
      setError(`Isi nama ${kata} yang akan didaftarkan.`)
      return
    }
    if (isKantor && !form.nip.trim()) {
      setError('NIP wajib diisi untuk pegawai kantor.')
      return
    }
    if (isOrangTua && !form.siswaId) {
      setError('Pilih anak Anda dari daftar siswa.')
      return
    }
    if (isOrangTua && !form.hubungan) {
      setError('Pilih hubungan Anda dengan anak.')
      return
    }

    setLoading(true)

    const { error: daftarError } = await daftar({
      mode,
      jenisOrganisasi: jenisInstitusi,
      namaLengkap: nama,
      jabatan: form.jabatan,
      email,
      password: form.password,
      sekolahId: form.sekolahId,
      namaSekolah: form.namaSekolahBaru.trim(),
      siswaId: form.siswaId || undefined,
      hubungan: form.hubungan || undefined,
      nip: isKantor ? form.nip.trim() : undefined,
    })

    setLoading(false)

    if (daftarError) {
      setError(terjemahGalat(daftarError.message))
      return
    }

    setSukses(true)
  }

  // Teks pilihan awal pada daftar institusi, sesuai keadaan pemuatan.
  const teksPilihInstitusi = loadingInstitusi
    ? 'Memuat daftar...'
    : galatInstitusi
      ? 'Gagal memuat daftar'
      : daftarInstitusi.length === 0
        ? `Belum ada ${kata} terdaftar`
        : `-- Pilih ${Kata} --`

  const langkah = [
    'Pilih jenis institusi: Sekolah atau Kantor (KUA).',
    isKantor
      ? 'Isi nama lengkap dan NIP (Nomor Induk Pegawai), lalu pilih jabatan: Pegawai, Admin, atau Kepala Kantor.'
      : 'Isi nama lengkap, lalu pilih jabatan: Guru, Admin, Kepala Sekolah, atau Orang Tua/Wali Murid.',
    isKantor
      ? 'Pilih kantor yang sudah terdaftar, atau daftarkan kantor baru.'
      : 'Guru/Admin/Kepala Sekolah: pilih sekolah yang sudah terdaftar atau daftarkan sekolah baru. Orang Tua/Wali: pilih sekolah anak Anda, lalu pilih nama anak.',
    'Isi email aktif (dipakai untuk login) dan buat kata sandi minimal 6 karakter.',
    'Tunggu persetujuan admin, lalu masuk.',
  ]

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <Latar />

      <div className="relative w-full max-w-md space-y-4">
        {/* Panduan langkah: dilipat supaya formulir tetap jadi fokus, tapi
            tetap mudah dibuka oleh yang butuh. */}
        <details className="rounded-xl border border-blue-400/25 bg-slate-900/60 backdrop-blur-xl px-4 py-3">
          <summary className="cursor-pointer select-none flex items-center gap-2 text-sm font-medium text-blue-100">
            <ListChecks size={16} className="text-blue-300 shrink-0" />
            Butuh panduan? Lihat langkah pendaftaran
          </summary>
          <ol className="mt-3 space-y-2 list-decimal pl-5 text-[13px] leading-relaxed text-blue-100/85">
            {langkah.map((teks, i) => (
              <li key={i}>{teks}</li>
            ))}
          </ol>
        </details>

        <form
          onSubmit={handleSubmit}
          className="relative w-full bg-slate-900/70 backdrop-blur-xl p-6 sm:p-7 rounded-2xl border border-blue-400/30 shadow-[0_0_40px_-10px_rgba(59,130,246,0.35)] space-y-4"
        >
          <div className="text-center mb-2">
            <div className="mx-auto mb-3 w-14 h-14 rounded-full border border-blue-400/40 flex items-center justify-center bg-blue-400/10 shadow-[0_0_20px_-4px_rgba(96,165,250,0.6)]">
              <UserPlus className="text-blue-300" size={24} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-widest uppercase">Daftar Akun</h1>
            <p className="text-sm text-blue-100/80 mt-1">Akun akan aktif setelah disetujui admin.</p>
          </div>

          {/* Jenis institusi: menentukan jabatan yang tersedia dan daftar
              institusi yang dimuat. */}
          <div>
            <span className={labelClass}>Jenis Institusi</span>
            <Segmen
              label="Jenis institusi"
              opsi={OPSI_JENIS}
              nilai={jenisInstitusi}
              onPilih={ubahJenisInstitusi}
            />
          </div>

          <SelectField
            id="reg-jabatan"
            label="Jabatan"
            value={form.jabatan}
            onChange={(e) => ubahJabatan(e.target.value)}
            hint={
              isOrangTua
                ? 'Akun Orang Tua/Wali hanya dapat bergabung ke sekolah yang sudah terdaftar, lalu dihubungkan ke data anak Anda.'
                : mode === 'baru'
                  ? `Karena mendaftarkan ${kata} baru, akun Anda otomatis jadi Admin Utama ${kata} ini.`
                  : undefined
            }
          >
            {opsiJabatan.map((j) => (
              <option key={j.value} value={j.value} className="bg-slate-900">{j.label}</option>
            ))}
          </SelectField>

          <Field
            id="reg-nama"
            label="Nama Lengkap"
            required
            autoComplete="name"
            value={form.nama}
            onChange={(e) => ubah('nama', e.target.value)}
          />

          {/* Khusus institusi Kantor: setiap pegawai wajib mengisi NIP
              (Nomor Induk Pegawai) sebagai identitas kepegawaian. */}
          {isKantor && (
            <Field
              id="reg-nip"
              label="NIP"
              required
              inputMode="numeric"
              autoComplete="off"
              placeholder="Nomor Induk Pegawai"
              value={form.nip}
              onChange={(e) => ubah('nip', e.target.value)}
            />
          )}

          {/* Mode: Gabung institusi yang sudah ada / Daftar institusi baru.
              Disembunyikan untuk Orang Tua/Wali — mereka wajib gabung ke
              sekolah yang sudah ada. */}
          {!isOrangTua && (
            <Segmen
              label={`Gabung atau daftarkan ${kata}`}
              opsi={[
                { value: 'gabung', label: `Gabung ${Kata}` },
                { value: 'baru', label: `Daftar ${Kata} Baru` },
              ]}
              nilai={mode}
              onPilih={setMode}
            />
          )}

          {mode === 'gabung' || isOrangTua ? (
            <SelectField
              id="reg-institusi"
              label={Kata}
              required
              value={form.sekolahId}
              onChange={(e) => ubah('sekolahId', e.target.value)}
              disabled={loadingInstitusi}
              hint={
                !loadingInstitusi && !galatInstitusi && daftarInstitusi.length === 0
                  ? `Belum ada ${kata} terdaftar. Pilih "Daftar ${Kata} Baru" di atas.`
                  : galatInstitusi
                    ? 'Daftar tidak bisa dimuat. Periksa koneksi internet lalu muat ulang halaman.'
                    : undefined
              }
            >
              <option value="" className="bg-slate-900">{teksPilihInstitusi}</option>
              {daftarInstitusi.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900">{s.nama_sekolah}</option>
              ))}
            </SelectField>
          ) : (
            <Field
              id="reg-nama-baru"
              label={`Nama ${Kata} Baru`}
              required
              autoComplete="off"
              placeholder={isKantor ? 'Contoh: KUA Kecamatan Contoh' : 'Contoh: SD Negeri Contoh'}
              value={form.namaSekolahBaru}
              onChange={(e) => ubah('namaSekolahBaru', e.target.value)}
            />
          )}

          {/* Khusus Orang Tua/Wali (hanya ada di jenis institusi Sekolah):
              pilih anak dari daftar siswa sekolah yang baru saja dipilih,
              lalu pilih hubungan dengan anak tersebut. */}
          {isOrangTua && (
            <>
              <SelectField
                id="reg-siswa"
                label="Nama Anak"
                required
                value={form.siswaId}
                onChange={(e) => ubah('siswaId', e.target.value)}
                disabled={!form.sekolahId || loadingSiswa}
                hint="Tidak menemukan nama anak Anda? Hubungi admin sekolah untuk memastikan data siswa sudah terdaftar."
              >
                <option value="" className="bg-slate-900">
                  {!form.sekolahId
                    ? '-- Pilih sekolah terlebih dahulu --'
                    : loadingSiswa
                      ? 'Memuat daftar siswa...'
                      : daftarSiswa.length === 0
                        ? 'Tidak ada siswa di sekolah ini'
                        : '-- Pilih Anak --'}
                </option>
                {daftarSiswa.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900">
                    {s.nama_lengkap}
                    {s.nis ? ` (NIS: ${s.nis})` : ''}
                  </option>
                ))}
              </SelectField>

              <SelectField
                id="reg-hubungan"
                label="Hubungan dengan Anak"
                required
                value={form.hubungan}
                onChange={(e) => ubah('hubungan', e.target.value)}
              >
                <option value="" className="bg-slate-900">-- Pilih Hubungan --</option>
                <option value="ayah" className="bg-slate-900">Ayah</option>
                <option value="ibu" className="bg-slate-900">Ibu</option>
                <option value="wali" className="bg-slate-900">Wali</option>
              </SelectField>
            </>
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
            hint="Gunakan email yang aktif — dipakai untuk masuk dan memulihkan kata sandi."
            value={form.email}
            onChange={(e) => ubah('email', e.target.value)}
          />

          <PasswordField
            id="reg-password"
            label="Kata Sandi"
            placeholder="Minimal 6 karakter"
            value={form.password}
            onChange={(e) => ubah('password', e.target.value)}
            tampil={tampilSandi}
            onToggle={() => setTampilSandi((v) => !v)}
          />

          <PasswordField
            id="reg-konfirmasi"
            label="Konfirmasi Kata Sandi"
            placeholder="Ketik ulang kata sandi"
            value={form.konfirmasi}
            onChange={(e) => ubah('konfirmasi', e.target.value)}
            tampil={tampilSandi}
            onToggle={() => setTampilSandi((v) => !v)}
          />

          {/* Hal penting yang harus diketahui sebelum menekan Daftar —
              ditaruh tepat di atas tombol, bukan di kolom samping. */}
          <div className="flex gap-2.5 rounded-lg border border-blue-400/20 bg-blue-500/5 p-3 text-[13px] leading-relaxed text-blue-100/85">
            <Info size={16} className="text-blue-300 shrink-0 mt-0.5" aria-hidden />
            <ul className="space-y-1">
              <li>Akun baru berstatus "menunggu" sampai disetujui admin {kata}. Anda baru bisa masuk setelah disetujui.</li>
              {mode === 'baru' && !isOrangTua && (
                <li>Mendaftarkan {kata} baru menjadikan Anda Admin Utama {kata} ini.</li>
              )}
              {isOrangTua && <li>Akun Anda akan dihubungkan ke data anak yang dipilih.</li>}
              <li>Ada kendala? Hubungi admin {kata} Anda secara langsung.</li>
            </ul>
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-red-200 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-400 text-white font-medium py-2.5 rounded-lg shadow-[0_0_25px_-6px_rgba(59,130,246,0.7)] hover:brightness-110 transition disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Daftar'}
          </button>

          <p className="text-center text-sm text-blue-100/80">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-blue-300 font-medium hover:text-white underline-offset-4 hover:underline">
              Masuk
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
