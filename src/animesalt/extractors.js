import cheerio from 'cheerio-without-node-native';
import CryptoJS from 'crypto-js';
import { HEADERS } from './constants.js';
import { unpack } from './utils.js';

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
            url: m3u8,
            headers: {
                'Referer': `${origin}/`,
                'Origin': origin,
                'User-Agent': HEADERS['User-Agent']
            },
            subtitles: subtitle ? [{ lang: 'English', url: subtitle }] : []
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
                    name: `AnimeSalt [${langName}] (${codec} ${quality})`,
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

export async function extractMultiLang(dataParam) {
    try {
        let decodedStr = '';
        if (typeof atob === 'function') {
            decodedStr = atob(dataParam);
        } else {
            decodedStr = Buffer.from(dataParam, 'base64').toString('utf-8');
        }
        const list = JSON.parse(decodedStr);
        if (!Array.isArray(list)) return [];

        const streamPromises = list.map(item => {
            const lang = item.language || 'Default';
            const link = item.link;
            if (!link) return Promise.resolve([]);
            return extractAbyss(link, lang);
        });

        const nested = await Promise.all(streamPromises);
        return nested.flat();
    } catch {
        return [];
    }
}

export async function extractMegaPlay(url) {
    try {
        let streamPageUrl = url;
        if (!url.includes('/stream/s-')) {
            const pageRes = await fetch(url, { headers: HEADERS });
            if (!pageRes.ok) return [];
            const html = await pageRes.text();
            const $ = cheerio.load(html);
            const embedSrc = $('iframe.s5-embed').attr('src');
            if (!embedSrc) return [];
            streamPageUrl = embedSrc;
        }

        const idMatch = streamPageUrl.match(/\/stream\/s-\d+\/(\d+)\//);
        if (!idMatch || !idMatch[1]) return [];
        const id = idMatch[1];

        const origin = new URL(streamPageUrl).origin;
        const apiHeaders = {
            'Accept': '*/*',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': origin,
            'User-Agent': HEADERS['User-Agent']
        };

        const apiRes = await fetch(`${origin}/stream/getSources?id=${id}`, { headers: apiHeaders });
        if (!apiRes.ok) return [];
        const resJson = await apiRes.json();

        let file = resJson?.sources?.file;
        const enc = resJson?.enc;

        if (!file && enc) {
            const keyStr = 'i?LMTAx0Q6,:}50U';
            const keyHex = CryptoJS.enc.Utf8.parse(keyStr).toString(CryptoJS.enc.Hex).padEnd(64, '0');
            const key = CryptoJS.enc.Hex.parse(keyHex);
            const iv = CryptoJS.enc.Utf8.parse("W0;27ToaUpl_P%'c");

            const normalized = enc.replace(/-/g, '+').replace(/_/g, '/');
            const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
            const decrypted = CryptoJS.AES.decrypt(padded, key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });
            const decObj = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
            file = decObj?.file;
        }

        if (!file) return [];

        const tokenMatch = file.match(/\/([a-f0-9]{32})\/([a-f0-9]{32})\//i);
        if (tokenMatch && !file.includes('token=')) {
            const secret = 'MpCdnT0k3n!9f2K#xQ7vL5mR8wN1pY4s';
            const expires = Math.floor(Date.now() / 1000) + 90;
            const payload = `${expires}|${tokenMatch[1]}/${tokenMatch[2]}`;
            const hash = CryptoJS.HmacSHA256(payload, secret);
            const b64Payload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(payload))
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            const b64Sig = CryptoJS.enc.Base64.stringify(hash)
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            const token = `${b64Payload}.${b64Sig}`;
            file = `${file}${file.includes('?') ? '&' : '?'}token=${token}`;
        }

        const subtitles = (resJson?.tracks || [])
            .filter(t => t.file && t.kind !== 'thumbnails')
            .map(t => ({ lang: t.label || 'English', url: t.file }));

        return [{
            name: 'AnimeSalt [MegaPlay] (Auto M3U8)',
            url: file,
            quality: '1080p',
            headers: {
                'Referer': `${origin}/`,
                'Origin': origin,
                'User-Agent': HEADERS['User-Agent']
            },
            subtitles: subtitles,
            type: 'm3u8'
        }];
    } catch {
        return [];
    }
}

export async function extractStreamWish(url) {
    try {
        const embedUrl = url.includes('/e/') ? url : url.replace('/f/', '/e/');
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
                    name: 'AnimeSalt [StreamWish] (Auto M3U8)',
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
