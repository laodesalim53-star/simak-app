import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, Handshake } from 'lucide-react'
import Layout from '../components/Layout'
import DaftarHadirCetak from '../components/DaftarHadirCetak'

// Ganti 'logo' di bawah ini kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

function formatTanggalIndonesia(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const TEMA_KEGIATAN =
  'Menjadikan Masyarakat yang Bermoral dan Harmonis dalam Konteks Kehidupan Bermasyarakat'

export default function LaporanPenyuluhanMasyarakatBermoral() {
  const { profil } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)

  // === DATA KEGIATAN — DAPAT DIISI ULANG SETIAP KALI DIPAKAI ===
  const [namaPenyuluh, setNamaPenyuluh] = useState('YENNY YUSUF, S.HI')
  const [nipPenyuluh, setNipPenyuluh] = useState('')
  const [lokasiPenyuluhan, setLokasiPenyuluhan] = useState('DESA TABARFANE')
  const [waktuKegiatan, setWaktuKegiatan] = useState('2026-01-15')
  const [tempatKegiatan, setTempatKegiatan] = useState('Desa Tabarfane')
  const [jumlahPeserta, setJumlahPeserta] = useState(15)

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

  const tempatTtd = profilKantor?.tempat_ttd || profilKantor?.kabupaten || tempatKegiatan
  const tanggalCetak = formatTanggalIndonesia(new Date())
  const waktuKegiatanFormatted = formatTanggalIndonesia(waktuKegiatan) || waktuKegiatan
  const jumlahBarisHadir = Number(jumlahPeserta) > 0 ? Number(jumlahPeserta) : 15

  return (
    <Layout
      title="Laporan: Penyuluhan Masyarakat Bermoral & Harmonis"
      subtitle="Laporan kegiatan penyuluhan lengkap dengan daftar hadir peserta, siap cetak."
    >
      <div className="no-print flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-5">
        <Link
          to="/pusat-materi-majelis"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Kembali ke Pusat Materi
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
        >
          <Printer size={16} /> Cetak Laporan
        </button>
      </div>

      {/* === FORM DATA KEGIATAN — TIDAK IKUT TERCETAK === */}
      <div className="no-print bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 mb-5">
        <h2 className="font-display text-sm font-semibold text-slate-900 mb-3">
          Data Kegiatan Penyuluhan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Penyuluh</label>
            <input
              type="text"
              value={namaPenyuluh}
              onChange={(e) => setNamaPenyuluh(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">NIP Penyuluh</label>
            <input
              type="text"
              value={nipPenyuluh}
              onChange={(e) => setNipPenyuluh(e.target.value)}
              placeholder="Opsional"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Lokasi Penyuluhan</label>
            <input
              type="text"
              value={lokasiPenyuluhan}
              onChange={(e) => setLokasiPenyuluhan(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Kegiatan</label>
            <input
              type="date"
              value={waktuKegiatan}
              onChange={(e) => setWaktuKegiatan(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tempat Kegiatan</label>
            <input
              type="text"
              value={tempatKegiatan}
              onChange={(e) => setTempatKegiatan(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Jumlah Peserta</label>
            <input
              type="number"
              min="1"
              value={jumlahPeserta}
              onChange={(e) => setJumlahPeserta(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Isi data di atas sebelum mencetak. Jumlah peserta akan otomatis menyesuaikan jumlah baris
          pada daftar hadir. Nama Majelis, Tanggal, Tempat, dan Pemateri pada Daftar Hadir Peserta
          di bawah akan terisi otomatis mengikuti Lokasi Penyuluhan, Waktu Kegiatan, Tempat Kegiatan,
          dan Nama Penyuluh di atas. Nama &amp; Alamat peserta bisa ditarik otomatis lewat dropdown
          "Kelompok Binaan" pada Daftar Hadir di bawah (default: Masyarakat) — atau diisi manual.
        </p>
      </div>

      {/* === PRATINJAU CETAK — dibungkus scroll horizontal di layar HP,
          supaya lembar A4 (210mm) tidak merusak tata letak layar sempit === */}
      <div className="print:overflow-visible overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-4">
        <div
          className="lembar-cetak print-only bg-white rounded-2xl border border-slate-100 p-5 sm:p-8 mx-auto"
          style={{ width: '210mm', maxWidth: 'none' }}
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

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Handshake size={20} />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-slate-900">
                Laporan Kegiatan Penyuluhan Agama Islam
              </h1>
              <p className="text-xs text-slate-500">{TEMA_KEGIATAN}</p>
            </div>
          </div>

          {/* === TABEL INFO KEGIATAN === */}
          <div className="my-5 border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="w-44 px-3 py-2 font-medium text-slate-600 bg-slate-50">Nama Penyuluh</td>
                  <td className="px-3 py-2 text-slate-800">{namaPenyuluh || '-'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50">Lokasi Penyuluhan</td>
                  <td className="px-3 py-2 text-slate-800">{lokasiPenyuluhan || '-'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50">Waktu Kegiatan</td>
                  <td className="px-3 py-2 text-slate-800">{waktuKegiatanFormatted || '-'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50">Tempat Kegiatan</td>
                  <td className="px-3 py-2 text-slate-800">{tempatKegiatan || '-'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50">Jumlah Peserta</td>
                  <td className="px-3 py-2 text-slate-800">{jumlahPeserta || '-'} orang</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-5 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                I. Pendahuluan
              </h2>
              <p>
                Masyarakat yang bermoral dan harmonis merupakan cita-cita bersama dalam kehidupan
                berbangsa dan bernegara. Moralitas yang tinggi serta hubungan sosial yang rukun dan
                damai menjadi fondasi penting dalam membangun masyarakat madani. Dalam konteks ini,
                agama Islam memiliki peran strategis dalam membimbing umat menuju kehidupan yang
                sesuai dengan nilai-nilai akhlak mulia dan toleransi antar sesama.
              </p>
              <p className="mt-2">
                Kegiatan penyuluhan ini bertujuan untuk memberikan pemahaman dan motivasi kepada
                masyarakat agar lebih aktif dalam membentuk lingkungan sosial yang dilandasi akhlak
                Islami, solidaritas, dan semangat gotong royong.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                II. Tujuan Kegiatan
              </h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Memberikan pemahaman tentang pentingnya moral dalam kehidupan bermasyarakat.</li>
                <li>Mendorong terciptanya kehidupan sosial yang harmonis berdasarkan nilai-nilai Islam.</li>
                <li>Menumbuhkan kesadaran masyarakat terhadap pentingnya toleransi dan saling menghormati.</li>
                <li>Mengurangi potensi konflik sosial melalui pendekatan keagamaan.</li>
              </ol>
            </section>

            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                III. Materi yang Disampaikan
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="font-medium">1. Nilai-nilai Moral dalam Islam</p>
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>Pentingnya kejujuran, tanggung jawab, amanah, dan adab dalam kehidupan sehari-hari.</li>
                    <li>Contoh akhlak Rasulullah SAW sebagai teladan umat.</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">2. Konsep Keharmonisan Sosial</p>
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>Prinsip ukhuwah islamiyah, ukhuwah wathaniyah, dan ukhuwah basyariyah.</li>
                    <li>Pentingnya menjaga silaturahmi dan menjauhi prasangka buruk.</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">3. Pencegahan Konflik Sosial</p>
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>Peran komunikasi, musyawarah, dan mediasi dalam menyelesaikan perselisihan.</li>
                    <li>Menghindari provokasi, hoaks, dan ujaran kebencian.</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">4. Peran Masyarakat dalam Mewujudkan Kehidupan Bermoral dan Harmonis</p>
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>Membangun budaya saling menasihati dalam kebaikan.</li>
                    <li>Aktif dalam kegiatan keagamaan dan sosial di lingkungan sekitar.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                IV. Metode Penyuluhan
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Ceramah interaktif</li>
                <li>Tanya jawab</li>
                <li>Diskusi kelompok kecil</li>
                <li>Studi kasus</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                V. Hasil Kegiatan
              </h2>
              <p>
                Kegiatan berjalan dengan lancar dan antusiasme peserta cukup tinggi. Para peserta
                menunjukkan ketertarikan pada materi yang disampaikan, khususnya terkait penerapan
                nilai-nilai moral dalam menghadapi persoalan sehari-hari seperti pertengkaran antar
                tetangga, perbedaan pandangan politik, dan sikap terhadap perbedaan agama atau budaya.
              </p>
              <p className="mt-2">
                Banyak peserta yang menyampaikan pengalaman pribadi dan keinginan untuk memperbaiki
                hubungan sosial di lingkungan masing-masing.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                VI. Kesimpulan
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Masyarakat menyadari pentingnya moral dan keharmonisan dalam kehidupan sosial.</li>
                <li>Diperlukan pendekatan yang terus-menerus melalui kegiatan penyuluhan dan pembinaan.</li>
                <li>Nilai-nilai Islam dapat menjadi solusi dalam menjaga kerukunan dan mencegah konflik.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-1.5">
                VII. Saran
              </h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  Diperlukan dukungan dari tokoh agama, tokoh masyarakat, dan pemerintah setempat
                  untuk program pembinaan moral masyarakat secara berkelanjutan.
                </li>
                <li>Kegiatan penyuluhan serupa agar rutin dilakukan di berbagai lapisan masyarakat.</li>
                <li>
                  Diperlukan pelibatan generasi muda dalam kegiatan dakwah dan sosial untuk membentuk
                  karakter yang kuat dan bermoral.
                </li>
              </ol>
            </section>
          </div>

          <div className="hadir-cetak">
            <DaftarHadirCetak
              jumlahBaris={jumlahBarisHadir}
              kelompokAwal="masyarakat"
              namaMajelisAwal={lokasiPenyuluhan}
              tanggalAwal={waktuKegiatan}
              tempatAwal={tempatKegiatan}
              pemateriAwal={namaPenyuluh}
            />

            {/* === TANDA TANGAN OTOMATIS === */}
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
                  ({namaPenyuluh || profil?.nama_lengkap || '..............................'})
                </p>
                <p className="text-xs text-slate-500">
                  NIP. {nipPenyuluh || profil?.nip || '..............................'}
                </p>
              </div>
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
