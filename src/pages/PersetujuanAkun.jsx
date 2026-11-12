import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Clock3,
  X,
  UserCheck,
  UserPlus,
  MessageSquare,
  Pencil,
  KeyRound,
  RotateCcw,
  Trash2,
  ShieldCheck,
  Loader2,
  CreditCard,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { APP_TIPE } from '../lib/appConfig'

// PERBAIKAN: role yang diberikan SAAT admin menyetujui pendaftaran, berdasarkan
// jabatan yang dipilih pendaftar sendiri saat daftar (jabatan hanya label
// sampai titik ini — lihat komentar di Edge Function daftar-akun). Sebelumnya
// ubahStatus() hanya mengubah status_akun, tidak pernah menaikkan role, jadi
// akun seperti Kepala Kantor / Kepala Sekolah / Admin yang gabung tetap
// ber-role dasar (guru/pegawai) walau sudah disetujui.
const ROLE_DARI_JABATAN = {
  admin: 'admin',
  kepala_sekolah: 'kepala_sekolah',
  kepala_kantor: 'kepala_kantor',
  guru: 'guru',
  pegawai: 'pegawai',
  orang_tua: 'orang_tua',
}

// Berapa lama masa aktif paket dihitung sejak upgrade disetujui (dalam hari).
// Ganti sesuai kebijakan (mis. 30 untuk bulanan). Set null kalau tidak
// mau ada tanggal kedaluwarsa.
const MASA_AKTIF_HARI = 30

// ---------------------------------------------------------------------------
// Kelas tampilan bersama — dibuat responsif untuk HP:
// - area sentuh minimal ±40px di layar kecil (md: kembali ke ukuran ringkas)
// - touch-manipulation menghilangkan jeda 300ms saat tap
// - font input 16px di HP supaya iOS tidak otomatis zoom saat fokus
// ---------------------------------------------------------------------------
const BTN_TEKS =
  'flex items-center justify-center gap-1 text-xs font-medium px-3 py-2.5 md:py-1.5 rounded-lg disabled:opacity-60 touch-manipulation'
const BTN_IKON =
  'w-10 h-10 md:w-7 md:h-7 rounded-lg flex items-center justify-center disabled:opacity-60 touch-manipulation border border-slate-200 md:border-0'
const KELAS_TAB_BARIS =
  'flex gap-2 mb-4 overflow-x-auto md:overflow-visible md:flex-wrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
const INPUT_MODAL =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 md:py-2 text-base md:text-sm'

export default function PersetujuanAkun() {
  const auth = useAuth()
  const { isSuperAdmin, sekolahId } = auth

  // Tenant puskesmas. Dipakai fallback ke profilPuskesmas kalau AuthContext
  // belum menyediakan flag isPuskesmas.

  // Puskesmas memakai alur yang sama dengan tenant kantor (pegawai, tanpa
  // guru dan tanpa orang tua/anak) — hanya kalimatnya yang berbeda.
  const isPuskesmas = !!auth.isPuskesmas || APP_TIPE === 'puskesmas'
  const isKantor = !!auth.isKantor || isPuskesmas

  // Kalimat yang tampil di layar, disesuaikan dengan jenis tenant.
  const teks = isPuskesmas
    ? {
        unit: 'Puskesmas',
        lokasi: ' di puskesmas Anda',
        semua: ' di seluruh puskesmas',
        adminKepala: 'Admin & Kepala Puskesmas',
        pegawai: 'Tenaga Kesehatan & Staf',
        kepala: 'Kepala Puskesmas',
        dataPegawai: 'Data Pegawai Puskesmas',
        fitur: 'Presensi, Data Pegawai, dan layanan puskesmas',
      }
    : {
        unit: 'Kantor',
        lokasi: ' di kantor Anda',
        semua: ' di seluruh kantor',
        adminKepala: 'Admin & Kepala Kantor',
        pegawai: 'Pegawai',
        kepala: 'Kepala Kantor',
        dataPegawai: 'Data Pegawai Kantor',
        fitur: 'Presensi, Data Pegawai, dan fitur lain',
      }

  const [tab, setTab] = useState('menunggu')
  const [filterJabatan, setFilterJabatan] = useState('semua')
  const [daftarAkun, setDaftarAkun] = useState([])
  const [loading, setLoading] = useState(true)
  const [prosesId, setProsesId] = useState(null)
  const [modalGuru, setModalGuru] = useState(null) // akun yang sedang diproses link guru-nya
  const [modalEdit, setModalEdit] = useState(null) // akun yang sedang diedit datanya
  const [modalPassword, setModalPassword] = useState(null) // akun yang sedang diganti password-nya
  const [modalPegawai, setModalPegawai] = useState(null) // akun kantor/puskesmas yang sedang dihubungkan ke data pegawai

  // Anak-anak dari akun orang tua yang AKUNNYA SUDAH AKTIF, yang baru
  // ditambahkan lewat fitur "Tambah Anak" (bukan anak pertama saat
  // pendaftaran) dan masih menunggu persetujuan. Ditampilkan di tab
  // terpisah karena tab "Menunggu" di atas hanya memfilter dari
  // profil.status_akun, tidak akan pernah menangkap baris ini.
  // TIDAK RELEVAN untuk tenant "kantor" dan "puskesmas" — keduanya tidak
  // punya konsep orang tua/siswa sama sekali, jadi seluruh alur ini dilewati.
  const [anakMenunggu, setAnakMenunggu] = useState([])
  const [loadingAnakMenunggu, setLoadingAnakMenunggu] = useState(true)

  // Permohonan upgrade paket (transfer manual) yang masih menunggu
  // verifikasi admin. Ditampilkan di tab terpisah karena datanya berasal
  // dari tabel permohonan_upgrade_paket, bukan dari profil.status_akun.
  const [upgradeRequests, setUpgradeRequests] = useState([])
  const [loadingUpgrade, setLoadingUpgrade] = useState(true)
  const [prosesUpgradeId, setProsesUpgradeId] = useState(null)

  async function muatData() {
    setLoading(true)
    let query = supabase
      .from('profil')
      .select(
        'id, role, jabatan, status_akun, nama_lengkap_pendaftar, email_pendaftar, catatan_admin, dibuat_pada, sekolah_id, guru_id, pegawai_id, sekolah:sekolah_id(nama_sekolah)'
      )
      .order('dibuat_pada', { ascending: false })

    query = tab === 'menunggu' ? query.eq('status_akun', 'menunggu') : query.neq('status_akun', 'menunggu')

    if (!isSuperAdmin) {
      query = query.eq('sekolah_id', sekolahId)
    }

    if (isKantor) {
      // Tenant kantor/puskesmas: hanya ada Admin/Kepala dan Pegawai —
      // tidak ada Guru maupun Orang Tua/Wali.
      if (filterJabatan === 'admin_kepala') {
        query = query.or(
          'jabatan.in.(admin,kepala_kantor),and(jabatan.is.null,role.in.(admin,kepala_kantor,admin_utama))'
        )
      } else if (filterJabatan === 'pegawai') {
        query = query.or('jabatan.eq.pegawai,and(jabatan.is.null,role.eq.pegawai)')
      }
    } else {
      if (filterJabatan === 'guru') {
        query = query.or('jabatan.eq.guru,and(jabatan.is.null,role.eq.guru)')
      } else if (filterJabatan === 'admin_kepsek') {
        query = query.or(
          'jabatan.in.(admin,kepala_sekolah),and(jabatan.is.null,role.in.(admin,kepala_sekolah,admin_utama))'
        )
      } else if (filterJabatan === 'orang_tua') {
        query = query.eq('jabatan', 'orang_tua')
      }
    }

    const { data } = await query
    let akunList = data || []

    // Ambil data anak untuk setiap akun orang tua. Tidak bisa di-embed
    // langsung lewat FK karena profil.id dan orang_tua_siswa.orang_tua_id
    // sama-sama mengacu ke auth.users, bukan saling berelasi satu sama
    // lain — jadi diambil terpisah lalu digabung di sisi klien.
    // Dilewati sepenuhnya untuk tenant kantor/puskesmas karena jabatan
    // 'orang_tua' tidak pernah ada di sana.
    if (!isKantor) {
      const idOrangTua = akunList
        .filter((a) => (a.jabatan || a.role) === 'orang_tua')
        .map((a) => a.id)

      if (idOrangTua.length > 0) {
        const { data: relasi } = await supabase
          .from('orang_tua_siswa')
          .select('id, orang_tua_id, siswa_id, hubungan, status, siswa:siswa_id(nama_lengkap, nis)')
          .in('orang_tua_id', idOrangTua)

        akunList = akunList.map((a) =>
          (a.jabatan || a.role) === 'orang_tua'
            ? { ...a, relasiAnak: (relasi || []).filter((r) => r.orang_tua_id === a.id) }
            : a
        )
      }
    }

    setDaftarAkun(akunList)
    setLoading(false)
  }

  // Ambil semua baris orang_tua_siswa berstatus 'menunggu' milik akun
  // orang tua yang AKUNNYA sudah 'aktif' — ini yang menandakan baris
  // tersebut hasil "Tambah Anak" belakangan, bukan anak pertama saat
  // pendaftaran (yang sudah tertangani lewat tab "Menunggu" di atas).
  // Khusus tenant sekolah — untuk kantor/puskesmas fungsi ini tidak pernah dipanggil.
  async function muatAnakMenunggu() {
    setLoadingAnakMenunggu(true)

    const { data: relasi } = await supabase
      .from('orang_tua_siswa')
      .select(`
        id,
        orang_tua_id,
        siswa_id,
        hubungan,
        status,
        catatan_admin,
        dibuat_pada,
        siswa:siswa_id (nama_lengkap, nis, sekolah_id)
      `)
      .eq('status', 'menunggu')
      .order('dibuat_pada', { ascending: false })

    let daftar = relasi || []

    // Filter sekolah untuk admin non-superadmin (siswa.sekolah_id, karena
    // orang_tua_siswa sendiri tidak punya kolom sekolah_id)
    if (!isSuperAdmin) {
      daftar = daftar.filter((r) => r.siswa?.sekolah_id === sekolahId)
    }

    // Ambil nama akun orang tua terpisah (tidak ada FK profil <-> orang_tua_siswa)
    const idOrtu = [...new Set(daftar.map((r) => r.orang_tua_id))]
    let profilOrtu = []
    if (idOrtu.length > 0) {
      const { data } = await supabase
        .from('profil')
        .select('id, nama_lengkap_pendaftar, email_pendaftar, status_akun')
        .in('id', idOrtu)
      profilOrtu = data || []
    }

    // Hanya tampilkan baris dari akun ortu yang AKUNNYA SUDAH AKTIF —
    // relasi anak pertama (saat akun masih 'menunggu') sudah muncul & sudah
    // ditangani lewat tab "Menunggu" yang sudah ada, jadi tidak perlu dobel di sini.
    daftar = daftar
      .map((r) => ({ ...r, ortu: profilOrtu.find((p) => p.id === r.orang_tua_id) }))
      .filter((r) => r.ortu?.status_akun === 'aktif')

    setAnakMenunggu(daftar)
    setLoadingAnakMenunggu(false)
  }

  // Ambil permohonan upgrade paket yang masih 'pending' verifikasi transfer.
  //
  // FITUR INI KHUSUS SUPERADMIN. Uang transfer masuk ke satu rekening milik
  // pemilik aplikasi (lihat REKENING_TUJUAN di UpgradeFitur.jsx), jadi hanya
  // Superadmin yang bisa memverifikasi mutasinya. Karena itu tabel ini tidak
  // difilter per sekolah_id — dan admin/admin_utama tenant TIDAK BOLEH
  // memanggil fungsi ini (dijaga juga di RLS/RPC Supabase, lihat folder
  // supabase/migrations; guard di sini hanya untuk UX).
  async function muatUpgrade() {
    if (!isSuperAdmin) {
      setUpgradeRequests([])
      setLoadingUpgrade(false)
      return
    }
    setLoadingUpgrade(true)

    const { data } = await supabase
      .from('permohonan_upgrade_paket')
      .select(
        'id, user_id, email, nama_lengkap, paket, nominal, bank_pengirim, nama_pengirim, no_rekening_pengirim, catatan, status, created_at'
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    setUpgradeRequests(data || [])
    setLoadingUpgrade(false)
  }

  useEffect(() => {
    muatData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filterJabatan, isKantor])

  useEffect(() => {
    // Tenant kantor/puskesmas tidak punya konsep orang tua/anak — jangan query sama sekali.
    if (isKantor) {
      setAnakMenunggu([])
      setLoadingAnakMenunggu(false)
      return
    }
    muatAnakMenunggu()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKantor])

  // Hanya Superadmin yang boleh melihat/memuat permohonan upgrade paket.
  // isSuperAdmin dijadikan dependency karena nilainya bisa baru tersedia
  // setelah AuthContext selesai memuat profil.
  useEffect(() => {
    if (!isSuperAdmin) {
      setUpgradeRequests([])
      setLoadingUpgrade(false)
      return
    }
    muatUpgrade()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin])

  // Jaga-jaga: non-superadmin tidak boleh berada di tab 'upgrade_paket'
  // (mis. lewat state/deep-link) — kembalikan ke tab default.
  useEffect(() => {
    if (!isSuperAdmin && tab === 'upgrade_paket') setTab('menunggu')
  }, [isSuperAdmin, tab])

  // Tenant kantor/puskesmas tidak punya tab 'anak_menunggu' — kembalikan
  // ke tab default kalau state-nya tersisa dari tenant sebelumnya.
  useEffect(() => {
    if (isKantor && tab === 'anak_menunggu') setTab('menunggu')
  }, [isKantor, tab])

  async function ubahStatus(id, statusBaru, catatan = '', guruId = null, pegawaiId = null) {
    setProsesId(id)
    const payload = { status_akun: statusBaru, catatan_admin: catatan || null }
    if (guruId) payload.guru_id = guruId
    if (pegawaiId) payload.pegawai_id = pegawaiId

    const akunTarget = daftarAkun.find((a) => a.id === id)

    // PERBAIKAN: saat disetujui, naikkan role sesuai jabatan yang dipilih
    // pendaftar (mis. kepala_kantor, kepala_sekolah, admin). Sebelumnya role
    // tidak pernah berubah di sini, jadi akun tetap ber-role dasar
    // (guru/pegawai) walau jabatannya sudah "Kepala Kantor" dsb. Jangan
    // pernah menurunkan admin_utama/superadmin (pembuat organisasi).
    if (
      statusBaru === 'aktif' &&
      akunTarget?.role !== 'admin_utama' &&
      akunTarget?.role !== 'superadmin'
    ) {
      const roleBaru = ROLE_DARI_JABATAN[akunTarget?.jabatan]
      if (roleBaru) payload.role = roleBaru
    }

    await supabase.from('profil').update(payload).eq('id', id)

    // Kalau akun ini orang tua/wali, ikut sinkronkan status hubungan
    // dengan anaknya di tabel orang_tua_siswa supaya tidak "nyangkut"
    // di status menunggu walau akunnya sudah disetujui/ditolak.
    // Dibatasi hanya baris yang MASIH 'menunggu' (anak pertama saat
    // pendaftaran) — supaya tidak menimpa status anak lain yang sudah
    // diproses terpisah lewat tab "Anak Menunggu". Tidak berlaku untuk
    // tenant kantor/puskesmas.
    const akun = akunTarget
    if (!isKantor && (akun?.jabatan || akun?.role) === 'orang_tua') {
      const statusRelasi =
        statusBaru === 'aktif' ? 'aktif' : statusBaru === 'ditolak' ? 'ditolak' : 'menunggu'
      await supabase
        .from('orang_tua_siswa')
        .update({ status: statusRelasi })
        .eq('orang_tua_id', id)
        .eq('status', 'menunggu')
    }

    setProsesId(null)
    setModalGuru(null)
    setModalPegawai(null)
    muatData()
    if (!isKantor) muatAnakMenunggu()
  }

  function handleTolak(id) {
    const catatan = window.prompt('Catatan penolakan (opsional):') || ''
    ubahStatus(id, 'ditolak', catatan)
  }

  function isJabatanGuru(akun) {
    // Tenant kantor/puskesmas tidak punya jabatan 'guru' sama sekali.
    return !isKantor && (akun.jabatan || akun.role) === 'guru'
  }

  function isJabatanPegawai(akun) {
    return ['pegawai', 'kepala_kantor'].includes(akun.jabatan || akun.role)
  }

  function handleSetujui(akun) {
    if (isJabatanGuru(akun)) {
      setModalGuru(akun) // buka modal, jangan langsung ubah status
    } else if (isJabatanPegawai(akun) && !akun.pegawai_id) {
      setModalPegawai(akun) // buka modal, jangan langsung ubah status
    } else {
      ubahStatus(akun.id, 'aktif')
    }
  }

  // Hubungkan akun kantor/puskesmas yang SUDAH aktif ke data pegawai_kantor,
  // tanpa mengubah status_akun — dipakai untuk akun yang sempat disetujui
  // langsung (sebelum modal ini ada) sehingga pegawai_id-nya masih kosong.
  async function hubungkanPegawaiSaja(akun, pegawaiId) {
    setProsesId(akun.id)
    const { error } = await supabase
      .from('profil')
      .update({ pegawai_id: pegawaiId })
      .eq('id', akun.id)
    setProsesId(null)
    setModalPegawai(null)
    if (error) {
      window.alert('Gagal menghubungkan data pegawai: ' + error.message)
      return
    }
    muatData()
  }

  // Kirim/edit pesan (catatan_admin) untuk akun yang sudah disetujui
  async function handlePesan(akun) {
    const pesanBaru = window.prompt(
      `Pesan untuk ${akun.nama_lengkap_pendaftar || 'pengguna ini'}:`,
      akun.catatan_admin || ''
    )
    if (pesanBaru === null) return // dibatalkan
    setProsesId(akun.id)
    const { error } = await supabase
      .from('profil')
      .update({ catatan_admin: pesanBaru })
      .eq('id', akun.id)
    setProsesId(null)
    if (error) {
      window.alert('Gagal menyimpan pesan: ' + error.message)
      return
    }
    muatData()
  }

  // Kirim link reset password ke email pengguna (via Supabase Auth)
  async function handleResetPassword(akun) {
    if (!akun.email_pendaftar) {
      window.alert('Akun ini tidak memiliki email terdaftar.')
      return
    }
    if (!window.confirm(`Kirim link reset password ke ${akun.email_pendaftar}?`)) return
    setProsesId(akun.id)
    const { error } = await supabase.auth.resetPasswordForEmail(akun.email_pendaftar)
    setProsesId(null)
    if (error) {
      window.alert('Gagal mengirim link reset password: ' + error.message)
      return
    }
    window.alert('Link reset password berhasil dikirim ke ' + akun.email_pendaftar)
  }

  // Kembalikan status akun ke "menunggu" — membatalkan keputusan setuju/tolak sebelumnya
  async function handleResetStatus(akun) {
    if (
      !window.confirm(
        `Kembalikan status akun "${akun.nama_lengkap_pendaftar || akun.email_pendaftar}" ke "Menunggu"? Keputusan sebelumnya akan dibatalkan.`
      )
    )
      return
    setProsesId(akun.id)
    const { error } = await supabase
      .from('profil')
      .update({ status_akun: 'menunggu', catatan_admin: null, guru_id: null })
      .eq('id', akun.id)

    // Sama seperti di ubahStatus(): hanya reset baris orang_tua_siswa yang
    // statusnya masih cerminan dari status akun SEBELUM direset ini (aktif
    // atau ditolak), supaya anak lain yang sudah diproses terpisah lewat
    // tab "Anak Menunggu" tidak ikut ter-reset tanpa sengaja. Tidak berlaku
    // untuk tenant kantor/puskesmas.
    if (!error && !isKantor && (akun.jabatan || akun.role) === 'orang_tua') {
      await supabase
        .from('orang_tua_siswa')
        .update({ status: 'menunggu' })
        .eq('orang_tua_id', akun.id)
        .eq('status', akun.status_akun === 'aktif' ? 'aktif' : 'ditolak')
    }

    setProsesId(null)
    if (error) {
      window.alert('Gagal mereset status akun: ' + error.message)
      return
    }
    muatData()
    if (!isKantor) muatAnakMenunggu()
  }

  // Simpan perubahan data akun dari modal Edit
  async function handleSimpanEdit(id, dataBaru) {
    setProsesId(id)
    const { error } = await supabase.from('profil').update(dataBaru).eq('id', id)
    setProsesId(null)
    setModalEdit(null)
    if (error) {
      window.alert('Gagal menyimpan perubahan: ' + error.message)
      return
    }
    muatData()
  }

  // Ganti password akun secara langsung (tanpa lewat email reset) — dipanggil
  // lewat Edge Function 'set-password-akun' karena butuh service role key
  // yang tidak boleh dipakai di frontend. Edge Function juga memverifikasi
  // ulang bahwa pemanggil memang berwenang (superadmin, atau admin/admin_utama/
  // kepala_sekolah untuk sekolahnya sendiri) sebelum mengganti apa pun.
  async function handleSimpanPassword(akun, passwordBaru) {
    setProsesId(akun.id)
    const { data, error } = await supabase.functions.invoke('set-password-akun', {
      body: { akun_id: akun.id, password_baru: passwordBaru },
    })
    setProsesId(null)

    if (error || data?.error) {
      let pesan = data?.error || error?.message || 'Terjadi kesalahan tak terduga.'
      // Kalau supabase-js melempar FunctionsHttpError, body JSON asli ada di error.context
      if (error?.context?.json) {
        try {
          const body = await error.context.json()
          if (body?.error) pesan = body.error
        } catch {
          // abaikan, pakai pesan default di atas
        }
      }
      window.alert('Gagal mengganti password: ' + pesan)
      return
    }

    setModalPassword(null)
    window.alert('Password berhasil diganti.')
  }

  // Hapus akun secara PERMANEN — profil, data guru terkait (jika ada), DAN
  // akun di Supabase Auth. Ini dikerjakan lewat Edge Function 'hapus-akun'
  // karena menghapus dari Auth butuh service role key yang tidak boleh
  // dipakai di frontend. Edge Function juga memverifikasi ulang bahwa
  // pemanggil memang berwenang (superadmin, atau admin_utama untuk
  // sekolahnya sendiri) sebelum menghapus apa pun.
  async function handleHapus(akun) {
    if (
      !window.confirm(
        `Hapus akun "${akun.nama_lengkap_pendaftar || akun.email_pendaftar}" secara permanen? Akun ini juga tidak akan bisa login lagi. Data guru terkait (jika ada) juga akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.`
      )
    )
      return
    setProsesId(akun.id)

    const { data, error } = await supabase.functions.invoke('hapus-akun', {
      body: { akun_id: akun.id, guru_id: akun.guru_id || null },
    })

    setProsesId(null)

    if (error || data?.error) {
      let pesan = data?.error || error?.message || 'Terjadi kesalahan tak terduga.'
      // Kalau supabase-js melempar FunctionsHttpError, body JSON asli ada di error.context
      if (error?.context?.json) {
        try {
          const body = await error.context.json()
          if (body?.error) pesan = body.error
        } catch {
          // abaikan, pakai pesan default di atas
        }
      }
      window.alert('Gagal menghapus akun: ' + pesan)
      return
    }

    muatData()
  }

  // Setujui satu baris anak (tab "Anak Menunggu") — hanya menyentuh baris
  // ini, tidak menyentuh baris anak lain atau status akun orang tuanya.
  // Khusus tenant sekolah.
  async function setujuiAnak(relasiId) {
    setProsesId(relasiId)
    const { error } = await supabase
      .from('orang_tua_siswa')
      .update({ status: 'aktif' })
      .eq('id', relasiId)
    setProsesId(null)
    if (error) {
      window.alert('Gagal menyetujui: ' + error.message)
      return
    }
    muatAnakMenunggu()
  }

  // Tolak satu baris anak (tab "Anak Menunggu")
  async function tolakAnak(relasiId) {
    const catatan = window.prompt('Catatan penolakan (opsional):') || ''
    setProsesId(relasiId)
    const { error } = await supabase
      .from('orang_tua_siswa')
      .update({ status: 'ditolak', catatan_admin: catatan || null })
      .eq('id', relasiId)
    setProsesId(null)
    if (error) {
      window.alert('Gagal menolak: ' + error.message)
      return
    }
    muatAnakMenunggu()
  }

  // Setujui/tolak satu permohonan upgrade paket (tab "Upgrade Paket").
  //
  // PERBAIKAN: bagian "approve" sebelumnya melakukan dua .update() terpisah
  // dari client — satu ke permohonan_upgrade_paket, satu lagi ke profil
  // user lain. Update kedua itu kena RLS (policy UPDATE di tabel profil
  // hanya mengizinkan auth.uid() = id), jadi "berhasil" tanpa error tapi
  // sebenarnya 0 baris berubah, sehingga paket user tetap 'free'.
  //
  // Sekarang approve dipindah ke satu pemanggilan RPC
  // approve_paket_upgrade(p_permohonan_id, p_masa_berlaku_hari) —
  // function SQL dengan SECURITY DEFINER yang mengecek role pemanggil
  // (HARUS superadmin — lihat supabase/migrations/002) lalu meng-update permohonan_upgrade_paket
  // DAN profil dalam satu transaksi, bypass RLS dengan aman.
  async function ubahStatusUpgrade(request, statusBaru) {
    if (!isSuperAdmin) {
      window.alert('Hanya Superadmin yang dapat memproses permohonan upgrade paket.')
      return
    }
    const aksi = statusBaru === 'approved' ? 'menyetujui' : 'menolak'
    if (
      !window.confirm(
        `Yakin ingin ${aksi} permohonan upgrade paket ${request.paket} dari ${request.email}?`
      )
    )
      return

    setProsesUpgradeId(request.id)

    if (statusBaru === 'approved') {
      const { error } = await supabase.rpc('approve_paket_upgrade', {
        p_permohonan_id: request.id,
        p_masa_berlaku_hari: MASA_AKTIF_HARI || 365,
      })

      if (error) {
        window.alert('Gagal menyetujui & mengaktifkan paket: ' + error.message)
        setProsesUpgradeId(null)
        return
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('permohonan_upgrade_paket')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user?.id || null,
        })
        .eq('id', request.id)

      if (error) {
        window.alert('Status permohonan upgrade gagal diperbarui: ' + error.message)
        setProsesUpgradeId(null)
        return
      }
    }

    setUpgradeRequests((current) => current.filter((item) => item.id !== request.id))
    setProsesUpgradeId(null)
  }

  function formatTanggalUpgrade(date) {
    if (!date) return '-'
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date))
  }

  function formatRupiah(nominal) {
    if (nominal === null || nominal === undefined) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(nominal)
  }

  // -------------------------------------------------------------------------
  // Potongan tampilan yang dipakai BERSAMA oleh tabel (desktop) dan kartu (HP),
  // supaya logika tombol tidak ditulis dua kali.
  // -------------------------------------------------------------------------

  // Info anak untuk akun orang tua/wali (tenant sekolah saja)
  function renderInfoAnak(akun) {
    if (isKantor || (akun.jabatan || akun.role) !== 'orang_tua') return null
    if (akun.relasiAnak?.length > 0) {
      return (
        <p className="text-[11px] text-slate-400 mt-0.5">
          Anak:{' '}
          {akun.relasiAnak
            .map((r) => r.siswa?.nama_lengkap)
            .filter(Boolean)
            .join(', ')}
          {akun.relasiAnak[0]?.hubungan ? ` (${akun.relasiAnak[0].hubungan})` : ''}
        </p>
      )
    }
    return <p className="text-[11px] text-red-400 mt-0.5">Belum ada data anak terhubung</p>
  }

  // Catatan admin pada akun yang sudah disetujui
  function renderCatatan(akun) {
    if (akun.status_akun !== 'aktif' || !akun.catatan_admin) return null
    return (
      <p
        className="text-[11px] text-slate-400 mt-1 md:max-w-[220px] md:truncate break-words"
        title={akun.catatan_admin}
      >
        "{akun.catatan_admin}"
      </p>
    )
  }

  // Deretan tombol aksi satu akun
  function renderAksiAkun(akun) {
    const sibuk = prosesId === akun.id
    return (
      <div className="flex items-center gap-2 md:gap-1.5 flex-wrap md:justify-end">
        {akun.status_akun === 'menunggu' && (
          <>
            <button
              onClick={() => handleSetujui(akun)}
              disabled={sibuk}
              className={`${BTN_TEKS} flex-1 md:flex-none bg-green-50 text-green-600 hover:bg-green-100`}
            >
              <CheckCircle2 size={14} /> Setujui
            </button>
            <button
              onClick={() => handleTolak(akun.id)}
              disabled={sibuk}
              className={`${BTN_TEKS} flex-1 md:flex-none bg-red-50 text-red-600 hover:bg-red-100`}
            >
              <XCircle size={14} /> Tolak
            </button>
          </>
        )}

        {akun.status_akun === 'aktif' && (
          <button
            onClick={() => handlePesan(akun)}
            disabled={sibuk}
            className={`${BTN_TEKS} bg-blue-50 text-blue-600 hover:bg-blue-100`}
          >
            <MessageSquare size={14} /> {akun.catatan_admin ? 'Edit Pesan' : 'Kirim Pesan'}
          </button>
        )}

        {akun.status_akun === 'aktif' && isJabatanPegawai(akun) && !akun.pegawai_id && (
          <button
            onClick={() => setModalPegawai(akun)}
            disabled={sibuk}
            className={`${BTN_TEKS} bg-cyan-50 text-cyan-600 hover:bg-cyan-100`}
          >
            <UserPlus size={14} /> Hubungkan Pegawai
          </button>
        )}

        {akun.status_akun !== 'menunggu' && (
          <button
            onClick={() => handleResetStatus(akun)}
            disabled={sibuk}
            title="Kembalikan ke status Menunggu"
            aria-label="Kembalikan ke status Menunggu"
            className={`${BTN_IKON} text-indigo-600 hover:bg-indigo-50`}
          >
            <RotateCcw size={16} />
          </button>
        )}

        <button
          onClick={() => setModalEdit(akun)}
          disabled={sibuk}
          title="Edit data akun"
          aria-label="Edit data akun"
          className={`${BTN_IKON} text-slate-500 hover:bg-slate-100`}
        >
          <Pencil size={16} />
        </button>

        <button
          onClick={() => handleResetPassword(akun)}
          disabled={sibuk}
          title="Kirim link reset password"
          aria-label="Kirim link reset password"
          className={`${BTN_IKON} text-amber-600 hover:bg-amber-50`}
        >
          <KeyRound size={16} />
        </button>

        <button
          onClick={() => setModalPassword(akun)}
          disabled={sibuk}
          title="Ganti password langsung"
          aria-label="Ganti password langsung"
          className={`${BTN_IKON} text-orange-600 hover:bg-orange-50`}
        >
          <ShieldCheck size={16} />
        </button>

        <button
          onClick={() => handleHapus(akun)}
          disabled={sibuk}
          title="Hapus akun"
          aria-label="Hapus akun"
          className={`${BTN_IKON} text-red-600 hover:bg-red-50`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    )
  }

  // Tombol Setujui/Tolak untuk satu baris anak (tab "Anak Menunggu")
  function renderAksiAnak(r) {
    return (
      <div className="flex items-center gap-2 md:gap-1.5 md:justify-end">
        <button
          onClick={() => setujuiAnak(r.id)}
          disabled={prosesId === r.id}
          className={`${BTN_TEKS} flex-1 md:flex-none bg-green-50 text-green-600 hover:bg-green-100`}
        >
          <CheckCircle2 size={14} /> Setujui
        </button>
        <button
          onClick={() => tolakAnak(r.id)}
          disabled={prosesId === r.id}
          className={`${BTN_TEKS} flex-1 md:flex-none bg-red-50 text-red-600 hover:bg-red-100`}
        >
          <XCircle size={14} /> Tolak
        </button>
      </div>
    )
  }

  // Tombol Setujui/Tolak untuk satu permohonan upgrade paket
  function renderAksiUpgrade(r) {
    return (
      <div className="flex items-center gap-2 md:gap-1.5 md:justify-end">
        <button
          onClick={() => ubahStatusUpgrade(r, 'approved')}
          disabled={prosesUpgradeId === r.id}
          className={`${BTN_TEKS} flex-1 md:flex-none bg-green-50 text-green-600 hover:bg-green-100`}
        >
          <CheckCircle2 size={14} /> Setujui & Aktifkan
        </button>
        <button
          onClick={() => ubahStatusUpgrade(r, 'rejected')}
          disabled={prosesUpgradeId === r.id}
          className={`${BTN_TEKS} flex-1 md:flex-none bg-red-50 text-red-600 hover:bg-red-100`}
        >
          <XCircle size={14} /> Tolak
        </button>
      </div>
    )
  }

  return (
    <Layout
      title="Persetujuan Akun"
      subtitle={`Kelola pendaftaran akun pegawai baru${
        isSuperAdmin
          ? isPuskesmas
            ? teks.semua
            : ' di seluruh sekolah'
          : isKantor
            ? teks.lokasi
            : ' di sekolah Anda'
      }.`}
    >
      {/* Tab utama — di HP satu baris yang bisa digeser ke samping */}
      <div className={KELAS_TAB_BARIS}>
        <button
          onClick={() => setTab('menunggu')}
          className={`shrink-0 whitespace-nowrap text-sm font-medium px-4 py-2.5 md:py-2 rounded-lg transition-colors touch-manipulation ${
            tab === 'menunggu' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Menunggu
        </button>
        <button
          onClick={() => setTab('riwayat')}
          className={`shrink-0 whitespace-nowrap text-sm font-medium px-4 py-2.5 md:py-2 rounded-lg transition-colors touch-manipulation ${
            tab === 'riwayat' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Riwayat
        </button>
        {/* Tab "Anak Menunggu" murni konsep orang tua/siswa sekolah — tidak
            relevan sama sekali untuk tenant kantor/puskesmas, jadi disembunyikan. */}
        {!isKantor && (
          <button
            onClick={() => setTab('anak_menunggu')}
            className={`shrink-0 whitespace-nowrap text-sm font-medium px-4 py-2.5 md:py-2 rounded-lg transition-colors flex items-center gap-1.5 touch-manipulation ${
              tab === 'anak_menunggu' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Anak Menunggu
            {anakMenunggu.length > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab === 'anak_menunggu' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {anakMenunggu.length}
              </span>
            )}
          </button>
        )}
        {/* Tab "Upgrade Paket" khusus Superadmin (rekening tujuan transfer milik
            pemilik aplikasi, jadi hanya Superadmin yang bisa memverifikasi). */}
        {isSuperAdmin && (
          <button
            onClick={() => setTab('upgrade_paket')}
            className={`shrink-0 whitespace-nowrap text-sm font-medium px-4 py-2.5 md:py-2 rounded-lg transition-colors flex items-center gap-1.5 touch-manipulation ${
              tab === 'upgrade_paket' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <CreditCard size={14} />
            Upgrade Paket
            {upgradeRequests.length > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab === 'upgrade_paket' ? 'bg-white/20' : 'bg-teal-100 text-teal-700'
                }`}
              >
                {upgradeRequests.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Filter jabatan — juga satu baris yang bisa digeser di HP */}
      {tab !== 'anak_menunggu' && tab !== 'upgrade_paket' && (
        <div className={KELAS_TAB_BARIS}>
          <button
            onClick={() => setFilterJabatan('semua')}
            className={`shrink-0 whitespace-nowrap text-xs font-medium px-3 py-2 md:py-1.5 rounded-full transition-colors touch-manipulation ${
              filterJabatan === 'semua' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Semua Jabatan
          </button>

          {isKantor ? (
            <>
              <button
                onClick={() => setFilterJabatan('admin_kepala')}
                className={`shrink-0 whitespace-nowrap text-xs font-medium px-3 py-2 md:py-1.5 rounded-full transition-colors touch-manipulation ${
                  filterJabatan === 'admin_kepala' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                {teks.adminKepala}
              </button>
              <button
                onClick={() => setFilterJabatan('pegawai')}
                className={`shrink-0 whitespace-nowrap text-xs font-medium px-3 py-2 md:py-1.5 rounded-full transition-colors touch-manipulation ${
                  filterJabatan === 'pegawai' ? 'bg-cyan-600 text-white' : 'bg-cyan-50 text-cyan-600'
                }`}
              >
                {teks.pegawai}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setFilterJabatan('admin_kepsek')}
                className={`shrink-0 whitespace-nowrap text-xs font-medium px-3 py-2 md:py-1.5 rounded-full transition-colors touch-manipulation ${
                  filterJabatan === 'admin_kepsek' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                Admin & Kepala Sekolah
              </button>
              <button
                onClick={() => setFilterJabatan('guru')}
                className={`shrink-0 whitespace-nowrap text-xs font-medium px-3 py-2 md:py-1.5 rounded-full transition-colors touch-manipulation ${
                  filterJabatan === 'guru' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                }`}
              >
                Guru
              </button>
              <button
                onClick={() => setFilterJabatan('orang_tua')}
                className={`shrink-0 whitespace-nowrap text-xs font-medium px-3 py-2 md:py-1.5 rounded-full transition-colors touch-manipulation ${
                  filterJabatan === 'orang_tua' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                Orang Tua/Wali
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'menunggu' || tab === 'riwayat' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-slate-400 text-center">Memuat data...</p>
          ) : daftarAkun.length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">
              {tab === 'menunggu'
                ? 'Tidak ada pendaftaran yang menunggu persetujuan.'
                : 'Belum ada riwayat.'}
            </p>
          ) : (
            <>
              {/* ===== HP: daftar kartu ===== */}
              <div className="md:hidden divide-y divide-slate-100">
                {daftarAkun.map((akun) => (
                  <div key={akun.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 break-words">
                          {akun.nama_lengkap_pendaftar || '—'}
                        </p>
                        <p className="text-xs text-slate-500 break-all">{akun.email_pendaftar || '—'}</p>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={akun.status_akun} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <JabatanBadge jabatan={akun.jabatan} role={akun.role} teks={teks} />
                      {isSuperAdmin && akun.sekolah?.nama_sekolah && (
                        <span className="text-xs text-slate-500">{akun.sekolah.nama_sekolah}</span>
                      )}
                    </div>

                    {renderInfoAnak(akun)}
                    {renderCatatan(akun)}
                    {renderAksiAkun(akun)}
                  </div>
                ))}
              </div>

              {/* ===== Layar lebar: tabel ===== */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Nama</th>
                      <th className="text-left px-4 py-3 font-medium">Email</th>
                      <th className="text-left px-4 py-3 font-medium">Jabatan</th>
                      {isSuperAdmin && (
                        <th className="text-left px-4 py-3 font-medium">
                          {isKantor ? teks.unit : 'Sekolah'}
                        </th>
                      )}
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {daftarAkun.map((akun) => (
                      <tr key={akun.id}>
                        <td className="px-4 py-3 text-slate-700">
                          {akun.nama_lengkap_pendaftar || '—'}
                          {renderInfoAnak(akun)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{akun.email_pendaftar || '—'}</td>
                        <td className="px-4 py-3">
                          <JabatanBadge jabatan={akun.jabatan} role={akun.role} teks={teks} />
                        </td>
                        {isSuperAdmin && (
                          <td className="px-4 py-3 text-slate-500">{akun.sekolah?.nama_sekolah || '—'}</td>
                        )}
                        <td className="px-4 py-3">
                          <StatusBadge status={akun.status_akun} />
                          {renderCatatan(akun)}
                        </td>
                        <td className="px-4 py-3 text-right">{renderAksiAkun(akun)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : tab === 'anak_menunggu' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loadingAnakMenunggu ? (
            <p className="p-6 text-sm text-slate-400 text-center">Memuat data...</p>
          ) : anakMenunggu.length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">
              Tidak ada permintaan tambah anak yang menunggu persetujuan.
            </p>
          ) : (
            <>
              {/* ===== HP: daftar kartu ===== */}
              <div className="md:hidden divide-y divide-slate-100">
                {anakMenunggu.map((r) => (
                  <div key={r.id} className="p-4 space-y-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Akun Orang Tua</p>
                      <p className="font-medium text-slate-800 break-words">
                        {r.ortu?.nama_lengkap_pendaftar || '—'}
                      </p>
                      <p className="text-xs text-slate-500 break-all">{r.ortu?.email_pendaftar}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Anak</p>
                      <p className="text-slate-700 break-words">{r.siswa?.nama_lengkap || '—'}</p>
                      <p className="text-xs text-slate-500">
                        NIS: {r.siswa?.nis || '—'}
                        {r.hubungan ? ` · ${r.hubungan}` : ''}
                      </p>
                    </div>
                    {renderAksiAnak(r)}
                  </div>
                ))}
              </div>

              {/* ===== Layar lebar: tabel ===== */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Akun Orang Tua</th>
                      <th className="text-left px-4 py-3 font-medium">Anak</th>
                      <th className="text-left px-4 py-3 font-medium">Hubungan</th>
                      <th className="text-right px-4 py-3 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {anakMenunggu.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-slate-700">
                          {r.ortu?.nama_lengkap_pendaftar || '—'}
                          <p className="text-[11px] text-slate-400">{r.ortu?.email_pendaftar}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {r.siswa?.nama_lengkap || '—'}
                          <p className="text-[11px] text-slate-400">NIS: {r.siswa?.nis || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-500 capitalize">{r.hubungan || '—'}</td>
                        <td className="px-4 py-3 text-right">{renderAksiAnak(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : tab === 'upgrade_paket' && isSuperAdmin ? (
        // ===== Tab "Upgrade Paket" — verifikasi transfer manual (khusus Superadmin) =====
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loadingUpgrade ? (
            <p className="p-6 text-sm text-slate-400 text-center">Memuat data...</p>
          ) : upgradeRequests.length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">
              Tidak ada permohonan upgrade paket yang menunggu verifikasi.
            </p>
          ) : (
            <>
              {/* ===== HP: daftar kartu ===== */}
              <div className="md:hidden divide-y divide-slate-100">
                {upgradeRequests.map((r) => (
                  <div key={r.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 break-words">{r.nama_lengkap || '—'}</p>
                        <p className="text-xs text-slate-500 break-all">{r.email}</p>
                      </div>
                      <span className="shrink-0 inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 capitalize">
                        {r.paket}
                      </span>
                    </div>

                    <div className="text-sm text-slate-600">
                      <p className="font-medium">{formatRupiah(r.nominal)}</p>
                      <p className="text-xs text-slate-400 break-words">
                        {r.nama_pengirim}
                        {r.bank_pengirim ? ` (${r.bank_pengirim})` : ''}
                        {r.no_rekening_pengirim ? ` · ${r.no_rekening_pengirim}` : ''}
                      </p>
                      {r.catatan && (
                        <p className="text-xs italic text-slate-400 mt-0.5 break-words">"{r.catatan}"</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Diajukan {formatTanggalUpgrade(r.created_at)}
                      </p>
                    </div>

                    {renderAksiUpgrade(r)}
                  </div>
                ))}
              </div>

              {/* ===== Layar lebar: tabel ===== */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Pengguna</th>
                      <th className="text-left px-4 py-3 font-medium">Paket</th>
                      <th className="text-left px-4 py-3 font-medium">Transfer</th>
                      <th className="text-left px-4 py-3 font-medium">Diajukan</th>
                      <th className="text-right px-4 py-3 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upgradeRequests.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-slate-700">
                          {r.nama_lengkap || '—'}
                          <p className="text-[11px] text-slate-400">{r.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 capitalize">
                            {r.paket}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatRupiah(r.nominal)}
                          <p className="text-[11px] text-slate-400">
                            {r.nama_pengirim}
                            {r.bank_pengirim ? ` (${r.bank_pengirim})` : ''}
                            {r.no_rekening_pengirim ? ` · ${r.no_rekening_pengirim}` : ''}
                          </p>
                          {r.catatan && (
                            <p className="text-[11px] italic text-slate-400 mt-0.5">"{r.catatan}"</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatTanggalUpgrade(r.created_at)}</td>
                        <td className="px-4 py-3 text-right">{renderAksiUpgrade(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : null}

      {modalGuru && (
        <ModalHubungkanGuru
          akun={modalGuru}
          onClose={() => setModalGuru(null)}
          onSelesai={(guruId) => ubahStatus(modalGuru.id, 'aktif', '', guruId)}
        />
      )}

      {modalPegawai && (
        <ModalHubungkanPegawai
          akun={modalPegawai}
          teks={teks}
          onClose={() => setModalPegawai(null)}
          onSelesai={(pegawaiId) =>
            modalPegawai.status_akun === 'menunggu'
              ? ubahStatus(modalPegawai.id, 'aktif', '', null, pegawaiId)
              : hubungkanPegawaiSaja(modalPegawai, pegawaiId)
          }
        />
      )}

      {modalEdit && (
        <ModalEditAkun
          akun={modalEdit}
          isKantor={isKantor}
          teks={teks}
          onClose={() => setModalEdit(null)}
          onSimpan={handleSimpanEdit}
        />
      )}

      {modalPassword && (
        <ModalGantiPassword
          akun={modalPassword}
          memproses={prosesId === modalPassword.id}
          onClose={() => setModalPassword(null)}
          onSimpan={handleSimpanPassword}
        />
      )}
    </Layout>
  )
}

// Pembungkus semua modal. Di HP tampil sebagai "lembar bawah" (bottom sheet)
// yang menempel di dasar layar, bisa digulir bila isinya panjang, dan
// memperhitungkan area aman (poni/bilah gestur). Di layar lebar tetap
// kartu di tengah seperti semula.
function ModalShell({ children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center sm:px-4 z-50">
      <div
        className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 overflow-y-auto overscroll-contain"
        style={{
          maxHeight: '90dvh',
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Tombol tutup (X) dengan area sentuh yang cukup besar di HP
function TombolTutup({ onClose }) {
  return (
    <button
      onClick={onClose}
      aria-label="Tutup"
      className="w-10 h-10 -mr-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 touch-manipulation"
    >
      <X size={20} />
    </button>
  )
}

function ModalHubungkanGuru({ akun, onClose, onSelesai }) {
  const [daftarGuru, setDaftarGuru] = useState([])
  const [guruIdTerpilih, setGuruIdTerpilih] = useState('')
  const [loading, setLoading] = useState(true)
  const [memproses, setMemproses] = useState(false)
  const [mode, setMode] = useState('pilih') // 'pilih' | 'baru'

  useEffect(() => {
    async function muat() {
      // Guru di sekolah yang sama, yang BELUM terhubung ke akun profil manapun
      const { data: sudahTerhubung } = await supabase
        .from('profil')
        .select('guru_id')
        .not('guru_id', 'is', null)

      const idTerpakai = (sudahTerhubung || []).map((p) => p.guru_id)

      let query = supabase
        .from('guru')
        .select('id, nama_lengkap, nip, mata_pelajaran')
        .eq('sekolah_id', akun.sekolah_id)
        .order('nama_lengkap')

      const { data } = await query
      const belumTerhubung = (data || []).filter((g) => !idTerpakai.includes(g.id))
      setDaftarGuru(belumTerhubung)
      setLoading(false)
    }
    muat()
  }, [akun.sekolah_id])

  async function handleHubungkan() {
    if (!guruIdTerpilih) return
    setMemproses(true)
    onSelesai(guruIdTerpilih)
  }

  async function handleBuatBaru() {
    setMemproses(true)
    const { data: guruBaru, error } = await supabase
      .from('guru')
      .insert({
        nama_lengkap: akun.nama_lengkap_pendaftar,
        email: akun.email_pendaftar,
        sekolah_id: akun.sekolah_id,
        status: 'aktif',
      })
      .select('id')
      .single()

    setMemproses(false)
    if (error) {
      window.alert('Gagal membuat data guru baru: ' + error.message)
      return
    }
    onSelesai(guruBaru.id)
  }

  return (
    <ModalShell>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-slate-800">Hubungkan Akun Guru</h2>
        <TombolTutup onClose={onClose} />
      </div>
      <p className="text-xs text-slate-500 mb-4 break-words">
        {akun.nama_lengkap_pendaftar} ({akun.email_pendaftar}) perlu dihubungkan ke data Guru
        supaya muncul di Jadwal, Presensi, Nilai, dan fitur lain.
      </p>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg mb-4">
        <button
          onClick={() => setMode('pilih')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 md:py-2 rounded-md transition-colors touch-manipulation ${
            mode === 'pilih' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'
          }`}
        >
          <UserCheck size={14} /> Data Sudah Ada
        </button>
        <button
          onClick={() => setMode('baru')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 md:py-2 rounded-md transition-colors touch-manipulation ${
            mode === 'baru' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'
          }`}
        >
          <UserPlus size={14} /> Buat Baru
        </button>
      </div>

      {mode === 'pilih' ? (
        <>
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-4">Memuat data guru...</p>
          ) : daftarGuru.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Tidak ada data guru yang belum terhubung di sekolah ini. Gunakan tab "Buat Baru".
            </p>
          ) : (
            <select
              className={`${INPUT_MODAL} mb-4`}
              value={guruIdTerpilih}
              onChange={(e) => setGuruIdTerpilih(e.target.value)}
            >
              <option value="">-- Pilih Data Guru --</option>
              {daftarGuru.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama_lengkap} {g.nip ? `(NIP: ${g.nip})` : ''} {g.mata_pelajaran ? `- ${g.mata_pelajaran}` : ''}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleHubungkan}
            disabled={!guruIdTerpilih || memproses}
            className="w-full bg-blue-600 text-white text-sm font-medium py-3 md:py-2.5 rounded-lg disabled:opacity-50 touch-manipulation"
          >
            {memproses ? 'Memproses...' : 'Hubungkan & Setujui'}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-4">
            Data guru baru akan dibuat otomatis dari nama & email pendaftaran. Lengkapi NIP, mata
            pelajaran, dll nanti di halaman Data Guru.
          </p>
          <button
            onClick={handleBuatBaru}
            disabled={memproses}
            className="w-full bg-blue-600 text-white text-sm font-medium py-3 md:py-2.5 rounded-lg disabled:opacity-50 touch-manipulation"
          >
            {memproses ? 'Memproses...' : 'Buat Data Guru Baru & Setujui'}
          </button>
        </>
      )}
    </ModalShell>
  )
}

function ModalHubungkanPegawai({ akun, teks, onClose, onSelesai }) {
  const [daftarPegawai, setDaftarPegawai] = useState([])
  const [pegawaiIdTerpilih, setPegawaiIdTerpilih] = useState('')
  const [loading, setLoading] = useState(true)
  const [memproses, setMemproses] = useState(false)
  const [mode, setMode] = useState('pilih') // 'pilih' | 'baru'

  const sedangDiajukan = akun.status_akun === 'menunggu'

  useEffect(() => {
    async function muat() {
      // Pegawai kantor/puskesmas yang sama, yang BELUM terhubung ke akun profil manapun
      const { data: sudahTerhubung } = await supabase
        .from('profil')
        .select('pegawai_id')
        .not('pegawai_id', 'is', null)

      // PERBAIKAN: jangan kecualikan baris pegawai_kantor milik akun ini
      // SENDIRI. Kalau akun kantor sudah membuat baris pegawai_kantor sejak
      // pendaftaran (lihat Edge Function daftar-akun), baris itu otomatis
      // ikut daftar "sudah terhubung" (karena profil.pegawai_id-nya sudah
      // terisi), sehingga hilang dari dropdown dan admin terpaksa klik
      // "Buat Baru" — menghasilkan data pegawai dobel.
      const idTerpakai = (sudahTerhubung || [])
        .map((p) => p.pegawai_id)
        .filter((id) => id !== akun.pegawai_id)

      const { data } = await supabase
        .from('pegawai_kantor')
        .select('id, nama_lengkap, nip, jabatan')
        .eq('sekolah_id', akun.sekolah_id)
        .order('nama_lengkap')

      const belumTerhubung = (data || []).filter((p) => !idTerpakai.includes(p.id))
      setDaftarPegawai(belumTerhubung)
      setLoading(false)
    }
    muat()
  }, [akun.sekolah_id, akun.pegawai_id])

  async function handleHubungkan() {
    if (!pegawaiIdTerpilih) return
    setMemproses(true)
    onSelesai(pegawaiIdTerpilih)
  }

  async function handleBuatBaru() {
    setMemproses(true)
    const { data: pegawaiBaru, error } = await supabase
      .from('pegawai_kantor')
      .insert({
        nama_lengkap: akun.nama_lengkap_pendaftar,
        email: akun.email_pendaftar,
        sekolah_id: akun.sekolah_id,
        jabatan: akun.jabatan || 'pegawai',
        status: 'aktif',
      })
      .select('id')
      .single()

    setMemproses(false)
    if (error) {
      window.alert('Gagal membuat data pegawai baru: ' + error.message)
      return
    }
    onSelesai(pegawaiBaru.id)
  }

  return (
    <ModalShell>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-slate-800">Hubungkan Data Pegawai</h2>
        <TombolTutup onClose={onClose} />
      </div>
      <p className="text-xs text-slate-500 mb-4 break-words">
        {akun.nama_lengkap_pendaftar} ({akun.email_pendaftar}) perlu dihubungkan ke{' '}
        {teks.dataPegawai} supaya muncul di {teks.fitur}.
      </p>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg mb-4">
        <button
          onClick={() => setMode('pilih')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 md:py-2 rounded-md transition-colors touch-manipulation ${
            mode === 'pilih' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'
          }`}
        >
          <UserCheck size={14} /> Data Sudah Ada
        </button>
        <button
          onClick={() => setMode('baru')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 md:py-2 rounded-md transition-colors touch-manipulation ${
            mode === 'baru' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'
          }`}
        >
          <UserPlus size={14} /> Buat Baru
        </button>
      </div>

      {mode === 'pilih' ? (
        <>
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-4">Memuat data pegawai...</p>
          ) : daftarPegawai.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Tidak ada data pegawai yang belum terhubung di {teks.unit.toLowerCase()} ini. Gunakan
              tab "Buat Baru".
            </p>
          ) : (
            <select
              className={`${INPUT_MODAL} mb-4`}
              value={pegawaiIdTerpilih}
              onChange={(e) => setPegawaiIdTerpilih(e.target.value)}
            >
              <option value="">-- Pilih Data Pegawai --</option>
              {daftarPegawai.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_lengkap} {p.nip ? `(NIP: ${p.nip})` : ''} {p.jabatan ? `- ${p.jabatan}` : ''}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleHubungkan}
            disabled={!pegawaiIdTerpilih || memproses}
            className="w-full bg-blue-600 text-white text-sm font-medium py-3 md:py-2.5 rounded-lg disabled:opacity-50 touch-manipulation"
          >
            {memproses ? 'Memproses...' : sedangDiajukan ? 'Hubungkan & Setujui' : 'Hubungkan'}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-4">
            Data pegawai baru akan dibuat otomatis dari nama & email pendaftaran. Lengkapi NIP,
            jabatan, dll nanti di halaman Data Pegawai.
          </p>
          <button
            onClick={handleBuatBaru}
            disabled={memproses}
            className="w-full bg-blue-600 text-white text-sm font-medium py-3 md:py-2.5 rounded-lg disabled:opacity-50 touch-manipulation"
          >
            {memproses
              ? 'Memproses...'
              : sedangDiajukan
                ? 'Buat Data Pegawai Baru & Setujui'
                : 'Buat Data Pegawai Baru & Hubungkan'}
          </button>
        </>
      )}
    </ModalShell>
  )
}

function ModalEditAkun({ akun, isKantor, teks, onClose, onSimpan }) {
  const [nama, setNama] = useState(akun.nama_lengkap_pendaftar || '')
  const [email, setEmail] = useState(akun.email_pendaftar || '')
  const [jabatan, setJabatan] = useState(
    akun.jabatan || akun.role || (isKantor ? 'pegawai' : 'guru')
  )
  const [menyimpan, setMenyimpan] = useState(false)

  async function handleSimpan() {
    setMenyimpan(true)
    await onSimpan(akun.id, {
      nama_lengkap_pendaftar: nama,
      email_pendaftar: email,
      jabatan,
    })
    setMenyimpan(false)
  }

  return (
    <ModalShell>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800">Edit Data Akun</h2>
        <TombolTutup onClose={onClose} />
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Nama Lengkap</label>
          <input
            className={INPUT_MODAL}
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Email</label>
          <input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            className={INPUT_MODAL}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Catatan: mengubah email di sini hanya mengubah data tampilan, bukan email login akun.
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Jabatan</label>
          <select
            className={INPUT_MODAL}
            value={jabatan}
            onChange={(e) => setJabatan(e.target.value)}
          >
            {isKantor ? (
              <>
                <option value="pegawai">{teks.pegawai}</option>
                <option value="kepala_kantor">{teks.kepala}</option>
                <option value="admin">Admin</option>
                <option value="admin_utama">Admin Utama</option>
              </>
            ) : (
              <>
                <option value="guru">Guru</option>
                <option value="admin">Admin</option>
                <option value="kepala_sekolah">Kepala Sekolah</option>
                <option value="admin_utama">Admin Utama</option>
                <option value="orang_tua">Orang Tua/Wali</option>
                <option value="pegawai">Pegawai</option>
                <option value="kepala_kantor">Kepala Kantor</option>
              </>
            )}
          </select>
        </div>
      </div>

      <button
        onClick={handleSimpan}
        disabled={menyimpan || !nama || !email}
        className="w-full mt-5 bg-blue-600 text-white text-sm font-medium py-3 md:py-2.5 rounded-lg disabled:opacity-50 touch-manipulation"
      >
        {menyimpan ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>
    </ModalShell>
  )
}

// Modal ganti password langsung — memanggil Edge Function 'set-password-akun'
// (bukan mengirim email reset seperti tombol KeyRound). Dipakai saat pemilik
// akun tidak bisa diakses lewat email, atau admin ingin set password
// sementara secara langsung.
function ModalGantiPassword({ akun, memproses, onClose, onSimpan }) {
  const [password, setPassword] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [error, setError] = useState('')
  const [tampilkan, setTampilkan] = useState(false)

  function handleSimpan() {
    setError('')
    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }
    if (password !== konfirmasi) {
      setError('Konfirmasi password tidak sama.')
      return
    }
    onSimpan(akun, password)
  }

  return (
    <ModalShell>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-slate-800">Ganti Password Akun</h2>
        <TombolTutup onClose={onClose} />
      </div>
      <p className="text-xs text-slate-500 mb-4 break-words">
        Set password baru untuk{' '}
        <span className="font-medium text-slate-700">
          {akun.nama_lengkap_pendaftar || akun.email_pendaftar}
        </span>{' '}
        ({akun.email_pendaftar || 'tanpa email'}). Password akan berubah seketika — pastikan Anda
        memberitahu pemilik akun secara langsung.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Password Baru</label>
          <div className="relative">
            <input
              type={tampilkan ? 'text' : 'password'}
              autoComplete="new-password"
              className={`${INPUT_MODAL} pr-24`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
            />
            <button
              type="button"
              onClick={() => setTampilkan((v) => !v)}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-2 text-[11px] font-medium text-blue-600 touch-manipulation"
            >
              {tampilkan ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Konfirmasi Password</label>
          <input
            type={tampilkan ? 'text' : 'password'}
            autoComplete="new-password"
            className={INPUT_MODAL}
            value={konfirmasi}
            onChange={(e) => setKonfirmasi(e.target.value)}
            placeholder="Ulangi password baru"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
          {error}
        </p>
      )}

      <button
        onClick={handleSimpan}
        disabled={memproses || !password || !konfirmasi}
        className="w-full mt-5 flex items-center justify-center gap-2 bg-orange-600 text-white text-sm font-medium py-3 md:py-2.5 rounded-lg disabled:opacity-50 touch-manipulation"
      >
        {memproses ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
        {memproses ? 'Memproses...' : 'Ganti Password'}
      </button>
    </ModalShell>
  )
}

function StatusBadge({ status }) {
  const map = {
    menunggu: { label: 'Menunggu', cls: 'bg-amber-50 text-amber-600', icon: Clock3 },
    aktif: { label: 'Disetujui', cls: 'bg-green-50 text-green-600', icon: CheckCircle2 },
    ditolak: { label: 'Ditolak', cls: 'bg-red-50 text-red-600', icon: XCircle },
  }
  const item = map[status] || map.menunggu
  const Icon = item.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${item.cls}`}>
      <Icon size={12} /> {item.label}
    </span>
  )
}

function JabatanBadge({ jabatan, role, teks }) {
  const map = {
    guru: { label: 'Guru', cls: 'bg-blue-50 text-blue-600' },
    admin: { label: 'Admin', cls: 'bg-purple-50 text-purple-600' },
    kepala_sekolah: { label: 'Kepala Sekolah', cls: 'bg-indigo-50 text-indigo-600' },
    admin_utama: { label: 'Admin Utama', cls: 'bg-indigo-50 text-indigo-600' },
    orang_tua: { label: 'Orang Tua/Wali', cls: 'bg-emerald-50 text-emerald-600' },
    superadmin: { label: 'Superadmin', cls: 'bg-slate-800 text-white' },
    pegawai: { label: 'Pegawai', cls: 'bg-cyan-50 text-cyan-600' },
    kepala_kantor: { label: teks?.kepala || 'Kepala Kantor', cls: 'bg-amber-50 text-amber-600' },
  }
  const key = jabatan || role
  const item = map[key] || { label: key || '—', cls: 'bg-slate-100 text-slate-500' }
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${item.cls}`}>
      {item.label}
    </span>
  )
}
