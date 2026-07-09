import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';

interface HomeHeaderProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function HomeHeader({ searchQuery, onSearchQueryChange }: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const openSearch = () => {
    setIsSearchActive(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    onSearchQueryChange('');
  };

  return (
    <View style={[styles.row, { paddingTop: insets.top + 8 }]}>
      {isSearchActive ? (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder="코스 이름으로 검색"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
          />
          <Pressable onPress={closeSearch} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.title}>RunPin</Text>
          <Pressable onPress={openSearch} hitSlop={8}>
            <Ionicons name="search" size={22} color={colors.ink} />
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
});
