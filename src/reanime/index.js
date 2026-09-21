import { getFlixEmbeds, getTmdbInfo, getAnilistInfo, searchReanimeAnime, getSyncInfo, resolveByDate } from './reanime.js';
import { extractFlixCloudDownload } from './flixcloud.js';

async function getStreams(tmdbId, mediaType = "tv", season = null, episode = null) {
    try {
        if (mediaType !== 'tv' && mediaType !== 'movie') return [];

        let alId = null;
        let episodeNumber = mediaType === "tv" ? Number(episode || 1) : 1;
        let searchTitle = "";
        let searchYear = null;

        if (typeof tmdbId === 'string' && tmdbId.indexOf('anilist:') === 0) {
            alId = tmdbId.split(':')[1];
        } else {
            try {
                const syncInfo = await getSyncInfo(tmdbId, mediaType, season, episodeNumber);
                searchTitle = syncInfo.title;
                if (syncInfo.releaseDate) {
                    searchYear = syncInfo.releaseDate.substring(0, 4);
                }

                const syncResult = await resolveByDate(syncInfo.releaseDate, syncInfo.title, episodeNumber, syncInfo.episodeTitle, syncInfo.dayIndex);
                if (syncResult && syncResult.alId) {
                    alId = String(syncResult.alId);
                    episodeNumber = syncResult.episode;
                    searchTitle = syncResult.title;
                }
            } catch (_) {}

            if (!searchTitle || !searchYear) {
                try {
                    const tmdb = await getTmdbInfo(tmdbId, mediaType);
                    if (!searchTitle) searchTitle = tmdb.title;
                    if (!searchYear) searchYear = tmdb.year;
                } catch (_) {}
            }
        }

        const serversByLang = {};
        let watchUrl = "";

        if (alId) {
            for (const lang of ["sub", "dub"]) {
                try {
                    const res = await getFlixEmbeds(null, episodeNumber, lang, alId);
                    if (res.servers && res.servers.length > 0) {
                        serversByLang[lang] = res.servers;
                        if (res.watchUrl) watchUrl = res.watchUrl;
                    }
                } catch (_) {}
            }
        }

        if (Object.keys(serversByLang).length === 0) {
            if (!searchTitle && alId) {
                const alInfo = await getAnilistInfo(alId);
                searchTitle = alInfo.title;
                searchYear = alInfo.year;
            }

            if (searchTitle) {
                const anime = await searchReanimeAnime(searchTitle, searchYear, alId);
                if (anime) {
                    const slug = anime.slug;
                    const finalAlId = alId || anime.anilistId;
                    for (const lang of ["sub", "dub"]) {
                        try {
                            const res = await getFlixEmbeds(slug, episodeNumber, lang, finalAlId);
                            if (res.servers && res.servers.length > 0) {
                                serversByLang[lang] = res.servers;
                                if (res.watchUrl) watchUrl = res.watchUrl;
                            }
                        } catch (_) {}
                    }
                }
            }
        }

        if (Object.keys(serversByLang).length === 0) return [];

        const streams = [];
        const seen = new Set();
        const tasks = [];

        for (const language of ["sub", "dub"]) {
            const serverList = serversByLang[language] || [];

            for (let i = 0; i < serverList.length; i++) {
                const server = serverList[i];
                const dataLink = server.dataLink;
                if (!dataLink) continue;

                const serverName = server.serverName || `HD-${i + 1}`;
                const langUpper = language.toUpperCase();
                const displayTitle = searchTitle || "Anime";
                const streamTitle = mediaType === 'movie'
                    ? `${displayTitle} (${langUpper})`
                    : `${displayTitle} - Episode ${episodeNumber} (${langUpper})`;

                tasks.push((async () => {
                    try {
                        const directDl = await extractFlixCloudDownload(dataLink);
                        if (directDl && directDl.url) {
                            return {
                                name: `Reanime [${langUpper}] ${serverName} (${directDl.quality || '1080p'})`,
                                title: streamTitle,
                                url: directDl.url,
                                quality: directDl.quality || "1080p",
                                size: directDl.size || "Unknown",
                                headers: directDl.headers,
                                provider: "reanime",
                                type: "mkv"
                            };
                        }
                    } catch (_) {}
                    return null;
                })());
            }
        }

        const results = await Promise.all(tasks);
        for (const res of results) {
            if (res && res.url && !seen.has(res.name)) {
                seen.add(res.name);
                streams.push(res);
            }
        }

        const qualityRank = {
            'auto': 4000,
            'adaptive': 4000,
            '2160p': 2160,
            '4k': 2160,
            '1080p': 1080,
            '720p': 720,
            '480p': 480,
            '360p': 360,
            'unknown': 0
        };

        streams.sort((a, b) => {
            const qa = qualityRank[a.quality?.toLowerCase()] || 0;
            const qb = qualityRank[b.quality?.toLowerCase()] || 0;
            return qb - qa;
        });

        return streams;
    } catch (error) {
        console.error(`[Reanime] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
