/**
 * anizone - Built from src/anizone/
 * Generated: 2026-09-23T13:53:42.883Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
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
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

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
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const finalUrl = url.startsWith("http") ? url : `${MAIN_URL}${url}`;
    try {
      const response = yield fetch(finalUrl, __spreadValues({
        headers: HEADERS,
        signal: AbortSignal.timeout(1e4)
      }, options));
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
    const finalUrl = url.startsWith("http") ? url : `${MAIN_URL}${url}`;
    try {
      const response = yield fetch(finalUrl, __spreadValues({
        headers: HEADERS,
        signal: AbortSignal.timeout(1e4)
      }, options));
      if (!response.ok)
        return { text: "", cookies: "", ok: false };
      const text = yield response.text();
      const cookies = response.headers.getSetCookie ? response.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") : response.headers.get("set-cookie") || "";
      return { text, cookies, ok: true };
    } catch (e) {
      return { text: "", cookies: "", ok: false };
    }
  });
}
function getTmdbInfo(tmdbId, mediaType, season = 1) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const res = yield fetch(url, { signal: AbortSignal.timeout(8e3) });
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
          const sRes = yield fetch(sUrl, { signal: AbortSignal.timeout(8e3) });
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
    patterns.push(/season\s*2/i, /2nd\s*season/i, /[\s\-]ii\b/i, /\b2\b/);
  } else if (season === 3) {
    patterns.push(/season\s*3/i, /3rd\s*season/i, /[\s\-]iii\b/i, /\b3\b/);
  } else if (season === 4) {
    patterns.push(/season\s*4/i, /4th\s*season/i, /[\s\-]iv\b/i, /\b4\b/);
  } else {
    patterns.push(new RegExp(`season\\s*${season}`, "i"), new RegExp(`\\b${season}\\b`));
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
  for (const card of cards) {
    for (const title of card.titles) {
      const normTitle = normalize(title);
      const normTitleNoSub = normalize(title.split(":")[0]);
      for (const target of normalizedTargets) {
        const normTargetNoSub = normalize(target.split(":")[0]);
        if (normTitle === target || normTitleNoSub === normTargetNoSub) {
          if (season === 1) {
            const seasonRules2 = getSeasonRegexes(1);
            const hasOtherSeason = card.titles.some((t) => seasonRules2.mustNot.some((r) => r.test(t)));
            if (!hasOtherSeason)
              return card.slug;
          } else {
            return card.slug;
          }
        }
      }
    }
  }
  const seasonRules = getSeasonRegexes(season);
  for (const card of cards) {
    let matchesBase = false;
    for (const title of card.titles) {
      if (normalize(title).includes(normalizedBase) || normalizedBase.includes(normalize(title))) {
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
function getStreams(tmdbId, mediaType = "tv", season = 1, episode = 1) {
  return __async(this, null, function* () {
    var _a, _b, _c;
    try {
      let animeTitle = "";
      let altTitles = [];
      let mappedEp = episode;
      let seasonName = "";
      if (mediaType === "tv") {
        const tmdbInfo = yield getTmdbInfo(tmdbId, mediaType, season);
        if (tmdbInfo) {
          animeTitle = tmdbInfo.title;
          if (tmdbInfo.originalTitle)
            altTitles.push(tmdbInfo.originalTitle);
          seasonName = tmdbInfo.seasonName || "";
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
      if (!animeTitle)
        return [];
      const searchQuery = animeTitle.split(":")[0].trim();
      const searchUrl = `/anime?search=${encodeURIComponent(searchQuery)}&sort=title-asc`;
      const searchHtml = yield fetchText(searchUrl);
      if (!searchHtml)
        return [];
      const $search = import_cheerio_without_node_native.default.load(searchHtml);
      const cards = parseCards(searchHtml, $search);
      if (cards.length === 0)
        return [];
      const targetTitles = [animeTitle, ...altTitles];
      let animeSlug = null;
      if (mediaType === "tv") {
        animeSlug = matchCard(cards, targetTitles, searchQuery, season, seasonName);
      } else {
        animeSlug = matchMovieCard(cards, targetTitles);
      }
      if (!animeSlug)
        return [];
      const episodeUrl = `/anime/${animeSlug}/${mappedEp}`;
      const epResponse = yield fetchWithCookies(episodeUrl);
      if (!epResponse.ok || !epResponse.text)
        return [];
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
              const postRes = yield fetch(`${MAIN_URL}/livewire/update`, {
                method: "POST",
                headers: {
                  "Accept": "*/*",
                  "Content-Type": "application/json",
                  "X-Livewire": "",
                  "X-CSRF-TOKEN": csrfToken,
                  "Origin": MAIN_URL,
                  "Referer": `${MAIN_URL}${episodeUrl}`,
                  "User-Agent": HEADERS["User-Agent"],
                  "Cookie": epResponse.cookies
                },
                body: JSON.stringify(payload)
              });
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
      return streams;
    } catch (error) {
      return [];
    }
  });
}
module.exports = { getStreams };
