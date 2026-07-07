import { View } from 'react-native';

import { MenuItem } from '@/components/profile/MenuItem';
import type { MenuItemData } from '@/types';

interface MenuListProps {
  items: MenuItemData[];
}

export function MenuList({ items }: MenuListProps) {
  return (
    <View>
      {items.map((item) => (
        <MenuItem key={item.id} item={item} />
      ))}
    </View>
  );
}
