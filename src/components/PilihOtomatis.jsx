import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, Wand2 } from 'lucide-react'

/**
 * PilihOtomatis — tombol dropdown "Isi otomatis".
 *
 * Props:
 *  - opsi     : [{ label, nilai, ket? }]  daftar pilihan.
 *               label = teks di menu, nilai = apa pun yang dikirim ke onPilih,
 *               ket   = keterangan kecil di bawah label (opsional)
 *  - onPilih  : (nilai, opsi) => void  dipanggil saat satu pilihan diklik
 *  - teks     : label tombol (default "Isi otomatis")
 *  - ikonSaja : true -> tombol kecil hanya ikon (cocok di dalam sel tabel)
 *  - cari     : true/false; default otomatis aktif jika opsi > 7
 *  - cetak    : jangan lupa tambahkan className "no-print" (sudah otomatis di sini)
 *
 * Menu dirender lewat portal + posisi fixed, jadi tidak terpotong oleh
 * tabel yang punya overflow-x-auto.
 */
export default function PilihOtomatis({
  opsi = [],
  onPilih,
  teks = 'Isi otomatis',
  ikonSaja = false,
  cari,
  judulMenu,
  className = '',
}) {
  const [buka, setBuka] = useState(false)
  const [q, setQ] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, lebar: 280, atas: false })
  const tombolRef = useRef(null)
  const menuRef = useRef(null)

  const pakaiCari = cari ?? opsi.length > 7

  const tampil = useMemo(() => {
    const kata = q.trim().toLowerCase()
    if (!kata) return opsi
    return opsi.filter((o) => `${o.label} ${o.ket || ''}`.toLowerCase().includes(kata))
  }, [opsi, q])

  // Hitung posisi menu dari posisi tombol (buka ke atas jika ruang bawah sempit)
  useLayoutEffect(() => {
    if (!buka || !tombolRef.current) return
    const r = tombolRef.current.getBoundingClientRect()
    const lebar = Math.min(320, window.innerWidth - 16)
    const left = Math.max(8, Math.min(r.left, window.innerWidth - lebar - 8))
    const ruangBawah = window.innerHeight - r.bottom
    const atas = ruangBawah < 280 && r.top > ruangBawah
    setPos({ top: atas ? r.top - 6 : r.bottom + 6, left, lebar, atas })
  }, [buka])

  // Tutup saat klik di luar, tekan Esc, scroll, atau resize
  useEffect(() => {
    if (!buka) return
    const luar = (e) => {
      if (menuRef.current?.contains(e.target) || tombolRef.current?.contains(e.target)) return
      setBuka(false)
    }
    const esc = (e) => e.key === 'Escape' && setBuka(false)
    const tutup = (e) => {
      if (menuRef.current?.contains(e.target)) return
      setBuka(false)
    }
    document.addEventListener('mousedown', luar)
    document.addEventListener('touchstart', luar)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', tutup, true)
    window.addEventListener('resize', tutup)
    return () => {
      document.removeEventListener('mousedown', luar)
      document.removeEventListener('touchstart', luar)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', tutup, true)
      window.removeEventListener('resize', tutup)
    }
  }, [buka])

  const pilih = (o) => {
    onPilih?.(o.nilai, o)
    setBuka(false)
    setQ('')
  }

  return (
    <>
      <button
        ref={tombolRef}
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-haspopup="listbox"
        aria-expanded={buka}
        aria-label={ikonSaja ? teks : undefined}
        title={ikonSaja ? teks : undefined}
        className={`no-print inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors ${
          ikonSaja ? 'p-1.5' : 'px-2.5 py-1.5 text-xs font-medium'
        } ${className}`}
      >
        <Wand2 size={ikonSaja ? 14 : 13} />
        {!ikonSaja && (
          <>
            {teks}
            <ChevronDown size={13} className={`transition-transform ${buka ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {buka &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="no-print fixed z-[1000] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
            style={{
              left: pos.left,
              width: pos.lebar,
              ...(pos.atas ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
            }}
          >
            {judulMenu && (
              <p className="px-3 pt-2.5 pb-1 text-[11px] font-medium text-slate-500">{judulMenu}</p>
            )}
            {pakaiCari && (
              <div className="relative p-2 border-b border-slate-100">
                <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari pilihan"
                  className="w-full pl-7 pr-2 py-1.5 text-base sm:text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            )}
            <ul className="max-h-64 overflow-y-auto py-1">
              {tampil.map((o, i) => (
                <li key={`${o.label}-${i}`}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => pilih(o)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                  >
                    <span className="block text-[13px] text-slate-800 leading-snug">{o.label}</span>
                    {o.ket && <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">{o.ket}</span>}
                  </button>
                </li>
              ))}
              {tampil.length === 0 && (
                <li className="px-3 py-3 text-xs text-slate-500">Tidak ada pilihan yang cocok.</li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </>
  )
}
