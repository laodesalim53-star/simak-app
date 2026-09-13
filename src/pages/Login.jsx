import { useEffect, useRef } from "react";
import { useAuth } from "../lib/AuthContext";

const PLACEHOLDER_NAME = "Your Institution";

export default function Loader() {
  const { profil } = useAuth();
  const namaSekolah = profil?.nama_sekolah;

  const textRef = useRef(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const displayName = namaSekolah || PLACEHOLDER_NAME;
    const welcomeText = `Welcome to ${displayName}`;
    const accentFrom = welcomeText.indexOf(displayName);

    el.innerHTML = "";
    [...welcomeText].forEach((ch, i) => {
      const span = document.createElement("span");
      span.textContent = ch === " " ? "\u00A0" : ch;
      span.style.animationDelay = `${i * 0.045}s`;
      if (i >= accentFrom) span.classList.add("loader-accent");
      el.appendChild(span);
    });
  }, [namaSekolah]);

  return (
    <div className="loader-shell min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="loader-overlay" aria-hidden />

      <div className="w-full max-w-sm relative z-10 text-center">
        <div className="relative w-12 h-12 mx-auto mb-4">
          <div className="loader-badge-glow absolute inset-0 rounded-xl" />
          <div className="loader-badge relative w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl">
            S
          </div>
        </div>

        <h1 className="loader-title text-2xl font-semibold">SIMAK</h1>
        <p className="loader-tagline text-[11px] font-medium uppercase tracking-[0.2em] mt-2">
          School Management Information System
        </p>

        <p className="loader-welcome mt-4" ref={textRef} />

        <div className="loader-ring mx-auto mt-8" />
      </div>

      <style>{`
        .loader-shell {
          --bg-1: #05061a;
          --bg-2: #0d1440;
          --accent: #60a5fa;
          --accent-strong: #bfdbfe;
          --ring-soft: rgba(59, 130, 246, 0.18);
          --text-primary: #eaf2ff;
          --code-text: rgba(147, 197, 253, 0.55);
          background: linear-gradient(160deg, var(--bg-1), var(--bg-2));
        }

        .loader-overlay {
          position: absolute;
          inset: 0;
          z-index: 0;
          background: radial-gradient(circle at 50% 35%, rgba(59, 130, 246, 0.18), rgba(5, 6, 26, 0.85) 70%);
          pointer-events: none;
        }

        .loader-badge-glow {
          background: var(--accent);
          filter: blur(10px);
          opacity: 0.4;
          animation: loader-glow-pulse 2.8s ease-in-out infinite;
        }
        .loader-badge {
          background: linear-gradient(160deg, var(--accent-strong), var(--accent));
          color: #071233;
          box-shadow: 0 0 18px rgba(59, 130, 246, 0.45);
        }

        .loader-title {
          color: var(--text-primary);
          text-shadow: 0 0 14px rgba(59, 130, 246, 0.35);
        }
        .loader-tagline { color: var(--code-text); }

        .loader-welcome {
          min-height: 20px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          letter-spacing: 0.02em;
        }
        .loader-welcome span {
          display: inline-block;
          opacity: 0;
          animation: loader-letter-in 0.4s ease-out forwards;
        }
        .loader-welcome span.loader-accent {
          color: var(--accent);
          text-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
        }

        .loader-ring {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2.5px solid var(--ring-soft);
          border-top-color: var(--accent);
          animation: loader-spin 0.8s linear infinite;
        }

        @keyframes loader-glow-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes loader-letter-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loader-spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
    </div>
  );
}
