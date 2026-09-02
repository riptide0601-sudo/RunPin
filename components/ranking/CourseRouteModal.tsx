import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getRouteCenter } from '@/components/map/getRouteCenter';
import { LeafletMap } from '@/components/map/LeafletMap';
import { CourseMetaRow } from '@/components/ui/CourseMetaRow';
import { SlideUpModal } from '@/components/ui/SlideUpModal';
import { colors } from '@/constants/colors';
import { useAppData, useIsCourseSaved } from '@/lib/appData';
import type { Course } from '@/types';

interface CourseRouteModalProps {
  visible: boolean;
  course: Course | null;
  onClose: () => void;
  showSaveButton?: boolean;
}

export function CourseRouteModal({
  visible,
  course,
  onClose,
  showSaveButton = true,
}: CourseRouteModalProps) {
  const { toggleSaveCourse } = useAppData();
  // 호출부(app/saved-courses/index.tsx 등)는 onClose에서 course를 곧바로 null로
  // 만들면서 visible도 함께 false가 되므로, course를 그대로 렌더 조건에 쓰면
  // SlideUpModal이 닫히는 애니메이션을 시작하기도 전에 이 컴포넌트 자체가
  // 언마운트돼버린다. 닫히는 동안 보여줄 마지막 course를 별도로 들고 있는다.
  const [renderedCourse, setRenderedCourse] = useState(course);
  // renderedCourse가 null인 동안에도 훅 호출 순서를 유지해야 하므로, 아래 early
  // return보다 먼저 호출한다.
  const isSaved = useIsCourseSaved(renderedCourse?.id ?? '');

  useEffect(() => {
    if (course) {
      setRenderedCourse(course);
    }
  }, [course]);

  if (!renderedCourse) {
    return null;
  }

  return (
    <SlideUpModal visible={visible} onRequestClose={onClose}>
      {/* Empty area above the sheet — tapping it closes the modal. The sheet
          itself sits after it so taps inside the sheet never reach this. */}
      <Pressable style={styles.backdropSpacer} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{renderedCourse.name}</Text>
            <CourseMetaRow distanceKm={renderedCourse.distanceKm} difficulty={renderedCourse.difficulty} />
          </View>
          <View style={styles.headerActions}>
            {showSaveButton ? (
              <Pressable
                onPress={() => toggleSaveCourse(renderedCourse.id)}
                hitSlop={12}
                style={({ pressed }) => pressed && styles.closePressed}
              >
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={isSaved ? colors.ink : colors.text}
                />
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => pressed && styles.closePressed}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
        </View>
        <LeafletMap
          height={280}
          style={styles.map}
          center={getRouteCenter(renderedCourse.coordinates)}
          route={renderedCourse.coordinates}
          fitBounds
          dragging={false}
        />
      </View>
    </SlideUpModal>
  );
}

const styles = StyleSheet.create({
  backdropSpacer: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    gap: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  closePressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  map: {
    borderRadius: 20,
  },
});
