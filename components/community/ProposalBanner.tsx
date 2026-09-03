import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors } from '@/constants/colors';

interface ProposalBannerProps {
  text: string;
  /** 우측에 붙는 액션 영역(수락/거절 Pill 등). 알림용 배너는 넘기지 않는다. */
  actions?: ReactNode;
}

// 커뮤니티 화면 하단에 뜨는 가로 배너의 공통 껍데기.
// 들어온 제안 배너(MatchProposalCard)와 제안 결과 알림(ProposalPopupStack)이
// 시각적으로 구분되지 않아야 해서, 폭/패딩/모서리/그림자/텍스트 스타일을 여기 한 곳에
// 두고 양쪽이 같이 쓴다. 한쪽만 스타일이 어긋나는 걸 막기 위한 추출이다.
export function ProposalBanner({ text, actions }: ProposalBannerProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.info}>
        <View style={styles.legendDot} />
        <Text style={styles.text}>{text}</Text>
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentMatch,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
