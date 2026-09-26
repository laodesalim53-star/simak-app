import { useState, useMemo } from "react";

export default function DaftarPasien({ data, loading, onRefresh, onPilihKunjungan }) {
  const [cari, setCari] = useState("");

  const hasilFilter = useMemo(() => {
    if (!cari) return data;
    const kunci = cari.toLowerCase();
    return data.filter(
      (p) => p.nama?.toLowerCase().includes(kunci) || p.nik?.includes(kunci)
    );
  }, [data, cari]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama atau NIK..."
          className="w-full max-w-sm rounded border px-3 py-2 text-sm"
        />
        <button
          onClick={onRefresh}
          className="rounded border px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Muat ulang
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">NIK</th>
              <th className="px-3 py-2">Jenis Kelamin</th>
              <th className="px-3 py-2">Status KTP</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-4 text-slate-400" colSpan={5}>
                  Memuat...
                </td>
              </tr>
            )}
            {!loading && hasilFilter.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-slate-400" colSpan={5}>
                  Belum ada pasien.
                </td>
              </tr>
            )}
            {hasilFilter.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.nama}</td>
                <td className="px-3 py-2">{p.nik}</td>
                <td className="px-3 py-2">
                  {p.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                </td>
                <td className="px-3 py-2">
                  {p.foto_ktp_verified ? (
                    <span className="text-emerald-700">Terverifikasi</span>
                  ) : (
                    <span className="text-amber-600">Belum</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => onPilihKunjungan(p)}
                    className="text-sm font-medium text-emerald-700 hover:underline"
                  >
                    Periksa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
