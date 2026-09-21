 import { useEffect, useRef, useState } from 'react'
 import { useNavigate } from 'react-router-dom'
-import { Loader2, Plus, Trash2 } from 'lucide-react'
+import { Loader2, Plus, Trash2, Send } from 'lucide-react'
 import { useAuth } from '../lib/AuthContext'
+import { supabase } from '../lib/supabaseClient'
 import {
   AreaLembar,
   BagianSK as Bagian,
   BarAtasCetak,
   FieldSK as Field,
   GayaCetakSK,
   HalamanLampiran,
   SEKOLAH_KOSONG,
   ambilGuruDanKelas,
   ambilProfilSekolah,
   inputSK as inputCls,
   isKepalaSekolah,
   isi,
   isoHariIni,
   tahunPelajaranSekarang,
   urutkanGuru,
 } from './CetakSK'

// DaftarHonor — komponen bersama untuk DAFTAR PENERIMAAN HONORARIUM per
// kegiatan (bukan Surat Keputusan): tabel Nama/NIP, Pangkat/Gol, Dibayarkan,
// Pajak PPh 21, Diterima, dan kolom Paraf untuk ditandatangani manual.
// Dipakai misalnya oleh:
//   • Daftar Honor Literasi & Numerasi (pages/DaftarHonorLiterasiNumerasi.jsx)
//
// Bentuk `konfig`: { judulBar, objek, judulDaftar? }

const idBaru = () => Math.random().toString(36).slice(2, 9)
const barisBaru = (guruId = '') => ({
  id: idBaru(),
  guruId,
  nama: '',
  nip: '',
  pangkat: '',
  dibayarkan: '',
  pph21: '0',
})

const rupiah = (n) =>
  (Number(n) || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function DaftarHonor({ konfig }) {
  const navigate = useNavigate()
  const { sekolahId } = useAuth()
  const sudahMuat = useRef(false)

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [sk, setSk] = useState({
    tempat: '',
    tanggal: isoHariIni(),
    tahun: tahunPelajaranSekarang(),
    kegiatan: konfig.objek || '',
    honorSeragam: '',
  })

  const [guru, setGuru] = useState([])
  const [baris, setBaris] = useState(() => [barisBaru()])

  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [ringkas, setRingkas] = useState('')
    const [mengirim, setMengirim] = useState(false)

  // Kirim tiap penerima di daftar sebagai satu baris Kuitansi Jasa (tabel
  // `kuitansi`, jenis='kuitansi_jasa') — persis format yang dibuat
  // KuitansiJasaModal, supaya langsung muncul di riwayat Kuitansi Jasa tanpa
  // perlu "Tarik dari Kuitansi" lagi. Nomor tiap baris diambil dari RPC
  // next_nomor_kuitansi yang sama dipakai kuitansi jasa manual.
  async function kirimKeKuitansiJasa() {
    const dikirim = barisTabel.filter((b) => String(b.nama || '').trim())
    if (dikirim.length === 0) {
      alert('Belum ada penerima yang bisa dikirim. Isi nama penerima terlebih dahulu.')
      return
    }
    if (!confirm(`Kirim ${dikirim.length} penerima ke Kuitansi Jasa? Setiap penerima akan dibuatkan satu kuitansi.`)) return

    setMengirim(true)
    try {
      for (const b of dikirim) {
        const { data: nomorData, error: nomorErr } = await supabase.rpc('next_nomor_kuitansi', { p_jenis: 'kuitansi_jasa' })
        if (nomorErr) throw nomorErr

        const payload = {
          jenis: 'kuitansi_jasa',
          nomor: nomorData,
          no_bukti: '',
          tanggal: sk.tanggal,
          diterima_dari: b.nama,
          untuk_pembayaran: isi(sk.kegiatan, konfig.objek || ''),
          jumlah_total: b.diterima,
          nama_penerima: b.nama,
          alamat_penerima: '',
        }
        const { error: insertErr } = await supabase.from('kuitansi').insert(payload)
        if (insertErr) throw insertErr
      }
      navigate('/kuitansi-jasa')
    } catch (err) {
      alert('Gagal mengirim ke Kuitansi Jasa: ' + err.message)
    } finally {
      setMengirim(false)
    }
  }

  async function muatDariData() {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const [ps, gk] = await Promise.all([ambilProfilSekolah(sekolahId), ambilGuruDanKelas(sekolahId)])
      const urut = urutkanGuru(gk.guru)
      const kepsek = urut.find(isKepalaSekolah)

      setSekolah({
        ...ps.sekolah,
        kepala: ps.sekolah.kepala || kepsek?.nama_lengkap || '',
        nipKepala: ps.sekolah.nipKepala || kepsek?.nip || '',
      })
      if (ps.tempat) setSk((s) => ({ ...s, tempat: s.tempat || ps.tempat }))
      setGuru(urut)
      setRingkas(`${gk.guru.length} guru/pegawai aktif terbaca.`)
      sudahMuat.current = true
    } catch (e) {
      console.error(`Gagal memuat data ${konfig.judulBar}:`, e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  useEffect(() => {
    muatDariData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  const ubahSekolah = (k) => (e) => setSekolah((s) => ({ ...s, [k]: e.target.value }))
  const ubahSk = (k) => (e) => setSk((s) => ({ ...s, [k]: e.target.value }))
  const ubahAngka = (k) => (e) => setSk((s) => ({ ...s, [k]: e.target.value.replace(/\D/g, '') }))
  const ubahBaris = (id, k, nilaiBaru) =>
    setBaris((daftar) => daftar.map((b) => (b.id === id ? { ...b, [k]: nilaiBaru } : b)))
  const ubahBarisAngka = (id, k) => (e) => ubahBaris(id, k, e.target.value.replace(/\D/g, ''))
  const hapusBaris = (id) => setBaris((daftar) => daftar.filter((b) => b.id !== id))

  const guruPerId = {}
  guru.forEach((g) => {
    guruPerId[g.id] = g
  })

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tp = isi(sk.tahun)
  const skCetak = { nomor: '', tempat: sk.tempat, tanggal: sk.tanggal }

  const barisTabel = baris.map((b) => {
    const g = guruPerId[b.guruId]
    const dibayarkan = Number(b.dibayarkan !== '' ? b.dibayarkan : sk.honorSeragam) || 0
    const pph21 = Number(b.pph21) || 0
    return {
      key: b.id,
      nama: g?.nama_lengkap || b.nama,
      nip: g?.nip || b.nip,
      pangkat: b.pangkat || g?.pangkat_golongan || '',
      dibayarkan,
      pph21,
      diterima: dibayarkan - pph21,
    }
  })
  const totalDibayarkan = barisTabel.reduce((j, b) => j + b.dibayarkan, 0)
  const totalPph21 = barisTabel.reduce((j, b) => j + b.pph21, 0)
  const totalDiterima = barisTabel.reduce((j, b) => j + b.diterima, 0)

  return (
    <div className="min-h-screen bg-slate-100">
      <GayaCetakSK />
      <BarAtasCetak onKembali={() => navigate('/gudang-sk')} judul={konfig.judulBar} />

      <div className="no-print max-w-3xl mx-auto px-3 pt-4">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah dan guru…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data guru belum bisa dibaca ({galat}). Anda tetap bisa mengetik nama secara manual.
          </div>
        )}
        {!memuat && !galat && ringkas && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
            {ringkas} {baris.length} orang akan masuk daftar.
          </div>
        )}
                 {!memuat && !galat && ringkas && (
           <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
             {ringkas} {baris.length} orang akan masuk daftar.
           </div>
         )}
+
+        <div className="flex justify-end mb-4">
+          <button
+            type="button"
+            onClick={kirimKeKuitansiJasa}
+            disabled={mengirim || barisTabel.length === 0}
+            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
+          >
+            {mengirim ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
+            Kirim ke Kuitansi Jasa
+          </button>
+        </div>

        <Bagian judul="Data Kegiatan" keterangan="Nama kegiatan, tempat, dan tanggal penandatanganan.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nama kegiatan" className="sm:col-span-2">
              <input className={inputCls} value={sk.kegiatan} onChange={ubahSk('kegiatan')} placeholder="mis. Kegiatan Literasi dan Numerasi" />
            </Field>
            <Field label="Ditandatangani di">
              <input className={inputCls} value={sk.tempat} onChange={ubahSk('tempat')} placeholder="Nama kota/kabupaten" />
            </Field>
            <Field label="Pada tanggal">
              <input type="date" className={inputCls} value={sk.tanggal} onChange={ubahSk('tanggal')} />
            </Field>
            <Field label="Honor per orang, kalau sama semua (Rp)">
              <input
                className={inputCls}
                value={sk.honorSeragam}
                onChange={ubahAngka('honorSeragam')}
                inputMode="numeric"
                placeholder="mis. 500000"
              />
            </Field>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Honor tiap orang bisa diubah sendiri di bagian Penerima di bawah. Kosong berarti memakai honor seragam ini.
          </p>
        </Bagian>

        <Bagian
          judul="Penerima"
          keterangan="Pilih dari Data Guru, atau pilih 'isi manual' untuk orang yang tidak ada di Data Guru."
          aksi={
            <button
              type="button"
              onClick={() => setBaris((d) => [...d, barisBaru()])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700"
            >
              <Plus size={13} /> Tambah orang
            </button>
          }
        >
          {baris.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada penerima. Klik "Tambah orang".</p>
          ) : (
            <div className="space-y-3">
              {baris.map((b, i) => (
                <div key={b.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Nomor {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => hapusBaris(b.id)}
                      aria-label={`Hapus nomor ${i + 1}`}
                      className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Guru/pegawai" className="sm:col-span-2">
                      <select className={inputCls} value={b.guruId} onChange={(e) => ubahBaris(b.id, 'guruId', e.target.value)}>
                        <option value="">— isi manual —</option>
                        {guru.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nama_lengkap || '(tanpa nama)'}
                            {g.nip ? ` — NIP. ${g.nip}` : ''}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {!b.guruId && (
                      <>
                        <Field label="Nama">
                          <input className={inputCls} value={b.nama} onChange={(e) => ubahBaris(b.id, 'nama', e.target.value)} />
                        </Field>
                        <Field label="NIP (kosongkan kalau tidak ada)">
                          <input className={inputCls} value={b.nip} onChange={(e) => ubahBaris(b.id, 'nip', e.target.value)} inputMode="numeric" />
                        </Field>
                        <Field label="Pangkat/Golongan (kosongkan kalau tidak ada)">
                          <input className={inputCls} value={b.pangkat} onChange={(e) => ubahBaris(b.id, 'pangkat', e.target.value)} placeholder="mis. III/a" />
                        </Field>
                      </>
                    )}
                    <Field label="Dibayarkan (Rp)">
                      <input
                        className={inputCls}
                        value={b.dibayarkan}
                        onChange={ubahBarisAngka(b.id, 'dibayarkan')}
                        inputMode="numeric"
                        placeholder={sk.honorSeragam ? `Sama dengan semua: ${sk.honorSeragam}` : 'mis. 500000'}
                      />
                    </Field>
                    <Field label="Pajak PPh 21 (Rp)">
                      <input className={inputCls} value={b.pph21} onChange={ubahBarisAngka(b.id, 'pph21')} inputMode="numeric" />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Bagian>

        <Bagian judul="Kop dan penandatangan" keterangan="Kop dan Kepala Sekolah diambil dari Profil Sekolah.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Baris atas kop (satu baris per garis)" className="sm:col-span-2">
              <textarea className={inputCls} rows={2} value={sekolah.kopAtas} onChange={ubahSekolah('kopAtas')} />
            </Field>
            <Field label="Nama sekolah">
              <input className={inputCls} value={sekolah.nama} onChange={ubahSekolah('nama')} />
            </Field>
            <Field label="NPSN">
              <input className={inputCls} value={sekolah.npsn} onChange={ubahSekolah('npsn')} inputMode="numeric" />
            </Field>
            <Field label="Alamat" className="sm:col-span-2">
              <input className={inputCls} value={sekolah.alamat} onChange={ubahSekolah('alamat')} />
            </Field>
            <Field label="Nama kepala sekolah">
              <input className={inputCls} value={sekolah.kepala} onChange={ubahSekolah('kepala')} />
            </Field>
            <Field label="NIP kepala sekolah">
              <input className={inputCls} value={sekolah.nipKepala} onChange={ubahSekolah('nipKepala')} inputMode="numeric" />
            </Field>
          </div>
        </Bagian>

        <p className="text-xs text-slate-500 mb-2">
          Pratinjau di bawah adalah tampilan yang akan tercetak. Saat mencetak, matikan opsi "Header dan footer" di dialog cetak agar bersih.
        </p>
      </div>

      <AreaLembar>
        <HalamanLampiran
          sk={skCetak}
          sekolah={sekolah}
          judul={[
            konfig.judulDaftar || 'DAFTAR PENERIMAAN HONORARIUM',
            isi(sk.kegiatan, konfig.objek || ''),
            namaSekolah,
            `Tahun Pelajaran ${tp}`,
          ]}
        >
          <table className="sk-tabel">
            <thead>
              <tr>
                <th style={{ width: '6%' }}>No</th>
                <th>Nama / NIP</th>
                <th style={{ width: '13%' }}>Pangkat/Gol</th>
                <th style={{ width: '15%' }}>Dibayarkan</th>
                <th style={{ width: '13%' }}>Pajak PPh 21</th>
                <th style={{ width: '15%' }}>Diterima</th>
                <th style={{ width: '9%' }}>Paraf</th>
              </tr>
            </thead>
            <tbody>
              {barisTabel.length === 0 ? (
                <tr>
                  <td className="c">1</td>
                  <td>…………</td>
                  <td className="c">-</td>
                  <td className="c">…………</td>
                  <td className="c">-</td>
                  <td className="c">…………</td>
                  <td className="c"></td>
                </tr>
              ) : (
                barisTabel.map((b, i) => (
                  <tr key={b.key}>
                    <td className="c">{i + 1}</td>
                    <td>
                      {isi(b.nama)}
                      {b.nip && <div className="text-xs text-slate-500">NIP. {b.nip}</div>}
                    </td>
                    <td className="c">{isi(b.pangkat, '-')}</td>
                    <td className="c">{rupiah(b.dibayarkan)}</td>
                    <td className="c">{b.pph21 ? rupiah(b.pph21) : '-'}</td>
                    <td className="c">{rupiah(b.diterima)}</td>
                    <td className="c"></td>
                  </tr>
                ))
              )}
              {barisTabel.length > 1 && (
                <tr>
                  <td colSpan={3} className="c">
                    <strong>Jumlah</strong>
                  </td>
                  <td className="c">
                    <strong>{rupiah(totalDibayarkan)}</strong>
                  </td>
                  <td className="c">
                    <strong>{totalPph21 ? rupiah(totalPph21) : '-'}</strong>
                  </td>
                  <td className="c">
                    <strong>{rupiah(totalDiterima)}</strong>
                  </td>
                  <td className="c"></td>
                </tr>
              )}
            </tbody>
          </table>
        </HalamanLampiran>
      </AreaLembar>
    </div>
  )
}
