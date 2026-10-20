import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import {
  ScrollText, Plus, Trash2, Pencil, Check, X, Printer, Loader2, Sparkles,
  ArrowUp, ArrowDown,
} from 'lucide-react'

// ============================================================
// TATA TERTIB SEKOLAH
//
// Daftar aturan per kategori (siswa, guru & tendik, orang tua/wali).
// Admin dan kepala sekolah bisa menambah, mengubah, menghapus, dan
// mengurutkan butir; semua pengguna sekolah bisa melihat dan mencetak.
// Tombol "Muat contoh" mengisi draf aturan umum yang HARUS disesuaikan
// dengan kebijakan sekolah sebelum dipakai.
//
// Tabel & RLS: lihat tata_tertib_struktur.sql (tabel tata_tertib).
// Rute: /tata-tertib
// Dipakai oleh butir akreditasi MAN-07.
// ============================================================

const KATEGORI = [
  { id: 'siswa', label: 'Siswa', judul: 'Tata Tertib Peserta Didik' },
  { id: 'guru', label: 'Guru & Tendik', judul: 'Tata Tertib Guru dan Tenaga Kependidikan' },
  { id: 'ortu', label: 'Orang Tua / Wali', judul: 'Tata Tertib Orang Tua / Wali Murid' },
]

// Draf awal yang umum. Sesuaikan dengan kebijakan sekolah.
const CONTOH = {
  siswa: [
    'Peserta didik hadir di sekolah paling lambat 10 menit sebelum jam pelajaran dimulai.',
    'Peserta didik mengenakan seragam sekolah sesuai jadwal dengan rapi dan bersih.',
    'Peserta didik menghormati kepala sekolah, guru, tenaga kependidikan, dan sesama teman.',
    'Peserta didik menjaga kebersihan kelas, halaman, dan lingkungan sekolah.',
    'Peserta didik tidak meninggalkan sekolah selama jam pelajaran tanpa izin guru.',
    'Peserta didik yang berhalangan hadir menyampaikan keterangan tertulis dari orang tua/wali.',
    'Peserta didik menjaga dan merawat sarana serta prasarana sekolah.',
    'Peserta didik dilarang membawa barang berbahaya, rokok, dan benda terlarang lainnya ke sekolah.',
  ],
  guru: [
    'Guru dan tenaga kependidikan hadir tepat waktu dan mengisi daftar hadir setiap hari kerja.',
    'Guru melaksanakan pembelajaran sesuai jadwal dan perangkat ajar yang telah disusun.',
    'Guru dan tenaga kependidikan berpakaian rapi, sopan, dan sesuai ketentuan.',
    'Guru dan tenaga kependidikan yang berhalangan hadir menyampaikan pemberitahuan kepada kepala sekolah.',
    'Guru dan tenaga kependidikan menjaga kerahasiaan data peserta didik dan data sekolah.',
    'Guru dan tenaga kependidikan menjadi teladan dalam sikap dan perilaku di lingkungan sekolah.',
  ],
  ortu: [
    'Orang tua/wali ikut memantau kehadiran dan perkembangan belajar anaknya.',
    'Orang tua/wali menghadiri undangan rapat dan pembagian laporan hasil belajar.',
    'Orang tua/wali menyampaikan keterangan tertulis bila anak berhalangan hadir.',
    'Orang tua/wali menjaga komunikasi yang baik dengan guru dan pihak sekolah.',
  ],
}

export default function TataTertib() {
  const { sekolahId, isAdmin, loading: loadingAuth } = useAuth()
  const bisaEdit = Boolean(isAdmin)

  const [kat, setKat] = useState('siswa')
  const [semua, setSemua] = useState([])
  const [sekolah, setSekolah] = useState(null)
  const [loading, setLoading] = useState(true)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [baru, setBaru] = useState('')
  const [edit, setEdit] = useState(null) // { id, isi }

  const muat = useCallback(async () => {
    if (!sekolahId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setGalat('')
    const [t, p] = await Promise.all([
      supabase
        .from('tata_tertib')
        .select('*')
        .eq('sekolah_id', sekolahId)
        .order('urutan', { ascending: true })
        .order('dibuat_pada', { ascending: true }),
      supabase
        .from('profil_sekolah')
        .select('nama_sekolah, kepala_sekolah, nip_kepala_sekolah, tempat_ttd')
        .eq('sekolah_id', sekolahId)
        .limit(1)
        .maybeSingle(),
    ])
    if (t.error) setGalat('Data tidak bisa dimuat. Periksa koneksi lalu muat ulang halaman.')
    setSemua(t.data || [])
    setSekolah(p.data || null)
    setLoading(false)
  }, [sekolahId])

  useEffect(() => {
    muat()
  }, [muat])

  const daftar = useMemo(() => semua.filter((x) => x.kategori === kat), [semua, kat])
  const aktif = KATEGORI.find((k) => k.id === kat) || KATEGORI[0]

  async function tambah() {
    const isi = baru.trim()
    if (!isi || !bisaEdit) return
    setSibuk(true)
    setGalat('')
    const urutan = daftar.reduce((m, x) => Math.max(m, x.urutan || 0), 0) + 1
    const { data, error } = await supabase
      .from('tata_tertib')
      .insert({ sekolah_id: sekolahId, kategori: kat, urutan, isi })
      .select()
      .single()
    setSibuk(false)
    if (error) {
      setGalat(`Gagal menambah: ${error.message}`)
      return
    }
    setSemua((s) => [...s, data])
    setBaru('')
  }

  async function simpanEdit() {
    const isi = (edit?.isi || '').trim()
    if (!edit || !isi) return
    setSibuk(true)
    setGalat('')
    const { data, error } = await supabase
      .from('tata_tertib')
      .update({ isi, diperbarui_pada: new Date().toISOString() })
      .eq('id', edit.id)
      .select()
      .single()
    setSibuk(false)
    if (error) {
      setGalat(`Gagal menyimpan: ${error.message}`)
      return
    }
    setSemua((s) => s.map((x) => (x.id === data.id ? data : x)))
    setEdit(null)
  }

  async function hapus(butir) {
    if (!window.confirm('Hapus butir tata tertib ini?')) return
    setSibuk(true)
    setGalat('')
    const { error } = await supabase.from('tata_tertib').delete().eq('id', butir.id)
    setSibuk(false)
    if (error) {
      setGalat(`Gagal menghapus: ${error.message}`)
      return
    }
    setSemua((s) => s.filter((x) => x.id !== butir.id))
  }

  // Geser satu butir naik/turun, lalu nomori ulang seluruh kategori.
  async function pindah(i, arah) {
    const j = i + arah
    if (j < 0 || j >= daftar.length) return
    const susunan = [...daftar]
    ;[susunan[i], susunan[j]] = [susunan[j], susunan[i]]
    const baris = susunan.map((x, n) => ({
      id: x.id,
      sekolah_id: sekolahId,
      kategori: x.kategori,
      isi: x.isi,
      urutan: n + 1,
    }))
    setSibuk(true)
    setGalat('')
    const { error } = await supabase.from('tata_tertib').upsert(baris, { onConflict: 'id' })
    setSibuk(false)
    if (error) {
      setGalat(`Gagal mengurutkan: ${error.message}`)
      return
    }
    setSemua((s) => [
      ...s.filter((x) => x.kategori !== kat),
      ...susunan.map((x, n) => ({ ...x, urutan: n + 1 })),
    ])
  }

  async function muatContoh() {
    if (!bisaEdit || daftar.length > 0) return
    setSibuk(true)
    setGalat('')
    const baris = (CONTOH[kat] || []).map((isi, n) => ({
      sekolah_id: sekolahId,
      kategori: kat,
      urutan: n + 1,
      isi,
    }))
    const { data, error } = await supabase.from('tata_tertib').insert(baris).select()
    setSibuk(false)
    if (error) {
      setGalat(`Gagal memuat contoh: ${error.message}`)
      return
    }
    setSemua((s) => [...s, ...(data || [])])
  }

  if (loadingAuth) {
    return (
      <Layout title="Tata Tertib" subtitle="Aturan sekolah untuk siswa, guru, dan orang tua.">
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Memuat...
        </div>
      </Layout>
    )
  }

  if (!sekolahId) {
    return (
      <Layout title="Tata Tertib" subtitle="Aturan sekolah untuk siswa, guru, dan orang tua.">
        <div className="max-w-xl mx-auto p-6 text-center">
          <p className="text-sm text-slate-600">
            Akun Anda belum terhubung ke sekolah, jadi tata tertib belum bisa ditampilkan.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Tata Tertib" subtitle="Aturan sekolah untuk siswa, guru, dan orang tua.">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Kontrol (tidak ikut tercetak) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Pilih kategori" className="inline-flex flex-wrap p-1 rounded-full bg-slate-100 border border-slate-200">
            {KATEGORI.map((k) => (
              <button
                key={k.id}
                type="button"
                aria-pressed={kat === k.id}
                onClick={() => {
                  setKat(k.id)
                  setEdit(null)
                }}
                className={`px-4 py-2 min-h-[40px] rounded-full text-sm font-bold transition ${
                  kat === k.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={daftar.length === 0}
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

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:border-0 print:shadow-none print:p-0">
          {/* Kepala surat hanya saat dicetak */}
          <div className="hidden print:block text-center mb-4">
            <p className="text-sm font-semibold uppercase">{sekolah?.nama_sekolah || 'Sekolah'}</p>
          </div>

          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 print:justify-center print:text-lg mb-4">
            <ScrollText size={18} className="text-blue-600 print:hidden" />
            {aktif.judul}
          </h2>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Memuat...
            </div>
          ) : daftar.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-slate-500">Belum ada butir tata tertib untuk kategori ini.</p>
              {bisaEdit && (
                <button
                  type="button"
                  onClick={muatContoh}
                  disabled={sibuk}
                  className="print:hidden inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                  <Sparkles size={15} />
                  Muat contoh (sesuaikan lagi)
                </button>
              )}
            </div>
          ) : (
            <ol className="space-y-2">
              {daftar.map((b, i) => (
                <li key={b.id} className="flex items-start gap-3 rounded-lg px-1 py-1">
                  <span className="mt-0.5 w-6 shrink-0 text-sm font-bold text-slate-500">{i + 1}.</span>
                  {edit?.id === b.id ? (
                    <div className="flex-1 space-y-2 print:hidden">
                      <textarea
                        rows={3}
                        value={edit.isi}
                        onChange={(e) => setEdit({ ...edit, isi: e.target.value })}
                        aria-label={`Ubah butir ${i + 1}`}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={simpanEdit}
                          disabled={sibuk}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          <Check size={13} />
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => setEdit(null)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <X size={13} />
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="flex-1 text-sm text-slate-800 leading-relaxed">{b.isi}</p>
                      {bisaEdit && (
                        <div className="print:hidden flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => pindah(i, -1)}
                            disabled={sibuk || i === 0}
                            aria-label="Naikkan"
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => pindah(i, 1)}
                            disabled={sibuk || i === daftar.length - 1}
                            aria-label="Turunkan"
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEdit({ id: b.id, isi: b.isi })}
                            aria-label="Ubah"
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => hapus(b)}
                            disabled={sibuk}
                            aria-label="Hapus"
                            className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}

          {/* Tanda tangan hanya saat dicetak */}
          {daftar.length > 0 && (
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

        {bisaEdit && (
          <section className="print:hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label htmlFor="butir-baru" className="block text-xs font-medium text-slate-600 mb-1">
              Tambah butir pada "{aktif.label}"
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                id="butir-baru"
                rows={2}
                value={baru}
                onChange={(e) => setBaru(e.target.value)}
                placeholder="Tulis satu aturan..."
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={tambah}
                disabled={sibuk || !baru.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {sibuk ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Tambah
              </button>
            </div>
          </section>
        )}

        {!bisaEdit && (
          <p className="print:hidden text-xs text-slate-500">
            Hanya admin dan kepala sekolah yang dapat mengubah tata tertib.
          </p>
        )}
      </div>
    </Layout>
  )
}
