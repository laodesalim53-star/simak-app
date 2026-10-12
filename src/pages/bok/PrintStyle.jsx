// CSS cetak bersama untuk lembar Kwitansi / Nota / SK. Sebelumnya blok
// <style> yang sama diulang 3x; sekarang cukup <PrintStyle kelas="lembar-xxx" />.
export default function PrintStyle({ kelas }) {
  return (
    <style>{`
      @media print {
        @page { size: A4; margin: 15mm; }
        html, body { margin: 0 !important; padding: 0 !important; }
        body * { visibility: hidden; }
        .${kelas}, .${kelas} * { visibility: visible; }
        .${kelas} {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .no-print { display: none !important; }
      }
    `}</style>
  )
}
