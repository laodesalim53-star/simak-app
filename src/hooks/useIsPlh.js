import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Apakah akun yang login ditunjuk sebagai PLH/Plt Kepala Sekolah (tabel plh_kepsek).
export default function useIsPlh() {
  const { session } = useAuth()
  const uid = session?.user?.id
  const [state, setState] = useState({ loading: true, isPlh: false, data: null })

  useEffect(() => {
    if (!uid) {
      setState({ loading: false, isPlh: false, data: null })
      return
    }
    let batal = false
    const hariIni = new Date().toISOString().slice(0, 10)
    supabase
      .from('plh_kepsek')
      .select('*')
      .eq('guru_user_id', uid)
      .eq('aktif', true)
      .or(`tanggal_selesai.is.null,tanggal_selesai.gte.${hariIni}`)
      .limit(1)
      .then(({ data }) => {
        if (batal) return
        setState({ loading: false, isPlh: !!data?.length, data: data?.[0] || null })
      })
    return () => { batal = true }
  }, [uid])

  return state
}
