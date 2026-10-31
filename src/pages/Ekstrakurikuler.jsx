import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, Trophy, UserPlus, X } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { btnPrimer, btnSekunder, inputCls, namaSiswa, nisnSiswa } from '../lib/akademikHelper'

const PREDIKAT = ['Sangat Baik', 'Baik', 'Cukup', 'Kurang']
const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const FORM_KOSONG = {
  nama: '', pembina_guru_id: '', hari: '', jam_mulai: '', jam_selesai: '',
  tempat: '', deskripsi: '', aktif: true,
}

// Halaman ekstrakurikuler: admin mengelola daftar ekskul; admin dan guru pembina
// mengelola anggota serta predikat per semester (aturan akses dijaga RLS di database).
export default function Ekstrakurikuler() {
  const { isAdmin, sekolahId, session } = useAuth()
  const [ekskul, setEkskul] = useState([])
  const [guru, setGuru] = useState([])
  const [siswaAll, setSiswaAll] = useState([])
  const [anggota, setAnggota] = useState([])
  const [guruSayaId, setGuruSayaId] = useState(null)
  const [tahun, setTahun] = useState('')
  const [semester, setSemester] = useState('Ganjil')
  const [terpilihId, setTerpilihId] = useState(null)
  const [form, setForm] = useState(null) // null = tertutup, objek = modal terbuka
  const [loading, setLoading] = useState(true)
  const [pesan, setPesan] = useState(null)

  // data utama + periode aktif (sekali saat halaman dibuka)
  const muatDasar = useCallback(async () => {
    if (!sekolahId) return
    setLoading(true)
    const [e, g, s, ta] = await Promise.all([
      supabase.from('ekstrakurikuler').select('*').eq('sekolah_id', sekolahId).order('nama'),
      supabase.from('guru').select('id,nama_lengkap,user_id').eq('sekolah_id', sekolahId).order('nama_lengkap'),
      supabase.from('siswa').select('*').eq('sekolah_id', sekolahId),
      supabase.from('tahun_ajaran').select('nama,semester').eq('sekolah_id', sekolahId).eq('aktif', true).maybeSingle(),
    ])
    if (e.error) setPesan({ tipe: 'err', teks: `Gagal memuat ekskul: ${e.error.message}` })
    setEkskul(e.data || [])
    setGuru(g.data || [])
    setSiswaAll(s.data || [])
    setGuruSayaId((g.data || []).find((x) => x.user_id === session?.user?.id)?.id ?? null)
    if (ta.data) {
      setTahun((t) => t || ta.data.nama)
      setSemester((x) => (ta.data.semester ? ta.data.semester : x))
    }
    setLoading(false)
  }, [sekolahId, session?.user?.id])

  useEffect(() => {
    muatDasar()
  }, [muatDasar])

  // anggota untuk periode yang dipilih
  const muatAnggota = useCallback(async () => {
    if (!sekolahId || !tahun) {
      setAnggota([])
      return
    }
    const { data, error } = await supabase
      .from('anggota_ekskul')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .eq('tahun_ajaran', tahun)
      .eq('semester', semester)
    if (error) setPesan({ tipe: 'err', teks: `Gagal memuat anggota: ${error.message}` })
    setAnggota(data || [])
  }, [sekolahId, tahun, semester])

  useEffect(() => {
    muatAnggota()
  }, [muatAnggota])

  const siswaMap = useMemo(() => Object.fromEntries(siswaAll.map((s) => [s.id, s])), [siswaAll])
  const guruMap = useMemo(() => Object.fromEntries(guru.map((g) => [g.id, g])), [guru])
  const hitung = useMemo(() => {
    const m = {}
    anggota.forEach((a) => {
      m[a.ekskul_id] = (m[a.ekskul_id] || 0) + 1
    })
    return m
  }, [anggota])

  const terpilih = ekskul.find((x) => x.id === terpilihId) || null
  const bolehKelola = (x) => isAdmin || (x && guruSayaId && x.pembina_guru_id === guruSayaId)

  async function simpanEkskul(e) {
    e.preventDefault()
    if (!form.nama.trim()) {
      setPesan({ tipe: 'err', teks: 'Nama ekstrakurikuler wajib diisi.' })
      return
    }
    const payload = {
      nama: form.nama.trim(),
      pembina_guru_id: form.pembina_guru_id || null,
      hari: form.hari || null,
      jam_mulai: form.jam_mulai || null,
      jam_selesai: form.jam_selesai || null,
      tempat: form.tempat.trim() || null,
      deskripsi: form.deskripsi.trim() || null,
      aktif: form.aktif,
    }
    const q = form.id
      ? supabase.from('ekstrakurikuler').update(payload).eq('id', form.id)
      : supabase.from('ekstrakurikuler').insert({ ...payload, sekolah_id: sekolahId })
    const { error } = await q
    if (error) {
      setPesan({ tipe: 'err', teks: error.message })
      return
    }
    setForm(null)
    setPesan({ tipe: 'ok', teks: 'Ekstrakurikuler disimpan.' })
    muatDasar()
  }

  async function hapusEkskul(x) {
    if (!window.confirm(`Hapus ekstrakurikuler ${x.nama}? Seluruh data anggotanya ikut terhapus.`)) return
    const { error } = await supabase.from('ekstrakurikuler').delete().eq('id', x.id)
    if (error) {
      setPesan({ tipe: 'err', teks: error.message })
      return
    }
    if (terpilihId === x.id) setTerpilihId(null)
    muatDasar()
    muatAnggota()
  }

  return (
    <Layout title="Ekstrakurikuler" subtitle="Daftar kegiatan ekstrakurikuler, anggota, dan predikat per semester">
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Tahun ajaran</label>
          <input className={`${inputCls} w-36`} placeholder="2026/2027" value={tahun} onChange={(e) => setTahun(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Semester</label>
          <select className={`${inputCls} w-32`} value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option>Ganjil</option>
            <option>Genap</option>
          </select>
        </div>
        <div className="flex-1" />
        {isAdmin && (
          <button className={btnPrimer} onClick={() => setForm({ ...FORM_KOSONG })}>
            <Plus size={16} /> Tambah Ekstrakurikuler
          </button>
        )}
      </div>

      {pesan && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            pesan.tipe === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {pesan.teks}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Memuat…</p>
      ) : ekskul.length === 0 ? (
        <p className="text-sm text-slate-500">
          Belum ada ekstrakurikuler.{isAdmin ? ' Tambahkan lewat tombol di atas.' : ''}
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            {ekskul.map((x) => (
              <div
                key={x.id}
                onClick={() => setTerpilihId(x.id)}
                className={`cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition ${
                  terpilihId === x.id ? 'border-blue-500 ring-1 ring-blue-200' : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Trophy size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">
                      {x.nama}
                      {!x.aktif && <span className="ml-2 text-xs font-normal text-slate-400">(nonaktif)</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {x.pembina_guru_id ? `Pembina: ${guruMap[x.pembina_guru_id]?.nama_lengkap || '-'}` : 'Belum ada pembina'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[x.hari, x.jam_mulai && `${x.jam_mulai.slice(0, 5)}${x.jam_selesai ? '–' + x.jam_selesai.slice(0, 5) : ''}`, x.tempat]
                        .filter(Boolean)
                        .join(' · ') || 'Jadwal belum diatur'}
                    </p>
                    <p className="mt-1 text-xs font-medium text-blue-600">{hitung[x.id] || 0} anggota</p>
                  </div>
                  {isAdmin && (
                    <div className="flex shrink-0 flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        title="Ubah"
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                        onClick={() =>
                          setForm({
                            id: x.id,
                            nama: x.nama,
                            pembina_guru_id: x.pembina_guru_id || '',
                            hari: x.hari || '',
                            jam_mulai: x.jam_mulai?.slice(0, 5) || '',
                            jam_selesai: x.jam_selesai?.slice(0, 5) || '',
                            tempat: x.tempat || '',
                            deskripsi: x.deskripsi || '',
                            aktif: x.aktif,
                          })
                        }
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        title="Hapus"
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => hapusEkskul(x)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {terpilih ? (
              <PanelAnggota
                key={terpilih.id + tahun + semester}
                ekskul={terpilih}
                anggota={anggota.filter((a) => a.ekskul_id === terpilih.id)}
                semuaAnggotaPeriode={anggota}
                siswaAll={siswaAll}
                siswaMap={siswaMap}
                sekolahId={sekolahId}
                tahun={tahun}
                semester={semester}
                boleh={bolehKelola(terpilih)}
                muat={muatAnggota}
                setPesan={setPesan}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                Pilih satu ekstrakurikuler untuk melihat dan mengelola anggotanya.
              </div>
            )}
          </div>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setForm(null)}>
          <form
            onSubmit={simpanEkskul}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                {form.id ? 'Ubah Ekstrakurikuler' : 'Tambah Ekstrakurikuler'}
              </h3>
              <button type="button" onClick={() => setForm(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nama</label>
              <input className={inputCls} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Pramuka, Drumband, Futsal…" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Pembina</label>
              <select className={inputCls} value={form.pembina_guru_id} onChange={(e) => setForm({ ...form, pembina_guru_id: e.target.value })}>
                <option value="">— belum ada —</option>
                {guru.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama_lengkap}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Hari</label>
                <select className={inputCls} value={form.hari} onChange={(e) => setForm({ ...form, hari: e.target.value })}>
                  <option value="">—</option>
                  {HARI.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Mulai</label>
                <input type="time" className={inputCls} value={form.jam_mulai} onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Selesai</label>
                <input type="time" className={inputCls} value={form.jam_selesai} onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Tempat</label>
              <input className={inputCls} value={form.tempat} onChange={(e) => setForm({ ...form, tempat: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Deskripsi</label>
              <textarea rows={2} className={inputCls} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
              Ekstrakurikuler aktif
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnSekunder} onClick={() => setForm(null)}>
                Batal
              </button>
              <button type="submit" className={btnPrimer}>
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  )
}

// ---------------------------------------------------------------------
function PanelAnggota({
  ekskul, anggota, semuaAnggotaPeriode, siswaAll, siswaMap, sekolahId,
  tahun, semester, boleh, muat, setPesan,
}) {
  const [cari, setCari] = useState('')
  const [pilihId, setPilihId] = useState('')

  // siswa aktif yang belum jadi anggota ekskul ini pada periode ini
  const kandidat = useMemo(() => {
    const sudah = new Set(anggota.map((a) => a.siswa_id))
    const q = cari.trim().toLowerCase()
    return siswaAll
      .filter((s) => (s.status_siswa ?? 'aktif') === 'aktif' && !sudah.has(s.id))
      .filter((s) => !q || namaSiswa(s).toLowerCase().includes(q))
      .sort((a, b) => namaSiswa(a).localeCompare(namaSiswa(b)))
      .slice(0, 100)
  }, [siswaAll, anggota, cari])

  async function tambah() {
    if (!pilihId) return
    if (!tahun) {
      setPesan({ tipe: 'err', teks: 'Isi tahun ajaran terlebih dahulu.' })
      return
    }
    const { error } = await supabase.from('anggota_ekskul').insert({
      sekolah_id: sekolahId,
      ekskul_id: ekskul.id,
      siswa_id: pilihId,
      tahun_ajaran: tahun,
      semester,
    })
    if (error) {
      setPesan({ tipe: 'err', teks: error.message })
      return
    }
    setPilihId('')
    setCari('')
    muat()
  }

  async function ubahPredikat(a, predikat) {
    const { error } = await supabase
      .from('anggota_ekskul')
      .update({ predikat: predikat || null })
      .eq('id', a.id)
    if (error) setPesan({ tipe: 'err', teks: error.message })
    else muat()
  }

  async function keluarkan(a) {
    if (!window.confirm(`Keluarkan ${namaSiswa(siswaMap[a.siswa_id])} dari ${ekskul.nama}?`)) return
    const { error } = await supabase.from('anggota_ekskul').delete().eq('id', a.id)
    if (error) setPesan({ tipe: 'err', teks: error.message })
    else muat()
  }

  // siswa yang ikut ekskul lain pada periode yang sama, sekadar info
  const ikutLain = useMemo(() => {
    const m = {}
    semuaAnggotaPeriode.forEach((a) => {
      if (a.ekskul_id !== ekskul.id) m[a.siswa_id] = (m[a.siswa_id] || 0) + 1
    })
    return m
  }, [semuaAnggotaPeriode, ekskul.id])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-800">
        Anggota {ekskul.nama} · {tahun || '—'} {semester}
      </h3>
      {ekskul.deskripsi && <p className="mt-1 text-sm text-slate-500">{ekskul.deskripsi}</p>}

      {boleh && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={`${inputCls} flex-1 min-w-[10rem]`}
              placeholder="Cari siswa aktif…"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
            <select className={`${inputCls} flex-1 min-w-[12rem]`} value={pilihId} onChange={(e) => setPilihId(e.target.value)}>
              <option value="">— pilih siswa —</option>
              {kandidat.map((s) => (
                <option key={s.id} value={s.id}>
                  {namaSiswa(s)}
                </option>
              ))}
            </select>
            <button className={btnPrimer} disabled={!pilihId} onClick={tambah}>
              <UserPlus size={16} /> Tambah
            </button>
          </div>
        </div>
      )}

      {anggota.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Belum ada anggota pada periode ini.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3">NISN</th>
                <th className="py-2 pr-3">Predikat</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {[...anggota]
                .sort((a, b) => namaSiswa(siswaMap[a.siswa_id]).localeCompare(namaSiswa(siswaMap[b.siswa_id])))
                .map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 text-slate-800">
                      {namaSiswa(siswaMap[a.siswa_id])}
                      {ikutLain[a.siswa_id] ? (
                        <span className="ml-2 text-xs text-slate-400">+{ikutLain[a.siswa_id]} ekskul lain</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-slate-500">{nisnSiswa(siswaMap[a.siswa_id])}</td>
                    <td className="py-2 pr-3">
                      {boleh ? (
                        <select
                          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                          value={a.predikat || ''}
                          onChange={(e) => ubahPredikat(a, e.target.value)}
                        >
                          <option value="">—</option>
                          {PREDIKAT.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      ) : (
                        a.predikat || '-'
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {boleh && (
                        <button
                          title="Keluarkan"
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => keluarkan(a)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
