import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { colors, gradeColors } from '@/constants/colors';
import { GRADE_THRESHOLDS } from '@/lib/userGrade';
import type { GradeLevel } from '@/types';

export interface GradeBadgeAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GradeInfoPopupProps {
  visible: boolean;
  anchor: GradeBadgeAnchor | null;
  currentLevel: GradeLevel;
  onClose: () => void;
}

const CARD_WIDTH = 252;
const SCREEN_MARGIN = 12;
const TAIL_SIZE = 10;

const gradeRows = [...GRADE_THRESHOLDS]
  .sort((a, b) => a.level - b.level)
  .map((entry, index, all) => {
    const next = all[index + 1];
    const rangeLabel = next ? `${entry.min} ~ ${next.min - 1}점` : `${entry.min}점 이상`;
    return { level: entry.level as GradeLevel, rangeLabel };
  });

export function GradeInfoPopup({ visible, anchor, currentLevel, onClose }: GradeInfoPopupProps) {
  const { width: screenWidth } = useWindowDimensions();

  if (!anchor) return null;

  const idealLeft = anchor.x + anchor.width / 2 - CARD_WIDTH / 2;
  const cardLeft = Math.min(Math.max(idealLeft, SCREEN_MARGIN), screenWidth - CARD_WIDTH - SCREEN_MARGIN);
  const tailLeft = anchor.x + anchor.width / 2 - TAIL_SIZE / 2 - cardLeft;
  const cardTop = anchor.y + anchor.height + TAIL_SIZE;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      <View style={[styles.tail, { left: cardLeft + tailLeft, top: cardTop - TAIL_SIZE / 2 }]} />
      <View style={[styles.card, { left: cardLeft, top: cardTop }]}>
        <Text style={styles.title}>등급 산정 기준</Text>
        <View style={styles.rows}>
          {gradeRows.map((row) => {
            const isCurrent = row.level === currentLevel;
            return (
              <View
                key={row.level}
                style={[styles.row, isCurrent && { backgroundColor: `${gradeColors[row.level]}1F` }]}
              >
                <View style={[styles.dot, { backgroundColor: gradeColors[row.level] }]} />
                <Text style={[styles.rowLabel, isCurrent && styles.rowLabelActive]}>{row.level}단계</Text>
                <Text
                  style={[
                    styles.rowRange,
                    isCurrent && [styles.rowRangeActive, { color: gradeColors[row.level] }],
                  ]}
                >
                  {row.rangeLabel}
                </Text>
                {isCurrent ? <Text style={[styles.currentTag, { color: gradeColors[row.level] }]}>내 등급</Text> : null}
              </View>
            );
          })}
        </View>
        <View style={styles.divider} />
        <Text style={styles.explanation}>
          업로드한 코스 1개당 <Text style={styles.explanationStrong}>10점</Text>
          {'\n'}+ 인기도 보너스 (아래 중 하나만 적용){'\n'}
          · 좋아요 500개 이상: +80점{'\n'}
          · 전체기간 랭킹 TOP10: +50점{'\n'}
          · 좋아요 100개 이상: +30점
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tail: {
    position: 'absolute',
    width: TAIL_SIZE,
    height: TAIL_SIZE,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 4,
  },
  rows: {
    gap: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    width: 38,
  },
  rowLabelActive: {
    fontWeight: '800',
  },
  rowRange: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  rowRangeActive: {
    fontWeight: '700',
  },
  currentTag: {
    fontSize: 10,
    fontWeight: '800',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  explanation: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textMuted,
    paddingHorizontal: 4,
  },
  explanationStrong: {
    fontWeight: '800',
    color: colors.text,
  },
});
