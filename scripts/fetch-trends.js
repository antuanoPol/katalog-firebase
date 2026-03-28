import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { chromium } from 'playwright';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const STYLES = [
  { name: 'Vintage',       kw: 'vintage' },
  { name: 'Y2K',           kw: 'y2k' },
  { name: 'Retro',         kw: 'retro' },
  { name: 'Boho',          kw: 'boho' },
  { name: 'Streetwear',    kw: 'streetwear' },
  { name: 'Grunge',        kw: 'grunge' },
  { name: 'Preppy',        kw: 'preppy' },
  { name: 'Cottagecore',   kw: 'cottagecore' },
  { name: 'Dark Academia', kw: 'dark academia' },
  { name: 'Minimalist',    kw: 'minimalist' },
  { name: 'Kawaii',        kw: 'kawaii' },
  { name: 'Oversized',     kw: 'oversized' },
  { name: 'Hipster',       kw: 'hipster' },
  { name: 'Punk',          kw: 'punk' },
  { name: 'Gothic',        kw: 'gothic' },
  { name: 'Lata 90.',      kw: '90s fashion' },
  { name: 'Lata 80.',      kw: '80s fashion' },
  { name: 'Elegancki',     kw: 'elegant style' },
  { name: 'Sportowy',      kw: 'sporty style' },
  { name: 'Casual',        kw: 'casual fashion' },
];

async function main() {
  const configDoc = await db.collection('trends').doc('config').get();
  if (configDoc.exists && configDoc.data().enabled === false) {
    console.log('Trends disabled, skipping'); return;
  }

  const prevStyleSnap = await db.collection('trends').doc('styles_snapshot').get();
  const prevStyles = prevStyleSnap.exists ? (prevStyleSnap.data().data ?? {}) : {};
  const prevSavedAt = prevStyleSnap.exists ? prevStyleSnap.data().savedAt : null;

  const browser = await chromium.launch({ headless: true });
  try {
    // Run all sources in parallel
    const [googleResult, redditResult, newsResult, magazineResult, wykopResult, pinterestResult, vintedResult] = await Promise.allSettled([
      fetchGoogleTrendsFashion(browser),
      fetchRedditFashion(browser),
      fetchGoogleNewsMentions(),
      fetchPolishFashionMagazines(),
      fetchWykopMentions(),
      fetchPinterestMetrics(),
      fetchVintedStyleCounts(browser),
    ]);

    // ── Build internet style scores ─────────────────────────────────────────
    const scores = {};
    for (const s of STYLES) scores[s.name] = { sources: [], score: 0 };

    function addSource(resultObj, sourceName, weight, extractor) {
      if (resultObj.status !== 'fulfilled') {
        console.error(`${sourceName} error:`, resultObj.reason?.message);
        return;
      }
      const data = extractor(resultObj.value);
      let added = 0;
      for (const { name, value } of data) {
        if (!scores[name]) continue;
        scores[name].score += value * weight;
        if (value > 0 && !scores[name].sources.includes(sourceName)) {
          scores[name].sources.push(sourceName);
        }
        added += value;
      }
      console.log(`${sourceName}: ${added} total mentions across styles`);
    }

    // Google Trends — boolean match
    if (googleResult.status === 'fulfilled') {
      const lower = googleResult.value.map(t => t.toLowerCase());
      for (const s of STYLES) {
        const hit = lower.some(g => g.includes(s.kw.split(' ')[0]));
        if (hit) {
          scores[s.name].score += 20;
          scores[s.name].sources.push('Google');
        }
      }
      console.log(`Google Trends: ${googleResult.value.length} terms`);
    } else console.error('Google error:', googleResult.reason?.message);

    addSource(redditResult,    'Reddit',    8,  d => Object.entries(d).map(([k,v]) => ({ name: k, value: v })));
    addSource(newsResult,      'News',      5,  d => Object.entries(d).map(([k,v]) => ({ name: k, value: v })));
    addSource(magazineResult,  'Magazine',  4,  d => Object.entries(d).map(([k,v]) => ({ name: k, value: v })));
    addSource(wykopResult,     'Wykop',     6,  d => Object.entries(d).map(([k,v]) => ({ name: k, value: v })));
    addSource(pinterestResult, 'Pinterest', 14, d => Object.entries(d).map(([k,v]) => ({ name: k, value: v })));

    const internetStyles = Object.entries(scores)
      .filter(([, d]) => d.score > 0)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 20)
      .map(([name, d]) => ({ name, sources: d.sources, score: d.score }));

    // ── Vinted style counts + growth ────────────────────────────────────────
    const hoursElapsed = prevSavedAt ? (Date.now() - new Date(prevSavedAt).getTime()) / 3600000 : null;
    const rawVinted = vintedResult.status === 'fulfilled' ? vintedResult.value : [];
    if (vintedResult.status === 'rejected') console.error('Vinted styles error:', vintedResult.reason?.message);

    const vintedStyles = rawVinted
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .map(s => {
        const prev = prevStyles[s.name];
        let growthPct = null, weeklyEst = null;
        if (prev && prev > 0 && hoursElapsed && hoursElapsed > 1) {
          growthPct = Math.round(((s.count - prev) / prev) * 1000) / 10;
          weeklyEst = Math.round(growthPct * (168 / hoursElapsed) * 10) / 10;
        }
        return { name: s.name, count: s.count, growthPct, weeklyEst };
      });

    // Save snapshot
    await db.collection('trends').doc('styles_snapshot').set({
      savedAt: new Date().toISOString(),
      data: Object.fromEntries(rawVinted.map(s => [s.name, s.count])),
    });

    await db.collection('trends').doc('latest').set({
      updatedAt: new Date().toISOString(),
      internetStyles,
      vintedStyles,
    });
    console.log(`Saved: ${internetStyles.length} internet styles, ${vintedStyles.length} vinted styles`);
  } finally {
    await browser.close();
  }
}

// ── Source 1: Google Trends (RSS feed — more stable than private API) ────────
async function fetchGoogleTrendsFashion(browser) {
  const ctx = await browser.newContext({ locale: 'pl-PL', timezoneId: 'Europe/Warsaw', userAgent: UA });
  try {
    const res = await ctx.request.get(
      'https://trends.google.com/trends/trendingsearches/daily/rss?geo=PL',
      { headers: { 'Accept': 'application/rss+xml, text/xml, */*' } }
    );
    console.log(`Google Trends RSS: HTTP ${res.status()}`);
    if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
    const text = await res.text();
    const titles = [];
    for (const m of text.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)) titles.push(m[1]);
    if (!titles.length) for (const m of text.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>/g)) titles.push(m[1].trim());
    const clean = titles.filter(t => !t.includes('Google') && t.length > 1).slice(0, 25);
    console.log(`Google Trends RSS: ${clean.length} terms`);
    return clean;
  } finally { await ctx.close(); }
}

// ── Source 2: Reddit — scrape old.reddit.com HTML (bypasses API 403) ─────────
async function fetchRedditFashion(browser) {
  const ctx = await browser.newContext({ locale: 'en-US', userAgent: UA });
  try {
    const page = await ctx.newPage();
    const subs = 'femalefashionadvice+malefashionadvice+streetwear+femalefashion';
    await page.goto(`https://old.reddit.com/r/${subs}/`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log(`Reddit page URL: ${page.url()}`);
    const titles = await page.evaluate(() =>
      [...document.querySelectorAll('p.title a.title, .Post h3, [data-testid="post-title"]')]
        .map(el => el.textContent.toLowerCase())
    );
    console.log(`Reddit: ${titles.length} posts`);
    const text = titles.join(' ');
    const counts = {};
    for (const s of STYLES) {
      const c = (text.match(new RegExp(s.kw.split(' ')[0], 'gi')) ?? []).length;
      if (c > 0) counts[s.name] = c;
    }
    return counts;
  } finally { await ctx.close(); }
}

// ── Source 3: Google News RSS — one query per style (parallel) ────────────
async function fetchGoogleNewsMentions() {
  const results = await Promise.all(
    STYLES.map(async s => {
      try {
        const q = encodeURIComponent(`${s.kw} fashion style`);
        const res = await fetch(
          `https://news.google.com/rss/search?q=${q}&hl=en&gl=PL&ceid=PL:en&num=10`,
          { headers: { 'User-Agent': 'TrendsBot/1.0' }, signal: AbortSignal.timeout(10000) }
        );
        if (!res.ok) return [s.name, 0];
        const text = await res.text();
        const count = (text.match(/<item>/g) ?? []).length;
        return [s.name, count];
      } catch { return [s.name, 0]; }
    })
  );
  return Object.fromEntries(results.filter(([, v]) => v > 0));
}

// ── Source 4: Polish fashion magazines RSS ─────────────────────────────────
async function fetchPolishFashionMagazines() {
  const feeds = [
    'https://www.vogue.pl/feed',
    'https://www.elle.pl/feed',
    'https://www.harpersbazaar.pl/feed',
    'https://www.cosmopolitan.com.pl/rss.xml',
    'https://www.glamour.pl/feed',
  ];
  let combinedText = '';
  await Promise.all(feeds.map(async url => {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'TrendsBot/1.0' }, signal: AbortSignal.timeout(8000) });
      if (res.ok) combinedText += (await res.text()).toLowerCase();
    } catch {}
  }));
  const counts = {};
  for (const s of STYLES) {
    const c = (combinedText.match(new RegExp(s.kw.split(' ')[0], 'g')) ?? []).length;
    if (c > 0) counts[s.name] = c;
  }
  return counts;
}

// ── Source 5: Wykop popular links ─────────────────────────────────────────
async function fetchWykopMentions() {
  // Try multiple Wykop RSS URLs
  const urls = ['https://wykop.pl/rss', 'https://wykop.pl/feed', 'https://wykop.pl/rss/wykopalisko'];
  let text = '';
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, text/xml, */*' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) { text = (await res.text()).toLowerCase(); console.log(`Wykop OK: ${url}`); break; }
      console.log(`Wykop ${url}: HTTP ${res.status}`);
    } catch (e) { console.log(`Wykop ${url} error: ${e.message}`); }
  }
  if (!text) throw new Error('All Wykop URLs failed');
  const counts = {};
  for (const s of STYLES) {
    const c = (text.match(new RegExp(s.kw.split(' ')[0], 'g')) ?? []).length;
    if (c > 0) counts[s.name] = c;
  }
  return counts;
}

// ── Source 6: Pinterest Trends metrics ────────────────────────────────────
const PINTEREST_TERM = {
  'Vintage':       'vintage fashion',
  'Y2K':           'y2k fashion',
  'Retro':         'retro fashion',
  'Boho':          'boho style',
  'Streetwear':    'streetwear',
  'Grunge':        'grunge fashion',
  'Preppy':        'preppy style',
  'Cottagecore':   'cottagecore',
  'Dark Academia': 'dark academia',
  'Minimalist':    'minimalist fashion',
  'Kawaii':        'kawaii fashion',
  'Oversized':     'oversized outfit',
  'Hipster':       'hipster style',
  'Punk':          'punk fashion',
  'Gothic':        'gothic fashion',
  'Lata 90.':      '90s fashion',
  'Lata 80.':      '80s fashion',
  'Elegancki':     'elegant fashion',
  'Sportowy':      'sporty fashion',
  'Casual':        'casual fashion',
};

async function fetchPinterestMetrics() {
  // Use top_trends_filtered — returns trending topics without needing specific terms
  const headers = {
    'User-Agent': UA, 'Accept': 'application/json',
    'Referer': 'https://trends.pinterest.com/',
    'Origin': 'https://trends.pinterest.com',
  };

  // Try PL first, fall back to US
  for (const country of ['PL', 'US']) {
    const url = `https://trends.pinterest.com/top_trends_filtered/?country=${country}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
    console.log(`Pinterest top_trends (${country}): HTTP ${res.status()}`);
    if (!res.ok()) continue;
    const data = await res.json();
    const trends = Array.isArray(data) ? data : (data.trends ?? data.results ?? []);
    console.log(`Pinterest trends count: ${trends.length}`);
    if (!trends.length) continue;

    const counts = {};
    const lowerTerms = trends.map(t =>
      (typeof t === 'string' ? t : t.term ?? t.keyword ?? t.display_name ?? '').toLowerCase()
    );
    for (const s of STYLES) {
      const kw = s.kw.split(' ')[0].toLowerCase();
      const hits = lowerTerms.filter(t => t.includes(kw)).length;
      if (hits > 0) counts[s.name] = hits * 10;
    }
    console.log(`Pinterest: ${Object.keys(counts).length} styles matched`);
    return counts;
  }
  throw new Error('Pinterest top_trends failed for PL and US');
}

// ── Vinted: scrape result count per style from search page ────────────────
async function fetchVintedStyleCounts(browser) {
  const ctx = await browser.newContext({ locale: 'pl-PL', userAgent: UA });
  try {
    const page = await ctx.newPage();
    // Accept cookies / set session
    await page.goto('https://www.vinted.pl/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Debug: check homepage URL and sample text
    console.log(`Vinted homepage: ${page.url()}`);
    const homeSample = await page.evaluate(() => document.body.innerText.slice(0, 100));
    console.log(`Vinted home sample: ${homeSample.replace(/\n/g, ' ')}`);

    const results = [];
    for (const s of STYLES) {
      try {
        await page.goto(
          `https://www.vinted.pl/catalog?search_text=${encodeURIComponent(s.kw)}&order=relevance`,
          { waitUntil: 'domcontentloaded', timeout: 20000 }
        );
        // Log redirect target and page sample for first style
        if (results.length === 0) {
          console.log(`Vinted catalog URL: ${page.url()}`);
          const sample = await page.evaluate(() => document.body.innerText.slice(0, 200));
          console.log(`Vinted catalog sample: ${sample.replace(/\n/g, ' ')}`);
        }
        const count = await page.evaluate(() => {
          const text = document.body.innerText;
          // Try Polish patterns: "12 345 wyników", "12345 przedmiotów", "Znaleziono 12345"
          const patterns = [
            /(\d[\d\s]{0,9})\s*wynik/i,
            /(\d[\d\s]{0,9})\s*przedmiot/i,
            /znalezion[oa]\s*(\d[\d\s]{0,9})/i,
            /(\d[\d\s]{0,9})\s*ofert/i,
          ];
          for (const p of patterns) {
            const m = text.match(p);
            if (m) return parseInt(m[1].replace(/\s/g, ''), 10) || 0;
          }
          return 0;
        });
        console.log(`Vinted ${s.name}: ${count}`);
        results.push({ name: s.name, count });
      } catch (e) {
        console.log(`Vinted ${s.name} error: ${e.message}`);
        results.push({ name: s.name, count: 0 });
      }
    }
    const found = results.filter(r => r.count > 0).length;
    console.log(`Vinted: ${found}/${results.length} styles with counts`);
    return results;
  } finally { await ctx.close(); }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
