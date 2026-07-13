import { PLATFORM_MAP, TMDB_API_KEY } from './constants.js';
import { resolveApiUrl, buildNewTvHeaders, bypass } from './utils.js';

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
    const apiBase = await resolveApiUrl();

    // Retrieve the bypass verification cookie
    const cookie = await bypass(platform.ott);
    const reqCookies = [];
    if (cookie) {
        reqCookies.push(`t_hash_t=${cookie}`);
    }
    const settings = globalThis.SCRAPER_SETTINGS || {};
    if (settings.forceHd !== false) {
        reqCookies.push("hd=on");
    }

    const cookieHeader = reqCookies.length > 0 ? { 'Cookie': reqCookies.join('; ') } : {};

    const searchUrl = `${apiBase}/newtv/search.php?s=${encodeURIComponent(title)}`;
    const searchResp = await fetch(searchUrl, {
        headers: buildNewTvHeaders(platform.ott, cookieHeader)
    });
    const searchData = await searchResp.json();

    if (!searchData.searchResult || searchData.searchResult.length === 0) return null;

    const result = searchData.searchResult[0];
    const contentId = result.id;

    const postUrl = `${apiBase}/newtv/post.php?id=${contentId}`;
    const postResp = await fetch(postUrl, {
        headers: buildNewTvHeaders(platform.ott, { Lastep: "", Usertoken: "", ...cookieHeader })
    });
    const postData = await postResp.json();

    let targetId = contentId;
    if (mediaType === 'tv') {
        const episodes = await getAllEpisodes(contentId, postData, platform, apiBase);
        const targetEp = episodes.find(ep => ep && ep.s === season && ep.ep === episode);

        if (targetEp) {
            targetId = targetEp.id;
        } else {
            return null;
        }
    } else {
        const isSeries = postData.type === 't' || (postData.episodes && postData.episodes.filter(e => e !== null).length > 0);
        if (isSeries) return null;
        targetId = postData.main_id || contentId;
    }

    const playlistUrl = `https://net52.cc${platform.playlist}?id=${targetId}&t=${encodeURIComponent(title)}&tm=${Math.floor(Date.now() / 1000)}`;
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
    const playlistResp = await fetch(playlistUrl, {
        headers: playlistHeaders
    });
    const playlistData = await playlistResp.json();

    if (playlistData && playlistData.length > 0) {
        const item = playlistData[0];
        if (item.sources && item.sources.length > 0) {
            return item.sources.map(source => {
                const streamUrl = source.file.startsWith('http') ? source.file : `${apiBase}${source.file}`;
                const qMatch = source.file.match(/[?&]q=([^&]+)/);
                const quality = qMatch ? qMatch[1] : (source.label === 'Auto' ? 'Auto' : source.label);
                
                return {
                    name: `NetMirror (${platformKey.charAt(0).toUpperCase() + platformKey.slice(1)})`,
                    title: `${title} - ${source.label}`,
                    url: streamUrl,
                    quality: quality,
                    headers: playlistHeaders
                };
            });
        }
    }

    return null;
}

async function getAllEpisodes(contentId, postData, platform, apiBase) {
    const episodes = [];
    const selectedSeasonIdx = postData.season ? postData.season.findIndex(s => s.selected === true) : -1;
    const selectedSeasonId = selectedSeasonIdx >= 0 ? postData.season[selectedSeasonIdx].id : postData.nextPageSeason;
    const selectedSeasonNumber = selectedSeasonIdx >= 0 ? (selectedSeasonIdx + 1) : null;

    if (postData.episodes) {
        postData.episodes.filter(e => e !== null).forEach(ep => {
            const epNum = ep.ep ? parseInt(ep.ep) : (ep.epNum ? parseInt(ep.epNum.replace('E', '')) : null);
            const sNum = selectedSeasonNumber || (ep.sNum ? parseInt(ep.sNum.replace('S', '')) : null);
            episodes.push({
                id: ep.id,
                s: sNum,
                ep: epNum
            });
        });
    }

    if (postData.nextPageShow === 1 && selectedSeasonId) {
        const more = await fetchEpisodesPage(contentId, selectedSeasonId, 2, selectedSeasonNumber, platform, apiBase);
        episodes.push(...more);
    }

    if (postData.season) {
        for (let index = 0; index < postData.season.length; index++) {
            const season = postData.season[index];
            if (season.id !== selectedSeasonId && season.id) {
                const more = await fetchEpisodesPage(contentId, season.id, 1, index + 1, platform, apiBase);
                episodes.push(...more);
            }
        }
    }

    return episodes;
}

async function fetchEpisodesPage(contentId, seasonId, page, seasonNumber, platform, apiBase) {
    const episodes = [];
    let pg = page;
    while (true) {
        const url = `${apiBase}/newtv/episodes.php?id=${seasonId}&page=${pg}`;
        const resp = await fetch(url, {
            headers: buildNewTvHeaders(platform.ott)
        });
        const data = await resp.json();
        if (data.episodes) {
            data.episodes.filter(e => e !== null).forEach(ep => {
                const epNum = ep.ep ? parseInt(ep.ep) : (ep.epNum ? parseInt(ep.epNum.replace('E', '')) : null);
                const sNum = seasonNumber || (ep.sNum ? parseInt(ep.sNum.replace('S', '')) : null);
                episodes.push({
                    id: ep.id,
                    s: sNum,
                    ep: epNum
                });
            });
        }
        if (data.nextPageShow !== 1) break;
        pg++;
    }
    return episodes;
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
