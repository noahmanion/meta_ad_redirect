# {{PROJECT_NAME}}

A Firebase-based URL redirect service with click tracking for {{AD_PLATFORM}} ads. Captures click analytics (UTM parameters, click IDs, geolocation, user agent) and redirects users to destination URLs while preserving query parameters.

## How It Works

1. User clicks an ad URL: `https://{{YOUR_DOMAIN}}/{{ROUTE_PREFIX}}?d=https://destination.com&utm_source={{AD_PLATFORM_SLUG}}&{{CLICK_ID_PARAM}}=XXX`
2. The function validates the destination URL
3. Click metadata is logged to Firestore (non-blocking)
4. User is 302 redirected to the destination with all query params forwarded

## Tech Stack

- **Firebase Hosting** + **Cloud Functions** (Node.js 20)
- **Firestore** for click analytics storage
- Function region: `{{GCP_REGION}}`

## Setup

### Prerequisites

- [Firebase CLI](https://firebase.google.com/docs/cli) installed
- A Firebase project with Firestore enabled

### Install

```bash
# Authenticate and set your project
firebase login
firebase use {{PROJECT_ID}}

# Install function dependencies
cd functions && npm install
```

### Enable Firestore

If not already enabled:

```bash
gcloud services enable firestore.googleapis.com
```

## Local Development

```bash
# Start the emulator
firebase emulators:start --only functions

# Test the redirect
curl "http://localhost:5001/{{PROJECT_ID}}/{{GCP_REGION}}/{{FUNCTION_NAME}}?d=https://example.com&utm_source=test"
```

## Deploy

```bash
# Deploy everything (functions + hosting)
firebase deploy

# Deploy only functions
firebase deploy --only functions

# View logs
firebase functions:log
```

## Configuration

Routing is configured in `firebase.json`:
- `/{{ROUTE_PREFIX}}` and `/{{ROUTE_PREFIX}}/**` rewrite to the `{{FUNCTION_NAME}}` Cloud Function

The `d` query parameter specifies the destination URL. All other query params are forwarded to the destination.

## Click Data Schema

Each click is stored as a Firestore document in the `{{FIRESTORE_COLLECTION}}` collection:

| Field | Description |
|---|---|
| `timestamp` | When the click occurred |
| `destination` | Target URL |
| `params` | All forwarded query parameters |
| `{{CLICK_ID_PARAM}}` | Ad platform click ID |
| `utm_source` | UTM source |
| `utm_medium` | UTM medium |
| `utm_campaign` | UTM campaign |
| `utm_content` | UTM content |
| `utm_term` | UTM term |
| `userAgent` | Browser user agent |
| `ip` | Client IP address |

## Project Structure

```
├── firebase.json          # Hosting + function config
├── functions/
│   ├── index.js           # Cloud Function entry point
│   └── package.json       # Function dependencies
└── public/                # Static hosting files
```
