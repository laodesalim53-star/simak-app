import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Inbox,
  Package,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CreditCard,
  StickyNote,
  User,
  Trash2,
  Search,
  Download,
  MapPin,
  Truck,
  Sparkles,
  ClipboardList,
  Tag,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import Layout from "../components/Layout";

// =========================================================
// Komponen Pesanan Masuk (sisi penjual)
// - Pemilik toko: hanya bisa MELIHAT pesanan yang masuk ke tokonya
//   sendiri (toko.created_by = auth.uid()) — tidak ada kontrol ubah status.
// - Superadmin: bisa melihat pesanan dari SEMUA toko, dan satu-satunya
//   peran yang boleh mengubah status pesanan (baru/diproses/selesai/
//   dibatalkan) — dibatasi lewat RLS policy "Superadmin ubah status
//   pesanan" di Supabase, bukan cuma disembunyikan di UI.
//
// PENTING (keamanan): pastikan juga ADA policy RLS terpisah untuk
// operasi DELETE yang membatasi ke superadmin saja, mis.:
//   create policy "Superadmin hapus pesanan" on pesanan for delete
//   using ( (select is_superadmin from profiles where id = auth.uid()) );
// Tanpa ini, tombol Hapus yang disembunyikan di UI TIDAK cukup —
// siapa pun yang login tetap bisa memanggil supabase.from("pesanan")
// .delete() langsung lewat console browser.
//
// TEMA (mengikuti Toko.jsx): banner sambutan bergradasi + motif batik,
// dan kartu pesanan kini pakai palet warna solid berotasi (biru/hijau/
// ungu/oranye) yang sama seperti kartu toko di Dasbor & Toko, supaya
// tampilan antar halaman konsisten. Bagian detail yang terbuka (alamat,
// pengiriman, daftar barang) tetap memakai latar terang agar tetap mudah
// dibaca — sama seperti modal barang di Toko yang tetap putih walau
// kartu di luarnya berwarna.
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

// Badge versi "di atas warna solid" — dipakai di header kartu pesanan
// yang kini berlatar warna, supaya kontrasnya tetap enak dibaca
// (mengikuti pola badgeOn/badgeOff pada kartu toko).
const STATUS_PESANAN_ON_COLOR = {
  baru: "bg-white/25 text-white",
  diproses: "bg-white/25 text-white",
  selesai: "bg-white/25 text-white",
  dibatalkan: "bg-white/25 text-white",
};

const PAGE_SIZE = 10;

// Palet warna kartu — identik dengan CARD_COLORS di Toko.jsx & Dasbor,
// dipakai berotasi sesuai urutan pesanan yang tampil di halaman ini.
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

// Badge kecil untuk status — dipakai di bagian detail (latar putih)
function Badge({ info }) {
  return (
    <span
      className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${info.className}`}
    >
      {info.label}
    </span>
  );
}

// Escape sederhana untuk field CSV (bungkus dengan kutip jika perlu)
function escapeCsvField(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function unduhCsv(daftarPesanan, namaPembeli) {
  const header = [
    "ID Pesanan",
    "Toko",
    "Pembeli",
    "Nama Penerima",
    "No HP Penerima",
    "Alamat Pengiriman",
    "Kurir",
    "Ongkir",
    "Biaya COD",
    "Subtotal Barang",
    "Grand Total",
    "Tanggal",
    "Status",
    "Status Bayar",
    "Metode Bayar",
    "Catatan",
  ];

  const baris = daftarPesanan.map((p) => [
    p.id,
    p.toko?.nama_toko || "",
    namaPembeli[p.user_id] || "",
    p.nama_penerima || "",
    p.no_hp_penerima || "",
    p.alamat_pengiriman || "",
    p.kurir || "",
    p.ongkir ?? 0,
    p.biaya_cod ?? 0,
    p.total,
    p.grand_total || p.total,
    formatTanggal(p.created_at),
    STATUS_PESANAN[p.status]?.label || p.status,
    STATUS_BAYAR[p.status_bayar]?.label || p.status_bayar,
    p.metode_bayar || "",
    p.catatan || "",
  ]);

  const csvContent = [header, ...baris]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\n");

  // Tambahkan BOM supaya karakter non-ASCII tampil benar di Excel
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pesanan-masuk-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function PesananMasuk() {
  const { session, isSuperAdmin, loading: authLoading } = useAuth();
  const userId = session?.user?.id;

  const [pesananList, setPesananList] = useState([]);
  const [namaPembeli, setNamaPembeli] = useState({}); // { [user_id]: nama_lengkap }
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchPesananMasuk = useCallback(async () => {
    if (!userId) return;

    setLoading(true);

    let query = supabase
      .from("pesanan")
      .select(
        `
        id,
        user_id,
        total,
        status,
        status_bayar,
        metode_bayar,
        created_at,
        catatan,
        nama_penerima,
        no_hp_penerima,
        alamat_pengiriman,
        kurir,
        ongkir,
        biaya_cod,
        grand_total,
        toko:toko_id!inner ( nama_toko, created_by ),
        pesanan_item ( id, nama_barang, harga_satuan, qty, subtotal )
        `
      )
      .order("created_at", { ascending: false });

    // Pemilik toko (bukan superadmin) hanya boleh lihat pesanan ke tokonya
    // sendiri. Superadmin tidak difilter — RLS "Superadmin lihat semua
    // pesanan" yang mengizinkan lihat semua toko. Filter ini HANYA untuk
    // UX; RLS di database tetap wajib membatasi akses sebenarnya.
    if (!isSuperAdmin) {
      query = query.eq("toko.created_by", userId);
    }

    const { data, error } = await query;

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setPesananList(data || []);
    setErrorMsg("");

    // Ambil nama pembeli lewat tabel profil (id = auth.users.id).
    // CATATAN: sebelumnya query ini memakai tabel "profiles" (dengan "s"),
    // tapi tabel itu adalah sisa skema lama berisi 1 baris dan sudah
    // dihapus. Sumber kebenaran yang dipakai seluruh aplikasi (termasuk
    // AuthContext) adalah tabel "profil".
    const idUnik = [...new Set((data || []).map((p) => p.user_id))].filter(Boolean);
    if (idUnik.length > 0) {
      const { data: profilData, error: profilError } = await supabase
        .from("profil")
        .select("id, guru_id, nama_lengkap_pendaftar, guru:guru_id ( nama_lengkap )")
        .in("id", idUnik);

      if (profilError) {
        // Jangan diamkan error di sini — nama pembeli penting untuk
        // proses verifikasi pesanan, jadi tunjukkan ke pengguna.
        setErrorMsg((prev) =>
          prev || "Sebagian nama pembeli gagal dimuat: " + profilError.message
        );
      } else {
        const peta = {};
        (profilData || []).forEach((p) => {
          // Prioritas nama sama seperti di AuthContext: kalau pembeli
          // punya guru_id, pakai nama dari tabel guru; kalau tidak,
          // pakai nama yang diisi saat pendaftaran.
          peta[p.id] = p.guru?.nama_lengkap || p.nama_lengkap_pendaftar;
        });
        setNamaPembeli(peta);
      }
    }

    setLoading(false);
  }, [userId, isSuperAdmin]);

  useEffect(() => {
    fetchPesananMasuk();
  }, [fetchPesananMasuk]);

  // Reset ke halaman 1 setiap kali filter/pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery]);

  const handleUbahStatus = async (id, statusBaru) => {
    setSavingId(id);
    const { error } = await supabase
      .from("pesanan")
      .update({ status: statusBaru })
      .eq("id", id);

    if (error) {
      alert("Gagal mengubah status: " + error.message);
    } else {
      setPesananList((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: statusBaru } : p))
      );
    }
    setSavingId(null);
  };

  const handleHapus = async (id) => {
    if (!confirm("Yakin ingin menghapus pesanan ini? Tindakan ini tidak bisa dibatalkan.")) return;

    setDeletingId(id);
    const { error } = await supabase.from("pesanan").delete().eq("id", id);

    if (error) {
      alert("Gagal menghapus pesanan: " + error.message);
    } else {
      setPesananList((prev) => prev.filter((p) => p.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
    setDeletingId(null);
  };

  // Filter status -> lalu filter pencarian teks bebas
  const daftarTerfilter = useMemo(() => {
    const byStatus =
      filterStatus === "semua"
        ? pesananList
        : pesananList.filter((p) => p.status === filterStatus);

    const q = searchQuery.trim().toLowerCase();
    if (!q) return byStatus;

    return byStatus.filter((p) => {
      const namaToko = p.toko?.nama_toko?.toLowerCase() || "";
      const pembeli = (namaPembeli[p.user_id] || "").toLowerCase();
      const catatan = (p.catatan || "").toLowerCase();
      const namaPenerima = (p.nama_penerima || "").toLowerCase();
      const alamat = (p.alamat_pengiriman || "").toLowerCase();
      const namaBarang = (p.pesanan_item || [])
        .map((item) => item.nama_barang?.toLowerCase() || "")
        .join(" ");
      const idPesanan = String(p.id).toLowerCase();

      return (
        namaToko.includes(q) ||
        pembeli.includes(q) ||
        catatan.includes(q) ||
        namaPenerima.includes(q) ||
        alamat.includes(q) ||
        namaBarang.includes(q) ||
        idPesanan.includes(q)
      );
    });
  }, [pesananList, filterStatus, searchQuery, namaPembeli]);

  const totalHalaman = Math.max(1, Math.ceil(daftarTerfilter.length / PAGE_SIZE));
  const halamanAman = Math.min(currentPage, totalHalaman);
  const daftarTampil = daftarTerfilter.slice(
    (halamanAman - 1) * PAGE_SIZE,
    halamanAman * PAGE_SIZE
  );

  if (authLoading) {
    return (
      <Layout title="Pesanan Masuk" subtitle="Pesanan yang masuk ke toko Anda">
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          Memuat...
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Pesanan Masuk"
      subtitle={
        isSuperAdmin
          ? "Semua pesanan dari seluruh toko"
          : "Pesanan yang masuk ke toko Anda"
      }
    >
      {/* ================= Banner sambutan (tema sama dengan Toko) ================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-fuchsia-600 px-5 sm:px-6 py-5 sm:py-6 mb-6 shadow-sm">
        <BatikOverlay
          patternId="batikBannerPesanan"
          strokeColor="#ffffff"
          opacity={0.4}
          size={64}
        />
        <Truck
          size={110}
          strokeWidth={1.2}
          className="absolute -right-5 -bottom-8 text-white/10 rotate-[12deg] pointer-events-none"
        />
        <Package
          size={64}
          strokeWidth={1.2}
          className="absolute right-20 -top-5 text-white/10 -rotate-12 pointer-events-none hidden sm:block"
        />
        <MapPin
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
              {isSuperAdmin ? "Pantau semua pesanan masuk" : "Pesanan masuk ke toko Anda"}
            </p>
            <p className="text-sm text-blue-100 mt-0.5">
              {isSuperAdmin
                ? "Lihat, cari, dan kelola status pesanan dari seluruh toko dalam satu tempat."
                : "Cek detail penerima, pengiriman, dan barang untuk setiap pesanan yang masuk."}
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 text-sm text-red-600">{errorMsg}</div>
      )}

      {/* Baris kontrol: pencarian + ekspor */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari toko, pembeli, barang, atau catatan..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        <button
          onClick={() => unduhCsv(daftarTerfilter, namaPembeli)}
          disabled={daftarTerfilter.length === 0}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Download size={14} />
          Ekspor CSV
        </button>
      </div>

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
          Memuat pesanan masuk...
        </div>
      ) : daftarTerfilter.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 rounded-xl">
          <Inbox size={28} className="text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">
            {searchQuery
              ? "Tidak ada pesanan yang cocok dengan pencarian."
              : isSuperAdmin
              ? "Belum ada pesanan masuk."
              : "Belum ada pesanan masuk ke toko Anda."}
          </p>
        </div>
      ) : (
        <>
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
                      patternId={`batikPesanan-${p.id}`}
                      strokeColor="#ffffff"
                      opacity={0.5}
                      size={56}
                    />

                    <div
                      className={`relative z-10 w-10 h-10 shrink-0 rounded-xl ${c.icon} flex items-center justify-center`}
                    >
                      <Inbox size={17} />
                    </div>

                    <div className="relative z-10 min-w-0 flex-1">
                      <p className="font-display font-semibold text-white truncate">
                        {p.toko?.nama_toko || "Toko"}
                      </p>
                      <p className={`flex items-center gap-1 text-xs ${c.sub} mt-0.5`}>
                        <User size={12} />
                        <span className="truncate">
                          {p.nama_penerima || namaPembeli[p.user_id] || "Pembeli"}
                        </span>
                        <span className="mx-1">•</span>
                        <Calendar size={12} className="shrink-0" />
                        <span className="whitespace-nowrap">{formatTanggal(p.created_at)}</span>
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
                        <Badge info={bayarInfo} />
                      </div>

                      {/* Data penerima & alamat pengiriman */}
                      <div className="mb-3 p-3 rounded-lg bg-white border border-slate-200">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                          <MapPin size={13} />
                          Dikirim ke
                        </p>
                        {p.nama_penerima || p.no_hp_penerima || p.alamat_pengiriman ? (
                          <>
                            <p className="text-sm font-medium text-slate-900">
                              {p.nama_penerima || namaPembeli[p.user_id] || "Pembeli"}
                              {p.no_hp_penerima && (
                                <span className="font-normal text-slate-500">
                                  {" "}
                                  • {p.no_hp_penerima}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-line">
                              {p.alamat_pengiriman || "Alamat belum diisi"}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-slate-400 italic">
                            Pesanan ini dibuat sebelum fitur alamat pengiriman
                            aktif, data penerima tidak tersedia.
                          </p>
                        )}
                      </div>

                      {/* Kurir + ongkir + biaya COD + grand total */}
                      <div className="mb-3 p-3 rounded-lg bg-white border border-slate-200">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                          <Truck size={13} />
                          Pengiriman
                        </p>
                        {p.kurir ? (
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Kurir</span>
                              <span className="font-semibold text-slate-900">
                                {p.kurir}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Ongkos kirim</span>
                              <span className="font-medium text-slate-800">
                                {formatRupiah(p.ongkir)}
                              </span>
                            </div>
                            {Number(p.biaya_cod) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Biaya COD</span>
                                <span className="font-medium text-slate-800">
                                  {formatRupiah(p.biaya_cod)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between pt-1.5 mt-1.5 border-t border-slate-200">
                              <span className="font-semibold text-slate-900">
                                Grand total
                              </span>
                              <span className="font-semibold text-slate-900">
                                {formatRupiah(p.grand_total || p.total)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 italic">
                            Data kurir & ongkir belum tersedia untuk pesanan ini.
                          </p>
                        )}
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

                      {/* Kontrol ubah status — HANYA untuk superadmin.
                          Pemilik toko biasa cuma lihat badge status di header,
                          tidak ada tombol/dropdown di sini (juga WAJIB
                          dikunci lewat RLS "Superadmin ubah status pesanan"
                          dan "Superadmin hapus pesanan" di database —
                          lihat catatan keamanan di bagian atas file ini). */}
                      {isSuperAdmin && (
                        <div className="mt-3 pt-3 border-t border-slate-200 flex items-end justify-between gap-3">
                          <div>
                            <label className="block mb-1.5 text-xs font-medium text-slate-500">
                              Ubah status pesanan
                            </label>
                            <select
                              value={p.status}
                              disabled={savingId === p.id || deletingId === p.id}
                              onChange={(e) => handleUbahStatus(p.id, e.target.value)}
                              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white disabled:opacity-50"
                            >
                              <option value="baru">Baru</option>
                              <option value="diproses">Diproses</option>
                              <option value="selesai">Selesai</option>
                              <option value="dibatalkan">Dibatalkan</option>
                            </select>
                          </div>

                          <button
                            onClick={() => handleHapus(p.id)}
                            disabled={deletingId === p.id}
                            title="Hapus pesanan"
                            className="flex items-center gap-1.5 px-3 h-9 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 shrink-0"
                          >
                            <Trash2 size={14} />
                            {deletingId === p.id ? "Menghapus..." : "Hapus"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalHalaman > 1 && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-xs text-slate-400">
                Menampilkan {(halamanAman - 1) * PAGE_SIZE + 1}–
                {Math.min(halamanAman * PAGE_SIZE, daftarTerfilter.length)} dari{" "}
                {daftarTerfilter.length} pesanan
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={halamanAman === 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeft size={14} />
                  Sebelumnya
                </button>
                <span className="text-xs text-slate-500">
                  Hal {halamanAman} / {totalHalaman}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalHalaman, p + 1))
                  }
                  disabled={halamanAman === totalHalaman}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                >
                  Berikutnya
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
