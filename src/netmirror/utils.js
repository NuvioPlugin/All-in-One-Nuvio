import { NEW_TV_BASE_HEADERS, NEW_TV_DOMAINS } from './constants.js';

export function getUnixTime() {
    return Math.floor(Date.now() / 1000);
}

export function convertRuntimeToMinutes(runtime) {
    if (!runtime) return 0;
    let totalMinutes = 0;
    const parts = runtime.toString().split(" ");
    for (const part of parts) {
        if (part.endsWith("h")) {
            totalMinutes += (parseInt(part.replace("h", "")) || 0) * 60;
        } else if (part.endsWith("m")) {
            totalMinutes += parseInt(part.replace("m", "")) || 0;
        }
    }
    return totalMinutes;
}

let resolvedApiUrl = "";

function safeAtob(encoded) {
    if (typeof atob === 'function') {
        return atob(encoded);
    }
    return Buffer.from(encoded, 'base64').toString('binary');
}

export async function resolveApiUrl() {
    if (resolvedApiUrl) return resolvedApiUrl;

    for (const encoded of NEW_TV_DOMAINS) {
        const base = safeAtob(encoded).replace(/\/$/, '');
        try {
            const response = await fetch(`${base}/checknewtv.php`, {
                headers: { ...NEW_TV_BASE_HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const data = await response.json();
            const tokenHash = data.token_hash;
            if (tokenHash) {
                resolvedApiUrl = safeAtob(tokenHash).replace(/\/$/, '');
                return resolvedApiUrl;
            }
        } catch (error) {
            // Try next domain
        }
    }
    throw new Error("Failed to resolve NewTV API base URL");
}

let cookieValue = "";
let cookieTimestamp = 0;

function readNetMirrorCookie(headers) {
    if (!headers) return "";
    let setCookie = headers.get('set-cookie') || headers.get('Set-Cookie');
    if (!setCookie && headers.getSetCookie) {
        try { setCookie = headers.getSetCookie().join(','); } catch (e) {}
    }
    if (!setCookie && headers.forEach) {
        try {
            headers.forEach((value, key) => {
                if (key.toLowerCase() === 'set-cookie') setCookie = `${setCookie || ''},${value}`;
            });
        } catch (e) {}
    }
    const match = (setCookie || '').match(/(?:^|[,;\s])t_hash_t=([^;,\s]+)/i);
    return match ? match[1] : "";
}

export async function bypass(ott) {
    if (cookieValue && (Date.now() - cookieTimestamp < 54000000)) {
        return cookieValue;
    }

    try {
        console.log("[NetMirror] Requesting an access cookie...");
        const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() :
            'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
                const random = Math.random() * 16 | 0;
                return (char === 'x' ? random : random & 3 | 8).toString(16);
            });
        const verifyUrl = 'https://net52.cc/verify.php';
        const requestOptions = {
            method: 'POST',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'max-age=0',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://net22.cc',
                'Referer': 'https://net22.cc/verify2',
                'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
            },
            body: `g-recaptcha-response=${encodeURIComponent(uuid)}`
        };

        let verifyResponse;
        try {
            // The source app disables redirects so it can read Set-Cookie from
            // the verification response itself.
            verifyResponse = await fetch(verifyUrl, { ...requestOptions, redirect: 'manual' });
        } catch (manualRedirectError) {
            // Some native fetch implementations only support automatic redirects.
            verifyResponse = await fetch(verifyUrl, requestOptions);
        }
        await verifyResponse.text();
        const newCookie = readNetMirrorCookie(verifyResponse.headers);
        if (newCookie) {
            cookieValue = newCookie;
            cookieTimestamp = Date.now();
            console.log("[NetMirror] Access cookie acquired.");
            return cookieValue;
        }
        console.error("[NetMirror] Verification response did not contain a t_hash_t cookie.");
    } catch (e) {
        cookieValue = "";
        console.error("[NetMirror] Cookie request failed:", e.message);
    }
    return "";
}


export function buildNewTvHeaders(ott, extra = {}) {
    return {
        ...NEW_TV_BASE_HEADERS,
        'Ott': ott,
        ...extra
    };
}
