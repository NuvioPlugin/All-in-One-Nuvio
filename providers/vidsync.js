/**
 * vidsync - Built from src/vidsync/
 * Generated: 2026-05-10T22:01:36.854Z
 */
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/vidsync/http.js
var HEADERS = {
  "Accept": "*/*",
  "Origin": "https://vidsync.xyz",
  "Referer": "https://vidsync.xyz/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest"
};
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var VIDSYNC_API = "https://vidsync.xyz";
var MULTI_DECRYPT_API = "https://enc-dec.app/api";
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const response = yield fetch(url, __spreadValues({
      headers: __spreadValues(__spreadValues({}, HEADERS), options.headers || {})
    }, options));
    if (!response.ok)
      throw new Error(`HTTP error ${response.status}`);
    return yield response.text();
  });
}
function getTMDBDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a;
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const response = yield fetch(url, { headers: { "Accept": "application/json" } });
    if (!response.ok)
      throw new Error(`TMDB API error`);
    const data = yield response.json();
    return {
      title: mediaType === "tv" ? data.name : data.title,
      year: ((_a = mediaType === "tv" ? data.first_air_date : data.release_date) == null ? void 0 : _a.split("-")[0]) || null
    };
  });
}
function extractQuality(val) {
  if (!val)
    return "Unknown";
  const m = val.toString().match(/(\d{3,4})/);
  return m ? `${m[1]}p` : "Unknown";
}
function capitalizeServer(str) {
  if (!str)
    return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// src/vidsync/extractor.js
var SERVERS = [
  "cinevault",
  "cinedub",
  "cinebox",
  "cinevip",
  "cinecloud",
  "cine4k"
];
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    const streams = [];
    try {
      const info = yield getTMDBDetails(tmdbId, mediaType);
      if (!info.title)
        return streams;
      const encTitle = encodeURIComponent(info.title);
      const type = mediaType === "tv" ? "tv" : "movie";
      yield Promise.all(SERVERS.map((server) => __async(this, null, function* () {
        try {
          let serverUrl = `${VIDSYNC_API}/api/stream/fetch?type=${type}&title=${encTitle}&mediaId=${tmdbId}&releaseYear=${info.year || ""}&serverName=${server}`;
          if (mediaType === "tv") {
            serverUrl += `&season=${seasonNum}&episode=${episodeNum}`;
          }
          const encData = yield fetchText(serverUrl);
          const decryptRes = yield fetch(`${MULTI_DECRYPT_API}/dec-vidsync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: encData, id: String(tmdbId) })
          });
          if (!decryptRes.ok)
            return;
          const json = yield decryptRes.json();
          if (json.status !== 200 || !json.result)
            return;
          const result = json.result;
          if (result.sources && Array.isArray(result.sources)) {
            for (const source of result.sources) {
              const streamType = source.streamType === "hls" ? "m3u8" : "video";
              const quality = source.quality || extractQuality(source.url);
              const servLabel = capitalizeServer(server);
              streams.push({
                name: `Vidsync[${servLabel}]`,
                title: `Vidsync[${servLabel}] ${quality}`,
                url: source.url,
                quality: extractQuality(quality),
                type: streamType,
                headers: HEADERS
              });
            }
          }
        } catch (e) {
        }
      })));
    } catch (e) {
      console.error(`[VidSync] Error:`, e.message);
    }
    return streams;
  });
}

// src/vidsync/index.js
module.exports = { getStreams };
