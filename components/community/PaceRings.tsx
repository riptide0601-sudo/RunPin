import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';

const RING_SIZES = [90, 160, 230, 310, 400, 500, 620, 760, 920, 1100];

export function PaceRings() {
  return (
    <View style={styles.container} pointerEvents="none">
      {RING_SIZES.map((size, index) => (
        <View
          key={size}
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              opacity: 1 - index / (RING_SIZES.length + 1),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
