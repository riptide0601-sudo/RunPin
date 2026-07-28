import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CourseGroupCarousel } from '@/components/home/CourseGroupCarousel';
import { CourseListItem } from '@/components/home/CourseListItem';
import { colors } from '@/constants/colors';
import type { Course } from '@/types';

interface RecommendedCourseListProps {
  courses: Course[];
  selectedCourseId?: string;
  onSelectCourse?: (courseId: string) => void;
  groupMembersByRepId?: Map<string, Course[]>;
}

export function RecommendedCourseList({
  courses,
  selectedCourseId,
  onSelectCourse,
  groupMembersByRepId,
}: RecommendedCourseListProps) {
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  // Tracks whether a carousel member (not just the representative course) has
  // been picked since the currently-expanded group was opened. Re-tapping the
  // representative course closes the carousel only when this is false —
  // otherwise it first just re-selects the representative and resets this flag.
  const [pickedMemberInExpandedGroup, setPickedMemberInExpandedGroup] = useState(false);

  // CourseGroupCarousel은 React.memo로 감싸여 있으므로, 여기서 매 렌더마다 새 함수를
  // 만들어 내려주면 props 참조가 달라져서 memo가 무의미해지고 화면에 떠 있는 모든
  // 캐러셀(펼쳐지지 않은 것 포함)이 다시 렌더링된다. useCallback으로 참조를 고정한다.
  const handleSelectMember = useCallback(
    (memberId: string) => {
      setPickedMemberInExpandedGroup(true);
      onSelectCourse?.(memberId);
    },
    [onSelectCourse],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>추천 코스</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {courses.map((course) => {
          const members = groupMembersByRepId?.get(course.id) ?? [];
          const hasGroup = members.length > 0;
          const isExpanded = expandedCourseId === course.id;

          return (
            <View key={course.id} style={styles.item}>
              <CourseListItem
                course={course}
                isSelected={course.id === selectedCourseId}
                hasGroup={hasGroup}
                isExpanded={isExpanded}
                relatedCount={members.length}
                onPress={() => {
                  if (hasGroup) {
                    if (isExpanded) {
                      if (pickedMemberInExpandedGroup) {
                        setPickedMemberInExpandedGroup(false);
                      } else {
                        setExpandedCourseId(null);
                      }
                    } else {
                      setExpandedCourseId(course.id);
                      setPickedMemberInExpandedGroup(false);
                    }
                  } else {
                    setExpandedCourseId(null);
                  }
                  onSelectCourse?.(course.id);
                }}
              />
              {hasGroup && isExpanded ? <Text style={styles.relatedLabel}>관련코스</Text> : null}
              {hasGroup ? (
                <CourseGroupCarousel
                  expanded={isExpanded}
                  members={members}
                  selectedCourseId={selectedCourseId}
                  onSelectMember={handleSelectMember}
                />
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  item: {
    marginBottom: 12,
  },
  relatedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 10,
    marginBottom: 8,
    marginLeft: 4,
  },
});
