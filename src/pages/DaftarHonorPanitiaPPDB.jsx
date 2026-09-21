import DaftarHonor from '../components/DaftarHonor'

// Daftar Honor Panitia PPDB — route: /gudang-sk/daftar-honor-panitia-ppdb
const KONFIG = {
  judulBar: 'Daftar Honor Panitia PPDB',
  objek: 'Panitia dalam Rangka Penerimaan Peserta Didik Baru',
  judulDaftar: 'DAFTAR PENERIMAAN HONORARIUM',
}

export default function DaftarHonorPanitiaPPDB() {
  return <DaftarHonor konfig={KONFIG} />
}
