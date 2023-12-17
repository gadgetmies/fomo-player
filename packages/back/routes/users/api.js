const logger = require('fomoplayer_shared').logger(__filename)
const { insertSource } = require('../../jobs/watches/shared/db')
const {
  addArtistsOnLabelsToIgnore,
  addArtistsToIgnore,
  addLabelsToIgnore,
  addReleasesToIgnore,
  addArtistFollowsWithIds,
  addLabelFollowsWithIds,
  getTracksM3u,
  getUserArtistFollows,
  getUserLabelFollows,
  getUserPlaylistFollows,
  getUserArtistIgnores,
  getUserArtistOnLabelIgnores,
  getUserLabelIgnores,
  removeArtistOnLabelIgnoreFromUser,
  removeLabelIgnoreFromUser,
  removeArtistIgnoreFromUser,
  getUserTracks,
  removeArtistWatchFromUser,
  removeLabelWatchFromUser,
  removePlaylistFollowFromUser,
  setAllHeard,
  setTrackHeard,
  addArtistFollows,
  addLabelFollows,
  addPlaylistFollows,
  getUserScoreWeights,
  setUserScoreWeights,
  updateNotifications,
  getNotifications,
  getUserSettings,
  setEmail,
  setFollowStarred,
  getAuthorizations,
  removeAuthorization,
  addStoreTracksToUsers
} = require('./logic')

const {
  createCart,
  getUserCarts,
  getUserCartsWithTracks,
  removeCart,
  updateCartDetails,
  getCartDetails,
  updateCartContents,
  updateAllCartContents
} = require('../shared/cart.js')

const typeIs = require('type-is')

const { storeName: spotifyStoreName } = require('../shared/spotify')
const { enableCartSync, removeCartSync, importPlaylistAsCart } = require('../shared/cart')
const { apiURL } = require('../../config')

const router = require('express-promise-router')()

router.get(
  '/tracks',
  async (
    {
      user: { id: authUserId },
      query: { limit_new: limitNew = 100, limit_recent: limitRecent = 100, limit_heard: limitHeard = 50 }
    },
    res
  ) => {
    const userTracks = await getUserTracks(authUserId, { new: limitNew, recent: limitRecent, heard: limitHeard })
    res.json(userTracks)
  }
)

router.get('/tracks/playlist.pls', ({ user: { id: authUserId } }, res) =>
  getTracksM3u(userId).tap(m3u => res.send(m3u))
)

router.post('/tracks/:id', ({ user: { id: userId }, params: { id }, body: { heard } }, res) => {
  setTrackHeard(id, userId, heard).tap(() => res.send())
})

router.patch('/tracks/', async ({ user: { id: authUserId }, body: { heard }, query: { interval } }, res) => {
  await setAllHeard(authUserId, heard, interval)
  res.send()
})

// TODO: add genre to database?
// router.post('/ignores/genres', ({ user: { id: userId }, body: { artistId, storeId, genre } }, res) => {})

router.get('/ignores/artists-on-labels', async ({ user: { id: authUserId } }, res) => {
  const artistOnLabelIgnores = await getUserArtistOnLabelIgnores(authUserId)
  res.send(artistOnLabelIgnores)
})

router.post('/ignores/artists-on-labels', async ({ user: { id: authUserId }, body }, res) => {
  await addArtistsOnLabelsToIgnore(authUserId, body)
  res.status(204).send()
})

router.patch('/ignores/artists-on-labels', async ({ user: { id: authUserId }, body }, res) => {
  await removeArtistOnLabelIgnoreFromUser(authUserId, body)
  res.status(204).send()
})

router.get('/ignores/labels', async ({ user: { id: authUserId } }, res) => {
  const labelIgnores = await getUserLabelIgnores(authUserId)
  res.send(labelIgnores)
})

router.post('/ignores/labels', async ({ user: { id: authUserId }, body }, res) => {
  await addLabelsToIgnore(authUserId, body)
  res.status(204).send()
})

router.delete('/ignores/labels/:id', async ({ user: { id: authUserId }, params: { id } }, res) => {
  await removeLabelIgnoreFromUser(authUserId, id)
  res.status(204).send()
})

router.get('/ignores/artists', async ({ user: { id: authUserId } }, res) => {
  const artistIgnores = await getUserArtistIgnores(authUserId)
  res.send(artistIgnores)
})

router.post('/ignores/artists', async ({ user: { id: authUserId }, body }, res) => {
  await addArtistsToIgnore(authUserId, body)
  res.status(204).send()
})

router.delete('/ignores/artists/:id', async ({ user: { id: authUserId }, params: { id } }, res) => {
  await removeArtistIgnoreFromUser(authUserId, id)
  res.status(204).send()
})

router.post('/ignores/releases', async ({ user: { id: authUserId }, body }, res) => {
  await addReleasesToIgnore(authUserId, body)
  res.status(204).send()
})

const tracksHandler = type => async (
  { body: tracks, headers: { 'x-multi-store-player-store': storeUrl }, user: { id: userId } },
  res
) => {
  const addedTracks = addStoreTracksToUsers(storeUrl, tracks, [userId], null, true, type)
  res.status(201).send(addedTracks)
}

router.post('/tracks', tracksHandler('new'))
router.post('/purchased', tracksHandler('purchased'))

router.post('/follows/artists', async (req, res) => {
  const {
    user: { id: userId },
    body,
    headers: { 'x-multi-store-player-store': storeUrl }
  } = req
  let addedArtists

  if (typeIs(req, 'application/vnd.multi-store-player.artist-ids+json')) {
    addedArtists = await addArtistFollowsWithIds(body, userId)
  } else {
    const sourceId = await insertSource({ operation: '/follows/artists', storeUrl })
    addedArtists = await addArtistFollows(storeUrl, body, userId, sourceId)
  }
  res.status(201).send(addedArtists)
})

router.post('/follows/labels', async (req, res) => {
  const {
    user: { id: userId },
    body,
    headers: { 'x-multi-store-player-store': storeUrl }
  } = req
  let addedLabels = []

  if (typeIs(req, 'application/vnd.multi-store-player.label-ids+json')) {
    addedLabels = await addLabelFollowsWithIds(body, userId)
  } else {
    const sourceId = await insertSource({ operation: '/follows/labels', storeUrl })
    addedLabels = await addLabelFollows(storeUrl, body, userId, sourceId)
  }

  res.status(201).send(addedLabels)
})

router.get('/follows/artists', async ({ user: { id: authUserId } }, res) => {
  const artistFollows = await getUserArtistFollows(authUserId)
  res.send(artistFollows)
})

router.delete('/follows/artists/:id', async ({ params: { id }, user: { id: authUserId } }, res) => {
  await removeArtistWatchFromUser(authUserId, id)
  res.status(204).send()
})

router.get('/follows/labels', async ({ user: { id: authUserId } }, res) => {
  const labelFollows = await getUserLabelFollows(authUserId)
  res.send(labelFollows)
})

router.delete('/follows/labels/:id', async ({ params: { id }, user: { id: authUserId } }, res) => {
  await removeLabelWatchFromUser(authUserId, id)
  res.status(204).send()
})

router.get('/follows/playlists', async ({ user: { id: authUserId } }, res) => {
  const playlists = await getUserPlaylistFollows(authUserId)
  res.send(playlists)
})

router.delete('/follows/playlists/:id', async ({ params: { id }, user: { id: authUserId } }, res) => {
  await removePlaylistFollowFromUser(authUserId, id)
  res.status(204).send()
})

router.post('/follows/playlists', async ({ user: { id: userId }, body }, res) => {
  const sourceId = await insertSource({ operation: '/follows/playlists' })
  const addedPlaylists = await addPlaylistFollows(body, userId, sourceId)
  res.send(addedPlaylists)
})

router.put('/follows/:type/:id', async ({ user: { id: userId }, params: { id, type }, body: { starred } }, res) => {
  await setFollowStarred(userId, type, id, starred)
  res.status(204).send()
})

router.get('/carts', async ({ user: { id: userId } }, res) => {
  res.send(await getUserCarts(userId))
})

router.get('/carts?fetch=tracks', async ({ user: { id: userId } }, res) => {
  res.send(await getUserCartsWithTracks(userId))
})

router.post('/carts', async ({ user: { id: userId }, body: { name, url } }, res) => {
  let createdCart
  if (name) {
    createdCart = await createCart(userId, name)
  } else if (url) {
    try {
      createdCart = await importPlaylistAsCart(userId, url)
    } catch (e) {
      logger.error(`Failed to import playlist from url: ${url}`, e)
      return res.status(500).send({ error: `Failed to import playlist from url: ${url}` })
    }
  } else {
    throw new Error('Either name or url must be provided!')
  }
  res.send(createdCart)
})

router.get('/carts/:id', async ({ user: { id: userId }, params: { id: cartId }, res }) => {
  res.send(await getCartDetails(userId, cartId))
})

router.delete('/carts/:id', async ({ user: { id: userId }, params: { id } }, res) => {
  await removeCart(userId, id)
  res.status(204).send()
})

router.post('/carts/:id', async ({ user: { id: userId }, params: { id }, body }, res) => {
  await updateCartDetails(userId, id, body)
  res.status(204).send()
})

router.patch('/carts/:id/tracks', async ({ user: { id: userId }, params: { id: cartId }, body: operations }, res) => {
  await updateCartContents(userId, cartId, operations)
  res.send(await getCartDetails(userId, cartId))
})

router.patch('/carts', async ({ user: { id: userId }, body: operations }, res) => {
  await updateAllCartContents(userId, operations)
  res.status(204).send()
})

router.get('/score-weights', async ({ user: { id: userId } }, res) => {
  res.send(await getUserScoreWeights(userId))
})

router.post('/score-weights', async ({ user: { id: userId }, body: weights }, res) => {
  await setUserScoreWeights(userId, weights)
  res.status(204).send()
})

router.get('/notifications', async ({ user: { id: userId } }, res) => {
  res.send(await getNotifications(userId))
})

router.patch('/notifications', async ({ user: { id: userId }, body: requested }, res) => {
  const notifications = await updateNotifications(userId, requested)
  res.send(notifications)
})

router.get('/settings', async ({ user: { id: userId } }, res) => {
  const settings = await getUserSettings(userId)
  res.send(settings)
})

router.post('/settings', async ({ user: { id: userId }, body: { email } }, res) => {
  if (email !== undefined) {
    await setEmail(userId, email)
  }
  res.status(204).send()
})

router.get('/authorizations', async ({ user: { id: userId } }, res) => {
  res.send(await getAuthorizations(userId))
})

router.delete('/authorizations/spotify', async ({ user: { id: userId } }, res) => {
  await removeAuthorization(userId, spotifyStoreName)
  res.status(204).send()
})

router.post(
  '/carts/:id/sync/spotify',
  async ({ user: { id: userId }, params: { id: cartId }, body: { setSync } }, res) => {
    if (setSync) {
      await enableCartSync(userId, cartId, spotifyStoreName)
    } else {
      await removeCartSync(userId, cartId, spotifyStoreName)
    }
    res.status(204).send()
  }
)

module.exports = router
