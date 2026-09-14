import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, Coins } from 'lucide-react'
import Layout from '../components/Layout'
import DaftarHadirCetak from '../components/DaftarHadirCetak'

export default function MateriPengelolaanZakat() {
  return (
    <Layout
      title="Materi: Pengelolaan Zakat"
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
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Printer size={16} /> Cetak Laporan
        </button>
      </div>

      <div
        className="lembar-cetak print-only bg-white rounded-2xl border border-slate-100 p-5 sm:p-8 mx-auto"
        style={{ width: '210mm' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Coins size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">Pengelolaan Zakat</h1>
            <p className="text-xs text-slate-500">Materi Majelis Taklim</p>
          </div>
        </div>

        <div className="space-y-5 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              1. Pengertian dan Dasar Hukum Zakat
            </h2>
            <p>
              Zakat adalah kadar harta tertentu yang wajib dikeluarkan oleh seorang muslim yang telah
              memenuhi syarat, untuk diberikan kepada golongan yang berhak menerimanya. Zakat
              merupakan salah satu rukun Islam yang ketiga, dengan dasar hukum di antaranya QS.
              At-Taubah ayat 60 dan berbagai hadits Nabi Muhammad SAW.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              2. Jenis-Jenis Zakat
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium">Zakat Fitrah</span> — dikeluarkan setiap muslim
                menjelang Idulfitri, berupa bahan makanan pokok atau senilainya.
              </li>
              <li>
                <span className="font-medium">Zakat Maal (harta)</span> — dikeluarkan atas harta yang
                telah mencapai nisab dan haul, meliputi zakat penghasilan/profesi, perniagaan,
                pertanian, emas dan perak, serta hewan ternak.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              3. Syarat Wajib Zakat
            </h2>
            <p>
              Islam, merdeka, kepemilikan penuh atas harta, harta berkembang atau berpotensi
              berkembang, mencapai nisab (batas minimum), serta telah mencapai haul (kepemilikan
              genap satu tahun) untuk jenis harta tertentu.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              4. Nisab dan Kadar Zakat
            </h2>
            <p>
              Sebagai gambaran umum, nisab zakat maal disetarakan dengan 85 gram emas, dengan kadar
              zakat yang wajib dikeluarkan sebesar 2,5% dari total harta yang telah mencapai nisab
              dan haul. Kadar dan ketentuan dapat berbeda untuk zakat pertanian maupun hewan ternak.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              5. Mustahik (Penerima Zakat) — 8 Asnaf
            </h2>
            <p>
              Fakir, miskin, amil (pengelola zakat), mualaf, riqab (memerdekakan budak), gharim
              (orang berhutang), fisabilillah (di jalan Allah), dan ibnu sabil (musafir yang
              kehabisan bekal).
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              6. Mekanisme Pengelolaan Zakat melalui Amil
            </h2>
            <p>
              Penyaluran zakat melalui lembaga amil resmi (seperti BAZNAS atau LAZ terverifikasi)
              memungkinkan pendataan mustahik yang lebih tertib, penyaluran yang lebih tepat sasaran,
              serta pengelolaan yang dapat dipertanggungjawabkan secara administratif dan syar'i.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              7. Manfaat Zakat bagi Ekonomi Umat
            </h2>
            <p>
              Selain membersihkan harta dan jiwa muzaki, zakat yang dikelola dengan baik dapat
              menjadi instrumen pemerataan ekonomi, mengurangi kesenjangan sosial, dan mendorong
              pemberdayaan mustahik menuju kemandirian ekonomi.
            </p>
          </section>
        </div>

        <div className="hadir-cetak">
          <DaftarHadirCetak jumlahBaris={15} />
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
        }
        @page {
          size: A4;
          margin: 15mm;
        }
      `}</style>
    </Layout>
  )
}
