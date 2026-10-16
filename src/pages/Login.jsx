#!/usr/bin/env python3
"""
Patch src/pages/Login.jsx: tema/nama/warna mengikuti aplikasi (APP.tema),
warna kain bergelombang bisa diatur per aplikasi, dan pesan "akun bukan milik
aplikasi ini" (galatTenant dari AuthContext) ditampilkan.

CATATAN: pada file Login.jsx yang dikirim, variabel `tema` dipakai tetapi
tidak didefinisikan. Skrip ini mendefinisikannya dari APP.tema; bila di file
Anda `tema` sudah didefinisikan sendiri, bagian itu dilewati.

Pakai:  python3 tools/patch_login.py src/pages/Login.jsx
"""
import sys, re
path = sys.argv[1] if len(sys.argv) > 1 else 'src/pages/Login.jsx'
raw = open(path, encoding='utf-8', newline='').read()
crlf = '\r\n' in raw
s = raw.replace('\r\n', '\n')

def rep(old, new, label):
    global s
    if old not in s:
        sys.exit(f'GAGAL: potongan "{label}" tidak ditemukan. File tidak diubah.')
    s = s.replace(old, new, 1)

rep("import { supabase } from '../lib/supabaseClient'\n",
    "import { supabase } from '../lib/supabaseClient'\nimport { APP } from '../lib/appConfig'\n", 'import supabase')

# warna kain per aplikasi
rep("function WavyClothBackground() {", "function WavyClothBackground({ kain }) {", 'WavyClothBackground')
rep('<path ref={redTopRef} fill="#c81e1e" />', '<path ref={redTopRef} fill={kain.atas} />', 'path redTop')
rep('<path ref={redTop2Ref} fill="#e23b3b" opacity="0.55" />', '<path ref={redTop2Ref} fill={kain.atas2} opacity="0.55" />', 'path redTop2')
rep('<path ref={whiteBottomRef} fill="#f5f5f0" />', '<path ref={whiteBottomRef} fill={kain.bawah} />', 'path whiteBottom')
rep('<path ref={whiteBottom2Ref} fill="#ffffff" opacity="0.6" />', '<path ref={whiteBottom2Ref} fill={kain.bawah2} opacity="0.6" />', 'path whiteBottom2')

# galatTenant + tema
rep("  const { session, signIn } = useAuth()\n",
    "  const { session, signIn, galatTenant } = useAuth()\n", 'useAuth di Login')
if not re.search(r'\b(const|let|var)\s+tema\b', s) and not re.search(r'import[^\n]*\btema\b', s):
    rep("  const location = useLocation()\n",
        "  const location = useLocation()\n  const tema = APP.tema\n", 'location (definisi tema)')
else:
    print('Info: `tema` sudah didefinisikan di file ini, definisi dilewati.')

# nama properti (typo "tekstasAtas") -> teksAtas
if 'tema.tekstasAtas' in s:
    s = s.replace('tema.tekstasAtas', 'tema.teksAtas')

# tampilkan galatTenant
rep("  const onSubmit = mode === 'lupa' ? handleLupa : mode === 'baru' ? handleBaru : handleSubmit\n",
    "  const onSubmit = mode === 'lupa' ? handleLupa : mode === 'baru' ? handleBaru : handleSubmit\n"
    "  const pesanGalat = error || galatTenant\n", 'onSubmit')
rep("{error && (\n            <p\n              key={shake}", "{pesanGalat && (\n            <p\n              key={shake}", 'blok error')
rep("              {error}\n            </p>\n          )}\n          {info &&",
    "              {pesanGalat}\n            </p>\n          )}\n          {info &&", 'teks error')

open(path, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if crlf else s)
print('Login.jsx berhasil di-patch:', path)
