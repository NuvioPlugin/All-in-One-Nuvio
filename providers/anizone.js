/**
 * anizone - Built from src/anizone/
 * Generated: 2026-09-25T19:36:47.745Z
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

// src/anizone/index.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/anizone/constants.js
var MAIN_URL = "https://anizone.to";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://anizone.to/"
};
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";

// src/anizone/utils.js
var HEX_ESCAPE = /\\x([0-9a-fA-F]{2})/g;
var INVALID_BACKSLASH = /\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g;
function sanitizeJson(raw) {
  if (!raw)
    return "";
  return raw.replace(/\\u0022/g, '"').replace(/\\u0026/g, "&").replace(/\\'/g, "'").replace(/\\\//g, "/").replace(/\\\\/g, "\\").replace(/\\&/g, "&").replace(/\\'/g, "'").replace(/\\0/g, "\\u0000").replace(HEX_ESCAPE, (_, hex) => "\\u00" + hex).replace(INVALID_BACKSLASH, "");
}
function parseXDataJson(rawArg) {
  const sanitized = sanitizeJson(rawArg);
  return JSON.parse(sanitized);
}
function fetchWithTimeout(_0) {
  return __async(this, arguments, function* (url, options = {}, timeoutMs = 8e3) {
    const mergedHeaders = __spreadValues({
      "User-Agent": HEADERS["User-Agent"],
      "Referer": HEADERS["Referer"]
    }, options.headers || {});
    const fetchOptions = __spreadProps(__spreadValues({
      skipSizeCheck: true
    }, options), {
      headers: mergedHeaders
    });
    if (typeof setTimeout !== "function") {
      return fetch(url, fetchOptions);
    }
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Timeout")), timeoutMs);
    });
    try {
      const res = yield Promise.race([
        fetch(url, fetchOptions),
        timeoutPromise
      ]);
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  });
}
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const finalUrl = url.startsWith("http") ? url : `${MAIN_URL}${url}`;
    try {
      const response = yield fetchWithTimeout(finalUrl, options, 1e4);
      if (!response.ok)
        return "";
      return yield response.text();
    } catch (e) {
      return "";
    }
  });
}
function fetchWithCookies(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    var _a, _b;
    const finalUrl = url.startsWith("http") ? url : `${MAIN_URL}${url}`;
    try {
      const response = yield fetchWithTimeout(finalUrl, options, 1e4);
      if (!response.ok)
        return { text: "", cookies: "", ok: false };
      const text = yield response.text();
      let cookies = "";
      try {
        if (typeof ((_a = response.headers) == null ? void 0 : _a.getSetCookie) === "function") {
          cookies = response.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
        } else if ((_b = response.headers) == null ? void 0 : _b.get) {
          cookies = response.headers.get("set-cookie") || "";
        }
      } catch (_) {
      }
      return { text, cookies, ok: true };
    } catch (e) {
      return { text: "", cookies: "", ok: false };
    }
  });
}
function getImdbId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
      const res = yield fetchWithTimeout(url, {}, 5e3);
      const data = yield res.json();
      return data.imdb_id || null;
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
function resolveMapping(imdbId, season, episode, tmdbId) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    const seasonNum = parseInt(season, 10);
    const episodeNum = parseInt(episode, 10);
    const mapId = `${imdbId}:s${season}:e${episode}`;
    let metaData = null;
    const metaUrls = [
      `https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`,
      `https://cinemeta-live.strem.io/meta/series/${imdbId}.json`
    ];
    for (const url of metaUrls) {
      try {
        const mRes = yield fetchWithTimeout(url, {}, 5e3);
        if (mRes.ok) {
          const text = yield mRes.text();
          const json = JSON.parse(text);
          if ((_a = json == null ? void 0 : json.meta) == null ? void 0 : _a.videos) {
            metaData = json.meta;
            break;
          }
        }
      } catch (_) {
      }
    }
    if ((!metaData || !metaData.videos) && tmdbId) {
      try {
        const tmdbEpUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}/episode/${episodeNum}?api_key=${TMDB_API_KEY}`;
        const tmdbRes = yield fetchWithTimeout(tmdbEpUrl, {}, 5e3);
        if (tmdbRes.ok) {
          const epData = JSON.parse(yield tmdbRes.text());
          if (epData == null ? void 0 : epData.air_date) {
            const tvUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
            const tvRes = yield fetchWithTimeout(tvUrl, {}, 5e3);
            const tvData = tvRes.ok ? JSON.parse(yield tvRes.text()) : {};
            metaData = {
              name: tvData.name || tvData.original_name,
              moviedb_id: tmdbId,
              videos: [{
                season: seasonNum,
                episode: episodeNum,
                released: epData.air_date
              }]
            };
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
          const data = JSON.parse(yield res.text());
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
        const aniData = JSON.parse(yield aniRes.text());
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
          const aniData = JSON.parse(yield aniRes.text());
          const extraTitles = (aniData == null ? void 0 : aniData.titles) ? Object.values(aniData.titles).filter(Boolean) : [];
          if (aniData == null ? void 0 : aniData.episodes) {
            const aniEpisodes = Object.values(aniData.episodes).map((ep) => ({
              mal_episode_number: parseInt(ep.episode, 10),
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
                titles: extraTitles,
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
          const jData = JSON.parse(yield jRes.text());
          if (((_d = (_c = jData == null ? void 0 : jData.data) == null ? void 0 : _c.aired) == null ? void 0 : _d.from) && isDateMatch(jData.data.aired.from, airDate)) {
            finalResult = {
              id: mapId,
              imdb_id: imdbId,
              season: seasonNum,
              episode: episodeNum,
              mal_id: malId,
              mal_episode: dayIndex + 1,
              anime_title: showTitle,
              titles: [jData.data.title, jData.data.title_english, jData.data.title_japanese].filter(Boolean),
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
        titles: [],
        air_date: airDate
      };
    }
    return finalResult;
  });
}
function getMalTitle(malId) {
  return __async(this, null, function* () {
    var _a, _b;
    if (!malId)
      return null;
    try {
      const res = yield fetchWithTimeout(`https://api.jikan.moe/v4/anime/${malId}`, {}, 5e3);
      if (res.ok) {
        const data = yield res.json();
        return ((_a = data.data) == null ? void 0 : _a.title) || ((_b = data.data) == null ? void 0 : _b.title_english) || null;
      }
    } catch (_) {
    }
    return null;
  });
}
function getTmdbInfo(tmdbId, mediaType, season = 1) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const res = yield fetchWithTimeout(url, {}, 6e3);
      if (!res.ok)
        return null;
      const data = yield res.json();
      const info = {
        title: data.name || data.title || data.original_name || data.original_title || "",
        originalTitle: data.original_name || data.original_title || "",
        seasonName: ""
      };
      if (mediaType === "tv" && season) {
        try {
          const sUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?api_key=${TMDB_API_KEY}`;
          const sRes = yield fetchWithTimeout(sUrl, {}, 6e3);
          if (sRes.ok) {
            const sData = yield sRes.json();
            info.seasonName = sData.name || "";
          }
        } catch (e) {
        }
      }
      return info;
    } catch (e) {
      return null;
    }
  });
}

// src/anizone/index.js
function normalize(str) {
  if (!str)
    return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}
function parseCards(html, $) {
  const cards = [];
  const itemsMatch = html.match(/items:\s*JSON\.parse\('((?:[^'\\]|\\.)*)'\)/);
  if (itemsMatch) {
    try {
      const parsed = parseXDataJson(itemsMatch[1]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item || !item.slug)
            continue;
          const titles = /* @__PURE__ */ new Set();
          if (item.main_title)
            titles.add(item.main_title);
          if (item.title_list && typeof item.title_list === "object") {
            Object.values(item.title_list).forEach((t) => {
              if (t)
                titles.add(t);
            });
          }
          cards.push({
            slug: item.slug,
            url: item.url || `/anime/${item.slug}`,
            titles: Array.from(titles)
          });
        }
      }
    } catch (e) {
    }
  }
  if (cards.length === 0) {
    $('[x-data*="anmTitles"]').each((i, el) => {
      const href = $(el).find('a[href*="/anime/"]').first().attr("href");
      if (!href)
        return;
      const parts = href.split("/");
      const slug = parts[parts.length - 1] || parts[parts.length - 2];
      const titles = /* @__PURE__ */ new Set();
      const xData = $(el).attr("x-data") || "";
      const jsonMatch = xData.match(/JSON\.parse\('((?:[^'\\]|\\.)*)'\)/);
      if (jsonMatch) {
        try {
          const parsed = parseXDataJson(jsonMatch[1]);
          Object.values(parsed).forEach((t) => {
            if (t)
              titles.add(t);
          });
        } catch (e) {
        }
      }
      cards.push({ slug, titles: Array.from(titles) });
    });
  }
  return cards;
}
function getSeasonRegexes(season) {
  if (season === 1) {
    return {
      mustNot: [
        /season\s*[2-9]/i,
        /saison\s*[2-9]/i,
        /[\s\-][iI]{2,}/,
        /\s+[2-9]nd/i,
        /\s+[2-9]rd/i,
        /\s+[2-9]th/i,
        /\s+ii\b/i,
        /\s+iii\b/i,
        /\s+iv\b/i,
        /\s+v\b/i,
        /movie/i,
        /gekijouban/i,
        /the movie/i
      ]
    };
  }
  const patterns = [];
  if (season === 2) {
    patterns.push(/season\s*2/i, /saison\s*2/i, /2nd\s*season/i, /[\s\-]ii\b/i, /\b2\b/);
  } else if (season === 3) {
    patterns.push(/season\s*3/i, /saison\s*3/i, /3rd\s*season/i, /[\s\-]iii\b/i, /\b3\b/);
  } else if (season === 4) {
    patterns.push(/season\s*4/i, /saison\s*4/i, /4th\s*season/i, /[\s\-]iv\b/i, /\b4\b/, /final\s*season/i);
  } else {
    patterns.push(new RegExp(`(?:season|saison)\\s*${season}`, "i"), new RegExp(`\\b${season}\\b`));
  }
  return { must: patterns };
}
function matchCard(cards, targetTitles, baseTitle, season = 1, seasonName = "") {
  const normalizedTargets = targetTitles.map(normalize).filter(Boolean);
  const normalizedBase = normalize(baseTitle);
  const normalizedSeasonName = normalize(seasonName);
  if (normalizedSeasonName && normalizedSeasonName !== "season" + season) {
    for (const card of cards) {
      for (const title of card.titles) {
        if (normalize(title).includes(normalizedSeasonName)) {
          return card.slug;
        }
      }
    }
  }
  for (const target of normalizedTargets) {
    for (const card of cards) {
      for (const title of card.titles) {
        if (normalize(title) === target) {
          return card.slug;
        }
      }
    }
  }
  const seasonRules = getSeasonRegexes(season);
  for (const card of cards) {
    let matchesBase = false;
    for (const title of card.titles) {
      const norm = normalize(title);
      if (norm.includes(normalizedBase) || normalizedBase.includes(norm)) {
        matchesBase = true;
        break;
      }
    }
    if (!matchesBase)
      continue;
    let seasonMatches = false;
    if (season === 1) {
      let hasOtherSeason = false;
      for (const title of card.titles) {
        if (seasonRules.mustNot.some((regex) => regex.test(title))) {
          hasOtherSeason = true;
          break;
        }
      }
      if (!hasOtherSeason)
        seasonMatches = true;
    } else {
      for (const title of card.titles) {
        if (seasonRules.must.some((regex) => regex.test(title))) {
          seasonMatches = true;
          break;
        }
      }
    }
    if (seasonMatches)
      return card.slug;
  }
  return cards[0] ? cards[0].slug : null;
}
function matchMovieCard(cards, targetTitles) {
  const normalizedTargets = targetTitles.map(normalize).filter(Boolean);
  for (const card of cards) {
    for (const title of card.titles) {
      const norm = normalize(title);
      if (normalizedTargets.some((t) => t === norm))
        return card.slug;
    }
  }
  for (const card of cards) {
    for (const title of card.titles) {
      const norm = normalize(title);
      if (normalizedTargets.some((t) => norm.includes(t) || t.includes(norm)))
        return card.slug;
    }
  }
  return cards[0] ? cards[0].slug : null;
}
function parseVidstackFromHtml(html, $) {
  const vidMatch = html.match(/vidstackPlayer\(JSON\.parse\('((?:[^'\\]|\\.)*)'\)\)/);
  if (vidMatch) {
    try {
      const data = parseXDataJson(vidMatch[1]);
      const masterUrl2 = data.src ? data.src.replace(/\\/g, "") : null;
      const subtitles2 = (data.subtitles || []).map((s) => ({
        url: s.file ? s.file.replace(/\\/g, "") : "",
        name: s.title || s.language || "English",
        language: s.language || "en"
      })).filter((s) => s.url);
      if (masterUrl2)
        return { masterUrl: masterUrl2, subtitles: subtitles2 };
    } catch (e) {
    }
  }
  let masterUrl = $("media-player").attr("src");
  if (!masterUrl) {
    const urlMatch = html.match(/https:\/\/[^"']+\/master\.m3u8/);
    if (urlMatch)
      masterUrl = urlMatch[0];
  }
  const subtitles = [];
  $("track").each((i, el) => {
    const src = $(el).attr("src");
    const kind = $(el).attr("kind");
    if (src && (kind === "subtitles" || kind === "captions" || src.endsWith(".ass") || src.endsWith(".vtt"))) {
      subtitles.push({
        url: src,
        name: $(el).attr("label") || "English",
        language: $(el).attr("srclang") || "en"
      });
    }
  });
  return { masterUrl, subtitles };
}
function parseAudioFormat(btnText) {
  const lower = btnText.toLowerCase();
  const hasJap = lower.includes("japanese") || lower.includes("jpn") || lower.includes("ja");
  const hasEng = lower.includes("english") || lower.includes("eng") || lower.includes("en");
  if (hasEng && hasJap)
    return "Dual Audio";
  if (hasEng)
    return "Dub";
  if (hasJap)
    return "Sub";
  if (lower.includes("multi"))
    return "Multi-Audio";
  return "Sub";
}
function searchCards(query) {
  return __async(this, null, function* () {
    if (!query)
      return [];
    const searchUrl = `/anime?search=${encodeURIComponent(query)}&sort=title-asc`;
    const searchHtml = yield fetchText(searchUrl);
    if (!searchHtml)
      return [];
    const $search = import_cheerio_without_node_native.default.load(searchHtml);
    return parseCards(searchHtml, $search);
  });
}
function getStreams(tmdbId, mediaType = "tv", season = 1, episode = 1) {
  return __async(this, null, function* () {
    var _a, _b, _c;
    try {
      console.log(`[AniZone] Querying streams for TMDB: ${tmdbId}, Type: ${mediaType}, S${season}E${episode}`);
      let animeTitle = "";
      let altTitles = [];
      let mappedEp = episode;
      let seasonName = "";
      let targetTitles = [];
      if (mediaType === "tv") {
        const imdbId = yield getImdbId(tmdbId, "tv");
        if (imdbId) {
          const mapping = yield resolveMapping(imdbId, season, episode, tmdbId);
          if (mapping) {
            mappedEp = mapping.mal_episode || episode;
            animeTitle = mapping.anime_title || "";
            if (mapping.titles && Array.isArray(mapping.titles)) {
              targetTitles.push(...mapping.titles);
            }
            const malTitle = yield getMalTitle(mapping.mal_id);
            if (malTitle) {
              targetTitles.push(malTitle);
              if (!animeTitle)
                animeTitle = malTitle;
            }
            console.log(`[AniZone] AnimeSync mapped: "${animeTitle}", mappedEp=${mappedEp}`);
          }
        }
        if (!animeTitle) {
          const tmdbInfo = yield getTmdbInfo(tmdbId, mediaType, season);
          if (tmdbInfo) {
            animeTitle = tmdbInfo.title;
            if (tmdbInfo.originalTitle)
              altTitles.push(tmdbInfo.originalTitle);
            seasonName = tmdbInfo.seasonName || "";
          }
        }
      } else {
        const tmdbInfo = yield getTmdbInfo(tmdbId, "movie");
        if (tmdbInfo) {
          animeTitle = tmdbInfo.title;
          if (tmdbInfo.originalTitle)
            altTitles.push(tmdbInfo.originalTitle);
        }
        mappedEp = 1;
      }
      if (!animeTitle && targetTitles.length === 0)
        return [];
      if (!animeTitle && targetTitles.length > 0)
        animeTitle = targetTitles[0];
      const specificTargetTitles = season === 1 || mediaType === "movie" ? [...targetTitles, animeTitle, ...altTitles] : [...targetTitles];
      const baseCleanQuery = animeTitle.split(":")[0].replace(/season.*|\d+nd season|\d+rd season|\d+th season|saison.*/gi, "").trim();
      let cards = yield searchCards(baseCleanQuery);
      if (cards.length === 0 && animeTitle !== baseCleanQuery) {
        cards = yield searchCards(animeTitle.split(":")[0].trim());
      }
      if (cards.length === 0) {
        for (const t of altTitles) {
          const altClean = t.split(":")[0].trim();
          cards = yield searchCards(altClean);
          if (cards.length > 0)
            break;
        }
      }
      if (cards.length === 0)
        return [];
      let animeSlug = null;
      if (mediaType === "tv") {
        animeSlug = matchCard(cards, specificTargetTitles, baseCleanQuery, season, seasonName);
      } else {
        animeSlug = matchMovieCard(cards, specificTargetTitles);
      }
      if (!animeSlug) {
        console.log(`[AniZone] No matching slug found for "${animeTitle}"`);
        return [];
      }
      console.log(`[AniZone] Selected slug: "${animeSlug}", mappedEp=${mappedEp}`);
      const episodeUrl = `/anime/${animeSlug}/${mappedEp}`;
      const epResponse = yield fetchWithCookies(episodeUrl);
      if (!epResponse.ok || !epResponse.text) {
        console.log(`[AniZone] Failed to load episode page: ${episodeUrl}`);
        return [];
      }
      const epHtml = epResponse.text;
      const $ep = import_cheerio_without_node_native.default.load(epHtml);
      const streams = [];
      const defaultStream = parseVidstackFromHtml(epHtml, $ep);
      const serverButtons = $ep('button[wire\\:click*="setVideo"]');
      let defaultFormat = "Sub";
      let defaultServerName = "AniZone";
      if (serverButtons.length > 0) {
        const firstBtn = serverButtons.first();
        const btnText = firstBtn.text().replace(/\s+/g, " ").trim();
        defaultFormat = parseAudioFormat(btnText);
        const nameMatch = btnText.match(/^([A-Za-z0-9_-]+)/);
        if (nameMatch)
          defaultServerName = nameMatch[1];
      }
      if (defaultStream.masterUrl) {
        streams.push({
          name: "AniZone",
          title: `${animeTitle} - Episode ${mappedEp} [${defaultServerName} - ${defaultFormat}]`,
          url: defaultStream.masterUrl,
          quality: "Multi",
          headers: HEADERS,
          subtitles: defaultStream.subtitles
        });
      }
      if (serverButtons.length > 1) {
        const csrfToken = $ep("script[data-csrf]").attr("data-csrf");
        const snapshotEl = $ep("main > div[wire\\:snapshot], main > ul[wire\\:snapshot], [wire\\:snapshot]");
        const snapshot = snapshotEl.attr("wire:snapshot");
        if (csrfToken && snapshot && epResponse.cookies) {
          for (let i = 1; i < serverButtons.length; i++) {
            const btn = serverButtons.eq(i);
            const clickAttr = btn.attr("wire:click") || "";
            const vMatch = clickAttr.match(/setVideo\((\d+)\)/);
            if (!vMatch)
              continue;
            const videoId = parseInt(vMatch[1], 10);
            const btnText = btn.text().replace(/\s+/g, " ").trim();
            const sFormat = parseAudioFormat(btnText);
            const nameMatch = btnText.match(/^([A-Za-z0-9_-]+)/);
            const sName = nameMatch ? nameMatch[1] : `Server ${i + 1}`;
            try {
              const payload = {
                _token: csrfToken,
                components: [
                  {
                    snapshot,
                    updates: {},
                    calls: [{ path: "", method: "setVideo", params: [videoId] }]
                  }
                ]
              };
              const postRes = yield fetchWithTimeout(`${MAIN_URL}/livewire/update`, {
                method: "POST",
                headers: {
                  "Accept": "*/*",
                  "Content-Type": "application/json",
                  "X-Livewire": "",
                  "X-CSRF-TOKEN": csrfToken,
                  "Origin": MAIN_URL,
                  "Referer": `${MAIN_URL}${episodeUrl}`,
                  "Cookie": epResponse.cookies
                },
                body: JSON.stringify(payload)
              }, 8e3);
              if (postRes.ok) {
                const postData = yield postRes.json();
                const liveHtml = (_c = (_b = (_a = postData.components) == null ? void 0 : _a[0]) == null ? void 0 : _b.effects) == null ? void 0 : _c.html;
                if (liveHtml) {
                  const $live = import_cheerio_without_node_native.default.load(liveHtml);
                  const extraStream = parseVidstackFromHtml(liveHtml, $live);
                  if (extraStream.masterUrl && extraStream.masterUrl !== defaultStream.masterUrl) {
                    streams.push({
                      name: "AniZone",
                      title: `${animeTitle} - Episode ${mappedEp} [${sName} - ${sFormat}]`,
                      url: extraStream.masterUrl,
                      quality: "Multi",
                      headers: HEADERS,
                      subtitles: extraStream.subtitles.length > 0 ? extraStream.subtitles : defaultStream.subtitles
                    });
                  }
                }
              }
            } catch (e) {
            }
          }
        }
      }
      console.log(`[AniZone] Total streams found: ${streams.length}`);
      return streams;
    } catch (error) {
      console.log(`[AniZone] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
