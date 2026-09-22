import SKPenugasanTunggal from '../components/SKPenugasanTunggal'

// SK Tenaga Kebersihan — route: /gudang-sk/tenaga-kebersihan
// Satu petugas kebersihan per SK, satu halaman, tanpa Lampiran/tabel — data
// petugas dan nominal honor ditulis langsung di diktum, dan uraian tugas jadi
// diktum tersendiri (sub-poin a–e). Sebelumnya memakai SKPenugasan.jsx (format
// banyak-orang + Lampiran); diganti mengikuti pola SK Bendahara BOS.
const KONFIG = {
  judulBar: 'SK Tenaga Kebersihan',
  labelTentang: 'PENETAPAN PETUGAS KEBERSIHAN DAN HONORARIUM',
  jabatan: 'Petugas Kebersihan',
  placeholderNomor: 'mis. 421.2/021/SD/2026',
  tipePeriode: 'pelajaran',
  objek: 'Petugas Kebersihan dan Honorarium',
  tampilHonor: true,
  sumberAwal: 'Dana Bantuan Operasional Sekolah (BOS)',
  masaAwal: 'selama Tahun Pelajaran {tp}',
  menimbang: [
    'bahwa untuk menjaga kebersihan dan kenyamanan lingkungan belajar pada {sekolah} Tahun Pelajaran {tp}, diperlukan petugas kebersihan;',
    'bahwa Saudara yang namanya tercantum dalam Keputusan ini dipandang mampu dan bersedia melaksanakan tugas tersebut;',
    'bahwa berdasarkan pertimbangan sebagaimana dimaksud, perlu menetapkan Keputusan Kepala {sekolah} tentang Penetapan {objek} Tahun Pelajaran {tp}.',
  ].join('\n'),
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
    'Peraturan Menteri yang mengatur petunjuk teknis pengelolaan dana BOS yang berlaku (sesuaikan nomor dan tahunnya);',
    'Rencana Kegiatan dan Anggaran Sekolah (RKAS) {sekolah} Tahun Pelajaran {tp}.',
  ].join('\n'),
  memperhatikan: 'Keputusan Rapat Kepala Sekolah dengan staf Guru {sekolah}.',
  // Uraian tugas: jadi diktum tersendiri (sub-poin a. b. c. …), disisipkan
  // setelah baris pertama diktumLain di bawah (jadi diktum "Ketiga").
  tugas: [
    'Membersihkan ruang kelas, ruang guru, dan ruang kantor setiap hari sebelum kegiatan belajar dimulai;',
    'Membersihkan halaman, selokan, dan lingkungan sekolah;',
    'Membersihkan dan merawat toilet/kamar mandi sekolah;',
    'Menjaga ketersediaan air dan perlengkapan kebersihan;',
    'Melaporkan kerusakan sarana dan prasarana yang ditemui kepada Kepala Sekolah.',
  ].join('\n'),
  tugasSetelahBaris: 1,
  diktumLain: [
    'Petugas Kebersihan sebagaimana dimaksud dalam diktum Pertama bertugas sesuai uraian tugas sebagaimana dimaksud dalam diktum Ketiga, dan diberikan honorarium setiap bulan sebesar {honor} yang dibebankan pada {sumber}.',
    'Keputusan ini berlaku {masa}, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.',
  ].join('\n'),
}

export default function SKTenagaKebersihan() {
  return <SKPenugasanTunggal konfig={KONFIG} />
}
