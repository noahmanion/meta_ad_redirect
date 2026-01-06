# Meta Ad Redirect - AI Coding Agent Instructions

## Project Overview
This is a Firebase-based URL redirect service with click tracking for Meta/Facebook ads. It captures click analytics (UTM parameters, fbclid, geolocation, user agent) and redirects users to destinations while preserving query parameters.

## Architecture

### Firebase Setup
- **Runtime**: Node.js 20
- **Hosting**: Public static site + Cloud Functions
- **Database**: Firestore for click analytics
- **Function**: `redirect` HTTP function deployed at `/r` and `/r/**` endpoints

### Request Flow
1. User clicks ad URL: `/r?d=https://destination.com&utm_source=meta&fbclid=XXX`
2. Function validates destination URL
3. Function logs click metadata to Firestore collection `clicks` (fire-and-forget)
4. Function performs 302 redirect with forwarded query parameters

### Data Schema
Click documents in Firestore contain:
- `timestamp`, `destination`, `params` (forwarded), `fbclid`
- UTM fields: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- Request metadata: `userAgent`, `ip`, `country`, `region`, `city` (from App Engine headers)

## Key Patterns & Conventions

### URL Parameter Handling
- Destination URL passed as `d` parameter (e.g., `?d=https://example.com`)
- All query params EXCEPT `d` are forwarded to destination via `URLSearchParams`
- Special handling for `fbclid` - extracted separately for reconciliation (also forwarded)
- Non-blocking logging: Firestore writes use `.catch()` to prevent failed analytics from blocking redirects

### Error Handling
- Invalid URLs → 400 Bad Request with error message
- Missing destination → 400 "Missing destination"
- Firestore write failures → logged to console, redirect proceeds (analytics non-critical)

### Firebase Configuration
See [firebase.json](firebase.json):
- Rewrites route `/r` and `/r/**` to Cloud Function `redirect`
- Function region: `us-central1`
- Hosting public directory: `public/`

## Development Workflows

### Prerequisites
```bash
# Authenticate with Firebase CLI
firebase login

# Set project
firebase use <project-id>  # or check .firebaserc
```

### Local Testing
```bash
# Install dependencies
cd functions && npm install

# Run function locally with emulator
firebase emulators:start --only functions

# Test: curl "http://localhost:5001/<project>/<region>/redirect?d=https://example.com&utm_source=test"
```

### Deployment
```bash
# Deploy functions and hosting
firebase deploy

# Deploy only functions
firebase deploy --only functions

# View logs
firebase functions:log
```

### Enabling Required Services
Firestore must be enabled in Google Cloud before deployment:
```bash
gcloud services enable firestore.googleapis.com
```

## Critical Implementation Details

1. **Non-Blocking Analytics**: Firestore write is intentionally not awaited. Use `.catch()` for error handling to prevent failed writes from blocking user redirects.

2. **Header Extraction**: Geographic/IP data relies on App Engine request headers (`x-appengine-*`); works seamlessly on Firebase Hosting.

3. **Parameter Forwarding**: Loop through all `req.query` entries and exclude only the `d` parameter. This handles unknown UTM params gracefully.

4. **Redirect Status Code**: Always use 302 (temporary redirect) to preserve original request method intent.

## Common Tasks

- **Add new parameter tracking**: Add field to Firestore click document in [functions/index.js](functions/index.js#L29)
- **Change redirect logic**: Modify URL building and redirect in the try block
- **Debug analytics**: Query Firestore console or use `firebase functions:log`
- **Update Node version**: Modify `engines.node` in [functions/package.json](functions/package.json) and `runtime` in [firebase.json](firebase.json)
