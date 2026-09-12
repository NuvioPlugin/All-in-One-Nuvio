import cheerio from 'cheerio-without-node-native';
import { getTMDBDetails, findBestTitleMatch } from './utils.js';
import { MAIN_URL, HEADERS } from './constants.js';

async function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
    console.log(`[AllMovieLand] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
    try {
        const mediaInfo = await getTMDBDetails(tmdbId, mediaType);
        console.log(`[AllMovieLand] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || "N/A"})`);

        let searchResults = await searchAllMovieLand(mediaInfo.title, mediaType);
        if ((!searchResults || searchResults.length === 0) && mediaInfo.originalTitle && mediaInfo.originalTitle !== mediaInfo.title) {
            searchResults = await searchAllMovieLand(mediaInfo.originalTitle, mediaType);
        }

        if (!searchResults || searchResults.length === 0) {
            console.log("[AllMovieLand] No search results found.");
            return [];
        }

        const bestMatch = findBestTitleMatch(mediaInfo, searchResults);
        if (!bestMatch) {
            console.log("[AllMovieLand] No confident match found.");
            return [];
        }

        console.log(`[AllMovieLand] Selected: "${bestMatch.title}" (ID: ${bestMatch.id})`);

        let players = bestMatch.player;
        if (!players || players.length === 0) {
            const detailRes = await fetch(`${MAIN_URL}/api/v1/movies/${bestMatch.id}`, { headers: HEADERS });
            if (detailRes.ok) {
                const detailData = await detailRes.json();
                players = detailData?.result?.player || [];
            }
        }

        if (!players || players.length === 0) {
            console.log("[AllMovieLand] No players found.");
            return [];
        }

        const streams = [];

        for (const player of players) {
            if (!player.url) continue;

            if (player.source === "m3u8") {
                if (mediaType === "movie") {
                    streams.push({
                        name: "AllMovieLand",
                        title: `AllMovieLand - ${player.translator || "Player"} [HLS]`,
                        url: player.url,
                        quality: player.quality || "HD",
                        headers: {
                            "User-Agent": HEADERS["User-Agent"],
                            "Referer": `${MAIN_URL}/`
                        },
                        provider: "allmovieland"
                    });
                }
            } else if (player.source === "iframe") {
                try {
                    const iframeRes = await fetch(player.url, {
                        headers: {
                            ...HEADERS,
                            "Referer": `${MAIN_URL}/`
                        }
                    });
                    if (!iframeRes.ok) continue;

                    const html = await iframeRes.text();
                    const $ = cheerio.load(html);
                    let scriptContent = "";
                    $("script").each((_, el) => {
                        const h = $(el).html() || "";
                        if (h.includes("HDVBPlayer") || h.includes("p3")) scriptContent = h;
                    });

                    if (!scriptContent) continue;

                    const start = scriptContent.indexOf("{");
                    const end = scriptContent.lastIndexOf("}");
                    if (start === -1 || end <= start) continue;

                    const meta = JSON.parse(scriptContent.substring(start, end + 1));
                    if (!meta.key || !meta.file) continue;

                    const urlObj = new URL(player.url);
                    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
                    const fileEndpoint = meta.file.startsWith("http") ? meta.file : `${baseUrl}${meta.file}`;

                    const fileRes = await fetch(fileEndpoint, {
                        method: "POST",
                        headers: {
                            ...HEADERS,
                            "X-CSRF-TOKEN": meta.key,
                            "Referer": player.url
                        }
                    });
                    if (!fileRes.ok) continue;

                    const rawText = await fileRes.text();
                    const cleanText = rawText.replace(/\[\s*\],\s*/g, "").replace(/,\s*\[\s*\]/g, "").replace(/,\]/g, "]");
                    const parsedData = JSON.parse(cleanText);

                    if (mediaType === "movie") {
                        const files = Array.isArray(parsedData) ? parsedData.filter(f => f && f.file) : [];
                        for (const fileObj of files) {
                            try {
                                const epM3u8Url = `${baseUrl}/playlist/${fileObj.file}.txt`;
                                const m3u8Res = await fetch(epM3u8Url, {
                                    method: "POST",
                                    headers: {
                                        ...HEADERS,
                                        "X-CSRF-TOKEN": meta.key,
                                        "Referer": `${MAIN_URL}/`
                                    }
                                });
                                if (!m3u8Res.ok) continue;
                                const m3u8Url = (await m3u8Res.text()).trim();
                                if (m3u8Url && m3u8Url.startsWith("http")) {
                                    streams.push({
                                        name: "AllMovieLand",
                                        title: `AllMovieLand - ${fileObj.title || player.translator || "Player"}`,
                                        url: m3u8Url,
                                        quality: player.quality || "HD",
                                        headers: {
                                            "User-Agent": HEADERS["User-Agent"],
                                            "Referer": `${baseUrl}/`,
                                            "Origin": baseUrl
                                        },
                                        provider: "allmovieland"
                                    });
                                }
                            } catch (e) {}
                        }
                    } else if (mediaType === "tv" && Array.isArray(parsedData)) {
                        const targetSeason = parseInt(season, 10) || 1;
                        const targetEpisode = parseInt(episode, 10) || 1;

                        const sFolder = parsedData.find(s => {
                            const sNum = (s.title && s.title.match(/Season\s*(\d+)/i)) ? parseInt(s.title.match(/Season\s*(\d+)/i)[1], 10) : parseInt(s.id, 10);
                            return sNum === targetSeason;
                        });

                        if (sFolder && Array.isArray(sFolder.folder)) {
                            const epFolder = sFolder.folder.find(e => {
                                const eNum = (e.title && e.title.match(/(\d+)/)) ? parseInt(e.title.match(/(\d+)/)[1], 10) : parseInt(e.episode, 10);
                                return eNum === targetEpisode;
                            });

                            if (epFolder && Array.isArray(epFolder.folder)) {
                                for (const fileObj of epFolder.folder) {
                                    if (!fileObj.file) continue;
                                    try {
                                        const epM3u8Url = `${baseUrl}/playlist/${fileObj.file}.txt`;
                                        const m3u8Res = await fetch(epM3u8Url, {
                                            method: "POST",
                                            headers: {
                                                ...HEADERS,
                                                "X-CSRF-TOKEN": meta.key,
                                                "Referer": `${MAIN_URL}/`
                                            }
                                        });
                                        if (!m3u8Res.ok) continue;
                                        const m3u8Url = (await m3u8Res.text()).trim();
                                        if (m3u8Url && m3u8Url.startsWith("http")) {
                                            streams.push({
                                                name: "AllMovieLand",
                                                title: `AllMovieLand - S${targetSeason}E${targetEpisode} (${fileObj.title || "Default"})`,
                                                url: m3u8Url,
                                                quality: player.quality || "HD",
                                                headers: {
                                                    "User-Agent": HEADERS["User-Agent"],
                                                    "Referer": `${baseUrl}/`,
                                                    "Origin": baseUrl
                                                },
                                                provider: "allmovieland"
                                            });
                                        }
                                    } catch (e) {}
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[AllMovieLand] Error parsing player iframe: ${e.message}`);
                }
            }
        }

        return streams;
    } catch (error) {
        console.error(`[AllMovieLand] Error: ${error.message}`);
        return [];
    }
}

async function searchAllMovieLand(query, mediaType) {
    try {
        const searchUrl = `${MAIN_URL}/api/v1/new-search/movies?title=${encodeURIComponent(query.trim())}&page=1&limit=20`;
        const res = await fetch(searchUrl, { headers: HEADERS });
        if (!res.ok) return [];

        const data = await res.json();
        if (!data || !Array.isArray(data.results)) return [];

        const expectedType = mediaType === "tv" ? "serial" : "movie";

        return data.results
            .filter(m => !m.type || m.type === expectedType || (mediaType === "tv" ? m.type === "serial" : true))
            .map(m => ({
                id: m.kinopoisk_id,
                title: m.title_en || m.title_ru,
                year: m.year,
                player: m.player || []
            }));
    } catch (e) {
        return [];
    }
}

module.exports = { getStreams };
