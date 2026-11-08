import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { useAuth } from '../../context/AuthContext';
import { adminPalette, useTheme } from '../../context/ThemeContext';
import { AppUser, UserRole } from '../../types';
import { borderRadius, colors as tokens, control, spacing } from '../../theme';

const STAFF_ROLES: UserRole[] = ['Lecturer', 'Examination Officer'];
const ROLE_FILTERS: { key: 'All' | UserRole; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Admin', label: 'Admin' },
  { key: 'Lecturer', label: 'Lecturer' },
  { key: 'Examination Officer', label: 'Examination Officer' },
];

const ROLE_TONE: Record<UserRole, { bg: string; text: string; avatar: string }> = {
  Admin: { bg: '#DBEAFE', text: tokens.primary, avatar: tokens.primary },
  Lecturer: { bg: '#DBEAFE', text: '#1D4ED8', avatar: '#2563EB' },
  'Examination Officer': { bg: '#EDE9FE', text: '#5B21B6', avatar: '#5B21B6' },
};

const emptyForm = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'Lecturer' as UserRole,
  school: '',
  department: '',
  phone: '',
  address: '',
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const AdminUsersScreen: React.FC = () => {
  const { theme } = useTheme();
  const palette = adminPalette(theme);
  const { users, upsertUser } = useAuth();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | UserRole>('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((user) => (roleFilter === 'All' ? true : user.role === roleFilter))
      .filter((user) => {
        if (!q) return true;
        return (
          user.name.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          user.username.toLowerCase().includes(q)
        );
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, query, roleFilter]);

  const openCreate = () => {
    const role = roleFilter === 'All' || roleFilter === 'Admin' ? 'Lecturer' : roleFilter;
    setEditing(null);
    setForm({ ...emptyForm, role });
    setShowModal(true);
  };

  const openReplace = (user: AppUser) => {
    setEditing(user);
    setForm({
      name: user.name,
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      school: user.faculty,
      department: user.department,
      phone: user.phone,
      address: user.address,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const saveAccount = async () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const username = (form.username.trim() || email.split('@')[0] || '').toLowerCase();
    const password = form.password.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();
    const school = form.school.trim();
    const department = form.department.trim();
    const isLecturer = (editing?.role || form.role) === 'Lecturer';

    if (!name || !email || !password || !phone || !address || (isLecturer && (!school || !department))) {
      Alert.alert(
        'Missing fields',
        isLecturer
          ? 'Full name, school, department, phone number, address, email, and password are required.'
          : 'Full name, phone number, address, email, and password are required.'
      );
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Email required', 'Enter the email they will use to sign in.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    const taken = users.some(
      (user) => user.username.toLowerCase() === username && user.id !== editing?.id
    );
    if (taken) {
      Alert.alert('Username taken', 'Choose a different username.');
      return;
    }

    const saved: AppUser = {
      id: editing?.id || `user-${Date.now()}`,
      username,
      password,
      name,
      email,
      phone,
      address,
      avatarUrl: editing?.avatarUrl || '',
      role: editing?.role || form.role,
      department: isLecturer ? department : editing?.department || '',
      faculty: isLecturer ? school : editing?.faculty || '',
      status: editing?.status || 'Active',
      createdAt: editing?.createdAt || new Date().toISOString(),
    };
    setSaving(true);
    const error = await upsertUser(saved);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save account', error);
      return;
    }
    closeModal();
    Alert.alert(
      editing ? 'Account replaced' : 'Account created',
      `${saved.name} can sign in as ${saved.role} with ${saved.email}.`
    );
  };

  const toggleStatus = (user: AppUser) => {
    const nextStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    Alert.alert(`${nextStatus} account`, `Mark ${user.name} as ${nextStatus}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => upsertUser({ ...user, status: nextStatus }) },
    ]);
  };

  const openUser = (user: AppUser) => {
    if (user.role === 'Admin') {
      Alert.alert(user.name, user.email, [
        { text: user.status === 'Active' ? 'Suspend' : 'Activate', onPress: () => toggleStatus(user) },
        { text: 'Close', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert(user.name, user.email, [
      { text: 'Replace account', onPress: () => openReplace(user) },
      { text: user.status === 'Active' ? 'Suspend' : 'Activate', onPress: () => toggleStatus(user) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const fieldStyle = {
    backgroundColor: palette.field,
    borderColor: palette.line,
    color: palette.ink,
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.page }]}>
      <LecturerTopHeader subtitle="Admin Portal" />
      <KeyboardScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: palette.ink }]}>Staff Management</Text>
        <Text style={[styles.pageSub, { color: palette.muted }]}>Manage user accounts and roles</Text>
        <View style={[styles.searchWrap, { backgroundColor: palette.card, borderColor: palette.line }]}>
          <Feather name="search" size={16} color={palette.muted} />
          <TextInput
            style={[styles.search, { color: palette.ink }]}
            placeholder="Search by name, email or role..."
            placeholderTextColor={palette.muted}
            value={query}
            onChangeText={setQuery}
          />
          <Feather name="sliders" size={16} color={palette.muted} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {ROLE_FILTERS.map((item) => {
            const on = roleFilter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.chip,
                  { backgroundColor: palette.card, borderColor: palette.line },
                  on && styles.chipOn,
                ]}
                onPress={() => setRoleFilter(item.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, { color: palette.ink }, on && styles.chipTextOn]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={styles.addBtn} onPress={openCreate} accessibilityRole="button" accessibilityLabel="Add Staff">
          <Feather name="plus" size={16} color={tokens.onPrimary} />
          <Text style={styles.addBtnText}>Add Staff</Text>
        </TouchableOpacity>

        {visible.length === 0 ? (
          <Text style={[styles.empty, { color: palette.muted }]}>No staff match this search.</Text>
        ) : (
          visible.map((user) => (
            <StaffRow key={user.id} user={user} onPress={() => openUser(user)} />
          ))
        )}
      </KeyboardScrollView>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: palette.card, maxHeight: '90%' }]}>
            <KeyboardScrollView bottomOffset={16} showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, { color: palette.ink }]}>
                {editing ? 'Replace account' : `New ${form.role}`}
              </Text>
              <Text style={[styles.sheetHint, { color: palette.muted }]}>
                {editing
                  ? `This replaces the login for ${editing.name}. The old email and password will stop working.`
                  : form.role === 'Lecturer'
                    ? 'Enter the lecturer’s full name, school, department, phone number, and address. They will see these details on their profile after they sign in.'
                    : 'Enter the examination officer’s full name, phone number, and address. They will see these details on their profile after they sign in.'}
              </Text>
              <TextInput
                style={[styles.input, fieldStyle]}
                placeholder="Full name"
                placeholderTextColor={palette.muted}
                value={form.name}
                onChangeText={(name) => setForm((current) => ({ ...current, name }))}
              />
              {form.role === 'Lecturer' ? (
                <>
                  <TextInput
                    style={[styles.input, fieldStyle]}
                    placeholder="School"
                    placeholderTextColor={palette.muted}
                    value={form.school}
                    onChangeText={(school) => setForm((current) => ({ ...current, school }))}
                  />
                  <TextInput
                    style={[styles.input, fieldStyle]}
                    placeholder="Department"
                    placeholderTextColor={palette.muted}
                    value={form.department}
                    onChangeText={(department) => setForm((current) => ({ ...current, department }))}
                  />
                </>
              ) : null}
              <TextInput
                style={[styles.input, fieldStyle]}
                placeholder="Phone number"
                placeholderTextColor={palette.muted}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(phone) => setForm((current) => ({ ...current, phone }))}
              />
              <TextInput
                style={[styles.input, styles.addressInput, fieldStyle]}
                placeholder="Address"
                placeholderTextColor={palette.muted}
                multiline
                value={form.address}
                onChangeText={(address) => setForm((current) => ({ ...current, address }))}
              />
              <TextInput
                style={[styles.input, fieldStyle]}
                placeholder="Email"
                placeholderTextColor={palette.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={form.email}
                onChangeText={(email) => setForm((current) => ({ ...current, email }))}
              />
              <TextInput
                style={[styles.input, fieldStyle]}
                placeholder="Username (optional)"
                placeholderTextColor={palette.muted}
                autoCapitalize="none"
                value={form.username}
                onChangeText={(username) => setForm((current) => ({ ...current, username }))}
              />
              <TextInput
                style={[styles.input, fieldStyle]}
                placeholder={editing ? 'New password' : 'Password'}
                placeholderTextColor={palette.muted}
                secureTextEntry
                value={form.password}
                onChangeText={(password) => setForm((current) => ({ ...current, password }))}
              />
              {editing ? null : (
                <View style={styles.roleRow}>
                  {STAFF_ROLES.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleChip,
                        { backgroundColor: palette.field, borderColor: palette.line },
                        form.role === role && styles.roleChipOn,
                      ]}
                      onPress={() => setForm((current) => ({ ...current, role }))}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          { color: palette.ink },
                          form.role === role && styles.roleChipTextOn,
                        ]}
                      >
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.primary} onPress={saveAccount} disabled={saving}>
                <Text style={styles.primaryText}>
                  {saving ? 'Saving…' : editing ? 'Replace account' : 'Create account'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeModal}>
                <Text style={[styles.cancel, { color: palette.muted }]}>Cancel</Text>
              </TouchableOpacity>
            </KeyboardScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

function StaffRow({ user, onPress }: { user: AppUser; onPress: () => void }) {
  const { theme } = useTheme();
  const palette = adminPalette(theme);
  const tone = ROLE_TONE[user.role];
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.line },
        user.status === 'Suspended' && styles.cardSuspended,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      {user.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: tone.avatar }]}>
          <Text style={styles.avatarText}>{initials(user.name)}</Text>
        </View>
      )}
      <View style={styles.cardCopy}>
        <Text style={[styles.name, { color: palette.ink }]} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={[styles.email, { color: palette.muted }]} numberOfLines={1}>
          {user.email}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
        <Text style={[styles.badgeText, { color: tone.text }]} numberOfLines={1}>
          {user.role === 'Examination Officer' ? 'Examination Officer' : user.role}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.background },
  content: { padding: spacing.md, paddingBottom: 32 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: tokens.primary, fontFamily: 'serif' },
  pageSub: { fontSize: 13, color: tokens.onSurfaceVariant, marginBottom: spacing.md, marginTop: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: spacing.md,
  },
  search: { flex: 1, color: tokens.onSurface, fontSize: 14, paddingVertical: 0 },
  chipRow: { gap: 8, paddingBottom: spacing.md },
  chip: {
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: tokens.outlineVariant,
    backgroundColor: tokens.surfaceContainerLowest,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: tokens.primary, borderColor: tokens.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: tokens.onSurfaceVariant },
  chipTextOn: { color: tokens.onPrimary },
  addBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    height: 40,
    marginBottom: spacing.md,
  },
  addBtnText: { color: tokens.onPrimary, fontWeight: '700', fontSize: 13 },
  empty: { color: tokens.placeholder, textAlign: 'center', marginTop: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
  },
  cardSuspended: { opacity: 0.55 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: tokens.onPrimary, fontWeight: '700', fontSize: 14 },
  cardCopy: { flex: 1, minWidth: 0 },
  name: { fontWeight: '700', color: tokens.onSurface, fontSize: 15 },
  email: { color: tokens.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  badge: { borderRadius: borderRadius.pill, paddingHorizontal: 10, paddingVertical: 5, maxWidth: 132 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: tokens.surfaceContainerLowest, borderRadius: 16, padding: 18, maxHeight: '90%' },
  addressInput: { height: 72, paddingTop: 10, textAlignVertical: 'top' },
  sheetTitle: { fontWeight: '700', fontSize: 18, color: tokens.primary },
  sheetHint: { color: tokens.onSurfaceVariant, fontSize: 12, marginTop: 4, marginBottom: 12, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 8,
    color: tokens.onSurface,
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  roleChip: { borderWidth: 1, borderColor: tokens.outlineVariant, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  roleChipOn: { backgroundColor: tokens.primary, borderColor: tokens.primary },
  roleChipText: { fontSize: 11, color: tokens.onSurfaceVariant },
  roleChipTextOn: { color: tokens.onPrimary },
  primary: {
    backgroundColor: tokens.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    minHeight: control.minTap,
    justifyContent: 'center',
  },
  primaryText: { color: tokens.onPrimary, fontWeight: '700' },
  cancel: { textAlign: 'center', marginTop: 12, color: tokens.onSurfaceVariant },
});
