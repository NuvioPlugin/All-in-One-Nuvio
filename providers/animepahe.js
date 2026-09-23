/**
 * animepahe - Built from src/animepahe/
 * Generated: 2026-09-23T07:03:31.030Z
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

// src/animepahe/index.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/animepahe/constants.js
var ANIMEPAHE_DOMAINS = [
  "https://animepahe.pw",
  "https://animepahe.com",
  "https://animepahe.org"
];
var MAIN_URL = "https://animepahe.pw";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";
var HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "application/json, text/plain, */*",
  "Referer": `${MAIN_URL}/`
};

// src/animepahe/utils.js
var activeDomain = MAIN_URL;
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const isAbsolute = url.startsWith("http");
    const urlsToTry = isAbsolute ? [url] : ANIMEPAHE_DOMAINS.map((d) => `${d}${url.startsWith("/") ? "" : "/"}${url}`);
    let lastError = null;
    for (const tryUrl of urlsToTry) {
      try {
        const isPaheUrl = tryUrl.includes("animepahe.");
        const mergedHeaders = __spreadValues(__spreadProps(__spreadValues({}, HEADERS), {
          "Referer": `${activeDomain}/`
        }), options.headers || {});
        let response = yield fetch(tryUrl, __spreadValues({
          headers: mergedHeaders,
          cfKiller: isPaheUrl,
          skipSizeCheck: true
        }, options));
        if ((response.status === 403 || response.status === 503) && typeof Cloudflare !== "undefined" && Cloudflare.solve) {
          try {
            const solvedHeaders = yield Cloudflare.solve(tryUrl);
            if (solvedHeaders["Cookie"])
              mergedHeaders["Cookie"] = solvedHeaders["Cookie"];
            if (solvedHeaders["User-Agent"])
              mergedHeaders["User-Agent"] = solvedHeaders["User-Agent"];
            response = yield fetch(tryUrl, __spreadValues({
              headers: mergedHeaders,
              skipSizeCheck: true
            }, options));
          } catch (_) {
          }
        }
        if (response.ok) {
          if (!isAbsolute) {
            const match = tryUrl.match(/^(https?:\/\/[^\/]+)/);
            if (match)
              activeDomain = match[1];
          }
          return yield response.text();
        }
        lastError = new Error(`HTTP ${response.status} on ${tryUrl}`);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error(`Failed to fetch: ${url}`);
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const text = yield fetchText(url, options);
    return JSON.parse(text);
  });
}
function getImdbId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
      const res = yield fetch(url);
      const data = yield res.json();
      return data.imdb_id;
    } catch (_) {
      return null;
    }
  });
}
function isDateMatch(d1, d2) {
  if (!d1 || !d2)
    return false;
  const s1 = d1.split("T")[0];
  const s2 = d2.split("T")[0];
  const date1 = /* @__PURE__ */ new Date(s1 + "T00:00:00Z");
  const date2 = /* @__PURE__ */ new Date(s2 + "T00:00:00Z");
  const diff = Math.abs(date1.getTime() - date2.getTime());
  return Math.ceil(diff / (1e3 * 60 * 60 * 24)) <= 2;
}
function fetchWithTimeout(_0) {
  return __async(this, arguments, function* (url, options = {}, timeoutMs = 6e3) {
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Timeout")), timeoutMs);
    });
    try {
      const res = yield Promise.race([fetch(url, options), timeoutPromise]);
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  });
}
function resolveMapping(imdbId, season, episode, tmdbId) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    const seasonNum = parseInt(season);
    const episodeNum = parseInt(episode);
    const mapId = `${imdbId}:s${season}:e${episode}`;
    let metaData = null;
    const metaUrls = [
      `https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`,
      `https://cinemeta-live.strem.io/meta/series/${imdbId}.json`,
      `https://v3-meta.stremio.com/meta/series/${imdbId}.json`
    ];
    for (const url of metaUrls) {
      try {
        const mRes = yield fetchWithTimeout(url, {}, 5e3);
        if (mRes.ok) {
          const json = yield mRes.json();
          if ((_a = json == null ? void 0 : json.meta) == null ? void 0 : _a.videos) {
            metaData = json.meta;
            break;
          }
        }
      } catch (_) {
      }
    }
    if (!metaData || !metaData.videos)
      return null;
    const video = metaData.videos.find((v) => v.season === seasonNum && v.episode === episodeNum);
    if (!(video == null ? void 0 : video.released))
      return null;
    const airDate = video.released.split("T")[0];
    const showTitle = metaData.name;
    const dayIndex = metaData.videos.filter((v) => {
      if (!v.released)
        return false;
      return v.released.split("T")[0] === airDate && (v.season < seasonNum || v.season === seasonNum && v.episode < episodeNum);
    }).length;
    let malIds = [];
    const tId = tmdbId || metaData.moviedb_id || metaData.themoviedb_id;
    const tvdbId = metaData.tvdb_id;
    const armUrls = [
      `https://arm.haglund.dev/api/v2/imdb?id=${imdbId}`,
      tId ? `https://arm.haglund.dev/api/v2/themoviedb?id=${tId}` : null,
      tvdbId ? `https://arm.haglund.dev/api/v2/thetvdb?id=${tvdbId}` : null
    ].filter(Boolean);
    for (const url of armUrls) {
      try {
        const res = yield fetchWithTimeout(url, {}, 5e3);
        if (res.ok) {
          const data = yield res.json();
          if (Array.isArray(data)) {
            data.forEach((e) => {
              if (e.myanimelist)
                malIds.push(e.myanimelist);
            });
          }
        }
      } catch (_) {
      }
    }
    try {
      const aniIdUrl = tId ? `https://api.ani.zip/mappings?themoviedb_id=${tId}` : `https://api.ani.zip/mappings?imdb_id=${imdbId}`;
      const aniRes = yield fetchWithTimeout(aniIdUrl, {}, 5e3);
      if (aniRes.ok) {
        const aniData = yield aniRes.json();
        if ((_b = aniData == null ? void 0 : aniData.mappings) == null ? void 0 : _b.mal_id)
          malIds.push(aniData.mappings.mal_id);
      }
    } catch (_) {
    }
    malIds = [...new Set(malIds)].filter(Boolean).sort((a, b) => b - a);
    let finalResult = null;
    for (const malId of malIds) {
      try {
        const aniRes = yield fetchWithTimeout(`https://api.ani.zip/mappings?mal_id=${malId}`, {}, 5e3);
        if (aniRes.ok) {
          const aniData = yield aniRes.json();
          if (aniData == null ? void 0 : aniData.episodes) {
            const aniEpisodes = Object.values(aniData.episodes).map((ep) => ({
              mal_episode_number: parseInt(ep.episode),
              air_date: ep.airDateUtc || ep.airDate || ep.airdate
            })).filter((ep) => !isNaN(ep.mal_episode_number));
            const aniDateMatches = aniEpisodes.filter((ep) => isDateMatch(ep.air_date, airDate)).sort((a, b) => a.mal_episode_number - b.mal_episode_number);
            if (aniDateMatches[dayIndex]) {
              const match = aniDateMatches[dayIndex];
              finalResult = {
                id: mapId,
                imdb_id: imdbId,
                season: seasonNum,
                episode: episodeNum,
                mal_id: malId,
                mal_episode: match.mal_episode_number,
                anime_title: showTitle,
                air_date: airDate
              };
              break;
            }
          }
        }
      } catch (_) {
      }
      try {
        const jRes = yield fetchWithTimeout(`https://api.jikan.moe/v4/anime/${malId}`, {}, 5e3);
        if (jRes.ok) {
          const jData = yield jRes.json();
          if (((_d = (_c = jData == null ? void 0 : jData.data) == null ? void 0 : _c.aired) == null ? void 0 : _d.from) && isDateMatch(jData.data.aired.from, airDate)) {
            finalResult = {
              id: mapId,
              imdb_id: imdbId,
              season: seasonNum,
              episode: episodeNum,
              mal_id: malId,
              mal_episode: dayIndex + 1,
              anime_title: showTitle,
              air_date: airDate
            };
            break;
          }
        }
      } catch (_) {
      }
    }
    if (!finalResult && malIds.length === 1 && seasonNum === 1) {
      finalResult = {
        id: mapId,
        imdb_id: imdbId,
        season: seasonNum,
        episode: episodeNum,
        mal_id: malIds[0],
        mal_episode: episodeNum,
        anime_title: showTitle,
        air_date: airDate
      };
    }
    return finalResult;
  });
}
function getMalTitle(malId) {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      const res = yield fetchWithTimeout(`https://api.jikan.moe/v4/anime/${malId}`, {}, 4e3);
      if (res.ok) {
        const data = yield res.json();
        const title = ((_a = data.data) == null ? void 0 : _a.title) || ((_b = data.data) == null ? void 0 : _b.title_english);
        if (title)
          return title;
      }
    } catch (_) {
    }
    try {
      const aniRes = yield fetchWithTimeout(`https://api.ani.zip/mappings?mal_id=${malId}`, {}, 4e3);
      if (aniRes.ok) {
        const aniData = yield aniRes.json();
        const titles = (aniData == null ? void 0 : aniData.titles) || {};
        return titles.en || titles["x-jat"] || titles.ja || null;
      }
    } catch (_) {
    }
    return null;
  });
}
function searchAnime(query, page = 1) {
  return __async(this, null, function* () {
    const timeSuffix = Math.floor(Date.now() / 1e3) + page * 3;
    const url = `/api?m=search&q=${encodeURIComponent(query + " " + timeSuffix)}&page=${page}`;
    return yield fetchJson(url);
  });
}
function extractQuality(text) {
  const match = text.match(/(\d{3,4}p)/);
  return match ? match[1] : "720p";
}

// src/animepahe/extractors.js
function unpack(code) {
  try {
    const match = code.match(/}\((['"])([\s\S]*?)\1,\s*(\d+),\s*(\d+),\s*(['"])([\s\S]*?)\5\.split\((['"])\|\7\)/);
    if (match) {
      let [_, quote1, p, a, c, quote2, kStr] = match;
      p = p.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      a = parseInt(a, 10);
      c = parseInt(c, 10);
      const k = kStr.split("|");
      const e = (c2) => (c2 < a ? "" : e(parseInt(c2 / a, 10))) + ((c2 = c2 % a) > 35 ? String.fromCharCode(c2 + 29) : c2.toString(36));
      const d = {};
      while (c--)
        d[e(c)] = k[c] || e(c);
      return p.replace(/\b\w+\b/g, (w) => d[w] !== void 0 ? d[w] : w);
    }
  } catch (_) {
  }
  return code;
}
function extractKwik(url) {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(url, {
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Referer": `${MAIN_URL}/`,
          "User-Agent": USER_AGENT
        }),
        cfKiller: true,
        skipSizeCheck: true
      });
      const finalUrl = res.url || url;
      const html = yield res.text();
      const scripts = html.match(/<script.*?>([\s\S]*?)<\/script>/g) || [];
      const matches = [];
      for (const script of scripts) {
        if (script.includes("eval(function(p,a,c,k,e,d)")) {
          let pos = 0;
          while (true) {
            const start = script.indexOf("eval(function(p,a,c,k,e,d)", pos);
            if (start === -1)
              break;
            const end = script.indexOf(".split('|')", start);
            if (end === -1)
              break;
            const closeParen = script.indexOf("))", end);
            if (closeParen === -1)
              break;
            matches.push(script.substring(start, closeParen + 2));
            pos = closeParen + 2;
          }
        }
      }
      for (const scriptContent of matches) {
        const unpacked = unpack(scriptContent);
        const srcMatch = unpacked.match(/(?:const\s+)?source\s*=\s*\\?['"]([^\\'"]+)\\?['"]/);
        if (srcMatch) {
          const streamUrl = srcMatch[1];
          const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
          const title = titleMatch ? titleMatch[1].trim() : "video";
          const fileName = title.endsWith(".mp4") ? title : `${title}.mp4`;
          let mp4Url = null;
          if (streamUrl.includes("/stream/")) {
            const urlParts = streamUrl.replace("/stream/", "/mp4/").split("/");
            urlParts.pop();
            const mp4Base = urlParts.join("/");
            mp4Url = `${mp4Base}?file=${encodeURIComponent(fileName)}`;
          }
          return {
            m3u8: streamUrl,
            mp4: mp4Url,
            headers: {
              "Referer": finalUrl,
              "Origin": "https://kwik.cx",
              "User-Agent": USER_AGENT
            }
          };
        }
      }
    } catch (_) {
    }
    return null;
  });
}
function paheDecrypt(fullString, key, v1, v2) {
  const keyIndexMap = {};
  for (let i2 = 0; i2 < key.length; i2++)
    keyIndexMap[key[i2]] = i2;
  let result = "";
  let i = 0;
  const toFind = key[v2];
  while (i < fullString.length) {
    const nextIndex = fullString.indexOf(toFind, i);
    if (nextIndex === -1)
      break;
    let decodedCharStr = "";
    for (let j = i; j < nextIndex; j++) {
      decodedCharStr += keyIndexMap[fullString[j]];
    }
    i = nextIndex + 1;
    const decodedChar = String.fromCharCode(parseInt(decodedCharStr, v2) - v1);
    result += decodedChar;
  }
  return result;
}
function extractPahe(url) {
  return __async(this, null, function* () {
    try {
      const initUrl = url.endsWith("/i") ? url : `${url}/i`;
      const initRes = yield fetch(initUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": "https://pahe.win/"
        },
        cfKiller: true,
        skipSizeCheck: true
      });
      const redirectLoc = initRes.headers.get("location") || initRes.headers.get("Location");
      if (!redirectLoc)
        return null;
      let kwikUrl = redirectLoc;
      if (kwikUrl.includes("https://")) {
        kwikUrl = "https://" + kwikUrl.split("https://").pop();
      } else if (kwikUrl.includes("http://")) {
        kwikUrl = "http://" + kwikUrl.split("http://").pop();
      } else {
        kwikUrl = `https://${kwikUrl.replace(/^\/+/, "")}`;
      }
      const kwikRes = yield fetch(kwikUrl, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": "https://kwik.cx/",
          "Origin": "https://kwik.cx"
        },
        cfKiller: true,
        skipSizeCheck: true
      });
      const html = yield kwikRes.text();
      let cookie = "";
      if (typeof kwikRes.headers.getSetCookie === "function") {
        cookie = kwikRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
      }
      if (!cookie) {
        const setCookieHeader = kwikRes.headers.get("set-cookie") || kwikRes.headers.get("Set-Cookie");
        if (setCookieHeader) {
          cookie = setCookieHeader.split(";")[0];
        }
      }
      const kwikParamsRegex = /\("(\w+)",\d+,"(\w+)",(\d+),(\d+),\d+\)/;
      const match = html.match(kwikParamsRegex);
      if (!match)
        return null;
      const [_, fullString, key, v1, v2] = match;
      const decrypted = paheDecrypt(fullString, key, parseInt(v1, 10), parseInt(v2, 10));
      const actionMatch = decrypted.match(/action="([^"]+)"/);
      const tokenMatch = decrypted.match(/value="([^"]+)"/);
      if (!actionMatch || !tokenMatch)
        return null;
      const postUri = actionMatch[1];
      const token = tokenMatch[1];
      const formData = new URLSearchParams();
      formData.append("_token", token);
      let tries = 0;
      let location = null;
      while (tries < 3) {
        tries++;
        const postRes = yield fetch(postUri, {
          method: "POST",
          redirect: "manual",
          headers: __spreadProps(__spreadValues({
            "User-Agent": USER_AGENT,
            "Referer": kwikUrl,
            "Origin": "https://kwik.cx"
          }, cookie ? { "Cookie": cookie } : {}), {
            "Content-Type": "application/x-www-form-urlencoded"
          }),
          body: formData.toString(),
          cfKiller: true,
          skipSizeCheck: true
        });
        if (postRes.status === 302 || postRes.status === 301) {
          location = postRes.headers.get("location") || postRes.headers.get("Location");
          break;
        }
      }
      if (location) {
        return {
          url: location,
          headers: {
            "Referer": "https://kwik.cx/",
            "Origin": "https://kwik.cx",
            "User-Agent": USER_AGENT
          }
        };
      }
    } catch (_) {
    }
    return null;
  });
}

// src/animepahe/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log(`[AnimePahe] getStreams: tmdbId=${tmdbId}, mediaType=${mediaType}, S${season}E${episode}`);
      let animeSession = null;
      let animeTitle = "";
      let mappedEp = episode;
      let targetMalId = null;
      if (mediaType === "tv") {
        const imdbId = yield getImdbId(tmdbId, mediaType);
        console.log(`[AnimePahe] IMDb ID: ${imdbId}`);
        if (!imdbId)
          return [];
        const mapping = yield resolveMapping(imdbId, season, episode, tmdbId);
        console.log(`[AnimePahe] Mapping:`, mapping ? JSON.stringify(mapping) : "null");
        if (!mapping || !mapping.mal_id)
          return [];
        targetMalId = mapping.mal_id;
        mappedEp = mapping.mal_episode || episode;
        animeTitle = yield getMalTitle(targetMalId);
        if (!animeTitle && mapping.anime_title) {
          animeTitle = mapping.anime_title;
        }
        console.log(`[AnimePahe] Target title: "${animeTitle}" (MAL ID: ${targetMalId})`);
        if (!animeTitle)
          return [];
        let searchResults = yield searchAnime(animeTitle);
        if (!searchResults.data || searchResults.data.length === 0) {
          const clean = animeTitle.replace(/[^a-zA-Z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
          if (clean !== animeTitle) {
            searchResults = yield searchAnime(clean);
          }
        }
        if (!searchResults.data || searchResults.data.length === 0) {
          const words = animeTitle.split(/\s+/).filter(Boolean);
          if (words.length > 3) {
            const shortQuery = words.slice(-3).join(" ");
            searchResults = yield searchAnime(shortQuery);
          }
        }
        if (searchResults.data && searchResults.data.length > 0) {
          for (let i = 0; i < Math.min(searchResults.data.length, 5); i++) {
            const item = searchResults.data[i];
            try {
              const pageHtml = yield fetchText(`/anime/${item.session}`);
              if (pageHtml.includes(`myanimelist.net/anime/${targetMalId}`) || item.id && String(item.id) === String(targetMalId)) {
                animeSession = item.session;
                break;
              }
            } catch (_) {
            }
          }
          if (!animeSession) {
            const normTarget = animeTitle.toLowerCase().replace(/[^a-z0-9]+/g, "");
            const titleMatch = searchResults.data.find((r) => {
              const normR = (r.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
              return normR.includes(normTarget) || normTarget.includes(normR);
            });
            animeSession = titleMatch ? titleMatch.session : searchResults.data[0].session;
          }
        }
      } else {
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=439c478a771f35c05022f9feabcca01c`;
        const tmdbRes = yield fetch(tmdbUrl);
        const tmdbData = yield tmdbRes.json();
        animeTitle = tmdbData.title || tmdbData.original_title;
        mappedEp = 1;
        if (!animeTitle)
          return [];
        let searchResults = yield searchAnime(animeTitle);
        if (!searchResults.data || searchResults.data.length === 0) {
          const clean = animeTitle.replace(/[^a-zA-Z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
          if (clean !== animeTitle) {
            searchResults = yield searchAnime(clean);
          }
        }
        if (!searchResults.data || searchResults.data.length === 0) {
          if (tmdbData.original_title && tmdbData.original_title !== animeTitle) {
            searchResults = yield searchAnime(tmdbData.original_title);
          }
        }
        if (searchResults.data && searchResults.data.length > 0) {
          const normTarget = animeTitle.toLowerCase().replace(/[^a-z0-9]+/g, "");
          const match = searchResults.data.find((r) => {
            const normR = (r.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
            return normR === normTarget || normR.includes(normTarget) || normTarget.includes(normR);
          }) || searchResults.data[0];
          animeSession = match.session;
        }
      }
      console.log(`[AnimePahe] Anime session: ${animeSession}`);
      if (!animeSession)
        return [];
      const firstPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=1`;
      const firstPageData = yield fetchJson(firstPageUrl);
      if (!firstPageData.data || firstPageData.data.length === 0)
        return [];
      const targetEpNum = Number(mappedEp);
      let episodeSession = null;
      const epInFirstPage = firstPageData.data.find((e) => Math.floor(Number(e.episode)) === targetEpNum || Number(e.episode) === targetEpNum);
      if (epInFirstPage) {
        episodeSession = epInFirstPage.session;
      } else {
        const perPage = firstPageData.per_page || 30;
        const targetPage = Math.ceil(targetEpNum / perPage) || 1;
        const lastPage = firstPageData.last_page || 1;
        if (targetPage !== 1 && targetPage <= lastPage) {
          const targetPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=${targetPage}`;
          const targetPageData = yield fetchJson(targetPageUrl);
          if (targetPageData && targetPageData.data) {
            const foundEp = targetPageData.data.find((e) => Math.floor(Number(e.episode)) === targetEpNum || Number(e.episode) === targetEpNum);
            if (foundEp)
              episodeSession = foundEp.session;
          }
        }
        if (!episodeSession) {
          for (let p = 2; p <= Math.min(lastPage, 6); p++) {
            if (p === targetPage)
              continue;
            const pData = yield fetchJson(`/api?m=release&id=${animeSession}&sort=episode_asc&page=${p}`);
            if (pData && pData.data) {
              const foundEp = pData.data.find((e) => Math.floor(Number(e.episode)) === targetEpNum || Number(e.episode) === targetEpNum);
              if (foundEp) {
                episodeSession = foundEp.session;
                break;
              }
            }
          }
        }
      }
      console.log(`[AnimePahe] Episode session: ${episodeSession}`);
      if (!episodeSession)
        return [];
      const playUrl = `/play/${animeSession}/${episodeSession}`;
      const playHtml = yield fetchText(playUrl);
      const $ = import_cheerio_without_node_native.default.load(playHtml);
      const streams = [];
      const promises = [];
      const seen = /* @__PURE__ */ new Set();
      const downloadLinks = $("div#pickDownload > a");
      const buttons = $("#resolutionMenu > button");
      buttons.each((index, el) => {
        const $btn = $(el);
        const kwikUrl = $btn.attr("data-src");
        const fullText = $btn.text().trim();
        const qualityText = fullText.includes(" \xB7 ") ? fullText.substring(fullText.indexOf(" \xB7 ") + 3) : fullText;
        const isDub = qualityText.toLowerCase().includes("eng");
        const isKor = qualityText.toLowerCase().includes("kor");
        const isChi = qualityText.toLowerCase().includes("chi");
        const langLabel = isDub ? "DUB" : isKor ? "KOR" : isChi ? "CHI" : "SUB";
        const cleanQualityText = qualityText.replace(/eng/gi, "").replace(/kor/gi, "").replace(/chi/gi, "").replace(/\s+/g, " ").trim();
        const quality = extractQuality(cleanQualityText);
        const paheWinLink = downloadLinks.eq(index).attr("href");
        if (kwikUrl && kwikUrl.includes("kwik")) {
          promises.push(
            extractKwik(kwikUrl).then((res) => {
              if (res && res.m3u8 && !seen.has(res.m3u8)) {
                seen.add(res.m3u8);
                streams.push({
                  name: `AnimePahe [${langLabel}] (${quality} HLS)`,
                  title: mediaType === "movie" ? `${animeTitle} (${langLabel})` : `${animeTitle} - Episode ${mappedEp} (${langLabel})`,
                  url: res.m3u8,
                  quality,
                  headers: res.headers,
                  provider: "animepahe",
                  type: "m3u8"
                });
              }
              if (res && res.mp4 && !seen.has(res.mp4)) {
                seen.add(res.mp4);
                streams.push({
                  name: `AnimePahe [${langLabel}] (${quality} MP4)`,
                  title: mediaType === "movie" ? `${animeTitle} (${langLabel})` : `${animeTitle} - Episode ${mappedEp} (${langLabel})`,
                  url: res.mp4,
                  quality,
                  headers: __spreadProps(__spreadValues({}, res.headers), {
                    "Referer": kwikUrl
                  }),
                  provider: "animepahe",
                  type: "mp4"
                });
              }
            }).catch(() => {
            })
          );
        }
        if (paheWinLink && (paheWinLink.includes("pahe.win") || paheWinLink.includes("pahe.me") || paheWinLink.includes("pahe.li") || paheWinLink.includes("kwik"))) {
          promises.push(
            extractPahe(paheWinLink).then((res) => {
              if (res && res.url && !seen.has(res.url)) {
                seen.add(res.url);
                streams.push({
                  name: `AnimePahe [${langLabel}] (${quality} Direct)`,
                  title: mediaType === "movie" ? `${animeTitle} (${langLabel})` : `${animeTitle} - Episode ${mappedEp} (${langLabel})`,
                  url: res.url,
                  quality,
                  headers: res.headers,
                  provider: "animepahe",
                  type: "mp4"
                });
              }
            }).catch(() => {
            })
          );
        }
      });
      yield Promise.all(promises);
      const qualityOrder = { "1080p": 3, "720p": 2, "360p": 1 };
      return streams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));
    } catch (err) {
      console.error(`[AnimePahe] Error in getStreams:`, (err == null ? void 0 : err.message) || err);
      return [];
    }
  });
}
module.exports = { getStreams };
