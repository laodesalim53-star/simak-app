import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, HeartHandshake } from 'lucide-react'
import Layout from '../components/Layout'
import DaftarHadirCetak from '../components/DaftarHadirCetak'
import KopSurat from '../components/KopSurat'

// Ganti 'logo' di bawah ini kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

function formatTanggalIndonesia(date) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function LaporanPembinaanKonsultasiPendampingan() {
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
      title="Laporan: Pembinaan Keagamaan, Konsultasi, dan Pendampingan Kelompok"
      subtitle="Laporan kegiatan lengkap dengan daftar hadir peserta, siap cetak."
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
            <HeartHandshake size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">
              Laporan Pembinaan Keagamaan, Konsultasi, dan Pendampingan Kelompok
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
              Tugas Penyuluh Agama Islam tidak hanya menyampaikan materi keagamaan secara satu
              arah, tetapi juga mendampingi masyarakat secara langsung melalui pembinaan rutin,
              konsultasi permasalahan keagamaan maupun keluarga, serta pendampingan kelompok binaan
              seperti majelis taklim, kelompok remaja masjid, dan kelompok keluarga sakinah. Laporan
              ini disusun untuk mendokumentasikan tiga bentuk layanan tersebut dalam satu periode
              kegiatan sebagai bentuk pertanggungjawaban dan bahan evaluasi.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              2. Dasar Pelaksanaan
            </h2>
            <p>
              Kegiatan ini dilaksanakan berdasarkan tugas dan fungsi Penyuluh Agama Islam sebagaimana
              diatur dalam Peraturan Menteri Agama tentang Penyuluh Agama, serta merujuk pada rencana
              kerja tahunan (RKT) penyuluh yang telah disusun sebelumnya sebagai acuan jadwal dan
              sasaran pembinaan, konsultasi, dan pendampingan kelompok binaan.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              3. Tujuan Kegiatan
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Meningkatkan pemahaman dan pengamalan keagamaan masyarakat secara berkelanjutan.</li>
              <li>Memberikan solusi atas permasalahan keagamaan, keluarga, dan sosial yang dihadapi masyarakat melalui layanan konsultasi.</li>
              <li>Memperkuat kapasitas dan keaktifan kelompok binaan agar mandiri dan berkelanjutan.</li>
              <li>Mendokumentasikan capaian dan kendala sebagai bahan evaluasi program penyuluhan.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              4. Ruang Lingkup Kegiatan
            </h2>

            <div className="mb-3">
              <h3 className="font-medium text-slate-900 mb-1">a. Pembinaan Keagamaan</h3>
              <p>
                Pembinaan dilakukan secara berkala melalui ceramah, kajian rutin, dan bimbingan
                langsung kepada jamaah maupun kelompok masyarakat, mencakup materi akidah, akhlak,
                ibadah, dan muamalah sehari-hari. Pembinaan diarahkan agar mudah dipahami dan
                relevan dengan kondisi nyata masyarakat setempat.
              </p>
            </div>

            <div className="mb-3">
              <h3 className="font-medium text-slate-900 mb-1">b. Konsultasi Keagamaan dan Keluarga</h3>
              <p>
                Layanan konsultasi diberikan kepada individu maupun pasangan yang menghadapi
                permasalahan keagamaan, rumah tangga, maupun sosial-kemasyarakatan. Konsultasi
                dilakukan secara tatap muka maupun melalui komunikasi jarak jauh, dengan menjaga
                kerahasiaan permasalahan yang disampaikan.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-1">c. Pendampingan Kelompok Binaan</h3>
              <p>
                Pendampingan dilakukan terhadap kelompok binaan seperti majelis taklim, kelompok
                keluarga sakinah, dan kelompok remaja, meliputi pendampingan kegiatan rutin,
                penguatan pengurus, serta pemberian masukan agar kelompok binaan dapat berjalan
                aktif dan berkelanjutan secara mandiri.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              5. Hasil dan Capaian
            </h2>
            <p>
              Secara umum, pembinaan keagamaan berjalan lancar dengan partisipasi jamaah yang
              cukup baik, layanan konsultasi memberikan solusi awal atas permasalahan yang
              disampaikan masyarakat, dan kelompok binaan menunjukkan peningkatan keaktifan dalam
              kegiatan rutinnya. Hasil selengkapnya dicatat pada daftar hadir dan dokumentasi
              kegiatan yang menyertai laporan ini.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              6. Kendala dan Solusi
            </h2>
            <p>
              Beberapa kendala yang ditemui antara lain keterbatasan waktu kehadiran peserta pada
              jam kerja, serta variasi tingkat pemahaman masyarakat terhadap materi yang
              disampaikan. Sebagai solusi, penyuluh menyesuaikan jadwal pembinaan dengan waktu
              luang jamaah dan menggunakan pendekatan komunikasi yang lebih sederhana dan
              partisipatif.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              7. Kesimpulan dan Saran
            </h2>
            <p>
              Pembinaan keagamaan, konsultasi, dan pendampingan kelompok binaan merupakan tiga
              layanan yang saling melengkapi dalam mendukung ketahanan keagamaan dan sosial
              masyarakat. Disarankan agar kegiatan ini terus dilaksanakan secara rutin dan
              terjadwal, dengan dukungan pencatatan yang lebih rapi agar dampaknya dapat dievaluasi
              secara berkelanjutan.
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
