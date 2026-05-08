// =============================================================
// Provider Nuvio : Nakios (VF / VOSTFR / MULTI)
// Version : 4.0.0
// - Bold Top Line: Nakios - Quality
// - Sub-description: S[X] E[X] - Episode Name | Movie Name | Icons
// =============================================================

var TMDB_KEY = 'f3d757824f08ea2cff45eb8f47ca3a1e';
var NAKIOS_UA       = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
var DOMAINS_URL     = 'https://raw.githubusercontent.com/wooodyhood/nuvio-repo/main/domains.json';
var NAKIOS_FALLBACK = 'fit';

var _cachedEndpoint = null;

// ─── TMDB Helpers ───────────────────────────────────────────

function getEnglishTitle(tmdbId, type) {
  var url = 'https://api.themoviedb.org/3/' + (type === 'tv' ? 'tv' : 'movie') + '/' + tmdbId + '?api_key=' + TMDB_KEY + '&language=en-US';
  return fetch(url)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      return data.title || data.name || "Nakios";
    })
    .catch(function() { return "Nakios"; });
}

// NEW: Fetch the specific episode name
function getEpisodeName(tmdbId, season, episode) {
  if (!tmdbId || !season || !episode) return Promise.resolve(null);
  var url = 'https://api.themoviedb.org/3/tv/' + tmdbId + '/season/' + season + '/episode/' + episode + '?api_key=' + TMDB_KEY + '&language=en-US';
  return fetch(url)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      return data.name || null;
    })
    .catch(function() { return null; });
}

// ─── Construction de l'endpoint ──────────────────────────────

function buildEndpoint(tld) {
  var baseDomain = tld.includes('nakios') ? tld : 'nakios.' + tld;
  return {
    base:    'https://' + baseDomain,
    api:     'https://api.' + baseDomain + '/api',
    referer: 'https://' + baseDomain + '/'
  };
}

function detectEndpoint() {
  if (_cachedEndpoint) return Promise.resolve(_cachedEndpoint);
  return fetch(DOMAINS_URL)
    .then(function(res) { return res.ok ? res.json() : Promise.reject(); })
    .then(function(data) {
      _cachedEndpoint = buildEndpoint(data.nakios || NAKIOS_FALLBACK);
      return _cachedEndpoint;
    })
    .catch(function() {
      _cachedEndpoint = buildEndpoint(NAKIOS_FALLBACK);
      return _cachedEndpoint;
    });
}

// ─── Logic ───────────────────────────────────────────────────

function extractOrigin(url) {
  var m = url.match(/^(https?:\/\/[^\/]+)/);
  return m ? m[1] : null;
}

function resolveSource(source, endpoint) {
  var rawUrl = source.url || '';
  if (rawUrl.startsWith('http')) {
    return {
      url: rawUrl,
      format: (source.isM3U8 || rawUrl.indexOf('.m3u8') !== -1) ? 'm3u8' : 'mp4',
      referer: endpoint.referer,
      origin: endpoint.base
    };
  }
  if (rawUrl.charAt(0) === '/') {
    var urlMatch = rawUrl.match(/[?&]url=([^&]+)/);
    if (!urlMatch) return null;
    var decoded;
    try { decoded = decodeURIComponent(urlMatch[1]); } catch (e) { return null; }
    var origin = extractOrigin(decoded);
    return {
      url: decoded,
      format: 'm3u8',
      referer: origin ? origin + '/' : endpoint.referer,
      origin: origin || endpoint.base
    };
  }
  return null;
}

// ─── UI / Formatting ─────────────────────────────────────────

function normalizeSources(sources, endpoint, movieName, season, episode, epName) {
  var results = [];
  for (var i = 0; i < sources.length; i++) {
    var s = sources[i];
    if (s.isEmbed) continue;

    var resolved = resolveSource(s, endpoint);
    if (!resolved) continue;

    var quality = s.quality || 'HD';
    var rawLang = (s.lang || 'MULTI').toUpperCase();
    var size    = s.size ? ' | 💾 ' + s.size : '';
    var format  = resolved.format.toUpperCase();
    
    var langIcon = '🇫🇷'; 
    var langLabel = 'VF';

    if (rawLang.indexOf('MULTI') !== -1 || (s.name && s.name.toUpperCase().indexOf('MULTI') !== -1)) {
        langIcon = '🌍';
        langLabel = 'MULTI';
    } else if (rawLang.indexOf('VOST') !== -1) {
        langIcon = '🔡';
        langLabel = 'VOSTFR';
    }

    // --- S1 E1 - Episode Name Logic ---
    var seInfo = "";
    if (season && episode) {
        seInfo = 'S' + season + ' E' + episode;
        if (epName) {
            seInfo += ' - ' + epName; // Adds " - Winter is Coming"
        }
        seInfo += ' | ';
    }

    var displayTitle = '🎬 ' + seInfo + movieName + 
                       ' | 📺 ' + quality + 
                       ' | ' + langIcon + ' ' + langLabel + 
                       ' | 🎞️ ' + format + 
                       size;

    results.push({
      name: 'Nakios - ' + quality, 
      title: displayTitle,
      url:     resolved.url,
      quality: quality,
      format:  resolved.format,
      headers: {
        'User-Agent': NAKIOS_UA,
        'Referer':    resolved.referer,
        'Origin':     resolved.origin
      }
    });
  }
  return results;
}

// ─── Entry Point ─────────────────────────────────────────────

function getStreams(tmdbId, mediaType, season, episode) {
  // Fetch English Title AND Episode Name simultaneously
  return Promise.all([
    getEnglishTitle(tmdbId, mediaType),
    mediaType === 'tv' ? getEpisodeName(tmdbId, season, episode) : Promise.resolve(null)
  ]).then(function(meta) {
    var movieName = meta[0];
    var epName = meta[1];

    return detectEndpoint().then(function(endpoint) {
      var url = mediaType === 'tv'
        ? endpoint.api + '/sources/tv/' + tmdbId + '/' + (season || 1) + '/' + (episode || 1)
        : endpoint.api + '/sources/movie/' + tmdbId;

      return fetch(url, {
        headers: { 'User-Agent': NAKIOS_UA, 'Referer': endpoint.referer }
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (!data.success || !data.sources) return [];
        
        var sNum = mediaType === 'tv' ? season : null;
        var eNum = mediaType === 'tv' ? episode : null;
        
        return normalizeSources(data.sources, endpoint, movieName, sNum, eNum, epName);
      });
    });
  }).catch(function() { return []; });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
