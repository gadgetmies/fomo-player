const pg = require('../db/pg.js')
const sql = require('sql-template-strings')
const R = require('ramda')
const { updateNotificationTracks, getTracksWithIds } = require('../routes/users/db')
const { searchForTracks } = require('../routes/shared/db/search')
const { using } = require('bluebird')
const { scheduleEmail } = require('../services/mailer')

const logger = require('../logger')(__filename)

module.exports.updateNotifications = async () => {
  const notificationSearches = await getNotificationDetails()
  const errors = []

  for (const { notificationId, text, email, trackIds: previousTrackIds } of notificationSearches) {
    try {
      const searchResults = await searchForTracks(text, { limit: 50, sort: '-added' })
      const currentTrackIds = searchResults.map(R.prop('track_id')).map(String)
      const newTracks = R.without(previousTrackIds, currentTrackIds)
      const uriEncoded = encodeURI(text)

      logger.debug(
        `Found tracks: ${JSON.stringify({ prev: previousTrackIds, current: currentTrackIds, new: newTracks }, null, 2)}`
      )

      await using(pg.getTransaction(), async tx => {
        if (newTracks.length !== 0) {
          logger.debug(
            `Found new tracks: ${JSON.stringify(
              { prev: previousTrackIds, current: currentTrackIds, new: newTracks },
              null,
              2
            )}`
          )
          logger.info(`Scheduling notification update email for notification id: ${notificationId}`)
          await updateNotificationTracks(tx, notificationId, currentTrackIds)
          const trackDetails = await getTracksWithIds(newTracks)
          const root = `https://fomoplayer.com`
          const notificationsUrl = `${root}/settings?page=notifications`
          const newTracksDetails = trackDetails.map(
            ({ artists, title, version }) =>
              `${artists.map(({ name }) => name).join(', ')} - ${title}${version ? ` (${version})` : ''}`
          )
          const searchUrl = `${root}/search/?q=${uriEncoded}`
          await scheduleEmail(
            process.env.NOTIFICATION_EMAIL_SENDER,
            email,
            `New results for your search '${text}'!`,
            `Check out the results at ${searchUrl}
            
            New tracks:
            ${newTracksDetails.join('\n')}
            
            Unsubscribe / adjust notification settings at: ${notificationsUrl}
`,
            `<h1>New results for your search '${text}'!</h1>
<a href="${searchUrl}">
  Check out the results at ${searchUrl}
</a><br/><br/>
New tracks:<br/>
${newTracksDetails.join('<br/>')}
<br/>
<br/>
<a href="${notificationsUrl}">Unsubscribe / adjust notification settings</a> 
`
          )
        }

        await tx.queryAsync(
          // language=PostgreSQL
          sql`--update notification update time
UPDATE user_search_notification
SET user_search_notification_last_update = NOW()
WHERE user_search_notification_id = ${notificationId}
          `
        )
      })
    } catch (e) {
      errors.push(e.toString())
    }
  }

  if (errors.length === 0) {
    return { success: true }
  } else {
    return { success: false, result: errors }
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
       user_search_notification_tracks       AS "trackIds"
FROM user_search_notification
         NATURAL JOIN meta_account_email
WHERE (
    user_search_notification_last_update IS NULL
    OR user_search_notification_last_update + INTERVAL '6 hours' < NOW()
  )
  AND meta_account_email_verified
ORDER BY user_search_notification_last_update DESC NULLS FIRST
LIMIT 20
`
  )
