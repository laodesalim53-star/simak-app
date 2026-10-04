import SKPenugasanTunggal from '../components/SKPenugasanTunggal'

// SK Honor Guru — route: /gudang-sk/honor-guru
// Format sederhana mengikuti model "SK Pengangkatan Guru Honor Sekolah":
// satu guru per SK, satu halaman, tanpa Lampiran dan tanpa nominal honor.
// Diktum: Pertama (identitas guru) · Kedua (tugas) · Ketiga (biaya) · Keempat (masa berlaku).
const KONFIG = {
  judulBar: 'SK Honor Guru',
  labelTentang: 'PENGANGKATAN GURU HONOR SEKOLAH',
  jabatan: 'Guru Honor Sekolah',
  identitas: 'guru-honor', // Pertama: Nama, TTL, Pendidikan, Jabatan/Tugas, Unit Kerja (tanpa NIP/Pangkat)
  tugasAwal: 'Guru Kelas',
  placeholderNomor: 'mis. 421.2/07/2026',
  tipePeriode: 'pelajaran',
  objek: 'Guru Honor Sekolah',
  tampilHonor: false,
  sumberAwal: 'anggaran sekolah yang sah dan sesuai dengan ketentuan yang berlaku',
  masaAwal: 'untuk Tahun Pelajaran {tp}',
  tembusan: [
    'Kepala Dinas Pendidikan dan Kebudayaan setempat;',
    'Pengawas Sekolah Wilayah Kecamatan setempat;',
    'Yang bersangkutan untuk diketahui dan dilaksanakan;',
    'Arsip.',
  ].join('\n'),
  menimbang: [
    'bahwa dalam rangka kelancaran pelaksanaan kegiatan belajar mengajar pada {sekolah} Tahun Pelajaran {tp}, dipandang perlu mengangkat Guru Honor Sekolah;',
    'bahwa yang bersangkutan dipandang cakap dan memenuhi syarat untuk diangkat dan diserahi tugas sebagai Guru pada {sekolah};',
    'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala {sekolah} tentang Pengangkatan {objek}.',
  ].join('\n'),
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Undang-Undang Nomor 14 Tahun 2005 tentang Guru dan Dosen;',
    'Undang-Undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah sebagaimana telah diubah beberapa kali, terakhir dengan Undang-Undang Nomor 9 Tahun 2015;',
    'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
    'Peraturan Menteri Pendidikan dan Kebudayaan yang mengatur tentang penugasan guru;',
    'Peraturan Bupati tentang Pedoman Pengelolaan Pendidikan di kabupaten setempat (sesuaikan);',
    'Keputusan Rapat Dewan Guru {sekolah} tentang Pembagian Tugas Guru Tahun Pelajaran {tp}.',
  ].join('\n'),
  // Model tidak memakai bagian "Memperhatikan" (sudah masuk Mengingat) agar muat 1 halaman.
  memperhatikan: '',
  diktumLain: [
    'Guru Honor Sekolah sebagaimana dimaksud dalam diktum Pertama bertugas melaksanakan proses belajar mengajar serta tugas-tugas kependidikan lainnya sesuai dengan ketentuan dan peraturan perundang-undangan yang berlaku, serta bertanggung jawab kepada Kepala Sekolah.',
    'Segala biaya yang timbul akibat ditetapkannya Keputusan ini dibebankan pada {sumber}.',
    'Keputusan ini berlaku terhitung mulai tanggal {tanggal} {masa}, dengan ketentuan apabila di kemudian hari terdapat kekeliruan dalam penetapan ini, akan diadakan perbaikan sebagaimana mestinya.',
  ].join('\n'),
}

export default function SKHonorGuru() {
  return <SKPenugasanTunggal konfig={KONFIG} />
}
