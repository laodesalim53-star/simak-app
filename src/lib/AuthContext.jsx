import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profil, setProfil] = useState(undefined)
  const [profilPuskesmas, setProfilPuskesmas] = useState(undefined)

  const profilRequestIdRef = useRef(0)
  const puskesmasRequestIdRef = useRef(0)

  // =========================================================
  // PROFIL PUSKESMAS (tenant jenis_organisasi === 'puskesmas')
  // Dimuat sekali di context supaya halaman lain (kop surat,
  // tanda tangan dokumen, dsb) tidak perlu fetch ulang sendiri
  // seperti sebelumnya di ProfilPuskesmas.jsx.
  // =========================================================
  async function loadProfilPuskesmas(sekolahId) {
    const requestId = ++puskesmasRequestIdRef.current

    if (!sekolahId) {
      if (requestId === puskesmasRequestIdRef.current) setProfilPuskesmas(null)
      return
    }

    const { data, error } = await supabase
      .from('profil_puskesmas')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()

    if (requestId !== puskesmasRequestIdRef.current) return

    if (error) {
      console.error('Gagal memuat profil puskesmas (dibiarkan):', error)
      return
    }

    setProfilPuskesmas(data || null)
  }

  async function loadProfil(userId) {
    const requestId = ++profilRequestIdRef.current

    if (!userId) {
      if (requestId === profilRequestIdRef.current) setProfil(null)
      puskesmasRequestIdRef.current++
      setProfilPuskesmas(null)
      return
    }

    const { data, error } = await supabase
      .from('profil')
      .select(`
        role,
        jabatan,
        guru_id,
        pegawai_id,
        sekolah_id,
        status_akun,
        catatan_admin,
        nama_lengkap_pendaftar,
        email_pendaftar,
        foto_profil_path,
        nuptk,
        pangkat_golongan,
        no_hp,
        tanggal_lahir,
        pendidikan_terakhir,
        alamat,
        paket,
        paket_berlaku_sampai,
        sekolah:sekolah_id ( nama_sekolah, jenis_organisasi )
      `)
      .eq('id', userId)
      .maybeSingle()

    if (requestId !== profilRequestIdRef.current) return

    if (error) {
      console.error('Gagal memuat profil (dibiarkan, tidak logout paksa):', error)
      return
    }

    if (!data) {
      console.warn('Profil tidak ditemukan untuk user ini, logout.')
      await supabase.auth.signOut()
      if (requestId === profilRequestIdRef.current) setProfil(null)
      return
    }

    const jenisOrganisasi = data.sekolah?.jenis_organisasi || 'sekolah'
    const namaSekolah = data.sekolah?.nama_sekolah || null

    // Muat profil puskesmas secara paralel bila tenant ini jenisnya puskesmas.
    // Tidak di-await supaya tidak memperlambat pemuatan profil utama.
    if (jenisOrganisasi === 'puskesmas' && data.sekolah_id) {
      loadProfilPuskesmas(data.sekolah_id)
    } else {
      puskesmasRequestIdRef.current++
      setProfilPuskesmas(null)
    }

if (jenisOrganisasi === 'kantor' && data.pegawai_id) {
  const { data: pegawai } = await supabase
    .from('pegawai_kantor')
    .select('nama_lengkap, foto_profil_path, nip')
    .eq('id', data.pegawai_id)
    .maybeSingle()

  if (requestId !== profilRequestIdRef.current) return

  setProfil({
    ...data,
    jenis_organisasi: jenisOrganisasi,
    nama_sekolah: namaSekolah,
    nama_lengkap: pegawai?.nama_lengkap || data.nama_lengkap_pendaftar,
    foto_profil_path: pegawai?.foto_profil_path || data.foto_profil_path,
    nip: pegawai?.nip || null,
  })
  return
}
    if (data.guru_id) {
      const { data: guru } = await supabase
        .from('guru')
        .select('nama_lengkap, foto_profil_path')
        .eq('id', data.guru_id)
        .maybeSingle()

      if (requestId !== profilRequestIdRef.current) return

      setProfil({
        ...data,
        jenis_organisasi: jenisOrganisasi,
        nama_sekolah: namaSekolah,
        nama_lengkap: guru?.nama_lengkap || data.nama_lengkap_pendaftar,
        foto_profil_path: guru?.foto_profil_path || data.foto_profil_path,
      })
    } else {
      setProfil({
        ...data,
        jenis_organisasi: jenisOrganisasi,
        nama_sekolah: namaSekolah,
        nama_lengkap: data.nama_lengkap_pendaftar,
      })
    }
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return

      setSession(data.session)
      loadProfil(data.session?.user?.id)
    })

    const {
      data: listener,
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return

      if (event === 'TOKEN_REFRESHED') {
        setSession(newSession)
        return
      }

      setSession(newSession)
      loadProfil(newSession?.user?.id)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({
      email,
      password,
    })

  const signOut = () => supabase.auth.signOut()

  const refreshProfil = () => loadProfil(session?.user?.id)

  const refreshProfilPuskesmas = () => loadProfilPuskesmas(profil?.sekolah_id)

  async function tandaiPesanDibaca() {
    if (!session?.user?.id) return

    await supabase
      .from('profil')
      .update({ catatan_admin: null })
      .eq('id', session.user.id)

    await loadProfil(session.user.id)
  }

  // =========================================================
  // REGISTRASI
  // =========================================================

 async function daftar({
  mode,
  email,
  password,
  namaLengkap,
  namaSekolah,
  sekolahId,
  jabatan,
  siswaId,
  hubungan,
  jenisOrganisasi = 'sekolah',
  nip,
}) {
  // Semua validasi sebenarnya dijalankan ulang di server (daftar-akun).
  // Pemeriksaan di sini hanya supaya pengguna dapat umpan balik lebih cepat.
  if (jenisOrganisasi === 'kantor' && jabatan === 'orang_tua') {
    return { error: { message: 'Jabatan Orang Tua/Wali tidak berlaku untuk akun Kantor.' } }
  }
  if (jenisOrganisasi === 'kantor' && !nip) {
    return { error: { message: 'NIP wajib diisi untuk akun Kantor.' } }
  }

  const { data, error } = await supabase.functions.invoke('daftar-akun', {
    body: {
      mode,
      email,
      password,
      namaLengkap,
      namaSekolah,
      sekolahId,
      jabatan,
      siswaId,
      hubungan,
      jenisOrganisasi,
      nip,
    },
  })

  if (error) {
    // Untuk status non-2xx, error.message hanya pesan generik.
    // Pesan asli dari server ada di body response.
    let pesan = 'Pendaftaran gagal, silakan coba lagi.'
    try {
      const body = await error.context.json()
      if (body?.error) pesan = body.error
    } catch (_) { /* pakai pesan default */ }
    return { error: { message: pesan } }
  }
  if (data?.error) return { error: { message: data.error } }

  // Akun sudah dibuat & terkonfirmasi di server, langsung login
  // supaya pengguna melihat status "menunggu".
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  return { error: signInError ?? null }
}

  // =========================================================
  // TAMBAH ANAK UNTUK AKUN ORANG TUA YANG SUDAH LOGIN
  // =========================================================

  async function tambahAnak({
    siswaId,
    hubungan = 'wali',
  }) {
    if (!session?.user?.id) {
      return {
        error: {
          message: 'Anda harus login terlebih dahulu.',
        },
      }
    }

    if (!isOrangTua) {
      return {
        error: {
          message: 'Fitur ini hanya tersedia untuk akun orang tua/wali.',
        },
      }
    }

    if (!siswaId) {
      return {
        error: {
          message: 'Silakan pilih siswa.',
        },
      }
    }

    const { data: siswa, error: siswaError } = await supabase
      .from('siswa')
      .select('id, sekolah_id')
      .eq('id', siswaId)
      .maybeSingle()

    if (siswaError) {
      return { error: siswaError }
    }

    if (!siswa) {
      return {
        error: {
          message: 'Siswa tidak ditemukan.',
        },
      }
    }

    if (siswa.sekolah_id !== profil?.sekolah_id) {
      return {
        error: {
          message: 'Siswa tersebut bukan bagian dari sekolah Anda.',
        },
      }
    }

    const { error } = await supabase
      .from('orang_tua_siswa')
      .insert({
        orang_tua_id: session.user.id,
        siswa_id: siswaId,
        hubungan,
        status: 'menunggu',
      })

    return { error }
  }

  // =========================================================
  // AMBIL DATA ANAK ORANG TUA
  // =========================================================

  async function getAnakSaya() {
    if (!session?.user?.id) {
      return {
        data: [],
        error: null,
      }
    }

    if (!isOrangTua) {
      return {
        data: [],
        error: null,
      }
    }

    const { data, error } = await supabase
      .from('orang_tua_siswa')
      .select(`
        id,
        hubungan,
        status,
        catatan_admin,
        dibuat_pada,
        siswa (
          id,
          nis,
          nisn,
          nama_lengkap,
          jenis_kelamin,
          tempat_lahir,
          tanggal_lahir,
          foto_path,
          status,
          kelas (
            id,
            nama_kelas,
            tingkat,
            tahun_ajaran
          )
        )
      `)
      .eq('orang_tua_id', session.user.id)
      .order('dibuat_pada', {
        ascending: false,
      })

    return {
      data: data || [],
      error,
    }
  }

  // =========================================================
  // ROLE
  // =========================================================

  // PERBAIKAN: 'kepala_kantor' ditambahkan ke isAdmin & isAdminUtama supaya
  // akun Kepala Kantor mendapat menu admin (getGroupsKantorAdmin di
  // Sidebar.jsx) dan akses fitur admin-utama (Persetujuan Akun, Verifikasi
  // Nikah), setara dengan Admin Utama/superadmin di tenant kantor.
  const isAdmin = [
    'admin',
    'admin_utama',
    'superadmin',
    'kepala_sekolah',
    'kepala_kantor',
  ].includes(profil?.role)

  const isAdminUtama =
    profil?.role === 'admin_utama' ||
    profil?.role === 'superadmin' ||
    profil?.role === 'kepala_kantor'

  const isSuperAdmin =
    profil?.role === 'superadmin'

  const isOrangTua =
    profil?.role === 'orang_tua'

  const isKepalaSekolah =
    profil?.role === 'kepala_sekolah'

  const isKantor =
    (profil?.jenis_organisasi ?? 'sekolah') === 'kantor'

  const isPuskesmas =
    (profil?.jenis_organisasi ?? 'sekolah') === 'puskesmas'

  return (
    <AuthContext.Provider
      value={{
        session,

        loading:
          session === undefined ||
          profil === undefined,

        signIn,
        signOut,

        daftar,
        refreshProfil,

        profil,

        isAdmin,
        isAdminUtama,
        isSuperAdmin,
        isOrangTua,
        isKepalaSekolah,
        isKantor,
        isPuskesmas,

        tambahAnak,
        getAnakSaya,

        sekolahId:
          profil?.sekolah_id ?? null,

        statusAkun:
          profil?.status_akun ?? null,

        pesanAdmin:
          profil?.catatan_admin ?? null,

        paket:
          profil?.paket ?? 'free',

        isPremium:
          (profil?.paket ?? 'free') === 'premium',

        paketBerlakuSampai:
          profil?.paket_berlaku_sampai ?? null,

        tandaiPesanDibaca,

        // Profil puskesmas (data kop/tanda tangan): undefined = belum
        // dimuat/tidak relevan, null = tenant ini belum punya baris.
        profilPuskesmas,
        refreshProfilPuskesmas,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
