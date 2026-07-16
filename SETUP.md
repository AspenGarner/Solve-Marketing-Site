# Marketing OS v2 — Setup Guide

## What's new in v2
- User profiles (name, job title, email, phone, bio) — saved in browser
- Real-time Firebase chat (messages appear instantly for both users)
- Solve Branding name + brand-ready color system
- Brand color swatches visible on the Profile page

---

## Step 1 — Update brand colors (2 minutes)

Open `index.html` in any text editor and find this block near the top:

```css
<style id="brand-vars">
:root {
  --brand-primary:   #0F1F3D;   /* dark navy  */
  --brand-accent:    #E8472A;   /* bold red-orange */
  --brand-accent2:   #F5A623;   /* warm amber highlight */
  --brand-light:     #F4F2EE;   /* off-white surface */
}
</style>
```

Replace the hex values with your brand colors. Save the file, re-upload to Vercel.
The entire interface updates automatically — every button, sidebar, badge, and highlight.

---

## Step 2 — Set up Firebase real-time chat (10 minutes, free)

### 2a. Create a Firebase project
1. Go to https://console.firebase.google.com
2. Click **"Add project"** → name it `solve-marketing-os` → Continue
3. Disable Google Analytics (not needed) → Create project

### 2b. Create a Realtime Database
1. In the left sidebar → **Build → Realtime Database**
2. Click **"Create Database"**
3. Choose your region (US Central is fine)
4. Start in **Test mode** (you can add security rules later)
5. Click **Enable**

### 2c. Register a web app
1. In Project Overview → click the **`</>`** (web) icon
2. App nickname: `Marketing OS` → Register app
3. Copy the `firebaseConfig` object that appears — it looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "solve-marketing-os.firebaseapp.com",
  databaseURL: "https://solve-marketing-os-default-rtdb.firebaseio.com",
  projectId: "solve-marketing-os",
  storageBucket: "solve-marketing-os.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 2d. Paste into the app
Open `index.html` and find this block:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
  authDomain:        "REPLACE.firebaseapp.com",
  ...
};
```

Replace every `"REPLACE..."` value with your actual Firebase values. Save and re-upload to Vercel.

### 2e. Test it
Open the site in two different browser windows (or you and Sarah open it).
Type a message in one — it appears instantly in the other. Done.

---

## Step 3 — Set up your profile
When you first open the site, a prompt will appear to set up your profile.
Or go to **My profile** in the sidebar → **Edit profile**.

Fill in:
- Full name
- Job title (e.g. Marketing Manager)
- Email
- Phone
- Location
- Short bio

Your name appears in the chat, in submitted content, and in events you create.
Profile info saves in your browser automatically.

For Sarah to have her own profile, she opens the site on her machine and fills in her details.

---

## Redeploy to Vercel

After any changes to `index.html`:
1. Go to https://vercel.com → your project
2. Click **Deployments** → **Redeploy** (uses the latest file)

Or drag the updated folder into Vercel again — it redeploys instantly.

---

## Firebase security (optional, when you're ready)

Right now the database is in Test Mode (anyone with the URL can read/write).
To lock it to just your team, go to Firebase Console → Realtime Database → Rules and paste:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

For proper auth-gated access (login required), let Claude know and we'll add Firebase Authentication.
