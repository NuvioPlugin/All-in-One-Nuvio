import { MAIN_URL, HEADERS, TMDB_API_KEY } from './constants.js';

const HEX_ESCAPE = /\\x([0-9a-fA-F]{2})/g;
const INVALID_BACKSLASH = /\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g;

export function sanitizeJson(raw) {
    if (!raw) return "";
    return raw
        .replace(/\\u0022/g, '"')
        .replace(/\\u0026/g, '&')
        .replace(/\\'/g, "'")
        .replace(/\\\//g, '/')
        .replace(/\\\\/g, '\\')
        .replace(/\\&/g, '&')
        .replace(/\\'/g, "'")
        .replace(/\\0/g, '\\u0000')
        .replace(HEX_ESCAPE, (_, hex) => '\\u00' + hex)
        .replace(INVALID_BACKSLASH, '');
}

export function parseXDataJson(rawArg) {
    const sanitized = sanitizeJson(rawArg);
    return JSON.parse(sanitized);
}

export async function fetchText(url, options = {}) {
    const finalUrl = url.startsWith('http') ? url : `${MAIN_URL}${url}`;
    try {
        const response = await fetch(finalUrl, {
            headers: HEADERS,
            signal: AbortSignal.timeout(10000),
            ...options
        });
        if (!response.ok) return "";
        return await response.text();
    } catch (e) {
        return "";
    }
}

export async function fetchWithCookies(url, options = {}) {
    const finalUrl = url.startsWith('http') ? url : `${MAIN_URL}${url}`;
    try {
        const response = await fetch(finalUrl, {
            headers: HEADERS,
            signal: AbortSignal.timeout(10000),
            ...options
        });
        if (!response.ok) return { text: "", cookies: "", ok: false };
        const text = await response.text();
        const cookies = response.headers.getSetCookie 
            ? response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
            : (response.headers.get('set-cookie') || '');
        return { text, cookies, ok: true };
    } catch (e) {
        return { text: "", cookies: "", ok: false };
    }
}

export async function getTmdbInfo(tmdbId, mediaType, season = 1) {
    try {
        const url = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const data = await res.json();
        const info = {
            title: data.name || data.title || data.original_name || data.original_title || "",
            originalTitle: data.original_name || data.original_title || "",
            seasonName: ""
        };

        if (mediaType === 'tv' && season) {
            try {
                const sUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?api_key=${TMDB_API_KEY}`;
                const sRes = await fetch(sUrl, { signal: AbortSignal.timeout(8000) });
                if (sRes.ok) {
                    const sData = await sRes.json();
                    info.seasonName = sData.name || "";
                }
            } catch (e) {}
        }

        return info;
    } catch (e) {
        return null;
    }
}
