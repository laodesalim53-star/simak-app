import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import KopSurat from '../components/KopSurat'
import {
  Pencil, X, Loader2, Package, Wallet, TrendingUp, TrendingDown, Printer,
  FileSpreadsheet, Search, EyeOff, Eye, Layers, AlertTriangle, RotateCcw,
} from 'lucide-react'

/**
 * Aset Sekolah — mengikuti model dokumen "ASET SD NEGERI WARIA BOSP TAHAP 1 2026".
 *
 * Sumber data: tabel bku_kas (dibaca langsung, tanpa salin). Setiap baris BELANJA di BKU
 * (pengeluaran > 0, bukan setor/terima PPN-PPh, tarik tunai, pergeseran, bunga) menjadi satu
 * baris aset: Jenis Barang = uraian, Jumlah = jumlah_barang, Nilai Realisasi = pengeluaran,
 * Harga Satuan = nilai / jumlah. Kolom yang tidak ada di BKU (merek, no & tgl berita acara,
 * rekanan, lokasi, satuan, status BM, keterangan) disimpan di tabel aset_sekolah_info
 * (lihat aset_sekolah.sql), dikunci pada isi barisnya — bukan id — sehingga tetap menempel
 * walaupun BKU diunggah ulang (Input Data Massal BKU menghapus lalu menyisipkan ulang).
 */

const TAHAP = {
  semua: { label: 'Semua (Tahap 1 + 2)', dari: 1, sampai: 12 },
  '1': { label: 'BOSP Tahap 1 (Jan–Jun)', dari: 1, sampai: 6 },
  '2': { label: 'BOSP Tahap 2 (Jul–Des)', dari: 7, sampai: 12 },
}

const STATUS_BM = ['DI BKU', 'TIDAK ADA DI BM']

// Baris BKU yang BUKAN belanja barang/aset
const BUKAN_BELANJA = /(terima|setor)\s+(ppn|pph|pajak)|tarik\s+tunai|pergeseran|bunga\s+bank|^\s*saldo|setor\s+tunai|pajak/i

const nf = (n) => Number(n || 0).toLocaleString('id-ID')
const rupiah = (n) => 'Rp ' + nf(n)

function tahapDariBulan(b) { return b <= 6 ? 1 : 2 }

function tebakSatuan(uraian) {
  return /buku|kelas|matematika|ipas|bahasa|pendidikan|bs\s/i.test(uraian || '') ? 'Buku' : 'Buah'
}

// ---- Riwayat pengetikan (saran isian) ----
const KOLOM_RIWAYAT = ['merek', 'no_tgl_ba', 'rekanan', 'lokasi', 'satuan', 'keterangan']
const SATUAN_UMUM = ['Buku', 'Buah', 'Unit', 'Set', 'Paket', 'Lembar', 'Pasang', 'Rim']
const BAWAAN_KET = /^BOSP Tahap \d \d{4}$/

function bacaRiwayat(sekolahId) {
  try {
    return JSON.parse(localStorage.getItem(`aset_riwayat_${sekolahId}`) || '{}') || {}
  } catch { return {} }
}

// Catat nilai yang baru disimpan: yang terbaru di depan, tanpa dobel (huruf besar/kecil diabaikan), maks 30
function catatRiwayat(sekolahId, daftarPayload) {
  const r = bacaRiwayat(sekolahId)
  for (const p of daftarPayload) {
    for (const k of KOLOM_RIWAYAT) {
      const v = (p[k] || '').toString().trim()
      if (!v) continue
      if (k === 'keterangan' && BAWAAN_KET.test(v)) continue // bawaan otomatis, bukan ketikan
      const lama = (r[k] || []).filter((x) => x.toLowerCase() !== v.toLowerCase())
      r[k] = [v, ...lama].slice(0, 30)
    }
  }
  try { localStorage.setItem(`aset_riwayat_${sekolahId}`, JSON.stringify(r)) } catch { /* abaikan */ }
}

// Gabungan: riwayat di perangkat ini + nilai yang sudah tersimpan di database (milik sekolah)
function bangunSaran(sekolahId, info) {
  const r = bacaRiwayat(sekolahId)
  const dariDb = Object.values(info)
  const hasil = {}
  for (const k of KOLOM_RIWAYAT) {
    const gabung = [...(r[k] || []), ...dariDb.map((o) => o[k]).filter(Boolean)]
    if (k === 'satuan') gabung.push(...SATUAN_UMUM)
    const lihat = new Set()
    hasil[k] = gabung.filter((v) => {
      const kunci = String(v).toLowerCase()
      if (!String(v).trim() || lihat.has(kunci) || (k === 'keterangan' && BAWAAN_KET.test(v))) return false
      lihat.add(kunci)
      return true
    })
  }
  return hasil
}

function ambil(obj, kunci) {
  if (!obj) return ''
  for (const k of kunci) if (obj[k]) return String(obj[k])
  return ''
}

async function ambilSemuaBku(tahun, dari, sampai) {
  const semua = []
  const langkah = 1000
  for (let mulai = 0; ; mulai += langkah) {
    const { data, error } = await supabase
      .from('bku_kas')
      .select('id, tanggal, bulan, no_bukti, uraian, kode_kegiatan, kode_rekening, jumlah_barang, penerimaan, pengeluaran')
      .eq('tahun', tahun)
      .gte('bulan', dari)
      .lte('bulan', sampai)
      .order('tanggal', { ascending: true })
      .order('id', { ascending: true })
      .range(mulai, mulai + langkah - 1)
    if (error) throw error
    semua.push(...(data || []))
    if (!data || data.length < langkah) break
  }
  return semua
}

export default function AsetSekolah({ tersemat = false }) {
  const now = new Date()
  const { profil } = useAuth()
  const sekolahId = profil?.sekolah_id

  const [tahun, setTahun] = useState(now.getFullYear())
  const [tahap, setTahap] = useState('semua')
  const [mode, setMode] = useState('modal') // 'modal' = kode rekening 5.2 | 'semua' = semua belanja
  const [cari, setCari] = useState('')
  const [tampilSembunyi, setTampilSembunyi] = useState(false)

  const [bkuRows, setBkuRows] = useState([])
  const [info, setInfo] = useState({}) // kunci -> baris aset_sekolah_info
  const [profSekolah, setProfSekolah] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [edit, setEdit] = useState(null)
  const [bulk, setBulk] = useState(false)
  const [showCetak, setShowCetak] = useState(false)
  const [verRiwayat, setVerRiwayat] = useState(0)

  async function muat() {
    if (!sekolahId) return
    setLoading(true)
    setError('')
    try {
      const { dari, sampai } = TAHAP[tahap]
      const [rows, infoRes, profRes] = await Promise.all([
        ambilSemuaBku(tahun, dari, sampai),
        supabase.from('aset_sekolah_info').select('*').eq('sekolah_id', sekolahId).eq('tahun', tahun),
        supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
      ])
      if (infoRes.error) throw infoRes.error
      setBkuRows(rows)
      setInfo(Object.fromEntries((infoRes.data || []).map((r) => [r.kunci, r])))
      setProfSekolah(profRes.data || null)
    } catch (err) {
      setError(err.message || String(err))
    }
    setLoading(false)
  }

  useEffect(() => {
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun, tahap, sekolahId])

  // ---- Bentuk baris aset dari BKU ----
  const { semuaAset, ringkas } = useMemo(() => {
    const hitung = new Map()
    const aset = []
    let dana = 0
    let belanja = 0

    for (const r of bkuRows) {
      const uraian = (r.uraian || '').trim()
      const masuk = Number(r.penerimaan || 0)
      const keluar = Number(r.pengeluaran || 0)

      if (masuk > 0 && !BUKAN_BELANJA.test(uraian)) dana += masuk
      if (keluar <= 0 || BUKAN_BELANJA.test(uraian)) continue
      belanja += keluar

      const dasar = `${r.tanggal}|${r.no_bukti || ''}|${uraian}|${keluar}`
      const urutan = (hitung.get(dasar) || 0) + 1
      hitung.set(dasar, urutan)
      const kunci = urutan === 1 ? dasar : `${dasar}#${urutan}`

      const o = info[kunci] || {}
      const jumlahBku = r.jumlah_barang !== null && r.jumlah_barang !== undefined ? Number(r.jumlah_barang) : null
      const jumlahPakai = o.jumlah ?? jumlahBku
      const qty = Number(jumlahPakai) > 0 ? Number(jumlahPakai) : 1
      const sumber = `BOSP Tahap ${tahapDariBulan(r.bulan)} ${tahun}`

      aset.push({
        kunci,
        bkuId: r.id,
        tanggal: r.tanggal,
        noBukti: r.no_bukti || '',
        kodeRek: r.kode_rekening || '',
        modal: (r.kode_rekening || '').startsWith('5.2'),
        jenis: uraian,
        merek: o.merek || '',
        noBA: o.no_tgl_ba || '',
        rekanan: o.rekanan || '',
        lokasi: o.lokasi || '',
        jumlah: qty,
        jumlahKosong: !(Number(jumlahPakai) > 0),
        satuan: o.satuan || tebakSatuan(uraian),
        harga: keluar / qty,
        nilai: keluar,
        status: o.status_bm || 'DI BKU',
        ket: o.keterangan || sumber,
        disembunyikan: !!o.disembunyikan,
        adaOverlay: !!info[kunci],
      })
    }
    return { semuaAset: aset, ringkas: { dana, belanja } }
  }, [bkuRows, info, tahun])

  const terlihat = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return semuaAset.filter((a) => {
      if (mode === 'modal' && !a.modal) return false
      if (!tampilSembunyi && a.disembunyikan) return false
      if (q && !`${a.jenis} ${a.rekanan} ${a.merek} ${a.noBukti}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [semuaAset, mode, cari, tampilSembunyi])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saran = useMemo(() => bangunSaran(sekolahId, info), [sekolahId, info, verRiwayat])

  const untukCetak = useMemo(() => terlihat.filter((a) => !a.disembunyikan), [terlihat])
  const totalNilai = untukCetak.reduce((s, a) => s + a.nilai, 0)
  const totalUnit = untukCetak.reduce((s, a) => s + a.jumlah, 0)
  const jumlahKosong = untukCetak.filter((a) => a.jumlahKosong).length
  const tanpaRekening = semuaAset.filter((a) => !a.kodeRek).length

  const judulDana = tahap === 'semua' ? `BOSP ${tahun}` : `BOSP Tahap ${tahap} ${tahun}`
  const namaSekolah = ambil(profSekolah, ['nama_sekolah', 'nama']) || ambil(profil, ['nama_sekolah']) || 'SEKOLAH'

  // ---- Simpan overlay ----
  function payloadDari(a, ubah) {
    return {
      sekolah_id: sekolahId,
      kunci: a.kunci,
      tahun,
      merek: a.merek || null,
      no_tgl_ba: a.noBA || null,
      rekanan: a.rekanan || null,
      lokasi: a.lokasi || null,
      jumlah: a.jumlahKosong ? null : a.jumlah,
      satuan: a.satuan || null,
      status_bm: a.status || 'DI BKU',
      keterangan: a.ket || null,
      disembunyikan: a.disembunyikan,
      updated_at: new Date().toISOString(),
      ...ubah,
    }
  }

  async function simpanBanyak(daftar) {
    const { error: err } = await supabase
      .from('aset_sekolah_info')
      .upsert(daftar, { onConflict: 'sekolah_id,kunci' })
    if (err) {
      alert('Gagal menyimpan: ' + err.message)
      return false
    }
    catatRiwayat(sekolahId, daftar)
    setVerRiwayat((n) => n + 1)
    await muat()
    return true
  }

  async function alihkanSembunyi(a) {
    await simpanBanyak([payloadDari(a, { disembunyikan: !a.disembunyikan })])
  }

  async function kembalikanKeBku(a) {
    if (!confirm('Hapus isian tambahan baris ini dan kembali ke data BKU?')) return
    const { error: err } = await supabase
      .from('aset_sekolah_info')
      .delete()
      .eq('sekolah_id', sekolahId)
      .eq('kunci', a.kunci)
    if (err) alert('Gagal: ' + err.message)
    else { setEdit(null); muat() }
  }

  // ---- Ekspor Excel (meniru model dokumen) ----
  function ekspor() {
    const kop = [
      [], [null, `ASET ${namaSekolah.toUpperCase()}`], [null, judulDana], [],
      ['No', 'Jenis Barang', 'Merek/Type/Ukuran', 'No&Tgl Berita Acara Pembayaran', 'Nama Perusahan/Rekanan', 'Lokasi',
        'Jumlah', null, 'Harga Satuan', 'Nilai Realisasi', 'DI BKU/TIDAK ADA DI BM', 'Ket'],
      [null, null, null, null, null, null, 'Jumlah Barang', 'Satuan', null, null, null, null],
    ]
    const isi = untukCetak.map((a, i) => [
      i + 1, a.jenis, a.merek, a.noBA, a.rekanan, a.lokasi, a.jumlah, a.satuan, a.harga, a.nilai, a.status, a.ket,
    ])
    const total = [null, null, null, null, null, null, null, 'TOTAL', null, totalNilai]
    const ttd = [
      [], [],
      [null, 'KEPALA SEKOLAH', null, null, null, null, null, null, 'BENDAHARA'],
      [], [], [],
      [null, ttdTersimpan().kepsekNama, null, null, null, null, null, null, ttdTersimpan().bendNama],
      [null, ttdTersimpan().kepsekNip && `NIP: ${ttdTersimpan().kepsekNip}`, null, null, null, null, null, null,
        ttdTersimpan().bendNip && `NIP ${ttdTersimpan().bendNip}`],
    ]
    const ws = XLSX.utils.aoa_to_sheet([...kop, ...isi, total, ...ttd])
    const merges = []
    ;[0, 1, 2, 3, 4, 5, 8, 9, 10, 11].forEach((c) => merges.push({ s: { r: 4, c }, e: { r: 5, c } }))
    merges.push({ s: { r: 4, c: 6 }, e: { r: 4, c: 7 } })
    ws['!merges'] = merges
    ws['!cols'] = [{ wch: 5 }, { wch: 44 }, { wch: 20 }, { wch: 26 }, { wch: 24 }, { wch: 12 }, { wch: 9 }, { wch: 9 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 20 }]
    const awal = kop.length
    for (let r = awal; r < awal + isi.length + 1; r++) {
      ;['I', 'J'].forEach((kol) => { const c = ws[`${kol}${r + 1}`]; if (c && typeof c.v === 'number') c.z = '#,##0' })
    }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Aset')
    XLSX.writeFile(wb, `aset-sekolah-${tahap === 'semua' ? tahun : `${tahun}-tahap-${tahap}`}.xlsx`)
  }

  function ttdTersimpan() {
    const dasar = {
      kepsekNama: ambil(profSekolah, ['nama_kepala_sekolah', 'kepala_sekolah', 'nama_kepsek']),
      kepsekNip: ambil(profSekolah, ['nip_kepala_sekolah', 'nip_kepsek']),
      bendNama: ambil(profSekolah, ['nama_bendahara', 'bendahara']),
      bendNip: ambil(profSekolah, ['nip_bendahara']),
    }
    try {
      const s = JSON.parse(localStorage.getItem(`aset_ttd_${sekolahId}`) || 'null')
      return { ...dasar, ...(s || {}) }
    } catch { return dasar }
  }

  const aksi = (
        <>
          <button className="btn-secondary" onClick={() => setBulk(true)} disabled={untukCetak.length === 0}>
            <Layers size={16} /> Isi Massal
          </button>
          <button className="btn-secondary" onClick={ekspor} disabled={untukCetak.length === 0}>
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button className="btn-primary" onClick={() => setShowCetak(true)} disabled={untukCetak.length === 0}>
            <Printer size={16} /> Cetak
          </button>
        </>
  )

  const isi = (
    <>
      {/* Filter */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label-field">Tahun</label>
          <input type="number" className="input-field w-28" value={tahun} onChange={(e) => setTahun(Number(e.target.value))} />
        </div>
        <div>
          <label className="label-field">Sumber Dana</label>
          <select className="input-field" value={tahap} onChange={(e) => setTahap(e.target.value)}>
            {Object.entries(TAHAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label-field">Jenis Belanja</label>
          <select className="input-field" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="modal">Belanja Modal (kode rek. 5.2)</option>
            <option value="semua">Semua belanja BKU</option>
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="label-field">Cari</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
            <input
              className="input-field pl-9"
              placeholder="Nama barang, rekanan, no. bukti..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" checked={tampilSembunyi} onChange={(e) => setTampilSembunyi(e.target.checked)} />
          Tampilkan yang disembunyikan
        </label>
      </div>

      {/* Ringkasan dana */}
      <div className="grid sm:grid-cols-4 gap-4 mb-5">
        <Kartu ikon={<TrendingUp size={20} />} warna="bg-sage-500/10 text-sage-500" label={`Dana Diterima (${judulDana})`} nilai={rupiah(ringkas.dana)} />
        <Kartu ikon={<TrendingDown size={20} />} warna="bg-red-50 text-red-600" label="Total Belanja di BKU" nilai={rupiah(ringkas.belanja)} />
        <Kartu ikon={<Wallet size={20} />} warna="bg-brass-400/20 text-brass-600" label="Nilai Aset (terpilih)" nilai={rupiah(totalNilai)} />
        <Kartu ikon={<Package size={20} />} warna="bg-ink-950/5 text-ink-700" label="Jenis / Jumlah Barang" nilai={`${untukCetak.length} jenis · ${nf(totalUnit)}`} />
      </div>

      {error && (
        <div className="card p-4 mb-4 text-sm text-red-600 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Gagal memuat: {error}
            {/aset_sekolah_info/.test(error) && ' — jalankan aset_sekolah.sql di SQL Editor Supabase dulu.'}
          </span>
        </div>
      )}

      {jumlahKosong > 0 && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mb-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            {jumlahKosong} baris belum punya Jumlah Barang di BKU (dianggap 1, jadi Harga Satuan = Nilai).
            Isi lewat tombol pensil di sini, atau di tab BKU halaman Keuangan.
          </span>
        </div>
      )}
      {mode === 'modal' && terlihat.length === 0 && !loading && semuaAset.length > 0 && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mb-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Tidak ada baris berkode rekening 5.2 ({tanpaRekening} baris BKU tanpa kode rekening).
            Pilih "Semua belanja BKU" lalu sembunyikan baris yang bukan aset.
          </span>
        </div>
      )}

      {/* Tabel (model dokumen aset) */}
      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr>
              <th rowSpan={2}>No</th>
              <th rowSpan={2}>Jenis Barang</th>
              <th rowSpan={2}>Merek/Type/Ukuran</th>
              <th rowSpan={2}>No & Tgl Berita Acara</th>
              <th rowSpan={2}>Rekanan</th>
              <th rowSpan={2}>Lokasi</th>
              <th colSpan={2} className="text-center">Jumlah</th>
              <th rowSpan={2} className="text-right">Harga Satuan</th>
              <th rowSpan={2} className="text-right">Nilai Realisasi</th>
              <th rowSpan={2}>DI BKU / BM</th>
              <th rowSpan={2}>Ket</th>
              <th rowSpan={2}></th>
            </tr>
            <tr>
              <th>Barang</th>
              <th>Satuan</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={13} className="text-center py-8 text-ink-700/50">Memuat data BKU...</td></tr>}
            {!loading && terlihat.length === 0 && (
              <tr><td colSpan={13} className="text-center py-8 text-ink-700/50">
                Belum ada belanja di BKU untuk {judulDana}. Unggah BKU dulu lewat halaman Keuangan → tab BKU.
              </td></tr>
            )}
            {terlihat.map((a, i) => (
              <tr key={a.kunci} className={a.disembunyikan ? 'opacity-40' : ''}>
                <td>{i + 1}</td>
                <td className="font-medium">
                  {a.jenis}
                  <div className="text-[11px] text-ink-700/50 font-normal whitespace-nowrap">
                    {a.tanggal}{a.noBukti && ` · ${a.noBukti}`}{a.kodeRek && ` · ${a.kodeRek}`}
                  </div>
                </td>
                <td>{a.merek || '-'}</td>
                <td>{a.noBA || '-'}</td>
                <td>{a.rekanan || '-'}</td>
                <td>{a.lokasi || '-'}</td>
                <td className={a.jumlahKosong ? 'text-amber-600' : ''}>{nf(a.jumlah)}</td>
                <td>{a.satuan}</td>
                <td className="text-right whitespace-nowrap">{nf(a.harga)}</td>
                <td className="text-right font-medium whitespace-nowrap">{nf(a.nilai)}</td>
                <td className="whitespace-nowrap text-xs">{a.status}</td>
                <td className="text-xs">{a.ket}</td>
                <td>
                  <div className="flex items-center gap-1 justify-end">
                    <button className="icon-btn" title="Lengkapi data" onClick={() => setEdit(a)}><Pencil size={15} /></button>
                    <button className="icon-btn" title={a.disembunyikan ? 'Tampilkan lagi' : 'Sembunyikan dari daftar aset'} onClick={() => alihkanSembunyi(a)}>
                      {a.disembunyikan ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {terlihat.length > 0 && (
              <tr className="font-semibold">
                <td colSpan={7}></td>
                <td>TOTAL</td>
                <td></td>
                <td className="text-right whitespace-nowrap">{nf(totalNilai)}</td>
                <td colSpan={3}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {edit && (
        <ModalEdit
          a={edit}
          saran={saran}
          onClose={() => setEdit(null)}
          onKembali={() => kembalikanKeBku(edit)}
          onSimpan={async (nilai) => {
            const ok = await simpanBanyak([payloadDari(edit, nilai)])
            if (ok) setEdit(null)
          }}
        />
      )}

      {bulk && (
        <ModalMassal
          jumlah={untukCetak.length}
          saran={saran}
          onClose={() => setBulk(false)}
          onTerapkan={async ({ rekanan, lokasi, no_tgl_ba, timpa }) => {
            const daftar = untukCetak.map((a) => {
              const ubah = {}
              if (rekanan && (timpa || !a.rekanan)) ubah.rekanan = rekanan
              if (lokasi && (timpa || !a.lokasi)) ubah.lokasi = lokasi
              if (no_tgl_ba && (timpa || !a.noBA)) ubah.no_tgl_ba = no_tgl_ba
              return payloadDari(a, ubah)
            })
            const ok = await simpanBanyak(daftar)
            if (ok) setBulk(false)
          }}
        />
      )}

      {showCetak && (
        <CetakAset
          sekolahId={sekolahId}
          namaSekolah={namaSekolah}
          judul={judulDana}
          rows={untukCetak}
          total={totalNilai}
          awal={ttdTersimpan()}
          onClose={() => setShowCetak(false)}
        />
      )}
    </>
  )

  // Tersemat di halaman Keuangan (tab Aset): tanpa Layout sendiri, tombol di atas isi
  if (tersemat) {
    return (
      <>
        <div className="flex flex-wrap justify-end gap-2 mb-4">{aksi}</div>
        {isi}
      </>
    )
  }

  return (
    <Layout title="Aset Sekolah" subtitle="Ditarik langsung dari BKU" actions={aksi}>
      {isi}
    </Layout>
  )
}

function Kartu({ ikon, warna, label, nilai }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${warna}`}>{ikon}</div>
      <div className="min-w-0">
        <p className="text-xs text-ink-700/50">{label}</p>
        <p className="font-display text-lg font-semibold text-ink-950 truncate">{nilai}</p>
      </div>
    </div>
  )
}

// Kolom isian dengan daftar saran dari riwayat pengetikan (muncul saat mengetik / klik dua kali / panah bawah)
function InputSaran({ nama, saran, ...props }) {
  const id = `dl-aset-${nama}`
  return (
    <>
      <input className="input-field" autoComplete="off" list={id} {...props} />
      <datalist id={id}>
        {(saran?.[nama] || []).map((v) => <option key={v} value={v} />)}
      </datalist>
    </>
  )
}

function ModalEdit({ a, saran, onClose, onSimpan, onKembali }) {
  const [f, setF] = useState({
    merek: a.merek, no_tgl_ba: a.noBA, rekanan: a.rekanan, lokasi: a.lokasi,
    jumlah: a.jumlahKosong ? '' : String(a.jumlah), satuan: a.satuan, status_bm: a.status, keterangan: a.ket,
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function kirim(e) {
    e.preventDefault()
    setSaving(true)
    await onSimpan({
      merek: f.merek.trim() || null,
      no_tgl_ba: f.no_tgl_ba.trim() || null,
      rekanan: f.rekanan.trim() || null,
      lokasi: f.lokasi.trim() || null,
      jumlah: f.jumlah === '' ? null : Number(f.jumlah),
      satuan: f.satuan.trim() || null,
      status_bm: f.status_bm,
      keterangan: f.keterangan.trim() || null,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">Lengkapi Data Aset</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={kirim} className="space-y-3">
          <div>
            <label className="label-field">Jenis Barang (dari BKU)</label>
            <p className="text-sm bg-ink-950/5 rounded-lg px-3 py-2">{a.jenis}</p>
            <p className="text-xs text-ink-700/50 mt-1">
              Nilai {rupiah(a.nilai)} · {a.tanggal}{a.noBukti && ` · ${a.noBukti}`}. Nilai & uraian hanya bisa diubah di BKU.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Jumlah Barang</label>
              <input type="number" min="0" step="any" className="input-field" value={f.jumlah} onChange={set('jumlah')} placeholder="Ikut BKU" />
            </div>
            <div>
              <label className="label-field">Satuan</label>
              <InputSaran nama="satuan" saran={saran} value={f.satuan} onChange={set('satuan')} placeholder="Buku / Buah / Unit" />
            </div>
          </div>
          <div>
            <label className="label-field">Merek / Type / Ukuran</label>
            <InputSaran nama="merek" saran={saran} value={f.merek} onChange={set('merek')} />
          </div>
          <div>
            <label className="label-field">No & Tgl Berita Acara Pembayaran</label>
            <InputSaran nama="no_tgl_ba" saran={saran} value={f.no_tgl_ba} onChange={set('no_tgl_ba')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Nama Perusahaan / Rekanan</label>
              <InputSaran nama="rekanan" saran={saran} value={f.rekanan} onChange={set('rekanan')} />
            </div>
            <div>
              <label className="label-field">Lokasi</label>
              <InputSaran nama="lokasi" saran={saran} value={f.lokasi} onChange={set('lokasi')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">DI BKU / TIDAK ADA DI BM</label>
              <select className="input-field" value={f.status_bm} onChange={set('status_bm')}>
                {STATUS_BM.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Keterangan</label>
              <InputSaran nama="keterangan" saran={saran} value={f.keterangan} onChange={set('keterangan')} />
            </div>
          </div>
          <div className="flex justify-between gap-3 pt-2">
            {a.adaOverlay ? (
              <button type="button" className="btn-secondary text-red-600" onClick={onKembali}>
                <RotateCcw size={15} /> Kembali ke BKU
              </button>
            ) : <span />}
            <div className="flex gap-3">
              <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalMassal({ jumlah, saran, onClose, onTerapkan }) {
  const [f, setF] = useState({ rekanan: '', lokasi: '', no_tgl_ba: '', timpa: false })
  const [saving, setSaving] = useState(false)
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">Isi Massal</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="text-sm text-ink-700/60 mb-3">
          Isian ini diterapkan ke {jumlah} baris yang sedang tampil (sesuai filter). Kolom yang dikosongkan tidak diubah.
        </p>
        <div className="space-y-3">
          <div>
            <label className="label-field">Nama Perusahaan / Rekanan</label>
            <InputSaran nama="rekanan" saran={saran} value={f.rekanan} onChange={(e) => setF({ ...f, rekanan: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Lokasi</label>
            <InputSaran nama="lokasi" saran={saran} value={f.lokasi} onChange={(e) => setF({ ...f, lokasi: e.target.value })} />
          </div>
          <div>
            <label className="label-field">No & Tgl Berita Acara Pembayaran</label>
            <InputSaran nama="no_tgl_ba" saran={saran} value={f.no_tgl_ba} onChange={(e) => setF({ ...f, no_tgl_ba: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.timpa} onChange={(e) => setF({ ...f, timpa: e.target.checked })} />
            Timpa juga baris yang sudah terisi
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button className="btn-secondary" onClick={onClose}>Batal</button>
          <button
            className="btn-primary"
            disabled={saving || (!f.rekanan && !f.lokasi && !f.no_tgl_ba)}
            onClick={async () => { setSaving(true); await onTerapkan(f); setSaving(false) }}
          >
            {saving && <Loader2 size={16} className="animate-spin" />} Terapkan
          </button>
        </div>
      </div>
    </div>
  )
}

// Tampilan cetak A4 landscape — susunan sama dengan model dokumen
function CetakAset({ sekolahId, namaSekolah, judul, rows, total, awal, onClose }) {
  const [ttd, setTtd] = useState(awal)
  const ubah = (k) => (e) => {
    const baru = { ...ttd, [k]: e.target.value }
    setTtd(baru)
    try { localStorage.setItem(`aset_ttd_${sekolahId}`, JSON.stringify(baru)) } catch { /* abaikan */ }
  }
  const sel = { border: '1px solid #000', padding: '3px 5px', fontSize: '10px', verticalAlign: 'top' }

  return (
    <div className="fixed inset-0 bg-white z-[60] overflow-auto">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #area-cetak-aset, #area-cetak-aset * { visibility: visible !important; }
          #area-cetak-aset { position: absolute; left: 0; top: 0; width: 100%; }
          .tanpa-cetak { display: none !important; }
          @page { size: A4 landscape; margin: 12mm; }
        }
      `}</style>

      <div className="tanpa-cetak sticky top-0 bg-white border-b p-3 flex flex-wrap gap-3 items-end">
        <input className="input-field w-48" placeholder="Nama Kepala Sekolah" value={ttd.kepsekNama} onChange={ubah('kepsekNama')} />
        <input className="input-field w-44" placeholder="NIP Kepala Sekolah" value={ttd.kepsekNip} onChange={ubah('kepsekNip')} />
        <input className="input-field w-48" placeholder="Nama Bendahara" value={ttd.bendNama} onChange={ubah('bendNama')} />
        <input className="input-field w-44" placeholder="NIP Bendahara" value={ttd.bendNip} onChange={ubah('bendNip')} />
        <div className="ml-auto flex gap-2">
          <button className="btn-secondary" onClick={onClose}><X size={16} /> Tutup</button>
          <button className="btn-primary" onClick={() => window.print()}><Printer size={16} /> Cetak</button>
        </div>
      </div>

      <div id="area-cetak-aset" style={{ padding: '16px 24px', color: '#000', fontFamily: 'Arial, sans-serif' }}>
        {/* Kop surat resmi (logo kabupaten + logo sekolah, dinas, alamat) dari profil sekolah */}
        <KopSurat />

        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14, textDecoration: 'underline' }}>
            ASET {namaSekolah.toUpperCase()}
          </div>
          <div style={{ fontSize: 12 }}>{judul}</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#eee', textAlign: 'center' }}>
              <th style={sel} rowSpan={2}>No</th>
              <th style={sel} rowSpan={2}>Jenis Barang</th>
              <th style={sel} rowSpan={2}>Merek/Type/Ukuran</th>
              <th style={sel} rowSpan={2}>No&Tgl Berita Acara Pembayaran</th>
              <th style={sel} rowSpan={2}>Nama Perusahan/Rekanan</th>
              <th style={sel} rowSpan={2}>Lokasi</th>
              <th style={sel} colSpan={2}>Jumlah</th>
              <th style={sel} rowSpan={2}>Harga Satuan</th>
              <th style={sel} rowSpan={2}>Nilai Realisasi</th>
              <th style={sel} rowSpan={2}>DI BKU/TIDAK ADA DI BM</th>
              <th style={sel} rowSpan={2}>Ket</th>
            </tr>
            <tr style={{ background: '#eee', textAlign: 'center' }}>
              <th style={sel}>Jumlah Barang</th>
              <th style={sel}>Satuan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={a.kunci} style={{ pageBreakInside: 'avoid' }}>
                <td style={{ ...sel, textAlign: 'center' }}>{i + 1}</td>
                <td style={sel}>{a.jenis}</td>
                <td style={sel}>{a.merek}</td>
                <td style={sel}>{a.noBA}</td>
                <td style={sel}>{a.rekanan}</td>
                <td style={sel}>{a.lokasi}</td>
                <td style={{ ...sel, textAlign: 'center' }}>{nf(a.jumlah)}</td>
                <td style={{ ...sel, textAlign: 'center' }}>{a.satuan}</td>
                <td style={{ ...sel, textAlign: 'right' }}>{nf(a.harga)}</td>
                <td style={{ ...sel, textAlign: 'right' }}>{nf(a.nilai)}</td>
                <td style={{ ...sel, textAlign: 'center' }}>{a.status}</td>
                <td style={sel}>{a.ket}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700 }}>
              <td style={sel} colSpan={7}></td>
              <td style={{ ...sel, textAlign: 'center' }}>TOTAL</td>
              <td style={sel}></td>
              <td style={{ ...sel, textAlign: 'right' }}>{nf(total)}</td>
              <td style={sel} colSpan={2}></td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, padding: '0 80px', fontSize: 12, pageBreakInside: 'avoid' }}>
          <div style={{ textAlign: 'center' }}>
            <div>KEPALA SEKOLAH</div>
            <div style={{ height: 70 }} />
            <div style={{ fontWeight: 700, textDecoration: 'underline' }}>{ttd.kepsekNama}</div>
            {ttd.kepsekNip && <div>NIP: {ttd.kepsekNip}</div>}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div>BENDAHARA</div>
            <div style={{ height: 70 }} />
            <div style={{ fontWeight: 700, textDecoration: 'underline' }}>{ttd.bendNama}</div>
            {ttd.bendNip && <div>NIP {ttd.bendNip}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
