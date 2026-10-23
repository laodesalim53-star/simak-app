// src/pages/LaporanPertanggungjawabanKepsek.jsx
// LPJ Kepala Sekolah per tahun ajaran, disimpan di tabel lpj_kepsek (sekolah_id, tahun_ajaran, data).
//
// Terisi otomatis dari:
//  - Murid & guru     : useKeadaanSekolah (components/LaporanTahunanOtomatis.jsx), siswa aktif + kelas + guru aktif
//  - Anggaran / BKU   : muatKeuanganTahun (lib/dataKeuanganLaporan.js), arkas_anggaran + bku_kas per kode rekening
//  - Capaian program  : dokumen 'buku-kerja' (Buku Kerja Kepala Sekolah)
//  - Kop, kepala sekolah, NIP, tempat : useDataSekolah (sama dengan Laporan Tahunan)
// Bagian yang masih kosong terisi otomatis saat halaman dibuka; yang sudah Anda isi TIDAK ditimpa.
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Printer, Loader2, RefreshCw, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { KopSurat, cssCetak } from '../components/AdministrasiKepsekKomponen'
import { useDataSekolah, useDokumenTersimpan } from '../lib/administrasiKepsek'
import {
  useKeadaanSekolah,
  TabelKeadaanMurid,
  RekapGuru,
  RekapDemografi,
  buatNarasi,
} from '../components/LaporanTahunanOtomatis'
import { muatKeuanganTahun, KEUANGAN_LPJ_KOSONG } from '../lib/dataKeuanganLaporan'
import { buatKendalaSolusi, buatRtl, buatPenutup, periksaDokumen, PemeriksaDokumen } from '../components/LaporanLpjOtomatis'

const tahunAjaranSekarang = () => {
  const n = new Date()
  const y = n.getMonth() >= 6 ? n.getFullYear() : n.getFullYear() - 1
  return `${y}/${y + 1}`
}

const DATA_AWAL = {
  pendahuluan: '',
  jumlah_siswa: '',
  jumlah_l: '',
  jumlah_p: '',
  jumlah_guru: '',
  jumlah_rombel: '',
  capaian: [{ bidang: '', program: '', target: '', capaian: '', ket: '' }],
  tahun_anggaran: '',
  penerimaan: '',
  keuangan: [{ uraian: '', anggaran: '', realisasi: '' }],
  kendala: [{ masalah: '', solusi: '' }],
  rtl: [''],
  penutup: '',
  tempat: '',
  tanggal: '',
  kepala_sekolah: '',
  nip_kepala: '',
}

const bawaanBukuKerja = () => ({ jurnal: [], program: [], pembinaan: [] })

const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0)

const input = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'

// ---- pembantu pengisian otomatis ----
const kosongKeuangan = (rows) => rows.every((r) => !r.uraian.trim() && !r.anggaran && !r.realisasi)
const kosongCapaian = (rows) => rows.every((r) => !r.program.trim())
const barisKeuanganDari = (keu) =>
  keu.perKelompok.map((g) => ({ uraian: g.label, anggaran: String(Math.round(g.anggaran)), realisasi: String(Math.round(g.realisasi)) }))
const capaianDari = (program) =>
  program.map((r) => ({
    bidang: r.bidang || '',
    program: r.program || '',
    target: r.target || '',
    capaian: '',
    ket: r.waktu ? `Waktu: ${r.waktu}` : '',
  }))
const hariIni = () => new Date().toLocaleDateString('sv-SE')

// Buang awalan "Kecamatan" bila sudah tertulis di data, supaya kop tidak menampilkan "Kecamatan Kecamatan ..."
const tanpaAwalan = (teks, kata) => {
  const s = String(teks || '').trim()
  return s.replace(new RegExp(`^${kata}\\s+`, 'i'), '')
}

function Bagian({ judul, petunjuk, children, aksi }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="font-display font-semibold text-slate-900">{judul}</h2>
          {petunjuk && <p className="text-xs text-slate-500">{petunjuk}</p>}
        </div>
        {aksi}
      </div>
      {children}
    </section>
  )
}

function TombolTambah({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:text-blue-950">
      <Plus size={14} /> Tambah baris
    </button>
  )
}

function TombolAksi({ onClick, disabled, spin, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:text-blue-950 disabled:opacity-50"
    >
      <RefreshCw size={14} className={spin ? 'animate-spin' : ''} /> {children}
    </button>
  )
}

function PanelOtomatis({ cek, timpa, setTimpa, onIsi, disabled }) {
  return (
    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-slate-700">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-blue-900">Pengisian otomatis</p>
        <label className="ml-auto flex items-center gap-1">
          <input type="checkbox" checked={timpa} onChange={(e) => setTimpa(e.target.checked)} />
          Timpa isian yang sudah ada
        </label>
        <button
          type="button"
          onClick={onIsi}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-950 disabled:opacity-50"
        >
          <Sparkles size={14} /> Isi draf Pendahuluan, Kendala, Tindak Lanjut, dan Penutup
        </button>
      </div>
      <ul className="grid gap-1 sm:grid-cols-2">
        {cek.map((c) => (
          <li key={c.teks} className={`flex items-start gap-1.5 ${c.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
            {c.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
            {c.teks}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-500">
        Draf memakai angka dari database dan terisi otomatis untuk bagian yang masih kosong. Solusi dan tindak lanjut adalah usulan standar, sesuaikan dengan kondisi sekolah. Kolom Capaian pada tabel program sengaja dikosongkan; isi sendiri agar akurat.
      </p>
    </div>
  )
}

export default function LaporanPertanggungjawabanKepsek() {
  const { profil, sekolahId: sid } = useAuth()
  const sekolahId = sid || profil?.sekolah_id

  const [tahun, setTahun] = useState(tahunAjaranSekarang())
  const [d, setD] = useState(DATA_AWAL)
  const [visiMisi, setVisiMisi] = useState(null)
  const [tab, setTab] = useState('isi')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tarik, setTarik] = useState('') // '' | 'murid' | 'keuangan'
  const [pesan, setPesan] = useState(null) // hasil simpan
  const [info2, setInfo2] = useState(null) // hasil tarik data / draf
  const [timpaDraf, setTimpaDraf] = useState(false)
  const [sertakanRincian, setSertakanRincian] = useState(true)
  const [sertakanDemografi, setSertakanDemografi] = useState(false)
  const [keu, setKeu] = useState(KEUANGAN_LPJ_KOSONG)
  const [mintaMurid, setMintaMurid] = useState(false)

  const ks = useKeadaanSekolah(sekolahId)
  const { info } = useDataSekolah(sekolahId)
  const bukuKerja = useDokumenTersimpan({ sekolahId, dokumen: 'buku-kerja', buatBawaan: bawaanBukuKerja })

  const namaSekolah = info.sekolah?.nama_sekolah || info.sekolah?.nama || ''

  // Data untuk kop surat: kecamatan dibersihkan dari awalan "Kecamatan" agar tidak dobel
  const infoKop = useMemo(() => {
    if (!info?.sekolah) return info
    return {
      ...info,
      sekolah: {
        ...info.sekolah,
        kecamatan: tanpaAwalan(info.sekolah.kecamatan, 'kecamatan'),
      },
    }
  }, [info])

  // Tahun anggaran: bawaan = tahun awal tahun ajaran (mis. 2026/2027 -> 2026), bisa diubah
  const cocok = String(tahun).match(/^(\d{4})/)
  const tahunAwal = cocok ? Number(cocok[1]) : null
  const thnAnggaran = Number(d.tahun_anggaran) || tahunAwal || new Date().getFullYear()

  const bk = useMemo(() => {
    const x = bukuKerja.data || {}
    return {
      jurnal: (x.jurnal || []).filter((r) => r.kegiatan?.trim()).length,
      program: (x.program || []).filter((r) => r.program?.trim()),
      pembinaan: (x.pembinaan || []).filter((r) => r.topik?.trim()).length,
      tahunAjaran: x.tahunAjaran || '',
    }
  }, [bukuKerja.data])

  // Visi & misi (sekali saja)
  useEffect(() => {
    if (!sekolahId) return
    supabase.from('visi_misi_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle().then(({ data }) => {
      if (data) setVisiMisi(data)
    })
  }, [sekolahId])

  // Laporan per tahun ajaran
  useEffect(() => {
    if (!sekolahId || !tahun) return
    let batal = false
    setLoading(true)
    supabase
      .from('lpj_kepsek')
      .select('data')
      .eq('sekolah_id', sekolahId)
      .eq('tahun_ajaran', tahun)
      .maybeSingle()
      .then(({ data }) => {
        if (batal) return
        setD((x) => ({ ...DATA_AWAL, kepala_sekolah: x.kepala_sekolah, nip_kepala: x.nip_kepala, ...(data?.data || {}) }))
        setLoading(false)
      })
    return () => {
      batal = true
    }
  }, [sekolahId, tahun])

  // Anggaran + BKU untuk tahun anggaran terpilih
  useEffect(() => {
    if (!sekolahId || thnAnggaran < 2000) return
    let batal = false
    muatKeuanganTahun(sekolahId, thnAnggaran).then((h) => {
      if (!batal) setKeu(h)
    })
    return () => {
      batal = true
    }
  }, [sekolahId, thnAnggaran])

  // ---- Isi otomatis awal: hanya untuk bagian yang MASIH KOSONG ----
  useEffect(() => {
    if (loading || ks.memuat || ks.totalSiswaAktif + ks.guru.total === 0) return
    setD((x) =>
      x.jumlah_siswa === '' && x.jumlah_guru === '' && x.jumlah_rombel === ''
        ? { ...x, jumlah_siswa: ks.totalSiswaAktif, jumlah_l: ks.totalL, jumlah_p: ks.totalP, jumlah_guru: ks.guru.total, jumlah_rombel: ks.totalRombel }
        : x
    )
  }, [loading, ks.memuat, ks.totalSiswaAktif, ks.guru.total, ks.totalRombel, ks.totalL, ks.totalP])

  useEffect(() => {
    if (loading || !keu.dimuat) return
    setD((x) => {
      let n = x
      if (kosongKeuangan(x.keuangan) && keu.perKelompok.length) n = { ...n, keuangan: barisKeuanganDari(keu) }
      if (n.penerimaan === '' && keu.penerimaan != null) n = { ...n, penerimaan: String(Math.round(keu.penerimaan)) }
      return n
    })
  }, [loading, keu])

  useEffect(() => {
    if (loading || bukuKerja.memuat || !bk.program.length) return
    if (bk.tahunAjaran && bk.tahunAjaran !== tahun) return // Buku Kerja untuk tahun ajaran lain
    setD((x) => (kosongCapaian(x.capaian) ? { ...x, capaian: capaianDari(bk.program) } : x))
  }, [loading, bukuKerja.memuat, bk.program, bk.tahunAjaran, tahun])

  // Draf Pendahuluan, Kendala, Tindak Lanjut, Penutup, dan tanggal: otomatis untuk bagian yang MASIH KOSONG,
  // setelah murid, guru, keuangan, dan Buku Kerja selesai dimuat.
  const siap = !loading && !ks.memuat && keu.dimuat && !bukuKerja.memuat
  useEffect(() => {
    if (!siap) return
    setD((x) => {
      const draf = susunDraf(x)
      const n = { ...x }
      if (!x.pendahuluan.trim()) n.pendahuluan = draf.pendahuluan
      if (x.kendala.every((r) => !r.masalah.trim()) && draf.kendala.length) n.kendala = draf.kendala
      if (x.rtl.every((s) => !s.trim())) n.rtl = draf.rtl
      if (!x.penutup.trim()) n.penutup = draf.penutup
      if (!x.tanggal) n.tanggal = hariIni()
      return n
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siap])

  // Tombol "Tarik Data Otomatis" (murid & guru): muat ulang dulu, lalu terapkan
  useEffect(() => {
    if (!mintaMurid || ks.memuat) return
    setD((x) => ({ ...x, jumlah_siswa: ks.totalSiswaAktif, jumlah_l: ks.totalL, jumlah_p: ks.totalP, jumlah_guru: ks.guru.total, jumlah_rombel: ks.totalRombel }))
    setMintaMurid(false)
    setTarik('')
    setInfo2({ ok: true, teks: 'Jumlah siswa aktif, guru aktif, dan rombel sudah ditarik. Periksa lalu simpan.' })
  }, [mintaMurid, ks.memuat, ks.totalSiswaAktif, ks.totalL, ks.totalP, ks.guru.total, ks.totalRombel])

  const set = (k, v) => setD((x) => ({ ...x, [k]: v }))
  const ubahBaris = (k, i, f, v) =>
    setD((x) => ({ ...x, [k]: x[k].map((r, idx) => (idx === i ? { ...r, [f]: v } : r)) }))
  const tambahBaris = (k, tpl) => setD((x) => ({ ...x, [k]: [...x[k], tpl] }))
  const hapusBaris = (k, i) => setD((x) => ({ ...x, [k]: x[k].length > 1 ? x[k].filter((_, idx) => idx !== i) : x[k] }))

  function tarikMurid() {
    setTarik('murid')
    setInfo2(null)
    setMintaMurid(true)
    ks.muat()
  }

  async function tarikKeuangan() {
    if (!kosongKeuangan(d.keuangan) && !window.confirm('Baris keuangan yang sudah ada akan diganti dengan data ARKAS dan BKU. Lanjutkan?')) return
    setTarik('keuangan')
    setInfo2(null)
    const h = await muatKeuanganTahun(sekolahId, thnAnggaran)
    setKeu(h)
    setTarik('')
    if (h.error) {
      setInfo2({ ok: false, teks: `Gagal menarik data keuangan. ${h.error}` })
      return
    }
    if (!h.perKelompok.length && h.penerimaan == null) {
      setInfo2({ ok: false, teks: `Belum ada data ARKAS atau BKU untuk tahun ${thnAnggaran}. Impor dulu di menu Keuangan.` })
      return
    }
    setD((x) => ({
      ...x,
      keuangan: h.perKelompok.length ? barisKeuanganDari(h) : x.keuangan,
      penerimaan: h.penerimaan != null ? String(Math.round(h.penerimaan)) : x.penerimaan,
    }))
    setInfo2({ ok: true, teks: `Data ARKAS dan BKU tahun ${thnAnggaran} sudah ditarik. Periksa lalu simpan.` })
  }

  function tarikCapaian() {
    if (!bk.program.length) {
      setInfo2({ ok: false, teks: 'Belum ada program di Buku Kerja Kepala Sekolah.' })
      return
    }
    const ada = new Set(d.capaian.map((r) => r.program.trim().toLowerCase()))
    const baru = capaianDari(bk.program).filter((r) => !ada.has(r.program.trim().toLowerCase()))
    const dasar = d.capaian.filter((r) => r.program.trim() || r.bidang.trim() || r.target.trim() || r.capaian.trim())
    const hasil = [...dasar, ...baru]
    set('capaian', hasil.length ? hasil : DATA_AWAL.capaian)
    setInfo2({ ok: true, teks: `${baru.length} program dari Buku Kerja ditambahkan. Isi kolom Capaian lalu simpan.` })
  }

  const total = useMemo(
    () => ({
      anggaran: d.keuangan.reduce((a, r) => a + (Number(r.anggaran) || 0), 0),
      realisasi: d.keuangan.reduce((a, r) => a + (Number(r.realisasi) || 0), 0),
    }),
    [d.keuangan]
  )
  const persen = total.anggaran ? ((total.realisasi / total.anggaran) * 100).toFixed(1) : '0'
  const selisih = keu.anggaran != null && keu.penerimaan != null ? keu.penerimaan - keu.anggaran : null

  // Menyusun draf dari data terkini (keuangan dibaca dari isian saat ini, jadi ikut suntingan Anda)
  const susunDraf = (x) => {
    const baris = x.keuangan.filter((r) => r.uraian.trim())
    const n = buatNarasi({ ks, tahun: `ajaran ${tahun}`, namaSekolah, tahunAjaran: '', angka: {}, uang: keu, bk, selisih })
    return {
      pendahuluan: n.pendahuluan,
      kendala: buatKendalaSolusi({ ks, keuangan: baris, bk }),
      rtl: buatRtl({ ks, keuangan: baris, bk }),
      penutup: buatPenutup({ namaSekolah, tahun }),
    }
  }

  function isiDraf() {
    const draf = susunDraf(d)
    setD((x) => ({
      ...x,
      pendahuluan: timpaDraf || !x.pendahuluan.trim() ? draf.pendahuluan : x.pendahuluan,
      kendala: (timpaDraf || x.kendala.every((r) => !r.masalah.trim())) && draf.kendala.length ? draf.kendala : x.kendala,
      rtl: (timpaDraf || x.rtl.every((s) => !s.trim())) && draf.rtl.length ? draf.rtl : x.rtl,
      penutup: timpaDraf || !x.penutup.trim() ? draf.penutup : x.penutup,
      tanggal: x.tanggal || hariIni(),
    }))
    setInfo2({ ok: true, teks: 'Draf Pendahuluan, Kendala, Tindak Lanjut, dan Penutup sudah diisi. Periksa dan sunting sebelum dicetak.' })
  }

  async function simpan() {
    setSaving(true)
    setPesan(null)
    const { error } = await supabase.from('lpj_kepsek').upsert(
      { sekolah_id: sekolahId, tahun_ajaran: tahun, data: d, updated_at: new Date().toISOString() },
      { onConflict: 'sekolah_id,tahun_ajaran' }
    )
    setSaving(false)
    setPesan(error ? { ok: false, teks: `Gagal menyimpan: ${error.message}` } : { ok: true, teks: 'Tersimpan.' })
  }

  const capaianIsi = d.capaian.filter((r) => r.program.trim())
  const keuanganIsi = d.keuangan.filter((r) => r.uraian.trim())
  const kendalaIsi = d.kendala.filter((r) => r.masalah.trim())
  const rtlIsi = d.rtl.filter((s) => s.trim())

  const kepala = d.kepala_sekolah || info.kepalaNama || ''
  const nipKepala = d.nip_kepala || info.kepalaNip || ''
  const tempatTtd = d.tempat || info.tempat || ''

  const hasilPeriksa = periksaDokumen(d, { ks, keu, bk, thnAnggaran, visiMisi, kepala, nipKepala, total })

  const cek = [
    { ok: ks.totalSiswaAktif > 0, teks: `Data murid terbaca (${ks.totalSiswaAktif} siswa aktif)` },
    { ok: ks.siswaTanpaTingkat === 0, teks: ks.siswaTanpaTingkat ? `${ks.siswaTanpaTingkat} siswa aktif belum punya kelas/tingkat` : 'Semua siswa aktif terhubung ke kelas' },
    { ok: ks.guru.total > 0, teks: `Data guru terbaca (${ks.guru.total} orang)` },
    { ok: keu.anggaran != null, teks: keu.anggaran != null ? `Data ARKAS tahun ${thnAnggaran} tersedia` : `Belum ada data ARKAS tahun ${thnAnggaran}` },
    { ok: keu.penerimaan != null, teks: keu.penerimaan != null ? `Data BKU tahun ${thnAnggaran} tersedia` : `Belum ada data BKU tahun ${thnAnggaran}` },
    { ok: bk.program.length > 0, teks: bk.program.length ? `${bk.program.length} program di Buku Kerja` : 'Belum ada program di Buku Kerja' },
    { ok: !!(visiMisi?.visi || visiMisi?.misi?.length), teks: 'Visi dan misi sudah diisi' },
  ]
  const bkBeda = bk.tahunAjaran && bk.tahunAjaran !== tahun

  return (
    <Layout
      title="Laporan Pertanggungjawaban Kepala Sekolah"
      subtitle="Laporan tahunan: capaian program, penggunaan anggaran, kendala, dan tindak lanjut."
    >
      <style>{cssCetak('portrait')}</style>
      <style>{`
        @media print {
          /* Bagian panjang boleh terpotong antar halaman supaya tidak meninggalkan celah kosong. */
          #area-cetak-adm [style*="break-inside"] { break-inside: auto !important; }
          #area-cetak-adm figure[style*="break-inside"] { break-inside: avoid !important; }
          #area-cetak-adm tr { break-inside: avoid; }
          #area-cetak-adm thead { display: table-header-group; }
          #area-cetak-adm h3 { break-after: avoid; }
        }
      `}</style>

      <div className="no-print max-w-5xl mx-auto p-4 print:hidden">
        <Link to="/administrasi-kepsek" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-3">
          <ArrowLeft size={16} /> Administrasi Kepala Sekolah
        </Link>

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Tahun ajaran</label>
            <input value={tahun} onChange={(e) => setTahun(e.target.value)} placeholder="2026/2027" className="block border rounded-lg px-3 py-2 text-sm w-36" />
          </div>
          <div className="flex gap-2">
            {[
              ['isi', 'Isi Laporan'],
              ['cetak', 'Pratinjau & Cetak'],
            ].map(([k, t]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === k ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'cetak' && (
            <>
              <label className="flex items-center gap-1 text-xs text-slate-700">
                <input type="checkbox" checked={sertakanRincian} onChange={(e) => setSertakanRincian(e.target.checked)} />
                Tabel murid per tingkat & rekap guru
              </label>
              <label className="flex items-center gap-1 text-xs text-slate-700">
                <input type="checkbox" checked={sertakanDemografi} onChange={(e) => setSertakanDemografi(e.target.checked)} />
                Rekap usia, agama, kewarganegaraan
              </label>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <Printer size={16} /> Cetak
              </button>
            </>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 py-10">
            <Loader2 className="animate-spin" size={18} /> Memuat laporan…
          </div>
        )}

        {!loading && tab === 'isi' && (
          <div className="space-y-4">
            <PanelOtomatis cek={cek} timpa={timpaDraf} setTimpa={setTimpaDraf} onIsi={isiDraf} disabled={ks.memuat} />
            <PemeriksaDokumen hasil={hasilPeriksa} />

            {ks.error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{ks.error}</p>}
            {info2 && (
              <p role="status" className={`rounded-lg p-2 text-xs ${info2.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                {info2.teks}
              </p>
            )}

            <Bagian judul="A. Pendahuluan" petunjuk="Latar belakang, dasar, dan tujuan laporan.">
              <textarea rows={4} value={d.pendahuluan} onChange={(e) => set('pendahuluan', e.target.value)} className={input} />
            </Bagian>

            <Bagian
              judul="B. Gambaran Umum Sekolah"
              petunjuk="Terisi otomatis dari siswa aktif, guru aktif, dan kelas. Visi dan misi diambil dari dokumen Visi, Misi, dan Tujuan."
              aksi={<TombolAksi onClick={tarikMurid} disabled={tarik === 'murid'} spin={tarik === 'murid'}>Tarik Data Otomatis</TombolAksi>}
            >
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  ['jumlah_siswa', 'Jumlah siswa'],
                  ['jumlah_l', 'Laki-laki'],
                  ['jumlah_p', 'Perempuan'],
                  ['jumlah_guru', 'Jumlah guru'],
                  ['jumlah_rombel', 'Jumlah rombel'],
                ].map(([k, l]) => (
                  <div key={k}>
                    <label className="text-xs font-semibold text-slate-700">{l}</label>
                    <input type="number" min="0" value={d[k]} onChange={(e) => set(k, e.target.value)} className={input} />
                  </div>
                ))}
              </div>
            </Bagian>

            <Bagian
              judul="C. Capaian Program"
              petunjuk={
                bkBeda
                  ? `Satu baris per program kerja. Catatan: Buku Kerja tersimpan untuk tahun ajaran ${bk.tahunAjaran}, bukan ${tahun}.`
                  : 'Satu baris per program kerja. Program, target, dan waktu bisa ditarik dari Buku Kerja; kolom Capaian isi sendiri.'
              }
              aksi={
                <div className="flex items-center gap-3">
                  <TombolAksi onClick={tarikCapaian}>Tarik dari Buku Kerja</TombolAksi>
                  <TombolTambah onClick={() => tambahBaris('capaian', { bidang: '', program: '', target: '', capaian: '', ket: '' })} />
                </div>
              }
            >
              <div className="space-y-3">
                {d.capaian.map((r, i) => (
                  <div key={i} className="grid sm:grid-cols-12 gap-2 items-start border rounded-lg p-2">
                    <input placeholder="Bidang (mis. Kurikulum)" value={r.bidang} onChange={(e) => ubahBaris('capaian', i, 'bidang', e.target.value)} className={`${input} sm:col-span-3`} />
                    <input placeholder="Program" value={r.program} onChange={(e) => ubahBaris('capaian', i, 'program', e.target.value)} className={`${input} sm:col-span-3`} />
                    <input placeholder="Target" value={r.target} onChange={(e) => ubahBaris('capaian', i, 'target', e.target.value)} className={`${input} sm:col-span-2`} />
                    <input placeholder="Capaian" value={r.capaian} onChange={(e) => ubahBaris('capaian', i, 'capaian', e.target.value)} className={`${input} sm:col-span-2`} />
                    <input placeholder="Keterangan" value={r.ket} onChange={(e) => ubahBaris('capaian', i, 'ket', e.target.value)} className={`${input} sm:col-span-1`} />
                    <button type="button" onClick={() => hapusBaris('capaian', i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg justify-self-end" aria-label={`Hapus capaian nomor ${i + 1}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </Bagian>

            <Bagian
              judul="D. Pengelolaan Keuangan"
              petunjuk="Anggaran dari ARKAS dan realisasi dari BKU, dikelompokkan per kode rekening. Bisa disunting; total dihitung otomatis."
              aksi={<TambahKeuangan onClick={() => tambahBaris('keuangan', { uraian: '', anggaran: '', realisasi: '' })} />}
            >
              <div className="mb-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Tahun anggaran</label>
                  <input type="number" value={d.tahun_anggaran || thnAnggaran} onChange={(e) => set('tahun_anggaran', e.target.value)} className={`${input} w-28`} />
                </div>
                <TombolAksi onClick={tarikKeuangan} disabled={tarik === 'keuangan'} spin={tarik === 'keuangan'}>
                  Tarik dari ARKAS & BKU
                </TombolAksi>
              </div>
              {keu.error && <p className="mb-2 rounded bg-red-50 p-2 text-xs text-red-700">Gagal memuat sebagian data keuangan. {keu.error}</p>}
              <div className="space-y-2">
                {d.keuangan.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input placeholder="Uraian" value={r.uraian} onChange={(e) => ubahBaris('keuangan', i, 'uraian', e.target.value)} className={`${input} col-span-12 sm:col-span-5`} />
                    <input type="number" min="0" placeholder="Anggaran (Rp)" value={r.anggaran} onChange={(e) => ubahBaris('keuangan', i, 'anggaran', e.target.value)} className={`${input} col-span-6 sm:col-span-3`} />
                    <input type="number" min="0" placeholder="Realisasi (Rp)" value={r.realisasi} onChange={(e) => ubahBaris('keuangan', i, 'realisasi', e.target.value)} className={`${input} col-span-5 sm:col-span-3`} />
                    <button type="button" onClick={() => hapusBaris('keuangan', i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg col-span-1" aria-label={`Hapus keuangan nomor ${i + 1}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Total penerimaan dana (Rp)</label>
                  <input type="number" min="0" value={d.penerimaan} onChange={(e) => set('penerimaan', e.target.value)} className={`${input} w-52`} />
                </div>
              </div>
              <p className="text-sm text-slate-700 mt-3">
                Total anggaran {rupiah(total.anggaran)} · realisasi {rupiah(total.realisasi)} ({persen}%)
              </p>
            </Bagian>

            <Bagian judul="E. Kendala dan Solusi" aksi={<TombolTambah onClick={() => tambahBaris('kendala', { masalah: '', solusi: '' })} />}>
              <div className="space-y-2">
                {d.kendala.map((r, i) => (
                  <div key={i} className="grid sm:grid-cols-12 gap-2 items-start">
                    <textarea rows={2} placeholder="Kendala" value={r.masalah} onChange={(e) => ubahBaris('kendala', i, 'masalah', e.target.value)} className={`${input} sm:col-span-6`} />
                    <textarea rows={2} placeholder="Solusi yang ditempuh" value={r.solusi} onChange={(e) => ubahBaris('kendala', i, 'solusi', e.target.value)} className={`${input} sm:col-span-5`} />
                    <button type="button" onClick={() => hapusBaris('kendala', i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" aria-label={`Hapus kendala nomor ${i + 1}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </Bagian>

            <Bagian judul="F. Rencana Tindak Lanjut" aksi={<TombolTambah onClick={() => set('rtl', [...d.rtl, ''])} />}>
              <div className="space-y-2">
                {d.rtl.map((v, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="mt-2 w-5 text-sm text-slate-500 text-right shrink-0">{i + 1}.</span>
                    <textarea rows={2} value={v} onChange={(e) => set('rtl', d.rtl.map((x, idx) => (idx === i ? e.target.value : x)))} className={input} />
                    <button type="button" onClick={() => set('rtl', d.rtl.length > 1 ? d.rtl.filter((_, idx) => idx !== i) : d.rtl)} className="mt-1 p-2 text-red-600 hover:bg-red-50 rounded-lg" aria-label={`Hapus rencana nomor ${i + 1}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </Bagian>

            <Bagian judul="G. Penutup dan Pengesahan" petunjuk="Nama, NIP, dan tempat otomatis diambil dari data sekolah bila dikosongkan.">
              <textarea rows={3} value={d.penutup} onChange={(e) => set('penutup', e.target.value)} placeholder="Kalimat penutup" className={`${input} mb-3`} />
              <div className="grid sm:grid-cols-2 gap-3">
                <input placeholder={info.tempat || 'Tempat (mis. Sorong)'} value={d.tempat} onChange={(e) => set('tempat', e.target.value)} className={input} />
                <input type="date" value={d.tanggal} onChange={(e) => set('tanggal', e.target.value)} className={input} />
                <input placeholder={info.kepalaNama || 'Nama kepala sekolah'} value={d.kepala_sekolah} onChange={(e) => set('kepala_sekolah', e.target.value)} className={input} />
                <input placeholder={info.kepalaNip || 'NIP kepala sekolah'} value={d.nip_kepala} onChange={(e) => set('nip_kepala', e.target.value)} className={input} />
              </div>
            </Bagian>

            <div className="flex items-center gap-3 pb-6">
              <button onClick={simpan} disabled={saving} className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan laporan
              </button>
              {pesan && <span className={`text-sm ${pesan.ok ? 'text-green-700' : 'text-red-600'}`}>{pesan.teks}</span>}
            </div>
          </div>
        )}
      </div>

      {!loading && tab === 'cetak' && (
        <div className="max-w-4xl mx-auto px-4 pb-10">
          <PemeriksaDokumen hasil={hasilPeriksa} terbuka={false} />
          <div id="area-cetak-adm" className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 text-slate-900 text-[13px] leading-relaxed">
            <KopSurat info={infoKop} namaSekolah={namaSekolah} />

            <div className="mb-4 text-center">
              <p className="text-base font-bold uppercase underline underline-offset-4">Laporan Pertanggungjawaban Kepala Sekolah</p>
              <p>Tahun Ajaran {tahun}</p>
            </div>

            <h3 className="font-bold mb-1">A. Pendahuluan</h3>
            <p className="mb-4 text-justify whitespace-pre-line">{d.pendahuluan || '—'}</p>

            <h3 className="font-bold mb-1">B. Gambaran Umum Sekolah</h3>
            <p className="mb-2">
              {namaSekolah || 'Sekolah'} memiliki {d.jumlah_siswa || '…'} siswa
              {d.jumlah_l !== '' && d.jumlah_p !== '' ? ` (${d.jumlah_l} laki-laki dan ${d.jumlah_p} perempuan)` : ''}, {d.jumlah_guru || '…'} guru dan tenaga kependidikan, dan {d.jumlah_rombel || '…'} rombongan belajar pada tahun ajaran {tahun}.
            </p>
            {sertakanRincian && (
              <div className="mb-3">
                <TabelKeadaanMurid ks={ks} />
                <RekapGuru ks={ks} />
              </div>
            )}
            {sertakanDemografi && <RekapDemografi ks={ks} />}
            {visiMisi?.visi && (
              <p className="mb-1 mt-2">
                <span className="font-semibold">Visi:</span> {visiMisi.visi}
              </p>
            )}
            {visiMisi?.misi?.length > 0 && (
              <>
                <p className="font-semibold">Misi:</p>
                <ol className="list-decimal pl-6 mb-4">
                  {visiMisi.misi.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ol>
              </>
            )}

            <h3 className="font-bold mb-1 mt-4">C. Capaian Program</h3>
            {capaianIsi.length ? (
              <table className="w-full border-collapse border border-slate-700 mb-4 text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    {['No', 'Bidang', 'Program', 'Target', 'Capaian', 'Ket.'].map((h) => (
                      <th key={h} className="border border-slate-700 px-2 py-1 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {capaianIsi.map((r, i) => (
                    <tr key={i}>
                      <td className="border border-slate-700 px-2 py-1">{i + 1}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.bidang}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.program}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.target}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.capaian}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.ket}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mb-4">—</p>
            )}

            <h3 className="font-bold mb-1">D. Pengelolaan Keuangan</h3>
            <p className="mb-1 text-xs">Tahun anggaran {thnAnggaran}.</p>
            {keuanganIsi.length ? (
              <table className="w-full border-collapse border border-slate-700 mb-2 text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    {['No', 'Uraian', 'Anggaran', 'Realisasi', '%'].map((h) => (
                      <th key={h} className="border border-slate-700 px-2 py-1 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keuanganIsi.map((r, i) => (
                    <tr key={i}>
                      <td className="border border-slate-700 px-2 py-1">{i + 1}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.uraian}</td>
                      <td className="border border-slate-700 px-2 py-1 text-right">{rupiah(r.anggaran)}</td>
                      <td className="border border-slate-700 px-2 py-1 text-right">{rupiah(r.realisasi)}</td>
                      <td className="border border-slate-700 px-2 py-1 text-right">
                        {Number(r.anggaran) ? ((Number(r.realisasi) / Number(r.anggaran)) * 100).toFixed(1) : '0'}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="border border-slate-700 px-2 py-1" colSpan={2}>Jumlah</td>
                    <td className="border border-slate-700 px-2 py-1 text-right">{rupiah(total.anggaran)}</td>
                    <td className="border border-slate-700 px-2 py-1 text-right">{rupiah(total.realisasi)}</td>
                    <td className="border border-slate-700 px-2 py-1 text-right">{persen}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="mb-2">—</p>
            )}
            {Number(d.penerimaan) > 0 && (
              <p className="mb-4 text-xs">
                Total penerimaan dana: <b>{rupiah(d.penerimaan)}</b>. Sisa kas (penerimaan dikurangi realisasi): <b>{rupiah(Number(d.penerimaan) - total.realisasi)}</b>.
              </p>
            )}

            <h3 className="font-bold mb-1">E. Kendala dan Solusi</h3>
            {kendalaIsi.length ? (
              <table className="w-full border-collapse border border-slate-700 mb-4 text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    {['No', 'Kendala', 'Solusi'].map((h) => (
                      <th key={h} className="border border-slate-700 px-2 py-1 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kendalaIsi.map((r, i) => (
                    <tr key={i}>
                      <td className="border border-slate-700 px-2 py-1">{i + 1}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.masalah}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.solusi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mb-4">—</p>
            )}

            <h3 className="font-bold mb-1">F. Rencana Tindak Lanjut</h3>
            {rtlIsi.length ? (
              <ol className="list-decimal pl-6 mb-4 space-y-1">
                {rtlIsi.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            ) : (
              <p className="mb-4">—</p>
            )}

            <h3 className="font-bold mb-1">G. Penutup</h3>
            <p className="mb-8 text-justify whitespace-pre-line">{d.penutup || '—'}</p>

            <div className="flex justify-end" style={{ breakInside: 'avoid' }}>
              <div className="text-center min-w-[220px]">
                <p>
                  {tempatTtd || '……………'},{' '}
                  {d.tanggal
                    ? new Date(d.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '……………'}
                </p>
                <p>Kepala Sekolah,</p>
                <div className="h-20" />
                <p className="font-bold underline">{kepala || '……………'}</p>
                <p>NIP. {nipKepala || '……………'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function TambahKeuangan({ onClick }) {
  return <TombolTambah onClick={onClick} />
}
