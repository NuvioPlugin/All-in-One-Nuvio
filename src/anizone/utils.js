import { MAIN_URL, HEADERS, TMDB_API_KEY } from './constants.js';

const HEX_ESCAPE = /\\x([0-9a-fA-F]{2})/g;
const INVALID_BACKSLASH = /\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g;

export function sanitizeJson(raw) {
    if (!raw) return "";
    return raw
        .replace(/\\u0022/g, '"')
        .replace(/\\u0026/g, '&')
        .replace(/\\'/g, "'")
        .replace(/\\\//g, '/')
        .replace(/\\\\/g, '\\')
        .replace(/\\&/g, '&')
        .replace(/\\'/g, "'")
        .replace(/\\0/g, '\\u0000')
        .replace(HEX_ESCAPE, (_, hex) => '\\u00' + hex)
        .replace(INVALID_BACKSLASH, '');
}

export function parseXDataJson(rawArg) {
    const sanitized = sanitizeJson(rawArg);
    return JSON.parse(sanitized);
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const mergedHeaders = {
        'User-Agent': HEADERS['User-Agent'],
        'Referer': HEADERS['Referer'],
        ...(options.headers || {})
    };
    const fetchOptions = {
        skipSizeCheck: true,
        ...options,
        headers: mergedHeaders
    };

    // Nuvio's QuickJS runtime has no timer globals. Its plugin runner already
    // enforces an overall execution timeout, so issue the request directly.
    if (typeof setTimeout !== 'function') {
        return fetch(url, fetchOptions);
    }

    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    });
    try {
        const res = await Promise.race([
            fetch(url, fetchOptions),
            timeoutPromise
        ]);
        clearTimeout(timer);
        return res;
    } catch (e) {
        clearTimeout(timer);
        throw e;
    }
}

export async function fetchText(url, options = {}) {
    const finalUrl = url.startsWith('http') ? url : `${MAIN_URL}${url}`;
    try {
        const response = await fetchWithTimeout(finalUrl, options, 10000);
        if (!response.ok) return "";
        return await response.text();
    } catch (e) {
        return "";
    }
}

export async function fetchWithCookies(url, options = {}) {
    const finalUrl = url.startsWith('http') ? url : `${MAIN_URL}${url}`;
    try {
        const response = await fetchWithTimeout(finalUrl, options, 10000);
        if (!response.ok) return { text: "", cookies: "", ok: false };
        const text = await response.text();
        let cookies = "";
        try {
            if (typeof response.headers?.getSetCookie === 'function') {
                cookies = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
            } else if (response.headers?.get) {
                cookies = response.headers.get('set-cookie') || '';
            }
        } catch (_) {}
        return { text, cookies, ok: true };
    } catch (e) {
        return { text: "", cookies: "", ok: false };
    }
}

export async function getImdbId(tmdbId, mediaType) {
    try {
        const url = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const res = await fetchWithTimeout(url, {}, 5000);
        const data = await res.json();
        return data.imdb_id || null;
    } catch (_) {
        return null;
    }
}

export function isDateMatch(d1, d2) {
    if (!d1 || !d2) return false;
    const s1 = d1.split('T')[0];
    const s2 = d2.split('T')[0];
    const date1 = new Date(s1 + "T00:00:00Z");
    const date2 = new Date(s2 + "T00:00:00Z");
    const diff = Math.abs(date1.getTime() - date2.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) <= 2;
}

export async function resolveMapping(imdbId, season, episode, tmdbId) {
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
            const mRes = await fetchWithTimeout(url, {}, 5000);
            if (mRes.ok) {
                const text = await mRes.text();
                const json = JSON.parse(text);
                if (json?.meta?.videos) {
                    metaData = json.meta;
                    break;
                }
            }
        } catch (_) {}
    }

    if ((!metaData || !metaData.videos) && tmdbId) {
        try {
            const tmdbEpUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}/episode/${episodeNum}?api_key=${TMDB_API_KEY}`;
            const tmdbRes = await fetchWithTimeout(tmdbEpUrl, {}, 5000);
            if (tmdbRes.ok) {
                const epData = JSON.parse(await tmdbRes.text());
                if (epData?.air_date) {
                    const tvUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
                    const tvRes = await fetchWithTimeout(tvUrl, {}, 5000);
                    const tvData = tvRes.ok ? JSON.parse(await tvRes.text()) : {};
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
        } catch (_) {}
    }

    if (!metaData || !metaData.videos) return null;

    const video = metaData.videos.find(v => v.season === seasonNum && v.episode === episodeNum);
    if (!video?.released) return null;
    const airDate = video.released.split('T')[0];
    const showTitle = metaData.name;

    const dayIndex = metaData.videos.filter(v => {
        if (!v.released) return false;
        return v.released.split('T')[0] === airDate && (v.season < seasonNum || (v.season === seasonNum && v.episode < episodeNum));
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
            const res = await fetchWithTimeout(url, {}, 5000);
            if (res.ok) {
                const data = JSON.parse(await res.text());
                if (Array.isArray(data)) {
                    data.forEach(e => { if (e.myanimelist) malIds.push(e.myanimelist); });
                }
            }
        } catch (_) {}
    }

    try {
        const aniIdUrl = tId ? `https://api.ani.zip/mappings?themoviedb_id=${tId}` : `https://api.ani.zip/mappings?imdb_id=${imdbId}`;
        const aniRes = await fetchWithTimeout(aniIdUrl, {}, 5000);
        if (aniRes.ok) {
            const aniData = JSON.parse(await aniRes.text());
            if (aniData?.mappings?.mal_id) malIds.push(aniData.mappings.mal_id);
        }
    } catch (_) {}

    malIds = [...new Set(malIds)].filter(Boolean).sort((a, b) => b - a);

    let finalResult = null;
    for (const malId of malIds) {
        try {
            const aniRes = await fetchWithTimeout(`https://api.ani.zip/mappings?mal_id=${malId}`, {}, 5000);
            if (aniRes.ok) {
                const aniData = JSON.parse(await aniRes.text());
                const extraTitles = aniData?.titles ? Object.values(aniData.titles).filter(Boolean) : [];
                if (aniData?.episodes) {
                    const aniEpisodes = Object.values(aniData.episodes).map(ep => ({
                        mal_episode_number: parseInt(ep.episode, 10),
                        air_date: ep.airDateUtc || ep.airDate || ep.airdate
                    })).filter(ep => !isNaN(ep.mal_episode_number));

                    const aniDateMatches = aniEpisodes.filter(ep => isDateMatch(ep.air_date, airDate))
                        .sort((a, b) => a.mal_episode_number - b.mal_episode_number);

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
        } catch (_) {}

        try {
            const jRes = await fetchWithTimeout(`https://api.jikan.moe/v4/anime/${malId}`, {}, 5000);
            if (jRes.ok) {
                const jData = JSON.parse(await jRes.text());
                if (jData?.data?.aired?.from && isDateMatch(jData.data.aired.from, airDate)) {
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
        } catch (_) {}
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
}

export async function getMalTitle(malId) {
    if (!malId) return null;
    try {
        const res = await fetchWithTimeout(`https://api.jikan.moe/v4/anime/${malId}`, {}, 5000);
        if (res.ok) {
            const data = await res.json();
            return data.data?.title || data.data?.title_english || null;
        }
    } catch (_) {}
    return null;
}

export async function getTmdbInfo(tmdbId, mediaType, season = 1) {
    try {
        const url = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
        const res = await fetchWithTimeout(url, {}, 6000);
        if (!res.ok) return null;
        const data = await res.json();
        const info = {
            title: data.name || data.title || data.original_name || data.original_title || "",
            originalTitle: data.original_name || data.original_title || "",
            seasonName: ""
        };

        if (mediaType === 'tv' && season) {
            try {
                const sUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?api_key=${TMDB_API_KEY}`;
                const sRes = await fetchWithTimeout(sUrl, {}, 6000);
                if (sRes.ok) {
                    const sData = await sRes.json();
                    info.seasonName = sData.name || "";
                }
            } catch (e) {}
        }

        return info;
    } catch (e) {
        return null;
    }
}
