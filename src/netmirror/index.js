import { BASE_HEADERS, PLATFORM_MAP, TMDB_API_KEY } from './constants.js';
import { bypass } from './utils.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        const settings = globalThis.SCRAPER_SETTINGS || {};
        const preferred = settings.preferredPlatform || "all";

        const tmdbType = mediaType === 'tv' ? 'tv' : 'movie';
        const tmdbResp = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}`, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });
        const tmdbData = await tmdbResp.json();
        const title = mediaType === 'tv' ? tmdbData.name : tmdbData.title;

        if (!title) throw new Error("Could not fetch title from TMDB");

        let platforms = ['netflix', 'primevideo', 'hotstar', 'disney'];
        if (preferred !== 'all') {
            platforms = [preferred, ...platforms.filter(p => p !== preferred)];
        }

        for (const platformKey of platforms) {
            try {
                const streams = await fetchFromPlatform(platformKey, title, mediaType, season, episode);
                if (streams && streams.length > 0) return streams;
            } catch (e) {
                // Try next platform
            }
        }

        return [];
    } catch (error) {
        return [];
    }
}

async function fetchFromPlatform(platformKey, title, mediaType, season, episode) {
    const platform = PLATFORM_MAP[platformKey];
    return fetchMobileContent(platformKey, platform, title, mediaType, season, episode);
}

// Use NetMirror's mobile APIs for movies and series, including playlist resolution.
async function fetchMobileContent(platformKey, platform, title, mediaType, season, episode) {
    const base = 'https://net52.cc';
    const cookie = await bypass(base);
    const settings = globalThis.SCRAPER_SETTINGS || {};
    const cookies = [];
    if (cookie) cookies.push(`t_hash_t=${cookie}`);
    cookies.push(`ott=${platform.ott}`);
    if (settings.forceHd !== false) cookies.push('hd=on');
    const headers = { ...BASE_HEADERS, Cookie: cookies.join('; ') };
    const getJson = async (url, referer = `${base}/home`, extraHeaders = {}) => {
        const response = await fetch(url, {
            headers: { ...headers, Referer: referer, ...extraHeaders }
        });
        if (!response.ok) throw new Error(`NetMirror mobile returned HTTP ${response.status}`);
        return response.json();
    };

    const search = await getJson(`${base}${platform.search}?s=${encodeURIComponent(title)}&t=${Math.floor(Date.now() / 1000)}`);
    const results = Array.isArray(search.searchResult) ? search.searchResult : [];
    if (!results.length) return null;
    const normalize = value => String(value || '').toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const wanted = normalize(title);
    const rank = item => {
        const candidate = normalize(item.t || item.title);
        return candidate === wanted ? 0 : (candidate.includes(wanted) || wanted.includes(candidate) ? 1 : 2);
    };
    results.sort((a, b) => rank(a) - rank(b));

    const wantedSeason = Number(season);
    const wantedEpisode = Number(episode);
    for (const result of results.slice(0, 8)) {
        if (!result.id) continue;
        const post = await getJson(`${base}${platform.post}?id=${encodeURIComponent(result.id)}&t=${Math.floor(Date.now() / 1000)}`);
        if (!post || (post.status === 'n' && post.error)) continue;
        let targetId = result.id;
        if (mediaType === 'tv') {
            if (post.type !== 't' && !(post.episodes || []).some(Boolean)) continue;
            let episodeEntry = findMobileEpisode(post.episodes, wantedSeason, wantedEpisode,
                (post.season?.findIndex(s => s.selected === true) ?? -1) + 1);

            const seasonEntry = Array.isArray(post.season)
                ? post.season.find(s => Number(String(s.s || '').replace(/\D/g, '')) === wantedSeason)
                : null;
            if (!episodeEntry && seasonEntry?.id) {
                let page = 1;
                while (page <= 30) {
                    const url = `${base}${platform.episodes}?s=${encodeURIComponent(seasonEntry.id)}` +
                        `&series=${encodeURIComponent(result.id)}&t=${Math.floor(Date.now() / 1000)}&page=${page}`;
                    const data = await getJson(url);
                    episodeEntry = findMobileEpisode(data.episodes, wantedSeason, wantedEpisode, wantedSeason);
                    if (episodeEntry || !data.nextPageShow || Number(data.nextPageShow) === 0) break;
                    page++;
                }
            }
            if (!episodeEntry?.id) continue;
            targetId = episodeEntry.id;
        } else if (post.type === 't' || (post.episodes || []).some(Boolean)) {
            continue;
        }

        const playlistUrl = `${base}${platform.playlist}?id=${encodeURIComponent(targetId)}` +
            `&t=${encodeURIComponent(title)}&tm=${Math.floor(Date.now() / 1000)}`;
        const playlist = await getJson(playlistUrl, `${base}/mobile/home?app=1`, {
            'X-Requested-With': 'app.netmirror.netmirrornew',
            'Accept': '*/*',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors'
        });
        const entries = Array.isArray(playlist) ? playlist : (playlist.playlist || playlist.data || []);
        const streams = [];
        for (const entry of entries) {
            for (const source of (entry.sources || [])) {
                if (!source.file) continue;
                const streamUrl = /^https?:\/\//i.test(source.file)
                    ? source.file
                    : source.file.startsWith('//')
                        ? `https:${source.file}`
                        : `${base}${source.file.startsWith('/') ? '' : '/'}${source.file}`;
                const label = source.label || 'Auto';
                const quality = (String(label).match(/\d{3,4}p?/i) || [])[0] ||
                    (/full\s*hd/i.test(label) ? '1080p' : /mid\s*hd/i.test(label) ? '720p' : /low\s*hd/i.test(label) ? '480p' : 'Auto');
                const playbackHeaders = {
                    'Accept': '*/*',
                    'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
                    'Connection': 'keep-alive',
                    'Referer': `${base}/mobile/home?app=1`,
                    'sec-ch-ua': '"Android WebView";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Android"',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/149.0.7827.91 Safari/537.36 /OS.Gatu v3.0',
                    'X-Requested-With': 'app.netmirror.netmirrornew'
                };
                // NetMirror expects hd=on on HLS playlist requests.
                if (settings.forceHd !== false) playbackHeaders.Cookie = 'hd=on';
                streams.push({
                    name: `NetMirror (${platformKey})`,
                    title: mediaType === 'tv'
                        ? `${title} S${wantedSeason}E${wantedEpisode} - ${label}`
                        : `${title} - ${label}`,
                    url: streamUrl,
                    quality,
                    headers: playbackHeaders
                });
            }
        }
        if (streams.length) return streams;
    }
    return null;
}

function findMobileEpisode(episodes, season, episode, fallbackSeason) {
    if (!Array.isArray(episodes)) return null;
    return episodes.find(item => {
        if (!item) return false;
        const epNumber = Number(String(item.ep || '').replace(/\D/g, ''));
        const seasonNumber = Number(String(item.s || item.sNum || '').replace(/\D/g, '')) || fallbackSeason;
        return epNumber === episode && seasonNumber === season;
    }) || null;
}

async function onSettings() {
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
}

module.exports = { getStreams, onSettings };
