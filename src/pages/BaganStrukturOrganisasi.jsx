import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2, Save, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

/*
  Bagan Struktur Organisasi
  - Semua pengguna sekolah: lihat & cetak.
  - Admin / kepala sekolah (isAdmin): tab "Atur Struktur" untuk menentukan atasan,
    jabatan struktural, urutan, dan menyembunyikan seseorang dari bagan.

  Butuh: struktur_organisasi.sql (tabel struktur_organisasi + fungsi bagan_orang_sekolah).

  Aturan bawaan (bila admin belum mengatur seseorang):
    - jabatan 'kepala_sekolah'  -> puncak bagan
    - orang lain                -> langsung di bawah kepala sekolah
*/

const WARNA = { aksen: '#1e3a8a', emas: '#c9a227', garis: '#94a3b8' }

function getFotoUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('foto-profil').getPublicUrl(path)
  return data?.publicUrl || null
}

function getInisial(nama) {
  if (!nama) return '?'
  const kata = nama.trim().split(/\s+/)
  const ini = kata.length > 1 ? kata[0][0] + kata[1][0] : kata[0].slice(0, 2)
  return ini.toUpperCase()
}

function rapikanJabatan(jabatan) {
  if (!jabatan || jabatan === 'pegawai') return 'Tenaga Kependidikan'
  return jabatan
    .split('_')
    .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
    .join(' ')
}

function labelOrang(o, baris) {
  if (baris?.jabatan_struktural?.trim()) return baris.jabatan_struktural.trim()
  if (o.jabatan === 'kepala_sekolah') return 'Kepala Sekolah'
  if (o.jabatan === 'guru' || o.role === 'guru') return 'Guru'
  return rapikanJabatan(o.jabatan)
}

function Foto({ nama, path, ukuran, cincin }) {
  const url = getFotoUrl(path)
  const gaya = {
    width: ukuran,
    height: ukuran,
    borderRadius: '50%',
    border: `3px solid ${cincin}`,
    flexShrink: 0,
  }
  if (url) return <img src={url} alt={nama} style={{ ...gaya, objectFit: 'cover' }} />
  return (
    <div
      style={{
        ...gaya,
        background: WARNA.aksen,
        color: '#fff',
        fontWeight: 700,
        fontSize: ukuran * 0.34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {getInisial(nama)}
    </div>
  )
}

// jenis: 'puncak' | 'tengah' | 'daun'
function Kartu({ orang, label, jenis }) {
  const cfg = {
    puncak: { w: 190, foto: 80, teks: 14, atas: WARNA.emas },
    tengah: { w: 150, foto: 60, teks: 13, atas: WARNA.aksen },
    daun: { w: 112, foto: 48, teks: 11, atas: WARNA.aksen },
  }[jenis]
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 mx-auto flex flex-col items-center text-center"
      style={{
        width: cfg.w,
        padding: '10px 8px',
        borderTop: `4px solid ${cfg.atas}`,
        breakInside: 'avoid',
      }}
    >
      <Foto nama={orang.nama_lengkap} path={orang.foto_profil_path} ukuran={cfg.foto} cincin={jenis === 'puncak' ? WARNA.emas : WARNA.garis} />
      <p className="mt-1.5 font-semibold text-slate-900 leading-tight" style={{ fontSize: cfg.teks }}>
        {orang.nama_lengkap || 'Tanpa nama'}
      </p>
      <p className="text-slate-500 mt-0.5 leading-tight" style={{ fontSize: Math.max(cfg.teks - 2, 10) }}>
        {label}
      </p>
    </div>
  )
}

function Simpul({ id, anak, orangById, labelById, tingkat }) {
  const o = orangById[id]
  const kids = anak[id] || []
  const semuaDaun = kids.length > 0 && kids.every((k) => !(anak[k] && anak[k].length))
  const kelompok = semuaDaun && kids.length > 5
  const jenis = tingkat === 0 ? 'puncak' : kids.length ? 'tengah' : 'daun'
  return (
    <li>
      <Kartu orang={o} label={labelById[id]} jenis={jenis} />
      {kids.length > 0 &&
        (kelompok ? (
          <div className="bagan-grup">
            <div
              className="bagan-grup-isi"
              style={{ gridTemplateColumns: `repeat(${Math.min(kids.length, 6)}, 112px)` }}
            >
              {kids.map((k) => (
                <Kartu key={k} orang={orangById[k]} label={labelById[k]} jenis="daun" />
              ))}
            </div>
          </div>
        ) : (
          <ul>
            {kids.map((k) => (
              <Simpul key={k} id={k} anak={anak} orangById={orangById} labelById={labelById} tingkat={tingkat + 1} />
            ))}
          </ul>
        ))}
    </li>
  )
}

export default function BaganStrukturOrganisasi() {
  const { profil, isAdmin } = useAuth()
  const sekolahId = profil?.sekolah_id
  const bolehEdit = !!isAdmin

  const [sekolah, setSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [orang, setOrang] = useState([])
  const [baris, setBaris] = useState([])
  const [edit, setEdit] = useState({})
  const [tab, setTab] = useState('bagan')
  const [zoom, setZoom] = useState(100)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [galat, setGalat] = useState('')
  const [pesan, setPesan] = useState(null)

  async function muat() {
    setLoading(true)
    setGalat('')
    const [pr, st, ps] = await Promise.all([
      supabase.rpc('bagan_orang_sekolah'),
      supabase.from('struktur_organisasi').select('*').eq('sekolah_id', sekolahId),
      supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
    ])
    if (ps.data) {
      setSekolah({ nama: ps.data.nama_sekolah, alamat: ps.data.alamat })
      if (ps.data.logo_path) {
        const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(ps.data.logo_path)
        setLogoUrl(pub.publicUrl)
      }
    }
    if (pr.error || st.error) {
      setGalat(
        `Data bagan tidak bisa dimuat: ${(pr.error || st.error).message}. Pastikan struktur_organisasi.sql sudah dijalankan.`
      )
      setOrang([])
      setBaris([])
    } else {
      const layak = (pr.data || []).filter((o) => o.role !== 'orang_tua' && o.role !== 'superadmin')
      setOrang(layak)
      setBaris(st.data || [])
      const peta = new Map((st.data || []).map((b) => [b.profil_id, b]))
      const awal = {}
      layak.forEach((o) => {
        const b = peta.get(o.id)
        awal[o.id] = {
          atasan: b?.puncak ? 'puncak' : b?.atasan_profil_id || 'otomatis',
          jabatan: b?.jabatan_struktural || '',
          urutan: b?.urutan ?? '',
          tampil: b ? b.tampil !== false : true,
        }
      })
      setEdit(awal)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!sekolahId) return
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  useEffect(() => {
    if (!bolehEdit) setTab('bagan')
  }, [bolehEdit])

  // ---- Susun pohon dari data tersimpan ----
  const pohon = useMemo(() => {
    const petaBaris = new Map(baris.map((b) => [b.profil_id, b]))
    const tampil = orang.filter((o) => petaBaris.get(o.id)?.tampil !== false)
    const ids = new Set(tampil.map((o) => o.id))
    const kepala = tampil.find((o) => o.jabatan === 'kepala_sekolah')

    const induk = {}
    tampil.forEach((o) => {
      const b = petaBaris.get(o.id)
      if (b?.puncak) induk[o.id] = null
      else if (b?.atasan_profil_id && ids.has(b.atasan_profil_id) && b.atasan_profil_id !== o.id)
        induk[o.id] = b.atasan_profil_id
      else if (o.jabatan === 'kepala_sekolah') induk[o.id] = null
      else induk[o.id] = kepala ? kepala.id : null
    })
    // putus siklus (A di bawah B, B di bawah A): jadikan puncak
    tampil.forEach((o) => {
      const lihat = new Set([o.id])
      let cur = induk[o.id]
      while (cur) {
        if (lihat.has(cur)) {
          induk[o.id] = null
          break
        }
        lihat.add(cur)
        cur = induk[cur]
      }
    })

    const kunci = (o) => {
      const b = petaBaris.get(o.id)
      return b?.urutan ?? 1000
    }
    const urut = (a, b) => {
      const d = kunci(a) - kunci(b)
      if (d) return d
      const ga = a.jabatan === 'guru' || a.role === 'guru' ? 1 : 0
      const gb = b.jabatan === 'guru' || b.role === 'guru' ? 1 : 0
      if (ga !== gb) return ga - gb
      return (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '', 'id')
    }

    const anak = {}
    const akar = []
    const diurut = [...tampil].sort(urut)
    diurut.forEach((o) => {
      const p = induk[o.id]
      if (p) (anak[p] = anak[p] || []).push(o.id)
      else akar.push(o.id)
    })
    const orangById = Object.fromEntries(tampil.map((o) => [o.id, o]))
    const labelById = Object.fromEntries(tampil.map((o) => [o.id, labelOrang(o, petaBaris.get(o.id))]))
    return { akar, anak, orangById, labelById }
  }, [orang, baris])

  // ---- Edit (admin) ----
  const ubah = (id, k, v) => setEdit((e) => ({ ...e, [id]: { ...e[id], [k]: v } }))

  // orang yang berada di bawah `id` menurut isian saat ini (supaya tidak jadi lingkaran)
  function turunan(id) {
    const hasil = new Set()
    let tambah = true
    while (tambah) {
      tambah = false
      Object.entries(edit).forEach(([pid, e]) => {
        if (!hasil.has(pid) && (e.atasan === id || hasil.has(e.atasan))) {
          hasil.add(pid)
          tambah = true
        }
      })
    }
    return hasil
  }

  async function simpan() {
    setSaving(true)
    setPesan(null)
    const muatan = orang.map((o) => {
      const e = edit[o.id]
      return {
        sekolah_id: sekolahId,
        profil_id: o.id,
        atasan_profil_id: e.atasan !== 'otomatis' && e.atasan !== 'puncak' ? e.atasan : null,
        puncak: e.atasan === 'puncak',
        jabatan_struktural: e.jabatan.trim() || null,
        urutan: e.urutan === '' ? null : Number(e.urutan),
        tampil: e.tampil,
        updated_at: new Date().toISOString(),
      }
    })
    const { error } = await supabase
      .from('struktur_organisasi')
      .upsert(muatan, { onConflict: 'sekolah_id,profil_id' })
    setSaving(false)
    if (error) {
      setPesan({ ok: false, teks: `Gagal menyimpan: ${error.message}` })
      return
    }
    setPesan({ ok: true, teks: 'Tersimpan.' })
    await muat()
  }

  async function kembalikan() {
    if (!window.confirm('Kembalikan bagan ke susunan otomatis? Semua pengaturan atasan dan jabatan akan dihapus.')) return
    setSaving(true)
    const { error } = await supabase.from('struktur_organisasi').delete().eq('sekolah_id', sekolahId)
    setSaving(false)
    setPesan(error ? { ok: false, teks: `Gagal: ${error.message}` } : { ok: true, teks: 'Dikembalikan ke susunan otomatis.' })
    if (!error) await muat()
  }

  const adaData = pohon.akar.length > 0

  return (
    <Layout title="Bagan Struktur Organisasi" subtitle="Susunan jabatan dan personel sekolah.">
      <style>{`
        .bagan ul { display:flex; justify-content:center; padding-top:20px; position:relative; margin:0; }
        .bagan li { list-style:none; text-align:center; position:relative; padding:20px 6px 0; }
        .bagan li::before, .bagan li::after {
          content:''; position:absolute; top:0; right:50%; width:50%; height:20px;
          border-top:2px solid ${WARNA.garis};
        }
        .bagan li::after { right:auto; left:50%; border-left:2px solid ${WARNA.garis}; }
        .bagan li:only-child::before, .bagan li:only-child::after { display:none; }
        .bagan li:only-child { padding-top:0; }
        .bagan li:first-child::before, .bagan li:last-child::after { border:0 none; }
        .bagan li:last-child::before { border-right:2px solid ${WARNA.garis}; border-radius:0 6px 0 0; }
        .bagan li:first-child::after { border-radius:6px 0 0 0; }
        .bagan ul ul::before {
          content:''; position:absolute; top:0; left:50%; height:20px;
          border-left:2px solid ${WARNA.garis};
        }
        .bagan > ul { padding-top:0; }
        .bagan > ul > li { padding-top:0; }
        .bagan > ul > li::before, .bagan > ul > li::after { display:none; }
        .bagan-grup { position:relative; padding-top:20px; display:flex; justify-content:center; }
        .bagan-grup::before {
          content:''; position:absolute; top:0; left:50%; height:20px;
          border-left:2px solid ${WARNA.garis};
        }
        .bagan-grup-isi {
          display:grid; gap:8px; padding:8px; background:#f8fafc;
          border:1px solid #e2e8f0; border-radius:12px;
        }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body * { visibility: hidden; }
          #area-bagan, #area-bagan * { visibility: visible; }
          #area-bagan {
            position: absolute; left: 0; top: 0; width: 100%;
            border: 0 !important; border-radius: 0 !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          .bagan-gulir { overflow: visible !important; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} /> Dasbor
          </Link>
          {tab === 'bagan' && (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(40, z - 10))}
                  className="p-1.5 rounded-md hover:bg-white"
                  aria-label="Perkecil bagan"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-medium text-slate-700 w-10 text-center">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(120, z + 10))}
                  className="p-1.5 rounded-md hover:bg-white"
                  aria-label="Perbesar bagan"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
              <button
                onClick={() => window.print()}
                disabled={!adaData}
                className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Printer size={16} /> Cetak
              </button>
            </div>
          )}
        </div>

        {bolehEdit && (
          <div className="flex gap-2 mb-4 print:hidden">
            {[
              ['bagan', 'Bagan'],
              ['atur', 'Atur Struktur'],
            ].map(([k, tt]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  tab === k ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tt}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 py-10">
            <Loader2 className="animate-spin" size={18} /> Memuat data…
          </div>
        )}

        {!loading && galat && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{galat}</p>
        )}

        {!loading && !galat && !adaData && tab === 'bagan' && (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-6 text-center">
            Belum ada akun aktif yang bisa ditampilkan dalam bagan.
          </p>
        )}

        {/* ===== BAGAN ===== */}
        {!loading && !galat && adaData && tab === 'bagan' && (
          <div id="area-bagan" className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
            <div className="text-center mb-5">
              {logoUrl && (
                <img src={logoUrl} alt="Logo sekolah" style={{ height: 60, width: 'auto', margin: '0 auto 6px', objectFit: 'contain' }} />
              )}
              <p className="text-xs font-semibold text-slate-500">Bagan Struktur Organisasi</p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-blue-900">{sekolah?.nama || 'Nama Sekolah'}</h2>
              {sekolah?.alamat && <p className="text-xs text-slate-500">{sekolah.alamat}</p>}
            </div>

            <div className="bagan-gulir overflow-x-auto pb-2">
              <div className="bagan" style={{ zoom: zoom / 100, width: 'max-content', minWidth: '100%' }}>
                <ul>
                  {pohon.akar.map((id) => (
                    <Simpul key={id} id={id} anak={pohon.anak} orangById={pohon.orangById} labelById={pohon.labelById} tingkat={0} />
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ===== ATUR STRUKTUR (admin) ===== */}
        {!loading && !galat && bolehEdit && tab === 'atur' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
            <p className="text-xs text-slate-500">
              Pilih atasan langsung untuk setiap orang. "Otomatis" berarti langsung di bawah Kepala Sekolah. Isi jabatan hanya
              bila perlu (mis. Wakil Kepala Sekolah, Kaur Kurikulum, Wali Kelas 1, Bendahara BOS). Angka urutan kecil tampil lebih
              dulu.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-600 border-b border-slate-200">
                    <th className="py-2 pr-3 font-semibold">Nama</th>
                    <th className="py-2 pr-3 font-semibold">Atasan</th>
                    <th className="py-2 pr-3 font-semibold">Jabatan di bagan</th>
                    <th className="py-2 pr-3 font-semibold w-20">Urutan</th>
                    <th className="py-2 font-semibold w-20">Tampil</th>
                  </tr>
                </thead>
                <tbody>
                  {[...orang]
                    .sort((a, b) => (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '', 'id'))
                    .map((o) => {
                      const e = edit[o.id]
                      if (!e) return null
                      const dilarang = turunan(o.id)
                      return (
                        <tr key={o.id} className="border-b border-slate-100 align-middle">
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-2 min-w-[180px]">
                              <Foto nama={o.nama_lengkap} path={o.foto_profil_path} ukuran={32} cincin={WARNA.garis} />
                              <div>
                                <p className="font-medium text-slate-900 leading-tight">{o.nama_lengkap || 'Tanpa nama'}</p>
                                <p className="text-xs text-slate-500">{rapikanJabatan(o.jabatan)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 pr-3">
                            <select
                              value={e.atasan}
                              onChange={(ev) => ubah(o.id, 'atasan', ev.target.value)}
                              className="border rounded-lg px-2 py-1.5 text-sm max-w-[220px] w-full"
                            >
                              <option value="otomatis">Otomatis</option>
                              <option value="puncak">Paling atas (puncak)</option>
                              {orang
                                .filter((x) => x.id !== o.id && !dilarang.has(x.id))
                                .sort((a, b) => (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '', 'id'))
                                .map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.nama_lengkap || 'Tanpa nama'}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              value={e.jabatan}
                              onChange={(ev) => ubah(o.id, 'jabatan', ev.target.value)}
                              placeholder={labelOrang(o, null)}
                              className="border rounded-lg px-2 py-1.5 text-sm w-full min-w-[160px]"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              value={e.urutan}
                              onChange={(ev) => ubah(o.id, 'urutan', ev.target.value)}
                              className="border rounded-lg px-2 py-1.5 text-sm w-16"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="checkbox"
                              checked={e.tampil}
                              onChange={(ev) => ubah(o.id, 'tampil', ev.target.checked)}
                              className="w-4 h-4"
                              aria-label={`Tampilkan ${o.nama_lengkap || 'orang ini'} di bagan`}
                            />
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={simpan}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan
              </button>
              <button
                onClick={kembalikan}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                <RotateCcw size={16} /> Kembalikan ke otomatis
              </button>
              {pesan && <span className={`text-sm ${pesan.ok ? 'text-green-700' : 'text-red-600'}`}>{pesan.teks}</span>}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
