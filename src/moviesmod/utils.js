import cheerio from 'cheerio-without-node-native';
import { HEADERS, DOMAINS_URL, FALLBACK_DOMAIN, TMDB_BASE_URL, TMDB_API_KEY } from './constants.js';

let cachedDomain = "";

export async function getMainUrl() {
    if (cachedDomain) return cachedDomain;
    try {
        const response = await fetch(DOMAINS_URL);
        const data = await response.json();
        cachedDomain = data.moviesmod || FALLBACK_DOMAIN;
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
    try {
        const res1 = await fetch(url, { headers: HEADERS });
        const html1 = await res1.text();
        const $1 = cheerio.load(html1);
        const formUrl1 = $1("form#landing").attr("action");
        const formData1 = {};
        $1("form#landing input").each((_, el) => {
            formData1[$1(el).attr("name")] = $1(el).attr("value") || "";
        });

        const res2 = await fetch(formUrl1, {
            method: "POST",
            headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(formData1).toString()
        });
        const html2 = await res2.text();
        const $2 = cheerio.load(html2);
        const formUrl2 = $2("form#landing").attr("action");
        const formData2 = {};
        $2("form#landing input").each((_, el) => {
            formData2[$2(el).attr("name")] = $2(el).attr("value") || "";
        });

        const res3 = await fetch(formUrl2, {
            method: "POST",
            headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(formData2).toString()
        });
        const html3 = await res3.text();
        const $3 = cheerio.load(html3);
        const script = $3("script:contains(?go=)").html() || "";
        const skTokenMatch = script.match(/\?go=([^"]+)/);
        if (!skTokenMatch) return null;
        const skToken = skTokenMatch[1];
        const wpHttp2 = formData2["_wp_http2"] || "";

        const res4 = await fetch(`${host}?go=${skToken}`, {
            headers: { ...HEADERS, "Cookie": `${skToken}=${wpHttp2}` }
        });
        const html4 = await res4.text();
        const $4 = cheerio.load(html4);
        const metaRefresh = $4('meta[http-equiv="refresh"]').attr("content") || "";
        const driveUrlMatch = metaRefresh.match(/url=(.+)/);
        if (!driveUrlMatch) return null;
        const driveUrl = driveUrlMatch[1];

        const res5 = await fetch(driveUrl, { headers: HEADERS });
        const html5 = await res5.text();
        const pathMatch = html5.match(/replace\("([^"]+)"\)/);
        if (!pathMatch || pathMatch[1] === "/404") return null;
        return fixUrl(pathMatch[1], getBaseUrl(driveUrl));
    } catch (e) {
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
        const data = await res.json();
        return {
            title: mediaType === 'movie' ? (data.title || data.original_title) : (data.name || data.original_name),
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
        const host = finallink.includes("video-leech") ? "video-leech.xyz" : (urlObj.host || "video-seed.xyz");
        const token = finallink.includes("?url=") ? finallink.split("?url=")[1] : finallink;
        if (!token) return null;

        const res = await fetch(`https://${host}/api`, {
            method: "POST",
            headers: {
                ...HEADERS,
                "Content-Type": "application/x-www-form-urlencoded",
                "x-token": host,
                "Referer": finallink,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            },
            body: `keys=${encodeURIComponent(token)}`
        });
        const data = await res.json();
        if (data && data.url) {
            return data.url.replace(/\\\//g, "/");
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function instantLink(url) {
    try {
        if (url.includes("cdn.video-gen.xyz")) {
            const res = await fetch(url, { headers: HEADERS, redirect: "follow" });
            if (res.url && res.url.includes("url=")) {
                const redirected = res.url.split("url=")[1];
                if (redirected && !redirected.includes("?url=")) return redirected;
                return await extractVideoSeed(redirected);
            }
        }
        if (url.includes("?url=")) {
            return await extractVideoSeed(url);
        }
        return url;
    } catch (e) {
        return null;
    }
}

async function resumeBot(url) {
    try {
        const res = await fetch(url, { headers: HEADERS });
        const html = await res.text();
        const setCookie = res.headers.get("set-cookie") || "";
        const ssidMatch = setCookie.match(/PHPSESSID=([^;]+)/);
        const ssid = ssidMatch ? ssidMatch[1] : "";
        
        const tokenMatch = html.match(/formData\.append\('token',\s*'([a-f0-9]+)'\)/);
        const pathMatch = html.match(/fetch\('\/download\?id=([a-zA-Z0-9/+]+)'/);
        if (!tokenMatch || !pathMatch) return null;

        const baseUrl = url.substring(0, url.indexOf("/download"));
        const downloadUrl = `${baseUrl}/download?id=${pathMatch[1]}`;

        const postRes = await fetch(downloadUrl, {
            method: "POST",
            headers: {
                ...HEADERS,
                "Accept": "*/*",
                "Origin": baseUrl,
                "Sec-Fetch-Site": "same-origin",
                "Content-Type": "application/x-www-form-urlencoded",
                ...(ssid ? { "Cookie": `PHPSESSID=${ssid}` } : {})
            },
            body: `token=${encodeURIComponent(tokenMatch[1])}`
        });
        const data = await postRes.json();
        return data && data.url && data.url.startsWith("http") ? data.url : null;
    } catch (e) {
        return null;
    }
}

async function CFType1(url) {
    try {
        const wfileUrl = url.replace("/file", "/wfile") + "?type=1";
        const res = await fetch(wfileUrl, { headers: HEADERS });
        const html = await res.text();
        const $ = cheerio.load(html);
        const links = [];
        $("a.btn-success").each((_, el) => {
            const h = $(el).attr("href");
            if (h && h.startsWith("http")) links.push(h);
        });
        return links;
    } catch (e) {
        return [];
    }
}

async function resumeCloudLink(url) {
    try {
        const res = await fetch(url, { headers: HEADERS });
        const html = await res.text();
        const keyMatch = html.match(/formData\.append\(\s*['"]key['"]\s*,\s*['"]([^'"]+)['"]\s*\)/);
        
        if (keyMatch) {
            const host = new URL(url).host;
            const postRes = await fetch(url, {
                method: "POST",
                headers: {
                    ...HEADERS,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "x-token": host,
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: `action=cloud&key=${encodeURIComponent(keyMatch[1])}&action_token=`
            });
            const data = await postRes.json();
            if (data && data.url) {
                return data.url.replace(/\\\//g, "/");
            }
        }
        
        const $ = cheerio.load(html);
        return $("a.btn-success").first().attr("href") || null;
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
                pageUrl = getBaseUrl(url) + redirectMatch[1];
            }
        }
        
        const res = await fetch(pageUrl, { headers: HEADERS });
        const html = await res.text();
        const $ = cheerio.load(html);
        const baseDomain = getBaseUrl(pageUrl);

        const nameText = $("li.list-group-item:contains(Name)").first().text() || "";
        const sizeText = $("li.list-group-item:contains(Size)").first().text() || $("li:nth-child(3)").text() || "";
        const size = sizeText.replace(/.*Size\s*:\s*/i, "").trim();
        const quality = getIndexQuality(nameText || $("li.list-group-item").first().text() || "");

        // 1. Instant Download
        const instantHref = $("a.btn-danger").attr("href");
        if (instantHref) {
            const finalInstant = await instantLink(instantHref);
            if (finalInstant) {
                streams.push({ name: "Driveseed Instant", url: finalInstant, quality, size });
            }
        }

        // 2. ResumeBot
        const resumeBotHref = $("a.btn.btn-light").attr("href");
        if (resumeBotHref) {
            const finalBot = await resumeBot(resumeBotHref);
            if (finalBot) {
                streams.push({ name: "Driveseed ResumeBot", url: finalBot, quality, size });
            }
        }

        // 3. CF Type1
        const cfLinks = await CFType1(pageUrl);
        for (const cfLink of cfLinks) {
            streams.push({ name: "Driveseed CF Type1", url: cfLink, quality, size });
        }

        // 4. Resume Cloud
        const resumeCloudHref = $("a.btn-warning").attr("href");
        if (resumeCloudHref) {
            const fullCloudUrl = resumeCloudHref.startsWith("http") ? resumeCloudHref : `${baseDomain}${resumeCloudHref}`;
            const finalCloud = await resumeCloudLink(fullCloudUrl);
            if (finalCloud) {
                streams.push({ name: "Driveseed ResumeCloud", url: finalCloud, quality, size });
            }
        }
    } catch (e) {}
    return streams;
}
