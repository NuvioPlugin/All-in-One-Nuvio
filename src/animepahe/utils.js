import { MAIN_URL, ANIMEPAHE_DOMAINS, TMDB_API_KEY, HEADERS } from './constants.js';

let activeDomain = MAIN_URL;

export async function fetchText(url, options = {}) {
    const isAbsolute = url.startsWith('http');
    const urlsToTry = isAbsolute ? [url] : ANIMEPAHE_DOMAINS.map(d => `${d}${url.startsWith('/') ? '' : '/'}${url}`);

    let lastError = null;
    for (const tryUrl of urlsToTry) {
        try {
            const isPaheUrl = tryUrl.includes('animepahe.');
            const mergedHeaders = {
                ...HEADERS,
                "Referer": `${activeDomain}/`,
                ...(options.headers || {})
            };

            let response = await fetch(tryUrl, {
                headers: mergedHeaders,
                cfKiller: isPaheUrl,
                skipSizeCheck: true,
                ...options
            });

            if ((response.status === 403 || response.status === 503) && typeof Cloudflare !== 'undefined' && Cloudflare.solve) {
                try {
                    const solvedHeaders = await Cloudflare.solve(tryUrl);
                    if (solvedHeaders['Cookie']) mergedHeaders['Cookie'] = solvedHeaders['Cookie'];
                    if (solvedHeaders['User-Agent']) mergedHeaders['User-Agent'] = solvedHeaders['User-Agent'];

                    response = await fetch(tryUrl, {
                        headers: mergedHeaders,
                        skipSizeCheck: true,
                        ...options
                    });
                } catch (_) {}
            }

            if (response.ok) {
                if (!isAbsolute) {
                    const match = tryUrl.match(/^(https?:\/\/[^\/]+)/);
                    if (match) activeDomain = match[1];
                }
                return await response.text();
            }
            lastError = new Error(`HTTP ${response.status} on ${tryUrl}`);
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError || new Error(`Failed to fetch: ${url}`);
}

export async function fetchJson(url, options = {}) {
    const text = await fetchText(url, options);
    return JSON.parse(text);
}

export async function getImdbId(tmdbId, mediaType) {
    try {
        const url = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        return data.imdb_id;
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

async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    });
    try {
        const mergedHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            ...(options.headers || {})
        };
        const res = await Promise.race([
            fetch(url, {
                skipSizeCheck: true,
                headers: mergedHeaders,
                ...options
            }),
            timeoutPromise
        ]);
        clearTimeout(timer);
        return res;
    } catch (e) {
        clearTimeout(timer);
        throw e;
    }
}

export async function resolveMapping(imdbId, season, episode, tmdbId) {
    const seasonNum = parseInt(season);
    const episodeNum = parseInt(episode);
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
                if (aniData?.episodes) {
                    const aniEpisodes = Object.values(aniData.episodes).map(ep => ({
                        mal_episode_number: parseInt(ep.episode),
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
            air_date: airDate
        };
    }

    return finalResult;
}

export async function getMalTitle(malId) {
    try {
        const res = await fetchWithTimeout(`https://api.jikan.moe/v4/anime/${malId}`, {}, 4000);
        if (res.ok) {
            const data = await res.json();
            const title = data.data?.title || data.data?.title_english;
            if (title) return title;
        }
    } catch (_) {}

    try {
        const aniRes = await fetchWithTimeout(`https://api.ani.zip/mappings?mal_id=${malId}`, {}, 4000);
        if (aniRes.ok) {
            const aniData = await aniRes.json();
            const titles = aniData?.titles || {};
            return titles.en || titles['x-jat'] || titles.ja || null;
        }
    } catch (_) {}

    return null;
}

export async function searchAnime(query, page = 1) {
    const timeSuffix = Math.floor(Date.now() / 1000) + (page * 3);
    const url = `/api?m=search&q=${encodeURIComponent(query + ' ' + timeSuffix)}&page=${page}`;
    return await fetchJson(url);
}

export function extractQuality(text) {
    const match = text.match(/(\d{3,4}p)/);
    return match ? match[1] : "720p";
}
