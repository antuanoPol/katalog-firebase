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
    fetchVintedItems(),
  ]);

  const googleTrends = googleResult.status === 'fulfilled' ? googleResult.value : [];
  const vintedItems = vintedResult.status === 'fulfilled' ? vintedResult.value : [];

  if (googleResult.status === 'rejected') console.error('Google Trends error:', googleResult.reason);
  if (vintedResult.status === 'rejected') console.error('Vinted error:', vintedResult.reason);

  await db.collection('trends').doc('latest').set({
    updatedAt: new Date().toISOString(),
    googleTrends,
    vintedItems,
  });
  console.log(`Trends updated: ${googleTrends.length} Google, ${vintedItems.length} Vinted items`);
}

async function fetchGoogleTrends() {
  const res = await fetch(
    'https://trends.google.com/trends/trendingsearches/daily/rss?geo=PL',
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
  );
  if (!res.ok) throw new Error(`Google Trends HTTP ${res.status}`);
  const text = await res.text();
  console.log('[Google Trends] Response length:', text.length);
  console.log('[Google Trends] First 800 chars:', text.slice(0, 800));

  // Try CDATA format first
  let matches = [...text.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)];
  console.log('[Google Trends] CDATA matches:', matches.length);

  // Try plain title inside <item>
  if (!matches.length) {
    matches = [...text.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>/g)];
    console.log('[Google Trends] Plain item matches:', matches.length);
  }

  // Try any <title> tag
  if (!matches.length) {
    matches = [...text.matchAll(/<title>(.*?)<\/title>/g)];
    console.log('[Google Trends] Any title matches:', matches.length);
  }

  const results = matches
    .map(m => m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim())
    .filter(Boolean)
    .filter(t => !['Daily Search Trends', 'Google Trends'].includes(t))
    .slice(0, 20);
  console.log('[Google Trends] Final results:', results);
  return results;
}

async function fetchVintedItems() {
  const res = await fetch(
    'https://www.vinted.pl/api/v2/catalog/items?search_text=&order=popularity_score&per_page=20',
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json' } }
  );
  if (!res.ok) throw new Error(`Vinted HTTP ${res.status}`);
  const json = await res.json();
  return (json.items ?? []).slice(0, 20).map(i => ({
    title: i.title ?? '',
    brand: i.brand_title ?? '',
    price: i.price_numeric ?? 0,
  }));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
