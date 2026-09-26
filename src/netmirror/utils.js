const COOKIE_TTL = 54_000_000;
const VERIFY_ATTEMPTS = 7;
const VERIFY_DELAY = 10_000;

const APP_USER_AGENT = 'Mozilla/5.0 (Linux; Android 12; RMX2117 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/147.0.7727.55 Mobile Safari/537.36 /OS.Gatu v3.0';

let cookieValue = '';
let cookieTimestamp = 0;
let cookieJar = [];

function setCookieValues(headers) {
    if (!headers) return [];
    if (typeof headers.getSetCookie === 'function') {
        try { return headers.getSetCookie(); } catch (e) {}
    }
    const raw = headers.get?.('set-cookie') || headers.get?.('Set-Cookie') || '';
    return raw.split(/,(?=\s*[^;,\s]+=)/g).map(value => value.trim()).filter(Boolean);
}

function rememberResponseCookies(headers, responseUrl) {
    const host = new URL(responseUrl).hostname.toLowerCase();
    for (const raw of setCookieValues(headers)) {
        const pair = raw.split(';', 1)[0];
        const equals = pair.indexOf('=');
        if (equals <= 0) continue;
        const name = pair.slice(0, equals).trim();
        const value = pair.slice(equals + 1).trim();
        const domainMatch = raw.match(/(?:^|;)\s*domain=([^;]+)/i);
        const domain = (domainMatch ? domainMatch[1] : host).trim().replace(/^\./, '').toLowerCase();
        const index = cookieJar.findIndex(cookie => cookie.name === name && cookie.domain === domain);
        if (/max-age\s*=\s*0/i.test(raw) || !value) {
            if (index >= 0) cookieJar.splice(index, 1);
            continue;
        }
        const cookie = { name, value, domain };
        if (index >= 0) cookieJar[index] = cookie;
        else cookieJar.push(cookie);
    }
}

function cookieHeaderFor(url) {
    const host = new URL(url).hostname.toLowerCase();
    return cookieJar
        .filter(cookie => host === cookie.domain || host.endsWith(`.${cookie.domain}`))
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
}

async function request(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    const cookieHeader = cookieHeaderFor(url);
    if (cookieHeader) headers.Cookie = cookieHeader;
    const response = await fetch(url, { ...options, headers });
    rememberResponseCookies(response.headers, response.url || url);
    return response;
}

function getCookie(name) {
    return cookieJar.find(cookie => cookie.name === name)?.value || '';
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function bypass(mainUrl) {
    if (cookieValue && Date.now() - cookieTimestamp < COOKIE_TTL) return cookieValue;

    const base = String(mainUrl || 'https://net52.cc').replace(/\/$/, '');
    const homeUrl = `${base}/mobile/home?app=1`;
    const appHeaders = {
        'User-Agent': APP_USER_AGENT,
        'X-Requested-With': 'app.netmirror.netmirrornew'
    };

    try {
        console.log('[NetMirror] Starting mobile cookie verification...');
        cookieJar = [];

        const homeResponse = await request(homeUrl, { headers: appHeaders });
        const homeHtml = await homeResponse.text();
        if (!homeResponse.ok) throw new Error(`Mobile home returned HTTP ${homeResponse.status}`);
        const addhash = homeHtml.match(/data-addhash\s*=\s*["']([^"']+)["']/i)?.[1];
        if (!addhash) throw new Error('NetMirror mobile home did not provide data-addhash');

        const userverUrl = `https://userver.net52.cc/?hee5=${encodeURIComponent(addhash)}&a=y&t=${Math.random()}`;
        const userverResponse = await request(userverUrl, { headers: appHeaders });
        await userverResponse.text();

        const verifyUrl = `${base}/mobile/verify2.php`;
        const verifyHeaders = {
            'User-Agent': APP_USER_AGENT,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt++) {
            await delay(VERIFY_DELAY);
            const response = await request(verifyUrl, {
                method: 'POST',
                headers: verifyHeaders,
                body: `verify=${encodeURIComponent(addhash)}`
            });
            const text = await response.text();
            let allDone = text.includes('"statusup":"All Done"');
            if (!allDone) {
                try { allDone = JSON.parse(text).statusup === 'All Done'; } catch (e) {}
            }
            if (!allDone) {
                console.log(`[NetMirror] Cookie verification pending (attempt ${attempt}/${VERIFY_ATTEMPTS}).`);
                continue;
            }

            const verifiedCookie = getCookie('t_hash_t');
            if (!verifiedCookie) throw new Error('Verification completed without a t_hash_t cookie');
            cookieValue = verifiedCookie;
            cookieTimestamp = Date.now();
            console.log('[NetMirror] Mobile cookie verified.');
            return cookieValue;
        }

        throw new Error('Mobile verification did not complete; NetMirror may be waiting for an ad click');
    } catch (error) {
        cookieValue = '';
        cookieTimestamp = 0;
        console.error('[NetMirror] Mobile cookie verification failed:', error.message);
        return '';
    }
}
