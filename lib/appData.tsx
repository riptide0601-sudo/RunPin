import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { mockCourses, mockProfile, mockRunLogs } from '@/data/mock';
import { findMatchingCourse } from '@/lib/matching';
import type { Course, RunLog } from '@/types';

// "함께 뛰자고 제안" 액션에만 적용되는 무료 한도. 러닝 제안 수락/코스 추천/코스
// 업로드 등 다른 기능에는 영향을 주지 않는다.
export const FREE_PROPOSAL_LIMIT = 5;

interface AppDataContextValue {
  courses: Course[];
  runLogs: RunLog[];
  addCourse: (course: Course) => void;
  addRunLog: (log: RunLog) => void;
  uploadRunLog: (logId: string, courseName: string) => void;
  proposalCount: number;
  isSubscribed: boolean;
  remainingProposals: number;
  canPropose: boolean;
  recordProposal: () => void;
  subscribe: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [runLogs, setRunLogs] = useState<RunLog[]>(mockRunLogs);
  const [proposalCount, setProposalCount] = useState(mockProfile.proposalCount);
  const [isSubscribed, setIsSubscribed] = useState(mockProfile.isSubscribed);

  const value = useMemo<AppDataContextValue>(
    () => ({
      courses,
      runLogs,
      addCourse: (course) => setCourses((prev) => [course, ...prev]),
      addRunLog: (log) => setRunLogs((prev) => [log, ...prev]),
      proposalCount,
      isSubscribed,
      remainingProposals: isSubscribed ? Infinity : Math.max(0, FREE_PROPOSAL_LIMIT - proposalCount),
      canPropose: isSubscribed || proposalCount < FREE_PROPOSAL_LIMIT,
      recordProposal: () => {
        if (!isSubscribed) setProposalCount((prev) => prev + 1);
      },
      subscribe: () => setIsSubscribed(true),
      uploadRunLog: (logId, courseName) => {
        const log = runLogs.find((entry) => entry.id === logId);
        if (!log || log.isUploaded) return;

        if (!findMatchingCourse(log.trajectory, courses)) {
          const newCourse: Course = {
            id: `course-${Date.now()}`,
            name: courseName,
            coordinates: log.trajectory,
            category: '골목길',
            difficulty: log.difficulty,
            distanceKm: log.distanceKm,
            uploaderName: mockProfile.name,
            createdAt: Date.now(),
          };
          setCourses((prev) => [newCourse, ...prev]);
        }

        setRunLogs((prev) =>
          prev.map((entry) => (entry.id === logId ? { ...entry, courseName, isUploaded: true } : entry)),
        );
      },
    }),
    [courses, runLogs, proposalCount, isSubscribed],
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
