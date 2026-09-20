import { Crown, Star, Shield } from "lucide-react";
import { useAuth } from "../lib/AuthContext"; // sesuaikan path jika beda

// Hook kecil: kembalikan id paket akun yang sedang login ("free" | "standar" | "premium").
// Premium mengikuti isPremium (sudah memperhitungkan masa berlaku di AuthContext),
// Standar mengikuti kolom profil.paket.
export function usePaketSaatIni() {
  const { isPremium, paket } = useAuth();
  if (isPremium) return "premium";
  if (paket === "standar") return "standar";
  return "free";
}

// Kilau emas yang menyapu sekali tiap beberapa detik — hanya dipakai di Premium.
// Otomatis mati kalau perangkat meminta gerakan dikurangi.
const GAYA_KILAU = `
@keyframes pk-kilau {
  0%   { transform: translateX(-130%); }
  55%  { transform: translateX(230%); }
  100% { transform: translateX(230%); }
}
.pk-kilau { position: relative; overflow: hidden; }
.pk-kilau::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.7) 50%, transparent 65%);
  transform: translateX(-130%);
  animation: pk-kilau 3.6s ease-in-out infinite;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .pk-kilau::after { animation: none; display: none; }
}
`;

const TEMA = {
  free: {
    label: "Free",
    Icon: Shield,
    pill: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    medali: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  },
  standar: {
    label: "Standar",
    Icon: Star,
    pill: "bg-gradient-to-r from-teal-50 to-teal-100 text-teal-800 ring-1 ring-teal-300",
    medali:
      "bg-gradient-to-br from-teal-100 to-teal-300 text-teal-800 ring-1 ring-teal-400",
  },
  premium: {
    label: "Premium",
    Icon: Crown,
    pill: "pk-kilau bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 text-amber-950 ring-1 ring-amber-500 shadow-sm",
    medali:
      "pk-kilau bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 text-amber-950 ring-2 ring-amber-400 ring-offset-2 ring-offset-white shadow-md",
  },
};

// Lencana kecil berbentuk pil. Cocok untuk Sidebar, header, atau samping nama user.
// <PaketBadge paket="premium" size="sm" />
export default function PaketBadge({ paket = "free", size = "md" }) {
  const t = TEMA[paket] || TEMA.free;
  const kecil = size === "sm";
  const Icon = t.Icon;

  return (
    <>
      {paket === "premium" && <style>{GAYA_KILAU}</style>}
      <span
        className={`inline-flex items-center rounded-full font-semibold ${
          kecil ? "gap-1 px-2 py-0.5 text-xs" : "gap-1.5 px-3 py-1 text-sm"
        } ${t.pill}`}
      >
        <Icon
          className={kecil ? "h-3 w-3" : "h-4 w-4"}
          fill={paket === "premium" ? "currentColor" : "none"}
          fillOpacity={0.25}
          aria-hidden="true"
        />
        {t.label}
      </span>
    </>
  );
}

// Medali bulat yang lebih besar. Dipakai di kepala kartu paket.
// <PaketEmblem paket="premium" />
export function PaketEmblem({ paket = "free", size = "md" }) {
  const t = TEMA[paket] || TEMA.free;
  const besar = size === "lg";
  const Icon = t.Icon;

  return (
    <>
      {paket === "premium" && <style>{GAYA_KILAU}</style>}
      <span
        className={`inline-flex items-center justify-center rounded-full ${
          besar ? "h-14 w-14" : "h-12 w-12"
        } ${t.medali}`}
        title={`Paket ${t.label}`}
      >
        <Icon
          className={besar ? "h-7 w-7" : "h-6 w-6"}
          fill={paket === "premium" ? "currentColor" : "none"}
          fillOpacity={0.25}
          aria-hidden="true"
        />
      </span>
    </>
  );
}
