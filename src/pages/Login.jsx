import { useState, useEffect, useRef } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Loader2, LogIn, Eye, EyeOff, Send, Check, ArrowLeft } from 'lucide-react'

// Latar belakang "kain merah putih" yang bergelombang seperti kain sungguhan
// tertiup angin. Dibangun dari 2 lapis path SVG per warna (fase & amplitudo
// berbeda) supaya terlihat seperti lipatan kain, bukan garis kaku tunggal.
//
// Hemat baterai: animasi dijalankan ±30 fps (bukan 60) dan berhenti total
// bila perangkat meminta "kurangi gerakan" — cukup satu gambar diam.
function WavyClothBackground() {
  const redTopRef = useRef(null)
  const redTop2Ref = useRef(null)
  const whiteBottomRef = useRef(null)
  const whiteBottom2Ref = useRef(null)

  useEffect(() => {
    // Sistem koordinat internal SVG dibuat tetap (0-1000) dan diregangkan
    // penuh ke ukuran layar lewat preserveAspectRatio="none", jadi gelombang
    // otomatis menyesuaikan di layar mana pun tanpa perlu resize listener.
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

    // Gelombang putih diturunkan ke ±85% tinggi layar (sebelumnya ±76%)
    // supaya tautan "Daftar" dan kredit di bawah formulir tetap berada di
    // latar gelap, bukan di atas kain abu-abu yang membuat teksnya pudar.
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

  return (
    <svg
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      className="wavy-cloth-svg"
      aria-hidden
    >
      <path ref={redTopRef} fill="#c81e1e" />
      <path ref={redTop2Ref} fill="#e23b3b" opacity="0.55" />
      <path ref={whiteBottomRef} fill="#f5f5f0" />
      <path ref={whiteBottom2Ref} fill="#ffffff" opacity="0.6" />
    </svg>
  )
}

// Kolom kata sandi dengan tombol "lihat/sembunyikan".
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [shake, setShake] = useState(0)
  const [tampilSandi, setTampilSandi] = useState(false)

  // Tiga tampilan dalam satu halaman:
  //  'masuk' -> formulir login biasa
  //  'lupa'  -> minta tautan atur-ulang kata sandi lewat email
  //  'baru'  -> pengguna datang dari tautan di email, buat kata sandi baru
  // Tautan atur-ulang dari Supabase membawa "type=recovery" di bagian hash
  // URL. Dibaca sekali saat pertama render (sebelum Supabase merapikan URL)
  // supaya pengguna tidak langsung dialihkan ke dasbor tanpa sempat
  // mengganti kata sandi.
  const [mode, setMode] = useState(() =>
    typeof window !== 'undefined' && /type=recovery/.test(window.location.hash) ? 'baru' : 'masuk'
  )
  const [passwordBaru, setPasswordBaru] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')

  useEffect(() => {
    // Memicu animasi masuk sesaat setelah komponen ter-render
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Cadangan: bila hash sudah terlanjur dirapikan, Supabase tetap
  // mengirim kejadian PASSWORD_RECOVERY.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('baru')
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Halaman yang tadinya mau diakses sebelum dialihkan ke sini (dikirim lewat
  // state `from` oleh ProtectedRoute di App.jsx). Kalau tidak ada — mis. user
  // buka /login langsung dari menu atau dari halaman Beranda — fallback ke
  // /dashboard (bukan "/" lagi, karena "/" sekarang halaman Beranda publik).
  // `location.state.from` adalah objek Location internal react-router yang
  // hanya bisa diisi lewat <Navigate state={...}> di dalam app sendiri,
  // jadi aman dari open-redirect lewat query string/URL luar.
  const from = location.state?.from
    ? location.state.from.pathname + (location.state.from.search || '')
    : '/dashboard'

  // Selama mode 'baru', sesi dari tautan email jangan memicu pengalihan.
  if (session && mode !== 'baru') return <Navigate to={from} replace />

  function gagal(pesan) {
    setError(pesan)
    setShake((s) => s + 1) // ganti key supaya animasi shake bisa diulang
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
    // Pesan sengaja tidak memastikan apakah email terdaftar atau tidak.
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
    // Berhasil: rapikan URL lalu kembali ke mode biasa. Karena sesi sudah
    // aktif, pengguna otomatis diteruskan ke dasbor.
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

  return (
    <div className="login-shell min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <WavyClothBackground />
      <div className="login-overlay" aria-hidden />

      {/* Semboyan Ki Hajar Dewantara, huruf hias, diam di lipatan kain merah */}
      <div className="cloth-text cloth-text-top" aria-hidden>
        <p>Ing Ngarsa Sung Tuladha — di depan memberi teladan.</p>
        <p>Ing Madya Mangun Karsa — di tengah membangun semangat dan ide.</p>
        <p>Tut Wuri Handayani — di belakang memberi dorongan dan arahan.</p>
      </div>

      {/* Makna filosofis, huruf hias, diam di lipatan kain putih */}
      <div className="cloth-text cloth-text-bottom" aria-hidden>
        <p>Guru tidak selalu harus di depan.</p>
        <p>Guru memberi ruang bagi murid untuk tumbuh mandiri dan percaya diri.</p>
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
              S
            </div>
          </div>
          <h1 className="login-title text-2xl font-semibold">SIMAK</h1>
          <p className="login-tagline text-xs font-medium uppercase tracking-[0.16em] mt-2">
            Sistem informasi untuk Sekolah &amp; KUA
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

      {/* Style khusus halaman login */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&display=swap');

        .login-shell {
          --bg-1: #05061a;
          --bg-2: #0d1440;
          --accent: #60a5fa;
          --accent-strong: #bfdbfe;
          --ring: rgba(59, 130, 246, 0.28);
          --ring-soft: rgba(59, 130, 246, 0.12);
          --text-primary: #eaf2ff;
          --text-accent: #60a5fa;
          /* dinaikkan dari .55 supaya label, tagline, dan kredit terbaca */
          --code-text: rgba(170, 208, 255, 0.86);
          background: #05061a;
          /* ruang untuk semboyan di atas & bawah supaya tidak menabrak
             formulir di layar pendek / ponsel */
          padding-top: 120px;
          padding-bottom: 130px;
        }
        @media (max-width: 480px) {
          .login-shell { padding-top: 150px; padding-bottom: 150px; }
        }

        .login-shell a:focus-visible,
        .login-shell button:focus-visible {
          outline: 2px solid #bfdbfe;
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

        /* Huruf hias untuk tulisan di atas kain */
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

        .cloth-text-top {
          top: 5%;
        }
        .cloth-text-top p {
          color: #fdecec;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
        }

        /* PERBAIKAN: sebelumnya teks merah tua di atas kain yang sudah
           digelapkan overlay (kontras sekitar 2,6:1, hampir tak terbaca).
           Sekarang teks terang dengan alas gelap tipis (kontras > 7:1). */
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
          box-shadow: 0 0 18px rgba(59, 130, 246, 0.45);
        }

        .login-title {
          color: var(--text-primary);
          text-shadow: 0 0 14px rgba(59, 130, 246, 0.35);
        }
        .login-tagline { color: var(--code-text); }
        .login-school { color: #93c5fd; }

        .login-card {
          position: relative;
          border-radius: 16px;
          background: linear-gradient(160deg, rgba(13, 20, 64, 0.9), rgba(5, 6, 26, 0.94));
          border: 1px solid var(--ring-soft);
          box-shadow: 0 0 40px rgba(59, 130, 246, 0.08), 0 20px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(6px);
        }
        .login-card::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 16px;
          padding: 1px;
          background: linear-gradient(120deg, rgba(59, 130, 246, 0.35), transparent 35%, transparent 65%, rgba(255, 255, 255, 0.15));
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
          background: rgba(59, 130, 246, 0.06);
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
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
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
          color: #93c5fd;
          cursor: pointer;
        }
        .login-link-btn:hover { color: #fff; text-decoration: underline; }

        .login-error { color: #ffb4b4; }
        .login-info { color: #86efac; line-height: 1.5; }

        .login-register { color: var(--code-text); }
        .login-register-link {
          color: #93c5fd;
          text-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
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
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.35);
          border: none;
          cursor: pointer;
        }
        .login-btn:disabled { opacity: 0.7; cursor: default; }

        .login-credit { color: var(--code-text); }
        .login-credit span {
          color: #93c5fd;
          text-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
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
