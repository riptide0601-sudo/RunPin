import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { mockCourses, mockProfile } from '@/data/mock';
import { useAuth } from '@/lib/auth';
import { createCourse, hasUploadedCourse, subscribeToCourses, type NewCourseDraft } from '@/lib/courses';
import { findMatchingCourse } from '@/lib/matching';
import { createRunLog, markRunLogUploaded, subscribeToRunLogs, type NewRunLogDraft } from '@/lib/runLogs';
import { seedParkCloseAccountData } from '@/lib/seedMockAccountData';
import { subscribeToUserPhoto } from '@/lib/userProfile';
import type { Course, RunLog } from '@/types';

// "함께 뛰자고 제안" 액션에만 적용되는 무료 한도. 러닝 제안 수락/코스 추천/코스
// 업로드 등 다른 기능에는 영향을 주지 않는다.
export const FREE_PROPOSAL_LIMIT = 5;

// 저장한 코스 id 집합은 코스를 저장/해제할 때마다 바뀐다. 이걸 courses/runLogs 등과
// 함께 하나의 Context value(useMemo)로 묶어서 내려주면, 저장 여부만 필요한 컴포넌트가
// 그 값이 바뀔 때마다 통째로 리렌더된다. 특히 CourseListItem은 컴포넌트 자신이 직접
// useAppData()를 구독하는데, 홈 화면에 코스 개수만큼(수십~백여 개) 마운트되고, 스택
// 네비게이션 특성상 다른 화면으로 이동해도 배경에 계속 마운트된 채로 남는다. 그 상태에서
// "저장한 코스" 화면처럼 다른 화면에서 아무 코스나 하나 저장/해제하면, 화면에 보이지도
// 않는 홈의 카드 전부가 한꺼번에 리렌더되어 JS 스레드가 그 순간 막히고, 정작 눈에 보이는
// 화면(삭제 애니메이션)의 상태 반영이 그만큼 늦어진다("삭제 버튼을 눌러도 모션이 늦게
// 시작되고, 남은 카드들이 뭉쳐서 빠르게 올라오는" 증상의 원인이었다). 그래서 저장 여부는
// React state가 아니라 코스 id별로 개별 구독 가능한 외부 스토어(useSyncExternalStore)로
// 따로 관리해서, 실제로 저장 상태가 바뀐 그 코스를 구독 중인 컴포넌트만 리렌더되게 한다.
class SavedCourseStore {
  private ids = new Set<string>();
  private idListeners = new Map<string, Set<() => void>>();
  private allListeners = new Set<() => void>();

  isSaved = (courseId: string): boolean => this.ids.has(courseId);

  getSnapshot = (): Set<string> => this.ids;

  subscribeToId = (courseId: string, listener: () => void): (() => void) => {
    let listeners = this.idListeners.get(courseId);
    if (!listeners) {
      listeners = new Set();
      this.idListeners.set(courseId, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners!.delete(listener);
      if (listeners!.size === 0) {
        this.idListeners.delete(courseId);
      }
    };
  };

  subscribeToAll = (listener: () => void): (() => void) => {
    this.allListeners.add(listener);
    return () => this.allListeners.delete(listener);
  };

  toggle = (courseId: string): void => {
    // 구독자에게 통보하기 전에 Set 자체를 새 인스턴스로 교체한다. useSyncExternalStore는
    // getSnapshot 결과를 Object.is로 비교하므로, 기존 Set을 그대로 mutate만 하면
    // subscribeToAll 쪽(저장한 코스 화면 등, 집합 전체가 필요한 구독자)이 "값이
    // 바뀌지 않았다"고 오인해 리렌더를 건너뛸 수 있다.
    const next = new Set(this.ids);
    if (next.has(courseId)) {
      next.delete(courseId);
    } else {
      next.add(courseId);
    }
    this.ids = next;

    this.idListeners.get(courseId)?.forEach((listener) => listener());
    this.allListeners.forEach((listener) => listener());
  };
}

interface AppDataContextValue {
  courses: Course[];
  runLogs: RunLog[];
  profilePhotoBase64: string | null;
  addCourse: (draft: NewCourseDraft) => Promise<void>;
  addRunLog: (draft: NewRunLogDraft) => Promise<void>;
  uploadRunLog: (logId: string, courseName: string) => Promise<void>;
  savedCourseStore: SavedCourseStore;
  toggleSaveCourse: (courseId: string) => void;
  proposalCount: number;
  isSubscribed: boolean;
  remainingProposals: number;
  canPropose: boolean;
  recordProposal: () => void;
  subscribe: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // 코스는 로그인 여부와 무관하게 항상 공개 카탈로그를 구독하고, mock 코스를 그 앞에 이어붙여
  // 보여준다 — Firestore가 비어 있어도 홈 화면이 항상 채워져 보이게 하기 위함 (검증된 mock
  // 도로 좌표 데이터는 건드리지 않는다).
  const [firestoreCourses, setFirestoreCourses] = useState<Course[]>([]);
  const courses = useMemo(() => [...mockCourses, ...firestoreCourses], [firestoreCourses]);

  useEffect(() => {
    return subscribeToCourses(setFirestoreCourses);
  }, []);

  // 러닝 기록은 "내 것"만 의미가 있어서 mock과 합치지 않는다. 로그인 상태가 아니면 구독하지
  // 않고 빈 배열을 보여준다 — 로그인/로그아웃 시(uid 변경) 새 uid로 다시 구독한다.
  const [runLogs, setRunLogs] = useState<RunLog[]>([]);
  useEffect(() => {
    if (!user?.uid) {
      setRunLogs([]);
      return;
    }
    return subscribeToRunLogs(user.uid, setRunLogs);
  }, [user?.uid]);

  // 파클로즈 계정은 등급/통계를 다른 계정과 동일하게 100% 실데이터로 계산한다 —
  // 그래서 시연용 데이터가 필요한데, 화면에 "샘플 데이터 채우기" 버튼을 노출하는 대신
  // 이 계정으로 처음 로그인했을 때(=아직 올린 코스가 하나도 없을 때) 자동으로 한 번만
  // 심는다. getDocs로 1회성 확인(hasUploadedCourse) 후 없을 때만 심어서, 이미 심어진
  // 뒤에는 재로그인해도 다시 실행되지 않는다.
  useEffect(() => {
    if (!user || user.displayName !== mockProfile.name) return;
    let cancelled = false;
    (async () => {
      const alreadySeeded = await hasUploadedCourse(user.uid);
      if (!cancelled && !alreadySeeded) {
        await seedParkCloseAccountData(user.uid);
      }
    })().catch((error) => {
      console.error('[appData] 파클로즈 샘플 데이터 자동 시드 실패', error);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // 프로필 사진(base64)도 러닝 기록과 같은 이유로 로그인 상태일 때만 본인 것을 구독한다.
  const [profilePhotoBase64, setProfilePhotoBase64] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.uid) {
      setProfilePhotoBase64(null);
      return;
    }
    return subscribeToUserPhoto(user.uid, setProfilePhotoBase64);
  }, [user?.uid]);

  const [proposalCount, setProposalCount] = useState(mockProfile.proposalCount);
  const [isSubscribed, setIsSubscribed] = useState(mockProfile.isSubscribed);
  const savedCourseStoreRef = useRef<SavedCourseStore | null>(null);
  if (!savedCourseStoreRef.current) {
    savedCourseStoreRef.current = new SavedCourseStore();
  }
  const savedCourseStore = savedCourseStoreRef.current;

  const value = useMemo<AppDataContextValue>(
    () => ({
      courses,
      runLogs,
      profilePhotoBase64,
      addCourse: async (draft) => {
        if (!user) return;
        await createCourse(user.uid, user.displayName ?? '러너', draft);
      },
      addRunLog: async (draft) => {
        if (!user) return;
        await createRunLog(user.uid, draft);
      },
      savedCourseStore,
      toggleSaveCourse: savedCourseStore.toggle,
      proposalCount,
      isSubscribed,
      remainingProposals: isSubscribed ? Infinity : Math.max(0, FREE_PROPOSAL_LIMIT - proposalCount),
      canPropose: isSubscribed || proposalCount < FREE_PROPOSAL_LIMIT,
      recordProposal: () => {
        if (!isSubscribed) setProposalCount((prev) => prev + 1);
      },
      subscribe: () => setIsSubscribed(true),
      uploadRunLog: async (logId, courseName) => {
        if (!user) return;
        const log = runLogs.find((entry) => entry.id === logId);
        if (!log || log.isUploaded) return;

        if (!findMatchingCourse(log.trajectory, courses)) {
          await createCourse(user.uid, user.displayName ?? '러너', {
            name: courseName,
            coordinates: log.trajectory,
            category: '골목길',
            difficulty: log.difficulty,
            distanceKm: log.distanceKm,
          });
        }

        await markRunLogUploaded(logId, courseName);
      },
    }),
    [courses, runLogs, profilePhotoBase64, savedCourseStore, proposalCount, isSubscribed, user],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}

// 코스 하나의 저장 여부만 필요한 컴포넌트(카드의 북마크 아이콘 등)는 이 훅을 쓴다.
// 다른 코스의 저장 상태가 바뀌어도 리렌더되지 않는다 — useAppData()의 savedCourseIds를
// 직접 구독하면 그 화면에 떠 있는 카드 전부가 리렌더되는 문제를 피하기 위함이다.
export function useIsCourseSaved(courseId: string): boolean {
  const { savedCourseStore } = useAppData();
  return useSyncExternalStore(
    (listener) => savedCourseStore.subscribeToId(courseId, listener),
    () => savedCourseStore.isSaved(courseId),
  );
}

// 저장한 코스 목록 화면처럼 저장된 id 전체 집합이 필요한 경우에만 이 훅을 쓴다.
// 어떤 코스든 저장/해제될 때마다 리렌더되므로, 개별 카드 컴포넌트에는 쓰지 않는다.
export function useSavedCourseIds(): Set<string> {
  const { savedCourseStore } = useAppData();
  return useSyncExternalStore(savedCourseStore.subscribeToAll, savedCourseStore.getSnapshot);
}
