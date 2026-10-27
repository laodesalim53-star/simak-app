import SKPenugasanTunggal from '../components/SKPenugasanTunggal'
import useIsPlh from '../hooks/useIsPlh'
import { useAuth } from '../lib/AuthContext'

// SK PLH/Plt Kepala Sekolah — route: /gudang-sk/plh-kepsek
// Bisa dibuka oleh admin (lewat Gudang SK) dan guru yang ditunjuk sebagai PLH
// (lewat menu sidebar guru; penunjukan ada di tabel plh_kepsek).
const KONFIG = {
  judulBar: 'SK PLH / Plt Kepala Sekolah',
  labelTentang: 'PENUNJUKAN PELAKSANA HARIAN (PLH) / PELAKSANA TUGAS (PLT) KEPALA SEKOLAH',
  jabatan: 'Pelaksana Harian (PLH) / Pelaksana Tugas (Plt) Kepala {sekolah}',
  placeholderNomor: 'mis. 800/026/SD/2026',
  menimbang: [
    'bahwa Kepala {sekolah} berhalangan sementara / jabatan Kepala {sekolah} sedang lowong, sehingga diperlukan pejabat yang melaksanakan tugas dan tanggung jawab kepala sekolah agar penyelenggaraan pendidikan tetap berjalan;',
    'bahwa guru yang namanya tercantum dalam keputusan ini dipandang cakap dan memenuhi syarat untuk ditunjuk sebagai Pelaksana Harian/Pelaksana Tugas Kepala {sekolah} Tahun {tahun}.',
  ].join('\n'),
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Undang-Undang Nomor 14 Tahun 2005 tentang Guru dan Dosen;',
    'Peraturan Menteri yang mengatur penugasan guru sebagai kepala sekolah yang berlaku (sesuaikan nomor dan tahunnya);',
    'Ketentuan kepegawaian yang mengatur kewenangan Pelaksana Harian dan Pelaksana Tugas (sesuaikan nomor dan tahunnya);',
  ].join('\n'),
  memperhatikan:
    'Surat keterangan/penugasan dari Dinas Pendidikan dan hasil musyawarah dewan guru {sekolah}.',
  diktumLain: [
    'Pelaksana Harian/Pelaksana Tugas bertugas melaksanakan tugas rutin kepala sekolah, yaitu pengelolaan administrasi, layanan pembelajaran, dan koordinasi dengan pendidik dan tenaga kependidikan, serta bertanggung jawab kepada Kepala Dinas Pendidikan.',
    'Pelaksana Harian/Pelaksana Tugas tidak berwenang mengambil keputusan atau tindakan yang bersifat strategis dan berdampak pada perubahan status kepegawaian dan anggaran, kecuali mendapat persetujuan pejabat yang berwenang.',
    'Penugasan ini berlaku sampai kepala sekolah definitif kembali bertugas atau ditetapkan, dan berakhir dengan sendirinya setelah itu.',
    'Bila di kemudian hari terdapat kekeliruan dalam keputusan ini, akan diadakan perbaikan sebagaimana mestinya.',
    'Keputusan ini berlaku sejak tanggal ditetapkan.',
  ].join('\n'),
}

export default function SKPLHKepsek() {
  const { loading, isPlh } = useIsPlh()
  const { isAdmin } = useAuth()

  if (loading) {
    return <div style={{ padding: 24 }}>Memuat…</div>
  }

  if (!isAdmin && !isPlh) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h3>Akses dibatasi</h3>
        <p>
          Halaman ini hanya dapat dilihat oleh admin dan guru yang ditunjuk sebagai
          PLH/Plt Kepala Sekolah.
        </p>
      </div>
    )
  }

  return <SKPenugasanTunggal konfig={KONFIG} />
}
