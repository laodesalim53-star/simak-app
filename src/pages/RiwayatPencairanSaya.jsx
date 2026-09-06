import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { supabase } from "../supabaseClient"; // sesuaikan path kalau berbeda di project kamu

const LABEL_STATUS = {
  belum_memenuhi_syarat: { text: "Belum Memenuhi Syarat", color: "bg-gray-100 text-gray-600" },
  siap_dicairkan: { text: "Siap Dicairkan", color: "bg-amber-100 text-amber-700" },
  dicairkan: { text: "Sudah Dicairkan", color: "bg-green-100 text-green-700" },
  ditahan: { text: "Ditahan", color: "bg-red-100 text-red-700" },
};

const TABS = [
  { key: "semua", label: "Semua" },
  { key: "siap_dicairkan", label: "Siap Dicairkan" },
  { key: "dicairkan", label: "Sudah Dicairkan" },
  { key: "ditahan", label: "Ditahan" },
];

function formatRupiah(angka) {
  return "Rp" + Number(angka || 0).toLocaleString("id-ID");
}

function formatTanggal(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RiwayatPencairanSaya() {
  const [loading, setLoading] = useState(true);
  const [pesananList, setPesananList] = useState([]);
  const [tokoMap, setTokoMap] = useState({});
  const [tabAktif, setTabAktif] = useState("semua");
  const [error, setError] = useState(null);

  useEffect(() => {
    async function muatData() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Silakan login ulang.");
        setLoading(false);
        return;
      }

      // 1. Ambil semua toko milik user ini
      const { data: tokoSaya, error: tokoError } = await supabase
        .from("toko")
        .select("id, nama_toko")
        .eq("created_by", user.id);

      if (tokoError) {
        setError("Gagal memuat data toko: " + tokoError.message);
        setLoading(false);
        return;
      }

      if (!tokoSaya || tokoSaya.length === 0) {
        setPesananList([]);
        setLoading(false);
        return;
      }

      const tokoIds = tokoSaya.map((t) => t.id);
      const mapNamaToko = {};
      tokoSaya.forEach((t) => (mapNamaToko[t.id] = t.nama_toko));
      setTokoMap(mapNamaToko);

      // 2. Ambil pesanan untuk toko-toko itu.
      // RLS ("Pemilik toko lihat pesanan tokonya") sudah otomatis
      // membatasi hasil hanya ke pesanan milik toko user ini,
      // filter toko_id di bawah ini cuma jaga-jaga tambahan.
      const { data: pesanan, error: pesananError } = await supabase
        .from("pesanan")
        .select(
          "id, toko_id, status, status_bayar, status_pencairan, grand_total, dicairkan_pada, catatan_pencairan, created_at"
        )
        .in("toko_id", tokoIds)
        .order("created_at", { ascending: false });

      if (pesananError) {
        setError("Gagal memuat data pesanan: " + pesananError.message);
        setLoading(false);
        return;
      }

      setPesananList(pesanan || []);
      setLoading(false);
    }

    muatData();
  }, []);

  const daftarTampil =
    tabAktif === "semua"
      ? pesananList
      : pesananList.filter((p) => p.status_pencairan === tabAktif);

  const totalSiapDicairkan = pesananList
    .filter((p) => p.status_pencairan === "siap_dicairkan")
    .reduce((sum, p) => sum + Number(p.grand_total || 0), 0);

  const totalSudahDicairkan = pesananList
    .filter((p) => p.status_pencairan === "dicairkan")
    .reduce((sum, p) => sum + Number(p.grand_total || 0), 0);

  return (
    <Layout
      title="Riwayat Pencairan Saya"
      subtitle="Pantau status pencairan dana dari penjualan tokomu"
    >
      <div className="p-6 mb-6 text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
        <h2 className="mb-1 text-lg font-semibold">Ringkasan dana tokomu</h2>
        <div className="flex flex-col gap-4 mt-4 sm:flex-row">
          <div>
            <p className="text-sm opacity-80">Siap Dicairkan</p>
            <p className="text-2xl font-bold">{formatRupiah(totalSiapDicairkan)}</p>
          </div>
          <div>
            <p className="text-sm opacity-80">Sudah Dicairkan</p>
            <p className="text-2xl font-bold">{formatRupiah(totalSudahDicairkan)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs opacity-75">
          Dana ditransfer manual oleh admin ke rekening tokomu. Tandai status di sini
          hanya untuk pemantauan.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTabAktif(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              tabAktif === tab.key
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Memuat data...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && daftarTampil.length === 0 && (
        <div className="p-10 text-center text-gray-400 border border-dashed rounded-lg">
          Tidak ada pesanan pada status ini.
        </div>
      )}

      <div className="space-y-3">
        {daftarTampil.map((p) => {
          const info = LABEL_STATUS[p.status_pencairan] || LABEL_STATUS.belum_memenuhi_syarat;
          return (
            <div
              key={p.id}
              className="p-4 bg-white border border-gray-100 rounded-lg shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {tokoMap[p.toko_id] || "Toko"}
                  </p>
                  <p className="font-mono text-xs text-gray-400">
                    #{p.id.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatTanggal(p.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-gray-800">
                    {formatRupiah(p.grand_total)}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}
                  >
                    {info.text}
                  </span>
                </div>
              </div>

              {p.status_pencairan === "dicairkan" && p.dicairkan_pada && (
                <p className="pt-2 mt-2 text-xs text-gray-500 border-t border-gray-100">
                  Dicairkan pada {formatTanggal(p.dicairkan_pada)}
                </p>
              )}

              {p.catatan_pencairan && (
                <p className="mt-1 text-xs italic text-gray-500">
                  Catatan: {p.catatan_pencairan}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
