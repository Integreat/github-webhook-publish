const https = require('follow-redirects').https
const http = require('http')
const tar = require('tar')
const createHandler = require('github-webhook-handler')
const program = require('commander');
const rimraf = require('rimraf')

program
  .option('-p, --port [port]', 'Port for the webhook', (value) => value, 7777)
  .option('-P, --path [path]', 'Path of the webhook', (value) => value, '/webhook')
  .option('-s, --secret [secret]', 'Secret of the webhook', (value) => value, '')
  .option('-a, --asset [name]', 'Name of the asset from github releases', (value) => value, 'www.tar')
  .option('-d, --dest [path]', 'Destination for new artifacts', (value) => value, 'www/')
  .parse(process.argv);

const handleError = error => {
  console.error(error.message)
}

const handleRelease = event => {
  const release = event.payload.release
  console.log(`Received a release (${release.name}) event for ref ${release.target_commitish}`)

  const asset = release.assets.find((asset) => asset.name === 'www.tar')
  const artifact_url = asset.browser_download_url

  console.log('Cleaning old destination...')

  rimraf.sync(program.dest + '/' + '*')

  console.log('Downloading artifact...')
  https.get(artifact_url, response => {
    response.pipe(tar.Extract({path: program.dest}))
      .on('error', handleError)
      .on('end', () => { console.log('Artifact downloaded.')})
  }).on('error', handleError)
}

console.log('Webhook server started.')

const handler = createHandler( {path: program.path, secret: program.secret})
handler.on('release', handleRelease)

const server = http.createServer((req, res) => {
  handler(req, res, () => {
    res.statusCode = 404
    res.end('Route not found!')
  })
})
server.listen(program.port)