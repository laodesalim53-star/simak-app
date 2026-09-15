import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, BookOpen } from 'lucide-react'
import Layout from '../components/Layout'
import DaftarHadirCetak from '../components/DaftarHadirCetak'
import KopSurat from '../components/KopSurat'

// Ganti 'logo' di bawah ini kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

function formatTanggalIndonesia(date) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MateriMajelisTaklim() {
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

  const ttdKepalaKuaUrl = profilKantor?.ttd_kepala_kua_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.ttd_kepala_kua_path).data.publicUrl
    : null

  const tempatTtd = profilKantor?.tempat_ttd || profilKantor?.kabupaten || ''
  const tanggalCetak = formatTanggalIndonesia(new Date())

  return (
    <Layout
      title="Materi: Majelis Taklim"
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
          className="inline-flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Printer size={16} /> Cetak Laporan
        </button>
      </div>

      <div
        className="lembar-cetak print-only bg-white rounded-2xl border border-slate-100 p-5 sm:p-8 mx-auto"
        style={{ width: '210mm' }}
      >
        <KopSurat />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">Majelis Taklim</h1>
            <p className="text-xs text-slate-500">Materi Majelis Taklim</p>
          </div>
        </div>

        <div className="space-y-5 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              1. Pentingnya Iman dan Taqwa
            </h2>
            <p className="font-medium text-slate-800 mb-1">Materi inti:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Pengertian iman: percaya kepada Allah, malaikat, kitab, rasul, hari akhir, dan qadha-qadar.</li>
              <li>Pengertian taqwa: menjalankan perintah Allah dan menjauhi larangan-Nya.</li>
              <li>Ciri orang bertaqwa (QS. Al-Baqarah: 2–5).</li>
            </ul>
            <p className="font-medium text-slate-800 mb-1 mt-2">Tujuan:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Meningkatkan kesadaran spiritual.</li>
              <li>Membentuk pribadi yang taat dan berakhlak baik.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              2. Akhlak dalam Kehidupan Sehari-hari
            </h2>
            <p className="font-medium text-slate-800 mb-1">Materi inti:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Akhlak kepada Allah (ibadah, syukur, tawakal).</li>
              <li>Akhlak kepada sesama manusia (jujur, amanah, menghormati orang tua).</li>
              <li>Akhlak terhadap lingkungan.</li>
            </ul>
            <p className="font-medium text-slate-800 mb-1 mt-2">Contoh:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Menjaga lisan dari ghibah.</li>
              <li>Bersikap sopan dan santun.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              3. Pentingnya Shalat
            </h2>
            <p className="font-medium text-slate-800 mb-1">Materi inti:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Shalat sebagai tiang agama.</li>
              <li>Manfaat shalat (mencegah perbuatan keji dan mungkar).</li>
              <li>Konsekuensi meninggalkan shalat.</li>
            </ul>
            <p className="font-medium text-slate-800 mb-1 mt-2">Dalil:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>QS. Al-Ankabut: 45.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              4. Bahaya Pergaulan Bebas
            </h2>
            <p className="font-medium text-slate-800 mb-1">Materi inti:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Dampak negatif pergaulan bebas (moral, kesehatan, sosial).</li>
              <li>Pentingnya memilih teman yang baik.</li>
              <li>Menjaga diri sesuai ajaran Islam.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              5. Menjaga Ukhuwah Islamiyah
            </h2>
            <p className="font-medium text-slate-800 mb-1">Materi inti:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Arti persaudaraan dalam Islam.</li>
              <li>Larangan saling membenci dan bermusuhan.</li>
              <li>Pentingnya saling tolong-menolong.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              6. Metode Penyuluhan
            </h2>
            <p className="mb-1">Agar kegiatan lebih menarik:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ceramah interaktif.</li>
              <li>Diskusi / tanya jawab.</li>
              <li>Studi kasus kehidupan sehari-hari.</li>
              <li>Pemutaran video pendek islami.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              7. Penutup
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Kesimpulan materi.</li>
              <li>Ajakan untuk mengamalkan dalam kehidupan sehari-hari.</li>
              <li>Doa bersama.</li>
            </ul>
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
