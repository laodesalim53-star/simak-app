import SKPenugasanTunggal from '../components/SKPenugasanTunggal'

// SK Honor Guru — route: /gudang-sk/honor-guru
// Satu guru honorer per SK, satu halaman, tanpa Lampiran/tabel — data guru dan
// nominal honor ditulis langsung di diktum. Sebelumnya memakai SKPenugasan.jsx
// (format banyak-orang + Lampiran); diganti mengikuti pola SK Bendahara BOS.
const KONFIG = {
  judulBar: 'SK Honor Guru',
  labelTentang: 'PENETAPAN GURU HONORER DAN HONORARIUM',
  jabatan: 'Guru Honorer',
  placeholderNomor: 'mis. 421.2/020/SD/2026',
  tipePeriode: 'pelajaran',
  objek: 'Guru Honorer dan Honorarium',
  tampilHonor: true,
  sumberAwal: 'Dana Bantuan Operasional Sekolah (BOS)',
  masaAwal: 'selama Tahun Pelajaran {tp}',
  menimbang: [
    'bahwa untuk kelancaran kegiatan pembelajaran pada {sekolah} Tahun Pelajaran {tp}, diperlukan guru honorer yang melaksanakan tugas mengajar;',
    'bahwa Saudara yang namanya tercantum dalam Keputusan ini dipandang mampu dan bersedia melaksanakan tugas tersebut;',
    'bahwa berdasarkan pertimbangan sebagaimana dimaksud, perlu menetapkan Keputusan Kepala {sekolah} tentang Penetapan {objek} Tahun Pelajaran {tp}.',
  ].join('\n'),
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Undang-Undang Nomor 14 Tahun 2005 tentang Guru dan Dosen;',
    'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
    'Peraturan Menteri yang mengatur petunjuk teknis pengelolaan dana BOS yang berlaku (sesuaikan nomor dan tahunnya);',
    'Rencana Kegiatan dan Anggaran Sekolah (RKAS) {sekolah} Tahun Pelajaran {tp}.',
  ].join('\n'),
  memperhatikan: 'Keputusan Rapat Kepala Sekolah dengan staf Guru {sekolah}.',
  diktumLain: [
    'Kepada Guru Honorer sebagaimana dimaksud dalam diktum Pertama diberikan honorarium setiap bulan sebesar {honor}, yang dibebankan pada {sumber}.',
    'Keputusan ini berlaku {masa}, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.',
  ].join('\n'),
}

export default function SKHonorGuru() {
  return <SKPenugasanTunggal konfig={KONFIG} />
}
