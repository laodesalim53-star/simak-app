import DaftarHonor from '../components/DaftarHonor'

// Daftar Honor Literasi & Numerasi — route: /gudang-sk/daftar-honor-literasi-numerasi
const KONFIG = {
  judulBar: 'Daftar Honor Literasi & Numerasi',
  objek: 'Guru dalam Rangka Mengikuti Kegiatan Literasi dan Numerasi',
  judulDaftar: 'DAFTAR PENERIMAAN HONORARIUM',
}

export default function DaftarHonorLiterasiNumerasi() {
  return <DaftarHonor konfig={KONFIG} />
}
