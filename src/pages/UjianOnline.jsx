import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; // sesuaikan kalau nama/lokasi file berbeda
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';

// Satu halaman, dua tab:
//   1. "Kerjakan Ujian"  -> untuk siswa (tanpa login)
//   2. "Hasil Ujian"     -> untuk guru (perlu login)
//
// Route contoh: /ujian-online
// Halaman ini HARUS di luar <ProtectedRoute> di App.jsx (karena siswa tidak login),
// tetapi tetap berada di dalam <AuthProvider> supaya useAuth() bisa membaca sesi guru.

// Mengacak urutan array secara acak (Fisher-Yates), tidak mengubah array aslinya.
function acakUrutan(arr) {
  const hasil = [...arr];
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

/* =====================================================================
   TAB 1 — KERJAKAN UJIAN (siswa)
   ===================================================================== */
function PanelKerjakan({ onTahapChange }) {
  const [tahap, setTahap] = useState('masuk'); // masuk | pilih-nama | kerjakan | selesai
  const [kodeUjian, setKodeUjian] = useState('');
  const [ujian, setUjian] = useState(null);
  const [soalList, setSoalList] = useState([]);
  const [daftarSiswa, setDaftarSiswa] = useState([]); // [{nis, nama_lengkap}]
  const [nisSiswa, setNisSiswa] = useState('');
  const [namaSiswa, setNamaSiswa] = useState('');
  const [jawaban, setJawaban] = useState({});
  const [error, setError] = useState('');
  const [memuat, setMemuat] = useState(false);
  const [skorAkhir, setSkorAkhir] = useState(null);
  const [sudahMengerjakan, setSudahMengerjakan] = useState(null); // null = belum dicek, angka = skor lama, false = belum pernah
  const [cekStatusLoading, setCekStatusLoading] = useState(false);
  // Pemetaan posisi tampil (A/B/C/D di layar) -> huruf jawaban asli di database,
  // dibuat sekali per siswa per soal supaya isi pilihan jawaban terlihat acak
  // (anti-nyontek), tapi tetap konsisten selama siswa mengerjakan.
  const [pemetaanPilihan, setPemetaanPilihan] = useState({}); // { [soalId]: ['C','A','D','B'] }

  // Beritahu halaman induk tahap sekarang (supaya tab disembunyikan saat siswa mengerjakan)
  useEffect(() => {
    onTahapChange?.(tahap);
  }, [tahap]); // eslint-disable-line react-hooks/exhaustive-deps

  // Kalau siswa membuka lewat link yang sudah membawa ?kode=XXXXXX,
  // ambil otomatis dari URL dan langsung cari ujiannya — tidak perlu ketik manual.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kodeDariUrl = params.get('kode');
    if (kodeDariUrl) {
      setKodeUjian(kodeDariUrl.toUpperCase());
      cariUjian(kodeDariUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cariUjian(kodeOverride) {
    setError('');
    const kodeInput = (kodeOverride ?? kodeUjian).trim();
    if (!kodeInput) {
      setError('Masukkan kode ujian dulu.');
      return;
    }
    setMemuat(true);

    const kode = kodeInput.toUpperCase();

    const { data: ujianData, error: errUjian } = await supabase
      .from('ujian_publik')
      .select('*')
      .eq('kode_ujian', kode)
      .single();

    if (errUjian || !ujianData) {
      setError('Kode ujian tidak ditemukan. Cek lagi kode dari gurumu.');
      setMemuat(false);
      return;
    }

    if (ujianData.status !== 'aktif') {
      setError('Ujian ini belum diaktifkan oleh guru. Tanyakan ke gurumu.');
      setMemuat(false);
      return;
    }

    const { data: soalData, error: errSoal } = await supabase
      .from('soal_ujian_publik')
      .select('*')
      .eq('ujian_id', ujianData.id)
      .order('urutan', { ascending: true });

    if (errSoal || !soalData || soalData.length === 0) {
      setError('Soal untuk ujian ini belum tersedia.');
      setMemuat(false);
      return;
    }

    // Ambil daftar siswa di kelas ini dari tabel "siswa" (kelas_id, nama_lengkap, nis)
    const { data: siswaData, error: errSiswa } = await supabase
      .from('siswa_publik')
      .select('nis, nama_lengkap')
      .eq('kelas_id', ujianData.kelas_id)
      .order('nama_lengkap', { ascending: true });

    if (errSiswa || !siswaData) {
      setError('Gagal mengambil daftar siswa kelas ini.');
      setMemuat(false);
      return;
    }

    setUjian(ujianData);

    // Acak urutan soal per siswa (anti-nyontek antar siswa yang duduk berdekatan)
    const soalTeracak = acakUrutan(soalData);

    // Untuk setiap soal, buat pemetaan posisi tampil A/B/C/D -> huruf jawaban asli.
    const pemetaan = {};
    soalData.forEach((s) => {
      pemetaan[s.id] = acakUrutan(['A', 'B', 'C', 'D']);
    });

    setSoalList(soalTeracak);
    setPemetaanPilihan(pemetaan);
    setDaftarSiswa(siswaData);
    setMemuat(false);
    setTahap('pilih-nama');
  }

  function pilihJawaban(soalId, pilihan) {
    setJawaban({ ...jawaban, [soalId]: pilihan });
  }

  // Dipanggil begitu siswa memilih namanya, sebelum mulai mengerjakan.
  // Kalau NIS ini sudah pernah submit ujian ini, tampilkan skornya dan
  // blokir tombol "Mulai Kerjakan".
  async function cekStatusUjian(nis) {
    setSudahMengerjakan(null);
    if (!nis) return;
    setCekStatusLoading(true);
    const { data, error: errCek } = await supabase.rpc('cek_status_ujian', {
      p_kode_ujian: ujian.kode_ujian,
      p_nis_siswa: nis,
    });
    setCekStatusLoading(false);
    if (!errCek && data && data.length > 0 && data[0].sudah_mengerjakan) {
      setSudahMengerjakan(data[0].skor);
    } else {
      setSudahMengerjakan(false);
    }
  }

  async function kirimJawaban() {
    if (!nisSiswa) {
      setError('Pilih namamu dulu dari daftar.');
      return;
    }
    const belumDijawab = soalList.filter((s) => !jawaban[s.id]);
    if (belumDijawab.length > 0) {
      setError(`Masih ada ${belumDijawab.length} soal yang belum dijawab.`);
      return;
    }

    setMemuat(true);
    setError('');

    const { data, error: errSubmit } = await supabase.rpc('submit_ujian', {
      p_kode_ujian: ujian.kode_ujian,
      p_nis_siswa: nisSiswa,
      p_nama_siswa: namaSiswa,
      p_jawaban: jawaban,
    });

    setMemuat(false);

    if (errSubmit) {
      setError(errSubmit.message || 'Gagal mengirim jawaban.');
      return;
    }

    setSkorAkhir(data);
    setTahap('selesai');
  }

  // ---------- TAHAP 1: MASUKKAN KODE UJIAN ----------
  if (tahap === 'masuk') {
    return (
      <div className="max-w-sm mx-auto mt-10 p-6 rounded-xl border shadow-sm text-center">
        <h1 className="text-xl font-semibold mb-4">Ujian Online</h1>
        <input
          value={kodeUjian}
          onChange={(e) => setKodeUjian(e.target.value)}
          placeholder="Masukkan Kode Ujian"
          className="w-full border rounded-lg px-3 py-2 text-center text-lg font-mono tracking-widest uppercase"
          maxLength={6}
        />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <button
          onClick={() => cariUjian()}
          disabled={memuat}
          className="mt-4 w-full py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {memuat ? 'Mencari...' : 'Lanjut'}
        </button>
      </div>
    );
  }

  // ---------- TAHAP 2: PILIH NAMA ----------
  if (tahap === 'pilih-nama') {
    return (
      <div className="max-w-sm mx-auto mt-10 p-6 rounded-xl border shadow-sm text-center">
        <h1 className="text-xl font-semibold">{ujian.judul}</h1>
        <p className="text-sm text-gray-500 mb-4">
          {ujian.mata_pelajaran} · Kelas {ujian.nama_kelas}
        </p>
        <select
          value={nisSiswa}
          onChange={(e) => {
            const nis = e.target.value;
            setNisSiswa(nis);
            const siswa = daftarSiswa.find((s) => s.nis === nis);
            setNamaSiswa(siswa?.nama_lengkap || '');
            setError('');
            cekStatusUjian(nis);
          }}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">-- Pilih namamu --</option>
          {daftarSiswa.map((s) => (
            <option key={s.nis} value={s.nis}>
              {s.nama_lengkap}
            </option>
          ))}
        </select>

        {cekStatusLoading && (
          <p className="text-sm text-gray-400 mt-2">Mengecek status...</p>
        )}

        {sudahMengerjakan !== null && sudahMengerjakan !== false && (
          <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Kamu sudah mengerjakan ujian ini sebelumnya. Skor kamu:{' '}
            <strong>{sudahMengerjakan}</strong>. Setiap siswa hanya bisa mengerjakan 1 kali.
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <button
          onClick={() => {
            if (!nisSiswa) {
              setError('Pilih namamu dulu.');
              return;
            }
            if (sudahMengerjakan !== null && sudahMengerjakan !== false) {
              setError('Kamu sudah mengerjakan ujian ini sebelumnya.');
              return;
            }
            setError('');
            setTahap('kerjakan');
          }}
          disabled={cekStatusLoading || (sudahMengerjakan !== null && sudahMengerjakan !== false)}
          className="mt-4 w-full py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Mulai Kerjakan
        </button>
      </div>
    );
  }

  // ---------- TAHAP 3: KERJAKAN SOAL ----------
  if (tahap === 'kerjakan') {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold">{ujian.judul}</h1>
          <p className="text-sm text-gray-500">
            {namaSiswa} · {Object.keys(jawaban).length}/{soalList.length} terjawab
          </p>
        </div>

        {soalList.map((s, i) => (
          <div key={s.id} className="border rounded-xl p-4">
            <p className="font-medium mb-3">
              {i + 1}. {s.soal}
            </p>
            {['a', 'b', 'c', 'd'].map((huruf, idx) => {
              const petaSoal = pemetaanPilihan[s.id];
              const hurufAsli = petaSoal ? petaSoal[idx] : huruf.toUpperCase();
              const kontenPilihan = s[`pilihan_${hurufAsli.toLowerCase()}`];
              return (
                <label
                  key={huruf}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer mb-1 ${
                    jawaban[s.id] === hurufAsli ? 'bg-blue-50 border border-blue-300' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name={`soal-${s.id}`}
                    checked={jawaban[s.id] === hurufAsli}
                    onChange={() => pilihJawaban(s.id, hurufAsli)}
                  />
                  <span>
                    {huruf.toUpperCase()}. {kontenPilihan}
                  </span>
                </label>
              );
            })}
          </div>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={kirimJawaban}
          disabled={memuat}
          className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          {memuat ? 'Mengirim...' : 'Selesai & Kumpulkan'}
        </button>
      </div>
    );
  }

  // ---------- TAHAP 4: SELESAI ----------
  if (tahap === 'selesai') {
    return (
      <div className="max-w-sm mx-auto mt-10 p-6 rounded-xl border shadow-sm text-center">
        <h1 className="text-xl font-semibold mb-2">Selesai! 🎉</h1>
        <p className="text-gray-600 mb-4">Terima kasih, {namaSiswa}.</p>
        <div className="text-4xl font-bold text-green-600">{skorAkhir}</div>
        <p className="text-sm text-gray-500 mt-1">Skor kamu</p>
      </div>
    );
  }

  return null;
}

/* =====================================================================
   TAB 2 — HASIL UJIAN (guru, perlu login)
   ===================================================================== */
function PanelHasil({ guruId }) {
  const [daftarUjian, setDaftarUjian] = useState([]);
  const [ujianDipilih, setUjianDipilih] = useState('');
  const [hasil, setHasil] = useState([]);
  const [soalDetail, setSoalDetail] = useState([]); // [{id, urutan, soal, jawaban_benar}]
  const [jumlahSoal, setJumlahSoal] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [tampilkanPerSoal, setTampilkanPerSoal] = useState(false);

  // Ambil semua ujian milik guru ini
  useEffect(() => {
    async function ambilUjian() {
      if (!guruId) return;
      const { data, error } = await supabase
        .from('ujian')
        .select('id, judul, mata_pelajaran, kode_ujian, status, kelas:kelas_id(nama_kelas)')
        .eq('guru_id', guruId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDaftarUjian(data);
        if (data.length > 0) setUjianDipilih(data[0].id);
      }
      setMemuat(false);
    }
    ambilUjian();
  }, [guruId]);

  // Ambil hasil + detail soal setiap kali ujian yang dipilih berubah
  useEffect(() => {
    if (!ujianDipilih) return;

    async function ambilHasil() {
      const { data: hasilData } = await supabase
        .from('hasil_ujian')
        .select('id, nama_siswa, skor, waktu_selesai, jawaban')
        .eq('ujian_id', ujianDipilih)
        .order('skor', { ascending: false });

      setHasil(hasilData || []);

      const { data: soalData } = await supabase
        .from('soal_ujian')
        .select('id, urutan, soal, jawaban_benar')
        .eq('ujian_id', ujianDipilih)
        .order('urutan', { ascending: true });

      setSoalDetail(soalData || []);
      setJumlahSoal((soalData || []).length);
    }
    ambilHasil();

    // Real-time: setiap ada siswa baru submit, tabel otomatis update tanpa refresh
    const channel = supabase
      .channel(`hasil-ujian-${ujianDipilih}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'hasil_ujian',
          filter: `ujian_id=eq.${ujianDipilih}`,
        },
        (payload) => {
          setHasil((prev) =>
            [...prev, payload.new].sort((a, b) => b.skor - a.skor)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ujianDipilih]);

  const ujianAktif = daftarUjian.find((u) => u.id === ujianDipilih);
  const rataRata =
    hasil.length > 0
      ? (hasil.reduce((sum, h) => sum + Number(h.skor), 0) / hasil.length).toFixed(1)
      : '-';

  // Statistik per soal: berapa % siswa yang menjawab benar soal ini.
  const statistikPerSoal = soalDetail.map((s, i) => {
    const totalBenar = hasil.filter((h) => h.jawaban?.[s.id] === s.jawaban_benar).length;
    const persen = hasil.length > 0 ? Math.round((totalBenar / hasil.length) * 100) : 0;
    return { ...s, nomor: i + 1, persen };
  });

  function unduhCSV() {
    const header = 'Nama Siswa,Skor,Waktu Selesai\n';
    const baris = hasil
      .map((h) => `"${h.nama_siswa}",${h.skor},"${new Date(h.waktu_selesai).toLocaleString('id-ID')}"`)
      .join('\n');
    const blob = new Blob([header + baris], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hasil-${ujianAktif?.judul || 'ujian'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (memuat) {
    return <div className="text-[#6b0f1a]/60 text-sm">Memuat...</div>;
  }

  if (daftarUjian.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto bg-white rounded-xl border border-[#6b0f1a]/15 shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-2 text-[#3b0a0a] flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-[#d4a017]"></span>
          Hasil Ujian
        </h3>
        <p className="text-sm text-[#6b0f1a]/60">
          Anda belum membuat ujian apa pun. Buat ujian dulu di menu "Buat Ujian".
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 bg-white rounded-xl border border-[#6b0f1a]/15 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-[#3b0a0a] flex items-center gap-2">
        <span className="w-1.5 h-5 rounded-full bg-[#d4a017]"></span>
        Hasil Ujian
      </h3>

      <select
        value={ujianDipilih}
        onChange={(e) => setUjianDipilih(e.target.value)}
        className="w-full rounded-lg px-3 py-2 border border-[#6b0f1a]/15 focus:border-[#6b0f1a] focus:ring-2 focus:ring-[#6b0f1a]/20 outline-none transition-colors"
      >
        {daftarUjian.map((u) => (
          <option key={u.id} value={u.id}>
            {u.judul} · {u.mata_pelajaran} · Kelas {u.kelas?.nama_kelas} · {u.kode_ujian} (
            {u.status})
          </option>
        ))}
      </select>

      {ujianAktif && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-4 text-center border border-[#6b0f1a]/15 bg-[#f7e6e3]/40">
            <div className="text-2xl font-bold text-[#6b0f1a]">{hasil.length}</div>
            <div className="text-xs text-[#6b0f1a]/60">Siswa mengerjakan</div>
          </div>
          <div className="rounded-xl p-4 text-center border border-[#6b0f1a]/15 bg-[#f7e6e3]/40">
            <div className="text-2xl font-bold text-[#6b0f1a]">{jumlahSoal}</div>
            <div className="text-xs text-[#6b0f1a]/60">Jumlah soal</div>
          </div>
          <div className="rounded-xl p-4 text-center border border-[#d4a017]/40 bg-[#d4a017]/10">
            <div className="text-2xl font-bold text-[#8a6a0d]">{rataRata}</div>
            <div className="text-xs text-[#6b0f1a]/60">Rata-rata skor</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-[#6b0f1a]/60">
          {ujianAktif?.status === 'aktif'
            ? '🟢 Ujian aktif — hasil masuk otomatis secara real-time'
            : 'Ujian tidak aktif'}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTampilkanPerSoal(!tampilkanPerSoal)}
            disabled={hasil.length === 0 || soalDetail.length === 0}
            className="text-sm px-3 py-1.5 rounded-lg border border-[#6b0f1a]/20 text-[#6b0f1a] hover:bg-[#6b0f1a]/5 transition-colors disabled:opacity-40"
          >
            {tampilkanPerSoal ? 'Sembunyikan Analisis Per Soal' : 'Lihat Analisis Per Soal'}
          </button>
          <button
            onClick={unduhCSV}
            disabled={hasil.length === 0}
            className="text-sm px-3 py-1.5 rounded-lg border border-[#6b0f1a]/20 text-[#6b0f1a] hover:bg-[#6b0f1a]/5 transition-colors disabled:opacity-40"
          >
            Unduh CSV
          </button>
        </div>
      </div>

      <table className="w-full text-sm rounded-xl overflow-hidden border border-[#6b0f1a]/10">
        <thead>
          <tr className="bg-[#6b0f1a] text-white">
            <th className="text-left px-4 py-2.5 font-medium">#</th>
            <th className="text-left px-4 py-2.5 font-medium">Nama Siswa</th>
            <th className="text-left px-4 py-2.5 font-medium">Skor</th>
            <th className="text-left px-4 py-2.5 font-medium">Waktu Selesai</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#6b0f1a]/8">
          {hasil.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center px-4 py-6 text-[#6b0f1a]/40">
                Belum ada siswa yang mengerjakan.
              </td>
            </tr>
          )}
          {hasil.map((h, i) => (
            <tr key={h.id} className="hover:bg-[#6b0f1a]/5 transition-colors">
              <td className="px-4 py-2 text-[#6b0f1a]/70">{i + 1}</td>
              <td className="px-4 py-2 font-medium text-[#3b0a0a]">{h.nama_siswa}</td>
              <td className="px-4 py-2 font-semibold text-[#6b0f1a]">{h.skor}</td>
              <td className="px-4 py-2 text-[#6b0f1a]/50">
                {new Date(h.waktu_selesai).toLocaleString('id-ID')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {tampilkanPerSoal && hasil.length > 0 && soalDetail.length > 0 && (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-[#3b0a0a]">Analisis Per Soal</h4>
            <p className="text-xs text-[#6b0f1a]/50">
              Arahkan kursor ke nomor soal untuk lihat teks soal & jawaban benar. Kolom dengan
              latar merah (di bawah 50% benar) menandakan soal yang paling banyak salah —
              kandidat untuk dijelaskan ulang / remedial.
            </p>
          </div>

          <div className="overflow-x-auto border border-[#6b0f1a]/10 rounded-xl">
            <table className="text-sm border-collapse w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-[#6b0f1a] text-white px-3 py-2 text-left whitespace-nowrap z-10">
                    Nama Siswa
                  </th>
                  {statistikPerSoal.map((s) => (
                    <th
                      key={s.id}
                      title={`Soal ${s.nomor}: ${s.soal}\nJawaban benar: ${s.jawaban_benar}\n${s.persen}% siswa menjawab benar`}
                      className={`px-2 py-2 text-center font-medium cursor-help ${
                        s.persen < 50 ? 'bg-red-100 text-red-700' : 'bg-[#f7e6e3]/60 text-[#6b0f1a]'
                      }`}
                    >
                      {s.nomor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hasil.map((h) => (
                  <tr key={h.id} className="border-t border-[#6b0f1a]/8">
                    <td className="sticky left-0 bg-white px-3 py-2 font-medium text-[#3b0a0a] whitespace-nowrap">
                      {h.nama_siswa}
                    </td>
                    {statistikPerSoal.map((s) => {
                      const benar = h.jawaban?.[s.id] === s.jawaban_benar;
                      return (
                        <td
                          key={s.id}
                          className={`px-2 py-2 text-center ${
                            benar ? 'text-green-600' : 'text-red-600 bg-red-50/60'
                          }`}
                        >
                          {benar ? '✓' : '✗'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-[#6b0f1a]/15 bg-[#f7e6e3]/40 font-semibold">
                  <td className="sticky left-0 bg-[#f7e6e3]/40 px-3 py-2 text-[#3b0a0a] whitespace-nowrap">
                    % Benar
                  </td>
                  {statistikPerSoal.map((s) => (
                    <td
                      key={s.id}
                      className={`px-2 py-2 text-center ${
                        s.persen < 50 ? 'text-red-700' : 'text-[#6b0f1a]'
                      }`}
                    >
                      {s.persen}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   HALAMAN GABUNGAN — dua tab
   ===================================================================== */
export default function UjianOnline() {
  const { session } = useAuth();
  const guruId = session?.user?.id;

  // Tab awal: ?tab=hasil membuka tab Hasil Ujian (dipakai menu sidebar guru)
  const [tab, setTab] = useState(() =>
    new URLSearchParams(window.location.search).get('tab') === 'hasil' ? 'hasil' : 'kerjakan'
  ); // kerjakan | hasil
  const [tahapSiswa, setTahapSiswa] = useState('masuk');

  // Selama siswa sedang mengerjakan soal, tab disembunyikan dan dikunci di
  // "kerjakan" supaya tidak salah pencet / pindah halaman di tengah ujian.
  const sedangMengerjakan = tahapSiswa === 'kerjakan';
  const tabAktif = sedangMengerjakan ? 'kerjakan' : tab;

  const tombolTab = (id, label) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
        tabAktif === id
          ? 'bg-[#6b0f1a] text-white shadow-sm'
          : 'border border-[#6b0f1a]/20 text-[#6b0f1a] hover:bg-[#6b0f1a]/5'
      }`}
    >
      {label}
    </button>
  );

  const isi = (
    <div className="w-full">
      {!sedangMengerjakan && (
        <div className="flex justify-center gap-2 mt-6">
          {tombolTab('kerjakan', 'Kerjakan Ujian')}
          {tombolTab('hasil', 'Hasil Ujian')}
        </div>
      )}

      {/* Kedua tab tetap "mounted" (hanya disembunyikan) supaya progres siswa
          tidak hilang ketika berpindah tab. */}
      <div className={tabAktif === 'kerjakan' ? '' : 'hidden'}>
        <PanelKerjakan onTahapChange={setTahapSiswa} />
      </div>

      <div className={`mt-6 px-4 ${tabAktif === 'hasil' ? '' : 'hidden'}`}>
        {guruId ? (
          <PanelHasil guruId={guruId} />
        ) : (
          <div className="max-w-sm mx-auto p-6 rounded-xl border shadow-sm text-center">
            <h2 className="text-lg font-semibold mb-2 text-[#3b0a0a]">Khusus Guru</h2>
            <p className="text-sm text-gray-500 mb-4">
              Silakan login sebagai guru untuk melihat hasil ujian.
            </p>
            <a
              href="/login" // sesuaikan dengan route login di aplikasimu
              className="inline-block px-4 py-2 rounded-lg bg-[#6b0f1a] text-white text-sm font-medium hover:opacity-90"
            >
              Login Guru
            </a>
          </div>
        )}
      </div>
    </div>
  );

  // Guru yang sudah login mendapat Layout (sidebar/header) seperti halaman lain;
  // siswa (belum login) melihat halaman polos.
  if (guruId) {
    return (
      <Layout title="Ujian Online" subtitle="Kerjakan ujian & lihat hasil pengerjaan siswa">
        {isi}
      </Layout>
    );
  }
  return isi;
}
