import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import PilihanCepat from '../components/PilihanCepat'
import { CP_DEFAULT } from '../lib/cpDefault'
import { cariMateriDefault } from '../lib/pilihanSilabus'
import { JAM_KE, KEGIATAN, HAMBATAN, TINDAK_LANJUT } from '../lib/pilihanJurnal'
import { Loader2, Save, BookOpen, Trash2, Printer, Pencil, X, RefreshCw } from 'lucide-react'

const hariIni = () => new Date().toISOString().slice(0, 10)

const KOSONG = () => ({
  tanggal: hariIni(),
  kelas_id: '',
  mata_pelajaran: '',
  jam_ke: '',
  materi: '',
  kegiatan: '',
  hambatan: '',
  tindak_lanjut: '',
  hadir: 0,
  izin: 0,
  sakit: 0,
  alpa: 0,
})

const NOL = { hadir: 0, izin: 0, sakit: 0, alpa: 0 }

function tglLabel(iso) {
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function bulanLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

// Hitung kehadiran dari presensi siswa pada kelas & tanggal tertentu.
// Mengembalikan null kalau presensi hari itu belum diisi.
async function ambilKehadiran(kelasId, tanggal) {
  const { data: siswa } = await supabase
    .from('siswa').select('id').eq('kelas_id', kelasId).eq('status', 'aktif')
  const ids = (siswa || []).map((s) => s.id)
  if (ids.length === 0) return null
  const { data: pr } = await supabase
    .from('presensi_siswa').select('status').eq('tanggal', tanggal).in('siswa_id', ids)
  if (!pr || pr.length === 0) return null
  const n = (s) => pr.filter((p) => p.status === s).length
  return { hadir: n('hadir'), izin: n('izin'), sakit: n('sakit'), alpa: n('alpa') }
}

const LABEL = 'block text-xs font-semibold text-ink-700/60 mb-1'

export default function JurnalMengajar() {
  const { profil, isAdmin } = useAuth()
  const guruId = profil?.guru_id

  const [bulan, setBulan] = useState(() => hariIni().slice(0, 7))
  const [filterGuru, setFilterGuru] = useState('')
  const [kelasSaya, setKelasSaya] = useState([])
  const [loadingKelas, setLoadingKelas] = useState(true)
  const [silabusKelas, setSilabusKelas] = useState([])
  const [guruList, setGuruList] = useState([])
  const [daftar, setDaftar] = useState([])
  const [form, setForm] = useState(KOSONG)
  const [editId, setEditId] = useState(null)
  const [kehadiranKey, setKehadiranKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pesan, setPesan] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Admin: daftar guru untuk filter riwayat
  useEffect(() => {
    if (!isAdmin) return
    supabase.from('guru').select('id, nama_lengkap').eq('status', 'aktif').order('nama_lengkap')
      .then(({ data }) => setGuruList(data || []))
  }, [isAdmin])

  // Kelas yang boleh diisi = kelas yang diampu guru ini (wali_kelas_id), sama seperti halaman Silabus
  useEffect(() => {
    if (!guruId) {
      setKelasSaya([])
      setLoadingKelas(false)
      return
    }
    setLoadingKelas(true)
    supabase.from('kelas').select('id, nama_kelas').eq('wali_kelas_id', guruId).order('nama_kelas')
      .then(({ data }) => {
        const list = data || []
        setKelasSaya(list)
        // Otomatis pilih kelas pertama kalau belum ada yang terpilih
        setForm((f) => (f.kelas_id || list.length === 0 ? f : { ...f, kelas_id: list[0].id }))
        setLoadingKelas(false)
      })
  }, [guruId])

  // Silabus kelas terpilih: sumber saran mata pelajaran & materi
  useEffect(() => {
    if (!form.kelas_id) {
      setSilabusKelas([])
      return
    }
    supabase.from('silabus').select('mata_pelajaran, materi_pokok').eq('kelas_id', form.kelas_id)
      .then(({ data }) => setSilabusKelas(data || []))
  }, [form.kelas_id])

  // Kehadiran terisi otomatis dari presensi siswa saat kelas / tanggal berubah
  useEffect(() => {
    if (!form.kelas_id || editId) return
    let aktif = true
    ambilKehadiran(form.kelas_id, form.tanggal).then((h) => {
      if (aktif) setForm((f) => ({ ...f, ...(h || NOL) }))
    })
    return () => { aktif = false }
  }, [form.kelas_id, form.tanggal, editId, kehadiranKey])

  useEffect(() => {
    muatJurnal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulan, filterGuru, guruId, isAdmin])

  async function muatJurnal() {
    if (!isAdmin && !guruId) {
      setDaftar([])
      setLoading(false)
      return
    }
    setLoading(true)
    const [y, m] = bulan.split('-').map(Number)
    const akhir = String(new Date(y, m, 0).getDate()).padStart(2, '0')
    let q = supabase
      .from('jurnal_mengajar')
      .select('*, kelas(nama_kelas), guru(nama_lengkap)')
      .gte('tanggal', `${bulan}-01`)
      .lte('tanggal', `${bulan}-${akhir}`)
      .order('tanggal', { ascending: false })
    if (!isAdmin) q = q.eq('guru_id', guruId)
    else if (filterGuru) q = q.eq('guru_id', filterGuru)
    const { data } = await q
    setDaftar(data || [])
    setLoading(false)
  }

  const namaKelasForm = kelasSaya.find((k) => k.id === form.kelas_id)?.nama_kelas

  // Saran mata pelajaran: dari silabus kelas ini + daftar mapel bawaan
  const mapelOpsi = useMemo(
    () => [...new Set([...silabusKelas.map((s) => s.mata_pelajaran).filter(Boolean), ...Object.keys(CP_DEFAULT)])],
    [silabusKelas]
  )

  // Saran materi: utamakan materi pokok dari silabus kelas & mapel yang dipilih,
  // kalau belum ada pakai draf bawaan per kelas
  const saranMateri = useMemo(() => {
    const mapel = form.mata_pelajaran.trim().toLowerCase()
    if (!mapel) return []
    const dariSilabus = silabusKelas
      .filter((s) => s.mata_pelajaran?.trim().toLowerCase() === mapel)
      .flatMap((s) => (s.materi_pokok || '').split('\n'))
      .map((t) => t.trim())
      .filter(Boolean)
    if (dariSilabus.length > 0) return [...new Set(dariSilabus)]
    return cariMateriDefault(form.mata_pelajaran, namaKelasForm) || []
  }, [silabusKelas, form.mata_pelajaran, namaKelasForm])

  async function hitungUlangKehadiran() {
    if (!form.kelas_id) {
      setPesan('Pilih kelas dulu.')
      return
    }
    const h = await ambilKehadiran(form.kelas_id, form.tanggal)
    if (!h) {
      setPesan('Presensi siswa pada tanggal ini belum diisi.')
      return
    }
    setPesan('')
    setForm((f) => ({ ...f, ...h }))
  }

  async function simpan() {
    if (!kelasSaya.some((k) => k.id === form.kelas_id)) {
      setPesan('Anda hanya bisa mengisi jurnal untuk kelas yang Anda ampu.')
      return
    }
    if (!form.materi.trim()) {
      setPesan('Isi materi dulu.')
      return
    }
    setSaving(true)
    setPesan('')
    const payload = {
      guru_id: guruId,
      tanggal: form.tanggal,
      kelas_id: form.kelas_id,
      mata_pelajaran: form.mata_pelajaran.trim() || null,
      jam_ke: form.jam_ke.trim() || null,
      materi: form.materi.trim(),
      kegiatan: form.kegiatan.trim() || null,
      hambatan: form.hambatan.trim() || null,
      tindak_lanjut: form.tindak_lanjut.trim() || null,
      hadir: Number(form.hadir) || 0,
      izin: Number(form.izin) || 0,
      sakit: Number(form.sakit) || 0,
      alpa: Number(form.alpa) || 0,
    }
    const { error } = editId
      ? await supabase.from('jurnal_mengajar').update(payload).eq('id', editId)
      : await supabase.from('jurnal_mengajar').insert(payload)
    setSaving(false)
    if (error) {
      setPesan('Gagal menyimpan: ' + error.message)
      return
    }
    setPesan(editId ? 'Perubahan tersimpan.' : 'Jurnal tersimpan.')
    setEditId(null)
    setForm((f) => ({ ...KOSONG(), tanggal: f.tanggal, kelas_id: f.kelas_id, mata_pelajaran: f.mata_pelajaran }))
    setKehadiranKey((k) => k + 1)
    muatJurnal()
  }

  function ubah(j) {
    setEditId(j.id)
    setPesan('')
    setForm({
      tanggal: j.tanggal,
      kelas_id: j.kelas_id,
      mata_pelajaran: j.mata_pelajaran || '',
      jam_ke: j.jam_ke || '',
      materi: j.materi || '',
      kegiatan: j.kegiatan || '',
      hambatan: j.hambatan || '',
      tindak_lanjut: j.tindak_lanjut || '',
      hadir: j.hadir, izin: j.izin, sakit: j.sakit, alpa: j.alpa,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function batalUbah() {
    setEditId(null)
    setForm((f) => ({ ...KOSONG(), kelas_id: f.kelas_id }))
    setPesan('')
  }

  async function hapus(j) {
    if (!window.confirm(`Hapus jurnal "${j.materi}" tanggal ${tglLabel(j.tanggal)}?`)) return
    const { error } = await supabase.from('jurnal_mengajar').delete().eq('id', j.id)
    if (error) {
      setPesan('Gagal menghapus: ' + error.message)
      return
    }
    if (editId === j.id) batalUbah()
    muatJurnal()
  }

  const namaPencetak = isAdmin
    ? (guruList.find((g) => g.id === filterGuru)?.nama_lengkap || 'Semua guru')
    : profil?.nama_lengkap

  const adaKelas = kelasSaya.length > 0

  return (
    <Layout title="Jurnal Mengajar" subtitle="Catat kegiatan belajar mengajar harian">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area-jurnal, #print-area-jurnal * { visibility: visible; }
          #print-area-jurnal { display: block !important; position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
        }
      `}</style>

      <div className="relative overflow-hidden rounded-xl p-6 mb-6 bg-gradient-to-br from-blue-900 to-blue-950">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-14 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-white/10 ring-2 ring-white/20 flex items-center justify-center shrink-0">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <p className="font-display font-semibold text-lg text-white">Jurnal Mengajar</p>
            <p className="text-sm text-blue-200/70 mt-0.5">
              {namaKelasForm && guruId ? `Kelas ${namaKelasForm} · ` : ''}{bulanLabel(bulan)}
            </p>
          </div>
        </div>
      </div>

      {/* FORM */}
      {!guruId ? (
        !isAdmin && (
          <div className="card p-6 text-center text-ink-700/60 mb-6">
            Akun Anda belum terhubung ke data guru. Hubungi admin untuk menautkan akun.
          </div>
        )
      ) : loadingKelas ? (
        <p className="text-sm text-ink-700/50 mb-6">Memuat data kelas...</p>
      ) : !adaKelas ? (
        <div className="card p-6 mb-6">
          <p className="text-sm text-ink-700/60">
            Anda belum tercatat sebagai wali kelas di kelas manapun, jadi belum ada kelas yang bisa diisi jurnalnya.
          </p>
        </div>
      ) : (
        <div className="card relative overflow-hidden p-5 mb-6">
          <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 to-brass-400" />
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-ink-900">
              {editId ? 'Ubah Jurnal' : 'Jurnal Baru'}
            </h2>
            {editId && (
              <button type="button" onClick={batalUbah} className="flex items-center gap-1 text-xs text-ink-700/60 hover:text-ink-900">
                <X size={14} /> Batal ubah
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Tanggal</label>
              <input type="date" className="input-field w-full" value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Kelas</label>
              {kelasSaya.length > 1 ? (
                <select className="input-field w-full" value={form.kelas_id} onChange={(e) => set('kelas_id', e.target.value)}>
                  {kelasSaya.map((k) => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                </select>
              ) : (
                <p className="input-field w-full flex items-center bg-ink-900/[0.03]">{kelasSaya[0].nama_kelas}</p>
              )}
            </div>
            <div>
              <label className={LABEL}>Mata pelajaran</label>
              <input
                className="input-field w-full"
                list="daftar-mapel-jurnal"
                value={form.mata_pelajaran}
                onChange={(e) => set('mata_pelajaran', e.target.value)}
                placeholder="Pilih atau ketik mata pelajaran"
              />
              <datalist id="daftar-mapel-jurnal">
                {mapelOpsi.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div>
              <label className={LABEL}>Jam ke</label>
              <input className="input-field w-full" value={form.jam_ke} onChange={(e) => set('jam_ke', e.target.value)} placeholder="Contoh: 1-2" />
              <PilihanCepat mode="single" pilihan={JAM_KE} nilai={form.jam_ke} onChange={(v) => set('jam_ke', v)} />
            </div>
          </div>

          <div className="mt-4">
            <label className={LABEL}>Materi / tujuan pembelajaran</label>
            <textarea className="input-field w-full" rows={2} value={form.materi} onChange={(e) => set('materi', e.target.value)} />
            <PilihanCepat
              mode="single"
              pilihan={saranMateri}
              nilai={form.materi}
              onChange={(v) => set('materi', v)}
              kosongPesan="Pilih mata pelajaran agar saran materi dari silabus muncul."
            />
          </div>
          <div className="mt-4">
            <label className={LABEL}>Kegiatan pembelajaran</label>
            <textarea className="input-field w-full" rows={2} value={form.kegiatan} onChange={(e) => set('kegiatan', e.target.value)} />
            <PilihanCepat pilihan={KEGIATAN} nilai={form.kegiatan} onChange={(v) => set('kegiatan', v)} pemisah="; " />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <div>
              <label className={LABEL}>Hambatan</label>
              <textarea className="input-field w-full" rows={2} value={form.hambatan} onChange={(e) => set('hambatan', e.target.value)} />
              <PilihanCepat pilihan={HAMBATAN} nilai={form.hambatan} onChange={(v) => set('hambatan', v)} pemisah="; " />
            </div>
            <div>
              <label className={LABEL}>Tindak lanjut</label>
              <textarea className="input-field w-full" rows={2} value={form.tindak_lanjut} onChange={(e) => set('tindak_lanjut', e.target.value)} />
              <PilihanCepat pilihan={TINDAK_LANJUT} nilai={form.tindak_lanjut} onChange={(v) => set('tindak_lanjut', v)} pemisah="; " />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <label className={LABEL + ' mb-0'}>Kehadiran siswa (otomatis dari presensi)</label>
              <button type="button" onClick={hitungUlangKehadiran} className="flex items-center gap-1 text-xs text-blue-900 font-medium hover:underline">
                <RefreshCw size={12} /> Hitung ulang
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['hadir', 'izin', 'sakit', 'alpa'].map((k) => (
                <div key={k}>
                  <span className="block text-[11px] text-ink-700/50 mb-0.5 capitalize">{k}</span>
                  <input type="number" min="0" className="input-field w-full" value={form[k]} onChange={(e) => set(k, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <button type="button" onClick={simpan} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editId ? 'Simpan perubahan' : 'Simpan jurnal'}
            </button>
            {pesan && <span className="text-sm text-ink-700/70">{pesan}</span>}
          </div>
        </div>
      )}

      {/* FILTER + RIWAYAT */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input type="month" className="input-field w-auto" value={bulan} onChange={(e) => setBulan(e.target.value)} />
        {isAdmin && (
          <select className="input-field w-auto" value={filterGuru} onChange={(e) => setFilterGuru(e.target.value)}>
            <option value="">Semua guru</option>
            {guruList.map((g) => <option key={g.id} value={g.id}>{g.nama_lengkap}</option>)}
          </select>
        )}
        {daftar.length > 0 && (
          <button type="button" onClick={() => window.print()} className="btn-secondary">
            <Printer size={16} /> Cetak jurnal
          </button>
        )}
      </div>

      <div className="card relative overflow-hidden">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 to-brass-400" />
        {loading && <div className="text-center py-8 text-ink-700/50">Memuat...</div>}
        {!loading && daftar.length === 0 && (
          <div className="text-center py-8 text-ink-700/50">Belum ada jurnal pada {bulanLabel(bulan)}.</div>
        )}
        {!loading && daftar.length > 0 && (
          <div className="divide-y divide-ink-900/10">
            {daftar.map((j) => {
              const milikSaya = j.guru_id === guruId
              return (
                <div key={j.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{j.materi}</p>
                      <p className="text-xs text-ink-700/50 mt-0.5">
                        {tglLabel(j.tanggal)} · Kelas {j.kelas?.nama_kelas || '-'}
                        {j.mata_pelajaran ? ` · ${j.mata_pelajaran}` : ''}
                        {j.jam_ke ? ` · jam ke-${j.jam_ke}` : ''}
                      </p>
                      {isAdmin && j.guru?.nama_lengkap && (
                        <p className="text-xs text-ink-700/50">{j.guru.nama_lengkap}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {milikSaya && (
                        <button type="button" onClick={() => ubah(j)} title="Ubah" className="p-1.5 rounded-lg text-ink-700/50 hover:text-ink-900 hover:bg-ink-900/5">
                          <Pencil size={15} />
                        </button>
                      )}
                      {(milikSaya || isAdmin) && (
                        <button type="button" onClick={() => hapus(j)} title="Hapus" className="p-1.5 rounded-lg text-ink-700/50 hover:text-red-700 hover:bg-red-100">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  {j.kegiatan && <p className="text-sm mt-2">{j.kegiatan}</p>}
                  {j.hambatan && <p className="text-sm text-ink-700/70 mt-1"><span className="font-medium">Hambatan:</span> {j.hambatan}</p>}
                  {j.tindak_lanjut && <p className="text-sm text-ink-700/70 mt-1"><span className="font-medium">Tindak lanjut:</span> {j.tindak_lanjut}</p>}
                  <p className="text-xs text-ink-700/50 mt-2">
                    Hadir {j.hadir} · Izin {j.izin} · Sakit {j.sakit} · Alpa {j.alpa}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AREA CETAK */}
      <div id="print-area-jurnal" className="hidden">
        <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '2px' }}>Jurnal Mengajar</h1>
        <p style={{ fontSize: '13px', marginBottom: '16px', color: '#333' }}>
          {namaPencetak} · {bulanLabel(bulan)}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              {['No', 'Tanggal', 'Kelas', 'Mapel', 'Jam', 'Materi', 'Kegiatan', 'H', 'I', 'S', 'A'].map((h) => (
                <th key={h} style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...daftar].reverse().map((j, i) => (
              <tr key={j.id}>
                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{i + 1}</td>
                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>
                  {new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{j.kelas?.nama_kelas || '-'}</td>
                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{j.mata_pelajaran || '-'}</td>
                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{j.jam_ke || '-'}</td>
                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{j.materi}</td>
                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{j.kegiatan || '-'}</td>
                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{j.hadir}</td>
                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{j.izin}</td>
                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{j.sakit}</td>
                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{j.alpa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
