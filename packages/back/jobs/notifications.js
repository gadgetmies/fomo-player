const pg = require('../db/pg.js')
const sql = require('sql-template-strings')
const R = require('ramda')
const { updateNotificationTracks } = require('../routes/users/db')
const { searchForTracks } = require('../routes/shared/db/search')
const { using } = require('bluebird')
const { scheduleEmail } = require('../services/mailer')

module.exports.updateNotifications = async () => {
  const notificationSearches = getNotificationDetails()

  for (const { notificationId, text, userId, email, trackIds } of notificationSearches) {
    const searchResults = searchForTracks(text, userId)
    const currentTrackIds = searchResults.map(R.prop('track_id'))
    const intersection = R.intersection(trackIds, currentTrackIds)

    using(pg.getTransaction(), async tx => {
      if (intersection.length !== 0) {
        await updateNotificationTracks(tx, notificationId, trackIds)
        await scheduleEmail(
          process.env.NOTIFICATION_EMAIL_SENDER,
          email,
          `New results for your search '${text}'!`,
          `New results for your search '${text}'!

Check out the new tracks at https://fomoplayer.com/          
`,
          `<h1>New results for your search '${text}'!</h1>
<a href="https://fomoplayer.com/">Check out the new tracks!</a>`
        )
      }

      await tx.queryAsync(
        // language=PostgreSQL
        sql`--update notification update time
UPDATE user_search_notification
SET user_search_notification_last_update = NOW()
`
      )
    })
  }
}

const getNotificationDetails = async () =>
  pg.queryRowsAsync(
    // language=PostgreSQL
    sql`-- getNotificationDetails
SELECT meta_account_user_id                  AS "userId",
       user_search_notification_id           AS "notificationId",
       user_search_notification_string       AS text,
       meta_account_email_address            AS email,
       ARRAY_AGG(track_id ORDER BY track_id) AS "trackIds"
FROM user_search_notification
         NATURAL JOIN user_search_notification__track
         NATURAL JOIN meta_account_email
WHERE user_search_notification_last_update IS NULL
   OR user_search_notification_last_update + INTERVAL '6 hours' < NOW()
ORDER BY user_search_notification_last_update DESC NULLS FIRST
LIMIT 20
`
  )
