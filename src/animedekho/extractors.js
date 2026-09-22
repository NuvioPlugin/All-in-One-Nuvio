import cheerio from 'cheerio-without-node-native';
import { HEADERS } from './constants.js';
import { unpack } from './utils.js';

export async function extractStreamRuby(url) {
    try {
        const cleanedUrl = url.replace('/e/', '/');
        const res = await fetch(cleanedUrl, {
            headers: {
                ...HEADERS,
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': cleanedUrl
            }
        });
        if (!res.ok) return null;
        const html = await res.text();

        let m3u8 = null;
        const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(['"]\|['"]\)\)/);
        if (packedMatch) {
            const unpacked = unpack(packedMatch[0]);
            const match = unpacked.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/);
            if (match) m3u8 = match[1];
        }

        if (!m3u8) {
            const directMatch = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/);
            if (directMatch) m3u8 = directMatch[1];
        }

        if (!m3u8) return null;

        const origin = new URL(cleanedUrl).origin;
        return {
            name: 'AnimeDekho [StreamRuby] (Auto M3U8)',
            url: m3u8,
            quality: '720p',
            headers: {
                'Origin': origin,
                'Referer': `${cleanedUrl}/`,
                'User-Agent': HEADERS['User-Agent']
            },
            type: 'm3u8'
        };
    } catch {
        return null;
    }
}

export async function extractVidmoly(url) {
    try {
        const res = await fetch(url, {
            headers: {
                ...HEADERS,
                'Referer': 'https://animedekho.app/'
            }
        });
        if (!res.ok) return null;
        const html = await res.text();

        const match = html.match(/file\s*:\s*["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)["']/);
        if (!match || !match[1]) return null;

        const origin = new URL(url).origin;
        return {
            name: 'AnimeDekho [Vidmoly] (Auto M3U8)',
            url: match[1],
            quality: '1080p',
            headers: {
                'Referer': `${origin}/`,
                'Origin': origin,
                'User-Agent': HEADERS['User-Agent']
            },
            type: 'm3u8'
        };
    } catch {
        return null;
    }
}

export async function extractAbyss(url, langName = 'Default') {
    try {
        const cleanUrl = url.replace('https://short.icu', 'https://abyssplayer.com');
        const reqHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
            'Origin': 'https://playhydrax.com',
            'Referer': 'https://playhydrax.com/'
        };

        const res = await fetch(cleanUrl, { headers: reqHeaders });
        if (!res.ok) return [];
        const html = await res.text();

        const match = html.match(/const\s+datas\s*=\s*"([^"]*)"/);
        if (!match || !match[1]) return [];

        const decRes = await fetch('https://enc-dec.app/api/dec-abyss', {
            method: 'POST',
            headers: {
                ...reqHeaders,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: match[1] })
        });
        if (!decRes.ok) return [];
        const decData = await decRes.json();
        const sources = decData?.result?.sources || [];

        return sources
            .filter(s => s && s.url && s.status)
            .map(s => {
                const codec = (s.codec || 'MP4').toUpperCase();
                const quality = s.type || '720p';
                return {
                    name: `AnimeDekho [${langName}] (${codec} ${quality})`,
                    url: s.url,
                    quality: quality,
                    headers: {
                        'Referer': 'https://playhydrax.com/',
                        'Origin': 'https://playhydrax.com',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
                    },
                    type: s.url.includes('.m3u8') ? 'm3u8' : 'mp4'
                };
            });
    } catch {
        return [];
    }
}

export async function extractAwsStream(url) {
    try {
        const hash = url.split('/').filter(Boolean).pop();
        if (!hash) return null;
        const origin = new URL(url).origin;

        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return null;
        const html = await res.text();

        const postUrl = `${origin}/player/index.php?data=${hash}&do=getVideo`;
        const postRes = await fetch(postUrl, {
            method: 'POST',
            headers: {
                ...HEADERS,
                'x-requested-with': 'XMLHttpRequest',
                'Origin': origin,
                'Referer': url,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `hash=${encodeURIComponent(hash)}&r=${encodeURIComponent(origin)}`
        });
        if (!postRes.ok) return null;
        const json = await postRes.json();
        const m3u8 = json?.videoSource;
        if (!m3u8) return null;

        let subtitle = null;
        const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(['"]\|['"]\)\)/);
        if (packedMatch) {
            const unpacked = unpack(packedMatch[0]);
            const subMatch = unpacked.match(/"kind":\s*"captions"\s*,\s*"file":\s*"(https?:\/\/[^"]+)"/);
            if (subMatch) {
                subtitle = subMatch[1].replace(/\\/g, '');
            }
        }

        return {
            name: 'AnimeDekho [AWSStream] (Auto M3U8)',
            url: m3u8,
            quality: '1080p',
            headers: {
                'Referer': `${origin}/`,
                'Origin': origin,
                'User-Agent': HEADERS['User-Agent']
            },
            subtitles: subtitle ? [{ lang: 'English', url: subtitle }] : [],
            type: 'm3u8'
        };
    } catch {
        return null;
    }
}

export async function extractStreamWish(url) {
    try {
        const embedUrl = url.includes('/e/') ? url : (url.includes('/embed/') ? url : url.replace('/f/', '/e/'));
        const res = await fetch(embedUrl, { headers: HEADERS });
        if (!res.ok) return null;
        const html = await res.text();

        const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(['"]\|['"]\)\)/);
        if (packedMatch) {
            const unpacked = unpack(packedMatch[0]);
            const fileMatch = unpacked.match(/file\s*:\s*["'](https?:\/\/[^"'\s]+\.m3u8(?:\?[^"'\s]*)?)["']/);
            if (fileMatch) {
                const origin = new URL(embedUrl).origin;
                return {
                    name: 'AnimeDekho [StreamWish] (Auto M3U8)',
                    url: fileMatch[1],
                    quality: '720p',
                    headers: {
                        'Referer': `${origin}/`,
                        'Origin': origin,
                        'User-Agent': HEADERS['User-Agent']
                    },
                    type: 'm3u8'
                };
            }
        }
    } catch {}
    return null;
}

export async function extractBlakite(url) {
    try {
        const id = url.split('/').filter(Boolean).pop();
        const tmdbMatch = url.match(/embed\/([^/]+)/);
        const tmdbId = tmdbMatch ? tmdbMatch[1] : '';
        const apiUrl = `https://blakiteapi.xyz/api/get.php?id=${id}&tmdbId=${tmdbId}`;

        const res = await fetch(apiUrl, { headers: HEADERS });
        if (!res.ok) return null;
        const json = await res.json();
        if (!json?.success || !json?.data?.dataId) return null;

        const dataId = json.data.dataId;
        const format = json.data.format || 'mp4';
        const quality = json.data.quality || '720p';
        const streamUrl = `https://blakiteapi.xyz/stream/${dataId}.${format}`;

        return {
            name: `AnimeDekho [Blakite] (${quality})`,
            url: streamUrl,
            quality: quality,
            headers: {
                'Referer': 'https://blakiteapi.xyz/',
                'User-Agent': HEADERS['User-Agent']
            },
            type: format.toLowerCase().includes('m3u8') ? 'm3u8' : 'mp4'
        };
    } catch {
        return null;
    }
}

export async function extractVidStack(url) {
    try {
        const hash = url.split('#').pop().split('/').pop();
        if (!hash) return null;
        const origin = new URL(url).origin;

        const res = await fetch(`${origin}/api/v1/video?id=${hash}`, {
            headers: HEADERS
        });
        if (!res.ok) return null;
        const text = (await res.text()).trim();

        const match = text.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
        if (!match) return null;

        return {
            name: 'AnimeDekho [VidStack] (Auto M3U8)',
            url: match[0],
            quality: '720p',
            headers: {
                'Referer': `${origin}/`,
                'User-Agent': HEADERS['User-Agent']
            },
            type: 'm3u8'
        };
    } catch {
        return null;
    }
}
