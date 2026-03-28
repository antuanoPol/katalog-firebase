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
    const [googleResult, redditResult, newsResult, magazineResult, wykopResult, vintedResult] = await Promise.allSettled([
      fetchGoogleTrendsFashion(browser),
      fetchRedditFashion(),
      fetchGoogleNewsMentions(),
      fetchPolishFashionMagazines(),
      fetchWykopMentions(),
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

    addSource(redditResult,   'Reddit',   8,  d => Object.entries(d).map(([k,v]) => ({ name: k, value: v })));
    addSource(newsResult,     'News',     5,  d => Object.entries(d).map(([k,v]) => ({ name: k, value: v })));
    addSource(magazineResult, 'Magazine', 4,  d => Object.entries(d).map(([k,v]) => ({ name: k, value: v })));
    addSource(wykopResult,    'Wykop',    6,  d => Object.entries(d).map(([k,v]) => ({ name: k, value: v })));

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

// ── Source 1: Google Trends fashion category ──────────────────────────────
async function fetchGoogleTrendsFashion(browser) {
  const ctx = await browser.newContext({ locale: 'pl-PL', timezoneId: 'Europe/Warsaw', userAgent: UA });
  try {
    const page = await ctx.newPage();
    await page.goto('https://trends.google.com/?geo=PL', { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Try cat=185 (Apparel & Accessories) first
    for (const url of [
      'https://trends.google.com/trends/api/dailytrends?hl=pl&tz=-60&geo=PL&ns=15&cat=185',
      'https://trends.google.com/trends/api/dailytrends?hl=pl&tz=-60&geo=PL&ns=15',
    ]) {
      const res = await ctx.request.get(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok()) continue;
      const text = await res.text();
      const nl = text.indexOf('\n');
      if (nl === -1) continue;
      try {
        const json = JSON.parse(text.slice(nl + 1));
        const searches = json?.default?.trendingSearchesDays?.[0]?.trendingSearches ?? [];
        if (searches.length) return searches.map(t => t.title?.query ?? '').filter(Boolean);
      } catch { continue; }
    }
    return [];
  } finally { await ctx.close(); }
}

// ── Source 2: Reddit fashion communities ─────────────────────────────────
async function fetchRedditFashion() {
  const subs = 'femalefashionadvice+malefashionadvice+streetwear+femalefashion+fashionadvice+malefemalefashion';
  const res = await fetch(`https://www.reddit.com/r/${subs}/hot.json?limit=100`,
    { headers: { 'User-Agent': 'TrendsBot/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const text = (json.data?.children ?? []).filter(p => !p.data.stickied)
    .map(p => p.data.title.toLowerCase()).join(' ');
  const counts = {};
  for (const s of STYLES) {
    const c = (text.match(new RegExp(s.kw.split(' ')[0], 'g')) ?? []).length;
    if (c > 0) counts[s.name] = c;
  }
  return counts;
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
  const res = await fetch('https://wykop.pl/rss/wykopalisko',
    { headers: { 'User-Agent': 'TrendsBot/1.0', 'Accept': 'application/rss+xml, text/xml' },
      signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = (await res.text()).toLowerCase();
  const counts = {};
  for (const s of STYLES) {
    const c = (text.match(new RegExp(s.kw.split(' ')[0], 'g')) ?? []).length;
    if (c > 0) counts[s.name] = c;
  }
  return counts;
}

// ── Vinted: count items per style (parallel) ──────────────────────────────
async function fetchVintedStyleCounts(browser) {
  const ctx = await browser.newContext({ locale: 'pl-PL', userAgent: UA });
  try {
    const page = await ctx.newPage();
    await page.goto('https://www.vinted.pl/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    return await Promise.all(STYLES.map(async s => {
      try {
        const res = await ctx.request.get(
          `https://www.vinted.pl/api/v2/catalog/items?search_text=${encodeURIComponent(s.kw)}&per_page=1`,
          { headers: { 'Accept': 'application/json' } }
        );
        if (!res.ok()) return { name: s.name, count: 0 };
        const json = await res.json();
        return { name: s.name, count: json.pagination?.total_count ?? 0 };
      } catch { return { name: s.name, count: 0 }; }
    }));
  } finally { await ctx.close(); }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
