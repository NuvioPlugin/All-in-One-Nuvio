import { FLIXCLOUD_BASE, ENC_DEC_BASE, USER_AGENT } from './constants.js';

function getUrlOrigin(url) {
    if (!url) return FLIXCLOUD_BASE;
    const match = url.match(/^(https?:\/\/[^\/]+)/);
    return match ? match[1] : FLIXCLOUD_BASE;
}

function normalizeFlixEmbedUrl(url) {
    let finalUrl = url.startsWith("http") ? url : `${FLIXCLOUD_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
    finalUrl = finalUrl.replace(/[?&]v=[^&]+/, "").replace(/[?&]kuudere_ts=[^&]+/, "");
    const separator = finalUrl.includes("?") ? "&" : "?";
    return `${finalUrl}${separator}v=1&autoPlay=true&skI=false&skO=false&kuudere_ts=${Date.now()}`;
}

function json5ToJson(json5) {
    return json5
        .replace(/([{,]\s*)([\w_]+)(\s*:)/g, '$1"$2"$3')
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/:\s*undefined\b/g, ': null');
}

function parseSsrData(html) {
    const dataMatch = html.match(/type:\s*"data",\s*data:\s*(\{.*?\})\s*,\s*uses:/s);
    if (dataMatch) {
        try {
            const rawJson = json5ToJson(dataMatch[1]);
            return JSON.parse(rawJson);
        } catch (_) {}
    }
    throw new Error("Failed to extract FlixCloud SSR data");
}

export async function extractFlixCloudDownload(embedUrl) {
    try {
        const match = embedUrl.match(/\/e\/([a-z0-9]+)/i);
        const aid = match ? match[1] : null;
        if (!aid) return null;

        const dlHeaders = {
            "Accept": "*/*",
            "Referer": `${FLIXCLOUD_BASE}/`,
            "User-Agent": USER_AGENT
        };

        const res = await fetch(`${FLIXCLOUD_BASE}/d/${aid}/__data.json`, {
            headers: dlHeaders
        });

        if (!res.ok) return null;
        const dataBody = await res.text();

        const fileIdMatch = dataBody.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const tokenMatch = dataBody.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);
        const baseMatch = dataBody.match(/https:\/\/fetch\d*\.flixcloud\.cc/);
        const resolutionMatch = dataBody.match(/(\d{3,4}p)/);

        const fileId = fileIdMatch ? fileIdMatch[0] : null;
        const token = tokenMatch ? tokenMatch[0] : null;
        const base = baseMatch ? baseMatch[0] : FLIXCLOUD_BASE;
        const resolution = resolutionMatch ? resolutionMatch[1] : null;

        if (!fileId || !token) return null;

        let ready = false;
        for (let attempts = 0; !ready && attempts < 2; attempts++) {
            try {
                const progRes = await fetch(`${base}/download/${fileId}/progress?token=${token}`, {
                    headers: dlHeaders
                });
                if (progRes.ok) {
                    const text = await progRes.text();
                    if (text.includes('"status":"ready"') || text.includes('"ready"')) {
                        ready = true;
                        break;
                    }
                    if (text.includes('"status":"failed"')) break;
                }
            } catch (_) {}
        }

        const fileUrl = `${base}/download/${fileId}?token=${token}`;
        return {
            url: fileUrl,
            quality: resolution || "1080p",
            type: "mkv",
            headers: dlHeaders,
            ready: ready
        };
    } catch (_) {
        return null;
    }
}

export async function extractFlixCloud(embedUrl, referer) {
    const pageUrl = normalizeFlixEmbedUrl(embedUrl);
    const origin = getUrlOrigin(pageUrl);

    const response = await fetch(pageUrl, {
        headers: {
            "User-Agent": USER_AGENT,
            "Accept": "*/*",
            "Origin": origin,
            "Referer": `${FLIXCLOUD_BASE}/`
        }
    });

    if (!response.ok) throw new Error(`FlixCloud embed HTTP ${response.status}`);
    const html = await response.text();

    const data = parseSsrData(html);

    const rawSubtitles = Array.isArray(data.subtitles) ? data.subtitles : [];
    const subtitles = rawSubtitles.map(sub => ({
        url: sub.url,
        language: sub.language || sub.lang || "Unknown",
        format: sub.format || (sub.url.endsWith(".ass") ? "ass" : sub.url.endsWith(".vtt") ? "vtt" : "srt"),
        default: !!sub.default,
        headers: {
            "Referer": `${FLIXCLOUD_BASE}/`,
            "Origin": FLIXCLOUD_BASE
        }
    }));

    const cleanData = Object.assign({}, data);
    delete cleanData.subtitles;
    delete cleanData.intro_chapter;
    delete cleanData.outro_chapter;

    const resolveResponse = await fetch(`${ENC_DEC_BASE}/api/dec-flixcloud?type=token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "User-Agent": USER_AGENT
        },
        body: JSON.stringify({ data: cleanData })
    });
    if (!resolveResponse.ok) throw new Error(`Token API HTTP ${resolveResponse.status}`);
    const resolveJson = await resolveResponse.json();

    const result = resolveJson.result || resolveJson;
    const token = result.token || (result.context && result.context.token);
    const context = result.context || result;

    if (!token) throw new Error("Missing token in resolve response");

    const tokenResponse = await fetch(`${origin}/api/m3u8/${token}`, {
        headers: {
            "User-Agent": USER_AGENT,
            "Origin": origin,
            "Referer": `${FLIXCLOUD_BASE}/`
        }
    });
    if (!tokenResponse.ok) throw new Error(`Token authorization HTTP ${tokenResponse.status}`);
    const tokenJson = await tokenResponse.json();

    const decryptResponse = await fetch(`${ENC_DEC_BASE}/api/dec-flixcloud?type=stream`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "User-Agent": USER_AGENT
        },
        body: JSON.stringify({
            data: {
                context: context,
                stream_response: tokenJson
            }
        })
    });
    if (!decryptResponse.ok) throw new Error(`Stream decrypt HTTP ${decryptResponse.status}`);
    const decryptJson = await decryptResponse.json();

    const stream = decryptJson.result?.stream || decryptJson.result?.url || decryptJson.result;
    if (!stream || typeof stream !== 'string') {
        throw new Error("Invalid stream returned from decrypt API");
    }

    const wPayload = decryptJson.result?.context?.w_payload || context?.w_payload || '';
    const cleanStream = stream.replace(/\\\//g, "/").replace(/&amp;/g, "&").trim();
    const parseUrl = `${ENC_DEC_BASE}/api/parse-flixcloud?url=${encodeURIComponent(cleanStream)}&w_payload=${encodeURIComponent(wPayload)}`;

    return {
        url: parseUrl,
        videoId: data.video_id,
        title: data.video_title,
        subtitles: subtitles,
        headers: {
            "Referer": `${FLIXCLOUD_BASE}/`,
            "User-Agent": USER_AGENT
        }
    };
}
