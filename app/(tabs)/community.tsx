import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityMap } from '@/components/community/CommunityMap';
import { MatchProposalCard } from '@/components/community/MatchProposalCard';
import { RunFinishModal, type SaveCourseResult } from '@/components/community/RunFinishModal';
import { RunningStatusBar } from '@/components/community/RunningStatusBar';
import { AlertModal } from '@/components/ui/AlertModal';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { mockMyRunningRoute, mockRunnerDots } from '@/data/mock';
import { FREE_PROPOSAL_LIMIT, useAppData } from '@/lib/appData';
import { buildFinishedRunLog } from '@/lib/runSummary';

type ProposalStatus = 'pending' | 'accepted' | 'declined';
type InfoModal = 'none' | 'proposed' | 'limit' | 'accepted';

interface InfoModalContent {
  tone: 'default' | 'subscribe';
  icon: 'star' | 'checkmark-circle';
  title: string;
  message: string;
  showSubscribeAction: boolean;
}

const INFO_MODAL_CONTENT: Record<Exclude<InfoModal, 'none'>, InfoModalContent> = {
  proposed: {
    tone: 'default',
    icon: 'checkmark-circle',
    title: '제안을 보냈어요',
    message: '상대방이 수락하면 매칭이 완료돼요',
    showSubscribeAction: false,
  },
  accepted: {
    tone: 'default',
    icon: 'checkmark-circle',
    title: '매칭이 수락되었습니다',
    message: '러닝 시작 버튼을 눌러 러닝을 시작하세요',
    showSubscribeAction: false,
  },
  limit: {
    tone: 'subscribe',
    icon: 'star',
    title: '무료 제안 횟수를 모두 사용했어요',
    message: `무료 제안 ${FREE_PROPOSAL_LIMIT}회를 모두 사용했어요. 구독하고 무제한으로 이용해보세요`,
    showSubscribeAction: true,
  },
};

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { courses, addCourse, addRunLog, canPropose, recordProposal } = useAppData();
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus>('pending');
  const [isRunning, setIsRunning] = useState(false);
  const [finishVisible, setFinishVisible] = useState(false);
  const [infoModal, setInfoModal] = useState<InfoModal>('none');
  const lastInfoModalContentRef = useRef<InfoModalContent>(INFO_MODAL_CONTENT.proposed);

  const closeInfoModal = () => setInfoModal('none');

  // Modal은 visible=false가 되어도 fade-out 애니메이션 동안 계속 리렌더되므로,
  // infoModal이 'none'으로 바뀐 뒤에도 닫히는 애니메이션 중에는 마지막으로 보여준
  // 내용을 유지해야 다른 문구(예: 무료 제안 소진 안내)로 잘못 바뀌어 보이지 않는다.
  if (infoModal !== 'none') {
    lastInfoModalContentRef.current = INFO_MODAL_CONTENT[infoModal];
  }
  const infoModalContent = lastInfoModalContentRef.current;

  const handleAccept = () => {
    setProposalStatus('accepted');
    setInfoModal('accepted');
  };

  const handlePropose = () => {
    if (canPropose) {
      recordProposal();
      setInfoModal('proposed');
      return;
    }

    setInfoModal('limit');
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

      <AlertModal
        visible={infoModal !== 'none'}
        tone={infoModalContent.tone}
        icon={infoModalContent.icon}
        title={infoModalContent.title}
        message={infoModalContent.message}
        secondaryAction={
          infoModalContent.showSubscribeAction ? { label: '취소', onPress: closeInfoModal, variant: 'outline' } : undefined
        }
        primaryAction={
          infoModalContent.showSubscribeAction
            ? {
                label: '구독하기',
                onPress: () => {
                  closeInfoModal();
                  router.push('/subscription');
                },
              }
            : { label: '확인', onPress: closeInfoModal }
        }
        onRequestClose={closeInfoModal}
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
