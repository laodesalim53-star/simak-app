import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Printer, ArrowLeft, Mail } from 'lucide-react'
import Layout from '../components/Layout'
import KopSurat from '../components/KopSurat'

// Ganti kalau nama bucket storage-mu berbeda
const LOGO_BUCKET = 'profil-kantor'

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function formatTanggalIndonesia(date) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function tanggalAkhirBulan(tahun, bulan) {
  const d = new Date(tahun, bulan, 0) // bulan 1-12 -> hari terakhir bulan tsb
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// Bagian teks di antara ** ** dicetak tebal
function renderTebal(teks) {
  return teks.split('**').map((bagian, i) =>
    i % 2 === 1 ? <strong key={i}>{bagian}</strong> : <span key={i}>{bagian}</span>
  )
}

const PENUTUP_DEFAULT =
  'Demikian yang dapat kami sampaikan untuk diketahui dan ditindaklanjuti, sebelumnya kami sampaikan terima kasih.'

// Pilihan jenis surat — diambil dari contoh dokumen Pengantar-DH-Oktober.docx
const PRESET = {
  hadir: {
    label: 'Pengantar Daftar Hadir Pegawai',
    klasifikasi: 'OT.01.3',
    sifat: '-',
    lampiran: '1 (satu)',
    perihal: ({ bulan, tahun }) => `Daftar hadir pegawai\nBulan ${bulan} ${tahun}`,
    cq: 'Bagian Kepegawaian',
    isi: ({ kantor, bulan, tahun }) =>
      `Bersama ini kami sampaikan dengan hormat **Daftar Hadir Pegawai** Bulan ${bulan} tahun ${tahun} pada **${kantor}** sebagaimana perihal di atas, guna menjadi bahan/data untuk diproses selanjutnya.`,
  },
  internet: {
    label: 'Pemberitahuan Gangguan Jaringan Internet',
    klasifikasi: 'OT.01.2',
    sifat: '-',
    lampiran: '1 (satu)',
    perihal: () => 'Pemberitahuan gangguan jaringan internet',
    cq: 'Kepala Seksi Bimas Islam',
    isi: ({ kantor, bulan, tahun }) =>
      `Bersama ini kami sampaikan bahwa jaringan internet di titik lokasi/TILOK **${kantor}** sejak bulan ${bulan} tahun ${tahun} masih mengalami gangguan sehingga belum dapat kami gunakan untuk mengakses aplikasi PUSAKA. Oleh karena itu, kami masih menyampaikan laporan kehadiran secara manual.`,
  },
  nikah: {
    label: 'Pengantar Data Nikah dan Rujuk',
    klasifikasi: 'PW.01',
    sifat: 'Penting',
    lampiran: '1 (satu) jepit',
    perihal: ({ bulan, tahun }) => `Lampiran Data Nikah dan Nikah Rujuk\nBulan ${bulan} Tahun ${tahun}`,
    cq: 'Kepala Seksi Bimas Islam',
    isi: ({ kantor, bulan, tahun }) =>
      `Bersama ini kami sampaikan dengan hormat lampiran data nikah dan nikah rujuk Bulan ${bulan} tahun ${tahun} pada **${kantor}** sebagaimana perihal di atas, guna menjadi bahan/data untuk diproses selanjutnya.`,
  },
  kustom: {
    label: 'Surat Pengantar Lainnya (isi sendiri)',
    klasifikasi: '',
    sifat: '-',
    lampiran: '-',
    perihal: () => '',
    cq: '',
    isi: () => '',
  },
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500'
const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

export default function SuratPengantar() {
  const navigate = useNavigate()
  const { sekolahId } = useAuth()
  const [profilKantor, setProfilKantor] = useState(null)

  const hariIni = new Date()
  const [jenis, setJenis] = useState('hadir')
  const [bulan, setBulan] = useState(hariIni.getMonth() + 1)
  const [tahun, setTahun] = useState(hariIni.getFullYear())

  const [form, setForm] = useState({
    urut: '',
    kodeKantor: 'KUA.25.06.07',
    klasifikasi: PRESET.hadir.klasifikasi,
    tanggal: hariIni.toISOString().slice(0, 10),
    sifat: '-',
    lampiran: '1 (satu)',
    perihal: '',
    kotaTujuan: 'Dobo',
    cq: '',
    isi: '',
    penutup: PENUTUP_DEFAULT,
    tembusan: '',
  })

  const ubah = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  // Profil kantor di-scope per kantor lewat sekolah_id (sama seperti
  // DaftarHadirPegawai.jsx & ProfilKantor.jsx), bukan id=1 yang hardcode.
  useEffect(() => {
    if (!sekolahId) {
      setProfilKantor(null)
      return
    }
    supabase
      .from('profil_kantor')
      .select('nama_kantor, kabupaten, kecamatan, kepala_kua, nip_kepala_kua, ttd_kepala_kua_path')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data }) => setProfilKantor(data))
  }, [sekolahId])

  const namaKabupaten = (profilKantor?.kabupaten || '').replace(/^kabupaten\s+/i, '').trim()
  const namaKantor = profilKantor?.nama_kantor || 'Kantor Urusan Agama'

  // Isi otomatis saat jenis surat / bulan / tahun berubah (atau profil kantor selesai dimuat)
  useEffect(() => {
    const p = PRESET[jenis]
    const ctx = { kantor: namaKantor, bulan: NAMA_BULAN[bulan - 1], tahun }
    setForm((f) => ({
      ...f,
      klasifikasi: p.klasifikasi,
      sifat: p.sifat,
      lampiran: p.lampiran,
      perihal: p.perihal(ctx),
      cq: p.cq,
      isi: p.isi(ctx),
      tembusan: namaKabupaten ? `Kepala Kantor Kementerian Agama\nKabupaten ${namaKabupaten}` : f.tembusan,
    }))
  }, [jenis, bulan, tahun, namaKantor, namaKabupaten])

  // Tanggal surat default: akhir bulan yang dipilih
  useEffect(() => {
    setForm((f) => ({ ...f, tanggal: tanggalAkhirBulan(tahun, bulan) }))
  }, [bulan, tahun])

  const ttdKepalaKuaUrl = profilKantor?.ttd_kepala_kua_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.ttd_kepala_kua_path).data.publicUrl
    : null

  const nomorSurat = `B-${form.urut || '...'}/${form.kodeKantor}${form.klasifikasi ? `/${form.klasifikasi}` : ''}/${bulan}/${tahun}`
  const tanggalSurat = form.tanggal ? formatTanggalIndonesia(new Date(form.tanggal + 'T00:00:00')) : ''
  const paragrafIsi = form.isi.split(/\n\s*\n/).filter((p) => p.trim())

  return (
    <Layout
      title="Surat Pengantar"
      subtitle="Pilih jenis surat, sesuaikan isinya, lalu cetak dengan kop dan tanda tangan otomatis."
    >
      <div className="no-print flex items-center justify-between mb-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Printer size={16} /> Cetak Surat
        </button>
      </div>

      {/* === FORM ISIAN (tidak ikut tercetak) === */}
      <div className="no-print bg-white rounded-2xl border border-slate-100 p-5 mb-6 mx-auto" style={{ maxWidth: '210mm' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Mail size={18} />
          </div>
          <h2 className="font-display text-base font-semibold text-slate-900">Isian Surat</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="sm:col-span-3">
            <label className={labelCls}>Jenis surat</label>
            <select className={inputCls} value={jenis} onChange={(e) => setJenis(e.target.value)}>
              {Object.entries(PRESET).map(([key, p]) => (
                <option key={key} value={key}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Bulan</label>
            <select className={inputCls} value={bulan} onChange={(e) => setBulan(Number(e.target.value))}>
              {NAMA_BULAN.map((n, i) => (
                <option key={n} value={i + 1}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tahun</label>
            <input type="number" className={inputCls} value={tahun} onChange={(e) => setTahun(Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Tanggal surat</label>
            <input type="date" className={inputCls} value={form.tanggal} onChange={ubah('tanggal')} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className={labelCls}>No. urut surat</label>
            <input className={inputCls} placeholder="mis. 43" value={form.urut} onChange={ubah('urut')} />
          </div>
          <div>
            <label className={labelCls}>Kode kantor</label>
            <input className={inputCls} value={form.kodeKantor} onChange={ubah('kodeKantor')} />
          </div>
          <div>
            <label className={labelCls}>Kode klasifikasi</label>
            <input className={inputCls} value={form.klasifikasi} onChange={ubah('klasifikasi')} />
          </div>
          <div className="sm:col-span-3 text-xs text-slate-500">
            Nomor surat: <span className="font-medium text-slate-700">{nomorSurat}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelCls}>Sifat</label>
            <input className={inputCls} value={form.sifat} onChange={ubah('sifat')} />
          </div>
          <div>
            <label className={labelCls}>Lampiran</label>
            <input className={inputCls} value={form.lampiran} onChange={ubah('lampiran')} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Perihal (Enter untuk baris baru)</label>
            <textarea rows={2} className={inputCls} value={form.perihal} onChange={ubah('perihal')} />
          </div>
          <div>
            <label className={labelCls}>Cq. (bagian/seksi tujuan)</label>
            <input className={inputCls} value={form.cq} onChange={ubah('cq')} />
          </div>
          <div>
            <label className={labelCls}>Kota tujuan</label>
            <input className={inputCls} value={form.kotaTujuan} onChange={ubah('kotaTujuan')} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Isi surat (pisahkan paragraf dengan baris kosong; **teks** = tebal)</label>
            <textarea rows={5} className={inputCls} value={form.isi} onChange={ubah('isi')} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Kalimat penutup</label>
            <textarea rows={2} className={inputCls} value={form.penutup} onChange={ubah('penutup')} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Tembusan (satu baris per tujuan; kosongkan bila tidak ada)</label>
            <textarea rows={2} className={inputCls} value={form.tembusan} onChange={ubah('tembusan')} />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Mengganti jenis surat, bulan, atau tahun akan mengisi ulang perihal, isi, dan tembusan.
        </p>
      </div>

      {/* === LEMBAR SURAT === */}
      <div
        className="lembar-cetak print-only bg-white rounded-2xl border border-slate-100 mx-auto"
        style={{
          width: '210mm',
          padding: '15mm 20mm',
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '12pt',
          color: '#0f172a',
        }}
      >
        {/* === KOP SURAT OTOMATIS (komponen yang sama dengan Daftar Hadir Pegawai) === */}
        <KopSurat />

        {/* === NOMOR, SIFAT, LAMPIRAN, PERIHAL === */}
        <div className="flex justify-between gap-4">
          <table className="border-collapse">
            <tbody>
              <tr>
                <td className="pr-2 align-top w-24">Nomor</td>
                <td className="pr-2 align-top">:</td>
                <td className="align-top">{nomorSurat}</td>
              </tr>
              <tr>
                <td className="pr-2 align-top">Sifat</td>
                <td className="pr-2 align-top">:</td>
                <td className="align-top">{form.sifat || '-'}</td>
              </tr>
              <tr>
                <td className="pr-2 align-top">Lampiran</td>
                <td className="pr-2 align-top">:</td>
                <td className="align-top">{form.lampiran || '-'}</td>
              </tr>
              <tr>
                <td className="pr-2 align-top">Perihal</td>
                <td className="pr-2 align-top">:</td>
                <td className="align-top whitespace-pre-line">{form.perihal}</td>
              </tr>
            </tbody>
          </table>
          <p className="shrink-0 whitespace-nowrap">{tanggalSurat}</p>
        </div>

        {/* === TUJUAN === */}
        <div className="mt-5">
          <p>Yth.</p>
          <p>Kepala Kantor Kementerian Agama Kabupaten {namaKabupaten}</p>
          {form.cq && <p>Cq. {form.cq}</p>}
          {form.kotaTujuan && <p>{form.kotaTujuan}</p>}
        </div>

        {/* === ISI === */}
        <div className="mt-5 space-y-3 text-justify leading-relaxed">
          <p>Assalamu’alaikum Wr. Wb.</p>
          {paragrafIsi.map((p, i) => (
            <p key={i} className="whitespace-pre-line" style={{ textIndent: '10mm' }}>
              {renderTebal(p)}
            </p>
          ))}
          {form.penutup && <p style={{ textIndent: '10mm' }}>{form.penutup}</p>}
          <p>Wassalamu’alaikum Wr. Wb.</p>
        </div>

        {/* === TANDA TANGAN OTOMATIS DARI PROFIL KANTOR === */}
        <div className="ttd-block mt-6 ml-auto text-center" style={{ width: '70mm' }}>
          <p className="font-bold">Kepala</p>
          <div className="h-20 flex items-center justify-center">
            {ttdKepalaKuaUrl && (
              <img src={ttdKepalaKuaUrl} alt="Tanda Tangan Kepala KUA" className="max-h-20 object-contain" />
            )}
          </div>
          <p className="font-bold uppercase">{profilKantor?.kepala_kua || '..............................'}</p>
          <p>NIP. {profilKantor?.nip_kepala_kua || '..............................'}</p>
        </div>

        {/* === TEMBUSAN === */}
        {form.tembusan.trim() && (
          <div className="tembusan-block mt-6 text-[11pt]">
            <p className="font-bold">Tembusan Yth :</p>
            <p className="whitespace-pre-line">{form.tembusan}</p>
          </div>
        )}
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
            border: none !important;
            border-radius: 0 !important;
            width: 210mm !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .ttd-block, .tembusan-block {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
        @page {
          size: A4;
          margin: 15mm 20mm;
        }
      `}</style>
    </Layout>
  )
}
