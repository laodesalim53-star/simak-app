async function simpanPasien(e) {
    e.preventDefault()
    setPesan(null)

    if (!form.nik || form.nik.length !== 16) {
      setPesan({ tipe: 'error', teks: 'NIK harus 16 digit sesuai KTP.' })
      return
    }
    if (!foto) {
      setPesan({ tipe: 'error', teks: 'Ambil foto KTP dulu sebagai bukti verifikasi.' })
      return
    }
    if (!konfirmasiCocok) {
      setPesan({ tipe: 'error', teks: 'Centang konfirmasi bahwa foto KTP sudah dicocokkan dengan wajah pasien.' })
      return
    }

    setMenyimpan(true)
    try {
      // profil.id selalu undefined (loadProfil() tidak select kolom id dari `profil`);
      // id user yang benar diambil dari sesi auth, bukan dari objek profil.
      const {
        data: { user },
        error: errUser,
      } = await supabase.auth.getUser()
      if (errUser || !user) throw errUser || new Error('Sesi tidak valid, silakan login ulang.')

      const blobUnggah = versiAktif(foto).blob
      const ext = blobUnggah.type === 'image/png' ? 'png' : 'jpg'
      const namaFile = `${profil.sekolah_id}/${form.nik}-${Date.now()}.${ext}`

      const { error: errUpload } = await supabase.storage
        .from('ktp-pasien')
        .upload(namaFile, blobUnggah, { contentType: blobUnggah.type || 'image/jpeg' })
      if (errUpload) throw errUpload

      const { error: errInsert } = await supabase.from('pasien').insert({
        ...form,
        sekolah_id: profil.sekolah_id,
        foto_ktp_url: namaFile,
        foto_ktp_verified: true,
        foto_ktp_verified_by: user.id,
        foto_ktp_verified_at: new Date().toISOString(),
        created_by: user.id,
      })
      if (errInsert) throw errInsert

      setPesan({ tipe: 'sukses', teks: 'Pasien berhasil didaftarkan.' })
      setForm(KOSONG)
      ulangFoto()
      onTersimpan?.()
    } catch (err) {
      const teks = err.message?.includes('duplicate')
        ? 'NIK ini sudah terdaftar di puskesmas ini.'
        : 'Gagal menyimpan data pasien. Coba lagi.'
      setPesan({ tipe: 'error', teks })
    } finally {
      setMenyimpan(false)
    }
  }
