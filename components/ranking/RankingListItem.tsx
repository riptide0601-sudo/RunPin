import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import type { RankingEntry } from '@/types';

interface RankingListItemProps {
  entry: RankingEntry;
  swiping?: boolean;
  onPress?: () => void;
}

export function RankingListItem({ entry, swiping, onPress }: RankingListItemProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(entry.likeCount);

  const toggleLike = () => {
    if (__DEV__) {
      console.log(`[RANK-SWIPE ${Date.now()}] RankingListItem: like pressed`, { entryId: entry.id, swiping });
    }
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  const handlePress = () => {
    if (__DEV__) {
      console.log(`[RANK-SWIPE ${Date.now()}] RankingListItem: row pressed`, { entryId: entry.id, swiping });
    }
    onPress?.();
  };

  return (
    <Pressable onPress={handlePress} disabled={swiping} style={({ pressed }) => pressed && styles.pressed}>
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
          disabled={swiping}
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
