/**
 * allmovieland - Built from src/allmovieland/
 * Generated: 2026-09-12T17:16:49.320Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
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

// src/allmovieland/index.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/allmovieland/constants.js
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var MAIN_URL = "https://mapi.elochkaigolochla.com";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.5"
};

// src/allmovieland/utils.js
function getTMDBDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a;
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const response = yield fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }
    });
    if (!response.ok)
      throw new Error(`TMDB API error: ${response.status}`);
    const data = yield response.json();
    const title = mediaType === "tv" ? data.name || data.original_name : data.title || data.original_title;
    const originalTitle = mediaType === "tv" ? data.original_name : data.original_title;
    const releaseDate = mediaType === "tv" ? data.first_air_date : data.release_date;
    const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
    return { title, originalTitle, year, imdbId: ((_a = data.external_ids) == null ? void 0 : _a.imdb_id) || null, data };
  });
}
function normalizeTitle(title) {
  if (!title)
    return "";
  return title.toLowerCase().replace(/\b(the|a|an)\b/g, "").replace(/[:\-_]/g, " ").replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim();
}
function calculateTitleSimilarity(title1, title2) {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  if (norm1 === norm2)
    return 1;
  const words1 = norm1.split(/\s+/).filter((w) => w.length > 0);
  const words2 = norm2.split(/\s+/).filter((w) => w.length > 0);
  if (words1.length === 0 || words2.length === 0)
    return 0;
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = words1.filter((w) => set2.has(w));
  const union = /* @__PURE__ */ new Set([...words1, ...words2]);
  const jaccard = intersection.length / union.size;
  const extraWordsCount = words2.filter((w) => !set1.has(w)).length;
  let score = jaccard - extraWordsCount * 0.05;
  if (words1.length > 0 && words1.every((w) => set2.has(w))) {
    score += 0.2;
  }
  return score;
}
function findBestTitleMatch(mediaInfo, searchResults) {
  if (!searchResults || searchResults.length === 0)
    return null;
  let bestMatch = null;
  let bestScore = 0;
  for (const result of searchResults) {
    let score = calculateTitleSimilarity(mediaInfo.title, result.title);
    if (mediaInfo.year && result.year) {
      const yearDiff = Math.abs(mediaInfo.year - result.year);
      if (yearDiff === 0)
        score += 0.2;
      else if (yearDiff <= 1)
        score += 0.1;
      else if (yearDiff > 5)
        score -= 0.3;
    }
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = result;
    }
  }
  return bestMatch;
}

// src/allmovieland/index.js
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    var _a;
    console.log(`[AllMovieLand] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
    try {
      const mediaInfo = yield getTMDBDetails(tmdbId, mediaType);
      console.log(`[AllMovieLand] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || "N/A"})`);
      let searchResults = yield searchAllMovieLand(mediaInfo.title, mediaType);
      if ((!searchResults || searchResults.length === 0) && mediaInfo.originalTitle && mediaInfo.originalTitle !== mediaInfo.title) {
        searchResults = yield searchAllMovieLand(mediaInfo.originalTitle, mediaType);
      }
      if (!searchResults || searchResults.length === 0) {
        console.log("[AllMovieLand] No search results found.");
        return [];
      }
      const bestMatch = findBestTitleMatch(mediaInfo, searchResults);
      if (!bestMatch) {
        console.log("[AllMovieLand] No confident match found.");
        return [];
      }
      console.log(`[AllMovieLand] Selected: "${bestMatch.title}" (ID: ${bestMatch.id})`);
      let players = bestMatch.player;
      if (!players || players.length === 0) {
        const detailRes = yield fetch(`${MAIN_URL}/api/v1/movies/${bestMatch.id}`, { headers: HEADERS });
        if (detailRes.ok) {
          const detailData = yield detailRes.json();
          players = ((_a = detailData == null ? void 0 : detailData.result) == null ? void 0 : _a.player) || [];
        }
      }
      if (!players || players.length === 0) {
        console.log("[AllMovieLand] No players found.");
        return [];
      }
      const streams = [];
      for (const player of players) {
        if (!player.url)
          continue;
        if (player.source === "m3u8") {
          if (mediaType === "movie") {
            streams.push({
              name: "AllMovieLand",
              title: `AllMovieLand - ${player.translator || "Player"} [HLS]`,
              url: player.url,
              quality: player.quality || "HD",
              headers: {
                "User-Agent": HEADERS["User-Agent"],
                "Referer": `${MAIN_URL}/`
              },
              provider: "allmovieland"
            });
          }
        } else if (player.source === "iframe") {
          try {
            const iframeRes = yield fetch(player.url, {
              headers: __spreadProps(__spreadValues({}, HEADERS), {
                "Referer": `${MAIN_URL}/`
              })
            });
            if (!iframeRes.ok)
              continue;
            const html = yield iframeRes.text();
            const $ = import_cheerio_without_node_native.default.load(html);
            let scriptContent = "";
            $("script").each((_, el) => {
              const h = $(el).html() || "";
              if (h.includes("HDVBPlayer") || h.includes("p3"))
                scriptContent = h;
            });
            if (!scriptContent)
              continue;
            const start = scriptContent.indexOf("{");
            const end = scriptContent.lastIndexOf("}");
            if (start === -1 || end <= start)
              continue;
            const meta = JSON.parse(scriptContent.substring(start, end + 1));
            if (!meta.key || !meta.file)
              continue;
            const urlObj = new URL(player.url);
            const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
            const fileEndpoint = meta.file.startsWith("http") ? meta.file : `${baseUrl}${meta.file}`;
            const fileRes = yield fetch(fileEndpoint, {
              method: "POST",
              headers: __spreadProps(__spreadValues({}, HEADERS), {
                "X-CSRF-TOKEN": meta.key,
                "Referer": player.url
              })
            });
            if (!fileRes.ok)
              continue;
            const rawText = yield fileRes.text();
            const cleanText = rawText.replace(/\[\s*\],\s*/g, "").replace(/,\s*\[\s*\]/g, "").replace(/,\]/g, "]");
            const parsedData = JSON.parse(cleanText);
            if (mediaType === "movie") {
              const files = Array.isArray(parsedData) ? parsedData.filter((f) => f && f.file) : [];
              for (const fileObj of files) {
                try {
                  const epM3u8Url = `${baseUrl}/playlist/${fileObj.file}.txt`;
                  const m3u8Res = yield fetch(epM3u8Url, {
                    method: "POST",
                    headers: __spreadProps(__spreadValues({}, HEADERS), {
                      "X-CSRF-TOKEN": meta.key,
                      "Referer": `${MAIN_URL}/`
                    })
                  });
                  if (!m3u8Res.ok)
                    continue;
                  const m3u8Url = (yield m3u8Res.text()).trim();
                  if (m3u8Url && m3u8Url.startsWith("http")) {
                    streams.push({
                      name: "AllMovieLand",
                      title: `AllMovieLand - ${fileObj.title || player.translator || "Player"}`,
                      url: m3u8Url,
                      quality: player.quality || "HD",
                      headers: {
                        "User-Agent": HEADERS["User-Agent"],
                        "Referer": `${baseUrl}/`,
                        "Origin": baseUrl
                      },
                      provider: "allmovieland"
                    });
                  }
                } catch (e) {
                }
              }
            } else if (mediaType === "tv" && Array.isArray(parsedData)) {
              const targetSeason = parseInt(season, 10) || 1;
              const targetEpisode = parseInt(episode, 10) || 1;
              const sFolder = parsedData.find((s) => {
                const sNum = s.title && s.title.match(/Season\s*(\d+)/i) ? parseInt(s.title.match(/Season\s*(\d+)/i)[1], 10) : parseInt(s.id, 10);
                return sNum === targetSeason;
              });
              if (sFolder && Array.isArray(sFolder.folder)) {
                const epFolder = sFolder.folder.find((e) => {
                  const eNum = e.title && e.title.match(/(\d+)/) ? parseInt(e.title.match(/(\d+)/)[1], 10) : parseInt(e.episode, 10);
                  return eNum === targetEpisode;
                });
                if (epFolder && Array.isArray(epFolder.folder)) {
                  for (const fileObj of epFolder.folder) {
                    if (!fileObj.file)
                      continue;
                    try {
                      const epM3u8Url = `${baseUrl}/playlist/${fileObj.file}.txt`;
                      const m3u8Res = yield fetch(epM3u8Url, {
                        method: "POST",
                        headers: __spreadProps(__spreadValues({}, HEADERS), {
                          "X-CSRF-TOKEN": meta.key,
                          "Referer": `${MAIN_URL}/`
                        })
                      });
                      if (!m3u8Res.ok)
                        continue;
                      const m3u8Url = (yield m3u8Res.text()).trim();
                      if (m3u8Url && m3u8Url.startsWith("http")) {
                        streams.push({
                          name: "AllMovieLand",
                          title: `AllMovieLand - S${targetSeason}E${targetEpisode} (${fileObj.title || "Default"})`,
                          url: m3u8Url,
                          quality: player.quality || "HD",
                          headers: {
                            "User-Agent": HEADERS["User-Agent"],
                            "Referer": `${baseUrl}/`,
                            "Origin": baseUrl
                          },
                          provider: "allmovieland"
                        });
                      }
                    } catch (e) {
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error(`[AllMovieLand] Error parsing player iframe: ${e.message}`);
          }
        }
      }
      return streams;
    } catch (error) {
      console.error(`[AllMovieLand] Error: ${error.message}`);
      return [];
    }
  });
}
function searchAllMovieLand(query, mediaType) {
  return __async(this, null, function* () {
    try {
      const searchUrl = `${MAIN_URL}/api/v1/new-search/movies?title=${encodeURIComponent(query.trim())}&page=1&limit=20`;
      const res = yield fetch(searchUrl, { headers: HEADERS });
      if (!res.ok)
        return [];
      const data = yield res.json();
      if (!data || !Array.isArray(data.results))
        return [];
      const expectedType = mediaType === "tv" ? "serial" : "movie";
      return data.results.filter((m) => !m.type || m.type === expectedType || (mediaType === "tv" ? m.type === "serial" : true)).map((m) => ({
        id: m.kinopoisk_id,
        title: m.title_en || m.title_ru,
        year: m.year,
        player: m.player || []
      }));
    } catch (e) {
      return [];
    }
  });
}
module.exports = { getStreams };
