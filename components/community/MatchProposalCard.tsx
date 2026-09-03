import { ProposalBanner } from '@/components/community/ProposalBanner';
import { Pill } from '@/components/ui/Pill';

interface MatchProposalCardProps {
  runnerName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function MatchProposalCard({ runnerName, onAccept, onDecline }: MatchProposalCardProps) {
  return (
    <ProposalBanner
      text={`${runnerName}님이 함께 뛰자고 제안했어요`}
      actions={
        <>
          <Pill label="거절" variant="outline" onPress={onDecline} />
          <Pill label="수락" variant="filled" onPress={onAccept} />
        </>
      }
    />
  );
}
