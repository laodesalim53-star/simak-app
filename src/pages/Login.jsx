import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Loader2, LogIn, Eye, EyeOff, Send, Check, ArrowLeft } from 'lucide-react'

// =====================================================================
// TEMA PER JENIS INSTANSI
// =====================================================================
// Halaman login TIDAK tahu siapa yang akan masuk sebelum submit form,
// jadi tema dipilih lewat URL, bukan lewat data akun. Rute yang perlu
// ditambahkan di App.jsx:
//
//   <Route path="/login" element={<Login />} />
//   <Route path="/login/:jenis" element={<Login />} />
//
// Lalu setiap instansi diberi tautan sendiri, mis.:
//   https://app-anda.com/login/sekolah    (default kalau :jenis kosong/tidak dikenal)
//   https://app-anda.com/login/kua
//   https://app-anda.com/login/puskesmas
//
// Kalau di kemudian hari Anda ingin tema mengikuti data instansi milik
// akun (bukan URL) itu perlu dua langkah: (1) tampilkan tema netral +
// kolom email dulu, (2) setelah email diketik, query tabel instansi utk
// tahu jenisnya, baru render ulang warna — jauh lebih rumit dari sekadar
// baca URL, jadi disarankan mulai dari pendekatan URL ini dulu.

const TEMA = {
  sekolah: {
    label: 'Sekolah',
    judul: 'SIMAK',
    tagline: 'Sistem Informasi untuk Sekolah',
    hurufBadge: 'S',
    // 4 warna kain: [lapis-atas-1, lapis-atas-2, lapis-bawah-1, lapis-bawah-2]
    kain: ['#c81e1e', '#e23b3b', '#f5f5f0', '#ffffff'],
    aksen: '#60a5fa',
    aksenKuat: '#bfdbfe',
    tekstasAtas: [
      'Ing Ngarsa Sung Tuladha — di depan memberi teladan.',
      'Ing Madya Mangun Karsa — di tengah membangun semangat dan ide.',
      'Tut Wuri Handayani — di belakang memberi dorongan dan arahan.',
    ],
    teksBawah: [
      'Guru tidak selalu harus di depan.',
      'Guru memberi ruang bagi murid untuk tumbuh mandiri dan percaya diri.',
    ],
  },
  kua: {
    label: 'KUA',
    judul: 'SIMAK',
    tagline: 'Sistem Informasi untuk Kantor Urusan Agama',
    hurufBadge: 'K',
    kain: ['#0d7a4e', '#16a367', '#f5f5f0', '#ffffff'],
    aksen: '#34d399',
    aksenKuat: '#bbf7d0',
    tekstasAtas: [
      'Melayani urusan keagamaan dengan amanah.',
      'Pencatatan nikah, rujuk, dan bimbingan keluarga sakinah.',
    ],
    teksBawah: [
      'Keluarga yang kuat dimulai dari pelayanan yang tulus.',
      'KUA hadir untuk membangun keluarga sakinah, mawaddah, warahmah.',
    ],
  },
  puskesmas: {
    label: 'Puskesmas',
    judul: 'SIMAK',
    tagline: 'Sistem Informasi untuk Puskesmas',
    hurufBadge: 'P',
    kain: ['#0e7490', '#0891b2', '#f0fdfa', '#ffffff'],
    aksen: '#2dd4bf',
    aksenKuat: '#99f6e4',
    tekstasAtas: [
      'Sehat dimulai dari layanan yang dekat dengan masyarakat.',
      'Puskesmas — garda terdepan pelayanan kesehatan.',
    ],
    teksBawah: [
      'Mencegah lebih baik daripada mengobati.',
      'Kami hadir untuk kesehatan keluarga Anda, dari posyandu hingga lansia.',
    ],
  },
}

const JENIS_DEFAULT = 'sekolah'

function ambilTema(jenisMentah) {
  const kunci = (jenisMentah || '').toLowerCase()
  return TEMA[kunci] || TEMA[JENIS_DEFAULT]
}

// =====================================================================
// Latar belakang "kain bergelombang" — warnanya sekarang mengikuti
// tema (props `kain`), bukan hardcoded merah-putih lagi.
// =====================================================================
function WavyClothBackground({ kain }) {
  const redTopRef = useRef(null)
  const redTop2Ref = useRef(null)
  const whiteBottomRef = useRef(null)
  const whiteBottom2Ref = useRef(null)

  useEffect(() => {
    const W = 1000
    const H = 1000
    let animationId

    function wavePathTop(baseY, amp, waves, phase) {
      const N = 48
      const pts = []
      for (let i = 0; i <= N; i++) {
        const x = (i / N) * W
        const y = baseY + amp * Math.sin((i / N) * Math.PI * 2 * waves + phase)
        pts.push(`${x},${y}`)
      }
      return `M0,0 L0,${pts[0].split(',')[1]} L${pts.join(' L')} L${W},0 Z`
    }

    function wavePathBottom(baseY, amp, waves, phase) {
      const N = 48
      const pts = []
      for (let i = 0; i <= N; i++) {
        const x = (i / N) * W
        const y = baseY + amp * Math.sin((i / N) * Math.PI * 2 * waves + phase)
        pts.push(`${x},${y}`)
      }
      return `M0,${H} L0,${pts[0].split(',')[1]} L${pts.join(' L')} L${W},${H} Z`
    }

    function gambar(t) {
      if (redTopRef.current) {
        redTopRef.current.setAttribute('d', wavePathTop(260, 32, 2.5, t))
      }
      if (redTop2Ref.current) {
        redTop2Ref.current.setAttribute('d', wavePathTop(266, 24, 2.5, t * 1.3 + 1.5))
      }
      if (whiteBottomRef.current) {
        whiteBottomRef.current.setAttribute('d', wavePathBottom(850, 32, 2.5, -t * 1.1))
      }
      if (whiteBottom2Ref.current) {
        whiteBottom2Ref.current.setAttribute('d', wavePathBottom(844, 24, 2.5, -t * 1.4 + 2))
      }
    }

    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (kurangiGerak) {
      gambar(0.5)
      return
    }

    let terakhir = 0
    function frame(now) {
      if (now - terakhir >= 33) {
        terakhir = now
        gambar(now * 0.00084)
      }
      animationId = requestAnimationFrame(frame)
    }
    animationId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animationId)
  }, [])

  const [warnaAtas1, warnaAtas2, warnaBawah1, warnaBawah2] = kain

  return (
    <svg
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      className="wavy-cloth-svg"
      aria-hidden
    >
      <path ref={redTopRef} fill={warnaAtas1} />
      <path ref={redTop2Ref} fill={warnaAtas2} opacity="0.55" />
      <path ref={whiteBottomRef} fill={warnaBawah1} />
      <path ref={whiteBottom2Ref} fill={warnaBawah2} opacity="0.6" />
    </svg>
  )
}

function PasswordField({ id, label, value, onChange, tampil, onToggle, autoComplete, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="login-eyebrow mb-1.5 block">{label}</label>
      <div className="login-field-wrap">
        <input
          id={id}
          name={id}
          type={tampil ? 'text' : 'password'}
          required
          className="login-field login-field-pw w-full transition-shadow duration-200"
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="login-eye"
          onClick={onToggle}
          aria-label={tampil ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          aria-pressed={tampil}
        >
          {tampil ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}

export default function Login() {
  const { session, signIn } = useAuth()
  const location = useLocation()
  const { jenis: jenisUrl } = useParams() // dari rute /login/:jenis
  const tema = useMemo(() => ambilTema(jenisUrl), [jenisUrl])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [shake, setShake] = useState(0)
  const [tampilSandi, setTampilSandi] = useState(false)

  const [mode, setMode] = useState(() =>
    typeof window !== 'undefined' && /type=recovery/.test(window.location.hash) ? 'baru' : 'masuk'
  )
  const [passwordBaru, setPasswordBaru] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, [])

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('baru')
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const from = location.state?.from
    ? location.state.from.pathname + (location.state.from.search || '')
    : '/dashboard'

  if (session && mode !== 'baru') return <Navigate to={from} replace />

  function gagal(pesan) {
    setError(pesan)
    setShake((s) => s + 1)
  }

  function gantiMode(m) {
    setMode(m)
    setError('')
    setInfo('')
    setTampilSandi(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)
    if (error) gagal('Email atau kata sandi salah. Silakan coba lagi.')
  }

  async function handleLupa(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    })
    setLoading(false)
    if (error) {
      gagal(
        error.status === 429
          ? 'Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.'
          : 'Permintaan belum terkirim. Periksa koneksi internet lalu coba lagi.'
      )
      return
    }
    setInfo(
      'Jika email itu terdaftar, tautan untuk membuat kata sandi baru sudah dikirim. Periksa kotak masuk dan folder spam.'
    )
  }

  async function handleBaru(e) {
    e.preventDefault()
    setError('')
    if (passwordBaru.length < 6) {
      gagal('Kata sandi minimal 6 karakter.')
      return
    }
    if (passwordBaru !== konfirmasi) {
      gagal('Konfirmasi kata sandi tidak sama.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passwordBaru })
    setLoading(false)
    if (error) {
      gagal('Kata sandi gagal diubah. Tautan mungkin sudah kedaluwarsa — minta tautan baru.')
      return
    }
    window.history.replaceState(null, '', window.location.pathname)
    setPasswordBaru('')
    setKonfirmasi('')
    setMode('masuk')
  }

  const subjudul =
    mode === 'lupa'
      ? 'Atur ulang kata sandi'
      : mode === 'baru'
        ? 'Buat kata sandi baru'
        : 'Selamat datang'

  const onSubmit = mode === 'lupa' ? handleLupa : mode === 'baru' ? handleBaru : handleSubmit

  // Variabel CSS dinamis per tema, dioper lewat style inline di root,
  // jadi seluruh blok <style> di bawah tetap satu dan generik.
  const varTema = {
    '--accent': tema.aksen,
    '--accent-strong': tema.aksenKuat,
    '--ring': `${tema.aksen}48`,
    '--ring-soft': `${tema.aksen}1f`,
  }

  return (
    <div className="login-shell min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={varTema}>
      <WavyClothBackground kain={tema.kain} />
      <div className="login-overlay" aria-hidden />

      <div className="cloth-text cloth-text-top" aria-hidden>
        {tema.tekstasAtas.map((baris) => (
          <p key={baris}>{baris}</p>
        ))}
      </div>

      <div className="cloth-text cloth-text-bottom" aria-hidden>
        {tema.teksBawah.map((baris) => (
          <p key={baris}>{baris}</p>
        ))}
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div
          className={`text-center mb-8 transition-all duration-700 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="login-badge-glow absolute inset-0 rounded-xl" />
            <div className="login-badge relative w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl">
              {tema.hurufBadge}
            </div>
          </div>
          <h1 className="login-title text-2xl font-semibold">{tema.judul}</h1>
          <p className="login-tagline text-xs font-medium uppercase tracking-[0.16em] mt-2">
            {tema.tagline}
          </p>
          <p className="login-school text-sm font-medium mt-1.5">{subjudul}</p>
        </div>

        <form
          onSubmit={onSubmit}
          className={`login-card p-6 space-y-4 transition-all duration-700 ease-out delay-150 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {mode === 'lupa' && (
            <p className="login-hint">
              Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru.
            </p>
          )}
          {mode === 'baru' && (
            <p className="login-hint">
              Tautan valid. Buat kata sandi baru untuk akun Anda (minimal 6 karakter).
            </p>
          )}

          {mode !== 'baru' && (
            <div>
              <label htmlFor="login-email" className="login-eyebrow mb-1.5 block">Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="login-field w-full transition-shadow duration-200"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {mode === 'masuk' && (
            <>
              <PasswordField
                id="login-password"
                label="Kata Sandi"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                tampil={tampilSandi}
                onToggle={() => setTampilSandi((v) => !v)}
              />
              <div className="text-right -mt-2">
                <button type="button" className="login-link-btn" onClick={() => gantiMode('lupa')}>
                  Lupa kata sandi?
                </button>
              </div>
            </>
          )}

          {mode === 'baru' && (
            <>
              <PasswordField
                id="login-password-baru"
                label="Kata Sandi Baru"
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
                value={passwordBaru}
                onChange={(e) => setPasswordBaru(e.target.value)}
                tampil={tampilSandi}
                onToggle={() => setTampilSandi((v) => !v)}
              />
              <PasswordField
                id="login-konfirmasi"
                label="Ulangi Kata Sandi Baru"
                placeholder="Ketik ulang kata sandi"
                autoComplete="new-password"
                value={konfirmasi}
                onChange={(e) => setKonfirmasi(e.target.value)}
                tampil={tampilSandi}
                onToggle={() => setTampilSandi((v) => !v)}
              />
            </>
          )}

          {error && (
            <p
              key={shake}
              role="alert"
              className="login-error text-sm animate-[shake_0.4s_ease-in-out]"
            >
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="login-info text-sm">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="login-btn w-full transition-transform duration-150 active:scale-[0.98] hover:scale-[1.01]"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : mode === 'lupa' ? (
              <Send size={16} />
            ) : mode === 'baru' ? (
              <Check size={16} />
            ) : (
              <LogIn size={16} />
            )}
            {mode === 'lupa' ? 'Kirim tautan' : mode === 'baru' ? 'Simpan kata sandi' : 'Masuk'}
          </button>

          {mode === 'lupa' && (
            <div className="text-center">
              <button type="button" className="login-link-btn" onClick={() => gantiMode('masuk')}>
                <ArrowLeft size={14} className="inline -mt-0.5 mr-1" />
                Kembali ke halaman masuk
              </button>
            </div>
          )}
        </form>

        {mode === 'masuk' && (
          <p
            className={`login-register text-center text-sm mt-5 transition-all duration-700 ease-out delay-500 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Belum punya akun?{' '}
            <Link to="/register" className="login-register-link font-medium">
              Daftar
            </Link>
          </p>
        )}

        <p
          className={`login-credit text-center text-xs italic mt-3 tracking-wide transition-all duration-700 ease-out delay-500 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}
        >
          This application was crafted by{' '}
          <span className="not-italic font-semibold">LD_SALIM</span>
        </p>
      </div>

      {/* Style khusus halaman login — generik, warnanya diambil dari
          variabel --accent/--accent-strong/--ring/--ring-soft yang
          dioper lewat style inline di root (beda per tema/instansi) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&display=swap');

        .login-shell {
          --bg-1: #05061a;
          --bg-2: #0d1440;
          --text-primary: #eaf2ff;
          --text-accent: var(--accent);
          --code-text: rgba(170, 208, 255, 0.86);
          background: #05061a;
          padding-top: 120px;
          padding-bottom: 130px;
        }
        @media (max-width: 480px) {
          .login-shell { padding-top: 150px; padding-bottom: 150px; }
        }

        .login-shell a:focus-visible,
        .login-shell button:focus-visible {
          outline: 2px solid var(--accent-strong);
          outline-offset: 2px;
        }

        .wavy-cloth-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .login-overlay {
          position: absolute;
          inset: 0;
          z-index: 0;
          background: radial-gradient(circle at 50% 35%, rgba(5, 6, 26, 0.35), rgba(5, 6, 26, 0.78) 75%);
          pointer-events: none;
        }

        .cloth-text {
          position: absolute;
          left: 24px;
          right: 24px;
          z-index: 1;
          text-align: center;
          font-family: 'Cinzel Decorative', serif;
          pointer-events: none;
        }
        .cloth-text p {
          margin: 0 0 6px;
          font-size: 13.5px;
          line-height: 1.5;
          letter-spacing: 0.01em;
        }
        .cloth-text p:last-child { margin-bottom: 0; }

        .cloth-text-top { top: 5%; }
        .cloth-text-top p {
          color: #fdecec;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
        }

        .cloth-text-bottom {
          bottom: 4%;
          left: 50%;
          right: auto;
          transform: translateX(-50%);
          width: max-content;
          max-width: min(540px, calc(100% - 32px));
          padding: 10px 16px;
          border-radius: 14px;
          background: rgba(5, 6, 26, 0.55);
          backdrop-filter: blur(3px);
        }
        .cloth-text-bottom p {
          color: #fff5f5;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
        }

        @media (max-width: 480px) {
          .cloth-text p { font-size: 11.5px; }
        }

        .login-badge-glow {
          background: var(--accent);
          filter: blur(10px);
          opacity: 0.4;
          animation: glow-pulse 2.8s ease-in-out infinite;
        }
        .login-badge {
          background: linear-gradient(160deg, var(--accent-strong), var(--accent));
          color: #071233;
          box-shadow: 0 0 18px var(--ring);
        }

        .login-title {
          color: var(--text-primary);
          text-shadow: 0 0 14px var(--ring);
        }
        .login-tagline { color: var(--code-text); }
        .login-school { color: var(--accent-strong); }

        .login-card {
          position: relative;
          border-radius: 16px;
          background: linear-gradient(160deg, rgba(13, 20, 64, 0.9), rgba(5, 6, 26, 0.94));
          border: 1px solid var(--ring-soft);
          box-shadow: 0 0 40px var(--ring-soft), 0 20px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(6px);
        }
        .login-card::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 16px;
          padding: 1px;
          background: linear-gradient(120deg, var(--ring), transparent 35%, transparent 65%, rgba(255, 255, 255, 0.15));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .login-eyebrow {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--code-text);
        }
        .login-hint {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.55;
          color: var(--code-text);
        }

        .login-field {
          background: var(--ring-soft);
          border: 1px solid var(--ring);
          border-radius: 10px;
          padding: 10px 12px;
          min-height: 44px;
          font-size: 16px;
          color: var(--text-primary);
          outline: none;
        }
        .login-field::placeholder { color: rgba(234, 242, 255, 0.5); }
        .login-field:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--ring);
        }
        .login-field-wrap { position: relative; }
        .login-field-pw { padding-right: 46px; }
        .login-eye {
          position: absolute;
          top: 50%;
          right: 3px;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          border-radius: 8px;
          color: var(--code-text);
          cursor: pointer;
        }
        .login-eye:hover { color: #fff; }

        .login-link-btn {
          background: none;
          border: none;
          padding: 6px 2px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--accent-strong);
          cursor: pointer;
        }
        .login-link-btn:hover { color: #fff; text-decoration: underline; }

        .login-error { color: #ffb4b4; }
        .login-info { color: #86efac; line-height: 1.5; }

        .login-register { color: var(--code-text); }
        .login-register-link {
          color: var(--accent-strong);
          text-shadow: 0 0 8px var(--ring);
        }
        .login-register-link:hover { color: #fff; }

        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 16px;
          min-height: 44px;
          border-radius: 10px;
          font-weight: 600;
          color: #071233;
          background: linear-gradient(135deg, var(--accent-strong), var(--accent));
          box-shadow: 0 0 20px var(--ring);
          border: none;
          cursor: pointer;
        }
        .login-btn:disabled { opacity: 0.7; cursor: default; }

        .login-credit { color: var(--code-text); }
        .login-credit span {
          color: var(--accent-strong);
          text-shadow: 0 0 8px var(--ring);
        }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  )
}
