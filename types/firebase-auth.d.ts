// firebase/auth의 exports map은 "types" 조건이 "react-native" 조건보다 먼저 매칭되어,
// tsc가 항상 범용 웹 타입 선언만 본다. 그래서 getReactNativePersistence가 런타임(Metro가
// 실제로 로드하는 RN 빌드)에는 존재하는데 타입에는 빠져 있다. 여기서 타입만 보강한다.
import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

// Top-level import above is what makes TS treat this file as a module augmentation
// (merging into the existing firebase/auth types) instead of a full ambient
// replacement of the module.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
