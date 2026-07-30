import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityMap } from '@/components/community/CommunityMap';
import { MatchProposalCard } from '@/components/community/MatchProposalCard';
import { RunFinishModal, type SaveCourseResult } from '@/components/community/RunFinishModal';
import { RunningStatusBar } from '@/components/community/RunningStatusBar';
import { AlertModal } from '@/components/ui/AlertModal';
import { Pill } from '@/components/ui/Pill';
import { SubscribeModal } from '@/components/ui/SubscribeModal';
import { colors } from '@/constants/colors';
import { mockMyRunningRoute, mockRunnerDots } from '@/data/mock';
import { FREE_PROPOSAL_LIMIT, useAppData } from '@/lib/appData';
import { useAuth } from '@/lib/auth';
import { buildFinishedRunLog } from '@/lib/runSummary';

type ProposalStatus = 'pending' | 'accepted' | 'declined';
type InfoModal = 'none' | 'proposed' | 'accepted';

interface InfoModalContent {
  title: string;
  message: string;
}

const INFO_MODAL_CONTENT: Record<Exclude<InfoModal, 'none'>, InfoModalContent> = {
  proposed: {
    title: '제안을 보냈어요',
    message: '상대방이 수락하면 매칭이 완료돼요',
  },
  accepted: {
    title: '매칭이 수락되었습니다',
    message: '러닝 시작 버튼을 눌러 러닝을 시작하세요',
  },
};

const LIMIT_MODAL_CONTENT = {
  title: '무료 제안 횟수를 모두 사용했어요',
};

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { courses, addCourse, addRunLog, canPropose, recordProposal, proposalCount, isSubscribed } = useAppData();
  const { user } = useAuth();
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus>('pending');
  // 매칭 시뮬레이션이 특정 러너 한 명(mockRunnerDots[0])의 제안이 항상 대기 중이라고 가정한다 —
  // 실제 매칭 백엔드가 없어(CLAUDE.md 참고) 상대를 무작위로 고를 방법이 없다. 수락한 제안의
  // 이름만 러닝 종료까지 들고 있다가 RunLog에 같이 저장한다.
  const incomingProposalRunner = mockRunnerDots[0];
  const [runMateName, setRunMateName] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [finishVisible, setFinishVisible] = useState(false);
  const [infoModal, setInfoModal] = useState<InfoModal>('none');
  const [limitVisible, setLimitVisible] = useState(false);
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);
  const lastInfoModalContentRef = useRef<InfoModalContent>(INFO_MODAL_CONTENT.proposed);

  const closeInfoModal = () => setInfoModal('none');
  const closeLimitModal = () => setLimitVisible(false);

  // Modal은 visible=false가 되어도 fade-out 애니메이션 동안 계속 리렌더되므로,
  // infoModal이 'none'으로 바뀐 뒤에도 닫히는 애니메이션 중에는 마지막으로 보여준
  // 내용을 유지해야 다른 문구로 잘못 바뀌어 보이지 않는다.
  if (infoModal !== 'none') {
    lastInfoModalContentRef.current = INFO_MODAL_CONTENT[infoModal];
  }
  const infoModalContent = lastInfoModalContentRef.current;

  const handleAccept = () => {
    setProposalStatus('accepted');
    setRunMateName(incomingProposalRunner.nickname);
    setInfoModal('accepted');
  };

  const handlePropose = () => {
    if (!canPropose) {
      setLimitVisible(true);
      return;
    }

    recordProposal();
    // 이번 제안으로 무료 횟수를 전부 소진했다면(예: 5회째) 다음 시도(6회째)를 기다리지
    // 않고 바로 구독 안내를 보여준다.
    const justExhausted = !isSubscribed && proposalCount + 1 >= FREE_PROPOSAL_LIMIT;
    if (justExhausted) {
      setLimitVisible(true);
    } else {
      setInfoModal('proposed');
    }
  };

  const handleDecline = () => {
    setProposalStatus('declined');
  };

  const handleStartRun = () => {
    if (!user) {
      setLoginPromptVisible(true);
      return;
    }
    setIsRunning(true);
  };

  const handleEndRun = () => {
    setIsRunning(false);
    setProposalStatus('pending');
    setFinishVisible(true);
  };

  const handleSaveCourse = async (result: SaveCourseResult) => {
    setFinishVisible(false);
    const mateName = runMateName;
    setRunMateName(null);
    try {
      if (result.newCourse) {
        await addCourse(result.newCourse);
      }
      await addRunLog(
        buildFinishedRunLog(result.courseName, mockMyRunningRoute, result.difficulty, true, mateName ?? undefined),
      );
    } catch {
      Alert.alert('저장하지 못했어요', '잠시 후 다시 시도해주세요');
    }
  };

  const handleSkipSaveCourse = async (difficulty: 1 | 2 | 3 | 4 | 5) => {
    setFinishVisible(false);
    const mateName = runMateName;
    setRunMateName(null);
    try {
      await addRunLog(buildFinishedRunLog('이름 없는 러닝', mockMyRunningRoute, difficulty, false, mateName ?? undefined));
    } catch {
      Alert.alert('저장하지 못했어요', '잠시 후 다시 시도해주세요');
    }
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
            <Pill label="러닝 시작" variant="graySolid" size="lg" onPress={handleStartRun} />
          </View>
        )}

        <View style={styles.bottomOverlay} pointerEvents="box-none">
          {isRunning ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>러닝 중에는 제안을 주고받을 수 없어요</Text>
            </View>
          ) : proposalStatus === 'pending' ? (
            <MatchProposalCard
              runnerName={incomingProposalRunner.nickname}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
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

      <AlertModal
        visible={infoModal !== 'none'}
        icon="checkmark-circle"
        title={infoModalContent.title}
        message={infoModalContent.message}
        primaryAction={{ label: '확인', onPress: closeInfoModal }}
        onRequestClose={closeInfoModal}
      />

      <SubscribeModal
        visible={limitVisible}
        title={LIMIT_MODAL_CONTENT.title}
        onClose={closeLimitModal}
        onSubscribe={() => {
          closeLimitModal();
          router.push('/subscription');
        }}
      />

      <AlertModal
        visible={loginPromptVisible}
        icon="log-in-outline"
        title="로그인이 필요해요"
        message="러닝 기록을 저장하려면 먼저 로그인해주세요"
        primaryAction={{
          label: '로그인하기',
          onPress: () => {
            setLoginPromptVisible(false);
            router.push('/auth');
          },
        }}
        secondaryAction={{ label: '취소', onPress: () => setLoginPromptVisible(false) }}
        onRequestClose={() => setLoginPromptVisible(false)}
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
