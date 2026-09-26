import { useAuth } from '../lib/AuthContext'
import HalamanBidan from '../components/HalamanBidan'

// Berbeda dari rute adminOnly (profil-puskesmas, data-pegawai-puskesmas, dst),
// halaman ini dipakai sehari-hari oleh SEMUA pegawai puskesmas (lihat
// getLinksPuskesmasPegawai di Sidebar.jsx — flat, tidak dipisah per jabatan),
// bukan hanya bidan/mantri secara harfiah dan bukan hanya admin.
// ProtectedRoute di App.jsx cuma memastikan sudah login, jadi syaratnya di sini
// hanya: harus tercatat sebagai tenant puskesmas (jenis_organisasi === 'puskesmas'
// dan sekolah_id terisi). Tenant puskesmas/kantor/sekolah berbagi kolom sekolah_id
// yang sama, dibedakan lewat jenis_organisasi — TIDAK ada kolom puskesmas_id.
export default function BidanPuskesmas() {
  const { profil } = useAuth()

  if (profil?.jenis_organisasi !== 'puskesmas' || !profil?.sekolah_id) {
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
