import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RunFinishModal } from '@/components/community/RunFinishModal';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { useAppData } from '@/lib/appData';
import { formatDateLabel, formatPaceLabel } from '@/lib/format';
import type { RunLog } from '@/types';

export default function RunLogListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { courses, runLogs, uploadRunLog } = useAppData();
  const [uploadTarget, setUploadTarget] = useState<RunLog | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>내 러닝 기록</Text>
      </View>
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {runLogs.map((log) => (
          <Pressable
            key={log.id}
            onPress={() => router.push({ pathname: '/run-log/[id]', params: { id: log.id } })}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Card style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.courseName}>{log.courseName}</Text>
                <Text style={styles.date}>{formatDateLabel(log.startedAt)}</Text>
              </View>
              <Text style={styles.meta}>
                {log.distanceKm}km · {formatPaceLabel(log.paceSecPerKm)}
              </Text>
              <View style={styles.statusRow}>
                {log.isUploaded ? (
                  <Pill
                    variant="subtle"
                    label="업로드 완료"
                    size="sm"
                    icon={<Ionicons name="checkmark-circle" size={12} color={colors.textMuted} />}
                  />
                ) : (
                  <Pill variant="outline" label="업로드" size="sm" onPress={() => setUploadTarget(log)} />
                )}
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>

      <RunFinishModal
        visible={uploadTarget !== null}
        myRoute={uploadTarget?.trajectory ?? []}
        courses={courses}
        onSave={(result) => {
          if (uploadTarget) uploadRunLog(uploadTarget.id, result.courseName);
          setUploadTarget(null);
        }}
        onSkip={() => setUploadTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 4,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
