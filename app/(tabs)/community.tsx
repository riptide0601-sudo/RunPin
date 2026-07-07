import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityMap } from '@/components/community/CommunityMap';
import { MatchProposalCard } from '@/components/community/MatchProposalCard';
import { RunningStatusBar } from '@/components/community/RunningStatusBar';
import { colors } from '@/constants/colors';
import { mockRunnerDots } from '@/data/mock';

type ProposalStatus = 'pending' | 'accepted' | 'declined';

const SELECTED_COURSE_NAME = '경의선숲길 3K';

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus>('pending');
  const [isRunning, setIsRunning] = useState(false);

  const handleAccept = () => {
    setProposalStatus('accepted');
    Alert.alert('매칭이 수락되었습니다', '러닝 시작 버튼을 눌러 러닝을 시작하세요');
  };

  const handleDecline = () => {
    setProposalStatus('declined');
  };

  const handleEndRun = () => {
    setIsRunning(false);
    setProposalStatus('pending');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>{SELECTED_COURSE_NAME}</Text>
        {isRunning ? (
          <View style={styles.runningBadge}>
            <View style={styles.runningDot} />
            <Text style={styles.runningBadgeText}>러닝 중</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.mapWrapper}>
        <CommunityMap runners={mockRunnerDots} isRunning={isRunning} />

        {isRunning ? (
          <View style={styles.topOverlay} pointerEvents="box-none">
            <RunningStatusBar onEndRun={handleEndRun} />
          </View>
        ) : (
          <Pressable style={styles.testStartButton} onPress={() => setIsRunning(true)}>
            <Text style={styles.testStartButtonText}>러닝 시작</Text>
          </Pressable>
        )}

        <View style={styles.bottomOverlay} pointerEvents="box-none">
          {isRunning ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>러닝 중에는 제안을 주고받을 수 없어요</Text>
            </View>
          ) : proposalStatus === 'pending' ? (
            <MatchProposalCard onAccept={handleAccept} onDecline={handleDecline} />
          ) : proposalStatus === 'accepted' ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>매칭 완료! 러닝 시작 버튼을 눌러 러닝을 시작하세요</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  runningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  runningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentMe,
  },
  runningBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentMe,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  topOverlay: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  testStartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  testStartButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
  },
  noticeText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
