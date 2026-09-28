import { useEffect, useMemo, useRef, useState } from 'react'
import { saveAs } from 'file-saver'
import {
  Loader2, Download, FileUp, Trash2, Sparkles, Landmark, Printer, Plus, ArrowUpDown, FileSpreadsheet,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  bukaPdf, renderHalaman, ambilTekslayer, jumlahHuruf, buatWorkerOcr, ocrCanvas,
  scanDenganAI, klusterTabel, FAKTOR_KOLOM, buatXlsx, formatUkuran,
} from '../lib/alatPdf'
import {
  uraiTeks, periodeSemester, fmtTgl, tanggalPanjang, formatAngka, idBaru,
} from '../lib/bkuBank'

const BATAS_UKURAN_MB = 50
const KUNCI_PROFIL = 'bkuBank.profil'

const PROFIL_KOSONG = {
  nama: '', desa: '', kab: '', prov: '', tempat: '',
  kepsek: '', nipKepsek: '', bendahara: '', nipBendahara: '',
}

const METODE = [
  { value: 'tesseract', label: 'OCR Cepat', desc: 'Berjalan di perangkat Anda, gratis, cocok untuk scan yang jelas' },
  { value: 'ai', label: 'AI Scan (Gemini)', desc: 'Lebih akurat untuk scan buram, tetapi gambar dikirim ke server AI' },
]

const bulatkan = (n) => Math.round(n * 100) / 100

function muatProfil() {
  try {
    const raw = localStorage.getItem(KUNCI_PROFIL)
    return raw ? { ...PROFIL_KOSONG, ...JSON.parse(raw) } : PROFIL_KOSONG
  } catch {
    return PROFIL_KOSONG
  }
}

export default function BkuBank() {
  const sekarang = new Date()
  const [profil, setProfil] = useState(muatProfil)
  const { sekolahId } = useAuth()
  const [muatData, setMuatData] = useState(false)
  const [infoData, setInfoData] = useState('')
  const [semester, setSemester] = useState(sekarang.getMonth() >= 6 ? '2' : '1')
  const [tahun, setTahun] = useState(sekarang.getFullYear())
  const [gaya, setGaya] = useState('en')
  const [tglTtd, setTglTtd] = useState('')

  const [tglAwal, setTglAwal] = useState(() => periodeSemester(sekarang.getMonth() >= 6 ? '2' : '1', sekarang.getFullYear()).tglSaldoAwal)
  const [awal, setAwal] = useState(0)
  const [baris, setBaris] = useState([])

  const [file, setFile] = useState(null)
  const [info, setInfo] = useState(null)
  const bufferRef = useRef(null)
  const batalRef = useRef(false)
  const [metode, setMetode] = useState('tesseract')
  const [pakaiTekslayer, setPakaiTekslayer] = useState(true)
  const [rapikan, setRapikan] = useState(true)
  const [filterPeriode, setFilterPeriode] = useState(true)
  const [teksMentah, setTeksMentah] = useState('')
  const [catatan, setCatatan] = useState('')

  const [sibuk, setSibuk] = useState(false)
  const [progres, setProgres] = useState({ i: 0, n: 0 })
  const [ocrPersen, setOcrPersen] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_PROFIL, JSON.stringify(profil))
    } catch {
      /* penyimpanan penuh atau dinonaktifkan: abaikan */
    }
  }, [profil])

  const periode = useMemo(() => periodeSemester(semester, tahun), [semester, tahun])
  const setP = (k) => (e) => setProfil((p) => ({ ...p, [k]: e.target.value }))
  const f = (n) => formatAngka(n, gaya)

  function ubahPeriode(sem, thn) {
    setSemester(sem)
    setTahun(thn)
    setTglAwal(periodeSemester(sem, thn).tglSaldoAwal)
  }

  // Isi otomatis identitas, kepala sekolah, dan bendahara dari data sekolah.
  // Nilai dari database menimpa isian lama; kolom yang kosong di database
  // tetap memakai isian yang tersimpan di perangkat.
  async function isiDariDataSekolah() {
    if (!sekolahId) return
    setMuatData(true)
    setInfoData('')
    try {
      const [{ data: sk }, { data: guru }] = await Promise.all([
        supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
        supabase
          .from('guru')
          .select('nama_lengkap, nip, tugas_tambahan')
          .eq('sekolah_id', sekolahId)
          .eq('status', 'aktif')
          .ilike('tugas_tambahan', '%bendahara%'),
      ])

      const bersihKab = (t) =>
        (t || '').replace(/^PEMERINTAH\s+KABUPATEN\s+/i, '').replace(/^KABUPATEN\s+/i, '').trim()
      // Utamakan "Bendahara BOS" bila ada lebih dari satu bendahara.
      const bend = (guru || []).find((g) => /bos/i.test(g.tugas_tambahan || '')) || (guru || [])[0]
      const desa = sk?.desa || sk?.kelurahan || ''

      const isi = {
        nama: sk?.nama_sekolah,
        desa: [desa, sk?.kecamatan].filter(Boolean).join(' / '),
        kab: bersihKab(sk?.kabupaten),
        prov: sk?.provinsi,
        tempat: sk?.tempat_ttd || desa || sk?.kecamatan,
        kepsek: sk?.kepala_sekolah,
        nipKepsek: sk?.nip_kepala_sekolah,
        bendahara: bend?.nama_lengkap,
        nipBendahara: bend?.nip,
      }
      const terisi = Object.fromEntries(Object.entries(isi).filter(([, v]) => v))
      setProfil((p) => ({ ...p, ...terisi }))

      const kurang = []
      if (!sk) kurang.push('profil sekolah')
      else if (!sk.kepala_sekolah) kurang.push('kepala sekolah')
      if (!bend) kurang.push('bendahara')
      setInfoData(
        kurang.length
          ? `Data ${kurang.join(' dan ')} belum ditemukan, silakan isi manual.`
          : 'Identitas, kepala sekolah, dan bendahara terisi dari data sekolah.'
      )
    } catch {
      setInfoData('Gagal memuat data sekolah. Isi manual atau coba lagi.')
    } finally {
      setMuatData(false)
    }
  }

  useEffect(() => {
    isiDariDataSekolah()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  // ---------- Hitung saldo berjalan ----------
  const rekap = useMemo(() => {
    let s = Number(awal) || 0
    let tm = 0
    let tk = 0
    let sebelumBeda = false
    const isi = baris.map((r) => {
      const m = Number(r.masuk) || 0
      const k = Number(r.keluar) || 0
      s = bulatkan(s + m - k)
      tm += m
      tk += k
      const beda = r.saldoBank != null && Math.abs(r.saldoBank - s) > 0.5
      const mulaiBeda = beda && !sebelumBeda
      sebelumBeda = beda
      return { ...r, m, k, saldo: s, mulaiBeda }
    })
    return { isi, tm: bulatkan(tm), tk: bulatkan(tk), akhir: s }
  }, [baris, awal])

  const perluCek = rekap.isi.filter((r) => r.periksa || r.mulaiBeda).length

  // ---------- Berkas & pembacaan ----------
  async function handlePilihFile(e) {
    const berkas = e.target.files?.[0]
    e.target.value = ''
    if (!berkas) return
    setError('')
    if (!/\.pdf$/i.test(berkas.name) && berkas.type !== 'application/pdf') {
      setError('Berkas harus berformat PDF.')
      return
    }
    if (berkas.size > BATAS_UKURAN_MB * 1024 * 1024) {
      setError(`Berkas terlalu besar (maksimal ${BATAS_UKURAN_MB} MB).`)
      return
    }
    setSibuk(true)
    try {
      const buffer = await berkas.arrayBuffer()
      const pdf = await bukaPdf(buffer)
      const halaman = pdf.numPages
      await pdf.destroy()
      bufferRef.current = buffer
      setFile(berkas)
      setInfo({ halaman, ukuran: berkas.size })
      setTeksMentah('')
      setCatatan('')
    } catch (err) {
      setError(err.message || 'Gagal membuka PDF.')
    } finally {
      setSibuk(false)
    }
  }

  function hapusFile() {
    bufferRef.current = null
    setFile(null)
    setInfo(null)
    setTeksMentah('')
    setCatatan('')
  }

  function terapkanUrai(teks) {
    const hasil = uraiTeks(teks, { semester, tahun, rapikan, filterPeriode })
    if (!hasil.baris.length) {
      setBaris([])
      setCatatan(
        'Tidak ada baris transaksi yang dikenali. Pastikan baris transaksi diawali tanggal (mis. 26/09/2025) ' +
          'dan memuat kolom saldo. Periksa teks hasil baca di bawah, atau matikan filter periode.'
      )
      return
    }
    setBaris(hasil.baris)
    setAwal(hasil.awal)
    setCatatan(
      `${hasil.baris.length} transaksi terbaca.` +
        (hasil.dibuang ? ` ${hasil.dibuang} baris di luar periode ${periode.teks} tidak dimasukkan.` : '')
    )
  }

  async function mulaiBaca() {
    batalRef.current = false
    setError('')
    setCatatan('')
    setSibuk(true)
    setProgres({ i: 0, n: 0 })
    setOcrPersen(0)
    let worker = null
    let pdf = null
    try {
      pdf = await bukaPdf(bufferRef.current)
      let gabung = ''
      for (let no = 1; no <= pdf.numPages; no++) {
        if (batalRef.current) throw Object.assign(new Error('dibatalkan'), { name: 'Dibatalkan' })
        setProgres({ i: no, n: pdf.numPages })
        setOcrPersen(0)
        const page = await pdf.getPage(no)
        try {
          let teks = ''
          if (pakaiTekslayer) {
            const kata = await ambilTekslayer(page)
            if (jumlahHuruf(kata) >= 20) {
              teks = klusterTabel(kata, FAKTOR_KOLOM.longgar).map((r) => r.join(' ')).join('\n')
            }
          }
          if (!teks) {
            if (metode === 'ai') {
              const { canvas } = await renderHalaman(page, { dpi: 150 })
              teks = await scanDenganAI(canvas, 'ind+eng')
            } else {
              if (!worker) worker = await buatWorkerOcr('ind+eng', setOcrPersen)
              const { canvas } = await renderHalaman(page, { dpi: 250 })
              const h = await ocrCanvas(worker, canvas, { denganPosisi: true })
              teks = h.kata?.length
                ? klusterTabel(h.kata, FAKTOR_KOLOM.longgar).map((r) => r.join(' ')).join('\n')
                : h.teks
            }
          }
          gabung += `${teks}\n`
        } finally {
          page.cleanup()
        }
        setTeksMentah(gabung)
      }
      terapkanUrai(gabung)
    } catch (err) {
      if (err?.name !== 'Dibatalkan') setError(err?.message || 'Terjadi kesalahan saat membaca PDF.')
    } finally {
      if (worker) await worker.terminate()
      if (pdf) await pdf.destroy()
      setSibuk(false)
      setOcrPersen(0)
    }
  }

  // ---------- Edit tabel ----------
  const ubahBaris = (id, kolom, nilai) =>
    setBaris((lama) => lama.map((r) => (r.id === id ? { ...r, [kolom]: nilai } : r)))
  const angkaDari = (v) => (v === '' ? 0 : Number(v))
  const hapusBaris = (id) => setBaris((lama) => lama.filter((r) => r.id !== id))
  const tambahBaris = () =>
    setBaris((lama) => [
      ...lama,
      { id: idBaru(), tgl: lama[lama.length - 1]?.tgl || periode.awal, kode: '', bukti: '', uraian: '', masuk: 0, keluar: 0, saldoBank: null, periksa: false },
    ])
  const urutkan = () => setBaris((lama) => [...lama].sort((a, b) => (a.tgl < b.tgl ? -1 : a.tgl > b.tgl ? 1 : 0)))
  const kosongkan = () => {
    setBaris([])
    setAwal(0)
    setCatatan('')
  }

  // ---------- Keluaran ----------
  const ttdTanggal = tglTtd || tanggalPanjang(periode.akhir)
  const jumlahMasuk = bulatkan((Number(awal) || 0) + rekap.tm)

  function unduhXlsx() {
    const kosong = ['', '', '', '', '', '', '']
    const baris7 = (...c) => [...c, ...kosong].slice(0, 7)
    const data = [
      baris7('Formulir BOS-K5'),
      baris7('BUKU PEMBANTU BANK'),
      baris7(`( ${periode.teks} )`),
      baris7((profil.nama || '').toUpperCase()),
      baris7(),
      baris7('Nama Sekolah', `: ${profil.nama}`),
      baris7('Desa/Kecamatan', `: ${profil.desa}`),
      baris7('Kabupaten/Kota', `: ${profil.kab}`),
      baris7('Provinsi', `: ${profil.prov}`),
      baris7(),
      baris7('Tanggal', 'No. Kode', 'No Bukti', 'Uraian', 'Penerimaan (Debit)', 'Pengeluaran (Kredit)', 'Saldo'),
      baris7('1', '2', '3', '4', '5', '6', '7'),
      baris7(fmtTgl(tglAwal), '', '', 'Saldo Awal', f(awal), '-', f(awal)),
      ...rekap.isi.map((r) =>
        baris7(fmtTgl(r.tgl), r.kode, r.bukti, r.uraian, r.m ? f(r.m) : '', r.k ? f(r.k) : '', f(r.saldo))
      ),
      baris7('', '', '', 'JUMLAH', f(jumlahMasuk), f(rekap.tk), f(rekap.akhir)),
      baris7(),
      baris7('', '', '', '', '', `${profil.tempat} ${ttdTanggal}`),
      baris7('Mengetahui', '', '', '', '', ''),
      baris7('Kepala Sekolah', '', '', '', '', 'Bendahara'),
      baris7(),
      baris7(),
      baris7(profil.kepsek, '', '', '', '', profil.bendahara),
      baris7(profil.nipKepsek && `NIP. ${profil.nipKepsek}`, '', '', '', '', profil.nipBendahara && `NIP. ${profil.nipBendahara}`),
    ]
    buatXlsx([{ nama: 'BKU Bank', sumber: '', baris: data }])
      .then((blob) => saveAs(blob, `BKU-Bank-${semester === '1' ? 'Sem1' : 'Sem2'}-${tahun}.xlsx`))
      .catch((err) => setError(err.message))
  }

  const persenBar = progres.n ? Math.round(((progres.i - 1 + ocrPersen / 100) / progres.n) * 100) : 0
  const sel = 'border border-black px-1.5 py-1'

  return (
    <div className="flex min-h-screen bg-paper">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body * { visibility: hidden !important; }
          #cetak-bku, #cetak-bku * { visibility: visible !important; }
          #cetak-bku { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>
      <Sidebar />
      <main className="flex-1 overflow-y-auto py-10 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-ink-950 flex items-center justify-center mx-auto mb-3">
              <Landmark size={26} className="text-brass-400" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">BKU Bank (BOS-K5)</h1>
            <p className="text-ink-700/70 mt-2 max-w-lg mx-auto text-sm">
              Buku Pembantu Bank per semester. Unggah PDF rekening koran sekolah (termasuk hasil scan), transaksi terisi
              otomatis, lalu periksa dan cetak.
            </p>
          </div>

          {/* 1. Identitas */}
          <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-950">1. Identitas sekolah dan periode</p>
              <button
                type="button"
                onClick={isiDariDataSekolah}
                disabled={muatData || !sekolahId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-ink-950/15 hover:bg-ink-950/5 disabled:opacity-40"
              >
                {muatData && <Loader2 size={14} className="animate-spin" />}
                Muat ulang dari data sekolah
              </button>
            </div>
            {infoData && <p className="text-xs text-ink-700 bg-paper rounded-lg px-3 py-2">{infoData}</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label-field">Nama Sekolah</label><input className="input-field" value={profil.nama} onChange={setP('nama')} placeholder="SD NEGERI ..." /></div>
              <div><label className="label-field">Desa/Kecamatan</label><input className="input-field" value={profil.desa} onChange={setP('desa')} /></div>
              <div><label className="label-field">Kabupaten/Kota</label><input className="input-field" value={profil.kab} onChange={setP('kab')} /></div>
              <div><label className="label-field">Provinsi</label><input className="input-field" value={profil.prov} onChange={setP('prov')} /></div>
              <div>
                <label className="label-field">Semester</label>
                <select className="input-field" value={semester} onChange={(e) => ubahPeriode(e.target.value, tahun)}>
                  <option value="1">Semester I (Januari s.d Juni)</option>
                  <option value="2">Semester II (Juli s.d Desember)</option>
                </select>
              </div>
              <div>
                <label className="label-field">Tahun</label>
                <input type="number" className="input-field" value={tahun} onChange={(e) => ubahPeriode(semester, Number(e.target.value) || tahun)} />
              </div>
              <div><label className="label-field">Kepala Sekolah</label><input className="input-field" value={profil.kepsek} onChange={setP('kepsek')} /></div>
              <div><label className="label-field">NIP Kepala Sekolah</label><input className="input-field" value={profil.nipKepsek} onChange={setP('nipKepsek')} /></div>
              <div><label className="label-field">Bendahara</label><input className="input-field" value={profil.bendahara} onChange={setP('bendahara')} /></div>
              <div><label className="label-field">NIP Bendahara</label><input className="input-field" value={profil.nipBendahara} onChange={setP('nipBendahara')} /></div>
              <div><label className="label-field">Tempat penandatanganan</label><input className="input-field" value={profil.tempat} onChange={setP('tempat')} placeholder="Contoh: Waria" /></div>
              <div><label className="label-field">Tanggal penandatanganan</label><input className="input-field" value={tglTtd} onChange={(e) => setTglTtd(e.target.value)} placeholder={tanggalPanjang(periode.akhir)} /></div>
              <div>
                <label className="label-field">Format angka</label>
                <select className="input-field" value={gaya} onChange={(e) => setGaya(e.target.value)}>
                  <option value="en">1,234.56 (seperti contoh formulir)</option>
                  <option value="id">1.234,56 (format Indonesia)</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-ink-700/60">Identitas dan nama penandatangan diingat di perangkat ini untuk semester berikutnya.</p>
          </section>

          {/* 2. Isi otomatis */}
          <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <p className="text-sm font-semibold text-ink-950">2. Isi otomatis dari PDF rekening koran</p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn-primary cursor-pointer">
                <FileUp size={16} />
                {file ? 'Ganti PDF' : 'Pilih PDF rekening koran'}
                <input type="file" accept="application/pdf,.pdf" onChange={handlePilihFile} className="hidden" disabled={sibuk} />
              </label>
              {file && (
                <button type="button" onClick={hapusFile} disabled={sibuk} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40">
                  <Trash2 size={16} /> Hapus
                </button>
              )}
            </div>
            {file && info && (
              <p className="text-sm text-ink-700/80">
                <span className="font-medium text-ink-950">{file.name}</span> · {info.halaman} halaman · {formatUkuran(info.ukuran)}
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              {METODE.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMetode(m.value)}
                  className={`text-left rounded-xl border p-3 transition ${metode === m.value ? 'border-ink-950 bg-ink-950/5' : 'border-ink-950/10 hover:border-ink-950/25'}`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-950">
                    {m.value === 'ai' && <Sparkles size={14} className="text-brass-500" />}
                    {m.label}
                  </span>
                  <span className="block text-xs text-ink-700/60 mt-0.5">{m.desc}</span>
                </button>
              ))}
            </div>
            {metode === 'ai' && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Rekening koran memuat nomor rekening. Dengan AI Scan, gambar halaman dikirim ke server AI. Pakai OCR Cepat bila ragu.
              </p>
            )}

            <label className="flex items-center gap-2 text-sm text-ink-950">
              <input type="checkbox" checked={pakaiTekslayer} onChange={(e) => setPakaiTekslayer(e.target.checked)} />
              Pakai teks bawaan PDF bila ada (rekening koran unduhan internet banking biasanya sudah berteks)
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-950">
              <input type="checkbox" checked={rapikan} onChange={(e) => setRapikan(e.target.checked)} />
              Rapikan uraian (mis. "PAJAK" menjadi "Pajak Bank", "BUNGA" menjadi "Bunga Bank")
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-950">
              <input type="checkbox" checked={filterPeriode} onChange={(e) => setFilterPeriode(e.target.checked)} />
              Hanya ambil transaksi dalam periode {periode.teks}
            </label>

            <button type="button" onClick={mulaiBaca} disabled={!file || sibuk} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <FileSpreadsheet size={16} />
              Baca dan isi tabel
            </button>

            {sibuk && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm text-ink-700/80">
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    {progres.n ? `Membaca halaman ${progres.i} dari ${progres.n}...` : 'Menyiapkan...'}
                    {ocrPersen > 0 && ` (${ocrPersen}%)`}
                  </span>
                  <button type="button" onClick={() => { batalRef.current = true }} className="text-xs font-medium text-red-600 hover:underline">Batalkan</button>
                </div>
                <div className="h-1.5 rounded-full bg-ink-950/10 overflow-hidden">
                  <div className="h-full bg-ink-950 transition-all" style={{ width: `${persenBar}%` }} />
                </div>
              </div>
            )}
            {catatan && <p className="text-xs text-ink-700 bg-paper rounded-lg px-3 py-2">{catatan}</p>}
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            {(teksMentah || file) && (
              <details className="text-sm">
                <summary className="cursor-pointer text-ink-700/80">Teks hasil baca (bisa diedit, lalu urai ulang)</summary>
                <textarea className="input-field font-mono text-xs mt-2" rows={10} value={teksMentah} onChange={(e) => setTeksMentah(e.target.value)} placeholder="Atau tempel teks rekening koran di sini..." />
                <button type="button" onClick={() => terapkanUrai(teksMentah)} disabled={!teksMentah.trim() || sibuk} className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-ink-950/15 text-ink-950 hover:bg-ink-950/5 disabled:opacity-40">
                  Urai ulang ke tabel
                </button>
              </details>
            )}
          </section>

          {/* 3. Periksa & edit */}
          <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-950">3. Periksa dan sunting transaksi</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={tambahBaris} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-ink-950/15 hover:bg-ink-950/5"><Plus size={14} /> Tambah baris</button>
                <button type="button" onClick={urutkan} disabled={baris.length < 2} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-ink-950/15 hover:bg-ink-950/5 disabled:opacity-40"><ArrowUpDown size={14} /> Urutkan tanggal</button>
                <button type="button" onClick={kosongkan} disabled={!baris.length} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40"><Trash2 size={14} /> Kosongkan</button>
              </div>
            </div>
            {perluCek > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                {perluCek} baris perlu dicek (latar kuning): arah penerimaan/pengeluaran ditebak dari kata uraian, atau saldo hitungan
                berbeda dengan saldo di rekening koran. Cocokkan dengan PDF asli, terutama angka.
              </p>
            )}
            <div className="overflow-x-auto rounded-xl border border-ink-950/10">
              <table className="text-xs min-w-[56rem] w-full">
                <thead className="bg-paper">
                  <tr className="text-left">
                    <th className="px-2 py-2 w-32">Tanggal</th>
                    <th className="px-2 py-2 w-20">No. Kode</th>
                    <th className="px-2 py-2 w-20">No Bukti</th>
                    <th className="px-2 py-2">Uraian</th>
                    <th className="px-2 py-2 w-32 text-right">Penerimaan</th>
                    <th className="px-2 py-2 w-32 text-right">Pengeluaran</th>
                    <th className="px-2 py-2 w-32 text-right">Saldo</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-ink-950/5 bg-paper/50">
                    <td className="px-2 py-1"><input type="date" className="input-field !py-1 !text-xs" value={tglAwal} onChange={(e) => setTglAwal(e.target.value)} /></td>
                    <td /><td />
                    <td className="px-2 py-1 font-medium">Saldo Awal</td>
                    <td className="px-2 py-1"><input type="number" step="0.01" className="input-field !py-1 !text-xs text-right" value={awal === 0 ? '' : awal} onChange={(e) => setAwal(angkaDari(e.target.value))} placeholder="0" /></td>
                    <td className="px-2 py-1 text-right text-ink-700/60">-</td>
                    <td className="px-2 py-1 text-right font-medium">{f(awal)}</td>
                    <td />
                  </tr>
                  {rekap.isi.map((r) => (
                    <tr key={r.id} className={`border-t border-ink-950/5 ${r.periksa || r.mulaiBeda ? 'bg-amber-50' : ''}`} title={r.mulaiBeda ? 'Saldo hitungan berbeda dengan saldo di rekening koran' : undefined}>
                      <td className="px-2 py-1"><input type="date" className="input-field !py-1 !text-xs" value={r.tgl} onChange={(e) => ubahBaris(r.id, 'tgl', e.target.value)} /></td>
                      <td className="px-2 py-1"><input className="input-field !py-1 !text-xs" value={r.kode} onChange={(e) => ubahBaris(r.id, 'kode', e.target.value)} /></td>
                      <td className="px-2 py-1"><input className="input-field !py-1 !text-xs" value={r.bukti} onChange={(e) => ubahBaris(r.id, 'bukti', e.target.value)} /></td>
                      <td className="px-2 py-1"><input className="input-field !py-1 !text-xs" value={r.uraian} onChange={(e) => ubahBaris(r.id, 'uraian', e.target.value)} /></td>
                      <td className="px-2 py-1"><input type="number" step="0.01" className="input-field !py-1 !text-xs text-right" value={r.masuk === 0 ? '' : r.masuk} onChange={(e) => ubahBaris(r.id, 'masuk', angkaDari(e.target.value))} /></td>
                      <td className="px-2 py-1"><input type="number" step="0.01" className="input-field !py-1 !text-xs text-right" value={r.keluar === 0 ? '' : r.keluar} onChange={(e) => ubahBaris(r.id, 'keluar', angkaDari(e.target.value))} /></td>
                      <td className="px-2 py-1 text-right">{f(r.saldo)}</td>
                      <td className="px-1"><button type="button" onClick={() => hapusBaris(r.id)} aria-label="Hapus baris" className="text-red-600 p-1"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                  {!baris.length && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-ink-700/60">Belum ada transaksi. Unggah PDF di langkah 2 atau tambah baris manual.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-700/60">
              No. Kode dan No Bukti tidak ada di rekening koran, isi sendiri bila diperlukan. Saldo dihitung ulang otomatis setiap ada perubahan.
            </p>
          </section>

          {/* 4. Pratinjau & cetak */}
          <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-950">4. Pratinjau formulir</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => window.print()} disabled={!baris.length} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                  <Printer size={16} /> Cetak / Simpan PDF
                </button>
                <button type="button" onClick={unduhXlsx} disabled={!baris.length} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-ink-950/15 text-ink-950 hover:bg-ink-950/5 disabled:opacity-40">
                  <Download size={16} /> Unduh Excel
                </button>
              </div>
            </div>
            <p className="text-xs text-ink-700/60">Excel menyimpan angka sebagai teks berformat, jadi untuk dihitung ulang gunakan tabel di langkah 3.</p>

            <div className="overflow-x-auto">
              <div id="cetak-bku" className="bg-white text-black text-[11px] leading-snug p-4 min-w-[44rem]" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p>Nama Sekolah : {profil.nama}</p>
                    <p>Desa/Kecamatan : {profil.desa}</p>
                    <p>Kabupaten/Kota : {profil.kab}</p>
                    <p>Provinsi : {profil.prov}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">Formulir BOS-K5</p>
                    <p>Diisi oleh Sekolah</p>
                    <p>Disimpan di Sekolah</p>
                  </div>
                </div>
                <div className="text-center my-3 font-bold">
                  <p className="text-sm">BUKU PEMBANTU BANK</p>
                  <p>( {periode.teks} )</p>
                  <p>{(profil.nama || '').toUpperCase()}</p>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-center font-bold">
                      <th className={sel} rowSpan={2}>Tanggal</th>
                      <th className={sel} rowSpan={2}>No. Kode</th>
                      <th className={sel} rowSpan={2}>No Bukti</th>
                      <th className={sel} rowSpan={2}>Uraian</th>
                      <th className={sel}>Penerimaan<br />(Debit)</th>
                      <th className={sel}>Pengeluaran<br />(Kredit)</th>
                      <th className={sel} rowSpan={2}>Saldo</th>
                    </tr>
                    <tr />
                    <tr className="text-center">
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => <th key={n} className={`${sel} font-normal`}>{n}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={sel}>{fmtTgl(tglAwal)}</td><td className={sel} /><td className={sel} />
                      <td className={sel}>Saldo Awal</td>
                      <td className={`${sel} text-right`}>{f(awal)}</td>
                      <td className={`${sel} text-right`}>-</td>
                      <td className={`${sel} text-right`}>{f(awal)}</td>
                    </tr>
                    {rekap.isi.map((r) => (
                      <tr key={r.id}>
                        <td className={sel}>{fmtTgl(r.tgl)}</td>
                        <td className={sel}>{r.kode}</td>
                        <td className={sel}>{r.bukti}</td>
                        <td className={sel}>{r.uraian}</td>
                        <td className={`${sel} text-right`}>{r.m ? f(r.m) : ''}</td>
                        <td className={`${sel} text-right`}>{r.k ? f(r.k) : ''}</td>
                        <td className={`${sel} text-right`}>{f(r.saldo)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className={`${sel} text-center`} colSpan={4}>JUMLAH</td>
                      <td className={`${sel} text-right`}>{f(jumlahMasuk)}</td>
                      <td className={`${sel} text-right`}>{f(rekap.tk)}</td>
                      <td className={`${sel} text-right`}>{f(rekap.akhir)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex justify-end mt-4">
                  <p>{profil.tempat} {ttdTanggal}</p>
                </div>
                <div className="flex justify-between mt-1">
                  <div className="text-center min-w-[12rem]">
                    <p>Mengetahui</p>
                    <p>Kepala Sekolah</p>
                    <div className="h-14" />
                    <p className="font-bold underline">{profil.kepsek}</p>
                    {profil.nipKepsek && <p>NIP. {profil.nipKepsek}</p>}
                  </div>
                  <div className="text-center min-w-[12rem]">
                    <p>&nbsp;</p>
                    <p>Bendahara</p>
                    <div className="h-14" />
                    <p className="font-bold underline">{profil.bendahara}</p>
                    {profil.nipBendahara && <p>NIP. {profil.nipBendahara}</p>}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
