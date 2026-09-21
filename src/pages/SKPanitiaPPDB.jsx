import SKPanitia from '../components/SKPanitia'

// SK Panitia PPDB — route: /gudang-sk/panitia-ppdb
// Semua logika ada di components/SKPanitia.jsx; berkas ini hanya berisi teks awal.
// Catatan: sebutan resmi penerimaan siswa baru berubah dari waktu ke waktu
// (PPDB, SPMB, dsb). Ubah `objek` dan dasar hukum di bawah sesuai yang dipakai
// dinas pendidikan setempat.

const KONFIG = {
  judulBar: 'SK Panitia PPDB',
  objek: 'Panitia Penerimaan Peserta Didik Baru',
  sebutan: 'Panitia',
  labelTahun: 'Tahun Pelajaran',
  placeholderNomor: 'mis. 421.2/018/SD/2026',
  menimbang: [
    'bahwa untuk kelancaran pelaksanaan penerimaan peserta didik baru pada {sekolah} Tahun Pelajaran {tp}, perlu dibentuk panitia penerimaan peserta didik baru;',
    'bahwa guru dan pihak yang namanya tercantum dalam lampiran keputusan ini dipandang mampu dan bersedia melaksanakan tugas sebagai panitia;',
    'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala {sekolah} tentang Penetapan {objek} Tahun Pelajaran {tp}.',
  ].join('\n'),
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
    'Peraturan Menteri yang mengatur penerimaan peserta didik/murid baru pada jenjang pendidikan yang berlaku (sesuaikan nomor dan tahunnya);',
    'Petunjuk teknis dinas pendidikan setempat tentang penerimaan peserta didik baru Tahun Pelajaran {tp}.',
  ].join('\n'),
  diktum: [
    'Menetapkan susunan {objek} pada {sekolah} Tahun Pelajaran {tp} sebagaimana tercantum dalam Lampiran Keputusan ini.',
    'Panitia sebagaimana dimaksud dalam diktum KESATU bertugas mempersiapkan, melaksanakan, dan melaporkan penerimaan peserta didik baru sesuai uraian tugas dalam Lampiran Keputusan ini.',
    'Dalam melaksanakan tugasnya, Panitia bertanggung jawab kepada Kepala Sekolah.',
    'Keputusan ini mulai berlaku pada tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.',
  ].join('\n'),
  tugas: [
    'Penanggung Jawab: mengarahkan dan bertanggung jawab atas seluruh pelaksanaan penerimaan peserta didik baru;',
    'Ketua: memimpin persiapan, pelaksanaan, dan evaluasi penerimaan peserta didik baru;',
    'Sekretaris: mengelola administrasi, berkas pendaftaran, dan laporan penerimaan;',
    'Bendahara: mengelola dan mempertanggungjawabkan keuangan kegiatan;',
    'Anggota: melayani pendaftaran, memverifikasi berkas calon peserta didik, dan menyampaikan informasi kepada orang tua/wali.',
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

export default function SKPanitiaPPDB() {
  return <SKPanitia konfig={KONFIG} />
}
