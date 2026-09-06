import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Store,
  UploadCloud,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Wallet,
  PackageCheck,
  Banknote,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import Layout from "../components/Layout";

// =========================================================
// Komponen Ajukan Toko (sisi admin sekolah)
// - Admin sekolah mengajukan pembukaan toko baru dengan melampirkan
//   file SK pembentukan toko online.
// - Pengajuan masuk ke tabel `pengajuan_toko` berstatus "menunggu",
//   lalu diproses superadmin lewat halaman PersetujuanToko.jsx.
// - Perubahan status (disetujui/ditolak) HANYA boleh lewat function
//   `fn_setujui_pengajuan_toko` / `fn_tolak_pengajuan_toko` di database
//   (security definer) — halaman ini TIDAK PERNAH meng-update kolom
//   `status` secara langsung, sesuai RLS "pengajuan_toko" yang memang
//   tidak mengizinkan UPDATE dari client sama sekali.
// - Kalau ditolak, admin sekolah boleh mengajukan ulang lewat function
//   `fn_ajukan_ulang_toko`, yang mengunci syarat: harus pemilik
//   pengajuan & status sebelumnya memang "ditolak".
//
// PERBAIKAN (aturan pembayaran/escrow): ditambahkan kartu penjelasan
// alur pembayaran (dana pembeli ditahan admin dulu -> toko kirim
// barang -> pembeli konfirmasi terima -> admin cairkan dana ke toko
// dikurangi komisi platform) SEBELUM calon pemilik toko mengajukan.
// Ditambahkan juga checkbox wajib "menyetujui aturan pembayaran" agar
// ada jejak persetujuan sebelum pengajuan bisa dikirim/diajukan ulang.
// Ganti KOMISI_PERSEN di bawah sesuai kebijakan platform yang berlaku.
// =========================================================

const BUCKET_SK = "sk-toko";

// TODO: sesuaikan dengan persentase komisi platform yang sebenarnya berlaku.
const KOMISI_PERSEN = 5;

function formatTanggal(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function sanitizeNamaFile(nama) {
  return nama.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

const STATUS_INFO = {
  menunggu: {
    label: "Menunggu Persetujuan",
    className: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  disetujui: {
    label: "Disetujui",
    className: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  ditolak: {
    label: "Ditolak",
    className: "bg-red-100 text-red-700",
    icon: XCircle,
  },
};

// Kartu penjelasan alur pembayaran (escrow) — ditampilkan pada halaman
// pengajuan toko supaya calon pemilik toko paham SEBELUM mendaftar bahwa
// pembayaran pembeli tidak langsung masuk ke rekening toko, melainkan
// ditahan admin dulu sampai pembeli mengonfirmasi barang diterima.
function AturanPembayaranInfo() {
  const langkah = [
    {
      icon: Wallet,
      judul: "1. Pembeli membayar ke platform",
      teks:
        "Saat pembeli checkout, uang pembayaran masuk ke rekening admin/platform terlebih dahulu — bukan langsung ke rekening toko Anda.",
    },
    {
      icon: Store,
      judul: "2. Toko memproses & mengirim pesanan",
      teks:
        "Setelah pesanan masuk, toko menyiapkan dan mengirim barang seperti biasa melalui menu \u201cPesanan Masuk\u201d.",
    },
    {
      icon: PackageCheck,
      judul: "3. Pembeli konfirmasi barang diterima",
      teks:
        "Dana pembeli tetap ditahan admin selama barang dalam perjalanan, sampai pembeli menandai pesanan sebagai \u201cditerima\u201d.",
    },
    {
      icon: Banknote,
      judul: "4. Admin mencairkan dana ke toko",
      teks: `Setelah admin memverifikasi pesanan selesai, dana langsung dicairkan ke toko dengan potongan komisi platform sebesar ${KOMISI_PERSEN}% dari nilai barang.`,
    },
  ];

  return (
    <div className="mb-5 border border-blue-100 rounded-xl bg-blue-50/60 p-4">
      <div className="flex items-start gap-2.5 mb-3.5">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-600 text-white flex items-center justify-center">
          <ShieldCheck size={16} />
        </div>
        <div>
          <p className="font-display font-semibold text-slate-900 text-sm">
            Aturan Pembayaran: Dana Ditahan Dulu oleh Admin
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Mohon dibaca sebelum mengajukan toko — ini berlaku untuk semua
            transaksi di toko Anda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {langkah.map(({ icon: Icon, judul, teks }) => (
          <div
            key={judul}
            className="flex items-start gap-2.5 p-3 bg-white rounded-lg border border-blue-100"
          >
            <Icon size={15} className="mt-0.5 shrink-0 text-blue-600" />
            <div>
              <p className="text-xs font-semibold text-slate-800">{judul}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {teks}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-500 mt-3">
        Dengan kata lain: uang hasil penjualan tidak langsung masuk ke toko
        saat pembeli membayar. Toko akan menerima dana{" "}
        <b>setelah pembeli mengonfirmasi barang sudah diterima</b> dan admin
        selesai memverifikasi pesanan tersebut.
      </p>
    </div>
  );
}

export default function AjukanToko() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [pengajuan, setPengajuan] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state — dipakai baik untuk pengajuan baru maupun ajukan ulang
  const [namaToko, setNamaToko] = useState("");
  const [alamat, setAlamat] = useState("");
  const [noTelp, setNoTelp] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [file, setFile] = useState(null);
  const [setujuAturanPembayaran, setSetujuAturanPembayaran] = useState(false);

  const fetchPengajuan = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("pengajuan_toko")
      .select("*")
      .eq("diajukan_oleh", userId)
      .order("dibuat_pada", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setErrorMsg(error.message);
    } else {
      setPengajuan(data);
      setErrorMsg("");
      // Isi ulang form dengan data terakhir — siap dipakai kalau nanti
      // admin klik "Ajukan Ulang" setelah ditolak.
      if (data) {
        setNamaToko(data.nama_toko || "");
        setAlamat(data.alamat || "");
        setNoTelp(data.no_telp || "");
        setDeskripsi(data.deskripsi || "");
      }
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchPengajuan();
  }, [fetchPengajuan]);

  async function uploadFileSk() {
    if (!file) return null;
    const path = `${userId}/${Date.now()}-${sanitizeNamaFile(file.name)}`;
    const { error } = await supabase.storage.from(BUCKET_SK).upload(path, file);
    if (error) throw new Error("Gagal upload file SK: " + error.message);
    return { path, nama: file.name, tipe: file.type };
  }

  async function handleAjukanBaru(e) {
    e.preventDefault();
    if (!namaToko.trim()) {
      alert("Nama toko wajib diisi.");
      return;
    }
    if (!file) {
      alert("File SK pembentukan toko online wajib dilampirkan.");
      return;
    }
    if (!setujuAturanPembayaran) {
      alert(
        "Silakan centang persetujuan aturan pembayaran terlebih dahulu sebelum mengirim pengajuan."
      );
      return;
    }

    setSubmitting(true);
    try {
      const uploaded = await uploadFileSk();
      const { error } = await supabase.from("pengajuan_toko").insert({
        diajukan_oleh: userId,
        nama_toko: namaToko.trim(),
        alamat: alamat.trim() || null,
        no_telp: noTelp.trim() || null,
        deskripsi: deskripsi.trim() || null,
        file_sk_path: uploaded.path,
        file_sk_nama: uploaded.nama,
        file_sk_tipe: uploaded.tipe,
        status: "menunggu",
      });
      if (error) throw new Error(error.message);
      setFile(null);
      await fetchPengajuan();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAjukanUlang(e) {
    e.preventDefault();
    if (!namaToko.trim()) {
      alert("Nama toko wajib diisi.");
      return;
    }
    if (!setujuAturanPembayaran) {
      alert(
        "Silakan centang persetujuan aturan pembayaran terlebih dahulu sebelum mengajukan ulang."
      );
      return;
    }

    setSubmitting(true);
    try {
      // File baru opsional — kalau admin tidak ganti file, pakai file SK lama.
      let fileSk = {
        path: pengajuan.file_sk_path,
        nama: pengajuan.file_sk_nama,
        tipe: pengajuan.file_sk_tipe,
      };
      if (file) {
        const uploaded = await uploadFileSk();
        fileSk = { path: uploaded.path, nama: uploaded.nama, tipe: uploaded.tipe };
      }

      const { error } = await supabase.rpc("fn_ajukan_ulang_toko", {
        p_pengajuan_id: pengajuan.id,
        p_nama_toko: namaToko.trim(),
        p_alamat: alamat.trim() || null,
        p_no_telp: noTelp.trim() || null,
        p_deskripsi: deskripsi.trim() || null,
        p_file_sk_path: fileSk.path,
        p_file_sk_nama: fileSk.nama,
        p_file_sk_tipe: fileSk.tipe,
      });
      if (error) throw new Error(error.message);
      setFile(null);
      await fetchPengajuan();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

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

  if (loading) {
    return (
      <Layout title="Ajukan Toko" subtitle="Buka toko online untuk sekolah Anda">
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          Memuat...
        </div>
      </Layout>
    );
  }

  const status = pengajuan?.status;
  const statusInfo = status ? STATUS_INFO[status] : null;
  const StatusIcon = statusInfo?.icon;
  const tampilkanForm = !pengajuan || status === "ditolak";

  return (
    <Layout title="Ajukan Toko" subtitle="Buka toko online untuk sekolah Anda">
      {errorMsg && <div className="mb-4 text-sm text-red-600">{errorMsg}</div>}

      {/* Penjelasan aturan pembayaran — selalu tampil selama form pengajuan
          masih relevan (belum pernah mengajukan, atau sedang ajukan ulang),
          supaya dibaca SEBELUM mengirim pengajuan. */}
      {tampilkanForm && <AturanPembayaranInfo />}

      {/* Status pengajuan terakhir (kalau ada) */}
      {pengajuan && (
        <div className="mb-5 border border-slate-200 rounded-xl bg-white p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Store size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold text-slate-900 truncate">
                  {pengajuan.nama_toko}
                </p>
                <p className="text-xs text-slate-400">
                  Diajukan {formatTanggal(pengajuan.dibuat_pada)}
                </p>
              </div>
            </div>
            {statusInfo && (
              <span
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${statusInfo.className}`}
              >
                <StatusIcon size={13} />
                {statusInfo.label}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => lihatFileSk(pengajuan.file_sk_path)}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <FileText size={13} />
            Lihat file SK yang dilampirkan
            <ExternalLink size={11} />
          </button>

          {status === "ditolak" && pengajuan.catatan_admin && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs font-semibold text-red-600 mb-1">
                Alasan penolakan dari superadmin:
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {pengajuan.catatan_admin}
              </p>
            </div>
          )}

          {status === "disetujui" && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Selamat, toko Anda sudah aktif! Anda bisa mulai menambahkan
                barang dan memantau pesanan yang masuk.
              </p>
              <Link
                to="/toko"
                className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Buka halaman Toko
                <ExternalLink size={13} />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Form: tampil kalau belum pernah mengajukan, atau pengajuan
          terakhir ditolak (untuk ajukan ulang). Kalau masih "menunggu"
          atau sudah "disetujui", form disembunyikan. */}
      {tampilkanForm && (
        <form
          onSubmit={status === "ditolak" ? handleAjukanUlang : handleAjukanBaru}
          className="border border-slate-200 rounded-xl bg-white p-4 space-y-4"
        >
          <p className="font-display font-semibold text-slate-900">
            {status === "ditolak" ? "Ajukan Ulang Toko" : "Form Pengajuan Toko Baru"}
          </p>

          <div>
            <label className="block mb-1.5 text-xs font-medium text-slate-500">
              Nama Toko *
            </label>
            <input
              type="text"
              value={namaToko}
              onChange={(e) => setNamaToko(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              placeholder="Contoh: Koperasi Sekolah Maju Jaya"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-medium text-slate-500">
              Alamat
            </label>
            <input
              type="text"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-medium text-slate-500">
              No. Telp
            </label>
            <input
              type="text"
              value={noTelp}
              onChange={(e) => setNoTelp(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-medium text-slate-500">
              Deskripsi
            </label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-medium text-slate-500">
              File SK Pembentukan Toko Online{" "}
              {status === "ditolak"
                ? "(opsional, kalau tidak diganti pakai file lama)"
                : "*"}
            </label>
            <label className="flex items-center gap-2 px-3 py-2.5 text-sm border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-500">
              <UploadCloud size={16} />
              {file ? file.name : "Pilih file (bebas format — PDF, gambar, dokumen)"}
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>

          {/* Persetujuan aturan pembayaran — wajib dicentang sebelum kirim */}
          <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={setujuAturanPembayaran}
              onChange={(e) => setSetujuAturanPembayaran(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-600"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              Saya memahami dan menyetujui bahwa{" "}
              <b>
                dana hasil penjualan akan ditahan sementara oleh admin dan
                baru dicairkan ke toko setelah pembeli mengonfirmasi barang
                diterima
              </b>
              , dengan potongan komisi platform sebesar {KOMISI_PERSEN}% dari
              nilai transaksi, sebagaimana dijelaskan di atas.
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting || !setujuAturanPembayaran}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {submitting
              ? "Mengirim..."
              : status === "ditolak"
              ? "Ajukan Ulang"
              : "Kirim Pengajuan"}
          </button>
        </form>
      )}

      {status === "menunggu" && (
        <div className="text-sm text-slate-500 text-center py-6">
          Pengajuan Anda sedang menunggu persetujuan superadmin. Anda akan
          diberi tahu setelah diproses.
        </div>
      )}
    </Layout>
  );
}
