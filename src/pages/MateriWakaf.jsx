import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, Landmark } from 'lucide-react'
import Layout from '../components/Layout'
import DaftarHadirCetak from '../components/DaftarHadirCetak'

// Ganti 'logo' di bawah ini kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

function formatTanggalIndonesia(date) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MateriWakaf() {
  const { profil } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)

  useEffect(() => {
    supabase
      .from('profil_kantor')
      .select('nama_kantor, alamat, kabupaten, kecamatan, telepon, email, kepala_kua, nip_kepala_kua, tempat_ttd, logo_path, ttd_kepala_kua_path')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => setProfilKantor(data))
  }, [])

  const logoUrl = profilKantor?.logo_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.logo_path).data.publicUrl
    : null

  const ttdKepalaKuaUrl = profilKantor?.ttd_kepala_kua_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.ttd_kepala_kua_path).data.publicUrl
    : null

  const tempatTtd = profilKantor?.tempat_ttd || profilKantor?.kabupaten || ''
  const tanggalCetak = formatTanggalIndonesia(new Date())

  return (
    <Layout
      title="Materi: Wakaf"
      subtitle="Bahan majelis lengkap dengan daftar hadir peserta, siap cetak."
    >
      <div className="no-print flex items-center justify-between mb-5">
        <Link
          to="/pusat-materi-majelis"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Kembali ke Pusat Materi
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Printer size={16} /> Cetak Laporan
        </button>
      </div>

      <div
        className="lembar-cetak print-only bg-white rounded-2xl border border-slate-100 p-5 sm:p-8 mx-auto"
        style={{ width: '210mm' }}
      >
        {/* === KOP SURAT OTOMATIS === */}
        <div className="kop-surat flex items-center gap-4 border-b-2 border-slate-800 pb-3 mb-6">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo Instansi"
              className="w-16 h-16 object-contain shrink-0"
            />
          )}
          <div className="text-center flex-1">
            <p className="font-display text-base font-bold uppercase text-slate-900 leading-tight">
              {profilKantor?.nama_kantor || 'Nama Kantor Belum Diatur'}
            </p>
            <p className="text-xs text-slate-600 leading-tight">
              {[profilKantor?.alamat, profilKantor?.kecamatan, profilKantor?.kabupaten]
                .filter(Boolean)
                .join(', ')}
            </p>
            {(profilKantor?.telepon || profilKantor?.email) && (
              <p className="text-xs text-slate-600 leading-tight">
                {[profilKantor?.telepon && `Telp. ${profilKantor.telepon}`, profilKantor?.email]
                  .filter(Boolean)
                  .join(' | ')}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Landmark size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">Wakaf</h1>
            <p className="text-xs text-slate-500">Materi Majelis Taklim</p>
          </div>
        </div>

        <div className="space-y-5 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              1. Pengertian dan Dasar Hukum Wakaf
            </h2>
            <p>
              Wakaf adalah perbuatan hukum seseorang atau badan hukum (wakif) untuk memisahkan
              dan/atau menyerahkan sebagian harta benda miliknya guna dimanfaatkan selamanya atau
              untuk jangka waktu tertentu sesuai kepentingannya, untuk keperluan ibadah dan/atau
              kesejahteraan umum menurut syariah. Dasar hukumnya antara lain QS. Ali Imran ayat 92
              dan hadits riwayat Muslim tentang amal jariyah.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              2. Rukun dan Syarat Wakaf
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium">Wakif</span> — orang atau badan hukum yang mewakafkan
                hartanya.
              </li>
              <li>
                <span className="font-medium">Nazhir</span> — pihak yang menerima harta wakaf untuk
                dikelola dan dikembangkan sesuai peruntukannya.
              </li>
              <li>
                <span className="font-medium">Harta benda wakaf</span> — harus dimiliki secara sah
                dan bebas dari sengketa.
              </li>
              <li>
                <span className="font-medium">Ikrar wakaf</span> — pernyataan kehendak wakif untuk
                mewakafkan hartanya.
              </li>
              <li>
                <span className="font-medium">Peruntukan harta wakaf</span> — harus jelas dan sesuai
                syariah.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              3. Jenis-Jenis Wakaf
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium">Wakaf benda tidak bergerak</span> — tanah, bangunan
                masjid, sekolah, dan sejenisnya.
              </li>
              <li>
                <span className="font-medium">Wakaf benda bergerak</span> — kendaraan, peralatan,
                dan lainnya.
              </li>
              <li>
                <span className="font-medium">Wakaf uang (cash waqf)</span> — wakaf dalam bentuk uang
                tunai yang dikelola secara produktif.
              </li>
              <li>
                <span className="font-medium">Wakaf produktif</span> — harta wakaf yang dikelola
                untuk menghasilkan manfaat ekonomi berkelanjutan, hasilnya disalurkan untuk
                kepentingan umum.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              4. Prosedur Wakaf
            </h2>
            <p>
              Wakif menghadap Pejabat Pembuat Akta Ikrar Wakaf (PPAIW) untuk mengikrarkan wakaf dan
              menyerahkan dokumen kepemilikan harta. Selanjutnya diterbitkan Akta Ikrar Wakaf (AIW)
              dan didaftarkan untuk memperoleh Sertifikat Wakaf, agar status hukum harta wakaf
              tercatat dan terlindungi.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              5. Pengelolaan Wakaf Produktif
            </h2>
            <p>
              Nazhir memiliki peran penting mengelola harta wakaf secara amanah dan profesional agar
              memberi manfaat berkelanjutan, misalnya lahan wakaf dikembangkan menjadi lahan
              pertanian, ruko, atau unit usaha yang hasilnya digunakan untuk pendidikan, kesehatan,
              dan pemberdayaan umat.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              6. Manfaat Wakaf bagi Masyarakat
            </h2>
            <p>
              Wakaf menjadi salah satu instrumen filantropi Islam yang bersifat abadi (amal jariyah),
              berperan dalam pembangunan sarana ibadah, pendidikan, kesehatan, hingga pemberdayaan
              ekonomi umat secara berkelanjutan.
            </p>
          </section>
        </div>

        <div className="hadir-cetak">
          <DaftarHadirCetak jumlahBaris={15} />

          {/* === TANDA TANGAN OTOMATIS DARI PROFIL KANTOR === */}
          <div className="ttd-block flex justify-between mt-10 text-sm text-slate-700">
            <div className="text-center w-48">
              <p>Mengetahui,</p>
              <p>Kepala KUA</p>
              <div className="h-20 flex items-end justify-center">
                {ttdKepalaKuaUrl && (
                  <img
                    src={ttdKepalaKuaUrl}
                    alt="Tanda Tangan Kepala KUA"
                    className="max-h-20 object-contain"
                  />
                )}
              </div>
              <p className="font-semibold border-t border-slate-400 pt-1">
                ({profilKantor?.kepala_kua || '..............................'})
              </p>
              <p className="text-xs text-slate-500">
                NIP. {profilKantor?.nip_kepala_kua || '..............................'}
              </p>
            </div>
            <div className="text-center w-48">
              <p>{tempatTtd ? `${tempatTtd}, ${tanggalCetak}` : '\u00A0'}</p>
              <p>Penyuluh Agama Islam</p>
              <div className="h-20" />
              <p className="font-semibold border-t border-slate-400 pt-1">
                ({profil?.nama_lengkap || '..............................'})
              </p>
              <p className="text-xs text-slate-500">
                NIP. {profil?.nip || '..............................'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .lembar-cetak.print-only {
          position: static !important;
          top: auto !important;
          left: auto !important;
          right: auto !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }

        @media screen {
          .lembar-cetak.print-only {
            display: block !important;
          }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            width: 210mm !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .hadir-cetak {
            page-break-before: always;
            break-before: page;
          }
          .hadir-cetak table {
            page-break-inside: auto;
          }
          .hadir-cetak tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .ttd-block {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
        @page {
          size: A4;
          margin: 15mm;
        }
      `}</style>
    </Layout>
  )
}
