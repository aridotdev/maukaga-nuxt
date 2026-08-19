export default defineEventHandler(async (event) => {
  const session = await requireAdminCacheSession(event)
  const idPengajuan = String(getRouterParam(event, 'id') || '').trim()

  if (!idPengajuan) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID Pengajuan tidak valid.'
    })
  }

  let detail = await getPengajuanDetailFromCache(idPengajuan)

  if (!detail) {
    await syncAdminCache({ token: session.token, mode: 'detail', idPengajuan })
    detail = await getPengajuanDetailFromCache(idPengajuan)
  } else {
    triggerAdminCacheSync({ token: session.token, mode: 'detail', idPengajuan })
  }

  if (!detail) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Pengajuan tidak ditemukan.'
    })
  }

  return detail
})
