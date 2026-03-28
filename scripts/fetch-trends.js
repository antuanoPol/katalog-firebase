import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  const configDoc = await db.collection('trends').doc('config').get();
  if (configDoc.exists && configDoc.data().enabled === false) {
    console.log('Trends disabled, skipping');
    return;
  }

  const [googleResult, vintedResult] = await Promise.allSettled([
    fetchGoogleTrends(),
    fetchVintedBrands(),
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
}

async function fetchGoogleTrends() {
  const url = 'https://trends.google.com/trends/api/dailytrends?hl=pl&tz=-60&geo=PL&ns=15';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://trends.google.com/',
      'Cookie': 'CONSENT=YES+cb.20231228-07-p0.pl+FX+111; NID=511=dummy',
    },
  });
  if (!res.ok) throw new Error(`Google Trends HTTP ${res.status}`);
  const text = await res.text();
  console.log('Google Trends raw prefix:', JSON.stringify(text.slice(0, 60)));
  const newlineIdx = text.indexOf('\n');
  if (newlineIdx === -1) throw new Error('Unexpected Google Trends response format');
  const json = JSON.parse(text.slice(newlineIdx + 1));
  const days = json?.default?.trendingSearchesDays ?? [];
  console.log(`Google Trends days: ${days.length}, searches in day[0]: ${days[0]?.trendingSearches?.length ?? 0}`);
  if (!days.length) throw new Error('No trending days in response');
  const searches = days[0]?.trendingSearches ?? [];
  return searches.map(t => t.title?.query ?? '').filter(Boolean).slice(0, 20);
}

async function fetchVintedBrands() {
  const res = await fetch(
    'https://www.vinted.pl/api/v2/brands?page=1&per_page=20&order=popularity',
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'pl-PL,pl;q=0.9',
      },
    }
  );
  if (!res.ok) throw new Error(`Vinted brands HTTP ${res.status}`);
  const json = await res.json();
  return (json.brands ?? []).slice(0, 20).map(b => ({
    title: b.title ?? '',
    itemCount: b.item_count ?? 0,
    prettyCount: b.pretty_item_count ?? '',
    isLuxury: b.is_luxury ?? false,
  }));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
