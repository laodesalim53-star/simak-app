// src/pages/JadwalPengawasRuangUjian.jsx
//
// Jadwal pengawas ruang ujian/asesmen. Format mengikuti dokumen
// "JADWAL PENGAWAS RUANG ASESMEN": tabel No | Hari/Tanggal | Waktu |
// Mata Pelajaran | Ruang | Kode Pengawas (dua pengawas per sesi), lalu daftar
// kode pengawas (A, B, C, ...) di kiri bawah dan tanda tangan Kepala Sekolah
// di kanan bawah.
//
// Pola sama dengan DaftarHadirSiswaUjian.jsx / DaftarHadirPengawasUjian.jsx:
// - Kop resmi (Pemerintah Kabupaten > Dinas > Nama Sekolah > Kecamatan) dengan
//   logo kabupaten (kiri) dan logo sekolah (kanan), diambil otomatis dari
//   profil_sekolah (kolom logo_kabupaten_path & logo_path, bucket
//   'profil-sekolah'). Field kop tetap bisa diubah manual; isian yang sudah
//   diketik TIDAK ditimpa saat data dimuat ulang.
// - Nama Kepala Sekolah & NIP dari ambilProfilSekolah, pengawas dipilih dari
//   data guru (ambilGuruDanKelas).
// - CSS cetak mode satu halaman, teks hitam, Times New Roman.
//
// CATATAN:
// - Kode pengawas dibuat otomatis mengikuti urutan daftar "Pengawas ruang"
//   (baris 1 = A, baris 2 = B, dst.). Menghapus/menukar baris pengawas
//   otomatis memperbarui kode di tabel jadwal.
// - Nomor, Hari/Tanggal, dan Ruang digabung (rowSpan) per hari, seperti di
//   dokumen aslinya.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Printer, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import {
  BagianSK as Bagian,
  FieldSK as Field,
  SEKOLAH_KOSONG,
  ambilGuruDanKelas,
  ambilProfilSekolah,
  inputSK as inputCls,
  isi,
  isoHariIni,
  tahunPelajaranSekarang,
  urutkanGuru,
} from '../components/CetakSK'

// Path file di bucket 'profil-sekolah' -> URL publik (kosong kalau tidak ada).
function urlLogo(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('profil-sekolah').getPublicUrl(path)
  return data?.publicUrl || ''
}

// "Senin, 4 Mei 2026"
function formatHariTanggal(iso) {
  if (!iso) return '…………'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// "01 Mei 2026" (untuk tanggal surat)
function formatTanggalSurat(iso) {
  if (!iso) return '…………'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Hari kerja berikutnya (lewati Sabtu/Minggu), format yyyy-mm-dd.
function hariKerjaBerikutnya(iso) {
  if (!iso) return isoHariIni()
  const d = new Date(`${iso}T00:00:00`)
  do {
    d.setDate(d.getDate() + 1)
  } while (d.getDay() === 0 || d.getDay() === 6)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Kode pengawas: 0 -> A, 1 -> B, ... (lewat Z pakai angka).
const kodeUrut = (i) => (i < 26 ? String.fromCharCode(65 + i) : String(i + 1))

const WAKTU_DEFAULT = ['08.00 – 10.00', '10.30 – 12.00']

const idBaru = () => Math.random().toString(36).slice(2, 9)
const pengawasBaru = () => ({ id: idBaru(), guruId: '' })
const sesiBaru = (i = 0) => ({ id: idBaru(), waktu: WAKTU_DEFAULT[i] || '', mapel: '', p1: '', p2: '' })
const hariBaru = (tanggal, ruang = 'I') => ({
  id: idBaru(),
  tanggal,
  ruang,
  sesi: [sesiBaru(0), sesiBaru(1)],
})

export default function JadwalPengawasRuangUjian() {
  // Aman untuk dua bentuk AuthContext: `sekolahId` langsung, atau lewat profil.sekolah_id.
  const { sekolahId: sekolahIdCtx, profil } = useAuth()
  const sekolahId = sekolahIdCtx || profil?.sekolah_id

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [guru, setGuru] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [logoSekolahUrl, setLogoSekolahUrl] = useState('')
  const [logoKabupatenUrl, setLogoKabupatenUrl] = useState('')

  const [form, setForm] = useState({
    kabupaten: '',
    dinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    kecamatan: '',
    jenisUjian: 'Asesmen',
    tapel: tahunPelajaranSekarang(),
    tempat: '',
    tanggalSurat: isoHariIni(),
  })

  const [pengawas, setPengawas] = useState([pengawasBaru(), pengawasBaru()])
  const [hari, setHari] = useState(() => [hariBaru(isoHariIni())])

  async function muat() {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const [ps, gk, profRes] = await Promise.all([
        ambilProfilSekolah(sekolahId),
        ambilGuruDanKelas(sekolahId),
        supabase
          .from('profil_sekolah')
          .select('kabupaten, dinas_pendidikan, kecamatan, alamat, logo_path, logo_kabupaten_path')
          .eq('sekolah_id', sekolahId)
          .maybeSingle(),
      ])
      const prof = profRes?.data || {}
      setLogoSekolahUrl(urlLogo(prof.logo_path))
      setLogoKabupatenUrl(urlLogo(prof.logo_kabupaten_path))
      setSekolah(ps.sekolah)
      setGuru(urutkanGuru(gk.guru))
      setForm((f) => ({
        ...f,
        kabupaten: f.kabupaten || prof.kabupaten || '',
        dinas: prof.dinas_pendidikan || f.dinas,
        kecamatan: f.kecamatan || prof.kecamatan || '',
      }))
    } catch (e) {
      console.error('Gagal memuat data Jadwal Pengawas Ruang:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  useEffect(() => {
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  const ubah = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const guruPerId = useMemo(() => {
    const m = {}
    guru.forEach((g) => { m[g.id] = g })
    return m
  }, [guru])

  // id baris pengawas -> { kode, guru }. Hanya baris yang sudah memilih guru
  // yang bisa dipakai di jadwal, tapi kode tetap mengikuti urutan baris.
  const infoPengawas = useMemo(() => {
    const m = {}
    pengawas.forEach((p, i) => { m[p.id] = { kode: kodeUrut(i), guru: guruPerId[p.guruId] } })
    return m
  }, [pengawas, guruPerId])

  const pengawasTerpilih = useMemo(
    () => pengawas.filter((p) => guruPerId[p.guruId]),
    [pengawas, guruPerId]
  )

  // --- Kelola pengawas ---
  const tambahPengawas = () => setPengawas((d) => [...d, pengawasBaru()])
  const ubahPengawas = (id, guruId) => setPengawas((d) => d.map((p) => (p.id === id ? { ...p, guruId } : p)))
  const hapusPengawas = (id) => {
    setPengawas((d) => d.filter((p) => p.id !== id))
    // Bersihkan rujukan ke pengawas yang dihapus di jadwal.
    setHari((d) =>
      d.map((h) => ({
        ...h,
        sesi: h.sesi.map((s) => ({ ...s, p1: s.p1 === id ? '' : s.p1, p2: s.p2 === id ? '' : s.p2 })),
      }))
    )
  }

  // --- Kelola jadwal ---
  const tambahHari = () =>
    setHari((d) => {
      const terakhir = d[d.length - 1]
      return [...d, hariBaru(hariKerjaBerikutnya(terakhir?.tanggal), terakhir?.ruang || 'I')]
    })
  const hapusHari = (hid) => setHari((d) => d.filter((h) => h.id !== hid))
  const ubahHari = (hid, k, v) => setHari((d) => d.map((h) => (h.id === hid ? { ...h, [k]: v } : h)))

  const tambahSesi = (hid) =>
    setHari((d) => d.map((h) => (h.id === hid ? { ...h, sesi: [...h.sesi, sesiBaru(h.sesi.length)] } : h)))
  const hapusSesi = (hid, sid) =>
    setHari((d) =>
      d.map((h) => (h.id === hid && h.sesi.length > 1 ? { ...h, sesi: h.sesi.filter((s) => s.id !== sid) } : h))
    )
  const ubahSesi = (hid, sid, k, v) =>
    setHari((d) =>
      d.map((h) => (h.id === hid ? { ...h, sesi: h.sesi.map((s) => (s.id === sid ? { ...s, [k]: v } : s)) } : h))
    )

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')

  return (
    <Layout title="Jadwal Pengawas Ruang" subtitle="Jadwal pengawas ruang ujian/asesmen, siap cetak.">
      <style>{`
        @page { size: A4; margin: 12mm 16mm; }
        @media print {
          body * { visibility: hidden; }
          #area-cetak-jadwal, #area-cetak-jadwal * { visibility: visible; }
          #area-cetak-jadwal {
            position: absolute; left: 0; top: 0; width: 100%;
            border: 0 !important; border-radius: 0 !important; padding: 0 !important;
            max-width: none !important; margin: 0 !important;
            font-family: 'Times New Roman', Times, serif;
            color: #000 !important;
          }
          #area-cetak-jadwal .kop-surat { border-bottom-color: #000 !important; }
          #area-cetak-jadwal .ttd-blok { page-break-inside: avoid; }
          #area-cetak-jadwal * { color: #000 !important; }
          #area-cetak-jadwal table { border-color: #000 !important; }
          #area-cetak-jadwal th, #area-cetak-jadwal td { border-color: #000 !important; }
          #area-cetak-jadwal thead { display: table-header-group; }
          #area-cetak-jadwal tr { page-break-inside: avoid; }
          #area-cetak-jadwal thead tr { background: #fff !important; }

          /* === MODE SATU HALAMAN === */
          /* Ukuran huruf cetak: turunkan lagi kalau isi masih meluber. */
          #area-cetak-jadwal { font-size: 10.5pt !important; line-height: 1.3 !important; break-inside: avoid; }
          #area-cetak-jadwal .kop-surat { padding-bottom: 6px !important; margin-bottom: 10px !important; }
          #area-cetak-jadwal .kop-logo { width: 60px !important; height: 60px !important; }
          #area-cetak-jadwal .judul-blok { margin-bottom: 10px !important; }
          #area-cetak-jadwal .info-blok { margin-bottom: 8px !important; }
          #area-cetak-jadwal td, #area-cetak-jadwal th { padding: 2px 6px !important; }
        }
        /* Kunci gambar kop supaya tidak kebawa aturan CSS global (position:fixed dll). */
        #area-cetak-jadwal .kop-logo img {
          position: static !important; float: none !important;
          display: block; max-width: 100%; max-height: 100%; object-fit: contain;
        }
      `}</style>

      <div className="no-print max-w-3xl mx-auto mb-5">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah dan guru…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data belum bisa dibaca ({galat}).
          </div>
        )}

        <Bagian judul="Kop surat" keterangan="Terisi otomatis dari Profil Sekolah; bisa diubah di sini, kosongkan yang tidak perlu ditampilkan.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Pemerintah Kabupaten/Kota">
              <input className={inputCls} value={form.kabupaten} onChange={ubah('kabupaten')} placeholder="PEMERINTAH KABUPATEN …" />
            </Field>
            <Field label="Dinas">
              <input className={inputCls} value={form.dinas} onChange={ubah('dinas')} />
            </Field>
            <Field label="Kecamatan">
              <input className={inputCls} value={form.kecamatan} onChange={ubah('kecamatan')} placeholder="KECAMATAN …" />
            </Field>
            <Field label="Jenis ujian">
              <input className={inputCls} value={form.jenisUjian} onChange={ubah('jenisUjian')} placeholder="Asesmen" />
            </Field>
            <Field label="Tahun pelajaran">
              <input className={inputCls} value={form.tapel} onChange={ubah('tapel')} placeholder="2025/2026" />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Pengawas ruang"
          keterangan="Pilih guru; kode (A, B, C, …) dibuat otomatis sesuai urutan dan dipakai di tabel jadwal."
          aksi={
            <button
              type="button"
              onClick={tambahPengawas}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700"
            >
              <Plus size={13} /> Tambah pengawas
            </button>
          }
        >
          <div className="space-y-2">
            {pengawas.map((p, i) => {
              // Guru yang sudah dipilih di baris lain tidak muncul lagi.
              const pilihan = guru.filter(
                (g) => g.id === p.guruId || !pengawas.some((x) => x.id !== p.id && x.guruId === g.id)
              )
              return (
                <div key={p.id} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
                    {kodeUrut(i)}
                  </span>
                  <select className={inputCls} value={p.guruId} onChange={(e) => ubahPengawas(p.id, e.target.value)}>
                    <option value="">— pilih guru —</option>
                    {pilihan.map((g) => (
                      <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => hapusPengawas(p.id)}
                    aria-label={`Hapus pengawas ${kodeUrut(i)}`}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </Bagian>

        <Bagian
          judul="Jadwal per hari"
          keterangan="Satu hari bisa punya beberapa sesi; pilih dua pengawas (kode) untuk tiap sesi."
          aksi={
            <button
              type="button"
              onClick={tambahHari}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700"
            >
              <Plus size={13} /> Tambah hari
            </button>
          }
        >
          <div className="space-y-3">
            {hari.map((h, hi) => (
              <div key={h.id} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Hari {hi + 1}</span>
                  <button
                    type="button"
                    onClick={() => hapusHari(h.id)}
                    aria-label={`Hapus hari ${hi + 1}`}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Hari, tanggal">
                    <input type="date" className={inputCls} value={h.tanggal} onChange={(e) => ubahHari(h.id, 'tanggal', e.target.value)} />
                  </Field>
                  <Field label="Ruang">
                    <input className={inputCls} value={h.ruang} onChange={(e) => ubahHari(h.id, 'ruang', e.target.value)} placeholder="mis. I" />
                  </Field>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3">
                  {h.sesi.map((s, si) => (
                    <div key={s.id} className="rounded-lg bg-slate-50 p-2.5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Sesi {si + 1}</span>
                        {h.sesi.length > 1 && (
                          <button
                            type="button"
                            onClick={() => hapusSesi(h.id, s.id)}
                            aria-label={`Hapus sesi ${si + 1}`}
                            className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Field label="Waktu">
                          <input className={inputCls} value={s.waktu} onChange={(e) => ubahSesi(h.id, s.id, 'waktu', e.target.value)} />
                        </Field>
                        <Field label="Mata pelajaran">
                          <input className={inputCls} value={s.mapel} onChange={(e) => ubahSesi(h.id, s.id, 'mapel', e.target.value)} placeholder="mis. Bahasa Indonesia" />
                        </Field>
                        <Field label="Pengawas 1">
                          <select className={inputCls} value={s.p1} onChange={(e) => ubahSesi(h.id, s.id, 'p1', e.target.value)}>
                            <option value="">— pilih —</option>
                            {pengawasTerpilih.filter((p) => p.id !== s.p2).map((p) => (
                              <option key={p.id} value={p.id}>{infoPengawas[p.id].kode} — {infoPengawas[p.id].guru?.nama_lengkap}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Pengawas 2">
                          <select className={inputCls} value={s.p2} onChange={(e) => ubahSesi(h.id, s.id, 'p2', e.target.value)}>
                            <option value="">— pilih —</option>
                            {pengawasTerpilih.filter((p) => p.id !== s.p1).map((p) => (
                              <option key={p.id} value={p.id}>{infoPengawas[p.id].kode} — {infoPengawas[p.id].guru?.nama_lengkap}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => tambahSesi(h.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Plus size={14} /> Tambah sesi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Bagian>

        <Bagian judul="Penandatangan" keterangan="Kepala Sekolah diambil otomatis dari Profil Sekolah.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tempat">
              <input className={inputCls} value={form.tempat} onChange={ubah('tempat')} placeholder="mis. Waria" />
            </Field>
            <Field label="Tanggal surat">
              <input type="date" className={inputCls} value={form.tanggalSurat} onChange={ubah('tanggalSurat')} />
            </Field>
          </div>
        </Bagian>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950"
          >
            <Printer size={16} /> Cetak
          </button>
        </div>
      </div>

      <div id="area-cetak-jadwal" className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-[13px] leading-relaxed text-slate-800">
        <div className="kop-surat flex items-center gap-3 border-b-2 border-slate-800 pb-3 mb-6">
          {/* Logo kiri: kabupaten. Kotak tetap ada walau kosong supaya teks tetap di tengah. */}
          <div className="kop-logo w-[76px] h-[76px] shrink-0 flex items-center justify-center">
            {logoKabupatenUrl && (
              <img
                src={logoKabupatenUrl}
                alt="Logo kabupaten"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
          </div>
          <div className="flex-1 text-center">
            {form.kabupaten && <p className="font-bold uppercase tracking-wide">{form.kabupaten}</p>}
            {form.dinas && <p className="font-bold uppercase tracking-wide">{form.dinas}</p>}
            <p className="font-bold uppercase tracking-wide text-base">{namaSekolah}</p>
            {form.kecamatan && <p className="font-bold uppercase tracking-wide">{form.kecamatan}</p>}
          </div>
          {/* Logo kanan: sekolah. */}
          <div className="kop-logo w-[76px] h-[76px] shrink-0 flex items-center justify-center">
            {logoSekolahUrl && (
              <img
                src={logoSekolahUrl}
                alt="Logo sekolah"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
          </div>
        </div>

        <div className="judul-blok text-center mb-6">
          <p className="font-display text-base font-bold uppercase">Jadwal Pengawas Ruang {form.jenisUjian}</p>
          <p className="font-bold uppercase">Tahun Pelajaran {isi(form.tapel, '…………')}</p>
        </div>

        <table className="w-full border-collapse mb-6">
          <thead>
            <tr>
              <Th className="w-10 text-center">No</Th>
              <Th className="w-36 text-center">Hari / Tanggal</Th>
              <Th className="w-28 text-center">Waktu</Th>
              <Th className="text-center">Mata Pelajaran</Th>
              <Th className="w-16 text-center">Ruang</Th>
              <Th colSpan={2} className="w-24 text-center">Kode Pengawas</Th>
            </tr>
          </thead>
          <tbody>
            {hari.map((h, hi) =>
              h.sesi.map((s, si) => (
                <tr key={s.id}>
                  {si === 0 && (
                    <>
                      <Td rowSpan={h.sesi.length} className="text-center align-middle">{hi + 1}</Td>
                      <Td rowSpan={h.sesi.length} className="text-center align-middle">{formatHariTanggal(h.tanggal)}</Td>
                    </>
                  )}
                  <Td className="text-center">{isi(s.waktu, '')}</Td>
                  <Td className="uppercase">{isi(s.mapel, '')}</Td>
                  {si === 0 && (
                    <Td rowSpan={h.sesi.length} className="text-center align-middle">{isi(h.ruang, '')}</Td>
                  )}
                  <Td className="w-12 text-center">{infoPengawas[s.p1]?.kode || ''}</Td>
                  <Td className="w-12 text-center">{infoPengawas[s.p2]?.kode || ''}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="ttd-blok grid grid-cols-2 gap-8">
          <div>
            <p className="font-bold mb-1">PENGAWAS RUANG</p>
            {pengawasTerpilih.length === 0 ? (
              <p>…………</p>
            ) : (
              <ul className="space-y-0.5">
                {pengawasTerpilih.map((p) => (
                  <li key={p.id} className="flex gap-2">
                    <span className="w-4 shrink-0 font-semibold">{infoPengawas[p.id].kode}.</span>
                    <span>{infoPengawas[p.id].guru.nama_lengkap}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="text-center">
            <p>{isi(form.tempat, '…………')}, {formatTanggalSurat(form.tanggalSurat)}</p>
            <p className="font-medium mb-16">Kepala Sekolah</p>
            <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">
              {isi(sekolah.kepala, '________________________')}
            </p>
            {sekolah.nipKepala && <p>NIP. {sekolah.nipKepala}</p>}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function Th({ children, className = '', ...rest }) {
  return (
    <th {...rest} className={`border border-slate-300 px-2 py-1.5 font-semibold ${className}`}>
      {children}
    </th>
  )
}
function Td({ children, className = '', ...rest }) {
  return (
    <td {...rest} className={`border border-slate-300 px-2 py-1.5 ${className}`}>
      {children}
    </td>
  )
}
