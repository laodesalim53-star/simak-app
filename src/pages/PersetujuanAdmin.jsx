import { useCallback, useEffect, useState } from 'react'
import {
  Building2,
  Check,
  Clock3,
  CreditCard,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

// Berapa lama masa aktif paket dihitung sejak disetujui (dalam hari).
// Ganti sesuai kebijakan (mis. 30 untuk bulanan). Set null kalau tidak
// mau ada tanggal kedaluwarsa.
const MASA_AKTIF_HARI = 30

// Label tampilan untuk jenis tenant/organisasi.
const LABEL_JENIS_TENANT = {
  sekolah: 'Sekolah',
  kantor: 'Kantor',
  puskesmas: 'Puskesmas',
}

// Label tampilan untuk jabatan, khususnya jabatan tenant puskesmas &
// kantor yang namanya tidak langsung terbaca (mis. 'kepala_puskesmas').
const LABEL_JABATAN = {
  guru: 'Guru',
  orang_tua: 'Orang Tua/Wali',
  kepala_sekolah: 'Kepala Sekolah',
  pegawai: 'Pegawai',
  kepala_kantor: 'Kepala Kantor',
  kepala_puskesmas: 'Kepala Puskesmas',
  admin: 'Admin',
}

function labelJenisTenant(jenis) {
  return LABEL_JENIS_TENANT[jenis] || 'Sekolah'
}

function labelJabatan(jabatan) {
  if (!jabatan) return null
  return LABEL_JABATAN[jabatan] || jabatan
}

export default function PersetujuanAdmin() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [upgradeRequests, setUpgradeRequests] = useState([])
  const [loadingUpgrade, setLoadingUpgrade] = useState(true)
  const [processingUpgradeId, setProcessingUpgradeId] = useState(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError('')
    setMessage('')

    // PERBAIKAN: tambahkan 'jabatan' dan join ke 'sekolah' supaya jenis
    // tenant (sekolah/kantor/puskesmas) dan jabatan spesifik (mis.
    // kepala_puskesmas) bisa ditampilkan di kartu permohonan.
    const { data, error: requestError } = await supabase
      .from('permohonan_akun')
      .select(
        'id, nama_lengkap, email, role, jabatan, status, created_at, sekolah:sekolah_id ( nama_sekolah, jenis_organisasi )'
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (requestError) {
      setError(
        requestError.message ||
          'Data permohonan akun gagal dimuat.'
      )
      setRequests([])
    } else {
      setRequests(data || [])
    }

    setLoading(false)
  }, [])

  const loadUpgradeRequests = useCallback(async () => {
    setLoadingUpgrade(true)

    const { data, error: upgradeError } = await supabase
      .from('permohonan_upgrade_paket')
      .select(
        'id, user_id, email, nama_lengkap, paket, nominal, bank_pengirim, nama_pengirim, no_rekening_pengirim, catatan, status, created_at'
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (upgradeError) {
      setError(
        (prev) =>
          prev ||
          upgradeError.message ||
          'Data permohonan upgrade paket gagal dimuat.'
      )
      setUpgradeRequests([])
    } else {
      setUpgradeRequests(data || [])
    }

    setLoadingUpgrade(false)
  }, [])

  useEffect(() => {
    loadRequests()
    loadUpgradeRequests()
  }, [loadRequests, loadUpgradeRequests])

  function muatUlangSemua() {
    loadRequests()
    loadUpgradeRequests()
  }

  async function updateRequest(request, status) {
    const actionText =
      status === 'approved' ? 'menyetujui' : 'menolak'

    const confirmed = window.confirm(
      `Yakin ingin ${actionText} permohonan dari ${request.email}?`
    )

    if (!confirmed) return

    setProcessingId(request.id)
    setError('')
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const updateData =
      status === 'approved'
        ? {
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user?.id || null,
          }
        : {
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejected_by: user?.id || null,
          }

    const { error: updateError } = await supabase
      .from('permohonan_akun')
      .update(updateData)
      .eq('id', request.id)

    if (updateError) {
      setError(
        updateError.message ||
          'Status permohonan gagal diperbarui.'
      )
    } else {
      setRequests((current) =>
        current.filter((item) => item.id !== request.id)
      )

      setMessage(
        status === 'approved'
          ? 'Permohonan akun berhasil disetujui.'
          : 'Permohonan akun berhasil ditolak.'
      )
    }

    setProcessingId(null)
  }

  async function updateUpgradeRequest(request, status) {
    const actionText =
      status === 'approved' ? 'menyetujui' : 'menolak'

    const confirmed = window.confirm(
      `Yakin ingin ${actionText} permohonan upgrade paket ${request.paket} dari ${request.email}?`
    )

    if (!confirmed) return

    setProcessingUpgradeId(request.id)
    setError('')
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const updateData =
      status === 'approved'
        ? {
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user?.id || null,
          }
        : {
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejected_by: user?.id || null,
          }

    const { error: updateError } = await supabase
      .from('permohonan_upgrade_paket')
      .update(updateData)
      .eq('id', request.id)

    if (updateError) {
      setError(
        updateError.message ||
          'Status permohonan upgrade gagal diperbarui.'
      )
      setProcessingUpgradeId(null)
      return
    }

    // Kalau disetujui, langsung aktifkan paket di profil user.
    if (status === 'approved') {
      const profilUpdate = { paket: request.paket }

      if (MASA_AKTIF_HARI) {
        const berlakuSampai = new Date()
        berlakuSampai.setDate(berlakuSampai.getDate() + MASA_AKTIF_HARI)
        profilUpdate.paket_berlaku_sampai = berlakuSampai.toISOString()
      }

      const { error: profilError } = await supabase
        .from('profil')
        .update(profilUpdate)
        .eq('id', request.user_id)

      if (profilError) {
        setError(
          `Status permohonan tersimpan, tapi paket user gagal diaktifkan: ${profilError.message}`
        )
        setProcessingUpgradeId(null)
        return
      }
    }

    setUpgradeRequests((current) =>
      current.filter((item) => item.id !== request.id)
    )

    setMessage(
      status === 'approved'
        ? `Upgrade paket ${request.paket} untuk ${request.email} berhasil disetujui dan diaktifkan.`
        : 'Permohonan upgrade paket berhasil ditolak.'
    )

    setProcessingUpgradeId(null)
  }

  function formatDate(date) {
    if (!date) return '-'

    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date))
  }

  function formatRupiah(nominal) {
    if (nominal === null || nominal === undefined) return '-'

    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(nominal)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-600">
              <ShieldCheck size={18} />
              Panel Administrator
            </div>

            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              Persetujuan
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Tinjau dan kelola permohonan pendaftaran akun serta upgrade paket.
            </p>
          </div>

          <button
            type="button"
            onClick={muatUlangSemua}
            disabled={loading || loadingUpgrade}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading || loadingUpgrade ? 'animate-spin' : ''}
            />
            Muat ulang
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Clock3 size={20} />
            </div>

            <p className="text-sm text-slate-500">
              Akun menunggu persetujuan
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {requests.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
              <CreditCard size={20} />
            </div>

            <p className="text-sm text-slate-500">
              Upgrade paket menunggu verifikasi
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {upgradeRequests.length}
            </p>
          </div>
        </div>

        {/* ===== Persetujuan akun (bagian lama) ===== */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Daftar Permohonan Akun
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center px-6 py-16 text-sm text-slate-500">
              <RefreshCw size={18} className="mr-2 animate-spin" />
              Memuat permohonan...
            </div>
          ) : requests.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check size={26} />
              </div>

              <h3 className="font-semibold text-slate-900">
                Semua sudah beres
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Belum ada permohonan akun yang perlu ditinjau.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((request) => {
                const jenisOrganisasi =
                  request.sekolah?.jenis_organisasi || 'sekolah'
                const namaOrganisasi = request.sekolah?.nama_sekolah

                return (
                  <article
                    key={request.id}
                    className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <UserRound size={21} />
                      </div>

                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {request.nama_lengkap || 'Nama belum diisi'}
                        </h3>

                        <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                          <Mail size={14} />
                          {request.email}
                        </div>

                        {namaOrganisasi && (
                          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                            <Building2 size={14} />
                            {namaOrganisasi}
                          </div>
                        )}

                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {/* Jenis tenant: Sekolah / Kantor / Puskesmas */}
                          <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-medium text-indigo-700">
                            {labelJenisTenant(jenisOrganisasi)}
                          </span>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium capitalize text-slate-600">
                            {labelJabatan(request.jabatan) ||
                              request.role ||
                              'Guru'}
                          </span>

                          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
                            Menunggu
                          </span>

                          <span className="text-slate-400">
                            Diajukan {formatDate(request.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 lg:shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          updateRequest(request, 'rejected')
                        }
                        disabled={processingId === request.id}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none"
                      >
                        <X size={16} />
                        Tolak
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateRequest(request, 'approved')
                        }
                        disabled={processingId === request.id}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none"
                      >
                        {processingId === request.id ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        Setujui
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* ===== Persetujuan upgrade paket (bagian baru) ===== */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Konfirmasi Transfer Upgrade Paket
            </h2>
          </div>

          {loadingUpgrade ? (
            <div className="flex items-center justify-center px-6 py-16 text-sm text-slate-500">
              <RefreshCw size={18} className="mr-2 animate-spin" />
              Memuat permohonan...
            </div>
          ) : upgradeRequests.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check size={26} />
              </div>

              <h3 className="font-semibold text-slate-900">
                Semua sudah beres
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Belum ada konfirmasi transfer upgrade paket yang perlu ditinjau.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upgradeRequests.map((request) => (
                <article
                  key={request.id}
                  className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                      <CreditCard size={21} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {request.nama_lengkap || request.email}{' '}
                        <span className="font-normal text-slate-400">
                          &rarr; paket {request.paket}
                        </span>
                      </h3>

                      <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                        <Mail size={14} />
                        {request.email}
                      </div>

                      <div className="mt-2 text-sm text-slate-600">
                        Transfer {formatRupiah(request.nominal)} dari{' '}
                        {request.nama_pengirim}
                        {request.bank_pengirim
                          ? ` (${request.bank_pengirim})`
                          : ''}
                        , no. rek. {request.no_rekening_pengirim}
                      </div>

                      {request.catatan && (
                        <p className="mt-1 text-sm italic text-slate-500">
                          "{request.catatan}"
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
                          Menunggu verifikasi
                        </span>

                        <span className="text-slate-400">
                          Diajukan {formatDate(request.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 lg:shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        updateUpgradeRequest(request, 'rejected')
                      }
                      disabled={processingUpgradeId === request.id}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none"
                    >
                      <X size={16} />
                      Tolak
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateUpgradeRequest(request, 'approved')
                      }
                      disabled={processingUpgradeId === request.id}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none"
                    >
                      {processingUpgradeId === request.id ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      Setujui &amp; Aktifkan
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
