import { lazy } from 'react'

// Perbandingan ditulis LANGSUNG dengan import.meta.env.VITE_APP_TIPE supaya
// Vite mengganti nilainya jadi string literal saat build, sehingga cabang
// (dan dynamic import) tipe lain dibuang dari bundle.
const RoutesTenant =
  import.meta.env.VITE_APP_TIPE === 'polres'
    ? lazy(() => import('./RoutesPolres'))
    : import.meta.env.VITE_APP_TIPE === 'puskesmas'
    ? lazy(() => import('./RoutesPuskesmas'))
    : import.meta.env.VITE_APP_TIPE === 'kantor'
    ? lazy(() => import('./RoutesKantor'))
    : lazy(() => import('./RoutesSekolah')) // default: sekolah

export default RoutesTenant
