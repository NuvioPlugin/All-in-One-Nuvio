import cheerio from 'cheerio-without-node-native';
import { MAIN_URL, HEADERS } from './constants.js';
import { fetchTmdbDetails, cleanTitle, titleSimilarity, isRealStreamUrl, isPlayableStream } from './utils.js';
import {
    extractStreamRuby,
    extractVidmoly,
    extractAbyss,
    extractAwsStream,
    extractStreamWish,
    extractBlakite,
    extractVidStack
} from './extractors.js';

async function searchAnimeDekho(query) {
    try {
        const url = `${MAIN_URL}/?s=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return [];
        const html = await res.text();
        const $ = cheerio.load(html);

        const results = [];
        $('ul[data-results] li article, article.post, article').each((_, el) => {
            const title = $(el).find('header h2, h2').text().trim();
            const href = $(el).find('a.lnk-blk, a').first().attr('href');
            if (title && href) {
                results.push({ title, href });
            }
        });
        return results;
    } catch {
        return [];
    }
}

async function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
    try {
        const details = await fetchTmdbDetails(tmdbId, mediaType);
        if (!details || !details.title) return [];

        let results = await searchAnimeDekho(details.title);
        if (results.length === 0) {
            const cleaned = cleanTitle(details.title);
            if (cleaned && cleaned !== details.title.toLowerCase()) {
                results = await searchAnimeDekho(cleaned);
            }
        }
        if (results.length === 0) return [];

        let bestMatch = null;
        let highestSim = 0;
        for (const item of results) {
            const sim = titleSimilarity(details.title, item.title);
            if (sim > highestSim) {
                highestSim = sim;
                bestMatch = item;
            }
        }
        if (!bestMatch || highestSim < 0.2) {
            bestMatch = results[0];
        }

        let targetUrl = bestMatch.href;
        const mediaTypeVal = mediaType === 'movie' ? 1 : 2;

        if (mediaType === 'tv') {
            const seriesRes = await fetch(bestMatch.href, {
                headers: {
                    ...HEADERS,
                    'Cookie': 'toronites_server=vidstream'
                }
            });
            if (!seriesRes.ok) return [];
            const seriesHtml = await seriesRes.text();
            const $series = cheerio.load(seriesHtml);

            let targetEpUrl = null;
            const epElements = $series('ul.seasons-lst li');

            epElements.each((_, el) => {
                const epText = $series(el).find('h3.title').text().trim();
                const epHref = $series(el).find('a').first().attr('href');
                if (epText && epHref) {
                    const sMatch = epText.match(/S(\d+)[\s-]*E(\d+)/i) || epText.match(/(\d+)x(\d+)/i);
                    if (sMatch) {
                        const s = parseInt(sMatch[1]);
                        const e = parseInt(sMatch[2]);
                        if (s === seasonNum && e === episodeNum) {
                            targetEpUrl = epHref;
                        }
                    } else if (epText.includes(`E${episodeNum}`) || epText.includes(`Episode ${episodeNum}`)) {
                        if (seasonNum === 1) targetEpUrl = epHref;
                    }
                }
            });

            if (!targetEpUrl && epElements.length >= episodeNum && seasonNum === 1) {
                targetEpUrl = $series(epElements[episodeNum - 1]).find('a').first().attr('href');
            }

            if (targetEpUrl) {
                targetUrl = targetEpUrl;
            }
        }

        const pageRes = await fetch(targetUrl, {
            headers: {
                ...HEADERS,
                'Cookie': 'toronites_server=vidstream'
            }
        });
        if (!pageRes.ok) return [];
        const pageHtml = await pageRes.text();
        const $page = cheerio.load(pageHtml);

        const iframeUrls = new Set();

        const serverPromises = [];
        $page('iframe.serversel[src], iframe[src]').each((_, el) => {
            const src = $page(el).attr('src');
            if (src && !src.startsWith('about:') && !src.startsWith('javascript:')) {
                const fullSrc = src.startsWith('//') ? `https:${src}` : (src.startsWith('http') ? src : `${MAIN_URL}${src}`);
                if (fullSrc.includes('animedekho.app/embed/')) {
                    serverPromises.push(
                        fetch(fullSrc, { headers: HEADERS }).then(async r => {
                            if (!r.ok) return;
                            const h = await r.text();
                            const $inner = cheerio.load(h);
                            $inner('iframe[src]').each((_, iEl) => {
                                const iSrc = $inner(iEl).attr('src');
                                if (iSrc && !iSrc.startsWith('about:')) iframeUrls.add(iSrc);
                            });
                        }).catch(() => {})
                    );
                } else {
                    iframeUrls.add(fullSrc);
                }
            }
        });
        await Promise.allSettled(serverPromises);

        const bodyClass = $page('body').attr('class') || '';
        const termMatch = bodyClass.match(/(?:term|postid)-(\d+)/);

        if (termMatch && termMatch[1]) {
            const termId = termMatch[1];
            const trdekhoPromises = [];

            for (let i = 0; i <= 10; i++) {
                const trUrl = `${MAIN_URL}/?trdekho=${i}&trid=${termId}&trtype=${mediaTypeVal}`;
                trdekhoPromises.push(
                    fetch(trUrl, { headers: HEADERS }).then(async r => {
                        if (!r.ok) return;
                        const h = await r.text();
                        const $tr = cheerio.load(h);
                        const iSrc = $tr('iframe').attr('src');
                        if (iSrc && !iSrc.startsWith('about:')) {
                            const full = iSrc.startsWith('//') ? `https:${iSrc}` : (iSrc.startsWith('http') ? iSrc : `${MAIN_URL}${iSrc}`);
                            iframeUrls.add(full);
                        }
                    }).catch(() => {})
                );
            }
            await Promise.allSettled(trdekhoPromises);
        }

        const streams = [];
        const extractPromises = [];

        for (const iframeUrl of iframeUrls) {
            if (iframeUrl.includes('rubystm.com') || iframeUrl.includes('streamruby')) {
                extractPromises.push(
                    extractStreamRuby(iframeUrl).then(s => {
                        if (s) streams.push(s);
                    })
                );
            } else if (iframeUrl.includes('vidmoly')) {
                extractPromises.push(
                    extractVidmoly(iframeUrl).then(s => {
                        if (s) streams.push(s);
                    })
                );
            } else if (iframeUrl.includes('abyssplayer.com') || iframeUrl.includes('short.icu')) {
                extractPromises.push(
                    extractAbyss(iframeUrl, 'Default').then(res => {
                        if (Array.isArray(res)) streams.push(...res);
                    })
                );
            } else if (iframeUrl.includes('as-cdn') || iframeUrl.includes('awstream') || iframeUrl.includes('zephyrflick')) {
                extractPromises.push(
                    extractAwsStream(iframeUrl).then(s => {
                        if (s) streams.push(s);
                    })
                );
            } else if (iframeUrl.includes('filesforever.link') || iframeUrl.includes('cdnwish') || iframeUrl.includes('multimovies') || iframeUrl.includes('streamwish')) {
                extractPromises.push(
                    extractStreamWish(iframeUrl).then(s => {
                        if (s) streams.push(s);
                    })
                );
            } else if (iframeUrl.includes('blakiteapi.xyz')) {
                extractPromises.push(
                    extractBlakite(iframeUrl).then(s => {
                        if (s) streams.push(s);
                    })
                );
            } else if (iframeUrl.includes('cloudy.upns.one') || iframeUrl.includes('vidcloud.upns.ink')) {
                extractPromises.push(
                    extractVidStack(iframeUrl).then(s => {
                        if (s) streams.push(s);
                    })
                );
            }
        }

        await Promise.allSettled(extractPromises);

        const seenUrls = new Set();
        const candidateStreams = [];
        for (const s of streams) {
            if (s && s.url && !seenUrls.has(s.url) && isRealStreamUrl(s.url)) {
                seenUrls.add(s.url);
                candidateStreams.push({
                    name: s.name || 'AnimeDekho',
                    title: mediaType === 'movie' ? details.title : `${details.title} - S${seasonNum}E${episodeNum}`,
                    url: s.url,
                    quality: s.quality || 'Auto',
                    headers: s.headers,
                    subtitles: s.subtitles || [],
                    provider: 'animedekho',
                    type: s.type || 'm3u8'
                });
            }
        }

        const probeResults = await Promise.all(
            candidateStreams.map(async s => ({ stream: s, playable: await isPlayableStream(s) }))
        );
        let finalStreams = probeResults.filter(r => r.playable).map(r => r.stream);
        if (finalStreams.length === 0) finalStreams = candidateStreams;

        const qualityOrder = { '1080p': 4, '720p': 3, '480p': 2, '360p': 1, 'Auto': 0 };
        return finalStreams.sort((a, b) => (qualityOrder[b.quality] ?? 0) - (qualityOrder[a.quality] ?? 0));
    } catch {
        return [];
    }
}

module.exports = { getStreams };
