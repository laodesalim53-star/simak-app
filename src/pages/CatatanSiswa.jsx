import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';

// Halaman "Catatan Siswa": buku kasus & prestasi & bimbingan (BK) dalam satu tempat.
// Route contoh: /catatan-siswa (di dalam <ProtectedRoute>)
// Tabel Supabase: catatan_siswa (lihat catatan_siswa.sql). Tabel siswa dibaca dari
// tabel "siswa" (nis, nama_lengkap, kelas_id -> kelas.nama_kelas), sama seperti UjianOnline.

const JENIS = {
  pelanggaran: {
    label: 'Pelanggaran',
    badge: 'bg-red-100 text-red-700',
    kategori: [
      'Terlambat',
      'Tidak mengerjakan tugas',
      'Seragam tidak lengkap',
      'Membolos',
      'Berkelahi',
      'Merusak fasilitas sekolah',
      'Lainnya',
    ],
  },
  prestasi: {
    label: 'Prestasi',
    badge: 'bg-green-100 text-green-700',
    kategori: ['Akademik', 'Olahraga', 'Seni', 'Keagamaan', 'Kepemimpinan', 'Lainnya'],
  },
  bimbingan: {
    label: 'Bimbingan',
    badge: 'bg-blue-100 text-blue-700',
    kategori: ['Masalah belajar', 'Masalah pribadi', 'Masalah keluarga', 'Pertemanan', 'Lainnya'],
  },
};

const hariIni = () => new Date().toISOString().slice(0, 10);
const formatTanggal = (t) =>
  t ? new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

const formKosong = () => ({
  id: null,
  nama_kelas: '',
  nis: '',
  tanggal: hariIni(),
  jenis: 'pelanggaran',
  kategori: JENIS.pelanggaran.kategori[0],
  poin: 0,
  keterangan: '',
  tindak_lanjut: '',
  status: 'diproses',
});

const input =
  'w-full rounded-lg px-3 py-2 border border-[#6b0f1a]/15 bg-white focus:border-[#6b0f1a] focus:ring-2 focus:ring-[#6b0f1a]/20 outline-none';

export default function CatatanSiswa() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [siswa, setSiswa] = useState([]); // [{nis, nama, kelas}]
  const [catatan, setCatatan] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState('catatan'); // catatan | rekap
  const [filterJenis, setFilterJenis] = useState('semua');
  const [filterKelas, setFilterKelas] = useState('semua');
  const [filterNis, setFilterNis] = useState('');
  const [cari, setCari] = useState('');

  const [form, setForm] = useState(null); // null = tertutup
  const [menyimpan, setMenyimpan] = useState(false);
  const [errForm, setErrForm] = useState('');
  const [hapus, setHapus] = useState(null);

  async function muat() {
    setMemuat(true);
    setError('');
    const [rSiswa, rCatatan] = await Promise.all([
      supabase.from('siswa').select('nis, nama_lengkap, kelas:kelas_id(nama_kelas)').order('nama_lengkap'),
      supabase
        .from('catatan_siswa')
        .select('*')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1000),
    ]);
    if (rSiswa.error || rCatatan.error) {
      setError(rCatatan.error?.message || rSiswa.error?.message || 'Gagal memuat data.');
    }
    setSiswa(
      (rSiswa.data || []).map((s) => {
        const k = Array.isArray(s.kelas) ? s.kelas[0] : s.kelas;
        return { nis: s.nis, nama: s.nama_lengkap, kelas: k?.nama_kelas || '' };
      })
    );
    setCatatan(rCatatan.data || []);
    setMemuat(false);
  }

  useEffect(() => {
    muat();
  }, []);

  const daftarKelas = useMemo(
    () => [...new Set(siswa.map((s) => s.kelas).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true })),
    [siswa]
  );

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return catatan.filter(
      (c) =>
        (filterJenis === 'semua' || c.jenis === filterJenis) &&
        (filterKelas === 'semua' || c.nama_kelas === filterKelas) &&
        (!filterNis || c.nis === filterNis) &&
        (!q || c.nama_siswa.toLowerCase().includes(q))
    );
  }, [catatan, filterJenis, filterKelas, filterNis, cari]);

  const rekap = useMemo(() => {
    const peta = {};
    tersaring.forEach((c) => {
      const r = (peta[c.nis] ||= { nis: c.nis, nama: c.nama_siswa, kelas: c.nama_kelas, pel: 0, poinPel: 0, pres: 0, poinPres: 0, bim: 0 });
      if (c.jenis === 'pelanggaran') {
        r.pel++;
        r.poinPel += c.poin;
      } else if (c.jenis === 'prestasi') {
        r.pres++;
        r.poinPres += c.poin;
      } else r.bim++;
    });
    return Object.values(peta).sort((a, b) => b.poinPel - a.poinPel || a.nama.localeCompare(b.nama));
  }, [tersaring]);

  const siswaDifilter = filterNis ? siswa.find((s) => s.nis === filterNis) : null;

  /* ------------------------ form ------------------------ */
  function bukaTambah() {
    setErrForm('');
    setForm(formKosong());
  }

  function bukaEdit(c) {
    setErrForm('');
    setForm({
      id: c.id,
      nama_kelas: c.nama_kelas || '',
      nis: c.nis,
      tanggal: c.tanggal,
      jenis: c.jenis,
      kategori: c.kategori || JENIS[c.jenis].kategori[0],
      poin: c.poin,
      keterangan: c.keterangan || '',
      tindak_lanjut: c.tindak_lanjut || '',
      status: c.status,
    });
  }

  function ubahJenis(jenis) {
    setForm({ ...form, jenis, kategori: JENIS[jenis].kategori[0], poin: jenis === 'bimbingan' ? 0 : form.poin });
  }

  async function simpan() {
    if (!form.nis) {
      setErrForm('Pilih kelas dan nama siswa dulu.');
      return;
    }
    if (!form.keterangan.trim()) {
      setErrForm('Isi keterangan kejadian atau prestasinya.');
      return;
    }
    const s = siswa.find((x) => x.nis === form.nis);
    const payload = {
      nis: form.nis,
      nama_siswa: s?.nama || '',
      nama_kelas: s?.kelas || form.nama_kelas,
      tanggal: form.tanggal,
      jenis: form.jenis,
      kategori: form.kategori,
      poin: form.jenis === 'bimbingan' ? 0 : Math.max(0, Number(form.poin) || 0),
      keterangan: form.keterangan.trim(),
      tindak_lanjut: form.tindak_lanjut.trim(),
      status: form.status,
    };
    setMenyimpan(true);
    setErrForm('');
    const { error: err } = form.id
      ? await supabase.from('catatan_siswa').update(payload).eq('id', form.id)
      : await supabase.from('catatan_siswa').insert({ ...payload, dicatat_oleh: userId });
    setMenyimpan(false);
    if (err) {
      setErrForm(err.message || 'Gagal menyimpan catatan.');
      return;
    }
    setForm(null);
    muat();
  }

  async function hapusCatatan() {
    const { error: err } = await supabase.from('catatan_siswa').delete().eq('id', hapus.id);
    if (err) {
      setError('Gagal menghapus: ' + err.message);
    }
    setHapus(null);
    muat();
  }

  const siswaPilihan = form ? siswa.filter((s) => !form.nama_kelas || s.kelas === form.nama_kelas) : [];

  /* ------------------------ tampilan ------------------------ */
  const isi = (
    <div className="max-w-6xl mx-auto px-4 pb-10">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-cetak, #area-cetak * { visibility: visible; }
          #area-cetak { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; }
          .tanpa-cetak { display: none !important; }
        }
      `}</style>

      <div className="tanpa-cetak flex flex-wrap items-center justify-between gap-3 mt-4">
        <div className="flex gap-2">
          {[
            ['catatan', 'Daftar Catatan'],
            ['rekap', 'Rekap per Siswa'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                tab === id ? 'bg-[#6b0f1a] text-white' : 'border border-[#6b0f1a]/20 text-[#6b0f1a] hover:bg-[#6b0f1a]/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            disabled={tersaring.length === 0}
            className="px-4 py-2 rounded-lg text-sm border border-[#6b0f1a]/20 text-[#6b0f1a] hover:bg-[#6b0f1a]/5 disabled:opacity-40"
          >
            Cetak
          </button>
          <button onClick={bukaTambah} className="px-4 py-2 rounded-lg text-sm bg-[#6b0f1a] text-white font-medium hover:opacity-90">
            + Tambah Catatan
          </button>
        </div>
      </div>

      <div className="tanpa-cetak grid sm:grid-cols-4 gap-2 mt-3">
        <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)} className={input}>
          <option value="semua">Semua jenis</option>
          {Object.entries(JENIS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select
          value={filterKelas}
          onChange={(e) => {
            setFilterKelas(e.target.value);
            setFilterNis('');
          }}
          className={input}
        >
          <option value="semua">Semua kelas</option>
          {daftarKelas.map((k) => (
            <option key={k} value={k}>
              Kelas {k}
            </option>
          ))}
        </select>
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama siswa"
          className={`${input} sm:col-span-2`}
        />
      </div>

      {filterNis && (
        <p className="tanpa-cetak text-sm mt-2 text-[#6b0f1a]">
          Menampilkan catatan {siswaDifilter?.nama || filterNis}.{' '}
          <button onClick={() => setFilterNis('')} className="underline">
            Tampilkan semua siswa
          </button>
        </p>
      )}
      {error && <p className="tanpa-cetak text-sm text-red-600 mt-2">{error}</p>}

      <div id="area-cetak" className="mt-4 bg-white rounded-xl border border-[#6b0f1a]/15 p-4">
        <h2 className="font-semibold text-[#3b0a0a]">
          {tab === 'catatan' ? 'Catatan Siswa' : 'Rekap Catatan per Siswa'}
          {siswaDifilter && ` — ${siswaDifilter.nama}`}
          {filterKelas !== 'semua' && ` (Kelas ${filterKelas})`}
        </h2>
        <p className="text-xs text-[#6b0f1a]/60 mb-3">
          {filterJenis === 'semua' ? 'Semua jenis catatan' : JENIS[filterJenis].label} · dicetak {formatTanggal(hariIni())}
        </p>

        {memuat ? (
          <p className="text-sm text-[#6b0f1a]/60">Memuat...</p>
        ) : tab === 'catatan' ? (
          tersaring.length === 0 ? (
            <p className="text-sm text-[#6b0f1a]/60 py-6 text-center">
              Belum ada catatan. Klik "Tambah Catatan" untuk mencatat pelanggaran, prestasi, atau bimbingan siswa.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#6b0f1a] text-white text-left">
                    <th className="px-3 py-2">Tanggal</th>
                    <th className="px-3 py-2">Siswa</th>
                    <th className="px-3 py-2">Jenis</th>
                    <th className="px-3 py-2">Keterangan</th>
                    <th className="px-3 py-2">Poin</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 tanpa-cetak"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#6b0f1a]/10">
                  {tersaring.map((c) => (
                    <tr key={c.id} className="align-top">
                      <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(c.tanggal)}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-[#3b0a0a]">{c.nama_siswa}</div>
                        <div className="text-xs text-[#6b0f1a]/60">Kelas {c.nama_kelas || '-'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${JENIS[c.jenis].badge}`}>{JENIS[c.jenis].label}</span>
                        <div className="text-xs text-[#6b0f1a]/60 mt-1">{c.kategori}</div>
                      </td>
                      <td className="px-3 py-2 max-w-xs">
                        {c.keterangan}
                        {c.tindak_lanjut && (
                          <div className="text-xs text-[#6b0f1a]/70 mt-1">
                            <strong>Tindak lanjut:</strong> {c.tindak_lanjut}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">{c.jenis === 'bimbingan' ? '-' : c.poin}</td>
                      <td className="px-3 py-2">{c.status === 'selesai' ? 'Selesai' : 'Diproses'}</td>
                      <td className="px-3 py-2 tanpa-cetak whitespace-nowrap">
                        <button onClick={() => bukaEdit(c)} className="text-[#6b0f1a] hover:underline mr-3">
                          Ubah
                        </button>
                        {c.dicatat_oleh === userId && (
                          <button onClick={() => setHapus(c)} className="text-red-600 hover:underline">
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : rekap.length === 0 ? (
          <p className="text-sm text-[#6b0f1a]/60 py-6 text-center">Belum ada data untuk direkap.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#6b0f1a] text-white text-left">
                  <th className="px-3 py-2">Siswa</th>
                  <th className="px-3 py-2">Kelas</th>
                  <th className="px-3 py-2">Pelanggaran</th>
                  <th className="px-3 py-2">Poin pelanggaran</th>
                  <th className="px-3 py-2">Prestasi</th>
                  <th className="px-3 py-2">Poin prestasi</th>
                  <th className="px-3 py-2">Bimbingan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#6b0f1a]/10">
                {rekap.map((r) => (
                  <tr
                    key={r.nis}
                    onClick={() => {
                      setFilterNis(r.nis);
                      setTab('catatan');
                    }}
                    className="cursor-pointer hover:bg-[#6b0f1a]/5"
                  >
                    <td className="px-3 py-2 font-medium text-[#3b0a0a]">{r.nama}</td>
                    <td className="px-3 py-2">{r.kelas || '-'}</td>
                    <td className="px-3 py-2">{r.pel}</td>
                    <td className={`px-3 py-2 font-semibold ${r.poinPel > 0 ? 'text-red-700' : ''}`}>{r.poinPel}</td>
                    <td className="px-3 py-2">{r.pres}</td>
                    <td className={`px-3 py-2 font-semibold ${r.poinPres > 0 ? 'text-green-700' : ''}`}>{r.poinPres}</td>
                    <td className="px-3 py-2">{r.bim}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="tanpa-cetak text-xs text-[#6b0f1a]/60 mt-2">Klik baris untuk melihat catatan siswa tersebut.</p>
          </div>
        )}
      </div>

      {/* Form tambah / ubah */}
      {form && (
        <div className="tanpa-cetak fixed inset-0 bg-black/40 flex items-start justify-center p-4 overflow-y-auto z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 mt-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#3b0a0a] mb-3">{form.id ? 'Ubah Catatan' : 'Tambah Catatan'}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#6b0f1a]">Kelas</label>
                <select
                  value={form.nama_kelas}
                  onChange={(e) => setForm({ ...form, nama_kelas: e.target.value, nis: '' })}
                  disabled={!!form.id}
                  className={input}
                >
                  <option value="">Semua kelas</option>
                  {daftarKelas.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6b0f1a]">Tanggal</label>
                <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className={input} />
              </div>
            </div>

            <label className="text-xs font-medium text-[#6b0f1a] mt-3 block">Nama siswa</label>
            <select
              value={form.nis}
              onChange={(e) => setForm({ ...form, nis: e.target.value })}
              disabled={!!form.id}
              className={input}
            >
              <option value="">-- Pilih siswa --</option>
              {siswaPilihan.map((s) => (
                <option key={s.nis} value={s.nis}>
                  {s.nama}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs font-medium text-[#6b0f1a]">Jenis</label>
                <select value={form.jenis} onChange={(e) => ubahJenis(e.target.value)} className={input}>
                  {Object.entries(JENIS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6b0f1a]">Kategori</label>
                <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className={input}>
                  {JENIS[form.jenis].kategori.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {form.jenis !== 'bimbingan' && (
              <div className="mt-3">
                <label className="text-xs font-medium text-[#6b0f1a]">
                  Poin {form.jenis === 'pelanggaran' ? 'pelanggaran' : 'prestasi'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.poin}
                  onChange={(e) => setForm({ ...form, poin: e.target.value })}
                  className={input}
                />
              </div>
            )}

            <label className="text-xs font-medium text-[#6b0f1a] mt-3 block">
              {form.jenis === 'prestasi' ? 'Keterangan prestasi' : 'Keterangan kejadian'}
            </label>
            <textarea
              rows={3}
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              className={input}
            />

            <label className="text-xs font-medium text-[#6b0f1a] mt-3 block">Tindak lanjut (opsional)</label>
            <textarea
              rows={2}
              value={form.tindak_lanjut}
              onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })}
              className={input}
            />

            <label className="text-xs font-medium text-[#6b0f1a] mt-3 block">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={input}>
              <option value="diproses">Diproses</option>
              <option value="selesai">Selesai</option>
            </select>

            {errForm && <p className="text-sm text-red-600 mt-3">{errForm}</p>}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setForm(null)}
                className="flex-1 py-2 rounded-lg border border-[#6b0f1a]/20 text-[#6b0f1a] hover:bg-[#6b0f1a]/5"
              >
                Batal
              </button>
              <button
                onClick={simpan}
                disabled={menyimpan}
                className="flex-1 py-2 rounded-lg bg-[#6b0f1a] text-white font-medium hover:opacity-90 disabled:opacity-50"
              >
                {menyimpan ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi hapus */}
      {hapus && (
        <div className="tanpa-cetak fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
            <h2 className="text-lg font-semibold text-[#3b0a0a]">Hapus catatan ini?</h2>
            <p className="text-sm text-[#6b0f1a]/70 mt-2">
              Catatan {JENIS[hapus.jenis].label.toLowerCase()} untuk {hapus.nama_siswa} akan dihapus permanen.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setHapus(null)}
                className="flex-1 py-2 rounded-lg border border-[#6b0f1a]/20 text-[#6b0f1a] hover:bg-[#6b0f1a]/5"
              >
                Batal
              </button>
              <button onClick={hapusCatatan} className="flex-1 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Layout title="Catatan Siswa" subtitle="Pelanggaran, prestasi, dan bimbingan siswa">
      {isi}
    </Layout>
  );
}
