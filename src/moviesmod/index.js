import cheerio from 'cheerio-without-node-native';
import { HEADERS } from './constants.js';
import { getMainUrl, fetchTmdbDetails, bypassHrefli, extractDriveseedPage, extractVideoSeed, getIndexQuality } from './utils.js';

async function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
    console.log(`[MoviesMod] Querying streams for TMDB: ${tmdbId}, Type: ${mediaType}`);
    
    const details = await fetchTmdbDetails(tmdbId, mediaType);
    if (!details) return [];

    const mainUrl = await getMainUrl();
    console.log(`[MoviesMod] Main URL: ${mainUrl}`);
    const query = details.imdbId ? details.imdbId : details.title;
    const searchUrl = mediaType === 'movie' 
        ? `${mainUrl.replace(/\/$/, '')}/search/${encodeURIComponent(query)}`
        : `${mainUrl.replace(/\/$/, '')}/search/${encodeURIComponent(query)} ${seasonNum}`;
    
    try {
        console.log(`[MoviesMod] Searching at: ${searchUrl}`);
        const searchRes = await fetch(searchUrl, { headers: { ...HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, cfKiller: true });
        const searchHtml = await searchRes.text();
        const $search = cheerio.load(searchHtml);
        
        let targetUrl = $search("#content_box article > a").first().attr("href") || $search("#content_box article a").first().attr("href");

        if (!targetUrl && details.imdbId && details.title) {
            const fallbackQuery = mediaType === 'movie'
                ? `${mainUrl.replace(/\/$/, '')}/search/${encodeURIComponent(details.title)}`
                : `${mainUrl.replace(/\/$/, '')}/search/${encodeURIComponent(details.title)} ${seasonNum}`;
            const fallbackRes = await fetch(fallbackQuery, { headers: { ...HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, cfKiller: true });
            const fallbackHtml = await fallbackRes.text();
            const $fallback = cheerio.load(fallbackHtml);
            targetUrl = $fallback("#content_box article > a").first().attr("href") || $fallback("#content_box article a").first().attr("href");
        }

        if (!targetUrl) {
            console.log("[MoviesMod] No search result found");
            return [];
        }

        const pageRes = await fetch(targetUrl, { headers: { ...HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, cfKiller: true });
        const pageHtml = await pageRes.text();
        const $ = cheerio.load(pageHtml);
        
        const allStreams = [];
        const contentBox = $(".thecontent");

        const hTag = mediaType === 'movie' ? "h4" : "h3";
        const aTag = mediaType === 'movie' ? "Download" : "Episode";
        const sTag = mediaType === 'movie' ? "" : `(S0${seasonNum}|Season ${seasonNum})`;
        const qualityRegex = new RegExp(`${sTag}.*(480p|720p|1080p|2160p)`, "i");

        const entries = contentBox.find(hTag).filter((i, el) => {
            const text = $(el).text();
            return qualityRegex.test(text) && !text.includes("MoviesMod");
        });

        for (const entry of entries.get()) {
            const quality = getIndexQuality($(entry).text());
            let linkEl = $(entry).next().find(`a:contains('${aTag}')`).first();
            if (!linkEl.length) {
                linkEl = $(entry).nextAll("p, div").find(`a:contains('${aTag}')`).first();
            }
            
            let nextHref = linkEl.attr("href");
            if (nextHref && nextHref.includes("=")) {
                nextHref = nextHref.substring(nextHref.indexOf("=") + 1);
            }
            
            if (nextHref) {
                const streams = await processModLink(nextHref, targetUrl, quality, mediaType, episodeNum);
                allStreams.push(...streams);
            }
        }
        
        return allStreams;
    } catch (e) {
        console.error("[MoviesMod] Error:", e.message);
        return [];
    }
}

async function processModLink(url, referer, quality, mediaType, episodeNum) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, Referer: referer } });
        const html = await res.text();
        const $ = cheerio.load(html);
        
        const selector = mediaType === 'movie' 
            ? "p a.maxbutton, a:contains('Download')"
            : `h3 a:contains('Episode ${episodeNum}'), a:contains('Episode ${episodeNum}'), a.maxbutton`;

        let source = $(selector).first().attr("href");
        if (!source) {
            source = $('a[href*="driveseed.org"], a[href*="tech.unblockedgames.world"], a[href*="video-seed"]').first().attr("href");
        }

        if (!source) return [];

        let finalLink = source;
        if (source.includes("unblockedgames") || source.includes("tech.") || source.includes("href.li")) {
            finalLink = await bypassHrefli(source);
        }
        
        const results = [];
        if (finalLink && finalLink.includes("driveseed")) {
            const streams = await extractDriveseedPage(finalLink);
            results.push(...streams.map(s => ({
                ...s,
                name: `MoviesMod [${s.name}]`,
                title: `MoviesMod - ${s.quality} ${s.size ? `[${s.size}]` : ""}`,
                quality: s.quality || quality,
                provider: "moviesmod"
            })));
        } else if (finalLink && (finalLink.includes("video-seed") || finalLink.includes("video-leech"))) {
            const streamUrl = await extractVideoSeed(finalLink);
            if (streamUrl) {
                results.push({
                    name: "MoviesMod [VideoSeed]",
                    title: `MoviesMod - ${quality}`,
                    url: streamUrl,
                    quality: quality,
                    provider: "moviesmod"
                });
            }
        }
        return results;
    } catch (e) {
        return [];
    }
}

module.exports = { getStreams };
