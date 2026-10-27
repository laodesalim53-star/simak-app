import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'        // SESUAIKAN
import { useAuth } from '../context/AuthContext'  // SESUAIKAN

export default function useIsPlh() {
  const { user } = useAuth()
  const [state, setState] = useState({ loading: true, isPlh: false, data: null })

  useEffect(() => {
    if (!user?.id) { setState({ loading: false, isPlh: false, data: null }); return }
    let batal = false
    const hariIni = new Date().toISOString().slice(0, 10)
    supabase
      .from('plh_kepsek')
      .select('*')
      .eq('guru_user_id', user.id)
      .eq('aktif', true)
      .or(`tanggal_selesai.is.null,tanggal_selesai.gte.${hariIni}`)
      .limit(1)
      .then(({ data }) => {
        if (batal) return
        setState({ loading: false, isPlh: !!data?.length, data: data?.[0] || null })
      })
    return () => { batal = true }
  }, [user?.id])

  return state
}
