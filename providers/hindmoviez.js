/**
 * hindmoviez - Built from src/hindmoviez/
 * Generated: 2026-09-21T12:18:17.923Z
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

// src/hindmoviez/extractor.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/hindmoviez/http.js
var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
var DOMAIN_CACHE_TTL = 4 * 60 * 60 * 1e3;
var MAIN_URL = "https://hindmovie.dev";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${MAIN_URL}/`
};
var domainCacheTimestamp = 0;
function ensureDomain() {
  return __async(this, null, function* () {
    const now = Date.now();
    if (now - domainCacheTimestamp < DOMAIN_CACHE_TTL)
      return;
    try {
      const response = yield fetch(DOMAINS_URL, {
        method: "GET",
        headers: { "User-Agent": HEADERS["User-Agent"] }
      });
      if (response.ok) {
        const data = yield response.json();
        if (data && data.hindmoviez) {
          MAIN_URL = data.hindmoviez.replace(/\/+$/, "");
          HEADERS.Referer = `${MAIN_URL}/`;
          domainCacheTimestamp = now;
        }
      }
    } catch (e) {
    }
  });
}
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    console.log(`[Hindmoviez] Fetching: ${url}`);
    const response = yield fetch(url, __spreadProps(__spreadValues({}, options), {
      headers: __spreadValues(__spreadValues({}, HEADERS), options.headers),
      cfKiller: true
    }));
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`);
    return yield response.text();
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    console.log(`[Hindmoviez] Fetching JSON: ${url}`);
    const response = yield fetch(url, __spreadProps(__spreadValues({}, options), {
      headers: __spreadValues(__spreadValues({}, HEADERS), options.headers),
      cfKiller: true
    }));
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`);
    return yield response.json();
  });
}

// src/hindmoviez/utils.js
var import_crypto_js = __toESM(require("crypto-js"));
var SECRET = "5e96085c56e0f54eda657790ac58d19b271479c504367fc9e6a6c33f1f824e6b";
function extractSpecs(inputString) {
  const results = {
    quality: [],
    codec: [],
    audio: [],
    hdr: [],
    language: [],
    size: []
  };
  const options = {
    quality: ["BluRay", "BluRay REMUX", "BRRip", "BDRip", "WEB-DL", "HDRip", "DVDRip", "HDTV", "CAM", "TeleSync", "SCR", "10bit", "8bit"],
    codec: ["x264", "x265", "h.264", "h.265", "hevc", "avc", "mpeg-2", "mpeg-4", "vp9"],
    audio: ["AAC", "AC3", "DTS", "DTS-HD MA", "TrueHD", "Atmos", "DD+", "Dolby Digital Plus", "DTS Lossless"],
    hdr: ["DV", "HDR10+", "HDR", "SDR"],
    language: [
      { v: "HIN", l: "Hindi\u{1F1EE}\u{1F1F3}" },
      { v: "Hindi", l: "Hindi\u{1F1EE}\u{1F1F3}" },
      { v: "Tamil", l: "Tamil\u{1F1EE}\u{1F1F3}" },
      { v: "ENG", l: "English\u{1F1FA}\u{1F1F8}" },
      { v: "English", l: "English\u{1F1FA}\u{1F1F8}" },
      { v: "Korean", l: "Korean\u{1F1F0}\u{1F1F7}" },
      { v: "KOR", l: "Korean\u{1F1F0}\u{1F1F7}" },
      { v: "Japanese", l: "Japanese\u{1F1EF}\u{1F1F5}" },
      { v: "Chinese", l: "Chinese\u{1F1E8}\u{1F1F3}" },
      { v: "Telugu", l: "Telugu\u{1F1EE}\u{1F1F3}" }
    ]
  };
  for (const [category, optList] of Object.entries(options)) {
    for (const opt of optList) {
      const val = typeof opt === "string" ? opt : opt.v;
      const label = typeof opt === "string" ? opt : opt.l;
      const regex = new RegExp(`\\b${val}\\b`, "i");
      if (regex.test(inputString)) {
        results[category].push(label);
      }
    }
  }
  const sizeRegex = /(\d+(?:\.\d+)?\s?(?:MB|GB))/i;
  const sizeMatch = inputString.match(sizeRegex);
  if (sizeMatch) {
    results.size.push(sizeMatch[1]);
  }
  return results;
}
function buildExtractedTitle(extracted) {
  var _a;
  const orderedCategories = ["quality", "codec", "audio", "hdr", "language"];
  const specs = orderedCategories.flatMap((cat) => extracted[cat] || []).filter((v, i, a) => a.indexOf(v) === i).join(" ");
  const size = (_a = extracted.size) == null ? void 0 : _a[0];
  return size ? `${specs} [${size}]` : specs;
}
function base64Url(input) {
  return import_crypto_js.default.enc.Base64.stringify(import_crypto_js.default.enc.Utf8.parse(input)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function hmacSha256(key, data) {
  return import_crypto_js.default.HmacSHA256(data, key).toString(import_crypto_js.default.enc.Hex).substring(0, 16);
}
function signHShare(rawId, domain) {
  const t = Math.floor(Date.now() / 1e3);
  const encoded = base64Url(rawId);
  const s = hmacSha256(SECRET, `${encoded}|${t}`);
  return `${domain}/r.php?d=${encodeURIComponent(encoded)}&t=${t}&s=${s}`;
}
function getIndexQuality(str) {
  const match = (str || "").match(/(\d{3,4})[pP]/);
  return match ? parseInt(match[1]) : 0;
}

// src/hindmoviez/extractor.js
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
function extractGdshine(url) {
  return __async(this, null, function* () {
    try {
      const id = url.split("/").pop();
      const fileData = yield fetchJson(`https://gdshine.org/api/files/s/${id}`);
      const workerData = yield fetchJson(`https://gdshine.org/api/downloads/${fileData.data.id}/via-worker`, {
        method: "POST"
      });
      return {
        url: workerData.data.copyUrl,
        name: fileData.data.name
      };
    } catch (e) {
      console.error(`[Hindmoviez] Gdshine extraction failed: ${e.message}`);
      return null;
    }
  });
}
function getHShareLinks(url) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(url);
      const $ = import_cheerio_without_node_native.default.load(html);
      const links = [];
      $("div.entry-content a").each((i, el) => {
        const text = $(el).text();
        if (text.includes("Get Links")) {
          const href = $(el).attr("href");
          if (href && href.includes("/?id=")) {
            const baseUrl = href.split("/?id=")[0];
            const rawId = href.split("id=")[1];
            links.push(signHShare(rawId, baseUrl));
          }
        }
      });
      return links;
    } catch (e) {
      console.error(`[Hindmoviez] HShare resolution failed: ${e.message}`);
      return [];
    }
  });
}
function resolveDirectStreams(signedUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(signedUrl);
      const $ = import_cheerio_without_node_native.default.load(html);
      const name = $("div.container p:contains(Name:)").text().replace("Name:", "").trim();
      const size = $("div.container p:contains(Size:)").text().replace("Size:", "").trim();
      const specs = buildExtractedTitle(extractSpecs(name));
      const labelExtras = `[${specs}] [${size}]`;
      const streams = [];
      const btnUrls = [];
      $("a.btn").each((i, el) => {
        const href = $(el).attr("href");
        if (href)
          btnUrls.push(href);
      });
      for (const btnUrl of btnUrls) {
        if (btnUrl.includes("gdshine")) {
          const extracted = yield extractGdshine(btnUrl);
          if (extracted) {
            streams.push({
              name: "Gdshine",
              title: `${extracted.name} ${labelExtras}`,
              url: extracted.url,
              quality: (getIndexQuality(extracted.name) || 720) + "p"
            });
          }
        } else {
          try {
            const btnHtml = yield fetchText(btnUrl);
            const btn$ = import_cheerio_without_node_native.default.load(btnHtml);
            const quality = (getIndexQuality(btn$("div.container h2").text()) || 720) + "p";
            btn$("a.button").each((j, linkEl) => {
              const href = btn$(linkEl).attr("href");
              if (href) {
                streams.push({
                  name: "HCloud",
                  title: `${btn$(linkEl).text()} ${labelExtras}`,
                  url: href,
                  quality,
                  headers: { "Referer": btnUrl }
                });
              }
            });
          } catch (e) {
            console.warn(`[Hindmoviez] Failed to resolve button link ${btnUrl}: ${e.message}`);
          }
        }
      }
      return streams;
    } catch (e) {
      console.error(`[Hindmoviez] Direct stream resolution failed: ${e.message}`);
      return [];
    }
  });
}
function extractStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      yield ensureDomain();
      const info = yield fetchJson(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`);
      const title = info.title || info.name;
      const year = (info.release_date || info.first_air_date || "").split("-")[0];
      const searchUrl = `${MAIN_URL}/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield fetchText(searchUrl);
      const search$ = import_cheerio_without_node_native.default.load(searchHtml);
      let pageUrl = null;
      search$("article").each((i, el) => {
        const entryTitle = search$(el).find("h2.entry-title a").text();
        if (entryTitle.toLowerCase().includes(title.toLowerCase())) {
          if (year && entryTitle.includes(year)) {
            pageUrl = search$(el).find("h2.entry-title a").attr("href");
            return false;
          }
          if (!pageUrl)
            pageUrl = search$(el).find("h2.entry-title a").attr("href");
        }
      });
      if (!pageUrl) {
        console.warn(`[Hindmoviez] No matching page found for ${title}`);
        return [];
      }
      const docHtml = yield fetchText(pageUrl);
      const doc$ = import_cheerio_without_node_native.default.load(docHtml);
      const allStreams = [];
      if (mediaType === "movie") {
        const hShareUrls = [];
        const maxbuttons = [];
        doc$("a.maxbutton").each((i, el) => {
          const href = doc$(el).attr("href");
          if (href)
            maxbuttons.push(href);
        });
        for (const listUrl of maxbuttons) {
          const links = yield getHShareLinks(listUrl);
          hShareUrls.push(...links);
        }
        const results = yield Promise.all(hShareUrls.map((url) => resolveDirectStreams(url)));
        allStreams.push(...results.flat());
      } else {
        let seasonUrl = null;
        doc$("h3").each((i, el) => {
          const h3Text = doc$(el).text();
          if (h3Text.toLowerCase().includes(`season ${season}`)) {
            const nextP = doc$(el).next("p");
            seasonUrl = nextP.find("a").attr("href");
            return false;
          }
        });
        if (seasonUrl) {
          const seasonHtml = yield fetchText(seasonUrl);
          const season$ = import_cheerio_without_node_native.default.load(seasonHtml);
          const episodeHShareUrls = [];
          season$("h3 > a").each((i, el) => {
            const epText = season$(el).text();
            if (epText.toLowerCase().includes(`episode ${episode}`)) {
              const href = season$(el).attr("href");
              if (href && href.includes("/?id=")) {
                const baseUrl = href.split("/?id=")[0];
                const rawId = href.split("id=")[1];
                episodeHShareUrls.push(signHShare(rawId, baseUrl));
              }
            }
          });
          const results = yield Promise.all(episodeHShareUrls.map((url) => resolveDirectStreams(url)));
          allStreams.push(...results.flat());
        }
      }
      return allStreams;
    } catch (e) {
      console.error(`[Hindmoviez] Extraction error: ${e.message}`);
      return [];
    }
  });
}

// src/hindmoviez/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log(`[Hindmoviez] Fetching streams for ${mediaType} ${tmdbId}`);
      const streams = yield extractStreams(tmdbId, mediaType, season, episode);
      const seen = /* @__PURE__ */ new Set();
      return streams.filter((s) => {
        if (!s.url || seen.has(s.url))
          return false;
        seen.add(s.url);
        return true;
      });
    } catch (e) {
      console.error(`[Hindmoviez] getStreams failed: ${e.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
