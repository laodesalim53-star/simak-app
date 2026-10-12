import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { X, Loader2, Printer } from 'lucide-react'
import KuitansiJasaPrintTemplate from '../lib/KuitansiJasaPrintTemplate'
import PilihanTampilanCetak from '../components/PilihanTampilanCetak'
import { muatTema, simpanTema } from '../lib/kuitansiJasaTema'
import { terbilangRupiah } from '../lib/terbilang'

const emptyForm = (dataAwal) => ({
  no_bukti: dataAwal?.no_bukti || '',
  tanggal: dataAwal?.tanggal || new Date().toISOString().slice(0, 10),
  diterima_dari: dataAwal?.diterima_dari || '',
  jumlah: dataAwal?.jumlah_total || '',
  untuk_pembayaran: dataAwal?.untuk_pembayaran || '',
  nama_penerima: dataAwal?.nama_penerima || '',
  alamat_penerima: dataAwal?.alamat_penerima || '',
})

/**
 * Form untuk membuat Kuitansi Jasa (transport, honor kegiatan, dsb).
 * Dipakai oleh tenant sekolah (KuitansiJasa.jsx) maupun puskesmas
 * (bok/TabKuitansiJasa.jsx).
 *
 * Disimpan ke tabel `kuitansi` dengan jenis = 'kuitansi_jasa' dan
 * sekolah_id milik tenant yang sedang login.
 *
 * Props:
 *   sekolah  : { nama, alamat, kota }  (nama instansi untuk template cetak)
 *   dataAwal : baris kuitansi sumber ("Tarik dari Kuitansi"), opsional
 *   onClose  : dipanggil saat modal ditutup
 *
 * PENOMORAN: kuitansi manual memakai RPC next_nomor_kuitansi. Hasil "Tarik"
 * memakai No. Bukti sumbernya apa adanya.
 *
 * TAMPILAN CETAK: preferensi warna & tata letak disimpan di localStorage
 * (lib/kuitansiJasaTema.js), tidak ikut disimpan ke tabel.
 */
export default function KuitansiJasaModal({ sekolah, dataAwal, onClose }) {
  const { sekolahId } = useAuth()
  const [form, setForm] = useState(emptyForm(dataAwal))
  const [saving, setSaving] = useState(false)
  const [savedData, setSavedData] = useState(null)
  const [tema, setTema] = useState(() => muatTema())
  const printRef = useRef(null)

  function ubah(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function ubahTema(temaBaru) {
    setTema(temaBaru)
    simpanTema(temaBaru)
  }

  async function handleSimpan(e) {
    e.preventDefault()
    if (!sekolahId) {
      alert('Data tenant belum siap. Muat ulang halaman lalu coba lagi.')
      return
    }
    setSaving(true)
    try {
      const dariTarik = !!dataAwal && !!form.no_bukti
      let nomorFinal

      if (dariTarik) {
        nomorFinal = form.no_bukti
      } else {
        const { data: nomorData, error: nomorErr } = await supabase.rpc('next_nomor_kuitansi', {
          p_jenis: 'kuitansi_jasa',
        })
        if (nomorErr) throw nomorErr
        nomorFinal = nomorData
      }

      const payload = {
        sekolah_id: sekolahId,
        jenis: 'kuitansi_jasa',
        nomor: nomorFinal,
        no_bukti: form.no_bukti,
        tanggal: form.tanggal,
        diterima_dari: form.diterima_dari,
        untuk_pembayaran: form.untuk_pembayaran,
        jumlah_total: Number(form.jumlah) || 0,
        nama_penerima: form.nama_penerima,
        alamat_penerima: form.alamat_penerima,
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('kuitansi')
        .insert(payload)
        .select()
        .single()
      if (insertErr) throw insertErr

      setSavedData(inserted)
    } catch (err) {
      alert('Gagal menyimpan kuitansi jasa: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (savedData) {
      // beri waktu render sebelum memanggil dialog cetak
      const t = setTimeout(() => window.print(), 150)
      return () => clearTimeout(t)
    }
  }, [savedData])

  // Pemetaan kolom tabel -> prop KuitansiJasaPrintTemplate
  const dataCetak = savedData
    ? {
        no_kwitansi: savedData.nomor,
        tanggal: savedData.tanggal,
        dari: savedData.diterima_dari,
        uang_sejumlah: terbilangRupiah(savedData.jumlah_total),
        untuk_pembayaran: savedData.untuk_pembayaran,
        jumlah: savedData.jumlah_total,
        nama_penerima: savedData.nama_penerima,
        alamat: savedData.alamat_penerima,
      }
    : null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 no-print">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Buat Kuitansi Jasa</h2>
            <button className="icon-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSimpan} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">No. Bukti (opsional)</label>
                <input
                  className="input-field"
                  placeholder="Contoh: BNU-12"
                  value={form.no_bukti}
                  onChange={(e) => ubah('no_bukti', e.target.value)}
                />
              </div>
              <div>
                <label className="label-field">Tanggal</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.tanggal}
                  onChange={(e) => ubah('tanggal', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label-field">Telah Terima Dari</label>
              <input
                className="input-field"
                placeholder="Nama orang / pihak pembayar"
                value={form.diterima_dari}
                onChange={(e) => ubah('diterima_dari', e.target.value)}
              />
            </div>

            <div>
              <label className="label-field">Jumlah (Rp)</label>
              <input
                type="number"
                min="0"
                className="input-field"
                placeholder="Contoh: 250000"
                value={form.jumlah}
                onChange={(e) => ubah('jumlah', e.target.value)}
              />
              {form.jumlah > 0 && (
                <p className="text-xs text-ink-700/50 mt-1 italic">Terbilang: {terbilangRupiah(form.jumlah)}</p>
              )}
            </div>

            <div>
              <label className="label-field">Untuk Pembayaran / Keterangan</label>
              <input
                className="input-field"
                placeholder="Contoh: Transport kegiatan posyandu"
                value={form.untuk_pembayaran}
                onChange={(e) => ubah('untuk_pembayaran', e.target.value)}
              />
            </div>

            <div>
              <label className="label-field">Yang Menerima (nama)</label>
              <input
                className="input-field"
                placeholder="Nama penerima uang"
                value={form.nama_penerima}
                onChange={(e) => ubah('nama_penerima', e.target.value)}
              />
            </div>

            <div>
              <label className="label-field">Alamat Penerima (opsional)</label>
              <input
                className="input-field"
                placeholder="Contoh: Waria, Kec. Aru Utara"
                value={form.alamat_penerima}
                onChange={(e) => ubah('alamat_penerima', e.target.value)}
              />
            </div>

            <div className="border border-ink-700/15 rounded-lg p-3">
              <div className="text-sm font-medium mb-2">Tampilan Cetak</div>
              <PilihanTampilanCetak value={tema} onChange={ubahTema} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                Simpan & Cetak
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Dirender lewat portal ke <body>, di luar modal "no-print" dan di luar
          layout halaman induk, sehingga lembar ini tidak ikut tersembunyi
          saat window.print() dipanggil. */}
      {dataCetak &&
        createPortal(
          <KuitansiJasaPrintTemplate ref={printRef} sekolah={sekolah} data={dataCetak} tema={tema} />,
          document.body
        )}
    </>
  )
}
