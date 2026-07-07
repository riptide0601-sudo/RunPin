import { ScrollView, StyleSheet } from 'react-native';

import { MenuList } from '@/components/profile/MenuList';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsRow } from '@/components/profile/StatsRow';
import { colors } from '@/constants/colors';
import { mockMenuItems, mockProfile, mockProfileStats } from '@/data/mock';

export default function ProfileScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ProfileHeader
        name={mockProfile.name}
        initial={mockProfile.initial}
        joinedLabel={mockProfile.joinedLabel}
        careerLabel={mockProfile.careerLabel}
      />
      <StatsRow stats={mockProfileStats} />
      <MenuList items={mockMenuItems} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 24,
  },
});
