/**
 * reanime - Built from src/reanime/
 * Generated: 2026-09-21T13:43:14.525Z
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

// src/reanime/reanime.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/reanime/constants.js
var REANIME_DOMAINS = [
  "https://reanime.to",
  "https://reanime.cz",
  "https://reanime.wtf"
];
var REANIME_BASE = "https://reanime.to";
var FLIXCLOUD_BASE = "https://flixcloud.cc";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var ANILIST_URL = "https://graphql.anilist.co";
var ARM_BASE = "https://arm.haglund.dev/api/v2";
var CINEMETA_URL = "https://v3-cinemeta.strem.io/meta";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9"
};
var FLIX_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "*/*",
  "Origin": FLIXCLOUD_BASE,
  "Referer": `${FLIXCLOUD_BASE}/`
};

// src/reanime/reanime.js
var activeBaseUrl = REANIME_BASE;
function absolutize(path, base = activeBaseUrl) {
  if (!path)
    return "";
  if (path.startsWith("http"))
    return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const isAbsolute = url.startsWith("http");
    const urlsToTry = isAbsolute ? [url] : REANIME_DOMAINS.map((domain) => absolutize(url, domain));
    let lastError = null;
    for (const tryUrl of urlsToTry) {
      try {
        const response = yield fetch(tryUrl, __spreadProps(__spreadValues({}, options), {
          headers: __spreadValues(__spreadValues({}, HEADERS), options.headers || {})
        }));
        if (response.ok) {
          if (!isAbsolute) {
            const match = tryUrl.match(/^(https?:\/\/[^\/]+)/);
            if (match)
              activeBaseUrl = match[1];
          }
          return yield response.text();
        }
        lastError = new Error(`Reanime HTTP ${response.status}: ${tryUrl}`);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error(`Failed to fetch: ${url}`);
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const text = yield fetchText(url, __spreadProps(__spreadValues({}, options), {
      headers: __spreadValues({
        "Accept": "application/json, text/plain, */*"
      }, options.headers || {})
    }));
    return JSON.parse(text);
  });
}
function getTmdbInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    try {
      const data = yield fetchJson(url);
      return {
        title: data.name || data.title || data.original_name || data.original_title || "",
        year: ((data.first_air_date || data.release_date || "").match(/\d{4}/) || [null])[0],
        imdbId: data.external_ids && data.external_ids.imdb_id
      };
    } catch (_) {
      return { title: "", year: null, imdbId: null };
    }
  });
}
function getAnilistInfo(alId) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d, _e;
    const query = "query($id:Int){Media(id:$id){id title{english romaji native} startDate{year}}}";
    try {
      const json = yield fetchJson(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { id: parseInt(alId, 10) } })
      });
      const media = (_a = json.data) == null ? void 0 : _a.Media;
      if (!media)
        return { title: "", year: null };
      return {
        title: ((_b = media.title) == null ? void 0 : _b.english) || ((_c = media.title) == null ? void 0 : _c.romaji) || ((_d = media.title) == null ? void 0 : _d.native) || "",
        year: ((_e = media.startDate) == null ? void 0 : _e.year) || null
      };
    } catch (_) {
      return { title: "", year: null };
    }
  });
}
function getSyncInfo(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    const isImdb = typeof id === "string" && id.indexOf("tt") === 0;
    const getCinemetaInfo = (imdbId2) => __async(this, null, function* () {
      const type = mediaType === "movie" ? "movie" : "series";
      const url = `${CINEMETA_URL}/${type}/${imdbId2}.json`;
      try {
        const data = yield fetchJson(url);
        const meta = data.meta;
        if (!meta)
          throw new Error("No Cinemeta metadata");
        if (mediaType === "movie")
          return { date: meta.released ? meta.released.split("T")[0] : null, title: meta.name, dayIndex: 1 };
        const videos = meta.videos || [];
        const target = videos.find((v) => v.season == season && v.episode == episode);
        if (!target || !target.released)
          return { date: null, title: null, dayIndex: 1 };
        const targetDate = target.released.split("T")[0];
        const dayIndex = videos.filter((v) => v.season == season && v.released && v.released.split("T")[0] === targetDate && parseInt(v.episode) < parseInt(episode)).length + 1;
        return { date: targetDate, title: target.name || null, dayIndex };
      } catch (_) {
        return { date: null, title: null, dayIndex: 1 };
      }
    });
    if (isImdb) {
      const info = yield getCinemetaInfo(id);
      if (info.date)
        return { imdbId: id, releaseDate: info.date, episodeTitle: info.title, dayIndex: info.dayIndex, episode };
      throw new Error("Could not find release date on Cinemeta");
    }
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === "movie" ? "movie" : "tv"}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const details = yield fetchJson(tmdbUrl);
    let imdbId = details.external_ids && details.external_ids.imdb_id || details.imdb_id || null;
    const title = details.name || details.title || null;
    if (!imdbId) {
      try {
        const armData = yield fetchJson(`${ARM_BASE}/themoviedb?id=${id}`);
        imdbId = Array.isArray(armData) && armData.length > 0 ? armData[0].imdb : null;
      } catch (_) {
      }
    }
    if (!imdbId)
      throw new Error(`No IMDb ID found for TMDB ${id}`);
    const cMeta = yield getCinemetaInfo(imdbId);
    let finalDate = cMeta.date;
    if (mediaType === "movie" && details.release_date)
      finalDate = details.release_date;
    if (!finalDate)
      throw new Error(`Could not find release date for ID ${imdbId}`);
    return {
      imdbId,
      tmdbId: id,
      releaseDate: finalDate,
      title,
      episodeTitle: cMeta.title,
      dayIndex: cMeta.dayIndex,
      episode
    };
  });
}
function resolveByDate(releaseDateStr, showTitle, originalEpisode, episodeTitle, dayIndex) {
  return __async(this, null, function* () {
    var _a, _b;
    if (!releaseDateStr || !/^\d{4}-\d{2}-\d{2}/.test(releaseDateStr))
      return null;
    const query = "query($search:String){Page(perPage:20){media(search:$search,type:ANIME){id type format title{romaji english native}startDate{year month day}endDate{year month day}episodes streamingEpisodes{title}}}}";
    try {
      const json = yield fetchJson(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { search: showTitle } })
      });
      const candidates = ((_b = (_a = json.data) == null ? void 0 : _a.Page) == null ? void 0 : _b.media) || [];
      if (candidates.length === 0)
        return null;
      const targetDate = new Date(releaseDateStr);
      for (const anime of candidates) {
        const s = anime.startDate;
        const startStr = s.year && s.month && s.day ? `${s.year}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}` : null;
        if (!startStr)
          continue;
        const startDate = new Date(startStr);
        const diffDays = Math.ceil(Math.abs(targetDate.getTime() - startDate.getTime()) / (1e3 * 60 * 60 * 24));
        let isMatch = false;
        if (anime.format === "MOVIE" || anime.format === "SPECIAL" || anime.episodes === 1) {
          if (diffDays <= 2)
            isMatch = true;
        } else {
          const startLimit = new Date(startDate);
          startLimit.setDate(startLimit.getDate() - 2);
          if (targetDate >= startLimit) {
            if (anime.endDate && anime.endDate.year) {
              const endDate = new Date(anime.endDate.year, (anime.endDate.month || 12) - 1, anime.endDate.day || 31);
              endDate.setDate(endDate.getDate() + 2);
              if (targetDate <= endDate)
                isMatch = true;
            } else {
              isMatch = true;
            }
          }
        }
        if (isMatch) {
          const isTV = anime.format !== "MOVIE" && anime.format !== "SPECIAL" && anime.episodes !== 1;
          let episodeNum = isTV && originalEpisode ? originalEpisode : dayIndex || 1;
          const episodes = anime.streamingEpisodes || [];
          if (episodes.length > 1 && episodeTitle) {
            const cleanTarget = episodeTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
            for (let j = 0; j < episodes.length; j++) {
              const cleanAl = (episodes[j].title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              if (cleanAl && (cleanAl.indexOf(cleanTarget) !== -1 || cleanTarget.indexOf(cleanAl) !== -1)) {
                episodeNum = j + 1;
                break;
              }
            }
          }
          return { alId: anime.id, episode: episodeNum, title: anime.title.english || anime.title.romaji || anime.title.native };
        }
      }
    } catch (_) {
    }
    return null;
  });
}
function normalizeTitle(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function scoreCandidate(title, query, year, targetAnilistId, candidateAnilistId) {
  if (targetAnilistId && candidateAnilistId && String(targetAnilistId) === String(candidateAnilistId)) {
    return 1e3;
  }
  const a = normalizeTitle(title);
  const b = normalizeTitle(query);
  if (!a || !b)
    return 0;
  let score = 0;
  if (a === b)
    score += 100;
  if (a.includes(b) || b.includes(a))
    score += 50;
  const words = b.split(/\s+/).filter(Boolean);
  for (const word of words)
    if (a.includes(word))
      score += 4;
  if (year && String(title).includes(String(year)))
    score += 10;
  return score;
}
function extractAnilistId(item) {
  var _a, _b, _c;
  const direct = item && (item.anilist_id || item.anilistId);
  if (direct)
    return String(direct);
  const imageUrls = [
    (_a = item == null ? void 0 : item.cover_image) == null ? void 0 : _a.extra_large,
    (_b = item == null ? void 0 : item.cover_image) == null ? void 0 : _b.large,
    (_c = item == null ? void 0 : item.cover_image) == null ? void 0 : _c.medium,
    item == null ? void 0 : item.banner_image
  ].filter(Boolean);
  for (const url of imageUrls) {
    const match = String(url).match(/\/b?x?(\d+)-|\/(\d+)[-.]/);
    if (match)
      return match[1] || match[2];
  }
  return null;
}
function searchReanimeAnime(query, year, targetAnilistId = null) {
  return __async(this, null, function* () {
    const endpoints = [
      `/api/v1/search?q=${encodeURIComponent(query)}&limit=36`,
      `/api/search?q=${encodeURIComponent(query)}`
    ];
    const candidates = [];
    for (const endpoint of endpoints) {
      try {
        const text = yield fetchText(endpoint);
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          const json = JSON.parse(text);
          const list = json.results || json.data || json.anime || (Array.isArray(json) ? json : null);
          if (Array.isArray(list)) {
            list.forEach((item) => {
              const rawSlug = item.anime_id || item.slug || item.id || item.url;
              if (rawSlug) {
                const cleanSlug = String(rawSlug).replace(/-[a-z0-9]{6}$/, "");
                const titles = [];
                if (typeof item.title === "object" && item.title) {
                  if (item.title.english)
                    titles.push(item.title.english);
                  if (item.title.romaji)
                    titles.push(item.title.romaji);
                  if (item.title.native)
                    titles.push(item.title.native);
                } else if (item.title) {
                  titles.push(item.title);
                }
                if (item.name)
                  titles.push(item.name);
                if (titles.length === 0)
                  titles.push(cleanSlug);
                const alId = extractAnilistId(item);
                let bestScore = 0;
                for (const t of titles) {
                  const sc = scoreCandidate(t, query, year, targetAnilistId, alId);
                  if (sc > bestScore)
                    bestScore = sc;
                }
                candidates.push({
                  slug: String(rawSlug),
                  cleanSlug,
                  title: titles[0],
                  anilistId: alId,
                  score: bestScore
                });
              }
            });
          }
        }
      } catch (_) {
      }
      if (candidates.some((c) => c.score >= 1e3))
        break;
      if (candidates.length > 0 && !targetAnilistId)
        break;
    }
    const unique = [];
    const seen = /* @__PURE__ */ new Set();
    for (const candidate of candidates) {
      if (!candidate.slug || seen.has(candidate.slug))
        continue;
      seen.add(candidate.slug);
      unique.push(candidate);
    }
    unique.sort((a, b) => b.score - a.score);
    return unique.length > 0 ? unique[0] : null;
  });
}
function getFlixEmbeds(slug, episodeNumber, language, anilistId) {
  return __async(this, null, function* () {
    const watchPath = `/watch/${slug || "anime"}?ep=${episodeNumber}`;
    if (anilistId) {
      try {
        const flixUrl = `/api/flix/${anilistId}/${episodeNumber}`;
        const json = yield fetchJson(flixUrl, {
          headers: { "Referer": absolutize(watchPath) }
        });
        if (json.success && Array.isArray(json.servers) && json.servers.length > 0) {
          const filtered = language ? json.servers.filter((s) => s.dataType && s.dataType.toLowerCase() === language.toLowerCase()) : json.servers;
          return {
            watchUrl: absolutize(watchPath),
            servers: filtered,
            embeds: filtered.map((s) => s.dataLink).filter(Boolean)
          };
        }
      } catch (_) {
      }
    }
    if (slug) {
      try {
        const animeApiUrl = `/api/v1/anime/${slug}`;
        const animeData = yield fetchJson(animeApiUrl);
        const alId = animeData == null ? void 0 : animeData.anilist_id;
        if (alId) {
          const flixUrl = `/api/flix/${alId}/${episodeNumber}`;
          const json = yield fetchJson(flixUrl, {
            headers: { "Referer": absolutize(watchPath) }
          });
          if (json.success && Array.isArray(json.servers) && json.servers.length > 0) {
            const filtered = language ? json.servers.filter((s) => s.dataType && s.dataType.toLowerCase() === language.toLowerCase()) : json.servers;
            return {
              watchUrl: absolutize(watchPath),
              servers: filtered,
              embeds: filtered.map((s) => s.dataLink).filter(Boolean)
            };
          }
        }
      } catch (_) {
      }
      try {
        const html = yield fetchText(`/anime/${slug}?_ep=${episodeNumber}`);
        const anilistMatch = html.match(/anilist_id:\s*(\d+)/);
        if (anilistMatch) {
          const alId = anilistMatch[1];
          const flixUrl = `/api/flix/${alId}/${episodeNumber}`;
          const json = yield fetchJson(flixUrl, {
            headers: { "Referer": absolutize(watchPath) }
          });
          if (json.success && Array.isArray(json.servers) && json.servers.length > 0) {
            const filtered = language ? json.servers.filter((s) => s.dataType && s.dataType.toLowerCase() === language.toLowerCase()) : json.servers;
            return {
              watchUrl: absolutize(watchPath),
              servers: filtered,
              embeds: filtered.map((s) => s.dataLink).filter(Boolean)
            };
          }
        }
      } catch (_) {
      }
    }
    return { watchUrl: absolutize(watchPath), servers: [], embeds: [] };
  });
}

// src/reanime/flixcloud.js
function extractFlixCloudDownload(embedUrl) {
  return __async(this, null, function* () {
    try {
      const match = embedUrl.match(/\/e\/([a-z0-9]+)/i);
      const aid = match ? match[1] : null;
      if (!aid)
        return null;
      const dlHeaders = {
        "Accept": "*/*",
        "Referer": `${FLIXCLOUD_BASE}/`,
        "User-Agent": USER_AGENT
      };
      const res = yield fetch(`${FLIXCLOUD_BASE}/d/${aid}/__data.json`, {
        headers: dlHeaders
      });
      if (!res.ok)
        return null;
      const dataBody = yield res.text();
      const fileIdMatch = dataBody.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const tokenMatch = dataBody.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);
      const baseMatch = dataBody.match(/https:\/\/[a-z0-9-]+\.flixcloud\.cc/i);
      const resolutionMatch = dataBody.match(/(\d{3,4}p)/);
      const sizeMatch = dataBody.match(/"(\d+(?:\.\d+)?\s*[KMG]B)"/i);
      const fileId = fileIdMatch ? fileIdMatch[0] : null;
      const token = tokenMatch ? tokenMatch[0] : null;
      const base = baseMatch ? baseMatch[0] : FLIXCLOUD_BASE;
      const resolution = resolutionMatch ? resolutionMatch[1] : null;
      const size = sizeMatch ? sizeMatch[1] : "Unknown";
      if (!fileId || !token)
        return null;
      let ready = false;
      try {
        const progRes = yield fetch(`${base}/download/${fileId}/progress?token=${token}`, {
          headers: dlHeaders
        });
        if (progRes.ok) {
          const text = yield progRes.text();
          if (text.includes('"status":"ready"') || text.includes('"ready"')) {
            ready = true;
          }
        }
      } catch (_) {
      }
      const fileUrl = `${base}/download/${fileId}?token=${token}`;
      return {
        url: fileUrl,
        quality: resolution || "1080p",
        size,
        type: "mkv",
        headers: dlHeaders,
        ready
      };
    } catch (_) {
      return null;
    }
  });
}

// src/reanime/index.js
function getStreams(tmdbId, mediaType = "tv", season = null, episode = null) {
  return __async(this, null, function* () {
    try {
      if (mediaType !== "tv" && mediaType !== "movie")
        return [];
      let alId = null;
      let episodeNumber = mediaType === "tv" ? Number(episode || 1) : 1;
      let searchTitle = "";
      let searchYear = null;
      if (typeof tmdbId === "string" && tmdbId.indexOf("anilist:") === 0) {
        alId = tmdbId.split(":")[1];
      } else {
        try {
          const syncInfo = yield getSyncInfo(tmdbId, mediaType, season, episodeNumber);
          searchTitle = syncInfo.title;
          if (syncInfo.releaseDate) {
            searchYear = syncInfo.releaseDate.substring(0, 4);
          }
          const syncResult = yield resolveByDate(syncInfo.releaseDate, syncInfo.title, episodeNumber, syncInfo.episodeTitle, syncInfo.dayIndex);
          if (syncResult && syncResult.alId) {
            alId = String(syncResult.alId);
            episodeNumber = syncResult.episode;
            searchTitle = syncResult.title;
          }
        } catch (_) {
        }
        if (!searchTitle || !searchYear) {
          try {
            const tmdb = yield getTmdbInfo(tmdbId, mediaType);
            if (!searchTitle)
              searchTitle = tmdb.title;
            if (!searchYear)
              searchYear = tmdb.year;
          } catch (_) {
          }
        }
      }
      const serversByLang = {};
      let watchUrl = "";
      if (alId) {
        for (const lang of ["sub", "dub"]) {
          try {
            const res = yield getFlixEmbeds(null, episodeNumber, lang, alId);
            if (res.servers && res.servers.length > 0) {
              serversByLang[lang] = res.servers;
              if (res.watchUrl)
                watchUrl = res.watchUrl;
            }
          } catch (_) {
          }
        }
      }
      if (Object.keys(serversByLang).length === 0) {
        if (!searchTitle && alId) {
          const alInfo = yield getAnilistInfo(alId);
          searchTitle = alInfo.title;
          searchYear = alInfo.year;
        }
        if (searchTitle) {
          const anime = yield searchReanimeAnime(searchTitle, searchYear, alId);
          if (anime) {
            const slug = anime.slug;
            const finalAlId = alId || anime.anilistId;
            for (const lang of ["sub", "dub"]) {
              try {
                const res = yield getFlixEmbeds(slug, episodeNumber, lang, finalAlId);
                if (res.servers && res.servers.length > 0) {
                  serversByLang[lang] = res.servers;
                  if (res.watchUrl)
                    watchUrl = res.watchUrl;
                }
              } catch (_) {
              }
            }
          }
        }
      }
      if (Object.keys(serversByLang).length === 0)
        return [];
      const streams = [];
      const seen = /* @__PURE__ */ new Set();
      const tasks = [];
      for (const language of ["sub", "dub"]) {
        const serverList = serversByLang[language] || [];
        for (let i = 0; i < serverList.length; i++) {
          const server = serverList[i];
          const dataLink = server.dataLink;
          if (!dataLink)
            continue;
          const serverName = server.serverName || `HD-${i + 1}`;
          const langUpper = language.toUpperCase();
          const displayTitle = searchTitle || "Anime";
          const streamTitle = mediaType === "movie" ? `${displayTitle} (${langUpper})` : `${displayTitle} - Episode ${episodeNumber} (${langUpper})`;
          tasks.push((() => __async(this, null, function* () {
            try {
              const directDl = yield extractFlixCloudDownload(dataLink);
              if (directDl && directDl.url) {
                return {
                  name: `Reanime [${langUpper}] ${serverName} (${directDl.quality || "1080p"})`,
                  title: streamTitle,
                  url: directDl.url,
                  quality: directDl.quality || "1080p",
                  size: directDl.size || "Unknown",
                  headers: directDl.headers,
                  provider: "reanime",
                  type: "mkv"
                };
              }
            } catch (_) {
            }
            return null;
          }))());
        }
      }
      const results = yield Promise.all(tasks);
      for (const res of results) {
        if (res && res.url && !seen.has(res.name)) {
          seen.add(res.name);
          streams.push(res);
        }
      }
      const qualityRank = {
        "auto": 4e3,
        "adaptive": 4e3,
        "2160p": 2160,
        "4k": 2160,
        "1080p": 1080,
        "720p": 720,
        "480p": 480,
        "360p": 360,
        "unknown": 0
      };
      streams.sort((a, b) => {
        var _a, _b;
        const qa = qualityRank[(_a = a.quality) == null ? void 0 : _a.toLowerCase()] || 0;
        const qb = qualityRank[(_b = b.quality) == null ? void 0 : _b.toLowerCase()] || 0;
        return qb - qa;
      });
      return streams;
    } catch (error) {
      console.error(`[Reanime] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
