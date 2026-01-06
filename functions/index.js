const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();
const firestore = admin.firestore();

exports.redirect = onRequest({ region: 'us-central1' }, async (req, res) => {
  const destination = req.query.d;
  
  if (!destination) {
    res.status(400).send('Missing destination');
    return;
  }
  
  try {
    const destUrl = new URL(destination);
    const params = {};
    
    // Forward all params except 'd' to destination
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'd') {
        destUrl.searchParams.set(key, value);
        params[key] = value;
      }
    }
    
    // Extract fbclid separately for easier reconciliation
    const fbclid = req.query.fbclid || null;
    
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