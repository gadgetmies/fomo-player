import Preview from './Preview.js'
import Tracks from './Tracks.js'
import { requestWithCredentials } from './request-json-with-credentials.js'
import React, { Component } from 'react'
import * as R from 'ramda'
import MediaSession from '@mebtte/react-media-session'
import { artistNamesToString } from './TrackTitle'
import FollowPopup from './FollowPopup'
import IgnorePopup from './IgnorePopup'

class Player extends Component {
  constructor(props) {
    super(props)

    this.state = {
      currentTrack: null,
      heardTracks: [],
      listenedTracks: 0,
      listState: 'new',
      searchResults: [],
      togglingCurrentInCart: false
    }

    this.preview = React.createRef()

    // if (this.props.tracks.length !== 0) {
    //   const storedTrack = JSON.parse(localStorage.getItem('currentTrack') || '{}')
    //   const currentTrack = storedTrack.track_id && this.props.tracks.find(R.propEq('track_id', storedTrack.track_id)) ||
    //     this.props.tracks[0]
    //   this.setCurrentTrack(currentTrack)
    // }
  }

  componentDidMount() {
    const that = this
    document.addEventListener('keydown', event => {
      console.log(event.target instanceof HTMLInputElement)
      if (event instanceof KeyboardEvent) {
        if (
          event.target.form ||
          event.altKey ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.target instanceof HTMLInputElement
        ) {
          event.stopPropagation()
          return
        }

        switch (event.key) {
          case 'e':
            this.playNextTrack()
            break
          case 'q':
            this.playPreviousTrack()
            break
          case 'w':
            that.preview.current.togglePlaying()
            break
          case 'r':
            this.playNextUnheard()
            break
          case 'd':
            this.seek(this.getSeekDistance())
            break
          case 'a':
            this.seek(-this.getSeekDistance())
            break
          case 'p':
            this.toggleCurrentInCart()
            break
          default:
        }
      }
    })
  }

  async setCurrentTrack(track) {
    localStorage.setItem('currentTrack', JSON.stringify(track))
    this.setState({ currentTrack: track })
    await requestWithCredentials({
      path: `/me/tracks/${track.id}`,
      method: 'POST',
      body: { heard: true }
    })
    this.markAsPlayed(track.id)
  }

  markAsPlayed(trackId) {
    if (this.state.listState !== 'new') {
      return
    }

    let updatedHeardTracks = this.state.heardTracks
    const updatedTrack = R.assoc('heard', true, this.props.tracks.new.find(R.propEq('id', trackId)))
    const playedTrackIndex = this.state.heardTracks.findIndex(R.propEq('id', trackId))
    if (playedTrackIndex !== -1) {
      updatedHeardTracks.splice(playedTrackIndex, 1)
    } else {
      this.setState({ listenedTracks: this.state.listenedTracks + 1 })
    }

    updatedHeardTracks = R.prepend(updatedTrack, updatedHeardTracks)
    this.setState({ heardTracks: updatedHeardTracks })
  }

  getCurrentTrackIndex() {
    return this.getTrackIndex(this.state.currentTrack)
  }

  getTrackIndex(track) {
    return R.findIndex(R.propEq('id', track.id), this.getTracks())
  }

  jumpTracks(numberOfTracksToJump) {
    const currentTrackIndex = this.getCurrentTrackIndex()
    const indexToJumpTo = R.clamp(0, this.getTracks().length - 1, currentTrackIndex + numberOfTracksToJump)
    this.setCurrentTrack(this.getTracks()[indexToJumpTo])
  }

  playPreviousTrack() {
    this.jumpTracks(-1)
  }

  playNextTrack() {
    this.jumpTracks(1)
  }

  seek(offset) {
    this.preview.current.scan(offset)
  }

  getSeekDistance() {
    const preview = this.state.currentTrack.previews.find(R.propEq('url', this.preview.current.state.previewUrl))

    return ((preview ? preview.length_ms : this.state.currentTrack.duration) / 5 / 1000) | 7
  }

  handleNextClick() {
    if (this.state.nextDoubleClickStarted) {
      this.setState({ nextDoubleClickStarted: false })
      this.playNextTrack()
    } else {
      this.setState()
      const that = this
      this.setState({ nextDoubleClickStarted: true })
      setTimeout(() => {
        that.setState({ nextDoubleClickStarted: false })
      }, 200)
      this.seek(this.getSeekDistance())
    }
  }

  handlePreviousClick() {
    if (this.state.previousDoubleClickStarted) {
      this.setState({ previousDoubleClickStarted: false })
      this.playPreviousTrack()
    } else {
      this.setState()
      const that = this
      this.setState({ previousDoubleClickStarted: true })
      setTimeout(() => {
        that.setState({ previousDoubleClickStarted: false })
      }, 200)
      this.seek(-this.getSeekDistance())
    }
  }

  playNextUnheard() {
    const firstUnplayed = this.getTracks().findIndex(R.propSatisfies(R.isNil, 'heard'))
    this.jumpTracks(firstUnplayed - this.getCurrentTrackIndex())
  }

  setPlaying(playing) {
    this.preview.current.setPlaying(playing)
  }

  async followArtist(artistId, follow) {
    await requestWithCredentials({
      path: `/me/follows/artists/${follow ? '' : artistId}`,
      method: follow ? 'POST' : 'DELETE',
      body: follow ? [artistId] : undefined,
      headers: {
        'content-type': 'application/vnd.multi-store-player.artist-ids+json;ver=1'
      }
    })
  }

  async followLabel(labelId, follow) {
    await requestWithCredentials({
      path: `/me/follows/labels/${follow ? '' : labelId}`,
      method: follow ? 'POST' : 'DELETE',
      body: follow ? [labelId] : undefined,
      headers: {
        'content-type': 'application/vnd.multi-store-player.label-ids+json;ver=1'
      }
    })
  }

  // TODO: change to POST {ignore: true} /me/labels/?
  async ignoreArtistsByLabels(artistId, labelIds, ignore) {
    await requestWithCredentials({
      path: `/me/ignores/artists-on-labels`,
      method: ignore ? 'POST' : 'DELETE',
      body: { artistIds: [artistId], labelIds }
    })
  }

  async ignoreArtist(artistId) {
    await requestWithCredentials({
      path: `/me/ignores/artists`,
      method: 'POST',
      body: [artistId]
    })
  }

  async ignoreLabel(labelId) {
    await requestWithCredentials({
      path: `/me/ignores/labels`,
      method: 'POST',
      body: [labelId]
    })
  }

  async ignoreRelease(releaseId) {
    await requestWithCredentials({
      path: `/me/ignores/releases`,
      method: 'POST',
      body: [releaseId]
    })
  }

  setListState(listState) {
    this.setState({ listState })
  }

  setSearchResults(searchResults) {
    this.setState({ searchResults })
  }

  mergeWithHeard(tracks) {
    this.state.heardTracks.forEach(heardTrack => {
      const index = tracks.findIndex(R.propEq('id', parseInt(heardTrack.id, 10)))
      if (index !== -1) {
        tracks[index] = heardTrack
      }
    })
  }

  getTracks() {
    const heardTracks = this.state.heardTracks
    let tracks

    if (this.state.listState === 'new') {
      tracks = this.props.tracks.new.slice()
      this.mergeWithHeard(tracks)
    } else if (this.state.listState === 'heard') {
      tracks = this.props.tracks.heard.slice()
      heardTracks.forEach(heardTrack => {
        const index = tracks.findIndex(R.propEq('id', parseInt(heardTrack.id, 10)))
        if (index !== -1) {
          tracks.splice(index, 1)
        }
      })
      tracks = this.state.heardTracks.concat(tracks)
    } else if (this.state.listState === 'recentlyAdded') {
      tracks = this.props.tracks.recentlyAdded.slice()
      this.mergeWithHeard(tracks)
    } else if (this.state.listState === 'cart') {
      tracks = this.props.carts.find(R.prop('is_default')).tracks
    } else if (this.state.listState === 'search') {
      tracks = this.state.searchResults
    }

    return tracks
  }

  setFollowPopupOpen(open) {
    this.setState({ followPopupOpen: open })
  }

  openFollowPopup(track) {
    this.setState({ followPopupTrack: track })
    this.setFollowPopupOpen(true)
  }

  setIgnorePopupOpen(open) {
    this.setState({ ignorePopupOpen: open })
  }

  openIgnorePopup(track) {
    this.setState({ ignorePopupTrack: track })
    this.setIgnorePopupOpen(true)
  }

  closePopups() {
    this.setFollowPopupOpen(false)
    this.setIgnorePopupOpen(false)
  }

  async refreshListAndClosePopups() {
    await this.props.onUpdateTracksClicked()
    this.closePopups()
  }

  getCurrentTrack() {
    return this.state.currentTrack
  }

  async toggleCurrentInCart() {
    this.setState({ togglingCurrentInCart: true })
    await (this.isCurrentInCart() ? this.props.onRemoveFromCart : this.props.onAddToCart)(this.state.currentTrack.id)
    this.setState({ togglingCurrentInCart: false })
  }

  isCurrentInCart() {
    const currentTrack = this.getCurrentTrack()
    return currentTrack && this.props.carts.find(R.prop('is_default'))
      ? this.props.carts.find(R.prop('is_default')).tracks.find(R.propEq('id', currentTrack.id))
      : null
  }

  render() {
    const tracks = this.getTracks()
    const currentTrack = this.getCurrentTrack()
    return (
      <div className="page-container">
        <FollowPopup
          open={this.state.followPopupOpen}
          track={this.state.followPopupTrack}
          follows={this.props.follows}
          onCloseClicked={this.closePopups.bind(this)}
          onFollowArtist={this.followArtist.bind(this)}
          onFollowLabel={this.followLabel.bind(this)}
          onRefreshAndCloseClicked={this.refreshListAndClosePopups.bind(this)}
        />
        <IgnorePopup
          open={this.state.ignorePopupOpen}
          track={this.state.ignorePopupTrack}
          onCloseClicked={this.closePopups.bind(this)}
          onIgnoreArtistOnLabels={this.ignoreArtistsByLabels.bind(this)}
          onIgnoreArtist={this.ignoreArtist.bind(this)}
          onIgnoreLabel={this.ignoreLabel.bind(this)}
          onIgnoreRelease={this.ignoreRelease.bind(this)}
          onRefreshAndCloseClicked={this.refreshListAndClosePopups.bind(this)}
        />
        <MediaSession
          title={currentTrack ? currentTrack.title : ''}
          artist={currentTrack ? artistNamesToString(currentTrack.artists) : ''}
          onPlay={() => this.setPlaying(true)}
          onPause={() => this.setPlaying(false)}
          onSeekBackward={() => console.log('seek backward')}
          onSeekForward={() => console.log('seek forward')}
          onPreviousTrack={() => this.handlePreviousClick()}
          onNextTrack={() => this.handleNextClick()}
        />
        <Preview
          key={'preview'}
          togglingCurrentInCart={this.state.togglingCurrentInCart}
          showHint={tracks.length === 0}
          currentTrack={currentTrack}
          onPrevious={() => this.playPreviousTrack()}
          onNext={() => this.playNextTrack()}
          newTracks={this.props.newTracks - this.state.listenedTracks}
          totalTracks={this.props.totalTracks}
          onMarkAllHeardClicked={this.props.onMarkAllHeardClicked}
          onToggleCurrentInCart={this.toggleCurrentInCart.bind(this)}
          inCart={this.isCurrentInCart()}
          ref={this.preview}
        />
        <Tracks
          key={'tracks'}
          carts={this.props.carts}
          tracks={tracks}
          listState={this.state.listState}
          currentTrack={(currentTrack || {}).id}
          onUpdateTracksClicked={this.props.onUpdateTracksClicked}
          onAddToCart={this.props.onAddToCart}
          onRemoveFromCart={this.props.onRemoveFromCart}
          onIgnoreArtistsByLabels={this.ignoreArtistsByLabels}
          onPreviewRequested={id => {
            const requestedTrack = R.find(R.propEq('id', id), this.getTracks())
            this.setCurrentTrack(requestedTrack)
            this.setPlaying(true)
          }}
          onFollowClicked={this.openFollowPopup.bind(this)}
          onIgnoreClicked={this.openIgnorePopup.bind(this)}
          onShowNewClicked={this.setListState.bind(this, 'new')}
          onShowHeardClicked={this.setListState.bind(this, 'heard')}
          onShowRecentlyAddedClicked={this.setListState.bind(this, 'recentlyAdded')}
          onShowCartClicked={this.setListState.bind(this, 'cart')}
          onShowSearchClicked={this.setListState.bind(this, 'search')}
          onSearchResults={this.setSearchResults.bind(this)}
        />
      </div>
    )
  }
}

export default Player
