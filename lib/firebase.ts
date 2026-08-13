import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getApp(): FirebaseApp {
  if (getApps().length === 0) {
    if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
      throw new Error('Missing Firebase environment variables (NEXT_PUBLIC_FIREBASE_*)');
    }
    return initializeApp(firebaseConfig);
  }
  return getApps()[0] as FirebaseApp;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getApp());
}

export function getFirebaseFirestore(): Firestore {
  return getFirestore(getApp());
}
