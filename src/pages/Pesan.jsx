import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import StatusGuruModal from '../components/StatusGuruModal'
import {
  Send,
  Paperclip,
  Search,
  ArrowLeft,
  Loader2,
  FileText,
  Image as ImageIcon,
  Video,
  Download,
  X,
  MessageCircle,
  Megaphone,
  Lock,
  ShieldCheck,
  Building2,
  Users,
  Trash2,
} from 'lucide-react'

// =====================================================================
// Halaman gabungan: "Pesan" (chat antar-rekan + Siaran superadmin) dan
// "Admin Pusat" (chat per-sekolah dengan Admin Pusat/Superadmin), yang
// sebelumnya adalah dua halaman terpisah (Pesan.jsx & PesanPusat.jsx).
// Digabung jadi satu halaman dengan tab supaya tidak duplikasi UI chat
// (bubble, lampiran, format waktu, dll).
//
// Tab "Admin Pusat" hanya tampil untuk role admin-tier (admin, kepala
// sekolah, admin_utama) dan Superadmin — guru tidak pernah melihat tab
// ini, sama seperti sebelumnya saat itu masih route terpisah yang
// dijaga (adminOnly).
//
// PENTING: cek bagian `ADMIN_TIER_ROLES` / `isAdminTier` di bawah dan
// sesuaikan nama field & nilai role dengan struktur `profil` pada
// AuthContext Anda yang sebenarnya (di kode asli PesanPusat.jsx tidak
// terlihat bagaimana role admin-tier dicek di dalam komponen — itu
// diasumsikan sudah dijaga oleh route `adminOnly` di router).
// =====================================================================

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const VIDEO_EXT = ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi', 'm4v']

// ID semu untuk kontak "Siaran" yang selalu dipin di atas daftar kontak
// pada tab "Pesan". Bukan uuid asli — dipakai hanya untuk membedakan
// tampilan di sisi client.
const SIARAN_ID = '__siaran__'

const TARGET_LABEL = {
  semua: 'Semua pengguna',
  admin: 'Semua Admin/Kepala Sekolah',
  guru: 'Semua Guru',
}

function getExt(fileName = '') {
  return (fileName.split('.').pop() || '').toLowerCase()
}

function tipeDariNamaFile(fileName) {
  const ext = getExt(fileName)
  if (IMAGE_EXT.includes(ext)) return 'gambar'
  if (VIDEO_EXT.includes(ext)) return 'video'
  return 'dokumen'
}

function getInisial(nama) {
  if (!nama) return '?'
  const kata = nama.trim().split(/\s+/)
  return (kata.length > 1 ? kata[0][0] + kata[1][0] : kata[0].slice(0, 2)).toUpperCase()
}

function formatWaktu(iso) {
  const d = new Date(iso)
  const sekarang = new Date()
  const sama_hari = d.toDateString() === sekarang.toDateString()
  if (sama_hari) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// Menampilkan satu lampiran pesan (dokumen/gambar/video). Dipakai oleh
// kedua tab. `publicBucket` opsional — dipakai tab "Pesan" untuk lampiran
// yang dibagikan dari Galeri (bucket publik); tab "Admin Pusat" selalu
// pakai bucket privat 'pesan-lampiran' via signed URL.
function LampiranPesan({ bucket, path, nama, tipe, publicBucket }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let aktif = true
    async function ambilUrl() {
      if (publicBucket && bucket === publicBucket) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        if (aktif) setUrl(data?.publicUrl || null)
        return
      }
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 600)
      if (aktif) setUrl(data?.signedUrl || null)
    }
    ambilUrl()
    return () => {
      aktif = false
    }
  }, [bucket, path, publicBucket])

  if (!url) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-xs text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Memuat lampiran...
      </div>
    )
  }

  if (tipe === 'gambar') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block max-w-[220px]">
        <img src={url} alt={nama} className="rounded-lg max-h-56 w-auto object-cover" />
      </a>
    )
  }
  if (tipe === 'video') {
    return <video src={url} controls className="rounded-lg max-w-[260px] max-h-64" />
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white transition max-w-[240px]"
    >
      <FileText size={16} className="text-blue-700 shrink-0" />
      <span className="truncate flex-1">{nama}</span>
      <Download size={14} className="text-slate-400 shrink-0" />
    </a>
  )
}

export default function Pesan() {
  const { session, profil, sekolahId, isSuperAdmin, isAdmin } = useAuth()
  const myId = session?.user?.id

  // isAdmin dari AuthContext sudah mencakup admin, kepala_sekolah, admin_utama
  // (persis sama seperti yang dipakai Sidebar.jsx untuk menentukan menu admin).
  const canAksesPusat = isSuperAdmin || isAdmin

  const [tab, setTab] = useState('rekan') // 'rekan' | 'pusat'
  const tabRef = useRef(tab)
  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  // State percakapan yang sedang ditampilkan — dipakai bersama oleh kedua
  // tab (hanya satu yang aktif dilihat dalam satu waktu).
  const [messages, setMessages] = useState([])
  const [loadingMsg, setLoadingMsg] = useState(false)
  const [teks, setTeks] = useState('')
  const [file, setFile] = useState(null)
  const [mengirim, setMengirim] = useState(false)
  const [showChatMobile, setShowChatMobile] = useState(false)

  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  // ------------------------- Tab "Pesan" (rekan) -------------------------
  const [kontak, setKontak] = useState([])
  const [loadingKontak, setLoadingKontak] = useState(true)
  const [ringkasan, setRingkasan] = useState({}) // { [profil_id]: { lastMsg, waktu, unread } }
  const [cariRekan, setCariRekan] = useState('')
  const [aktifRekan, setAktifRekan] = useState(null) // kontak yang sedang dibuka, atau SIARAN_ID
  const [siaranTerakhir, setSiaranTerakhir] = useState(null)
  const [targetSiaran, setTargetSiaran] = useState('semua')

  const isSiaranAktif = tab === 'rekan' && aktifRekan === SIARAN_ID

  // --------------------- Tab "Admin Pusat" (pusat) ------------------------
  const sisiSaya = isSuperAdmin ? 'pusat' : 'sekolah'
  const [daftarSekolah, setDaftarSekolah] = useState([])
  const [loadingSekolah, setLoadingSekolah] = useState(isSuperAdmin)
  const [ringkasanPusat, setRingkasanPusat] = useState({}) // { [sekolah_id]: { lastMsg, waktu, unread } }
  const [cariSekolah, setCariSekolah] = useState('')
  const [sekolahAktif, setSekolahAktif] = useState(null) // { id, nama_sekolah } — hanya dipakai Superadmin
  const [showStatusGuru, setShowStatusGuru] = useState(false)

  // sekolah_id percakapan yang sedang dibuka di tab Admin Pusat (untuk
  // admin/kepsek selalu = sekolahId sendiri, tidak perlu memilih).
  const sekolahIdAktif = isSuperAdmin ? sekolahAktif?.id : sekolahId

  // ======================================================================
  // Ganti tab: tutup percakapan yang sedang terbuka & kembali ke tampilan
  // daftar di mobile, supaya state antar tab tidak tercampur.
  // ======================================================================
  function pindahTab(tabBaru) {
    if (tabBaru === tab) return
    setTab(tabBaru)
    setMessages([])
    setTeks('')
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowChatMobile(false)
    setAktifRekan(null)
    setSekolahAktif(null)
  }

  // ======================================================================
  // TAB "PESAN" — muat ringkasan & kontak
  // ======================================================================
  const loadRingkasan = useCallback(async () => {
    if (!myId) return
    const { data } = await supabase
      .from('pesan')
      .select('id, pengirim_id, penerima_id, isi, file_nama, file_tipe, dibaca, dibuat_pada')
      .or(`pengirim_id.eq.${myId},penerima_id.eq.${myId}`)
      .order('dibuat_pada', { ascending: false })
      .limit(500)

    const map = {}
    for (const m of data || []) {
      const lawan = m.pengirim_id === myId ? m.penerima_id : m.pengirim_id
      if (!map[lawan]) {
        map[lawan] = {
          lastMsg: m.isi || (m.file_nama ? `📎 ${m.file_nama}` : ''),
          waktu: m.dibuat_pada,
          unread: 0,
        }
      }
      if (m.penerima_id === myId && !m.dibaca) map[lawan].unread += 1
    }
    setRingkasan(map)
  }, [myId])

  const loadRingkasanSiaran = useCallback(async () => {
    if (!myId) return
    const { data: siaran } = await supabase
      .from('pesan_siaran')
      .select('id, isi, file_nama, dibuat_pada')
      .order('dibuat_pada', { ascending: false })
      .limit(200)

    if (!siaran || siaran.length === 0) {
      setSiaranTerakhir(null)
      return
    }

    const { data: sudahDibaca } = await supabase
      .from('pesan_siaran_dibaca')
      .select('siaran_id')
      .eq('profil_id', myId)
    const idSudahDibaca = new Set((sudahDibaca || []).map((r) => r.siaran_id))

    const unread = siaran.filter((s) => !idSudahDibaca.has(s.id)).length
    const terbaru = siaran[0]
    setSiaranTerakhir({
      lastMsg: terbaru.isi || (terbaru.file_nama ? `📎 ${terbaru.file_nama}` : ''),
      waktu: terbaru.dibuat_pada,
      unread,
    })
  }, [myId])

  const loadKontak = useCallback(async () => {
    setLoadingKontak(true)
    const { data, error } = await supabase.rpc('daftar_kontak_pesan')
    if (!error) setKontak(data || [])
    setLoadingKontak(false)
  }, [])

  useEffect(() => {
    loadKontak()
    loadRingkasan()
    loadRingkasanSiaran()
  }, [loadKontak, loadRingkasan, loadRingkasanSiaran])

  // Realtime tab "Pesan": pesan pribadi masuk baru.
  useEffect(() => {
    if (!myId) return
    const channel = supabase
      .channel('pesan-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pesan' },
        (payload) => {
          const m = payload.new
          if (m.pengirim_id !== myId && m.penerima_id !== myId) return
          loadRingkasan()
          if (tabRef.current !== 'rekan') return
          setAktifRekan((currentAktif) => {
            if (
              currentAktif &&
              currentAktif !== SIARAN_ID &&
              (m.pengirim_id === currentAktif.profil_id || m.penerima_id === currentAktif.profil_id)
            ) {
              setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]))
              if (m.penerima_id === myId) {
                supabase.from('pesan').update({ dibaca: true }).eq('id', m.id).then(() => {})
              }
            }
            return currentAktif
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [myId, loadRingkasan])

  // Realtime tab "Pesan": siaran baru dari superadmin.
  useEffect(() => {
    if (!myId) return
    const channel = supabase
      .channel('pesan-siaran-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pesan_siaran' },
        (payload) => {
          const s = payload.new
          loadRingkasanSiaran()
          if (tabRef.current !== 'rekan') return
          setAktifRekan((currentAktif) => {
            if (currentAktif === SIARAN_ID) {
              setMessages((prev) => (prev.some((p) => p.id === s.id) ? prev : [...prev, s]))
              if (s.pengirim_id !== myId) {
                supabase.from('pesan_siaran_dibaca').insert({ siaran_id: s.id, profil_id: myId }).then(() => {})
              }
            }
            return currentAktif
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [myId, loadRingkasanSiaran])

  async function bukaPercakapan(k) {
    setTab('rekan')
    setAktifRekan(k)
    setShowChatMobile(true)
    setLoadingMsg(true)
    const { data } = await supabase
      .from('pesan')
      .select('*')
      .or(
        `and(pengirim_id.eq.${myId},penerima_id.eq.${k.profil_id}),and(pengirim_id.eq.${k.profil_id},penerima_id.eq.${myId})`
      )
      .order('dibuat_pada', { ascending: true })
    setMessages(data || [])
    setLoadingMsg(false)

    const belumDibaca = (data || []).filter((m) => m.penerima_id === myId && !m.dibaca)
    if (belumDibaca.length > 0) {
      await supabase
        .from('pesan')
        .update({ dibaca: true })
        .in('id', belumDibaca.map((m) => m.id))
      loadRingkasan()
    }
  }

  async function bukaSiaran() {
    setTab('rekan')
    setAktifRekan(SIARAN_ID)
    setShowChatMobile(true)
    setLoadingMsg(true)
    const { data } = await supabase
      .from('pesan_siaran')
      .select('*')
      .order('dibuat_pada', { ascending: true })
    setMessages(data || [])
    setLoadingMsg(false)

    const { data: sudahDibaca } = await supabase
      .from('pesan_siaran_dibaca')
      .select('siaran_id')
      .eq('profil_id', myId)
    const idSudahDibaca = new Set((sudahDibaca || []).map((r) => r.siaran_id))
    const belumDibaca = (data || []).filter((s) => !idSudahDibaca.has(s.id))
    if (belumDibaca.length > 0) {
      await supabase.from('pesan_siaran_dibaca').insert(
        belumDibaca.map((s) => ({ siaran_id: s.id, profil_id: myId }))
      )
      loadRingkasanSiaran()
    }
  }

  // ======================================================================
  // TAB "ADMIN PUSAT" — muat daftar sekolah / thread
  // ======================================================================
  const loadDaftarSekolah = useCallback(async () => {
    const { data } = await supabase.from('sekolah').select('id, nama_sekolah').order('nama_sekolah')
    setDaftarSekolah(data || [])
    setLoadingSekolah(false)
  }, [])

  const loadRingkasanPusat = useCallback(async () => {
    const { data } = await supabase
      .from('pesan_pusat')
      .select('sekolah_id, isi, file_nama, sisi, dibaca_pusat, dibuat_pada')
      .order('dibuat_pada', { ascending: false })
      .limit(1000)

    const map = {}
    for (const m of data || []) {
      if (!map[m.sekolah_id]) {
        map[m.sekolah_id] = {
          lastMsg: m.isi || (m.file_nama ? `📎 ${m.file_nama}` : ''),
          waktu: m.dibuat_pada,
          unread: 0,
        }
      }
      if (m.sisi === 'sekolah' && !m.dibaca_pusat) map[m.sekolah_id].unread += 1
    }
    setRingkasanPusat(map)
  }, [])

  useEffect(() => {
    if (!canAksesPusat || !isSuperAdmin) return
    loadDaftarSekolah()
    loadRingkasanPusat()
  }, [canAksesPusat, isSuperAdmin, loadDaftarSekolah, loadRingkasanPusat])

  // Admin/Kepsek: begitu tab "Admin Pusat" dibuka, langsung muat thread
  // sekolah sendiri (tidak perlu memilih dari daftar).
  const muatThreadSekolah = useCallback(async () => {
    if (!sekolahId) return
    setLoadingMsg(true)
    const { data } = await supabase
      .from('pesan_pusat')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('dibuat_pada', { ascending: true })
    setMessages(data || [])
    setLoadingMsg(false)

    const belumDibaca = (data || []).filter((m) => m.sisi === 'pusat' && !m.dibaca_sekolah)
    if (belumDibaca.length > 0) {
      await supabase
        .from('pesan_pusat')
        .update({ dibaca_sekolah: true })
        .in('id', belumDibaca.map((m) => m.id))
    }
  }, [sekolahId])

  useEffect(() => {
    if (!canAksesPusat || isSuperAdmin) return
    if (tab === 'pusat') muatThreadSekolah()
  }, [canAksesPusat, isSuperAdmin, tab, muatThreadSekolah])

  async function bukaSekolah(s) {
    setSekolahAktif(s)
    setShowChatMobile(true)
    setLoadingMsg(true)
    const { data } = await supabase
      .from('pesan_pusat')
      .select('*')
      .eq('sekolah_id', s.id)
      .order('dibuat_pada', { ascending: true })
    setMessages(data || [])
    setLoadingMsg(false)

    const belumDibaca = (data || []).filter((m) => m.sisi === 'sekolah' && !m.dibaca_pusat)
    if (belumDibaca.length > 0) {
      await supabase
        .from('pesan_pusat')
        .update({ dibaca_pusat: true })
        .in('id', belumDibaca.map((m) => m.id))
      loadRingkasanPusat()
    }
  }

  // Realtime tab "Admin Pusat"
  useEffect(() => {
    if (!myId || !canAksesPusat) return
    const channel = supabase
      .channel('pesan-pusat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pesan_pusat' }, (payload) => {
        const m = payload.new

        if (isSuperAdmin) {
          loadRingkasanPusat()
          if (tabRef.current !== 'pusat') return
          setSekolahAktif((current) => {
            if (current && m.sekolah_id === current.id) {
              setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]))
              if (m.sisi === 'sekolah') {
                supabase.from('pesan_pusat').update({ dibaca_pusat: true }).eq('id', m.id).then(() => {})
              }
            }
            return current
          })
          return
        }

        if (m.sekolah_id !== sekolahId) return
        if (tabRef.current === 'pusat') {
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]))
          if (m.sisi === 'pusat') {
            supabase.from('pesan_pusat').update({ dibaca_sekolah: true }).eq('id', m.id).then(() => {})
          }
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pesan_pusat' }, (payload) => {
        const idDihapus = payload.old?.id
        if (!idDihapus) return
        setMessages((prev) => prev.filter((p) => p.id !== idDihapus))
        if (isSuperAdmin) loadRingkasanPusat()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [myId, canAksesPusat, isSuperAdmin, sekolahId, loadRingkasanPusat])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ======================================================================
  // KIRIM PESAN — bercabang menurut tab yang sedang aktif
  // ======================================================================
  async function handleKirim(e) {
    e.preventDefault()
    if (!teks.trim() && !file) return

    if (tab === 'rekan') {
      if (!aktifRekan) return
    } else {
      if (!sekolahIdAktif) return
    }

    setMengirim(true)

    let lampiran = null
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${myId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('pesan-lampiran')
        .upload(path, file, { contentType: file.type || undefined })
      if (uploadError) {
        alert('Gagal mengunggah lampiran: ' + uploadError.message)
        setMengirim(false)
        return
      }
      lampiran = {
        file_bucket: 'pesan-lampiran',
        file_path: path,
        file_nama: file.name,
        file_tipe: tipeDariNamaFile(file.name),
        file_size: file.size,
      }
    }

    if (tab === 'rekan' && isSiaranAktif) {
      const payload = {
        pengirim_id: myId,
        isi: teks.trim() || null,
        target_role: targetSiaran,
        ...lampiran,
      }
      const { data: inserted, error } = await supabase.from('pesan_siaran').insert(payload).select().single()
      setMengirim(false)
      if (error) {
        alert('Gagal mengirim siaran: ' + error.message)
        return
      }
      setMessages((prev) => [...prev, inserted])
      setTeks('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadRingkasanSiaran()
      return
    }

    if (tab === 'rekan') {
      const payload = {
        sekolah_id: profil?.sekolah_id,
        pengirim_id: myId,
        penerima_id: aktifRekan.profil_id,
        isi: teks.trim() || null,
        ...lampiran,
      }

      const { data: inserted, error } = await supabase.from('pesan').insert(payload).select().single()
      setMengirim(false)
      if (error) {
        alert('Gagal mengirim pesan: ' + error.message)
        return
      }
      setMessages((prev) => [...prev, inserted])
      setTeks('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadRingkasan()
      return
    }

    // tab === 'pusat'
    const payload = {
      sekolah_id: sekolahIdAktif,
      pengirim_id: myId,
      sisi: sisiSaya,
      isi: teks.trim() || null,
      dibaca_sekolah: sisiSaya === 'sekolah',
      dibaca_pusat: sisiSaya === 'pusat',
      ...lampiran,
    }

    const { data: inserted, error } = await supabase.from('pesan_pusat').insert(payload).select().single()
    setMengirim(false)
    if (error) {
      alert('Gagal mengirim pesan: ' + error.message)
      return
    }
    setMessages((prev) => [...prev, inserted])
    setTeks('')
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (isSuperAdmin) loadRingkasanPusat()
  }

  // Hapus pesan (khusus tab "Admin Pusat") — hanya untuk pesan milik sendiri.
  async function handleHapusPesan(m) {
    if (m.sisi !== sisiSaya) return
    const yakin = window.confirm('Hapus pesan ini? Tindakan ini tidak bisa dibatalkan.')
    if (!yakin) return

    const idLama = messages
    setMessages((prev) => prev.filter((p) => p.id !== m.id)) // optimistic

    if (m.file_path && m.file_bucket) {
      await supabase.storage.from(m.file_bucket).remove([m.file_path])
    }

    const { data: dihapus, error } = await supabase
      .from('pesan_pusat')
      .delete()
      .eq('id', m.id)
      .select()

    if (error) {
      alert('Gagal menghapus pesan: ' + error.message)
      setMessages(idLama)
      return
    }
    if (!dihapus || dihapus.length === 0) {
      alert('Pesan tidak terhapus — sepertinya izin (RLS policy) DELETE belum diaktifkan di tabel pesan_pusat.')
      setMessages(idLama)
      return
    }
    if (isSuperAdmin) loadRingkasanPusat()
  }

  // ======================================================================
  // Data turunan untuk render
  // ======================================================================
  const kontakTerfilter = kontak.filter((k) => (k.nama_lengkap || '').toLowerCase().includes(cariRekan.toLowerCase()))
  const kontakTerurut = [...kontakTerfilter].sort((a, b) => {
    const wa = ringkasan[a.profil_id]?.waktu || ''
    const wb = ringkasan[b.profil_id]?.waktu || ''
    return wb.localeCompare(wa)
  })

  const daftarSekolahTerfilter = daftarSekolah.filter((s) =>
    (s.nama_sekolah || '').toLowerCase().includes(cariSekolah.toLowerCase())
  )
  const daftarSekolahTerurut = [...daftarSekolahTerfilter].sort((a, b) => {
    const wa = ringkasanPusat[a.id]?.waktu || ''
    const wb = ringkasanPusat[b.id]?.waktu || ''
    return wb.localeCompare(wa)
  })

  const percakapanPusatTerbuka = isSuperAdmin ? !!sekolahAktif : true
  const headerPusat = isSuperAdmin
    ? { nama: sekolahAktif?.nama_sekolah, sub: 'Admin & Kepala Sekolah' }
    : { nama: 'Admin Pusat', sub: 'Superadmin SIMAK' }

  // Sidebar daftar hanya dirender kalau tab "Pesan", atau tab "Admin Pusat"
  // untuk Superadmin (admin/kepsek langsung ke thread sendiri, tanpa daftar).
  const tampilkanSidebar = tab === 'rekan' || (tab === 'pusat' && isSuperAdmin)

  return (
    <Layout title="Pesan" subtitle="Kirim pesan, dokumen, gambar & video ke rekan satu sekolah">
      <div className="card overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}>
        {/* Tab switcher — hanya tampil untuk role yang boleh akses Admin Pusat */}
        {canAksesPusat && (
          <div className="flex border-b border-slate-100 shrink-0">
            <button
              onClick={() => pindahTab('rekan')}
              className={`flex-1 sm:flex-none sm:px-6 py-2.5 text-sm font-medium transition border-b-2 ${
                tab === 'rekan' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Pesan
            </button>
            <button
              onClick={() => pindahTab('pusat')}
              className={`flex-1 sm:flex-none sm:px-6 py-2.5 text-sm font-medium transition border-b-2 ${
                tab === 'pusat' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Admin Pusat
            </button>
          </div>
        )}

        <div className="flex flex-1 min-h-0">
          {/* ============================== SIDEBAR ============================== */}
          {tampilkanSidebar && (
            <div className={`w-full sm:w-72 border-r border-slate-100 flex-col shrink-0 ${showChatMobile ? 'hidden sm:flex' : 'flex'}`}>
              {tab === 'rekan' ? (
                <>
                  <div className="p-3 border-b border-slate-100">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className="input w-full border-slate-200 pl-8 text-sm"
                        placeholder="Cari rekan..."
                        value={cariRekan}
                        onChange={(e) => setCariRekan(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Kontak khusus "Siaran" — selalu dipin di atas */}
                  <button
                    onClick={bukaSiaran}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-slate-100 ${
                      isSiaranAktif ? 'bg-amber-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-9 h-9 rounded-full bg-brass-500 text-white flex items-center justify-center shrink-0">
                      <Megaphone size={16} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium text-slate-900 truncate">Siaran</span>
                        {siaranTerakhir?.waktu && <span className="text-[10px] text-slate-400 shrink-0">{formatWaktu(siaranTerakhir.waktu)}</span>}
                      </span>
                      <span className="flex items-center justify-between gap-1">
                        <span className="text-xs text-slate-400 truncate block max-w-[140px]">{siaranTerakhir?.lastMsg || 'Info dari superadmin'}</span>
                        {!!siaranTerakhir?.unread && (
                          <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {siaranTerakhir.unread > 9 ? '9+' : siaranTerakhir.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>

                  <div className="flex-1 overflow-y-auto">
                    {loadingKontak ? (
                      <p className="text-sm text-slate-400 px-4 py-4">Memuat...</p>
                    ) : kontakTerurut.length === 0 ? (
                      <p className="text-sm text-slate-400 px-4 py-4">Belum ada rekan lain terdaftar.</p>
                    ) : (
                      kontakTerurut.map((k) => {
                        const r = ringkasan[k.profil_id]
                        return (
                          <button
                            key={k.profil_id}
                            onClick={() => bukaPercakapan(k)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-slate-50 ${
                              !isSiaranAktif && aktifRekan?.profil_id === k.profil_id ? 'bg-blue-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span className="w-9 h-9 rounded-full bg-blue-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                              {getInisial(k.nama_lengkap)}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center justify-between gap-1">
                                <span className="text-sm font-medium text-slate-900 truncate">{k.nama_lengkap}</span>
                                {r?.waktu && <span className="text-[10px] text-slate-400 shrink-0">{formatWaktu(r.waktu)}</span>}
                              </span>
                              <span className="flex items-center justify-between gap-1">
                                <span className="text-xs text-slate-400 truncate block max-w-[140px]">{r?.lastMsg || 'Belum ada pesan'}</span>
                                {!!r?.unread && (
                                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {r.unread > 9 ? '9+' : r.unread}
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 border-b border-slate-100">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className="input w-full border-slate-200 pl-8 text-sm"
                        placeholder="Cari sekolah..."
                        value={cariSekolah}
                        onChange={(e) => setCariSekolah(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {loadingSekolah ? (
                      <p className="text-sm text-slate-400 px-4 py-4">Memuat...</p>
                    ) : daftarSekolahTerurut.length === 0 ? (
                      <p className="text-sm text-slate-400 px-4 py-4">Belum ada sekolah terdaftar.</p>
                    ) : (
                      daftarSekolahTerurut.map((s) => {
                        const r = ringkasanPusat[s.id]
                        return (
                          <button
                            key={s.id}
                            onClick={() => bukaSekolah(s)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-slate-50 ${
                              sekolahAktif?.id === s.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span className="w-9 h-9 rounded-full bg-blue-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                              <Building2 size={16} />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center justify-between gap-1">
                                <span className="text-sm font-medium text-slate-900 truncate">{s.nama_sekolah}</span>
                                {r?.waktu && <span className="text-[10px] text-slate-400 shrink-0">{formatWaktu(r.waktu)}</span>}
                              </span>
                              <span className="flex items-center justify-between gap-1">
                                <span className="text-xs text-slate-400 truncate block max-w-[140px]">{r?.lastMsg || 'Belum ada pesan'}</span>
                                {!!r?.unread && (
                                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {r.unread > 9 ? '9+' : r.unread}
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* =============================== MAIN PANEL =============================== */}
          <div className={`flex-1 flex-col min-w-0 ${!tampilkanSidebar || showChatMobile ? 'flex' : 'hidden sm:flex'}`}>
            {tab === 'rekan' ? (
              !aktifRekan ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-300">
                  <MessageCircle size={40} />
                  <p className="text-sm text-slate-400">Pilih rekan atau Siaran untuk mulai</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 shrink-0">
                    <button onClick={() => setShowChatMobile(false)} className="sm:hidden p-1 -ml-1 rounded-lg hover:bg-slate-100">
                      <ArrowLeft size={18} />
                    </button>
                    {isSiaranAktif ? (
                      <>
                        <span className="w-8 h-8 rounded-full bg-brass-500 text-white flex items-center justify-center shrink-0">
                          <Megaphone size={15} />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-900">Siaran</p>
                          <p className="text-[11px] text-slate-400">Pengumuman dari Superadmin untuk seluruh pengguna</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="w-8 h-8 rounded-full bg-blue-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                          {getInisial(aktifRekan.nama_lengkap)}
                        </span>
                        <p className="text-sm font-medium text-slate-900">{aktifRekan.nama_lengkap}</p>
                      </>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/60">
                    {loadingMsg ? (
                      <p className="text-sm text-slate-400">Memuat...</p>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center mt-6">
                        {isSiaranAktif ? 'Belum ada siaran dari superadmin.' : 'Belum ada pesan. Mulai percakapan sekarang.'}
                      </p>
                    ) : isSiaranAktif ? (
                      messages.map((s) => (
                        <div key={s.id} className="max-w-[85%] mx-auto sm:mx-0 sm:max-w-[80%] bg-white border border-amber-200 rounded-2xl px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Megaphone size={13} className="text-brass-500" />
                            <span className="text-[11px] font-semibold text-brass-600 uppercase tracking-wide">
                              {TARGET_LABEL[s.target_role] || 'Siaran'}
                            </span>
                          </div>
                          {s.file_path && (
                            <div className={s.isi ? 'mb-2' : ''}>
                              <LampiranPesan bucket={s.file_bucket} path={s.file_path} nama={s.file_nama} tipe={s.file_tipe} publicBucket="galeri-foto" />
                            </div>
                          )}
                          {s.isi && <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{s.isi}</p>}
                          <p className="text-[10px] text-slate-400 mt-1.5">{formatWaktu(s.dibuat_pada)}</p>
                        </div>
                      ))
                    ) : (
                      messages.map((m) => {
                        const punyaSaya = m.pengirim_id === myId
                        return (
                          <div key={m.id} className={`flex ${punyaSaya ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${
                                punyaSaya ? 'bg-blue-900 text-white rounded-br-md' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                              }`}
                            >
                              {m.file_path && (
                                <div className={m.isi ? 'mb-2' : ''}>
                                  <LampiranPesan bucket={m.file_bucket} path={m.file_path} nama={m.file_nama} tipe={m.file_tipe} publicBucket="galeri-foto" />
                                </div>
                              )}
                              {m.isi && <p className="whitespace-pre-wrap break-words">{m.isi}</p>}
                              <p className={`text-[10px] mt-1 ${punyaSaya ? 'text-blue-200/70' : 'text-slate-400'}`}>{formatWaktu(m.dibuat_pada)}</p>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {isSiaranAktif && !isSuperAdmin ? (
                    <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 shrink-0 text-xs text-slate-400">
                      <Lock size={13} /> Hanya superadmin yang dapat mengirim siaran.
                    </div>
                  ) : (
                    <form onSubmit={handleKirim} className="p-3 border-t border-slate-100 shrink-0">
                      {isSiaranAktif && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-slate-500 shrink-0">Kirim ke:</span>
                          <select
                            className="input border-slate-200 text-xs py-1.5"
                            value={targetSiaran}
                            onChange={(e) => setTargetSiaran(e.target.value)}
                          >
                            <option value="semua">Semua pengguna</option>
                            <option value="admin">Semua Admin/Kepala Sekolah</option>
                            <option value="guru">Semua Guru</option>
                          </select>
                        </div>
                      )}
                      {file && (
                        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600 w-fit max-w-full">
                          {tipeDariNamaFile(file.name) === 'gambar' ? <ImageIcon size={13} /> : tipeDariNamaFile(file.name) === 'video' ? <Video size={13} /> : <FileText size={13} />}
                          <span className="truncate max-w-[180px]">{file.name}</span>
                          <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} className="text-slate-400 hover:text-red-500">
                            <X size={13} />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,video/*"
                          className="hidden"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
                          title="Lampirkan dokumen, gambar, atau video"
                        >
                          <Paperclip size={18} />
                        </button>
                        <input
                          className="input flex-1 border-slate-200 text-sm"
                          placeholder={isSiaranAktif ? 'Tulis pengumuman untuk seluruh pengguna...' : 'Tulis pesan...'}
                          value={teks}
                          onChange={(e) => setTeks(e.target.value)}
                        />
                        <button
                          type="submit"
                          disabled={mengirim || (!teks.trim() && !file)}
                          className="p-2.5 rounded-lg bg-brass-400 text-ink-950 hover:brightness-95 disabled:opacity-50 transition shrink-0"
                        >
                          {mengirim ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )
            ) : !percakapanPusatTerbuka ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-300">
                <MessageCircle size={40} />
                <p className="text-sm text-slate-400">Pilih sekolah untuk mulai percakapan</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 shrink-0">
                  {isSuperAdmin && (
                    <button onClick={() => setShowChatMobile(false)} className="sm:hidden p-1 -ml-1 rounded-lg hover:bg-slate-100">
                      <ArrowLeft size={18} />
                    </button>
                  )}
                  <span className="w-8 h-8 rounded-full bg-brass-500 text-white flex items-center justify-center shrink-0">
                    {isSuperAdmin ? <Building2 size={15} /> : <ShieldCheck size={15} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{headerPusat.nama}</p>
                    <p className="text-[11px] text-slate-400">{headerPusat.sub}</p>
                  </div>
                  {isSuperAdmin && sekolahAktif && (
                    <button
                      onClick={() => setShowStatusGuru(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 shrink-0"
                      title="Lihat status guru online"
                    >
                      <Users size={15} />
                      <span className="hidden sm:inline">Status Guru</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/60">
                  {loadingMsg ? (
                    <p className="text-sm text-slate-400">Memuat...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center mt-6">Belum ada pesan. Mulai percakapan sekarang.</p>
                  ) : (
                    messages.map((m) => {
                      const punyaSaya = m.sisi === sisiSaya
                      return (
                        <div key={m.id} className={`group flex items-end gap-1.5 ${punyaSaya ? 'justify-end' : 'justify-start'}`}>
                          {punyaSaya && (
                            <button
                              onClick={() => handleHapusPesan(m)}
                              title="Hapus pesan"
                              className="mb-1 p-1.5 rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <div
                            className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${
                              punyaSaya ? 'bg-blue-900 text-white rounded-br-md' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                            }`}
                          >
                            {m.file_path && (
                              <div className={m.isi ? 'mb-2' : ''}>
                                <LampiranPesan bucket={m.file_bucket} path={m.file_path} nama={m.file_nama} tipe={m.file_tipe} />
                              </div>
                            )}
                            {m.isi && <p className="whitespace-pre-wrap break-words">{m.isi}</p>}
                            <p className={`text-[10px] mt-1 ${punyaSaya ? 'text-blue-200/70' : 'text-slate-400'}`}>{formatWaktu(m.dibuat_pada)}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={handleKirim} className="p-3 border-t border-slate-100 shrink-0">
                  {file && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600 w-fit max-w-full">
                      {tipeDariNamaFile(file.name) === 'gambar' ? <ImageIcon size={13} /> : tipeDariNamaFile(file.name) === 'video' ? <Video size={13} /> : <FileText size={13} />}
                      <span className="truncate max-w-[180px]">{file.name}</span>
                      <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} className="text-slate-400 hover:text-red-500">
                        <X size={13} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,video/*"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
                      title="Lampirkan dokumen, gambar, atau video"
                    >
                      <Paperclip size={18} />
                    </button>
                    <input
                      className="input flex-1 border-slate-200 text-sm"
                      placeholder="Tulis pesan..."
                      value={teks}
                      onChange={(e) => setTeks(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={mengirim || (!teks.trim() && !file)}
                      className="p-2.5 rounded-lg bg-brass-400 text-ink-950 hover:brightness-95 disabled:opacity-50 transition shrink-0"
                    >
                      {mengirim ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {showStatusGuru && sekolahAktif && (
        <StatusGuruModal sekolah={sekolahAktif} onClose={() => setShowStatusGuru(false)} />
      )}
    </Layout>
  )
}
