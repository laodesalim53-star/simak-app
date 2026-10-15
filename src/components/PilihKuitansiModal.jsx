import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { formatRupiah, formatTanggal } from '../pages/bok/utils'
import { X, Search, Loader2 } from 'lucide-react'

/**
 * Modal "Tarik Data untuk Kuitansi Jasa". Sumber data bergantung jenis akun:
 *
 *  - Puskesmas (isPuskesmas): bku_bok, kwitansi_bok, nota_belanja_bok
 *  - Sekolah (lainnya)      : bku_kas (BKU BOS) dan kuitansi jenis='kuitansi'.
 *                             Tab Nota Belanja disembunyikan karena belum ada
 *                             tabel sumbernya untuk sekolah.
 *
 * PERBAIKAN MULTI-SEKOLAH: semua mode kini wajib punya sekolahId dan memfilter
 * per sekolah di sisi klien (lapisan kedua di samping RLS di database).
 */

const SUMBER_BOK = [
  { key: 'bku', label: 'BKU' },
  { key: 'kwitansi', label: 'Kwitansi' },
  { key: 'nota', label: 'Nota Belanja' },
]
const SUMBER_SEKOLAH = [
  { key: 'bku', label: 'BKU' },
  { key: 'kwitansi', label: 'Kwitansi' },
]

// ---- Pemetaan sumber -> bentuk dataAwal untuk KuitansiJasaModal ----
function ringkasBarang(daftar = []) {
  return (Array.isArray(daftar) ? daftar : [])
    .filter((b) => b.nama)
    .map((b) => `${b.nama} (${b.jumlah}${b.satuan ? ' ' + b.satuan : ''})`)
    .join(', ')
}

// BKU puskesmas (bku_bok) memakai nomor_bukti, BKU sekolah (bku_kas) memakai no_bukti.
function dariBku(b) {
  return {
    bku_id: b.id,
    no_bukti: b.nomor_bukti || b.no_bukti || '',
    tanggal: b.tanggal,
    untuk_pembayaran: b.uraian || '',
    jumlah_total: b.pengeluaran || 0,
    mata_anggaran: b.kode_rekening || '',
  }
}

// Kwitansi puskesmas (kwitansi_bok)
function dariKwitansiBok(k) {
  return {
    kwitansi_id: k.id,
    bku_id: k.bku_id || null,
    no_bukti: k.nomor_kwitansi || '',
    tanggal: k.tanggal,
    diterima_dari: k.sudah_terima_dari || '',
    untuk_pembayaran: k.untuk_pembayaran || '',
    jumlah_total: k.jumlah_uang || 0,
    nama_penerima: k.nama_penerima || '',
    alamat_penerima: k.alamat_penerima || '',
    mata_anggaran: k.mata_anggaran || '',
    tahun_anggaran: k.tahun_anggaran || '',
    lembar: k.lembar || '',
    disetujui_oleh: k.disetujui_oleh || '',
    nip_disetujui: k.nip_disetujui || '',
    dibayar_oleh: k.dibayar_oleh || '',
    nip_dibayar: k.nip_dibayar || '',
    catatan: k.catatan || '',
  }
}

// Kuitansi sekolah (tabel kuitansi, jenis='kuitansi').
// kwitansi_id sengaja tidak diisi: id ini bukan id kwitansi_bok.
function dariKuitansiSekolah(k) {
  return {
    bku_id: k.bku_id || null,
    no_bukti: k.no_bukti || k.nomor || '',
    tanggal: k.tanggal,
    diterima_dari: k.diterima_dari || '',
    untuk_pembayaran: k.untuk_pembayaran || '',
    jumlah_total: k.jumlah_total || 0,
    nama_penerima: k.nama_penerima || '',
    alamat_penerima: k.alamat_penerima || '',
    mata_anggaran: k.mata_anggaran || '',
    tahun_anggaran: k.tahun_anggaran || '',
    catatan: k.catatan || '',
  }
}

function dariNota(n) {
  const barang = ringkasBarang(n.daftar_barang)
  return {
    nota_id: n.id,
    bku_id: n.bku_id || null,
    no_bukti: n.nomor_nota || '',
    tanggal: n.tanggal,
    untuk_pembayaran: barang ? `Belanja: ${barang}` : 'Belanja',
    jumlah_total: n.total_belanja || 0,
    toko: n.nama_toko || '',
  }
}

// Teks yang dicari: nomor, keterangan, tanggal (format ISO & tampilan),
// jumlah (angka mentah & format rupiah), serta kolom tambahan per sumber.
function teksCari(r) {
  const jumlah = r.jumlah == null ? '' : `${r.jumlah} ${formatRupiah(r.jumlah)}`
  const tgl = r.tanggal ? `${r.tanggal} ${formatTanggal(r.tanggal)}` : ''
  return [r.judul, r.ket, tgl, jumlah, r.ekstra].filter(Boolean).join(' ').toLowerCase()
}

export default function PilihKuitansiModal({ onPilih, onClose }) {
  const { sekolahId, isPuskesmas } = useAuth()
  const modeBok = !!isPuskesmas
  const daftarSumber = modeBok ? SUMBER_BOK : SUMBER_SEKOLAH

  const [sumber, setSumber] = useState('kwitansi')
  const [data, setData] = useState({ bku: [], kwitansi: [], nota: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cari, setCari] = useState('')

  useEffect(() => {
    // PERBAIKAN: semua tenant (puskesmas maupun sekolah) wajib punya sekolahId.
    // Sebelumnya mode sekolah hanya mengandalkan RLS.
    if (!sekolahId) return
    let batal = false

    async function muat() {
      setLoading(true)
      setError('')

      if (modeBok) {
        const [bku, kwi, nota] = await Promise.all([
          supabase.from('bku_bok').select('*').eq('sekolah_id', sekolahId)
            .gt('pengeluaran', 0).order('tanggal', { ascending: false }).limit(300),
          supabase.from('kwitansi_bok').select('*').eq('sekolah_id', sekolahId)
            .order('tanggal', { ascending: false }).limit(300),
          supabase.from('nota_belanja_bok').select('*').eq('sekolah_id', sekolahId)
            .order('tanggal', { ascending: false }).limit(300),
        ])
        if (batal) return
        const err = bku.error || kwi.error || nota.error
        if (err) setError('Gagal memuat data: ' + err.message)
        setData({ bku: bku.data || [], kwitansi: kwi.data || [], nota: nota.data || [] })
      } else {
        const [bku, kwi] = await Promise.all([
          supabase.from('bku_kas').select('*').eq('sekolah_id', sekolahId)
            .gt('pengeluaran', 0).order('tanggal', { ascending: false }).limit(300),
          supabase.from('kuitansi').select('*').eq('sekolah_id', sekolahId)
            .eq('jenis', 'kuitansi')
            .order('tanggal', { ascending: false }).limit(300),
        ])
        if (batal) return
        const err = bku.error || kwi.error
        if (err) setError('Gagal memuat data: ' + err.message)
        setData({ bku: bku.data || [], kwitansi: kwi.data || [], nota: [] })
      }

      setLoading(false)
    }

    muat()
    return () => { batal = true }
  }, [sekolahId, modeBok])

  // Baris seragam untuk ditampilkan: { id, tanggal, judul, ket, jumlah, ekstra, ambil() }
  const baris = useMemo(() => {
    let list = []
    if (sumber === 'bku') {
      list = data.bku.map((b) => ({
        id: b.id, tanggal: b.tanggal, judul: b.nomor_bukti || b.no_bukti || '-',
        ket: b.uraian, jumlah: b.pengeluaran,
        ekstra: b.kode_rekening || '',
        ambil: () => dariBku(b),
      }))
    } else if (sumber === 'kwitansi' && modeBok) {
      list = data.kwitansi.map((k) => ({
        id: k.id, tanggal: k.tanggal, judul: k.nomor_kwitansi || '-',
        ket: `${k.sudah_terima_dari || ''} — ${k.untuk_pembayaran || ''}`,
        jumlah: k.jumlah_uang,
        ekstra: `${k.nama_penerima || ''} ${k.mata_anggaran || ''}`,
        ambil: () => dariKwitansiBok(k),
      }))
    } else if (sumber === 'kwitansi') {
      list = data.kwitansi.map((k) => ({
        id: k.id, tanggal: k.tanggal, judul: k.nomor || k.no_bukti || '-',
        ket: `${k.diterima_dari || ''} — ${k.untuk_pembayaran || ''}`,
        jumlah: k.jumlah_total,
        ekstra: `${k.nama_penerima || ''} ${k.mata_anggaran || ''}`,
        ambil: () => dariKuitansiSekolah(k),
      }))
    } else {
      list = data.nota.map((n) => ({
        id: n.id, tanggal: n.tanggal, judul: n.nomor_nota || '-',
        ket: `${n.nama_toko || ''} — ${ringkasBarang(n.daftar_barang)}`,
        jumlah: n.total_belanja,
        ekstra: '',
        ambil: () => dariNota(n),
      }))
    }

    // Beberapa kata dipisah spasi: semua kata harus ada (urutan bebas).
    const kata = cari.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (kata.length === 0) return list
    return list.filter((r) => {
      const teks = teksCari(r)
      return kata.every((k) => teks.includes(k))
    })
  }, [sumber, data, cari, modeBok])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="card relative overflow-hidden w-full max-w-2xl p-4 sm:p-6 max-h-[92vh] flex flex-col">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900 p-1 touch-manipulation">
          <X size={20} />
        </button>
        <h2 className="font-display text-xl font-semibold mb-3">Tarik Data untuk Kuitansi Jasa</h2>

        <div className="flex flex-wrap gap-1 mb-3">
          {daftarSumber.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSumber(s.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium touch-manipulation ${
                sumber === s.key ? 'bg-emerald-600 text-white' : 'text-ink-700/70 hover:bg-emerald-600/10'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40 pointer-events-none" />
          {/* paddingLeft inline: class .input-field bisa menimpa utilitas pl-9 sehingga ikon menimpa teks */}
          <input
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Cari nomor, keterangan, tanggal, atau jumlah..."
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            autoFocus
          />
        </div>

        {error && <div className="p-3 mb-3 rounded-lg text-sm text-red-900 bg-red-900/5">{error}</div>}

        <div className="overflow-y-auto space-y-2">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-ink-700/50">
              <Loader2 size={16} className="animate-spin" /> Memuat data...
            </div>
          )}
          {!loading && baris.length === 0 && (
            <p className="text-center py-8 text-ink-700/50">Tidak ada data yang cocok.</p>
          )}
          {baris.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPilih(r.ambil())}
              className="w-full text-left p-3 rounded-lg border border-ink-900/10 hover:bg-emerald-600/[0.06] transition-colors touch-manipulation"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs">{r.judul}</span>
                <span className="text-xs text-ink-700/60">{formatTanggal(r.tanggal)}</span>
              </div>
              <p className="text-sm mt-0.5 line-clamp-2">{r.ket}</p>
              <p className="text-sm font-semibold text-emerald-700 mt-0.5">{formatRupiah(r.jumlah)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
