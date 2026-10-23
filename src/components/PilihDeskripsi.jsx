// src/components/PilihDeskripsi.jsx
//
// Dropdown pilihan deskripsi capaian siap pakai. Dipakai di RaporKumer untuk
// tab Pengetahuan maupun Keterampilan — sumber pilihannya (opsi) ditentukan
// oleh halaman pemanggil.
//
// Props:
//   opsi          : [{ label, teks }]
//   jenjang       : jenjang terpilih ('1'..'9' atau '') — kosong = dropdown nonaktif
//   predikat      : 'A'..'D' atau null — kosong = dropdown nonaktif
//   onPilih(teks) : dipanggil dengan teks deskripsi yang dipilih
export default function PilihDeskripsi({ opsi = [], jenjang, predikat, onPilih }) {
  const nonaktif = !jenjang || !predikat

  return (
    <select
      className="input-field !py-1 text-xs mb-1"
      disabled={nonaktif}
      value=""
      onChange={(e) => {
        if (e.target.value !== '') onPilih(e.target.value)
      }}
    >
      <option value="">
        {!jenjang ? 'Pilih jenjang dulu' : !predikat ? 'Isi nilai dulu' : 'Pilih deskripsi…'}
      </option>
      {opsi.map((o, i) => (
        <option key={i} value={o.teks}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
