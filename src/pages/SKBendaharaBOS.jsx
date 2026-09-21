import SKPenugasan from '../components/SKPenugasan'

// SK Bendahara BOS — route: /gudang-sk/bendahara-bos
const KONFIG = {
  judulBar: 'SK Bendahara BOS',
  objek: 'Bendahara Dana Bantuan Operasional Sekolah (BOS)',
  tampilHonor: true,
  sumberAwal: 'Dana Bantuan Operasional Sekolah (BOS)',
  isiOtomatis: false,
  jabatanAwal: 'Bendahara BOS',
  placeholderNomor: 'mis. 421.2/025/SD/2026',
  menimbang: [
    'bahwa untuk kelancaran pengelolaan keuangan Dana Bantuan Operasional Sekolah (BOS) pada {sekolah} Tahun Pelajaran {tp}, perlu ditunjuk seorang Bendahara BOS;',
    'bahwa pegawai yang namanya tercantum dalam lampiran keputusan ini dipandang cakap dan mampu melaksanakan tugas sebagai Bendahara BOS;',
    'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala {sekolah} tentang Penetapan {objek} Tahun Pelajaran {tp}.',
  ].join('\n'),
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Peraturan Pemerintah Nomor 48 Tahun 2008 tentang Pendanaan Pendidikan;',
    'Peraturan Menteri yang mengatur petunjuk teknis pengelolaan dana BOS yang berlaku (sesuaikan nomor dan tahunnya);',
    'Rencana Kegiatan dan Anggaran Sekolah (RKAS) {sekolah} Tahun Pelajaran {tp}.',
  ].join('\n'),
  diktum: [
    'Menunjuk dan menetapkan pegawai yang namanya tercantum dalam Lampiran Keputusan ini sebagai Bendahara BOS pada {sekolah} Tahun Pelajaran {tp}.',
    'Bendahara BOS sebagaimana dimaksud dalam diktum KESATU bertugas menyusun rencana anggaran, mencatat dan membukukan penerimaan serta pengeluaran dana BOS, menyimpan bukti transaksi, dan menyusun laporan pertanggungjawaban secara berkala kepada Kepala Sekolah.',
    'Kepada Bendahara BOS sebagaimana dimaksud dalam diktum KESATU diberikan honorarium setiap bulan sebesar yang tercantum dalam Lampiran Keputusan ini, yang dibebankan pada {sumber}.',
    'Keputusan ini berlaku {masa}, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.',
  ].join('\n'),
  tugas: [
    'Menyusun Rencana Kegiatan dan Anggaran Sekolah (RKAS) bersama Kepala Sekolah dan Tim Manajemen BOS.',
    'Mencatat dan membukukan seluruh penerimaan dan pengeluaran dana BOS sesuai ketentuan yang berlaku.',
    'Menyimpan seluruh bukti transaksi (kuitansi, nota, faktur) secara tertib dan rapi.',
    'Menyetorkan pajak atas transaksi yang menggunakan dana BOS sesuai peraturan yang berlaku.',
    'Menyusun dan menyampaikan laporan pertanggungjawaban (SPJ) penggunaan dana BOS setiap triwulan kepada Kepala Sekolah.',
    'Melaporkan penggunaan dana BOS secara berkala melalui aplikasi pelaporan BOS yang ditentukan pemerintah.',
  ].join('\n'),
}

export default function SKBendaharaBOS() {
  return <SKPenugasan konfig={KONFIG} />
}
