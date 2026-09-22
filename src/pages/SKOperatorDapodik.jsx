import SKPenugasanTunggal from '../components/SKPenugasanTunggal'

// SK Operator Dapodik — route: /gudang-sk/operator-dapodik
// Satu operator per SK, satu halaman, tanpa Lampiran/tabel — uraian tugas jadi
// diktum tersendiri (sub-poin a–e). Tanpa honor (tampilHonor: false); ubah ke
// true dan isi sumberAwal kalau SK operator di sekolah Anda juga mencantumkan
// honor/insentif. Sebelumnya memakai SKPenugasan.jsx (format banyak-orang +
// Lampiran); diganti mengikuti pola SK Bendahara BOS.
const KONFIG = {
  judulBar: 'SK Operator Dapodik',
  labelTentang: 'PENETAPAN OPERATOR SEKOLAH (DAPODIK)',
  jabatan: 'Operator Sekolah',
  placeholderNomor: 'mis. 421.2/022/SD/2026',
  tipePeriode: 'pelajaran',
  objek: 'Operator Sekolah (Dapodik)',
  tampilHonor: false,
  masaAwal: 'selama Tahun Pelajaran {tp}',
  menimbang: [
    'bahwa untuk menjamin ketersediaan data pokok pendidikan yang lengkap, akurat, dan mutakhir pada {sekolah} Tahun Pelajaran {tp}, diperlukan operator sekolah yang mengelola Dapodik;',
    'bahwa Saudara yang namanya tercantum dalam Keputusan ini dipandang mampu dan bersedia melaksanakan tugas tersebut;',
    'bahwa berdasarkan pertimbangan sebagaimana dimaksud, perlu menetapkan Keputusan Kepala {sekolah} tentang Penetapan {objek} Tahun Pelajaran {tp}.',
  ].join('\n'),
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
    'Peraturan Menteri yang mengatur Data Pokok Pendidikan yang berlaku (sesuaikan nomor dan tahunnya);',
    'Petunjuk teknis pengelolaan Dapodik Tahun Pelajaran {tp}.',
  ].join('\n'),
  // Uraian tugas: jadi diktum tersendiri (sub-poin a. b. c. …), disisipkan
  // setelah baris pertama diktumLain di bawah (jadi diktum "Ketiga").
  tugas: [
    'Menginput, memperbarui, dan memvalidasi data sekolah, peserta didik, guru, dan tenaga kependidikan pada aplikasi Dapodik;',
    'Melakukan sinkronisasi data Dapodik secara berkala sesuai jadwal;',
    'Menindaklanjuti hasil verifikasi dan validasi data dari dinas pendidikan;',
    'Menjaga kerahasiaan dan keamanan akun serta data sekolah;',
    'Melaporkan perkembangan dan kendala pengelolaan Dapodik kepada Kepala Sekolah.',
  ].join('\n'),
  tugasSetelahBaris: 1,
  diktumLain: [
    'Operator Sekolah sebagaimana dimaksud dalam diktum Pertama bertugas sesuai uraian tugas sebagaimana dimaksud dalam diktum Ketiga, dan bertanggung jawab kepada Kepala Sekolah.',
    'Keputusan ini berlaku {masa}, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.',
  ].join('\n'),
}

export default function SKOperatorDapodik() {
  return <SKPenugasanTunggal konfig={KONFIG} />
}
