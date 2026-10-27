import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Save, Plus, Trash2, RotateCcw, FolderOpen } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

// ───────────────────────── Data contoh (dari berkas PANITIA PEMBANGUNAN MASJID JABAL NUR)
const CONTOH = {
  // Kop & surat
  panitia: 'PANITIA PEMBANGUNAN MASJID JABAL NUR DUSUN PAKARENA',
  wilayah: 'DESA KAIRATU KECAMATAN KAIRATU KABUPATEN SERAM BAGIAN BARAT',
  nomor: '02/PAN-JN/IV/2024',
  lampiran: '1 (Satu) Rangkap',
  hal: 'Permohonan Bantuan',
  kepada: 'Gubernur Maluku\nCq. Sekretaris Daerah Maluku\ndi-\nAmbon',
  isiSurat:
    'Teriring rasa syukur kita panjatkan kehadirat Allah SWT atas limpahan rahmat dan karunia-Nya. Sholawat serta salam selalu tercurahkan kepada suri tauladan kita Nabi Muhammad SAW sebagai pemimpin umat yang sejati.\n\nKami panitia pembangunan Masjid Jabal Nur Dusun Pakarena Desa Kairatu dengan ini mengajukan permohonan bantuan dana kepada Bapak Gubernur Maluku agar dapat membantu kami demi terlaksananya pembangunan Masjid dimaksud.\n\nDemikian surat permohonan bantuan dana ini kami sampaikan. Atas perhatian dan partisipasinya kami ucapkan terima kasih.',
  salamBuka: "Assalamu'alaikum warahmatullahi wabarakatuh",
  salamTutup: "Wassalamu'alaikum warahmatullahi wabarakatuh",
  ttdOrg: 'PANITIA PEMBANGUNAN MASJID JABAL NUR',
  tempat: 'Pakarena',
  tglSurat: '12 April 2023',
  tglProposal: '27 Juli 2024',
  // Tanda tangan
  jabatan1: 'Ketua',
  nama1: '',
  jabatan2: 'Sekretaris',
  nama2: '',
  mengetahuiJabatan: 'Kepala Dusun Pakarena',
  mengetahuiNama: '',
  tebusan: 'Gubernur Provinsi Maluku di Ambon\nSekretaris Daerah Provinsi Maluku di Ambon',
  // Proposal
  dasar:
    'Generasi muda sebagai penerus cita-cita luhur Islam, bangsa, dan negara dituntut untuk lebih baik dari generasi sekarang. Karena itu pembinaan dan pengembangan segala potensi dirinya harus diusahakan sedini mungkin, secara kontinu dan terarah, sehingga menghasilkan kader-kader yang mampu meneruskan estafet perjuangan agama, bangsa, dan negara sebagaimana kita harapkan.\n\nMengingat dan memperhatikan gejolak generasi muda sekarang yang semakin mengarah pada hal-hal negatif, perlu adanya upaya pembinaan mental spiritual serta pelatihan keterampilan mereka.\n\nMasjid Jabal Nur sebagai sarana ibadah umat Islam di Dusun Pakarena memiliki andil dan peran aktif dalam membina kader Islam. Untuk mengoperasionalkan pembinaan tersebut dibutuhkan sarana dan prasarana yang representatif, sedangkan kondisi Masjid Jabal Nur saat ini belum selesai pembangunannya.\n\nOleh karena itu, kami sebagai panitia memberanikan diri mengetuk pintu hati Bapak Gubernur agar dapat berpartisipasi membantu kami menyelesaikan pembangunan Masjid Jabal Nur.',
  tujuanPengantar: 'Adapun tujuan kegiatan pembangunan Masjid Jabal Nur Dusun Pakarena adalah sebagai berikut:',
  tujuan:
    'Melaksanakan pembangunan di bidang keagamaan.\nAgar masyarakat dapat melaksanakan kegiatan ibadah dengan baik dan nyaman.\nMenyiapkan sarana penguatan iman, agar masyarakat dapat membentuk kepribadian yang Islami dan bertakwa.',
  rencana:
    'Kegiatan renovasi atap Masjid Jabal Nur Dusun Pakarena Desa Kairatu Kecamatan Kairatu direncanakan berjalan pada bulan Maret tahun 2024.',
  anggaranPengantar: 'Renovasi atap Masjid Jabal Nur Dusun Pakarena membutuhkan biaya sebesar',
  anggaranPenutup: 'Dan estimasi anggarannya sebagaimana terlampir.',
  bank: '',
  noRek: '',
  atasNamaRek: '',
  rekPengantar: 'Bantuan dapat disalurkan melalui rekening berikut:',
  penutup:
    'Demikian proposal ini kami buat dan harapan kami kiranya Bapak dapat mempertimbangkannya. Atas bantuan dan kerja samanya yang baik, kami ucapkan terima kasih.',
  // RAB
  rabJudul: 'RENCANA ANGGARAN PEMBANGUNAN MASJID JABAL NUR',
  rabWilayah: 'DUSUN PAKARENA DESA KAIRATU KECAMATAN KAIRATU\nKABUPATEN SERAM BAGIAN BARAT',
  rab: [
    {
      judul: 'ATAP MASJID LUAR',
      items: [
        { nama: 'Spandek 0,40', qty: 300, satuan: 'Lembar', harga: 350000 },
        { nama: 'Tukang', qty: 1, satuan: 'Borongan', harga: 3000000 },
        { nama: 'Sewa mobil', qty: 1, satuan: 'Mobil truk', harga: 1500000 },
        { nama: 'Paku seng', qty: 10, satuan: 'Kilo', harga: 50000 },
        { nama: 'Bung-bungan', qty: 50, satuan: 'Meter', harga: 120000 },
      ],
    },
  ],
  // SK panitia
  sertakanSK: true,
  skInstansi: 'PEMERINTAH KABUPATEN SERAM BAGIAN BARAT\nKECAMATAN KAIRATU DESA KAIRATU\nDUSUN PAKARENA',
  skJudul: 'SURAT KEPUTUSAN KEPALA DUSUN PAKARENA',
  skNomor: '01/DP-DK/IV/2023',
  skTentang:
    'PEMBENTUKAN PANITIA PEMBANGUNAN MASJID JABAL NUR DUSUN PAKARENA DESA KAIRATU KECAMATAN KAIRATU KABUPATEN SERAM BAGIAN BARAT',
  skMenimbang:
    'Bahwa sesuai hasil keputusan rapat staf Dusun dengan tokoh masyarakat tanggal 02 April 2023 perlu dibentuk panitia pembangunan Masjid Jabal Nur Dusun Pakarena.\nBahwa untuk kepentingan sebagaimana poin (a) tersebut perlu ditetapkan dengan Surat Keputusan Kepala Dusun.\nHasil rapat panitia pembangunan Masjid Jabal Nur Dusun Pakarena.',
  skMengingat: 'Peraturan Pemerintah Nomor 72 dan 73 Tahun 2005 tentang Desa/Kelurahan.\nUndang-Undang Nomor 6 Tahun 2014 tentang Desa.',
  skMemutuskan:
    'Mengangkat panitia pembangunan Masjid Jabal Nur Dusun Pakarena.\nPanitia sebagaimana butir pertama di atas berfungsi sebagai pelaksana kegiatan pembangunan Masjid Jabal Nur Dusun Pakarena.\nSurat Keputusan ini berlaku sejak tanggal ditetapkan dan akan ditinjau kembali sebagaimana mestinya.',
  skTempat: 'Pakarena',
  skTanggal: '02 April 2023',
  skJabatan: 'Kepala Dusun Pakarena',
  skPejabat: '',
  // Susunan panitia
  pelindung: '',
  inti: [
    { jabatan: 'Ketua', nama: '' },
    { jabatan: 'Sekretaris', nama: '' },
    { jabatan: 'Bendahara', nama: '' },
  ],
  seksi: [
    {
      nama: 'Seksi Usaha Dana',
      ketua: '',
      anggota: '',
    },
    {
      nama: 'Seksi Humas',
      ketua: '',
      anggota: '',
    },
    {
      nama: 'Seksi Perlengkapan',
      ketua: '',
      anggota: '',
    },
    {
      nama: 'Seksi Petukangan',
      ketua: '',
      anggota: '',
    },
  ],
}

// ───────────────────────── Helper
const SATUAN = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']
function terbilang(n) {
  n = Math.floor(Number(n) || 0)
  if (n < 12) return SATUAN[n]
  if (n < 20) return terbilang(n - 10) + ' belas'
  if (n < 100) return terbilang(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + terbilang(n % 10) : '')
  if (n < 200) return 'seratus' + (n > 100 ? ' ' + terbilang(n - 100) : '')
  if (n < 1000) return terbilang(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + terbilang(n % 100) : '')
  if (n < 2000) return 'seribu' + (n > 1000 ? ' ' + terbilang(n - 1000) : '')
  if (n < 1e6) return terbilang(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + terbilang(n % 1000) : '')
  if (n < 1e9) return terbilang(Math.floor(n / 1e6)) + ' juta' + (n % 1e6 ? ' ' + terbilang(n % 1e6) : '')
  if (n < 1e12) return terbilang(Math.floor(n / 1e9)) + ' miliar' + (n % 1e9 ? ' ' + terbilang(n % 1e9) : '')
  return String(n)
}
const rp = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID')
const baris = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean)
const paragraf = (s) => (s || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)
const huruf = (i) => String.fromCharCode(97 + i)
const URUTAN = ['Pertama', 'Kedua', 'Ketiga', 'Keempat', 'Kelima', 'Keenam']
const kloning = (o) => JSON.parse(JSON.stringify(o))

// Judul halaman per jenis proposal (jenis = kunci di proposal_template & proposal_dokumen).
const JUDUL = {
  pembangunan: 'Proposal Bantuan Pembangunan / Renovasi',
  'sarana-sekolah': 'Proposal Pengadaan Sarana & Prasarana Sekolah',
  'rehab-kelas': 'Proposal Rehabilitasi Ruang Kelas / Toilet',
  taman: 'Proposal Penataan Lingkungan & Taman',
}

// Isian dasar tiap jenis. Jenis 'pembangunan' memakai CONTOH (Masjid Jabal Nur);
// jenis lain memakai versi kosong supaya teks masjid tidak ikut terbawa.
function dasarJenis(jenis) {
  const b = kloning(CONTOH)
  if (jenis === 'pembangunan') return b
  Object.keys(b).forEach((k) => {
    if (typeof b[k] === 'string') b[k] = ''
  })
  b.sertakanSK = true
  b.jabatan1 = 'Ketua'
  b.jabatan2 = 'Sekretaris'
  b.lampiran = '1 (Satu) Berkas'
  b.salamBuka = 'Dengan hormat,'
  b.rekPengantar = 'Bantuan dapat disalurkan melalui rekening berikut:'
  b.rab = [{ judul: '', items: [{ nama: '', qty: 1, satuan: '', harga: 0 }] }]
  b.inti = [
    { jabatan: 'Ketua', nama: '' },
    { jabatan: 'Sekretaris', nama: '' },
    { jabatan: 'Bendahara', nama: '' },
  ]
  b.seksi = [{ nama: '', ketua: '', anggota: '' }]
  return b
}

// ───────────────────────── Komponen kecil form
const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500'

function Field({ label, children, hint }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  )
}
function Teks({ label, value, onChange, hint }) {
  return (
    <Field label={label} hint={hint}>
      <input className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}
function Area({ label, value, onChange, rows = 4, hint }) {
  return (
    <Field label={label} hint={hint}>
      <textarea className={inputCls} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

// ───────────────────────── Halaman
export default function ProposalPembangunan({ jenis = 'pembangunan' }) {
  const navigate = useNavigate()
  const { sekolahId, session } = useAuth()
  const [d, setD] = useState(() => dasarJenis(jenis))
  const [tab, setTab] = useState('surat')
  const [docId, setDocId] = useState(null)
  const [riwayat, setRiwayat] = useState([])
  const [pesan, setPesan] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  // Template awal dari database (tabel proposal_template, diisi lewat SQL).
  // Dipakai untuk sekolah yang belum punya proposal sendiri; kalau tabelnya
  // belum ada / kosong, otomatis memakai isian dasar di atas.
  const [templ, setTempl] = useState(null)
  const sudahDiedit = useRef(false)
  useEffect(() => {
    supabase
      .from('proposal_template')
      .select('data')
      .eq('jenis', jenis)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.data) return
        setTempl(data.data)
        if (!sudahDiedit.current) setD({ ...dasarJenis(jenis), ...data.data })
      })
  }, [jenis])

  const set = (k, v) => {
    sudahDiedit.current = true
    setD((p) => ({ ...p, [k]: v }))
  }

  const total = useMemo(
    () => d.rab.reduce((a, s) => a + s.items.reduce((b, it) => b + (Number(it.qty) || 0) * (Number(it.harga) || 0), 0), 0),
    [d.rab]
  )

  // ── Simpan / muat (tabel proposal_dokumen, lihat proposal_dokumen.sql)
  async function muatRiwayat() {
    const { data } = await supabase
      .from('proposal_dokumen')
      .select('id, judul, updated_at')
      .eq('jenis', jenis)
      .eq('sekolah_id', sekolahId)
      .order('updated_at', { ascending: false })
    setRiwayat(data || [])
  }
  useEffect(() => {
    if (sekolahId) muatRiwayat()
  }, [sekolahId, jenis])

  async function simpan() {
    if (!sekolahId) return setPesan('Sekolah belum terdeteksi. Muat ulang halaman.')
    setMenyimpan(true)
    setPesan('')
    const judul = d.panitia || JUDUL[jenis] || 'Proposal Pembangunan'
    const payload = { jenis, judul, data: d, updated_at: new Date().toISOString() }
    let res
    if (docId) {
      res = await supabase.from('proposal_dokumen').update(payload).eq('id', docId).eq('sekolah_id', sekolahId).select('id').single()
    } else {
      res = await supabase
        .from('proposal_dokumen')
        .insert({ ...payload, sekolah_id: sekolahId })
        .select('id')
        .single()
    }
    if (res.error) setPesan('Gagal menyimpan: ' + res.error.message)
    else {
      setDocId(res.data.id)
      setPesan('Tersimpan.')
      muatRiwayat()
    }
    setMenyimpan(false)
  }
  async function buka(id) {
    const { data, error } = await supabase.from('proposal_dokumen').select('id, data').eq('id', id).eq('sekolah_id', sekolahId).single()
    if (error) return setPesan('Gagal membuka: ' + error.message)
    sudahDiedit.current = true
    setD({ ...dasarJenis(jenis), ...data.data })
    setDocId(data.id)
    setPesan('Dokumen dibuka.')
  }
  async function hapus(id) {
    if (!window.confirm('Hapus proposal tersimpan ini?')) return
    await supabase.from('proposal_dokumen').delete().eq('id', id).eq('sekolah_id', sekolahId)
    if (id === docId) setDocId(null)
    muatRiwayat()
  }
  function baru() {
    if (!window.confirm('Kosongkan semua isian dan mulai proposal baru?')) return
    const kosong = kloning(CONTOH)
    Object.keys(kosong).forEach((k) => {
      if (typeof kosong[k] === 'string') kosong[k] = ''
    })
    kosong.sertakanSK = true
    kosong.rab = [{ judul: '', items: [{ nama: '', qty: 1, satuan: '', harga: 0 }] }]
    kosong.inti = [
      { jabatan: 'Ketua', nama: '' },
      { jabatan: 'Sekretaris', nama: '' },
      { jabatan: 'Bendahara', nama: '' },
    ]
    kosong.seksi = [{ nama: '', ketua: '', anggota: '' }]
    kosong.jabatan1 = 'Ketua'
    kosong.jabatan2 = 'Sekretaris'
    setD(kosong)
    setDocId(null)
  }
  function contoh() {
    setD({ ...dasarJenis(jenis), ...(templ || {}) })
    setDocId(null)
  }

  // ── Editor RAB
  const ubahSeksiRab = (i, k, v) => set('rab', d.rab.map((s, x) => (x === i ? { ...s, [k]: v } : s)))
  const ubahItem = (i, j, k, v) =>
    set(
      'rab',
      d.rab.map((s, x) => (x === i ? { ...s, items: s.items.map((it, y) => (y === j ? { ...it, [k]: v } : it)) } : s))
    )
  const tambahItem = (i) =>
    set('rab', d.rab.map((s, x) => (x === i ? { ...s, items: [...s.items, { nama: '', qty: 1, satuan: '', harga: 0 }] } : s)))
  const hapusItem = (i, j) =>
    set('rab', d.rab.map((s, x) => (x === i ? { ...s, items: s.items.filter((_, y) => y !== j) } : s)))

  const TABS = [
    ['surat', 'Surat'],
    ['isi', 'Isi Proposal'],
    ['rab', 'Anggaran'],
    ['panitia', 'Panitia & SK'],
  ]

  return (
    <div className="p-3 md:p-6 max-w-[1500px] mx-auto">
      {/* Gaya cetak: hanya #area-cetak yang tampil, tiap .halaman = 1 lembar A4 */}
      <style>{`
        .kertas { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.5; color: #000; text-align: justify; }
        .kertas .halaman { background:#fff; width:210mm; max-width:100%; min-height:297mm; padding:18mm 20mm; margin:0 auto 14px; box-shadow:0 1px 6px rgba(0,0,0,.18); box-sizing:border-box; }
        .kertas h4, .kertas p { margin:0; }
        .kertas .c { text-align:center; }
        .kertas table.rab { width:100%; border-collapse:collapse; font-size:11pt; }
        .kertas table.rab th, .kertas table.rab td { border:1px solid #000; padding:3px 6px; vertical-align:top; }
        .kertas .r { text-align:right; white-space:nowrap; }
        @media print {
          @page { size: A4; margin: 18mm 20mm; }
          body * { visibility: hidden !important; }
          #area-cetak, #area-cetak * { visibility: visible !important; }
          #area-cetak { position:absolute; left:0; top:0; width:100%; }
          .kertas .halaman { box-shadow:none; margin:0; padding:0; width:auto; min-height:0; break-after:page; page-break-after:always; }
          .kertas .halaman:last-child { break-after:auto; page-break-after:auto; }
          .kertas tr { break-inside: avoid; }
        }
      `}</style>

      {/* Bilah atas */}
      <div className="flex flex-wrap items-center gap-2 mb-4 print:hidden">
        <button onClick={() => navigate('/proposal')} className="flex items-center gap-1 text-sm text-slate-600 md:hover:text-slate-900 touch-manipulation">
          <ArrowLeft size={16} /> Proposal
        </button>
        <h1 className="font-display text-lg font-bold text-slate-800 mr-auto ml-2">{JUDUL[jenis] || JUDUL.pembangunan}</h1>
        <button onClick={contoh} className="px-3 py-2 rounded-lg border border-slate-300 text-sm flex items-center gap-1.5 touch-manipulation">
          <RotateCcw size={15} /> Isi template awal
        </button>
        <button onClick={baru} className="px-3 py-2 rounded-lg border border-slate-300 text-sm touch-manipulation">Kosongkan</button>
        <button onClick={simpan} disabled={menyimpan} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm flex items-center gap-1.5 disabled:opacity-60 touch-manipulation">
          <Save size={15} /> {menyimpan ? 'Menyimpan…' : docId ? 'Simpan perubahan' : 'Simpan'}
        </button>
        <button onClick={() => window.print()} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm flex items-center gap-1.5 touch-manipulation">
          <Printer size={15} /> Cetak / PDF
        </button>
      </div>
      {pesan && <p className="text-xs text-slate-500 mb-3 print:hidden">{pesan}</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,460px)_1fr]">
        {/* ───── FORM */}
        <div className="print:hidden">
          <div className="flex gap-1 mb-3 overflow-x-auto">
            {TABS.map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap touch-manipulation ${tab === k ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            {tab === 'surat' && (
              <>
                <Teks label="Nama panitia / pemohon" value={d.panitia} onChange={(v) => set('panitia', v)} />
                <Teks label="Wilayah (baris kedua kop)" value={d.wilayah} onChange={(v) => set('wilayah', v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Teks label="Nomor surat" value={d.nomor} onChange={(v) => set('nomor', v)} />
                  <Teks label="Lampiran" value={d.lampiran} onChange={(v) => set('lampiran', v)} />
                </div>
                <Teks label="Hal" value={d.hal} onChange={(v) => set('hal', v)} />
                <Area label="Kepada Yth." rows={4} value={d.kepada} onChange={(v) => set('kepada', v)} hint="Satu baris per baris alamat." />
                <Teks label="Salam pembuka" value={d.salamBuka} onChange={(v) => set('salamBuka', v)} />
                <Area label="Isi surat" rows={9} value={d.isiSurat} onChange={(v) => set('isiSurat', v)} hint="Pisahkan paragraf dengan baris kosong." />
                <Teks label="Salam penutup" value={d.salamTutup} onChange={(v) => set('salamTutup', v)} />
                <Teks label="Nama organisasi di atas tanda tangan" value={d.ttdOrg} onChange={(v) => set('ttdOrg', v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Teks label="Tempat" value={d.tempat} onChange={(v) => set('tempat', v)} />
                  <Teks label="Tanggal surat" value={d.tglSurat} onChange={(v) => set('tglSurat', v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Teks label="Jabatan 1 (kiri)" value={d.jabatan1} onChange={(v) => set('jabatan1', v)} />
                  <Teks label="Nama 1" value={d.nama1} onChange={(v) => set('nama1', v)} />
                  <Teks label="Jabatan 2 (kanan)" value={d.jabatan2} onChange={(v) => set('jabatan2', v)} />
                  <Teks label="Nama 2" value={d.nama2} onChange={(v) => set('nama2', v)} />
                  <Teks label="Mengetahui (jabatan)" value={d.mengetahuiJabatan} onChange={(v) => set('mengetahuiJabatan', v)} />
                  <Teks label="Mengetahui (nama)" value={d.mengetahuiNama} onChange={(v) => set('mengetahuiNama', v)} />
                </div>
                <Area label="Tebusan" rows={3} value={d.tebusan} onChange={(v) => set('tebusan', v)} hint="Satu baris per tujuan. Kosongkan jika tidak ada." />
              </>
            )}

            {tab === 'isi' && (
              <>
                <Area label="A. Dasar / latar belakang" rows={12} value={d.dasar} onChange={(v) => set('dasar', v)} hint="Pisahkan paragraf dengan baris kosong." />
                <Teks label="Pengantar tujuan" value={d.tujuanPengantar} onChange={(v) => set('tujuanPengantar', v)} />
                <Area label="B. Tujuan" rows={5} value={d.tujuan} onChange={(v) => set('tujuan', v)} hint="Satu baris per butir tujuan." />
                <Area label="C. Rencana kegiatan" rows={4} value={d.rencana} onChange={(v) => set('rencana', v)} />
                <Teks label="D. Kalimat sebelum nominal anggaran" value={d.anggaranPengantar} onChange={(v) => set('anggaranPengantar', v)} hint="Nominal diambil otomatis dari tab Anggaran." />
                <Teks label="Kalimat sesudah nominal" value={d.anggaranPenutup} onChange={(v) => set('anggaranPenutup', v)} />
                <Area label="E. Penutup" rows={4} value={d.penutup} onChange={(v) => set('penutup', v)} />
                <div className="border border-slate-200 rounded-lg p-3 mb-3 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Rekening penerima bantuan (opsional)</p>
                  <Teks label="Nama bank" value={d.bank} onChange={(v) => set('bank', v)} />
                  <Teks label="Nomor rekening" value={d.noRek} onChange={(v) => set('noRek', v)} hint="Kosongkan jika tidak ingin menampilkan rekening di surat dan proposal." />
                  <Teks label="Atas nama" value={d.atasNamaRek} onChange={(v) => set('atasNamaRek', v)} />
                  <Teks label="Kalimat pengantar" value={d.rekPengantar} onChange={(v) => set('rekPengantar', v)} />
                </div>
                <Teks label="Tanggal proposal" value={d.tglProposal} onChange={(v) => set('tglProposal', v)} />
              </>
            )}

            {tab === 'rab' && (
              <>
                <Teks label="Judul RAB" value={d.rabJudul} onChange={(v) => set('rabJudul', v)} />
                <Area label="Wilayah RAB" rows={2} value={d.rabWilayah} onChange={(v) => set('rabWilayah', v)} />
                {d.rab.map((s, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 mb-3 bg-slate-50">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1"><Teks label={`Bagian ${huruf(i).toUpperCase()}`} value={s.judul} onChange={(v) => ubahSeksiRab(i, 'judul', v)} /></div>
                      {d.rab.length > 1 && (
                        <button onClick={() => set('rab', d.rab.filter((_, x) => x !== i))} className="mb-3 p-2 text-red-500" aria-label="Hapus bagian"><Trash2 size={16} /></button>
                      )}
                    </div>
                    {s.items.map((it, j) => (
                      <div key={j} className="grid grid-cols-[1fr_56px_70px_96px_28px] gap-1.5 mb-1.5 items-center">
                        <input className={inputCls} placeholder="Nama barang" value={it.nama} onChange={(e) => ubahItem(i, j, 'nama', e.target.value)} />
                        <input className={inputCls} type="number" min="0" placeholder="Jml" value={it.qty} onChange={(e) => ubahItem(i, j, 'qty', e.target.value)} />
                        <input className={inputCls} placeholder="Satuan" value={it.satuan} onChange={(e) => ubahItem(i, j, 'satuan', e.target.value)} />
                        <input className={inputCls} type="number" min="0" placeholder="Harga" value={it.harga} onChange={(e) => ubahItem(i, j, 'harga', e.target.value)} />
                        <button onClick={() => hapusItem(i, j)} className="text-red-500" aria-label="Hapus baris"><Trash2 size={15} /></button>
                      </div>
                    ))}
                    <button onClick={() => tambahItem(i)} className="text-xs text-emerald-700 flex items-center gap-1 mt-1"><Plus size={13} /> Tambah barang</button>
                  </div>
                ))}
                <button onClick={() => set('rab', [...d.rab, { judul: '', items: [{ nama: '', qty: 1, satuan: '', harga: 0 }] }])} className="text-sm text-emerald-700 flex items-center gap-1 mb-3"><Plus size={14} /> Tambah bagian anggaran</button>
                <p className="text-sm font-semibold text-slate-700">Total: {rp(total)}</p>
                <p className="text-xs text-slate-500 capitalize">{terbilang(total)} rupiah</p>
              </>
            )}

            {tab === 'panitia' && (
              <>
                <label className="flex items-center gap-2 text-sm mb-4">
                  <input type="checkbox" checked={!!d.sertakanSK} onChange={(e) => set('sertakanSK', e.target.checked)} />
                  Sertakan SK pembentukan panitia & susunan panitia di cetakan
                </label>
                <Area label="Instansi penerbit SK (kop)" rows={3} value={d.skInstansi} onChange={(v) => set('skInstansi', v)} />
                <Teks label="Judul SK" value={d.skJudul} onChange={(v) => set('skJudul', v)} />
                <Teks label="Nomor SK" value={d.skNomor} onChange={(v) => set('skNomor', v)} />
                <Area label="Tentang" rows={3} value={d.skTentang} onChange={(v) => set('skTentang', v)} />
                <Area label="Menimbang" rows={5} value={d.skMenimbang} onChange={(v) => set('skMenimbang', v)} hint="Satu baris per butir (otomatis a, b, c)." />
                <Area label="Mengingat" rows={3} value={d.skMengingat} onChange={(v) => set('skMengingat', v)} hint="Satu baris per butir (otomatis 1, 2, 3)." />
                <Area label="Memutuskan (Pertama, Kedua, ...)" rows={5} value={d.skMemutuskan} onChange={(v) => set('skMemutuskan', v)} hint="Satu baris per diktum." />
                <div className="grid grid-cols-2 gap-3">
                  <Teks label="Ditetapkan di" value={d.skTempat} onChange={(v) => set('skTempat', v)} />
                  <Teks label="Pada tanggal" value={d.skTanggal} onChange={(v) => set('skTanggal', v)} />
                  <Teks label="Jabatan penanda tangan" value={d.skJabatan} onChange={(v) => set('skJabatan', v)} />
                  <Teks label="Nama penanda tangan" value={d.skPejabat} onChange={(v) => set('skPejabat', v)} />
                </div>

                <h3 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Susunan panitia</h3>
                <Area label="Pelindung / Penasihat" rows={3} value={d.pelindung} onChange={(v) => set('pelindung', v)} hint="Satu nama per baris." />
                {d.inti.map((p, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3">
                    <Teks label="Jabatan inti" value={p.jabatan} onChange={(v) => set('inti', d.inti.map((x, y) => (y === i ? { ...x, jabatan: v } : x)))} />
                    <Teks label="Nama" value={p.nama} onChange={(v) => set('inti', d.inti.map((x, y) => (y === i ? { ...x, nama: v } : x)))} />
                  </div>
                ))}
                {d.seksi.map((s, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 mb-3 bg-slate-50">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1"><Teks label="Nama seksi" value={s.nama} onChange={(v) => set('seksi', d.seksi.map((x, y) => (y === i ? { ...x, nama: v } : x)))} /></div>
                      <button onClick={() => set('seksi', d.seksi.filter((_, y) => y !== i))} className="mb-3 p-2 text-red-500" aria-label="Hapus seksi"><Trash2 size={16} /></button>
                    </div>
                    <Teks label="Ketua seksi" value={s.ketua} onChange={(v) => set('seksi', d.seksi.map((x, y) => (y === i ? { ...x, ketua: v } : x)))} />
                    <Area label="Anggota" rows={5} value={s.anggota} onChange={(v) => set('seksi', d.seksi.map((x, y) => (y === i ? { ...x, anggota: v } : x)))} hint="Satu nama per baris." />
                  </div>
                ))}
                <button onClick={() => set('seksi', [...d.seksi, { nama: '', ketua: '', anggota: '' }])} className="text-sm text-emerald-700 flex items-center gap-1"><Plus size={14} /> Tambah seksi</button>
              </>
            )}
          </div>

          {riwayat.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><FolderOpen size={15} /> Proposal tersimpan</h3>
              <ul className="divide-y divide-slate-100">
                {riwayat.map((r) => (
                  <li key={r.id} className="py-2 flex items-center gap-2 text-sm">
                    <button onClick={() => buka(r.id)} className="flex-1 text-left truncate md:hover:text-emerald-700">
                      {r.judul}
                      <span className="block text-[11px] text-slate-400">{new Date(r.updated_at).toLocaleString('id-ID')}</span>
                    </button>
                    <button onClick={() => hapus(r.id)} className="text-red-500 p-1" aria-label="Hapus"><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ───── PRATINJAU / AREA CETAK */}
        <div className="overflow-x-auto">
          <div id="area-cetak" className="kertas">
            {/* Halaman 1: surat permohonan */}
            <div className="halaman" style={{ marginTop: 0 }}>
              <Kop d={d} dalam />
              <table style={{ margin: '14px 0', fontSize: '12pt' }}>
                <tbody>
                  <tr><td>Nomor</td><td>&nbsp;:&nbsp;</td><td>{d.nomor}</td></tr>
                  <tr><td>Lampiran</td><td>&nbsp;:&nbsp;</td><td>{d.lampiran}</td></tr>
                  <tr><td>Hal</td><td>&nbsp;:&nbsp;</td><td>{d.hal}</td></tr>
                </tbody>
              </table>
              <p><b>Kepada Yth.</b></p>
              {baris(d.kepada).map((l, i) => <p key={i}><b>{l}</b></p>)}
              <p style={{ marginTop: 14 }}><i>{d.salamBuka}</i></p>
              {paragraf(d.isiSurat).map((p, i) => <p key={i} style={{ marginTop: 10, textIndent: '1.2cm' }}>{p}</p>)}
              <Rekening d={d} />
              <p style={{ marginTop: 10 }}><i>{d.salamTutup}</i></p>
              <Ttd d={d} tanggal={d.tglSurat} />
              {baris(d.tebusan).length > 0 && (
                <div style={{ marginTop: 18, fontSize: '11pt' }}>
                  <p>Tebusan :</p>
                  <ol style={{ margin: 0, paddingLeft: 22 }}>{baris(d.tebusan).map((t, i) => <li key={i}>{t}</li>)}</ol>
                </div>
              )}
            </div>

            {/* Halaman 2: proposal */}
            <div className="halaman">
              <Kop d={d} dalam />
              <h4 style={{ marginTop: 14 }}>A. Dasar</h4>
              {paragraf(d.dasar).map((p, i) => <p key={i} style={{ marginTop: 6, textIndent: '1.2cm' }}>{p}</p>)}
              <h4 style={{ marginTop: 12 }}>B. Tujuan</h4>
              <p style={{ marginTop: 6 }}>{d.tujuanPengantar}</p>
              <ol style={{ margin: '4px 0 0', paddingLeft: 26 }}>{baris(d.tujuan).map((t, i) => <li key={i}>{t}</li>)}</ol>
              <h4 style={{ marginTop: 12 }}>C. Rencana Kegiatan</h4>
              <p style={{ marginTop: 6 }}>{d.rencana}</p>
              <h4 style={{ marginTop: 12 }}>D. Anggaran</h4>
              <p style={{ marginTop: 6 }}>
                {d.anggaranPengantar} <b>{rp(total)}</b> <i>({terbilang(total)} rupiah)</i>. {d.anggaranPenutup}
              </p>
              <h4 style={{ marginTop: 12 }}>E. Penutup</h4>
              <p style={{ marginTop: 6, textIndent: '1.2cm' }}>{d.penutup}</p>
              <Rekening d={d} />
              <Ttd d={d} tanggal={d.tglProposal} />
            </div>

            {/* Halaman 3: RAB */}
            <div className="halaman">
              <div className="c">
                <h4>{d.rabJudul}</h4>
                {baris(d.rabWilayah).map((l, i) => <h4 key={i}>{l}</h4>)}
              </div>
              {d.rab.map((s, i) => {
                const sub = s.items.reduce((a, it) => a + (Number(it.qty) || 0) * (Number(it.harga) || 0), 0)
                return (
                  <div key={i} style={{ marginTop: 14 }}>
                    <h4>{huruf(i).toUpperCase()}. {s.judul}</h4>
                    <table className="rab" style={{ marginTop: 6 }}>
                      <thead>
                        <tr><th style={{ width: 34 }}>NO</th><th>NAMA BARANG</th><th>JUMLAH</th><th>HARGA SATUAN</th><th>TOTAL</th></tr>
                      </thead>
                      <tbody>
                        {s.items.map((it, j) => (
                          <tr key={j}>
                            <td className="c">{j + 1}</td>
                            <td>{it.nama}</td>
                            <td>{it.qty} {it.satuan}</td>
                            <td className="r">{rp(it.harga)}</td>
                            <td className="r">{rp((Number(it.qty) || 0) * (Number(it.harga) || 0))}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={4} className="c"><b>JUMLAH</b></td>
                          <td className="r"><b>{rp(sub)}</b></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              })}
              {d.rab.length > 1 && (
                <p style={{ marginTop: 10 }}><b>TOTAL KESELURUHAN: {rp(total)}</b> <i>({terbilang(total)} rupiah)</i></p>
              )}
              <Ttd d={d} tanggal={d.tglProposal} />
            </div>

            {d.sertakanSK && (
              <>
                {/* Halaman 4: SK */}
                <div className="halaman">
                  <div className="c">
                    {baris(d.skInstansi).map((l, i) => <h4 key={i}>{l}</h4>)}
                    <h4 style={{ marginTop: 14 }}>{d.skJudul}</h4>
                    <h4>Nomor : {d.skNomor}</h4>
                    <h4 style={{ marginTop: 8 }}>Tentang</h4>
                    <h4>{d.skTentang}</h4>
                  </div>
                  <table style={{ marginTop: 14, width: '100%' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: 90, verticalAlign: 'top' }}>Menimbang</td>
                        <td style={{ width: 14, verticalAlign: 'top' }}>:</td>
                        <td>{baris(d.skMenimbang).map((t, i) => <p key={i}>{huruf(i)}.&nbsp; {t}</p>)}</td>
                      </tr>
                      <tr><td colSpan={3} style={{ height: 8 }} /></tr>
                      <tr>
                        <td style={{ verticalAlign: 'top' }}>Mengingat</td>
                        <td style={{ verticalAlign: 'top' }}>:</td>
                        <td>{baris(d.skMengingat).map((t, i) => <p key={i}>{i + 1}.&nbsp; {t}</p>)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <h4 className="c" style={{ margin: '14px 0 6px' }}>MEMUTUSKAN</h4>
                  <table style={{ width: '100%' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: 90, verticalAlign: 'top' }}>Menetapkan</td>
                        <td style={{ width: 14, verticalAlign: 'top' }}>:</td>
                        <td />
                      </tr>
                      {baris(d.skMemutuskan).map((t, i) => (
                        <tr key={i}>
                          <td style={{ verticalAlign: 'top', paddingLeft: 12 }}>{URUTAN[i] || `Ke-${i + 1}`}</td>
                          <td style={{ verticalAlign: 'top' }}>:</td>
                          <td>{t}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 18, marginLeft: '55%' }}>
                    <p>Ditetapkan di : {d.skTempat}</p>
                    <p>Pada tanggal : {d.skTanggal}</p>
                    <p style={{ marginTop: 8 }}>{d.skJabatan}</p>
                    <div style={{ height: 70 }} />
                    <p><b><u>{d.skPejabat}</u></b></p>
                  </div>
                </div>

                {/* Halaman 5: lampiran susunan panitia */}
                <div className="halaman">
                  <table style={{ fontSize: '11.5pt' }}>
                    <tbody>
                      <tr><td><b>Lampiran</b></td><td>&nbsp;: Surat Keputusan {d.skJabatan}</td></tr>
                      <tr><td><b>Nomor</b></td><td>&nbsp;: {d.skNomor}</td></tr>
                      <tr><td><b>Tanggal</b></td><td>&nbsp;: {d.skTanggal}</td></tr>
                      <tr><td style={{ verticalAlign: 'top' }}><b>Tentang</b></td><td>&nbsp;: Susunan dan Komposisi {d.panitia}</td></tr>
                    </tbody>
                  </table>
                  <h4 style={{ marginTop: 14 }}>Pelindung / Penasihat :</h4>
                  <ol style={{ margin: '2px 0 0', paddingLeft: 26 }}>{baris(d.pelindung).map((n, i) => <li key={i}>{n}</li>)}</ol>
                  <h4 style={{ marginTop: 12 }}>PENGURUS INTI</h4>
                  <table>
                    <tbody>
                      {d.inti.map((p, i) => (
                        <tr key={i}><td style={{ width: 110 }}>{p.jabatan}</td><td>: {p.nama}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <h4 style={{ marginTop: 12 }}>SEKSI-SEKSI</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginTop: 4, textAlign: 'left' }}>
                    {d.seksi.map((s, i) => (
                      <div key={i} style={{ breakInside: 'avoid' }}>
                        <p><b>{s.nama}</b></p>
                        <p>Ketua : {s.ketua}</p>
                        <p>Anggota :</p>
                        <ol style={{ margin: 0, paddingLeft: 22 }}>{baris(s.anggota).map((n, j) => <li key={j}>{n}</li>)}</ol>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 18, marginLeft: '55%' }}>
                    <p>Ditetapkan di : {d.skTempat}</p>
                    <p>Pada tanggal : {d.skTanggal}</p>
                    <p style={{ marginTop: 8 }}>{d.skJabatan}</p>
                    <div style={{ height: 70 }} />
                    <p><b><u>{d.skPejabat}</u></b></p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Blok rekening penerima bantuan — tampil hanya kalau nomor rekening diisi.
function Rekening({ d }) {
  if (!d.noRek) return null
  return (
    <div style={{ marginTop: 10, breakInside: 'avoid' }}>
      <p>{d.rekPengantar}</p>
      <table style={{ marginLeft: 24 }}>
        <tbody>
          {d.bank && <tr><td style={{ width: 120 }}>Bank</td><td>: {d.bank}</td></tr>}
          <tr><td style={{ width: 120 }}>No. Rekening</td><td>: <b>{d.noRek}</b></td></tr>
          {d.atasNamaRek && <tr><td style={{ width: 120 }}>Atas Nama</td><td>: {d.atasNamaRek}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

// Kop: versi `dalam` dicetak di dalam halaman; versi luar tidak menampilkan apa pun
// (disediakan supaya mudah diganti jadi gambar kop surat resmi nanti).
function Kop({ d, dalam }) {
  if (!dalam) return null
  return (
    <div className="c" style={{ borderBottom: '3px double #000', paddingBottom: 6 }}>
      <h4>{d.panitia}</h4>
      <h4>{d.wilayah}</h4>
    </div>
  )
}

// Blok tanda tangan: tempat/tanggal, organisasi, 2 penanda tangan, lalu "Mengetahui".
function Ttd({ d, tanggal }) {
  return (
    <div style={{ marginTop: 18, breakInside: 'avoid', textAlign: 'center' }}>
      <p style={{ textAlign: 'right' }}>{d.tempat}, {tanggal}</p>
      <p style={{ textTransform: 'uppercase' }}>{d.ttdOrg}</p>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 4 }}>
        <div>
          <p>{d.jabatan1}</p>
          <div style={{ height: 64 }} />
          <p><b><u>{d.nama1}</u></b></p>
        </div>
        <div>
          <p>{d.jabatan2}</p>
          <div style={{ height: 64 }} />
          <p><b><u>{d.nama2}</u></b></p>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <p><b>Mengetahui</b></p>
        <p><b>{d.mengetahuiJabatan}</b></p>
        <div style={{ height: 64 }} />
        <p><b><u>{d.mengetahuiNama}</u></b></p>
      </div>
    </div>
  )
}
