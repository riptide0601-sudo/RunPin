import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { useCourseLike } from '@/lib/useCourseLike';
import type { Course, RankingEntry } from '@/types';

interface RankingListItemProps {
  entry: RankingEntry;
  course: Course | null;
  onPress?: () => void;
}

export function RankingListItem({ entry, course, onPress }: RankingListItemProps) {
  // 코스 상세 모달(CourseRouteModal)과 완전히 동일한 훅을 써서, 목록과 상세보기가
  // 항상 같은 course.likeCount를 참조하도록 통일한다 — entry.likeCount(기간별 랭킹
  // 표시용 mock 수치)는 좋아요 수 표시에 더 이상 쓰지 않는다.
  const { isLiked: liked, likeCount, toggle: toggleLike } = useCourseLike(course);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.card}>
        <Text style={styles.rank}>{entry.rank}</Text>
        <View style={styles.info}>
          <Text style={styles.name}>{entry.courseName}</Text>
          <Text style={styles.uploader}>업로드: {entry.uploaderName}</Text>
        </View>
        <Pill
          label={String(likeCount)}
          variant="outline"
          icon={<Ionicons name={liked ? 'heart' : 'heart-outline'} size={13} color={liked ? colors.like : colors.text} />}
          onPress={toggleLike}
        />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 14,
  },
  rank: {
    width: 20,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  uploader: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
