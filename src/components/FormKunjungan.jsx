const simpanKunjungan = async (e) => {
    e.preventDefault();
    setMenyimpan(true);
    setPesan(null);

    // profil.id selalu undefined; id user diambil dari sesi auth.
    const {
      data: { user },
      error: errUser,
    } = await supabase.auth.getUser();
    if (errUser || !user) {
      setMenyimpan(false);
      setPesan({ tipe: "error", teks: "Sesi tidak valid, silakan login ulang." });
      return;
    }

    const { error } = await supabase.from("kunjungan").insert({
      ...form,
      sekolah_id: profil.sekolah_id,
      pasien_id: pasien.id,
      petugas_id: user.id,
      berat_badan: form.berat_badan ? Number(form.berat_badan) : null,
      tinggi_badan: form.tinggi_badan ? Number(form.tinggi_badan) : null,
      suhu: form.suhu ? Number(form.suhu) : null,
      lingkar_lengan: form.lingkar_lengan ? Number(form.lingkar_lengan) : null,
      usia_kehamilan_minggu: form.usia_kehamilan_minggu
        ? Number(form.usia_kehamilan_minggu)
        : null,
    });

    setMenyimpan(false);
    if (error) {
      console.error(error);
      setPesan({ tipe: "error", teks: "Gagal menyimpan kunjungan." });
      return;
    }

    setForm(KOSONG);
    onSelesai?.();
  };
