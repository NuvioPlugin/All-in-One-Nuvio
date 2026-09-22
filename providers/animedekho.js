/**
 * animedekho - Built from src/animedekho/
 * Generated: 2026-09-22T20:30:51.682Z
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

// src/animedekho/index.js
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));

// src/animedekho/constants.js
var MAIN_URL = "https://animedekho.app";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.5"
};

// src/animedekho/utils.js
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

// src/animedekho/extractors.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
function extractStreamRuby(url) {
  return __async(this, null, function* () {
    try {
      const cleanedUrl = url.replace("/e/", "/");
      const res = yield fetch(cleanedUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "X-Requested-With": "XMLHttpRequest",
          "Referer": cleanedUrl
        })
      });
      if (!res.ok)
        return null;
      const html = yield res.text();
      let m3u8 = null;
      const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(['"]\|['"]\)\)/);
      if (packedMatch) {
        const unpacked = unpack(packedMatch[0]);
        const match = unpacked.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/);
        if (match)
          m3u8 = match[1];
      }
      if (!m3u8) {
        const directMatch = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/);
        if (directMatch)
          m3u8 = directMatch[1];
      }
      if (!m3u8)
        return null;
      const origin = new URL(cleanedUrl).origin;
      return {
        name: "AnimeDekho [StreamRuby] (Auto M3U8)",
        url: m3u8,
        quality: "720p",
        headers: {
          "Origin": origin,
          "Referer": `${cleanedUrl}/`,
          "User-Agent": HEADERS["User-Agent"]
        },
        type: "m3u8"
      };
    } catch (e) {
      return null;
    }
  });
}
function extractVidmoly(url) {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(url, {
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Referer": "https://animedekho.app/"
        })
      });
      if (!res.ok)
        return null;
      const html = yield res.text();
      const match = html.match(/file\s*:\s*["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)["']/);
      if (!match || !match[1])
        return null;
      const origin = new URL(url).origin;
      return {
        name: "AnimeDekho [Vidmoly] (Auto M3U8)",
        url: match[1],
        quality: "1080p",
        headers: {
          "Referer": `${origin}/`,
          "Origin": origin,
          "User-Agent": HEADERS["User-Agent"]
        },
        type: "m3u8"
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
          name: `AnimeDekho [${langName}] (${codec} ${quality})`,
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
        name: "AnimeDekho [AWSStream] (Auto M3U8)",
        url: m3u8,
        quality: "1080p",
        headers: {
          "Referer": `${origin}/`,
          "Origin": origin,
          "User-Agent": HEADERS["User-Agent"]
        },
        subtitles: subtitle ? [{ lang: "English", url: subtitle }] : [],
        type: "m3u8"
      };
    } catch (e) {
      return null;
    }
  });
}
function extractStreamWish(url) {
  return __async(this, null, function* () {
    try {
      const embedUrl = url.includes("/e/") ? url : url.includes("/embed/") ? url : url.replace("/f/", "/e/");
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
            name: "AnimeDekho [StreamWish] (Auto M3U8)",
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
function extractBlakite(url) {
  return __async(this, null, function* () {
    var _a;
    try {
      const id = url.split("/").filter(Boolean).pop();
      const tmdbMatch = url.match(/embed\/([^/]+)/);
      const tmdbId = tmdbMatch ? tmdbMatch[1] : "";
      const apiUrl = `https://blakiteapi.xyz/api/get.php?id=${id}&tmdbId=${tmdbId}`;
      const res = yield fetch(apiUrl, { headers: HEADERS });
      if (!res.ok)
        return null;
      const json = yield res.json();
      if (!(json == null ? void 0 : json.success) || !((_a = json == null ? void 0 : json.data) == null ? void 0 : _a.dataId))
        return null;
      const dataId = json.data.dataId;
      const format = json.data.format || "mp4";
      const quality = json.data.quality || "720p";
      const streamUrl = `https://blakiteapi.xyz/stream/${dataId}.${format}`;
      return {
        name: `AnimeDekho [Blakite] (${quality})`,
        url: streamUrl,
        quality,
        headers: {
          "Referer": "https://blakiteapi.xyz/",
          "User-Agent": HEADERS["User-Agent"]
        },
        type: format.toLowerCase().includes("m3u8") ? "m3u8" : "mp4"
      };
    } catch (e) {
      return null;
    }
  });
}
function extractVidStack(url) {
  return __async(this, null, function* () {
    try {
      const hash = url.split("#").pop().split("/").pop();
      if (!hash)
        return null;
      const origin = new URL(url).origin;
      const res = yield fetch(`${origin}/api/v1/video?id=${hash}`, {
        headers: HEADERS
      });
      if (!res.ok)
        return null;
      const text = (yield res.text()).trim();
      const match = text.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
      if (!match)
        return null;
      return {
        name: "AnimeDekho [VidStack] (Auto M3U8)",
        url: match[0],
        quality: "720p",
        headers: {
          "Referer": `${origin}/`,
          "User-Agent": HEADERS["User-Agent"]
        },
        type: "m3u8"
      };
    } catch (e) {
      return null;
    }
  });
}

// src/animedekho/index.js
function searchAnimeDekho(query) {
  return __async(this, null, function* () {
    try {
      const url = `${MAIN_URL}/?s=${encodeURIComponent(query)}`;
      const res = yield fetch(url, { headers: HEADERS });
      if (!res.ok)
        return [];
      const html = yield res.text();
      const $ = import_cheerio_without_node_native2.default.load(html);
      const results = [];
      $("ul[data-results] li article, article.post, article").each((_, el) => {
        const title = $(el).find("header h2, h2").text().trim();
        const href = $(el).find("a.lnk-blk, a").first().attr("href");
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
      let results = yield searchAnimeDekho(details.title);
      if (results.length === 0) {
        const cleaned = cleanTitle(details.title);
        if (cleaned && cleaned !== details.title.toLowerCase()) {
          results = yield searchAnimeDekho(cleaned);
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
      const mediaTypeVal = mediaType === "movie" ? 1 : 2;
      if (mediaType === "tv") {
        const seriesRes = yield fetch(bestMatch.href, {
          headers: __spreadProps(__spreadValues({}, HEADERS), {
            "Cookie": "toronites_server=vidstream"
          })
        });
        if (!seriesRes.ok)
          return [];
        const seriesHtml = yield seriesRes.text();
        const $series = import_cheerio_without_node_native2.default.load(seriesHtml);
        let targetEpUrl = null;
        const epElements = $series("ul.seasons-lst li");
        epElements.each((_, el) => {
          const epText = $series(el).find("h3.title").text().trim();
          const epHref = $series(el).find("a").first().attr("href");
          if (epText && epHref) {
            const sMatch = epText.match(/S(\d+)[\s-]*E(\d+)/i) || epText.match(/(\d+)x(\d+)/i);
            if (sMatch) {
              const s = parseInt(sMatch[1]);
              const e = parseInt(sMatch[2]);
              if (s === seasonNum && e === episodeNum) {
                targetEpUrl = epHref;
              }
            } else if (epText.includes(`E${episodeNum}`) || epText.includes(`Episode ${episodeNum}`)) {
              if (seasonNum === 1)
                targetEpUrl = epHref;
            }
          }
        });
        if (!targetEpUrl && epElements.length >= episodeNum && seasonNum === 1) {
          targetEpUrl = $series(epElements[episodeNum - 1]).find("a").first().attr("href");
        }
        if (targetEpUrl) {
          targetUrl = targetEpUrl;
        }
      }
      const pageRes = yield fetch(targetUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Cookie": "toronites_server=vidstream"
        })
      });
      if (!pageRes.ok)
        return [];
      const pageHtml = yield pageRes.text();
      const $page = import_cheerio_without_node_native2.default.load(pageHtml);
      const iframeUrls = /* @__PURE__ */ new Set();
      const serverPromises = [];
      $page("iframe.serversel[src], iframe[src]").each((_, el) => {
        const src = $page(el).attr("src");
        if (src && !src.startsWith("about:") && !src.startsWith("javascript:")) {
          const fullSrc = src.startsWith("//") ? `https:${src}` : src.startsWith("http") ? src : `${MAIN_URL}${src}`;
          if (fullSrc.includes("animedekho.app/embed/")) {
            serverPromises.push(
              fetch(fullSrc, { headers: HEADERS }).then((r) => __async(this, null, function* () {
                if (!r.ok)
                  return;
                const h = yield r.text();
                const $inner = import_cheerio_without_node_native2.default.load(h);
                $inner("iframe[src]").each((_2, iEl) => {
                  const iSrc = $inner(iEl).attr("src");
                  if (iSrc && !iSrc.startsWith("about:"))
                    iframeUrls.add(iSrc);
                });
              })).catch(() => {
              })
            );
          } else {
            iframeUrls.add(fullSrc);
          }
        }
      });
      yield Promise.allSettled(serverPromises);
      const bodyClass = $page("body").attr("class") || "";
      const termMatch = bodyClass.match(/(?:term|postid)-(\d+)/);
      if (termMatch && termMatch[1]) {
        const termId = termMatch[1];
        const trdekhoPromises = [];
        for (let i = 0; i <= 10; i++) {
          const trUrl = `${MAIN_URL}/?trdekho=${i}&trid=${termId}&trtype=${mediaTypeVal}`;
          trdekhoPromises.push(
            fetch(trUrl, { headers: HEADERS }).then((r) => __async(this, null, function* () {
              if (!r.ok)
                return;
              const h = yield r.text();
              const $tr = import_cheerio_without_node_native2.default.load(h);
              const iSrc = $tr("iframe").attr("src");
              if (iSrc && !iSrc.startsWith("about:")) {
                const full = iSrc.startsWith("//") ? `https:${iSrc}` : iSrc.startsWith("http") ? iSrc : `${MAIN_URL}${iSrc}`;
                iframeUrls.add(full);
              }
            })).catch(() => {
            })
          );
        }
        yield Promise.allSettled(trdekhoPromises);
      }
      const streams = [];
      const extractPromises = [];
      for (const iframeUrl of iframeUrls) {
        if (iframeUrl.includes("rubystm.com") || iframeUrl.includes("streamruby")) {
          extractPromises.push(
            extractStreamRuby(iframeUrl).then((s) => {
              if (s)
                streams.push(s);
            })
          );
        } else if (iframeUrl.includes("vidmoly")) {
          extractPromises.push(
            extractVidmoly(iframeUrl).then((s) => {
              if (s)
                streams.push(s);
            })
          );
        } else if (iframeUrl.includes("abyssplayer.com") || iframeUrl.includes("short.icu")) {
          extractPromises.push(
            extractAbyss(iframeUrl, "Default").then((res) => {
              if (Array.isArray(res))
                streams.push(...res);
            })
          );
        } else if (iframeUrl.includes("as-cdn") || iframeUrl.includes("awstream") || iframeUrl.includes("zephyrflick")) {
          extractPromises.push(
            extractAwsStream(iframeUrl).then((s) => {
              if (s)
                streams.push(s);
            })
          );
        } else if (iframeUrl.includes("filesforever.link") || iframeUrl.includes("cdnwish") || iframeUrl.includes("multimovies") || iframeUrl.includes("streamwish")) {
          extractPromises.push(
            extractStreamWish(iframeUrl).then((s) => {
              if (s)
                streams.push(s);
            })
          );
        } else if (iframeUrl.includes("blakiteapi.xyz")) {
          extractPromises.push(
            extractBlakite(iframeUrl).then((s) => {
              if (s)
                streams.push(s);
            })
          );
        } else if (iframeUrl.includes("cloudy.upns.one") || iframeUrl.includes("vidcloud.upns.ink")) {
          extractPromises.push(
            extractVidStack(iframeUrl).then((s) => {
              if (s)
                streams.push(s);
            })
          );
        }
      }
      yield Promise.allSettled(extractPromises);
      const seenUrls = /* @__PURE__ */ new Set();
      const uniqueStreams = [];
      for (const s of streams) {
        if (s && s.url && !seenUrls.has(s.url)) {
          seenUrls.add(s.url);
          uniqueStreams.push({
            name: s.name || "AnimeDekho",
            title: mediaType === "movie" ? details.title : `${details.title} - S${seasonNum}E${episodeNum}`,
            url: s.url,
            quality: s.quality || "Auto",
            headers: s.headers,
            subtitles: s.subtitles || [],
            provider: "animedekho",
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
