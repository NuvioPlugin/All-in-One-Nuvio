import cheerio from 'cheerio-without-node-native';
import { MAIN_URL, HEADERS } from './constants.js';
import { fetchTmdbDetails, cleanTitle, titleSimilarity, isRealStreamUrl, isPlayableStream } from './utils.js';
import { extractAwsStream, extractAbyss, extractMultiLang, extractMegaPlay, extractStreamWish } from './extractors.js';

async function searchAnimeSalt(query) {
    try {
        const body = `action=torofilm_infinite_scroll&page=1&per_page=12&query_type=search&query_args[s]=${encodeURIComponent(query)}`;
        const res = await fetch(`${MAIN_URL}/wp-admin/admin-ajax.php`, {
            method: 'POST',
            headers: {
                ...HEADERS,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `${MAIN_URL}/`
            },
            body: body
        });
        if (!res.ok) return [];
        const json = await res.json();
        if (!json?.success || !json?.data?.content) return [];

        const $ = cheerio.load(json.data.content);
        const results = [];
        $('article').each((_, el) => {
            const title = $(el).find('header h2').text().trim();
            const href = $(el).find('a').first().attr('href');
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

        let results = await searchAnimeSalt(details.title);
        if (results.length === 0) {
            const cleaned = cleanTitle(details.title);
            if (cleaned && cleaned !== details.title.toLowerCase()) {
                results = await searchAnimeSalt(cleaned);
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

        if (mediaType === 'tv') {
            const seriesRes = await fetch(bestMatch.href, { headers: HEADERS });
            if (!seriesRes.ok) return [];
            const seriesHtml = await seriesRes.text();
            const $series = cheerio.load(seriesHtml);

            let seasonBtn = $series(`div.season-buttons a[data-season="${seasonNum}"]`);
            if (seasonBtn.length === 0) {
                seasonBtn = $series('div.season-buttons a').first();
            }

            const postId = seasonBtn.attr('data-post');
            const dataSeason = seasonBtn.attr('data-season') || seasonNum;

            if (postId) {
                const epRes = await fetch(`${MAIN_URL}/wp-admin/admin-ajax.php`, {
                    method: 'POST',
                    headers: {
                        ...HEADERS,
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Referer': bestMatch.href
                    },
                    body: `action=action_select_season&season=${dataSeason}&post=${postId}`
                });

                if (epRes.ok) {
                    const epHtml = await epRes.text();
                    const $ep = cheerio.load(epHtml);
                    const epArticles = $ep('li article');
                    let targetEp = null;

                    epArticles.each((idx, el) => {
                        const epText = $ep(el).find('h2.entry-title').text();
                        if (epText.includes(`x${episodeNum}`) || epText.includes(`Episode ${episodeNum}`)) {
                            targetEp = $ep(el).find('a').first().attr('href');
                        }
                    });

                    if (!targetEp && epArticles.length >= episodeNum) {
                        targetEp = $ep(epArticles[episodeNum - 1]).find('a').first().attr('href');
                    }

                    if (targetEp) {
                        targetUrl = targetEp;
                    }
                }
            }
        }

        const pageRes = await fetch(targetUrl, { headers: HEADERS });
        if (!pageRes.ok) return [];
        const pageHtml = await pageRes.text();
        const $page = cheerio.load(pageHtml);

        const iframeUrls = new Set();
        $page('iframe').each((_, el) => {
            const src = $page(el).attr('data-src') || $page(el).attr('src');
            if (src && !src.startsWith('about:') && !src.startsWith('javascript:')) {
                const fullUrl = src.startsWith('//') ? `https:${src}` : (src.startsWith('http') ? src : `${MAIN_URL}${src}`);
                iframeUrls.add(fullUrl);
            }
        });

        const streams = [];
        const promises = [];

        for (const iframeUrl of iframeUrls) {
            if (iframeUrl.includes('multi-lang-plyr/player.php')) {
                const urlObj = new URL(iframeUrl);
                const dataParam = urlObj.searchParams.get('data');
                if (dataParam) {
                    promises.push(
                        extractMultiLang(dataParam).then(res => {
                            if (Array.isArray(res)) streams.push(...res);
                        })
                    );
                }
            } else if (iframeUrl.includes('as-cdn') || iframeUrl.includes('awstream') || iframeUrl.includes('zephyrflick')) {
                promises.push(
                    extractAwsStream(iframeUrl).then(res => {
                        if (res && res.url) {
                            streams.push({
                                name: 'AnimeSalt [AWSStream] (Auto M3U8)',
                                url: res.url,
                                quality: '1080p',
                                headers: res.headers,
                                subtitles: res.subtitles,
                                type: 'm3u8'
                            });
                        }
                    })
                );
            } else if (iframeUrl.includes('abyssplayer.com') || iframeUrl.includes('short.icu')) {
                promises.push(
                    extractAbyss(iframeUrl, 'Default').then(res => {
                        if (Array.isArray(res)) streams.push(...res);
                    })
                );
            } else if (iframeUrl.includes('megaplay.buzz') || iframeUrl.includes('rapid-cloud.co')) {
                promises.push(
                    extractMegaPlay(iframeUrl).then(res => {
                        if (Array.isArray(res)) streams.push(...res);
                    })
                );
            } else if (iframeUrl.includes('pixdrive') || iframeUrl.includes('ghbrisk') || iframeUrl.includes('streamwish') || iframeUrl.includes('filesim')) {
                promises.push(
                    extractStreamWish(iframeUrl).then(res => {
                        if (res) streams.push(res);
                    })
                );
            }
        }

        await Promise.allSettled(promises);

        const seenUrls = new Set();
        const candidateStreams = [];
        for (const s of streams) {
            if (s && s.url && !seenUrls.has(s.url) && isRealStreamUrl(s.url)) {
                seenUrls.add(s.url);
                candidateStreams.push({
                    name: s.name || 'AnimeSalt',
                    title: mediaType === 'movie' ? details.title : `${details.title} - S${seasonNum}E${episodeNum}`,
                    url: s.url,
                    quality: s.quality || 'Auto',
                    headers: s.headers,
                    subtitles: s.subtitles || [],
                    provider: 'animesalt',
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
