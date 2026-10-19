import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';
import KopSurat from '../components/KopSurat';
import { BANK_TKA as BANK_DASAR, JENJANG_TKA, JENIS_TKA, labelPaket } from '../data/tkaSoal';
import { PAKET_TAMBAHAN } from '../data/paketTambahan';

// Gabungan soal lama + paket tambahan bergambar.
const BANK_TKA = [...BANK_DASAR, ...PAKET_TAMBAHAN];

// Halaman "Simulasi TKA" untuk SD dan SMP.
// Alur: pilih jenjang -> jenis mapel -> mapel/paket -> kerjakan (ada timer) -> hasil + pembahasan.
// Route contoh: /simulasi-tka
// Soal diambil dari src/data/tkaSoal.js dan src/data/paketTambahan.js,
// jadi paket baru cukup ditambahkan di salah satu file tersebut.

const HURUF = ['A', 'B', 'C', 'D'];

function formatWaktu(detik) {
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const kartu = 'bg-white rounded-2xl border border-[#6b0f1a]/15 shadow-sm';
const inputSelect =
  'w-full rounded-xl px-4 py-3 border border-[#6b0f1a]/15 bg-white focus:border-[#6b0f1a] focus:ring-2 focus:ring-[#6b0f1a]/20 outline-none transition-colors';

// embedded = true  -> dipakai sebagai tab di halaman lain (tanpa Layout sendiri).
// sekolahId        -> id sekolah untuk kop surat (dikirim dari halaman induk,
//                     mis. UjianOnline). Wajib diisi untuk siswa tanpa login.
export default function SimulasiTKA({ embedded = false, sekolahId: sekolahIdProp = null }) {
  const { session } = useAuth();
  // Urutan sumber id sekolah: prop dari halaman induk, lalu ?sekolah= di URL
  // (link yang dibagikan guru ke siswa tanpa login).
  const sekolahId =
    sekolahIdProp || new URLSearchParams(window.location.search).get('sekolah') || null;

  const [tahap, setTahap] = useState('pilih'); // pilih | kerjakan | hasil
  const [jenjang, setJenjang] = useState('sd');
  const [jenis, setJenis] = useState('wajib');
  const [paketId, setPaketId] = useState(
    () => BANK_TKA.find((p) => p.jenjang === 'sd' && p.jenis === 'wajib')?.id || ''
  );
  const [error, setError] = useState('');
  const [tersalin, setTersalin] = useState(false);

  const [no, setNo] = useState(0);
  const [jawaban, setJawaban] = useState({}); // { [indeksSoal]: indeksPilihan }
  const [ragu, setRagu] = useState({}); // { [indeksSoal]: true }
  const [berakhir, setBerakhir] = useState(0);
  const [sisa, setSisa] = useState(0);
  const [konfirmasi, setKonfirmasi] = useState(false);

  const opsiPaket = useMemo(
    () => BANK_TKA.filter((p) => p.jenjang === jenjang && p.jenis === jenis),
    [jenjang, jenis]
  );
  const paket = BANK_TKA.find((p) => p.id === paketId);

  function ubahFilter(jenjangBaru, jenisBaru) {
    setJenjang(jenjangBaru);
    setJenis(jenisBaru);
    const pertama = BANK_TKA.find((p) => p.jenjang === jenjangBaru && p.jenis === jenisBaru);
    setPaketId(pertama?.id || '');
    setError('');
  }

  // Salin link halaman simulasi agar bisa dibagikan ke siswa.
  async function salinLink() {
    const sekolahQuery = sekolahId ? `sekolah=${encodeURIComponent(sekolahId)}` : '';
    const url = embedded
      ? `${window.location.origin}/ujian-online?tab=tka${sekolahQuery ? `&${sekolahQuery}` : ''}`
      : `${window.location.origin}/simulasi-tka${sekolahQuery ? `?${sekolahQuery}` : ''}`;
    try {
      await navigator.clipboard.writeText(url);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      window.prompt('Salin link ini:', url);
    }
  }

  function mulai() {
    if (!paket) {
      setError('Belum ada soal untuk pilihan ini. Pilih jenis atau jenjang lain.');
      return;
    }
    setError('');
    setJawaban({});
    setRagu({});
    setNo(0);
    setKonfirmasi(false);
    setSisa(paket.durasiMenit * 60);
    setBerakhir(Date.now() + paket.durasiMenit * 60000);
    setTahap('kerjakan');
  }

  // Hitung mundur berdasarkan waktu berakhir (tetap akurat walau tab sempat tidak aktif).
  useEffect(() => {
    if (tahap !== 'kerjakan') return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((berakhir - Date.now()) / 1000));
      setSisa(s);
      if (s <= 0) setTahap('hasil');
    }, 1000);
    return () => clearInterval(id);
  }, [tahap, berakhir]);

  const hasil = useMemo(() => {
    if (tahap !== 'hasil' || !paket) return null;
    let benar = 0;
    let kosong = 0;
    paket.soal.forEach((s, i) => {
      if (jawaban[i] === undefined) kosong++;
      else if (jawaban[i] === s.kunci) benar++;
    });
    const salah = paket.soal.length - benar - kosong;
    return { benar, salah, kosong, skor: Math.round((benar / paket.soal.length) * 100) };
  }, [tahap, paket, jawaban]);

  /* ---------------------- TAHAP 1: PILIH SIMULASI ---------------------- */
  let isi = null;

  if (tahap === 'pilih') {
    isi = (
      <div className={`max-w-md mx-auto mt-8 p-6 sm:p-8 ${kartu}`}>
        <div className="mx-auto w-20 h-20 rounded-full bg-[#6b0f1a] flex items-center justify-center text-4xl shadow-md">
          🎓
        </div>
        <h1 className="text-2xl font-semibold text-center text-[#3b0a0a] mt-4">Simulasi TKA</h1>
        <p className="text-sm text-center text-[#6b0f1a]/60 mt-1 mb-6">
          Pilih jenjang dan mata pelajaran untuk memulai simulasi.
        </p>

        <label className="block text-sm font-semibold text-[#3b0a0a] mb-1.5">Jenjang Pendidikan</label>
        <select
          value={jenjang}
          onChange={(e) => ubahFilter(e.target.value, jenis)}
          className={inputSelect}
        >
          {Object.entries(JENJANG_TKA).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <label className="block text-sm font-semibold text-[#3b0a0a] mt-4 mb-1.5">
          Jenis Mata Pelajaran
        </label>
        <select
          value={jenis}
          onChange={(e) => ubahFilter(jenjang, e.target.value)}
          className={inputSelect}
        >
          {Object.entries(JENIS_TKA).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <label className="block text-sm font-semibold text-[#3b0a0a] mt-4 mb-1.5">Mata Pelajaran</label>
        <select
          value={paketId}
          onChange={(e) => setPaketId(e.target.value)}
          disabled={opsiPaket.length === 0}
          className={`${inputSelect} disabled:opacity-50`}
        >
          {opsiPaket.length === 0 && <option value="">Belum ada soal untuk pilihan ini</option>}
          {opsiPaket.map((p) => (
            <option key={p.id} value={p.id}>
              {labelPaket(p)}
            </option>
          ))}
        </select>

        {paket && (
          <p className="text-xs text-[#6b0f1a]/60 mt-2">
            {paket.soal.length} soal · waktu {paket.durasiMenit} menit
          </p>
        )}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <button
          onClick={mulai}
          disabled={!paket}
          className="mt-6 w-full py-3 rounded-xl bg-[#6b0f1a] text-white font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          ▶ Mulai Simulasi
        </button>

        <button
          type="button"
          onClick={salinLink}
          className="mt-3 w-full py-2 rounded-xl border border-[#6b0f1a]/20 text-[#6b0f1a] text-sm hover:bg-[#6b0f1a]/5"
        >
          {tersalin ? '✓ Link tersalin' : '🔗 Salin Link Simulasi'}
        </button>
      </div>
    );
  }

  /* ---------------------- TAHAP 2: KERJAKAN ---------------------- */
  if (tahap === 'kerjakan' && paket) {
    const soal = paket.soal[no];
    const terjawab = Object.keys(jawaban).length;
    const waktuHampirHabis = sisa <= 60;

    isi = (
      <div className="max-w-4xl mx-auto mt-4 px-4 pb-10">
        {/* Kop surat: siswa tanpa login memakai mode publik (lewat sekolahId). */}
        <div className={`${kartu} p-4 pb-1 mb-4`}>
          <KopSurat
            sekolahId={sekolahId}
            publik={!session?.user?.id}
            sembunyikanJikaKosong
          />
        </div>

        <div className={`${kartu} p-4 flex items-center justify-between gap-3 flex-wrap`}>
          <div>
            <h1 className="font-semibold text-[#3b0a0a]">{labelPaket(paket)}</h1>
            <p className="text-xs text-[#6b0f1a]/60">
              {terjawab}/{paket.soal.length} soal terjawab
            </p>
          </div>
          <div
            className={`px-4 py-2 rounded-xl font-mono text-lg font-semibold ${
              waktuHampirHabis ? 'bg-red-100 text-red-700' : 'bg-[#d4a017]/15 text-[#8a6a0d]'
            }`}
            aria-live="off"
          >
            ⏱ {formatWaktu(sisa)}
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_220px] gap-4 mt-4">
          {/* Soal */}
          <div className={`${kartu} p-5`}>
            <p className="text-xs text-[#6b0f1a]/60 mb-2">
              Soal {no + 1} dari {paket.soal.length}
            </p>
            <p className="font-medium text-[#3b0a0a] mb-4 leading-relaxed whitespace-pre-line">
              {soal.q}
            </p>
            {soal.gambar && (
              <img
                src={soal.gambar}
                alt={soal.alt || 'Gambar soal'}
                className="max-w-full h-auto mb-4 rounded-lg border border-[#6b0f1a]/15"
              />
            )}

            <div className="space-y-2">
              {soal.opsi.map((teks, i) => {
                const dipilih = jawaban[no] === i;
                return (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      dipilih
                        ? 'border-[#6b0f1a] bg-[#f7e6e3]/60'
                        : 'border-[#6b0f1a]/15 hover:bg-[#6b0f1a]/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`soal-${no}`}
                      checked={dipilih}
                      onChange={() => setJawaban({ ...jawaban, [no]: i })}
                      className="mt-1"
                    />
                    <span>
                      <strong>{HURUF[i]}.</strong> {teks}
                    </span>
                  </label>
                );
              })}
            </div>

            <label className="flex items-center gap-2 mt-4 text-sm text-[#6b0f1a] cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={!!ragu[no]}
                onChange={(e) => setRagu({ ...ragu, [no]: e.target.checked })}
              />
              Ragu-ragu
            </label>

            <div className="flex items-center justify-between gap-2 mt-5">
              <button
                onClick={() => setNo(no - 1)}
                disabled={no === 0}
                className="px-4 py-2 rounded-lg border border-[#6b0f1a]/20 text-[#6b0f1a] hover:bg-[#6b0f1a]/5 disabled:opacity-40"
              >
                ← Sebelumnya
              </button>
              {no < paket.soal.length - 1 ? (
                <button
                  onClick={() => setNo(no + 1)}
                  className="px-4 py-2 rounded-lg bg-[#6b0f1a] text-white hover:opacity-90"
                >
                  Berikutnya →
                </button>
              ) : (
                <button
                  onClick={() => setKonfirmasi(true)}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
                >
                  Selesai
                </button>
              )}
            </div>
          </div>

          {/* Navigasi nomor */}
          <div className={`${kartu} p-4 h-fit`}>
            <p className="text-sm font-semibold text-[#3b0a0a] mb-3">Daftar Soal</p>
            <div className="grid grid-cols-5 gap-2">
              {paket.soal.map((_, i) => {
                const sudah = jawaban[i] !== undefined;
                let warna = 'border border-[#6b0f1a]/20 text-[#6b0f1a]';
                if (sudah) warna = 'bg-[#6b0f1a] text-white';
                if (ragu[i]) warna = 'bg-[#d4a017] text-white';
                return (
                  <button
                    key={i}
                    onClick={() => setNo(i)}
                    aria-label={`Soal ${i + 1}`}
                    className={`h-9 rounded-lg text-sm font-medium ${warna} ${
                      i === no ? 'ring-2 ring-offset-1 ring-[#3b0a0a]' : ''
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 space-y-1 text-xs text-[#6b0f1a]/70">
              <p>
                <span className="inline-block w-3 h-3 rounded bg-[#6b0f1a] align-middle mr-1" />
                Sudah dijawab
              </p>
              <p>
                <span className="inline-block w-3 h-3 rounded bg-[#d4a017] align-middle mr-1" />
                Ragu-ragu
              </p>
              <p>
                <span className="inline-block w-3 h-3 rounded border border-[#6b0f1a]/30 align-middle mr-1" />
                Belum dijawab
              </p>
            </div>
            <button
              onClick={() => setKonfirmasi(true)}
              className="mt-4 w-full py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
            >
              Selesai & Kumpulkan
            </button>
          </div>
        </div>

        {konfirmasi && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
              <h2 className="text-lg font-semibold text-[#3b0a0a]">Kumpulkan jawaban?</h2>
              <p className="text-sm text-[#6b0f1a]/70 mt-2">
                {terjawab} dari {paket.soal.length} soal sudah dijawab
                {Object.values(ragu).filter(Boolean).length > 0 &&
                  `, ${Object.values(ragu).filter(Boolean).length} masih ditandai ragu-ragu`}
                .
              </p>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setKonfirmasi(false)}
                  className="flex-1 py-2 rounded-lg border border-[#6b0f1a]/20 text-[#6b0f1a] hover:bg-[#6b0f1a]/5"
                >
                  Kembali
                </button>
                <button
                  onClick={() => {
                    setKonfirmasi(false);
                    setTahap('hasil');
                  }}
                  className="flex-1 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
                >
                  Kumpulkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------------------- TAHAP 3: HASIL + PEMBAHASAN ---------------------- */
  if (tahap === 'hasil' && paket && hasil) {
    isi = (
      <div className="max-w-3xl mx-auto mt-6 px-4 pb-10 space-y-5">
        <div className={`${kartu} p-6 text-center`}>
          <p className="text-sm text-[#6b0f1a]/60">{labelPaket(paket)}</p>
          <div className="text-5xl font-bold text-[#6b0f1a] mt-2">{hasil.skor}</div>
          <p className="text-sm text-[#6b0f1a]/60 mt-1">Skor kamu (skala 0–100)</p>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="rounded-xl p-3 bg-green-50 border border-green-200">
              <div className="text-xl font-bold text-green-700">{hasil.benar}</div>
              <div className="text-xs text-green-700/80">Benar</div>
            </div>
            <div className="rounded-xl p-3 bg-red-50 border border-red-200">
              <div className="text-xl font-bold text-red-700">{hasil.salah}</div>
              <div className="text-xs text-red-700/80">Salah</div>
            </div>
            <div className="rounded-xl p-3 bg-gray-50 border border-gray-200">
              <div className="text-xl font-bold text-gray-600">{hasil.kosong}</div>
              <div className="text-xs text-gray-600/80">Kosong</div>
            </div>
          </div>

          <div className="flex gap-2 justify-center mt-6 flex-wrap">
            <button
              onClick={mulai}
              className="px-4 py-2 rounded-lg bg-[#6b0f1a] text-white font-medium hover:opacity-90"
            >
              Ulangi Simulasi
            </button>
            <button
              onClick={() => setTahap('pilih')}
              className="px-4 py-2 rounded-lg border border-[#6b0f1a]/20 text-[#6b0f1a] hover:bg-[#6b0f1a]/5"
            >
              Pilih Simulasi Lain
            </button>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-[#3b0a0a]">Pembahasan</h2>
        {paket.soal.map((s, i) => {
          const dipilih = jawaban[i];
          const benar = dipilih === s.kunci;
          const kosong = dipilih === undefined;
          return (
            <div key={i} className={`${kartu} p-4`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-[#3b0a0a] whitespace-pre-line">
                  {i + 1}. {s.q}
                </p>
                <span
                  className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                    kosong
                      ? 'bg-gray-100 text-gray-600'
                      : benar
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {kosong ? 'Kosong' : benar ? 'Benar' : 'Salah'}
                </span>
              </div>
              {s.gambar && (
                <img
                  src={s.gambar}
                  alt={s.alt || 'Gambar soal'}
                  className="max-w-full h-auto mt-3 rounded-lg border border-[#6b0f1a]/15"
                />
              )}
              <div className="mt-2 space-y-1 text-sm">
                {s.opsi.map((teks, j) => (
                  <p
                    key={j}
                    className={
                      j === s.kunci
                        ? 'text-green-700 font-medium'
                        : j === dipilih
                        ? 'text-red-600 line-through'
                        : 'text-[#6b0f1a]/70'
                    }
                  >
                    {HURUF[j]}. {teks}
                    {j === s.kunci && ' ✓'}
                    {j === dipilih && j !== s.kunci && ' (jawabanmu)'}
                  </p>
                ))}
              </div>
              {s.bahas && (
                <p className="text-sm mt-3 p-3 rounded-lg bg-[#f7e6e3]/50 text-[#3b0a0a]">
                  <strong>Pembahasan:</strong> {s.bahas}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Guru/pengguna yang sudah login mendapat Layout (sidebar/header); siswa tanpa login melihat halaman polos.
  if (!embedded && session?.user?.id) {
    return (
      <Layout title="Simulasi TKA" subtitle="Latihan soal TKA untuk SD dan SMP">
        {isi}
      </Layout>
    );
  }
  return isi;
}
