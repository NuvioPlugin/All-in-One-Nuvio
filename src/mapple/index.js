import { BASE_URL, API_HEADERS, PLAYBACK_HEADERS, HOSTERS } from './constants.js';
import { solvePow } from './pow.js';
import { CookieJar, fetchMediaDetails, fetchSubtitles, parseHlsMaster } from './utils.js';

async function getPlaybackSession(tmdbId, mediaType, tvSlug, mediaReferer, cookieJar) {
    const initRes = await fetch(`${BASE_URL}/`, {
        headers: {
            'User-Agent': API_HEADERS['User-Agent'],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    });
    cookieJar.update(initRes);

    const tokenRes = await fetch(`${BASE_URL}/api/request-token`, {
        method: 'POST',
        headers: {
            ...API_HEADERS,
            'Referer': mediaReferer,
            'Content-Type': 'application/json',
            'Cookie': cookieJar.getCookieString()
        },
        body: ''
    });
    cookieJar.update(tokenRes);
    if (!tokenRes.ok) return null;

    const tokenData = await tokenRes.json();
    const requestToken = tokenData?.token;
    if (!requestToken) return null;

    const initPayload = {
        mediaId: Number(tmdbId),
        mediaType: mediaType,
        tv_slug: tvSlug,
        requestToken: requestToken
    };

    const playbackRes = await fetch(`${BASE_URL}/api/playback-init`, {
        method: 'POST',
        headers: {
            ...API_HEADERS,
            'Referer': mediaReferer,
            'Content-Type': 'application/json',
            'Cookie': cookieJar.getCookieString()
        },
        body: JSON.stringify(initPayload)
    });
    cookieJar.update(playbackRes);
    if (!playbackRes.ok) return null;

    const initData = await playbackRes.json();
    let playbackToken = null;

    if (initData.success && initData.token) {
        playbackToken = initData.token;
    } else if (initData.requiresPow && initData.pow) {
        const nonce = solvePow(initData.pow.challenge, initData.pow.difficulty);
        const powRes = await fetch(`${BASE_URL}/api/playback-init`, {
            method: 'POST',
            headers: {
                ...API_HEADERS,
                'Referer': mediaReferer,
                'Content-Type': 'application/json',
                'Cookie': cookieJar.getCookieString()
            },
            body: JSON.stringify({
                ...initPayload,
                pow: {
                    challengeId: initData.pow.challengeId,
                    nonce: nonce
                }
            })
        });
        cookieJar.update(powRes);
        if (powRes.ok) {
            const powData = await powRes.json();
            playbackToken = powData?.token;
        }
    }

    if (!playbackToken) return null;
    return { requestToken, playbackToken };
}

async function extractHosterStream(hoster, tmdbId, mediaType, tvSlug, mediaReferer, session, cookieJar, mediaTitle, subtitles) {
    try {
        const encRes = await fetch(`${BASE_URL}/api/encrypt`, {
            method: 'POST',
            headers: {
                ...API_HEADERS,
                'Referer': mediaReferer,
                'Content-Type': 'application/json',
                'Cookie': cookieJar.getCookieString()
            },
            body: JSON.stringify({
                data: {
                    mediaId: Number(tmdbId),
                    mediaType: mediaType,
                    tv_slug: tvSlug,
                    source: hoster.key
                },
                endpoint: 'stream-encrypted',
                requestToken: session.requestToken
            })
        });
        if (!encRes.ok) return [];

        const encData = await encRes.json();
        if (!encData?.url) return [];

        const streamEndpoint = `${BASE_URL}${encData.url}&requestToken=${encodeURIComponent(session.requestToken)}&token=${encodeURIComponent(session.playbackToken)}`;
        const streamRes = await fetch(streamEndpoint, {
            headers: {
                ...API_HEADERS,
                'Referer': mediaReferer,
                'Cookie': cookieJar.getCookieString()
            }
        });
        if (!streamRes.ok) return [];

        const streamData = await streamRes.json();
        const streamUrl = streamData?.data?.stream_url;
        if (!streamData?.success || !streamUrl || streamUrl.includes('playback-unavailable')) {
            return [];
        }

        const streams = [];
        const parsedStreams = await parseHlsMaster(streamUrl, hoster.name, mediaTitle, PLAYBACK_HEADERS);
        if (parsedStreams && parsedStreams.length > 0) {
            parsedStreams.forEach(s => {
                s.subtitles = subtitles;
                streams.push(s);
            });
        }

        streams.push({
            name: `Mapple [${hoster.name}] - Auto`,
            title: mediaTitle,
            url: streamUrl,
            quality: 'Auto',
            size: 'Unknown',
            headers: PLAYBACK_HEADERS,
            provider: 'mapple',
            subtitles: subtitles
        });

        return streams;
    } catch (e) {
        return [];
    }
}

async function getStreams(tmdbId, mediaType, seasonNum = null, episodeNum = null) {
    const type = mediaType === 'tv' || mediaType === 'series' ? 'tv' : 'movie';
    const s = seasonNum ? Number(seasonNum) : 1;
    const e = episodeNum ? Number(episodeNum) : 1;
    const tvSlug = type === 'tv' ? `${s}-${e}` : '';
    const mediaReferer = type === 'tv'
        ? `${BASE_URL}/tv/${tmdbId}/${s}/${e}`
        : `${BASE_URL}/movie/${tmdbId}`;

    const [mediaDetails, subtitles] = await Promise.all([
        fetchMediaDetails(tmdbId, type),
        fetchSubtitles(tmdbId, type, s, e)
    ]);

    let mediaTitle = mediaDetails.title || `TMDB ${tmdbId}`;
    if (mediaDetails.year) {
        mediaTitle += ` (${mediaDetails.year})`;
    }
    if (type === 'tv') {
        mediaTitle += ` S${String(s).padStart(2, '0')}E${String(e).padStart(2, '0')}`;
    }

    const cookieJar = new CookieJar();
    const session = await getPlaybackSession(tmdbId, type, tvSlug, mediaReferer, cookieJar);
    if (!session) return [];

    const hosterPromises = HOSTERS.map(hoster =>
        extractHosterStream(hoster, tmdbId, type, tvSlug, mediaReferer, session, cookieJar, mediaTitle, subtitles)
    );

    const hosterResults = await Promise.all(hosterPromises);
    const allStreams = hosterResults.flat();

    const seen = new Set();
    const uniqueStreams = [];
    allStreams.forEach(stream => {
        if (!seen.has(stream.url)) {
            seen.add(stream.url);
            uniqueStreams.push(stream);
        }
    });

    const qualityRank = {
        'auto': 4000,
        'adaptive': 4000,
        '2160p': 2160,
        '4k': 2160,
        '1080p': 1080,
        '720p': 720,
        '480p': 480,
        '360p': 360,
        '240p': 240,
        'unknown': 0
    };

    uniqueStreams.sort((a, b) => {
        const qa = qualityRank[a.quality?.toLowerCase()] || 0;
        const qb = qualityRank[b.quality?.toLowerCase()] || 0;
        return qb - qa;
    });

    return uniqueStreams;
}

module.exports = { getStreams };
