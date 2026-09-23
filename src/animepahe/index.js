import cheerio from 'cheerio-without-node-native';
import { fetchJson, fetchText, searchAnime, extractQuality, getImdbId, resolveMapping, getMalTitle } from './utils.js';
import { extractKwik, extractPahe } from './extractors.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        console.log(`[AnimePahe] getStreams: tmdbId=${tmdbId}, mediaType=${mediaType}, S${season}E${episode}`);
        let animeSession = null;
        let animeTitle = "";
        let mappedEp = episode;
        let targetMalId = null;

        if (mediaType === 'tv') {
            const imdbId = await getImdbId(tmdbId, mediaType);
            console.log(`[AnimePahe] IMDb ID: ${imdbId}`);
            if (!imdbId) return [];

            const mapping = await resolveMapping(imdbId, season, episode, tmdbId);
            console.log(`[AnimePahe] Mapping:`, mapping ? JSON.stringify(mapping) : 'null');
            if (!mapping || !mapping.mal_id) return [];

            targetMalId = mapping.mal_id;
            mappedEp = mapping.mal_episode || episode;
            animeTitle = await getMalTitle(targetMalId);
            if (!animeTitle && mapping.anime_title) {
                animeTitle = mapping.anime_title;
            }

            console.log(`[AnimePahe] Target title: "${animeTitle}" (MAL ID: ${targetMalId})`);
            if (!animeTitle) return [];

            let searchResults = await searchAnime(animeTitle);
            if (!searchResults.data || searchResults.data.length === 0) {
                const clean = animeTitle.replace(/[^a-zA-Z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
                if (clean !== animeTitle) {
                    searchResults = await searchAnime(clean);
                }
            }
            if (!searchResults.data || searchResults.data.length === 0) {
                const words = animeTitle.split(/\s+/).filter(Boolean);
                if (words.length > 3) {
                    const shortQuery = words.slice(-3).join(" ");
                    searchResults = await searchAnime(shortQuery);
                }
            }

            if (searchResults.data && searchResults.data.length > 0) {
                for (let i = 0; i < Math.min(searchResults.data.length, 5); i++) {
                    const item = searchResults.data[i];
                    try {
                        const pageHtml = await fetchText(`/anime/${item.session}`);
                        if (pageHtml.includes(`myanimelist.net/anime/${targetMalId}`) || (item.id && String(item.id) === String(targetMalId))) {
                            animeSession = item.session;
                            break;
                        }
                    } catch (_) {}
                }
                if (!animeSession) {
                    const normTarget = animeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '');
                    const titleMatch = searchResults.data.find(r => {
                        const normR = (r.title || "").toLowerCase().replace(/[^a-z0-9]+/g, '');
                        return normR.includes(normTarget) || normTarget.includes(normR);
                    });
                    animeSession = titleMatch ? titleMatch.session : searchResults.data[0].session;
                }
            }
        } else {
            const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=439c478a771f35c05022f9feabcca01c`;
            const tmdbRes = await fetch(tmdbUrl);
            const tmdbData = await tmdbRes.json();
            animeTitle = tmdbData.title || tmdbData.original_title;
            mappedEp = 1;

            if (!animeTitle) return [];

            let searchResults = await searchAnime(animeTitle);
            if (!searchResults.data || searchResults.data.length === 0) {
                const clean = animeTitle.replace(/[^a-zA-Z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
                if (clean !== animeTitle) {
                    searchResults = await searchAnime(clean);
                }
            }
            if (!searchResults.data || searchResults.data.length === 0) {
                if (tmdbData.original_title && tmdbData.original_title !== animeTitle) {
                    searchResults = await searchAnime(tmdbData.original_title);
                }
            }
            if (searchResults.data && searchResults.data.length > 0) {
                const normTarget = animeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '');
                const match = searchResults.data.find(r => {
                    const normR = (r.title || "").toLowerCase().replace(/[^a-z0-9]+/g, '');
                    return normR === normTarget || normR.includes(normTarget) || normTarget.includes(normR);
                }) || searchResults.data[0];
                animeSession = match.session;
            }
        }

        console.log(`[AnimePahe] Anime session: ${animeSession}`);
        if (!animeSession) return [];

        const firstPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=1`;
        const firstPageData = await fetchJson(firstPageUrl);
        if (!firstPageData.data || firstPageData.data.length === 0) return [];

        const targetEpNum = Number(mappedEp);
        let episodeSession = null;

        const epInFirstPage = firstPageData.data.find(e => Math.floor(Number(e.episode)) === targetEpNum || Number(e.episode) === targetEpNum);
        if (epInFirstPage) {
            episodeSession = epInFirstPage.session;
        } else {
            const perPage = firstPageData.per_page || 30;
            const targetPage = Math.ceil(targetEpNum / perPage) || 1;
            const lastPage = firstPageData.last_page || 1;

            if (targetPage !== 1 && targetPage <= lastPage) {
                const targetPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=${targetPage}`;
                const targetPageData = await fetchJson(targetPageUrl);
                if (targetPageData && targetPageData.data) {
                    const foundEp = targetPageData.data.find(e => Math.floor(Number(e.episode)) === targetEpNum || Number(e.episode) === targetEpNum);
                    if (foundEp) episodeSession = foundEp.session;
                }
            }

            if (!episodeSession) {
                for (let p = 2; p <= Math.min(lastPage, 6); p++) {
                    if (p === targetPage) continue;
                    const pData = await fetchJson(`/api?m=release&id=${animeSession}&sort=episode_asc&page=${p}`);
                    if (pData && pData.data) {
                        const foundEp = pData.data.find(e => Math.floor(Number(e.episode)) === targetEpNum || Number(e.episode) === targetEpNum);
                        if (foundEp) {
                            episodeSession = foundEp.session;
                            break;
                        }
                    }
                }
            }
        }

        console.log(`[AnimePahe] Episode session: ${episodeSession}`);
        if (!episodeSession) return [];

        const playUrl = `/play/${animeSession}/${episodeSession}`;
        const playHtml = await fetchText(playUrl);
        const $ = cheerio.load(playHtml);

        const streams = [];
        const promises = [];
        const seen = new Set();

        const downloadLinks = $('div#pickDownload > a');
        const buttons = $('#resolutionMenu > button');

        buttons.each((index, el) => {
            const $btn = $(el);
            const kwikUrl = $btn.attr('data-src');
            const fullText = $btn.text().trim();

            const qualityText = fullText.includes(' · ') ? fullText.substring(fullText.indexOf(' · ') + 3) : fullText;
            const isDub = qualityText.toLowerCase().includes('eng');
            const isKor = qualityText.toLowerCase().includes('kor');
            const isChi = qualityText.toLowerCase().includes('chi');
            const langLabel = isDub ? 'DUB' : (isKor ? 'KOR' : (isChi ? 'CHI' : 'SUB'));

            const cleanQualityText = qualityText
                .replace(/eng/gi, '')
                .replace(/kor/gi, '')
                .replace(/chi/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
            const quality = extractQuality(cleanQualityText);

            const paheWinLink = downloadLinks.eq(index).attr('href');

            if (kwikUrl && kwikUrl.includes('kwik')) {
                promises.push(
                    extractKwik(kwikUrl).then(res => {
                        if (res && res.m3u8 && !seen.has(res.m3u8)) {
                            seen.add(res.m3u8);
                            streams.push({
                                name: `AnimePahe [${langLabel}] (${quality} HLS)`,
                                title: mediaType === 'movie' ? `${animeTitle} (${langLabel})` : `${animeTitle} - Episode ${mappedEp} (${langLabel})`,
                                url: res.m3u8,
                                quality: quality,
                                headers: res.headers,
                                provider: "animepahe",
                                type: "m3u8"
                            });
                        }
                        if (res && res.mp4 && !seen.has(res.mp4)) {
                            seen.add(res.mp4);
                            streams.push({
                                name: `AnimePahe [${langLabel}] (${quality} MP4)`,
                                title: mediaType === 'movie' ? `${animeTitle} (${langLabel})` : `${animeTitle} - Episode ${mappedEp} (${langLabel})`,
                                url: res.mp4,
                                quality: quality,
                                headers: {
                                    ...res.headers,
                                    "Referer": kwikUrl
                                },
                                provider: "animepahe",
                                type: "mp4"
                            });
                        }
                    }).catch(() => {})
                );
            }

            if (paheWinLink && (paheWinLink.includes('pahe.win') || paheWinLink.includes('pahe.me') || paheWinLink.includes('pahe.li') || paheWinLink.includes('kwik'))) {
                promises.push(
                    extractPahe(paheWinLink).then(res => {
                        if (res && res.url && !seen.has(res.url)) {
                            seen.add(res.url);
                            streams.push({
                                name: `AnimePahe [${langLabel}] (${quality} Direct)`,
                                title: mediaType === 'movie' ? `${animeTitle} (${langLabel})` : `${animeTitle} - Episode ${mappedEp} (${langLabel})`,
                                url: res.url,
                                quality: quality,
                                headers: res.headers,
                                provider: "animepahe",
                                type: "mp4"
                            });
                        }
                    }).catch(() => {})
                );
            }
        });

        await Promise.all(promises);

        const qualityOrder = { "1080p": 3, "720p": 2, "360p": 1 };
        return streams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));
    } catch (err) {
        console.error(`[AnimePahe] Error in getStreams:`, err?.message || err);
        return [];
    }
}

module.exports = { getStreams };
