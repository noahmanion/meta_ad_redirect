const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();
const firestore = admin.firestore();

exports.redirect = onRequest({ region: 'us-central1' }, async (req, res) => {
  // Get raw query string to preserve + signs
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
    
    // Parse raw query string manually to preserve + signs
    const paramPairs = rawQuery.split('&');
    for (const pair of paramPairs) {
      const [key, ...valueParts] = pair.split('=');
      const value = valueParts.join('='); // Handle values with = in them
      
      if (key && key !== 'd' && value !== undefined) {
        // Decode %XX sequences but preserve + as literal +
        const decodedKey = decodeURIComponent(key);
        const decodedValue = decodeURIComponent(value.replace(/\+/g, '%2B'));
        
        destUrl.searchParams.set(decodedKey, decodedValue);
        params[decodedKey] = decodedValue;
      }
    }
    
    // Extract fbclid separately for easier reconciliation
    const fbclid = params.fbclid || null;
    
    // Log click (fire and forget)
    firestore.collection('clicks').add({
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