const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');

admin.initializeApp({ projectId: 'cc-ads-etl' });
const firestore = admin.firestore();
const bigquery = new BigQuery();

async function backfill() {
  const snapshot = await firestore.collection('clicks').get();
  
  if (snapshot.empty) {
    console.log('No clicks to export');
    return;
  }
  
  const rows = [];
  snapshot.forEach(doc => {
    const d = doc.data();
    rows.push({
      document_id: doc.id,
      timestamp: d.timestamp?.toDate?.()?.toISOString() || null,
      destination: d.destination || null,
      utm_source: d.utm_source || null,
      utm_medium: d.utm_medium || null,
      utm_campaign: d.utm_campaign || null,
      utm_content: d.utm_content || null,
      utm_term: d.utm_term || null,
      fbclid: d.fbclid || null,
      ip: d.ip || null,
      user_agent: d.userAgent || null,
      params_json: JSON.stringify(d.params || {})
    });
  });
  
  await bigquery.dataset('firestore_clicks').table('clicks').insert(rows);
  console.log(`Backfilled ${rows.length} clicks to BigQuery`);
  process.exit(0);
}

backfill().catch(console.error);