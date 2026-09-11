import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import BebanMengajarPrintTemplate from "./BebanMengajarPrintTemplate";
import {
  exportBebanMengajarToPDF,
  exportBebanMengajarToDocx,
} from "../utils/bebanMengajarExport";

const STATUS_OPTIONS = ["PNS", "PPPK", "Honorer"];

function jumlahJamMengajar(row) {
  return (
    Number(row.kelas_1 || 0) +
    Number(row.kelas_2 || 0) +
    Number(row.kelas_3 || 0) +
    Number(row.kelas_4 || 0) +
    Number(row.kelas_5 || 0) +
    Number(row.kelas_6 || 0) +
    Number(row.mengajar_sekolah_lain || 0)
  );
}

function bebanKeseluruhan(row) {
  return jumlahJamMengajar(row) + Number(row.tugas_tambahan_jam || 0);
}

// Ubah nilai "tingkat" dari tabel kelas (bisa berupa "1".."6" atau sudah
// berupa angka romawi "I".."VI") menjadi label angka romawi yang konsisten
// dengan format "Wali Kelas VI" yang sudah dipakai di form ini.
const ROMAWI = ["I", "II", "III", "IV", "V", "VI"];
function tingkatToRomawi(tingkat) {
  const t = String(tingkat || "").trim();
  const n = Number(t);
  if (Number.isInteger(n) && n >= 1 && n <= 6) return ROMAWI[n - 1];
  return t.toUpperCase();
}

// Ubah nilai "tingkat" jadi angka 1-6 (dipakai untuk tahu kolom kelas_1..
// kelas_6 mana yang harus diisi otomatis untuk guru kelas bersangkutan).
function tingkatToAngka(tingkat) {
  const t = String(tingkat || "").trim();
  const n = Number(t);
  if (Number.isInteger(n) && n >= 1 && n <= 6) return n;
  const idx = ROMAWI.indexOf(t.toUpperCase());
  return idx === -1 ? null : idx + 1;
}

export default function BebanMengajarForm({ sekolah }) {
  // Pakai isAdmin dari AuthContext (sudah mencakup admin/admin_utama/superadmin
  // dan role lain yang dianggap admin di seluruh app) — bukan query manual
  // yang sebelumnya cuma cocok untuk role === "admin" persis, sehingga
  // superadmin ikut ditolak akses.
  const { isAdmin } = useAuth();

  const [nomorSk, setNomorSk] = useState("");
  const [tanggalSk, setTanggalSk] = useState(new Date().toISOString().slice(0, 10));
  const [tempatDitetapkan, setTempatDitetapkan] = useState("Waria");
  const [tahunAjaran, setTahunAjaran] = useState("");
  const [semester, setSemester] = useState("I DAN II");

  const [rows, setRows] = useState([]); // gabungan data guru + input beban mengajar
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [skTersimpan, setSkTersimpan] = useState(null);
  const printRef = useRef(null);

  // guru_id -> "Wali Kelas III" (atau gabungan kalau satu guru jadi wali
  // lebih dari satu kelas), diambil dari tabel kelas.wali_kelas_id
  const [waliKelasMap, setWaliKelasMap] = useState({});
  // guru_id -> [1,3,...] daftar angka kelas (1-6) tempat guru itu jadi wali,
  // dipakai untuk otomatis isi 24 jam di kolom kelas_1..kelas_6 yang sesuai
  const [waliKelasAngkaMap, setWaliKelasAngkaMap] = useState({});

  useEffect(() => {
    async function loadGuru() {
      const { data, error } = await supabase
        .from("guru")
        .select(
          "id, nip, nama_lengkap, mata_pelajaran, status, status_kepegawaian, pangkat_golongan"
        )
        .eq("status", "aktif")
        .order("nama_lengkap", { ascending: true });

      if (error) {
        console.error("Gagal memuat data guru:", error);
        setLoadError("Gagal memuat daftar guru: " + error.message);
        return;
      }

      // Kepala Sekolah selalu ditaruh di baris nomor 1, sisanya urut abjad nama
      const sorted = [...(data || [])].sort((a, b) => {
        const aKS = (a.mata_pelajaran || "").toLowerCase().includes("kepala sekolah");
        const bKS = (b.mata_pelajaran || "").toLowerCase().includes("kepala sekolah");
        if (aKS && !bKS) return -1;
        if (!aKS && bKS) return 1;
        return a.nama_lengkap.localeCompare(b.nama_lengkap);
      });

      setRows(
        sorted.map((g, idx) => {
          const isKepsek = (g.mata_pelajaran || "").toLowerCase().includes("kepala sekolah");
          return {
            guru_id: g.id,
            nip: g.nip,
            nama_lengkap: g.nama_lengkap,
            pangkat_golongan: g.pangkat_golongan || "",
            status_kepegawaian: g.status_kepegawaian || "",
            jabatan: g.mata_pelajaran || "",
            kelas_1: 0,
            kelas_2: 0,
            kelas_3: 0,
            kelas_4: 0,
            kelas_5: 0,
            kelas_6: 0,
            mengajar_sekolah_lain: 0,
            tugas_tambahan: "",
            // Kepala Sekolah otomatis diberi tugas tambahan 16 jam — tetap
            // bisa diedit manual lewat kolom "Jam TT" seperti biasa.
            tugas_tambahan_jam: isKepsek ? 16 : 0,
            keterangan: "",
            urutan: idx + 1,
          };
        })
      );
    }
    loadGuru();
  }, []);

  // Muat data wali kelas (tabel kelas.wali_kelas_id) untuk sekolah & Tahun
  // Pelajaran yang sedang diisi di form. Dijalankan ulang tiap kali Tahun
  // Pelajaran diketik/diubah, karena wali kelas bisa beda tiap tahun ajaran.
  useEffect(() => {
    async function loadWaliKelas() {
      if (!sekolah?.sekolah_id || !tahunAjaran.trim()) {
        setWaliKelasMap({});
        return;
      }
      const { data, error } = await supabase
        .from("kelas")
        .select("wali_kelas_id, tingkat")
        .eq("sekolah_id", sekolah.sekolah_id)
        .eq("tahun_ajaran", tahunAjaran.trim())
        .not("wali_kelas_id", "is", null);

      if (error) {
        console.error("Gagal memuat data wali kelas:", error);
        return;
      }

      const map = {};
      const angkaMap = {};
      (data || []).forEach((k) => {
        if (!k.wali_kelas_id) return;
        const label = `Wali Kelas ${tingkatToRomawi(k.tingkat)}`;
        map[k.wali_kelas_id] = map[k.wali_kelas_id]
          ? `${map[k.wali_kelas_id]}, ${label}`
          : label;

        const angka = tingkatToAngka(k.tingkat);
        if (angka) {
          angkaMap[k.wali_kelas_id] = angkaMap[k.wali_kelas_id]
            ? [...angkaMap[k.wali_kelas_id], angka]
            : [angka];
        }
      });
      setWaliKelasMap(map);
      setWaliKelasAngkaMap(angkaMap);
    }
    loadWaliKelas();
  }, [sekolah?.sekolah_id, tahunAjaran]);

  // Isi otomatis kolom "Tugas Tambahan" (label wali kelas) DAN kolom
  // kelas_1..kelas_6 (24 jam) untuk guru kelas yang tercatat sebagai wali
  // kelas — HANYA kalau kolomnya masih kosong/0, supaya tidak menimpa
  // perubahan manual yang sudah dilakukan user. Tetap bisa diedit setelahnya.
  useEffect(() => {
    if (Object.keys(waliKelasMap).length === 0 && Object.keys(waliKelasAngkaMap).length === 0) return;
    setRows((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        let row = r;

        const label = waliKelasMap[r.guru_id];
        if (label && !row.tugas_tambahan) {
          changed = true;
          row = { ...row, tugas_tambahan: label };
        }

        const daftarKelas = waliKelasAngkaMap[r.guru_id];
        if (daftarKelas) {
          daftarKelas.forEach((n) => {
            const field = `kelas_${n}`;
            if (Number(row[field]) === 0) {
              changed = true;
              row = { ...row, [field]: 24 };
            }
          });
        }

        return row;
      });
      return changed ? next : prev;
    });
  }, [waliKelasMap, waliKelasAngkaMap, rows.length]);

  function updateRow(guruId, field, value) {
    setRows((prev) =>
      prev.map((r) => (r.guru_id === guruId ? { ...r, [field]: value } : r))
    );
  }

  const totalPerKolom = rows.reduce(
    (acc, r) => {
      acc.kelas_1 += Number(r.kelas_1 || 0);
      acc.kelas_2 += Number(r.kelas_2 || 0);
      acc.kelas_3 += Number(r.kelas_3 || 0);
      acc.kelas_4 += Number(r.kelas_4 || 0);
      acc.kelas_5 += Number(r.kelas_5 || 0);
      acc.kelas_6 += Number(r.kelas_6 || 0);
      acc.mengajar_sekolah_lain += Number(r.mengajar_sekolah_lain || 0);
      acc.jumlah += jumlahJamMengajar(r);
      acc.tugas_tambahan_jam += Number(r.tugas_tambahan_jam || 0);
      acc.beban += bebanKeseluruhan(r);
      return acc;
    },
    {
      kelas_1: 0,
      kelas_2: 0,
      kelas_3: 0,
      kelas_4: 0,
      kelas_5: 0,
      kelas_6: 0,
      mengajar_sekolah_lain: 0,
      jumlah: 0,
      tugas_tambahan_jam: 0,
      beban: 0,
    }
  );

  async function handleSimpanDanGenerate() {
    if (!nomorSk.trim() || !tahunAjaran.trim()) {
      alert("Nomor SK dan Tahun Pelajaran wajib diisi.");
      return;
    }
    if (rows.length === 0) {
      alert("Tidak ada data guru aktif untuk dimasukkan.");
      return;
    }
    if (saving) return;
    setSaving(true);

    // Cek duplikat nomor SK
    const { data: existing } = await supabase
      .from("sk_beban_mengajar")
      .select("id")
      .eq("nomor_sk", nomorSk.trim())
      .maybeSingle();

    if (existing) {
      setSaving(false);
      alert("Nomor SK ini sudah pernah digunakan. Gunakan nomor lain.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    // 1) Simpan status_kepegawaian & jabatan terbaru ke tabel guru (biar tersimpan untuk SK berikutnya)
    for (const r of rows) {
      if (r.status_kepegawaian) {
        await supabase
          .from("guru")
          .update({ status_kepegawaian: r.status_kepegawaian })
          .eq("id", r.guru_id);
      }
    }

    // 2) Simpan SK induk
    const { data: sk, error: skError } = await supabase
      .from("sk_beban_mengajar")
      .insert({
        nomor_sk: nomorSk.trim(),
        tanggal_sk: tanggalSk,
        tempat_ditetapkan: tempatDitetapkan,
        tahun_ajaran: tahunAjaran.trim(),
        semester,
        dibuat_oleh: userData?.user?.id,
      })
      .select()
      .single();

    if (skError) {
      setSaving(false);
      alert("Gagal menyimpan SK: " + skError.message);
      return;
    }

    // 3) Simpan rincian beban mengajar
    // Kolom angka wajib dikirim sebagai integer — field yang dikosongkan user
    // (string "") harus dijadikan 0 dulu, kalau tidak Postgres menolak insert
    // dengan error "invalid input syntax for type integer".
    const angka = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const payload = rows.map((r) => ({
      sk_id: sk.id,
      guru_id: r.guru_id,
      jabatan: r.jabatan,
      kelas_1: angka(r.kelas_1),
      kelas_2: angka(r.kelas_2),
      kelas_3: angka(r.kelas_3),
      kelas_4: angka(r.kelas_4),
      kelas_5: angka(r.kelas_5),
      kelas_6: angka(r.kelas_6),
      mengajar_sekolah_lain: angka(r.mengajar_sekolah_lain),
      tugas_tambahan: r.tugas_tambahan,
      tugas_tambahan_jam: angka(r.tugas_tambahan_jam),
      keterangan: r.keterangan,
      urutan: r.urutan,
    }));

    const { error: rincianError } = await supabase
      .from("beban_mengajar")
      .insert(payload);

    setSaving(false);

    if (rincianError) {
      alert("SK tersimpan, tapi rincian beban mengajar gagal: " + rincianError.message);
      return;
    }

    setSkTersimpan({ ...sk, rows });
  }

  if (!isAdmin) {
    return (
      <p className="text-sm text-gray-500 italic">
        Fitur Generate Beban Mengajar hanya bisa diakses oleh admin.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="Nomor SK (mis. 421.2/038/07/2026)"
          value={nomorSk}
          onChange={(e) => setNomorSk(e.target.value)}
        />
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={tanggalSk}
          onChange={(e) => setTanggalSk(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Tahun Pelajaran (mis. 2026/2027)"
          value={tahunAjaran}
          onChange={(e) => setTahunAjaran(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Tempat ditetapkan (mis. Waria)"
          value={tempatDitetapkan}
          onChange={(e) => setTempatDitetapkan(e.target.value)}
        />
      </div>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">No</th>
              <th className="border px-2 py-1">Nama / NIP / Pangkat-Gol</th>
              <th className="border px-2 py-1">Status</th>
              <th className="border px-2 py-1">Jabatan</th>
              <th className="border px-2 py-1">I</th>
              <th className="border px-2 py-1">II</th>
              <th className="border px-2 py-1">III</th>
              <th className="border px-2 py-1">IV</th>
              <th className="border px-2 py-1">V</th>
              <th className="border px-2 py-1">VI</th>
              <th className="border px-2 py-1">Sklh Lain</th>
              <th className="border px-2 py-1">Jml Jam</th>
              <th className="border px-2 py-1">Tugas Tambahan</th>
              <th className="border px-2 py-1">Jam TT</th>
              <th className="border px-2 py-1">Beban</th>
              <th className="border px-2 py-1">Ket.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.guru_id}>
                <td className="border px-2 py-1 text-center">{idx + 1}</td>
                <td className="border px-2 py-1">
                  <div className="font-medium">{r.nama_lengkap}</div>
                  <div className="text-xs text-gray-500">
                    NIP. {r.nip || "-"}
                    <br />
                    {r.pangkat_golongan || "-"}
                  </div>
                </td>
                <td className="border px-1 py-1">
                  <select
                    className="border rounded px-1 py-1 w-24"
                    value={r.status_kepegawaian}
                    onChange={(e) =>
                      updateRow(r.guru_id, "status_kepegawaian", e.target.value)
                    }
                  >
                    <option value="">-</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border px-1 py-1">
                  <input
                    className="border rounded px-1 py-1 w-32"
                    value={r.jabatan}
                    onChange={(e) => updateRow(r.guru_id, "jabatan", e.target.value)}
                  />
                </td>
                {["kelas_1", "kelas_2", "kelas_3", "kelas_4", "kelas_5", "kelas_6"].map(
                  (f) => (
                    <td key={f} className="border px-1 py-1">
                      <input
                        type="number"
                        min="0"
                        className="border rounded px-1 py-1 w-14 text-center"
                        value={r[f]}
                        onChange={(e) => updateRow(r.guru_id, f, e.target.value)}
                      />
                    </td>
                  )
                )}
                <td className="border px-1 py-1">
                  <input
                    type="number"
                    min="0"
                    className="border rounded px-1 py-1 w-16 text-center"
                    value={r.mengajar_sekolah_lain}
                    onChange={(e) =>
                      updateRow(r.guru_id, "mengajar_sekolah_lain", e.target.value)
                    }
                  />
                </td>
                <td className="border px-2 py-1 text-center font-medium">
                  {jumlahJamMengajar(r)}
                </td>
                <td className="border px-1 py-1">
                  <input
                    className="border rounded px-1 py-1 w-32"
                    placeholder="mis. Wali Kelas VI"
                    value={r.tugas_tambahan}
                    onChange={(e) =>
                      updateRow(r.guru_id, "tugas_tambahan", e.target.value)
                    }
                  />
                </td>
                <td className="border px-1 py-1">
                  <input
                    type="number"
                    min="0"
                    className="border rounded px-1 py-1 w-14 text-center"
                    value={r.tugas_tambahan_jam}
                    onChange={(e) =>
                      updateRow(r.guru_id, "tugas_tambahan_jam", e.target.value)
                    }
                  />
                </td>
                <td className="border px-2 py-1 text-center font-medium">
                  {bebanKeseluruhan(r)}
                </td>
                <td className="border px-1 py-1">
                  <input
                    className="border rounded px-1 py-1 w-20"
                    value={r.keterangan}
                    onChange={(e) => updateRow(r.guru_id, "keterangan", e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-semibold">
            <tr>
              <td className="border px-2 py-1 text-center" colSpan={4}>
                JUMLAH JAM MENGAJAR
              </td>
              <td className="border px-2 py-1 text-center">{totalPerKolom.kelas_1}</td>
              <td className="border px-2 py-1 text-center">{totalPerKolom.kelas_2}</td>
              <td className="border px-2 py-1 text-center">{totalPerKolom.kelas_3}</td>
              <td className="border px-2 py-1 text-center">{totalPerKolom.kelas_4}</td>
              <td className="border px-2 py-1 text-center">{totalPerKolom.kelas_5}</td>
              <td className="border px-2 py-1 text-center">{totalPerKolom.kelas_6}</td>
              <td className="border px-2 py-1 text-center">
                {totalPerKolom.mengajar_sekolah_lain}
              </td>
              <td className="border px-2 py-1 text-center">{totalPerKolom.jumlah}</td>
              <td className="border px-2 py-1" />
              <td className="border px-2 py-1 text-center">
                {totalPerKolom.tugas_tambahan_jam}
              </td>
              <td className="border px-2 py-1 text-center">{totalPerKolom.beban}</td>
              <td className="border px-2 py-1" />
            </tr>
          </tfoot>
        </table>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={handleSimpanDanGenerate}
        className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan & Generate SK Beban Mengajar"}
      </button>

      {skTersimpan && (
        <div className="mt-6 border-t pt-4 space-y-3">
          <p className="font-medium">SK tersimpan — unduh:</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() =>
                exportBebanMengajarToPDF(
                  printRef,
                  skTersimpan.nomor_sk.replace(/\//g, "-")
                )
              }
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              Unduh PDF
            </button>
            <button
              type="button"
              onClick={() => exportBebanMengajarToDocx(skTersimpan, sekolah)}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Unduh DOCX
            </button>
          </div>

          <div className="overflow-auto border" style={{ maxHeight: 600 }}>
            <BebanMengajarPrintTemplate
              ref={printRef}
              sk={skTersimpan}
              sekolah={sekolah}
            />
          </div>
        </div>
      )}
    </div>
  );
}
