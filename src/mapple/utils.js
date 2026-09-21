import { TMDB_BASE_URL, TMDB_API_KEY, SUBTITLE_BASE, DEFAULT_USER_AGENT } from './constants.js';

export class CookieJar {
    constructor() {
        this.cookies = new Map();
    }

    update(res) {
        if (!res || !res.headers) return;
        let rawCookies = [];
        if (typeof res.headers.getSetCookie === 'function') {
            rawCookies = res.headers.getSetCookie();
        } else if (res.headers.get) {
            const h = res.headers.get('set-cookie');
            if (h) rawCookies = [h];
        }
        for (const c of rawCookies) {
            const parts = c.split(';');
            const [k, v] = parts[0].split('=');
            if (k && v) {
                this.cookies.set(k.trim(), v.trim());
            }
        }
    }

    getCookieString() {
        const list = [];
        for (const [k, v] of this.cookies.entries()) {
            list.push(`${k}=${v}`);
        }
        return list.join('; ');
    }
}

export async function fetchMediaDetails(tmdbId, mediaType) {
    try {
        const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
        const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': DEFAULT_USER_AGENT,
                'Accept': 'application/json'
            }
        });
        if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
        const data = await res.json();
        return {
            title: mediaType === 'tv' ? data.name : data.title,
            year: (mediaType === 'tv' ? data.first_air_date : data.release_date || '').substring(0, 4),
            imdbId: data.external_ids?.imdb_id || null,
            mediaType: mediaType
        };
    } catch (e) {
        return {
            title: `TMDB ${tmdbId}`,
            year: '',
            imdbId: null,
            mediaType: mediaType
        };
    }
}

export async function fetchSubtitles(tmdbId, mediaType, seasonNum = null, episodeNum = null) {
    try {
        const isMovie = mediaType !== 'tv';
        const url = isMovie
            ? `${SUBTITLE_BASE}/search?id=${tmdbId}`
            : `${SUBTITLE_BASE}/search?id=${tmdbId}&season=${seasonNum}&episode=${episodeNum}`;

        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data)) return [];

        return data.map(sub => ({
            url: sub.url,
            language: sub.language || 'Unknown',
            name: sub.isHearingImpaired ? `${sub.language} (CC)` : (sub.language || 'Subtitle')
        }));
    } catch (e) {
        return [];
    }
}

export async function parseHlsMaster(masterUrl, hosterName, mediaTitle, playbackHeaders) {
    try {
        const res = await fetch(masterUrl, { headers: playbackHeaders });
        if (!res.ok) return null;
        const text = await res.text();
        if (!text.includes('#EXT-X-STREAM-INF')) return null;

        const lines = text.split('\n');
        const streams = [];
        let currentQuality = 'Unknown';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXT-X-STREAM-INF')) {
                const resMatch = line.match(/RESOLUTION=\d+x(\d+)/);
                if (resMatch) {
                    currentQuality = resMatch[1] + 'p';
                }
            } else if (line && !line.startsWith('#')) {
                const streamUrl = line.startsWith('http') ? line : new URL(line, masterUrl).href;
                streams.push({
                    name: `Mapple [${hosterName}] - ${currentQuality}`,
                    title: mediaTitle,
                    url: streamUrl,
                    quality: currentQuality,
                    size: 'Unknown',
                    headers: playbackHeaders,
                    provider: 'mapple'
                });
                currentQuality = 'Unknown';
            }
        }
        return streams.length > 0 ? streams : null;
    } catch (e) {
        return null;
    }
}
