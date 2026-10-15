import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Muat katalog item sekolah (view `katalog_item`) sekali per sekolah.
// Kalau view belum dibuat / error, hasilnya daftar kosong dan input tetap
// berfungsi sebagai kolom teks biasa.
export function useKatalogItem(sekolahId) {
  const [items, setItems] = useState([])
  useEffect(() => {
    if (!sekolahId) {
      setItems([])
      return
    }
    let batal = false
    supabase
      .from('katalog_item')
      .select('uraian, kode_rekening, kode_kegiatan, satuan, harga_satuan, terakhir_dibeli, sumber')
      .eq('sekolah_id', sekolahId)
      .order('uraian')
      .limit(5000)
      .then(({ data, error }) => {
        if (!batal && !error) setItems(data || [])
      })
    return () => { batal = true }
  }, [sekolahId])
  return items
}

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID').format(angka || 0)
}

/**
 * Kolom teks dengan saran dari katalog item.
 *   <InputItemKatalog
 *     value={teks} items={katalog}
 *     onChange={(teks) => ...}          // setiap ketikan
 *     onPilih={(item) => ...}           // saat memilih saran
 *     className="..." wrapperClassName="..." placeholder="..."
 *   />
 */
export default function InputItemKatalog({
  value,
  items,
  onChange,
  onPilih,
  className = '',
  wrapperClassName = '',
  placeholder = '',
}) {
  const [buka, setBuka] = useState(false)
  const [aktif, setAktif] = useState(-1)

  const saran = useMemo(() => {
    const q = String(value || '').toLowerCase().trim()
    if (q.length < 2) return []
    const kata = q.split(/\s+/)
    return (items || [])
      .filter((it) => {
        const u = it.uraian.toLowerCase()
        return kata.every((k) => u.includes(k))
      })
      .slice(0, 8)
  }, [value, items])

  function pilih(item) {
    onPilih?.(item)
    setBuka(false)
    setAktif(-1)
  }

  function handleKey(e) {
    if (!buka || saran.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAktif((a) => (a + 1) % saran.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAktif((a) => (a <= 0 ? saran.length - 1 : a - 1))
    } else if (e.key === 'Enter' && aktif >= 0) {
      e.preventDefault() // jangan submit form
      pilih(saran[aktif])
    } else if (e.key === 'Escape') {
      setBuka(false)
    }
  }

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        className={className}
        placeholder={placeholder}
        value={value || ''}
        autoComplete="off"
        onChange={(e) => {
          onChange?.(e.target.value)
          setBuka(true)
          setAktif(-1)
        }}
        onFocus={() => setBuka(true)}
        onBlur={() => setBuka(false)}
        onKeyDown={handleKey}
      />
      {buka && saran.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto text-sm">
          {saran.map((it, i) => (
            <li
              key={it.uraian + i}
              // onMouseDown (bukan onClick) supaya terpilih sebelum input kehilangan fokus
              onMouseDown={(e) => {
                e.preventDefault()
                pilih(it)
              }}
              className={`px-3 py-2 cursor-pointer ${i === aktif ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <div className="font-medium">{it.uraian}</div>
              <div className="text-xs text-gray-500">
                {[
                  it.kode_rekening,
                  it.satuan,
                  it.harga_satuan ? `Rp ${formatRupiah(it.harga_satuan)}` : null,
                  it.sumber === 'arkas' ? 'dari RKAS' : null,
                ].filter(Boolean).join(' · ')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
