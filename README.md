# Meta Ad Redirect

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

## Connecting a Custom Domain

By default, Firebase Hosting gives you a `{{PROJECT_ID}}.web.app` URL. To use a custom redirect domain:

1. **Add the domain in Firebase Console**
   - Go to **Hosting** > **Add custom domain**
   - Enter your domain (e.g., `{{YOUR_DOMAIN}}`)

2. **Update DNS records**
   - Firebase will provide DNS records (typically A records) to add at your domain registrar
   - If using a subdomain, add the CNAME record Firebase provides

3. **Wait for SSL provisioning**
   - Firebase automatically provisions an SSL certificate
   - This can take a few minutes to a few hours

4. **Verify the redirect works**
   ```
   https://{{YOUR_DOMAIN}}/{{ROUTE_PREFIX}}?d=https://example.com&utm_source=test
   ```

### How the Pieces Connect

```
Ad Platform                  Firebase Hosting              Cloud Function
┌──────────┐    click     ┌─────────────────┐  rewrite  ┌──────────────┐
│  Ad with  │ ──────────> │ {{YOUR_DOMAIN}} │ ───────>  │ {{FUNCTION_  │
│  link to  │             │ /{{ROUTE_PREFIX}}│           │ NAME}}       │
│  /{{ROUTE │             │                 │           │              │
│  _PREFIX}}│             └─────────────────┘           │ 1. Log click │
└──────────┘                                            │    to Firestore
                                                        │ 2. 302 redirect
                          ┌─────────────────┐           │    to ?d= URL│
                          │   Destination   │ <──────── │              │
                          │   Website       │  redirect └──────────────┘
                          └─────────────────┘
```

- **`firebase.json`** defines the rewrite rule: requests to `/{{ROUTE_PREFIX}}` are routed to the `{{FUNCTION_NAME}}` Cloud Function
- **The Cloud Function** (`functions/index.js`) reads the `d` query param as the destination, logs analytics to Firestore, and performs the 302 redirect
- **Firestore** stores each click as a document in the `{{FIRESTORE_COLLECTION}}` collection
- **The ad platform** just needs the full URL as the click-through link: `https://{{YOUR_DOMAIN}}/{{ROUTE_PREFIX}}?d=<encoded_destination>&{{CLICK_ID_PARAM}}=...`

### Building Ad URLs

Your ad click-through URL should follow this format:

```
https://{{YOUR_DOMAIN}}/{{ROUTE_PREFIX}}?d=<DESTINATION_URL>&utm_source={{AD_PLATFORM_SLUG}}&utm_medium=paid&utm_campaign=<CAMPAIGN_NAME>
```

The ad platform will automatically append its click ID parameter (e.g., `{{CLICK_ID_PARAM}}`), which gets captured in analytics and forwarded to the destination.

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
