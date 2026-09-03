import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityMap } from '@/components/community/CommunityMap';
import { MatchProposalCard } from '@/components/community/MatchProposalCard';
import { ProposalPopupStack, type ProposalPopup } from '@/components/community/ProposalPopupStack';
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
import type { RunnerMapDot } from '@/types';

type ProposalStatus = 'pending' | 'accepted' | 'declined';

// 제안 응답(수락/거절) 결과가 실제로는 상대 없이 클라이언트에서 시뮬레이션되므로
// (CLAUDE.md 11번, 실제 매칭 백엔드 없음), 몇 초 뒤 랜덤으로 판정한다.
const PROPOSAL_RESPONSE_DELAY_MS = 2000;

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
  const [popups, setPopups] = useState<ProposalPopup[]>([]);
  const [limitVisible, setLimitVisible] = useState(false);
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);
  // 화면을 벗어나도(탭 이동 등) 대기 중인 응답 타이머가 언마운트된 컴포넌트에 setState하지
  // 않도록 전부 모아뒀다가 정리한다.
  const pendingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // .current를 언마운트 시점(cleanup 실행 시점)에 그대로 읽어야 그동안 쌓인 타이머를
    // 전부 정리할 수 있다 — effect 시작 시점에 변수로 복사해두면 그때는 아직 아무 타이머도
    // 없어 빈 배열을 정리하는 꼴이 된다. 그래서 lint의 exhaustive-deps 제안을 따르지 않는다.
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      pendingTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const closeLimitModal = () => setLimitVisible(false);

  const pushPopup = (kind: ProposalPopup['kind'], runnerNickname: string) => {
    setPopups((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, kind, runnerNickname }]);
  };

  const dismissPopup = (id: string) => {
    setPopups((prev) => prev.filter((popup) => popup.id !== id));
  };

  const handleAccept = () => {
    setProposalStatus('accepted');
    setRunMateName(incomingProposalRunner.nickname);
    pushPopup('accepted', incomingProposalRunner.nickname);
  };

  const handlePropose = (runner: RunnerMapDot) => {
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
      return;
    }

    pushPopup('sent', runner.nickname);
    // 실제 매칭 백엔드가 없어 상대 응답을 시뮬레이션한다 — 알림용일 뿐, proposalStatus나
    // runMateName(러닝 시작 버튼/러닝 기록)에는 연결하지 않는다(기존 inbound 매칭 흐름과
    // 별개로 둔다는 결정에 따름).
    const timeoutId = setTimeout(() => {
      pushPopup(Math.random() < 0.5 ? 'accepted' : 'declined', runner.nickname);
    }, PROPOSAL_RESPONSE_DELAY_MS);
    pendingTimeoutsRef.current.push(timeoutId);
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
    } catch (error) {
      if (__DEV__) {
        console.error('[community] 러닝 기록 저장 실패', error);
      }
      Alert.alert('저장하지 못했어요', '잠시 후 다시 시도해주세요');
    }
  };

  const handleSkipSaveCourse = async (difficulty: 1 | 2 | 3 | 4 | 5) => {
    setFinishVisible(false);
    const mateName = runMateName;
    setRunMateName(null);
    try {
      await addRunLog(buildFinishedRunLog('이름 없는 러닝', mockMyRunningRoute, difficulty, false, mateName ?? undefined));
    } catch (error) {
      if (__DEV__) {
        console.error('[community] 러닝 기록 저장 실패', error);
      }
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
          <ProposalPopupStack popups={popups} onDismiss={dismissPopup} />

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
