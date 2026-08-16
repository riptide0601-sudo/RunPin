import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { useAppData, useIsCourseLiked } from '@/lib/appData';
import { useRequireAuth } from '@/lib/useRequireAuth';
import type { Course, RankingEntry } from '@/types';

interface RankingListItemProps {
  entry: RankingEntry;
  // 실제 Firestore 코스면(uploaderId 있음) 실 좋아요 연동, mock 코스거나 못 찾았으면
  // 기존처럼 이 화면 안에서만 토글되는 로컬 상태를 쓴다.
  course: Course | null;
  onPress?: () => void;
}

export function RankingListItem({ entry, course, onPress }: RankingListItemProps) {
  const { toggleLikeCourse } = useAppData();
  const { requireAuth } = useRequireAuth();
  const isRealCourse = Boolean(course?.uploaderId);

  // 실제 코스는 다른 화면(홈 카드 등)에서 좋아요를 눌러도 이 화면에 그대로 반영되도록
  // 전역 좋아요 상태를 구독한다.
  const isRealLiked = useIsCourseLiked(course?.id ?? '');

  // mock/기간별 코스는 실제 유저별 좋아요 기록이 없다. entry.likeCount는 기간별 랭킹
  // 수치이고 getRankingsForPeriod의 정렬도 이 값을 기준으로 하므로, 화면에 표시되는
  // 숫자도 course.likeCount가 아니라 반드시 entry.likeCount를 기준으로 삼아야
  // 정렬 순서와 표시 숫자가 항상 일치한다.
  const [mockLiked, setMockLiked] = useState(false);
  const [mockLikeCount, setMockLikeCount] = useState(entry.likeCount);

  const liked = isRealCourse ? isRealLiked : mockLiked;
  const likeCount = isRealCourse ? (course!.likeCount ?? 0) : mockLikeCount;

  const toggleLike = () => {
    if (isRealCourse && course) {
      requireAuth(() => toggleLikeCourse(course.id), '좋아요를 누르려면 먼저 로그인해주세요');
      return;
    }
    setMockLiked((prev) => !prev);
    setMockLikeCount((prev) => (mockLiked ? prev - 1 : prev + 1));
  };

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
