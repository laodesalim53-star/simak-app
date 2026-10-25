import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

// Ganti nama bucket di bawah ini kalau nama bucket storage-mu berbeda
const LOGO_BUCKET_KANTOR = 'profil-kantor'
const LOGO_BUCKET_PUSKESMAS = 'profil-puskesmas'
const LOGO_BUCKET_SEKOLAH = 'profil-sekolah'
const LOGO_BUCKET_POLRES = 'profil-polres'

// Ubah path/URL di database menjadi URL publik. Path berawalan http dipakai apa adanya.
function urlLogo(bucket, path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

// Kepala kop untuk tenant Sekolah & Puskesmas.
//  - Ada logo kabupaten -> logo kabupaten di KIRI, logo instansi di KANAN
//    (format kop surat Pemda pada umumnya).
//  - Tidak ada logo kabupaten -> tampilan lama: logo instansi di kiri,
//    kolom kanan kosong.
function KopHeader({ logoUtama, logoKabupaten, altUtama, children }) {
  const sembunyikanJikaRusak = (e) => {
    e.currentTarget.style.visibility = 'hidden'
  }
  const logoKiri = logoKabupaten || logoUtama
  const altKiri = logoKabupaten ? 'Logo Kabupaten' : altUtama
  const logoKanan = logoKabupaten ? logoUtama : null

  return (
    <div className="kop-surat-resmi mb-6">
      <div className="grid grid-cols-[80px_1fr_80px] items-center gap-4 pb-1">
        <div className="flex justify-start">
          {logoKiri && (
            <img
              src={logoKiri}
              alt={altKiri}
              onError={sembunyikanJikaRusak}
              className="w-20 h-20 object-contain shrink-0"
            />
          )}
        </div>

        <div className="text-center">{children}</div>

        <div className="flex justify-end">
          {logoKanan && (
            <img
              src={logoKanan}
              alt={altUtama}
              onError={sembunyikanJikaRusak}
              className="w-20 h-20 object-contain shrink-0"
            />
          )}
        </div>
      </div>

      <div className="border-t border-slate-900" />
      <div className="border-t-4 border-slate-900 mt-0.5" />
    </div>
  )
}

// Komponen kop surat resmi, dipakai di halaman cetak manapun cukup dengan
// <KopSurat />. Sumber datanya menyesuaikan jenis tenant yang sedang login:
//  - isPolres    -> tabel profil_polres, bucket 'profil-polres',
//                   format 3 tingkat ala Polri
//  - isPuskesmas -> tabel profil_puskesmas, bucket 'profil-puskesmas'
//                   (+ logo_kabupaten_path)
//  - isKantor    -> tabel profil_kantor, format 3 tingkat ala Kementerian
//                   Agama, bucket 'profil-kantor'
//  - selain itu (sekolah) -> tabel profil_sekolah, bucket 'profil-sekolah'
//                   (+ logo_kabupaten_path)
//
// Pastikan AuthContext menyediakan flag isPolres
// (isPolres = jenis_organisasi === 'polres').
//
// PROP OPSIONAL (semua boleh dikosongkan — pemakaian lama <KopSurat /> tidak berubah):
//  - sekolahId              : id sekolah yang dipakai. Kalau diisi, menimpa sekolahId
//                             dari useAuth (berguna untuk halaman publik tanpa login,
//                             mis. Ujian Online siswa).
//  - publik                 : true -> paksa kop SEKOLAH dan ambil datanya lewat fungsi
//                             database kop_sekolah_publik(p_sekolah_id), karena
//                             pengunjung tanpa login tidak boleh membaca tabel
//                             profil_sekolah secara langsung.
//  - sembunyikanJikaKosong  : true -> kop tidak ditampilkan sama sekali selama data
//                             sekolah belum termuat / tidak ditemukan (bukan menampilkan
//                             tulisan "Nama Sekolah Belum Diatur").
export default function KopSurat({ sekolahId: sekolahIdProp, publik = false, sembunyikanJikaKosong = false } = {}) {
  const { sekolahId: sekolahIdAuth, isPuskesmas, isKantor, isPolres } = useAuth()
  const sekolahId = sekolahIdProp ?? sekolahIdAuth
  const jenis = publik
    ? 'sekolah'
    : isPolres
    ? 'polres'
    : isPuskesmas
    ? 'puskesmas'
    : isKantor
    ? 'kantor'
    : 'sekolah'

  const [profilKantor, setProfilKantor] = useState(null)
  const [profilPuskesmas, setProfilPuskesmas] = useState(null)
  const [profilSekolah, setProfilSekolah] = useState(null)
  const [profilPolres, setProfilPolres] = useState(null)

  useEffect(() => {
    if (!sekolahId) {
      setProfilKantor(null)
      setProfilPuskesmas(null)
      setProfilSekolah(null)
      setProfilPolres(null)
      return
    }

    if (jenis === 'polres') {
      supabase
        .from('profil_polres')
        .select('nama_satuan, polda, alamat, kabupaten_kota, provinsi, kode_pos, telepon, email, logo_path')
        .eq('sekolah_id', sekolahId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) console.error('KopSurat: gagal memuat profil_polres:', error)
          setProfilPolres(data)
        })
    } else if (jenis === 'puskesmas') {
      supabase
        .from('profil_puskesmas')
        .select('nama_puskesmas, kode_puskesmas, alamat, kabupaten, kecamatan, provinsi, telepon, email, logo_path, logo_kabupaten_path')
        .eq('sekolah_id', sekolahId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) console.error('KopSurat: gagal memuat profil_puskesmas:', error)
          setProfilPuskesmas(data)
        })
    } else if (jenis === 'kantor') {
      supabase
        .from('profil_kantor')
        .select('nama_kementerian, nama_kantor_kabupaten, nama_kantor, alamat, kecamatan, kabupaten, telepon, email, logo_path')
        .eq('sekolah_id', sekolahId)
        .maybeSingle()
        .then(({ data }) => setProfilKantor(data))
    } else {
      // Mode publik (siswa tanpa login): lewat fungsi database yang hanya
      // mengembalikan kolom kop untuk SATU sekolah. Mode biasa: baca langsung
      // dari tabel profil_sekolah seperti sebelumnya.
      const permintaan = publik
        ? supabase.rpc('kop_sekolah_publik', { p_sekolah_id: sekolahId })
        : supabase
            .from('profil_sekolah')
            .select('dinas_pendidikan, nama_sekolah, alamat, kabupaten, kecamatan, telepon, email, logo_path, logo_kabupaten_path')
            .eq('sekolah_id', sekolahId)

      permintaan.maybeSingle().then(({ data, error }) => {
        if (error) console.error('KopSurat: gagal memuat profil_sekolah:', error)
        setProfilSekolah(data)
      })
    }
  }, [sekolahId, jenis, publik])

  // ==== Cabang POLRES: 3 tingkat ala Polri ====
  // KEPOLISIAN NEGARA REPUBLIK INDONESIA / DAERAH <POLDA> / RESOR <SATUAN>
  if (jenis === 'polres') {
    const logoUrl = urlLogo(LOGO_BUCKET_POLRES, profilPolres?.logo_path)

    const namaPolda = (profilPolres?.polda || '').replace(/^polda\s+/i, '').trim()
    const namaResor = (profilPolres?.nama_satuan || '').replace(/^polres\s+/i, '').trim()

    const baris1 = 'KEPOLISIAN NEGARA REPUBLIK INDONESIA'
    const baris2 = namaPolda ? `DAERAH ${namaPolda}` : ''
    const baris3 = namaResor ? `RESOR ${namaResor}` : 'Nama Satuan Belum Diatur'

    const alamatLengkap = [
      profilPolres?.alamat,
      profilPolres?.kabupaten_kota,
      profilPolres?.kode_pos,
    ]
      .filter(Boolean)
      .join(', ')
    const kontak = [
      profilPolres?.email && `Email: ${profilPolres.email}`,
      profilPolres?.telepon && `Telp: ${profilPolres.telepon}`,
    ]
      .filter(Boolean)
      .join('  |  ')
    const barisAlamat = [alamatLengkap, kontak].filter(Boolean).join('  —  ')

    return (
      <div className="kop-surat-resmi mb-6">
        <div className="grid grid-cols-[80px_1fr_80px] items-center gap-4 pb-1">
          <div className="flex justify-start">
            {logoUrl && (
              <img src={logoUrl} alt="Logo Polres" className="w-20 h-20 object-contain shrink-0" />
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

  // ==== Cabang SEKOLAH: logo kabupaten (kiri) + logo sekolah (kanan) ====
  if (jenis === 'sekolah') {
    // Halaman publik: jangan tampilkan placeholder selama data belum ada.
    if (sembunyikanJikaKosong && !profilSekolah) return null

    const logoUrl = urlLogo(LOGO_BUCKET_SEKOLAH, profilSekolah?.logo_path)
    const logoKabupatenUrl = urlLogo(LOGO_BUCKET_SEKOLAH, profilSekolah?.logo_kabupaten_path)

    const kontak = [
      profilSekolah?.email && `Email: ${profilSekolah.email}`,
      profilSekolah?.telepon && `Telp/HP: ${profilSekolah.telepon}`,
    ]
      .filter(Boolean)
      .join('  |  ')
    const barisAlamat = [profilSekolah?.alamat, kontak].filter(Boolean).join('  —  ')

    return (
      <KopHeader logoUtama={logoUrl} logoKabupaten={logoKabupatenUrl} altUtama="Logo Sekolah">
        {profilSekolah?.dinas_pendidikan && (
          <p className="font-display text-[13px] font-bold uppercase text-slate-900 leading-tight">
            {profilSekolah.dinas_pendidikan}
          </p>
        )}
        {profilSekolah?.kabupaten && (
          <p className="font-display text-[13px] font-bold uppercase text-slate-900 leading-tight">
            {profilSekolah.kabupaten}
          </p>
        )}
        <p className="font-display text-[15px] font-bold uppercase text-slate-900 leading-tight">
          {profilSekolah?.nama_sekolah || 'Nama Sekolah Belum Diatur'}
        </p>
        {profilSekolah?.kecamatan && (
          <p className="text-[11px] font-medium uppercase text-slate-700 leading-tight">
            {profilSekolah.kecamatan}
          </p>
        )}
        {barisAlamat && (
          <p className="text-[10.5px] font-normal text-slate-600 leading-snug mt-1">
            {barisAlamat}
          </p>
        )}
      </KopHeader>
    )
  }

  // ==== Cabang PUSKESMAS: logo kabupaten (kiri) + logo puskesmas (kanan) ====
  if (jenis === 'puskesmas') {
    const logoUrl = urlLogo(LOGO_BUCKET_PUSKESMAS, profilPuskesmas?.logo_path)
    const logoKabupatenUrl = urlLogo(LOGO_BUCKET_PUSKESMAS, profilPuskesmas?.logo_kabupaten_path)

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
      <KopHeader logoUtama={logoUrl} logoKabupaten={logoKabupatenUrl} altUtama="Logo Puskesmas">
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
      </KopHeader>
    )
  }

  // ==== Cabang KANTOR (pola asli) ====
  const logoUrl = urlLogo(LOGO_BUCKET_KANTOR, profilKantor?.logo_path)

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
