import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Printer, Loader2, RefreshCw } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const tahunAjaranSekarang = () => {
  const n = new Date()
  const y = n.getMonth() >= 6 ? n.getFullYear() : n.getFullYear() - 1
  return `${y}/${y + 1}`
}

const DATA_AWAL = {
  pendahuluan: '',
  jumlah_siswa: '',
  jumlah_guru: '',
  jumlah_rombel: '',
  capaian: [{ bidang: '', program: '', target: '', capaian: '', ket: '' }],
  keuangan: [{ uraian: '', anggaran: '', realisasi: '' }],
  kendala: [{ masalah: '', solusi: '' }],
  rtl: [''],
  penutup: '',
  tempat: '',
  tanggal: '',
  kepala_sekolah: '',
  nip_kepala: '',
}

const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0)

const input = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'

function Bagian({ judul, petunjuk, children, aksi }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="font-display font-semibold text-slate-900">{judul}</h2>
          {petunjuk && <p className="text-xs text-slate-500">{petunjuk}</p>}
        </div>
        {aksi}
      </div>
      {children}
    </section>
  )
}

function TombolTambah({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:text-blue-950">
      <Plus size={14} /> Tambah baris
    </button>
  )
}

export default function LaporanPertanggungjawabanKepsek() {
  const { profil } = useAuth()
  const sekolahId = profil?.sekolah_id

  const [tahun, setTahun] = useState(tahunAjaranSekarang())
  const [d, setD] = useState(DATA_AWAL)
  const [sekolah, setSekolah] = useState(null)
  const [visiMisi, setVisiMisi] = useState(null)
  const [tab, setTab] = useState('isi')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tarik, setTarik] = useState(false)
  const [pesan, setPesan] = useState(null)

  // Profil sekolah + visi/misi (sekali saja)
  useEffect(() => {
    if (!sekolahId) return
    supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle().then(({ data }) => {
      if (data) setSekolah({ nama: data.nama_sekolah, alamat: data.alamat, kota: data.kabupaten })
    })
    supabase.from('visi_misi_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle().then(({ data }) => {
      if (data) {
        setVisiMisi(data)
        setD((x) => ({ ...x, kepala_sekolah: x.kepala_sekolah || data.kepala_sekolah || '', nip_kepala: x.nip_kepala || data.nip_kepala || '' }))
      }
    })
  }, [sekolahId])

  // Laporan per tahun ajaran
  useEffect(() => {
    if (!sekolahId || !tahun) return
    let batal = false
    setLoading(true)
    supabase
      .from('lpj_kepsek')
      .select('data')
      .eq('sekolah_id', sekolahId)
      .eq('tahun_ajaran', tahun)
      .maybeSingle()
      .then(({ data }) => {
        if (batal) return
        setD((x) => ({ ...DATA_AWAL, kepala_sekolah: x.kepala_sekolah, nip_kepala: x.nip_kepala, ...(data?.data || {}) }))
        setLoading(false)
      })
    return () => {
      batal = true
    }
  }, [sekolahId, tahun])

  const set = (k, v) => setD((x) => ({ ...x, [k]: v }))
  const ubahBaris = (k, i, f, v) =>
    setD((x) => ({ ...x, [k]: x[k].map((r, idx) => (idx === i ? { ...r, [f]: v } : r)) }))
  const tambahBaris = (k, tpl) => setD((x) => ({ ...x, [k]: [...x[k], tpl] }))
  const hapusBaris = (k, i) => setD((x) => ({ ...x, [k]: x[k].length > 1 ? x[k].filter((_, idx) => idx !== i) : x[k] }))

  async function tarikData() {
    setTarik(true)
    setPesan(null)
    const hitung = async (tabel) => {
      const { count, error } = await supabase
        .from(tabel)
        .select('id', { count: 'exact', head: true })
        .eq('sekolah_id', sekolahId)
      return error ? null : count
    }
    const [s, g, k] = await Promise.all([hitung('siswa'), hitung('guru'), hitung('kelas')])
    setD((x) => ({
      ...x,
      jumlah_siswa: s ?? x.jumlah_siswa,
      jumlah_guru: g ?? x.jumlah_guru,
      jumlah_rombel: k ?? x.jumlah_rombel,
    }))
    setTarik(false)
    setPesan({ ok: true, teks: 'Jumlah siswa, guru, dan rombel sudah ditarik. Periksa lalu simpan.' })
  }

  async function simpan() {
    setSaving(true)
    setPesan(null)
    const { error } = await supabase.from('lpj_kepsek').upsert(
      { sekolah_id: sekolahId, tahun_ajaran: tahun, data: d, updated_at: new Date().toISOString() },
      { onConflict: 'sekolah_id,tahun_ajaran' }
    )
    setSaving(false)
    setPesan(error ? { ok: false, teks: `Gagal menyimpan: ${error.message}` } : { ok: true, teks: 'Tersimpan.' })
  }

  const total = useMemo(
    () => ({
      anggaran: d.keuangan.reduce((a, r) => a + (Number(r.anggaran) || 0), 0),
      realisasi: d.keuangan.reduce((a, r) => a + (Number(r.realisasi) || 0), 0),
    }),
    [d.keuangan]
  )
  const persen = total.anggaran ? ((total.realisasi / total.anggaran) * 100).toFixed(1) : '0'

  const capaianIsi = d.capaian.filter((r) => r.program.trim())
  const keuanganIsi = d.keuangan.filter((r) => r.uraian.trim())
  const kendalaIsi = d.kendala.filter((r) => r.masalah.trim())
  const rtlIsi = d.rtl.filter((s) => s.trim())

  return (
    <Layout
      title="Laporan Pertanggungjawaban Kepala Sekolah"
      subtitle="Laporan tahunan: capaian program, penggunaan anggaran, kendala, dan tindak lanjut."
    >
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-cetak, #area-cetak * { visibility: visible; }
          #area-cetak { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
          #area-cetak h3 { break-after: avoid; }
          #area-cetak table, #area-cetak tr { break-inside: avoid; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto p-4 print:hidden">
        <Link to="/administrasi-kepsek" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-3">
          <ArrowLeft size={16} /> Administrasi Kepala Sekolah
        </Link>


        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Tahun ajaran</label>
            <input value={tahun} onChange={(e) => setTahun(e.target.value)} placeholder="2026/2027" className="block border rounded-lg px-3 py-2 text-sm w-36" />
          </div>
          <div className="flex gap-2">
            {[
              ['isi', 'Isi Laporan'],
              ['cetak', 'Pratinjau & Cetak'],
            ].map(([k, t]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === k ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'cetak' && (
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Printer size={16} /> Cetak
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 py-10">
            <Loader2 className="animate-spin" size={18} /> Memuat laporan…
          </div>
        )}

        {!loading && tab === 'isi' && (
          <div className="space-y-4">
            <Bagian judul="A. Pendahuluan" petunjuk="Latar belakang, dasar, dan tujuan laporan.">
              <textarea rows={4} value={d.pendahuluan} onChange={(e) => set('pendahuluan', e.target.value)} className={input} />
            </Bagian>

            <Bagian
              judul="B. Gambaran Umum Sekolah"
              petunjuk="Nama dan alamat diambil dari Profil Sekolah. Visi dan misi diambil dari dokumen Visi, Misi, dan Tujuan."
              aksi={
                <button
                  type="button"
                  onClick={tarikData}
                  disabled={tarik}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:text-blue-950 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={tarik ? 'animate-spin' : ''} /> Tarik Data Otomatis
                </button>
              }
            >
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['jumlah_siswa', 'Jumlah siswa'],
                  ['jumlah_guru', 'Jumlah guru'],
                  ['jumlah_rombel', 'Jumlah rombel'],
                ].map(([k, l]) => (
                  <div key={k}>
                    <label className="text-xs font-semibold text-slate-700">{l}</label>
                    <input type="number" min="0" value={d[k]} onChange={(e) => set(k, e.target.value)} className={input} />
                  </div>
                ))}
              </div>
            </Bagian>

            <Bagian judul="C. Capaian Program" petunjuk="Satu baris per program kerja." aksi={<TombolTambah onClick={() => tambahBaris('capaian', { bidang: '', program: '', target: '', capaian: '', ket: '' })} />}>
              <div className="space-y-3">
                {d.capaian.map((r, i) => (
                  <div key={i} className="grid sm:grid-cols-12 gap-2 items-start border rounded-lg p-2">
                    <input placeholder="Bidang (mis. Kurikulum)" value={r.bidang} onChange={(e) => ubahBaris('capaian', i, 'bidang', e.target.value)} className={`${input} sm:col-span-3`} />
                    <input placeholder="Program" value={r.program} onChange={(e) => ubahBaris('capaian', i, 'program', e.target.value)} className={`${input} sm:col-span-3`} />
                    <input placeholder="Target" value={r.target} onChange={(e) => ubahBaris('capaian', i, 'target', e.target.value)} className={`${input} sm:col-span-2`} />
                    <input placeholder="Capaian" value={r.capaian} onChange={(e) => ubahBaris('capaian', i, 'capaian', e.target.value)} className={`${input} sm:col-span-2`} />
                    <input placeholder="Keterangan" value={r.ket} onChange={(e) => ubahBaris('capaian', i, 'ket', e.target.value)} className={`${input} sm:col-span-1`} />
                    <button type="button" onClick={() => hapusBaris('capaian', i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg justify-self-end" aria-label={`Hapus capaian nomor ${i + 1}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </Bagian>

            <Bagian judul="D. Pengelolaan Keuangan" petunjuk="Isi per sumber atau jenis belanja (mis. Dana BOS, belanja ATK). Total dihitung otomatis." aksi={<TombolTambah onClick={() => tambahBaris('keuangan', { uraian: '', anggaran: '', realisasi: '' })} />}>
              <div className="space-y-2">
                {d.keuangan.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input placeholder="Uraian" value={r.uraian} onChange={(e) => ubahBaris('keuangan', i, 'uraian', e.target.value)} className={`${input} col-span-12 sm:col-span-5`} />
                    <input type="number" min="0" placeholder="Anggaran (Rp)" value={r.anggaran} onChange={(e) => ubahBaris('keuangan', i, 'anggaran', e.target.value)} className={`${input} col-span-6 sm:col-span-3`} />
                    <input type="number" min="0" placeholder="Realisasi (Rp)" value={r.realisasi} onChange={(e) => ubahBaris('keuangan', i, 'realisasi', e.target.value)} className={`${input} col-span-5 sm:col-span-3`} />
                    <button type="button" onClick={() => hapusBaris('keuangan', i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg col-span-1" aria-label={`Hapus keuangan nomor ${i + 1}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-700 mt-3">
                Total anggaran {rupiah(total.anggaran)} · realisasi {rupiah(total.realisasi)} ({persen}%)
              </p>
            </Bagian>

            <Bagian judul="E. Kendala dan Solusi" aksi={<TombolTambah onClick={() => tambahBaris('kendala', { masalah: '', solusi: '' })} />}>
              <div className="space-y-2">
                {d.kendala.map((r, i) => (
                  <div key={i} className="grid sm:grid-cols-12 gap-2 items-start">
                    <textarea rows={2} placeholder="Kendala" value={r.masalah} onChange={(e) => ubahBaris('kendala', i, 'masalah', e.target.value)} className={`${input} sm:col-span-6`} />
                    <textarea rows={2} placeholder="Solusi yang ditempuh" value={r.solusi} onChange={(e) => ubahBaris('kendala', i, 'solusi', e.target.value)} className={`${input} sm:col-span-5`} />
                    <button type="button" onClick={() => hapusBaris('kendala', i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" aria-label={`Hapus kendala nomor ${i + 1}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </Bagian>

            <Bagian judul="F. Rencana Tindak Lanjut" aksi={<TombolTambah onClick={() => set('rtl', [...d.rtl, ''])} />}>
              <div className="space-y-2">
                {d.rtl.map((v, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="mt-2 w-5 text-sm text-slate-500 text-right shrink-0">{i + 1}.</span>
                    <textarea rows={2} value={v} onChange={(e) => set('rtl', d.rtl.map((x, idx) => (idx === i ? e.target.value : x)))} className={input} />
                    <button type="button" onClick={() => set('rtl', d.rtl.length > 1 ? d.rtl.filter((_, idx) => idx !== i) : d.rtl)} className="mt-1 p-2 text-red-600 hover:bg-red-50 rounded-lg" aria-label={`Hapus rencana nomor ${i + 1}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </Bagian>

            <Bagian judul="G. Penutup dan Pengesahan">
              <textarea rows={3} value={d.penutup} onChange={(e) => set('penutup', e.target.value)} placeholder="Kalimat penutup" className={`${input} mb-3`} />
              <div className="grid sm:grid-cols-2 gap-3">
                <input placeholder="Tempat (mis. Sorong)" value={d.tempat} onChange={(e) => set('tempat', e.target.value)} className={input} />
                <input type="date" value={d.tanggal} onChange={(e) => set('tanggal', e.target.value)} className={input} />
                <input placeholder="Nama kepala sekolah" value={d.kepala_sekolah} onChange={(e) => set('kepala_sekolah', e.target.value)} className={input} />
                <input placeholder="NIP kepala sekolah" value={d.nip_kepala} onChange={(e) => set('nip_kepala', e.target.value)} className={input} />
              </div>
            </Bagian>

            <div className="flex items-center gap-3 pb-6">
              <button onClick={simpan} disabled={saving} className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan laporan
              </button>
              {pesan && <span className={`text-sm ${pesan.ok ? 'text-green-700' : 'text-red-600'}`}>{pesan.teks}</span>}
            </div>
          </div>
        )}
      </div>

      {!loading && tab === 'cetak' && (
        <div className="max-w-4xl mx-auto px-4 pb-10">
          <div id="area-cetak" className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-slate-900 text-sm leading-relaxed">
            <div className="text-center border-b-2 border-slate-800 pb-3 mb-6">
              <p className="text-xs">LAPORAN PERTANGGUNGJAWABAN KEPALA SEKOLAH</p>
              <h2 className="text-lg font-bold">{sekolah?.nama || 'NAMA SEKOLAH'}</h2>
              {sekolah?.alamat && <p className="text-xs text-slate-600">{sekolah.alamat}</p>}
              <p className="text-xs text-slate-600">Tahun Ajaran {tahun}</p>
            </div>

            <h3 className="font-bold mb-1">A. Pendahuluan</h3>
            <p className="mb-4 text-justify whitespace-pre-line">{d.pendahuluan || '—'}</p>

            <h3 className="font-bold mb-1">B. Gambaran Umum Sekolah</h3>
            <p className="mb-1">
              {sekolah?.nama || 'Sekolah'} memiliki {d.jumlah_siswa || '…'} siswa, {d.jumlah_guru || '…'} guru, dan {d.jumlah_rombel || '…'} rombongan belajar pada tahun ajaran {tahun}.
            </p>
            {visiMisi?.visi && (
              <p className="mb-1">
                <span className="font-semibold">Visi:</span> {visiMisi.visi}
              </p>
            )}
            {visiMisi?.misi?.length > 0 && (
              <>
                <p className="font-semibold">Misi:</p>
                <ol className="list-decimal pl-6 mb-4">
                  {visiMisi.misi.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ol>
              </>
            )}

            <h3 className="font-bold mb-1 mt-4">C. Capaian Program</h3>
            {capaianIsi.length ? (
              <table className="w-full border-collapse border border-slate-700 mb-4 text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    {['No', 'Bidang', 'Program', 'Target', 'Capaian', 'Ket.'].map((h) => (
                      <th key={h} className="border border-slate-700 px-2 py-1 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {capaianIsi.map((r, i) => (
                    <tr key={i}>
                      <td className="border border-slate-700 px-2 py-1">{i + 1}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.bidang}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.program}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.target}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.capaian}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.ket}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mb-4">—</p>
            )}

            <h3 className="font-bold mb-1">D. Pengelolaan Keuangan</h3>
            {keuanganIsi.length ? (
              <table className="w-full border-collapse border border-slate-700 mb-4 text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    {['No', 'Uraian', 'Anggaran', 'Realisasi', '%'].map((h) => (
                      <th key={h} className="border border-slate-700 px-2 py-1 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keuanganIsi.map((r, i) => (
                    <tr key={i}>
                      <td className="border border-slate-700 px-2 py-1">{i + 1}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.uraian}</td>
                      <td className="border border-slate-700 px-2 py-1 text-right">{rupiah(r.anggaran)}</td>
                      <td className="border border-slate-700 px-2 py-1 text-right">{rupiah(r.realisasi)}</td>
                      <td className="border border-slate-700 px-2 py-1 text-right">
                        {Number(r.anggaran) ? ((Number(r.realisasi) / Number(r.anggaran)) * 100).toFixed(1) : '0'}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="border border-slate-700 px-2 py-1" colSpan={2}>Jumlah</td>
                    <td className="border border-slate-700 px-2 py-1 text-right">{rupiah(total.anggaran)}</td>
                    <td className="border border-slate-700 px-2 py-1 text-right">{rupiah(total.realisasi)}</td>
                    <td className="border border-slate-700 px-2 py-1 text-right">{persen}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="mb-4">—</p>
            )}

            <h3 className="font-bold mb-1">E. Kendala dan Solusi</h3>
            {kendalaIsi.length ? (
              <table className="w-full border-collapse border border-slate-700 mb-4 text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    {['No', 'Kendala', 'Solusi'].map((h) => (
                      <th key={h} className="border border-slate-700 px-2 py-1 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kendalaIsi.map((r, i) => (
                    <tr key={i}>
                      <td className="border border-slate-700 px-2 py-1">{i + 1}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.masalah}</td>
                      <td className="border border-slate-700 px-2 py-1">{r.solusi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mb-4">—</p>
            )}

            <h3 className="font-bold mb-1">F. Rencana Tindak Lanjut</h3>
            {rtlIsi.length ? (
              <ol className="list-decimal pl-6 mb-4 space-y-1">
                {rtlIsi.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            ) : (
              <p className="mb-4">—</p>
            )}

            <h3 className="font-bold mb-1">G. Penutup</h3>
            <p className="mb-8 text-justify whitespace-pre-line">{d.penutup || '—'}</p>

            <div className="flex justify-end">
              <div className="text-center min-w-[220px]">
                <p>
                  {d.tempat || sekolah?.kota || '……………'},{' '}
                  {d.tanggal
                    ? new Date(d.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '……………'}
                </p>
                <p>Kepala Sekolah,</p>
                <div className="h-20" />
                <p className="font-bold underline">{d.kepala_sekolah || '……………'}</p>
                <p>NIP. {d.nip_kepala || '……………'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
