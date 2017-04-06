/*
  model.js

  This file is required. It must export a class with at least one public function called `getData`

  Documentation: http://koopjs.github.io/docs/specs/provider/
*/
const request = require('request').defaults({gzip: true, json: true})
const SpotifyWebApi = require('spotify-web-api-node');
const config = require('config')
const Promise = require("bluebird");


function Model (koop) {}

// This is the only public function you need to implement
Model.prototype.getData = function (req, callback) {

  const songkick = require('request-promise');
  const options = {
    uri: config.songkick.api+"metro_areas/1409/calendar.json",
    qs: {
      apikey: config.songkick.key
    },
    headers: {
      'User-Agent': 'Request-Promise'
    },
    json: true
  };

  const events = songkick(options)
    .then(function (data) {
      return data.resultsPage.results.event.filter(validateEvent);
    })
    .catch(function (err) {
      console.log("Something went wrong with Songkick request.")
    });

  translate(events)
    .then(function(geojson) {
      for (var i in geojson) {
        console.log(geojson[i])
      }
    })
    .catch(function (err) {
      console.log("Something went wrong with FeatureCollection request.")
    });
}

function validateEvent(event) {
  return event.venue.lng && event.venue.lat && event.start.datetime && event.performance[0].artist.displayName
}

function translate (events) {
  //console.log("Translate function")
  const spotifyApi = new SpotifyWebApi({
    clientId : config.spotify.clientId,
    clientSecret : config.spotify.clientSecret
  });

  spotifyApi.clientCredentialsGrant()
    .then(function(data) {
      console.log('The access token expires in ' + data.body['expires_in']);
      console.log('The access token is ' + data.body['access_token']);

      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);
    }).catch(function(err) {
      console.log('Unfortunately, something has gone wrong.', err.message);
    });

  return Promise.all(events.map((event) => formatFeature(event,spotifyApi)))
}

function formatFeature (event, client) {
  const artist = event.performance[0].artist.displayName
  const venue = event.venue.displayName
  const ageRestriction = event.ageRestriction
  const headerline = event.performance[0].billing
  const options = { limit : 1, offset : 1 }

  const spotify = client.searchArtists(artist,options)
    .then(function(data) {
      const uri = data.body.artists.items[0].uri
      return `${config.spotify.embed}?uri=${uri}&theme=white`
    })
    .catch(function(err) {
      return "No track available"
    })

  const feature = spotify
    .then(function(link) {
      return {
        type: 'Feature',
        properties: {
          artist: artist,
          venue: venue,
          date: event.start.datetime,
          start: event.start.time,
          spotify: link
        },
        geometry: {
          type: 'Point',
          coordinates: [event.venue.lng, event.venue.lat]
        }
      }
    })

  return feature
}

module.exports = Model

/* Example raw API response
{
  "resultSet": {
  "queryTime": 1488465776220,
  "vehicle": [
    {
      "expires": 1488466246000,
      "signMessage": "Red Line to Beaverton",
      "serviceDate": 1488441600000,
      "loadPercentage": null,
      "latitude": 45.5873117,
      "nextStopSeq": 1,
      "source": "tab",
      "type": "rail",
      "blockID": 9045,
      "signMessageLong": "MAX  Red Line to City Center & Beaverton",
      "lastLocID": 10579,
      "nextLocID": 10579,
      "locationInScheduleDay": 24150,
      "newTrip": false,
      "longitude": -122.5927705,
      "direction": 1,
      "inCongestion": null,
      "routeNumber": 90,
      "bearing": 145,
      "garage": "ELMO",
      "tripID": "7144393",
      "delay": -16,
      "extraBlockID": null,
      "messageCode": 929,
      "lastStopSeq": 26,
      "vehicleID": 102,
      "time": 1488465767051,
      "offRoute": false
    }
  ]
}
*/
