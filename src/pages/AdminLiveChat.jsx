import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Headset, Search, MessageSquare, ArrowLeft } from 'lucide-react'
import Layout from '../components/Layout'
// PENTING: sesuaikan path import ini dengan lokasi client Supabase Anda,
// sama seperti yang dipakai di Beranda.jsx.
import { supabase } from '../lib/supabaseClient'

// Halaman dashboard admin untuk membalas pesan live chat dari pengunjung
// website. Dibungkus dengan <Layout> yang sama dipakai Dashboard.jsx, dsb —
// jadi otomatis dapat sidebar navigasi + header (notifikasi, tombol toko,
// dll) yang sama, bukan halaman berdiri sendiri lagi.
// Menampilkan daftar percakapan (dikelompokkan per sesi_id) di sisi kiri,
// dan jendela percakapan yang sedang dibuka di sisi kanan. Balasan admin
// disimpan ke tabel yang sama (live_chat_pesan) dengan pengirim: 'admin',
// sehingga langsung muncul realtime di panel chat pengunjung di Beranda.

function formatWaktu(iso) {
  if (!iso) return ''
  const tanggal = new Date(iso)
  const sekarang = new Date()
  const sama_hari = tanggal.toDateString() === sekarang.toDateString()
  if (sama_hari) {
    return tanggal.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }
  return tanggal.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

function inisialNama(nama) {
  if (!nama) return '?'
  return nama.trim().charAt(0).toUpperCase()
}

export default function AdminLiveChat() {
  const [daftarSesi, setDaftarSesi] = useState([])
  const [sesiAktif, setSesiAktif] = useState(null)
  const [pesanAktif, setPesanAktif] = useState([])
  const [balasan, setBalasan] = useState('')
  const [mengirim, setMengirim] = useState(false)
  const [pencarian, setPencarian] = useState('')
  const [memuat, setMemuat] = useState(true)

  const sesiAktifRef = useRef(null)
  const chatBodyRef = useRef(null)

  useEffect(() => {
    sesiAktifRef.current = sesiAktif
  }, [sesiAktif])

  // Susun daftar percakapan dari seluruh baris di live_chat_pesan,
  // dikelompokkan per sesi_id, diurutkan dari yang paling baru dibalas.
  const muatDaftarSesi = useCallback(async () => {
    const { data, error } = await supabase
      .from('live_chat_pesan')
      .select('*')
      .order('dibuat_pada', { ascending: true })
    if (error || !data) {
      setMemuat(false)
      return
    }
    const peta = new Map()
    data.forEach((p) => {
      const ada = peta.get(p.sesi_id) || {
        sesi_id: p.sesi_id,
        nama: p.nama_pengirim || 'Pengunjung',
        pesanTerakhir: '',
        waktuTerakhir: null,
        belumDibaca: 0,
      }
      if (p.nama_pengirim) ada.nama = p.nama_pengirim
      ada.pesanTerakhir = p.pesan
      ada.waktuTerakhir = p.dibuat_pada
      if (p.pengirim === 'pengunjung' && !p.dibaca) ada.belumDibaca += 1
      peta.set(p.sesi_id, ada)
    })
    const daftar = Array.from(peta.values()).sort(
      (a, b) => new Date(b.waktuTerakhir) - new Date(a.waktuTerakhir)
    )
    setDaftarSesi(daftar)
    setMemuat(false)
  }, [])

  useEffect(() => {
    muatDaftarSesi()

    const channel = supabase
      .channel('admin-live-chat-semua')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chat_pesan' },
        (payload) => {
          muatDaftarSesi()
          if (sesiAktifRef.current === payload.new.sesi_id) {
            setPesanAktif((prev) => [...prev, payload.new])
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [muatDaftarSesi])

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight
    }
  }, [pesanAktif])

  async function bukaSesi(sesiId) {
    setSesiAktif(sesiId)
    const { data, error } = await supabase
      .from('live_chat_pesan')
      .select('*')
      .eq('sesi_id', sesiId)
      .order('dibuat_pada', { ascending: true })
    if (!error && data) setPesanAktif(data)

    await supabase
      .from('live_chat_pesan')
      .update({ dibaca: true })
      .eq('sesi_id', sesiId)
      .eq('pengirim', 'pengunjung')
      .eq('dibaca', false)
    muatDaftarSesi()
  }

  async function kirimBalasan(e) {
    e.preventDefault()
    const isi = balasan.trim()
    if (!isi || !sesiAktif || mengirim) return
    setMengirim(true)
    setBalasan('')
    const { error } = await supabase.from('live_chat_pesan').insert({
      sesi_id: sesiAktif,
      nama_pengirim: 'Admin SIMAK',
      pengirim: 'admin',
      pesan: isi,
      dibaca: true,
    })
    if (error) setBalasan(isi)
    setMengirim(false)
  }

  const sesiTersaring = daftarSesi.filter((s) =>
    s.nama.toLowerCase().includes(pencarian.trim().toLowerCase())
  )
  const sesiTerpilih = daftarSesi.find((s) => s.sesi_id === sesiAktif)

  return (
    <Layout title="Live Chat" subtitle="Percakapan real-time dengan pengunjung website">
      <div className={`admchat-card ${sesiAktif ? 'admchat-tampilkan-panel' : ''}`}>

        <aside className="admchat-list">
          <div className="admchat-list-header">
            <div className="admchat-list-title">
              <Headset size={18} strokeWidth={2.4} />
              Live Chat
            </div>
            <p className="admchat-list-sub">Percakapan dari pengunjung website</p>
            <div className="admchat-search">
              <Search size={14} strokeWidth={2.4} />
              <input
                type="text"
                value={pencarian}
                onChange={(e) => setPencarian(e.target.value)}
                placeholder="Cari nama pengunjung..."
              />
            </div>
          </div>

          <div className="admchat-list-body">
            {memuat && <p className="admchat-status-text">Memuat percakapan...</p>}

            {!memuat && sesiTersaring.length === 0 && (
              <div className="admchat-kosong">
                <MessageSquare size={26} strokeWidth={1.8} />
                <p>Belum ada percakapan masuk.</p>
              </div>
            )}

            {sesiTersaring.map((s) => (
              <button
                key={s.sesi_id}
                type="button"
                className={`admchat-item ${s.sesi_id === sesiAktif ? 'admchat-item-aktif' : ''}`}
                onClick={() => bukaSesi(s.sesi_id)}
              >
                <div className="admchat-avatar">{inisialNama(s.nama)}</div>
                <div className="admchat-item-text">
                  <div className="admchat-item-top">
                    <span className="admchat-item-nama">{s.nama}</span>
                    <span className="admchat-item-waktu">{formatWaktu(s.waktuTerakhir)}</span>
                  </div>
                  <p className="admchat-item-preview">{s.pesanTerakhir}</p>
                </div>
                {s.belumDibaca > 0 && <span className="admchat-badge">{s.belumDibaca}</span>}
              </button>
            ))}
          </div>
        </aside>

        <section className="admchat-panel">
          {!sesiAktif ? (
            <div className="admchat-empty-state">
              <div className="admchat-empty-icon"><Headset size={28} strokeWidth={1.8} /></div>
              <p className="admchat-empty-title">Pilih percakapan</p>
              <p className="admchat-empty-sub">Pilih salah satu pengunjung di daftar sebelah kiri untuk mulai membalas.</p>
            </div>
          ) : (
            <>
              <div className="admchat-panel-header">
                <button
                  type="button"
                  className="admchat-back-btn"
                  onClick={() => setSesiAktif(null)}
                  aria-label="Kembali ke daftar percakapan"
                >
                  <ArrowLeft size={18} strokeWidth={2.4} />
                </button>
                <div className="admchat-avatar admchat-avatar-header">{inisialNama(sesiTerpilih?.nama)}</div>
                <div>
                  <p className="admchat-panel-nama">{sesiTerpilih?.nama}</p>
                  <p className="admchat-panel-status">Pengunjung website</p>
                </div>
              </div>

              <div className="admchat-panel-body" ref={chatBodyRef}>
                {pesanAktif.map((p) => (
                  <div
                    key={p.id}
                    className={`admchat-bubble ${p.pengirim === 'admin' ? 'admchat-bubble-admin' : 'admchat-bubble-pengunjung'}`}
                  >
                    {p.pesan}
                    <span className="admchat-bubble-waktu">{formatWaktu(p.dibuat_pada)}</span>
                  </div>
                ))}
              </div>

              <form className="admchat-input-row" onSubmit={kirimBalasan}>
                <input
                  type="text"
                  value={balasan}
                  onChange={(e) => setBalasan(e.target.value)}
                  placeholder="Tulis balasan..."
                  className="admchat-input"
                />
                <button type="submit" className="admchat-send-btn" disabled={!balasan.trim() || mengirim}>
                  <Send size={17} strokeWidth={2.4} />
                </button>
              </form>
            </>
          )}
        </section>

      </div>

      <style>{`
        .admchat-card * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .admchat-card {
          display: flex;
          height: calc(100vh - 230px);
          min-height: 520px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06);
          border: 1px solid #E2E8F0;
          background: #fff;
        }

        .admchat-list {
          width: 300px;
          flex-shrink: 0;
          border-right: 1px solid #EEF0F7;
          display: flex;
          flex-direction: column;
          background: #F7F8FC;
        }
        .admchat-list-header {
          padding: 18px 16px 14px;
          background: linear-gradient(120deg, #172554 0%, #312e81 100%);
          color: #fff;
          flex-shrink: 0;
        }
        .admchat-list-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 3px;
        }
        .admchat-list-sub { font-size: 11.5px; color: #B7BAD6; margin: 0 0 12px; }
        .admchat-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 10px;
          padding: 8px 11px;
          color: #D8DBF5;
        }
        .admchat-search input {
          flex: 1;
          min-width: 0;
          background: none;
          border: none;
          outline: none;
          color: #fff;
          font-size: 13px;
          font-family: inherit;
        }
        .admchat-search input::placeholder { color: #9498C4; }

        .admchat-list-body {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
        .admchat-status-text { font-size: 12.5px; color: #7A8094; text-align: center; padding: 24px 12px; }
        .admchat-kosong {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #9AA0B4;
          text-align: center;
          padding: 40px 20px;
          font-size: 12.5px;
        }
        .admchat-item {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          text-align: left;
          background: none;
          border: none;
          border-radius: 12px;
          padding: 10px 10px;
          cursor: pointer;
          font-family: inherit;
          position: relative;
        }
        .admchat-item:hover { background: #EEF0FA; }
        .admchat-item-aktif { background: #fff; box-shadow: 0 4px 14px rgba(23, 26, 46, 0.08); }
        .admchat-avatar {
          width: 34px; height: 34px;
          border-radius: 999px;
          background: linear-gradient(135deg, #3b82f6, #4f46e5);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .admchat-item-text { flex: 1; min-width: 0; }
        .admchat-item-top { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
        .admchat-item-nama { font-size: 13px; font-weight: 700; color: #171A2E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .admchat-item-waktu { font-size: 10.5px; color: #9AA0B4; flex-shrink: 0; }
        .admchat-item-preview {
          font-size: 12px;
          color: #7A8094;
          margin: 2px 0 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admchat-badge {
          flex-shrink: 0;
          min-width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #E11D48;
          color: #fff;
          font-size: 10.5px;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          padding: 0 5px;
          margin-top: 3px;
        }

        .admchat-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: #FBFBFE;
        }
        .admchat-empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-align: center;
          padding: 20px;
        }
        .admchat-empty-icon {
          width: 52px; height: 52px;
          border-radius: 999px;
          background: #EEF0FA;
          color: #4338ca;
          display: flex; align-items: center; justify-content: center;
        }
        .admchat-empty-title { font-size: 14.5px; font-weight: 700; color: #171A2E; margin: 0; }
        .admchat-empty-sub { font-size: 12.5px; color: #9AA0B4; margin: 0; max-width: 30ch; }

        .admchat-panel-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid #EEF0F7;
          flex-shrink: 0;
        }
        .admchat-back-btn {
          display: none;
          width: 32px; height: 32px;
          border-radius: 999px;
          background: #F1F3FA;
          border: none;
          color: #5B6172;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .admchat-avatar-header { width: 38px; height: 38px; font-size: 14px; }
        .admchat-panel-nama { font-size: 14px; font-weight: 700; color: #171A2E; margin: 0; }
        .admchat-panel-status { font-size: 11.5px; color: #9AA0B4; margin: 1px 0 0; }

        .admchat-panel-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .admchat-bubble {
          max-width: 62%;
          font-size: 13.5px;
          line-height: 1.5;
          padding: 10px 13px;
          border-radius: 15px;
          word-break: break-word;
          position: relative;
        }
        .admchat-bubble-pengunjung {
          align-self: flex-start;
          background: #F1F3FA;
          color: #171A2E;
          border-bottom-left-radius: 4px;
        }
        .admchat-bubble-admin {
          align-self: flex-end;
          background: linear-gradient(135deg, #3b82f6, #4f46e5);
          color: #fff;
          border-bottom-right-radius: 4px;
        }
        .admchat-bubble-waktu {
          display: block;
          font-size: 10px;
          opacity: 0.65;
          margin-top: 4px;
        }

        .admchat-input-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          border-top: 1px solid #EEF0F7;
          flex-shrink: 0;
        }
        .admchat-input {
          flex: 1;
          min-width: 0;
          font-size: 14px;
          padding: 11px 15px;
          border-radius: 999px;
          border: 1px solid #E2E5F0;
          background: #F7F8FC;
          color: #171A2E;
          font-family: inherit;
        }
        .admchat-input:focus { outline: none; border-color: #4f46e5; background: #fff; }
        .admchat-send-btn {
          flex-shrink: 0;
          width: 40px; height: 40px;
          border-radius: 999px;
          background: linear-gradient(135deg, #3b82f6, #4f46e5);
          color: #fff;
          border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(79, 70, 229, 0.3);
        }
        .admchat-send-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

        /* Di layar sempit, tampilkan daftar ATAU jendela percakapan
           bergantian (seperti aplikasi chat pada umumnya), dengan tombol
           kembali untuk balik ke daftar. */
        @media (max-width: 780px) {
          .admchat-card { height: calc(100vh - 190px); border-radius: 12px; }
          .admchat-list { width: 100%; }
          .admchat-back-btn { display: flex; }
          .admchat-card.admchat-tampilkan-panel .admchat-list { display: none; }
          .admchat-card:not(.admchat-tampilkan-panel) .admchat-panel { display: none; }
        }
      `}</style>
    </Layout>
  )
}
