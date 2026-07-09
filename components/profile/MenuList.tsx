import { View } from 'react-native';

import { MenuItem } from '@/components/profile/MenuItem';
import type { MenuItemData } from '@/types';

interface MenuListProps {
  items: MenuItemData[];
  onItemPress?: (id: string) => void;
}

export function MenuList({ items, onItemPress }: MenuListProps) {
  return (
    <View>
      {items.map((item) => (
        <MenuItem key={item.id} item={item} onPress={onItemPress ? () => onItemPress(item.id) : undefined} />
      ))}
    </View>
  );
}
