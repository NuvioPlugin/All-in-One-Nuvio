export const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
export const DOMAIN_CACHE_TTL = 4 * 60 * 60 * 1e3;
export let MAIN_URL = "https://hindmovie.dev";

export const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": `${MAIN_URL}/`
};

let domainCacheTimestamp = 0;

export async function ensureDomain() {
    const now = Date.now();
    if (now - domainCacheTimestamp < DOMAIN_CACHE_TTL) return;
    try {
        const response = await fetch(DOMAINS_URL, {
            method: "GET",
            headers: { "User-Agent": HEADERS["User-Agent"] }
        });
        if (response.ok) {
            const data = await response.json();
            if (data && data.hindmoviez) {
                MAIN_URL = data.hindmoviez.replace(/\/+$/, "");
                HEADERS.Referer = `${MAIN_URL}/`;
                domainCacheTimestamp = now;
            }
        }
    } catch (e) {}
}

export async function fetchText(url, options = {}) {
    console.log(`[Hindmoviez] Fetching: ${url}`);
    const response = await fetch(url, { 
        ...options,
        headers: { ...HEADERS, ...options.headers },
        cfKiller: true 
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
}

export async function fetchJson(url, options = {}) {
    console.log(`[Hindmoviez] Fetching JSON: ${url}`);
    const response = await fetch(url, { 
        ...options,
        headers: { ...HEADERS, ...options.headers },
        cfKiller: true 
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}
