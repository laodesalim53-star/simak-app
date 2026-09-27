import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient"; // sesuaikan path

function tanggalHariIni() {
  return new Date().toISOString().slice(0, 10);
}

export default function TugasHarian({ profil }) {
  const [tugas, setTugas] = useState([]);
  const [judulBaru, setJudulBaru] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null); // profil.id selalu undefined; id asli dari sesi auth

  const [pegawaiList, setPegawaiList] = useState([]);
  const [piketHariIni, setPiketHariIni] = useState(new Set()); // Set berisi pegawai_id yang piket hari ini
  const [loadingPiket, setLoadingPiket] = useState(false);
  const [menyimpanPiketId, setMenyimpanPiketId] = useState(null);

  useEffect(() => {
    let batal = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!batal) setUserId(data?.user?.id ?? null);
    });
    return () => {
      batal = true;
    };
  }, []);

  const muat = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tugas_bidan")
      .select("id, judul, status, kunjungan_id")
      .eq("petugas_id", userId)
      .eq("tanggal", tanggalHariIni())
      .order("created_at");
    if (!error) setTugas(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    muat();
  }, [muat]);

  const muatPiket = useCallback(async () => {
    if (!profil?.sekolah_id) return;
    setLoadingPiket(true);

    const { data: pegawai, error: errPegawai } = await supabase
      .from("pegawai_puskesmas")
      .select("id, nama_lengkap, jabatan")
      .eq("sekolah_id", profil.sekolah_id)
      .eq("status", "aktif")
      .order("nama_lengkap");

    if (errPegawai) {
      console.error("Gagal memuat daftar pegawai:", errPegawai.message);
    } else {
      setPegawaiList(pegawai ?? []);
    }

    const { data: piket, error: errPiket } = await supabase
      .from("piket_harian")
      .select("pegawai_id")
      .eq("sekolah_id", profil.sekolah_id)
      .eq("tanggal", tanggalHariIni());

    if (errPiket) {
      console.error("Gagal memuat piket hari ini:", errPiket.message);
    } else {
      setPiketHariIni(new Set((piket ?? []).map((p) => p.pegawai_id)));
    }

    setLoadingPiket(false);
  }, [profil?.sekolah_id]);

  useEffect(() => {
    muatPiket();
  }, [muatPiket]);

  const tambahTugas = async (e) => {
    e.preventDefault();
    if (!judulBaru.trim() || !userId) return;
    const { error } = await supabase.from("tugas_bidan").insert({
      sekolah_id: profil.sekolah_id,
      petugas_id: userId,
      judul: judulBaru.trim(),
      tanggal: tanggalHariIni(), // penting: muat() memfilter berdasarkan tanggal ini
    });
    if (!error) {
      setJudulBaru("");
      muat();
    }
  };

  const ubahStatus = async (id, status) => {
    await supabase.from("tugas_bidan").update({ status }).eq("id", id);
    muat();
  };

  async function togglePiket(pegawaiId, sedangPiket) {
    if (!profil?.sekolah_id) return;
    setMenyimpanPiketId(pegawaiId);
    try {
      if (sedangPiket) {
        const { error } = await supabase
          .from("piket_harian")
          .delete()
          .eq("sekolah_id", profil.sekolah_id)
          .eq("pegawai_id", pegawaiId)
          .eq("tanggal", tanggalHariIni());
        if (error) throw error;
        setPiketHariIni((prev) => {
          const next = new Set(prev);
          next.delete(pegawaiId);
          return next;
        });
      } else {
        const { error } = await supabase.from("piket_harian").insert({
          sekolah_id: profil.sekolah_id,
          pegawai_id: pegawaiId,
          tanggal: tanggalHariIni(),
        });
        if (error) throw error;
        setPiketHariIni((prev) => new Set(prev).add(pegawaiId));
      }
    } catch (err) {
      alert("Gagal memperbarui piket: " + (err.message || "terjadi kesalahan"));
    } finally {
      setMenyimpanPiketId(null);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* ===================== PETUGAS PIKET HARI INI ===================== */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          Petugas Piket Hari Ini
        </h3>
        <div className="rounded-lg border bg-white p-3">
          {loadingPiket && (
            <p className="text-sm text-slate-400">Memuat daftar pegawai...</p>
          )}
          {!loadingPiket && pegawaiList.length === 0 && (
            <p className="text-sm text-slate-400">
              Belum ada data pegawai aktif. Tambahkan lewat menu Data Pegawai.
            </p>
          )}
          {!loadingPiket && pegawaiList.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {pegawaiList.map((p) => {
                const sedangPiket = piketHariIni.has(p.id);
                const sedangProses = menyimpanPiketId === p.id;
                return (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.nama_lengkap}</p>
                      {p.jabatan && <p className="text-xs text-slate-500">{p.jabatan}</p>}
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={sedangPiket}
                        onChange={() => togglePiket(p.id, sedangPiket)}
                        disabled={sedangProses}
                      />
                      <span className={sedangPiket ? "font-medium text-emerald-700" : "text-slate-500"}>
                        {sedangProses ? "Menyimpan..." : sedangPiket ? "Piket" : "Tidak piket"}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {piketHariIni.size > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {piketHariIni.size} pegawai piket hari ini.
          </p>
        )}
      </div>

      {/* ===================== TUGAS HARIAN SAYA ===================== */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Tugas Harian Saya</h3>
        <form onSubmit={tambahTugas} className="mb-4 flex gap-2">
          <input
            value={judulBaru}
            onChange={(e) => setJudulBaru(e.target.value)}
            placeholder="Tambah tugas hari ini..."
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <button className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Tambah
          </button>
        </form>

        <ul className="space-y-2">
          {loading && <li className="text-sm text-slate-400">Memuat...</li>}
          {!loading && tugas.length === 0 && (
            <li className="text-sm text-slate-400">
              Belum ada tugas hari ini.
            </li>
          )}
          {tugas.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded border bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <span
                  className={`block truncate ${
                    t.status === "selesai" ? "text-slate-400 line-through" : ""
                  }`}
                >
                  {t.judul}
                </span>
                {t.kunjungan_id && (
                  <span className="mt-0.5 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    Otomatis dari pemeriksaan
                  </span>
                )}
              </div>
              <select
                value={t.status}
                onChange={(e) => ubahStatus(t.id, e.target.value)}
                className="ml-2 shrink-0 rounded border px-2 py-1 text-xs"
              >
                <option value="belum">Belum</option>
                <option value="proses">Proses</option>
                <option value="selesai">Selesai</option>
              </select>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
