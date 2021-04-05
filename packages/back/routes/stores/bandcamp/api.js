const router = require('express').Router()
const bodyParser = require('body-parser')
const { initWithSessionAsync } = require('./bandcamp-api.js')
const R = require('ramda')
const { log, error } = require('./logger')

const {
  getPreviewUrl,
} = require('./logic.js')

router.get('/tracks/:id/preview.:format', ({ user: { username }, params: { id, format } }, res, next) =>
  getPreviewUrl(id, format)
    .then(url => res.send(url))
    .catch(next)
)

module.exports = router
