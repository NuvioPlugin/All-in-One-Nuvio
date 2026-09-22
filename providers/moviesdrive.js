/**
 * moviesdrive - Built from src/moviesdrive/
 * Generated: 2026-09-22T09:45:40.938Z
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

// src/moviesdrive/index.js
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));

// src/moviesdrive/constants.js
var MAIN_URL = "https://new4.moviesdrive.christmas";
var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "max-age=0",
  "Connection": "keep-alive"
};

// src/moviesdrive/utils.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
var cachedMainUrl = "";
function getMainUrl() {
  return __async(this, null, function* () {
    if (cachedMainUrl)
      return cachedMainUrl;
    try {
      const response = yield fetch(DOMAINS_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
      const data = yield response.json();
      cachedMainUrl = data.moviesdrive || MAIN_URL;
      return cachedMainUrl;
    } catch (e) {
      return MAIN_URL;
    }
  });
}
function getIndexQuality(str) {
  if (!str)
    return 1080;
  const match = str.match(/(\d{3,4})[pP]/);
  if (match)
    return parseInt(match[1]);
  if (str.toUpperCase().includes("4K") || str.toUpperCase().includes("2160P") || str.toUpperCase().includes("UHD"))
    return 2160;
  return 1080;
}
function extractMdrive(url) {
  return __async(this, null, function* () {
    if (!url)
      return [];
    const regex = /hubcloud|gdflix|gdlink/i;
    if (regex.test(url) && (url.includes("/drive/") || url.includes("/file/"))) {
      return [url];
    }
    try {
      const res = yield fetch(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }) });
      const html = yield res.text();
      if (url.includes("search-recover.php")) {
        const qMatch = html.match(/const\s+Q_INITIAL\s*=\s*["']([^"']+)["']/);
        const tokenMatch = html.match(/const\s+FROM_AC_TOKEN\s*=\s*["']([^"']+)["']/);
        if (qMatch && tokenMatch) {
          const apiBase = url.split("/drive/")[0];
          const searchParams = new URLSearchParams({
            api: "search",
            q: qMatch[1],
            page: "1",
            from_ac: tokenMatch[1]
          });
          const apiRes = yield fetch(`${apiBase}/drive/search-recover.php?${searchParams.toString()}`, {
            headers: __spreadProps(__spreadValues({}, HEADERS), { "Accept": "application/json", Referer: url, "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" })
          });
          const data = yield apiRes.json();
          if (data.hits) {
            return data.hits.map((h) => h.url).filter(Boolean);
          }
        }
      }
      const $ = import_cheerio_without_node_native.default.load(html);
      return $("a[href]").map((i, el) => $(el).attr("href")).get().filter((href) => regex.test(href));
    } catch (e) {
      return [];
    }
  });
}
function hubCloudExtractor(url, referer) {
  return __async(this, null, function* () {
    try {
      let currentUrl = url;
      const pageResponse = yield fetch(currentUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer })
      });
      let pageData = yield pageResponse.text();
      let finalUrl = currentUrl;
      if (!currentUrl.includes("hubcloud.php")) {
        let nextHref = "";
        const $first = import_cheerio_without_node_native.default.load(pageData);
        const phpLink = $first('a[href*="hubcloud.php"]').attr("href");
        if (phpLink) {
          nextHref = phpLink;
        } else {
          const downloadBtn = $first("#download");
          if (downloadBtn.length) {
            nextHref = downloadBtn.attr("href");
          } else {
            const scriptUrlMatch = pageData.match(/var url = ["']([^"']*)["']/);
            if (scriptUrlMatch)
              nextHref = scriptUrlMatch[1];
          }
        }
        if (nextHref) {
          if (!nextHref.startsWith("http")) {
            const urlObj = new URL(currentUrl);
            nextHref = `${urlObj.protocol}//${urlObj.hostname}/${nextHref.replace(/^\//, "")}`;
          }
          finalUrl = nextHref;
          const secondResponse = yield fetch(finalUrl, {
            headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: currentUrl })
          });
          pageData = yield secondResponse.text();
        }
      }
      const $ = import_cheerio_without_node_native.default.load(pageData);
      const size = $("i#size").text().trim();
      const header = $("div.card-header").text().trim();
      const quality = getIndexQuality(header);
      const pxlMatch = pageData.match(/var\s+pxl\s*=\s*["']([^"']+)["']/);
      const links = [];
      const elements = $("a[href]").get();
      const blocked = ["tinyurl", "telegram", "hubcloud.cx/tg", "hubcloud.foo/tg"];
      for (const el of elements) {
        let link = $(el).attr("href");
        const text = $(el).text().toLowerCase().trim();
        if (!link || blocked.some((b) => link.includes(b)))
          continue;
        if (link.includes("negn6f") && pxlMatch) {
          link = pxlMatch[1];
        }
        if (text.includes("fslv2")) {
          links.push({ name: "HubCloud - FSLv2", quality, url: link, size });
        } else if (text.includes("fsl server") || text.includes("fsl") && !text.includes("v2")) {
          links.push({ name: "HubCloud - FSL Server", quality, url: link, size });
        } else if (text.includes("download file") || text.includes("instant download") || text.includes("instant") || text.includes("10gbps")) {
          try {
            const res = yield fetch(link, {
              headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: finalUrl }),
              redirect: "follow"
            });
            const streamUrl = res.url;
            if (streamUrl && streamUrl.startsWith("http")) {
              links.push({ name: "HubCloud - Instant", quality, url: streamUrl, size });
            }
          } catch (e) {
            links.push({ name: "HubCloud - Instant", quality, url: link, size });
          }
        } else if (text.includes("pixeldra") || text.includes("pixelserver") || text.includes("pixeldrain") || link.includes("pixeldrain")) {
          let pUrl = link;
          if (pUrl.includes("/u/")) {
            const fileId = pUrl.split("/u/")[1].split("?")[0].replace("/", "");
            pUrl = `https://pixeldrain.dev/api/file/${fileId}?download`;
          }
          links.push({ name: "HubCloud - Pixeldrain", quality, url: pUrl, size });
        } else if (text.includes("buzzserver") || text.includes("buzz server") || text.includes("buzz") || text.includes("fuckingfast")) {
          try {
            const dlRes = yield fetch(link, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
              }
            });
            const dlHtml = yield dlRes.text();
            const copyMatch = dlHtml.match(/copyDownloadLink\(['"]([^'"]+)['"]\)/);
            const dlPath = copyMatch ? copyMatch[1].replace(/\\\//g, "/") : null;
            const base = new URL(link).origin;
            const dlUrl = dlPath ? dlPath.startsWith("http") ? dlPath : `${base}${dlPath}` : link.endsWith("/download") ? link : `${link}/download`;
            const resp = yield fetch(dlUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Referer": link,
                "HX-Request": "true"
              },
              redirect: "manual"
            });
            const dlink = resp.headers.get("hx-redirect") || resp.headers.get("location");
            if (dlink) {
              links.push({ name: "HubCloud - BuzzServer", quality, url: dlink, size });
            }
          } catch (e) {
          }
        } else if (text.includes("s3 server")) {
          links.push({ name: "HubCloud - S3", quality, url: link, size });
        } else if (text.includes("mega server")) {
          links.push({ name: "HubCloud - Mega", quality, url: link, size });
        } else if (link.includes("r2.dev")) {
          links.push({ name: "Direct R2", quality, url: link, size });
        } else if (link.includes("workers.dev")) {
          links.push({ name: "ZipDisk Server", quality, url: link, size });
        }
      }
      return links;
    } catch (e) {
      return [];
    }
  });
}
function loadExtractor(url, referer) {
  return __async(this, null, function* () {
    try {
      const hostname = new URL(url).hostname;
      if (hostname.includes("hubcloud"))
        return yield hubCloudExtractor(url, referer);
      if (hostname.includes("gdflix") || hostname.includes("gdlink"))
        return [{ name: "GDFlix", quality: 1080, url }];
      return [];
    } catch (e) {
      return [];
    }
  });
}

// src/moviesdrive/index.js
function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
  return __async(this, null, function* () {
    var _a;
    console.log(`[MoviesDrive] Querying streams for TMDB: ${tmdbId}, Type: ${mediaType}`);
    const tmdbApiKey = "1865f43a0549ca50d341dd9ab8b29f49";
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${tmdbApiKey}&append_to_response=external_ids`;
    const tmdbRes = yield fetch(tmdbUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });
    const tmdbData = yield tmdbRes.json();
    const imdbId = (_a = tmdbData.external_ids) == null ? void 0 : _a.imdb_id;
    const cleanTitle = tmdbData.title || tmdbData.name || "";
    const mainUrl = yield getMainUrl();
    let match = null;
    const findMatch = (hits) => {
      if (!hits || !hits.length)
        return null;
      if (mediaType === "tv") {
        const sSlug = String(seasonNum).padStart(2, "0");
        const seasonPatterns = [
          new RegExp(`\\bseason\\s*0?${seasonNum}\\b`, "i"),
          new RegExp(`\\bs0?${seasonNum}\\b`, "i"),
          new RegExp(`\\bseason\\s*${sSlug}\\b`, "i")
        ];
        return hits.find((doc) => {
          const postTitle = (doc.post_title || "").toLowerCase();
          const permalink2 = (doc.permalink || "").toLowerCase();
          const normDocTitle = postTitle.replace(/[^a-z0-9]/g, "");
          const normTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
          const titleMatches = normDocTitle.includes(normTitle) || postTitle.includes(cleanTitle.toLowerCase()) || permalink2.includes(cleanTitle.toLowerCase().replace(/ /g, "-"));
          const seasonMatches = seasonPatterns.some((pat) => pat.test(postTitle) || pat.test(permalink2));
          return titleMatches && seasonMatches;
        });
      } else {
        return hits.find((d) => imdbId && d.imdb_id === imdbId) || hits.find((doc) => {
          const postTitle = (doc.post_title || "").toLowerCase();
          const permalink2 = (doc.permalink || "").toLowerCase();
          const normDocTitle = postTitle.replace(/[^a-z0-9]/g, "");
          const normTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
          return normDocTitle.includes(normTitle) || postTitle.includes(cleanTitle.toLowerCase()) || permalink2.includes(cleanTitle.toLowerCase().replace(/ /g, "-"));
        }) || hits[0];
      }
    };
    if (imdbId) {
      try {
        const searchUrl = `${mainUrl}/search.php?q=${imdbId}&page=1`;
        const searchRes = yield fetch(searchUrl, { headers: HEADERS });
        if (searchRes.ok) {
          const searchData = yield searchRes.json();
          match = findMatch((searchData.hits || []).map((h) => h.document));
        }
      } catch (e) {
      }
    }
    if (!match && cleanTitle) {
      try {
        const searchUrl = `${mainUrl}/search.php?q=${encodeURIComponent(cleanTitle)}&page=1`;
        const searchRes = yield fetch(searchUrl, { headers: HEADERS });
        if (searchRes.ok) {
          const searchData = yield searchRes.json();
          match = findMatch((searchData.hits || []).map((h) => h.document));
        }
      } catch (e) {
      }
    }
    if (!match) {
      console.log("[MoviesDrive] No matching post found");
      return [];
    }
    const permalink = match.permalink;
    const href = permalink.startsWith("http") ? permalink : `${mainUrl}${permalink}`;
    try {
      const pageRes = yield fetch(href, { headers: HEADERS });
      const pageHtml = yield pageRes.text();
      const $ = import_cheerio_without_node_native2.default.load(pageHtml);
      const allStreams = [];
      if (mediaType === "movie") {
        const links = [];
        $("h5 a").each((_, a) => {
          const h = $(a).attr("href");
          if (h)
            links.push(h);
        });
        for (const link of [...new Set(links)]) {
          const extracted = yield extractMdrive(link);
          for (const server of extracted) {
            const streams = yield loadExtractor(server, href);
            allStreams.push(...streams.map((s) => __spreadProps(__spreadValues({}, s), {
              title: `${cleanTitle} - ${s.name} [${s.quality}p]`,
              provider: "moviesdrive"
            })));
          }
        }
      } else {
        const sSlug = String(seasonNum).padStart(2, "0");
        const stag = `Season ${seasonNum}|S${sSlug}`;
        const sepRegex = new RegExp(`\\b(?:ep|episode|e)\\s*0?${episodeNum}\\b|s0?${seasonNum}\\s*e0?${episodeNum}\\b`, "i");
        const stopRegex = /^\s*(EP\d+|Episode\s*\d+|S\d+E\d+)/i;
        const entries = $("h5").filter((i, el) => new RegExp(stag, "i").test($(el).text()));
        for (const entry of entries.get()) {
          const nextHref = $(entry).next().find("a").attr("href") || $(entry).find("a").attr("href");
          if (!nextHref)
            continue;
          const epPageRes = yield fetch(nextHref, { headers: HEADERS });
          const epPageHtml = yield epPageRes.text();
          const $ep = import_cheerio_without_node_native2.default.load(epPageHtml);
          const epEntries = $ep("h5").filter((i, el) => sepRegex.test($ep(el).text()));
          for (const epEntry of epEntries.get()) {
            const epLinks = [];
            let sibling = $ep(epEntry).next();
            while (sibling.length && !stopRegex.test(sibling.text().trim())) {
              sibling.find("a[href]").each((_, a) => {
                const h = $ep(a).attr("href");
                if (h)
                  epLinks.push(h);
              });
              sibling = sibling.next();
            }
            if (epLinks.length === 0) {
              const l1 = $ep(epEntry).next().find("a").attr("href");
              const l2 = $ep(epEntry).next().next().find("a").attr("href");
              [l1, l2].forEach((l) => l && epLinks.push(l));
            }
            for (const epLink of [...new Set(epLinks)]) {
              const extracted = yield extractMdrive(epLink);
              for (const server of extracted) {
                const streams = yield loadExtractor(server, nextHref);
                allStreams.push(...streams.map((s) => __spreadProps(__spreadValues({}, s), {
                  title: `${cleanTitle} S${seasonNum}E${episodeNum} - ${s.name} [${s.quality}p]`,
                  provider: "moviesdrive"
                })));
              }
            }
          }
        }
      }
      return allStreams;
    } catch (e) {
      console.error("[MoviesDrive] Error:", e.message);
      return [];
    }
  });
}
module.exports = { getStreams };
