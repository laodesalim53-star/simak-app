import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2, Save, RotateCcw, ZoomIn, ZoomOut, Plus, Trash2, Palette } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

/*
  Bagan Struktur Organisasi
  - Semua pengguna sekolah: lihat & cetak.
  - Admin / kepala sekolah: tab "Atur Struktur" untuk menentukan atasan, jabatan
    (Kaur Kurikulum, Wali Kelas, dst), urutan, menyembunyikan seseorang, dan
    mengisi kolom KOMITE SEKOLAH. Pilihan TEMA warna juga hanya bisa diubah admin
    (tersimpan per sekolah, berlaku untuk semua pengguna).
  - Tampilan HP (< 640px): bagan otomatis diperkecil, Komite pindah ke bawah bagan,
    tabel pengaturan menjadi kartu per orang.

  Butuh: bagan_struktur_v2.sql (sudah ada) + bagan_komite_tema.sql (baru).
*/

// ---------- TEMA ----------
const TEMA = {
  biru: { nama: 'Biru Klasik', aksen: '#1e3a8a', emas: '#c9a227', garis: '#94a3b8', latar: '#f8fafc', tepi: '#e2e8f0' },
  hijau: { nama: 'Hijau Zamrud', aksen: '#065f46', emas: '#c9a227', garis: '#6ee7b7', latar: '#f0fdf4', tepi: '#bbf7d0' },
  marun: { nama: 'Merah Marun', aksen: '#7f1d1d', emas: '#d4a017', garis: '#d9a5a5', latar: '#fef2f2', tepi: '#fecaca' },
  ungu: { nama: 'Ungu Royal', aksen: '#4c1d95', emas: '#d4a017', garis: '#c4b5fd', latar: '#faf5ff', tepi: '#e9d5ff' },
  teal: { nama: 'Teal Segar', aksen: '#0f766e', emas: '#f59e0b', garis: '#5eead4', latar: '#f0fdfa', tepi: '#99f6e4' },
  hitam: { nama: 'Hitam Elegan', aksen: '#1f2937', emas: '#c9a227', garis: '#9ca3af', latar: '#f9fafb', tepi: '#e5e7eb' },
}
const TEMA_BAWAAN = 'biru'

function varsTema(t) {
  return {
    '--b-aksen': t.aksen,
    '--b-emas': t.emas,
    '--b-garis': t.garis,
    '--b-latar': t.latar,
    '--b-tepi': t.tepi,
  }
}

// Saran isian "Jabatan di bagan" (tetap boleh mengetik bebas)
const SARAN_JABATAN = [
  'Wakil Kepala Sekolah',
  'Kaur Kurikulum',
  'Kaur Kesiswaan',
  'Kaur Sarana Prasarana',
  'Kaur Humas',
  'Kaur Tata Usaha',
  'Wali Kelas I',
  'Wali Kelas II',
  'Wali Kelas III',
  'Wali Kelas IV',
  'Wali Kelas V',
  'Wali Kelas VI',
  'Guru PAI',
  'Guru PJOK',
  'Bendahara BOS/BOP',
  'Operator Sekolah',
  'Pustakawan',
  'Penjaga Sekolah',
]

const SARAN_KOMITE = ['Ketua Komite', 'Wakil Ketua Komite', 'Sekretaris Komite', 'Bendahara Komite', 'Anggota Komite']

// Deteksi layar HP
const BATAS_HP = 640
function useMobile(batas = BATAS_HP) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < batas)
  useEffect(() => {
    const f = () => setM(window.innerWidth < batas)
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [batas])
  return m
}

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
  if (o.jabatan === 'guru' || o.role === 'guru') return o.tugas_tambahan?.trim() || 'Guru'
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
        background: 'var(--b-aksen)',
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
    puncak: { w: 190, foto: 80, teks: 14, atas: 'var(--b-emas)' },
    tengah: { w: 150, foto: 60, teks: 13, atas: 'var(--b-aksen)' },
    daun: { w: 112, foto: 48, teks: 11, atas: 'var(--b-aksen)' },
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
      <Foto
        nama={orang.nama_lengkap}
        path={orang.foto_profil_path}
        ukuran={cfg.foto}
        cincin={jenis === 'puncak' ? 'var(--b-emas)' : 'var(--b-garis)'}
      />
      <p className="mt-1.5 font-semibold text-slate-900 leading-tight" style={{ fontSize: cfg.teks }}>
        {orang.nama_lengkap || 'Tanpa nama'}
      </p>
      <p
        className="text-slate-500 mt-0.5 leading-tight"
        style={{ fontSize: Math.max(cfg.teks - 2, 10), whiteSpace: 'pre-line' }}
      >
        {label}
      </p>
    </div>
  )
}

// Lajur Komite: kolom di kanan puncak bagan + garis putus-putus dari kartu puncak.
// Diposisikan absolut di dalam <li> puncak (yang diberi padding kiri-kanan 176px
// supaya kartu puncak tetap di tengah dan kolom tidak menimpa kartu di bawahnya).
// Di HP lajur ini tidak dipakai; Komite ditampilkan di bawah bagan (lihat BlokKomiteHp).
const LEBAR_KOMITE = 160
function LajurKomite({ komite }) {
  return (
    <>
      {/* garis dari kartu puncak (lebar 190 -> tepi kanan = 50% + 95px) ke kolom komite */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 72,
          left: 'calc(50% + 95px)',
          right: LEBAR_KOMITE,
          borderTop: '2px dashed var(--b-aksen)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 68,
          left: 'calc(50% + 91px)',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--b-aksen)',
        }}
      />
      <div
        className="text-center"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: LEBAR_KOMITE,
          border: '2px dashed var(--b-aksen)',
          borderRadius: 14,
          padding: '10px 8px 12px',
          background: 'var(--b-latar)',
          breakInside: 'avoid',
        }}
      >
        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--b-aksen)' }}>
          Komite Sekolah
        </p>
        <div className="flex flex-col items-center">
          {komite.map((k, i) => (
            <div key={k.id} className="flex flex-col items-center">
              {i > 0 && <div style={{ height: 10, borderLeft: '2px dashed var(--b-garis)' }} />}
              <Kartu
                orang={{ nama_lengkap: k.nama, foto_profil_path: k.foto_path || null }}
                label={k.jabatan || 'Anggota Komite'}
                jenis="daun"
              />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// Komite versi HP: kotak di bawah bagan, kartu disusun membungkus
function BlokKomiteHp({ komite }) {
  return (
    <div
      className="mt-4 text-center print:hidden"
      style={{
        border: '2px dashed var(--b-aksen)',
        borderRadius: 14,
        padding: '10px 8px 12px',
        background: 'var(--b-latar)',
      }}
    >
      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--b-aksen)' }}>
        Komite Sekolah
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {komite.map((k) => (
          <Kartu
            key={k.id}
            orang={{ nama_lengkap: k.nama, foto_profil_path: k.foto_path || null }}
            label={k.jabatan || 'Anggota Komite'}
            jenis="daun"
          />
        ))}
      </div>
    </div>
  )
}

function Simpul({ id, anak, orangById, labelById, tingkat, komite }) {
  const o = orangById[id]
  const kids = anak[id] || []
  const semuaDaun = kids.length > 0 && kids.every((k) => !(anak[k] && anak[k].length))
  const kelompok = semuaDaun && kids.length > 5
  const jenis = tingkat === 0 ? 'puncak' : kids.length ? 'tengah' : 'daun'
  const adaKomite = tingkat === 0 && komite && komite.length > 0
  return (
    <li style={adaKomite ? { padding: `0 ${LEBAR_KOMITE + 16}px`, minWidth: 660 } : undefined}>
      <Kartu orang={o} label={labelById[id]} jenis={jenis} />
      {adaKomite && <LajurKomite komite={komite} />}
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

// ---- Wali kelas: dicocokkan dari tabel kelas ke orang di bagan ----
const normNama = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Hasil: { [orang.id]: ['IV', 'V'] } (nama kelas tanpa kata "Kelas")
function petaWaliKelas(kelas, orang, guruList = []) {
  const hasil = {}
  const guruById = new Map(guruList.map((g) => [String(g.id), g.nama_lengkap]))
  const idKe = new Map()
  orang.forEach((o) => {
    idKe.set(String(o.id), o.id)
    if (o.guru_id) idKe.set(String(o.guru_id), o.id)
  })
  const namaKe = orang.map((o) => [normNama(o.nama_lengkap), o.id])

  kelas.forEach((k) => {
    const wali = k.wali_kelas_id ?? k.wali_kelas ?? k.wali_kelas_guru_id ?? k.guru_id ?? null
    const namaKelas = (k.nama_kelas ?? k.nama ?? k.kelas ?? k.nama_rombel ?? '').toString().trim()
    if (!wali || !namaKelas) return

    let target = idKe.get(String(wali))
    if (!target) {
      // id di tabel kelas bisa berbeda dengan id di bagan: cocokkan lewat nama guru
      const n = normNama(guruById.get(String(wali)) ?? wali)
      if (n) {
        const cocok =
          namaKe.find(([nn]) => nn === n) ||
          (n.length > 5 ? namaKe.find(([nn]) => nn && (nn.includes(n) || n.includes(nn))) : null)
        target = cocok?.[1]
      }
    }
    if (!target) return
    const tampilNama = namaKelas.replace(/^kelas\s*/i, '') || namaKelas
    ;(hasil[target] = hasil[target] || []).push(tampilNama)
  })
  Object.values(hasil).forEach((l) => l.sort((a, b) => a.localeCompare(b, 'id', { numeric: true })))
  return hasil
}

// Gabungkan jabatan struktural + wali kelas menjadi teks label kartu (maks 2 baris)
function gabungLabel(utama, waliList) {
  if (!waliList || waliList.length === 0) return utama
  const wali = `Wali Kelas ${waliList.join(' & ')}`
  if (!utama || utama === 'Guru') return wali
  if (normNama(utama).includes('wali kelas')) return utama
  return `${utama}\n${wali}`
}

function urutKomite(a, b) {
  const d = (a.urutan ?? 1000) - (b.urutan ?? 1000)
  if (d) return d
  return (a.nama || '').localeCompare(b.nama || '', 'id')
}

export default function BaganStrukturOrganisasi() {
  const { profil, isAdmin, isKepalaSekolah, sekolahId: sekolahIdAuth } = useAuth()
  const sekolahId = sekolahIdAuth ?? profil?.sekolah_id
  const bolehEdit = !!(isAdmin || isKepalaSekolah)
  const isMobile = useMobile()

  const [sekolah, setSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [orang, setOrang] = useState([])
  const [baris, setBaris] = useState([])
  const [edit, setEdit] = useState({})
  const [kelas, setKelas] = useState([])
  const [guruList, setGuruList] = useState([])
  const [komite, setKomite] = useState([])
  const [komiteEdit, setKomiteEdit] = useState([])
  const [komiteGalat, setKomiteGalat] = useState('')
  const [tema, setTema] = useState(TEMA_BAWAAN)
  const [tab, setTab] = useState('bagan')
  const [zoom, setZoom] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < BATAS_HP ? 50 : 100
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [galat, setGalat] = useState('')
  const [pesan, setPesan] = useState(null)
  const [bukaTema, setBukaTema] = useState(false)

  const temaAktif = TEMA[tema] || TEMA[TEMA_BAWAAN]
  const kunciTema = `bagan_tema_${sekolahId}`

  // Zoom awal menyesuaikan perangkat (HP 50%, lainnya 100%)
  useEffect(() => {
    setZoom(isMobile ? 50 : 100)
  }, [isMobile])

  async function muat() {
    setLoading(true)
    setGalat('')
    const [pr, st, ps, km, pg, kl, gr] = await Promise.all([
      supabase.rpc('bagan_orang_sekolah'),
      supabase.from('bagan_struktur').select('*').eq('sekolah_id', sekolahId),
      supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
      supabase.from('bagan_komite').select('*').eq('sekolah_id', sekolahId),
      supabase.from('bagan_pengaturan').select('tema').eq('sekolah_id', sekolahId).maybeSingle(),
      supabase.from('kelas').select('id, nama_kelas, tingkat, wali_kelas_id').eq('sekolah_id', sekolahId),
      supabase.from('guru').select('id, nama_lengkap').eq('sekolah_id', sekolahId),
    ])
    setGuruList(gr.error ? [] : gr.data || [])
    // Wali kelas: kalau tabel kelas tidak terbaca, bagan tetap tampil tanpa info wali kelas
    setKelas(kl.error ? [] : kl.data || [])
    if (ps.data) {
      setSekolah({ nama: ps.data.nama_sekolah, alamat: ps.data.alamat })
      if (ps.data.logo_path) {
        const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(ps.data.logo_path)
        setLogoUrl(pub.publicUrl)
      }
    }

    // Tema: dari database; kalau belum ada, pakai cadangan di perangkat
    let temaDipakai = pg.data?.tema
    if (!temaDipakai) {
      try {
        temaDipakai = localStorage.getItem(kunciTema)
      } catch (_) {
        temaDipakai = null
      }
    }
    setTema(TEMA[temaDipakai] ? temaDipakai : TEMA_BAWAAN)

    // Komite
    if (km.error) {
      setKomiteGalat(`Kolom komite belum bisa dipakai: ${km.error.message}. Jalankan bagan_komite_tema.sql.`)
      setKomite([])
      setKomiteEdit([])
    } else {
      setKomiteGalat('')
      const urut = [...(km.data || [])].sort(urutKomite)
      setKomite(urut)
      setKomiteEdit(
        urut.map((k) => ({
          key: k.id,
          id: k.id,
          nama: k.nama || '',
          jabatan: k.jabatan || '',
          urutan: k.urutan ?? '',
        }))
      )
    }

    if (pr.error || st.error) {
      setGalat(
        `Data bagan tidak bisa dimuat: ${(pr.error || st.error).message}. Pastikan bagan_struktur_v2.sql sudah dijalankan.`
      )
      setOrang([])
      setBaris([])
    } else {
      const layak = (pr.data || []).filter((o) => o.role !== 'orang_tua' && o.role !== 'superadmin')
      setOrang(layak)
      setBaris(st.data || [])
      const peta = new Map((st.data || []).map((b) => [b.orang_id, b]))
      const awal = {}
      layak.forEach((o) => {
        const b = peta.get(o.id)
        awal[o.id] = {
          atasan: b?.puncak ? 'puncak' : b?.atasan_orang_id || 'otomatis',
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

  const waliById = useMemo(() => petaWaliKelas(kelas, orang, guruList), [kelas, orang, guruList])

  // ---- Susun pohon dari data tersimpan ----
  const pohon = useMemo(() => {
    const petaBaris = new Map(baris.map((b) => [b.orang_id, b]))
    const tampil = orang.filter((o) => petaBaris.get(o.id)?.tampil !== false)
    const ids = new Set(tampil.map((o) => o.id))
    const kepala = tampil.find((o) => o.jabatan === 'kepala_sekolah')

    const induk = {}
    tampil.forEach((o) => {
      const b = petaBaris.get(o.id)
      if (b?.puncak) induk[o.id] = null
      else if (b?.atasan_orang_id && ids.has(b.atasan_orang_id) && b.atasan_orang_id !== o.id)
        induk[o.id] = b.atasan_orang_id
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
    const labelById = Object.fromEntries(
      tampil.map((o) => [o.id, gabungLabel(labelOrang(o, petaBaris.get(o.id)), waliById[o.id])])
    )
    return { akar, anak, orangById, labelById }
  }, [orang, baris, waliById])

  // ---- Edit (admin) ----
  const ubah = (id, k, v) => setEdit((e) => ({ ...e, [id]: { ...e[id], [k]: v } }))

  const ubahKomite = (key, k, v) =>
    setKomiteEdit((l) => l.map((x) => (x.key === key ? { ...x, [k]: v } : x)))
  const tambahKomite = () =>
    setKomiteEdit((l) => [
      ...l,
      {
        key: `baru_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        id: null,
        nama: '',
        jabatan: l.length === 0 ? 'Ketua Komite' : 'Anggota Komite',
        urutan: l.length + 1,
      },
    ])
  const hapusKomite = (key) => setKomiteEdit((l) => l.filter((x) => x.key !== key))

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

  async function pilihTema(k) {
    setTema(k)
    try {
      localStorage.setItem(kunciTema, k)
    } catch (_) {
      /* abaikan */
    }
    if (!bolehEdit) return
    const { error } = await supabase
      .from('bagan_pengaturan')
      .upsert({ sekolah_id: sekolahId, tema: k, updated_at: new Date().toISOString() }, { onConflict: 'sekolah_id' })
    if (error) {
      setPesan({
        ok: false,
        teks: `Tema hanya tersimpan di perangkat ini (${error.message}). Jalankan bagan_komite_tema.sql agar berlaku untuk semua pengguna.`,
      })
    } else {
      setPesan(null)
    }
  }

  async function simpanKomite() {
    if (komiteGalat) return null
    const valid = komiteEdit.filter((k) => k.nama.trim())
    const idLama = komite.map((k) => k.id)
    const idDipakai = new Set(valid.filter((k) => k.id).map((k) => k.id))
    const hapus = idLama.filter((id) => !idDipakai.has(id))

    const bentuk = (k) => ({
      sekolah_id: sekolahId,
      nama: k.nama.trim(),
      jabatan: k.jabatan.trim() || 'Anggota Komite',
      urutan: k.urutan === '' ? null : Number(k.urutan),
    })

    if (hapus.length) {
      const { error } = await supabase.from('bagan_komite').delete().in('id', hapus)
      if (error) return error
    }
    const ubahan = valid.filter((k) => k.id).map((k) => ({ id: k.id, ...bentuk(k) }))
    if (ubahan.length) {
      const { error } = await supabase.from('bagan_komite').upsert(ubahan, { onConflict: 'id' })
      if (error) return error
    }
    const baru = valid.filter((k) => !k.id).map(bentuk)
    if (baru.length) {
      const { error } = await supabase.from('bagan_komite').insert(baru)
      if (error) return error
    }
    return null
  }

  async function simpan() {
    setSaving(true)
    setPesan(null)
    const muatan = orang.map((o) => {
      const e = edit[o.id]
      return {
        sekolah_id: sekolahId,
        orang_id: o.id,
        atasan_orang_id: e.atasan !== 'otomatis' && e.atasan !== 'puncak' ? e.atasan : null,
        puncak: e.atasan === 'puncak',
        jabatan_struktural: e.jabatan.trim() || null,
        urutan: e.urutan === '' ? null : Number(e.urutan),
        tampil: e.tampil,
        updated_at: new Date().toISOString(),
      }
    })
    const { error } = await supabase
      .from('bagan_struktur')
      .upsert(muatan, { onConflict: 'sekolah_id,orang_id' })
    if (error) {
      setSaving(false)
      setPesan({ ok: false, teks: `Gagal menyimpan: ${error.message}` })
      return
    }
    const errKomite = await simpanKomite()
    setSaving(false)
    if (errKomite) {
      setPesan({ ok: false, teks: `Struktur tersimpan, tetapi komite gagal: ${errKomite.message}` })
      await muat()
      return
    }
    setPesan({ ok: true, teks: 'Tersimpan.' })
    await muat()
  }

  async function kembalikan() {
    if (!window.confirm('Kembalikan bagan ke susunan otomatis? Semua pengaturan atasan dan jabatan akan dihapus (data komite tidak ikut terhapus).')) return
    setSaving(true)
    const { error } = await supabase.from('bagan_struktur').delete().eq('sekolah_id', sekolahId)
    setSaving(false)
    setPesan(error ? { ok: false, teks: `Gagal: ${error.message}` } : { ok: true, teks: 'Dikembalikan ke susunan otomatis.' })
    if (!error) await muat()
  }

  const adaData = pohon.akar.length > 0
  const tombolAktif = { background: 'var(--b-aksen)', color: '#fff' }
  const urutanOrang = [...orang].sort((a, b) =>
    (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '', 'id')
  )
  const kolomStruktur = 'md:grid-cols-[minmax(180px,1.2fr)_1fr_1fr_80px_60px]'

  return (
    <Layout title="Bagan Struktur Organisasi" subtitle="Susunan jabatan dan personel sekolah.">
      <style>{`
        .bagan ul { display:flex; justify-content:center; padding-top:20px; position:relative; margin:0; }
        .bagan li { list-style:none; text-align:center; position:relative; padding:20px 6px 0; }
        .bagan li::before, .bagan li::after {
          content:''; position:absolute; top:0; right:50%; width:50%; height:20px;
          border-top:2px solid var(--b-garis);
        }
        .bagan li::after { right:auto; left:50%; border-left:2px solid var(--b-garis); }
        .bagan li:only-child::before, .bagan li:only-child::after { display:none; }
        .bagan li:only-child { padding-top:0; }
        .bagan li:first-child::before, .bagan li:last-child::after { border:0 none; }
        .bagan li:last-child::before { border-right:2px solid var(--b-garis); border-radius:0 6px 0 0; }
        .bagan li:first-child::after { border-radius:6px 0 0 0; }
        .bagan ul ul::before {
          content:''; position:absolute; top:0; left:50%; height:20px;
          border-left:2px solid var(--b-garis);
        }
        .bagan > ul { padding-top:0; }
        .bagan > ul > li { padding-top:0; }
        .bagan > ul > li::before, .bagan > ul > li::after { display:none; }
        .bagan-grup { position:relative; padding-top:20px; display:flex; justify-content:center; }
        .bagan-grup::before {
          content:''; position:absolute; top:0; left:50%; height:20px;
          border-left:2px solid var(--b-garis);
        }
        .bagan-grup-isi {
          display:grid; gap:8px; padding:8px; background:var(--b-latar);
          border:1px solid var(--b-tepi); border-radius:12px;
        }
        .bagan-gulir { -webkit-overflow-scrolling: touch; touch-action: pan-x pan-y; }
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

      <div className="max-w-6xl mx-auto p-2 sm:p-4" style={varsTema(temaAktif)}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 py-2">
            <ArrowLeft size={16} /> Dasbor
          </Link>
          {tab === 'bagan' && (
            <div className="flex flex-wrap items-center gap-2">
              {bolehEdit && (
                <button
                  type="button"
                  onClick={() => setBukaTema((v) => !v)}
                  className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-lg text-sm font-medium"
                  aria-label="Pilih tema warna"
                >
                  <Palette size={16} /> <span className="hidden sm:inline">Tema</span>
                </button>
              )}
              <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(30, z - 10))}
                  className="p-2.5 sm:p-1.5 rounded-md hover:bg-white"
                  aria-label="Perkecil bagan"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-medium text-slate-700 w-10 text-center">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(120, z + 10))}
                  className="p-2.5 sm:p-1.5 rounded-md hover:bg-white"
                  aria-label="Perbesar bagan"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
              <button
                onClick={() => window.print()}
                disabled={!adaData}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                style={tombolAktif}
                aria-label="Cetak bagan"
              >
                <Printer size={16} /> <span className="hidden sm:inline">Cetak</span>
              </button>
            </div>
          )}
        </div>

        {/* Pemilih tema (admin) */}
        {bolehEdit && tab === 'bagan' && bukaTema && (
          <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 mb-4 print:hidden">
            <p className="text-xs text-slate-500 mb-3">Pilih tema warna bagan. Tema tersimpan untuk sekolah ini dan dipakai juga saat dicetak.</p>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              {Object.entries(TEMA).map(([k, t]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => pilihTema(k)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left"
                  style={{
                    borderColor: tema === k ? t.aksen : '#e2e8f0',
                    borderWidth: tema === k ? 2 : 1,
                    background: tema === k ? t.latar : '#fff',
                  }}
                >
                  <span className="inline-flex shrink-0">
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: t.aksen }} />
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: t.emas, marginLeft: -5 }} />
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: t.garis, marginLeft: -5 }} />
                  </span>
                  <span className="font-medium text-slate-800 leading-tight">{t.nama}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {bolehEdit && (
          <div className="flex gap-2 mb-4 print:hidden">
            {[
              ['bagan', 'Bagan'],
              ['atur', 'Atur Struktur'],
            ].map(([k, tt]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium ${
                  tab === k ? '' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                style={tab === k ? tombolAktif : undefined}
              >
                {tt}
              </button>
            ))}
          </div>
        )}

        {pesan && tab === 'bagan' && (
          <p className={`text-sm mb-3 print:hidden ${pesan.ok ? 'text-green-700' : 'text-red-600'}`}>{pesan.teks}</p>
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
          <div id="area-bagan" className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-6">
            <div className="text-center mb-5">
              {logoUrl && (
                <img src={logoUrl} alt="Logo sekolah" style={{ height: 60, width: 'auto', margin: '0 auto 6px', objectFit: 'contain' }} />
              )}
              <p className="text-xs font-semibold text-slate-500">Bagan Struktur Organisasi</p>
              <h2 className="text-lg sm:text-2xl font-extrabold" style={{ color: 'var(--b-aksen)' }}>
                {sekolah?.nama || 'Nama Sekolah'}
              </h2>
              {sekolah?.alamat && <p className="text-xs text-slate-500">{sekolah.alamat}</p>}
              <div
                style={{ height: 3, width: 90, margin: '8px auto 0', borderRadius: 2, background: 'var(--b-emas)' }}
              />
            </div>

            <div className="bagan-gulir overflow-x-auto pb-2">
              <div
                className="flex items-start justify-center gap-8"
                style={{ zoom: zoom / 100, width: 'max-content', minWidth: '100%' }}
              >
                <div className="bagan">
                  <ul>
                    {pohon.akar.map((id, i) => (
                      <Simpul
                        key={id}
                        id={id}
                        anak={pohon.anak}
                        orangById={pohon.orangById}
                        labelById={pohon.labelById}
                        tingkat={0}
                        komite={i === 0 && !isMobile ? komite : null}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Komite versi HP: di bawah bagan */}
            {isMobile && komite.length > 0 && <BlokKomiteHp komite={komite} />}
          </div>
        )}

        {/* ===== ATUR STRUKTUR (admin) ===== */}
        {!loading && !galat && bolehEdit && tab === 'atur' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-6">
            <datalist id="saran-jabatan">
              {SARAN_JABATAN.map((j) => (
                <option key={j} value={j} />
              ))}
            </datalist>
            <datalist id="saran-komite">
              {SARAN_KOMITE.map((j) => (
                <option key={j} value={j} />
              ))}
            </datalist>

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">1. Struktur sekolah</h3>
              <p className="text-xs text-slate-500">
                Pilih atasan langsung untuk setiap orang. "Otomatis" berarti langsung di bawah Kepala Sekolah. Isi jabatan untuk
                tugas tambahan (klik kolom untuk melihat saran: Wakil Kepala Sekolah, Kaur Kurikulum, Wali Kelas, Bendahara BOS,
                dst — boleh juga ketik sendiri). Contoh susunan: Kaur Kurikulum → atasannya Kepala Sekolah; Wali Kelas → atasannya
                Kaur Kurikulum. Angka urutan kecil tampil lebih dulu.
              </p>

              <div className="space-y-3">
                <div
                  className={`hidden md:grid ${kolomStruktur} gap-3 text-xs font-semibold text-slate-600 border-b border-slate-200 pb-2`}
                >
                  <span>Nama</span>
                  <span>Atasan</span>
                  <span>Jabatan di bagan</span>
                  <span>Urutan</span>
                  <span>Tampil</span>
                </div>

                {urutanOrang.map((o) => {
                  const e = edit[o.id]
                  if (!e) return null
                  const dilarang = turunan(o.id)
                  return (
                    <div
                      key={o.id}
                      className={`border border-slate-200 md:border-0 md:border-b md:border-slate-100 rounded-xl md:rounded-none p-3 md:p-0 md:py-2 grid grid-cols-2 ${kolomStruktur} gap-3 items-center`}
                    >
                      <div className="col-span-2 md:col-span-1 flex items-center gap-2">
                        <Foto nama={o.nama_lengkap} path={o.foto_profil_path} ukuran={36} cincin="var(--b-garis)" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 leading-tight">{o.nama_lengkap || 'Tanpa nama'}</p>
                          <p className="text-xs text-slate-500">{rapikanJabatan(o.jabatan)}</p>
                          {waliById[o.id] && (
                            <p className="text-xs font-medium" style={{ color: 'var(--b-aksen)' }}>
                              Wali Kelas {waliById[o.id].join(' & ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <label className="col-span-2 md:col-span-1 block">
                        <span className="md:hidden text-xs text-slate-500">Atasan</span>
                        <select
                          value={e.atasan}
                          onChange={(ev) => ubah(o.id, 'atasan', ev.target.value)}
                          className="border rounded-lg px-2 py-2 text-base sm:text-sm w-full"
                        >
                          <option value="otomatis">Otomatis</option>
                          <option value="puncak">Paling atas (puncak)</option>
                          {urutanOrang
                            .filter((x) => x.id !== o.id && !dilarang.has(x.id))
                            .map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.nama_lengkap || 'Tanpa nama'}
                              </option>
                            ))}
                        </select>
                      </label>

                      <label className="col-span-2 md:col-span-1 block">
                        <span className="md:hidden text-xs text-slate-500">Jabatan di bagan</span>
                        <input
                          list="saran-jabatan"
                          value={e.jabatan}
                          onChange={(ev) => ubah(o.id, 'jabatan', ev.target.value)}
                          placeholder={labelOrang(o, null)}
                          className="border rounded-lg px-2 py-2 text-base sm:text-sm w-full"
                        />
                      </label>

                      <label className="block">
                        <span className="md:hidden text-xs text-slate-500">Urutan</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={e.urutan}
                          onChange={(ev) => ubah(o.id, 'urutan', ev.target.value)}
                          className="border rounded-lg px-2 py-2 text-base sm:text-sm w-full md:w-16"
                        />
                      </label>

                      <label className="flex items-center gap-2 md:justify-start">
                        <input
                          type="checkbox"
                          checked={e.tampil}
                          onChange={(ev) => ubah(o.id, 'tampil', ev.target.checked)}
                          className="w-5 h-5"
                          aria-label={`Tampilkan ${o.nama_lengkap || 'orang ini'} di bagan`}
                        />
                        <span className="md:hidden text-sm text-slate-700">Tampil di bagan</span>
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ---- Komite Sekolah ---- */}
            <div className="space-y-3 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">2. Komite Sekolah</h3>
                {!komiteGalat && (
                  <button
                    type="button"
                    onClick={tambahKomite}
                    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 sm:py-1.5 rounded-lg text-sm font-medium"
                  >
                    <Plus size={15} /> Tambah anggota komite
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Komite sekolah bukan akun guru, jadi diisi manual di sini. Tampil sebagai kolom terpisah (bingkai putus-putus) di
                sebelah kanan bagan; di HP tampil di bawah bagan.
              </p>

              {komiteGalat && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{komiteGalat}</p>
              )}

              {!komiteGalat && komiteEdit.length === 0 && (
                <p className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-lg px-3 py-4 text-center">
                  Belum ada anggota komite. Klik "Tambah anggota komite".
                </p>
              )}

              {!komiteGalat && komiteEdit.length > 0 && (
                <div className="space-y-3">
                  {komiteEdit.map((k) => (
                    <div
                      key={k.key}
                      className="border border-slate-200 rounded-xl p-3 grid grid-cols-[1fr_80px_auto] sm:grid-cols-[1.4fr_1fr_80px_auto] gap-2 items-end"
                    >
                      <label className="col-span-3 sm:col-span-1 block">
                        <span className="text-xs text-slate-500">Nama</span>
                        <input
                          value={k.nama}
                          onChange={(ev) => ubahKomite(k.key, 'nama', ev.target.value)}
                          placeholder="Nama lengkap"
                          className="border rounded-lg px-2 py-2 text-base sm:text-sm w-full"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-500">Jabatan di komite</span>
                        <input
                          list="saran-komite"
                          value={k.jabatan}
                          onChange={(ev) => ubahKomite(k.key, 'jabatan', ev.target.value)}
                          placeholder="Ketua Komite"
                          className="border rounded-lg px-2 py-2 text-base sm:text-sm w-full"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-500">Urutan</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={k.urutan}
                          onChange={(ev) => ubahKomite(k.key, 'urutan', ev.target.value)}
                          className="border rounded-lg px-2 py-2 text-base sm:text-sm w-full"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => hapusKomite(k.key)}
                        className="p-2.5 rounded-md text-red-600 hover:bg-red-50"
                        aria-label={`Hapus ${k.nama || 'anggota komite'}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
              <button
                onClick={simpan}
                disabled={saving}
                className="inline-flex justify-center items-center gap-2 px-4 py-3 sm:py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                style={tombolAktif}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan
              </button>
              <button
                onClick={kembalikan}
                disabled={saving}
                className="inline-flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 sm:py-2 rounded-lg text-sm font-medium disabled:opacity-60"
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
