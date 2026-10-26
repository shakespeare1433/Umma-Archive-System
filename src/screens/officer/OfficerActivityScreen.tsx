import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { RetrievalRequestCard } from '../../components/RetrievalRequestCard';
import { useVault } from '../../context/VaultContext';

export const OfficerActivityScreen: React.FC = () => {
  const { requests } = useVault();
  const done = requests.filter((r) => r.currentStep >= 5);

  return (
    <View style={styles.screen}>
      <LecturerTopHeader subtitle="Exam Officer Portal" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Fulfilled retrievals</Text>
        <Text style={styles.sub}>{done.length} booklet{done.length === 1 ? '' : 's'} dispatched from the vault.</Text>
        {done.length === 0 ? (
          <Text style={styles.empty}>Advance a queue item to mark it fulfilled.</Text>
        ) : (
          done.map((req) => <RetrievalRequestCard key={req.id} request={req} />)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7FC' },
  content: { padding: 16, paddingBottom: 32 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E2B58',
    fontFamily: 'serif',
    marginBottom: 4,
  },
  sub: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  empty: { fontSize: 14, color: '#64748B' },
});
