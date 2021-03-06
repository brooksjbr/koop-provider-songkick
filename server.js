// clean shutdown
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

// Initialize Koop
const Koop = require('koop')
const koop = new Koop()

// Install the Craigslist Provider
const provider = require('./')
koop.register(provider)

// Start listening for http traffic
const config = require('config')
const port = config.port || 8080
koop.server.listen(port)
const message = `

Koop Songkick Provider listening on ${port}
For more docs visit: https://koopjs.github.io/docs/specs/provider/
To find providers visit: https://www.npmjs.com/search?q=koop+provider

Try it out in your browswer: http://localhost:${port}/songkick/:metro_id/FeatureServer/0/query
Or on the command line: curl --silent http://localhost:${port}/songkick/:metro_id/FeatureServer/0/query?returnCountOnly=true

Press control + c to exit
`
console.log(message)
