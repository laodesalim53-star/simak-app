import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient"; // sesuaikan path

export default function TugasHarian({ profil }) {
  const [tugas, setTugas] = useState([]);
  const [judulBaru, setJudulBaru] = useState("");
  const [loading, setLoading] = useState(false);

  const muat = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tugas_bidan")
      .select("*")
      .eq("petugas_id", profil.id)
      .eq("tanggal", new Date().toISOString().slice(0, 10))
      .order("created_at");
    if (!error) setTugas(data ?? []);
    setLoading(false);
  }, [profil.id]);

  useEffect(() => {
    muat();
  }, [muat]);

  const tambahTugas = async (e) => {
    e.preventDefault();
    if (!judulBaru.trim()) return;
    const { error } = await supabase.from("tugas_bidan").insert({
      puskesmas_id: profil.puskesmas_id,
      petugas_id: profil.id,
      judul: judulBaru.trim(),
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

  return (
    <div className="max-w-xl">
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
            <span
              className={
                t.status === "selesai" ? "text-slate-400 line-through" : ""
              }
            >
              {t.judul}
            </span>
            <select
              value={t.status}
              onChange={(e) => ubahStatus(t.id, e.target.value)}
              className="rounded border px-2 py-1 text-xs"
            >
              <option value="belum">Belum</option>
              <option value="proses">Proses</option>
              <option value="selesai">Selesai</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
