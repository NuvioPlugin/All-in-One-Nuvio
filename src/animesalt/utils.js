import { TMDB_BASE_URL, TMDB_API_KEY, HEADERS } from './constants.js';

export async function fetchTmdbDetails(tmdbId, mediaType) {
    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    try {
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return null;
        const data = await res.json();
        return {
            title: mediaType === 'movie' ? (data.title || data.original_title) : (data.name || data.original_name),
            year: parseInt((data.release_date || data.first_air_date || '').substring(0, 4)) || null,
            imdbId: data.external_ids?.imdb_id || null
        };
    } catch {
        return null;
    }
}

export function cleanTitle(str) {
    return (str || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function titleSimilarity(a, b) {
    const cleanA = cleanTitle(a);
    const cleanB = cleanTitle(b);
    if (!cleanA || !cleanB) return 0;
    if (cleanA === cleanB) return 1;
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return 0.8;
    const wordsA = new Set(cleanA.split(' '));
    const wordsB = new Set(cleanB.split(' '));
    let intersection = 0;
    for (const w of wordsA) {
        if (wordsB.has(w)) intersection++;
    }
    return (intersection * 2) / (wordsA.size + wordsB.size);
}

export function unpack(code) {
    try {
        const match = code.match(/}\((['"])([\s\S]*?)\1,\s*(\d+),\s*(\d+),\s*(['"])([\s\S]*?)\5\.split\((['"])\|\7\)/);
        if (match) {
            let [_, quote1, p, a, c, quote2, kStr] = match;
            p = p.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            const radix = parseInt(a);
            let count = parseInt(c);
            const k = kStr.split('|');
            const e = (c) => (c < radix ? '' : e(parseInt(c / radix))) + ((c = c % radix) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
            const d = {};
            while (count--) d[e(count)] = k[count] || e(count);
            return p.replace(/\b\w+\b/g, (w) => d[w]);
        }
    } catch {}
    return code;
}
