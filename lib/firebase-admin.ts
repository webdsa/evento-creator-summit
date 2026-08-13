import * as admin from 'firebase-admin';

function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin env: FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and NEXT_PUBLIC_FIREBASE_PROJECT_ID'
    );
  }
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    ...(storageBucket ? { storageBucket } : {}),
  });
}

export function getAdminFirestore(): admin.firestore.Firestore {
  return admin.firestore(getAdminApp());
}

export function getAdminStorage(): admin.storage.Storage {
  return admin.storage(getAdminApp());
}

export function getAdminAuth(): admin.auth.Auth {
  return admin.auth(getAdminApp());
}
