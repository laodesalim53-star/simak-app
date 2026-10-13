import { forwardRef } from 'react'
import { DEFAULT_TEMA, bangunPalet, infoUkuran, normalisasiTema } from '../lib/notaTema'

function formatRupiah(angka) {
  if (angka === null || angka === undefined || angka === '') return ''
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(angka)
}

function formatTanggal(tgl) {
  if (!tgl) return ''
  return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Isian bergaris polos (seperti nota toko). Tanpa `width` -> mengisi sisa baris
// (flex:1), jadi otomatis menyesuaikan lebar nota yang sudah dipersempit.
function Blank({ value, width, align = 'left', garis, kertas }) {
  const style = width ? { width, height: '1.2em' } : { flex: 1, minWidth: 0, height: '1.2em' }
  return (
    <span className="relative inline-block align-bottom" style={style}>
      <span
        aria-hidden="true"
        className="absolute left-0 right-0 bottom-[2px] border-b"
        style={{ borderColor: garis }}
      />
      {value && (
        <span
          className={`absolute inset-0 px-1 whitespace-nowrap overflow-hidden text-ellipsis ${
            align === 'right' ? 'text-right' : 'text-left'
          }`}
          style={{ background: kertas }}
        >
          {value}
        </span>
      )}
    </span>
  )
}

// Setengah halaman A4 tetap jadi acuan tinggi; lebar sekarang mengikuti
// `tema.ukuran` (148 / 120 / 100 mm) supaya mirip nota toko asli.
const MIN_ROWS = 6

/**
 * Props:
 *  - sekolah: { nama, alamat, kota } (opsional)
 *  - data: { no_nota, tanggal, tuan, toko, alamat_lanjutan, items: [{ banyaknya,
 *            nama_barang, harga, jumlah }], jumlah_total }
 *  - tema: objek dari useNotaTema() ({ warna, warnaKustom, posisiV, posisiH, ukuran }).
 *          Bila tidak diberikan -> DEFAULT_TEMA, dan posisiV mengikuti `modeCetak`.
 *  - pratinjau: true -> tampil di layar (tanpa class print-only), dipakai di modal
 *          pratinjau; posisi cetak diatur pembungkusnya (mis. .lembar-nota).
 *  - modeCetak: 'standar' | 'atas' — dipertahankan agar pemakaian lama tetap jalan;
 *          diabaikan jika `tema` diberikan (posisiV di tema yang menentukan).
 */
const NotaPrintTemplate = forwardRef(function NotaPrintTemplate(
  { sekolah, data, tema, modeCetak = 'standar', pratinjau = false },
  ref
) {
  const t = normalisasiTema(
    tema ?? { ...DEFAULT_TEMA, posisiV: modeCetak === 'atas' ? 'atas' : 'bawah' }
  )
  const p = bangunPalet(t)
  const { mm, font } = infoUkuran(t)

  const items = Array.isArray(data?.items) ? data.items : []
  const total =
    data?.jumlah_total != null
      ? Number(data.jumlah_total) || 0
      : items.reduce((sum, it) => sum + (Number(it?.jumlah) || 0), 0)

  const rows = [...items]
  while (rows.length < MIN_ROWS) rows.push(null)

  const anchorBawah = t.posisiV === 'bawah'
  // 'tengah' di jalur cetak langsung (tanpa pembungkus .lembar-nota) didekati
  // dengan margin atas tetap; di pratinjau, pembungkuslah yang menempatkannya.
  const jarakAtas = t.posisiV === 'tengah' && !pratinjau ? '60mm' : '0'
  const margin =
    t.posisiH === 'tengah'
      ? `${jarakAtas} auto 0`
      : t.posisiH === 'kanan'
        ? `${jarakAtas} 0 0 auto`
        : `${jarakAtas} 0 0 0`

  const sel = { borderColor: p.line }

  return (
    <div
      ref={ref}
      className={`${pratinjau ? '' : `print-only ${anchorBawah ? 'print-anchor-bottom' : ''}`} relative`}
      style={{
        width: `${mm}mm`,
        margin,
        boxSizing: 'border-box',
        padding: '4mm 5mm',
        fontSize: `${font}px`,
        background: p.paper,
        color: p.ink,
        border: `1px solid ${p.line}`,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        colorAdjust: 'exact',
      }}
    >
      {/* Tanggal di kanan atas */}
      <div className="text-right mb-1">
        <Blank value={formatTanggal(data?.tanggal)} width="60%" align="right" garis={p.line} kertas={p.paper} />
      </div>

      {/* Tuan / Toko */}
      <div className="mb-2">
        <p className="flex items-baseline gap-1">
          <span className="font-semibold underline">Tuan</span>
          <Blank value={data?.tuan} garis={p.line} kertas={p.paper} />
        </p>
        <p className="flex items-baseline gap-1">
          <span className="font-semibold underline">Toko</span>
          <Blank value={data?.toko} garis={p.line} kertas={p.paper} />
        </p>
        {data?.alamat_lanjutan && (
          <p className="flex items-baseline" style={{ paddingLeft: '2.4em' }}>
            <Blank value={data.alamat_lanjutan} garis={p.line} kertas={p.paper} />
          </p>
        )}
      </div>

      {/* NOTA No. */}
      <div className="flex items-baseline justify-between mb-1 gap-2">
        <p className="flex items-baseline gap-1">
          <span className="font-bold" style={{ fontSize: '1.4em' }}>NOTA No.</span>
          <Blank value={data?.no_nota} width="26mm" garis={p.line} kertas={p.paper} />
        </p>
        <div aria-hidden="true" className="border-b-2 flex-1 h-2" style={{ borderColor: p.line, maxWidth: '35%' }} />
      </div>

      {/* Tabel item: kolom pakai persen supaya ikut mengecil */}
      <table className="w-full border-collapse border" style={{ ...sel, tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: p.paperDeep }}>
            <th className="border py-0.5 px-1 text-left font-bold" style={{ ...sel, width: '17%' }}>BANYAKNYA</th>
            <th className="border py-0.5 px-1 text-left font-bold" style={{ ...sel, width: '41%' }}>NAMA BARANG</th>
            <th className="border py-0.5 px-1 text-left font-bold" style={{ ...sel, width: '19%' }}>HARGA</th>
            <th className="border py-0.5 px-1 text-left font-bold" style={{ ...sel, width: '23%' }}>JUMLAH</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, idx) => (
            <tr key={idx}>
              <td className="border py-0.5 px-1 align-top" style={sel}>{item?.banyaknya || '\u00A0'}</td>
              <td className="border py-0.5 px-1 align-top break-words" style={sel}>{item?.nama_barang || '\u00A0'}</td>
              <td className="border py-0.5 px-1 align-top" style={sel}>{item?.harga ? formatRupiah(item.harga) : '\u00A0'}</td>
              <td className="border py-0.5 px-1 align-top" style={sel}>{item?.jumlah ? formatRupiah(item.jumlah) : '\u00A0'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Jumlah Rp. */}
      <div className="flex justify-end mt-1 mb-3">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold">Jumlah Rp.</span>
          <span
            className="inline-block text-right px-2 border-b-4 border-double font-semibold"
            style={{ minWidth: '26mm', borderColor: p.line }}
          >
            {formatRupiah(total)}
          </span>
        </div>
      </div>

      {/* Tanda tangan */}
      <div className="flex justify-between px-2">
        <div className="text-center">
          <p>Tanda Terima</p>
          <div style={{ height: '8mm' }} />
          <div className="border-b" style={{ ...sel, width: '28mm' }} />
        </div>
        <div className="text-center">
          <p>Hormat kami,</p>
          <div style={{ height: '8mm' }} />
          <div className="border-b" style={{ ...sel, width: '28mm' }} />
        </div>
      </div>
    </div>
  )
})

export default NotaPrintTemplate
