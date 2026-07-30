import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, type Auth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { initializeFirestore, getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Fast Refresh re-runs this module without recreating the Firebase app instance,
  // and initializeAuth throws if an Auth instance already exists for that app.
  // getAuth just returns the existing (already-persistent) instance in that case.
  authInstance = getAuth(app);
}
export const auth = authInstance;

export const database = getDatabase(app);

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    // RN 환경에서 Firestore 기본 gRPC 스트리밍 연결이 일부 네트워크/에뮬레이터에서
    // 끊기는 문제가 알려져 있어 안정적인 long-polling으로 강제한다.
    experimentalForceLongPolling: true,
  });
} catch {
  // Fast Refresh 재실행 시 이미 초기화된 인스턴스가 있으면 initializeFirestore가 던진다.
  firestoreInstance = getFirestore(app);
}
export const db = firestoreInstance;

export const storage = getStorage(app);
