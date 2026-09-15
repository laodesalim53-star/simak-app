import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, Scale } from 'lucide-react'
import Layout from '../components/Layout'
import DaftarHadirCetak from '../components/DaftarHadirCetak'

// Ganti 'logo' di bawah ini kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

function formatTanggalIndonesia(date) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MateriModerasiBeragama() {
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
      title="Materi: Moderasi Beragama"
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
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
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
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Scale size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">Moderasi Beragama</h1>
            <p className="text-xs text-slate-500">Materi Majelis Taklim</p>
          </div>
        </div>

        <div className="space-y-5 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              1. Pengertian Moderasi Beragama
            </h2>
            <p>
              Moderasi beragama adalah cara pandang, sikap, dan perilaku beragama secara seimbang
              (tawazun), tidak berlebihan (ifrath) dan tidak mengurangi (tafrith) dalam praktik
              beragama, dengan tetap teguh pada prinsip ajaran agama masing-masing serta menghormati
              perbedaan cara pandang dan praktik keagamaan orang lain.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              2. Landasan Al-Qur'an
            </h2>
            <p>
              Allah SWT menjelaskan dalam QS. Al-Baqarah ayat 143 bahwa umat Islam dijadikan sebagai
              umat pertengahan (ummatan wasathan) agar menjadi saksi atas manusia. Ayat ini menjadi
              rujukan utama bahwa Islam mengajarkan jalan tengah dalam segala aspek kehidupan,
              termasuk cara beragama.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              3. Empat Indikator Moderasi Beragama
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium">Komitmen kebangsaan</span> — menerima Pancasila, UUD
                1945, NKRI, dan Bhinneka Tunggal Ika sebagai kesepakatan bersama.
              </li>
              <li>
                <span className="font-medium">Toleransi</span> — memberi ruang dan menghargai
                perbedaan keyakinan, pendapat, serta praktik keagamaan orang lain.
              </li>
              <li>
                <span className="font-medium">Anti kekerasan</span> — menolak segala bentuk
                kekerasan dan pemaksaan dalam menyebarkan atau mempertahankan ajaran agama.
              </li>
              <li>
                <span className="font-medium">Akomodatif terhadap budaya lokal</span> — menerima
                tradisi dan kearifan lokal selama tidak bertentangan dengan pokok ajaran agama.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              4. Bahaya Ekstremisme dan Radikalisme
            </h2>
            <p>
              Sikap berlebih-lebihan dalam beragama dapat melahirkan pemahaman yang kaku, mudah
              mengkafirkan pihak lain (takfiri), serta rentan disusupi paham radikal dan ekstrem yang
              mengancam persatuan dan kerukunan umat beragama. Di sisi lain, sikap yang terlalu
              longgar juga dapat melunturkan nilai-nilai dasar ajaran agama itu sendiri.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              5. Moderasi Beragama dalam Kehidupan Berbangsa
            </h2>
            <p>
              Indonesia sebagai negara majemuk dengan berbagai suku, agama, ras, dan golongan
              memerlukan sikap moderat agar keberagaman menjadi kekuatan pemersatu, bukan sumber
              perpecahan. Moderasi beragama menjadi jembatan antara nilai-nilai keagamaan dengan
              semangat kebangsaan dan kemanusiaan.
            </p>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              6. Implementasi dalam Kehidupan Sehari-hari
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Menjaga ukhuwah islamiyah, wathaniyah, dan basyariyah secara seimbang.</li>
              <li>Menghindari ujaran kebencian dan penyebaran informasi bohong (hoaks) berbasis agama.</li>
              <li>Aktif dalam kegiatan lintas iman dan kerja sama sosial kemasyarakatan.</li>
              <li>Membiasakan dialog dan musyawarah dalam menyelesaikan perbedaan pandangan.</li>
              <li>Mendidik keluarga dengan wawasan keagamaan yang moderat sejak dini.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
              7. Kesimpulan
            </h2>
            <p>
              Moderasi beragama bukan berarti mencampuradukkan ajaran agama atau mengurangi
              keyakinan, melainkan cara beragama yang seimbang, toleran, dan menyejukkan, sehingga
              nilai-nilai agama dapat hadir sebagai rahmat bagi semesta alam di tengah kehidupan yang
              majemuk.
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
