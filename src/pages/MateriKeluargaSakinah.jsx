import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, Heart } from 'lucide-react'
import Layout from '../components/Layout'
import DaftarHadirCetak from '../components/DaftarHadirCetak'
import KopSurat from '../components/KopSurat'

// Ganti 'logo' di bawah ini kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

function formatTanggalIndonesia(date) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MateriKeluargaSakinah() {
  const { profil, sekolahId } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)

  // Query profil_kantor kini di-scope per kantor lewat sekolah_id (bukan
  // lagi id=1 yang hardcode), sama seperti ProfilKantor.jsx dan KopSurat.jsx.
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
      title="Materi: Keluarga Sakinah"
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

        <div className="hadir-cetak">
          {/* Jumlah baris kosong dikurangi (dari 15 -> 2) supaya tabel + ttd
             tidak meluber ke halaman ke-3. Sesuaikan lagi jika perlu. */}
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
