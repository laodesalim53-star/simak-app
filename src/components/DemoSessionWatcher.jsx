// src/components/DemoSessionWatcher.jsx
//
// Pasang SEKALI di root aplikasi, di dalam <BrowserRouter> tapi di luar
// <Routes> — supaya tetap aktif memantau di halaman mana pun setelah
// login akun demo. Contoh di App.jsx:
//
//   <BrowserRouter>
//     <DemoSessionWatcher />
//     <Routes> ...rute Anda yang sudah ada... </Routes>
//   </BrowserRouter>
//
// Tidak melakukan apa-apa & tidak menampilkan apa pun selama sesi demo
// tidak aktif di perangkat ini (pengguna biasa sama sekali tidak
// terdampak).

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { sesiDemoAktif, sisaMsSesiDemo, hapusSesiDemo } from '../lib/demoSession'

export default function DemoSessionWatcher() {
  const navigate = useNavigate()
  const [sisaDetik, setSisaDetik] = useState(null)

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!sesiDemoAktif()) {
        setSisaDetik((prev) => (prev === null ? null : null))
        return
      }
      const sisaMs = sisaMsSesiDemo()
      setSisaDetik(Math.ceil(sisaMs / 1000))

      if (sisaMs <= 0) {
        hapusSesiDemo()
        await supabase.auth.signOut()
        navigate('/login?demo_habis=1', { replace: true })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [navigate])

  if (sisaDetik === null) return null

  const menit = Math.floor(sisaDetik / 60)
  const detik = sisaDetik % 60

  return (
    <div className="demo-timer-badge" role="status" aria-live="polite">
      <span className="demo-timer-dot" />
      Mode Demo — sisa {menit}:{String(detik).padStart(2, '0')}
      <style>{`
        .demo-timer-badge {
          position: fixed;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #14162C;
          color: #fff;
          font-size: 12.5px;
          font-weight: 700;
          padding: 7px 16px;
          border-radius: 999px;
          z-index: 2000;
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
          white-space: nowrap;
        }
        .demo-timer-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #F2762B;
          flex-shrink: 0;
          animation: demoDotBerdenyut 1.4s ease-in-out infinite;
        }
        @keyframes demoDotBerdenyut {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .demo-timer-dot { animation: none; }
        }
      `}</style>
    </div>
  )
}
