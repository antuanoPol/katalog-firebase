import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { chromium } from 'playwright';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function main() {
  const configDoc = await db.collection('trends').doc('config').get();
  if (configDoc.exists && configDoc.data().enabled === false) {
    console.log('Trends disabled, skipping'); return;
  }

  // Read previous brand snapshot for growth calculation
  const prevSnap = await db.collection('trends').doc('brands_snapshot').get();
  const prevBrands = prevSnap.exists ? (prevSnap.data().data ?? {}) : {};
  const prevSavedAt = prevSnap.exists ? prevSnap.data().savedAt : null;

  const browser = await chromium.launch({ headless: true });
  try {
    const [googleResult, wikiResult, redditResult, wykopResult, brandsResult, stylesResult] = await Promise.allSettled([
      fetchGoogleTrends(browser),
      fetchWikiTrending(),
      fetchRedditPL(),
      fetchWykop(),
      fetchVintedBrands(browser),
      fetchVintedStyles(browser),
    ]);

    // ── Aggregate internet trends with cross-source scoring ───────────────────
    const termMap = {};
    function addTerms(terms, source, weight) {
      for (const term of terms) {
        const key = term.toLowerCase().slice(0, 40);
        if (!termMap[key]) termMap[key] = { term, sources: [], score: 0 };
        if (!termMap[key].sources.includes(source)) {
          termMap[key].sources.push(source);
          termMap[key].score += weight;
        }
      }
    }

    if (googleResult.status === 'fulfilled') { addTerms(googleResult.value, 'google', 3); console.log(`Google: ${googleResult.value.length}`); }
    else console.error('Google error:', googleResult.reason?.message);

    if (wikiResult.status === 'fulfilled') { addTerms(wikiResult.value, 'wiki', 1); console.log(`Wiki: ${wikiResult.value.length}`); }
    else console.error('Wiki error:', wikiResult.reason?.message);

    if (redditResult.status === 'fulfilled') { addTerms(redditResult.value, 'reddit', 2); console.log(`Reddit: ${redditResult.value.length}`); }
    else console.error('Reddit error:', redditResult.reason?.message);

    if (wykopResult.status === 'fulfilled') { addTerms(wykopResult.value, 'wykop', 2); console.log(`Wykop: ${wykopResult.value.length}`); }
    else console.error('Wykop error:', wykopResult.reason?.message);

    const internetTrends = Object.values(termMap)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map(t => ({
        term: t.term,
        sources: t.sources,
        score: t.score,
        // Breakout: score ≥ 5 means it appears in multiple quality sources
        breakout: t.score >= 5,
      }));

    // ── Vinted brands with growth calculation ─────────────────────────────────
    let vintedBrands = brandsResult.status === 'fulfilled' ? brandsResult.value : [];
    if (brandsResult.status === 'rejected') console.error('Brands error:', brandsResult.reason?.message);

    const hoursElapsed = prevSavedAt
      ? (Date.now() - new Date(prevSavedAt).getTime()) / 3600000
      : null;

    vintedBrands = vintedBrands.map(b => {
      const prev = prevBrands[b.title];
      let growthPct = null;
      let weeklyGrowthEst = null;
      if (prev && prev > 0 && hoursElapsed && hoursElapsed > 1) {
        growthPct = Math.round(((b.itemCount - prev) / prev) * 1000) / 10; // 1 decimal
        weeklyGrowthEst = Math.round(growthPct * (168 / hoursElapsed) * 10) / 10; // extrapolate to 7 days
      }
      return { ...b, growthPct, weeklyGrowthEst };
    });

    // Save current brand counts as new snapshot
    await db.collection('trends').doc('brands_snapshot').set({
      savedAt: new Date().toISOString(),
      data: Object.fromEntries(vintedBrands.map(b => [b.title, b.itemCount])),
    });

    const vintedStyles = stylesResult.status === 'fulfilled' ? stylesResult.value : [];
    if (stylesResult.status === 'rejected') console.error('Styles error:', stylesResult.reason?.message);

    await db.collection('trends').doc('latest').set({
      updatedAt: new Date().toISOString(),
      internetTrends,
      vintedBrands,
      vintedStyles,
    });
    console.log(`Saved: ${internetTrends.length} internet, ${vintedBrands.length} brands, ${vintedStyles.length} styles`);
  } finally {
    await browser.close();
  }
}

async function fetchGoogleTrends(browser) {
  const ctx = await browser.newContext({ locale: 'pl-PL', timezoneId: 'Europe/Warsaw', userAgent: UA });
  try {
    const page = await ctx.newPage();
    await page.goto('https://trends.google.com/?geo=PL', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const res = await ctx.request.get(
      'https://trends.google.com/trends/api/dailytrends?hl=pl&tz=-60&geo=PL&ns=15',
      { headers: { 'Accept': 'application/json' } }
    );
    console.log('Google status:', res.status());
    if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
    const text = await res.text();
    const nl = text.indexOf('\n');
    if (nl === -1) throw new Error('Bad format');
    const json = JSON.parse(text.slice(nl + 1));
    const searches = json?.default?.trendingSearchesDays?.[0]?.trendingSearches ?? [];
    if (!searches.length) throw new Error('No results');
    return searches.map(t => t.title?.query ?? '').filter(Boolean).slice(0, 15);
  } finally { await ctx.close(); }
}

async function fetchWikiTrending() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  const res = await fetch(
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/pl.wikipedia.org/all-access/${y}/${m}/${day}`,
    { headers: { 'User-Agent': 'TrendsBot/1.0' } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json?.items?.[0]?.articles ?? [])
    .filter(a => !a.article.startsWith('Specjalna:') && !a.article.startsWith('Wikipedia:') &&
                 !a.article.startsWith('Plik:') && !a.article.startsWith('Pomoc:') &&
                 a.article !== 'Strona_główna')
    .slice(0, 15).map(a => a.article.replace(/_/g, ' '));
}

async function fetchRedditPL() {
  const res = await fetch('https://www.reddit.com/r/Polska/hot.json?limit=20',
    { headers: { 'User-Agent': 'TrendsBot/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.data?.children ?? []).filter(p => !p.data.stickied)
    .slice(0, 12).map(p => p.data.title.slice(0, 80));
}

async function fetchWykop() {
  const res = await fetch('https://wykop.pl/rss/wykopalisko',
    { headers: { 'User-Agent': 'TrendsBot/1.0', 'Accept': 'application/rss+xml, text/xml' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const matches = [...text.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)];
  return matches.map(m => m[1].trim()).filter(t => t && t !== 'Wykop' && t.length > 5).slice(0, 12);
}

async function fetchVintedBrands(browser) {
  const ctx = await browser.newContext({ locale: 'pl-PL', userAgent: UA });
  try {
    const page = await ctx.newPage();
    await page.goto('https://www.vinted.pl/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const res = await ctx.request.get(
      'https://www.vinted.pl/api/v2/brands?page=1&per_page=20&order=popularity',
      { headers: { 'Accept': 'application/json' } }
    );
    console.log('Brands status:', res.status());
    if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
    const json = await res.json();
    return (json.brands ?? []).slice(0, 20).map(b => ({
      title: b.title ?? '', itemCount: b.item_count ?? 0,
      prettyCount: b.pretty_item_count ?? '', isLuxury: b.is_luxury ?? false,
    }));
  } finally { await ctx.close(); }
}

async function fetchVintedStyles(browser) {
  const ctx = await browser.newContext({ locale: 'pl-PL', userAgent: UA });
  try {
    const page = await ctx.newPage();
    await page.goto('https://www.vinted.pl/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const res = await ctx.request.get(
      'https://www.vinted.pl/api/v2/catalog/items?order=popularity_score&per_page=96&search_text=',
      { headers: { 'Accept': 'application/json' } }
    );
    console.log('Styles items status:', res.status());
    if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
    const json = await res.json();
    const items = json.items ?? [];
    const counts = {};
    for (const item of items) {
      for (const s of Array.isArray(item.style_tags ?? item.styles) ? (item.style_tags ?? item.styles) : []) {
        const name = typeof s === 'string' ? s : (s.title ?? s.name ?? '');
        if (name) counts[name] = (counts[name] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([title, count]) => ({ title, count: Number(count) }));
  } finally { await ctx.close(); }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
