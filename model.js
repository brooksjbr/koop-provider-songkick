/*
  model.js

  This file is required. It must export a class with at least one public function called `getData`

  Documentation: http://koopjs.github.io/docs/specs/provider/
*/
const request = require('request').defaults({gzip: true, json: true});
const SpotifyWebApi = require('spotify-web-api-node');
const config = require('config');
const Promise = require("bluebird");
const songkick = require('request-promise');

function Model (koop) {}

// This is the only public function you need to implement
Model.prototype.getData = function (req, callback) {

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

  songkick(options)
    .then(function(data) {
      return data.resultsPage.results.event.filter(validateEvent);
      },function(err) { console.log("Songkick promise failed.." + err)
    })
    .then(function(events) {
      return translate(events);
    })
    .then(function(features) {
      const geojson = {type: "FeatureCollection", features}
      callback(null,geojson);
    })
    .catch(function (err) {
      console.log("Something went wrong with Spotify promise chain " + err);
      callback(err);
    });

}

function validateEvent(event) {
  return event.venue.lng && event.venue.lat && event.start.datetime && event.performance[0].artist.displayName;
}

function initSpotifyApi() {
  return new SpotifyWebApi({
    clientId : config.spotify.clientId,
    clientSecret : config.spotify.clientSecret
  });
}

function translate (events) {
  const spotifyApi = initSpotifyApi();

  return spotifyApi.clientCredentialsGrant()
    .then(function(data) {
      //console.log('The access token expires in ' + data.body['expires_in']);
      //console.log('The access token is ' + data.body['access_token']);

      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);
      return Promise.all(events.map((event) => formatFeature(event,spotifyApi)));
    })
    .catch(function(err) {
      console.log('Unfortunately, something has gone wrong.', err.message);
    });
}

function formatFeature (event, client) {
  const artist = event.performance[0].artist.displayName;
  const date = event.start.datetime;
  const start = event.start.time;
  const venue = event.venue.displayName;
  const lng = event.venue.lng;
  const lat = event.venue.lat;
  const ageRestriction = event.ageRestriction;
  const headerline = event.performance[0].billing;
  const options = { limit : 1, offset : 1 };

  //Is this promise chain hell?
  return client.searchArtists(artist,options)
    .then(function(data) {
      return data.body.artists.items[0];
    })
    .then(function(link) {      
      const spotify_link = (typeof link !== "undefined") ? `${config.spotify.embed}?uri=${link.uri}&theme=white` : "No track available for " + artist;

      return {
        type: 'Feature',
        properties: {
          artist: artist,
          venue: venue,
          date: date,
          start: start,
          spotify: spotify_link
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      };
    })
    .catch(function(err) {
      console.log("Something went wrong with spotify artist search " + err)
    });
  
}

module.exports = Model
