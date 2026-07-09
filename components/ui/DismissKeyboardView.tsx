import type { ReactNode } from 'react';
import { Keyboard, StyleSheet, TouchableWithoutFeedback, View, type StyleProp, type ViewStyle } from 'react-native';

interface DismissKeyboardViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function DismissKeyboardView({ children, style }: DismissKeyboardViewProps) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.fill, style]}>{children}</View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
