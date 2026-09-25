const cheerio = require('cheerio-without-node-native');

const DEFAULT_BASE = 'https://fibwatch.art';
const DOMAIN_LIST = 'https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json';
const TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function absolute(base, value) {
  if (!value) return '';
  try { return new URL(value, base).href; } catch (_) { return value; }
}

function getBase() {
  return fetch(DOMAIN_LIST, { headers: { 'User-Agent': UA } })
    .then(r => r.ok ? r.json() : {})
    .then(data => data.fibwatch || DEFAULT_BASE)
    .catch(() => DEFAULT_BASE);
}

function tmdbDetails(id, type) {
  return fetch(`https://api.themoviedb.org/3/${type === 'tv' ? 'tv' : 'movie'}/${id}?api_key=${TMDB_KEY}`, { headers: { 'User-Agent': UA } })
    .then(r => r.ok ? r.json() : Promise.reject(new Error(`TMDB ${r.status}`)))
    .then(data => ({ title: type === 'tv' ? data.name : data.title, year: Number(((type === 'tv' ? data.first_air_date : data.release_date) || '').slice(0, 4)) || null }));
}

function search(base, title) {
  const url = `${base}/search?keyword=${encodeURIComponent(title)}&page_id=1`;
  return fetch(url, { headers: { 'User-Agent': UA, 'Referer': `${base}/`, 'Cookie': 'pop_up_18=yes' } })
    .then(r => r.ok ? r.text() : '')
    .then(html => {
      const $ = cheerio.load(html);
      const results = [];
      $('div.video-thumb').each((_, el) => {
        const card = $(el);
        const a = card.find('a[href]').first();
        const img = card.find('img').first();
        const name = (card.find('p.hptag').text() || img.attr('alt') || '').trim();
        if (a.attr('href') && name) results.push({ url: absolute(base, a.attr('href')), title: name, image: absolute(base, img.attr('src')) });
      });
      return results;
    });
}

function normalize(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function bestMatch(results, title, year) {
  const target = normalize(title);
  let best = null, bestScore = 0;
  for (const item of results) {
    const candidate = normalize(item.title);
    let score = candidate === target ? 2 : (candidate.includes(target) || target.includes(candidate) ? 1 : 0);
    const y = Number((item.title.match(/\b(19|20)\d{2}\b/) || [])[0]);
    if (year && y) score += y === year ? 0.3 : -0.2;
    if (score > bestScore) { best = item; bestScore = score; }
  }
  return bestScore >= 1 ? best : null;
}

function findVideoId($) {
  return $('#video-id').attr('value') || $('input#video-id').val() || '';
}

function extractPageStreams(base, pageUrl, title) {
  return fetch(pageUrl, { headers: { 'User-Agent': UA, 'Referer': `${base}/`, 'Cookie': 'pop_up_18=yes' } })
    .then(r => r.ok ? r.text() : '')
    .then(html => {
      const $ = cheerio.load(html);
      const pageTitle = $('meta[property="og:title"]').attr('content') || title;
      const videoId = findVideoId($);
      if (!videoId) {
        const direct = [];
        const videoUrl = html.match(/var\s+VIDEO_URL\s*=\s*["']([^"']+)["']/i);
        if (videoUrl) direct.push({ name: 'FibWatch', title: pageTitle, url: absolute(base, videoUrl[1]), quality: 'Auto', headers: { Referer: pageUrl } });
        return direct;
      }
      return fetch(`${base}/ajax/resolution_switcher.php?video_id=${encodeURIComponent(videoId)}`, { headers: { 'User-Agent': UA, 'Referer': pageUrl, 'X-Requested-With': 'XMLHttpRequest', 'Cookie': 'pop_up_18=yes' } })
        .then(r => r.ok ? r.text() : '')
        .then(data => {
          const out = [];
          const text = typeof data === 'string' ? data : JSON.stringify(data);
          const push = (url, label) => {
            const absoluteUrl = absolute(base, url);
            if (/^https?:/i.test(absoluteUrl) && !out.some(s => s.url === absoluteUrl)) out.push({ name: 'FibWatch', title: label || pageTitle, url: absoluteUrl, quality: (label || absoluteUrl).match(/(2160p|1080p|720p|480p|360p|4k)/i)?.[0] || 'Auto', headers: { Referer: pageUrl } });
          };
          try {
            const json = JSON.parse(text);
            const walk = obj => {
              if (!obj) return;
              if (typeof obj === 'string' && /^(https?:)?\/\//i.test(obj) && /\.(m3u8|mp4|mkv)(\?|$)/i.test(obj)) push(obj);
              else if (Array.isArray(obj)) obj.forEach(walk);
              else if (typeof obj === 'object') Object.keys(obj).forEach(k => walk(obj[k]));
            };
            walk(json);
          } catch (_) {
            const re = /(?:https?:)?\\?\/?\\?["']?([^\s"'<>]+\.(?:m3u8|mp4|mkv)(?:\?[^\s"'<>]*)?)/gi;
            let m;
            while ((m = re.exec(text))) push(m[1].replace(/\\\//g, '/'));
          }
          return out;
        });
  });
}

function episodePage(base, seriesUrl, season, episode) {
  return fetch(seriesUrl, { headers: { 'User-Agent': UA, 'Referer': `${base}/`, 'Cookie': 'pop_up_18=yes' } })
    .then(r => r.ok ? r.text() : '')
    .then(html => {
      const $ = cheerio.load(html);
      const videoId = findVideoId($);
      if (!videoId) return null;
      return fetch(`${base}/ajax/episodes.php?video_id=${encodeURIComponent(videoId)}`, {
        headers: { 'User-Agent': UA, 'Referer': seriesUrl, 'Cookie': 'pop_up_18=yes', 'X-Requested-With': 'XMLHttpRequest' }
      }).then(r => r.ok ? r.text() : '').then(body => {
        let data;
        try { data = JSON.parse(body); } catch (_) { data = null; }
        const items = data && (data.episodes || data.data || data.items);
        const episodeText = `s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}`;
        if (Array.isArray(items)) {
          const found = items.find(item => {
            const text = `${item.display || ''} ${item.title || ''}`.toLowerCase();
            const match = text.match(/s\s*(\d{1,2})\s*e\s*(\d{1,3})/i);
            if (match) return Number(match[1]) === Number(season) && Number(match[2]) === Number(episode);
            const seasonMatch = text.match(/\bseason\s*(\d+)\b/i);
            const episodeMatch = text.match(/\bepisode\s*(\d+)\b/i);
            return Number(seasonMatch && seasonMatch[1]) === Number(season) && Number(episodeMatch && episodeMatch[1]) === Number(episode);
          });
          if (found && found.url) return absolute(base, found.url);
        }
        const $episodes = cheerio.load(body);
        let href = null;
        $episodes('a[href], .video-wrapper a[href]').each((_, el) => {
          if (href) return;
          const text = `${$episodes(el).text()} ${$episodes(el).attr('title') || ''}`.toLowerCase();
          const match = text.match(/s\s*(\d{1,2})\s*e\s*(\d{1,3})/i);
          const seasonMatch = text.match(/\bseason\s*(\d+)\b/i);
          const episodeMatch = text.match(/\bepisode\s*(\d+)\b/i);
          if ((match && Number(match[1]) === Number(season) && Number(match[2]) === Number(episode)) ||
              (Number(seasonMatch && seasonMatch[1]) === Number(season) && Number(episodeMatch && episodeMatch[1]) === Number(episode))) href = $episodes(el).attr('href');
        });
        return href ? absolute(base, href) : null;
      });
    });
}

function getStreams(tmdbId, mediaType = 'movie', season, episode) {
  return Promise.all([getBase(), tmdbDetails(tmdbId, mediaType)])
    .then(([base, media]) => search(base, media.title).then(results => ({ base, media, results })))
    .then(({ base, media, results }) => {
      const match = bestMatch(results, media.title, media.year);
      if (!match) return [];
      if (mediaType === 'tv' && season != null && episode != null) {
        return episodePage(base, match.url, season, episode)
          .then(url => url ? extractPageStreams(base, url, `${match.title} S${season}E${episode}`) : []);
      }
      return extractPageStreams(base, match.url, match.title);
    })
    .catch(error => { console.error('[FibWatch] Stream lookup failed:', error.message); return []; });
}

module.exports = { getStreams };
