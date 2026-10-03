import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Printer, ArrowLeft, Mail } from 'lucide-react'
import Layout from '../components/Layout'
import KopSurat from '../components/KopSurat'

const LOGO_BUCKET = 'profil-kantor'

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

function formatTanggalIndonesia(date) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function tanggalAkhirBulan(tahun, bulan) {
  const d = new Date(tahun, bulan, 0)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function renderTebal(teks) {
  return teks.split('**').map((bagian, i) =>
    i % 2 === 1 ? <strong key={i}>{bagian}</strong> : <span key={i}>{bagian}</span>
  )
}

const PENUTUP_DEFAULT =
  'Demikian yang dapat kami sampaikan untuk diketahui dan ditindaklanjuti, sebelumnya kami sampaikan terima kasih.'

// ───────────────────────── PRESET KUA ─────────────────────────
const PRESET_KUA = {
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
    klasifikasi: '', sifat: '-', lampiran: '-',
    perihal: () => '', cq: '', isi: () => '',
  },
}

// ───────────────────────── PRESET POLRES ─────────────────────────
// Silakan ubah klasifikasi / redaksi sesuai tata naskah Polres.
const PRESET_POLRES = {
  hadir: {
    label: 'Pengantar Daftar Hadir Personel',
    klasifikasi: 'KEP.',
    sifat: 'Biasa',
    lampiran: '1 (satu) berkas',
    perihal: ({ bulan, tahun }) => `Daftar hadir personel\nBulan ${bulan} ${tahun}`,
    cq: 'Karo SDM',
    isi: ({ kantor, bulan, tahun }) =>
      `Bersama ini kami sampaikan dengan hormat **Daftar Hadir Personel** Bulan ${bulan} tahun ${tahun} pada **${kantor}** sebagaimana perihal di atas, guna menjadi bahan/data untuk diproses selanjutnya.`,
  },
  arsip: {
    label: 'Pengantar Dokumen Arsip',
    klasifikasi: 'ARS.',
    sifat: 'Biasa',
    lampiran: '1 (satu) berkas',
    perihal: ({ bulan, tahun }) => `Penyampaian dokumen arsip\nBulan ${bulan} ${tahun}`,
    cq: '',
    isi: ({ kantor, bulan, tahun }) =>
      `Bersama ini kami sampaikan dengan hormat dokumen arsip Bulan ${bulan} tahun ${tahun} pada **${kantor}** sebagaimana perihal di atas, guna menjadi bahan/data untuk diproses selanjutnya.`,
  },
  kustom: {
    label: 'Surat Pengantar Lainnya (isi sendiri)',
    klasifikasi: '', sifat: 'Biasa', lampiran: '-',
    perihal: () => '', cq: '', isi: () => '',
  },
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500'
const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

export default function SuratPengantar() {
  const navigate = useNavigate()
  // CEK: sesuaikan nama field jenis tenant di AuthContext
  const { sekolahId, jenisOrganisasi } = useAuth()
  const isPolres = jenisOrganisasi === 'polres'
  const PRESET = isPolres ? PRESET_POLRES : PRESET_KUA

  const [profil, setProfil] = useState(null)

  const hariIni = new Date()
  const [jenis, setJenis] = useState('hadir')
  const [bulan, setBulan] = useState(hariIni.getMonth() + 1)
  const [tahun, setTahun] = useState(hariIni.getFullYear())

  const [form, setForm] = useState({
    urut: '',
    kodeKantor: '',
    klasifikasi: '',
    tanggal: hariIni.toISOString().slice(0, 10),
    sifat: '-',
    lampiran: '1 (satu)',
    perihal: '',
    tujuan: '',
    kotaTujuan: '',
    cq: '',
    isi: '',
    penutup: PENUTUP_DEFAULT,
    tembusan: '',
  })

  const ubah = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  // Muat profil sesuai tenant
  useEffect(() => {
    if (!sekolahId) {
      setProfil(null)
      return
    }
    const query = isPolres
      ? supabase
          .from('profil_polres')
          .select('nama_satuan, polda, kabupaten_kota, kapolres, pangkat_kapolres, nrp_kapolres, tempat_ttd')
      : supabase
          .from('profil_kantor')
          .select('nama_kantor, kabupaten, kecamatan, kepala_kua, nip_kepala_kua, ttd_kepala_kua_path')
    query
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data }) => setProfil(data))
  }, [sekolahId, isPolres])

  // Nilai turunan per tenant
  const namaKabupaten = isPolres
    ? ''
    : (profil?.kabupaten || '').replace(/^kabupaten\s+/i, '').trim()
  const namaKantor = isPolres
    ? profil?.nama_satuan || 'Kepolisian Resor'
    : profil?.nama_kantor || 'Kantor Urusan Agama'
  const namaPolda = (profil?.polda || '').replace(/^polda\s+/i, '').trim()
  const tempatTtd = profil?.tempat_ttd || profil?.kabupaten_kota || ''

  // Jenis tenant berubah → reset jenis surat & kode kantor default
  useEffect(() => {
    setJenis('hadir')
    setForm((f) => ({ ...f, kodeKantor: isPolres ? '' : 'KUA.25.06.07', kotaTujuan: isPolres ? '' : 'Dobo' }))
  }, [isPolres])

  // Isi otomatis saat jenis surat / bulan / tahun / profil berubah
  useEffect(() => {
    const p = PRESET[jenis] || PRESET.kustom
    const ctx = { kantor: namaKantor, bulan: NAMA_BULAN[bulan - 1], tahun }
    setForm((f) => ({
      ...f,
      klasifikasi: p.klasifikasi,
      sifat: p.sifat,
      lampiran: p.lampiran,
      perihal: p.perihal(ctx),
      cq: p.cq,
      isi: p.isi(ctx),
      tujuan: isPolres
        ? (namaPolda ? `Kepala Kepolisian Daerah ${namaPolda}` : 'Kepala Kepolisian Daerah')
        : `Kepala Kantor Kementerian Agama Kabupaten ${namaKabupaten}`,
      tembusan: !isPolres && namaKabupaten
        ? `Kepala Kantor Kementerian Agama\nKabupaten ${namaKabupaten}`
        : isPolres ? '' : f.tembusan,
    }))
  }, [jenis, bulan, tahun, namaKantor, namaKabupaten, namaPolda, isPolres]) // eslint-disable-line

  useEffect(() => {
    setForm((f) => ({ ...f, tanggal: tanggalAkhirBulan(tahun, bulan) }))
  }, [bulan, tahun])

  const ttdUrl = !isPolres && profil?.ttd_kepala_kua_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profil.ttd_kepala_kua_path).data.publicUrl
    : null

  // Nomor surat per tenant
  const nomorSurat = isPolres
    ? ['B', form.urut || '...', ROMAWI[bulan - 1], form.klasifikasi, tahun, form.kodeKantor]
        .filter((x) => x !== '' && x != null)
        .join('/')
    : `B-${form.urut || '...'}/${form.kodeKantor}${form.klasifikasi ? `/${form.klasifikasi}` : ''}/${bulan}/${tahun}`

  const tanggalFormat = form.tanggal ? formatTanggalIndonesia(new Date(form.tanggal + 'T00:00:00')) : ''
  const tanggalSurat = isPolres && tempatTtd ? `${tempatTtd}, ${tanggalFormat}` : tanggalFormat
  const paragrafIsi = form.isi.split(/\n\s*\n/).filter((p) => p.trim())

  // Blok tanda tangan per tenant
  const ttd = isPolres
    ? {
        jabatan: `Kapolres ${(profil?.nama_satuan || '').replace(/^polres\s+/i, '')}`.trim(),
        nama: profil?.kapolres || '..............................',
        baris: `${profil?.pangkat_kapolres ? profil.pangkat_kapolres + ' ' : ''}NRP ${profil?.nrp_kapolres || '..............................'}`,
      }
    : {
        jabatan: 'Kepala',
        nama: profil?.kepala_kua || '..............................',
        baris: `NIP. ${profil?.nip_kepala_kua || '..............................'}`,
      }

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

      {/* === FORM ISIAN === */}
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
            <label className={labelCls}>{isPolres ? 'Kode satuan (mis. Bag Min)' : 'Kode kantor'}</label>
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
          <div className="sm:col-span-2">
            <label className={labelCls}>Yth. (tujuan surat)</label>
            <input className={inputCls} value={form.tujuan} onChange={ubah('tujuan')} />
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
          Mengganti jenis surat, bulan, atau tahun akan mengisi ulang perihal, tujuan, isi, dan tembusan.
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
        <KopSurat />

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

        <div className="mt-5">
          <p>Yth.</p>
          <p>{form.tujuan}</p>
          {form.cq && <p>Cq. {form.cq}</p>}
          {form.kotaTujuan && <p>{form.kotaTujuan}</p>}
        </div>

        <div className="mt-5 space-y-3 text-justify leading-relaxed">
          {!isPolres && <p>Assalamu’alaikum Wr. Wb.</p>}
          {paragrafIsi.map((p, i) => (
            <p key={i} className="whitespace-pre-line" style={{ textIndent: '10mm' }}>
              {renderTebal(p)}
            </p>
          ))}
          {form.penutup && <p style={{ textIndent: '10mm' }}>{form.penutup}</p>}
          {!isPolres && <p>Wassalamu’alaikum Wr. Wb.</p>}
        </div>

        {/* === TANDA TANGAN === */}
        <div className="ttd-block mt-6 ml-auto text-center" style={{ width: '70mm' }}>
          <p className="font-bold uppercase">{ttd.jabatan}</p>
          <div className="h-20 flex items-center justify-center">
            {ttdUrl && (
              <img src={ttdUrl} alt="Tanda Tangan" className="max-h-20 object-contain" />
            )}
          </div>
          <p className="font-bold uppercase underline">{ttd.nama}</p>
          <p>{ttd.baris}</p>
        </div>

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
          .lembar-cetak.print-only { display: block !important; }
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
        @page { size: A4; margin: 15mm 20mm; }
      `}</style>
    </Layout>
  )
}
