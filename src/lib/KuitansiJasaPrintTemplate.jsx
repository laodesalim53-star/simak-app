import { forwardRef, useId } from 'react'
import {
  bangunPalet,
  normalisasiTema,
  LEBAR_SLIP_MM,
  JARAK_ATAS_MM,
} from './kuitansiJasaTema'

function formatRupiah(angka) {
  if (angka === null || angka === undefined || angka === '') return ''
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(angka)
}

function formatTanggal(tgl) {
  if (!tgl) return ''
  return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Latar motif guilloche: pola ubin (tile) berisi lingkaran-lingkaran
// bersinggungan, menghasilkan efek jalinan garis khas kertas berharga.
function GuillocheField({ patternId, p, opacity = 1 }) {
  return (
    <svg aria-hidden="true" className="absolute inset-0 w-full h-full" style={{ opacity }}>
      <defs>
        <pattern id={patternId} width="15" height="15" patternUnits="userSpaceOnUse">
          <rect width="15" height="15" fill={p.paper} />
          <circle cx="0" cy="0" r="7.4" fill="none" stroke={p.guilloche} strokeWidth="0.45" />
          <circle cx="15" cy="0" r="7.4" fill="none" stroke={p.guilloche} strokeWidth="0.45" />
          <circle cx="0" cy="15" r="7.4" fill="none" stroke={p.guilloche} strokeWidth="0.45" />
          <circle cx="15" cy="15" r="7.4" fill="none" stroke={p.guilloche} strokeWidth="0.45" />
          <circle cx="7.5" cy="7.5" r="5.6" fill="none" stroke={p.guillocheSoft} strokeWidth="0.4" />
          <circle cx="7.5" cy="7.5" r="2.6" fill="none" stroke={p.guilloche} strokeWidth="0.35" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

// Medali rosette (cincin konsentris) — elemen watermark tunggal yang
// diulang di counterfoil dan sebagai watermark besar di tengah slip utama.
function Rosette({ size = 40, p }) {
  const rings = [19, 16.4, 13.8, 11.2, 8.6, 6, 3.4]
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      {rings.map((r, i) => (
        <circle
          key={r}
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={i % 2 === 0 ? p.lineSoft : p.guilloche}
          strokeWidth={i % 2 === 0 ? 0.6 : 0.4}
        />
      ))}
      <circle cx="20" cy="20" r="1.6" fill={p.lineSoft} />
    </svg>
  )
}

// Kolom isian bertitik-titik. Lebar TETAP supaya rapi mengikuti lebar kolom.
function Blank({ value, p, italic = false }) {
  return (
    <span
      className="block whitespace-nowrap overflow-hidden text-ellipsis"
      style={{
        borderBottom: `0.6px dotted ${p.line}`,
        minHeight: '3.6mm',
        padding: '0 1mm 0.3mm',
        fontStyle: italic ? 'italic' : 'normal',
      }}
    >
      {value}
    </span>
  )
}

const RATA_H = { kiri: 'flex-start', tengah: 'center', kanan: 'flex-end' }

// Kwitansi Jasa — blanko kwitansi bergaya dokumen resmi (cek/giro) dengan
// motif guilloche, counterfoil/sobekan arsip di kiri, dan watermark rosette
// di slip utama. Dipakai KHUSUS untuk transaksi jasa (mis. transport,
// honor kegiatan) — beda dari NotaPrintTemplate yang khusus belanja barang.
//
// SATU KWITANSI = SATU LEMBAR A4 SENDIRI (dicetak terpisah dari Nota).
//
// Props:
//   sekolah: { nama, alamat, kota }  (nama sekolah ATAU puskesmas)
//   data: { no_kwitansi, tanggal, dari, uang_sejumlah, untuk_pembayaran, jumlah, alamat, nama_penerima }
//   tema (opsional): preferensi tampilan cetak — { warna, warnaKustom, posisiV,
//     posisiH, ukuran }. Bila kosong dipakai bawaan (biru, bawah, tengah, penuh).
//     Lihat lib/kuitansiJasaTema.js.
//
// Baris "<tempat>, <tanggal>": memakai `data.alamat` (alamat penerima) bila
// diisi; bila kosong, memakai `sekolah.kota` sebagai cadangan.
// `data.nama_penerima` dicetak tepat di atas garis tanda tangan.
const KuitansiJasaPrintTemplate = forwardRef(function KuitansiJasaPrintTemplate(
  { sekolah, data, tema },
  ref
) {
  const reactId = useId()
  const bodyPatternId = `guilloche-body-${reactId}`
  const stubPatternId = `guilloche-stub-${reactId}`
  const tanggal = formatTanggal(data?.tanggal)
  const tempat = data?.alamat || sekolah?.kota || ''

  const t = normalisasiTema(tema)
  const p = bangunPalet(t)
  const lebarSlip = LEBAR_SLIP_MM[t.ukuran]
  const tengahVertikal = t.posisiV === 'tengah'
  const rataTengah = t.posisiH === 'tengah'

  const doubleFrame = {
    border: `1.1px solid ${p.line}`,
    outline: `0.4px solid ${p.line}`,
    outlineOffset: '1mm',
  }

  return (
    <div
      ref={ref}
      className="print-only relative bg-white text-black text-xs flex"
      style={{
        width: '210mm',
        minHeight: '297mm',
        paddingTop: `${JARAK_ATAS_MM[t.posisiV]}mm`,
        paddingLeft: rataTengah ? 0 : '4mm',
        paddingRight: rataTengah ? 0 : '4mm',
        justifyContent: RATA_H[t.posisiH],
        alignItems: tengahVertikal ? 'center' : 'flex-start',
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        colorAdjust: 'exact',
      }}
    >
      <div
        className="flex box-border h-fit"
        style={{
          width: `${lebarSlip}mm`,
          padding: '2mm',
          background: p.paperDeep,
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        {/* Counterfoil / sobekan arsip */}
        <div
          className="relative flex flex-shrink-0 flex-col items-center justify-between overflow-hidden"
          style={{ ...doubleFrame, width: '24mm', padding: '2mm 1mm' }}
        >
          <GuillocheField patternId={stubPatternId} p={p} opacity={0.9} />
          <div className="relative text-center leading-tight" style={{ fontSize: '7px', color: p.ink }}>
            {sekolah?.nama}
          </div>
          <div className="relative">
            <Rosette size={26} p={p} />
          </div>
          <div className="relative text-center" style={{ fontSize: '7px', color: p.ink }}>
            No. {data?.no_kwitansi}
          </div>
        </div>

        {/* Garis perforasi */}
        <div
          className="flex-shrink-0"
          style={{
            width: '2.5mm',
            borderLeft: `0.5px dashed ${p.lineSoft}`,
            borderRight: `0.5px dashed ${p.lineSoft}`,
          }}
        />

        {/* Slip utama */}
        <div className="relative flex-1 overflow-hidden" style={{ ...doubleFrame, padding: '2.5mm 4mm' }}>
          <GuillocheField patternId={bodyPatternId} p={p} opacity={0.55} />
          {/* Watermark rosette besar di tengah */}
          <div
            className="absolute opacity-50"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <Rosette size={62} p={p} />
          </div>

          <div className="relative flex h-full flex-col">
            <div className="text-center" style={{ marginBottom: '1.5mm' }}>
              <div className="font-bold" style={{ fontSize: '12px', letterSpacing: '1.5px', color: p.ink }}>
                KWITANSI
              </div>
              <div style={{ fontSize: '8px', color: p.ink }}>{sekolah?.nama}</div>
            </div>

            <table className="w-full flex-1 border-collapse" style={{ color: p.ink, fontSize: '10px' }}>
              <tbody>
                <tr>
                  <td className="align-top whitespace-nowrap" style={{ width: '28%', paddingRight: '2mm' }}>
                    No.
                  </td>
                  <td className="align-top">:</td>
                  <td>
                    <Blank p={p} value={data?.no_kwitansi} />
                  </td>
                </tr>
                <tr>
                  <td className="align-top whitespace-nowrap" style={{ paddingRight: '2mm' }}>
                    Telah terima dari
                  </td>
                  <td className="align-top">:</td>
                  <td>
                    <Blank p={p} value={data?.dari} />
                  </td>
                </tr>
                <tr>
                  <td className="align-top whitespace-nowrap" style={{ paddingRight: '2mm' }}>
                    Uang sejumlah
                  </td>
                  <td className="align-top">:</td>
                  <td>
                    <Blank p={p} value={data?.uang_sejumlah} italic />
                  </td>
                </tr>
                <tr>
                  <td className="align-top whitespace-nowrap" style={{ paddingRight: '2mm' }}>
                    Untuk pembayaran
                  </td>
                  <td className="align-top">:</td>
                  <td>
                    <Blank p={p} value={data?.untuk_pembayaran} />
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex items-end justify-between" style={{ marginTop: '2.5mm' }}>
              <div
                className="font-bold whitespace-nowrap flex-shrink-0"
                style={{
                  fontSize: '13px',
                  color: p.ink,
                  border: `0.6px solid ${p.line}`,
                  padding: '0.8mm 2mm',
                  background: 'rgba(255,255,255,0.35)',
                }}
              >
                Rp {formatRupiah(data?.jumlah || 0)}
              </div>
              <div className="text-center" style={{ fontSize: '9px', color: p.ink }}>
                <div>
                  {tempat}
                  {tempat ? ', ' : ''}
                  {tanggal}
                </div>
                <div style={{ height: '6mm' }} />
                {data?.nama_penerima && (
                  <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '0.3mm' }}>
                    {data.nama_penerima}
                  </div>
                )}
                <div style={{ borderTop: `0.6px solid ${p.line}`, paddingTop: '0.5mm', minWidth: '28mm' }}>
                  Yang menerima
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default KuitansiJasaPrintTemplate
