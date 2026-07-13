/**
 * netmirror - Built from src/netmirror/
 * Generated: 2026-07-13T13:46:15.289Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

// src/netmirror/constants.js
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var PLATFORM_MAP = {
  netflix: {
    ott: "nf",
    search: "/mobile/search.php",
    post: "/mobile/post.php",
    episodes: "/mobile/episodes.php",
    playlist: "/mobile/playlist.php",
    img: "poster/v",
    epImg: "epimg/150"
  },
  primevideo: {
    ott: "pv",
    search: "/mobile/pv/search.php",
    post: "/mobile/pv/post.php",
    episodes: "/mobile/pv/episodes.php",
    playlist: "/mobile/pv/playlist.php",
    img: "pv/v",
    epImg: "pvepimg"
  },
  hotstar: {
    ott: "hs",
    search: "/mobile/hs/search.php",
    post: "/mobile/hs/post.php",
    episodes: "/mobile/hs/episodes.php",
    playlist: "/mobile/hs/playlist.php",
    img: "hs/v",
    epImg: "hsepimg"
  },
  disney: {
    ott: "hs",
    search: "/mobile/hs/search.php",
    post: "/mobile/hs/post.php",
    episodes: "/mobile/hs/episodes.php",
    playlist: "/mobile/hs/playlist.php",
    img: "hs/v",
    epImg: "hsepimg"
  }
};
var NEW_TV_BASE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Requested-With": "NetmirrorNewTV v1.0",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0 /OS.GatuNewTV v1.0",
  "Accept": "application/json, text/plain, */*"
};
var NEW_TV_DOMAINS = [
  "aHR0cHM6Ly9tb2JpbGVkZXRlY3RzLmNvbQ==",
  "aHR0cHM6Ly9tb2JpbGVkZXRlY3QuYXBw",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LmFydA==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LmNj",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LmNsaWNr",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0Lmluaw==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LmxpdmU=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LnBybw==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LnNob3A=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LnNpdGU=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LnNwYWNl",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LnN0b3Jl",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LnZpcA==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0Lndpa2k=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0Lnh5eg==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5hcnQ=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5jYw==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5pbmZv",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5pbms=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5saXZl",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5wcm8=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5zdG9yZQ==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy50b3A=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy54eXo="
];

// src/netmirror/utils.js
var resolvedApiUrl = "";
function safeAtob(encoded) {
  if (typeof atob === "function") {
    return atob(encoded);
  }
  return Buffer.from(encoded, "base64").toString("binary");
}
function resolveApiUrl() {
  return __async(this, null, function* () {
    if (resolvedApiUrl)
      return resolvedApiUrl;
    for (const encoded of NEW_TV_DOMAINS) {
      const base = safeAtob(encoded).replace(/\/$/, "");
      try {
        const response = yield fetch(`${base}/checknewtv.php`, {
          headers: __spreadProps(__spreadValues({}, NEW_TV_BASE_HEADERS), { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" })
        });
        const data = yield response.json();
        const tokenHash = data.token_hash;
        if (tokenHash) {
          resolvedApiUrl = safeAtob(tokenHash).replace(/\/$/, "");
          return resolvedApiUrl;
        }
      } catch (error) {
      }
    }
    throw new Error("Failed to resolve NewTV API base URL");
  });
}
var cookieValue = "";
var cookieTimestamp = 0;
function bypass(ott) {
  return __async(this, null, function* () {
    if (cookieValue && Date.now() - cookieTimestamp < 54e6) {
      return cookieValue;
    }
    const newUrl = "https://net52.cc";
    const userAgent = "Mozilla/5.0 (Linux; Android 12; RMX2117 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/147.0.7727.55 Mobile Safari/537.36 /OS.Gatu v3.0";
    try {
      console.log("[NetMirror] Running NetMirror Mobile bypass...");
      const homeResponse = yield fetch(`${newUrl}/mobile/home?app=1`, {
        headers: {
          "User-Agent": userAgent,
          "X-Requested-With": "app.netmirror.netmirrornew"
        }
      });
      const homeHtml = yield homeResponse.text();
      const match = homeHtml.match(/<body[^>]*data-addhash=["']([^"']+)["']/i);
      if (!match) {
        console.error("[NetMirror] Failed to extract data-addhash from home page");
        return "";
      }
      const addhash = match[1];
      console.log("[NetMirror] Extracted addhash:", addhash);
      const triggerUrl = `https://userver.net52.cc/?jjoii=${encodeURIComponent(addhash)}&a=y&t=${Math.floor(Date.now() / 1e3)}`;
      yield fetch(triggerUrl, {
        headers: {
          "User-Agent": userAgent
        }
      });
      const verifyUrl = `${newUrl}/mobile/verify2.php`;
      for (let count = 1; count <= 7; count++) {
        yield new Promise((resolve) => setTimeout(resolve, 1e4));
        console.log(`[NetMirror] Polling verify2.php (attempt ${count}/7)...`);
        const verifyResponse = yield fetch(verifyUrl, {
          method: "POST",
          headers: {
            "User-Agent": userAgent,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: `verify=${encodeURIComponent(addhash)}`
        });
        const verifyText = yield verifyResponse.text();
        console.log("[NetMirror] Poll response:", verifyText);
        if (verifyText.includes('"statusup":"All Done"')) {
          let newCookie = "";
          const headers = verifyResponse.headers;
          if (headers) {
            let setCookie = headers.get("set-cookie") || headers.get("Set-Cookie") || headers.get("SET-COOKIE");
            if (setCookie) {
              const match2 = setCookie.match(/t_hash_t=([^;]+)/);
              if (match2)
                newCookie = match2[1];
            }
            if (!newCookie && headers.entries) {
              try {
                for (const [key, val] of headers.entries()) {
                  if (key.toLowerCase() === "set-cookie") {
                    const match2 = val.match(/t_hash_t=([^;]+)/);
                    if (match2) {
                      newCookie = match2[1];
                      break;
                    }
                  }
                }
              } catch (e) {
              }
            }
            if (!newCookie && headers.forEach) {
              try {
                headers.forEach((val, key) => {
                  if (key.toLowerCase() === "set-cookie") {
                    const match2 = val.match(/t_hash_t=([^;]+)/);
                    if (match2)
                      newCookie = match2[1];
                  }
                });
              } catch (e) {
              }
            }
          }
          cookieValue = newCookie;
          cookieTimestamp = Date.now();
          console.log("[NetMirror] Verification completed successfully. Cookie:", cookieValue);
          return cookieValue;
        }
      }
      console.error("[NetMirror] Verification timed out");
    } catch (e) {
      cookieValue = "";
      console.error("[NetMirror] Polling bypass failed:", e.message);
    }
    return "";
  });
}
function buildNewTvHeaders(ott, extra = {}) {
  return __spreadValues(__spreadProps(__spreadValues({}, NEW_TV_BASE_HEADERS), {
    "Ott": ott
  }), extra);
}

// src/netmirror/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const settings = globalThis.SCRAPER_SETTINGS || {};
      const preferred = settings.preferredPlatform || "all";
      const tmdbType = mediaType === "tv" ? "tv" : "movie";
      const tmdbResp = yield fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      });
      const tmdbData = yield tmdbResp.json();
      const title = mediaType === "tv" ? tmdbData.name : tmdbData.title;
      if (!title)
        throw new Error("Could not fetch title from TMDB");
      let platforms = ["netflix", "primevideo", "hotstar", "disney"];
      if (preferred !== "all") {
        platforms = [preferred, ...platforms.filter((p) => p !== preferred)];
      }
      for (const platformKey of platforms) {
        try {
          const streams = yield fetchFromPlatform(platformKey, title, mediaType, season, episode);
          if (streams && streams.length > 0)
            return streams;
        } catch (e) {
        }
      }
      return [];
    } catch (error) {
      return [];
    }
  });
}
function fetchFromPlatform(platformKey, title, mediaType, season, episode) {
  return __async(this, null, function* () {
    const platform = PLATFORM_MAP[platformKey];
    const apiBase = yield resolveApiUrl();
    const cookie = yield bypass(platform.ott);
    const reqCookies = [];
    if (cookie) {
      reqCookies.push(`t_hash_t=${cookie}`);
    }
    const settings = globalThis.SCRAPER_SETTINGS || {};
    if (settings.forceHd !== false) {
      reqCookies.push("hd=on");
    }
    const cookieHeader = reqCookies.length > 0 ? { "Cookie": reqCookies.join("; ") } : {};
    const searchUrl = `${apiBase}/newtv/search.php?s=${encodeURIComponent(title)}`;
    const searchResp = yield fetch(searchUrl, {
      headers: buildNewTvHeaders(platform.ott, cookieHeader)
    });
    const searchData = yield searchResp.json();
    if (!searchData.searchResult || searchData.searchResult.length === 0)
      return null;
    const result = searchData.searchResult[0];
    const contentId = result.id;
    const postUrl = `${apiBase}/newtv/post.php?id=${contentId}`;
    const postResp = yield fetch(postUrl, {
      headers: buildNewTvHeaders(platform.ott, __spreadValues({ Lastep: "", Usertoken: "" }, cookieHeader))
    });
    const postData = yield postResp.json();
    let targetId = contentId;
    if (mediaType === "tv") {
      const episodes = yield getAllEpisodes(contentId, postData, platform, apiBase);
      const targetEp = episodes.find((ep) => ep && ep.s === season && ep.ep === episode);
      if (targetEp) {
        targetId = targetEp.id;
      } else {
        return null;
      }
    } else {
      const isSeries = postData.type === "t" || postData.episodes && postData.episodes.filter((e) => e !== null).length > 0;
      if (isSeries)
        return null;
      targetId = postData.main_id || contentId;
    }
    const playlistUrl = `https://net52.cc${platform.playlist}?id=${targetId}&t=${encodeURIComponent(title)}&tm=${Math.floor(Date.now() / 1e3)}`;
    const playlistHeaders = {
      "Accept": "*/*",
      "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
      "Connection": "keep-alive",
      "Referer": `https://net52.cc/mobile/home?app=1`,
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/149.0.7827.91 Safari/537.36 /OS.Gatu v3.0",
      "X-Requested-With": "app.netmirror.netmirrornew"
    };
    if (cookie) {
      playlistHeaders["Cookie"] = `t_hash_t=${cookie}; ott=${platform.ott}; hd=on`;
    }
    const playlistResp = yield fetch(playlistUrl, {
      headers: playlistHeaders
    });
    const playlistData = yield playlistResp.json();
    if (playlistData && playlistData.length > 0) {
      const item = playlistData[0];
      if (item.sources && item.sources.length > 0) {
        return item.sources.map((source) => {
          const streamUrl = source.file.startsWith("http") ? source.file : `${apiBase}${source.file}`;
          const qMatch = source.file.match(/[?&]q=([^&]+)/);
          const quality = qMatch ? qMatch[1] : source.label === "Auto" ? "Auto" : source.label;
          return {
            name: `NetMirror (${platformKey.charAt(0).toUpperCase() + platformKey.slice(1)})`,
            title: `${title} - ${source.label}`,
            url: streamUrl,
            quality,
            headers: playlistHeaders
          };
        });
      }
    }
    return null;
  });
}
function getAllEpisodes(contentId, postData, platform, apiBase) {
  return __async(this, null, function* () {
    const episodes = [];
    const selectedSeasonIdx = postData.season ? postData.season.findIndex((s) => s.selected === true) : -1;
    const selectedSeasonId = selectedSeasonIdx >= 0 ? postData.season[selectedSeasonIdx].id : postData.nextPageSeason;
    const selectedSeasonNumber = selectedSeasonIdx >= 0 ? selectedSeasonIdx + 1 : null;
    if (postData.episodes) {
      postData.episodes.filter((e) => e !== null).forEach((ep) => {
        const epNum = ep.ep ? parseInt(ep.ep) : ep.epNum ? parseInt(ep.epNum.replace("E", "")) : null;
        const sNum = selectedSeasonNumber || (ep.sNum ? parseInt(ep.sNum.replace("S", "")) : null);
        episodes.push({
          id: ep.id,
          s: sNum,
          ep: epNum
        });
      });
    }
    if (postData.nextPageShow === 1 && selectedSeasonId) {
      const more = yield fetchEpisodesPage(contentId, selectedSeasonId, 2, selectedSeasonNumber, platform, apiBase);
      episodes.push(...more);
    }
    if (postData.season) {
      for (let index = 0; index < postData.season.length; index++) {
        const season = postData.season[index];
        if (season.id !== selectedSeasonId && season.id) {
          const more = yield fetchEpisodesPage(contentId, season.id, 1, index + 1, platform, apiBase);
          episodes.push(...more);
        }
      }
    }
    return episodes;
  });
}
function fetchEpisodesPage(contentId, seasonId, page, seasonNumber, platform, apiBase) {
  return __async(this, null, function* () {
    const episodes = [];
    let pg = page;
    while (true) {
      const url = `${apiBase}/newtv/episodes.php?id=${seasonId}&page=${pg}`;
      const resp = yield fetch(url, {
        headers: buildNewTvHeaders(platform.ott)
      });
      const data = yield resp.json();
      if (data.episodes) {
        data.episodes.filter((e) => e !== null).forEach((ep) => {
          const epNum = ep.ep ? parseInt(ep.ep) : ep.epNum ? parseInt(ep.epNum.replace("E", "")) : null;
          const sNum = seasonNumber || (ep.sNum ? parseInt(ep.sNum.replace("S", "")) : null);
          episodes.push({
            id: ep.id,
            s: sNum,
            ep: epNum
          });
        });
      }
      if (data.nextPageShow !== 1)
        break;
      pg++;
    }
    return episodes;
  });
}
function onSettings() {
  return __async(this, null, function* () {
    return [
      { type: "header", label: "Source Selection" },
      {
        type: "select",
        key: "preferredPlatform",
        label: "Preferred Streaming Source",
        description: "Select which platform to try first. If content isn't found, others will be searched as fallback.",
        options: [
          { label: "All Sources (Ordered)", value: "all" },
          { label: "Netflix", value: "netflix" },
          { label: "Prime Video", value: "primevideo" },
          { label: "Hotstar / Disney+", value: "hotstar" }
        ],
        defaultValue: "all"
      },
      { type: "header", label: "Advanced" },
      {
        type: "toggle",
        key: "forceHd",
        label: "Force HD Quality",
        description: "Attempts to force the player into HD mode when possible.",
        defaultValue: true
      }
    ];
  });
}
module.exports = { getStreams, onSettings };
