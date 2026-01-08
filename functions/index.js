const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');

admin.initializeApp();
const db = admin.firestore();
const bigquery = new BigQuery();

/*******************************************
       Redirect function
*******************************************/

exports.redirect = onRequest({ region: 'us-central1' }, async (req, res) => {
  const rawQuery = req.originalUrl.split('?')[1] || '';
  const rawParams = new URLSearchParams(rawQuery);
  
  const destination = rawParams.get('d');
  
  if (!destination) {
    res.status(400).send('Missing destination');
    return;
  }
  
  try {
    const destUrl = new URL(destination);
    const params = {};
    
    const paramPairs = rawQuery.split('&');
    for (const pair of paramPairs) {
      const [key, ...valueParts] = pair.split('=');
      const value = valueParts.join('=');
      
      if (key && key !== 'd' && value !== undefined) {
        const decodedKey = decodeURIComponent(key);
        const decodedValue = decodeURIComponent(value.replace(/\+/g, '%2B'));
        
        destUrl.searchParams.set(decodedKey, decodedValue);
        params[decodedKey] = decodedValue;
      }
    }
    
    const fbclid = params.fbclid || null;
    
    db.collection('clicks').add({
      timestamp: new Date(),
      destination: destination,
      params: params,
      fbclid: fbclid,
      utm_source: params.utm_source || null,
      utm_medium: params.utm_medium || null,
      utm_campaign: params.utm_campaign || null,
      utm_content: params.utm_content || null,
      utm_term: params.utm_term || null,
      userAgent: req.headers['user-agent'] || null,
      ip: req.headers['x-forwarded-for']?.split(',')[0] || req.ip || null
    }).catch(err => console.error('Firestore write failed:', err));
    
    res.redirect(302, destUrl.toString());
    
  } catch (e) {
    console.error('Redirect error:', e);
    res.status(400).send('Invalid destination URL');
  }
});

/*******************************************
       Export clicks to BigQuery (daily)

       removed, use backfill.js to export clicks as needed.
*******************************************/
