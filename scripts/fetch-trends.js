import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { chromium } from 'playwright';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  const configDoc = await db.collection('trends').doc('config').get();
  if (configDoc.exists && configDoc.data().enabled === false) {
    console.log('Trends disabled, skipping');
    return;
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const [googleResult, vintedResult] = await Promise.allSettled([
      fetchGoogleTrends(browser),
      fetchVintedBrands(browser),
    ]);

    const googleTrends = googleResult.status === 'fulfilled' ? googleResult.value : [];
    const vintedBrands = vintedResult.status === 'fulfilled' ? vintedResult.value : [];

    if (googleResult.status === 'rejected') console.error('Google Trends error:', googleResult.reason);
    if (vintedResult.status === 'rejected') console.error('Vinted error:', vintedResult.reason);

    await db.collection('trends').doc('latest').set({
      updatedAt: new Date().toISOString(),
      googleTrends,
      vintedBrands,
    });
    console.log(`Trends updated: ${googleTrends.length} Google trends, ${vintedBrands.length} Vinted brands`);
  } finally {
    await browser.close();
  }
}

async function fetchGoogleTrends(browser) {
  const context = await browser.newContext({
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });
  try {
    const page = await context.newPage();
    // Visit homepage first to establish session/cookies
    await page.goto('https://trends.google.com/?geo=PL', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Fetch API using browser session (inherits cookies)
    const res = await context.request.get(
      'https://trends.google.com/trends/api/dailytrends?hl=pl&tz=-60&geo=PL&ns=15',
      { headers: { 'Accept': 'application/json, text/plain, */*' } }
    );
    console.log('Google Trends status:', res.status());
    if (!res.ok()) throw new Error(`Google Trends HTTP ${res.status()}`);

    const text = await res.text();
    const newlineIdx = text.indexOf('\n');
    if (newlineIdx === -1) throw new Error('Unexpected Google Trends format');
    const json = JSON.parse(text.slice(newlineIdx + 1));
    const days = json?.default?.trendingSearchesDays ?? [];
    console.log(`Google days: ${days.length}, searches: ${days[0]?.trendingSearches?.length ?? 0}`);
    if (!days.length) throw new Error('No trending days in response');
    const searches = days[0].trendingSearches ?? [];
    return searches.map(t => t.title?.query ?? '').filter(Boolean).slice(0, 20);
  } finally {
    await context.close();
  }
}

async function fetchVintedBrands(browser) {
  const context = await browser.newContext({
    locale: 'pl-PL',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });
  try {
    const page = await context.newPage();
    // Visit homepage first to get Cloudflare session cookies
    await page.goto('https://www.vinted.pl/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Fetch brands API using the same browser session
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

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
