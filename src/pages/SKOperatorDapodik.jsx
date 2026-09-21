import SKPenugasan from '../components/SKPenugasan'

// SK Operator Dapodik — route: /gudang-sk/operator-dapodik
// Semua logika ada di components/SKPenugasan.jsx; berkas ini hanya berisi teks awal.
// Tanpa kolom honor (tampilHonor: false). Ubah ke true kalau SK operator di
// sekolah Anda juga mencantumkan honor/insentif.

const KONFIG = {
  judulBar: 'SK Operator Dapodik',
  objek: 'Operator Sekolah (Dapodik)',
  tampilHonor: false,
  sumberAwal: '',
  isiOtomatis: false,
  jabatanAwal: 'Operator Sekolah',
  placeholderNomor: 'mis. 421.2/022/SD/2026',
  menimbang: [
    'bahwa untuk menjamin ketersediaan data pokok pendidikan yang lengkap, akurat, dan mutakhir pada {sekolah} Tahun Pelajaran {tp}, diperlukan operator sekolah yang mengelola Dapodik;',
    'bahwa orang yang namanya tercantum dalam lampiran keputusan ini dipandang mampu dan bersedia melaksanakan tugas tersebut;',
    'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala {sekolah} tentang Penetapan {objek} Tahun Pelajaran {tp}.',
  ].join('\n'),
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
    'Peraturan Menteri yang mengatur Data Pokok Pendidikan yang berlaku (sesuaikan nomor dan tahunnya);',
    'Petunjuk teknis pengelolaan Dapodik Tahun Pelajaran {tp}.',
  ].join('\n'),
  diktum: [
    'Menetapkan orang yang namanya tercantum dalam Lampiran Keputusan ini sebagai Operator Sekolah (Dapodik) pada {sekolah} Tahun Pelajaran {tp}.',
    'Operator Sekolah sebagaimana dimaksud dalam diktum KESATU bertugas sesuai uraian tugas dalam Lampiran Keputusan ini dan bertanggung jawab kepada Kepala Sekolah.',
    'Keputusan ini berlaku {masa}, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.',
  ].join('\n'),
  tugas: [
    'Menginput, memperbarui, dan memvalidasi data sekolah, peserta didik, guru, dan tenaga kependidikan pada aplikasi Dapodik;',
    'Melakukan sinkronisasi data Dapodik secara berkala sesuai jadwal;',
    'Menindaklanjuti hasil verifikasi dan validasi data dari dinas pendidikan;',
    'Menjaga kerahasiaan dan keamanan akun serta data sekolah;',
    'Melaporkan perkembangan dan kendala pengelolaan Dapodik kepada Kepala Sekolah.',
  ].join('\n'),
}

export default function SKOperatorDapodik() {
  return <SKPenugasan konfig={KONFIG} />
}
