import SKPanitia from '../components/SKPanitia'

// SK Panitia Ujian — route: /gudang-sk/panitia-ujian
// Semua logika ada di components/SKPanitia.jsx; berkas ini hanya berisi teks awal.

const KONFIG = {
  judulBar: 'SK Panitia Ujian',
  objek: 'Panitia Ujian Sekolah',
  sebutan: 'Panitia',
  labelTahun: 'Tahun Pelajaran',
  placeholderNomor: 'mis. 421.2/017/SD/2026',
  menimbang: [
    'bahwa untuk kelancaran pelaksanaan ujian sekolah pada {sekolah} Tahun Pelajaran {tp}, perlu dibentuk panitia ujian sekolah;',
    'bahwa guru dan pihak yang namanya tercantum dalam lampiran keputusan ini dipandang mampu dan bersedia melaksanakan tugas sebagai panitia;',
    'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala {sekolah} tentang Penetapan {objek} Tahun Pelajaran {tp}.',
  ].join('\n'),
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
    'Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 21 Tahun 2022 tentang Standar Penilaian Pendidikan;',
    'Kalender Pendidikan {sekolah} Tahun Pelajaran {tp}.',
  ].join('\n'),
  diktum: [
    'Menetapkan susunan {objek} pada {sekolah} Tahun Pelajaran {tp} sebagaimana tercantum dalam Lampiran Keputusan ini.',
    'Panitia sebagaimana dimaksud dalam diktum KESATU bertugas mempersiapkan, melaksanakan, dan melaporkan pelaksanaan ujian sekolah sesuai uraian tugas dalam Lampiran Keputusan ini.',
    'Dalam melaksanakan tugasnya, Panitia bertanggung jawab kepada Kepala Sekolah.',
    'Keputusan ini mulai berlaku pada tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.',
  ].join('\n'),
  tugas: [
    'Penanggung Jawab: mengarahkan dan bertanggung jawab atas seluruh pelaksanaan ujian sekolah;',
    'Ketua: memimpin persiapan, pelaksanaan, dan evaluasi ujian sekolah;',
    'Sekretaris: mengelola administrasi, jadwal, daftar hadir, dan berita acara ujian;',
    'Bendahara: mengelola dan mempertanggungjawabkan keuangan kegiatan ujian;',
    'Anggota: melaksanakan tugas yang diberikan oleh Ketua, antara lain penyiapan ruang, naskah, dan pengawasan.',
  ].join('\n'),
  baris: [
    { jabatan: 'Penanggung Jawab', kepsek: true },
    { jabatan: 'Ketua' },
    { jabatan: 'Sekretaris' },
    { jabatan: 'Bendahara' },
    { jabatan: 'Anggota' },
    { jabatan: 'Anggota' },
  ],
}

export default function SKPanitiaUjian() {
  return <SKPanitia konfig={KONFIG} />
}
