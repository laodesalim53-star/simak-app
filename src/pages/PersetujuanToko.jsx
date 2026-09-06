import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  FileText,
  ExternalLink,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Store,
  Trash2,
  Sparkles,
  Info,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Layout from "../components/Layout";

// =========================================================
// Komponen Persetujuan Toko (sisi superadmin)
// - Menampilkan semua pengajuan toko dari admin sekolah.
// - Setujui -> memanggil fn_setujui_pengajuan_toko (otomatis membuat
//   baris baru di tabel `toko`).
// - Tolak -> memanggil fn_tolak_pengajuan_toko (wajib isi alasan).
// - KEDUANYA function security definer di database yang mengunci
//   syarat "harus superadmin" di server, bukan cuma disembunyikan
//   di UI — lihat migration tambah_pengajuan_toko_dan_approval.
//   Tabel pengajuan_toko sengaja TIDAK punya policy UPDATE untuk
//   siapa pun, jadi halaman ini tidak pernah bisa .update() langsung.
// - Hapus -> .delete() langsung ke tabel pengajuan_toko. WAJIB ada
//   RLS policy DELETE khusus superadmin di tabel ini:
//     create policy "Superadmin hapus pengajuan toko"
//     on pengajuan_toko for delete
//     using ( EXISTS (
//       SELECT 1 FROM profil
//       WHERE profil.id = auth.uid() AND profil.role = 'superadmin'
//     ) );
//   PENTING: kalau policy ini belum ada, Supabase TIDAK mengembalikan
//   error saat delete() dipanggil — ia hanya mencocokkan 0 baris (RLS
//   menyaring semuanya), jadi error = null padahal 0 baris yang benar-
//   benar terhapus. Karena itu kode di bawah memakai .select() setelah
//   delete() dan mengecek jumlah baris yang kembali, bukan cuma error,
//   supaya penghapusan yang diam-diam gagal karena RLS tidak dikira
//   berhasil oleh UI (ini penyebab "sudah dihapus tapi muncul lagi
//   setelah refresh").
//
// ATURAN PEMBAYARAN (ditampilkan sebagai catatan di halaman ini, BUKAN
// logika otomatis): begitu toko disetujui, seluruh pembayaran pembeli
// masuk dulu ke rekening/akun superadmin. Penjual (admin sekolah) baru
// menerima uang hasil penjualannya setelah barang benar-benar diambil
// atau diserahkan ke pembeli. Ini murni kebijakan operasional yang perlu
// dijalankan manual oleh superadmin di luar sistem (belum ada alur
// escrow/pencairan otomatis di database) — catatan ini hanya pengingat
// supaya kebijakannya konsisten dipahami setiap kali menyetujui toko.
//
// TEMA (mengikuti Toko.jsx): banner sambutan bergradasi + motif batik,
// dan kartu pengajuan pakai aksen warna solid berotasi (biru/hijau/
// ungu/oranye) yang sama seperti kartu toko di Dasbor & Toko, supaya
// tampilan antar halaman konsisten. Bagian detail (alamat, file SK,
// tombol aksi) tetap memakai latar terang agar mudah dibaca.
// =========================================================

const BUCKET_SK = "sk-toko";

const FILTER_STATUS = [
  { value: "menunggu", label: "Menunggu" },
  { value: "disetujui", label: "Disetujui" },
  { value: "ditolak", label: "Ditolak" },
  { value: "semua", label: "Semua" },
];

const STATUS_INFO = {
  menunggu: { label: "Menunggu", className: "bg-amber-100 text-amber-700", icon: Clock },
  disetujui: { label: "Disetujui", className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  ditolak: { label: "Ditolak", className: "bg-red-100 text-red-700", icon: XCircle },
};

// Versi badge "di atas warna solid" — dipakai di header kartu yang kini
// berlatar warna, supaya kontrasnya tetap enak dibaca.
const STATUS_ON_COLOR = {
  menunggu: "bg-white/25 text-white",
  disetujui: "bg-white/25 text-white",
  ditolak: "bg-white/25 text-white",
};

// Palet warna kartu — identik dengan CARD_COLORS di Toko.jsx & Dasbor,
// dipakai berotasi sesuai urutan pengajuan yang tampil.
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

function formatTanggal(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PersetujuanToko() {
  const [daftar, setDaftar] = useState([]);
  const [namaPengaju, setNamaPengaju] = useState({}); // { [user_id]: { nama, sekolah } }
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("menunggu");
  const [prosesId, setProsesId] = useState(null);
  const [tolakId, setTolakId] = useState(null); // id yang sedang diisi alasan tolak
  const [alasanTolak, setAlasanTolak] = useState("");

  const fetchDaftar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pengajuan_toko")
      .select("*")
      .order("dibuat_pada", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setDaftar(data || []);
    setErrorMsg("");

    // pengajuan_toko.diajukan_oleh mengacu ke auth.users, bukan langsung
    // ke profil — jadi diambil terpisah, sama seperti pola namaPembeli
    // di PesananMasuk.jsx.
    const idUnik = [...new Set((data || []).map((p) => p.diajukan_oleh))];
    if (idUnik.length > 0) {
      const { data: profilData } = await supabase
        .from("profil")
        .select(
          "id, nama_lengkap_pendaftar, guru:guru_id ( nama_lengkap ), sekolah:sekolah_id ( nama_sekolah )"
        )
        .in("id", idUnik);

      const peta = {};
      (profilData || []).forEach((p) => {
        peta[p.id] = {
          nama: p.guru?.nama_lengkap || p.nama_lengkap_pendaftar || "Admin Sekolah",
          sekolah: p.sekolah?.nama_sekolah || "-",
        };
      });
      setNamaPengaju(peta);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDaftar();
  }, [fetchDaftar]);

  async function lihatFileSk(path) {
    const { data, error } = await supabase.storage
      .from(BUCKET_SK)
      .createSignedUrl(path, 300);
    if (error) {
      alert("Gagal membuka file: " + error.message);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleSetujui(id) {
    if (
      !confirm(
        "Setujui pengajuan toko ini? Toko akan langsung aktif.\n\n" +
          "Ingat: setelah disetujui, seluruh pembayaran pembeli masuk ke " +
          "superadmin terlebih dahulu. Penjual baru menerima uang hasil " +
          "penjualan setelah barang diambil/diserahkan ke pembeli."
      )
    )
      return;
    setProsesId(id);
    const { error } = await supabase.rpc("fn_setujui_pengajuan_toko", {
      p_pengajuan_id: id,
      p_catatan: null,
    });
    if (error) {
      alert("Gagal menyetujui: " + error.message);
    } else {
      await fetchDaftar();
    }
    setProsesId(null);
  }

  function bukaFormTolak(id) {
    setTolakId(id);
    setAlasanTolak("");
  }

  async function handleTolak(id) {
    if (!alasanTolak.trim()) {
      alert("Alasan penolakan wajib diisi.");
      return;
    }
    setProsesId(id);
    const { error } = await supabase.rpc("fn_tolak_pengajuan_toko", {
      p_pengajuan_id: id,
      p_catatan: alasanTolak.trim(),
    });
    if (error) {
      alert("Gagal menolak: " + error.message);
    } else {
      setTolakId(null);
      await fetchDaftar();
    }
    setProsesId(null);
  }

  async function handleHapus(id) {
    if (!confirm("Hapus pengajuan ini secara permanen? Tindakan ini tidak dapat dibatalkan.")) return;
    setProsesId(id);

    // PENTING: .select() di sini WAJIB ada. Tanpa ini, delete() yang
    // diblokir oleh RLS (karena belum ada policy DELETE yang cocok)
    // tetap mengembalikan error = null (dianggap "berhasil") padahal
    // 0 baris yang benar-benar terhapus di database — akibatnya UI
    // menghapus item dari tampilan seolah sukses, tapi begitu di-refresh
    // datanya muncul lagi karena memang tidak pernah terhapus.
    const { data, error } = await supabase
      .from("pengajuan_toko")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      alert("Gagal menghapus: " + error.message);
    } else if (!data || data.length === 0) {
      // error === null tapi tidak ada baris yang kembali -> RLS
      // menolak secara diam-diam (bukan izin Anda, atau policy DELETE
      // belum diatur untuk tabel ini).
      alert(
        "Pengajuan tidak terhapus. Kemungkinan Anda tidak memiliki izin untuk menghapus data ini, atau policy RLS DELETE belum diatur di tabel pengajuan_toko."
      );
      // Muat ulang dari database supaya tampilan tetap sinkron dengan
      // kondisi sebenarnya (bukan dihapus dari state secara optimis).
      await fetchDaftar();
    } else {
      setDaftar((prev) => prev.filter((p) => p.id !== id));
      if (tolakId === id) setTolakId(null);
    }
    setProsesId(null);
  }

  const daftarTampil =
    filterStatus === "semua" ? daftar : daftar.filter((p) => p.status === filterStatus);

  return (
    <Layout
      title="Persetujuan Toko"
      subtitle="Tinjau pengajuan pembukaan toko dari admin sekolah"
    >
      {/* ================= Banner sambutan (tema sama dengan Toko) ================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-fuchsia-600 px-5 sm:px-6 py-5 sm:py-6 mb-6 shadow-sm">
        <BatikOverlay
          patternId="batikBannerPersetujuan"
          strokeColor="#ffffff"
          opacity={0.4}
          size={64}
        />
        <ShieldCheck
          size={110}
          strokeWidth={1.2}
          className="absolute -right-5 -bottom-8 text-white/10 rotate-[12deg] pointer-events-none"
        />
        <Store
          size={64}
          strokeWidth={1.2}
          className="absolute right-20 -top-5 text-white/10 -rotate-12 pointer-events-none hidden sm:block"
        />
        <FileText
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
              Tinjau pengajuan toko baru
            </p>
            <p className="text-sm text-blue-100 mt-0.5">
              Periksa data toko, dokumen SK, lalu setujui atau tolak
              pengajuan dari admin sekolah.
            </p>
          </div>
        </div>
      </div>

      {/* Catatan aturan pembayaran — pengingat kebijakan, bukan logika
          otomatis. Ditampilkan di atas daftar supaya selalu terlihat
          setiap kali superadmin meninjau pengajuan. */}
      <div className="flex items-start gap-2.5 mb-5 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
        <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
          <span className="font-semibold">Aturan pembayaran:</span> setelah
          toko disetujui, seluruh pembayaran dari pembeli masuk terlebih
          dahulu ke superadmin. Penjual (admin sekolah) baru menerima uang
          hasil penjualannya setelah barang diambil atau diserahkan kepada
          pembeli.
        </p>
      </div>

      {errorMsg && <div className="mb-4 text-sm text-red-600">{errorMsg}</div>}

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
        <div className="py-16 text-center text-sm text-slate-400">Memuat pengajuan...</div>
      ) : daftarTampil.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 rounded-xl">
          <ShieldCheck size={28} className="text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">Tidak ada pengajuan di kategori ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {daftarTampil.map((p, idx) => {
            const c = CARD_COLORS[idx % CARD_COLORS.length];
            const statusInfo = STATUS_INFO[p.status] || {
              label: p.status,
              className: "bg-slate-100 text-slate-600",
              icon: Clock,
            };
            const StatusIcon = statusInfo.icon;
            const statusOnColor = STATUS_ON_COLOR[p.status] || "bg-white/25 text-white";
            const pengaju = namaPengaju[p.diajukan_oleh];

            return (
              <div
                key={p.id}
                className="rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header kartu — latar warna solid berotasi + motif batik,
                    mengikuti tema kartu toko */}
                <div className={`relative flex items-start justify-between gap-3 px-4 py-3.5 overflow-hidden ${c.bg}`}>
                  <BatikOverlay
                    patternId={`batikPersetujuan-${p.id}`}
                    strokeColor="#ffffff"
                    opacity={0.5}
                    size={56}
                  />

                  <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-lg ${c.icon} flex items-center justify-center shrink-0`}>
                      <Store size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-white truncate">
                        {p.nama_toko}
                      </p>
                      <p className={`text-xs ${c.sub} truncate`}>
                        {pengaju?.nama || "Memuat..."} • {pengaju?.sekolah || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center gap-2 shrink-0">
                    <span
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${statusOnColor}`}
                    >
                      <StatusIcon size={13} />
                      {statusInfo.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleHapus(p.id)}
                      disabled={prosesId === p.id}
                      title="Hapus pengajuan"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {prosesId === p.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Detail — tetap latar terang supaya mudah dibaca */}
                <div className="px-4 py-3.5">
                  <div className="text-sm text-slate-600 space-y-0.5 mb-2">
                    {p.alamat && <p>{p.alamat}</p>}
                    {p.no_telp && <p>{p.no_telp}</p>}
                    {p.deskripsi && <p className="text-slate-500 italic">{p.deskripsi}</p>}
                  </div>

                  <p className="text-xs text-slate-400 mb-2">
                    Diajukan {formatTanggal(p.dibuat_pada)}
                    {p.diproses_pada && ` • Diproses ${formatTanggal(p.diproses_pada)}`}
                  </p>

                  <button
                    type="button"
                    onClick={() => lihatFileSk(p.file_sk_path)}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 mb-3"
                  >
                    <FileText size={13} />
                    Lihat file SK ({p.file_sk_nama || "file"})
                    <ExternalLink size={11} />
                  </button>

                  {p.status === "ditolak" && p.catatan_admin && (
                    <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-100">
                      <p className="text-xs font-semibold text-red-600 mb-0.5">Alasan ditolak:</p>
                      <p className="text-sm text-red-700">{p.catatan_admin}</p>
                    </div>
                  )}

                  {p.status === "menunggu" && (
                    <div className="pt-3 border-t border-slate-200">
                      {tolakId === p.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={alasanTolak}
                            onChange={(e) => setAlasanTolak(e.target.value)}
                            rows={2}
                            placeholder="Tulis alasan penolakan..."
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTolak(p.id)}
                              disabled={prosesId === p.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                              {prosesId === p.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <X size={14} />
                              )}
                              Kirim Penolakan
                            </button>
                            <button
                              onClick={() => setTolakId(null)}
                              className="px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSetujui(p.id)}
                            disabled={prosesId === p.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {prosesId === p.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            Setujui
                          </button>
                          <button
                            onClick={() => bukaFormTolak(p.id)}
                            disabled={prosesId === p.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          >
                            <X size={14} />
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
