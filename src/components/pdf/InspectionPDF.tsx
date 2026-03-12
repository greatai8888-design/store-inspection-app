import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register a font that supports Chinese characters
Font.register({
  family: 'Noto Sans TC',
  src: 'https://fonts.gstatic.com/s/notosanstc/v35/-nFuOG829Oofr2wohFbTp9ifNAn722rq0MXz76Cy_CpOtma3uNQ.ttf',
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Noto Sans TC',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 8,
  },
  meta: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  statBox: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    alignItems: 'center' as any,
  },
  statLabel: {
    fontSize: 8,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  zoneHeader: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 4,
  },
  zoneTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center' as any,
  },
  itemLabel: {
    flex: 1,
    fontSize: 10,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 9,
  },
  notes: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
    marginLeft: 8,
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
  },
});

interface PDFData {
  storeName: string;
  inspectorEmail: string;
  submittedAt: string;
  zones: { zone: string; items: any[] }[];
  stats: { pass: number; warning: number; fail: number; total: number };
}

function getStatusText(status: string) {
  switch (status) {
    case 'pass': return '✓ 通過';
    case 'warning': return '⚠ 待改善';
    case 'fail': return '✗ 不通過';
    default: return status;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pass': return { bg: '#dcfce7', text: '#166534' };
    case 'warning': return { bg: '#fef9c3', text: '#854d0e' };
    case 'fail': return { bg: '#fee2e2', text: '#991b1b' };
    default: return { bg: '#f3f4f6', text: '#374151' };
  }
}

export function InspectionPDF(data: PDFData) {
  const date = new Date(data.submittedAt).toLocaleString('zh-TW');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>巡店檢查報告 - {data.storeName}</Text>
          <Text style={styles.meta}>巡檢人：{data.inspectorEmail}</Text>
          <Text style={styles.meta}>時間：{date}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#dcfce7' }]}>
            <Text style={styles.statLabel}>通過</Text>
            <Text style={[styles.statValue, { color: '#166534' }]}>{data.stats.pass}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fef9c3' }]}>
            <Text style={styles.statLabel}>待改善</Text>
            <Text style={[styles.statValue, { color: '#854d0e' }]}>{data.stats.warning}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fee2e2' }]}>
            <Text style={styles.statLabel}>不通過</Text>
            <Text style={[styles.statValue, { color: '#991b1b' }]}>{data.stats.fail}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#f3f4f6' }]}>
            <Text style={styles.statLabel}>總計</Text>
            <Text style={[styles.statValue, { color: '#374151' }]}>{data.stats.total}</Text>
          </View>
        </View>

        {data.zones.map((zone) => (
          <View key={zone.zone} wrap={false}>
            <View style={styles.zoneHeader}>
              <Text style={styles.zoneTitle}>{zone.zone}</Text>
            </View>
            {zone.items.map((item) => {
              const colors = getStatusColor(item.status);
              return (
                <View key={item.id}>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemLabel}>
                      {item.checklist_items?.label || '—'}
                    </Text>
                    <Text
                      style={[
                        styles.statusBadge,
                        { backgroundColor: colors.bg, color: colors.text },
                      ]}
                    >
                      {getStatusText(item.status)}
                    </Text>
                  </View>
                  {item.notes && (
                    <Text style={styles.notes}>備註：{item.notes}</Text>
                  )}
                  {item.photo_url && item.photo_url !== 'uploading' && (
                    <View style={{ paddingHorizontal: 8, paddingBottom: 6 }}>
                      <Image
                        src={item.photo_url}
                        style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 4 }}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        <Text style={styles.footer}>
          巡店系統自動生成 | {date}
        </Text>
      </Page>
    </Document>
  );
}
