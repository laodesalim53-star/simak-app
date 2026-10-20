import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import {
  Network, Plus, Trash2, Pencil, Printer, Loader2, Sparkles, X, Save, UserPlus,
} from 'lucide-react'

// ============================================================
// STRUKTUR ORGANISASI SEKOLAH
//
// Bagan berjenjang: setiap simpul punya jabatan, nama, NIP, dan atasan.
// Admin dan kepala sekolah bisa menambah, mengubah, dan menghapus simpul;
// semua pengguna sekolah bisa melihat dan mencetak.
//
// "Susun otomatis" (hanya saat bagan masih kosong) membuat kerangka dari
// data yang sudah ada di aplikasi:
//   - Kepala Sekolah, Ketua Komite, Bendahara  <- profil_sekolah
//   - Wali Kelas per kelas                      <- kelas + guru
// Hasilnya tetap bisa diubah bebas. Penempatan komite di bawah kepala
// sekolah hanya kerangka awal; ubah atasannya bila perlu.
//
// CETAK: gaya @media print di bawah menyembunyikan seluruh halaman
// (sidebar, header, tombol) dan hanya menampilkan elemen #cetak-struktur,
// supaya hasil cetak tidak kosong walaupun Layout punya aturan cetak sendiri.
//
// Tabel & RLS: lihat tata_tertib_struktur.sql (tabel struktur_organisasi).
// Rute: /administrasi-kepsek/struktur-organisasi
// Dipakai oleh butir akreditasi MAN-04.
// ============================================================

const FORM_KOSONG = { id: null, jabatan: '', nama: '', nip: '', atasan_id: '' }

// Gaya cetak: hanya #cetak-struktur yang tampil di kertas.
const GAYA_CETAK = `
  @page { size: A4 portrait; margin: 15mm; }
  @media print {
    body * { visibility: hidden !important; }
    #cetak-struktur, #cetak-struktur * { visibility: visible !important; }
    #cetak-struktur {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      box-shadow: none !important;
    }
  }
`

// ---- Satu simpul (rekursif, di LUAR komponen utama) ---------------------
function Simpul({ node, peta, bisaEdit, onEdit, onTambahAnak, onHapus }) {
  const anak = peta[node.id] || []
  return (
    <li>
      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm print:shadow-none">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-slate-900">{node.jabatan}</p>
          <p className="text-sm text-slate-700">{node.nama || <span className="text-slate-400">(belum diisi)</span>}</p>
          {node.nip && <p className="text-xs text-slate-500">NIP. {node.nip}</p>}
        </div>
        {bisaEdit && (
          <div className="print:hidden flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => onTambahAnak(node)}
              aria-label={`Tambah bawahan ${node.jabatan}`}
              className="rounded-md border border-blue-200 p-1.5 text-blue-600 hover:bg-blue-50"
            >
              <UserPlus size={13} />
            </button>
            <button
              type="button"
              onClick={() => onEdit(node)}
              aria-label={`Ubah ${node.jabatan}`}
              className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => onHapus(node)}
              aria-label={`Hapus ${node.jabatan}`}
              className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
      {anak.length > 0 && (
        <ul className="mt-2 ml-3 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-slate-200 space-y-2">
          {anak.map((a) => (
            <Simpul
              key={a.id}
              node={a}
              peta={peta}
              bisaEdit={bisaEdit}
              onEdit={onEdit}
              onTambahAnak={onTambahAnak}
              onHapus={onHapus}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function StrukturOrganisasi() {
  const { sekolahId, isAdmin, loading: loadingAuth } = useAuth()
  const bisaEdit = Boolean(isAdmin)

  const [rows, setRows] = useState([])
  const [guru, setGuru] = useState([])
  const [sekolah, setSekolah] = useState(null)
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [form, setForm] = useState(null) // null = tertutup

  const muat = useCallback(async () => {
    if (!sekolahId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setGalat('')
    const [s, g, p] = await Promise.all([
      supabase
        .from('struktur_organisasi')
        .select('*')
        .eq('sekolah_id', sekolahId)
        .order('urutan', { ascending: true })
        .order('dibuat_pada', { ascending: true }),
      supabase.from('guru').select('id, nama_lengkap, nip').eq('sekolah_id', sekolahId).order('nama_lengkap'),
      supabase
        .from('profil_sekolah')
        .select('nama_sekolah, kepala_sekolah, nip_kepala_sekolah, tempat_ttd')
        .eq('sekolah_id', sekolahId)
        .limit(1)
        .maybeSingle(),
    ])
    if (s.error) setGalat('Data tidak bisa dimuat. Periksa koneksi lalu muat ulang halaman.')
    setRows(s.data || [])
    setGuru(g.data || [])
    setSekolah(p.data || null)
    setLoading(false)
  }, [sekolahId])

  useEffect(() => {
    muat()
  }, [muat])

  // Peta atasan -> daftar bawahan. Simpul yatim (atasan sudah hilang) jadi akar.
  const { akar, peta } = useMemo(() => {
    const ada = new Set(rows.map((r) => r.id))
    const p = {}
    const a = []
    rows.forEach((r) => {
      if (r.atasan_id && ada.has(r.atasan_id)) (p[r.atasan_id] ||= []).push(r)
      else a.push(r)
    })
    return { akar: a, peta: p }
  }, [rows])

  // Pilihan atasan: semua simpul kecuali dirinya dan keturunannya (cegah lingkaran).
  const pilihanAtasan = useMemo(() => {
    if (!form) return []
    const terlarang = new Set()
    if (form.id) {
      const telusur = (id) => {
        terlarang.add(id)
        ;(peta[id] || []).forEach((c) => telusur(c.id))
      }
      telusur(form.id)
    }
    return rows.filter((r) => !terlarang.has(r.id))
  }, [form, rows, peta])

  function bukaTambah(atasan = null) {
    setGalat('')
    setForm({ ...FORM_KOSONG, atasan_id: atasan?.id || '' })
  }

  function bukaEdit(node) {
    setGalat('')
    setForm({
      id: node.id,
      jabatan: node.jabatan || '',
      nama: node.nama || '',
      nip: node.nip || '',
      atasan_id: node.atasan_id || '',
    })
  }

  // Memilih nama guru dari daftar mengisi NIP otomatis bila NIP masih kosong.
  function ubahNama(nama) {
    setForm((f) => {
      const cocok = guru.find((g) => g.nama_lengkap === nama)
      return { ...f, nama, nip: f.nip || cocok?.nip || '' }
    })
  }

  async function simpanForm(e) {
    e.preventDefault()
    if (!form.jabatan.trim()) {
      setGalat('Jabatan wajib diisi.')
      return
    }
    setSibuk(true)
    setGalat('')
    const isian = {
      jabatan: form.jabatan.trim(),
      nama: form.nama.trim() || null,
      nip: form.nip.trim() || null,
      atasan_id: form.atasan_id || null,
      diperbarui_pada: new Date().toISOString(),
    }
    let error
    if (form.id) {
      ;({ error } = await supabase.from('struktur_organisasi').update(isian).eq('id', form.id))
    } else {
      const urutan = rows.reduce((m, r) => Math.max(m, r.urutan || 0), 0) + 1
      ;({ error } = await supabase
        .from('struktur_organisasi')
        .insert({ ...isian, sekolah_id: sekolahId, urutan }))
    }
    setSibuk(false)
    if (error) {
      setGalat(`Gagal menyimpan: ${error.message}`)
      return
    }
    setForm(null)
    await muat()
  }

  // Bawahan dinaikkan ke atasan simpul yang dihapus, supaya bagan tidak putus.
  async function hapus(node) {
    const punyaAnak = (peta[node.id] || []).length > 0
    const pesan = punyaAnak
      ? `Hapus "${node.jabatan}"? Bawahannya akan dipindahkan ke atasan di atasnya.`
      : `Hapus "${node.jabatan}"?`
    if (!window.confirm(pesan)) return
    setSibuk(true)
    setGalat('')
    if (punyaAnak) {
      const { error: e1 } = await supabase
        .from('struktur_organisasi')
        .update({ atasan_id: node.atasan_id || null })
        .eq('atasan_id', node.id)
      if (e1) {
        setSibuk(false)
        setGalat(`Gagal memindahkan bawahan: ${e1.message}`)
        return
      }
    }
    const { error } = await supabase.from('struktur_organisasi').delete().eq('id', node.id)
    setSibuk(false)
    if (error) {
      setGalat(`Gagal menghapus: ${error.message}`)
      return
    }
    await muat()
  }

  // Kerangka awal dari data aplikasi (hanya saat bagan kosong).
  async function susunOtomatis() {
    if (!bisaEdit || rows.length > 0) return
    setSibuk(true)
    setGalat('')
    const [p, k] = await Promise.all([
      supabase
        .from('profil_sekolah')
        .select('kepala_sekolah, nip_kepala_sekolah, komite_nama, bendahara_nama, bendahara_nip')
        .eq('sekolah_id', sekolahId)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('kelas')
        .select('nama_kelas, wali_kelas_id')
        .eq('sekolah_id', sekolahId)
        .not('wali_kelas_id', 'is', null)
        .order('nama_kelas'),
    ])
    const prof = p.data || {}
    const guruById = Object.fromEntries(guru.map((g) => [g.id, g]))

    const { data: kepala, error } = await supabase
      .from('struktur_organisasi')
      .insert({
        sekolah_id: sekolahId,
        jabatan: 'Kepala Sekolah',
        nama: prof.kepala_sekolah || null,
        nip: prof.nip_kepala_sekolah || null,
        urutan: 1,
      })
      .select()
      .single()
    if (error) {
      setSibuk(false)
      setGalat(`Gagal menyusun: ${error.message}`)
      return
    }

    const anak = []
    if (prof.komite_nama) anak.push({ jabatan: 'Ketua Komite Sekolah', nama: prof.komite_nama, nip: null })
    if (prof.bendahara_nama) {
      anak.push({ jabatan: 'Bendahara BOS', nama: prof.bendahara_nama, nip: prof.bendahara_nip || null })
    }
    ;(k.data || []).forEach((kl) => {
      const gr = guruById[kl.wali_kelas_id]
      if (gr) anak.push({ jabatan: `Wali Kelas ${kl.nama_kelas}`, nama: gr.nama_lengkap, nip: gr.nip || null })
    })

    if (anak.length > 0) {
      const { error: e2 } = await supabase.from('struktur_organisasi').insert(
        anak.map((a, i) => ({
          sekolah_id: sekolahId,
          atasan_id: kepala.id,
          jabatan: a.jabatan,
          nama: a.nama,
          nip: a.nip,
          urutan: i + 2,
        }))
      )
      if (e2) setGalat(`Sebagian gagal disusun: ${e2.message}`)
    }
    setSibuk(false)
    await muat()
  }

  if (loadingAuth) {
    return (
      <Layout title="Struktur Organisasi" subtitle="Bagan organisasi dan tim kerja sekolah.">
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Memuat...
        </div>
      </Layout>
    )
  }

  if (!sekolahId) {
    return (
      <Layout title="Struktur Organisasi" subtitle="Bagan organisasi dan tim kerja sekolah.">
        <div className="max-w-xl mx-auto p-6 text-center">
          <p className="text-sm text-slate-600">
            Akun Anda belum terhubung ke sekolah, jadi struktur organisasi belum bisa ditampilkan.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Struktur Organisasi" subtitle="Bagan organisasi dan tim kerja sekolah.">
      <style>{GAYA_CETAK}</style>

      <div className="max-w-3xl mx-auto space-y-5">
        <div className="print:hidden flex flex-wrap items-center justify-end gap-2">
          {bisaEdit && (
            <button
              type="button"
              onClick={() => bukaTambah(null)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Plus size={15} />
              Tambah jabatan
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <Printer size={15} />
            Cetak
          </button>
        </div>

        {galat && (
          <p role="alert" className="print:hidden text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {galat}
          </p>
        )}

        {/* Formulir tambah / ubah */}
        {form && bisaEdit && (
          <form
            onSubmit={simpanForm}
            className="print:hidden rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold text-slate-900">{form.id ? 'Ubah jabatan' : 'Tambah jabatan'}</p>
              <button
                type="button"
                onClick={() => setForm(null)}
                aria-label="Tutup formulir"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="so-jabatan" className="block text-xs font-medium text-slate-600 mb-1">Jabatan</label>
                <input
                  id="so-jabatan"
                  value={form.jabatan}
                  onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                  placeholder="Mis. Wakil Kepala Sekolah"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="so-atasan" className="block text-xs font-medium text-slate-600 mb-1">Atasan langsung</label>
                <select
                  id="so-atasan"
                  value={form.atasan_id}
                  onChange={(e) => setForm({ ...form, atasan_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">(Puncak bagan)</option>
                  {pilihanAtasan.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.jabatan}{r.nama ? ` – ${r.nama}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="so-nama" className="block text-xs font-medium text-slate-600 mb-1">
                  Nama (ketik atau pilih dari data guru)
                </label>
                <input
                  id="so-nama"
                  list="so-daftar-guru"
                  value={form.nama}
                  onChange={(e) => ubahNama(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <datalist id="so-daftar-guru">
                  {guru.map((g) => (
                    <option key={g.id} value={g.nama_lengkap} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="so-nip" className="block text-xs font-medium text-slate-600 mb-1">NIP (opsional)</label>
                <input
                  id="so-nip"
                  value={form.nip}
                  onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sibuk}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {sibuk ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Simpan
              </button>
            </div>
          </form>
        )}

        <section
          id="cetak-struktur"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:border-0 print:shadow-none print:p-0"
        >
          <div className="text-center mb-5">
            <p className="hidden print:block text-sm font-semibold uppercase">{sekolah?.nama_sekolah || 'Sekolah'}</p>
            <h2 className="inline-flex items-center gap-2 text-base font-extrabold text-slate-900 print:text-lg">
              <Network size={18} className="text-blue-600 print:hidden" />
              Struktur Organisasi{sekolah?.nama_sekolah ? ` ${sekolah.nama_sekolah}` : ''}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Memuat...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-slate-500">Struktur organisasi belum disusun.</p>
              {bisaEdit && (
                <div className="print:hidden flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={susunOtomatis}
                    disabled={sibuk}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                  >
                    {sibuk ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    Susun otomatis dari data aplikasi
                  </button>
                  <button
                    type="button"
                    onClick={() => bukaTambah(null)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Plus size={15} />
                    Mulai dari kosong
                  </button>
                </div>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {akar.map((a) => (
                <Simpul
                  key={a.id}
                  node={a}
                  peta={peta}
                  bisaEdit={bisaEdit}
                  onEdit={bukaEdit}
                  onTambahAnak={bukaTambah}
                  onHapus={hapus}
                />
              ))}
            </ul>
          )}

          {rows.length > 0 && (
            <div className="hidden print:block mt-10 text-sm">
              <div className="ml-auto w-64 text-center">
                <p>{sekolah?.tempat_ttd ? `${sekolah.tempat_ttd}, ` : ''}........................</p>
                <p>Kepala Sekolah,</p>
                <div className="h-16" />
                <p className="font-semibold underline">{sekolah?.kepala_sekolah || '........................'}</p>
                {sekolah?.nip_kepala_sekolah && <p>NIP. {sekolah.nip_kepala_sekolah}</p>}
              </div>
            </div>
          )}
        </section>

        {!bisaEdit && (
          <p className="print:hidden text-xs text-slate-500">
            Hanya admin dan kepala sekolah yang dapat mengubah struktur organisasi.
          </p>
        )}
      </div>
    </Layout>
  )
}
