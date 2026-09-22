import SKPenugasanTunggal from '../components/SKPenugasanTunggal'

// SK Bendahara BOS — route: /gudang-sk/bendahara-bos
const KONFIG = {
  judulBar: 'SK Bendahara BOS',
  labelTentang: 'PENETAPAN BENDAHARA BOS',
  jabatan: 'Bendahara Dana Bantuan Operasional Sekolah (BOS)',
  placeholderNomor: 'mis. 421.2/025/SD/2026',
  menimbang:
    'bahwa untuk kelancaran pengelolaan keuangan Dana Bantuan Operasional Sekolah (BOS) pada {sekolah} Tahun Anggaran {tahun}, dipandang perlu mengangkat Bendahara BOS dengan Surat Keputusan Kepala {sekolah}.',
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Peraturan Pemerintah Nomor 48 Tahun 2008 tentang Pendanaan Pendidikan;',
    'Peraturan Menteri yang mengatur petunjuk teknis pengelolaan dana BOS yang berlaku (sesuaikan nomor dan tahunnya);',
  ].join('\n'),
  memperhatikan: 'Keputusan Rapat Kepala Sekolah dengan staf Guru {sekolah}.',
  diktumLain: [
    'Dalam melaksanakan tugas sebagai Bendahara BOS, yang bersangkutan bertugas menyusun rencana anggaran, mencatat dan membukukan penerimaan serta pengeluaran dana BOS, menyimpan bukti transaksi, dan menyusun laporan pertanggungjawaban secara berkala kepada Kepala {sekolah}.',
    'Bila di kemudian hari terdapat kekeliruan dalam keputusan ini, akan diadakan perbaikan sebagaimana mestinya.',
    'Keputusan ini berlaku sejak tanggal ditetapkan.',
  ].join('\n'),
}

export default function SKBendaharaBOS() {
  return <SKPenugasanTunggal konfig={KONFIG} />
}
