const { apiURL } = require('../config.js')
const { queryLongestPreviewForTrack, searchForArtistsAndLabels } = require('./db.js')
const { searchForTracks } = require('./shared/db/search.js')
const { queryPreviewDetails } = require('./shared/db/preview')
const { queryCartDetails, queryCartOwner } = require('./shared/db/cart')
const { queryCartDetailsByUuid, verifyEmail } = require('./db')
const { getStoreDetailsFromUrl } = require('./stores/logic')
const { modules: storeModules } = require('./stores/store-modules')
const { queryEntityDetails } = require('./shared/db/entities')
const logger = require('fomoplayer_shared').logger(__filename)

module.exports.getStorePreviewRedirectForTrack = async (id, format, skip) => {
  const { storeCode, storeTrackId } = await queryLongestPreviewForTrack(id, format, skip)
  return `${apiURL}/stores/${storeCode}/tracks/${storeTrackId}/preview.${format}`
}

module.exports.searchForTracks = searchForTracks
module.exports.getFollowDetails = async (query) => {
  let details
  if (query.match('^https://') !== null) {
    let detailsFromURL
    try {
      detailsFromURL = await getStoreDetailsFromUrl(query)
    } catch (e) {
      return []
    }
    details = await storeModules[detailsFromURL.storeName].logic.getFollowDetails(detailsFromURL)
  } else {
    details = await searchForArtistsAndLabels(query)
  }
  if (details.length > 0) {
    return details
  }

  return []
}

module.exports.getPreview = async (id, format, offset) => {
  const { url, previewId } = await queryLongestPreviewForTrack(id, format, offset)
  if (url !== null) {
    return url
  } else {
    return (await queryPreviewDetails(previewId))[0].url
  }
}

module.exports.getCartDetails = async (uuid, userId, tracksFilter) => {
  logger.info(`Getting cart details for user: ${userId}, uuid: ${uuid}`)
  const { isPublic, id } = await queryCartDetailsByUuid(uuid)
  logger.info(`Cart is public: ${isPublic}, id: ${id}`)
  const [{ ownerUserId }] = await queryCartOwner(id)
  logger.info(`Cart owner: ${ownerUserId}`)
  if (!isPublic && ownerUserId !== userId) {
    return null
  }
  return await queryCartDetails(id, tracksFilter)
}

module.exports.getEntityDetails = queryEntityDetails

module.exports.verifyEmail = verifyEmail
