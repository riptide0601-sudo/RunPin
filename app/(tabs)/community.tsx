import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityMap } from '@/components/community/CommunityMap';
import { MatchProposalCard } from '@/components/community/MatchProposalCard';
import { RunFinishModal, type SaveCourseResult } from '@/components/community/RunFinishModal';
import { RunningStatusBar } from '@/components/community/RunningStatusBar';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { mockMyRunningRoute, mockRunnerDots } from '@/data/mock';
import { useAppData } from '@/lib/appData';
import { buildFinishedRunLog } from '@/lib/runSummary';

type ProposalStatus = 'pending' | 'accepted' | 'declined';

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { courses, addCourse, addRunLog, canPropose, recordProposal } = useAppData();
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus>('pending');
  const [isRunning, setIsRunning] = useState(false);
  const [finishVisible, setFinishVisible] = useState(false);

  const handleAccept = () => {
    setProposalStatus('accepted');
    Alert.alert('매칭이 수락되었습니다', '러닝 시작 버튼을 눌러 러닝을 시작하세요');
  };

  const handlePropose = () => {
    if (canPropose) {
      recordProposal();
      Alert.alert('제안을 보냈어요', '상대방이 수락하면 매칭이 완료돼요');
      return;
    }

    Alert.alert('무료 제안 횟수를 모두 사용했어요', '구독하고 무제한으로 이용해보세요', [
      { text: '취소', style: 'cancel' },
      { text: '구독하기', onPress: () => router.push('/subscription') },
    ]);
  };

  const handleDecline = () => {
    setProposalStatus('declined');
  };

  const handleEndRun = () => {
    setIsRunning(false);
    setProposalStatus('pending');
    setFinishVisible(true);
  };

  const handleSaveCourse = (result: SaveCourseResult) => {
    if (result.newCourse) {
      addCourse(result.newCourse);
    }
    addRunLog(buildFinishedRunLog(result.courseName, mockMyRunningRoute, result.difficulty, true));
    setFinishVisible(false);
  };

  const handleSkipSaveCourse = (difficulty: 1 | 2 | 3 | 4 | 5) => {
    addRunLog(buildFinishedRunLog('이름 없는 러닝', mockMyRunningRoute, difficulty, false));
    setFinishVisible(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.mapWrapper}>
        <CommunityMap runners={mockRunnerDots} isRunning={isRunning} onPropose={handlePropose} />

        {isRunning ? (
          <View style={styles.topOverlay} pointerEvents="box-none">
            <RunningStatusBar onEndRun={handleEndRun} />
          </View>
        ) : (
          <View style={styles.startButtonWrapper}>
            <Pill label="러닝 시작" variant="graySolid" size="lg" onPress={() => setIsRunning(true)} />
          </View>
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

      <RunFinishModal
        visible={finishVisible}
        myRoute={mockMyRunningRoute}
        courses={courses}
        onSave={handleSaveCourse}
        onSkip={handleSkipSaveCourse}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  startButtonWrapper: {
    position: 'absolute',
    top: 12,
    right: 12,
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
