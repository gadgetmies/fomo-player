const { apiURL } = require('../config.js')
const { queryLongestPreviewForTrack, searchForArtistsAndLabels } = require('./db.js')
const { searchForTracks } = require('./shared/db/search.js')
const { queryPreviewDetails } = require('./shared/db/preview')
const { modules: storeModules } = require('./stores/index.js')
const { queryCartDetails } = require('./users/db')
const { queryCartDetailsByUuid, verifyEmail } = require('./db')

module.exports.getStorePreviewRedirectForTrack = async (id, format, skip) => {
  const { storeCode, storeTrackId } = await queryLongestPreviewForTrack(id, format, skip)
  return `${apiURL}/stores/${storeCode}/tracks/${storeTrackId}/preview.${format}`
}

module.exports.searchForTracks = searchForTracks
module.exports.getFollowDetails = async query => {
  for (const storeModule of Object.values(storeModules)) {
    let details

    try {
      new URL(query)
      details = await storeModule.logic.getFollowDetails(query)
    } catch (e) {
      details = await searchForArtistsAndLabels(query)
    }

    if (details.length > 0) {
      return details
    }
  }

  return []
}

module.exports.getPreview = async (id, format, offset) => {
  const { url, previewId } = await queryLongestPreviewForTrack(id, format, offset)
  if (url !== null) {
    return url
  } else {
    return (await queryPreviewDetails(previewId)).url
  }
}

module.exports.getCartDetails = async uuid => {
  const { isPublic, id } = await queryCartDetailsByUuid(uuid)
  if (!isPublic) {
    return null
  }
  return await queryCartDetails(id, null)
}

module.exports.verifyEmail = verifyEmail
