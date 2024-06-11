const { queryFollowRegexes } = require('../shared/db/store')

const getStoreDetailsFromUrls = (module.exports.getStoreDetailsFromUrls = async (urlStrings, storeName = undefined) => {
  const regexes = await queryFollowRegexes(storeName)
  return urlStrings.map((url) => {
    for (const { storeName, regex, type } of regexes) {
      const match = url.match(new RegExp(regex))
      if (match) {
        const id = match[match.length - 1] // TODO: dangerous assumption that the id will be the last match
        return { storeName, id, type, url }
      }
    }
    throw new Error(`URL ${url} did not match any regex`)
  })
})

module.exports.getStoreDetailsFromUrl = async (url, storeName = undefined) =>
  (await getStoreDetailsFromUrls([url], storeName))[0]
