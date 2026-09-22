import cheerio from 'cheerio-without-node-native';
import { HEADERS } from './constants.js';
import { getMainUrl, loadExtractor, extractMdrive } from './utils.js';

async function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
    console.log(`[MoviesDrive] Querying streams for TMDB: ${tmdbId}, Type: ${mediaType}`);
    
    const tmdbApiKey = "1865f43a0549ca50d341dd9ab8b29f49";
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${tmdbApiKey}&append_to_response=external_ids`;
    const tmdbRes = await fetch(tmdbUrl, { 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        } 
    });
    const tmdbData = await tmdbRes.json();
    const imdbId = tmdbData.external_ids?.imdb_id;
    const cleanTitle = tmdbData.title || tmdbData.name || "";
    
    const mainUrl = await getMainUrl();
    let match = null;

    const findMatch = (hits) => {
        if (!hits || !hits.length) return null;
        if (mediaType === 'tv') {
            const sSlug = String(seasonNum).padStart(2, '0');
            const seasonPatterns = [
                new RegExp(`\\bseason\\s*0?${seasonNum}\\b`, 'i'),
                new RegExp(`\\bs0?${seasonNum}\\b`, 'i'),
                new RegExp(`\\bseason\\s*${sSlug}\\b`, 'i')
            ];
            return hits.find(doc => {
                const postTitle = (doc.post_title || "").toLowerCase();
                const permalink = (doc.permalink || "").toLowerCase();
                const normDocTitle = postTitle.replace(/[^a-z0-9]/g, "");
                const normTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, "");

                const titleMatches = normDocTitle.includes(normTitle) || 
                                     postTitle.includes(cleanTitle.toLowerCase()) || 
                                     permalink.includes(cleanTitle.toLowerCase().replace(/ /g, "-"));
                const seasonMatches = seasonPatterns.some(pat => pat.test(postTitle) || pat.test(permalink));
                return titleMatches && seasonMatches;
            });
        } else {
            return hits.find(d => imdbId && d.imdb_id === imdbId) || hits.find(doc => {
                const postTitle = (doc.post_title || "").toLowerCase();
                const permalink = (doc.permalink || "").toLowerCase();
                const normDocTitle = postTitle.replace(/[^a-z0-9]/g, "");
                const normTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
                return normDocTitle.includes(normTitle) || 
                       postTitle.includes(cleanTitle.toLowerCase()) || 
                       permalink.includes(cleanTitle.toLowerCase().replace(/ /g, "-"));
            }) || hits[0];
        }
    };

    if (imdbId) {
        try {
            const searchUrl = `${mainUrl}/search.php?q=${imdbId}&page=1`;
            const searchRes = await fetch(searchUrl, { headers: HEADERS });
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                match = findMatch((searchData.hits || []).map(h => h.document));
            }
        } catch (e) {}
    }

    if (!match && cleanTitle) {
        try {
            const searchUrl = `${mainUrl}/search.php?q=${encodeURIComponent(cleanTitle)}&page=1`;
            const searchRes = await fetch(searchUrl, { headers: HEADERS });
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                match = findMatch((searchData.hits || []).map(h => h.document));
            }
        } catch (e) {}
    }

    if (!match) {
        console.log("[MoviesDrive] No matching post found");
        return [];
    }

    const permalink = match.permalink;
    const href = permalink.startsWith("http") ? permalink : `${mainUrl}${permalink}`;
    
    try {
        const pageRes = await fetch(href, { headers: HEADERS });
        const pageHtml = await pageRes.text();
        const $ = cheerio.load(pageHtml);
        
        const allStreams = [];
        
        if (mediaType === 'movie') {
            const links = [];
            $("h5 a").each((_, a) => {
                const h = $(a).attr("href");
                if (h) links.push(h);
            });
            
            for (const link of [...new Set(links)]) {
                const extracted = await extractMdrive(link);
                for (const server of extracted) {
                    const streams = await loadExtractor(server, href);
                    allStreams.push(...streams.map(s => ({
                        ...s,
                        title: `${cleanTitle} - ${s.name} [${s.quality}p]`,
                        provider: "moviesdrive"
                    })));
                }
            }
        } else {
            const sSlug = String(seasonNum).padStart(2, '0');
            const stag = `Season ${seasonNum}|S${sSlug}`;
            const sepRegex = new RegExp(`\\b(?:ep|episode|e)\\s*0?${episodeNum}\\b|s0?${seasonNum}\\s*e0?${episodeNum}\\b`, "i");
            const stopRegex = /^\s*(EP\d+|Episode\s*\d+|S\d+E\d+)/i;

            const entries = $("h5").filter((i, el) => new RegExp(stag, "i").test($(el).text()));
            
            for (const entry of entries.get()) {
                const nextHref = $(entry).next().find("a").attr("href") || $(entry).find("a").attr("href");
                if (!nextHref) continue;

                const epPageRes = await fetch(nextHref, { headers: HEADERS });
                const epPageHtml = await epPageRes.text();
                const $ep = cheerio.load(epPageHtml);
                
                const epEntries = $ep("h5").filter((i, el) => sepRegex.test($ep(el).text()));
                for (const epEntry of epEntries.get()) {
                    const epLinks = [];
                    let sibling = $ep(epEntry).next();
                    while (sibling.length && !stopRegex.test(sibling.text().trim())) {
                        sibling.find("a[href]").each((_, a) => {
                            const h = $ep(a).attr("href");
                            if (h) epLinks.push(h);
                        });
                        sibling = sibling.next();
                    }

                    if (epLinks.length === 0) {
                        const l1 = $ep(epEntry).next().find("a").attr("href");
                        const l2 = $ep(epEntry).next().next().find("a").attr("href");
                        [l1, l2].forEach(l => l && epLinks.push(l));
                    }

                    for (const epLink of [...new Set(epLinks)]) {
                        const extracted = await extractMdrive(epLink);
                        for (const server of extracted) {
                            const streams = await loadExtractor(server, nextHref);
                            allStreams.push(...streams.map(s => ({
                                ...s,
                                title: `${cleanTitle} S${seasonNum}E${episodeNum} - ${s.name} [${s.quality}p]`,
                                provider: "moviesdrive"
                            })));
                        }
                    }
                }
            }
        }
        
        return allStreams;
    } catch (e) {
        console.error("[MoviesDrive] Error:", e.message);
        return [];
    }
}

module.exports = { getStreams };
