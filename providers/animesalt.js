/**
 * animesalt - Built from src/animesalt/
 * Generated: 2026-09-22T20:30:51.594Z
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

// src/animesalt/index.js
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));

// src/animesalt/constants.js
var MAIN_URL = "https://animesalt.cx";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.5"
};

// src/animesalt/utils.js
function fetchTmdbDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a;
    const endpoint = mediaType === "movie" ? "movie" : "tv";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    try {
      const res = yield fetch(url, { headers: HEADERS });
      if (!res.ok)
        return null;
      const data = yield res.json();
      return {
        title: mediaType === "movie" ? data.title || data.original_title : data.name || data.original_name,
        year: parseInt((data.release_date || data.first_air_date || "").substring(0, 4)) || null,
        imdbId: ((_a = data.external_ids) == null ? void 0 : _a.imdb_id) || null
      };
    } catch (e) {
      return null;
    }
  });
}
function cleanTitle(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}
function titleSimilarity(a, b) {
  const cleanA = cleanTitle(a);
  const cleanB = cleanTitle(b);
  if (!cleanA || !cleanB)
    return 0;
  if (cleanA === cleanB)
    return 1;
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA))
    return 0.8;
  const wordsA = new Set(cleanA.split(" "));
  const wordsB = new Set(cleanB.split(" "));
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w))
      intersection++;
  }
  return intersection * 2 / (wordsA.size + wordsB.size);
}
function unpack(code) {
  try {
    const match = code.match(/}\((['"])([\s\S]*?)\1,\s*(\d+),\s*(\d+),\s*(['"])([\s\S]*?)\5\.split\((['"])\|\7\)/);
    if (match) {
      let [_, quote1, p, a, c, quote2, kStr] = match;
      p = p.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      const radix = parseInt(a);
      let count = parseInt(c);
      const k = kStr.split("|");
      const e = (c2) => (c2 < radix ? "" : e(parseInt(c2 / radix))) + ((c2 = c2 % radix) > 35 ? String.fromCharCode(c2 + 29) : c2.toString(36));
      const d = {};
      while (count--)
        d[e(count)] = k[count] || e(count);
      return p.replace(/\b\w+\b/g, (w) => d[w]);
    }
  } catch (e) {
  }
  return code;
}

// src/animesalt/extractors.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
var import_crypto_js = __toESM(require("crypto-js"));
function extractAwsStream(url) {
  return __async(this, null, function* () {
    try {
      const hash = url.split("/").filter(Boolean).pop();
      if (!hash)
        return null;
      const origin = new URL(url).origin;
      const res = yield fetch(url, { headers: HEADERS });
      if (!res.ok)
        return null;
      const html = yield res.text();
      const postUrl = `${origin}/player/index.php?data=${hash}&do=getVideo`;
      const postRes = yield fetch(postUrl, {
        method: "POST",
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "x-requested-with": "XMLHttpRequest",
          "Origin": origin,
          "Referer": url,
          "Content-Type": "application/x-www-form-urlencoded"
        }),
        body: `hash=${encodeURIComponent(hash)}&r=${encodeURIComponent(origin)}`
      });
      if (!postRes.ok)
        return null;
      const json = yield postRes.json();
      const m3u8 = json == null ? void 0 : json.videoSource;
      if (!m3u8)
        return null;
      let subtitle = null;
      const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(['"]\|['"]\)\)/);
      if (packedMatch) {
        const unpacked = unpack(packedMatch[0]);
        const subMatch = unpacked.match(/"kind":\s*"captions"\s*,\s*"file":\s*"(https?:\/\/[^"]+)"/);
        if (subMatch) {
          subtitle = subMatch[1].replace(/\\/g, "");
        }
      }
      return {
        url: m3u8,
        headers: {
          "Referer": `${origin}/`,
          "Origin": origin,
          "User-Agent": HEADERS["User-Agent"]
        },
        subtitles: subtitle ? [{ lang: "English", url: subtitle }] : []
      };
    } catch (e) {
      return null;
    }
  });
}
function extractAbyss(url, langName = "Default") {
  return __async(this, null, function* () {
    var _a;
    try {
      const cleanUrl = url.replace("https://short.icu", "https://abyssplayer.com");
      const reqHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        "Origin": "https://playhydrax.com",
        "Referer": "https://playhydrax.com/"
      };
      const res = yield fetch(cleanUrl, { headers: reqHeaders });
      if (!res.ok)
        return [];
      const html = yield res.text();
      const match = html.match(/const\s+datas\s*=\s*"([^"]*)"/);
      if (!match || !match[1])
        return [];
      const decRes = yield fetch("https://enc-dec.app/api/dec-abyss", {
        method: "POST",
        headers: __spreadProps(__spreadValues({}, reqHeaders), {
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({ text: match[1] })
      });
      if (!decRes.ok)
        return [];
      const decData = yield decRes.json();
      const sources = ((_a = decData == null ? void 0 : decData.result) == null ? void 0 : _a.sources) || [];
      return sources.filter((s) => s && s.url && s.status).map((s) => {
        const codec = (s.codec || "MP4").toUpperCase();
        const quality = s.type || "720p";
        return {
          name: `AnimeSalt [${langName}] (${codec} ${quality})`,
          url: s.url,
          quality,
          headers: {
            "Referer": "https://playhydrax.com/",
            "Origin": "https://playhydrax.com",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
          },
          type: s.url.includes(".m3u8") ? "m3u8" : "mp4"
        };
      });
    } catch (e) {
      return [];
    }
  });
}
function extractMultiLang(dataParam) {
  return __async(this, null, function* () {
    try {
      let decodedStr = "";
      if (typeof atob === "function") {
        decodedStr = atob(dataParam);
      } else {
        decodedStr = Buffer.from(dataParam, "base64").toString("utf-8");
      }
      const list = JSON.parse(decodedStr);
      if (!Array.isArray(list))
        return [];
      const streamPromises = list.map((item) => {
        const lang = item.language || "Default";
        const link = item.link;
        if (!link)
          return Promise.resolve([]);
        return extractAbyss(link, lang);
      });
      const nested = yield Promise.all(streamPromises);
      return nested.flat();
    } catch (e) {
      return [];
    }
  });
}
function extractMegaPlay(url) {
  return __async(this, null, function* () {
    var _a;
    try {
      let streamPageUrl = url;
      if (!url.includes("/stream/s-")) {
        const pageRes = yield fetch(url, { headers: HEADERS });
        if (!pageRes.ok)
          return [];
        const html = yield pageRes.text();
        const $ = import_cheerio_without_node_native.default.load(html);
        const embedSrc = $("iframe.s5-embed").attr("src");
        if (!embedSrc)
          return [];
        streamPageUrl = embedSrc;
      }
      const idMatch = streamPageUrl.match(/\/stream\/s-\d+\/(\d+)\//);
      if (!idMatch || !idMatch[1])
        return [];
      const id = idMatch[1];
      const origin = new URL(streamPageUrl).origin;
      const apiHeaders = {
        "Accept": "*/*",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": origin,
        "User-Agent": HEADERS["User-Agent"]
      };
      const apiRes = yield fetch(`${origin}/stream/getSources?id=${id}`, { headers: apiHeaders });
      if (!apiRes.ok)
        return [];
      const resJson = yield apiRes.json();
      let file = (_a = resJson == null ? void 0 : resJson.sources) == null ? void 0 : _a.file;
      const enc = resJson == null ? void 0 : resJson.enc;
      if (!file && enc) {
        const keyStr = "i?LMTAx0Q6,:}50U";
        const keyHex = import_crypto_js.default.enc.Utf8.parse(keyStr).toString(import_crypto_js.default.enc.Hex).padEnd(64, "0");
        const key = import_crypto_js.default.enc.Hex.parse(keyHex);
        const iv = import_crypto_js.default.enc.Utf8.parse("W0;27ToaUpl_P%'c");
        const normalized = enc.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
        const decrypted = import_crypto_js.default.AES.decrypt(padded, key, {
          iv,
          mode: import_crypto_js.default.mode.CBC,
          padding: import_crypto_js.default.pad.Pkcs7
        });
        const decObj = JSON.parse(decrypted.toString(import_crypto_js.default.enc.Utf8));
        file = decObj == null ? void 0 : decObj.file;
      }
      if (!file)
        return [];
      const tokenMatch = file.match(/\/([a-f0-9]{32})\/([a-f0-9]{32})\//i);
      if (tokenMatch && !file.includes("token=")) {
        const secret = "MpCdnT0k3n!9f2K#xQ7vL5mR8wN1pY4s";
        const expires = Math.floor(Date.now() / 1e3) + 90;
        const payload = `${expires}|${tokenMatch[1]}/${tokenMatch[2]}`;
        const hash = import_crypto_js.default.HmacSHA256(payload, secret);
        const b64Payload = import_crypto_js.default.enc.Base64.stringify(import_crypto_js.default.enc.Utf8.parse(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        const b64Sig = import_crypto_js.default.enc.Base64.stringify(hash).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        const token = `${b64Payload}.${b64Sig}`;
        file = `${file}${file.includes("?") ? "&" : "?"}token=${token}`;
      }
      const subtitles = ((resJson == null ? void 0 : resJson.tracks) || []).filter((t) => t.file && t.kind !== "thumbnails").map((t) => ({ lang: t.label || "English", url: t.file }));
      return [{
        name: "AnimeSalt [MegaPlay] (Auto M3U8)",
        url: file,
        quality: "1080p",
        headers: {
          "Referer": `${origin}/`,
          "Origin": origin,
          "User-Agent": HEADERS["User-Agent"]
        },
        subtitles,
        type: "m3u8"
      }];
    } catch (e) {
      return [];
    }
  });
}
function extractStreamWish(url) {
  return __async(this, null, function* () {
    try {
      const embedUrl = url.includes("/e/") ? url : url.replace("/f/", "/e/");
      const res = yield fetch(embedUrl, { headers: HEADERS });
      if (!res.ok)
        return null;
      const html = yield res.text();
      const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(['"]\|['"]\)\)/);
      if (packedMatch) {
        const unpacked = unpack(packedMatch[0]);
        const fileMatch = unpacked.match(/file\s*:\s*["'](https?:\/\/[^"'\s]+\.m3u8(?:\?[^"'\s]*)?)["']/);
        if (fileMatch) {
          const origin = new URL(embedUrl).origin;
          return {
            name: "AnimeSalt [StreamWish] (Auto M3U8)",
            url: fileMatch[1],
            quality: "720p",
            headers: {
              "Referer": `${origin}/`,
              "Origin": origin,
              "User-Agent": HEADERS["User-Agent"]
            },
            type: "m3u8"
          };
        }
      }
    } catch (e) {
    }
    return null;
  });
}

// src/animesalt/index.js
function searchAnimeSalt(query) {
  return __async(this, null, function* () {
    var _a;
    try {
      const body = `action=torofilm_infinite_scroll&page=1&per_page=12&query_type=search&query_args[s]=${encodeURIComponent(query)}`;
      const res = yield fetch(`${MAIN_URL}/wp-admin/admin-ajax.php`, {
        method: "POST",
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          "Referer": `${MAIN_URL}/`
        }),
        body
      });
      if (!res.ok)
        return [];
      const json = yield res.json();
      if (!(json == null ? void 0 : json.success) || !((_a = json == null ? void 0 : json.data) == null ? void 0 : _a.content))
        return [];
      const $ = import_cheerio_without_node_native2.default.load(json.data.content);
      const results = [];
      $("article").each((_, el) => {
        const title = $(el).find("header h2").text().trim();
        const href = $(el).find("a").first().attr("href");
        if (title && href) {
          results.push({ title, href });
        }
      });
      return results;
    } catch (e) {
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
  return __async(this, null, function* () {
    try {
      const details = yield fetchTmdbDetails(tmdbId, mediaType);
      if (!details || !details.title)
        return [];
      let results = yield searchAnimeSalt(details.title);
      if (results.length === 0) {
        const cleaned = cleanTitle(details.title);
        if (cleaned && cleaned !== details.title.toLowerCase()) {
          results = yield searchAnimeSalt(cleaned);
        }
      }
      if (results.length === 0)
        return [];
      let bestMatch = null;
      let highestSim = 0;
      for (const item of results) {
        const sim = titleSimilarity(details.title, item.title);
        if (sim > highestSim) {
          highestSim = sim;
          bestMatch = item;
        }
      }
      if (!bestMatch || highestSim < 0.2) {
        bestMatch = results[0];
      }
      let targetUrl = bestMatch.href;
      if (mediaType === "tv") {
        const seriesRes = yield fetch(bestMatch.href, { headers: HEADERS });
        if (!seriesRes.ok)
          return [];
        const seriesHtml = yield seriesRes.text();
        const $series = import_cheerio_without_node_native2.default.load(seriesHtml);
        let seasonBtn = $series(`div.season-buttons a[data-season="${seasonNum}"]`);
        if (seasonBtn.length === 0) {
          seasonBtn = $series("div.season-buttons a").first();
        }
        const postId = seasonBtn.attr("data-post");
        const dataSeason = seasonBtn.attr("data-season") || seasonNum;
        if (postId) {
          const epRes = yield fetch(`${MAIN_URL}/wp-admin/admin-ajax.php`, {
            method: "POST",
            headers: __spreadProps(__spreadValues({}, HEADERS), {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "X-Requested-With": "XMLHttpRequest",
              "Referer": bestMatch.href
            }),
            body: `action=action_select_season&season=${dataSeason}&post=${postId}`
          });
          if (epRes.ok) {
            const epHtml = yield epRes.text();
            const $ep = import_cheerio_without_node_native2.default.load(epHtml);
            const epArticles = $ep("li article");
            let targetEp = null;
            epArticles.each((idx, el) => {
              const epText = $ep(el).find("h2.entry-title").text();
              if (epText.includes(`x${episodeNum}`) || epText.includes(`Episode ${episodeNum}`)) {
                targetEp = $ep(el).find("a").first().attr("href");
              }
            });
            if (!targetEp && epArticles.length >= episodeNum) {
              targetEp = $ep(epArticles[episodeNum - 1]).find("a").first().attr("href");
            }
            if (targetEp) {
              targetUrl = targetEp;
            }
          }
        }
      }
      const pageRes = yield fetch(targetUrl, { headers: HEADERS });
      if (!pageRes.ok)
        return [];
      const pageHtml = yield pageRes.text();
      const $page = import_cheerio_without_node_native2.default.load(pageHtml);
      const iframeUrls = /* @__PURE__ */ new Set();
      $page("iframe").each((_, el) => {
        const src = $page(el).attr("data-src") || $page(el).attr("src");
        if (src && !src.startsWith("about:") && !src.startsWith("javascript:")) {
          const fullUrl = src.startsWith("//") ? `https:${src}` : src.startsWith("http") ? src : `${MAIN_URL}${src}`;
          iframeUrls.add(fullUrl);
        }
      });
      const streams = [];
      const promises = [];
      for (const iframeUrl of iframeUrls) {
        if (iframeUrl.includes("multi-lang-plyr/player.php")) {
          const urlObj = new URL(iframeUrl);
          const dataParam = urlObj.searchParams.get("data");
          if (dataParam) {
            promises.push(
              extractMultiLang(dataParam).then((res) => {
                if (Array.isArray(res))
                  streams.push(...res);
              })
            );
          }
        } else if (iframeUrl.includes("as-cdn") || iframeUrl.includes("awstream") || iframeUrl.includes("zephyrflick")) {
          promises.push(
            extractAwsStream(iframeUrl).then((res) => {
              if (res && res.url) {
                streams.push({
                  name: "AnimeSalt [AWSStream] (Auto M3U8)",
                  url: res.url,
                  quality: "1080p",
                  headers: res.headers,
                  subtitles: res.subtitles,
                  type: "m3u8"
                });
              }
            })
          );
        } else if (iframeUrl.includes("abyssplayer.com") || iframeUrl.includes("short.icu")) {
          promises.push(
            extractAbyss(iframeUrl, "Default").then((res) => {
              if (Array.isArray(res))
                streams.push(...res);
            })
          );
        } else if (iframeUrl.includes("megaplay.buzz") || iframeUrl.includes("rapid-cloud.co")) {
          promises.push(
            extractMegaPlay(iframeUrl).then((res) => {
              if (Array.isArray(res))
                streams.push(...res);
            })
          );
        } else if (iframeUrl.includes("pixdrive") || iframeUrl.includes("ghbrisk") || iframeUrl.includes("streamwish") || iframeUrl.includes("filesim")) {
          promises.push(
            extractStreamWish(iframeUrl).then((res) => {
              if (res)
                streams.push(res);
            })
          );
        }
      }
      yield Promise.allSettled(promises);
      const seenUrls = /* @__PURE__ */ new Set();
      const uniqueStreams = [];
      for (const s of streams) {
        if (s && s.url && !seenUrls.has(s.url)) {
          seenUrls.add(s.url);
          uniqueStreams.push({
            name: s.name || "AnimeSalt",
            title: mediaType === "movie" ? details.title : `${details.title} - S${seasonNum}E${episodeNum}`,
            url: s.url,
            quality: s.quality || "Auto",
            headers: s.headers,
            subtitles: s.subtitles || [],
            provider: "animesalt",
            type: s.type || "m3u8"
          });
        }
      }
      const qualityOrder = { "1080p": 4, "720p": 3, "480p": 2, "360p": 1, "Auto": 0 };
      return uniqueStreams.sort((a, b) => {
        var _a, _b;
        return ((_a = qualityOrder[b.quality]) != null ? _a : 0) - ((_b = qualityOrder[a.quality]) != null ? _b : 0);
      });
    } catch (e) {
      return [];
    }
  });
}
module.exports = { getStreams };
