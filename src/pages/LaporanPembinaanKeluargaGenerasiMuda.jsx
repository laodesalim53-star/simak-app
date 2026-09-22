import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, Sprout } from 'lucide-react'
import Layout from '../components/Layout'
import DaftarHadirCetak from '../components/DaftarHadirCetak'
import KopSurat from '../components/KopSurat'

// Ganti 'logo' di bawah ini kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

function formatTanggalIndonesia(date) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function LaporanPembinaanKeluargaGenerasiMuda() {
  const { profil, sekolahId } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)

  // Query profil_kantor di-scope per kantor lewat sekolah_id, sama seperti
  // MateriPembinaanGenerasiMuda.jsx, KopSurat.jsx, dan halaman kantor lainnya.
  useEffect(() => {
    if (!sekolahId) {
      setProfilKantor(null)
      return
    }
    supabase
      .from('profil_kantor')
      .select('nama_kantor, alamat, kabupaten, kecamatan, telepon, email, kepala_kua, nip_kepala_kua, tempat_ttd, logo_path, ttd_kepala_kua_path')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data }) => setProfilKantor(data))
  }, [sekolahId])

  const ttdKepalaKuaUrl = profilKantor?.ttd_kepala_kua_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.ttd_kepala_kua_path).data.publicUrl
    : null

  const tempatTtd = profilKantor?.tempat_ttd || profilKantor?.kabupaten || ''
  const tanggalCetak = formatTanggalIndonesia(new Date())

  return (
    <Layout
      title="Laporan: Pembinaan Keluarga Majelis Taklim Generasi Muda"
      subtitle="Laporan pembinaan lengkap dengan landasan ayat Al-Qur'an dan daftar hadir peserta, siap cetak."
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
          className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
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
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Sprout size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">
              Laporan Pembinaan Keluarga Majelis Taklim Generasi Muda
            </h1>
            <p className="text-xs text-slate-500">Laporan Kegiatan Penyuluh Agama Islam</p>
          </div>
        </div>

        <div className="space-y-5 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              1. Latar Belakang
            </h2>
            <p>
              Keluarga muda saat ini tumbuh di tengah perubahan zaman yang cepat, mulai dari pola
              komunikasi digital, gaya hidup, hingga tekanan ekonomi yang berbeda dari generasi
              sebelumnya. Pembinaan majelis taklim bagi keluarga generasi muda dilaksanakan sebagai
              wadah penguatan nilai-nilai agama sekaligus ruang belajar bersama, agar rumah tangga
              yang baru dibangun memiliki fondasi keimanan, ilmu, dan kematangan sikap yang kokoh,
              dengan setiap materi dikaitkan langsung pada tuntunan Al-Qur'an sebagai sumber utama.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              2. Dasar Pelaksanaan
            </h2>
            <p>
              Allah SWT dalam QS. At-Tahrim ayat 6 memerintahkan orang-orang beriman untuk menjaga
              diri dan keluarganya dari api neraka, yang menjadi dasar tanggung jawab pasangan muda
              dalam mendidik dan membina keluarganya. Kegiatan ini juga merujuk pada rencana kerja
              tahunan (RKT) penyuluh sebagai acuan jadwal dan sasaran pembinaan keluarga muda di
              wilayah binaan.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              3. Tujuan Pembinaan
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Menguatkan pemahaman keagamaan dasar bagi pasangan dan keluarga muda.</li>
              <li>Membentuk kebiasaan ibadah dan majelis ilmu sejak awal berumah tangga.</li>
              <li>Membekali keluarga muda dengan keterampilan komunikasi dan manajemen konflik.</li>
              <li>Menumbuhkan kesadaran peran sebagai orang tua yang mendidik generasi berikutnya.</li>
              <li>Mempererat ukhuwah antar keluarga muda melalui kegiatan majelis rutin.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              4. Materi Pokok Pembinaan dan Landasan Al-Qur'an
            </h2>

            <div className="mb-4">
              <h3 className="font-medium text-slate-900 mb-1">
                a. Fikih Munakahat dan Hak-Kewajiban Suami Istri
              </h3>
              <p>
                Materi ini membahas hak dan kewajiban suami istri, adab dalam rumah tangga, serta
                landasan tujuan pernikahan dalam Islam. Allah SWT dalam QS. Ar-Rum ayat 21
                menjelaskan bahwa pasangan suami istri diciptakan agar tumbuh ketenangan, cinta,
                dan kasih sayang di antara keduanya. QS. An-Nisa ayat 19 juga menuntun agar
                pasangan saling memperlakukan satu sama lain dengan cara yang baik dan patut.
              </p>
            </div>

            <div className="mb-4">
              <h3 className="font-medium text-slate-900 mb-1">
                b. Manajemen Keuangan Keluarga
              </h3>
              <p>
                Materi ini mengajarkan pengelolaan rezeki yang halal, hemat, dan terencana sejak
                usia pernikahan masih muda. QS. Al-Furqan ayat 67 menggambarkan sikap pertengahan
                dalam membelanjakan harta, tidak berlebihan dan tidak pula kikir. QS. Al-Isra ayat
                26-27 mengingatkan agar keluarga tidak menghambur-hamburkan harta secara boros,
                karena sikap boros digambarkan sebagai perilaku yang tidak disukai.
              </p>
            </div>

            <div className="mb-4">
              <h3 className="font-medium text-slate-900 mb-1">
                c. Pengasuhan Anak (Parenting Islami)
              </h3>
              <p>
                Materi ini menjelaskan dasar mendidik anak sesuai tuntunan agama sejak dalam
                kandungan hingga usia dini. QS. Luqman ayat 13-14 menggambarkan nasihat seorang
                ayah kepada anaknya agar tidak menyekutukan Allah dan senantiasa berbuat baik
                kepada orang tua. Ayat ini menjadi teladan bagaimana pendidikan akidah dan akhlak
                ditanamkan sejak dini melalui komunikasi yang lembut dan penuh kasih.
              </p>
            </div>

            <div className="mb-4">
              <h3 className="font-medium text-slate-900 mb-1">
                d. Komunikasi Pasangan
              </h3>
              <p>
                Materi ini melatih cara menyampaikan pendapat dan menyelesaikan perbedaan tanpa
                merusak keharmonisan. QS. Al-Hujurat ayat 11 mengingatkan agar sesama mukmin,
                termasuk pasangan suami istri, tidak saling merendahkan atau mengolok-olok satu
                sama lain, karena hal itu dapat melukai kehormatan dan merusak hubungan.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-1">
                e. Literasi Digital Keluarga
              </h3>
              <p>
                Materi ini membekali keluarga muda agar bijak menggunakan gawai dan media sosial
                agar tidak mengganggu kualitas hubungan keluarga. QS. Al-Hujurat ayat 6 mengajarkan
                pentingnya memeriksa kebenaran suatu informasi sebelum diyakini atau disebarkan,
                sebuah prinsip yang sangat relevan dengan derasnya informasi di media sosial saat
                ini.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              5. Strategi Pelaksanaan
            </h2>
            <p>
              Pembinaan dilaksanakan secara berkala melalui pertemuan majelis taklim yang dikemas
              interaktif, meliputi ceramah singkat bertema ayat Al-Qur'an di atas, diskusi
              kelompok, dan sesi tanya jawab agar peserta muda tidak merasa digurui melainkan
              diajak berdialog. Penyuluh Agama Islam berperan sebagai fasilitator yang mendampingi,
              mendengarkan permasalahan riil yang dihadapi keluarga muda, dan mengaitkannya dengan
              tuntunan Al-Qur'an secara aplikatif.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              6. Hasil dan Evaluasi
            </h2>
            <p>
              Peserta menunjukkan antusiasme yang baik terutama ketika materi dikaitkan langsung
              dengan ayat Al-Qur'an dan contoh penerapannya dalam kehidupan sehari-hari. Diskusi
              kelompok membantu peserta lebih terbuka menyampaikan permasalahan rumah tangga yang
              dihadapi, sehingga pembinaan tidak hanya bersifat teoretis namun juga solutif.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              7. Kesimpulan dan Saran
            </h2>
            <p>
              Pembinaan majelis taklim keluarga generasi muda yang dilandasi ayat-ayat Al-Qur'an
              merupakan investasi jangka panjang bagi ketahanan keluarga dan masyarakat. Disarankan
              agar kegiatan ini terus dilaksanakan secara rutin dan terjadwal, dengan pendampingan
              yang konsisten sehingga keluarga muda diharapkan mampu tumbuh menjadi keluarga yang
              berilmu, berakhlak, dan siap mendidik generasi penerus yang lebih baik.
            </p>
          </section>
        </div>

        <div className="hadir-cetak">
          {/* Jumlah baris kosong disesuaikan agar tabel + blok ttd tetap
             muat dalam satu lembar cetak. Ubah sesuai jumlah peserta riil. */}
          <DaftarHadirCetak jumlahBaris={2} />

          {/* === TANDA TANGAN OTOMATIS DARI PROFIL KANTOR === */}
          <div className="ttd-block flex justify-between mt-6 text-sm text-slate-700">
            <div className="text-center w-48">
              <p>Mengetahui,</p>
              <p>Kepala KUA</p>
              <div className="h-14 flex items-end justify-center">
                {ttdKepalaKuaUrl && (
                  <img
                    src={ttdKepalaKuaUrl}
                    alt="Tanda Tangan Kepala KUA"
                    className="max-h-14 object-contain"
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
              <div className="h-14" />
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
            font-size: 10px;
            border-collapse: collapse;
          }
          .hadir-cetak th,
          .hadir-cetak td {
            padding: 2px 4px !important;
            line-height: 1.25 !important;
          }
          .hadir-cetak tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .ttd-block {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-top: 16px !important;
          }
        }
        @page {
          size: A4;
          margin: 10mm;
        }
      `}</style>
    </Layout>
  )
}
