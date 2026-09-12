// src/components/DetailNilaiSiswaModal.jsx (bagian yang berubah saja, sisanya sama seperti versi sebelumnya)
import { daftarKeyResmiUntukNamaMapel } from "../utils/mapelIjazahAlias";

// ... (BOBOT_JENIS_NILAI, kosong(), tahunAjaranPerSemester(), nilaiAkhirTertimbang() tetap sama seperti versi sebelumnya)

async function tarikDariRapor() {
  const periode = tahunAjaranPerSemester(tahunPelajaran);
  if (!periode) {
    setError("Format Tahun Pelajaran tidak valid, tidak bisa menghitung tahun ajaran IV/V.");
    return;
  }
  if (
    !window.confirm(
      "Ini akan MENIMPA kolom nilai semester (IV-I s/d VI-II) di bawah dengan data dari halaman Rapor. Nilai Asesmen tidak ikut berubah. Lanjutkan?"
    )
  ) {
    return;
  }

  setMenarik(true);
  setError("");
  const terisi = [];
  const kosongList = [];
  const tidakDikenalGlobal = new Set();

  try {
    const rowsBaru = { ...rows };
    MAPEL_IJAZAH.forEach((m) => {
      rowsBaru[m.key] = { ...(rowsBaru[m.key] || kosong()) };
    });

    for (const semesterKey of SEMESTER_KEYS) {
      const { tahun_ajaran, semester } = periode[semesterKey];

      const [{ data: nilaiRows }, { data: capaianRows }] = await Promise.all([
        supabase
          .from("nilai")
          .select("mata_pelajaran, kompetensi, jenis, nilai")
          .eq("siswa_id", siswa.id)
          .eq("semester", semester)
          .eq("tahun_ajaran", tahun_ajaran),
        supabase
          .from("capaian_mapel")
          .select("mata_pelajaran, jenis, nilai_akhir")
          .eq("siswa_id", siswa.id)
          .eq("semester", semester)
          .eq("tahun_ajaran", tahun_ajaran),
      ]);

      // Rekap per KEY RESMI ijazah (bukan per nama mentah lagi) --
      // 1 nama mentah bisa memetakan ke >1 key resmi (kasus IPAS -> ipa+ips).
      // Nama yang tidak dikenali dicatat, TIDAK ditebak.
      const rekapPerKey = {}; // key -> { Pengetahuan: {...}, Keterampilan: {...} }
      (nilaiRows || []).forEach((n) => {
        const keyList = daftarKeyResmiUntukNamaMapel(n.mata_pelajaran);
        if (keyList.length === 0) {
          tidakDikenalGlobal.add(n.mata_pelajaran);
          return;
        }
        keyList.forEach((key) => {
          if (!rekapPerKey[key]) {
            rekapPerKey[key] = {
              Pengetahuan: { Tugas: [], UH: [], UTS: [], UAS: [] },
              Keterampilan: { Tugas: [], UH: [], UTS: [], UAS: [] },
            };
          }
          const kk = n.kompetensi === "Keterampilan" ? "Keterampilan" : "Pengetahuan";
          const jj = ["Tugas", "UH", "UTS", "UAS"].includes(n.jenis) ? n.jenis : "Tugas";
          rekapPerKey[key][kk][jj].push(n.nilai);
        });
      });

      const capaianPerKey = {}; // key -> { Pengetahuan: nilai_akhir, Keterampilan: nilai_akhir }
      (capaianRows || []).forEach((c) => {
        const keyList = daftarKeyResmiUntukNamaMapel(c.mata_pelajaran);
        if (keyList.length === 0) {
          tidakDikenalGlobal.add(c.mata_pelajaran);
          return;
        }
        keyList.forEach((key) => {
          if (!capaianPerKey[key]) capaianPerKey[key] = {};
          if (c.jenis === "Pengetahuan" || c.jenis === "Keterampilan") {
            capaianPerKey[key][c.jenis] = c.nilai_akhir;
          }
        });
      });

      MAPEL_IJAZAH.forEach((m) => {
        const rr = rekapPerKey[m.key];
        const cap = capaianPerKey[m.key] || {};
        if (!rr) {
          kosongList.push(`${m.label} — ${SEMESTER_LABELS[SEMESTER_KEYS.indexOf(semesterKey)]}`);
          return;
        }
        const nilaiPengetahuan = cap.Pengetahuan ?? nilaiAkhirTertimbang(rr.Pengetahuan);
        const nilaiKeterampilan = cap.Keterampilan ?? nilaiAkhirTertimbang(rr.Keterampilan);
        const dua = [nilaiPengetahuan, nilaiKeterampilan].filter((v) => v !== null && v !== undefined);
        if (dua.length === 0) {
          kosongList.push(`${m.label} — ${SEMESTER_LABELS[SEMESTER_KEYS.indexOf(semesterKey)]}`);
          return;
        }
        const gabungan = dua.reduce((a, b) => a + Number(b), 0) / dua.length;
        rowsBaru[m.key][semesterKey] = Math.round(gabungan * 100) / 100;
        terisi.push(`${m.label} — ${SEMESTER_LABELS[SEMESTER_KEYS.indexOf(semesterKey)]}`);
      });
    }

    setRows(rowsBaru);
    setSaved(false);
    setInfoTarik({
      terisi: terisi.length,
      kosong: kosongList,
      tidakDikenal: [...tidakDikenalGlobal],
    });
  } catch (err) {
    setError("Gagal menarik nilai rapor: " + err.message);
  } finally {
    setMenarik(false);
  }
}
