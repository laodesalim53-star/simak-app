#!/usr/bin/env python3
"""
Patch src/pages/Register.jsx: jenis institusi dikunci sesuai aplikasi
(VITE_APP_TIPE), pilihan "Jenis Institusi" disembunyikan, ?untuk=... diabaikan,
dan nama aplikasi tampil di judul.

Pakai:  python3 tools/patch_register.py src/pages/Register.jsx
Kalau ada potongan yang tidak ditemukan, skrip berhenti TANPA mengubah file.
"""
import sys

path = sys.argv[1] if len(sys.argv) > 1 else 'src/pages/Register.jsx'
raw = open(path, encoding='utf-8', newline='').read()
crlf = '\r\n' in raw
s = raw.replace('\r\n', '\n')

def rep(old, new, label):
    global s
    if old not in s:
        sys.exit(f'GAGAL: potongan "{label}" tidak ditemukan. File tidak diubah.')
    s = s.replace(old, new, 1)

rep("import { Link, Navigate, useSearchParams } from 'react-router-dom'\n",
    "import { Link, Navigate } from 'react-router-dom'\n", 'import react-router-dom')

rep("import { useAuth } from '../lib/AuthContext'\n",
    "import { useAuth } from '../lib/AuthContext'\n"
    "import { APP } from '../lib/appConfig'\n",
    'import AuthContext')

rep("ChevronDown } from 'lucide-react'\n",
    "ChevronDown } from 'lucide-react'\n\n"
    "// Jenis institusi dikunci oleh aplikasi yang sedang dibuka (VITE_APP_TIPE).\n"
    "// Nilainya sama dengan kolom jenis_organisasi: sekolah | kantor | puskesmas | polres.\n"
    "const JENIS_APP = import.meta.env.VITE_APP_TIPE || 'sekolah'\n",
    'import lucide-react')

rep("""  const [searchParams] = useSearchParams()
  const untukParam = searchParams.get('untuk')
  const jenisAwal =
    untukParam === 'kua' ? 'kantor'
    : untukParam === 'puskesmas' ? 'puskesmas'
    : untukParam === 'polres' ? 'polres'
    : 'sekolah'
""", "  const jenisAwal = JENIS_APP\n", 'jenisAwal / useSearchParams')

rep("""          <div>
            <span className={labelClass}>Jenis Institusi</span>
            <Segmen
              label="Jenis institusi"
              opsi={OPSI_JENIS}
              nilai={jenisInstitusi}
              onPilih={ubahJenisInstitusi}
            />
          </div>

""", "", 'blok pilihan Jenis Institusi')

rep("    'Pilih jenis institusi: Sekolah, Kantor (KUA), atau Puskesmas.',\n", "", 'langkah 1 panduan')

rep('<h1 className="text-xl font-bold text-white tracking-widest uppercase">Daftar Akun</h1>',
    '<h1 className="text-xl font-bold text-white tracking-widest uppercase">Daftar Akun</h1>\n'
    '            <p className="text-xs font-semibold tracking-widest uppercase text-blue-200/70 mt-0.5">{APP.nama}</p>',
    'judul Daftar Akun')

open(path, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if crlf else s)
print('Register.jsx berhasil di-patch:', path)
