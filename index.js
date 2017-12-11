const https = require('follow-redirects').https
const fs = require('fs')
const http = require('http')
const tar = require('tar')
const createHandler = require('github-webhook-handler')

const extract = (sourceFile, destination, callback) => {
  fs.createReadStream(sourceFile)
    .pipe(tar.Extract({path: destination}))
    .on('error', error => { callback(error)})
    .on('end', () => { callback()})
}

const handleError = error => {
  console.log(error.message)
}

const config = {path: '/webhook', secret: '123'}
const tmpFile = '/tmp/webapp-www.tar'
const www = '/tmp/www'

const handleRelease = event => {
  const release = event.payload.release
  console.log(`Received a release (${release.name}) event for ${release.target_commitish}`)

  const asset = release.assets.find((asset) => asset.name === 'www.tar')
  const artifact_url = asset.browser_download_url

  console.log('Downloading artifact...')
  const file = fs.createWriteStream(tmpFile)

  https.get(artifact_url, response => {
    response.pipe(file)

    file.on('finish', function () {
      file.close(() => {
        console.log('Artifact downloaded. Extracting...')
        extract(tmpFile, www, (error) => {
          handleError(error)
          console.log('Artifact extracted.')
        })
      })
    })
  }).on('error', handleError)
}

console.log('Webhook server started.')
console.log(`Config is '${JSON.stringify(config)}'`)

const handler = createHandler(config)
handler.on('release', handleRelease)

const server = http.createServer((req, res) => {
  handler(req, res, () => {
    res.statusCode = 404
    res.end('Route not found!')
  })
})
server.listen(7777)