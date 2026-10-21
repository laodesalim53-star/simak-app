// Deretan tombol pilihan cepat di bawah kolom isian.
// mode="multi"  : klik untuk menambah/menghapus item (dipisah `pemisah`)
// mode="single" : hanya satu pilihan, klik lagi untuk mengosongkan
// Guru tetap bisa mengetik/mengubah teksnya sendiri di kolom di atasnya.
export default function PilihanCepat({
  pilihan = [],
  nilai = '',
  onChange,
  mode = 'multi',
  pemisah = ', ',
  kosongPesan = null,
}) {
  if (pilihan.length === 0) {
    return kosongPesan ? (
      <p className="mt-1.5 text-[11px] text-ink-700/40">{kosongPesan}</p>
    ) : null
  }

  const pecah = (v) =>
    v
      .split(pemisah.trim() === '' ? '\n' : pemisah.trim())
      .map((s) => s.trim())
      .filter(Boolean)

  const terpilih = mode === 'single' ? [nilai.trim()] : pecah(nilai)

  function klik(item) {
    if (mode === 'single') {
      onChange(nilai.trim() === item ? '' : item)
      return
    }
    const ada = terpilih.includes(item)
    const baru = ada ? terpilih.filter((x) => x !== item) : [...terpilih, item]
    onChange(baru.join(pemisah))
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {pilihan.map((item) => {
        const aktif = terpilih.includes(item)
        return (
          <button
            key={item}
            type="button"
            onClick={() => klik(item)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              aktif
                ? 'border-transparent bg-brass-400/15 text-brass-600'
                : 'border-ink-900/[0.1] text-ink-700/50 hover:bg-ink-900/[0.03]'
            }`}
          >
            {aktif ? '✓ ' : '+ '}
            {item}
          </button>
        )
      })}
    </div>
  )
}
