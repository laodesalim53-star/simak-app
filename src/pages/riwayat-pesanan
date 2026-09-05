import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Receipt,
  Package,
  ChevronDown,
  ChevronUp,
  Calendar,
  CreditCard,
  StickyNote,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import Layout from "../components/Layout";

// =========================================================
// Komponen Riwayat Pesanan
// - Menampilkan daftar pesanan milik user yang sedang login,
//   diambil dari tabel `pesanan` (join `toko` & `pesanan_item`).
// - RLS "Pembeli lihat pesanan sendiri" & "Pembeli lihat item
//   pesanan sendiri" di Supabase sudah mengizinkan query ini
//   apa adanya, tanpa perlu policy tambahan.
// - Klik salah satu pesanan untuk lihat rincian barang di dalamnya.
// =========================================================

const FILTER_STATUS = [
  { value: "semua", label: "Semua" },
  { value: "baru", label: "Baru" },
  { value: "diproses", label: "Diproses" },
  { value: "selesai", label: "Selesai" },
  { value: "dibatalkan", label: "Dibatalkan" },
];

const STATUS_PESANAN = {
  baru: { label: "Baru", className: "bg-blue-100 text-blue-700" },
  diproses: { label: "Diproses", className: "bg-amber-100 text-amber-700" },
  selesai: { label: "Selesai", className: "bg-emerald-100 text-emerald-700" },
  dibatalkan: { label: "Dibatalkan", className: "bg-red-100 text-red-700" },
};

const STATUS_BAYAR = {
  menunggu: { label: "Menunggu bayar", className: "bg-amber-100 text-amber-700" },
  dibayar: { label: "Sudah dibayar", className: "bg-emerald-100 text-emerald-700" },
  gagal: { label: "Gagal", className: "bg-red-100 text-red-700" },
  kadaluarsa: { label: "Kadaluarsa", className: "bg-slate-100 text-slate-500" },
};

function formatRupiah(nilai) {
  if (nilai === null || nilai === undefined || nilai === "") return "-";
  const angka = Number(nilai);
  if (Number.isNaN(angka)) return "-";
  return `Rp${angka.toLocaleString("id-ID")}`;
}

function formatTanggal(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function RiwayatPesanan() {
  const { session, loading: authLoading } = useAuth();

  const [pesananList, setPesananList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [expandedId, setExpandedId] = useState(null);

  const fetchRiwayat = useCallback(async () => {
    if (!session?.user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("pesanan")
      .select(
        `
        id,
        total,
        status,
        status_bayar,
        metode_bayar,
        created_at,
        catatan,
        toko:toko_id ( nama_toko ),
        pesanan_item ( id, nama_barang, harga_satuan, qty, subtotal )
        `
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setPesananList(data);
      setErrorMsg("");
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchRiwayat();
  }, [fetchRiwayat]);

  const daftarTampil =
    filterStatus === "semua"
      ? pesananList
      : pesananList.filter((p) => p.status === filterStatus);

  if (authLoading) {
    return (
      <Layout title="Riwayat Pesanan" subtitle="Daftar transaksi Anda">
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          Memuat...
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout title="Riwayat Pesanan" subtitle="Daftar transaksi Anda">
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 rounded-xl">
          <Receipt size={28} className="text-slate-300 mb-2" />
          <p className="text-sm text-slate-500 mb-3">
            Anda harus login untuk melihat riwayat pesanan.
          </p>
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Login
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Riwayat Pesanan"
      subtitle="Daftar transaksi yang pernah Anda lakukan"
    >
      {errorMsg && (
        <div className="mb-4 text-sm text-red-600">{errorMsg}</div>
      )}

      {/* Filter status */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTER_STATUS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              filterStatus === f.value
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">
          Memuat riwayat pesanan...
        </div>
      ) : daftarTampil.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 rounded-xl">
          <Receipt size={28} className="text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">Belum ada pesanan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {daftarTampil.map((p) => {
            const statusInfo = STATUS_PESANAN[p.status] || {
              label: p.status,
              className: "bg-slate-100 text-slate-600",
            };
            const bayarInfo = STATUS_BAYAR[p.status_bayar] || {
              label: p.status_bayar,
              className: "bg-slate-100 text-slate-600",
            };
            const isExpanded = expandedId === p.id;

            return (
              <div
                key={p.id}
                className="border border-slate-200 rounded-xl bg-white overflow-hidden hover:shadow-sm transition-shadow"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                >
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Receipt size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold text-slate-900 truncate">
                      {p.toko?.nama_toko || "Toko"}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <Calendar size={12} />
                      {formatTanggal(p.created_at)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatRupiah(p.total)}
                    </p>
                    <div className="flex gap-1 justify-end mt-1.5">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${bayarInfo.className}`}
                      >
                        {bayarInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-slate-400">
                    {isExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-3.5 bg-slate-50">
                    <ul className="divide-y divide-slate-200">
                      {p.pesanan_item?.map((item) => (
                        <li
                          key={item.id}
                          className="py-2 flex items-center gap-3"
                        >
                          <div className="w-8 h-8 shrink-0 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                            <Package size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-800 truncate">
                              {item.nama_barang}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.qty} x {formatRupiah(item.harga_satuan)}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-slate-900 shrink-0">
                            {formatRupiah(item.subtotal)}
                          </p>
                        </li>
                      ))}
                    </ul>

                    {(p.metode_bayar || p.catatan) && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                        {p.metode_bayar && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-500">
                            <CreditCard size={12} />
                            Metode bayar: {p.metode_bayar}
                          </p>
                        )}
                        {p.catatan && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-500">
                            <StickyNote size={12} />
                            Catatan: {p.catatan}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
