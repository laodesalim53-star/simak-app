import DaftarHonor from '../components/DaftarHonor'

// Daftar Honor Pengawas Asesmen — route: /gudang-sk/daftar-honor-pengawas-asesmen
const KONFIG = {
  judulBar: 'Daftar Honor Pengawas Asesmen',
  objek: 'Guru dalam Rangka Mengawas Asesmen Sekolah',
  judulDaftar: 'DAFTAR PENERIMAAN HONORARIUM',
}

export default function DaftarHonorPengawasAsesmen() {
  return <DaftarHonor konfig={KONFIG} />
}
