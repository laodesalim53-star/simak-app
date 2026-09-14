import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, HeartHandshake } from 'lucide-react'
import Layout from '../components/Layout'
import DaftarHadirCetak from '../components/DaftarHadirCetak'
export default function MateriAkhlak() {
  const { profil } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)

  useEffect(() => {
    supabase
      .from('profil_kantor')
      .select('kepala_kua, nip_kepala_kua')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => setProfilKantor(data))
  }, [])

  return (
    ...

export default function MateriAkhlak() {
  return (
    <Layout
      title="Materi: Akhlak"
      subtitle="Bahan penyuluhan lengkap dengan daftar hadir peserta, siap cetak."
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
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <HeartHandshake size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">Akhlak</h1>
            <p className="text-xs text-slate-500">Materi Penyuluhan Agama Islam — Lapas/Lembaga Pemasyarakatan</p>
          </div>
        </div>

        <div className="space-y-5 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              1. Pengertian dan Kedudukan Akhlak
            </h2>
            <p>
              Akhlak adalah sifat yang tertanam kuat dalam jiwa seseorang, yang melahirkan
              perbuatan secara spontan tanpa memerlukan pemikiran panjang. Akhlak menjadi ukuran
              kesempurnaan iman dan amalan yang paling berat timbangannya di akhirat.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                QS. Al-Qalam ayat 4: <span className="italic">"Dan sesungguhnya engkau
                (Muhammad) benar-benar berbudi pekerti yang agung."</span>
              </li>
              <li>
                HR. Tirmidzi: <span className="italic">"Mukmin yang paling sempurna imannya
                adalah yang paling baik akhlaknya."</span>
              </li>
              <li>
                HR. Abu Dawud &amp; Tirmidzi: <span className="italic">"Tidak ada sesuatu pun
                yang lebih berat dalam timbangan seorang mukmin pada hari kiamat melebihi akhlak
                yang baik."</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              2. Sabar Menghadapi Ujian
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                QS. Al-Baqarah ayat 155: <span className="italic">"Dan sungguh akan Kami berikan
                cobaan kepadamu... dan berikanlah berita gembira kepada orang-orang yang
                sabar."</span>
              </li>
              <li>
                QS. Az-Zumar ayat 10: <span className="italic">"Sesungguhnya hanya orang-orang
                yang bersabarlah yang dicukupkan pahala mereka tanpa batas."</span>
              </li>
              <li>
                HR. Muslim: <span className="italic">"Sungguh menakjubkan perkara orang mukmin.
                Jika ditimpa kesusahan ia bersabar, dan itu baik baginya."</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              3. Taubat: Pintu yang Selalu Terbuka
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                QS. Az-Zumar ayat 53: <span className="italic">"Janganlah kamu berputus asa dari
                rahmat Allah. Sesungguhnya Allah mengampuni dosa-dosa semuanya."</span>
              </li>
              <li>
                QS. Al-Baqarah ayat 222: <span className="italic">"Sesungguhnya Allah menyukai
                orang-orang yang bertaubat dan menyukai orang-orang yang menyucikan diri."</span>
              </li>
              <li>
                HR. Tirmidzi &amp; Ibnu Majah: <span className="italic">"Setiap anak Adam pasti
                berbuat salah, dan sebaik-baik orang yang berbuat salah adalah yang
                bertaubat."</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              4. Menjaga Lisan dan Menahan Amarah
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                HR. Bukhari-Muslim: <span className="italic">"Barangsiapa beriman kepada Allah
                dan hari akhir, hendaklah ia berkata baik atau diam."</span>
              </li>
              <li>
                QS. Ali Imran ayat 134: <span className="italic">"...dan orang-orang yang
                menahan amarahnya dan mema'afkan (kesalahan) orang."</span>
              </li>
              <li>
                HR. Bukhari-Muslim: <span className="italic">"Bukanlah orang yang kuat itu orang
                yang menang dalam pergulatan, tetapi orang yang kuat adalah orang yang mampu
                menguasai dirinya ketika marah."</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              5. Muhasabah, Amanah, dan Kejujuran
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                QS. Al-Hasyr ayat 18: <span className="italic">"...hendaklah setiap diri
                memperhatikan apa yang telah diperbuatnya untuk hari esok (akhirat)."</span>
              </li>
              <li>
                QS. An-Nisa ayat 58: <span className="italic">"Sesungguhnya Allah menyuruh kamu
                menyampaikan amanah kepada yang berhak menerimanya."</span>
              </li>
              <li>
                HR. Bukhari-Muslim: <span className="italic">"Hendaklah kalian berlaku jujur,
                karena kejujuran membawa kepada kebaikan, dan kebaikan membawa ke
                surga."</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              6. Kisah Teladan: Nabi Yusuf AS di Penjara
            </h2>
            <p>
              Nabi Yusuf AS dipenjara akibat fitnah, namun tetap menjaga akhlak, berdakwah, dan
              berbaik sangka kepada Allah. Allah pun mengangkat derajatnya.
            </p>
            <p className="italic mt-1">
              QS. Yusuf ayat 56: "Dan demikianlah Kami memberi kedudukan kepada Yusuf di negeri
              itu..."
            </p>
            <p className="mt-1">
              <span className="font-medium">Pelajaran:</span> tempat dan keadaan hari ini tidak
              menentukan masa depan. Akhlak dan kedekatan dengan Allah-lah yang menentukan.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              7. Langkah Praktis
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Jaga shalat lima waktu.</li>
              <li>Perbanyak istighfar dan dzikir.</li>
              <li>Ikuti pembinaan dengan sungguh-sungguh.</li>
              <li>Hindari pertengkaran dan provokasi.</li>
              <li>Jalin hubungan baik dengan petugas dan sesama warga binaan.</li>
              <li>Susun rencana hidup setelah bebas.</li>
            </ul>
          </section>

          <section>
            <p className="italic">
              QS. An-Nur ayat 31: "Dan bertaubatlah kamu sekalian kepada Allah, wahai orang-orang
              yang beriman, supaya kamu beruntung."
            </p>
          </section>
        </div>

        <div className="hadir-cetak">
          <DaftarHadirCetak jumlahBaris={15} />

          <div className="ttd-block flex justify-between mt-10 text-sm text-slate-700">
  <div className="text-center w-48">
    <p>Mengetahui,</p>
    <p>Kepala KUA</p>
    <div className="h-20" />
    <p className="font-semibold border-t border-slate-400 pt-1">
      ({profilKantor?.kepala_kua || '..............................'})
    </p>
    <p className="text-xs text-slate-500">
      NIP. {profilKantor?.nip_kepala_kua || '..............................'}
    </p>
  </div>
  <div className="text-center w-48">
    <p>&nbsp;</p>
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
