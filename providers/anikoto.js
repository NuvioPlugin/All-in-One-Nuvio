/*
 * Anikoto provider for Nuvio.
 * Adapted from the Anikoto source and AnikotoTheme extractor in
 * https://github.com/yuzono/anime-extensions (Apache-2.0).
 */

const cheerio = require("cheerio-without-node-native");
const CryptoJS = require("crypto-js");

const PROVIDER = "Anikoto";
const DOMAINS = [
  "https://anikototv.to",
  "https://anikoto.bz",
  "https://anikoto.cz",
  "https://anikoto.me",
  "https://anikoto.net",
  "https://anikototv.se"
];
const MAPPER_API = "https://mapper.nekostream.site/api";
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
const BASE_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": `${DOMAINS[0]}/`
};

function asBase64Url(value) {
  return value.replace(/\+/g, "-").replace(/\//g, "_");
}

function rc4Base64(input, key) {
  const encrypted = CryptoJS.RC4.encrypt(
    CryptoJS.enc.Utf8.parse(input),
    CryptoJS.enc.Utf8.parse(key),
    { padding: CryptoJS.pad.NoPadding }
  );
  return asBase64Url(CryptoJS.enc.Base64.stringify(encrypted.ciphertext));
}

function exchange(input, from, to) {
  return input.split("").map((char) => {
    const index = from.indexOf(char);
    return index < 0 ? char : to[index];
  }).join("");
}

function encodeVrf(input) {
  let value = exchange(input, "AP6GeR8H0lwUz1", "UAz8Gwl10P6ReH");
  value = rc4Base64(value, "ItFKjuWokn4ZpB");
  value = rc4Base64(value, "fOyt97QWFB3");
  value = exchange(value, "1majSlPQd2M5", "da1l2jSmP5QM");
  value = exchange(value, "CPYvHj09Au3", "0jHA9CPYu3v");
  value = value.split("").reverse().join("");
  value = rc4Base64(value, "736y1uTJpBLUX");
  return encodeURIComponent(asBase64Url(CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(value))));
}

function joinUrl(base, path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${base.replace(/\/$/, "")}/${String(path).replace(/^\//, "")}`;
}

async function request(url, options = {}) {
  const headers = Object.assign({}, BASE_HEADERS, options.headers || {});
  const response = await fetch(url, Object.assign({}, options, { headers }));
  return response;
}

async function getSiteText(path, referer) {
  let lastError = null;
  for (const domain of DOMAINS) {
    try {
      const response = await request(joinUrl(domain, path), {
        headers: {
          "Referer": referer || `${domain}/`,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      if (response.ok) return { text: await response.text(), domain };
      lastError = new Error(`HTTP ${response.status} for ${domain}${path}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Anikoto request failed");
}

async function getSiteJson(path, domain, referer) {
  const response = await request(joinUrl(domain, path), {
    headers: {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Referer": referer || `${domain}/`,
      "X-Requested-With": "XMLHttpRequest"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);
  const text = await response.text();
  return JSON.parse(text);
}

async function getTmdbInfo(tmdbId, mediaType, season) {
  const kind = mediaType === "movie" ? "movie" : "tv";
  const response = await request(`https://api.themoviedb.org/3/${kind}/${encodeURIComponent(tmdbId)}?api_key=${TMDB_API_KEY}`);
  if (!response.ok) throw new Error(`TMDB returned HTTP ${response.status}`);
  const data = await response.json();
  const title = kind === "movie" ? (data.title || data.original_title) : (data.name || data.original_name);
  if (!title) throw new Error("TMDB title was empty");
  let seasonTitle = "";
  if (kind === "tv" && season != null) {
    try {
      const seasonResponse = await request(`https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdbId)}/season/${encodeURIComponent(season)}?api_key=${TMDB_API_KEY}`);
      if (seasonResponse.ok) {
        const seasonData = await seasonResponse.json();
        seasonTitle = seasonData.name || "";
      }
    } catch (_) {}
  }
  return { title, originalTitle: data.original_name || data.original_title || "", seasonTitle };
}

async function fetchJsonWithTimeout(url, timeoutMs = 5000) {
  const requestOptions = { headers: { "Accept": "application/json, text/plain, */*" } };
  // Nuvio's QuickJS runtime has no timer globals; rely on its overall plugin
  // execution timeout in that environment.
  if (typeof setTimeout !== "function") {
    try {
      const response = await request(url, requestOptions);
      if (!response.ok) return null;
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  let timer;
  try {
    const response = await Promise.race([
      request(url, requestOptions),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Request timed out")), timeoutMs); })
    ]);
    if (!response.ok) return null;
    return await response.json();
  } catch (_) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function getImdbId(tmdbId) {
  const data = await fetchJsonWithTimeout(`https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdbId)}/external_ids?api_key=${TMDB_API_KEY}`);
  return data && data.imdb_id || null;
}

function sameAirDate(first, second) {
  if (!first || !second) return false;
  const a = Date.parse(`${String(first).split("T")[0]}T00:00:00Z`);
  const b = Date.parse(`${String(second).split("T")[0]}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) && Math.ceil(Math.abs(a - b) / 86400000) <= 2;
}

async function resolveAnimeMapping(tmdbId, season, episode) {
  const seasonNumber = Number(season) || 1;
  const episodeNumber = Number(episode) || 1;
  const imdbId = await getImdbId(tmdbId);
  if (!imdbId) return null;

  let meta = null;
  for (const url of [
    `https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`,
    `https://cinemeta-live.strem.io/meta/series/${imdbId}.json`
  ]) {
    const data = await fetchJsonWithTimeout(url);
    if (data && data.meta && Array.isArray(data.meta.videos)) {
      meta = data.meta;
      break;
    }
  }

  if (!meta || !Array.isArray(meta.videos)) {
    const epData = await fetchJsonWithTimeout(`https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdbId)}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${TMDB_API_KEY}`);
    if (epData && epData.air_date) {
      const tvData = await fetchJsonWithTimeout(`https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdbId)}?api_key=${TMDB_API_KEY}`);
      meta = {
        name: tvData && (tvData.name || tvData.original_name) || "",
        moviedb_id: tmdbId,
        videos: [{ season: seasonNumber, episode: episodeNumber, released: epData.air_date }]
      };
    }
  }
  if (!meta || !Array.isArray(meta.videos)) return null;

  const video = meta.videos.find((item) => Number(item.season) === seasonNumber && Number(item.episode) === episodeNumber);
  if (!video || !video.released) return null;
  const airDate = String(video.released).split("T")[0];
  const dayIndex = meta.videos.filter((item) => {
    if (!item.released || String(item.released).split("T")[0] !== airDate) return false;
    return Number(item.season) < seasonNumber || (Number(item.season) === seasonNumber && Number(item.episode) < episodeNumber);
  }).length;

  const malIds = [];
  const tmdbRef = tmdbId || meta.moviedb_id || meta.themoviedb_id;
  const idLookups = [
    `https://arm.haglund.dev/api/v2/imdb?id=${encodeURIComponent(imdbId)}`,
    tmdbRef ? `https://arm.haglund.dev/api/v2/themoviedb?id=${encodeURIComponent(tmdbRef)}` : "",
    meta.tvdb_id ? `https://arm.haglund.dev/api/v2/thetvdb?id=${encodeURIComponent(meta.tvdb_id)}` : ""
  ].filter(Boolean);
  for (const url of idLookups) {
    const data = await fetchJsonWithTimeout(url);
    if (Array.isArray(data)) data.forEach((entry) => { if (entry && entry.myanimelist) malIds.push(entry.myanimelist); });
  }
  const aniByTmdb = await fetchJsonWithTimeout(`https://api.ani.zip/mappings?themoviedb_id=${encodeURIComponent(tmdbRef)}`);
  if (aniByTmdb && aniByTmdb.mappings && aniByTmdb.mappings.mal_id) malIds.push(aniByTmdb.mappings.mal_id);
  const uniqueIds = [...new Set(malIds.map(String).filter(Boolean))].sort((a, b) => Number(b) - Number(a));

  for (const malId of uniqueIds) {
    const aniData = await fetchJsonWithTimeout(`https://api.ani.zip/mappings?mal_id=${encodeURIComponent(malId)}`);
    if (aniData && aniData.episodes) {
      const episodes = Object.values(aniData.episodes).map((item) => ({
        number: Number.parseInt(item.episode, 10),
        airDate: item.airDateUtc || item.airDate || item.airdate
      })).filter((item) => Number.isFinite(item.number));
      const matches = episodes.filter((item) => sameAirDate(item.airDate, airDate)).sort((a, b) => a.number - b.number);
      if (matches[dayIndex]) {
        return { imdbId, malId, malEpisode: matches[dayIndex].number, animeTitle: meta.name || "", airDate };
      }
    }

    const jikan = await fetchJsonWithTimeout(`https://api.jikan.moe/v4/anime/${encodeURIComponent(malId)}`);
    if (jikan && jikan.data && jikan.data.aired && jikan.data.aired.from && sameAirDate(jikan.data.aired.from, airDate)) {
      return { imdbId, malId, malEpisode: dayIndex + 1, animeTitle: meta.name || "", airDate };
    }
  }

  if (uniqueIds.length === 1 && seasonNumber === 1) {
    return { imdbId, malId: uniqueIds[0], malEpisode: episodeNumber, animeTitle: meta.name || "", airDate };
  }
  return null;
}

async function getMalTitle(malId) {
  const jikan = await fetchJsonWithTimeout(`https://api.jikan.moe/v4/anime/${encodeURIComponent(malId)}`, 4000);
  const jikanTitle = jikan && jikan.data && (jikan.data.title || jikan.data.title_english);
  if (jikanTitle) return jikanTitle;
  const aniData = await fetchJsonWithTimeout(`https://api.ani.zip/mappings?mal_id=${encodeURIComponent(malId)}`, 4000);
  const titles = aniData && aniData.titles || {};
  return titles.en || titles["x-jat"] || titles.ja || "";
}

function cleanSearchTitle(title) {
  return String(title || "")
    .replace(/\b(?:season|series)\s*\d+\b/gi, " ")
    .replace(/\b\d+(?:st|nd|rd|th)\s+season\b/gi, " ")
    .replace(/\s*[:|–—-]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedTitle(title) {
  return cleanSearchTitle(title).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseSearchCards(html) {
  const $ = cheerio.load(html);
  const cards = [];
  $("div.ani.items > div.item").each((_, element) => {
    const card = $(element);
    const anchor = card.find("a.name").first();
    const href = anchor.attr("href") || card.find("a[href]").first().attr("href");
    const title = anchor.text().trim() || card.find("a[href]").first().text().trim();
    if (href && title) cards.push({ href, title });
  });
  return cards;
}

async function findAnime(domain, titles) {
  const seen = new Set();
  for (const rawTitle of titles) {
    const query = cleanSearchTitle(rawTitle);
    if (!query || seen.has(query.toLowerCase())) continue;
    seen.add(query.toLowerCase());
    const result = await getSiteText(`/filter?keyword=${encodeURIComponent(query)}&page=1&vrf=${encodeVrf(query)}`, `${domain}/`);
    const cards = parseSearchCards(result.text);
    if (!cards.length) continue;
    const target = normalizedTitle(query);
    const exact = cards.find((card) => normalizedTitle(card.title) === target);
    const close = exact || cards.find((card) => {
      const found = normalizedTitle(card.title);
      return found && target && (found.includes(target) || target.includes(found));
    });
    const selected = close || cards[0];
    return { domain: result.domain, href: selected.href, title: selected.title };
  }
  return null;
}

async function fetchAnimeId(domain, animePath) {
  const result = await getSiteText(animePath, `${domain}/`);
  const $ = cheerio.load(result.text);
  const id = $("[data-id]").first().attr("data-id") || $("[data-tip]").first().attr("data-tip");
  if (!id) throw new Error("Anikoto anime page did not expose its episode ID");
  return { domain: result.domain, id };
}

function parseEpisodeList(html, episodeNumber) {
  const $ = cheerio.load(html);
  let selected = null;
  $("div.episodes ul > li > a").each((_, element) => {
    if (selected) return;
    const link = $(element);
    const number = Number(link.attr("data-num"));
    if (Number.isFinite(number) && (number === Number(episodeNumber) || Math.floor(number) === Number(episodeNumber))) {
      selected = {
        number,
        ids: link.attr("data-ids") || "",
        malId: link.attr("data-mal") || "",
        slug: link.attr("data-slug") || "",
        timestamp: link.attr("data-timestamp") || "",
        title: link.parent().find("span.d-title").text().trim()
      };
    }
  });
  return selected;
}

function parseServerList(html) {
  const $ = cheerio.load(html);
  const servers = [];
  $("div.servers > div.type").each((_, element) => {
    const group = $(element);
    const label = group.find("label").first().text().trim() || group.attr("data-type") || "Sub";
    group.find("li").each((__, item) => {
      const li = $(item);
      if ((li.attr("class") || "").includes("download-icon")) return;
      const id = li.attr("data-link-id");
      const name = li.text().trim();
      if (id && name) servers.push({ id, name, type: label });
    });
  });
  return servers;
}

async function getMapperServers(episode, domain) {
  if (!episode.malId || !episode.slug || !episode.timestamp) return [];
  const response = await request(`${MAPPER_API}/mal/${encodeURIComponent(episode.malId)}/${encodeURIComponent(episode.slug)}/${encodeURIComponent(episode.timestamp)}`, {
    headers: {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Referer": `${domain}/`,
      "Origin": domain
    }
  });
  if (!response.ok) return [];
  const data = await response.json();
  const servers = [];
  Object.keys(data || {}).forEach((key) => {
    if (key.toLowerCase() === "status") return;
    const value = data[key] || {};
    const display = key.toLowerCase() === "animepahe" ? "Kiwi-Stream" : key;
    [["sub", "H-Sub"], ["dub", "A-Dub"]].forEach(([sourceType, label]) => {
      const url = value[sourceType] && value[sourceType].url;
      if (url) servers.push({ id: url, name: display, type: label, direct: true });
    });
  });
  return servers;
}

function paddedAesKey() {
  const key = CryptoJS.enc.Utf8.parse("i?LMTAx0Q6,:}50U");
  while (key.sigBytes < 32) key.concat(CryptoJS.lib.WordArray.create([0], 1));
  key.sigBytes = 32;
  return key;
}

function decryptMegaPlay(enc) {
  if (!enc) return "";
  const normalized = enc.replace(/-/g, "+").replace(/_/g, "/");
  const decrypted = CryptoJS.AES.decrypt(
    normalized,
    paddedAesKey(),
    {
      iv: CryptoJS.enc.Utf8.parse("W0;27ToaUpl_P%'c"),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );
  return decrypted.toString(CryptoJS.enc.Utf8);
}

function addMegaToken(url) {
  if (!url || /[?&]token=/i.test(url)) return url;
  const match = url.match(/\/([a-f0-9]{32})\/([a-f0-9]{32})\//i);
  if (!match) return url;
  const payload = `${Math.floor(Date.now() / 1000) + 90}|${match[1].toLowerCase()}/${match[2].toLowerCase()}`;
  const signature = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(payload, "MpCdnT0k3n!9f2K#xQ7vL5mR8wN1pY4s"))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const tokenData = asBase64Url(CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(payload))).replace(/=+$/, "");
  const token = `${tokenData}.${signature}`;
  return `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
}

function findM3u8(value) {
  if (!value) return "";
  const match = String(value).match(/https?:\\?\/\\?\/[^\s"'<>\\]+?\.m3u8(?:\?[^\s"'<>\\]*)?/i);
  if (!match) return "";
  return match[0].replace(/\\\//g, "/").replace(/\\u0026/gi, "&").replace(/&amp;/g, "&");
}

async function extractMegaPlay(embedUrl, server, episodeTitle) {
  const page = await request(embedUrl, { headers: { "Referer": `${DOMAINS[0]}/` } });
  if (!page.ok) return null;
  const html = await page.text();
  const idMatch = html.match(/data-id=["']([^"']+)["']/i) || html.match(/\bFile\s+(\d+)/i);
  if (!idMatch) return null;
  const host = embedUrl.match(/^https?:\/\/([^/]+)/i);
  const origin = host ? `https://${host[1]}` : "https://megaplay.buzz";
  let sourcesUrl = `${origin}/stream/getSources?id=${encodeURIComponent(idMatch[1])}`;
  const seasonQuery = embedUrl.match(/[?&]s=([^&]+)/);
  if (seasonQuery) sourcesUrl += `&s=${seasonQuery[1]}`;
  const sourcesResponse = await request(sourcesUrl, {
    headers: { "Accept": "application/json,*/*", "X-Requested-With": "XMLHttpRequest", "Referer": embedUrl }
  });
  if (!sourcesResponse.ok) return null;
  const data = await sourcesResponse.json();
  let m3u8 = "";
  if (data.enc) {
    try { m3u8 = findM3u8(decryptMegaPlay(data.enc)); } catch (_) {}
  }
  if (!m3u8) {
    const source = data.sources;
    m3u8 = typeof source === "string" ? source : source && (source.file || (source[0] && (source[0].file || source[0])));
  }
  m3u8 = addMegaToken(m3u8);
  if (!m3u8) return null;
  const tracks = Array.isArray(data.tracks) ? data.tracks.filter((track) => track && track.file && track.label).map((track) => ({
    url: track.file,
    name: track.label,
    language: /english/i.test(track.label) ? "en" : track.label
  })) : [];
  return {
    url: m3u8,
    referer: `${origin}/`,
    subtitles: tracks,
    title: `${server.name} - ${server.type}${episodeTitle ? ` - ${episodeTitle}` : ""}`
  };
}

function extractMewcdnUrl(embedUrl) {
  const fragment = embedUrl.split("#")[1];
  if (!fragment) return "";
  try {
    const raw = atob(fragment.replace(/-/g, "+").replace(/_/g, "/"));
    const decoded = decodeURIComponent(raw.split("").map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
    return decoded.startsWith("http") ? decoded : "";
  } catch (_) { return ""; }
}

async function resolveServer(server, episode, domain) {
  if (server.direct) return server.id;
  const data = await getSiteJson(`/ajax/server?get=${encodeURIComponent(server.id)}`, domain, `${domain}${episode.path}`);
  return data && data.result && data.result.url || "";
}

async function extractServer(server, episode, domain, animeTitle, season, episodeNumber) {
  let embedUrl = "";
  try {
    embedUrl = await resolveServer(server, episode, domain);
    if (!embedUrl) return null;
    const episodeLabel = `S${season || 1}E${episodeNumber || 1}`;
    const lower = `${server.name} ${embedUrl}`.toLowerCase();
    if (/megaplay\.[^/]+\/stream\//i.test(embedUrl) || /vidstream|hd-?1|hd-?2/.test(lower)) {
      const result = await extractMegaPlay(embedUrl, server, episode.title);
      if (result) return result;
    }
    if (embedUrl.includes("mewcdn.online/player/plyr.php")) {
      const url = extractMewcdnUrl(embedUrl);
      if (url) return { url, referer: "https://mewcdn.online/", subtitles: [], title: `${server.name} - ${server.type}` };
    }
    if (/\.m3u8(?:$|[?#])/i.test(embedUrl) && !embedUrl.includes("/stream/")) {
      return { url: embedUrl, referer: `${domain}/`, subtitles: [], title: `${animeTitle} ${episodeLabel} - ${server.name} - ${server.type}` };
    }
    const page = await request(embedUrl, { headers: { "Referer": `${domain}/` } });
    if (!page.ok) return null;
    const html = await page.text();
    const url = findM3u8(html);
    if (url) return { url, referer: embedUrl, subtitles: [], title: `${animeTitle} ${episodeLabel} - ${server.name} - ${server.type}` };
  } catch (error) {
    console.log(`[${PROVIDER}] ${server.name} extraction failed: ${error.message}`);
  }
  return null;
}

function makeStream(stream, animeTitle, mediaType, season, episode) {
  const episodeText = mediaType === "tv" ? `S${season || 1}E${episode || 1}` : "Movie";
  const title = `${animeTitle} - ${episodeText} - ${stream.title}`;
  const host = stream.referer || `${DOMAINS[0]}/`;
  const hostOrigin = host.match(/^https?:\/\/[^/]+/i);
  return {
    name: `${PROVIDER} - ${stream.title}`,
    title,
    description: title,
    url: stream.url,
    quality: "Multi",
    type: "m3u8",
    headers: {
      "User-Agent": USER_AGENT,
      "Referer": host,
      ...(hostOrigin ? { "Origin": hostOrigin[0] } : {})
    },
    subtitles: stream.subtitles || []
  };
}

async function getStreams(tmdbId, mediaType = "tv", season = 1, episode = 1) {
  const type = mediaType === "movie" ? "movie" : "tv";
  const seasonNumber = Number(season) || 1;
  const episodeNumber = Number(episode) || 1;
  try {
    console.log(`[${PROVIDER}] Looking up ${type} ${tmdbId} S${seasonNumber}E${episodeNumber}`);
    const tmdb = await getTmdbInfo(tmdbId, type, seasonNumber);
    let mapping = null;
    let mappedTitle = "";
    if (type === "tv") {
      mapping = await resolveAnimeMapping(tmdbId, seasonNumber, episodeNumber);
      if (mapping) {
        mappedTitle = await getMalTitle(mapping.malId) || mapping.animeTitle;
        console.log(`[${PROVIDER}] Anime mapping: MAL ${mapping.malId}, episode ${mapping.malEpisode}, title "${mappedTitle}"`);
      } else {
        console.log(`[${PROVIDER}] No episode mapping; falling back to TMDB titles`);
      }
    } else {
      const aniData = await fetchJsonWithTimeout(`https://api.ani.zip/mappings?themoviedb_id=${encodeURIComponent(tmdbId)}`);
      const malId = aniData && aniData.mappings && aniData.mappings.mal_id;
      if (malId) mappedTitle = await getMalTitle(malId);
    }
    const titles = type === "tv"
      ? [mappedTitle, mapping && mapping.animeTitle, tmdb.seasonTitle, tmdb.title, tmdb.originalTitle]
      : [mappedTitle, tmdb.title, tmdb.originalTitle];
    const anime = await findAnime(DOMAINS[0], titles);
    if (!anime) {
      console.log(`[${PROVIDER}] No matching anime page found for ${titles.filter(Boolean).join(" / ")}`);
      return [];
    }
    const animePath = anime.href.replace(/^https?:\/\/[^/]+/i, "").split("?")[0] || "/";
    const animeInfo = await fetchAnimeId(anime.domain, animePath);
    const listPath = `/ajax/episode/list/${encodeURIComponent(animeInfo.id)}?vrf=${encodeVrf(animeInfo.id)}`;
    const episodeJson = await getSiteJson(listPath, animeInfo.domain, joinUrl(animeInfo.domain, animePath));
    if (!episodeJson || typeof episodeJson.result !== "string") throw new Error("Episode list response was invalid");
    const targetEpisode = type === "movie" ? 1 : (mapping && mapping.malEpisode || episodeNumber);
    const episodeData = parseEpisodeList(episodeJson.result, targetEpisode);
    if (!episodeData || !episodeData.ids) {
      console.log(`[${PROVIDER}] Episode ${targetEpisode} was not found for ${anime.title}`);
      return [];
    }
    episodeData.path = `${animePath.replace(/\/$/, "")}/ep-${episodeData.number}`;
    const serverListPath = `/ajax/server/list?servers=${encodeURIComponent(episodeData.ids)}`;
    const serverJson = await getSiteJson(serverListPath, animeInfo.domain, joinUrl(animeInfo.domain, episodeData.path));
    if (!serverJson || typeof serverJson.result !== "string") throw new Error("Server list response was invalid");
    const servers = parseServerList(serverJson.result);
    try {
      servers.push(...await getMapperServers(episodeData, animeInfo.domain));
    } catch (error) {
      console.log(`[${PROVIDER}] Mapper lookup failed: ${error.message}`);
    }
    const output = [];
    const seen = new Set();
    for (const server of servers) {
      const result = await extractServer(server, episodeData, animeInfo.domain, anime.title, seasonNumber, episodeNumber);
      if (!result || !result.url || seen.has(result.url)) continue;
      seen.add(result.url);
      output.push(makeStream(result, anime.title, type, seasonNumber, episodeNumber));
    }
    console.log(`[${PROVIDER}] Streams found: ${output.length}`);
    return output;
  } catch (error) {
    console.error(`[${PROVIDER}] Error: ${error && error.message || error}`);
    return [];
  }
}

module.exports = { getStreams };
