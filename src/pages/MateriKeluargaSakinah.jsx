import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, Heart } from 'lucide-react'
import Layout from '../components/Layout'
import DaftarHadirCetak from '../components/DaftarHadirCetak'

export default function MateriKeluargaSakinah() {
  return (
    <Layout
      title="Materi: Keluarga Sakinah"
      subtitle="Bahan majelis lengkap dengan daftar hadir peserta, siap cetak."
    >
      {/* Trik cetak: saat print, sembunyikan seluruh halaman (termasuk
          Layout/sidebar) lalu tampilkan HANYA #area-cetak. Dengan begini
          kita tidak perlu mengubah komponen Layout sama sekali. */}
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body * { visibility: hidden; }
          #area-cetak, #area-cetak * { visibility: visible; }
          #area-cetak { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      <div className="print:hidden flex items-center justify-between mb-5">
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

      <div id="area-cetak" className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Heart size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">Keluarga Sakinah</h1>
            <p className="text-xs text-slate-500">Materi Majelis Taklim</p>
          </div>
        </div>

        <div className="space-y-5 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              1. Pengertian Keluarga Sakinah
            </h2>
            <p>
              Keluarga sakinah adalah keluarga yang dibangun atas dasar perkawinan yang sah, mampu
              memenuhi kebutuhan spiritual dan material secara layak dan seimbang, diliputi suasana
              kasih sayang antar anggota keluarga, serta mampu menyelaraskan nilai-nilai agama dengan
              lingkungan sekitarnya.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              2. Landasan Al-Qur'an
            </h2>
            <p>
              Allah SWT berfirman dalam QS. Ar-Rum ayat 21 bahwa Dia menciptakan pasangan hidup dari
              jenis manusia sendiri agar merasa tenteram, serta menjadikan di antara mereka rasa
              kasih dan sayang. Ayat ini menjadi dasar utama konsep keluarga sakinah, mawaddah, dan
              rahmah.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              3. Tiga Pilar: Sakinah, Mawaddah, Rahmah
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium">Sakinah</span> — ketenteraman batin yang dirasakan
                suami istri dalam menjalani kehidupan bersama.
              </li>
              <li>
                <span className="font-medium">Mawaddah</span> — rasa cinta yang menggebu, penuh
                semangat dan gairah kasih sayang.
              </li>
              <li>
                <span className="font-medium">Rahmah</span> — kasih sayang yang lebih tenang, penuh
                empati, kepedulian, dan pengorbanan, biasa tumbuh seiring bertambahnya usia
                pernikahan.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              4. Pilar Penopang Keluarga Sakinah
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Komunikasi yang sehat dan terbuka antar pasangan.</li>
              <li>Pembagian peran dan tanggung jawab yang jelas dan disepakati bersama.</li>
              <li>Pendidikan agama dan akhlak bagi anak sejak dini.</li>
              <li>Pengelolaan ekonomi keluarga yang halal, cukup, dan tidak berlebihan.</li>
              <li>Menjaga silaturahmi dengan keluarga besar dan lingkungan sosial.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              5. Tantangan Keluarga Masa Kini
            </h2>
            <p>
              Di antara tantangan yang perlu diwaspadai adalah pengaruh gawai dan media sosial yang
              mengurangi kualitas komunikasi tatap muka, tekanan ekonomi, minimnya waktu bersama
              akibat kesibukan kerja, serta lunturnya nilai-nilai keagamaan dalam pola asuh anak.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              6. Kesimpulan
            </h2>
            <p>
              Keluarga sakinah bukan sesuatu yang datang dengan sendirinya, melainkan hasil ikhtiar
              terus-menerus dari seluruh anggota keluarga, dengan pondasi ibadah, komunikasi, dan
              kasih sayang yang dijaga bersama.
            </p>
          </section>
        </div>

        <DaftarHadirCetak jumlahBaris={15} />
      </div>
    </Layout>
  )
}
