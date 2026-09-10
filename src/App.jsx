# Perubahan di App.jsx

## 1. Ganti bagian import

**Hapus:**
```jsx
// --- Fitur Cetak Sampul Laporan (generik, kop otomatis dari profil_sekolah) ---
import CetakSampul from './pages/CetakSampul'
// Cabang CetakSampul.jsx dengan jenis laporan terkunci — dipakai supaya
// guru/admin tidak perlu memilih dari dropdown lagi saat mencetak sampul
// Laporan Semester atau Daftar Calon Peserta Ujian (8355).
import CetakSampulSemester from './pages/CetakSampulSemester'
import CetakSampul8355 from './pages/CetakSampul8355'
```

**Ganti dengan:**
```jsx
// --- Fitur Cetak Sampul Laporan (generik, kop otomatis dari profil_sekolah) ---
// Satu halaman dengan sidebar menu, menggantikan file terpisah
// CetakSampul.jsx / CetakSampulSemester.jsx / CetakSampul8355.jsx.
import CetakSampulHub from './pages/CetakSampulHub'
```

## 2. Ganti bagian Route

**Hapus:**
```jsx
        {/* Cetak Sampul Laporan — halaman generik untuk mencetak halaman
            sampul (cover) berbagai laporan; kop/logo diambil otomatis dari
            profil_sekolah, sama seperti LaporanSemester.jsx. Dibatasi
            adminOnly seperti laporan-laporan lain. */}
        <Route path="/cetak-sampul" element={
  <ProtectedRoute adminOnly><CetakSampul /></ProtectedRoute>
} />
        {/* Cabang CetakSampul.jsx dengan jenis laporan sudah terkunci —
            jenis laporan tidak perlu dipilih lagi lewat dropdown. Dibatasi
            adminOnly, sama seperti /cetak-sampul. */}
        <Route path="/cetak-sampul-semester" element={
  <ProtectedRoute adminOnly><CetakSampulSemester /></ProtectedRoute>
} />
        <Route path="/cetak-sampul-8355" element={
  <ProtectedRoute adminOnly><CetakSampul8355 /></ProtectedRoute>
} />
```

**Ganti dengan:**
```jsx
        {/* Cetak Sampul Laporan — satu halaman dengan sidebar menu berisi
            semua jenis laporan (Bulanan, Semester, 8355, LPJ BOS, dst).
            Kop/logo diambil otomatis dari profil_sekolah, sama seperti
            LaporanSemester.jsx. Dibatasi adminOnly seperti laporan lain. */}
        <Route path="/cetak-sampul" element={
  <ProtectedRoute adminOnly><CetakSampulHub /></ProtectedRoute>
} />
        {/* Link lama dipertahankan (redirect) supaya bookmark/tautan yang
            sudah pernah dibagikan tidak mati — otomatis membuka
            CetakSampulHub dengan menu yang sesuai sudah terpilih. */}
        <Route path="/cetak-sampul-semester" element={<Navigate to="/cetak-sampul?jenis=semester" replace />} />
        <Route path="/cetak-sampul-8355" element={<Navigate to="/cetak-sampul?jenis=8355" replace />} />
```

## 3. File yang bisa dihapus dari `src/pages/`
Setelah perubahan di atas terpasang dan sudah dites, file-file berikut sudah tidak dipakai lagi dan boleh dihapus:
- `pages/CetakSampul.jsx`
- `pages/CetakSampulSemester.jsx`
- `pages/CetakSampul8355.jsx`

## 4. File baru yang perlu ditambahkan
Simpan `CetakSampulHub.jsx` (terlampir) ke `src/pages/CetakSampulHub.jsx`.
Komponen `components/SampulLaporan.jsx` **tidak perlu diubah** — dipakai apa adanya.
