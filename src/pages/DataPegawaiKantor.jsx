import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import TeleponLink from '../components/TeleponLink'
import { Plus, Pencil, Trash2, Search, X, Loader2, Briefcase, UploadCloud } from 'lucide-react'
import mammoth from 'mammoth'

// Halaman "Data Pegawai" KHUSUS tenant kantor — menulis ke tabel `pegawai_kantor`
// (dibuat lewat migrasi-pegawai-kantor-kepegawaian.sql +
// migrasi-tambah-kolom-kepegawaian-pegawai-kantor.sql), BUKAN ke tabel `guru`.
// Ini SENGAJA dipisah dari Guru.jsx/Data Guru supaya:
//  1) Data pegawai kantor tidak tercampur dengan data guru sekolah.
//  2) Field-field di sini relevan untuk kantor (tidak ada NUPTK, mata
//     pelajaran, karpeg, dsb — itu semua konsep khusus tenaga pendidik).
//
// FITUR "Isi dari SK": mengunggah dokumen SK (PDF/gambar) lalu memanggil
// Supabase Edge Function `ekstrak-sk` (lihat supabase/functions/ekstrak-sk/index.ts)
// yang mengekstrak field kepegawaian dan mengembalikannya sebagai JSON.
// Hasil ekstraksi HANYA mengisi state form di browser — tidak pernah menulis
// langsung ke tabel — sehingga isolasi multi-tenant tetap terjaga karena
// penyimpanan akhir selalu lewat handleSubmit yang sudah scoped ke sekolahId.
const emptyForm = {
  nama_lengkap: '',
  nip: '',
  nik: '',
  jenis_kelamin: 'L',
  tempat_lahir: '',
  tanggal_lahir: '',
  agama: '',
  pendidikan_terakhir: '',
  jabatan: '',
  status_kepegawaian: '',
  pangkat_golongan: '',
  sk_pengangkatan: '',
  tmt_pengangkatan: '',
  alamat: '',
  telepon_kantor: '', // (tidak dipakai, dibiarkan konsisten dgn no_hp saja di bawah)
  no_hp: '',
  email: '',
  npwp: '',
  bank: '',
  no_rekening: '',
  rekening_atas_nama: '',
  foto_profil_path: '',
  status: 'aktif',
}

function formatTanggal(tgl) {
  if (!tgl) return null
  try {
    return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return tgl
  }
}

export default function DataPegawaiKantor() {
  const { sekolahId } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [profilLihat, setProfilLihat] = useState(null)

  // --- state untuk fitur "Isi dari SK" ---
  const [skLoading, setSkLoading] = useState(false)
  const [skError, setSkError] = useState('')
  // Catatan tugas tambahan (Plt./Plh./Kepala unit dsb) hasil ekstraksi SK.
  // SENGAJA tidak disimpan ke tabel pegawai_kantor (tidak ada kolomnya) —
  // ini murni informasi untuk admin, dicatat manual jika diperlukan.
  const [skCatatanTambahan, setSkCatatanTambahan] = useState(null)
  const fileInputRef = useRef(null)

  async function loadData() {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: pegawai, error } = await supabase
      .from('pegawai_kantor')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('nama_lengkap')

    if (error) {
      console.error('Gagal memuat data pegawai:', error)
      alert('Gagal memuat data pegawai: ' + error.message)
    }

    setData(pegawai || [])
    setLoading(false)
    if (profilLihat) {
      const updated = (pegawai || []).find((p) => p.id === profilLihat.id)
      if (updated) setProfilLihat(updated)
    }
  }

  useEffect(() => {
    loadData()
  }, [sekolahId])

  function fotoUrl(path) {
    if (!path) return null
    return supabase.storage.from('foto-profil').getPublicUrl(path).data.publicUrl
  }

  function openAdd() {
    setForm(emptyForm)
    setEditingId(null)
    setSkError('')
    setSkCatatanTambahan(null)
    setShowForm(true)
  }

  function openEdit(row) {
    setForm({
      ...emptyForm,
      ...row,
      tanggal_lahir: row.tanggal_lahir ? String(row.tanggal_lahir).slice(0, 10) : '',
      tmt_pengangkatan: row.tmt_pengangkatan ? String(row.tmt_pengangkatan).slice(0, 10) : '',
    })
    setEditingId(row.id)
    setSkError('')
    setSkCatatanTambahan(null)
    setShowForm(true)
  }

  // Konversi file ke base64, kirim ke Edge Function `ekstrak-sk`, lalu isi
  // field form yang MASIH KOSONG dengan hasil ekstraksi (tidak menimpa
  // field yang sudah diisi manual oleh admin).
  const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

  async function handleSkFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSkError('')
    setSkCatatanTambahan(null)
    setSkLoading(true)

    try {
      const isDocx = file.type === DOCX_MIME || file.name.toLowerCase().endsWith('.docx')

      let body
      if (isDocx) {
        // File Word (.docx) bukan gambar/PDF, jadi tidak bisa dikirim sebagai
        // inline_data ke Gemini. Ekstrak dulu teksnya di browser pakai
        // mammoth, baru teks itu yang dikirim ke Edge Function.
        const arrayBuffer = await file.arrayBuffer()
        const { value: extractedText } = await mammoth.extractRawText({ arrayBuffer })
        if (!extractedText || !extractedText.trim()) {
          throw new Error('Tidak ada teks yang bisa dibaca dari file Word ini.')
        }
        body = { extracted_text: extractedText }
      } else {
        // Gambar (JPG/PNG) atau PDF: dikirim langsung sebagai base64,
        // Gemini bisa "membaca" file ini secara visual.
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        body = { file_base64: base64, media_type: file.type }
      }

      const { data: hasil, error } = await supabase.functions.invoke('ekstrak-sk', { body })

      if (error) {
        // Supabase JS hanya memberi pesan generik ("non-2xx status code") di
        // 'error.message'. Pesan asli dari Edge Function (mis. detail error
        // dari Gemini, termasuk kalau kena rate limit/kuota) ada di body
        // response-nya sendiri, jadi kita baca ulang di sini supaya
        // terlihat jelas di Console dan membantu diagnosa.
        let pesanAsli = error.message
        try {
          if (error.context && typeof error.context.json === 'function') {
            const bodyError = await error.context.json()
            if (bodyError?.error) pesanAsli = bodyError.error
          }
        } catch {
          // biarkan pesanAsli tetap yang generik kalau body tidak bisa dibaca
        }
        throw new Error(pesanAsli)
      }
      if (hasil?.error) throw new Error(hasil.error)

      // Kolom "jabatan" di tabel diisi dari jabatan definitif. Kalau SK ini
      // ternyata tidak menyebutkan jabatan definitif (mis. SK-nya murni SK
      // tugas tambahan), pakai jabatan tambahan sebagai fallback supaya
      // field tidak kosong.
      const jabatanUntukForm = hasil.jabatan_definitif || hasil.jabatan_tambahan || hasil.jabatan || ''

      setForm((prev) => ({
        ...prev,
        nama_lengkap: prev.nama_lengkap || hasil.nama_lengkap || '',
        nip: prev.nip || hasil.nip || '',
        jabatan: prev.jabatan || jabatanUntukForm,
        pangkat_golongan: prev.pangkat_golongan || hasil.pangkat_golongan || '',
        status_kepegawaian: prev.status_kepegawaian || hasil.status_kepegawaian || '',
        sk_pengangkatan: prev.sk_pengangkatan || hasil.no_sk || '',
        tmt_pengangkatan: prev.tmt_pengangkatan || hasil.tmt || '',
      }))

      // Kalau SK ini menyebutkan tugas tambahan (Plt./Plh./Kepala unit dsb),
      // tampilkan sebagai catatan info — TIDAK disimpan ke tabel karena
      // belum ada kolomnya. Admin bisa mencatatnya manual jika perlu.
      if (hasil.jabatan_tambahan) {
        setSkCatatanTambahan({
          jabatan: hasil.jabatan_tambahan,
          unitKerja: hasil.unit_kerja_tambahan || '',
          masaTugas: hasil.masa_tugas_tambahan || '',
        })
      }
    } catch (err) {
      console.error('Gagal mengekstrak SK:', err)
      // Tampilkan pesan error asli (dari Edge Function/Gemini) di layar,
      // supaya admin/Anda tidak perlu buka DevTools untuk tahu penyebabnya.
      // Kalau pesan terlalu teknis/panjang, tetap tampilkan sebagian +
      // saran umum di baris kedua.
      const pesanAsli = err?.message || 'Kesalahan tidak diketahui'
      setSkError(`Gagal membaca SK: ${pesanAsli}`)
    } finally {
      setSkLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sekolahId) {
      alert('Belum ada kantor aktif.')
      return
    }
    setSaving(true)
    const { telepon_kantor, ...rest } = form
    const payload = {
      ...rest,
      sekolah_id: sekolahId,
      tanggal_lahir: form.tanggal_lahir || null,
      tmt_pengangkatan: form.tmt_pengangkatan || null,
    }
    const { error } = editingId
      ? await supabase.from('pegawai_kantor').update(payload).eq('id', editingId).eq('sekolah_id', sekolahId)
      : await supabase.from('pegawai_kantor').insert(payload)
    setSaving(false)
    if (!error) {
      setShowForm(false)
      loadData()
    } else {
      alert('Gagal menyimpan: ' + error.message)
    }
  }

  async function handleDelete(id) {
    if (!sekolahId) return
    if (!confirm('Hapus data pegawai ini?')) return
    const { error } = await supabase.from('pegawai_kantor').delete().eq('id', id).eq('sekolah_id', sekolahId)
    if (!error) loadData()
    else alert('Gagal menghapus: ' + error.message)
  }

  const filtered = data.filter((p) =>
    `${p.nama_lengkap} ${p.nip} ${p.jabatan}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout
      title="Data Pegawai"
      subtitle={`${data.length} pegawai terdaftar`}
      actions={
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Tambah Pegawai
        </button>
      }
    >
      <div className="card relative overflow-hidden p-4 mb-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-red-900" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0">
            <Briefcase size={18} />
          </div>
          <div className="relative max-w-sm w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
            <input
              className="input-field pl-9"
              placeholder="Cari nama, NIP, atau jabatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-shell">
          <thead>
            <tr className="border-b-2 border-blue-600/20">
              <th>Nama Lengkap</th>
              <th>NIP</th>
              <th>Jabatan</th>
              <th>Pangkat/Golongan</th>
              <th>No. HP</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-ink-700/50">Memuat data...</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-ink-700/50">Belum ada data pegawai.</td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-blue-600/[0.03] transition-colors">
                <td className="font-medium">
                  <button type="button" onClick={() => setProfilLihat(p)} className="hover:underline hover:text-blue-700 text-left">
                    {p.nama_lengkap}
                  </button>
                </td>
                <td className="font-mono text-xs">{p.nip}</td>
                <td>{p.jabatan}</td>
                <td>{p.pangkat_golongan}</td>
                <td>
                  <span className="inline-flex items-center gap-1.5">
                    {p.no_hp}
                    <TeleponLink nomor={p.no_hp} />
                  </span>
                </td>
                <td>
                  <span className={`badge ${p.status === 'aktif' ? 'bg-blue-600/15 text-blue-700' : 'bg-red-900/10 text-red-900'}`}>
                    {p.status}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(p)} className="p-2 hover:bg-blue-600/10 rounded-lg text-blue-700/70">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-900/10 rounded-lg text-red-900/70">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="card relative overflow-hidden w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-red-900" />
            <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink-700/40 hover:text-ink-900">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0">
                <Briefcase size={19} />
              </div>
              <h2 className="font-display text-xl font-semibold">{editingId ? 'Ubah Data Pegawai' : 'Tambah Pegawai'}</h2>
            </div>

            {/* --- Kotak "Isi dari SK" --- */}
            <div className="mb-4 p-3 rounded-xl border border-dashed border-blue-600/30 bg-blue-600/[0.03] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-ink-700/70">
                <UploadCloud size={16} className="text-blue-700 shrink-0" />
                <span>Punya file SK? Unggah untuk mengisi data otomatis.</span>
              </div>
              <label className="btn-secondary cursor-pointer shrink-0">
                {skLoading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                {skLoading ? 'Memproses...' : 'Unggah SK'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleSkFile}
                  disabled={skLoading}
                />
              </label>
            </div>
            {skError && <p className="text-xs text-red-900 mb-3">{skError}</p>}

            {skCatatanTambahan && (
              <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-sm text-ink-700">
                <p className="font-medium text-amber-800 mb-1">SK ini juga berisi tugas tambahan</p>
                <p>
                  Terdeteksi tugas tambahan sebagai <strong>{skCatatanTambahan.jabatan}</strong>
                  {skCatatanTambahan.unitKerja && <> di <strong>{skCatatanTambahan.unitKerja}</strong></>}
                  {skCatatanTambahan.masaTugas && <> selama <strong>{skCatatanTambahan.masaTugas}</strong></>}.
                </p>
                <p className="text-xs text-ink-700/60 mt-1">
                  Info ini belum punya kolom tersendiri di data pegawai — silakan catat manual jika diperlukan (misalnya di kolom Jabatan atau catatan internal Anda).
                </p>
              </div>
            )}

            <SeksiForm judul="Data Pribadi">
              <Field label="Nama Lengkap" full>
                <input required className="input-field" value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} />
              </Field>
              <Field label="NIK"><input className="input-field" value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} /></Field>
              <Field label="Jenis Kelamin">
                <select className="input-field" value={form.jenis_kelamin} onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })}>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </Field>
              <Field label="Agama"><input className="input-field" value={form.agama} onChange={(e) => setForm({ ...form, agama: e.target.value })} /></Field>
              <Field label="Tempat Lahir"><input className="input-field" value={form.tempat_lahir} onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })} /></Field>
              <Field label="Tanggal Lahir"><input type="date" className="input-field" value={form.tanggal_lahir} onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })} /></Field>
              <Field label="Pendidikan Terakhir"><input className="input-field" value={form.pendidikan_terakhir} onChange={(e) => setForm({ ...form, pendidikan_terakhir: e.target.value })} /></Field>
            </SeksiForm>

            <SeksiForm judul="Kepegawaian">
              <Field label="NIP"><input className="input-field" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} /></Field>
              <Field label="Jabatan"><input className="input-field" value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} /></Field>
              <Field label="Status Kepegawaian">
                <input className="input-field" placeholder="PNS / PPPK / Honorer..." value={form.status_kepegawaian} onChange={(e) => setForm({ ...form, status_kepegawaian: e.target.value })} />
              </Field>
              <Field label="Pangkat / Golongan"><input className="input-field" value={form.pangkat_golongan} onChange={(e) => setForm({ ...form, pangkat_golongan: e.target.value })} /></Field>
              <Field label="SK Pengangkatan"><input className="input-field" value={form.sk_pengangkatan} onChange={(e) => setForm({ ...form, sk_pengangkatan: e.target.value })} /></Field>
              <Field label="TMT Pengangkatan"><input type="date" className="input-field" value={form.tmt_pengangkatan} onChange={(e) => setForm({ ...form, tmt_pengangkatan: e.target.value })} /></Field>
            </SeksiForm>

            <SeksiForm judul="Kontak & Alamat">
              <Field label="Alamat" full><textarea className="input-field" rows={2} value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></Field>
              <Field label="No. HP"><input className="input-field" value={form.no_hp} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} /></Field>
              <Field label="Email"><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            </SeksiForm>

            <SeksiForm judul="Lainnya">
              <Field label="NPWP"><input className="input-field" value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} /></Field>
              <Field label="Bank"><input className="input-field" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} /></Field>
              <Field label="Nomor Rekening"><input className="input-field" value={form.no_rekening} onChange={(e) => setForm({ ...form, no_rekening: e.target.value })} /></Field>
              <Field label="Rekening Atas Nama"><input className="input-field" value={form.rekening_atas_nama} onChange={(e) => setForm({ ...form, rekening_atas_nama: e.target.value })} /></Field>
              <Field label="Status di Aplikasi" full>
                <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </Field>
            </SeksiForm>

            <div className="mt-5 flex justify-end gap-3 sticky bottom-0 bg-white pt-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 size={16} className="animate-spin" />} Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {profilLihat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-0 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setProfilLihat(null)}
              className="absolute top-4 right-4 z-10 text-white/80 hover:text-white bg-ink-950/20 rounded-full p-1"
            >
              <X size={18} />
            </button>

            <div className="relative bg-gradient-to-br from-blue-900 to-blue-950 pt-8 pb-16 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/20 bg-white/10 flex items-center justify-center shrink-0">
                {fotoUrl(profilLihat.foto_profil_path) ? (
                  <img src={fotoUrl(profilLihat.foto_profil_path)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-semibold text-white/60">{profilLihat.nama_lengkap?.[0]}</span>
                )}
              </div>
              <p className="font-display font-semibold text-lg text-white mt-3 text-center px-6">{profilLihat.nama_lengkap}</p>
              <span className={`badge mt-1.5 ${profilLihat.status === 'aktif' ? 'bg-sage-500/20 text-sage-100' : 'bg-white/10 text-white/70'}`}>
                {profilLihat.status}
              </span>
            </div>

            <div className="px-6 -mt-12 pb-6">
              <div className="card p-4 space-y-4 bg-white shadow-md">
                <SeksiProfil judul="Data Pribadi">
                  <ProfilRow label="NIK" value={profilLihat.nik} />
                  <ProfilRow label="Jenis Kelamin" value={profilLihat.jenis_kelamin === 'L' ? 'Laki-laki' : profilLihat.jenis_kelamin === 'P' ? 'Perempuan' : null} />
                  <ProfilRow label="Agama" value={profilLihat.agama} />
                  <ProfilRow
                    label="Tempat, Tgl Lahir"
                    value={profilLihat.tempat_lahir || profilLihat.tanggal_lahir ? `${profilLihat.tempat_lahir || '-'}, ${formatTanggal(profilLihat.tanggal_lahir) || '-'}` : null}
                  />
                  <ProfilRow label="Pendidikan Terakhir" value={profilLihat.pendidikan_terakhir} />
                </SeksiProfil>

                <SeksiProfil judul="Kepegawaian">
                  <ProfilRow label="NIP" value={profilLihat.nip} />
                  <ProfilRow label="Jabatan" value={profilLihat.jabatan} />
                  <ProfilRow label="Status Kepegawaian" value={profilLihat.status_kepegawaian} />
                  <ProfilRow label="Pangkat / Golongan" value={profilLihat.pangkat_golongan} />
                  <ProfilRow label="SK Pengangkatan" value={profilLihat.sk_pengangkatan} />
                  <ProfilRow label="TMT Pengangkatan" value={formatTanggal(profilLihat.tmt_pengangkatan)} />
                </SeksiProfil>

                <SeksiProfil judul="Kontak">
                  <ProfilRow label="Alamat" value={profilLihat.alamat} />
                  <ProfilRow label="No. HP" value={profilLihat.no_hp} telepon />
                  <ProfilRow label="Email" value={profilLihat.email} />
                </SeksiProfil>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => { setProfilLihat(null); openEdit(profilLihat) }}
                  className="btn-secondary flex-1 justify-center"
                >
                  <Pencil size={15} /> Ubah Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function SeksiForm({ judul, children }) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="eyebrow text-blue-700 mb-2">{judul}</p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function SeksiProfil({ judul, children }) {
  return (
    <div>
      <p className="eyebrow text-blue-700/70 mb-2">{judul}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Field({ label, children, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="eyebrow mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

function ProfilRow({ label, value, telepon }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-ink-700/50 shrink-0">{label}</span>
      <span className="text-ink-950 font-medium text-right inline-flex items-center gap-1.5">
        {value}
        {telepon && <TeleponLink nomor={value} />}
      </span>
    </div>
  )
}
