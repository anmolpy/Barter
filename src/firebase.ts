import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const getEnv = (key: string, fallbackKey?: string): string => {
  const fromImportMeta = (import.meta.env as Record<string, string | undefined>)[`VITE_${key}`];
  const fromProcess = (process.env as Record<string, string | undefined>)[key];
  const fromFallback = fallbackKey ? (process.env as Record<string, string | undefined>)[fallbackKey] : undefined;

  return fromImportMeta ?? fromProcess ?? fromFallback ?? '';
};

const firebaseConfig = {
  projectId: getEnv('PROJECT_ID'),
  appId: getEnv('APP_ID'),
  apiKey: getEnv('API_KEY'),
  authDomain: getEnv('AUTH_DOMAIN'),
  firestoreDatabaseId: getEnv('FIRESTORE_DATABASE_ID', 'FIRE_STORE_DATABASE_ID'),
  storageBucket: getEnv('STORAGE_BUCKET'),
  messagingSenderId: getEnv('MESSAGING_SENDER_ID'),
  measurementId: getEnv('MEASUREMENT_ID'),
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
