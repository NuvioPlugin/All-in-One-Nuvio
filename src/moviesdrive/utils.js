import cheerio from 'cheerio-without-node-native';
import { HEADERS, DOMAINS_URL, MAIN_URL } from './constants.js';

let cachedMainUrl = "";

export async function getMainUrl() {
    if (cachedMainUrl) return cachedMainUrl;
    try {
        const response = await fetch(DOMAINS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const data = await response.json();
        cachedMainUrl = data.moviesdrive || MAIN_URL;
        return cachedMainUrl;
    } catch (e) {
        return MAIN_URL;
    }
}

export function getIndexQuality(str) {
    if (!str) return 1080;
    const match = str.match(/(\d{3,4})[pP]/);
    if (match) return parseInt(match[1]);
    if (str.toUpperCase().includes("4K") || str.toUpperCase().includes("2160P") || str.toUpperCase().includes("UHD")) return 2160;
    return 1080;
}

export async function extractMdrive(url) {
    if (!url) return [];
    const regex = /hubcloud|gdflix|gdlink/i;
    
    if (regex.test(url) && (url.includes("/drive/") || url.includes("/file/"))) {
        return [url];
    }

    try {
        const res = await fetch(url, { headers: { ...HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
        const html = await res.text();
        
        if (url.includes("search-recover.php")) {
            const qMatch = html.match(/const\s+Q_INITIAL\s*=\s*["']([^"']+)["']/);
            const tokenMatch = html.match(/const\s+FROM_AC_TOKEN\s*=\s*["']([^"']+)["']/);
            
            if (qMatch && tokenMatch) {
                const apiBase = url.split('/drive/')[0];
                const searchParams = new URLSearchParams({
                    api: 'search',
                    q: qMatch[1],
                    page: '1',
                    from_ac: tokenMatch[1]
                });
                
                const apiRes = await fetch(`${apiBase}/drive/search-recover.php?${searchParams.toString()}`, { 
                    headers: { ...HEADERS, 'Accept': 'application/json', Referer: url, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
                });
                const data = await apiRes.json();
                if (data.hits) {
                    return data.hits.map(h => h.url).filter(Boolean);
                }
            }
        }

        const $ = cheerio.load(html);
        return $("a[href]")
            .map((i, el) => $(el).attr("href"))
            .get()
            .filter(href => regex.test(href));
    } catch (e) {
        return [];
    }
}

export async function hubCloudExtractor(url, referer) {
    try {
        let currentUrl = url;
        const pageResponse = await fetch(currentUrl, {
            headers: { ...HEADERS, Referer: referer }
        });
        let pageData = await pageResponse.text();
        let finalUrl = currentUrl;
        
        if (!currentUrl.includes("hubcloud.php")) {
            let nextHref = "";
            const $first = cheerio.load(pageData);
            const phpLink = $first('a[href*="hubcloud.php"]').attr("href");
            if (phpLink) {
                nextHref = phpLink;
            } else {
                const downloadBtn = $first("#download");
                if (downloadBtn.length) {
                    nextHref = downloadBtn.attr("href");
                } else {
                    const scriptUrlMatch = pageData.match(/var url = ["']([^"']*)["']/);
                    if (scriptUrlMatch) nextHref = scriptUrlMatch[1];
                }
            }

            if (nextHref) {
                if (!nextHref.startsWith("http")) {
                    const urlObj = new URL(currentUrl);
                    nextHref = `${urlObj.protocol}//${urlObj.hostname}/${nextHref.replace(/^\//, "")}`;
                }
                finalUrl = nextHref;
                const secondResponse = await fetch(finalUrl, {
                    headers: { ...HEADERS, Referer: currentUrl }
                });
                pageData = await secondResponse.text();
            }
        }
        
        const $ = cheerio.load(pageData);
        const size = $("i#size").text().trim();
        const header = $("div.card-header").text().trim();
        const quality = getIndexQuality(header);
        
        const pxlMatch = pageData.match(/var\s+pxl\s*=\s*["']([^"']+)["']/);
        const links = [];
        const elements = $("a[href]").get();
        const blocked = ["tinyurl", "telegram", "hubcloud.cx/tg", "hubcloud.foo/tg"];

        for (const el of elements) {
            let link = $(el).attr("href");
            const text = $(el).text().toLowerCase().trim();
            if (!link || blocked.some(b => link.includes(b))) continue;

            if (link.includes("negn6f") && pxlMatch) {
                link = pxlMatch[1];
            }

            if (text.includes("fslv2")) {
                links.push({ name: "HubCloud - FSLv2", quality, url: link, size });
            } else if (text.includes("fsl server") || (text.includes("fsl") && !text.includes("v2"))) {
                links.push({ name: "HubCloud - FSL Server", quality, url: link, size });
            } else if (text.includes("download file") || text.includes("instant download") || text.includes("instant") || text.includes("10gbps")) {
                try {
                    const res = await fetch(link, {
                        headers: { ...HEADERS, Referer: finalUrl },
                        redirect: "follow"
                    });
                    const streamUrl = res.url;
                    if (streamUrl && streamUrl.startsWith("http")) {
                        links.push({ name: "HubCloud - Instant", quality, url: streamUrl, size });
                    }
                } catch (e) {
                    links.push({ name: "HubCloud - Instant", quality, url: link, size });
                }
            } else if (text.includes("pixeldra") || text.includes("pixelserver") || text.includes("pixeldrain") || link.includes("pixeldrain")) {
                let pUrl = link;
                if (pUrl.includes("/u/")) {
                    const fileId = pUrl.split("/u/")[1].split("?")[0].replace("/", "");
                    pUrl = `https://pixeldrain.dev/api/file/${fileId}?download`;
                }
                links.push({ name: "HubCloud - Pixeldrain", quality, url: pUrl, size });
            } else if (text.includes("buzzserver") || text.includes("buzz server") || text.includes("buzz") || text.includes("fuckingfast")) {
                try {
                    const dlRes = await fetch(link, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                        }
                    });
                    const dlHtml = await dlRes.text();
                    const copyMatch = dlHtml.match(/copyDownloadLink\(['"]([^'"]+)['"]\)/);
                    const dlPath = copyMatch ? copyMatch[1].replace(/\\\//g, "/") : null;
                    const base = new URL(link).origin;
                    const dlUrl = dlPath ? (dlPath.startsWith("http") ? dlPath : `${base}${dlPath}`) : (link.endsWith("/download") ? link : `${link}/download`);
                    const resp = await fetch(dlUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                            "Referer": link,
                            "HX-Request": "true"
                        },
                        redirect: "manual"
                    });
                    const dlink = resp.headers.get("hx-redirect") || resp.headers.get("location");
                    if (dlink) {
                        links.push({ name: "HubCloud - BuzzServer", quality, url: dlink, size });
                    }
                } catch (e) {}
            } else if (text.includes("s3 server")) {
                links.push({ name: "HubCloud - S3", quality, url: link, size });
            } else if (text.includes("mega server")) {
                links.push({ name: "HubCloud - Mega", quality, url: link, size });
            } else if (link.includes("r2.dev")) {
                links.push({ name: "Direct R2", quality, url: link, size });
            } else if (link.includes("workers.dev")) {
                links.push({ name: "ZipDisk Server", quality, url: link, size });
            }
        }
        return links;
    } catch (e) {
        return [];
    }
}

export async function loadExtractor(url, referer) {
    try {
        const hostname = new URL(url).hostname;
        if (hostname.includes("hubcloud")) return await hubCloudExtractor(url, referer);
        if (hostname.includes("gdflix") || hostname.includes("gdlink")) return [{ name: "GDFlix", quality: 1080, url }];
        return [];
    } catch (e) {
        return [];
    }
}
