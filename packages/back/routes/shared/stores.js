const { BadRequest } = require('./httpErrors')
const { queryStoreRegexes } = require('./db/store')
const { modules: storeModules } = require('../stores/index.js')

module.exports.getStoreModuleForArtistByUrl = async artistUrl => {
  const storesRegexes = await queryStoreRegexes()

  const matchingStore = storesRegexes.find(({ regex: { artist: artistRegex } }) => {
    const urlMatch = artistUrl.match(artistRegex)
    return urlMatch !== null
  })

  if (matchingStore === undefined) {
    throw new BadRequest(`Invalid artist URL ${artistUrl}`)
  }

  const module = storeModules[matchingStore.name]
  const [{ id }] = await module.logic.getFollowDetails(artistUrl)
  return { module, id }
}

module.exports.getStoreModuleForLabelByUrl = async labelUrl => {
  const storesRegexes = await queryStoreRegexes()

  const matchingStore = storesRegexes.find(({ regex: { label: labelRegex } }) => {
    const urlMatch = labelUrl.match(labelRegex)
    return urlMatch !== null
  })

  if (matchingStore === undefined) {
    throw new BadRequest(`Invalid label URL ${labelUrl}`)
  }

  const module = storeModules[matchingStore.name]
  const [{ id }] = await module.logic.getFollowDetails(labelUrl)
  return { module, id }
}

module.exports.getStoreModuleForPlaylistByUrl = async playlistUrl => {
  const storeRegexes = await queryStoreRegexes()
  let matchingStore = undefined
  let matchingRegex = undefined

  for (const store of storeRegexes) {
    matchingRegex = store.regex.playlist.find(({ regex }) => {
      return playlistUrl.match(regex) !== null
    })

    if (matchingRegex !== undefined) {
      matchingStore = store
      break
    }
  }

  if (matchingStore === undefined) {
    throw new BadRequest(`Invalid playlist URL ${playlistUrl}`)
  }

  return { module: storeModules[matchingStore.name], typeId: matchingRegex.typeId }
}
