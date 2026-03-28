import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { chromium } from 'playwright';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// Known fashion styles to track
const STYLES = [
  { name: 'Vintage',        query: 'vintage' },
  { name: 'Y2K',            query: 'y2k' },
  { name: 'Retro',          query: 'retro' },
  { name: 'Boho',           query: 'boho' },
  { name: 'Streetwear',     query: 'streetwear' },
  { name: 'Grunge',         query: 'grunge' },
  { name: 'Preppy',         query: 'preppy' },
  { name: 'Cottagecore',    query: 'cottagecore' },
  { name: 'Dark Academia',  query: 'dark academia' },
  { name: 'Minimalist',     query: 'minimalist' },
  { name: 'Kawaii',         query: 'kawaii' },
  { name: 'Oversized',      query: 'oversized' },
  { name: 'Hipster',        query: 'hipster' },
  { name: 'Punk',           query: 'punk' },
  { name: 'Gothic',         query: 'gothic' },
  { name: 'Lata 90.',       query: 'lata 90' },
  { name: 'Lata 80.',       query: 'lata 80' },
  { name: 'Elegancki',      query: 'elegancki styl' },
  { name: 'Sportowy',       query: 'sportowy styl' },
  { name: 'Casual',         query: 'casual outfit' },
];

async function main() {
  const configDoc = await db.collection('trends').doc('config').get();
  if (configDoc.exists && configDoc.data().enabled === false) {
    console.log('Trends disabled, skipping'); return;
  }

  // Read previous fashion style snapshot for growth
  const prevSnap = await db.collection('trends').doc('styles_snapshot').get();
  const prevStyles = prevSnap.exists ? (prevSnap.data().data ?? {}) : {};
  const prevSavedAt = prevSnap.exists ? prevSnap.data().savedAt : null;

  // Read previous brand snapshot for growth
  const prevBrandSnap = await db.collection('trends').doc('brands_snapshot').get();
  const prevBrands = prevBrandSnap.exists ? (prevBrandSnap.data().data ?? {}) : {};
  const prevBrandSavedAt = prevBrandSnap.exists ? prevBrandSnap.data().savedAt : null;

  const browser = await chromium.launch({ headless: true });
  try {
    const [googleResult, redditResult, vintedStylesResult, brandsResult] = await Promise.allSettled([
      fetchGoogleTrendsFashion(browser),
      fetchRedditFashion(),
      fetchVintedStyleCounts(browser),
      fetchVintedBrands(browser),
    ]);

    // ── Merge fashion trends from internet sources ──────────────────────────
    const styleScores = {};  // name → { redditMentions, googleTrend, vintedCount, vintedGrowth }

    // Initialize all known styles
    for (const s of STYLES) styleScores[s.name] = { redditMentions: 0, googleTrend: false, vintedCount: 0, vintedGrowthPct: null, vintedWeeklyEst: null };

    // Add Vinted counts + growth
    if (vintedStylesResult.status === 'fulfilled') {
      const hoursElapsed = prevSavedAt ? (Date.now() - new Date(prevSavedAt).getTime()) / 3600000 : null;
      for (const vs of vintedStylesResult.value) {
        if (!styleScores[vs.name]) styleScores[vs.name] = { redditMentions: 0, googleTrend: false };
        styleScores[vs.name].vintedCount = vs.count;
        const prev = prevStyles[vs.name];
        if (prev && prev > 0 && hoursElapsed && hoursElapsed > 1) {
          const gPct = Math.round(((vs.count - prev) / prev) * 1000) / 10;
          styleScores[vs.name].vintedGrowthPct = gPct;
          styleScores[vs.name].vintedWeeklyEst = Math.round(gPct * (168 / hoursElapsed) * 10) / 10;
        }
      }
      console.log(`Vinted styles: ${vintedStylesResult.value.length}`);
    } else console.error('Vinted styles error:', vintedStylesResult.reason?.message);

    // Add Reddit fashion mentions
    if (redditResult.status === 'fulfilled') {
      for (const [styleName, count] of Object.entries(redditResult.value)) {
        if (styleScores[styleName]) styleScores[styleName].redditMentions = count;
      }
      console.log(`Reddit fashion mentions: ${JSON.stringify(redditResult.value)}`);
    } else console.error('Reddit error:', redditResult.reason?.message);

    // Mark Google Trends fashion matches
    if (googleResult.status === 'fulfilled') {
      const googleLower = googleResult.value.map(t => t.toLowerCase());
      for (const s of STYLES) {
        if (googleLower.some(g => g.includes(s.query.toLowerCase()) || s.query.toLowerCase().includes(g))) {
          if (styleScores[s.name]) styleScores[s.name].googleTrend = true;
        }
      }
      console.log(`Google fashion trends: ${googleResult.value.length}`);
    } else console.error('Google error:', googleResult.reason?.message);

    // Build final fashion trends list — score and sort
    const fashionTrends = Object.entries(styleScores)
      .map(([name, d]) => ({
        name,
        vintedCount: d.vintedCount ?? 0,
        vintedGrowthPct: d.vintedGrowthPct ?? null,
        vintedWeeklyEst: d.vintedWeeklyEst ?? null,
        redditMentions: d.redditMentions ?? 0,
        googleTrend: d.googleTrend ?? false,
        // Score: Vinted count (normalized) + Reddit + Google bonus
        score: Math.log10((d.vintedCount ?? 0) + 1) * 10 + (d.redditMentions ?? 0) * 8 + (d.googleTrend ? 20 : 0),
      }))
      .filter(t => t.vintedCount > 0 || t.redditMentions > 0 || t.googleTrend)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    // Save new styles snapshot
    const stylesSnapshotData = {};
    for (const t of fashionTrends) stylesSnapshotData[t.name] = t.vintedCount;
    await db.collection('trends').doc('styles_snapshot').set({ savedAt: new Date().toISOString(), data: stylesSnapshotData });

    // ── Vinted brands with growth ───────────────────────────────────────────
    let vintedBrands = brandsResult.status === 'fulfilled' ? brandsResult.value : [];
    if (brandsResult.status === 'rejected') console.error('Brands error:', brandsResult.reason?.message);

    const hoursElapsed = prevBrandSavedAt ? (Date.now() - new Date(prevBrandSavedAt).getTime()) / 3600000 : null;
    vintedBrands = vintedBrands.map(b => {
      const prev = prevBrands[b.title];
      let growthPct = null, weeklyGrowthEst = null;
      if (prev && prev > 0 && hoursElapsed && hoursElapsed > 1) {
        growthPct = Math.round(((b.itemCount - prev) / prev) * 1000) / 10;
        weeklyGrowthEst = Math.round(growthPct * (168 / hoursElapsed) * 10) / 10;
      }
      return { ...b, growthPct, weeklyGrowthEst };
    });
    await db.collection('trends').doc('brands_snapshot').set({
      savedAt: new Date().toISOString(),
      data: Object.fromEntries(vintedBrands.map(b => [b.title, b.itemCount])),
    });

    await db.collection('trends').doc('latest').set({
      updatedAt: new Date().toISOString(),
      fashionTrends,
      vintedBrands,
    });
    console.log(`Saved: ${fashionTrends.length} fashion trends, ${vintedBrands.length} brands`);
  } finally {
    await browser.close();
  }
}

// ── Google Trends — fashion/clothing category ──────────────────────────────
async function fetchGoogleTrendsFashion(browser) {
  const ctx = await browser.newContext({ locale: 'pl-PL', timezoneId: 'Europe/Warsaw', userAgent: UA });
  try {
    const page = await ctx.newPage();
    await page.goto('https://trends.google.com/?geo=PL', { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Try clothing category (185 = Apparel & Accessories)
    const res = await ctx.request.get(
      'https://trends.google.com/trends/api/dailytrends?hl=pl&tz=-60&geo=PL&ns=15&cat=185',
      { headers: { 'Accept': 'application/json' } }
    );
    console.log('Google fashion status:', res.status());
    if (!res.ok()) {
      // Fallback to general trends
      const res2 = await ctx.request.get(
        'https://trends.google.com/trends/api/dailytrends?hl=pl&tz=-60&geo=PL&ns=15',
        { headers: { 'Accept': 'application/json' } }
      );
      if (!res2.ok()) throw new Error(`HTTP ${res2.status()}`);
      const text = await res2.text();
      const nl = text.indexOf('\n');
      const json = JSON.parse(text.slice(nl + 1));
      return (json?.default?.trendingSearchesDays?.[0]?.trendingSearches ?? []).map(t => t.title?.query ?? '').filter(Boolean);
    }
    const text = await res.text();
    const nl = text.indexOf('\n');
    if (nl === -1) throw new Error('Bad format');
    const json = JSON.parse(text.slice(nl + 1));
    return (json?.default?.trendingSearchesDays?.[0]?.trendingSearches ?? []).map(t => t.title?.query ?? '').filter(Boolean);
  } finally { await ctx.close(); }
}

// ── Reddit fashion communities — count style keyword mentions ──────────────
async function fetchRedditFashion() {
  const subs = 'femalefashionadvice+malefashionadvice+streetwear+femalefashion+Polska_modna';
  const res = await fetch(
    `https://www.reddit.com/r/${subs}/hot.json?limit=100`,
    { headers: { 'User-Agent': 'TrendsBot/1.0' } }
  );
  if (!res.ok) throw new Error(`Reddit HTTP ${res.status}`);
  const json = await res.json();
  const titles = (json.data?.children ?? [])
    .filter(p => !p.data.stickied)
    .map(p => (p.data.title + ' ' + (p.data.selftext ?? '')).toLowerCase());

  const counts = {};
  for (const s of STYLES) {
    const kw = s.query.toLowerCase().split(' ')[0]; // use first word as keyword
    const c = titles.filter(t => t.includes(kw)).length;
    if (c > 0) counts[s.name] = c;
  }
  return counts;
}

// ── Vinted: count items per style query ────────────────────────────────────
async function fetchVintedStyleCounts(browser) {
  const ctx = await browser.newContext({ locale: 'pl-PL', userAgent: UA });
  try {
    const page = await ctx.newPage();
    await page.goto('https://www.vinted.pl/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Fetch all styles in parallel
    const results = await Promise.all(
      STYLES.map(async style => {
        try {
          const res = await ctx.request.get(
            `https://www.vinted.pl/api/v2/catalog/items?search_text=${encodeURIComponent(style.query)}&per_page=1`,
            { headers: { 'Accept': 'application/json' } }
          );
          if (!res.ok()) return { name: style.name, count: 0 };
          const json = await res.json();
          return { name: style.name, count: json.pagination?.total_count ?? 0 };
        } catch { return { name: style.name, count: 0 }; }
      })
    );
    return results;
  } finally { await ctx.close(); }
}

// ── Vinted brands ──────────────────────────────────────────────────────────
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

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
