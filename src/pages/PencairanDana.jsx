import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Wallet,
  Store,
  ChevronDown,
  ChevronUp,
  Send,
  Lock,
  Calendar,
  StickyNote,
  Sparkles,
  Banknote,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import Layout from "../components/Layout";

// =========================================================
// Halaman Pencairan Dana (superadmin only)
// - Menampilkan pesanan yang dikelompokkan per toko berdasarkan
//   status_pencairan ('siap_dicairkan' | 'dicairkan' | 'ditahan').
// - Aksi "Cairkan" / "Tahan" TIDAK memakai .update() langsung —
//   keduanya lewat RPC security definer fn_cairkan_pesanan /
//   fn_tahan_pencairan, yang sudah mengunci sendiri di server bahwa
//   hanya role superadmin yang boleh memanggilnya. Guard isSuperAdmin
//   di bawah ini HANYA untuk UX (sembunyikan halaman dari yang bukan
//   superadmin) — bukan pengganti pengecekan di RPC.
//
// TEMA: mengikuti PesananMasuk.jsx — banner gradasi + motif batik,
// kartu toko memakai palet warna solid berotasi yang sama
// (CARD_COLORS), dan gaya tombol/badge disamakan.
// =========================================================

const TABS = [
  { value: "siap_dicairkan", label: "Siap Dicairkan" },
  { value: "dicairkan", label: "Sudah Dicairkan" },
  { value: "ditahan", label: "Ditahan" },
];

// Palet warna kartu — identik dengan CARD_COLORS di Toko.jsx,
// Dasbor.jsx, dan PesananMasuk.jsx, dipakai berotasi per toko.
const CARD_COLORS = [
  { bg: "bg-blue-600", icon: "bg-white/15 text-white", sub: "text-blue-100" },
  { bg: "bg-emerald-600", icon: "bg-white/15 text-white", sub: "text-emerald-100" },
  { bg: "bg-purple-600", icon: "bg-white/15 text-white", sub: "text-purple-100" },
  { bg: "bg-orange-500", icon: "bg-white/15 text-white", sub: "text-orange-100" },
];

// Motif batik (kawung + parang) — disalin persis dari PesananMasuk.jsx
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
          <g fill="none" stroke={strokeColor} strokeWidth="1.1" opacity={opacity}>
            <ellipse cx={size / 2} cy={size * 0.333} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size / 2} cy={size * 0.667} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size * 0.333} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <ellipse cx={size * 0.667} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <circle cx={size / 2} cy={size / 2} r={size * 0.042} opacity="0.7" />
          </g>
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

export default function PencairanDana() {
  const { isSuperAdmin, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState("siap_dicairkan");
  const [pesananList, setPesananList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedToko, setExpandedToko] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [modal, setModal] = useState(null); // { type: 'cairkan' | 'tahan' | 'cairkan_semua', pesananId?, tokoId? }
  const [catatanInput, setCatatanInput] = useState("");

  const fetchPencairan = useCallback(async () => {
    if (!isSuperAdmin) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("pesanan")
      .select(
        `
        id,
        grand_total,
        status_pencairan,
        dicairkan_pada,
        catatan_pencairan,
        toko_id,
        toko:toko_id ( nama_toko )
        `
      )
      .eq("status_pencairan", activeTab)
      .order("id", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
      setPesananList([]);
    } else {
      setErrorMsg("");
      setPesananList(data || []);
    }
    setLoading(false);
  }, [activeTab, isSuperAdmin]);

  useEffect(() => {
    fetchPencairan();
  }, [fetchPencairan]);

  // Kelompokkan pesanan per toko
  const grup = useMemo(() => {
    const map = new Map();
    for (const p of pesananList) {
      const tokoId = p.toko_id;
      const namaToko = p.toko?.nama_toko || "Toko tidak diketahui";
      if (!map.has(tokoId)) {
        map.set(tokoId, { tokoId, namaToko, pesanan: [], total: 0 });
      }
      const entri = map.get(tokoId);
      entri.pesanan.push(p);
      entri.total += Number(p.grand_total || 0);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [pesananList]);

  const totalKeseluruhan = useMemo(
    () => pesananList.reduce((sum, p) => sum + Number(p.grand_total || 0), 0),
    [pesananList]
  );

  const bukaModal = (type, extra) => {
    setCatatanInput("");
    setModal({ type, ...extra });
  };
  const tutupModal = () => {
    setModal(null);
    setCatatanInput("");
  };

  const jalankanCairkan = async (pesananId, catatan) => {
    setBusyId(pesananId);
    const { error } = await supabase.rpc("fn_cairkan_pesanan", {
      p_pesanan_id: pesananId,
      p_catatan: catatan || null,
    });
    setBusyId(null);
    if (error) {
      alert("Gagal mencairkan dana: " + error.message);
      return false;
    }
    return true;
  };

  const jalankanTahan = async (pesananId, catatan) => {
    setBusyId(pesananId);
    const { error } = await supabase.rpc("fn_tahan_pencairan", {
      p_pesanan_id: pesananId,
      p_catatan: catatan || null,
    });
    setBusyId(null);
    if (error) {
      alert("Gagal menahan pencairan: " + error.message);
      return false;
    }
    return true;
  };

  const konfirmasiModal = async () => {
    if (!modal) return;

    if (modal.type === "cairkan") {
      if (await jalankanCairkan(modal.pesananId, catatanInput)) {
        tutupModal();
        fetchPencairan();
      }
      return;
    }

    if (modal.type === "tahan") {
      if (await jalankanTahan(modal.pesananId, catatanInput)) {
        tutupModal();
        fetchPencairan();
      }
      return;
    }

    if (modal.type === "cairkan_semua") {
      const entri = grup.find((g) => g.tokoId === modal.tokoId);
      if (!entri) {
        tutupModal();
        return;
      }
      for (const p of entri.pesanan) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await jalankanCairkan(p.id, catatanInput);
        if (!ok) break;
      }
      tutupModal();
      fetchPencairan();
    }
  };

  if (authLoading) {
    return (
      <Layout title="Pencairan Dana" subtitle="Kelola dana yang siap ditransfer ke penjual">
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          Memuat...
        </div>
      </Layout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Layout title="Pencairan Dana" subtitle="Kelola dana yang siap ditransfer ke penjual">
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 rounded-xl">
          <Lock size={28} className="text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">
            Halaman ini hanya bisa diakses oleh superadmin.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Pencairan Dana" subtitle="Kelola dana yang siap ditransfer ke penjual">
      {/* ================= Banner sambutan (tema sama dengan Pesanan Masuk) ================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 px-5 sm:px-6 py-5 sm:py-6 mb-6 shadow-sm">
        <BatikOverlay patternId="batikBannerPencairan" strokeColor="#ffffff" opacity={0.4} size={64} />
        <Banknote
          size={110}
          strokeWidth={1.2}
          className="absolute -right-5 -bottom-8 text-white/10 rotate-[12deg] pointer-events-none"
        />
        <Wallet
          size={64}
          strokeWidth={1.2}
          className="absolute right-24 -top-5 text-white/10 -rotate-12 pointer-events-none hidden sm:block"
        />

        <div className="relative z-10 flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center text-white">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-white text-base sm:text-lg">
              Kelola pencairan dana penjual
            </p>
            <p className="text-sm text-emerald-100 mt-0.5">
              Transfer manual ke penjual, lalu tandai di sini supaya pembukuan tetap rapi.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-4">
          <p className="text-2xl font-semibold text-white">{formatRupiah(totalKeseluruhan)}</p>
          <p className="text-xs text-emerald-100">
            Total pada tab &ldquo;{TABS.find((t) => t.value === activeTab)?.label}&rdquo;
          </p>
        </div>
      </div>

      {errorMsg && <div className="mb-4 text-sm text-red-600">{errorMsg}</div>}

      {/* Tabs status pencairan */}
      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setActiveTab(t.value);
              setExpandedToko(null);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              activeTab === t.value
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">Memuat data pencairan...</div>
      ) : grup.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 rounded-xl">
          <Wallet size={28} className="text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">Tidak ada pesanan pada status ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grup.map((entri, idx) => {
            const c = CARD_COLORS[idx % CARD_COLORS.length];
            const terbuka = expandedToko === entri.tokoId;

            return (
              <div key={entri.tokoId} className="rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <button
                  onClick={() => setExpandedToko(terbuka ? null : entri.tokoId)}
                  className={`relative w-full flex items-center gap-3 px-4 py-3.5 text-left overflow-hidden ${c.bg}`}
                >
                  <BatikOverlay patternId={`batikToko-${entri.tokoId}`} strokeColor="#ffffff" opacity={0.5} size={56} />

                  <div className={`relative z-10 w-10 h-10 shrink-0 rounded-xl ${c.icon} flex items-center justify-center`}>
                    <Store size={17} />
                  </div>

                  <div className="relative z-10 min-w-0 flex-1">
                    <p className="font-display font-semibold text-white truncate">{entri.namaToko}</p>
                    <p className={`text-xs ${c.sub} mt-0.5`}>{entri.pesanan.length} pesanan</p>
                  </div>

                  <div className="relative z-10 text-right shrink-0">
                    <p className="text-sm font-semibold text-white">{formatRupiah(entri.total)}</p>
                  </div>

                  <div className="relative z-10 shrink-0 text-white/80">
                    {terbuka ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {terbuka && (
                  <div className="border-t border-slate-100 px-4 py-3.5 bg-slate-50">
                    {activeTab === "siap_dicairkan" && (
                      <div className="flex justify-end mb-3">
                        <button
                          onClick={() => bukaModal("cairkan_semua", { tokoId: entri.tokoId })}
                          className="flex items-center gap-1.5 px-3 h-9 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                        >
                          <Send size={14} />
                          Cairkan Semua ({formatRupiah(entri.total)})
                        </button>
                      </div>
                    )}

                    <ul className="divide-y divide-slate-200">
                      {entri.pesanan.map((p) => (
                        <li key={p.id} className="py-2.5 flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-800">Pesanan #{p.id}</p>
                            <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                              {activeTab === "dicairkan" && (
                                <>
                                  <Calendar size={12} />
                                  {formatTanggal(p.dicairkan_pada)}
                                </>
                              )}
                              {p.catatan_pencairan && (
                                <>
                                  <StickyNote size={12} className={activeTab === "dicairkan" ? "ml-2" : ""} />
                                  {p.catatan_pencairan}
                                </>
                              )}
                            </p>
                          </div>

                          <p className="text-sm font-medium text-slate-900 shrink-0">{formatRupiah(p.grand_total)}</p>

                          {activeTab === "siap_dicairkan" && (
                            <div className="flex gap-2 shrink-0">
                              <button
                                disabled={busyId === p.id}
                                onClick={() => bukaModal("tahan", { pesananId: p.id })}
                                className="flex items-center gap-1.5 px-3 h-9 text-sm font-medium text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 disabled:opacity-50"
                              >
                                <Lock size={14} />
                                Tahan
                              </button>
                              <button
                                disabled={busyId === p.id}
                                onClick={() => bukaModal("cairkan", { pesananId: p.id })}
                                className="flex items-center gap-1.5 px-3 h-9 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <Send size={14} />
                                {busyId === p.id ? "Memproses..." : "Cairkan"}
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal konfirmasi */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
            <h2 className="text-base font-semibold text-slate-800">
              {modal.type === "tahan" ? "Tahan pencairan dana?" : "Konfirmasi pencairan dana"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {modal.type === "cairkan_semua"
                ? "Semua pesanan siap cair untuk toko ini akan ditandai sudah dicairkan."
                : modal.type === "tahan"
                ? "Dana ini akan disembunyikan dari daftar siap cair sampai masalah diselesaikan."
                : "Pastikan Anda sudah mentransfer dana secara manual sebelum menekan konfirmasi."}
            </p>

            <label className="block mt-3 mb-1 text-xs font-medium text-slate-500">Catatan (opsional)</label>
            <textarea
              value={catatanInput}
              onChange={(e) => setCatatanInput(e.target.value)}
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              placeholder={modal.type === "tahan" ? "Contoh: barang rusak, sedang komplain" : "Contoh: transfer via BCA 06 Sep"}
            />

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={tutupModal} className="px-3 py-1.5 text-sm text-slate-500 rounded-lg hover:bg-slate-100">
                Batal
              </button>
              <button
                onClick={konfirmasiModal}
                className={`px-3 py-1.5 text-sm font-medium text-white rounded-lg ${
                  modal.type === "tahan" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {modal.type === "tahan" ? "Tahan" : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
