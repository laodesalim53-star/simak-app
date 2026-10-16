import { Suspense } from 'react'
import { CartProvider } from './lib/CartContext'
import LisensiCetak from './components/LisensiCetak'
import DemoSessionWatcher from './components/DemoSessionWatcher'
import TemaSync from './TemaSync'
import { FallbackLoader } from './components/RouteGuards'
import { APP } from './lib/appConfig'
import RoutesTenant from './routes'

// Route sebenarnya ada di src/routes/Routes<Tipe>.jsx.
// Tipe aplikasi dipilih saat build lewat VITE_APP_TIPE (lihat .env.*).
export default function App() {
  return (
    <CartProvider>
      <Suspense fallback={<FallbackLoader />}>
        <RoutesTenant />
      </Suspense>
      <TemaSync />
      <DemoSessionWatcher />
      <LisensiCetak app={APP.lisensi} />
    </CartProvider>
  )
}
