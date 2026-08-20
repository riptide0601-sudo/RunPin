import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { useCourseLike } from '@/lib/useCourseLike';
import type { Course } from '@/types';

interface RankingListItemProps {
  rank: number;
  course: Course;
  onPress?: () => void;
}

export function RankingListItem({ rank, course, onPress }: RankingListItemProps) {
  // course.likeCount가 랭킹 정렬/표시의 유일한 기준이다 — 코스 상세 모달과 완전히
  // 동일한 훅을 써서 목록과 상세보기가 항상 같은 숫자를 보여준다.
  const { isLiked: liked, likeCount, toggle: toggleLike } = useCourseLike(course);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.card}>
        <Text style={styles.rank}>{rank}</Text>
        <View style={styles.info}>
          <Text style={styles.name}>{course.name}</Text>
          <Text style={styles.uploader}>업로드: {course.uploaderName}</Text>
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
