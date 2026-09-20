import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext"; // sesuaikan path jika beda
import Layout from "../components/Layout";

const KONDISI = [
  { value: "baik", label: "Baik" },
  { value: "rusak_ringan", label: "Rusak Ringan" },
  { value: "rusak_berat", label: "Rusak Berat" },
];

const STATUS_KEPEMILIKAN = ["Milik sendiri", "Pinjam pakai", "Sewa", "Hibah"];

// Saran jenis bangunan (boleh juga mengetik jenis sendiri).
const JENIS_SEKOLAH = [
  "Ruang Kelas",
  "Ruang Guru",
  "Ruang Kepala Sekolah",
  "Ruang Tata Usaha",
  "Perpustakaan",
  "Laboratorium",
  "Mushalla",
  "Toilet/WC",
  "Kantin",
  "Rumah Dinas",
  "Gudang",
];
const JENIS_KANTOR = [
  "Gedung Kantor",
  "Ruang Pelayanan",
  "Balai Nikah",
  "Ruang Kepala",
  "Mushalla",
  "Toilet/WC",
  "Rumah Dinas",
  "Gudang",
];

const FORM_KOSONG = {
  id: null,
  nama: "",
  jenis: "",
  jumlah: 1,
  luas_m2: "",
  tahun_dibangun: "",
  status_kepemilikan: "",
  kondisi: "baik",
  catatan: "",
};

const LABEL_KONDISI = Object.fromEntries(KONDISI.map((k) => [k.value, k.label]));
const WARNA_KONDISI = {
  baik: "bg-emerald-50 text-emerald-700",
  rusak_ringan: "bg-amber-50 text-amber-700",
  rusak_berat: "bg-red-50 text-red-700",
};

export default function Bangunan() {
  const { sekolahId, isKantor } = useAuth();
  const [daftar, setDaftar] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [form, setForm] = useState(null); // null = form tertutup
  const [menyimpan, setMenyimpan] = useState(false);

  const saranJenis = isKantor ? JENIS_KANTOR : JENIS_SEKOLAH;

  async function muat() {
    setMemuat(true);
    setGalat("");
    let q = supabase.from("bangunan").select("*").order("nama");
    if (sekolahId) q = q.eq("sekolah_id", sekolahId);
    const { data, error } = await q;
    if (error) setGalat(error.message);
    else setDaftar(data || []);
    setMemuat(false);
  }

  useEffect(() => {
    muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId]);

  const ringkasan = useMemo(() => {
    const r = { baik: 0, rusak_ringan: 0, rusak_berat: 0, total: 0 };
    for (const b of daftar) {
      const jml = Number(b.jumlah) || 0;
      if (r[b.kondisi] !== undefined) r[b.kondisi] += jml;
      r.total += jml;
    }
    return r;
  }, [daftar]);

  function ubah(field, nilai) {
    setForm((f) => ({ ...f, [field]: nilai }));
  }

  async function simpan(e) {
    e.preventDefault();
    setGalat("");

    if (!form.nama.trim()) {
      setGalat("Nama bangunan wajib diisi.");
      return;
    }
    if (!form.id && !sekolahId) {
      setGalat("Akun ini belum terhubung ke sekolah/kantor, sehingga data belum bisa disimpan.");
      return;
    }

    // Kolom angka yang dikosongkan dikirim sebagai null (atau 0 untuk jumlah),
    // supaya tidak memicu error "invalid input syntax for type integer".
    const payload = {
      nama: form.nama.trim(),
      jenis: form.jenis.trim() || null,
      jumlah: Number(form.jumlah) || 0,
      luas_m2: form.luas_m2 === "" ? null : Number(form.luas_m2),
      tahun_dibangun: form.tahun_dibangun === "" ? null : Number(form.tahun_dibangun),
      status_kepemilikan: form.status_kepemilikan || null,
      kondisi: form.kondisi,
      catatan: form.catatan.trim() || null,
    };

    setMenyimpan(true);
    const { error } = form.id
      ? await supabase.from("bangunan").update(payload).eq("id", form.id)
      : await supabase.from("bangunan").insert({ ...payload, sekolah_id: sekolahId });
    setMenyimpan(false);

    if (error) {
      setGalat(error.message);
      return;
    }
    setForm(null);
    muat();
  }

  async function hapus(b) {
    if (!window.confirm(`Hapus "${b.nama}"?`)) return;
    const { error } = await supabase.from("bangunan").delete().eq("id", b.id);
    if (error) setGalat(error.message);
    else muat();
  }

  const inputCls =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";
  const labelCls = "mb-1 block text-xs font-medium text-slate-600";

  return (
    <Layout
      title="Kondisi Bangunan"
      subtitle="Data gedung dan ruang. Ringkasannya dipakai otomatis di laporan Kepala."
    >
      <div className="max-w-5xl space-y-5">
        {/* Ringkasan */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Total", ringkasan.total, "text-slate-900"],
            ["Baik", ringkasan.baik, "text-emerald-700"],
            ["Rusak Ringan", ringkasan.rusak_ringan, "text-amber-700"],
            ["Rusak Berat", ringkasan.rusak_berat, "text-red-700"],
          ].map(([label, nilai, warna]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`mt-1 text-2xl font-semibold ${warna}`}>{nilai}</p>
            </div>
          ))}
        </div>

        {galat && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {galat}
          </div>
        )}

        {/* Form tambah / ubah */}
        {form ? (
          <form onSubmit={simpan} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-medium text-slate-900">
                {form.id ? "Ubah bangunan" : "Tambah bangunan"}
              </h2>
              <button
                type="button"
                onClick={() => setForm(null)}
                aria-label="Tutup form"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Nama bangunan / ruang *</label>
                <input
                  className={inputCls}
                  value={form.nama}
                  onChange={(e) => ubah("nama", e.target.value)}
                  placeholder={isKantor ? "mis. Gedung Kantor KUA" : "mis. Ruang Kelas I"}
                />
              </div>
              <div>
                <label className={labelCls}>Jenis</label>
                <input
                  className={inputCls}
                  list="saran-jenis-bangunan"
                  value={form.jenis}
                  onChange={(e) => ubah("jenis", e.target.value)}
                  placeholder="Pilih atau ketik sendiri"
                />
                <datalist id="saran-jenis-bangunan">
                  {saranJenis.map((j) => (
                    <option key={j} value={j} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={labelCls}>Jumlah unit</label>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className={inputCls}
                  value={form.jumlah}
                  onChange={(e) => ubah("jumlah", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Kondisi</label>
                <select
                  className={inputCls}
                  value={form.kondisi}
                  onChange={(e) => ubah("kondisi", e.target.value)}
                >
                  {KONDISI.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Luas (m²)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className={inputCls}
                  value={form.luas_m2}
                  onChange={(e) => ubah("luas_m2", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Tahun dibangun</label>
                <input
                  type="number"
                  min="1800"
                  max="2100"
                  inputMode="numeric"
                  className={inputCls}
                  value={form.tahun_dibangun}
                  onChange={(e) => ubah("tahun_dibangun", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Status kepemilikan</label>
                <select
                  className={inputCls}
                  value={form.status_kepemilikan}
                  onChange={(e) => ubah("status_kepemilikan", e.target.value)}
                >
                  <option value="">— Pilih —</option>
                  {STATUS_KEPEMILIKAN.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Catatan</label>
                <input
                  className={inputCls}
                  value={form.catatan}
                  onChange={(e) => ubah("catatan", e.target.value)}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={menyimpan}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {menyimpan ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setForm({ ...FORM_KOSONG })}
            className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Tambah bangunan
          </button>
        )}

        {/* Daftar */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Jenis</th>
                <th className="px-4 py-3 text-center font-medium">Jumlah</th>
                <th className="px-4 py-3 text-center font-medium">Luas (m²)</th>
                <th className="px-4 py-3 text-center font-medium">Tahun</th>
                <th className="px-4 py-3 font-medium">Kondisi</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memuat ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Memuat...
                  </td>
                </tr>
              ) : daftar.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Belum ada data bangunan. Klik "Tambah bangunan" untuk mulai mengisi.
                  </td>
                </tr>
              ) : (
                daftar.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{b.nama}</td>
                    <td className="px-4 py-3 text-slate-600">{b.jenis || "—"}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{b.jumlah}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{b.luas_m2 ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {b.tahun_dibangun ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          WARNA_KONDISI[b.kondisi] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {LABEL_KONDISI[b.kondisi] || b.kondisi}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() =>
                            setForm({
                              ...FORM_KOSONG,
                              ...b,
                              jenis: b.jenis || "",
                              luas_m2: b.luas_m2 ?? "",
                              tahun_dibangun: b.tahun_dibangun ?? "",
                              status_kepemilikan: b.status_kepemilikan || "",
                              catatan: b.catatan || "",
                            })
                          }
                          aria-label={`Ubah ${b.nama}`}
                          className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => hapus(b)}
                          aria-label={`Hapus ${b.nama}`}
                          className="rounded-md p-2 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
