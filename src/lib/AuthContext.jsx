#!/usr/bin/env python3
"""
Patch src/lib/AuthContext.jsx: kunci akun ke tipe aplikasi (VITE_APP_TIPE).
 - akun dari jenis institusi lain otomatis di-logout dengan pesan jelas
   (superadmin dikecualikan, boleh masuk ke semua aplikasi)
 - daftar() menolak jenis institusi yang bukan milik aplikasi ini
 - context menyediakan `galatTenant` (dipakai Login.jsx)

Pakai:  python3 tools/patch_auth.py src/lib/AuthContext.jsx
Kalau ada potongan tidak ditemukan, skrip berhenti TANPA mengubah file.
"""
import sys
path = sys.argv[1] if len(sys.argv) > 1 else 'src/lib/AuthContext.jsx'
raw = open(path, encoding='utf-8', newline='').read()
crlf = '\r\n' in raw
s = raw.replace('\r\n', '\n')

def rep(old, new, label):
    global s
    if old not in s:
        sys.exit(f'GAGAL: potongan "{label}" tidak ditemukan. File tidak diubah.')
    s = s.replace(old, new, 1)

rep("import { supabase } from './supabaseClient'\n",
    "import { supabase } from './supabaseClient'\nimport { APP, JENIS_LABEL } from './appConfig'\n", 'import supabase')

rep("  const [profilPuskesmas, setProfilPuskesmas] = useState(undefined)\n",
    "  const [profilPuskesmas, setProfilPuskesmas] = useState(undefined)\n"
    "  // Pesan bila akun yang login bukan milik jenis institusi aplikasi ini.\n"
    "  const [galatTenant, setGalatTenant] = useState(null)\n", 'state profilPuskesmas')

rep("    const namaSekolah = data.sekolah?.nama_sekolah || null\n",
    "    const namaSekolah = data.sekolah?.nama_sekolah || null\n\n"
    "    // Aplikasi ini hanya untuk satu jenis institusi (VITE_APP_TIPE).\n"
    "    // Superadmin boleh masuk ke semua aplikasi.\n"
    "    if (data.role !== 'superadmin' && !APP.tipeTenant.includes(jenisOrganisasi)) {\n"
    "      setGalatTenant(\n"
    "        `Akun ini terdaftar sebagai ${JENIS_LABEL[jenisOrganisasi] || jenisOrganisasi}, ` +\n"
    "        `bukan di aplikasi ${APP.nama}. Silakan masuk lewat aplikasi yang sesuai.`\n"
    "      )\n"
    "      await supabase.auth.signOut()\n"
    "      if (requestId === profilRequestIdRef.current) setProfil(null)\n"
    "      return\n"
    "    }\n", 'namaSekolah di loadProfil')

rep("""  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({
      email,
      password,
    })
""", """  const signIn = (email, password) => {
    setGalatTenant(null)
    return supabase.auth.signInWithPassword({
      email,
      password,
    })
  }
""", 'signIn')

rep("    if (jenisOrganisasi === 'kantor' && jabatan === 'orang_tua') {\n",
    "    if (!APP.tipeTenant.includes(jenisOrganisasi)) {\n"
    "      return {\n"
    "        error: {\n"
    "          message: `Aplikasi ${APP.nama} hanya untuk pendaftaran ${JENIS_LABEL[APP.tipeTenant[0]]}.`,\n"
    "        },\n"
    "      }\n"
    "    }\n"
    "    if (jenisOrganisasi === 'kantor' && jabatan === 'orang_tua') {\n", 'validasi daftar')

rep("        signIn,\n        signOut,\n", "        signIn,\n        signOut,\n        galatTenant,\n", 'value context')

open(path, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if crlf else s)
print('AuthContext.jsx berhasil di-patch:', path)
