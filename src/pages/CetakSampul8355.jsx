import SampulLaporan, { JENIS_LAPORAN_PRESET } from '../components/SampulLaporan'

// Cabang khusus dari CetakSampul.jsx: jenis laporan dikunci ke
// "Daftar Calon Peserta Ujian (8355)". Field Nama Bank/Nomor Rekening
// disembunyikan (tidak relevan untuk dokumen ini), field Kelas dimunculkan
// dengan default "VI" karena 8355 selalu untuk Kelas 6.
export default function CetakSampul8355() {
  return (
    <SampulLaporan
      jenisLaporanAwal={JENIS_LAPORAN_PRESET[3] /* 'Daftar Calon Peserta Ujian (8355)' */}
      kunciJenisLaporan
      subJudulAwal="DAFTAR CALON PESERTA UJIAN SEKOLAH"
      labelTahun="Tahun Ajaran"
      tampilkanBank={false}
      tampilkanKelas
      kelasAwal="VI"
      labelHalaman="Cetak Sampul 8355"
    />
  )
}
