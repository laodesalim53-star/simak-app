import SKPenugasan from '../components/SKPenugasan'

// SK Pengawas Asesmen Sekolah — route: /gudang-sk/pengawas-asesmen
const KONFIG = {
  judulBar: 'SK Pengawas Asesmen Sekolah',
  objek: 'Pengawas Ruang Asesmen Sekolah',
  tampilHonor: false,
  isiOtomatis: false,
  jabatanAwal: 'Pengawas Ruang',
  placeholderNomor: 'mis. 421.2/030/SD/2026',
  menimbang: [
    'bahwa untuk kelancaran dan ketertiban pelaksanaan Asesmen Sekolah pada {sekolah} Tahun Pelajaran {tp}, diperlukan pengawas ruang asesmen;',
    'bahwa guru yang namanya tercantum dalam lampiran keputusan ini dipandang mampu dan bersedia melaksanakan tugas sebagai pengawas ruang asesmen;',
    'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala {sekolah} tentang Penetapan {objek} Tahun Pelajaran {tp}.',
  ].join('\n'),
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
    'Peraturan/Petunjuk Teknis Pelaksanaan Asesmen Sekolah yang berlaku (sesuaikan nomor dan tahunnya);',
    'Kalender Pendidikan {sekolah} Tahun Pelajaran {tp}.',
  ].join('\n'),
  diktum: [
    'Menetapkan guru yang namanya tercantum dalam Lampiran Keputusan ini sebagai Pengawas Ruang Asesmen Sekolah pada {sekolah} Tahun Pelajaran {tp}.',
    'Pengawas ruang sebagaimana dimaksud dalam diktum KESATU bertugas mengawasi jalannya asesmen sesuai jadwal dan ruang yang ditetapkan, serta menjaga ketertiban dan kejujuran pelaksanaan asesmen.',
    'Keputusan ini berlaku {masa}, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.',
  ].join('\n'),
  tugas: '',
}

export default function SKPengawasAsesmen() {
  return <SKPenugasan konfig={KONFIG} />
}
