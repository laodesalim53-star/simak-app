import SKPanitia from '../components/SKPanitia'

// SK Tim Manajemen BOS — route: /gudang-sk/tim-bos
// Semua logika ada di components/SKPanitia.jsx; berkas ini hanya berisi teks awal.
// Memakai Tahun Anggaran (tahun kalender), bukan tahun pelajaran.

const KONFIG = {
  judulBar: 'SK Tim Manajemen BOS',
  objek: 'Tim Manajemen Bantuan Operasional Sekolah (BOS)',
  sebutan: 'Tim',
  labelTahun: 'Tahun Anggaran',
  tahunAwal: () => String(new Date().getFullYear()),
  placeholderNomor: 'mis. 421.2/019/SD/2026',
  menimbang: [
    'bahwa untuk menjamin pengelolaan dana Bantuan Operasional Sekolah (BOS) pada {sekolah} berjalan tertib, transparan, dan akuntabel pada {tp}, perlu dibentuk tim manajemen BOS;',
    'bahwa guru dan pihak yang namanya tercantum dalam lampiran keputusan ini dipandang mampu dan bersedia melaksanakan tugas sebagai tim manajemen BOS;',
    'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala {sekolah} tentang Penetapan {objek} {tp}.',
  ].join('\n'),
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
    'Peraturan Menteri yang mengatur petunjuk teknis pengelolaan dana BOS yang berlaku (sesuaikan nomor dan tahunnya);',
    'Rencana Kegiatan dan Anggaran Sekolah (RKAS) {sekolah} {tp}.',
  ].join('\n'),
  diktum: [
    'Menetapkan susunan {objek} pada {sekolah} {tp} sebagaimana tercantum dalam Lampiran Keputusan ini.',
    'Tim sebagaimana dimaksud dalam diktum KESATU bertugas merencanakan, melaksanakan, mengadministrasikan, dan melaporkan pengelolaan dana BOS sesuai uraian tugas dalam Lampiran Keputusan ini.',
    'Dalam melaksanakan tugasnya, Tim bertanggung jawab kepada Kepala Sekolah.',
    'Keputusan ini mulai berlaku pada tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.',
  ].join('\n'),
  tugas: [
    'Ketua (Kepala Sekolah): bertanggung jawab atas perencanaan, penggunaan, dan pelaporan dana BOS;',
    'Sekretaris: menyusun RKAS bersama tim, mengelola administrasi dan arsip dokumen BOS;',
    'Bendahara: mengelola penerimaan dan pengeluaran dana BOS serta menyusun laporan pertanggungjawaban keuangan;',
    'Anggota: memberi masukan dalam penyusunan RKAS dan ikut mengawasi penggunaan dana secara transparan.',
  ].join('\n'),
  baris: [
    { jabatan: 'Ketua', kepsek: true },
    { jabatan: 'Sekretaris' },
    { jabatan: 'Bendahara' },
    { jabatan: 'Anggota (perwakilan guru)' },
    { jabatan: 'Anggota (perwakilan komite sekolah)' },
  ],
}

export default function SKTimBOS() {
  return <SKPanitia konfig={KONFIG} />
}
