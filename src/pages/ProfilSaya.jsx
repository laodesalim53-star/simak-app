import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import GrafikAktivitas from '../components/GrafikAktivitas'
import { Camera, Loader2, Save, Users, School, ShieldCheck, UserCircle2, Clock, CheckCircle2, XCircle, UserPlus, X, Printer, FileSpreadsheet } from 'lucide-react'
// ASUMSI: menggunakan library `react-barcode` untuk membuat kode batang (linear barcode) di sisi klien.
// Install dulu kalau belum ada: npm install react-barcode
import Barcode from 'react-barcode'
// Menggunakan library `qrcode` (sudah ada di package.json) untuk membuat QR code sebagai data URL PNG.
import QRCode from 'qrcode'
// `xlsx` dan `jspdf`/`jspdf-autotable` sudah ada di package.json (dipakai fitur
// lain di aplikasi ini), jadi tombol "Cetak PDF" & "Export Excel" di bawah
// memakainya langsung tanpa dependency baru.
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const LABEL_JABATAN = {
  admin: 'Admin',
  admin_utama: 'Admin Utama',
  superadmin: 'Superadmin',
  kepala_sekolah: 'Kepala Sekolah',
  guru: 'Guru',
}

// ============================================================================
// FITUR BARU: Cetak PDF & Export Excel untuk Data Diri
// ----------------------------------------------------------------------------
// - Export Excel: `fields` (array {label, value}) diubah jadi 2 kolom (Data /
//   Nilai) pakai SheetJS (xlsx), lalu diunduh sebagai file .xlsx.
// - Cetak PDF: diunduh langsung sebagai file .pdf pakai jsPDF + jspdf-autotable
//   (bukan window.print()) — judul + nama orang di atas, lalu tabel dua kolom
//   (Data / Nilai) di bawahnya. Tidak butuh popup window / CSS @media print.
// ============================================================================

function exportDataDiriExcel(fields, namaFile) {
  const rows = fields.map((f) => ({ Data: f.label, Nilai: f.value === null || f.value === undefined || f.value === '' ? '-' : f.value }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [{ wch: 30 }, { wch: 40 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data Diri')
  XLSX.writeFile(wb, `${namaFile}.xlsx`)
}

function cetakDataDiriPDF(fields, judul, namaOrang, namaFile) {
  const doc = new jsPDF()
  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  doc.setFontSize(14)
  doc.setTextColor(30, 58, 95) // navy, senada dengan tema kartu identitas
  doc.text(judul, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(90)
  doc.text(`${namaOrang || '-'}  \u00b7  Dicetak ${tanggal}`, 14, 25)

  autoTable(doc, {
    startY: 32,
    head: [['Data', 'Nilai']],
    body: fields.map((f) => [f.label, f.value === null || f.value === undefined || f.value === '' ? '-' : String(f.value)]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 95] },
    columnStyles: { 0: { cellWidth: 62, fontStyle: 'bold' } },
  })

  doc.save(`${namaFile}.pdf`)
}

// Tombol "Cetak PDF" + "Export Excel" dipakai di ketiga kartu profil (admin,
// orang tua, guru) — cukup dikasih `fields` (array {label, value}), `judul`
// & `namaOrang` untuk kop lembar PDF, dan `namaFile` untuk nama file unduhan.
function TombolCetakDataDiri({ fields, judul, namaOrang, namaFile }) {
  return (
    <>
      <button
        type="button"
        onClick={() => cetakDataDiriPDF(fields, judul, namaOrang, namaFile)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-ink-900/10 text-ink-700 text-sm font-medium hover:bg-ink-900/[0.04]"
      >
        <Printer size={16} /> Cetak PDF
      </button>
      <button
        type="button"
        onClick={() => exportDataDiriExcel(fields, namaFile)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-ink-900/10 text-ink-700 text-sm font-medium hover:bg-ink-900/[0.04]"
      >
        <FileSpreadsheet size={16} /> Export Excel
      </button>
    </>
  )
}

// Kartu profil untuk akun yang tidak tertaut ke tabel `guru` (admin / admin_utama /
// superadmin / kepala sekolah). Dibuat setara dengan kartu guru: foto profil, QR code,
// barcode identitas, dan field data diri yang sama (NIPA, pangkat/golongan, no HP,
// tanggal lahir, pendidikan terakhir, alamat) — plus nama sekolah, karena admin/kepsek
// tidak punya baris di tabel `guru` untuk menyimpan semua ini.
// `adminData` diambil terpisah (bukan dari AuthContext) karena AuthContext hanya
// mengambil role/jabatan/guru_id/sekolah_id/status_akun, tidak termasuk field-field ini.
//
// CATATAN LABEL "NIPA": nama kolom database untuk field ini TETAP `nuptk` (tidak ada
// migrasi SQL yang dijalankan) — hanya label & placeholder di UI yang diubah dari
// "NUPTK" menjadi "NIPA", karena field ini dipakai lintas tenant kantor & sekolah dan
// tidak semua akun admin/kepsek adalah tenaga pendidik pemegang NUPTK.
function ProfilAdminCard({ profil, userId, adminData }) {
  const { refreshProfil } = useAuth()
  const [form, setForm] = useState({
    nama_lengkap_pendaftar: adminData?.nama_lengkap_pendaftar || '',
    email_pendaftar: adminData?.email_pendaftar || '',
    nuptk: adminData?.nuptk || '',
    pangkat_golongan: adminData?.pangkat_golongan || '',
    no_hp: adminData?.no_hp || '',
    tanggal_lahir: adminData?.tanggal_lahir || '',
    pendidikan_terakhir: adminData?.pendidikan_terakhir || '',
    alamat: adminData?.alamat || '',
  })
  const [fotoPath, setFotoPath] = useState(adminData?.foto_profil_path || '')
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  // QR code identitas admin/kepsek (dibuat dari user id -> data URL PNG), sama pola
  // seperti QR guru tapi memakai userId karena admin/kepsek tidak punya guru_id.
  const [qrDataUrl, setQrDataUrl] = useState('')

  // Sinkronkan form/foto kalau adminData datang belakangan (query async di komponen induk
  // selesai setelah render pertama komponen ini).
  useEffect(() => {
    setForm({
      nama_lengkap_pendaftar: adminData?.nama_lengkap_pendaftar || '',
      email_pendaftar: adminData?.email_pendaftar || '',
      nuptk: adminData?.nuptk || '',
      pangkat_golongan: adminData?.pangkat_golongan || '',
      no_hp: adminData?.no_hp || '',
      tanggal_lahir: adminData?.tanggal_lahir || '',
      pendidikan_terakhir: adminData?.pendidikan_terakhir || '',
      alamat: adminData?.alamat || '',
    })
    setFotoPath(adminData?.foto_profil_path || '')
  }, [adminData])

  useEffect(() => {
    if (!userId) {
      setQrDataUrl('')
      return
    }
    QRCode.toDataURL(String(userId), {
      width: 144,
      margin: 1,
      color: { dark: '#1e3a5f', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [userId])

  function fotoUrl() {
    if (!fotoPath) return null
    return supabase.storage.from('foto-profil').getPublicUrl(fotoPath).data.publicUrl
  }

  async function handleFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploadingFoto(true)

    const ext = file.name.split('.').pop()
    const path = `${userId}/foto.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('foto-profil')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      alert('Gagal upload foto: ' + uploadError.message)
      setUploadingFoto(false)
      return
    }

    // ASUMSI: tabel `profil` punya kolom `foto_profil_path` (sama seperti di tabel `guru`).
    // Kalau kolom ini belum ada, tambahkan dulu:
    // alter table profil add column foto_profil_path text;
    const { error: updateError } = await supabase
      .from('profil')
      .update({ foto_profil_path: path })
      .eq('id', userId)

    if (updateError) {
      alert('Gagal simpan foto: ' + updateError.message)
    } else {
      setFotoPath(path)
      // Sinkronkan cache profil di AuthContext supaya foto tidak balik
      // kosong saat komponen ini re-render dari data context yang basi.
      refreshProfil()
    }
    setUploadingFoto(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    // ASUMSI: tabel `profil` sudah punya kolom-kolom berikut (sama seperti di tabel
    // `guru`). Kalau belum ada, tambahkan dulu:
    // alter table profil add column nuptk text;
    // alter table profil add column pangkat_golongan text;
    // alter table profil add column no_hp text;
    // alter table profil add column tanggal_lahir date;
    // alter table profil add column pendidikan_terakhir text;
    // alter table profil add column alamat text;
    const { error } = await supabase
      .from('profil')
      .update({
        nama_lengkap_pendaftar: form.nama_lengkap_pendaftar,
        email_pendaftar: form.email_pendaftar,
        nuptk: form.nuptk,
        pangkat_golongan: form.pangkat_golongan,
        no_hp: form.no_hp,
        tanggal_lahir: form.tanggal_lahir || null,
        pendidikan_terakhir: form.pendidikan_terakhir,
        alamat: form.alamat,
      })
      .eq('id', userId)

    if (error) {
      alert('Gagal menyimpan: ' + error.message)
    } else {
      setSavedAt(new Date())
      // Sinkronkan cache profil di AuthContext, sama seperti setelah upload
      // foto — supaya form tidak balik ke data lama saat komponen ini
      // re-render dari `profil` context yang belum ikut ter-update.
      refreshProfil()
    }
    setSaving(false)
  }

  const labelJabatan = LABEL_JABATAN[profil?.jabatan] || LABEL_JABATAN[profil?.role] || profil?.jabatan || 'Admin'

  // Superadmin (akses semua sekolah) ditandai dengan sekolah_id kosong.
  // Admin/kepala sekolah biasa selalu terikat ke satu sekolah spesifik.
  const isSuperadmin = !profil?.sekolah_id
  const namaSekolah = adminData?.nama_sekolah

  // Data untuk tombol "Cetak PDF" / "Export Excel" di bawah — dibangun dari
  // state form yang sedang tampil, supaya hasil cetak/export selalu sinkron
  // dengan apa yang terlihat di layar (termasuk perubahan yang belum disimpan).
  const namaFileDataDiri = `Data-Diri-${(form.nama_lengkap_pendaftar || labelJabatan).replace(/\s+/g, '-')}`
  const dataDiriFields = [
    { label: 'Nama Lengkap', value: form.nama_lengkap_pendaftar },
    { label: 'Jabatan', value: labelJabatan },
    { label: 'Sekolah', value: isSuperadmin ? 'Akses Semua Sekolah' : namaSekolah },
    { label: 'NIPA', value: form.nuptk },
    { label: 'Pangkat / Golongan', value: form.pangkat_golongan },
    { label: 'Nomor HP', value: form.no_hp },
    { label: 'Email', value: form.email_pendaftar },
    { label: 'Tanggal Lahir', value: form.tanggal_lahir },
    { label: 'Pendidikan Terakhir', value: form.pendidikan_terakhir },
    { label: 'Alamat', value: form.alamat },
  ]

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-5">
      {/* Kartu identitas — gaya & tata letak disamakan dengan kartu guru: gradasi navy +
            motif batik emas, foto di kiri, QR code berseberangan di kanan */}
        <div className="relative overflow-hidden rounded-xl p-6 flex items-center justify-between gap-5 bg-gradient-to-br from-blue-900 to-blue-950">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

          {/* Corak batik abstrak emas — sama seperti kartu guru, supaya konsisten secara visual */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="batikEmasAdmin"
                x="0"
                y="0"
                width="72"
                height="72"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(8)"
              >
                <g fill="none" stroke="#d4af37" strokeWidth="1.1">
                  <ellipse cx="36" cy="24" rx="9" ry="14" opacity="0.55" />
                  <ellipse cx="36" cy="48" rx="9" ry="14" opacity="0.55" />
                  <ellipse cx="24" cy="36" rx="14" ry="9" opacity="0.55" />
                  <ellipse cx="48" cy="36" rx="14" ry="9" opacity="0.55" />
                  <circle cx="36" cy="36" r="3" opacity="0.7" />
                </g>
                <path
                  d="M0 72 L18 54 L36 72 L54 54 L72 72"
                  fill="none"
                  stroke="#d4af37"
                  strokeWidth="0.8"
                  opacity="0.35"
                />
                <path d="M0 0 L18 18 L0 36" fill="none" stroke="#d4af37" strokeWidth="0.8" opacity="0.3" />
                <circle cx="8" cy="8" r="1.3" fill="#d4af37" opacity="0.4" />
                <circle cx="64" cy="16" r="1.3" fill="#d4af37" opacity="0.4" />
                <circle cx="16" cy="64" r="1.3" fill="#d4af37" opacity="0.4" />
              </pattern>
              <linearGradient id="batikFadeAdmin" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#000000" stopOpacity="0" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="url(#batikEmasAdmin)" />
            <rect x="0" y="0" width="100%" height="100%" fill="url(#batikFadeAdmin)" />
          </svg>

          <div className="relative flex items-center gap-5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-white/10 ring-2 ring-white/20 overflow-hidden flex items-center justify-center">
                {fotoUrl() ? (
                  <img src={fotoUrl()} alt="Foto profil" className="w-full h-full object-cover" />
                ) : (
                  <ShieldCheck size={28} className="text-white/80" />
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brass-400 flex items-center justify-center cursor-pointer shadow-md">
                {uploadingFoto ? (
                  <Loader2 size={13} className="animate-spin text-ink-950" />
                ) : (
                  <Camera size={13} className="text-ink-950" />
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} disabled={uploadingFoto} />
              </label>
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-lg text-white truncate">
                {form.nama_lengkap_pendaftar || 'Nama belum diisi'}
              </p>
              <p className="text-sm text-blue-200/70">{labelJabatan}</p>
              <p className="text-xs text-brass-300/90 mt-0.5 truncate">
                {isSuperadmin ? 'Akses Semua Sekolah' : namaSekolah || 'Memuat nama sekolah...'}
              </p>
            </div>
          </div>

          {/* QR code — berseberangan (sisi kanan) dengan foto profil di sisi kiri, sama seperti kartu guru */}
          <div className="relative shrink-0 w-[88px] h-[88px] p-2 rounded-lg bg-white shadow-md flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code identitas admin/kepsek" width={72} height={72} />
            ) : (
              <Loader2 size={18} className="animate-spin text-ink-700/30" />
            )}
          </div>
        </div>

        <div className="card relative overflow-hidden p-6 space-y-4">
          <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 to-brass-400" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-700/60 mb-1 block">Nama Lengkap</label>
              <input
                className="input w-full"
                value={form.nama_lengkap_pendaftar}
                onChange={(e) => setForm({ ...form, nama_lengkap_pendaftar: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs text-ink-700/60 mb-1 block">NIPA</label>
              <input
                className="input w-full"
                placeholder="mis. 765368787875555"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.nuptk}
                onChange={(e) => setForm({ ...form, nuptk: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-ink-700/60 mb-1 block">Pangkat / Golongan</label>
              <input
                className="input w-full"
                placeholder="mis. Penata Muda / III-a"
                value={form.pangkat_golongan}
                onChange={(e) => setForm({ ...form, pangkat_golongan: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-ink-700/60 mb-1 block">Nomor HP</label>
              <input
                className="input w-full"
                value={form.no_hp}
                onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-ink-700/60 mb-1 block">Email</label>
              <input
                className="input w-full"
                type="email"
                value={form.email_pendaftar}
                onChange={(e) => setForm({ ...form, email_pendaftar: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-ink-700/60 mb-1 block">Tanggal Lahir</label>
              <input
                className="input w-full"
                type="date"
                value={form.tanggal_lahir || ''}
                onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-ink-700/60 mb-1 block">Pendidikan Terakhir</label>
              <input
                className="input w-full"
                placeholder="mis. S1 Pendidikan Guru SD"
                value={form.pendidikan_terakhir}
                onChange={(e) => setForm({ ...form, pendidikan_terakhir: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-ink-700/60 mb-1 block">Jabatan</label>
              <input className="input w-full" value={labelJabatan} disabled />
            </div>
            <div>
              <label className="text-xs text-ink-700/60 mb-1 block">Sekolah</label>
              <input
                className="input w-full"
                value={isSuperadmin ? 'Akses Semua Sekolah' : namaSekolah || 'Memuat...'}
                disabled
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-ink-700/60 mb-1 block">Alamat</label>
              <textarea
                className="input w-full"
                rows={2}
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brass-400 text-ink-950 text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <TombolCetakDataDiri
              fields={dataDiriFields}
              judul={`Data Diri — ${labelJabatan}`}
              namaOrang={form.nama_lengkap_pendaftar}
              namaFile={namaFileDataDiri}
            />
            {savedAt && <span className="text-xs text-sage-500">Tersimpan</span>}
          </div>
        </div>

        {/* Kode batang ID admin/kepsek — sama pola seperti barcode guru, tapi memakai userId
            karena tidak ada baris di tabel `guru` untuk akun ini */}
        <div className="flex flex-col items-center gap-2 py-4 border-t border-ink-900/[0.08]">
          <div className="p-3 rounded-lg bg-white ring-1 ring-ink-900/[0.08] shadow-sm">
            <Barcode
              value={String(userId)}
              width={1.6}
              height={56}
              fontSize={12}
              background="#ffffff"
              lineColor="#1e3a5f"
            />
          </div>
          <p className="text-xs text-ink-700/50">ID {labelJabatan}</p>
        </div>
    </form>
  )
}

// Kartu profil untuk akun PEGAWAI KANTOR (jabatan/role 'pegawai' atau
// 'kepala_kantor') yang sudah dihubungkan ke tabel `pegawai_kantor` lewat
// profil.pegawai_id (dihubungkan lewat ModalHubungkanPegawai di
// PersetujuanAkun.jsx). Mengikuti pola persis ProfilAdminCard di atas
// (kartu identitas navy + batik, QR code, form data diri, barcode), tapi
// datanya diambil/disimpan langsung ke tabel `pegawai_kantor`, bukan
// `profil` — karena data pegawai memang tinggal di tabel itu.
//
// ASUMSI kolom tabel pegawai_kantor (kalau belum ada, tambahkan dulu):
// alter table pegawai_kantor add column if not exists no_hp text;
// alter table pegawai_kantor add column if not exists tanggal_lahir date;
// alter table pegawai_kantor add column if not exists pendidikan_terakhir text;
// alter table pegawai_kantor add column if not exists alamat text;
// alter table pegawai_kantor add column if not exists foto_profil_path text;
function ProfilPegawaiCard({ pegawaiData, onDataBerubah }) {
  const [form, setForm] = useState({
    nama_lengkap: pegawaiData?.nama_lengkap || '',
    email: pegawaiData?.email || '',
    nip: pegawaiData?.nip || '',
    jabatan: pegawaiData?.jabatan || '',
    no_hp: pegawaiData?.no_hp || '',
    tanggal_lahir: pegawaiData?.tanggal_lahir || '',
    pendidikan_terakhir: pegawaiData?.pendidikan_terakhir || '',
    alamat: pegawaiData?.alamat || '',
  })
  const [fotoPath, setFotoPath] = useState(pegawaiData?.foto_profil_path || '')
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  // Sinkronkan form/foto kalau pegawaiData datang belakangan atau berubah
  // setelah simpan (lewat onDataBerubah -> reload dari komponen induk).
  useEffect(() => {
    setForm({
      nama_lengkap: pegawaiData?.nama_lengkap || '',
      email: pegawaiData?.email || '',
      nip: pegawaiData?.nip || '',
      jabatan: pegawaiData?.jabatan || '',
      no_hp: pegawaiData?.no_hp || '',
      tanggal_lahir: pegawaiData?.tanggal_lahir || '',
      pendidikan_terakhir: pegawaiData?.pendidikan_terakhir || '',
      alamat: pegawaiData?.alamat || '',
    })
    setFotoPath(pegawaiData?.foto_profil_path || '')
  }, [pegawaiData])

  useEffect(() => {
    if (!pegawaiData?.id) {
      setQrDataUrl('')
      return
    }
    QRCode.toDataURL(String(pegawaiData.id), {
      width: 144,
      margin: 1,
      color: { dark: '#1e3a5f', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [pegawaiData?.id])

  function fotoUrl() {
    if (!fotoPath) return null
    return supabase.storage.from('foto-profil').getPublicUrl(fotoPath).data.publicUrl
  }

  async function handleFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file || !pegawaiData?.id) return
    setUploadingFoto(true)

    const ext = file.name.split('.').pop()
    const path = `${pegawaiData.id}/foto.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('foto-profil')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      alert('Gagal upload foto: ' + uploadError.message)
      setUploadingFoto(false)
      return
    }

    const { error: updateError } = await supabase
      .from('pegawai_kantor')
      .update({ foto_profil_path: path })
      .eq('id', pegawaiData.id)

    if (updateError) {
      alert('Gagal simpan foto: ' + updateError.message)
    } else {
      setFotoPath(path)
      // Sinkronkan data pegawai di komponen induk (ProfilSaya) supaya foto
      // tidak balik kosong lagi saat halaman ini re-render.
      onDataBerubah?.()
    }
    setUploadingFoto(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('pegawai_kantor')
      .update({
        nama_lengkap: form.nama_lengkap,
        email: form.email,
        nip: form.nip,
        jabatan: form.jabatan,
        no_hp: form.no_hp,
        tanggal_lahir: form.tanggal_lahir || null,
        pendidikan_terakhir: form.pendidikan_terakhir,
        alamat: form.alamat,
      })
      .eq('id', pegawaiData.id)

    if (error) {
      alert('Gagal menyimpan: ' + error.message)
    } else {
      setSavedAt(new Date())
      onDataBerubah?.()
    }
    setSaving(false)
  }

  const namaFileDataDiri = `Data-Diri-${(form.nama_lengkap || 'Pegawai').replace(/\s+/g, '-')}`
  const dataDiriFields = [
    { label: 'Nama Lengkap', value: form.nama_lengkap },
    { label: 'Jabatan', value: form.jabatan },
    { label: 'NIP', value: form.nip },
    { label: 'Nomor HP', value: form.no_hp },
    { label: 'Email', value: form.email },
    { label: 'Tanggal Lahir', value: form.tanggal_lahir },
    { label: 'Pendidikan Terakhir', value: form.pendidikan_terakhir },
    { label: 'Alamat', value: form.alamat },
  ]

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-5">
      {/* Kartu identitas — gaya & tata letak sama seperti ProfilAdminCard, supaya
            konsisten secara visual antar jenis akun */}
      <div className="relative overflow-hidden rounded-xl p-6 flex items-center justify-between gap-5 bg-gradient-to-br from-blue-900 to-blue-950">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="batikEmasPegawai"
              x="0"
              y="0"
              width="72"
              height="72"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(8)"
            >
              <g fill="none" stroke="#d4af37" strokeWidth="1.1">
                <ellipse cx="36" cy="24" rx="9" ry="14" opacity="0.55" />
                <ellipse cx="36" cy="48" rx="9" ry="14" opacity="0.55" />
                <ellipse cx="24" cy="36" rx="14" ry="9" opacity="0.55" />
                <ellipse cx="48" cy="36" rx="14" ry="9" opacity="0.55" />
                <circle cx="36" cy="36" r="3" opacity="0.7" />
              </g>
              <path
                d="M0 72 L18 54 L36 72 L54 54 L72 72"
                fill="none"
                stroke="#d4af37"
                strokeWidth="0.8"
                opacity="0.35"
              />
              <path d="M0 0 L18 18 L0 36" fill="none" stroke="#d4af37" strokeWidth="0.8" opacity="0.3" />
              <circle cx="8" cy="8" r="1.3" fill="#d4af37" opacity="0.4" />
              <circle cx="64" cy="16" r="1.3" fill="#d4af37" opacity="0.4" />
              <circle cx="16" cy="64" r="1.3" fill="#d4af37" opacity="0.4" />
            </pattern>
            <linearGradient id="batikFadePegawai" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#000000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#batikEmasPegawai)" />
          <rect x="0" y="0" width="100%" height="100%" fill="url(#batikFadePegawai)" />
        </svg>

        <div className="relative flex items-center gap-5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-white/10 ring-2 ring-white/20 overflow-hidden flex items-center justify-center">
              {fotoUrl() ? (
                <img src={fotoUrl()} alt="Foto profil" className="w-full h-full object-cover" />
              ) : (
                <ShieldCheck size={28} className="text-white/80" />
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brass-400 flex items-center justify-center cursor-pointer shadow-md">
              {uploadingFoto ? (
                <Loader2 size={13} className="animate-spin text-ink-950" />
              ) : (
                <Camera size={13} className="text-ink-950" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} disabled={uploadingFoto} />
            </label>
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-lg text-white truncate">
              {form.nama_lengkap || 'Nama belum diisi'}
            </p>
            <p className="text-sm text-blue-200/70">{form.jabatan || 'Pegawai Kantor'}</p>
          </div>
        </div>

        <div className="relative shrink-0 w-[88px] h-[88px] p-2 rounded-lg bg-white shadow-md flex items-center justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code identitas pegawai" width={72} height={72} />
          ) : (
            <Loader2 size={18} className="animate-spin text-ink-700/30" />
          )}
        </div>
      </div>

      <div className="card relative overflow-hidden p-6 space-y-4">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 to-brass-400" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-ink-700/60 mb-1 block">Nama Lengkap</label>
            <input
              className="input w-full"
              value={form.nama_lengkap}
              onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-xs text-ink-700/60 mb-1 block">Jabatan</label>
            <input
              className="input w-full"
              placeholder="mis. Staf Tata Usaha"
              value={form.jabatan}
              onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-ink-700/60 mb-1 block">NIP</label>
            <input
              className="input w-full"
              value={form.nip}
              onChange={(e) => setForm({ ...form, nip: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-ink-700/60 mb-1 block">Nomor HP</label>
            <input
              className="input w-full"
              value={form.no_hp}
              onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-ink-700/60 mb-1 block">Email</label>
            <input
              className="input w-full"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-ink-700/60 mb-1 block">Tanggal Lahir</label>
            <input
              className="input w-full"
              type="date"
              value={form.tanggal_lahir || ''}
              onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-ink-700/60 mb-1 block">Pendidikan Terakhir</label>
            <input
              className="input w-full"
              value={form.pendidikan_terakhir}
              onChange={(e) => setForm({ ...form, pendidikan_terakhir: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-ink-700/60 mb-1 block">Alamat</label>
            <textarea
              className="input w-full"
              rows={2}
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brass-400 text-ink-950 text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <TombolCetakDataDiri
            fields={dataDiriFields}
            judul="Data Diri — Pegawai Kantor"
            namaOrang={form.nama_lengkap}
            namaFile={namaFileDataDiri}
          />
          {savedAt && <span className="text-xs text-sage-500">Tersimpan</span>}
        </div>
      </div>

      {/* Kode batang ID pegawai — sama pola seperti barcode admin/guru */}
      <div className="flex flex-col items-center gap-2 py-4 border-t border-ink-900/[0.08]">
        <div className="p-3 rounded-lg bg-white ring-1 ring-ink-900/[0.08] shadow-sm">
          <Barcode
            value={String(pegawaiData?.id || '')}
            width={1.6}
            height={56}
            fontSize={12}
            background="#ffffff"
            lineColor="#1e3a5f"
          />
        </div>
        <p className="text-xs text-ink-700/50">ID Pegawai</p>
      </div>
    </form>
  )
}

// Modal untuk menghubungkan anak tambahan (ke-2, ke-3, dst) ke akun orang
// tua yang sudah login. Sengaja dibuat terpisah dari alur pendaftaran
// (Register.jsx) — di sini siswa difilter dari sekolah_id akun yang sudah
// login (profil.sekolah_id), bukan dari sekolah yang dipilih di form
// pendaftaran. Memanggil tambahAnak() dari AuthContext yang sudah ada;
// baris baru otomatis berstatus 'menunggu' dan akan muncul di tab
// "Anak Menunggu" pada halaman admin PersetujuanAkun.jsx.
function ModalTambahAnak({ sekolahId, anakSudahTerhubung, onClose, onBerhasil }) {
  const { tambahAnak } = useAuth()
  const [daftarSiswa, setDaftarSiswa] = useState([])
  const [loadingSiswa, setLoadingSiswa] = useState(true)
  const [siswaId, setSiswaId] = useState('')
  const [hubungan, setHubungan] = useState('')
  const [mengirim, setMengirim] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let aktif = true
    async function muat() {
      setLoadingSiswa(true)
      const { data } = await supabase
        .from('siswa_publik_registrasi')
        .select('id, nama_lengkap, nis, nisn')
        .eq('sekolah_id', sekolahId)
        .order('nama_lengkap')
      if (!aktif) return
      // Sembunyikan siswa yang sudah tertaut (status menunggu/aktif) ke
      // akun ini, supaya tidak dobel kirim permintaan untuk anak yang sama.
      const idSudahAda = (anakSudahTerhubung || []).map((a) => a.siswa?.id).filter(Boolean)
      setDaftarSiswa((data || []).filter((s) => !idSudahAda.includes(s.id)))
      setLoadingSiswa(false)
    }
    if (sekolahId) muat()
    return () => {
      aktif = false
    }
  }, [sekolahId, anakSudahTerhubung])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!siswaId) {
      setError('Silakan pilih anak dari daftar.')
      return
    }
    if (!hubungan) {
      setError('Silakan pilih hubungan dengan anak.')
      return
    }
    setMengirim(true)
    const { error: err } = await tambahAnak({ siswaId, hubungan })
    setMengirim(false)
    if (err) {
      setError(err.message || 'Gagal mengirim permintaan.')
      return
    }
    onBerhasil()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-ink-950">Tambah Anak</h2>
          <button type="button" onClick={onClose} className="text-ink-700/40 hover:text-ink-700/70">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-ink-700/50 mb-4">
          Pilih anak lain yang juga merupakan tanggungan Anda. Permintaan ini akan menunggu
          persetujuan admin sekolah sebelum muncul di daftar "Anak Terhubung".
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label-field">Nama Anak</label>
            <select
              className="input-field"
              value={siswaId}
              onChange={(e) => setSiswaId(e.target.value)}
              disabled={loadingSiswa}
            >
              <option value="">
                {loadingSiswa
                  ? 'Memuat daftar siswa...'
                  : daftarSiswa.length === 0
                    ? 'Tidak ada siswa lain yang bisa dipilih'
                    : '-- Pilih Anak --'}
              </option>
              {daftarSiswa.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_lengkap}
                  {s.nis ? ` (NIS: ${s.nis})` : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-ink-700/40 mt-1">
              Tidak menemukan nama anak Anda? Hubungi admin sekolah untuk memastikan data siswa
              sudah terdaftar.
            </p>
          </div>

          <div>
            <label className="label-field">Hubungan dengan Anak</label>
            <select className="input-field" value={hubungan} onChange={(e) => setHubungan(e.target.value)}>
              <option value="">-- Pilih Hubungan --</option>
              <option value="ayah">Ayah</option>
              <option value="ibu">Ibu</option>
              <option value="wali">Wali</option>
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={mengirim} className="btn-primary w-full justify-center" >
            {mengirim && <Loader2 size={16} className="animate-spin" />}
            {mengirim ? 'Mengirim...' : 'Kirim Permintaan'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Kartu profil untuk akun ORANG TUA/WALI — jauh lebih sederhana dari kartu
// guru/admin (tidak ada NIPA, pangkat/golongan, QR/barcode identitas
// pegawai — semua itu tidak relevan untuk orang tua). Field yang bisa
// diisi hanya identitas dasar (nama, email, no HP, alamat) + foto profil.
// Di bawah kartu, ditampilkan juga daftar anak yang tertaut ke akun ini
// beserta status persetujuannya, supaya orang tua langsung tahu kalau ada
// hubungan yang masih menunggu/ditolak tanpa harus buka halaman lain, plus
// tombol untuk menghubungkan anak tambahan (ke-2, ke-3, dst).
function ProfilOrangTuaCard({ profil, userId }) {
  const { getAnakSaya, refreshProfil } = useAuth()

  const [form, setForm] = useState({
    nama_lengkap_pendaftar: profil?.nama_lengkap_pendaftar || '',
    email_pendaftar: profil?.email_pendaftar || '',
    no_hp: profil?.no_hp || '',
    alamat: profil?.alamat || '',
  })
  const [fotoPath, setFotoPath] = useState(profil?.foto_profil_path || '')
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  const [anakList, setAnakList] = useState([])
  const [loadingAnak, setLoadingAnak] = useState(true)
  const [showTambahAnak, setShowTambahAnak] = useState(false)

  useEffect(() => {
    setForm({
      nama_lengkap_pendaftar: profil?.nama_lengkap_pendaftar || '',
      email_pendaftar: profil?.email_pendaftar || '',
      no_hp: profil?.no_hp || '',
      alamat: profil?.alamat || '',
    })
    setFotoPath(profil?.foto_profil_path || '')
  }, [profil])

  async function muatAnak() {
    setLoadingAnak(true)
    const { data } = await getAnakSaya()
    setAnakList(data || [])
    setLoadingAnak(false)
  }

  useEffect(() => {
    muatAnak()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fotoUrl() {
    if (!fotoPath) return null
    return supabase.storage.from('foto-profil').getPublicUrl(fotoPath).data.publicUrl
  }

  async function handleFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploadingFoto(true)

    const ext = file.name.split('.').pop()
    const path = `${userId}/foto.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('foto-profil')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      alert('Gagal upload foto: ' + uploadError.message)
      setUploadingFoto(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profil')
      .update({ foto_profil_path: path })
      .eq('id', userId)

    if (updateError) {
      alert('Gagal simpan foto: ' + updateError.message)
    } else {
      setFotoPath(path)
      // Sinkronkan cache profil di AuthContext supaya foto tidak balik
      // kosong saat komponen ini re-render dari data context yang basi.
      refreshProfil()
    }
    setUploadingFoto(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('profil')
      .update({
        nama_lengkap_pendaftar: form.nama_lengkap_pendaftar,
        email_pendaftar: form.email_pendaftar,
        no_hp: form.no_hp,
        alamat: form.alamat,
      })
      .eq('id', userId)

    if (error) {
      alert('Gagal menyimpan: ' + error.message)
    } else {
      setSavedAt(new Date())
      // Sinkronkan cache profil di AuthContext — inilah perbaikan untuk bug
      // "Tersimpan tapi balik kosong lagi": form ini diisi dari `profil`
      // context, jadi kalau context tidak ikut di-refresh, render berikutnya
      // (pindah halaman lalu balik lagi) akan menimpa form dengan data lama.
      refreshProfil()
    }
    setSaving(false)
  }

  const STATUS_BADGE = {
    aktif: { label: 'Disetujui', className: 'bg-sage-500/10 text-sage-600', icon: CheckCircle2 },
    menunggu: { label: 'Menunggu Persetujuan', className: 'bg-amber-500/10 text-amber-600', icon: Clock },
    ditolak: { label: 'Ditolak', className: 'bg-red-50 text-red-700', icon: XCircle },
  }

  // Data untuk tombol "Cetak PDF" / "Export Excel" — termasuk daftar anak
  // terhubung, supaya lembar cetak juga berguna sebagai bukti tautan akun
  // ke anak, bukan cuma identitas dasar orang tua.
  const dataDiriFields = [
    { label: 'Nama Lengkap', value: form.nama_lengkap_pendaftar },
    { label: 'Status Akun', value: 'Orang Tua/Wali' },
    { label: 'Email', value: form.email_pendaftar },
    { label: 'Nomor HP', value: form.no_hp },
    { label: 'Alamat', value: form.alamat },
    ...anakList.map((a) => ({
      label: `Anak: ${a.siswa?.nama_lengkap || '-'}`,
      value: `${a.siswa?.kelas?.nama_kelas || '-'} · ${a.hubungan || '-'} · ${STATUS_BADGE[a.status]?.label || a.status || '-'}`,
    })),
  ]
  const namaFileDataDiri = `Data-Diri-${(form.nama_lengkap_pendaftar || 'Orang-Tua').replace(/\s+/g, '-')}`

  return (
      <div className="max-w-2xl space-y-5">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="relative overflow-hidden rounded-xl p-6 flex items-center justify-between gap-5 bg-gradient-to-br from-blue-900 to-blue-950">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

            <div className="relative flex items-center gap-5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-full bg-white/10 ring-2 ring-white/20 overflow-hidden flex items-center justify-center">
                  {fotoUrl() ? (
                    <img src={fotoUrl()} alt="Foto profil" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle2 size={32} className="text-white/80" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brass-400 flex items-center justify-center cursor-pointer shadow-md">
                  {uploadingFoto ? (
                    <Loader2 size={13} className="animate-spin text-ink-950" />
                  ) : (
                    <Camera size={13} className="text-ink-950" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} disabled={uploadingFoto} />
                </label>
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold text-lg text-white truncate">
                  {form.nama_lengkap_pendaftar || 'Nama belum diisi'}
                </p>
                <p className="text-xs text-white/60 mt-0.5">Orang Tua/Wali</p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label-field">Nama Lengkap</label>
                <input
                  className="input-field"
                  value={form.nama_lengkap_pendaftar}
                  onChange={(e) => setForm((f) => ({ ...f, nama_lengkap_pendaftar: e.target.value }))}
                />
              </div>
              <div>
                <label className="label-field">Email</label>
                <input
                  className="input-field"
                  type="email"
                  value={form.email_pendaftar}
                  onChange={(e) => setForm((f) => ({ ...f, email_pendaftar: e.target.value }))}
                />
              </div>
              <div>
                <label className="label-field">No. HP</label>
                <input
                  className="input-field"
                  value={form.no_hp}
                  onChange={(e) => setForm((f) => ({ ...f, no_hp: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-field">Alamat</label>
                <textarea
                  className="input-field min-h-[70px]"
                  value={form.alamat}
                  onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                <Save size={16} /> Simpan
              </button>
              <TombolCetakDataDiri
                fields={dataDiriFields}
                judul="Data Diri — Orang Tua/Wali"
                namaOrang={form.nama_lengkap_pendaftar}
                namaFile={namaFileDataDiri}
              />
              {savedAt && <p className="text-xs text-sage-600">Tersimpan.</p>}
            </div>
          </div>
        </form>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-display font-semibold text-ink-950 flex items-center gap-2">
              <Users size={16} /> Anak Terhubung
            </h4>
            <button
              type="button"
              onClick={() => setShowTambahAnak(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-brass-400/10 text-brass-600 hover:bg-brass-400/20"
            >
              <UserPlus size={14} /> Tambah Anak
            </button>
          </div>
          {loadingAnak ? (
            <p className="text-sm text-ink-700/50 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Memuat...
            </p>
          ) : anakList.length === 0 ? (
            <p className="text-sm text-ink-700/50">Belum ada anak yang tertaut ke akun ini.</p>
          ) : (
            <div className="space-y-2">
              {anakList.map((a) => {
                const badge = STATUS_BADGE[a.status] || STATUS_BADGE.menunggu
                const Icon = badge.icon
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3 border border-ink-950/10 rounded-lg p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink-950 truncate">{a.siswa?.nama_lengkap}</p>
                      <p className="text-xs text-ink-700/50">
                        {a.siswa?.kelas?.nama_kelas || '-'} · {a.hubungan || '-'}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${badge.className}`}>
                      <Icon size={12} /> {badge.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {showTambahAnak && (
          <ModalTambahAnak
            sekolahId={profil?.sekolah_id}
            anakSudahTerhubung={anakList}
            onClose={() => setShowTambahAnak(false)}
            onBerhasil={() => {
              setShowTambahAnak(false)
              muatAnak()
            }}
          />
        )}
      </div>
  )
}

// PERBAIKAN "profil lengkap guru": bagian form guru di bawah (di dalam
// ProfilSaya) sebelumnya hanya menampilkan/bisa mengedit 8 field (nama,
// mapel, NUPTK, pangkat/golongan, no HP, email, tanggal lahir, pendidikan
// terakhir) — padahal tabel `guru` menyimpan seluruh field Formulir
// Dapodik yang sama seperti di form admin Guru.jsx (Data Pribadi, Riwayat
// Pendidikan & Pelatihan, Kepegawaian, Alamat & Lokasi, Kontak, Lainnya).
// Sekarang guru yang login bisa melihat DAN mengedit datanya sendiri
// secara lengkap, dikelompokkan dengan struktur seksi yang sama seperti
// form admin, supaya konsisten. SeksiForm/Field di bawah ini adalah
// helper lokal untuk file ini (terpisah dari yang ada di Guru.jsx).
//
// CATATAN: field NUPTK di form guru DI BAWAH INI TETAP berlabel "NUPTK"
// (tidak diganti "NIPA") karena field ini untuk tenaga pendidik tenant
// sekolah — beda dari NIPA di ProfilAdminCard di atas, yang khusus akun
// admin/kepsek/superadmin (termasuk tenant kantor seperti KUA).
function SeksiForm({ judul, children }) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">{judul}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

function Field({ label, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="text-xs text-ink-700/60 mb-1 block">{label}</label>
      {children}
    </div>
  )
}

export default function ProfilSaya() {
  const { profil, session, isAdmin, isOrangTua } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  // Kelas & siswa yang diampu (sebagai wali kelas)
  const [kelasAsuh, setKelasAsuh] = useState([]) // [{ id, nama_kelas, siswa: [...] }]
  const [loadingSiswa, setLoadingSiswa] = useState(true)

  // QR code identitas guru (dibuat dari qrcode -> data URL PNG)
  const [qrDataUrl, setQrDataUrl] = useState('')

  // Data pendaftar (nama, email, foto, nama sekolah) untuk akun admin/kepala sekolah
  // tanpa guru_id. Diambil terpisah dari AuthContext supaya AuthContext.jsx tidak perlu diubah.
  const [adminData, setAdminData] = useState(null)
  const [loadingAdminData, setLoadingAdminData] = useState(true)

  // Data pegawai kantor (tabel pegawai_kantor) untuk akun berjabatan
  // 'pegawai'/'kepala_kantor' yang sudah dihubungkan lewat profil.pegawai_id
  // (dihubungkan lewat ModalHubungkanPegawai di halaman admin PersetujuanAkun.jsx).
  const isPegawaiKantor = ['pegawai', 'kepala_kantor'].includes(profil?.jabatan || profil?.role)
  const [pegawaiData, setPegawaiData] = useState(null)
  const [loadingPegawaiData, setLoadingPegawaiData] = useState(true)

  useEffect(() => {
    async function load() {
      if (!profil?.guru_id) {
        setLoading(false)
        setLoadingSiswa(false)
        return
      }
      const { data: row } = await supabase
        .from('guru')
        .select('*')
        .eq('id', profil.guru_id)
        .maybeSingle()

      // PERBAIKAN: field tanggal dari Supabase perlu dipotong ke "yyyy-mm-dd"
      // supaya cocok dengan <input type="date">, dan jumlah anak tanggungan
      // (angka) diubah ke string kosong/berisi — pola yang sama seperti
      // openEdit() di Guru.jsx, supaya form ini tidak "kosong padahal ada
      // datanya" untuk field-field tersebut.
      setData(
        row
          ? {
              ...row,
              tanggal_lahir: row.tanggal_lahir ? String(row.tanggal_lahir).slice(0, 10) : '',
              tanggal_cpns: row.tanggal_cpns ? String(row.tanggal_cpns).slice(0, 10) : '',
              tmt_pengangkatan: row.tmt_pengangkatan ? String(row.tmt_pengangkatan).slice(0, 10) : '',
              tmt_pns: row.tmt_pns ? String(row.tmt_pns).slice(0, 10) : '',
              jumlah_anak_tanggungan:
                row.jumlah_anak_tanggungan === null || row.jumlah_anak_tanggungan === undefined
                  ? ''
                  : String(row.jumlah_anak_tanggungan),
            }
          : null
      )
      setLoading(false)
    }
    load()
  }, [profil])

  useEffect(() => {
    async function loadAdminData() {
      const userId = session?.user?.id
      if (profil?.guru_id || !isAdmin || !userId) {
        setLoadingAdminData(false)
        return
      }
      setLoadingAdminData(true)

      const { data: row } = await supabase
        .from('profil')
        .select(
          'nama_lengkap_pendaftar, email_pendaftar, foto_profil_path, nuptk, pangkat_golongan, no_hp, tanggal_lahir, pendidikan_terakhir, alamat'
        )
        .eq('id', userId)
        .maybeSingle()

      // Nama sekolah diambil lewat query terpisah (bukan join/embed) supaya tidak
      // tergantung ada-tidaknya foreign key profil.sekolah_id -> sekolah.id di skema
      // Supabase. Superadmin (sekolah_id kosong) tidak perlu query ini sama sekali.
      // ASUMSI: tabel `sekolah` punya kolom `nama_sekolah` — sesuaikan kalau nama
      // kolomnya berbeda di skema kamu (mis. `nama`).
      let namaSekolah = null
      if (profil?.sekolah_id) {
        const { data: sekolahRow } = await supabase
          .from('sekolah')
          .select('nama_sekolah')
          .eq('id', profil.sekolah_id)
          .maybeSingle()
        namaSekolah = sekolahRow?.nama_sekolah || null
      }

      setAdminData({ ...row, nama_sekolah: namaSekolah })
      setLoadingAdminData(false)
    }
    loadAdminData()
  }, [profil, isAdmin, session])

  // Muat data pegawai kantor kalau akun ini berjabatan pegawai/kepala kantor
  // dan sudah dihubungkan (profil.pegawai_id terisi). Dipisah jadi fungsi
  // (bukan langsung di dalam useEffect) supaya bisa dipanggil ulang lewat
  // prop onDataBerubah dari ProfilPegawaiCard setelah simpan/upload foto —
  // pola yang sama seperti refreshProfil() di AuthContext untuk kartu lain.
  async function muatPegawaiData() {
    if (!profil?.pegawai_id) {
      setLoadingPegawaiData(false)
      return
    }
    setLoadingPegawaiData(true)
    const { data: row } = await supabase
      .from('pegawai_kantor')
      .select('*')
      .eq('id', profil.pegawai_id)
      .maybeSingle()
    setPegawaiData(row)
    setLoadingPegawaiData(false)
  }

  useEffect(() => {
    muatPegawaiData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil])

  useEffect(() => {
    async function loadSiswaAsuh() {
      if (!profil?.guru_id) {
        setLoadingSiswa(false)
        return
      }
      setLoadingSiswa(true)

      const { data: kelasList } = await supabase
        .from('kelas')
        .select('id, nama_kelas, tingkat')
        .eq('wali_kelas_id', profil.guru_id)
        .order('nama_kelas')

      if (!kelasList || kelasList.length === 0) {
        setKelasAsuh([])
        setLoadingSiswa(false)
        return
      }

      const kelasIds = kelasList.map((k) => k.id)
      const { data: siswaList } = await supabase
        .from('siswa')
        .select('id, nama_lengkap, nis, foto_path, kelas_id, status')
        .in('kelas_id', kelasIds)
        .eq('status', 'aktif')
        .order('nama_lengkap')

      const gabung = kelasList.map((k) => ({
        ...k,
        siswa: (siswaList || []).filter((s) => s.kelas_id === k.id),
      }))
      setKelasAsuh(gabung)
      setLoadingSiswa(false)
    }
    loadSiswaAsuh()
  }, [profil])

  // Buat QR code setiap kali id guru berubah/tersedia
  useEffect(() => {
    if (!data?.id) {
      setQrDataUrl('')
      return
    }
    QRCode.toDataURL(String(data.id), {
      width: 144,
      margin: 1,
      color: { dark: '#1e3a5f', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [data?.id])

  function fotoUrl() {
    if (!data?.foto_profil_path) return null
    return supabase.storage.from('foto-profil').getPublicUrl(data.foto_profil_path).data.publicUrl
  }

  function fotoSiswaUrl(path) {
    if (!path) return null
    return supabase.storage.from('foto-siswa').getPublicUrl(path).data.publicUrl
  }

  async function handleFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFoto(true)

    const ext = file.name.split('.').pop()
    const path = `${profil.guru_id}/foto.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('foto-profil')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      alert('Gagal upload foto: ' + uploadError.message)
      setUploadingFoto(false)
      return
    }

    const { error: updateError } = await supabase
      .from('guru')
      .update({ foto_profil_path: path })
      .eq('id', profil.guru_id)

    if (updateError) {
      alert('Gagal simpan foto: ' + updateError.message)
    } else {
      setData({ ...data, foto_profil_path: path })
    }
    setUploadingFoto(false)
  }

  // PERBAIKAN: payload sebelumnya hanya berisi 9 field. Sekarang mengirim
  // seluruh field Formulir Dapodik yang ada di tabel `guru` (sama seperti
  // handleSubmit di Guru.jsx), dengan konversi tipe yang sama (angka
  // kosong -> null, tanggal kosong -> null) supaya tidak menabrak tipe
  // kolom di database.
  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      // Data Pribadi
      nama_lengkap: data.nama_lengkap,
      nip: data.nip,
      nuptk: data.nuptk,
      nik: data.nik,
      no_kk: data.no_kk,
      jenis_kelamin: data.jenis_kelamin,
      tempat_lahir: data.tempat_lahir,
      tanggal_lahir: data.tanggal_lahir || null,
      agama: data.agama,
      kewarganegaraan: data.kewarganegaraan,
      status_perkawinan: data.status_perkawinan,
      nama_ibu_kandung: data.nama_ibu_kandung,
      nama_pasangan: data.nama_pasangan,
      nip_pasangan: data.nip_pasangan,
      pekerjaan_pasangan: data.pekerjaan_pasangan,
      jumlah_anak_tanggungan:
        data.jumlah_anak_tanggungan === '' ? null : Number(data.jumlah_anak_tanggungan),
      pendidikan_terakhir: data.pendidikan_terakhir,
      // Riwayat Pendidikan & Pelatihan
      nama_lembaga_pendidikan: data.nama_lembaga_pendidikan,
      fakultas: data.fakultas,
      jurusan: data.jurusan,
      tahun_lulus: data.tahun_lulus === '' || data.tahun_lulus === null ? null : Number(data.tahun_lulus),
      penataran_diklat: data.penataran_diklat,
      // Kepegawaian
      status_kepegawaian: data.status_kepegawaian,
      jenis_ptk: data.jenis_ptk,
      mata_pelajaran: data.mata_pelajaran,
      tugas_tambahan: data.tugas_tambahan,
      pangkat_golongan: data.pangkat_golongan,
      sumber_gaji: data.sumber_gaji,
      sk_cpns: data.sk_cpns,
      tanggal_cpns: data.tanggal_cpns || null,
      sk_pengangkatan: data.sk_pengangkatan,
      tmt_pengangkatan: data.tmt_pengangkatan || null,
      lembaga_pengangkatan: data.lembaga_pengangkatan,
      tmt_pns: data.tmt_pns || null,
      sudah_lisensi_kepsek: data.sudah_lisensi_kepsek,
      pernah_diklat_pengawas: data.pernah_diklat_pengawas,
      karpeg: data.karpeg,
      karis_karsu: data.karis_karsu,
      nuks: data.nuks,
      // Alamat & Lokasi
      alamat_jalan: data.alamat_jalan,
      rt: data.rt,
      rw: data.rw,
      nama_dusun: data.nama_dusun,
      desa_kelurahan: data.desa_kelurahan,
      kecamatan: data.kecamatan,
      kode_pos: data.kode_pos,
      lintang: data.lintang === '' || data.lintang === null || data.lintang === undefined ? null : Number(data.lintang),
      bujur: data.bujur === '' || data.bujur === null || data.bujur === undefined ? null : Number(data.bujur),
      // Kontak
      telepon: data.telepon,
      no_hp: data.no_hp,
      email: data.email,
      // Lainnya
      keahlian_braille: data.keahlian_braille,
      keahlian_bahasa_isyarat: data.keahlian_bahasa_isyarat,
      npwp: data.npwp,
      nama_wajib_pajak: data.nama_wajib_pajak,
      bank: data.bank,
      no_rekening: data.no_rekening,
      rekening_atas_nama: data.rekening_atas_nama,
    }

    const { error } = await supabase.from('guru').update(payload).eq('id', profil.guru_id)

    if (error) {
      alert('Gagal menyimpan: ' + error.message)
    } else {
      setSavedAt(new Date())
    }
    setSaving(false)
  }

  const sedangMemuat =
    loading ||
    (!profil?.guru_id && isAdmin && loadingAdminData) ||
    (!profil?.guru_id && isPegawaiKantor && loadingPegawaiData)

  if (sedangMemuat) {
    return (
      <Layout title="Profil Saya" subtitle="Data diri dan foto profil Anda">
        <p className="text-sm text-ink-700/50">Memuat...</p>
      </Layout>
    )
  }

  // Akun tanpa guru_id: kalau role-nya termasuk kelompok admin (admin, admin_utama,
  // superadmin, kepala_sekolah — persis sama dengan definisi `isAdmin` di AuthContext),
  // ini memang wajar, dia bukan baris di tabel `guru`. Tampilkan kartu profil admin,
  // bukan pesan yang menyuruh menautkan ke data guru (yang tidak relevan untuk mereka).
  if (!profil?.guru_id) {
    if (isAdmin) {
      return (
        <Layout title="Profil Saya" subtitle="Data diri dan foto profil Anda">
          <ProfilAdminCard profil={profil} userId={session?.user?.id} adminData={adminData} />
        </Layout>
      )
    }
    // Orang tua/wali juga tidak punya guru_id — ini WAJAR (mereka bukan
    // baris di tabel `guru`), jadi tampilkan kartu profil orang tua yang
    // sesuai, bukan pesan "hubungi admin" yang tadinya cuma ditujukan
    // untuk akun guru yang belum ditautkan.
    if (isOrangTua) {
      return (
        <Layout title="Profil Saya" subtitle="Data diri dan foto profil Anda">
          <ProfilOrangTuaCard profil={profil} userId={session?.user?.id} />
        </Layout>
      )
    }
    // Pegawai kantor (jabatan/role 'pegawai' atau 'kepala_kantor') juga
    // WAJAR tidak punya guru_id — mereka tertaut lewat pegawai_id ke tabel
    // pegawai_kantor, bukan ke tabel guru. Kalau pegawai_id sudah terisi
    // DAN datanya berhasil dimuat, tampilkan kartu profil pegawai. Kalau
    // pegawai_id masih kosong (akun sempat disetujui langsung sebelum
    // modal hubungkan-pegawai ada), baru tampilkan pesan minta admin
    // menautkan — dengan kalimat yang benar (data pegawai, bukan data guru).
    if (isPegawaiKantor) {
      if (profil?.pegawai_id && pegawaiData) {
        return (
          <Layout title="Profil Saya" subtitle="Data diri dan foto profil Anda">
            <ProfilPegawaiCard pegawaiData={pegawaiData} onDataBerubah={muatPegawaiData} />
          </Layout>
        )
      }
      return (
        <Layout title="Profil Saya" subtitle="Data diri dan foto profil Anda">
          <div className="card p-6">
            <p className="text-sm text-ink-700/60">
              Akun Anda belum terhubung ke data pegawai. Hubungi admin untuk menautkan akun ini ke
              salah satu data pegawai kantor.
            </p>
          </div>
        </Layout>
      )
    }
    return (
      <Layout title="Profil Saya" subtitle="Data diri dan foto profil Anda">
        <div className="card p-6">
          <p className="text-sm text-ink-700/60">
            Akun Anda belum terhubung ke data guru. Hubungi admin untuk menautkan akun ini ke salah satu data guru.
          </p>
        </div>
      </Layout>
    )
  }

  if (!data) {
    return (
      <Layout title="Profil Saya" subtitle="Data diri dan foto profil Anda">
        <div className="card p-6">
          <p className="text-sm text-ink-700/60">
            Data guru untuk akun ini tidak ditemukan. Hubungi admin untuk memeriksa tautan akun.
          </p>
        </div>
      </Layout>
    )
  }

  const totalSiswaAsuh = kelasAsuh.reduce((sum, k) => sum + k.siswa.length, 0)

  // Data untuk tombol "Cetak PDF" / "Export Excel" di kartu profil guru —
  // mencakup seluruh field Formulir Dapodik, dikelompokkan sama seperti
  // urutan seksi di form (Data Pribadi, Riwayat Pendidikan & Pelatihan,
  // Kepegawaian, Alamat & Lokasi, Kontak, Lainnya).
  const dataDiriFieldsGuru = [
    { label: 'Nama Lengkap', value: data.nama_lengkap },
    { label: 'NIP', value: data.nip },
    { label: 'NUPTK', value: data.nuptk },
    { label: 'NIK', value: data.nik },
    { label: 'No. KK', value: data.no_kk },
    { label: 'Jenis Kelamin', value: data.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki' },
    { label: 'Agama', value: data.agama },
    { label: 'Tempat Lahir', value: data.tempat_lahir },
    { label: 'Tanggal Lahir', value: data.tanggal_lahir },
    { label: 'Kewarganegaraan', value: data.kewarganegaraan },
    { label: 'Pendidikan Terakhir', value: data.pendidikan_terakhir },
    { label: 'Status Perkawinan', value: data.status_perkawinan },
    { label: 'Nama Ibu Kandung', value: data.nama_ibu_kandung },
    { label: 'Nama Suami/Istri', value: data.nama_pasangan },
    { label: 'NIP Suami/Istri', value: data.nip_pasangan },
    { label: 'Pekerjaan Suami/Istri', value: data.pekerjaan_pasangan },
    { label: 'Jumlah Anak Tanggungan', value: data.jumlah_anak_tanggungan },
    { label: 'Nama Lembaga Pendidikan', value: data.nama_lembaga_pendidikan },
    { label: 'Fakultas', value: data.fakultas },
    { label: 'Jurusan', value: data.jurusan },
    { label: 'Tahun Lulus', value: data.tahun_lulus },
    { label: 'Penataran/Diklat', value: data.penataran_diklat },
    { label: 'Status Kepegawaian', value: data.status_kepegawaian },
    { label: 'Jenis PTK', value: data.jenis_ptk },
    { label: 'Mata Pelajaran', value: data.mata_pelajaran },
    { label: 'Tugas Tambahan', value: data.tugas_tambahan },
    { label: 'Pangkat / Golongan', value: data.pangkat_golongan },
    { label: 'Sumber Gaji', value: data.sumber_gaji },
    { label: 'SK CPNS', value: data.sk_cpns },
    { label: 'Tanggal CPNS', value: data.tanggal_cpns },
    { label: 'SK Pengangkatan', value: data.sk_pengangkatan },
    { label: 'TMT Pengangkatan', value: data.tmt_pengangkatan },
    { label: 'Lembaga Pengangkatan', value: data.lembaga_pengangkatan },
    { label: 'TMT PNS', value: data.tmt_pns },
    { label: 'Karpeg', value: data.karpeg },
    { label: 'Karis/Karsu', value: data.karis_karsu },
    { label: 'NUKS', value: data.nuks },
    { label: 'Sudah Lisensi Kepsek', value: data.sudah_lisensi_kepsek },
    { label: 'Pernah Diklat Pengawas', value: data.pernah_diklat_pengawas },
    { label: 'Alamat Jalan', value: data.alamat_jalan },
    { label: 'RT', value: data.rt },
    { label: 'RW', value: data.rw },
    { label: 'Nama Dusun', value: data.nama_dusun },
    { label: 'Desa/Kelurahan', value: data.desa_kelurahan },
    { label: 'Kecamatan', value: data.kecamatan },
    { label: 'Kode Pos', value: data.kode_pos },
    { label: 'Lintang', value: data.lintang },
    { label: 'Bujur', value: data.bujur },
    { label: 'Telepon', value: data.telepon },
    { label: 'Nomor HP', value: data.no_hp },
    { label: 'Email', value: data.email },
    { label: 'Keahlian Braille', value: data.keahlian_braille },
    { label: 'Keahlian Bahasa Isyarat', value: data.keahlian_bahasa_isyarat },
    { label: 'NPWP', value: data.npwp },
    { label: 'Nama Wajib Pajak', value: data.nama_wajib_pajak },
    { label: 'Bank', value: data.bank },
    { label: 'Nomor Rekening', value: data.no_rekening },
    { label: 'Rekening Atas Nama', value: data.rekening_atas_nama },
  ]
  const namaFileDataDiriGuru = `Data-Diri-${(data.nama_lengkap || 'Guru').replace(/\s+/g, '-')}`

  return (
    <Layout title="Profil Saya" subtitle="Data diri dan foto profil Anda">
      <form onSubmit={handleSave} className="max-w-2xl space-y-5">
        {/* Kartu identitas — background biru tua (navy), kontras elegan dengan aksen emas */}
        <div className="relative overflow-hidden rounded-xl p-6 flex items-center justify-between gap-5 bg-gradient-to-br from-blue-900 to-blue-950">
          {/* Dekorasi lingkaran samar di background, senada dengan aksen bulat di identitas guru */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

          {/* Corak batik abstrak emas — motif kawung/parang disederhanakan, ditumpuk tipis di atas gradasi navy */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="batikEmas"
                x="0"
                y="0"
                width="72"
                height="72"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(8)"
              >
                {/* motif kawung: empat lengkung elips mengelilingi titik pusat */}
                <g fill="none" stroke="#d4af37" strokeWidth="1.1">
                  <ellipse cx="36" cy="24" rx="9" ry="14" opacity="0.55" />
                  <ellipse cx="36" cy="48" rx="9" ry="14" opacity="0.55" />
                  <ellipse cx="24" cy="36" rx="14" ry="9" opacity="0.55" />
                  <ellipse cx="48" cy="36" rx="14" ry="9" opacity="0.55" />
                  <circle cx="36" cy="36" r="3" opacity="0.7" />
                </g>
                {/* garis parang halus di sela-sela motif kawung */}
                <path
                  d="M0 72 L18 54 L36 72 L54 54 L72 72"
                  fill="none"
                  stroke="#d4af37"
                  strokeWidth="0.8"
                  opacity="0.35"
                />
                <path
                  d="M0 0 L18 18 L0 36"
                  fill="none"
                  stroke="#d4af37"
                  strokeWidth="0.8"
                  opacity="0.3"
                />
                <circle cx="8" cy="8" r="1.3" fill="#d4af37" opacity="0.4" />
                <circle cx="64" cy="16" r="1.3" fill="#d4af37" opacity="0.4" />
                <circle cx="16" cy="64" r="1.3" fill="#d4af37" opacity="0.4" />
              </pattern>
              <linearGradient id="batikFade" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#000000" stopOpacity="0" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="url(#batikEmas)" />
            <rect x="0" y="0" width="100%" height="100%" fill="url(#batikFade)" />
          </svg>

          <div className="relative flex items-center gap-5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-white/10 ring-2 ring-white/20 overflow-hidden flex items-center justify-center">
                {fotoUrl() ? (
                  <img src={fotoUrl()} alt="Foto profil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-display font-semibold text-white/70">
                    {data.nama_lengkap?.[0] || '?'}
                  </span>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brass-400 flex items-center justify-center cursor-pointer shadow-md">
                {uploadingFoto ? (
                  <Loader2 size={13} className="animate-spin text-ink-950" />
                ) : (
                  <Camera size={13} className="text-ink-950" />
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} disabled={uploadingFoto} />
              </label>
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-lg text-white truncate">{data.nama_lengkap}</p>
              <p className="text-sm text-blue-200/70">{data.nip ? `NIP ${data.nip}` : 'NIP belum diisi'}</p>
            </div>
          </div>

          {/* QR code — berseberangan (sisi kanan) dengan foto profil di sisi kiri */}
          <div className="relative shrink-0 w-[88px] h-[88px] p-2 rounded-lg bg-white shadow-md flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code identitas guru" width={72} height={72} />
            ) : (
              <Loader2 size={18} className="animate-spin text-ink-700/30" />
            )}
          </div>
        </div>

        <div className="card relative overflow-hidden p-6">
          <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 to-brass-400" />

          <SeksiForm judul="Data Pribadi">
            <Field label="Nama Lengkap" full>
              <input
                className="input w-full"
                value={data.nama_lengkap || ''}
                onChange={(e) => setData({ ...data, nama_lengkap: e.target.value })}
                required
              />
            </Field>
            <Field label="NIP">
              <input className="input w-full" value={data.nip || ''} onChange={(e) => setData({ ...data, nip: e.target.value })} />
            </Field>
            <Field label="NUPTK">
              <input
                className="input w-full"
                placeholder="mis. 1234567890123456"
                value={data.nuptk || ''}
                onChange={(e) => setData({ ...data, nuptk: e.target.value })}
              />
            </Field>
            <Field label="NIK">
              <input className="input w-full" value={data.nik || ''} onChange={(e) => setData({ ...data, nik: e.target.value })} />
            </Field>
            <Field label="No. KK">
              <input className="input w-full" value={data.no_kk || ''} onChange={(e) => setData({ ...data, no_kk: e.target.value })} />
            </Field>
            <Field label="Jenis Kelamin">
              <select
                className="input w-full"
                value={data.jenis_kelamin || 'L'}
                onChange={(e) => setData({ ...data, jenis_kelamin: e.target.value })}
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </Field>
            <Field label="Agama">
              <input className="input w-full" value={data.agama || ''} onChange={(e) => setData({ ...data, agama: e.target.value })} />
            </Field>
            <Field label="Tempat Lahir">
              <input
                className="input w-full"
                value={data.tempat_lahir || ''}
                onChange={(e) => setData({ ...data, tempat_lahir: e.target.value })}
              />
            </Field>
            <Field label="Tanggal Lahir">
              <input
                className="input w-full"
                type="date"
                value={data.tanggal_lahir || ''}
                onChange={(e) => setData({ ...data, tanggal_lahir: e.target.value })}
              />
            </Field>
            <Field label="Kewarganegaraan">
              <input
                className="input w-full"
                value={data.kewarganegaraan || ''}
                onChange={(e) => setData({ ...data, kewarganegaraan: e.target.value })}
              />
            </Field>
            <Field label="Pendidikan Terakhir">
              <input
                className="input w-full"
                placeholder="mis. S1 Pendidikan Guru SD"
                value={data.pendidikan_terakhir || ''}
                onChange={(e) => setData({ ...data, pendidikan_terakhir: e.target.value })}
              />
            </Field>
            <Field label="Status Perkawinan">
              <select
                className="input w-full"
                value={data.status_perkawinan || ''}
                onChange={(e) => setData({ ...data, status_perkawinan: e.target.value })}
              >
                <option value="">-</option>
                <option value="Belum Kawin">Belum Kawin</option>
                <option value="Kawin">Kawin</option>
                <option value="Cerai Hidup">Cerai Hidup</option>
                <option value="Cerai Mati">Cerai Mati</option>
              </select>
            </Field>
            <Field label="Nama Ibu Kandung">
              <input
                className="input w-full"
                value={data.nama_ibu_kandung || ''}
                onChange={(e) => setData({ ...data, nama_ibu_kandung: e.target.value })}
              />
            </Field>
            <Field label="Nama Suami/Istri">
              <input
                className="input w-full"
                value={data.nama_pasangan || ''}
                onChange={(e) => setData({ ...data, nama_pasangan: e.target.value })}
              />
            </Field>
            <Field label="NIP Suami/Istri">
              <input
                className="input w-full"
                value={data.nip_pasangan || ''}
                onChange={(e) => setData({ ...data, nip_pasangan: e.target.value })}
              />
            </Field>
            <Field label="Pekerjaan Suami/Istri">
              <input
                className="input w-full"
                value={data.pekerjaan_pasangan || ''}
                onChange={(e) => setData({ ...data, pekerjaan_pasangan: e.target.value })}
              />
            </Field>
            <Field label="Jumlah Anak Tanggungan">
              <input
                type="number"
                min="0"
                className="input w-full"
                value={data.jumlah_anak_tanggungan || ''}
                onChange={(e) => setData({ ...data, jumlah_anak_tanggungan: e.target.value })}
              />
            </Field>
          </SeksiForm>

          <SeksiForm judul="Riwayat Pendidikan & Pelatihan">
            <Field label="Nama Lembaga Pendidikan" full>
              <input
                className="input w-full"
                value={data.nama_lembaga_pendidikan || ''}
                onChange={(e) => setData({ ...data, nama_lembaga_pendidikan: e.target.value })}
              />
            </Field>
            <Field label="Fakultas">
              <input className="input w-full" value={data.fakultas || ''} onChange={(e) => setData({ ...data, fakultas: e.target.value })} />
            </Field>
            <Field label="Jurusan">
              <input className="input w-full" value={data.jurusan || ''} onChange={(e) => setData({ ...data, jurusan: e.target.value })} />
            </Field>
            <Field label="Tahun Lulus">
              <input
                type="number"
                className="input w-full"
                value={data.tahun_lulus || ''}
                onChange={(e) => setData({ ...data, tahun_lulus: e.target.value })}
              />
            </Field>
            <Field label="Penataran/Diklat yang Pernah Diikuti" full>
              <textarea
                className="input w-full"
                rows={2}
                value={data.penataran_diklat || ''}
                onChange={(e) => setData({ ...data, penataran_diklat: e.target.value })}
              />
            </Field>
          </SeksiForm>

          <SeksiForm judul="Kepegawaian">
            <Field label="Status Kepegawaian">
              <input
                className="input w-full"
                placeholder="PNS / PPPK / Honor..."
                value={data.status_kepegawaian || ''}
                onChange={(e) => setData({ ...data, status_kepegawaian: e.target.value })}
              />
            </Field>
            <Field label="Jenis PTK">
              <input className="input w-full" value={data.jenis_ptk || ''} onChange={(e) => setData({ ...data, jenis_ptk: e.target.value })} />
            </Field>
            <Field label="Mata Pelajaran yang Diampu">
              <input
                className="input w-full"
                value={data.mata_pelajaran || ''}
                onChange={(e) => setData({ ...data, mata_pelajaran: e.target.value })}
              />
            </Field>
            <Field label="Tugas Tambahan">
              <input
                className="input w-full"
                value={data.tugas_tambahan || ''}
                onChange={(e) => setData({ ...data, tugas_tambahan: e.target.value })}
              />
            </Field>
            <Field label="Pangkat / Golongan">
              <input
                className="input w-full"
                placeholder="mis. Penata Muda / III-a"
                value={data.pangkat_golongan || ''}
                onChange={(e) => setData({ ...data, pangkat_golongan: e.target.value })}
              />
            </Field>
            <Field label="Sumber Gaji">
              <input
                className="input w-full"
                value={data.sumber_gaji || ''}
                onChange={(e) => setData({ ...data, sumber_gaji: e.target.value })}
              />
            </Field>
            <Field label="SK CPNS">
              <input className="input w-full" value={data.sk_cpns || ''} onChange={(e) => setData({ ...data, sk_cpns: e.target.value })} />
            </Field>
            <Field label="Tanggal CPNS">
              <input
                type="date"
                className="input w-full"
                value={data.tanggal_cpns || ''}
                onChange={(e) => setData({ ...data, tanggal_cpns: e.target.value })}
              />
            </Field>
            <Field label="SK Pengangkatan">
              <input
                className="input w-full"
                value={data.sk_pengangkatan || ''}
                onChange={(e) => setData({ ...data, sk_pengangkatan: e.target.value })}
              />
            </Field>
            <Field label="TMT Pengangkatan">
              <input
                type="date"
                className="input w-full"
                value={data.tmt_pengangkatan || ''}
                onChange={(e) => setData({ ...data, tmt_pengangkatan: e.target.value })}
              />
            </Field>
            <Field label="Lembaga Pengangkatan" full>
              <input
                className="input w-full"
                value={data.lembaga_pengangkatan || ''}
                onChange={(e) => setData({ ...data, lembaga_pengangkatan: e.target.value })}
              />
            </Field>
            <Field label="TMT PNS">
              <input
                type="date"
                className="input w-full"
                value={data.tmt_pns || ''}
                onChange={(e) => setData({ ...data, tmt_pns: e.target.value })}
              />
            </Field>
            <Field label="Karpeg">
              <input className="input w-full" value={data.karpeg || ''} onChange={(e) => setData({ ...data, karpeg: e.target.value })} />
            </Field>
            <Field label="Karis/Karsu">
              <input
                className="input w-full"
                value={data.karis_karsu || ''}
                onChange={(e) => setData({ ...data, karis_karsu: e.target.value })}
              />
            </Field>
            <Field label="NUKS">
              <input className="input w-full" value={data.nuks || ''} onChange={(e) => setData({ ...data, nuks: e.target.value })} />
            </Field>
            <Field label="Sudah Lisensi Kepsek">
              <select
                className="input w-full"
                value={data.sudah_lisensi_kepsek || 'Tidak'}
                onChange={(e) => setData({ ...data, sudah_lisensi_kepsek: e.target.value })}
              >
                <option value="Tidak">Tidak</option>
                <option value="Ya">Ya</option>
              </select>
            </Field>
            <Field label="Pernah Diklat Pengawas">
              <select
                className="input w-full"
                value={data.pernah_diklat_pengawas || 'Tidak'}
                onChange={(e) => setData({ ...data, pernah_diklat_pengawas: e.target.value })}
              >
                <option value="Tidak">Tidak</option>
                <option value="Ya">Ya</option>
              </select>
            </Field>
          </SeksiForm>

          <SeksiForm judul="Alamat & Lokasi">
            <Field label="Alamat Jalan" full>
              <input
                className="input w-full"
                value={data.alamat_jalan || ''}
                onChange={(e) => setData({ ...data, alamat_jalan: e.target.value })}
              />
            </Field>
            <Field label="RT">
              <input className="input w-full" value={data.rt || ''} onChange={(e) => setData({ ...data, rt: e.target.value })} />
            </Field>
            <Field label="RW">
              <input className="input w-full" value={data.rw || ''} onChange={(e) => setData({ ...data, rw: e.target.value })} />
            </Field>
            <Field label="Nama Dusun">
              <input
                className="input w-full"
                value={data.nama_dusun || ''}
                onChange={(e) => setData({ ...data, nama_dusun: e.target.value })}
              />
            </Field>
            <Field label="Desa/Kelurahan">
              <input
                className="input w-full"
                value={data.desa_kelurahan || ''}
                onChange={(e) => setData({ ...data, desa_kelurahan: e.target.value })}
              />
            </Field>
            <Field label="Kecamatan">
              <input
                className="input w-full"
                value={data.kecamatan || ''}
                onChange={(e) => setData({ ...data, kecamatan: e.target.value })}
              />
            </Field>
            <Field label="Kode Pos">
              <input
                className="input w-full"
                value={data.kode_pos || ''}
                onChange={(e) => setData({ ...data, kode_pos: e.target.value })}
              />
            </Field>
            <Field label="Lintang">
              <input
                className="input w-full"
                value={data.lintang ?? ''}
                onChange={(e) => setData({ ...data, lintang: e.target.value })}
              />
            </Field>
            <Field label="Bujur">
              <input
                className="input w-full"
                value={data.bujur ?? ''}
                onChange={(e) => setData({ ...data, bujur: e.target.value })}
              />
            </Field>
          </SeksiForm>

          <SeksiForm judul="Kontak">
            <Field label="Telepon">
              <input
                className="input w-full"
                value={data.telepon || ''}
                onChange={(e) => setData({ ...data, telepon: e.target.value })}
              />
            </Field>
            <Field label="Nomor HP">
              <input className="input w-full" value={data.no_hp || ''} onChange={(e) => setData({ ...data, no_hp: e.target.value })} />
            </Field>
            <Field label="Email">
              <input
                className="input w-full"
                type="email"
                value={data.email || ''}
                onChange={(e) => setData({ ...data, email: e.target.value })}
              />
            </Field>
          </SeksiForm>

          <SeksiForm judul="Lainnya">
            <Field label="Keahlian Braille">
              <select
                className="input w-full"
                value={data.keahlian_braille || 'Tidak'}
                onChange={(e) => setData({ ...data, keahlian_braille: e.target.value })}
              >
                <option value="Tidak">Tidak</option>
                <option value="Ya">Ya</option>
              </select>
            </Field>
            <Field label="Keahlian Bahasa Isyarat">
              <select
                className="input w-full"
                value={data.keahlian_bahasa_isyarat || 'Tidak'}
                onChange={(e) => setData({ ...data, keahlian_bahasa_isyarat: e.target.value })}
              >
                <option value="Tidak">Tidak</option>
                <option value="Ya">Ya</option>
              </select>
            </Field>
            <Field label="NPWP">
              <input className="input w-full" value={data.npwp || ''} onChange={(e) => setData({ ...data, npwp: e.target.value })} />
            </Field>
            <Field label="Nama Wajib Pajak">
              <input
                className="input w-full"
                value={data.nama_wajib_pajak || ''}
                onChange={(e) => setData({ ...data, nama_wajib_pajak: e.target.value })}
              />
            </Field>
            <Field label="Bank">
              <input className="input w-full" value={data.bank || ''} onChange={(e) => setData({ ...data, bank: e.target.value })} />
            </Field>
            <Field label="Nomor Rekening">
              <input
                className="input w-full"
                value={data.no_rekening || ''}
                onChange={(e) => setData({ ...data, no_rekening: e.target.value })}
              />
            </Field>
            <Field label="Rekening Atas Nama">
              <input
                className="input w-full"
                value={data.rekening_atas_nama || ''}
                onChange={(e) => setData({ ...data, rekening_atas_nama: e.target.value })}
              />
            </Field>
          </SeksiForm>

          <div className="flex items-center gap-3 pt-5 flex-wrap">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brass-400 text-ink-950 text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <TombolCetakDataDiri
              fields={dataDiriFieldsGuru}
              judul="Data Diri — Guru"
              namaOrang={data.nama_lengkap}
              namaFile={namaFileDataDiriGuru}
            />
            {savedAt && <span className="text-xs text-sage-500">Tersimpan</span>}
          </div>
        </div>
      </form>

      {/* Siswa yang diampu — hanya muncul kalau guru ini tercatat sebagai wali kelas di satu atau lebih kelas */}
      {!loadingSiswa && kelasAsuh.length > 0 && (
        <div className="max-w-2xl mt-5 space-y-4">
          <div className="relative overflow-hidden rounded-xl p-6 flex items-center gap-4 bg-gradient-to-br from-red-900 to-red-950">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
            <div className="relative w-11 h-11 rounded-full bg-white/10 ring-2 ring-white/20 flex items-center justify-center shrink-0 text-white">
              <Users size={20} />
            </div>
            <div className="relative">
              <p className="font-display font-semibold text-lg text-white">
                {totalSiswaAsuh} siswa diampu
              </p>
              <p className="text-sm text-red-200/70 mt-0.5">
                Sebagai wali kelas di {kelasAsuh.length} kelas: {kelasAsuh.map((k) => k.nama_kelas).join(', ')}
              </p>
            </div>
          </div>

          {kelasAsuh.map((k) => (
            <div key={k.id} className="card relative overflow-hidden">
              <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-900 to-brass-400" />
              <div className="flex items-center gap-2 p-4 border-b border-ink-900/[0.06]">
                <School size={16} className="text-ink-700/50" />
                <p className="text-sm font-medium text-ink-950">
                  {k.nama_kelas} <span className="text-ink-700/40 font-normal">({k.siswa.length} siswa)</span>
                </p>
              </div>
              {k.siswa.length === 0 ? (
                <p className="text-sm text-ink-700/50 p-4">Belum ada siswa aktif di kelas ini.</p>
              ) : (
                <ul className="divide-y divide-ink-900/[0.06]">
                  {k.siswa.map((s) => (
                    <li key={s.id} className="p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-ink-900/[0.06] overflow-hidden flex items-center justify-center shrink-0">
                        {fotoSiswaUrl(s.foto_path) ? (
                          <img src={fotoSiswaUrl(s.foto_path)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold text-ink-700/40">{s.nama_lengkap?.[0]}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-950 truncate">{s.nama_lengkap}</p>
                        <p className="text-xs text-ink-700/50">NIS: {s.nis || '—'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Kode batang ID guru — jadi pemisah visual antara bagian profil dan grafik aktivitas */}
      <div className="max-w-2xl mt-5 flex flex-col items-center gap-2 py-4 border-t border-ink-900/[0.08]">
        <div className="p-3 rounded-lg bg-white ring-1 ring-ink-900/[0.08] shadow-sm">
          <Barcode
            value={String(data.id)}
            width={1.6}
            height={56}
            fontSize={12}
            background="#ffffff"
            lineColor="#1e3a5f"
          />
        </div>
        <p className="text-xs text-ink-700/50">ID Absensi Guru</p>
      </div>

      <div className="max-w-2xl mt-5">
        <GrafikAktivitas guruId={profil.guru_id} />
      </div>
    </Layout>
  )
}
