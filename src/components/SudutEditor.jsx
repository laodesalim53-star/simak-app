import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'

const LABEL = ['Kiri-Atas', 'Kanan-Atas', 'Kanan-Bawah', 'Kiri-Bawah']

function sudutDefault(sudutAwal, w, h) {
  if (sudutAwal && sudutAwal.length === 4) return sudutAwal.map((p) => [p[0], p[1]])
  // Deteksi otomatis gagal -> mulai dari persegi di dalam bingkai, pengguna tinggal geser ke tepi kertas.
  const m = 0.08
  return [
    [w * m, h * m],
    [w * (1 - m), h * m],
    [w * (1 - m), h * (1 - m)],
    [w * m, h * (1 - m)],
  ]
}

// Overlay layar penuh: foto asli ditampilkan dengan 4 titik yang bisa diseret
// ke sudut kertas. Dipakai untuk mengoreksi hasil deteksi otomatis yang meleset,
// atau memotong manual saat deteksi gagal sama sekali.
//
// Props:
//   url         - object URL foto asli (utuh, belum dipotong)
//   lebarAsli, tinggiAsli - dimensi foto asli dalam piksel
//   sudutAwal   - [[x,y]x4] dalam koordinat piksel foto asli, atau null
//   onTerapkan(sudutBaru) - dipanggil dengan 4 titik baru saat pengguna menekan "Terapkan"
//   onBatal()   - dipanggil saat pengguna membatalkan
export default function SudutEditor({ url, lebarAsli, tinggiAsli, sudutAwal, onTerapkan, onBatal }) {
  const bungkusRef = useRef(null)
  const seretRef = useRef(null)
  const [ukuranTampil, setUkuranTampil] = useState({ w: 0, h: 0 })
  const [titik, setTitik] = useState(() => sudutDefault(sudutAwal, lebarAsli, tinggiAsli))

  useEffect(() => {
    function hitungUkuran() {
      const el = bungkusRef.current
      if (!el) return
      const rasio = lebarAsli / tinggiAsli
      let w = el.clientWidth
      let h = w / rasio
      const tinggiMaks = window.innerHeight * 0.62
      if (h > tinggiMaks) {
        h = tinggiMaks
        w = h * rasio
      }
      setUkuranTampil({ w, h })
    }
    hitungUkuran()
    window.addEventListener('resize', hitungUkuran)
    return () => window.removeEventListener('resize', hitungUkuran)
  }, [lebarAsli, tinggiAsli])

  const keTampil = useCallback(
    ([x, y]) => [
      (x / lebarAsli) * ukuranTampil.w,
      (y / tinggiAsli) * ukuranTampil.h,
    ],
    [lebarAsli, tinggiAsli, ukuranTampil]
  )

  const keAsli = useCallback(
    ([x, y]) => [
      Math.max(0, Math.min(lebarAsli, (x / ukuranTampil.w) * lebarAsli)),
      Math.max(0, Math.min(tinggiAsli, (y / ukuranTampil.h) * tinggiAsli)),
    ],
    [lebarAsli, tinggiAsli, ukuranTampil]
  )

  function mulaiSeret(i, e) {
    e.preventDefault()
    seretRef.current = i
  }

  function padaGeser(e) {
    if (seretRef.current === null) return
    const el = bungkusRef.current
    if (!el || !ukuranTampil.w) return
    const rect = el.getBoundingClientRect()
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    const x = Math.max(0, Math.min(ukuranTampil.w, cx - rect.left))
    const y = Math.max(0, Math.min(ukuranTampil.h, cy - rect.top))
    const i = seretRef.current
    setTitik((lama) => {
      const baru = lama.slice()
      baru[i] = keAsli([x, y])
      return baru
    })
  }

  function akhiriSeret() {
    seretRef.current = null
  }

  function reset() {
    setTitik(sudutDefault(sudutAwal, lebarAsli, tinggiAsli))
  }

  const poligon = ukuranTampil.w ? titik.map((p) => keTampil(p).join(',')).join(' ') : ''

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/90 flex flex-col items-center justify-center p-4">
      <p className="text-white text-sm mb-3 text-center max-w-md">
        Geser keempat titik ke sudut kertas, lalu ketuk &quot;Terapkan&quot;.
      </p>
      <div
        ref={bungkusRef}
        className="relative select-none w-full max-w-2xl"
        style={{ height: ukuranTampil.h || undefined, touchAction: 'none' }}
        onMouseMove={padaGeser}
        onMouseUp={akhiriSeret}
        onMouseLeave={akhiriSeret}
        onTouchMove={padaGeser}
        onTouchEnd={akhiriSeret}
      >
        <img
          src={url}
          alt="Foto dokumen"
          className="w-full h-full object-contain pointer-events-none rounded-lg"
          draggable={false}
        />
        {ukuranTampil.w > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <polygon points={poligon} fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeWidth="2" />
          </svg>
        )}
        {ukuranTampil.w > 0 &&
          titik.map((p, i) => {
            const [x, y] = keTampil(p)
            return (
              <div
                key={i}
                onMouseDown={(e) => mulaiSeret(i, e)}
                onTouchStart={(e) => mulaiSeret(i, e)}
                title={LABEL[i]}
                aria-label={`Sudut ${LABEL[i]}`}
                className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-white border-4 border-sky-500 shadow-lg cursor-grab active:cursor-grabbing"
                style={{ left: x, top: y, touchAction: 'none' }}
              />
            )
          })}
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        <button
          type="button"
          onClick={onBatal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
        >
          <X size={16} />
          Batal
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
        >
          <RotateCcw size={16} />
          Reset
        </button>
        <button type="button" onClick={() => onTerapkan(titik)} className="btn-primary">
          <Check size={16} />
          Terapkan
        </button>
      </div>
    </div>
  )
}
