import SKPenugasan from '../components/SKPenugasan'

// SK Honor Guru — route: /gudang-sk/honor-guru
// Semua logika ada di components/SKPenugasan.jsx; berkas ini hanya berisi teks awal.

const KONFIG = {
  judulBar: 'SK Honor Guru',
  objek: 'Guru Honorer dan Honorarium',
  tampilHonor: true,
  sumberAwal: 'Dana Bantuan Operasional Sekolah (BOS)',
  isiOtomatis: true,
  jabatanAwal: 'Guru Honorer',
  placeholderNomor: 'mis. 421.2/020/SD/2026',
  menimbang: [
    'bahwa untuk kelancaran kegiatan pembelajaran pada {sekolah} Tahun Pelajaran {tp}, diperlukan guru honorer yang melaksanakan tugas mengajar;',
    'bahwa guru honorer yang namanya tercantum dalam lampiran keputusan ini dipandang mampu dan bersedia melaksanakan tugas tersebut;',
    'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala {sekolah} tentang Penetapan {objek} Tahun Pelajaran {tp}.',
  ].join('\n'),
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Undang-Undang Nomor 14 Tahun 2005 tentang Guru dan Dosen;',
    'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
    'Peraturan Menteri yang mengatur petunjuk teknis pengelolaan dana BOS yang berlaku (sesuaikan nomor dan tahunnya);',
    'Rencana Kegiatan dan Anggaran Sekolah (RKAS) {sekolah} Tahun Pelajaran {tp}.',
  ].join('\n'),
  diktum: [
    'Menetapkan guru honorer yang namanya tercantum dalam Lampiran Keputusan ini sebagai Guru Honorer pada {sekolah} Tahun Pelajaran {tp}.',
    'Kepada guru honorer sebagaimana dimaksud dalam diktum KESATU diberikan honorarium setiap bulan sebesar yang tercantum dalam Lampiran Keputusan ini, yang dibebankan pada {sumber}.',
    'Keputusan ini berlaku {masa}, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.',
  ].join('\n'),
  tugas: '',
}

export default function SKHonorGuru() {
  return <SKPenugasan konfig={KONFIG} />
}
