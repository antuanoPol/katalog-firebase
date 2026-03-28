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
    console.log('Trends disabled, skipping');
    return;
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const [wikiResult, brandsResult, stylesResult] = await Promise.allSettled([
      fetchWikiTrending(),
      fetchVintedBrands(browser),
      fetchVintedStyles(browser),
    ]);

    const wikiTrending = wikiResult.status === 'fulfilled' ? wikiResult.value : [];
    const vintedBrands = brandsResult.status === 'fulfilled' ? brandsResult.value : [];
    const vintedStyles = stylesResult.status === 'fulfilled' ? stylesResult.value : [];

    if (wikiResult.status === 'rejected') console.error('Wikipedia error:', wikiResult.reason);
    if (brandsResult.status === 'rejected') console.error('Vinted brands error:', brandsResult.reason);
    if (stylesResult.status === 'rejected') console.error('Vinted styles error:', stylesResult.reason);

    await db.collection('trends').doc('latest').set({
      updatedAt: new Date().toISOString(),
      wikiTrending,
      vintedBrands,
      vintedStyles,
    });
    console.log(`Trends updated: ${wikiTrending.length} wiki, ${vintedBrands.length} brands, ${vintedStyles.length} styles`);
  } finally {
    await browser.close();
  }
}

async function fetchWikiTrending() {
  // Wikipedia daily most-viewed pages in Polish — works from any IP, no auth
  const d = new Date();
  d.setDate(d.getDate() - 1); // yesterday (today not yet ready)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  const res = await fetch(
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/pl.wikipedia.org/all-access/${y}/${m}/${day}`,
    { headers: { 'User-Agent': 'TrendsBot/1.0 (github-actions)' } }
  );
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  const json = await res.json();
  const articles = json?.items?.[0]?.articles ?? [];

  return articles
    .filter(a =>
      !a.article.startsWith('Specjalna:') &&
      !a.article.startsWith('Wikipedia:') &&
      !a.article.startsWith('Plik:') &&
      !a.article.startsWith('Pomoc:') &&
      a.article !== 'Strona_główna'
    )
    .slice(0, 20)
    .map(a => a.article.replace(/_/g, ' '));
}

async function fetchVintedBrands(browser) {
  const context = await browser.newContext({ locale: 'pl-PL', userAgent: UA });
  try {
    const page = await context.newPage();
    await page.goto('https://www.vinted.pl/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    const res = await context.request.get(
      'https://www.vinted.pl/api/v2/brands?page=1&per_page=20&order=popularity',
      { headers: { 'Accept': 'application/json' } }
    );
    console.log('Vinted brands status:', res.status());
    if (!res.ok()) throw new Error(`Vinted brands HTTP ${res.status()}`);
    const json = await res.json();
    return (json.brands ?? []).slice(0, 20).map(b => ({
      title: b.title ?? '',
      itemCount: b.item_count ?? 0,
      prettyCount: b.pretty_item_count ?? '',
      isLuxury: b.is_luxury ?? false,
    }));
  } finally {
    await context.close();
  }
}

async function fetchVintedStyles(browser) {
  const context = await browser.newContext({ locale: 'pl-PL', userAgent: UA });
  try {
    const page = await context.newPage();
    await page.goto('https://www.vinted.pl/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Fetch popular items and count which styles appear most
    const res = await context.request.get(
      'https://www.vinted.pl/api/v2/catalog/items?order=popularity_score&per_page=96&search_text=',
      { headers: { 'Accept': 'application/json' } }
    );
    console.log('Vinted items status:', res.status());
    if (!res.ok()) throw new Error(`Vinted items HTTP ${res.status()}`);

    const json = await res.json();
    const items = json.items ?? [];
    console.log(`Got ${items.length} items`);
    if (items.length > 0) {
      const sampleKeys = Object.keys(items[0]).filter(k => k.includes('style') || k.includes('tag'));
      console.log('Style-related keys in item:', sampleKeys);
    }

    // Count styles from items
    const styleCounts = {};
    for (const item of items) {
      const styles = item.style_tags ?? item.styles ?? [];
      for (const style of Array.isArray(styles) ? styles : []) {
        const name = typeof style === 'string' ? style : (style.title ?? style.name ?? '');
        if (name) styleCounts[name] = (styleCounts[name] || 0) + 1;
      }
    }

    const sorted = Object.entries(styleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([title, count]) => ({ title, count: Number(count) }));

    console.log('Top styles:', sorted);
    return sorted;
  } finally {
    await context.close();
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
