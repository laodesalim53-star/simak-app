import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, Landmark } from 'lucide-react'
import Layout from '../components/Layout'
import DaftarHadirCetak from '../components/DaftarHadirCetak'

export default function MateriWakaf() {
  return (
    <Layout
      title="Materi: Wakaf"
      subtitle="Bahan majelis lengkap dengan daftar hadir peserta, siap cetak."
    >
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
          className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Printer size={16} /> Cetak Laporan
        </button>
      </div>

      <div id="area-cetak" className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-8">
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

        <DaftarHadirCetak jumlahBaris={15} />
      </div>
    </Layout>
  )
}
