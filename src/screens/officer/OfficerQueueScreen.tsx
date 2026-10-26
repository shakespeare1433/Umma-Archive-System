import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { RetrievalRequestCard } from '../../components/RetrievalRequestCard';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';

export const OfficerQueueScreen: React.FC = () => {
  const { user } = useAuth();
  const { requests, advanceRequest, assignRequest, cancelRequest } = useVault();
  const open = requests.filter((r) => r.currentStep < 5);

  return (
    <View style={styles.screen}>
      <LecturerTopHeader subtitle="Exam Officer Portal" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Retrieval queue</Text>
        <Text style={styles.sub}>
          Advance physical retrievals and moderation pulls. {open.length} open request
          {open.length === 1 ? '' : 's'}.
        </Text>
        {open.length === 0 ? (
          <Text style={styles.empty}>No open retrievals. New lecturer requests will appear here.</Text>
        ) : (
          open.map((req) => (
            <RetrievalRequestCard
              key={req.id}
              request={req}
              showOfficerActions
              onAdvance={() => advanceRequest(req.id)}
              onAssign={() => assignRequest(req.id, user?.name || 'Officer')}
              onCancel={() => cancelRequest(req.id)}
            />
          ))
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
  empty: { fontSize: 14, color: '#64748B', marginTop: 12 },
});
