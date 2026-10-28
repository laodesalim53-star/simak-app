import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Save, Trash2, Upload } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  AreaLembar,
  BagianSK as Bagian,
  BarAtasCetak,
  BlokTTD,
  FieldSK as Field,
  GayaCetakSK,
  KopSK,
  LembarSK,
  SEKOLAH_KOSONG,
  TabelData,
  ambilGuruDanKelas,
  ambilProfilSekolah,
  formatTanggalSK,
  inputSK as inputCls,
  isKepalaSekolah,
  isi,
  isiTemplate,
  isoHariIni,
  pecahBaris,
  tahunPelajaranSekarang,
  urutkanGuru,
} from './CetakSK'

// ─────────────────────────────────────────────────────────────────────────────
// SK PLH Kepala Sekolah
//  • Admin  : bisa mengisi/mengubah semua isian + Simpan + Cetak.
//  • Guru   : hanya melihat lembar SK + Cetak (panel isian tidak tampil).
//  • Terisi otomatis: kop & kepala sekolah dari Profil Sekolah, PLH dari Data Guru,
//    Menimbang/Mengingat/diktum dari template (boleh diubah admin).
// Penanda di teks: {sekolah}, {tahun}, {kepsek}, {plh}, {alasan}, {masa}, {tanggal}
// ─────────────────────────────────────────────────────────────────────────────

const URUTAN_DIKTUM = ['Pertama', 'Kedua', 'Ketiga', 'Keempat', 'Kelima', 'Keenam', 'Ketujuh', 'Kedelapan', 'Kesembilan', 'Kesepuluh']

const TEMPLATE = {
  alasan: 'sedang menjalankan cuti',
  menimbang:
    'bahwa untuk kelancaran penyelenggaraan tugas dan layanan pendidikan pada {sekolah} karena Kepala Sekolah ({kepsek}) {alasan}, dipandang perlu menunjuk Pelaksana Harian (PLH) Kepala Sekolah dengan Surat Keputusan Kepala {sekolah}.',
  mengingat: [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
    'Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 40 Tahun 2021 tentang Penugasan Guru sebagai Kepala Sekolah;',
  ].join('\n'),
  memperhatikan: 'Keputusan Rapat Kepala Sekolah dengan staf Guru {sekolah}.',
  diktumLain: [
    'Dalam melaksanakan tugas sebagai Pelaksana Harian (PLH) Kepala Sekolah, yang bersangkutan bertugas memimpin penyelenggaraan pendidikan sehari-hari, mengelola administrasi sekolah, dan melaporkan pelaksanaan tugas kepada Kepala {sekolah} serta pejabat yang berwenang.',
    'Penunjukan sebagaimana dimaksud dalam diktum Pertama berlaku {masa}.',
    'Bila di kemudian hari terdapat kekeliruan dalam keputusan ini, akan diadakan perbaikan sebagaimana mestinya.',
    'Keputusan ini berlaku sejak tanggal ditetapkan.',
  ].join('\n'),
  tembusan: ['Pengawas Pembina {sekolah}', 'Yang bersangkutan', 'Arsip'].join('\n'),
}

const FORM_AWAL = () => ({
  nomor: '',
  tempat: '',
  tanggal: isoHariIni(),
  tahun: tahunPelajaranSekarang(),
  alasan: TEMPLATE.alasan,
  plh: { guruId: '', nama: '', nip: '', pangkatGol: '', jabatan: 'Guru' },
  tglMulai: '',
  tglSelesai: '',
  menimbang: TEMPLATE.menimbang,
  mengingat: TEMPLATE.mengingat,
  memperhatikan: TEMPLATE.memperhatikan,
  diktumLain: TEMPLATE.diktumLain,
  tembusan: TEMPLATE.tembusan,
  pakaiTtd: true, // tampilkan tanda tangan elektronik di cetakan
})

const tglTeks = (iso) => {
  try {
    return iso ? formatTanggalSK(iso) : ''
  } catch {
    return iso || ''
  }
}

function DaftarPolos({ items }) {
  return items.map((t, i) => (
    <p key={i} className="sk-justify">
      {t}
    </p>
  ))
}
function DaftarAngka({ items }) {
  return items.map((t, i) => (
    <div key={i} className="sk-item">
      <span className="no">{i + 1}.</span>
      <span className="isi">{t}</span>
    </div>
  ))
}

function GayaPadat() {
  return (
    <style>{`
      .sk-print-compact .lembar-sk{font-size:11pt;line-height:1.22}
      .sk-print-compact .sk-kop{padding-bottom:4px;margin-bottom:8px}
      .sk-print-compact .sk-kop-alamat,.sk-print-compact .sk-kop-npsn{display:none}
      .sk-print-compact .sk-judul{margin-bottom:6px}
      .sk-print-compact .sk-judul p{margin:1px 0}
      .sk-print-compact .sk-tengah{margin:4px 0}
      .sk-print-compact table.sk-def{margin:3px 0}
      .sk-print-compact table.sk-def>tbody>tr>td{padding:0 0 2px;vertical-align:top}
      .sk-print-compact .sk-item,.sk-print-compact .sk-justify{margin:0}
      .sk-print-compact .sk-data{margin:2px 0 4px 8mm}
      .sk-print-compact .sk-data td{padding:0}
      .sk-print-compact .sk-ttd{margin-top:8px}
      .sk-print-compact .sk-ttd .ruang{height:14mm}
      .sk-print-compact .sk-tembusan{margin-top:6px;font-size:9.5pt;line-height:1.15}
      .sk-print-compact .sk-tembusan p{margin:0}
    `}</style>
  )
}

// gabungkan: nilai tersimpan menang, tapi hanya kalau tidak kosong
const gabung = (dasar, simpan) => {
  const hasil = { ...dasar }
  Object.entries(simpan || {}).forEach(([k, v]) => {
    if (v !== '' && v != null) hasil[k] = v
  })
  return hasil
}

export default function SKPLHKepalaSekolah() {
  const navigate = useNavigate()
  const { sekolahId, isAdmin } = useAuth() // hanya admin yang boleh mengubah

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [f, setF] = useState(FORM_AWAL())
  const [guru, setGuru] = useState([])
  const [rowId, setRowId] = useState(null)
  const [adaTersimpan, setAdaTersimpan] = useState(false)
  const [memuat, setMemuat] = useState(true)
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState('')
  const [info, setInfo] = useState('')
  const [ttdUrl, setTtdUrl] = useState('')
  const [ttdBusy, setTtdBusy] = useState(false)
  const [ttdPath, setTtdPath] = useState('')
  const BUCKET_TTD = 'profil-sekolah' // bucket & kolom yang sama dengan halaman Profil Sekolah

  useEffect(() => {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    let aktif = true
    ;(async () => {
      setMemuat(true)
      setGalat('')
      try {
        const [ps, saved, gk] = await Promise.all([
          ambilProfilSekolah(sekolahId),
          supabase
            .from('sk_plh_kepsek')
            .select('id,data')
            .eq('sekolah_id', sekolahId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          isAdmin ? ambilGuruDanKelas(sekolahId) : Promise.resolve(null),
        ])
        if (!aktif) return
        if (saved.error) throw saved.error

        const urut = gk ? urutkanGuru(gk.guru) : []
        const kepsek = urut.find(isKepalaSekolah)
        const dasar = {
          ...ps.sekolah,
          kepala: ps.sekolah.kepala || kepsek?.nama_lengkap || '',
          nipKepala: ps.sekolah.nipKepala || kepsek?.nip || '',
        }
        const tersimpan = saved.data?.data || null
        setGuru(urut)
        setSekolah(gabung(dasar, tersimpan?.sekolah))
        const awal = FORM_AWAL()
        if (tersimpan) {
          const { sekolah: _abaikan, ...form } = tersimpan
          setF({ ...awal, ...form, plh: { ...awal.plh, ...(form.plh || {}) } })
          setRowId(saved.data.id)
          setAdaTersimpan(true)
        } else {
          setF({ ...awal, tempat: ps.tempat || '' })
        }
      } catch (e) {
        console.error('Gagal memuat SK PLH:', e)
        if (aktif) setGalat(e?.message || 'Data tidak dapat dibaca.')
      } finally {
        if (aktif) setMemuat(false)
      }
    })()
    return () => {
      aktif = false
    }
  }, [sekolahId, isAdmin])

  const ubah = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const ubahPlh = (k) => (e) => setF((s) => ({ ...s, plh: { ...s.plh, [k]: e.target.value } }))
  const ubahSekolah = (k) => (e) => setSekolah((s) => ({ ...s, [k]: e.target.value }))

  function pilihGuru(guruId) {
    const g = guru.find((x) => x.id === guruId)
    setF((s) => ({
      ...s,
      plh: {
        guruId,
        nama: g?.nama_lengkap || '',
        nip: g?.nip || '',
        pangkatGol: g?.pangkat_golongan || '',
        jabatan: s.plh.jabatan || 'Guru',
      },
    }))
  }

  async function simpan() {
    if (!isAdmin || !sekolahId) return
    setMenyimpan(true)
    setInfo('')
    setGalat('')
    const payload = { sekolah_id: sekolahId, data: { ...f, sekolah }, updated_at: new Date().toISOString() }
    const { data, error } = rowId
      ? await supabase.from('sk_plh_kepsek').update(payload).eq('id', rowId).select('id').single()
      : await supabase.from('sk_plh_kepsek').insert(payload).select('id').single()
    setMenyimpan(false)
    if (error) return setGalat('Gagal menyimpan: ' + error.message)
    setRowId(data.id)
    setAdaTersimpan(true)
    setInfo('Data tersimpan. Guru kini bisa melihat dan mencetak SK ini.')
  }


  // Tanda tangan elektronik kepala sekolah: memakai penyimpanan yang sama dengan
  // halaman Profil Sekolah (profil_sekolah.ttd_kepala_sekolah_path, bucket
  // 'profil-sekolah'), jadi satu tanda tangan dipakai di semua dokumen.
  function urlDariPath(path) {
    if (!path) return ''
    return supabase.storage.from(BUCKET_TTD).getPublicUrl(path).data?.publicUrl || ''
  }
  async function muatTtd() {
    if (!sekolahId) return
    const { data } = await supabase
      .from('profil_sekolah')
      .select('ttd_kepala_sekolah_path')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
    const path = data?.ttd_kepala_sekolah_path || ''
    setTtdPath(path)
    setTtdUrl(urlDariPath(path))
  }
  useEffect(() => {
    muatTtd()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  async function unggahTtd(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !isAdmin || !sekolahId) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) return setGalat('Tanda tangan harus berformat PNG atau JPG.')
    if (file.size > 1024 * 1024) return setGalat('Ukuran file maksimal 1 MB.')
    setTtdBusy(true)
    setGalat('')
    setInfo('')
    const ext = file.name.split('.').pop()
    const path = `ttd-kepsek-${Date.now()}.${ext}`
    const { error: errUnggah } = await supabase.storage.from(BUCKET_TTD).upload(path, file, { upsert: true })
    if (errUnggah) {
      setGalat('Gagal mengunggah tanda tangan: ' + errUnggah.message)
      setTtdBusy(false)
      return
    }
    const { error: errSimpan } = await supabase
      .from('profil_sekolah')
      .update({ ttd_kepala_sekolah_path: path, diperbarui_pada: new Date().toISOString() })
      .eq('sekolah_id', sekolahId)
    if (errSimpan) {
      setGalat('Terunggah, tetapi gagal disimpan ke Profil Sekolah: ' + errSimpan.message)
    } else {
      if (ttdPath) await supabase.storage.from(BUCKET_TTD).remove([ttdPath]) // bersihkan file lama
      setTtdPath(path)
      setTtdUrl(urlDariPath(path))
      setInfo('Tanda tangan tersimpan di Profil Sekolah dan otomatis dipakai di cetakan SK ini.')
    }
    setTtdBusy(false)
  }

  async function hapusTtd() {
    if (!isAdmin || !sekolahId || !confirm('Hapus tanda tangan kepala sekolah?')) return
    setTtdBusy(true)
    if (ttdPath) {
      const { error } = await supabase.storage.from(BUCKET_TTD).remove([ttdPath])
      if (error) {
        setGalat('Gagal menghapus tanda tangan: ' + error.message)
        setTtdBusy(false)
        return
      }
    }
    const { error: errSimpan } = await supabase
      .from('profil_sekolah')
      .update({ ttd_kepala_sekolah_path: null, diperbarui_pada: new Date().toISOString() })
      .eq('sekolah_id', sekolahId)
    if (errSimpan) setGalat('Gagal memperbarui Profil Sekolah: ' + errSimpan.message)
    else {
      setTtdPath('')
      setTtdUrl('')
    }
    setTtdBusy(false)
  }

  // ── Susun isi dokumen ──
  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const awalMasa = f.tglMulai ? `mulai tanggal ${tglTeks(f.tglMulai)}` : 'terhitung sejak tanggal ditetapkan'
  const akhirMasa = f.tglSelesai
    ? `sampai dengan ${tglTeks(f.tglSelesai)}`
    : 'sampai dengan Kepala Sekolah definitif kembali bertugas'
  const nilai = {
    sekolah: namaSekolah,
    tahun: isi(f.tahun),
    tp: isi(f.tahun),
    kepsek: isi(sekolah.kepala, '…………'),
    plh: isi(f.plh.nama, '…………'),
    alasan: isi(f.alasan, '…………'),
    masa: `${awalMasa} ${akhirMasa}`,
    tanggal: tglTeks(f.tanggal),
    jabatan: 'Pelaksana Harian (PLH) Kepala Sekolah',
    honor: '',
    sumber: '',
    objek: '',
  }
  const daftarMenimbang = pecahBaris(f.menimbang).map((t) => isiTemplate(t, nilai))
  const daftarMengingat = pecahBaris(f.mengingat).map((t) => isiTemplate(t, nilai))
  const teksMemperhatikan = isiTemplate(f.memperhatikan || '', nilai)
  const daftarDiktum = pecahBaris(f.diktumLain)
    .map((t) => isiTemplate(t, nilai))
    .slice(0, URUTAN_DIKTUM.length - 1)
  const daftarTembusan = pecahBaris(f.tembusan).map((t) => isiTemplate(t, nilai))
  const skCetak = { nomor: f.nomor, tempat: f.tempat, tanggal: f.tanggal }

  if (memuat) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-sm text-slate-600 gap-2">
        <Loader2 size={16} className="animate-spin" /> Memuat SK PLH Kepala Sekolah…
      </div>
    )
  }

  const tampilLembar = isAdmin || adaTersimpan

  return (
    <div className="min-h-screen bg-slate-100">
      <GayaCetakSK />
      <GayaPadat />
      {ttdUrl && f.pakaiTtd && (
        <style>{`.sk-print-compact .sk-ttd .ruang{height:18mm;background:url("${ttdUrl}") center / contain no-repeat;-webkit-print-color-adjust:exact;print-color-adjust:exact}`}</style>
      )}
      <BarAtasCetak onKembali={() => navigate('/dashboard')} judul="SK PLH Kepala Sekolah" />

      <div className="no-print max-w-3xl mx-auto px-3 pt-4">
        {galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">{galat}</div>
        )}
        {info && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 mb-4">{info}</div>
        )}
        {!isAdmin && (
          <p className="text-sm text-slate-600 mb-3">
            Anda dapat melihat dan mencetak SK ini. Perubahan isi hanya dapat dilakukan admin.
          </p>
        )}
        {!isAdmin && !adaTersimpan && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
            SK PLH Kepala Sekolah belum diisi. Hubungi admin.
          </div>
        )}

        {isAdmin && (
          <>
            <Bagian judul="Data SK" keterangan="Nomor, tempat, tanggal penetapan, dan tahun pelajaran.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nomor SK">
                  <input className={inputCls} value={f.nomor} onChange={ubah('nomor')} placeholder="mis. 421.2/020/SD/2026" />
                </Field>
                <Field label="Tahun pelajaran">
                  <input className={inputCls} value={f.tahun} onChange={ubah('tahun')} placeholder="mis. 2026/2027" />
                </Field>
                <Field label="Ditetapkan di">
                  <input className={inputCls} value={f.tempat} onChange={ubah('tempat')} />
                </Field>
                <Field label="Pada tanggal">
                  <input type="date" className={inputCls} value={f.tanggal} onChange={ubah('tanggal')} />
                </Field>
              </div>
            </Bagian>

            <Bagian judul="Pelaksana Harian (PLH)" keterangan="Pilih dari Data Guru — nama, NIP, dan pangkat terisi otomatis. Bisa diisi manual.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Guru yang ditunjuk" className="sm:col-span-2">
                  <select className={inputCls} value={f.plh.guruId} onChange={(e) => pilihGuru(e.target.value)}>
                    <option value="">— isi manual —</option>
                    {guru.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama_lengkap || '(tanpa nama)'}
                        {g.nip ? ` — NIP. ${g.nip}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Nama">
                  <input className={inputCls} value={f.plh.nama} onChange={ubahPlh('nama')} />
                </Field>
                <Field label="NIP (kosongkan kalau tidak ada)">
                  <input className={inputCls} value={f.plh.nip} onChange={ubahPlh('nip')} inputMode="numeric" />
                </Field>
                <Field label="Pangkat/Golongan">
                  <input className={inputCls} value={f.plh.pangkatGol} onChange={ubahPlh('pangkatGol')} />
                </Field>
                <Field label="Jabatan saat ini">
                  <input className={inputCls} value={f.plh.jabatan} onChange={ubahPlh('jabatan')} />
                </Field>
                <Field label="Mulai tugas PLH">
                  <input type="date" className={inputCls} value={f.tglMulai} onChange={ubah('tglMulai')} />
                </Field>
                <Field label="Selesai tugas (kosong = sampai Kepala Sekolah kembali)">
                  <input type="date" className={inputCls} value={f.tglSelesai} onChange={ubah('tglSelesai')} />
                </Field>
                <Field label="Alasan PLH (masuk ke Menimbang)" className="sm:col-span-2">
                  <input className={inputCls} value={f.alasan} onChange={ubah('alasan')} placeholder="mis. sedang menjalankan cuti / sedang dinas luar" />
                </Field>
              </div>
            </Bagian>

            <Bagian
              judul="Isi keputusan"
              keterangan="Sudah terisi template. Mengingat & diktum lain: satu baris = satu butir. Penanda otomatis: {sekolah}, {kepsek}, {plh}, {alasan}, {masa}, {tahun}, {tanggal}."
            >
              <div className="grid grid-cols-1 gap-3">
                <Field label="Menimbang">
                  <textarea className={inputCls} rows={4} value={f.menimbang} onChange={ubah('menimbang')} />
                </Field>
                <Field label="Mengingat">
                  <textarea className={inputCls} rows={5} value={f.mengingat} onChange={ubah('mengingat')} />
                </Field>
                <Field label="Memperhatikan (kosongkan kalau tidak dipakai)">
                  <input className={inputCls} value={f.memperhatikan} onChange={ubah('memperhatikan')} />
                </Field>
                <Field label="Diktum Kedua dan seterusnya (diktum Pertama dibuat otomatis dari data PLH)">
                  <textarea className={inputCls} rows={6} value={f.diktumLain} onChange={ubah('diktumLain')} />
                </Field>
                <Field label="Tembusan (kosongkan kalau tidak dipakai)">
                  <textarea className={inputCls} rows={3} value={f.tembusan} onChange={ubah('tembusan')} />
                </Field>
              </div>
            </Bagian>

            <Bagian judul="Tanda tangan elektronik" keterangan="Sama dengan tanda tangan di Profil Sekolah: unggah sekali di sini atau di sana, otomatis terpasang di cetakan SK. PNG latar transparan paling rapi, maksimal 1 MB. Hanya admin yang bisa mengubah.">
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-20 w-40 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                  {ttdUrl ? (
                    <img src={ttdUrl} alt="Tanda tangan" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400">Belum ada</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    {ttdBusy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                    {ttdUrl ? 'Ganti tanda tangan' : 'Upload tanda tangan'}
                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={unggahTtd} disabled={ttdBusy} />
                  </label>
                  {ttdUrl && (
                    <button onClick={hapusTtd} disabled={ttdBusy} className="inline-flex items-center gap-2 text-sm text-red-600">
                      <Trash2 size={15} /> Hapus
                    </button>
                  )}
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={!!f.pakaiTtd} onChange={(e) => setF((x) => ({ ...x, pakaiTtd: e.target.checked }))} />
                    Tampilkan di cetakan (klik Simpan SK)
                  </label>
                </div>
              </div>
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

            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={simpan}
                disabled={menyimpan}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {menyimpan ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Simpan SK
              </button>
              <span className="text-xs text-slate-500">Setelah disimpan, guru dapat melihat dan mencetak.</span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Pratinjau di bawah. Saat mencetak, matikan opsi "Header dan footer" di dialog cetak agar bersih.
            </p>
          </>
        )}
      </div>

      {tampilLembar && (
        <AreaLembar>
          <div className="sk-print-compact">
            <LembarSK>
              <KopSK sekolah={{ ...sekolah, npsn: '', alamat: '' }} />

              <div className="sk-judul">
                <p style={{ textDecoration: 'underline' }}>Surat Keputusan Kepala {namaSekolah}</p>
                <p>Nomor: {isi(f.nomor)}</p>
                <p className="tentang">Tentang</p>
                <p>PENUNJUKAN PELAKSANA HARIAN (PLH) KEPALA SEKOLAH</p>
                <p>TAHUN PELAJARAN {isi(f.tahun)}</p>
              </div>

              <p className="sk-tengah" style={{ marginTop: 4 }}>
                Kepala {namaSekolah},
              </p>

              <table className="sk-def">
                <tbody>
                  <tr>
                    <td className="k">Menimbang</td>
                    <td className="t">:</td>
                    <td>
                      <DaftarPolos items={daftarMenimbang} />
                    </td>
                  </tr>
                  <tr>
                    <td className="k">Mengingat</td>
                    <td className="t">:</td>
                    <td>
                      <DaftarAngka items={daftarMengingat} />
                    </td>
                  </tr>
                  {teksMemperhatikan && (
                    <tr>
                      <td className="k">Memperhatikan</td>
                      <td className="t">:</td>
                      <td className="sk-justify">{teksMemperhatikan}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <p className="sk-tengah">M E M U T U S K A N</p>

              <table className="sk-def">
                <tbody>
                  <tr>
                    <td className="k">Menetapkan</td>
                    <td className="t">:</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td className="k">Pertama</td>
                    <td className="t">:</td>
                    <td className="sk-justify">
                      <p style={{ margin: 0 }}>Menunjuk Saudara/i :</p>
                      <TabelData
                        baris={[
                          ['Nama', isi(f.plh.nama)],
                          ['NIP', isi(f.plh.nip)],
                          ['Pangkat/Golongan', isi(f.plh.pangkatGol)],
                          ['Jabatan saat ini', isi(f.plh.jabatan)],
                        ]}
                      />
                      <p style={{ margin: 0 }}>
                        Sebagai Pelaksana Harian (PLH) Kepala {namaSekolah}.
                      </p>
                    </td>
                  </tr>
                  {daftarDiktum.map((teks, i) => (
                    <tr key={i}>
                      <td className="k">{URUTAN_DIKTUM[i + 1]}</td>
                      <td className="t">:</td>
                      <td className="sk-justify">{teks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <BlokTTD sk={skCetak} sekolah={sekolah} />

              {daftarTembusan.length > 0 && (
                <div className="sk-tembusan">
                  <p>Tembusan disampaikan kepada Yth.:</p>
                  <DaftarAngka items={daftarTembusan} />
                </div>
              )}
            </LembarSK>
          </div>
        </AreaLembar>
      )}
    </div>
  )
}
