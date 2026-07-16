// Firebase Phone-Auth client. Used ONLY for auth: it sends & confirms the SMS
// OTP and yields a Firebase ID token that our backend verifies. All app data
// stays in our own API/DB.
//
// If the VITE_FIREBASE_* env vars are absent, `isFirebaseConfigured` is false and
// the UI falls back to a demo/mock OTP flow so the feature is still usable.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

/** Lazily initialise Firebase Auth. Returns null when not configured (mock mode). */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (!authInstance) {
    app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    authInstance.useDeviceLanguage();
  }
  return authInstance;
}

/** Normalise a raw phone entry to E.164, defaulting bare 10-digit numbers to +91. */
export function toE164(raw: string): string {
  const trimmed = raw.trim().replace(/[\s-]/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return '+91' + digits;
  return '+' + digits;
}
