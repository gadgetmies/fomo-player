import React, { Component } from 'react'
import * as R from 'ramda'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import Login from './UserLogin.js'
import Menu from './Menu.js'
import Player from './Player.js'
import './App.css'
import SlideoutPanel from './SlideoutPanel.js'
import Settings from './Settings.js'

import { requestJSONwithCredentials, requestWithCredentials } from './request-json-with-credentials.js'
import config from './config.js'

import 'typeface-lato'
import FontAwesome from 'react-fontawesome'

// import injectTapEventPlugin from 'react-tap-event-plugin';
// injectTapEventPlugin();

const defaultTracksData = { tracks: { new: [], heard: [] }, meta: { totalTracks: 0, newTracks: 0 } }

const Root = props => <div className="root" style={{ height: '100%', overflow: 'hidden' }} {...props} />

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      slideout: null,
      carts: {},
      loggedIn: false,
      loading: true,
      tracksData: defaultTracksData
    }
  }

  async componentDidMount() {
    try {
      await this.updateTracks()
      this.setState({ loggedIn: true })
    } catch (e) {
      console.error(e)
      this.setState({ loggedIn: false })
    }

    this.setState({ loading: false })
  }

  setCarts(store, carts) {
    this.setState(
      R.evolve({
        carts: R.assoc(store, carts)
      })
    )
  }

  updateCarts(store) {
    // return requestJSONwithCredentials({ path: `/stores/${store}/carts` })
    //   .then(getJsonFromResults)
    //   .then(carts => this.setCarts(store, carts))
  }

  async onLoginDone() {
    this.setState({ loggedIn: true })
    await this.updateTracks()
  }

  onLogoutDone() {
    this.setState({ loggedIn: false, tracksData: defaultTracksData })
  }

  async updateTracks() {
    const {
      meta: { new: newTracks, total: totalTracks },
      tracks
    } = await requestJSONwithCredentials({
      path: `/me/tracks`
    })

    this.setState({ tracksData: { tracks, meta: { newTracks, totalTracks } } })
  }

  async markAllHeard() {
    await requestWithCredentials({
      path: `/me/tracks`,
      method: 'PATCH',
      body: { heard: true }
    })
    this.updateTracks()
  }

  async onStoreLoginDone(store) {
    this.updateCarts(store)
  }

  async updateLogins() {}

  render() {
    console.log(this.state)
    return (
      <Root>
        <Router>
          {this.state.loading ? (
            'Loading...'
          ) : this.state.loggedIn ? (
            <>
              <Menu
                ref="menu"
                logoutPath={`/auth/logout`}
                loggedIn={this.state.loggedIn}
                onNavButtonClicked={() => {
                  this.refs['slideout'].toggle()
                }}
                onLogoutDone={this.onLogoutDone.bind(this)}
                onStoreLoginDone={() => {}} //this.onStoreLoginDone.bind(this)}
                onUpdateTracks={this.updateTracks.bind(this)}
              />
              <SlideoutPanel ref="slideout" onOpen={this.updateLogins.bind(this)}>
                <button
                  style={{ position: 'absolute', left: 0, margin: 10, color: 'white' }}
                  onClick={() => {
                    this.refs['slideout'].toggle()
                  }}
                >
                  <FontAwesome name="bars" />
                </button>
                <Route path="/settings" render={() => <Settings />} />
                <Route
                  path="/"
                  render={() => (
                    <Player
                      onMarkAllHeardClicked={this.markAllHeard.bind(this)}
                      onUpdateTracksClicked={this.updateTracks.bind(this)}
                      carts={this.state.carts}
                      tracks={this.state.tracksData.tracks}
                      newTracks={this.state.tracksData.meta.newTracks}
                      totalTracks={this.state.tracksData.meta.totalTracks}
                      onAddToCart={store => this.updateCarts(store)}
                      onRemoveFromCart={store => this.updateCarts(store)}
                    />
                  )}
                />
              </SlideoutPanel>
            </>
          ) : (
            <div className="align-center-container" style={{ height: '100%' }}>
              <div
                style={{
                  width: '50%',
                  borderRadius: 10,
                  padding: 20,
                  backgroundColor: '#ccc',
                  boxShadow: 'rgba(0, 0, 0, 0.27) 2px 2px 40px 0px',
                  color: 'black'
                }}
              >
                <h1 style={{ marginTop: 0, textAlign: 'center' }}>Login</h1>
                <Login
                  onLoginDone={this.onLoginDone.bind(this)}
                  onLogoutDone={this.onLogoutDone.bind(this)}
                  googleLoginPath={`${config.apiURL}/auth/login/google`}
                  loginPath={'/auth/login'}
                  logoutPath={'/auth/logout'}
                />
              </div>
            </div>
          )}
        </Router>
      </Root>
    )
  }
}

export default App
