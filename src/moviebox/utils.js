import CryptoJS from 'crypto-js';
import { API_BASE, KEY_B64_DEFAULT, KEY_B64_ALT, BRAND_MODELS, PACKAGE_INFO, TMDB_BASE_URL, TMDB_API_KEY } from './constants.js';

const SECRET_KEY_DEFAULT = CryptoJS.enc.Base64.parse(
    CryptoJS.enc.Base64.parse(KEY_B64_DEFAULT).toString(CryptoJS.enc.Utf8)
);
const SECRET_KEY_ALT = CryptoJS.enc.Base64.parse(
    CryptoJS.enc.Base64.parse(KEY_B64_ALT).toString(CryptoJS.enc.Utf8)
);

let deviceId = "";
let selectedBrand = "";
let selectedModel = "";

let bearerToken = null;

function decodeJwtExpiry(token) {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return 0;
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        const parsed = CryptoJS.enc.Base64.parse(base64).toString(CryptoJS.enc.Utf8);
        const json = JSON.parse(parsed);
        return json.exp || 0;
    } catch (e) {
        return 0;
    }
}

function isTokenValid(token) {
    if (!token) return false;
    const exp = decodeJwtExpiry(token);
    return exp > Date.now() / 1000 + 3600;
}

export async function getCachedToken() {
    if (isTokenValid(bearerToken)) return bearerToken;

    console.log("[MovieBox] Fetching fresh anonymous token...");
    const url = `${API_BASE}/wefeed-mobile-bff/tab/ranking-list?tabId=0&categoryType=4516404531735022304&page=1&perPage=1`;
    const res = await movieBoxRequest("GET", url, null, {}, true);
    if (res && res.headers) {
        const xUser = res.headers.get("x-user");
        if (xUser) {
            try {
                const xUserJson = JSON.parse(xUser);
                const token = xUserJson.token;
                if (token && isTokenValid(token)) {
                    bearerToken = token;
                    return token;
                }
            } catch (e) {
                console.error("[MovieBox] Failed to parse x-user header for token", e);
            }
        }
    }
    return bearerToken || "";
}

export function initializeSession() {
    if (!deviceId) {
        let chars = "0123456789abcdef";
        for (let i = 0; i < 32; i++) {
            deviceId += chars[Math.floor(Math.random() * 16)];
        }
        const brands = Object.keys(BRAND_MODELS);
        selectedBrand = brands[Math.floor(Math.random() * brands.length)];
        const models = BRAND_MODELS[selectedBrand];
        selectedModel = models[Math.floor(Math.random() * models.length)];
    }
}

export function md5(input) {
    return CryptoJS.MD5(input).toString(CryptoJS.enc.Hex);
}

export function hmacMd5(key, data) {
    return CryptoJS.HmacMD5(data, key).toString(CryptoJS.enc.Base64);
}

export function generateXClientToken(timestamp) {
    const ts = (timestamp || Date.now()).toString();
    const reversed = ts.split("").reverse().join("");
    const hash = md5(reversed);
    return `${ts},${hash}`;
}

export function buildCanonicalString(method, accept, contentType, url, body, timestamp) {
    let path = "";
    let query = "";
    try {
        const urlObj = new URL(url);
        path = urlObj.pathname;
        const params = Array.from(urlObj.searchParams.keys()).sort();
        if (params.length > 0) {
            query = params.map(key => {
                const values = urlObj.searchParams.getAll(key);
                return values.map(val => `${key}=${val}`).join("&");
            }).join("&");
        }
    } catch (e) {
        if (url.includes("?")) {
            const parts = url.split("?");
            path = parts[0].replace(/https?:\/\/[^\/]+/, "");
            const qParts = parts[1].split("&").sort();
            query = qParts.join("&");
        } else {
            path = url.replace(/https?:\/\/[^\/]+/, "");
        }
    }
    const canonicalUrl = query ? `${path}?${query}` : path;

    let bodyHash = "";
    let bodyLength = "";
    if (body) {
        const bodyWords = CryptoJS.enc.Utf8.parse(body);
        const totalBytes = bodyWords.sigBytes;
        // Chunk hashing logic: if body > 102400 bytes, only hash first 102400
        // But CryptoJS words might be tricky to slice directly. 
        // We'll stick to full body for now as most requests are small.
        bodyHash = md5(bodyWords);
        bodyLength = totalBytes.toString();
    }

    return `${method.toUpperCase()}\n${accept || ""}\n${contentType || ""}\n${bodyLength}\n${timestamp}\n${bodyHash}\n` + canonicalUrl;
}

export function generateXTrSignature(method, accept, contentType, url, body, useAltKey = false, customTimestamp = null) {
    const timestamp = customTimestamp || Date.now();
    const canonical = buildCanonicalString(method, accept, contentType, url, body, timestamp);
    const secret = useAltKey ? SECRET_KEY_ALT : SECRET_KEY_DEFAULT;
    const signatureB64 = hmacMd5(secret, canonical);
    return `${timestamp}|2|${signatureB64}`;
}

export async function movieBoxRequest(method, url, body = null, customHeaders = {}, isTokenFetch = false) {
    initializeSession();
    const timestamp = Date.now();
    const xClientToken = generateXClientToken(timestamp);
    const headerContentType = customHeaders["Content-Type"] || (body ? "application/json; charset=utf-8" : "application/json");
    const accept = customHeaders["Accept"] || "application/json";
    
    const xTrSignature = generateXTrSignature(method, accept, headerContentType, url, body, false, timestamp);

    const xClientInfo = JSON.stringify({
        ...PACKAGE_INFO,
        os: "android",
        os_version: "14",
        device_id: deviceId,
        install_store: "official",
        gaid: "1b2212c1-dadf-43c3-a0c8-bd6ce48ae22d",
        brand: selectedBrand.toLowerCase(),
        model: selectedModel,
        system_language: "en",
        net: "NETWORK_WIFI",
        region: "IN",
        timezone: "Asia/Calcutta",
        sp_code: ""
    });

    const headers = {
        "Accept": accept,
        "Content-Type": headerContentType,
        "x-client-token": xClientToken,
        "x-tr-signature": xTrSignature,
        "User-Agent": `${PACKAGE_INFO.package_name}/${PACKAGE_INFO.version_code} (Linux; U; Android 14; en_IN; ${selectedModel}; Build/UD1A.230803.041; Cronet/145.0.7582.0)`,
        "x-client-info": xClientInfo,
        "x-client-status": "0",
        ...customHeaders
    };

    if (!isTokenFetch) {
        const token = await getCachedToken();
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = body;
    }

    let retries = 2;
    while (retries > 0) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                if (res.status === 403 || res.status === 429) {
                    retries--;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                return null;
            }
            
            const text = await res.text();
            let parsed = null;
            try {
                parsed = JSON.parse(text);
            } catch (e) {
                parsed = text;
            }

            if (res.headers) {
                const xUser = res.headers.get("x-user");
                if (xUser) {
                    try {
                        const xUserJson = JSON.parse(xUser);
                        const token = xUserJson.token;
                        if (token && isTokenValid(token)) {
                            bearerToken = token;
                        }
                    } catch (e) {}
                }
            }
            
            return {
                data: parsed,
                headers: res.headers
            };
        } catch (err) {
            retries--;
            if (retries === 0) {
                console.error("[MovieBox Request Error]", err.message);
                return null;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return null;
}

export async function fetchTmdbDetails(tmdbId, mediaType) {
    try {
        const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
        const res = await fetch(url, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Connection': 'keep-alive'
            } 
        });
        const data = await res.json();
        return {
            title: mediaType === 'movie' ? (data.title || data.original_title) : (data.name || data.original_name),
            year: (data.release_date || data.first_air_date || "").substring(0, 4),
            imdbId: data.external_ids?.imdb_id,
            originalTitle: data.original_title || data.original_name
        };
    } catch (e) {
        console.error("[MovieBox TMDB Error]", e.message);
        return null;
    }
}

export function normalizeTitle(s) {
    if (!s) return "";
    return s.replace(/\[.*?\]/g, " ")
        .replace(/\(.*?|/g, " ")
        .replace(/\b(dub|dubbed|hd|4k|hindi|tamil|telugu|dual audio)\b/gi, " ")
        .trim()
        .toLowerCase()
        .replace(/:/g, " ")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ");
}

export function parseQualityNumber(value) {
    const match = String(value || "").match(/(\d{3,4})/);
    return match ? parseInt(match[1], 10) : 0;
}

export function getFormatType(url) {
    const u = String(url || "").toLowerCase();
    if (u.includes(".mpd")) return "DASH";
    if (u.includes(".m3u8")) return "HLS";
    if (u.includes(".mp4")) return "MP4";
    if (u.includes(".mkv")) return "MKV";
    return "VIDEO";
}
