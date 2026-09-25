import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

// Ganti 'logo' di bawah ini kalau nama bucket storage-mu berbeda
const LOGO_BUCKET_KANTOR = 'profil-kantor'
const LOGO_BUCKET_PUSKESMAS = 'profil-puskesmas'

// Komponen kop surat resmi, dipakai di halaman cetak manapun cukup dengan
// <KopSurat />. Sumber datanya menyesuaikan jenis tenant yang sedang login:
//  - isPuskesmas -> tabel profil_puskesmas, bucket 'profil-puskesmas'
//  - selain itu (kantor/KUA, default sebelumnya) -> tabel profil_kantor,
//    format 3 tingkat ala Kementerian Agama, bucket 'profil-kantor'
//
// PERBAIKAN: sebelumnya komponen ini HANYA mengenal tenant kantor — dipakai
// juga oleh halaman puskesmas (mis. DaftarHadirPuskesmas.jsx) tapi selalu
// menampilkan kop kantor/Kemenag ("KEMENTERIAN AGAMA REPUBLIK INDONESIA")
// karena query profil_kantor-nya kosong untuk sekolah_id puskesmas.
// Sekarang query & tampilan bercabang sesuai isPuskesmas dari AuthContext.
export default function KopSurat() {
  const { sekolahId, isPuskesmas } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)
  const [profilPuskesmas, setProfilPuskesmas] = useState(null)

  useEffect(() => {
    if (!sekolahId) {
      setProfilKantor(null)
      setProfilPuskesmas(null)
      return
    }

    if (isPuskesmas) {
      supabase
        .from('profil_puskesmas')
        .select('nama_puskesmas, kode_puskesmas, alamat, kabupaten, kecamatan, provinsi, telepon, email, logo_path')
        .eq('sekolah_id', sekolahId)
        .maybeSingle()
        .then(({ data }) => setProfilPuskesmas(data))
    } else {
      supabase
        .from('profil_kantor')
        .select('nama_kementerian, nama_kantor_kabupaten, nama_kantor, alamat, kode_pos, kecamatan, kabupaten, telepon, email, logo_path')
        .eq('sekolah_id', sekolahId)
        .maybeSingle()
        .then(({ data }) => setProfilKantor(data))
    }
  }, [sekolahId, isPuskesmas])

  // ==== Cabang PUSKESMAS: kop 1 baris (nama puskesmas), bukan format
  // 3 tingkat Kemenag — puskesmas bukan instansi keagamaan. ====
  if (isPuskesmas) {
    const logoUrl = profilPuskesmas?.logo_path
      ? supabase.storage.from(LOGO_BUCKET_PUSKESMAS).getPublicUrl(profilPuskesmas.logo_path).data.publicUrl
      : null

    const namaPuskesmas = profilPuskesmas?.nama_puskesmas || 'Nama Puskesmas Belum Diatur'
    const subjudul = [
      profilPuskesmas?.kecamatan && `Kec. ${profilPuskesmas.kecamatan}`,
      profilPuskesmas?.kabupaten,
      profilPuskesmas?.provinsi,
    ]
      .filter(Boolean)
      .join(', ')

    const alamatLengkap = [profilPuskesmas?.alamat].filter(Boolean).join(', ')
    const kontak = [
      profilPuskesmas?.kode_puskesmas && `Kode: ${profilPuskesmas.kode_puskesmas}`,
      profilPuskesmas?.email && `Email: ${profilPuskesmas.email}`,
      profilPuskesmas?.telepon && `Telp/HP: ${profilPuskesmas.telepon}`,
    ]
      .filter(Boolean)
      .join('  |  ')
    const barisAlamat = [alamatLengkap, kontak].filter(Boolean).join('  —  ')

    return (
      <div className="kop-surat-resmi mb-6">
        <div className="grid grid-cols-[80px_1fr_80px] items-center gap-4 pb-1">
          <div className="flex justify-start">
            {logoUrl && (
              <img src={logoUrl} alt="Logo Puskesmas" className="w-20 h-20 object-contain shrink-0" />
            )}
          </div>

          <div className="text-center">
            <p className="font-display text-[15px] font-bold uppercase text-slate-900 leading-tight">
              {namaPuskesmas}
            </p>
            {subjudul && (
              <p className="text-[11px] font-medium uppercase text-slate-700 leading-tight mt-0.5">
                {subjudul}
              </p>
            )}
            {barisAlamat && (
              <p className="text-[10.5px] font-normal text-slate-600 leading-snug mt-1">
                {barisAlamat}
              </p>
            )}
          </div>

          <div aria-hidden="true" />
        </div>

        <div className="border-t border-slate-900" />
        <div className="border-t-4 border-slate-900 mt-0.5" />
      </div>
    )
  }

  // ==== Cabang KANTOR (default, pola asli) ====
  const logoUrl = profilKantor?.logo_path
    ? supabase.storage.from(LOGO_BUCKET_KANTOR).getPublicUrl(profilKantor.logo_path).data.publicUrl
    : null

  const baris1 = profilKantor?.nama_kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'
  const baris2 = profilKantor?.nama_kantor_kabupaten || ''
  const baris3 = profilKantor?.nama_kantor || 'Nama Kantor Belum Diatur'

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

        <div aria-hidden="true" />
      </div>

      <div className="border-t border-slate-900" />
      <div className="border-t-4 border-slate-900 mt-0.5" />
    </div>
  )
}
