// Cinezo Provider for Nuvio
// Streams from cinezo.net via api.cinezo.net
// Supports Movies and TV Shows up to 4K
 
var BASE_URL = 'https://api.cinezo.net/media';
 
function getStreams(tmdbId, mediaType, season, episode) {
  var url;
 
  if (mediaType === 'movie') {
    url = BASE_URL + '/tmdb-movie-' + tmdbId;
  } else {
    url = BASE_URL + '/tmdb-tv-' + tmdbId + '/' + season + '/' + episode;
  }
 
  console.log('[Cinezo] Fetching: ' + url);
 
  return fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://cinezo.net/',
      'Origin': 'https://cinezo.net'
    }
  })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('[Cinezo] HTTP error: ' + response.status);
      }
      return response.text();
    })
    .then(function(html) {
      var streams = [];
 
      // Extract m3u8 stream URLs from the HTML/player response
      var m3u8Regex = /https?:\/\/[^\s"']+\.m3u8[^\s"']*/g;
      var m3u8Matches = html.match(m3u8Regex);
 
      if (m3u8Matches) {
        m3u8Matches.forEach(function(streamUrl, index) {
          // Clean up any escaped characters
          streamUrl = streamUrl.replace(/\\/g, '').replace(/"/g, '');
          streams.push({
            name: 'Cinezo',
            title: 'Cinezo Stream #' + (index + 1),
            url: streamUrl,
            quality: 'Auto',
            headers: {
              'Referer': 'https://cinezo.net/',
              'Origin': 'https://cinezo.net'
            }
          });
        });
      }
 
      // Also try to extract mp4 direct links
      var mp4Regex = /https?:\/\/[^\s"']+\.mp4[^\s"']*/g;
      var mp4Matches = html.match(mp4Regex);
 
      if (mp4Matches) {
        mp4Matches.forEach(function(streamUrl, index) {
          streamUrl = streamUrl.replace(/\\/g, '').replace(/"/g, '');
          streams.push({
            name: 'Cinezo',
            title: 'Cinezo MP4 #' + (index + 1),
            url: streamUrl,
            quality: '1080p',
            headers: {
              'Referer': 'https://cinezo.net/',
              'Origin': 'https://cinezo.net'
            }
          });
        });
      }
 
      // Try to find JSON source data in the page
      var sourceRegex = /"file"\s*:\s*"(https?:\/\/[^"]+)"/g;
      var sourceMatch;
      while ((sourceMatch = sourceRegex.exec(html)) !== null) {
        var sourceUrl = sourceMatch[1].replace(/\\/g, '');
        // Avoid duplicates
        var isDuplicate = streams.some(function(s) { return s.url === sourceUrl; });
        if (!isDuplicate) {
          streams.push({
            name: 'Cinezo',
            title: 'Cinezo Source',
            url: sourceUrl,
            quality: 'Auto',
            headers: {
              'Referer': 'https://cinezo.net/',
              'Origin': 'https://cinezo.net'
            }
          });
        }
      }
 
      if (streams.length === 0) {
        console.log('[Cinezo] No streams found for: ' + url);
      } else {
        console.log('[Cinezo] Found ' + streams.length + ' stream(s)');
      }
 
      return streams;
    })
    .catch(function(error) {
      console.error('[Cinezo] Error: ' + error.message);
      return [];
    });
}
 
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
