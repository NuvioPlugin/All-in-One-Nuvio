import cheerio from 'cheerio-without-node-native';
import { HEADERS, DOMAINS_URL, FALLBACK_DOMAIN, TMDB_BASE_URL, TMDB_API_KEY } from './constants.js';

let cachedDomain = "";

export async function getMainUrl() {
    if (cachedDomain) return cachedDomain;
    try {
        const response = await fetch(DOMAINS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const data = await response.json();
        cachedDomain = String(data["UHDMovies"] || FALLBACK_DOMAIN).replace(/\/$/, "");
        return cachedDomain;
    } catch (e) {
        return FALLBACK_DOMAIN;
    }
}

export function getBaseUrl(url) {
    try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.host}`;
    } catch (e) {
        return "";
    }
}

export function fixUrl(url, domain) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("//")) return `https:${url}`;
    if (url.startsWith("/")) return domain + url;
    return `${domain}/${url}`;
}

export async function bypassHrefli(url) {
    const host = getBaseUrl(url);
    const cookies = new Map();

    function absorbCookies(response) {
        let setCookie = "";
        try {
            const allCookies = response.headers.getSetCookie?.();
            if (Array.isArray(allCookies)) setCookie = allCookies.join("\n");
        } catch (_) {}
        if (!setCookie) setCookie = response.headers.get("set-cookie") || "";
        for (const item of setCookie.split(/\n|,(?=[^;,]+=)/)) {
            const pair = item.split(";")[0].trim();
            const separator = pair.indexOf("=");
            if (separator <= 0) continue;
            const name = pair.slice(0, separator).trim();
            const value = pair.slice(separator + 1).trim();
            if (!value || value.toLowerCase() === "deleted") cookies.delete(name);
            else cookies.set(name, value);
        }
    }

    function cookieHeader(extra = {}) {
        const values = new Map(cookies);
        for (const [name, value] of Object.entries(extra)) {
            if (value) values.set(name, value);
        }
        return Array.from(values, ([name, value]) => `${name}=${value}`).join("; ");
    }

    async function request(requestUrl, options = {}) {
        const headers = { ...HEADERS, ...(options.headers || {}) };
        const cookie = cookieHeader();
        if (cookie) headers.Cookie = cookie;
        const response = await fetch(requestUrl, { ...options, headers });
        absorbCookies(response);
        return response;
    }

    try {
        let currentUrl = url;
        let response = await request(currentUrl);
        let html = await response.text();
        let lastFormData = {};

        // Hrefli pages can require several form posts; retain cookies across each step.
        for (let step = 0; step < 5; step++) {
            const $ = cheerio.load(html);
            const form = $("form#landing").first();
            const action = form.attr("action");
            if (!action) break;

            const formData = {};
            form.find("input[name]").each((_, el) => {
                const name = $(el).attr("name");
                if (name) formData[name] = $(el).attr("value") || "";
            });
            if (Object.keys(formData).length === 0) break;

            lastFormData = formData;
            currentUrl = new URL(action, currentUrl).toString();
            response = await request(currentUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer": response.url || currentUrl
                },
                body: new URLSearchParams(formData).toString()
            });
            html = await response.text();
            if (!cheerio.load(html)("form#landing").length) break;
        }

        const $ = cheerio.load(html);
        let redirectUrl = $("meta[http-equiv='refresh']").attr("content") || "";
        redirectUrl = redirectUrl.match(/url\s*=\s*['\"]?([^'\";]+)/i)?.[1] || "";

        if (!redirectUrl) {
            const goMatch = html.match(/[?&]go=([^"'&\s]+)/i);
            if (goMatch) {
                const skToken = decodeURIComponent(goMatch[1]);
                const wpHttp2 = lastFormData._wp_http2 || "";
                if (wpHttp2) cookies.set(skToken, wpHttp2);
                response = await request(`${host}?go=${encodeURIComponent(skToken)}`);
                html = await response.text();
                const $go = cheerio.load(html);
                redirectUrl = $go("meta[http-equiv='refresh']").attr("content") || "";
                redirectUrl = redirectUrl.match(/url\s*=\s*['\"]?([^'\";]+)/i)?.[1] || "";
            }
        }

        if (!redirectUrl) {
            redirectUrl = html.match(/(?:location(?:\.href)?\s*=|replace\()\s*['\"]([^'\"]+)['\"]/i)?.[1] || "";
        }
        if (!redirectUrl) return null;

        const driveUrl = new URL(redirectUrl.trim(), response.url || currentUrl).toString();
        const driveRes = await request(driveUrl);
        const driveHtml = await driveRes.text();
        const path = driveHtml.match(/replace\(\s*['\"]([^'\"]+)['\"]\s*\)/i)?.[1];
        if (!path || path === "/404") return null;
        return new URL(path, driveRes.url || driveUrl).toString();
    } catch (e) {
        console.log("[UHDMovies] Hrefli bypass failed:", e.message);
        return null;
    }
}

export async function fetchTmdbDetails(tmdbId, mediaType) {
    try {
        const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
        const res = await fetch(url, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            } 
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
            title: mediaType === 'movie' ? (data.title || data.original_title) : (data.name || data.original_name),
            originalTitle: mediaType === 'movie' ? data.original_title : data.original_name,
            year: (data.release_date || data.first_air_date || "").substring(0, 4),
            imdbId: data.external_ids?.imdb_id
        };
    } catch (e) {
        return null;
    }
}

export function getIndexQuality(str) {
    if (!str) return "Unknown";
    const match = str.match(/(\d{3,4})[pP]/);
    if (match) return match[1] + "p";
    if (str.toUpperCase().includes("4K") || str.toUpperCase().includes("UHD")) return "2160p";
    return "Unknown";
}

export async function extractVideoSeed(finallink) {
    try {
        const urlObj = new URL(finallink);
        const host = urlObj.host || "video-seed.xyz";
        const token = finallink.split("?url=")[1];
        if (!token) return null;

        const res = await fetch(`https://${host}/api`, {
            method: "POST",
            headers: {
                ...HEADERS,
                "Content-Type": "application/x-www-form-urlencoded",
                "x-token": host,
                "Referer": finallink
            },
            body: `keys=${encodeURIComponent(token)}`
        });
        const text = await res.text();
        const urlMatch = text.match(/url":"([^"]+)"/);
        return urlMatch ? urlMatch[1].replace(/\\\//g, "/") : null;
    } catch (e) {
        return null;
    }
}

export async function extractDriveseedPage(url) {
    const streams = [];
    try {
        let pageUrl = url;
        if (url.includes("r?key=")) {
            const res = await fetch(url, { headers: HEADERS });
            const html = await res.text();
            const redirectMatch = html.match(/replace\("([^"]+)"\)/);
            if (redirectMatch) {
                pageUrl = fixUrl(redirectMatch[1], getBaseUrl(url));
            }
        }
        
        const res = await fetch(pageUrl, { headers: HEADERS });
        const html = await res.text();
        const $ = cheerio.load(html);
        const baseDomain = getBaseUrl(pageUrl);

        const qualityText = $("li.list-group-item").first().text() || "";
        const size = $("li:nth-child(3)").text().replace("Size : ", "").trim();
        const quality = getIndexQuality(qualityText);

        const elements = $("div.text-center > a").get();
        for (const el of elements) {
            const text = $(el).text().toLowerCase();
            const href = $(el).attr("href");
            if (!href) continue;

            if (text.includes("instant download")) {
                const instantRes = await fetch(fixUrl(href, baseDomain), { headers: HEADERS, redirect: "follow" });
                if (instantRes.url && instantRes.url.includes("url=")) {
                    streams.push({ name: "Driveseed Instant", url: instantRes.url.split("url=")[1], quality, size });
                }
            } else if (text.includes("resume cloud")) {
                const cloudRes = await fetch(fixUrl(href, baseDomain), { headers: HEADERS });
                const cloudHtml = await cloudRes.text();
                const link = cheerio.load(cloudHtml)("a.btn-success").first().attr("href");
                if (link) streams.push({ name: "Driveseed Cloud", url: link, quality, size });
            } else if (text.includes("cloud download")) {
                streams.push({ name: "Driveseed Cloud", url: fixUrl(href, baseDomain), quality, size });
            }
        }
    } catch (e) {}
    return streams;
}
