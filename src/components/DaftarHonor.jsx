import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Trash2, ArrowDownToLine, CheckSquare, Square, Users, Search } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
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
//
// ALUR: Daftar Honor tidak membuat data baru — baris penerima ditarik dari
// sumber yang sudah ada, lewat dua panel pemilih (checkbox):
//   1) "Tarik dari Kuitansi Jasa" — dari tabel `kuitansi` (jenis=
//      'kuitansi_jasa') yang sudah dibuat; nominal ikut nominal kuitansi.
//   2) "Tarik dari Data Guru" — dari Data Guru & Kelas; nominal dikosongkan
//      dan diisi manual (dipakai kalau belum ada kuitansinya, mis. untuk
//      menyusun daftar pengawas/panitia dulu sebelum kuitansi dibuat).
// NIP & Pangkat/Gol pada baris hasil tarik kuitansi dicoba dicocokkan
// otomatis dari Data Guru berdasarkan nama; semua field tetap bisa diedit.
//
// Dipakai misalnya oleh:
//   • Daftar Honor Literasi & Numerasi (pages/DaftarHonorLiterasiNumerasi.jsx)
//   • Daftar Honor Pengawas Asesmen (pages/DaftarHonorPengawasAsesmen.jsx)
//   • Daftar Honor Panitia Ujian (pages/DaftarHonorPanitiaUjian.jsx)
//   • Daftar Honor Panitia PPDB (pages/DaftarHonorPanitiaPPDB.jsx)
//
// Bentuk `konfig`: { judulBar, objek, judulDaftar? }

const rupiah = (n) =>
  (Number(n) || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Cocokkan nama kuitansi ke Data Guru (contains, tanpa memandang besar/kecil
// huruf) supaya NIP & Pangkat/Gol bisa terisi otomatis saat ditarik.
function cariGuruPerNama(guru, nama) {
  const target = String(nama || '').trim().toLowerCase()
  if (!target) return null
  return (
    guru.find((g) => String(g.nama_lengkap || '').trim().toLowerCase() === target) ||
    guru.find((g) => String(g.nama_lengkap || '').toLowerCase().includes(target)) ||
    null
  )
}

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
  })

  const [guru, setGuru] = useState([])
  const [kelas, setKelas] = useState([]) // dipakai untuk memetakan wali_kelas_id -> nama_kelas
  const [baris, setBaris] = useState([]) // hasil tarik dari kuitansi jasa / data guru

  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [ringkas, setRingkas] = useState('')

  // --- Panel pemilih kuitansi jasa ---
  const [tampilkanPemilih, setTampilkanPemilih] = useState(false)
  const [daftarKuitansi, setDaftarKuitansi] = useState([])
  const [memuatKuitansi, setMemuatKuitansi] = useState(false)
  const [galatKuitansi, setGalatKuitansi] = useState('')
  const [pilihanTarik, setPilihanTarik] = useState(() => new Set())

  // --- Panel pemilih Data Guru (per kelas) ---
  const [tampilkanPemilihGuru, setTampilkanPemilihGuru] = useState(false)
  const [pilihanGuru, setPilihanGuru] = useState(() => new Set())
  const [carianGuru, setCarianGuru] = useState('')

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
      setKelas(gk.kelas || [])
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

  async function muatDaftarKuitansi() {
    setMemuatKuitansi(true)
    setGalatKuitansi('')
    try {
      const { data, error } = await supabase
        .from('kuitansi')
        .select('*')
        .eq('jenis', 'kuitansi_jasa')
        .order('tanggal', { ascending: false })
        .limit(300)
      if (error) throw error
      setDaftarKuitansi(data || [])
    } catch (e) {
      console.error('Gagal memuat daftar kuitansi jasa:', e)
      setGalatKuitansi(e?.message || 'Daftar kuitansi jasa tidak dapat dibaca.')
    } finally {
      setMemuatKuitansi(false)
    }
  }

  function bukaPemilih() {
    setTampilkanPemilih(true)
    setPilihanTarik(new Set())
    muatDaftarKuitansi()
  }
  function tutupPemilih() {
    setTampilkanPemilih(false)
  }
  function toggleCentang(id) {
    setPilihanTarik((prev) => {
      const baru = new Set(prev)
      if (baru.has(id)) baru.delete(id)
      else baru.add(id)
      return baru
    })
  }

  const idSudahDitarik = new Set(baris.map((b) => b.kuitansiId).filter(Boolean))
  const kuitansiBisaDitarik = daftarKuitansi.filter((k) => !idSudahDitarik.has(k.id))
  const semuaTercentang = kuitansiBisaDitarik.length > 0 && kuitansiBisaDitarik.every((k) => pilihanTarik.has(k.id))

  function toggleSemua() {
    setPilihanTarik((prev) => {
      if (semuaTercentang) return new Set()
      return new Set(kuitansiBisaDitarik.map((k) => k.id))
    })
  }

  function tarikTerpilih() {
    const terpilih = daftarKuitansi.filter((k) => pilihanTarik.has(k.id))
    if (terpilih.length === 0) return

    const barisBaru = terpilih.map((k) => {
      const nama = k.nama_penerima || k.diterima_dari || ''
      const cocok = cariGuruPerNama(guru, nama)
      return {
        id: `k-${k.id}`,
        kuitansiId: k.id,
        guruId: null,
        nomorKuitansi: k.nomor || k.no_bukti || '',
        nama,
        nip: cocok?.nip || '',
        pangkat: cocok?.pangkat_golongan || '',
        dibayarkan: String(k.jumlah_total ?? ''),
        pph21: '0',
      }
    })

    setBaris((d) => [...d, ...barisBaru])
    setRingkas(`${barisBaru.length} orang ditarik dari Kuitansi Jasa.`)
    setTampilkanPemilih(false)
    setPilihanTarik(new Set())
  }

  // --- Data Guru: grup per kelas (kalau field kelas tersedia) ---
  const idGuruSudahDitarik = new Set(baris.map((b) => b.guruId).filter(Boolean))
  const guruBisaDitarik = useMemo(() => {
    const kata = carianGuru.trim().toLowerCase()
    return guru
      .filter((g) => !idGuruSudahDitarik.has(g.id))
      .filter((g) => !kata || String(g.nama_lengkap || '').toLowerCase().includes(kata))
  }, [guru, carianGuru, baris])

  // wali_kelas_id -> nama_kelas, dari tabel `kelas` (satu guru = wali dari
  // satu kelas). Guru yang bukan wali kelas manapun (mis. guru mapel) tidak
  // akan punya kecocokan di sini dan masuk grup "Tanpa kelas".
  const kelasPerGuru = useMemo(() => {
    const peta = new Map()
    kelas.forEach((k) => {
      if (k.wali_kelas_id) peta.set(k.wali_kelas_id, k.nama_kelas)
    })
    return peta
  }, [kelas])

  const kelompokGuru = useMemo(() => {
    const peta = new Map()
    guruBisaDitarik.forEach((g) => {
      const label = kelasPerGuru.get(g.id) || 'Tanpa kelas'
      if (!peta.has(label)) peta.set(label, [])
      peta.get(label).push(g)
    })
    return Array.from(peta.entries())
      .sort((a, b) => {
        if (a[0] === 'Tanpa kelas') return 1
        if (b[0] === 'Tanpa kelas') return -1
        return a[0].localeCompare(b[0], 'id')
      })
      .map(([label, anggota]) => ({ label, anggota }))
  }, [guruBisaDitarik, kelasPerGuru])

  const semuaGuruTercentang = guruBisaDitarik.length > 0 && guruBisaDitarik.every((g) => pilihanGuru.has(g.id))

  function bukaPemilihGuru() {
    setTampilkanPemilihGuru(true)
    setPilihanGuru(new Set())
    setCarianGuru('')
  }
  function tutupPemilihGuru() {
    setTampilkanPemilihGuru(false)
  }
  function toggleCentangGuru(id) {
    setPilihanGuru((prev) => {
      const baru = new Set(prev)
      if (baru.has(id)) baru.delete(id)
      else baru.add(id)
      return baru
    })
  }
  function toggleSemuaGuru() {
    setPilihanGuru((prev) => {
      if (semuaGuruTercentang) return new Set()
      return new Set(guruBisaDitarik.map((g) => g.id))
    })
  }
  function toggleSemuaKelompok(anggota) {
    setPilihanGuru((prev) => {
      const baru = new Set(prev)
      const semuaAdaDiKelompok = anggota.every((g) => baru.has(g.id))
      anggota.forEach((g) => (semuaAdaDiKelompok ? baru.delete(g.id) : baru.add(g.id)))
      return baru
    })
  }

  function tarikGuruTerpilih() {
    const terpilih = guru.filter((g) => pilihanGuru.has(g.id))
    if (terpilih.length === 0) return

    const barisBaru = terpilih.map((g) => ({
      id: `g-${g.id}`,
      kuitansiId: null,
      guruId: g.id,
      nomorKuitansi: '',
      nama: g.nama_lengkap || '',
      nip: g.nip || '',
      pangkat: g.pangkat_golongan || '',
      dibayarkan: '',
      pph21: '0',
    }))

    setBaris((d) => [...d, ...barisBaru])
    setRingkas(`${barisBaru.length} orang ditarik dari Data Guru. Isi nominal "Dibayarkan" secara manual.`)
    setTampilkanPemilihGuru(false)
    setPilihanGuru(new Set())
  }

  const ubahSekolah = (k) => (e) => setSekolah((s) => ({ ...s, [k]: e.target.value }))
  const ubahSk = (k) => (e) => setSk((s) => ({ ...s, [k]: e.target.value }))
  const ubahBaris = (id, k, nilaiBaru) =>
    setBaris((daftar) => daftar.map((b) => (b.id === id ? { ...b, [k]: nilaiBaru } : b)))
  const ubahBarisAngka = (id, k) => (e) => ubahBaris(id, k, e.target.value.replace(/\D/g, ''))
  const hapusBaris = (id) => setBaris((daftar) => daftar.filter((b) => b.id !== id))

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tp = isi(sk.tahun)
  const skCetak = { nomor: '', tempat: sk.tempat, tanggal: sk.tanggal }

  const barisTabel = baris.map((b) => {
    const dibayarkan = Number(b.dibayarkan) || 0
    const pph21 = Number(b.pph21) || 0
    return {
      key: b.id,
      nomorKuitansi: b.nomorKuitansi,
      guruId: b.guruId,
      nama: b.nama,
      nip: b.nip,
      pangkat: b.pangkat,
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
            Data guru belum bisa dibaca ({galat}). Pencocokan NIP/Pangkat otomatis dan "Tarik dari Data Guru" mungkin tidak lengkap.
          </div>
        )}
        {!memuat && !galat && ringkas && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
            {ringkas}
          </div>
        )}

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
          </div>
        </Bagian>

        <Bagian
          judul="Penerima"
          keterangan="Tarik dari Kuitansi Jasa yang sudah dibuat, atau tarik langsung dari Data Guru kalau kuitansinya belum ada."
          aksi={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={bukaPemilihGuru}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
              >
                <Users size={13} /> Tarik dari Data Guru
              </button>
              <button
                type="button"
                onClick={bukaPemilih}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <ArrowDownToLine size={13} /> Tarik dari Kuitansi Jasa
              </button>
            </div>
          }
        >
          {baris.length === 0 ? (
            <p className="text-sm text-slate-500">
              Belum ada penerima. Klik "Tarik dari Data Guru" atau "Tarik dari Kuitansi Jasa" di atas untuk mulai mengisi daftar.
            </p>
          ) : (
            <div className="space-y-3">
              {baris.map((b, i) => (
                <div key={b.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">
                      Nomor {i + 1}
                      {b.nomorKuitansi && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                          dari kuitansi {b.nomorKuitansi}
                        </span>
                      )}
                      {!b.nomorKuitansi && b.guruId && (
                        <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-600">
                          dari Data Guru
                        </span>
                      )}
                    </span>
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
                    <Field label="Nama">
                      <input className={inputCls} value={b.nama} onChange={(e) => ubahBaris(b.id, 'nama', e.target.value)} />
                    </Field>
                    <Field label="NIP (kosongkan kalau tidak ada)">
                      <input className={inputCls} value={b.nip} onChange={(e) => ubahBaris(b.id, 'nip', e.target.value)} inputMode="numeric" />
                    </Field>
                    <Field label="Pangkat/Golongan (kosongkan kalau tidak ada)">
                      <input className={inputCls} value={b.pangkat} onChange={(e) => ubahBaris(b.id, 'pangkat', e.target.value)} placeholder="mis. III/a" />
                    </Field>
                    <Field label="Dibayarkan (Rp)">
                      <input className={inputCls} value={b.dibayarkan} onChange={ubahBarisAngka(b.id, 'dibayarkan')} inputMode="numeric" />
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

      {/* Panel pemilih kuitansi jasa */}
      {tampilkanPemilih && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Tarik dari Kuitansi Jasa</h3>
              <button type="button" onClick={tutupPemilih} className="text-slate-400 hover:text-slate-600 text-sm">
                Tutup
              </button>
            </div>

            {memuatKuitansi && (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
                <Loader2 size={16} className="animate-spin" /> Memuat daftar kuitansi jasa…
              </div>
            )}
            {!memuatKuitansi && galatKuitansi && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 mb-3">
                {galatKuitansi}
              </div>
            )}
            {!memuatKuitansi && !galatKuitansi && kuitansiBisaDitarik.length === 0 && (
              <p className="text-sm text-slate-500 py-6 text-center">
                Tidak ada kuitansi jasa yang bisa ditarik (semua sudah dipakai, atau belum ada kuitansi jasa yang dibuat).
              </p>
            )}

            {!memuatKuitansi && kuitansiBisaDitarik.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={toggleSemua}
                  className="self-start mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900"
                >
                  {semuaTercentang ? <CheckSquare size={14} /> : <Square size={14} />}
                  Pilih semua
                </button>
                <div className="overflow-y-auto flex-1 border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {kuitansiBisaDitarik.map((k) => {
                    const dicentang = pilihanTarik.has(k.id)
                    return (
                      <label
                        key={k.id}
                        className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 ${dicentang ? 'bg-blue-50' : ''}`}
                      >
                        <input type="checkbox" className="mt-1" checked={dicentang} onChange={() => toggleCentang(k.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-slate-800 truncate">
                              {k.nama_penerima || k.diterima_dari || '(tanpa nama)'}
                            </span>
                            <span className="text-sm text-slate-600 whitespace-nowrap">{rupiah(k.jumlah_total)}</span>
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            No. {k.nomor || k.no_bukti || '-'} · {k.tanggal} · {k.untuk_pembayaran || '-'}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-600" onClick={tutupPemilih}>
                Batal
              </button>
              <button
                type="button"
                onClick={tarikTerpilih}
                disabled={pilihanTarik.size === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <ArrowDownToLine size={15} />
                Tarik {pilihanTarik.size > 0 ? `${pilihanTarik.size} orang` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel pemilih Data Guru (per kelas) */}
      {tampilkanPemilihGuru && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Tarik dari Data Guru</h3>
              <button type="button" onClick={tutupPemilihGuru} className="text-slate-400 hover:text-slate-600 text-sm">
                Tutup
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${inputCls} pl-8`}
                  placeholder="Cari nama guru/pegawai…"
                  value={carianGuru}
                  onChange={(e) => setCarianGuru(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={toggleSemuaGuru}
                className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-blue-700 hover:text-blue-900"
              >
                {semuaGuruTercentang ? <CheckSquare size={14} /> : <Square size={14} />}
                Pilih semua
              </button>
            </div>

            {guruBisaDitarik.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                {guru.length === 0
                  ? 'Data guru belum bisa dibaca.'
                  : 'Tidak ada nama yang cocok, atau semua guru sudah ada di daftar.'}
              </p>
            ) : (
              <div className="overflow-y-auto flex-1 border border-slate-200 rounded-lg">
                {kelompokGuru.map(({ label, anggota }) => (
                  <div key={label} className="border-b border-slate-100 last:border-b-0">
                    <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5">
                      <span className="text-xs font-semibold text-slate-500">
                        {label === 'Tanpa kelas' ? label : `Wali Kelas ${label}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSemuaKelompok(anggota)}
                        className="text-[11px] font-medium text-blue-700 hover:text-blue-900"
                      >
                        Pilih semua di grup ini
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {anggota.map((g) => {
                        const dicentang = pilihanGuru.has(g.id)
                        return (
                          <label
                            key={g.id}
                            className={`flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 ${dicentang ? 'bg-blue-50' : ''}`}
                          >
                            <input type="checkbox" className="mt-1" checked={dicentang} onChange={() => toggleCentangGuru(g.id)} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-slate-800 truncate block">{g.nama_lengkap || '(tanpa nama)'}</span>
                              <span className="text-xs text-slate-500 truncate block">
                                {g.nip ? `NIP. ${g.nip}` : 'Tanpa NIP'}
                                {g.pangkat_golongan ? ` · ${g.pangkat_golongan}` : ''}
                              </span>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-600" onClick={tutupPemilihGuru}>
                Batal
              </button>
              <button
                type="button"
                onClick={tarikGuruTerpilih}
                disabled={pilihanGuru.size === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Users size={15} />
                Tarik {pilihanGuru.size > 0 ? `${pilihanGuru.size} orang` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

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
