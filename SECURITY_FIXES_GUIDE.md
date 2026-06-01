# SECURITY FIXES GUIDE
## Smart Teaching Manager - Production Readiness

**Date:** June 1, 2026  
**Status:** Critical security fixes in progress

---

## ✅ COMPLETED FIXES

### 1. Security Headers Added
**File:** `firebase.json`  
**Status:** ✅ DONE

Added comprehensive security headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: geolocation=(), microphone=(), camera=()
- Content-Security-Policy (CSP)
- Strict-Transport-Security (HSTS)

### 2. Console.log Cleanup
**Status:** ✅ DONE

- Removed sensitive console.log statements (user IDs, API responses)
- Guarded debug logs with `if (import.meta.env.DEV)`
- Preserved console.error and console.warn for production debugging

**Files Modified:**
- src/components/ScheduleInputMasterData.tsx
- src/pages/PortfolioPage.tsx

### 3. HTML Injection Sanitization
**Status:** ✅ DONE

Installed DOMPurify and sanitized all innerHTML/dangerouslySetInnerHTML usage.

**Files Modified:**
- src/pages/LessonPlanPage.tsx
- src/pages/HandoutGeneratorPage.tsx
- src/pages/LkpdGeneratorPage.tsx

### 4. Firestore Rules Fixed
**Status:** ✅ DONE

Added missing collection rules:
- scheduleTemplates
- semesterPortfolios

### 5. Missing State Fixed
**Status:** ✅ DONE

Fixed `setPekanEfektifData is not defined` error in JurnalPage.tsx

---

## 🔴 CRITICAL - MUST DO BEFORE PRODUCTION

### 1. ROTATE API KEYS IMMEDIATELY

**Current Risk:** API keys are exposed in .env file in repository

**Steps to Fix:**

#### A. Rotate Firebase API Key
1. Go to Firebase Console: https://console.firebase.google.com
2. Select project: e-smartteacher
3. Go to Project Settings > General
4. Under "Your apps" section, find Web App
5. Click "Regenerate" for API key
6. Copy new API key

#### B. Rotate Gemini API Key
1. Go to Google AI Studio: https://aistudio.google.com/app/apikey
2. Delete old API key
3. Create new API key
4. Copy new API key

#### C. Update Environment Variables
1. Update `.env` file with new keys (DO NOT COMMIT)
2. Add to Firebase Hosting environment:
   ```bash
   firebase functions:config:set gemini.api_key="NEW_KEY"
   ```

#### D. Remove .env from Git History
```bash
# Remove .env from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: coordinate with team first)
git push origin --force --all
```

#### E. Verify .gitignore
Ensure `.env` is in `.gitignore`:
```
.env
.env.local
.env.*.local
```

### 2. IMPLEMENT FIREBASE FUNCTIONS PROXY

**Why:** Never expose API keys in client-side code

**Create:** `functions/src/index.ts`

```typescript
import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(functions.config().gemini.api_key);

export const callGemini = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const { prompt, model = 'gemini-pro' } = data;

  try {
    const geminiModel = genAI.getGenerativeModel({ model });
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return { text: response.text() };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'AI request failed');
  }
});
```

**Update Client Code:**
Replace direct Gemini API calls with Firebase Functions:

```typescript
// OLD (INSECURE):
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
const result = await model.generateContent(prompt);

// NEW (SECURE):
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const callGemini = httpsCallable(functions, 'callGemini');
const result = await callGemini({ prompt, model: 'gemini-pro' });
const text = result.data.text;
```

### 3. SETUP FIREBASE APP CHECK

**Why:** Prevent API abuse and unauthorized access

**Steps:**

1. Enable App Check in Firebase Console
2. Register reCAPTCHA v3 site key
3. Add to `src/firebase.ts`:

```typescript
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
  isTokenAutoRefreshEnabled: true
});
```

4. Enforce App Check in Firestore rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null && request.app != null;
    }
  }
}
```

---

## 🟠 HIGH PRIORITY - SHOULD DO

### 1. Remove localStorage API Key Storage

**Files to Update:**
- src/components/ProfileEditor.tsx
- src/utils/cryptoUtils.ts

**Action:** Remove all API key storage from localStorage. Use Firebase Functions instead.

### 2. Add Input Validation

Install Zod:
```bash
npm install zod
```

Create validation schemas for forms:
```typescript
import { z } from 'zod';

const gradeSchema = z.object({
  score: z.number().min(0).max(100),
  studentId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

### 3. Setup Error Tracking

Install Sentry:
```bash
npm install @sentry/react
```

Configure in `src/main.tsx`:
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
});
```

---

## 📋 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] API keys rotated
- [ ] .env removed from git history
- [ ] Firebase Functions proxy deployed
- [ ] App Check enabled
- [ ] Security headers deployed
- [ ] Build passes: `npm run build`
- [ ] Firebase rules deployed: `firebase deploy --only firestore:rules`
- [ ] Test authentication flow
- [ ] Test critical user paths
- [ ] Monitor error logs for 24 hours

---

## 🚀 DEPLOYMENT COMMANDS

```bash
# Build production bundle
npm run build

# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only functions
```

---

## 📞 EMERGENCY CONTACTS

If API keys are compromised:
1. Immediately rotate keys in Firebase Console
2. Deploy new keys via Firebase Functions config
3. Monitor usage in Firebase Console > Usage and billing
4. Check for unauthorized access in Authentication logs

---

**Next Steps:**
1. Rotate API keys NOW
2. Implement Firebase Functions proxy
3. Deploy security fixes
4. Monitor for 24 hours
5. Complete remaining high-priority fixes

**Estimated Time:** 4-6 hours for critical fixes
