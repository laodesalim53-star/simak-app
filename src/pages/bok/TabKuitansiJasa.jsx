import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import KuitansiJasaModal from '../../components/KuitansiJasaModal'
import PilihKuitansiModal from '../../components/PilihKuitansiModal'
import KuitansiJasaPrintTemplate from '../../lib/KuitansiJasaPrintTemplate'
import { muatTema } from '../../lib/kuitansiJasaTema'
import { terbilangRupiah } from '../../lib/terbilang'
import { formatRupiah, formatTanggal } from './utils'
import { Plus, Printer, Search, Loader2, Receipt, Trash2, ArrowDownToLine } from 'lucide-react'

// Tab "Kuitansi Jasa" untuk tenant puskesmas.
// Dipasang di LaporanBOK (atau halaman BOK lain):
//   import TabKuitansiJasa from './bok/TabKuitansiJasa'
//   {tabAktif === 'kuitansi_jasa' && <TabKuitansiJasa />}
//
// Prop `tampilkanTarik` (default false): menampilkan tombol "Tarik dari Kwitansi".
// Aktifkan hanya bila PilihKuitansiModal sudah diarahkan ke sumber data BOK.
export default function TabKuitansiJasa({ tampilkanTarik = false }) {
  const { sekolahId } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [pencarian, setPencarian] = useState('')
  const [showBuat, setShowBuat] = useState(false)
  const [showPilih, setShowPilih] = useState(false)
  const [dataAwal, setDataAwal] = useState(null)
  const [instansi, setInstansi] = useState(null) // bentuk { nama, alamat, kota } untuk template cetak
  const [menghapus, setMenghapus] = useState(null)
  const [cetakUlang, setCetakUlang] = useState(null)

  const loadData = useCallback(async () => {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    setErrorMsg('')
    const { data: rows, error } = await supabase
      .from('kuitansi')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .eq('jenis', 'kuitansi_jasa')
      .order('tanggal', { ascending: false })
      .order('id', { ascending: false })
    if (error) setErrorMsg('Gagal memuat kuitansi jasa: ' + error.message)
    setData(rows || [])
    setLoading(false)
  }, [sekolahId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Profil puskesmas dipetakan ke bentuk yang dipakai template cetak
  useEffect(() => {
    if (!sekolahId) return
    let batal = false
    supabase
      .from('profil_puskesmas')
      .select('nama_puskesmas, alamat, tempat_ttd, kabupaten')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data: p }) => {
        if (batal || !p) return
        setInstansi({
          nama: p.nama_puskesmas,
          alamat: p.alamat,
          kota: p.tempat_ttd || p.kabupaten,
        })
      })
    return () => {
      batal = true
    }
  }, [sekolahId])

  const dataTersaring = useMemo(() => {
    const q = pencarian.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (d) =>
        (d.nomor || '').toLowerCase().includes(q) ||
        (d.diterima_dari || '').toLowerCase().includes(q) ||
        (d.untuk_pembayaran || '').toLowerCase().includes(q)
    )
  }, [data, pencarian])

  // Cetak ulang: render template, buka dialog cetak, bersihkan setelah selesai
  useEffect(() => {
    if (!cetakUlang) return
    const bersihkan = () => setCetakUlang(null)
    window.addEventListener('afterprint', bersihkan, { once: true })
    let raf2
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => window.print())
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
      window.removeEventListener('afterprint', bersihkan)
    }
  }, [cetakUlang])

  async function handleHapus(row) {
    if (!confirm(`Hapus kuitansi jasa nomor "${row.nomor || '-'}"? Tindakan ini tidak bisa dibatalkan.`)) return
    setMenghapus(row.id)
    const { error } = await supabase
      .from('kuitansi')
      .delete()
      .eq('id', row.id)
      .eq('sekolah_id', sekolahId)
    setMenghapus(null)
    if (error) {
      alert('Gagal menghapus: ' + error.message)
      return
    }
    loadData()
  }

  function handleTutupBuat() {
    setShowBuat(false)
    setDataAwal(null)
    loadData()
  }

  function handlePilih(row) {
    setDataAwal(row)
    setShowPilih(false)
    setShowBuat(true)
  }

  // Pemetaan kolom tabel -> prop KuitansiJasaPrintTemplate
  const dataCetak = cetakUlang
    ? {
        no_kwitansi: cetakUlang.nomor,
        tanggal: cetakUlang.tanggal,
        dari: cetakUlang.diterima_dari,
        uang_sejumlah: terbilangRupiah(cetakUlang.jumlah_total),
        untuk_pembayaran: cetakUlang.untuk_pembayaran,
        jumlah: cetakUlang.jumlah_total,
        nama_penerima: cetakUlang.nama_penerima,
        alamat: cetakUlang.alamat_penerima,
      }
    : null

  return (
    <>
      <div className="card relative overflow-hidden p-4 mb-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-blue-700" />
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:flex-wrap w-full sm:w-auto">
            <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-700 items-center justify-center shrink-0 hidden sm:flex">
              <Receipt size={18} />
            </div>
            <div className="relative max-w-xs w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
              <input
                className="input-field pl-9"
                placeholder="Cari nomor, nama, atau keterangan..."
                value={pencarian}
                onChange={(e) => setPencarian(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {tampilkanTarik && (
              <button className="btn-secondary w-full sm:w-auto justify-center" onClick={() => setShowPilih(true)}>
                <ArrowDownToLine size={16} /> Tarik dari Kwitansi
              </button>
            )}
            <button
              className="btn-primary w-full sm:w-auto justify-center"
              onClick={() => {
                setDataAwal(null)
                setShowBuat(true)
              }}
            >
              <Plus size={16} /> Buat Kuitansi Jasa
            </button>
          </div>
        </div>
      </div>

      {errorMsg && <div className="card p-3 mb-4 text-sm text-red-900 bg-red-900/5">{errorMsg}</div>}

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr>
              <th>Nomor</th>
              <th>Tanggal</th>
              <th>Diterima Dari</th>
              <th>Keterangan</th>
              <th>Jumlah</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-ink-700/50">
                  Memuat data...
                </td>
              </tr>
            )}
            {!loading && dataTersaring.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-ink-700/50">
                  <div className="flex flex-col items-center gap-2">
                    <Receipt size={28} className="text-ink-700/25" />
                    <span>Belum ada kuitansi jasa yang cocok.</span>
                  </div>
                </td>
              </tr>
            )}
            {dataTersaring.map((d) => (
              <tr key={d.id} className="hover:bg-emerald-600/[0.03] transition-colors">
                <td className="font-mono text-xs">{d.nomor || '-'}</td>
                <td className="whitespace-nowrap text-xs">{formatTanggal(d.tanggal)}</td>
                <td className="font-medium">{d.diterima_dari || '-'}</td>
                <td className="max-w-[220px] truncate">{d.untuk_pembayaran || '-'}</td>
                <td className="font-semibold text-emerald-700">{formatRupiah(d.jumlah_total)}</td>
                <td>
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      className="p-2.5 sm:p-2 hover:bg-blue-600/10 rounded-lg text-blue-700/70 touch-manipulation"
                      title="Cetak Ulang"
                      onClick={() => setCetakUlang(d)}
                    >
                      <Printer size={15} />
                    </button>
                    <button
                      className="p-2.5 sm:p-2 hover:bg-red-900/10 rounded-lg text-red-900/70 touch-manipulation"
                      title="Hapus"
                      disabled={menghapus === d.id}
                      onClick={() => handleHapus(d)}
                    >
                      {menghapus === d.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPilih && <PilihKuitansiModal onPilih={handlePilih} onClose={() => setShowPilih(false)} />}

      {showBuat && <KuitansiJasaModal sekolah={instansi} dataAwal={dataAwal} onClose={handleTutupBuat} />}

      {/* Dirender lewat portal ke <body> supaya tidak ikut tersembunyi oleh
          pembungkus "no-print" / layout halaman induk saat window.print(). */}
      {dataCetak &&
        createPortal(
          <KuitansiJasaPrintTemplate sekolah={instansi} data={dataCetak} tema={muatTema()} />,
          document.body
        )}
    </>
  )
}
