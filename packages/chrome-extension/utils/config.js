const nodeEnv = process.env.NODE_ENV || 'development'
const sharedConfig = require('multi-store-player-shared-config')(nodeEnv).config

module.exports = {
  PLAYER_API_URL: JSON.stringify(sharedConfig.API_URL),
  PLAYER_UI_URL: JSON.stringify(sharedConfig.FRONTEND_URL),
  PORT: process.env.PORT,
  NODE_ENV: nodeEnv,
  EXTENSION_KEY: process.env.EXTENSION_KEY,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID
}