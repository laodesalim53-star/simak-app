// src/components/DetailNilaiSiswaModal.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { MAPEL_IJAZAH } from "./IjazahPrintTemplate";
import DaftarNilaiKolektifPrintTemplate from "./DaftarNilaiKolektifPrintTemplate";
import { jumlahSemester, rataRataSemester, hitungNilaiAkhir, MAPEL_ALIASES } from "../utils/parseNilaiAsesmen";
import { X, Loader2, Save, Printer, Download } from "lucide-react";

const SEMESTER_KEYS = ["iv_1", "iv_2", "v_1", "v_2", "vi_1", "vi_2"];
const SEMESTER_LABELS = ["IV-I", "IV-II", "V-I", "V-II", "VI-I", "VI-II"];

// Bobot komponen nilai — HARUS sama persis dengan BOBOT_JENIS_NILAI di
// Rapor.jsx / RaporCetak.jsx, supaya angka yang ditarik ke sini konsisten
// dengan yang tampil di lembar rapor resmi. UH tidak dihitung.
const BOBOT_JENIS_NILAI = { Tugas: 0.2, UTS: 0.3, UAS: 0.5 };

// PENTING — SESUAIKAN DENGAN DATA ANDA:
// key di sini HARUS sama dengan m.key di MAPEL_IJAZAH. Isi array dengan
// SEMUA variasi nama yang mungkin dipakai di kolom mata_pelajaran tabel
// `nilai`/`capaian_mapel` (cek lewat: select distinct mata_pelajaran from nilai;)
// Nama m.label dari MAPEL_IJAZAH otomatis ikut dicoba juga, jadi array di
// bawah ini isi tambahan alias saja (boleh dikosongkan kalau nama sudah
// identik dengan label ijazah).
const ALIAS_MAPEL_RAPOR = {
  // contoh — ganti sesuai mapel_key & data asli Anda:
  // pend_agama: ["Pendidikan Agama dan Budi Pekerti", "PABP", "PAI"],
  // pkn: ["Pendidikan Pancasila", "PPKn"],
  // bhs_indonesia: ["Bahasa Indonesia"],
  // matematika: ["Matematika"],
  // ipa: ["IPAS", "Ilmu Pengetahuan Alam"],
  // ips: ["IPAS", "Ilmu Pengetahuan Sosial"],
  // sbdp: ["Seni Budaya dan Keterampilan", "SBdP", "Seni Musik", "Seni Rupa"],
  // pjok: ["PJOK", "Penjasorkes"],
  // bhs_inggris: ["Bahasa Inggris", "Mulok"],
};

function normalisasi(teks) {
  return String(teks || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cocokMapel(mapel, mataPelajaranRapor) {
  const kandidat = [mapel.label, ...(ALIAS_MAPEL_RAPOR[mapel.key] || [])].map(normalisasi);
  const target = normalisasi(mataPelajaranRapor);
  if (!target) return false;
  return kandidat.some((k) => k && (k === target || target.includes(k) || k.includes(target)));
}

// Sama seperti nilaiAkhirTertimbang di RaporCetak.jsx: kalau salah satu
// jenis (Tugas/UTS/UAS) belum ada nilainya, bobotnya ditiadakan lalu sisa
// bobot dinormalisasi ulang — bukan dianggap 0.
function nilaiAkhirTertimbang(perJenis) {
  let totalBerbobot = 0;
  let totalBobotTerpakai = 0;
  for (const [jenis, bobot] of Object.entries(BOBOT_JENIS_NILAI)) {
    const arr = perJenis[jenis];
    if (arr && arr.length > 0) {
      const rata = arr.reduce((a, b) => a + b, 0) / arr.length;
      totalBerbobot += rata * bobot;
      totalBobotTerpakai += bobot;
    }
  }
  if (totalBobotTerpakai === 0) return null;
  return totalBerbobot / totalBobotTerpakai;
}

function kosong() {
  const o = {};
  SEMESTER_KEYS.forEach((k) => (o[k] = ""));
  o.nilai_asesmen = "";
  return o;
}

// Tahun ajaran kelas IV/V dihitung mundur dari Tahun Pelajaran kelas VI
// yang sedang aktif di halaman Nilai Asesmen (mis. VI = 2025/2026).
function tahunAjaranPerSemester(tahunPelajaranVI) {
  const bagian = String(tahunPelajaranVI || "").split("/");
  const tahunVI = parseInt(bagian[0], 10);
  if (isNaN(tahunVI)) return null;
  const buat = (offsetTahun) => `${tahunVI - offsetTahun}/${tahunVI - offsetTahun + 1}`;
  return {
    iv_1: { tahun_ajaran: buat(2), semester: "Ganjil" },
    iv_2: { tahun_ajaran: buat(2), semester: "Genap" },
    v_1: { tahun_ajaran: buat(1), semester: "Ganjil" },
    v_2: { tahun_ajaran: buat(1), semester: "Genap" },
    vi_1: { tahun_ajaran: buat(0), semester: "Ganjil" },
    vi_2: { tahun_ajaran: buat(0), semester: "Genap" },
  };
}

export default function DetailNilaiSiswaModal({ siswa, sekolah, tahunPelajaran, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState({});
  const [menarik, setMenarik] = useState(false);
  const [infoTarik, setInfoTarik] = useState(null); // { terisi: [...], kosong: [...] }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("nilai_rapor_semester")
      .select("*")
      .eq("siswa_id", siswa.id)
      .eq("tahun_pelajaran", tahunPelajaran);
    const map = {};
    MAPEL_IJAZAH.forEach((m) => {
      const existing = (data || []).find((d) => d.mapel_key === m.key);
      map[m.key] = existing
        ? {
            iv_1: existing.iv_1 ?? "",
            iv_2: existing.iv_2 ?? "",
            v_1: existing.v_1 ?? "",
            v_2: existing.v_2 ?? "",
            vi_1: existing.vi_1 ?? "",
            vi_2: existing.vi_2 ?? "",
            nilai_asesmen: existing.nilai_asesmen ?? "",
          }
        : kosong();
    });
    setRows(map);
    setLoading(false);
  }

  function ubah(mapelKey, field, value) {
    setSaved(false);
    setRows((prev) => ({
      ...prev,
      [mapelKey]: { ...prev[mapelKey], [field]: value },
    }));
  }

  // ---------- TARIK DARI NILAI RAPOR ----------
  // Mengambil data dari tabel `nilai` (mentah, dihitung dengan bobot
  // Tugas/UTS/UAS) + `capaian_mapel` (nilai_akhir manual, kalau sudah
  // difinalisasi wali kelas — ini yang diprioritaskan, sama seperti pola
  // di RaporCetak.jsx) untuk 6 periode semester (IV-I s/d VI-II), lalu
  // mengisi kolom iv_1..vi_2 di tabel di atas. TIDAK menyentuh kolom
  // "Nilai Asesmen" dan TIDAK langsung menyimpan ke database — Anda tetap
  // perlu cek lalu klik "Simpan Nilai" sendiri.
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

        // Kelompokkan nilai mentah per mata_pelajaran + kompetensi + jenis
        const rekap = {};
        (nilaiRows || []).forEach((n) => {
          if (!rekap[n.mata_pelajaran]) {
            rekap[n.mata_pelajaran] = {
              Pengetahuan: { Tugas: [], UH: [], UTS: [], UAS: [] },
              Keterampilan: { Tugas: [], UH: [], UTS: [], UAS: [] },
            };
          }
          const kk = n.kompetensi === "Keterampilan" ? "Keterampilan" : "Pengetahuan";
          const jj = ["Tugas", "UH", "UTS", "UAS"].includes(n.jenis) ? n.jenis : "Tugas";
          rekap[n.mata_pelajaran][kk][jj].push(n.nilai);
        });

        // Untuk tiap mapel ijazah, cari mata_pelajaran yang cocok di rekap
        MAPEL_IJAZAH.forEach((m) => {
          const namaCocok = Object.keys(rekap).find((mp) => cocokMapel(m, mp));
          if (!namaCocok) {
            kosongList.push(`${m.label} — ${SEMESTER_LABELS[SEMESTER_KEYS.indexOf(semesterKey)]}`);
            return;
          }

          const capPengetahuan = (capaianRows || []).find(
            (c) => cocokMapel(m, c.mata_pelajaran) && c.jenis === "Pengetahuan"
          );
          const capKeterampilan = (capaianRows || []).find(
            (c) => cocokMapel(m, c.mata_pelajaran) && c.jenis === "Keterampilan"
          );

          const nilaiPengetahuan =
            capPengetahuan?.nilai_akhir ?? nilaiAkhirTertimbang(rekap[namaCocok].Pengetahuan);
          const nilaiKeterampilan =
            capKeterampilan?.nilai_akhir ?? nilaiAkhirTertimbang(rekap[namaCocok].Keterampilan);

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
      setInfoTarik({ terisi: terisi.length, kosong: kosongList });
    } catch (err) {
      setError("Gagal menarik nilai rapor: " + err.message);
    } finally {
      setMenarik(false);
    }
  }

  const detailMap = useMemo(() => {
    const m = {};
    MAPEL_IJAZAH.forEach((mp) => {
      const r = rows[mp.key] || kosong();
      m[mp.key] = {
        semester: SEMESTER_KEYS.map((k) => (r[k] === "" ? null : Number(r[k]))),
        nilaiAsesmen: r.nilai_asesmen === "" ? null : Number(r.nilai_asesmen),
      };
    });
    return m;
  }, [rows]);

  async function simpan() {
    setSaving(true);
    setError("");
    try {
      const rowsDetail = MAPEL_IJAZAH.map((m) => {
        const r = rows[m.key] || kosong();
        return {
          siswa_id: siswa.id,
          tahun_pelajaran: tahunPelajaran,
          mapel_key: m.key,
          iv_1: r.iv_1 === "" ? null : Number(r.iv_1),
          iv_2: r.iv_2 === "" ? null : Number(r.iv_2),
          v_1: r.v_1 === "" ? null : Number(r.v_1),
          v_2: r.v_2 === "" ? null : Number(r.v_2),
          vi_1: r.vi_1 === "" ? null : Number(r.vi_1),
          vi_2: r.vi_2 === "" ? null : Number(r.vi_2),
          nilai_asesmen: r.nilai_asesmen === "" ? null : Number(r.nilai_asesmen),
        };
      });
      const { error: detailError } = await supabase
        .from("nilai_rapor_semester")
        .upsert(rowsDetail, { onConflict: "siswa_id,tahun_pelajaran,mapel_key" });
      if (detailError) throw detailError;

      const rowIjazah = {
        siswa_id: siswa.id,
        tahun_pelajaran: tahunPelajaran,
        ...MAPEL_ALIASES.reduce((acc, m) => {
          const d = detailMap[m.key];
          const nilaiAkhir = hitungNilaiAkhir(d.semester, d.nilaiAsesmen);
          acc[m.key] = nilaiAkhir !== null ? Math.round(nilaiAkhir * 100) / 100 : null;
          return acc;
        }, {}),
      };
      const { error: ijazahError } = await supabase
        .from("nilai_ijazah")
        .upsert([rowIjazah], { onConflict: "siswa_id,tahun_pelajaran" });
      if (ijazahError) throw ijazahError;

      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Detail Nilai — {siswa.nama_lengkap}</h2>
            <p className="text-sm text-ink-700/60">
              NIS {siswa.nis || "-"} · NISN {siswa.nisn || "-"} · Tahun Pelajaran {tahunPelajaran}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <p>Memuat...</p>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <button className="btn-secondary" onClick={tarikDariRapor} disabled={menarik}>
                {menarik ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Tarik dari Nilai Rapor
              </button>
              {infoTarik && (
                <span className="text-xs text-ink-700/60">
                  {infoTarik.terisi} sel terisi
                  {infoTarik.kosong.length > 0 && `, ${infoTarik.kosong.length} sel tidak ditemukan datanya`}
                </span>
              )}
            </div>
            {infoTarik?.kosong?.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                Tidak ditemukan data rapor untuk: {infoTarik.kosong.join(", ")}. Isi manual atau cek nama mata
                pelajaran di ALIAS_MAPEL_RAPOR.
              </div>
            )}

            <div className="card overflow-x-auto mb-4">
              <table className="table-shell text-xs">
                <thead>
                  <tr>
                    <th>Mata Pelajaran</th>
                    {SEMESTER_LABELS.map((l) => (
                      <th key={l} className="text-right">{l}</th>
                    ))}
                    <th className="text-right">Jumlah</th>
                    <th className="text-right">Rata²</th>
                    <th className="text-right">Nilai Asesmen</th>
                    <th className="text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {MAPEL_IJAZAH.map((m) => {
                    const r = rows[m.key] || kosong();
                    const d = detailMap[m.key];
                    const rata = rataRataSemester(d.semester);
                    const nilaiAkhir = hitungNilaiAkhir(d.semester, d.nilaiAsesmen);
                    return (
                      <tr key={m.key}>
                        <td className="whitespace-nowrap">{m.label}</td>
                        {SEMESTER_KEYS.map((k) => (
                          <td key={k} className="text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              className="w-14 text-right rounded border border-ink-900/15 px-1 py-1 text-xs"
                              value={r[k]}
                              onChange={(e) => ubah(m.key, k, e.target.value)}
                            />
                          </td>
                        ))}
                        <td className="text-right font-semibold">{jumlahSemester(d.semester).toFixed(2)}</td>
                        <td className="text-right font-semibold">{rata.toFixed(2)}</td>
                        <td className="text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="w-14 text-right rounded border border-ink-900/15 px-1 py-1 text-xs"
                            value={r.nilai_asesmen}
                            onChange={(e) => ubah(m.key, "nilai_asesmen", e.target.value)}
                          />
                        </td>
                        <td className="text-right font-semibold">
                          {nilaiAkhir === null ? "-" : nilaiAkhir.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <div className="flex items-center gap-3 mb-6">
              <button className="btn-primary" onClick={simpan} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Simpan Nilai
              </button>
              <button className="btn-secondary" onClick={() => window.print()}>
                <Printer size={16} /> Cetak Daftar Nilai Kolektif
              </button>
              {saved && <span className="text-sm text-sage-600">Tersimpan.</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700/60 mb-2">Pratinjau Cetak</label>
              <div className="border border-ink-900/10 rounded-lg overflow-auto" style={{ maxHeight: "70vh" }}>
                <DaftarNilaiKolektifPrintTemplate
                  siswa={siswa}
                  sekolah={sekolah}
                  tahunPelajaran={tahunPelajaran}
                  detailMap={detailMap}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
