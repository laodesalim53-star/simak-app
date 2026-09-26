import { useAuth } from '../lib/AuthContext'
import HalamanBidan from '../components/HalamanBidan'

// Berbeda dari rute adminOnly (profil-puskesmas, data-pegawai-puskesmas, dst),
// halaman ini dipakai sehari-hari oleh bidan/mantri sendiri, bukan hanya admin.
// ProtectedRoute di App.jsx cuma memastikan sudah login, jadi pembatasan per-role
// dilakukan di sini.
const ROLE_DIIZINKAN = ['bidan', 'mantri', 'admin_puskesmas', 'superadmin']

export default function BidanPuskesmas() {
  const { profil } = useAuth() // sesuaikan nama field ini bila bentuk AuthContext-mu berbeda

  if (!profil || !ROLE_DIIZINKAN.includes(profil.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">
          Halaman ini khusus untuk bidan/mantri puskesmas. Hubungi admin puskesmas Anda bila ini keliru.
        </p>
      </div>
    )
  }

  return <HalamanBidan profil={profil} />
}
