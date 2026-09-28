import cheerio from 'cheerio-without-node-native';
import { HEADERS } from './constants.js';
import { getMainUrl, fetchTmdbDetails, bypassHrefli, extractDriveseedPage, getIndexQuality, extractVideoSeed } from './utils.js';

function normalizeTitle(value) {
    return String(value || "").toLowerCase().replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
        .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

async function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
    console.log(`[UHDMovies] Querying streams for TMDB: ${tmdbId}, Type: ${mediaType}`);
    
    const details = await fetchTmdbDetails(tmdbId, mediaType);
    if (!details) return [];

    const mainUrl = await getMainUrl();
    try {
        let targetUrl = "";
        const searchTitles = [...new Set([details.title, details.originalTitle].filter(Boolean))];
        for (const query of searchTitles) {
            const searchUrl = `${mainUrl}/?s=${encodeURIComponent(query)}`;
            const searchRes = await fetch(searchUrl, { headers: { ...HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
            if (!searchRes.ok) continue;
            const $search = cheerio.load(await searchRes.text());
            const normalizedSearchTitle = normalizeTitle(query);

            $search("article.gridlove-post, article.latestPost").each((i, el) => {
                const title = $search(el).find("h1.sanket, h2.title a").text() || $search(el).find("a").attr("title") || "";
                const href = $search(el).find("div.entry-image > a, h2.title a, a").first().attr("href");
                const normalizedResultTitle = normalizeTitle(title);
                const titleMatches = normalizedResultTitle && normalizedSearchTitle && (
                    normalizedResultTitle === normalizedSearchTitle ||
                    normalizedResultTitle.includes(normalizedSearchTitle) || normalizedSearchTitle.includes(normalizedResultTitle)
                );
                const imdbMatches = details.imdbId && title.includes(details.imdbId);
                if (href && (titleMatches || imdbMatches)) {
                    targetUrl = href;
                    return false;
                }
            });
            if (targetUrl) break;
        }

        if (!targetUrl) {
            console.log("[UHDMovies] No search result found");
            return [];
        }

        const pageRes = await fetch(targetUrl, { headers: { ...HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
        const pageHtml = await pageRes.text();
        const $ = cheerio.load(pageHtml);
        
        const allStreams = [];

        if (mediaType === 'movie') {
            const iframeRegex = /\[.*\]/;
            $("div.entry-content > p, div.entry-content > div").each((i, el) => {
                const text = $(el).text();
                if (iframeRegex.test(text)) {
                    const quality = getIndexQuality(text);
                    const nextHref = $(el).next().find("a.maxbutton-1, a.maxbutton").attr("href") || $(el).find("a.maxbutton-1, a.maxbutton").attr("href");
                    if (nextHref) {
                        allStreams.push({ url: nextHref, quality });
                    }
                }
            });
        } else {
            // TV Series
            const episodesMap = {};
            let currentSeason = seasonNum; // Default to requested

            $("pre, p, a, h3").each((i, el) => {
                const text = $(el).text().trim();
                const seasonMatch = text.match(/(?:season\s*|S)(\d+)/i);
                if (seasonMatch && text.length < 20) {
                    currentSeason = parseInt(seasonMatch[1]);
                }

                if (($(el).is("a") || $(el).find("a").length > 0) && text.toLowerCase().includes("episode")) {
                    if (text.toLowerCase().includes("zip")) return;
                    const epMatch = text.match(/Episode\s*(\d+)/i);
                    if (epMatch) {
                        const realEp = parseInt(epMatch[1]);
                        const epUrl = $(el).is("a") ? $(el).attr("href") : $(el).find("a").attr("href");
                        if (epUrl) {
                            const key = `${currentSeason}-${realEp}`;
                            if (!episodesMap[key]) episodesMap[key] = [];
                            episodesMap[key].push(epUrl);
                        }
                    }
                }
            });

            const targetKey = `${seasonNum}-${episodeNum}`;
            const urls = episodesMap[targetKey] || [];
            urls.forEach(url => {
                allStreams.push({ url, quality: "Unknown" });
            });
        }

        const finalResults = [];
        for (const item of allStreams) {
            let finalLink = item.url;
            if (finalLink.includes("unblockedgames")) {
                finalLink = await bypassHrefli(finalLink);
            }

            if (finalLink) {
                if (finalLink.includes("driveseed") || finalLink.includes("driveleech")) {
                    const streams = await extractDriveseedPage(finalLink);
                    finalResults.push(...streams.map(s => ({
                        ...s,
                        name: "UHDMovies [Driveseed]",
                        title: `UHDMovies - ${s.quality} ${s.size ? `[${s.size}]` : ""}`,
                        quality: s.quality || item.quality,
                        provider: "uhdmovies"
                    })));
                } else if (finalLink.includes("video-seed")) {
                    const streamUrl = await extractVideoSeed(finalLink);
                    if (streamUrl) {
                        finalResults.push({
                            name: "UHDMovies [VideoSeed]",
                            title: `UHDMovies - ${item.quality}`,
                            url: streamUrl,
                            quality: item.quality,
                            provider: "uhdmovies"
                        });
                    }
                } else {
                    finalResults.push({
                        name: "UHDMovies",
                        title: `UHDMovies - ${item.quality}`,
                        url: finalLink,
                        quality: item.quality,
                        provider: "uhdmovies"
                    });
                }
            }
        }
        
        return finalResults;
    } catch (e) {
        console.error("[UHDMovies] Error:", e.message);
        return [];
    }
}

module.exports = { getStreams };
