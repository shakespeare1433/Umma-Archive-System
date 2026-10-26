import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { ActiveRetrievalRequest, REQUEST_STEPS } from '../types';

interface Props {
  request: ActiveRetrievalRequest;
  onAdvance?: () => void;
  onAssign?: () => void;
  onCancel?: () => void;
  showOfficerActions?: boolean;
  dark?: boolean;
}

export const RetrievalRequestCard: React.FC<Props> = ({
  request,
  onAdvance,
  onAssign,
  onCancel,
  showOfficerActions,
  dark = false,
}) => {
  const step = Math.min(request.currentStep, 4);
  const fulfilled = request.currentStep >= 5;
  const isModeration = request.type === 'MODERATION PULL';

  return (
    <View style={[styles.requestCard, dark && styles.requestCardDark]}>
      <View style={styles.cardHeaderRow}>
        <Text
          style={[
            isModeration ? styles.moderationTypeTitle : styles.retrievalTypeTitle,
            dark && styles.textMuted,
          ]}
        >
          {request.type}
        </Text>
        <View style={fulfilled ? styles.officerBadge : styles.stepBadge}>
          <Text style={fulfilled ? styles.officerBadgeText : styles.stepBadgeText}>
            {fulfilled ? 'Fulfilled' : request.stepStatusText || `● Step ${step}/4`}
          </Text>
        </View>
      </View>

      <Text style={[styles.requestCourseTitle, dark && styles.textLight]}>{request.courseTitle}</Text>
      <Text style={[styles.requestMetaText, dark && styles.textMuted]}>
        Session: {request.session} • {request.regOrCohort}
      </Text>

      <View style={styles.stepperContainer}>
        <View style={styles.stepperRow}>
          {REQUEST_STEPS.map((label, index) => {
            const n = index + 1;
            const completed = step > n || fulfilled;
            const active = !fulfilled && step === n;
            return (
              <React.Fragment key={label}>
                {index > 0 && (
                  <View
                    style={[
                      styles.stepLine,
                      completed || active ? styles.stepLineGreen : styles.stepLineGray,
                      active && !completed ? styles.stepLineBlue : null,
                    ]}
                  />
                )}
                <View style={styles.stepNodeContainer}>
                  {active ? (
                    <View style={styles.stepActiveOuterRing}>
                      <View style={[styles.stepCircle, styles.stepActiveBlue]}>
                        <Text style={styles.stepActiveNumber}>{n}</Text>
                      </View>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.stepCircle,
                        completed ? styles.stepCompletedGreen : styles.stepPendingGray,
                      ]}
                    >
                      {completed ? (
                        <MaterialIcons name="check" size={14} color="#FFFFFF" />
                      ) : (
                        <Text style={styles.stepPendingNumber}>{n}</Text>
                      )}
                    </View>
                  )}
                  <Text
                    style={[
                      styles.stepLabel,
                      dark && styles.textMuted,
                      active && styles.stepLabelActive,
                      !active && !completed && styles.stepLabelPending,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {request.shelfLocation ? (
        <View style={[styles.shelfSubBox, dark && styles.shelfDark]}>
          <View style={styles.shelfLeftGroup}>
            <MaterialCommunityIcons name="bookshelf" size={18} color="#2563EB" />
            <Text style={[styles.shelfCoordinatesText, dark && styles.textLight]}>{request.shelfLocation}</Text>
          </View>
          {request.readyEta && !fulfilled ? (
            <View style={styles.readyEtaBadge}>
              <Text style={styles.readyEtaText}>{request.readyEta}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {request.custodian ? (
        <View style={styles.custodianRow}>
          <MaterialIcons name="hourglass-bottom" size={16} color="#D97706" />
          <Text style={styles.custodianLabel}>
            Assigned to:{' '}
            <Text style={styles.custodianName}>{request.custodian}</Text>
          </Text>
        </View>
      ) : null}

      {showOfficerActions && !fulfilled ? (
        <View style={styles.actionsRow}>
          {onAssign ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onAssign}>
              <Text style={styles.secondaryBtnText}>Assign me</Text>
            </TouchableOpacity>
          ) : null}
          {onAdvance ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={onAdvance}>
              <Text style={styles.primaryBtnText}>
                {step >= 4 ? 'Mark fulfilled' : 'Advance step'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {onCancel ? (
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  requestCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  textLight: { color: '#F8FAFC' },
  textMuted: { color: '#94A3B8' },
  shelfDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  retrievalTypeTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.6,
  },
  moderationTypeTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
    letterSpacing: 0.6,
  },
  stepBadge: {
    backgroundColor: '#4ADE80',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  officerBadge: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
  },
  officerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4338CA',
  },
  requestCourseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  requestMetaText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  stepperContainer: {
    marginVertical: 4,
    marginBottom: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNodeContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCompletedGreen: {
    backgroundColor: '#16A34A',
  },
  stepActiveOuterRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActiveBlue: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  stepActiveNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepPendingGray: {
    backgroundColor: '#F1F5F9',
  },
  stepPendingNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stepLine: {
    flex: 1,
    height: 3,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  stepLineGreen: { backgroundColor: '#16A34A' },
  stepLineBlue: { backgroundColor: '#2563EB' },
  stepLineGray: { backgroundColor: '#E2E8F0' },
  stepLabel: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  stepLabelPending: {
    color: '#94A3B8',
  },
  shelfSubBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  shelfLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  shelfCoordinatesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  readyEtaBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  readyEtaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  custodianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  custodianLabel: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  custodianName: {
    fontWeight: '700',
    color: '#1E293B',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    backgroundColor: '#35477B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  secondaryBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: '#35477B',
    fontWeight: '700',
    fontSize: 12,
  },
  cancelText: {
    color: '#B91C1C',
    fontWeight: '600',
    fontSize: 12,
  },
});
