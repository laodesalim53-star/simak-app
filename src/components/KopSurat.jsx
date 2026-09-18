import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

// Ganti 'logo' di bawah ini kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

// Komponen kop surat resmi 3 tingkat, meniru format kop surat Kementerian
// Agama: (1) Kementerian Agama Republik Indonesia, (2) Kantor Kementerian
// Agama Kabupaten/Kota, (3) Kantor Urusan Agama Kecamatan — lalu baris
// alamat/kontak, ditutup garis pemisah tebal-tipis.
//
// Pakai di halaman cetak manapun cukup dengan: <KopSurat />
//
// PERBAIKAN 1: sebelumnya logo dan blok teks diletakkan berdampingan dalam
// satu flex row, sehingga teks (termasuk baris email/telepon) ter-center
// hanya terhadap sisa ruang setelah logo — bukan terhadap lebar kop surat
// secara keseluruhan. Sekarang dipakai grid 3 kolom yang seimbang
// (logo | teks tengah | spacer sebesar logo) supaya benar-benar center
// terhadap lebar kop surat.
//
// PERBAIKAN 2: query profil_kantor sebelumnya hardcode ke id=1 (baris
// kantor pertama), sehingga kantor kedua/ketiga dst selalu menampilkan
// data kantor pertama atau "Nama Kantor Belum Diatur". Sekarang di-scope
// lewat sekolah_id milik kantor yang sedang login, sama seperti
// ProfilKantor.jsx dan DaftarHadirPegawai.jsx.
export default function KopSurat() {
  const { sekolahId } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)

  useEffect(() => {
    if (!sekolahId) {
      setProfilKantor(null)
      return
    }
    supabase
      .from('profil_kantor')
      .select('nama_kementerian, nama_kantor_kabupaten, nama_kantor, alamat, kode_pos, kecamatan, kabupaten, telepon, email, logo_path')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data }) => setProfilKantor(data))
  }, [sekolahId])

  const logoUrl = profilKantor?.logo_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.logo_path).data.publicUrl
    : null

  const baris1 = profilKantor?.nama_kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'
  const baris2 = profilKantor?.nama_kantor_kabupaten || ''
  const baris3 = profilKantor?.nama_kantor || 'Nama Kantor Belum Diatur'

  // Alamat tanpa kode pos sesuai permintaan sebelumnya
  const alamatLengkap = [profilKantor?.alamat].filter(Boolean).join(', ')

  const kontak = [
    profilKantor?.email && `Email: ${profilKantor.email}`,
    profilKantor?.telepon && `Telp/HP: ${profilKantor.telepon}`,
  ]
    .filter(Boolean)
    .join('  |  ')

  const barisAlamat = [alamatLengkap, kontak].filter(Boolean).join('  —  ')

  return (
    <div className="kop-surat-resmi mb-6">
      {/* Grid 3 kolom seimbang: logo di kiri, teks di tengah (col otomatis
          selebar konten terpanjang di antara logo & kolom kanan), spacer
          kosong di kanan sebesar logo — sehingga teks benar-benar center
          terhadap lebar kop surat, bukan cuma terhadap sisa ruang. */}
      <div className="grid grid-cols-[80px_1fr_80px] items-center gap-4 pb-1">
        <div className="flex justify-start">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo Instansi"
              className="w-20 h-20 object-contain shrink-0"
            />
          )}
        </div>

        <div className="text-center">
          <p className="font-display text-[15px] font-bold uppercase text-slate-900 leading-tight">
            {baris1}
          </p>
          {baris2 && (
            <p className="font-display text-[13px] font-bold uppercase text-slate-900 leading-tight">
              {baris2}
            </p>
          )}
          <p className="font-display text-[13px] font-bold uppercase text-slate-900 leading-tight">
            {baris3}
          </p>

          {barisAlamat && (
            <p className="text-[10.5px] font-normal text-slate-600 leading-snug mt-1">
              {barisAlamat}
            </p>
          )}
        </div>

        {/* spacer kosong, lebarnya disamakan dengan kolom logo */}
        <div aria-hidden="true" />
      </div>

      {/* Garis pemisah khas kop surat resmi: tipis lalu tebal */}
      <div className="border-t border-slate-900" />
      <div className="border-t-4 border-slate-900 mt-0.5" />
    </div>
  )
}
