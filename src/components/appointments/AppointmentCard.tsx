import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Appointment } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  formatCurrency,
  formatDate,
  formatTimeSlot,
  formatPatientName,
} from '../../utils/formatters';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';

export interface AppointmentCardProps {
  appointment: Appointment;
  onPress: () => void;
  onResubmit?: () => void;
  onCancel?: () => void;
  onDeleteExpired?: () => void;
  onViewResult?: () => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onPress,
  onResubmit,
  onCancel,
  onDeleteExpired,
  onViewResult,
}) => {
  const theme = useTheme();
  const isExpired = appointment.status === 'expired';

  // Determine appointment category label
  const isBulk = !!appointment.batch_id;
  const isDependent = !!appointment.dependent_id;
  const categoryLabel = isBulk ? 'BULK' : isDependent ? 'DEPENDENT' : 'PERSONAL';

  // Determine allowed patient actions
  const canResubmit =
    (appointment.status === 'returned' || appointment.status === 'canceled' || isExpired) &&
    appointment.status !== 'released';

  const canCancel =
    ['pending', 'approved', 'returned'].includes(appointment.status) && !isExpired;

  const canDeleteExpired = isExpired && appointment.deleted_by_patient === false && appointment.payment_status !== 'paid';
  const hasReleasedResults = appointment.status === 'released';

  return (
    <Card
      style={styles.cardContainer}
      variant={isExpired ? 'danger' : 'default'}
      onPress={onPress}>
      {/* Card Header: Patient Name, Type Badge, & Clinical Status */}
      <View style={styles.headerRow}>
        <View style={styles.patientInfo}>
          <Text style={[styles.patientName, { color: theme.textMain }]} numberOfLines={1}>
            {formatPatientName(
              appointment.patient_first_name,
              appointment.patient_middle_name,
              appointment.patient_last_name,
              appointment.patient_suffix
            )}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: theme.surfaceSubtle }]}>
              <Text style={[styles.typeText, { color: theme.textMuted }]}>{categoryLabel}</Text>
            </View>
            <Text style={[styles.refText, { color: theme.textMuted }]}>
              REF: #{appointment.id}
            </Text>
          </View>
        </View>
        <Badge status={appointment.status} isExpired={isExpired} size="sm" />
      </View>

      {/* Schedule & Tests Details */}
      <View style={[styles.detailSection, { borderTopColor: theme.borderColor }]}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={theme.brandAccent} />
          <Text style={[styles.infoText, { color: theme.textMain }]}>
            {formatDate(appointment.appointment_date)} at {formatTimeSlot(appointment.time_slot)}
          </Text>
        </View>

        {appointment.services && appointment.services.length > 0 && (
          <View style={styles.infoRow}>
            <Ionicons name="flask-outline" size={14} color={theme.brandAccent} />
            <Text style={[styles.infoText, { color: theme.textMuted }]} numberOfLines={2}>
              {appointment.services.map((s) => s.name).join(', ')}
            </Text>
          </View>
        )}
      </View>

      {/* Billing & Settlement Row */}
      <View style={[styles.billingRow, { backgroundColor: theme.surfaceSubtle }]}>
        <View>
          <Text style={[styles.billingLabel, { color: theme.textMuted }]}>
            Payment ({appointment.payment_method})
          </Text>
          <Text
            style={[
              styles.paymentStatus,
              { color: appointment.payment_status === 'paid' ? theme.success : theme.warning },
            ]}>
            {appointment.payment_status.toUpperCase()}
          </Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={[styles.amountText, { color: theme.brandAccent }]}>
            {formatCurrency(appointment.payment_amount || 0)}
          </Text>
        </View>
      </View>

      {/* Clinical Retest Notice Banner */}
      {appointment.status === 'retest' && (
        <View style={[styles.alertBanner, { backgroundColor: 'rgba(253, 126, 20, 0.08)', borderColor: theme.warning }]}>
          <Ionicons name="alert-circle" size={16} color={theme.warning} />
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, { color: theme.warning }]}>Retesting Required</Text>
            <Text style={[styles.alertMessage, { color: theme.textMain }]}>
              Your sample requires recollection. Please visit the clinic.
            </Text>
          </View>
        </View>
      )}

      {/* Return Reason Alert */}
      {appointment.status === 'returned' && appointment.return_reason && (
        <View style={[styles.alertBanner, { backgroundColor: 'rgba(220, 53, 69, 0.08)', borderColor: theme.danger }]}>
          <Ionicons name="alert-circle" size={16} color={theme.danger} />
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, { color: theme.danger }]}>Corrections Requested</Text>
            <Text style={[styles.alertMessage, { color: theme.textMain }]} numberOfLines={2}>
              "{appointment.return_reason}"
            </Text>
          </View>
        </View>
      )}

      {/* Action Toolbar */}
      {(canResubmit || canCancel || canDeleteExpired || hasReleasedResults) && (
        <View style={styles.actionsRow}>
          {hasReleasedResults && onViewResult && (
            <Button
              title="View Results"
              variant="primary"
              size="sm"
              icon={<Ionicons name="document-text-outline" size={14} color="#1C232D" />}
              onPress={onViewResult}
              style={{ flex: 1 }}
            />
          )}

          {canResubmit && onResubmit && (
            <Button
              title="Update & Resubmit"
              variant="primary"
              size="sm"
              icon={<Ionicons name="refresh-outline" size={14} color="#1C232D" />}
              onPress={onResubmit}
              style={{ flex: 1 }}
            />
          )}

          {canCancel && onCancel && (
            <Button
              title="Cancel"
              variant="outline-secondary"
              size="sm"
              onPress={onCancel}
              style={styles.cancelBtn}
            />
          )}

          {canDeleteExpired && onDeleteExpired && (
            <Button
              title="Remove"
              variant="danger"
              size="sm"
              icon={<Ionicons name="trash-outline" size={14} color="#FFFFFF" />}
              onPress={onDeleteExpired}
            />
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  patientInfo: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  patientName: {
    fontSize: Typography.sizes.md,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: Spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  typeText: {
    fontSize: Typography.sizes.xs - 2,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  refText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  detailSection: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    flex: 1,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  billingLabel: {
    fontSize: Typography.sizes.xs - 1,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  paymentStatus: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    marginTop: 2,
  },
  amountBox: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: Typography.sizes.md,
    fontWeight: '900',
  },
  alertBanner: {
    flexDirection: 'row',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  alertMessage: {
    fontSize: Typography.sizes.xs - 1,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelBtn: {
    minWidth: 90,
  },
});