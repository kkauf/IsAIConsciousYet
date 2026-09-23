import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app: App | undefined;

// Prevent initialization errors during build time if env vars are missing
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
    console.warn('⚠️ Firebase Admin SDK not initialized. Missing environment variables.');
} else {
    try {
        if (getApps().length === 0) {
            app = initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
            });
        } else {
            app = getApps()[0];
        }
    } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
    }
}

// Export services (may be undefined if init failed)
const adminDb = app ? getFirestore(app) : null;
const adminAuth = app ? getAuth(app) : null;

export { adminDb, adminAuth };
