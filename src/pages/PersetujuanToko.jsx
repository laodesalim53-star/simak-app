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
    if (!confirm("Setujui pengajuan toko ini? Toko akan langsung aktif.")) return;
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

  const daftarTampil =
    filterStatus === "semua" ? daftar : daftar.filter((p) => p.status === filterStatus);

  return (
    <Layout
      title="Persetujuan Toko"
      subtitle="Tinjau pengajuan pembukaan toko dari admin sekolah"
    >
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
          {daftarTampil.map((p) => {
            const statusInfo = STATUS_INFO[p.status] || {
              label: p.status,
              className: "bg-slate-100 text-slate-600",
              icon: Clock,
            };
            const StatusIcon = statusInfo.icon;
            const pengaju = namaPengaju[p.diajukan_oleh];

            return (
              <div key={p.id} className="border border-slate-200 rounded-xl bg-white p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <Store size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-slate-900 truncate">
                        {p.nama_toko}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {pengaju?.nama || "Memuat..."} • {pengaju?.sekolah || "-"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${statusInfo.className}`}
                  >
                    <StatusIcon size={13} />
                    {statusInfo.label}
                  </span>
                </div>

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
            );
          })}
        </div>
      )}
    </Layout>
  );
}
