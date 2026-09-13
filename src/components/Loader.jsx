async function loadProfil(userId) {
  const requestId = ++profilRequestIdRef.current

  if (!userId) {
    if (requestId === profilRequestIdRef.current) setProfil(null)
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
  // Nama instansi (sekolah ATAU kantor) — diambil dari relasi sekolah_id,
  // dipakai Loader.jsx untuk menyapa sesuai institusi masing-masing user.
  const namaSekolah = data.sekolah?.nama_sekolah || null

  if (jenisOrganisasi === 'kantor' && data.pegawai_id) {
    const { data: pegawai } = await supabase
      .from('pegawai_kantor')
      .select('nama_lengkap, foto_profil_path')
      .eq('id', data.pegawai_id)
      .maybeSingle()

    if (requestId !== profilRequestIdRef.current) return

    setProfil({
      ...data,
      jenis_organisasi: jenisOrganisasi,
      nama_sekolah: namaSekolah,
      nama_lengkap: pegawai?.nama_lengkap || data.nama_lengkap_pendaftar,
      foto_profil_path: pegawai?.foto_profil_path || data.foto_profil_path,
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
