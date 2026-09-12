import cheerio from 'cheerio-without-node-native';
import { fetchText, fetchJson, HEADERS, MAIN_URL, ensureDomain } from './http.js';
import { cleanTitle, getSearchQuality, extractSpecs, buildExtractedTitle, signHShare, getIndexQuality } from './utils.js';

const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

async function extractGdshine(url) {
    try {
        const id = url.split('/').pop();
        const fileData = await fetchJson(`https://gdshine.org/api/files/s/${id}`);
        const workerData = await fetchJson(`https://gdshine.org/api/downloads/${fileData.data.id}/via-worker`, {
            method: 'POST'
        });
        return {
            url: workerData.data.copyUrl,
            name: fileData.data.name
        };
    } catch (e) {
        console.error(`[Hindmoviez] Gdshine extraction failed: ${e.message}`);
        return null;
    }
}

async function getHShareLinks(url) {
    try {
        const html = await fetchText(url);
        const $ = cheerio.load(html);
        const links = [];
        $('div.entry-content a').each((i, el) => {
            const text = $(el).text();
            if (text.includes('Get Links')) {
                const href = $(el).attr('href');
                if (href && href.includes('/?id=')) {
                    const baseUrl = href.split('/?id=')[0];
                    const rawId = href.split('id=')[1];
                    links.push(signHShare(rawId, baseUrl));
                }
            }
        });
        return links;
    } catch (e) {
        console.error(`[Hindmoviez] HShare resolution failed: ${e.message}`);
        return [];
    }
}

async function resolveDirectStreams(signedUrl) {
    try {
        const html = await fetchText(signedUrl);
        const $ = cheerio.load(html);
        
        const name = $('div.container p:contains(Name:)').text().replace('Name:', '').trim();
        const size = $('div.container p:contains(Size:)').text().replace('Size:', '').trim();
        const specs = buildExtractedTitle(extractSpecs(name));
        const labelExtras = `[${specs}] [${size}]`;

        const streams = [];
        const btnUrls = [];
        $('a.btn').each((i, el) => {
            const href = $(el).attr('href');
            if (href) btnUrls.push(href);
        });

        for (const btnUrl of btnUrls) {
            if (btnUrl.includes('gdshine')) {
                const extracted = await extractGdshine(btnUrl);
                if (extracted) {
                    streams.push({
                        name: "Gdshine",
                        title: `${extracted.name} ${labelExtras}`,
                        url: extracted.url,
                        quality: (getIndexQuality(extracted.name) || 720) + "p"
                    });
                }
            } else {
                try {
                    const btnHtml = await fetchText(btnUrl);
                    const btn$ = cheerio.load(btnHtml);
                    const quality = (getIndexQuality(btn$('div.container h2').text()) || 720) + "p";
                    
                    btn$('a.button').each((j, linkEl) => {
                        const href = btn$(linkEl).attr('href');
                        if (href) {
                            streams.push({
                                name: "HCloud",
                                title: `${btn$(linkEl).text()} ${labelExtras}`,
                                url: href,
                                quality: quality,
                                headers: { "Referer": btnUrl }
                            });
                        }
                    });
                } catch (e) {
                    console.warn(`[Hindmoviez] Failed to resolve button link ${btnUrl}: ${e.message}`);
                }
            }
        }
        return streams;
    } catch (e) {
        console.error(`[Hindmoviez] Direct stream resolution failed: ${e.message}`);
        return [];
    }
}

export async function extractStreams(tmdbId, mediaType, season, episode) {
    try {
        await ensureDomain();
        // 1. Get info from TMDB
        const info = await fetchJson(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`);
        const title = info.title || info.name;
        const year = (info.release_date || info.first_air_date || "").split('-')[0];

        // 2. Search Hindmoviez
        const searchUrl = `${MAIN_URL}/?s=${encodeURIComponent(title)}`;
        const searchHtml = await fetchText(searchUrl);
        const search$ = cheerio.load(searchHtml);
        
        let pageUrl = null;
        search$('article').each((i, el) => {
            const entryTitle = search$(el).find('h2.entry-title a').text();
            if (entryTitle.toLowerCase().includes(title.toLowerCase())) {
                if (year && entryTitle.includes(year)) {
                    pageUrl = search$(el).find('h2.entry-title a').attr('href');
                    return false;
                }
                if (!pageUrl) pageUrl = search$(el).find('h2.entry-title a').attr('href');
            }
        });

        if (!pageUrl) {
            console.warn(`[Hindmoviez] No matching page found for ${title}`);
            return [];
        }

        const docHtml = await fetchText(pageUrl);
        const doc$ = cheerio.load(docHtml);

        const allStreams = [];

        if (mediaType === 'movie') {
            const hShareUrls = [];
            const maxbuttons = [];
            doc$('a.maxbutton').each((i, el) => {
                const href = doc$(el).attr('href');
                if (href) maxbuttons.push(href);
            });

            for (const listUrl of maxbuttons) {
                const links = await getHShareLinks(listUrl);
                hShareUrls.push(...links);
            }

            const results = await Promise.all(hShareUrls.map(url => resolveDirectStreams(url)));
            allStreams.push(...results.flat());
        } else {
            // TV Series
            let seasonUrl = null;
            doc$('h3').each((i, el) => {
                const h3Text = doc$(el).text();
                if (h3Text.toLowerCase().includes(`season ${season}`)) {
                    const nextP = doc$(el).next('p');
                    seasonUrl = nextP.find('a').attr('href');
                    return false;
                }
            });

            if (seasonUrl) {
                const seasonHtml = await fetchText(seasonUrl);
                const season$ = cheerio.load(seasonHtml);
                const episodeHShareUrls = [];
                
                season$('h3 > a').each((i, el) => {
                    const epText = season$(el).text();
                    if (epText.toLowerCase().includes(`episode ${episode}`)) {
                        const href = season$(el).attr('href');
                        if (href && href.includes('/?id=')) {
                            const baseUrl = href.split('/?id=')[0];
                            const rawId = href.split('id=')[1];
                            episodeHShareUrls.push(signHShare(rawId, baseUrl));
                        }
                    }
                });

                const results = await Promise.all(episodeHShareUrls.map(url => resolveDirectStreams(url)));
                allStreams.push(...results.flat());
            }
        }

        return allStreams;
    } catch (e) {
        console.error(`[Hindmoviez] Extraction error: ${e.message}`);
        return [];
    }
}
