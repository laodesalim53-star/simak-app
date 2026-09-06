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
  Truck,
  Sparkles,
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
//
// TEMA (mengikuti Toko.jsx): banner sambutan bergradasi + motif batik,
// dan kartu pesanan pakai palet warna solid berotasi (biru/hijau/ungu/
// oranye) yang sama seperti kartu toko di Dasbor & Toko. Bagian detail
// yang terbuka (rincian barang, pengiriman, pembayaran) tetap memakai
// latar terang agar tetap mudah dibaca.
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

// Badge versi "di atas warna solid" — dipakai di header kartu yang kini
// berlatar warna, supaya kontrasnya tetap enak dibaca.
const STATUS_PESANAN_ON_COLOR = {
  baru: "bg-white/25 text-white",
  diproses: "bg-white/25 text-white",
  selesai: "bg-white/25 text-white",
  dibatalkan: "bg-white/25 text-white",
};

// Palet warna kartu — identik dengan CARD_COLORS di Toko.jsx & Dasbor,
// dipakai berotasi sesuai urutan pesanan yang tampil.
const CARD_COLORS = [
  {
    bg: "bg-blue-600",
    icon: "bg-white/15 text-white",
    sub: "text-blue-100",
  },
  {
    bg: "bg-emerald-600",
    icon: "bg-white/15 text-white",
    sub: "text-emerald-100",
  },
  {
    bg: "bg-purple-600",
    icon: "bg-white/15 text-white",
    sub: "text-purple-100",
  },
  {
    bg: "bg-orange-500",
    icon: "bg-white/15 text-white",
    sub: "text-orange-100",
  },
];

// Motif batik (kawung + parang) — disalin persis dari Toko.jsx/Dasbor.jsx
// supaya motif dekoratifnya identik di seluruh halaman.
function BatikOverlay({ patternId, strokeColor = "#d4af37", opacity = 1, size = 72 }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(8)"
        >
          {/* motif kawung: empat lengkung elips mengelilingi titik pusat */}
          <g fill="none" stroke={strokeColor} strokeWidth="1.1" opacity={opacity}>
            <ellipse cx={size / 2} cy={size * 0.333} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size / 2} cy={size * 0.667} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size * 0.333} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <ellipse cx={size * 0.667} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <circle cx={size / 2} cy={size / 2} r={size * 0.042} opacity="0.7" />
          </g>
          {/* garis parang halus di sela-sela motif kawung */}
          <path
            d={`M0 ${size} L${size * 0.25} ${size * 0.75} L${size * 0.5} ${size} L${size * 0.75} ${size * 0.75} L${size} ${size}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.8"
            opacity={opacity * 0.35}
          />
          <path
            d={`M0 0 L${size * 0.25} ${size * 0.25} L0 ${size * 0.5}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.8"
            opacity={opacity * 0.3}
          />
          <circle cx={size * 0.11} cy={size * 0.11} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
          <circle cx={size * 0.89} cy={size * 0.22} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
          <circle cx={size * 0.22} cy={size * 0.89} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

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
        kurir,
        ongkir,
        biaya_cod,
        grand_total,
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
      {/* ================= Banner sambutan (tema sama dengan Toko) ================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-fuchsia-600 px-5 sm:px-6 py-5 sm:py-6 mb-6 shadow-sm">
        <BatikOverlay
          patternId="batikBannerRiwayat"
          strokeColor="#ffffff"
          opacity={0.4}
          size={64}
        />
        <Receipt
          size={110}
          strokeWidth={1.2}
          className="absolute -right-5 -bottom-8 text-white/10 rotate-[12deg] pointer-events-none"
        />
        <Package
          size={64}
          strokeWidth={1.2}
          className="absolute right-20 -top-5 text-white/10 -rotate-12 pointer-events-none hidden sm:block"
        />
        <Truck
          size={52}
          strokeWidth={1.2}
          className="absolute right-44 bottom-3 text-white/10 rotate-6 pointer-events-none hidden md:block"
        />

        <div className="relative z-10 flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center text-white">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-white text-base sm:text-lg">
              Riwayat transaksi Anda
            </p>
            <p className="text-sm text-blue-100 mt-0.5">
              Lihat kembali pesanan yang pernah Anda buat, lengkap dengan
              rincian barang, pengiriman, dan pembayarannya.
            </p>
          </div>
        </div>
      </div>

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
          {daftarTampil.map((p, idx) => {
            const c = CARD_COLORS[idx % CARD_COLORS.length];
            const statusInfo = STATUS_PESANAN[p.status] || {
              label: p.status,
              className: "bg-slate-100 text-slate-600",
            };
            const bayarInfo = STATUS_BAYAR[p.status_bayar] || {
              label: p.status_bayar,
              className: "bg-slate-100 text-slate-600",
            };
            const statusOnColor =
              STATUS_PESANAN_ON_COLOR[p.status] || "bg-white/25 text-white";
            const isExpanded = expandedId === p.id;

            return (
              <div
                key={p.id}
                className="rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header kartu — latar warna solid berotasi + motif batik,
                    mengikuti tema kartu toko */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className={`relative w-full flex items-center gap-3 px-4 py-3.5 text-left overflow-hidden ${c.bg}`}
                >
                  <BatikOverlay
                    patternId={`batikRiwayat-${p.id}`}
                    strokeColor="#ffffff"
                    opacity={0.5}
                    size={56}
                  />

                  <div
                    className={`relative z-10 w-10 h-10 shrink-0 rounded-xl ${c.icon} flex items-center justify-center`}
                  >
                    <Receipt size={17} />
                  </div>

                  <div className="relative z-10 min-w-0 flex-1">
                    <p className="font-display font-semibold text-white truncate">
                      {p.toko?.nama_toko || "Toko"}
                    </p>
                    <p className={`flex items-center gap-1 text-xs ${c.sub} mt-0.5`}>
                      <Calendar size={12} />
                      {formatTanggal(p.created_at)}
                    </p>
                  </div>

                  <div className="relative z-10 text-right shrink-0">
                    <p className="text-sm font-semibold text-white">
                      {formatRupiah(p.grand_total || p.total)}
                    </p>
                    <div className="flex gap-1 justify-end mt-1.5">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${statusOnColor}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 shrink-0 text-white/80">
                    {isExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-3.5 bg-slate-50">
                    {/* Status bayar dipindah ke sini (dari header) supaya
                        header tetap ringkas saat berwarna solid */}
                    <div className="flex justify-end mb-3">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${bayarInfo.className}`}
                      >
                        {bayarInfo.label}
                      </span>
                    </div>

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

                    {/* Rincian pengiriman & pembayaran — kurir, ongkir,
                        biaya COD, dan grand total dari tabel pesanan.
                        Selalu ditampilkan (bukan cuma saat ada kurir)
                        supaya pembeli tetap lihat rincian subtotal ->
                        grand total, meski kurir belum terisi. */}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                        <Truck size={13} />
                        Pengiriman & pembayaran
                      </p>
                      <div className="space-y-1 text-sm">
                        {p.kurir && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Kurir</span>
                            <span className="font-medium text-slate-800">
                              {p.kurir}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Subtotal barang</span>
                          <span className="text-slate-700">
                            {formatRupiah(p.total)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ongkos kirim</span>
                          <span className="text-slate-700">
                            {formatRupiah(p.ongkir)}
                          </span>
                        </div>
                        {Number(p.biaya_cod) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Biaya COD</span>
                            <span className="text-slate-700">
                              {formatRupiah(p.biaya_cod)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1.5 mt-1.5 border-t border-slate-200">
                          <span className="font-semibold text-slate-900">
                            Total bayar
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatRupiah(p.grand_total || p.total)}
                          </span>
                        </div>
                      </div>
                    </div>

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
