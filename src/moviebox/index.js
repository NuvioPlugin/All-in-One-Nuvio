import { API_BASE } from './constants.js';
import { movieBoxRequest, fetchTmdbDetails, normalizeTitle, parseQualityNumber, getFormatType } from './utils.js';

async function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
    console.log(`[MovieBox] Querying streams for TMDB: ${tmdbId}, Type: ${mediaType}`);
    
    const details = await fetchTmdbDetails(tmdbId, mediaType);
    if (!details) return [];

    let subjects = await searchMovieBox(details.title);
    let bestMatch = findBestMatch(subjects, details.title, details.year, mediaType);

    if (!bestMatch && details.originalTitle && details.originalTitle !== details.title) {
        subjects = await searchMovieBox(details.originalTitle);
        bestMatch = findBestMatch(subjects, details.originalTitle, details.year, mediaType);
    }

    if (bestMatch) {
        const s = mediaType === 'tv' ? seasonNum : 0;
        const e = mediaType === 'tv' ? episodeNum : 0;
        return await getStreamLinks(bestMatch.subjectId, s, e, details.title, mediaType);
    }

    console.log(`[MovieBox] No matching content found for: ${details.title}`);
    return [];
}

async function searchMovieBox(query) {
    const url = `${API_BASE}/wefeed-mobile-bff/subject-api/search/v2`;
    const body = JSON.stringify({ page: 1, perPage: 20, keyword: query });
    const response = await movieBoxRequest("POST", url, body);
    
    if (response && response.data && response.data.data && response.data.data.results) {
        let allSubjects = [];
        response.data.data.results.forEach(group => {
            if (group.subjects) {
                allSubjects = allSubjects.concat(group.subjects);
            }
        });
        return allSubjects;
    }
    return [];
}

function findBestMatch(subjects, tmdbTitle, tmdbYear, mediaType) {
    const normTmdbTitle = normalizeTitle(tmdbTitle);
    const targetType = mediaType === 'movie' ? 1 : 2;
    
    let bestMatch = null;
    let bestScore = 0;

    for (const subject of subjects) {
        if (subject.subjectType !== targetType) continue;
        
        const title = subject.title;
        const normTitle = normalizeTitle(title);
        const year = subject.year || (subject.releaseDate ? subject.releaseDate.substring(0, 4) : null);
        
        let score = 0;
        if (normTitle === normTmdbTitle) score += 50;
        else if (normTitle.includes(normTmdbTitle) || normTmdbTitle.includes(normTitle)) score += 15;

        if (tmdbYear && year && tmdbYear == year) score += 35;

        if (score > bestScore) {
            bestScore = score;
            bestMatch = subject;
        }
    }

    if (bestScore >= 40) return bestMatch;
    return null;
}

async function getStreamLinks(subjectId, season = 0, episode = 0, mediaTitle = "", mediaType = "movie") {
    // 1. Get initial details to find dubs/other versions
    const subjectUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/get?subjectId=${subjectId}`;
    const detailRes = await movieBoxRequest("GET", subjectUrl);
    
    if (!detailRes || !detailRes.data || !detailRes.data.data) return [];

    const subjectIds = [];
    let originalLang = "Original";
    const dubs = detailRes.data.data.dubs;
    if (Array.isArray(dubs)) {
        dubs.forEach(dub => {
            if (dub.subjectId == subjectId) {
                originalLang = dub.lanName || "Original";
            } else {
                subjectIds.push({ id: dub.subjectId, lang: dub.lanName });
            }
        });
    }
    // Always put requested ID first
    subjectIds.unshift({ id: subjectId, lang: originalLang });

    const allStreams = [];

    for (const item of subjectIds) {
        try {
            const playUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/play-info?subjectId=${item.id}&se=${season}&ep=${episode}`;
            const playRes = await movieBoxRequest("GET", playUrl, null);

            if (playRes && playRes.data && playRes.data.data) {
                const playData = playRes.data.data;
                const streamsList = playData.streams;

                // Standard streams handling
                if (Array.isArray(streamsList) && streamsList.length > 0) {
                    for (const stream of streamsList) {
                        if (!stream.url) continue;

                        const formatType = getFormatType(stream.url);
                        const qualLabel = stream.resolutions || stream.quality || "Auto";
                        const qualNum = parseQualityNumber(qualLabel);
                        const quality = qualNum ? `${qualNum}p` : "Auto";
                        
                        const streamId = stream.id || `${item.id}|${season}|${episode}`;
                        const subtitles = await fetchSubtitles(item.id, streamId, item.lang);

                        allStreams.push({
                            name: "MovieBox",
                            title: `${mediaTitle}${season > 0 ? ` S${season}E${episode}` : ""} (${item.lang}) - ${quality} [${formatType}]`,
                            url: stream.url,
                            quality,
                            headers: {
                                "Referer": API_BASE,
                                "User-Agent": `com.community.mbox.in/50020126 (Linux; U; Android 14; en_IN; Pixel 8; Build/UD1A.230803.041; Cronet/145.0.7582.0)`,
                                ...(stream.signCookie ? { "Cookie": stream.signCookie } : {})
                            },
                            subtitles,
                            provider: "moviebox"
                        });
                    }
                } 
                // Fallback: resourceDetectors
                else if (Array.isArray(playData.resourceDetectors)) {
                    for (const detector of playData.resourceDetectors) {
                        if (Array.isArray(detector.resolutionList)) {
                            for (const video of detector.resolutionList) {
                                if (!video.resourceLink) continue;

                                const quality = video.resolution ? `${video.resolution}p` : "Auto";
                                const se = video.se || season;
                                const ep = video.ep || episode;

                                allStreams.push({
                                    name: "MovieBox",
                                    title: `${mediaTitle} S${se}E${ep} (${item.lang}) - ${quality} [Fallback]`,
                                    url: video.resourceLink,
                                    quality,
                                    headers: {
                                        "Referer": API_BASE,
                                        "User-Agent": `com.community.mbox.in/50020126 (Linux; U; Android 14; en_IN; Pixel 8; Build/UD1A.230803.041; Cronet/145.0.7582.0)`
                                    },
                                    provider: "moviebox"
                                });
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`[MovieBox Stream Fetch Error] ID: ${item.id}`, err.message);
        }
    }

    return allStreams;
}

async function fetchSubtitles(subjectId, streamId, langLabel) {
    const subtitles = [];
    
    // Method 1: get-stream-captions
    try {
        const streamCapUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/get-stream-captions?subjectId=${subjectId}&streamId=${streamId}`;
        const capRes = await movieBoxRequest("GET", streamCapUrl, null);
        if (capRes && capRes.data && capRes.data.data && Array.isArray(capRes.data.data.extCaptions)) {
            capRes.data.data.extCaptions.forEach(cap => {
                if (cap.url) {
                    subtitles.push({
                        url: cap.url,
                        language: cap.language || cap.lanName || cap.lan || "en",
                        name: `${cap.lanName || cap.language || "Subtitle"} (${langLabel})`,
                        headers: { "Referer": API_BASE }
                    });
                }
            });
        }
    } catch (e) {}

    // Method 2: get-ext-captions
    try {
        const extCapUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/get-ext-captions?subjectId=${subjectId}&resourceId=${streamId}&episode=0`;
        const extRes = await movieBoxRequest("GET", extCapUrl, null);
        if (extRes && extRes.data && extRes.data.data && Array.isArray(extRes.data.data.extCaptions)) {
            extRes.data.data.extCaptions.forEach(cap => {
                if (cap.url) {
                    subtitles.push({
                        url: cap.url,
                        language: cap.lan || cap.lanName || cap.language || "en",
                        name: `${cap.lanName || cap.lan || "Subtitle"} (${langLabel})`,
                        headers: { "Referer": API_BASE }
                    });
                }
            });
        }
    } catch (e) {}

    return subtitles;
}

module.exports = { getStreams };
