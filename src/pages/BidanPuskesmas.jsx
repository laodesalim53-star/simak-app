import { useAuth } from '../lib/AuthContext'
import HalamanBidan from '../components/HalamanBidan'

// Berbeda dari rute adminOnly (profil-puskesmas, data-pegawai-puskesmas, dst),
// halaman ini dipakai sehari-hari oleh SEMUA pegawai puskesmas (lihat
// getLinksPuskesmasPegawai di Sidebar.jsx — flat, tidak dipisah per jabatan),
// bukan hanya bidan/mantri secara harfiah dan bukan hanya admin.
// ProtectedRoute di App.jsx cuma memastikan sudah login, jadi syaratnya di sini
// hanya: harus tercatat sebagai pegawai puskesmas (punya puskesmas_id).
export default function BidanPuskesmas() {
  const { profil } = useAuth() // sesuaikan nama field ini bila bentuk AuthContext-mu berbeda

  if (!profil?.puskesmas_id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">
          Halaman ini khusus untuk pegawai puskesmas.
        </p>
      </div>
    )
  }

  return <HalamanBidan profil={profil} />
}
