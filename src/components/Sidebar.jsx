#!/usr/bin/env python3
"""
Patch src/components/Sidebar.jsx supaya menu dipilih per tipe aplikasi
(VITE_APP_TIPE) dan nama aplikasi tampil di header.

Pakai:  python3 tools/patch_sidebar.py src/components/Sidebar.jsx
Aman dijalankan sekali; kalau ada potongan yang tidak ditemukan, skrip
berhenti TANPA mengubah file dan menyebut potongan mana yang gagal.
"""
import sys, re

path = sys.argv[1] if len(sys.argv) > 1 else 'src/components/Sidebar.jsx'
raw = open(path, encoding='utf-8', newline='').read()
crlf = '\r\n' in raw
s = raw.replace('\r\n', '\n')

def rep(old, new, label):
    global s
    if old not in s:
        sys.exit(f'GAGAL: potongan "{label}" tidak ditemukan. File tidak diubah.')
    s = s.replace(old, new, 1)

rep("import PaketBadge, { usePaketSaatIni } from './PaketBadge'\n",
    "import PaketBadge, { usePaketSaatIni } from './PaketBadge'\n"
    "import { APP } from '../lib/appConfig'\n\n"
    "// Dibandingkan langsung dengan import.meta.env supaya Vite membuang\n"
    "// fungsi menu tipe lain dari bundle.\n"
    "const TIPE = import.meta.env.VITE_APP_TIPE || 'sekolah'\n",
    'import PaketBadge')

rep("    isKantor,\n    isPuskesmas,\n    isPolres,\n", "", 'destructuring isKantor/isPuskesmas/isPolres')

rep("const groupsAdmin = isKantor\n", "const groupsAdmin = TIPE === 'kantor'\n", 'groupsAdmin kantor')
rep("    : isPuskesmas\n    ? getGroupsPuskesmasAdmin", "    : TIPE === 'puskesmas'\n    ? getGroupsPuskesmasAdmin", 'groupsAdmin puskesmas')
rep("    : isPolres\n    ? getGroupsPolresAdmin", "    : TIPE === 'polres'\n    ? getGroupsPolresAdmin", 'groupsAdmin polres')

rep("const linksGuru = isKantor\n", "const linksGuru = TIPE === 'kantor'\n", 'linksGuru kantor')
rep("    : isPuskesmas\n    ? getLinksPuskesmasPegawai", "    : TIPE === 'puskesmas'\n    ? getLinksPuskesmasPegawai", 'linksGuru puskesmas')
rep("    : isPolres\n    ? getLinksPolresPegawai", "    : TIPE === 'polres'\n    ? getLinksPolresPegawai", 'linksGuru polres')

rep("const linksOrangTua = getLinksOrangTua(jumlahPesanBelumDibaca, sekolahId)",
    "const linksOrangTua = TIPE === 'sekolah' ? getLinksOrangTua(jumlahPesanBelumDibaca, sekolahId) : []",
    'linksOrangTua')

# Nama aplikasi di header
rep('            <p className="font-display font-semibold text-[13px] leading-tight truncate text-white">{namaTampil}</p>',
    '            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/50 truncate">{APP.nama}</p>\n'
    '            <p className="font-display font-semibold text-[13px] leading-tight truncate text-white">{namaTampil}</p>',
    'header nama pengguna')

# Hook real-time khusus sekolah: jangan jalan di aplikasi lain
rep("if (!isSuperAdmin) {\n      setJumlahPengajuanTokoMenunggu(0)",
    "if (!isSuperAdmin || TIPE !== 'sekolah') {\n      setJumlahPengajuanTokoMenunggu(0)", 'hook pengajuan toko')
rep("if (!isSuperAdmin) {\n      setJumlahSiapDicairkan(0)",
    "if (!isSuperAdmin || TIPE !== 'sekolah') {\n      setJumlahSiapDicairkan(0)", 'hook pencairan')
rep("if (!session?.user?.id || !isAdmin) {\n      setJumlahPesanPusatBelumDibaca(0)",
    "if (!session?.user?.id || !isAdmin || TIPE !== 'sekolah') {\n      setJumlahPesanPusatBelumDibaca(0)", 'hook pesan pusat')

open(path, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if crlf else s)
print('Sidebar.jsx berhasil di-patch:', path)
