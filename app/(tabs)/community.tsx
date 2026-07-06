import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

export default function CommunityScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>커뮤니티</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
});
