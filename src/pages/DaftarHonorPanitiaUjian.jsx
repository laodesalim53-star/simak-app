import DaftarHonor from '../components/DaftarHonor'

// Daftar Honor Panitia Ujian — route: /gudang-sk/daftar-honor-panitia-ujian
const KONFIG = {
  judulBar: 'Daftar Honor Panitia Ujian',
  objek: 'Panitia dalam Rangka Pelaksanaan Ujian Sekolah',
  judulDaftar: 'DAFTAR PENERIMAAN HONORARIUM',
}

export default function DaftarHonorPanitiaUjian() {
  return <DaftarHonor konfig={KONFIG} />
}
