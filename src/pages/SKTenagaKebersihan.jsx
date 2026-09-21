import SKPenugasan from '../components/SKPenugasan'

// SK Tenaga Kebersihan — route: /gudang-sk/tenaga-kebersihan
// Semua logika ada di components/SKPenugasan.jsx; berkas ini hanya berisi teks awal.

const KONFIG = {
  judulBar: 'SK Tenaga Kebersihan',
  objek: 'Petugas Kebersihan dan Honorarium',
  tampilHonor: true,
  sumberAwal: 'Dana Bantuan Operasional Sekolah (BOS)',
  isiOtomatis: false,
  jabatanAwal: 'Petugas Kebersihan',
  placeholderNomor: 'mis. 421.2/021/SD/2026',
  menimbang: [
    'bahwa untuk menjaga kebersihan dan kenyamanan lingkungan belajar pada {sekolah} Tahun Pelajaran {tp}, diperlukan petugas kebersihan;',
    'bahwa orang yang namanya tercantum dalam lampiran keputusan ini dipandang mampu dan bersedia melaksanakan tugas tersebut;',
    'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala {sekolah} tentang Penetapan {objek} Tahun Pelajaran {tp}.',
  ].join('\n'),
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
    'Peraturan Menteri yang mengatur petunjuk teknis pengelolaan dana BOS yang berlaku (sesuaikan nomor dan tahunnya);',
    'Rencana Kegiatan dan Anggaran Sekolah (RKAS) {sekolah} Tahun Pelajaran {tp}.',
  ].join('\n'),
  diktum: [
    'Menetapkan orang yang namanya tercantum dalam Lampiran Keputusan ini sebagai Petugas Kebersihan pada {sekolah} Tahun Pelajaran {tp}.',
    'Petugas Kebersihan sebagaimana dimaksud dalam diktum KESATU bertugas sesuai uraian tugas dalam Lampiran Keputusan ini, dan diberikan honorarium setiap bulan sebesar yang tercantum dalam Lampiran, yang dibebankan pada {sumber}.',
    'Keputusan ini berlaku {masa}, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.',
  ].join('\n'),
  tugas: [
    'Membersihkan ruang kelas, ruang guru, dan ruang kantor setiap hari sebelum kegiatan belajar dimulai;',
    'Membersihkan halaman, selokan, dan lingkungan sekolah;',
    'Membersihkan dan merawat toilet/kamar mandi sekolah;',
    'Menjaga ketersediaan air dan perlengkapan kebersihan;',
    'Melaporkan kerusakan sarana dan prasarana yang ditemui kepada Kepala Sekolah.',
  ].join('\n'),
}

export default function SKTenagaKebersihan() {
  return <SKPenugasan konfig={KONFIG} />
}
