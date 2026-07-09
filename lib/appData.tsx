import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { mockCourses, mockRunLogs } from '@/data/mock';
import { findMatchingCourse } from '@/lib/matching';
import type { Course, RunLog } from '@/types';

interface AppDataContextValue {
  courses: Course[];
  runLogs: RunLog[];
  addCourse: (course: Course) => void;
  addRunLog: (log: RunLog) => void;
  uploadRunLog: (logId: string, courseName: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [runLogs, setRunLogs] = useState<RunLog[]>(mockRunLogs);

  const value = useMemo<AppDataContextValue>(
    () => ({
      courses,
      runLogs,
      addCourse: (course) => setCourses((prev) => [course, ...prev]),
      addRunLog: (log) => setRunLogs((prev) => [log, ...prev]),
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
          };
          setCourses((prev) => [newCourse, ...prev]);
        }

        setRunLogs((prev) =>
          prev.map((entry) => (entry.id === logId ? { ...entry, courseName, isUploaded: true } : entry)),
        );
      },
    }),
    [courses, runLogs],
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
