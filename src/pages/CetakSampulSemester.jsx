import SampulLaporan, { JENIS_LAPORAN_PRESET } from '../components/SampulLaporan'

// Cabang khusus dari CetakSampul.jsx: jenis laporan dikunci ke "Laporan Semester",
// jadi guru/admin tidak perlu memilih dari dropdown lagi.
export default function CetakSampulSemester() {
  return (
    <SampulLaporan
      jenisLaporanAwal={JENIS_LAPORAN_PRESET[1] /* 'Laporan Semester' */}
      kunciJenisLaporan
      subJudulAwal="LAPORAN HASIL BELAJAR PESERTA DIDIK"
      labelTahun="Tahun Ajaran"
      labelHalaman="Cetak Sampul Laporan Semester"
    />
  )
}
