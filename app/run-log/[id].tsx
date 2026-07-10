import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LineChart } from '@/components/charts/LineChart';
import { RunFinishModal } from '@/components/community/RunFinishModal';
import { getRouteCenter } from '@/components/map/getRouteCenter';
import { LeafletMap } from '@/components/map/LeafletMap';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { useAppData } from '@/lib/appData';
import { formatDateLabel, formatDurationLabel, formatPaceLabel, formatPaceShortLabel } from '@/lib/format';

export default function RunLogDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { courses, runLogs, uploadRunLog } = useAppData();
  const log = runLogs.find((entry) => entry.id === id);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {log?.courseName ?? '러닝 기록'}
        </Text>
      </View>

      {!log ? (
        <Text style={styles.emptyText}>기록을 찾을 수 없어요</Text>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.dateRow}>
            <Text style={styles.date}>{formatDateLabel(log.startedAt)}</Text>
            {log.isUploaded ? (
              <Pill
                variant="subtle"
                label="업로드 완료"
                size="sm"
                icon={<Ionicons name="checkmark-circle" size={16} color={colors.textMuted} />}
                style={styles.uploadPill}
                labelStyle={styles.uploadPillLabel}
              />
            ) : (
              <Pill
                variant="outline"
                label="업로드"
                size="sm"
                style={styles.uploadPill}
                labelStyle={styles.uploadPillLabel}
                onPress={() => setShowUpload(true)}
              />
            )}
          </View>

          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{log.distanceKm}km</Text>
              <Text style={styles.statLabel}>총 거리</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{formatDurationLabel(log.durationSec)}</Text>
              <Text style={styles.statLabel}>총 시간</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{formatPaceLabel(log.paceSecPerKm)}</Text>
              <Text style={styles.statLabel}>평균 페이스</Text>
            </Card>
          </View>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{log.avgHeartRateBpm}bpm</Text>
              <Text style={styles.statLabel}>평균 심박수</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{log.cadenceSpm}spm</Text>
              <Text style={styles.statLabel}>평균 케이던스</Text>
            </Card>
          </View>

          <LeafletMap
            height={240}
            style={styles.map}
            center={getRouteCenter(log.trajectory)}
            route={log.trajectory}
            fitBounds
            dragging={false}
          />

          <Card style={styles.chartCard}>
            <LineChart label="고도" unit="m" data={log.elevationSeries} distanceKm={log.distanceKm} />
          </Card>
          <Card style={styles.chartCard}>
            <LineChart label="페이스" data={log.paceSeries} distanceKm={log.distanceKm} formatValue={formatPaceShortLabel} />
          </Card>
          <Card style={styles.chartCard}>
            <LineChart label="심박수" unit="bpm" data={log.heartRateSeries} distanceKm={log.distanceKm} />
          </Card>
        </ScrollView>
      )}

      {log ? (
        <RunFinishModal
          visible={showUpload}
          myRoute={log.trajectory}
          courses={courses}
          onSave={(result) => {
            uploadRunLog(log.id, result.courseName);
            setShowUpload(false);
          }}
          onSkip={() => setShowUpload(false)}
        />
      ) : null}
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
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    paddingHorizontal: 20,
    fontSize: 14,
    color: colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: colors.textMuted,
  },
  map: {
    borderRadius: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
    backgroundColor: colors.surfaceAlt,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  chartCard: {
    gap: 8,
  },
  uploadPill: {
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  uploadPillLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
