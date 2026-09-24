import cheerio from 'cheerio-without-node-native';
import { 
    fetchText, 
    fetchWithCookies, 
    fetchWithTimeout,
    getImdbId, 
    resolveMapping, 
    getMalTitle, 
    getTmdbInfo, 
    parseXDataJson 
} from './utils.js';
import { MAIN_URL, HEADERS } from './constants.js';

function normalize(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function parseCards(html, $) {
    const cards = [];
    const itemsMatch = html.match(/items:\s*JSON\.parse\('((?:[^'\\]|\\.)*)'\)/);
    if (itemsMatch) {
        try {
            const parsed = parseXDataJson(itemsMatch[1]);
            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    if (!item || !item.slug) continue;
                    const titles = new Set();
                    if (item.main_title) titles.add(item.main_title);
                    if (item.title_list && typeof item.title_list === 'object') {
                        Object.values(item.title_list).forEach(t => {
                            if (t) titles.add(t);
                        });
                    }
                    cards.push({
                        slug: item.slug,
                        url: item.url || `/anime/${item.slug}`,
                        titles: Array.from(titles)
                    });
                }
            }
        } catch (e) {}
    }

    if (cards.length === 0) {
        $('[x-data*="anmTitles"]').each((i, el) => {
            const href = $(el).find('a[href*="/anime/"]').first().attr('href');
            if (!href) return;
            const parts = href.split('/');
            const slug = parts[parts.length - 1] || parts[parts.length - 2];
            const titles = new Set();
            const xData = $(el).attr('x-data') || '';
            const jsonMatch = xData.match(/JSON\.parse\('((?:[^'\\]|\\.)*)'\)/);
            if (jsonMatch) {
                try {
                    const parsed = parseXDataJson(jsonMatch[1]);
                    Object.values(parsed).forEach(t => {
                        if (t) titles.add(t);
                    });
                } catch (e) {}
            }
            cards.push({ slug, titles: Array.from(titles) });
        });
    }

    return cards;
}

function getSeasonRegexes(season) {
    if (season === 1) {
        return {
            mustNot: [
                /season\s*[2-9]/i,
                /saison\s*[2-9]/i,
                /[\s\-][iI]{2,}/,
                /\s+[2-9]nd/i,
                /\s+[2-9]rd/i,
                /\s+[2-9]th/i,
                /\s+ii\b/i,
                /\s+iii\b/i,
                /\s+iv\b/i,
                /\s+v\b/i,
                /movie/i,
                /gekijouban/i,
                /the movie/i
            ]
        };
    }
    const patterns = [];
    if (season === 2) {
        patterns.push(/season\s*2/i, /saison\s*2/i, /2nd\s*season/i, /[\s\-]ii\b/i, /\b2\b/);
    } else if (season === 3) {
        patterns.push(/season\s*3/i, /saison\s*3/i, /3rd\s*season/i, /[\s\-]iii\b/i, /\b3\b/);
    } else if (season === 4) {
        patterns.push(/season\s*4/i, /saison\s*4/i, /4th\s*season/i, /[\s\-]iv\b/i, /\b4\b/, /final\s*season/i);
    } else {
        patterns.push(new RegExp(`(?:season|saison)\\s*${season}`, 'i'), new RegExp(`\\b${season}\\b`));
    }
    return { must: patterns };
}

function matchCard(cards, targetTitles, baseTitle, season = 1, seasonName = "") {
    const normalizedTargets = targetTitles.map(normalize).filter(Boolean);
    const normalizedBase = normalize(baseTitle);
    const normalizedSeasonName = normalize(seasonName);

    if (normalizedSeasonName && normalizedSeasonName !== 'season' + season) {
        for (const card of cards) {
            for (const title of card.titles) {
                if (normalize(title).includes(normalizedSeasonName)) {
                    return card.slug;
                }
            }
        }
    }

    for (const target of normalizedTargets) {
        for (const card of cards) {
            for (const title of card.titles) {
                if (normalize(title) === target) {
                    return card.slug;
                }
            }
        }
    }

    const seasonRules = getSeasonRegexes(season);
    for (const card of cards) {
        let matchesBase = false;
        for (const title of card.titles) {
            const norm = normalize(title);
            if (norm.includes(normalizedBase) || normalizedBase.includes(norm)) {
                matchesBase = true;
                break;
            }
        }
        if (!matchesBase) continue;

        let seasonMatches = false;
        if (season === 1) {
            let hasOtherSeason = false;
            for (const title of card.titles) {
                if (seasonRules.mustNot.some(regex => regex.test(title))) {
                    hasOtherSeason = true;
                    break;
                }
            }
            if (!hasOtherSeason) seasonMatches = true;
        } else {
            for (const title of card.titles) {
                if (seasonRules.must.some(regex => regex.test(title))) {
                    seasonMatches = true;
                    break;
                }
            }
        }

        if (seasonMatches) return card.slug;
    }

    return cards[0] ? cards[0].slug : null;
}

function matchMovieCard(cards, targetTitles) {
    const normalizedTargets = targetTitles.map(normalize).filter(Boolean);
    for (const card of cards) {
        for (const title of card.titles) {
            const norm = normalize(title);
            if (normalizedTargets.some(t => t === norm)) return card.slug;
        }
    }
    for (const card of cards) {
        for (const title of card.titles) {
            const norm = normalize(title);
            if (normalizedTargets.some(t => norm.includes(t) || t.includes(norm))) return card.slug;
        }
    }
    return cards[0] ? cards[0].slug : null;
}

function parseVidstackFromHtml(html, $) {
    const vidMatch = html.match(/vidstackPlayer\(JSON\.parse\('((?:[^'\\]|\\.)*)'\)\)/);
    if (vidMatch) {
        try {
            const data = parseXDataJson(vidMatch[1]);
            const masterUrl = data.src ? data.src.replace(/\\/g, '') : null;
            const subtitles = (data.subtitles || []).map(s => ({
                url: s.file ? s.file.replace(/\\/g, '') : '',
                name: s.title || s.language || 'English',
                language: s.language || 'en'
            })).filter(s => s.url);
            if (masterUrl) return { masterUrl, subtitles };
        } catch (e) {}
    }

    let masterUrl = $('media-player').attr('src');
    if (!masterUrl) {
        const urlMatch = html.match(/https:\/\/[^"']+\/master\.m3u8/);
        if (urlMatch) masterUrl = urlMatch[0];
    }

    const subtitles = [];
    $('track').each((i, el) => {
        const src = $(el).attr('src');
        const kind = $(el).attr('kind');
        if (src && (kind === 'subtitles' || kind === 'captions' || src.endsWith('.ass') || src.endsWith('.vtt'))) {
            subtitles.push({
                url: src,
                name: $(el).attr('label') || 'English',
                language: $(el).attr('srclang') || 'en'
            });
        }
    });

    return { masterUrl, subtitles };
}

function parseAudioFormat(btnText) {
    const lower = btnText.toLowerCase();
    const hasJap = lower.includes('japanese') || lower.includes('jpn') || lower.includes('ja');
    const hasEng = lower.includes('english') || lower.includes('eng') || lower.includes('en');
    if (hasEng && hasJap) return 'Dual Audio';
    if (hasEng) return 'Dub';
    if (hasJap) return 'Sub';
    if (lower.includes('multi')) return 'Multi-Audio';
    return 'Sub';
}

async function searchCards(query) {
    if (!query) return [];
    const searchUrl = `/anime?search=${encodeURIComponent(query)}&sort=title-asc`;
    const searchHtml = await fetchText(searchUrl);
    if (!searchHtml) return [];
    const $search = cheerio.load(searchHtml);
    return parseCards(searchHtml, $search);
}

async function getStreams(tmdbId, mediaType = 'tv', season = 1, episode = 1) {
    try {
        let animeTitle = '';
        let altTitles = [];
        let mappedEp = episode;
        let seasonName = '';
        let targetTitles = [];

        if (mediaType === 'tv') {
            const imdbId = await getImdbId(tmdbId, 'tv');
            if (imdbId) {
                const mapping = await resolveMapping(imdbId, season, episode, tmdbId);
                if (mapping) {
                    mappedEp = mapping.mal_episode || episode;
                    animeTitle = mapping.anime_title || '';
                    if (mapping.titles && Array.isArray(mapping.titles)) {
                        targetTitles.push(...mapping.titles);
                    }
                    const malTitle = await getMalTitle(mapping.mal_id);
                    if (malTitle) {
                        targetTitles.push(malTitle);
                        if (!animeTitle) animeTitle = malTitle;
                    }
                }
            }

            if (!animeTitle) {
                const tmdbInfo = await getTmdbInfo(tmdbId, mediaType, season);
                if (tmdbInfo) {
                    animeTitle = tmdbInfo.title;
                    if (tmdbInfo.originalTitle) altTitles.push(tmdbInfo.originalTitle);
                    seasonName = tmdbInfo.seasonName || '';
                }
            }
        } else {
            const tmdbInfo = await getTmdbInfo(tmdbId, 'movie');
            if (tmdbInfo) {
                animeTitle = tmdbInfo.title;
                if (tmdbInfo.originalTitle) altTitles.push(tmdbInfo.originalTitle);
            }
            mappedEp = 1;
        }

        if (!animeTitle && targetTitles.length === 0) return [];
        if (!animeTitle && targetTitles.length > 0) animeTitle = targetTitles[0];

        const specificTargetTitles = (season === 1 || mediaType === 'movie')
            ? [...targetTitles, animeTitle, ...altTitles]
            : [...targetTitles];

        const baseCleanQuery = animeTitle.split(':')[0]
            .replace(/season.*|\d+nd season|\d+rd season|\d+th season|saison.*/gi, '')
            .trim();

        let cards = await searchCards(baseCleanQuery);

        if (cards.length === 0 && animeTitle !== baseCleanQuery) {
            cards = await searchCards(animeTitle.split(':')[0].trim());
        }

        if (cards.length === 0) {
            for (const t of altTitles) {
                const altClean = t.split(':')[0].trim();
                cards = await searchCards(altClean);
                if (cards.length > 0) break;
            }
        }

        if (cards.length === 0) return [];

        let animeSlug = null;
        if (mediaType === 'tv') {
            animeSlug = matchCard(cards, specificTargetTitles, baseCleanQuery, season, seasonName);
        } else {
            animeSlug = matchMovieCard(cards, specificTargetTitles);
        }

        if (!animeSlug) return [];

        const episodeUrl = `/anime/${animeSlug}/${mappedEp}`;
        const epResponse = await fetchWithCookies(episodeUrl);
        if (!epResponse.ok || !epResponse.text) return [];

        const epHtml = epResponse.text;
        const $ep = cheerio.load(epHtml);
        const streams = [];

        const defaultStream = parseVidstackFromHtml(epHtml, $ep);
        const serverButtons = $ep('button[wire\\:click*="setVideo"]');
        let defaultFormat = 'Sub';
        let defaultServerName = 'AniZone';

        if (serverButtons.length > 0) {
            const firstBtn = serverButtons.first();
            const btnText = firstBtn.text().replace(/\s+/g, ' ').trim();
            defaultFormat = parseAudioFormat(btnText);
            const nameMatch = btnText.match(/^([A-Za-z0-9_-]+)/);
            if (nameMatch) defaultServerName = nameMatch[1];
        }

        if (defaultStream.masterUrl) {
            streams.push({
                name: "AniZone",
                title: `${animeTitle} - Episode ${mappedEp} [${defaultServerName} - ${defaultFormat}]`,
                url: defaultStream.masterUrl,
                quality: "Multi",
                headers: HEADERS,
                subtitles: defaultStream.subtitles
            });
        }

        if (serverButtons.length > 1) {
            const csrfToken = $ep('script[data-csrf]').attr('data-csrf');
            const snapshotEl = $ep('main > div[wire\\:snapshot], main > ul[wire\\:snapshot], [wire\\:snapshot]');
            const snapshot = snapshotEl.attr('wire:snapshot');

            if (csrfToken && snapshot && epResponse.cookies) {
                for (let i = 1; i < serverButtons.length; i++) {
                    const btn = serverButtons.eq(i);
                    const clickAttr = btn.attr('wire:click') || '';
                    const vMatch = clickAttr.match(/setVideo\((\d+)\)/);
                    if (!vMatch) continue;

                    const videoId = parseInt(vMatch[1], 10);
                    const btnText = btn.text().replace(/\s+/g, ' ').trim();
                    const sFormat = parseAudioFormat(btnText);
                    const nameMatch = btnText.match(/^([A-Za-z0-9_-]+)/);
                    const sName = nameMatch ? nameMatch[1] : `Server ${i + 1}`;

                    try {
                        const payload = {
                            _token: csrfToken,
                            components: [
                                {
                                    snapshot: snapshot,
                                    updates: {},
                                    calls: [{ path: "", method: "setVideo", params: [videoId] }]
                                }
                            ]
                        };

                        const postRes = await fetchWithTimeout(`${MAIN_URL}/livewire/update`, {
                            method: "POST",
                            headers: {
                                "Accept": "*/*",
                                "Content-Type": "application/json",
                                "X-Livewire": "",
                                "X-CSRF-TOKEN": csrfToken,
                                "Origin": MAIN_URL,
                                "Referer": `${MAIN_URL}${episodeUrl}`,
                                "Cookie": epResponse.cookies
                            },
                            body: JSON.stringify(payload)
                        }, 8000);

                        if (postRes.ok) {
                            const postData = await postRes.json();
                            const liveHtml = postData.components?.[0]?.effects?.html;
                            if (liveHtml) {
                                const $live = cheerio.load(liveHtml);
                                const extraStream = parseVidstackFromHtml(liveHtml, $live);
                                if (extraStream.masterUrl && extraStream.masterUrl !== defaultStream.masterUrl) {
                                    streams.push({
                                        name: "AniZone",
                                        title: `${animeTitle} - Episode ${mappedEp} [${sName} - ${sFormat}]`,
                                        url: extraStream.masterUrl,
                                        quality: "Multi",
                                        headers: HEADERS,
                                        subtitles: extraStream.subtitles.length > 0 ? extraStream.subtitles : defaultStream.subtitles
                                    });
                                }
                            }
                        }
                    } catch (e) {}
                }
            }
        }

        return streams;
    } catch (error) {
        return [];
    }
}

module.exports = { getStreams };
