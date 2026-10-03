import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Printer, ArrowLeft, Mail } from 'lucide-react'
import Layout from '../components/Layout'
import KopSurat from '../components/KopSurat'

const LOGO_BUCKET = 'profil-kantor'
const BUCKET_POLRES = 'profil-polres'

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
// Setiap preset boleh memuat (opsional):
//   tujuan(ctx), kotaTujuan(ctx), kode  → khusus Polres, tidak dipakai tenant lain.
// ctx = { kantor, bulan, tahun, polda, kabupaten, kota }
// Kode klasifikasi arsip sengaja dikosongkan di preset Reskrim; isi sesuai
// tata naskah dinas / jadwal retensi arsip Polres Anda.
// Tanda "........" adalah isian yang harus dilengkapi sebelum dicetak.
const tujuanKapolda = ({ polda }) =>
  polda ? `Kepala Kepolisian Daerah ${polda}` : 'Kepala Kepolisian Daerah'
const tujuanKejari = ({ kabupaten }) =>
  `Kepala Kejaksaan Negeri${kabupaten ? ` ${kabupaten}` : ''}`
const diKota = ({ kota }) => (kota ? `di ${kota}` : '')

const PRESET_POLRES = {
  hadir: {
    label: 'Pengantar Daftar Hadir Personel',
    klasifikasi: 'KEP.',
    sifat: 'Biasa',
    lampiran: '1 (satu) berkas',
    perihal: ({ bulan, tahun }) => `Daftar hadir personel\nBulan ${bulan} ${tahun}`,
    cq: 'Karo SDM',
    tujuan: tujuanKapolda,
    kotaTujuan: () => '',
    kode: '',
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
    tujuan: tujuanKapolda,
    kotaTujuan: () => '',
    kode: '',
    isi: ({ kantor, bulan, tahun }) =>
      `Bersama ini kami sampaikan dengan hormat dokumen arsip Bulan ${bulan} tahun ${tahun} pada **${kantor}** sebagaimana perihal di atas, guna menjadi bahan/data untuk diproses selanjutnya.`,
  },
  // ── Bagian Reskrim ──
  reskrim_berkas: {
    label: 'Reskrim — Pengantar Pengiriman Berkas Perkara',
    klasifikasi: '',
    sifat: 'Biasa',
    lampiran: '1 (satu) berkas',
    perihal: () => 'Pengiriman berkas perkara\na.n. tersangka ........',
    cq: 'Kepala Seksi Tindak Pidana Umum',
    tujuan: tujuanKejari,
    kotaTujuan: diKota,
    kode: 'Reskrim',
    isi: () =>
      `Rujukan: Laporan Polisi Nomor: ........ tanggal ........ tentang dugaan tindak pidana ........\n\nBersama ini kami kirimkan berkas perkara atas nama tersangka **........** beserta kelengkapannya, guna dilakukan penelitian dan proses selanjutnya sesuai ketentuan yang berlaku.`,
  },
  reskrim_spdp: {
    label: 'Reskrim — Pengantar SPDP',
    klasifikasi: '',
    sifat: 'Biasa',
    lampiran: '1 (satu) lembar',
    perihal: () => 'Pemberitahuan dimulainya penyidikan\n(SPDP)',
    cq: 'Kepala Seksi Tindak Pidana Umum',
    tujuan: tujuanKejari,
    kotaTujuan: diKota,
    kode: 'Reskrim',
    isi: () =>
      `Rujukan: Laporan Polisi Nomor: ........ tanggal ........ dan Surat Perintah Penyidikan Nomor: ........ tanggal ........\n\nBersama ini kami sampaikan **Surat Pemberitahuan Dimulainya Penyidikan (SPDP)** atas dugaan tindak pidana ........ yang terjadi pada ........ di ........, dengan terlapor/tersangka ........ , untuk menjadi maklum.`,
  },
  reskrim_bantuan: {
    label: 'Reskrim — Pengantar Permintaan Bantuan/Data',
    klasifikasi: '',
    sifat: 'Biasa',
    lampiran: '-',
    perihal: () => 'Permintaan bantuan ........',
    cq: '',
    tujuan: () => '........',
    kotaTujuan: () => '',
    kode: 'Reskrim',
    isi: () =>
      `Rujukan: Laporan Polisi Nomor: ........ tanggal ........\n\nSehubungan dengan penanganan perkara tersebut, dengan hormat kami mohon bantuan ........ untuk kepentingan penyidikan.`,
  },
  kustom: {
    label: 'Surat Pengantar Lainnya (isi sendiri)',
    klasifikasi: '', sifat: 'Biasa', lampiran: '-',
    perihal: () => '', cq: '', isi: () => '',
    tujuan: tujuanKapolda,
    kotaTujuan: () => '',
  },
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500'
const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

const barisPangkatNrp = (pangkat, nrp) =>
  `${pangkat ? pangkat + ' ' : ''}NRP ${nrp || '..............................'}`

export default function SuratPengantar() {
  const navigate = useNavigate()
  // isPolres disediakan AuthContext (dipakai juga oleh SampulLaporan.jsx).
  const { sekolahId, isPolres } = useAuth()
  const PRESET = isPolres ? PRESET_POLRES : PRESET_KUA

  const [profil, setProfil] = useState(null)

  const hariIni = new Date()
  const [jenis, setJenis] = useState('hadir')
  const [bulan, setBulan] = useState(hariIni.getMonth() + 1)
  const [tahun, setTahun] = useState(hariIni.getFullYear())

  // Khusus Polres: siapa yang menandatangani
  const [penandatangan, setPenandatangan] = useState('kapolres') // 'kapolres' | 'arsip' | 'manual'
  const [ttdManual, setTtdManual] = useState({ jabatan: '', nama: '', pangkat: '', nrp: '' })
  const ubahTtdManual = (key) => (e) => setTtdManual((t) => ({ ...t, [key]: e.target.value }))

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
          .select(
            'nama_satuan, polda, kabupaten_kota, kapolres, pangkat_kapolres, nrp_kapolres, tempat_ttd, ttd_kapolres_path, jabatan_pejabat_arsip, pejabat_arsip, pangkat_pejabat_arsip, nrp_pejabat_arsip'
          )
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
  const namaKabPolres = (profil?.kabupaten_kota || '').replace(/^(kabupaten|kota)\s+/i, '').trim()
  const tempatTtd = profil?.tempat_ttd || profil?.kabupaten_kota || ''

  // Jenis tenant berubah → reset jenis surat & kode kantor default
  useEffect(() => {
    setJenis('hadir')
    setForm((f) => ({ ...f, kodeKantor: isPolres ? '' : 'KUA.25.06.07', kotaTujuan: isPolres ? '' : 'Dobo' }))
  }, [isPolres])

  // Polres: kode satuan mengikuti jenis surat bila preset menentukannya (mis. Reskrim)
  useEffect(() => {
    if (!isPolres) return
    const p = PRESET_POLRES[jenis]
    if (p && p.kode !== undefined) setForm((f) => ({ ...f, kodeKantor: p.kode }))
  }, [jenis, isPolres])

  // Isi otomatis saat jenis surat / bulan / tahun / profil berubah
  useEffect(() => {
    const p = PRESET[jenis] || PRESET.kustom
    const ctx = {
      kantor: namaKantor,
      bulan: NAMA_BULAN[bulan - 1],
      tahun,
      polda: namaPolda,
      kabupaten: namaKabPolres,
      kota: tempatTtd,
    }
    setForm((f) => ({
      ...f,
      klasifikasi: p.klasifikasi,
      sifat: p.sifat,
      lampiran: p.lampiran,
      perihal: p.perihal(ctx),
      cq: p.cq,
      isi: p.isi(ctx),
      tujuan: isPolres
        ? (p.tujuan ? p.tujuan(ctx) : tujuanKapolda(ctx))
        : `Kepala Kantor Kementerian Agama Kabupaten ${namaKabupaten}`,
      ...(isPolres && p.kotaTujuan ? { kotaTujuan: p.kotaTujuan(ctx) } : {}),
      tembusan: !isPolres && namaKabupaten
        ? `Kepala Kantor Kementerian Agama\nKabupaten ${namaKabupaten}`
        : isPolres ? '' : f.tembusan,
    }))
  }, [jenis, bulan, tahun, namaKantor, namaKabupaten, namaPolda, namaKabPolres, tempatTtd, isPolres]) // eslint-disable-line

  useEffect(() => {
    setForm((f) => ({ ...f, tanggal: tanggalAkhirBulan(tahun, bulan) }))
  }, [bulan, tahun])

  // URL tanda tangan: bucket dan kolom berbeda per tenant.
  // Polres: gambar tanda tangan hanya untuk Kapolres.
  const ttdUrl = isPolres
    ? (penandatangan === 'kapolres' && profil?.ttd_kapolres_path
        ? supabase.storage.from(BUCKET_POLRES).getPublicUrl(profil.ttd_kapolres_path).data.publicUrl
        : null)
    : (profil?.ttd_kepala_kua_path
        ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profil.ttd_kepala_kua_path).data.publicUrl
        : null)

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
  let ttd
  if (!isPolres) {
    ttd = {
      jabatan: 'Kepala',
      nama: profil?.kepala_kua || '..............................',
      baris: `NIP. ${profil?.nip_kepala_kua || '..............................'}`,
    }
  } else if (penandatangan === 'arsip') {
    ttd = {
      jabatan: profil?.jabatan_pejabat_arsip || '..............................',
      nama: profil?.pejabat_arsip || '..............................',
      baris: barisPangkatNrp(profil?.pangkat_pejabat_arsip, profil?.nrp_pejabat_arsip),
    }
  } else if (penandatangan === 'manual') {
    ttd = {
      jabatan: ttdManual.jabatan || '..............................',
      nama: ttdManual.nama || '..............................',
      baris: barisPangkatNrp(ttdManual.pangkat, ttdManual.nrp),
    }
  } else {
    ttd = {
      jabatan: `Kapolres ${(profil?.nama_satuan || '').replace(/^(polres|resor)\s+/i, '')}`.trim(),
      nama: profil?.kapolres || '..............................',
      baris: barisPangkatNrp(profil?.pangkat_kapolres, profil?.nrp_kapolres),
    }
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
            <label className={labelCls}>{isPolres ? 'Kode satuan (mis. Reskrim, Bag Min)' : 'Kode kantor'}</label>
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
            <textarea rows={6} className={inputCls} value={form.isi} onChange={ubah('isi')} />
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

        {/* Penandatangan — khusus Polres */}
        {isPolres && (
          <div className="border-t border-slate-100 pt-3 mb-3">
            <label className={labelCls}>Penandatangan</label>
            <select
              className={inputCls}
              value={penandatangan}
              onChange={(e) => setPenandatangan(e.target.value)}
            >
              <option value="kapolres">Kapolres (dari Profil Polres, dengan gambar tanda tangan)</option>
              <option value="arsip">Pejabat pengesah arsip (dari Profil Polres)</option>
              <option value="manual">Isi manual (mis. a.n. Kapolres, Kasat Reskrim)</option>
            </select>

            {penandatangan === 'manual' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Jabatan (Enter untuk baris baru)</label>
                  <textarea
                    rows={2}
                    className={inputCls}
                    placeholder={'mis.\nA.n. KEPALA KEPOLISIAN RESOR ........\nKEPALA SATUAN RESKRIM'}
                    value={ttdManual.jabatan}
                    onChange={ubahTtdManual('jabatan')}
                  />
                </div>
                <div>
                  <label className={labelCls}>Nama</label>
                  <input className={inputCls} value={ttdManual.nama} onChange={ubahTtdManual('nama')} />
                </div>
                <div>
                  <label className={labelCls}>Pangkat</label>
                  <input className={inputCls} value={ttdManual.pangkat} onChange={ubahTtdManual('pangkat')} />
                </div>
                <div>
                  <label className={labelCls}>NRP</label>
                  <input className={inputCls} value={ttdManual.nrp} onChange={ubahTtdManual('nrp')} />
                </div>
              </div>
            )}
          </div>
        )}

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
          <p className="font-bold uppercase whitespace-pre-line">{ttd.jabatan}</p>
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
