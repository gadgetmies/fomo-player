import config from './config.js'

const requestJSONwithCredentials = (...args) =>
  requestWithCredentials(...args).then(async res => {
    return await res.json()
  })

const requestWithCredentials = async ({ url, path, method = 'GET', body, headers }) => {
  const res = await fetch(url ? url : `${config.apiURL}${path}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...headers
    }
  })

  if (res.ok) {
    return res
  } else {
    console.error('Request failed', res)
    throw new Error('Request failed')
  }
}

export { requestJSONwithCredentials, requestWithCredentials }
