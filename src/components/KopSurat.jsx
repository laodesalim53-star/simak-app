import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Ganti 'logo' di bawah ini kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

// Komponen kop surat resmi 3 tingkat, meniru format kop surat Kementerian
// Agama: (1) Kementerian Agama Republik Indonesia, (2) Kantor Kementerian
// Agama Kabupaten/Kota, (3) Kantor Urusan Agama Kecamatan — lalu baris
// alamat/kontak, ditutup garis pemisah tebal-tipis.
//
// Pakai di halaman cetak manapun cukup dengan: <KopSurat />
// Ganti div "kop-surat" manual yang lama (logo + nama_kantor + alamat) di
// tiap halaman Materi/Laporan dengan komponen ini supaya formatnya seragam
// dan cukup dikelola dari satu tempat.
export default function KopSurat() {
  const [profilKantor, setProfilKantor] = useState(null)

  useEffect(() => {
    supabase
      .from('profil_kantor')
      .select('nama_kementerian, nama_kantor_kabupaten, nama_kantor, alamat, kode_pos, kecamatan, kabupaten, telepon, email, logo_path')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => setProfilKantor(data))
  }, [])

  const logoUrl = profilKantor?.logo_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.logo_path).data.publicUrl
    : null

  const baris1 = profilKantor?.nama_kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'
  const baris2 = profilKantor?.nama_kantor_kabupaten || ''
  const baris3 = profilKantor?.nama_kantor || 'Nama Kantor Belum Diatur'

  const alamatLengkap = [
    profilKantor?.alamat,
    profilKantor?.kode_pos && `KP.${profilKantor.kode_pos}`,
  ]
    .filter(Boolean)
    .join(', ')

  const kontak = [
    profilKantor?.email && `Email:${profilKantor.email}`,
    profilKantor?.telepon && `Telp/HP: ${profilKantor.telepon}`,
  ]
    .filter(Boolean)
    .join(' ')

  const barisAlamat = [alamatLengkap, kontak].filter(Boolean).join('- ')

  return (
    <div className="kop-surat-resmi mb-6">
      <div className="flex items-center gap-4 pb-1">
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Logo Instansi"
            className="w-20 h-20 object-contain shrink-0"
          />
        )}
        <div className="text-center flex-1">
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
        </div>
      </div>

      {barisAlamat && (
        <p className="text-center text-xs text-slate-700 mb-0.5">{barisAlamat}</p>
      )}

      {/* Garis pemisah khas kop surat resmi: tipis lalu tebal */}
      <div className="border-t border-slate-900" />
      <div className="border-t-4 border-slate-900 mt-0.5" />
    </div>
  )
}
