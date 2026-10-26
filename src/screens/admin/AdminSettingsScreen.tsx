import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { AppearancePicker } from '../../components/AppearancePicker';
import { NotificationCard, iconForNotice, labelForNotice, toneForNotice } from '../../components/NotificationCard';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useVault } from '../../context/VaultContext';
import { listNotifications } from '../../services/notificationService';
import { AppNotification } from '../../types';
import { borderRadius, colors as tokens, control, spacing } from '../../theme';

const LOGO = require('../../../assets/exam-archive-logo.png');
const BRAND_BG = require('../../../assets/images/library-hero.png');
const MENU_ICON = 22;

function overlay(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type Panel = 'account' | 'notifications' | 'security' | 'preferences' | 'about' | null;

const HEADERS: Record<Exclude<Panel, null>, { title: string; subtitle: string }> = {
  account: { title: 'Account Management', subtitle: 'Update your profile and password' },
  notifications: { title: 'Notification Settings', subtitle: 'Manage alerts and notifications' },
  security: { title: 'Security', subtitle: 'Password and session control' },
  preferences: { title: 'App Preferences', subtitle: 'Theme and archive display' },
  about: { title: 'About', subtitle: 'App information and help' },
};

export const AdminSettingsScreen: React.FC = () => {
  const { logout, user, updateUserProfile, changePassword } = useAuth();
  const { settings, updateSettings } = useVault();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [year, setYear] = useState(settings.academicYear);
  const [hours, setHours] = useState(String(settings.dispatchHours));
  const [facultyInput, setFacultyInput] = useState('');
  const [sessionInput, setSessionInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [notes, setNotes] = useState<AppNotification[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone);
    setAddress(user.address);
  }, [user]);

  useEffect(() => {
    setYear(settings.academicYear);
    setHours(String(settings.dispatchHours));
  }, [settings.academicYear, settings.dispatchHours]);

  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      setNotes(await listNotifications());
    } catch {
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (panel === 'notifications') void loadNotes();
  }, [panel, loadNotes]);

  const header = panel ? HEADERS[panel] : { title: 'Settings', subtitle: 'System preferences and security' };

  const closePanel = () => {
    setPanel(null);
    setNotice('');
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      setNotice('Enter your full name.');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      setNotice('Profile updated.');
    } catch (saveError) {
      setNotice(saveError instanceof Error ? saveError.message : 'Profile could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (nextPassword.length < 8) {
      setNotice('Use at least 8 characters for the new password.');
      return;
    }
    if (nextPassword !== confirmPassword) {
      setNotice('The new passwords do not match.');
      return;
    }
    setSaving(true);
    const error = await changePassword(currentPassword, nextPassword);
    setSaving(false);
    if (error) {
      setNotice(error);
      return;
    }
    setCurrentPassword('');
    setNextPassword('');
    setConfirmPassword('');
    setNotice('Password updated.');
  };

  const saveArchive = async () => {
    const parsed = Number(hours);
    await updateSettings({
      academicYear: year.trim() || settings.academicYear,
      dispatchHours: Number.isFinite(parsed) && parsed > 0 ? parsed : settings.dispatchHours,
    });
    setNotice('Archive settings saved.');
  };

  const signOut = () => {
    Alert.alert('Log out', 'Leave the admin portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.screen, dark && styles.screenDark]}>
      <LecturerTopHeader subtitle="Admin Portal" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {panel ? (
          <TouchableOpacity style={styles.panelBack} onPress={closePanel} accessibilityRole="button" accessibilityLabel="Back to settings">
            <Feather name="chevron-left" size={20} color={tokens.primary} />
            <View>
              <Text style={[styles.pageTitle, dark && styles.textLight]}>{header.title}</Text>
              <Text style={styles.pageSub}>{header.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={[styles.pageTitle, dark && styles.textLight]}>Settings</Text>
            <Text style={styles.pageSub}>System preferences and security</Text>
          </>
        )}
        {panel === null ? (
          <>
            <BrandHero />

            <View style={[styles.menuCard, dark && styles.cardDark]}>
              <MenuRow
                icon="account-circle-outline"
                title="Account Management"
                hint="Update your profile and password"
                iconBg="#1E3A8A"
                iconColor={tokens.onPrimary}
                onPress={() => setPanel('account')}
              />
              <MenuRow
                icon="bell-outline"
                title="Notification Settings"
                hint="Manage alerts and notifications"
                iconBg="#C2410C"
                iconColor={tokens.onPrimary}
                onPress={() => setPanel('notifications')}
              />
              <MenuRow
                icon="shield-lock-outline"
                title="Security"
                hint="Password and session control"
                iconBg="#047857"
                iconColor={tokens.onPrimary}
                onPress={() => setPanel('security')}
              />
              <MenuRow
                icon="tune"
                title="App Preferences"
                hint="Theme, language, and display"
                iconBg="#6B21A8"
                iconColor={tokens.onPrimary}
                onPress={() => setPanel('preferences')}
              />
              <MenuRow
                icon="information-outline"
                title="About"
                hint="App information and help"
                last
                iconBg="#0369A1"
                iconColor={tokens.onPrimary}
                onPress={() => setPanel('about')}
              />
            </View>

            <AppearancePicker />

            <TouchableOpacity style={styles.logout} onPress={signOut} accessibilityRole="button" accessibilityLabel="Log Out">
              <MaterialCommunityIcons name="logout" size={18} color={tokens.error} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {panel === 'account' ? (
          <View style={[styles.panelCard, dark && styles.cardDark]}>
            <Field label="Full name" value={name} onChangeText={setName} />
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field label="Address" value={address} onChangeText={setAddress} />
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            <TouchableOpacity style={styles.primary} onPress={saveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color={tokens.onPrimary} /> : <Text style={styles.primaryText}>Save profile</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {panel === 'notifications' ? (
          <View>
            <Text style={[styles.help, dark && styles.mutedLight]}>
              Staff account, retrieval, and booklet alerts for this admin sign-in appear here.
            </Text>
            {notesLoading ? <ActivityIndicator color={tokens.primary} style={styles.spinner} /> : null}
            {!notesLoading && notes.length === 0 ? <Text style={styles.empty}>No notifications yet.</Text> : null}
            {notes.map((note) => (
              <NotificationCard
                key={note.id}
                title={note.title}
                body={note.body}
                createdAt={note.createdAt}
                statusLabel={labelForNotice(note.title, note.body)}
                tone={toneForNotice(note.title, note.body)}
                icon={iconForNotice(note.title, note.body)}
                unread={!note.readAt}
              />
            ))}
          </View>
        ) : null}

        {panel === 'security' ? (
          <View style={[styles.panelCard, dark && styles.cardDark]}>
            <Text style={[styles.help, dark && styles.mutedLight, styles.helpInCard]}>
              Change the password for this admin sign-in. Signed in as {user?.email || user?.name}.
            </Text>
            <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secure />
            <Field label="New password" value={nextPassword} onChangeText={setNextPassword} secure />
            <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secure />
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            <TouchableOpacity style={styles.primary} onPress={savePassword} disabled={saving}>
              {saving ? <ActivityIndicator color={tokens.onPrimary} /> : <Text style={styles.primaryText}>Update password</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sessionBtn} onPress={signOut}>
              <Text style={styles.sessionText}>End this session</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {panel === 'preferences' ? (
          <View>
            <AppearancePicker />
            <View style={[styles.panelCard, dark && styles.cardDark]}>
              <Text style={[styles.section, dark && styles.textLight]}>Archive display</Text>
              <Field label="Academic year" value={year} onChangeText={setYear} />
              <Field label="Dispatch window (hours)" value={hours} onChangeText={setHours} keyboardType="number-pad" />
              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
              <TouchableOpacity style={styles.primary} onPress={saveArchive}>
                <Text style={styles.primaryText}>Save settings</Text>
              </TouchableOpacity>
              <Text style={[styles.section, dark && styles.textLight]}>Faculties</Text>
              {settings.faculties.map((faculty) => (
                <Text key={faculty} style={styles.chip}>
                  {faculty}
                </Text>
              ))}
              <View style={styles.row}>
                <TextInput
                  style={[styles.inlineInput, dark && styles.inputDark]}
                  placeholder="Add faculty"
                  placeholderTextColor={tokens.placeholder}
                  value={facultyInput}
                  onChangeText={setFacultyInput}
                />
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => {
                    if (!facultyInput.trim()) return;
                    void updateSettings({ faculties: [...settings.faculties, facultyInput.trim()] });
                    setFacultyInput('');
                  }}
                >
                  <Text style={styles.smallBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.section, dark && styles.textLight]}>Sessions</Text>
              {settings.sessions.map((session) => (
                <Text key={session} style={styles.chip}>
                  {session}
                </Text>
              ))}
              <View style={styles.row}>
                <TextInput
                  style={[styles.inlineInput, dark && styles.inputDark]}
                  placeholder="Add session"
                  placeholderTextColor={tokens.placeholder}
                  value={sessionInput}
                  onChangeText={setSessionInput}
                />
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => {
                    if (!sessionInput.trim()) return;
                    void updateSettings({ sessions: [...settings.sessions, sessionInput.trim()] });
                    setSessionInput('');
                  }}
                >
                  <Text style={styles.smallBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

        {panel === 'about' ? (
          <BrandHero>
            <Text style={styles.aboutCopy}>
              Staff accounts, booklet uploads, and retrieval activity are managed from this admin portal.
            </Text>
          </BrandHero>
        ) : null}
      </ScrollView>
    </View>
  );
};

function BrandHero({ children }: { children?: React.ReactNode }) {
  return (
    <ImageBackground
      source={BRAND_BG}
      style={styles.brandCard}
      imageStyle={styles.brandImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={[overlay(tokens.primary, 0.9), overlay(tokens.secondary, 0.62), overlay('#93C5FD', 0.52)]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.brandOverlay}
      >
        <View style={styles.logoWell}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.brandTitle}>Umma University</Text>
        <Text style={styles.brandSub}>Examination Archive System</Text>
        {children}
      </LinearGradient>
    </ImageBackground>
  );
}

function MenuRow({
  icon,
  title,
  hint,
  iconBg,
  iconColor,
  onPress,
  last,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  hint: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <TouchableOpacity
      style={[styles.menuItem, !last && styles.menuItemBorder, dark && !last && styles.menuItemBorderDark]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={MENU_ICON} color={iconColor} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={[styles.menuTitle, dark && styles.textLight]}>{title}</Text>
        <Text style={styles.menuHint}>{hint}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={tokens.outline} />
    </TouchableOpacity>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  secure,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  secure?: boolean;
}) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, dark && styles.mutedLight]}>{label}</Text>
      <TextInput
        style={[styles.input, dark && styles.inputDark]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.background },
  screenDark: { backgroundColor: '#0F172A' },
  content: { padding: spacing.md, paddingBottom: 32 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: tokens.primary, fontFamily: 'serif' },
  pageSub: { fontSize: 13, color: tokens.onSurfaceVariant, marginBottom: spacing.md, marginTop: 4 },
  panelBack: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginLeft: -6 },
  brandCard: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  brandImage: {
    borderRadius: 22,
  },
  brandOverlay: {
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cardDark: { backgroundColor: '#1E293B', borderColor: '#334155' },
  logoWell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logo: { width: 40, height: 40 },
  brandTitle: { fontSize: 18, fontWeight: '700', color: tokens.onPrimary },
  brandSub: { color: 'rgba(255,255,255,0.88)', marginTop: 2, fontSize: 13 },
  menuCard: {
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: tokens.inputBorder },
  menuItemBorderDark: { borderBottomColor: '#334155' },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCopy: { flex: 1 },
  menuTitle: { fontWeight: '700', color: tokens.onSurface, fontSize: 15 },
  menuHint: { color: tokens.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  logout: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { color: tokens.error, fontWeight: '700', fontSize: 15 },
  panelCard: {
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
  },
  help: { color: tokens.onSurfaceVariant, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  helpInCard: { marginBottom: 16 },
  aboutCopy: {
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 0,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    lineHeight: 18,
  },
  empty: { color: tokens.placeholder, textAlign: 'center', marginTop: 24 },
  spinner: { marginTop: 16 },
  notice: { color: tokens.secondary, fontSize: 13, marginBottom: 8 },
  primary: {
    backgroundColor: tokens.primary,
    borderRadius: 12,
    minHeight: control.minTap,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryText: { color: tokens.onPrimary, fontWeight: '700' },
  sessionBtn: { alignItems: 'center', paddingVertical: 14 },
  sessionText: { color: tokens.error, fontWeight: '700' },
  section: { fontWeight: '700', color: tokens.primary, marginTop: 16, marginBottom: 8 },
  chip: {
    backgroundColor: tokens.roleLecturerBg,
    color: tokens.primary,
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallBtn: {
    backgroundColor: tokens.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    justifyContent: 'center',
  },
  smallBtnText: { color: tokens.onPrimary, fontWeight: '700' },
  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: tokens.onSurfaceVariant, marginBottom: 4 },
  input: {
    backgroundColor: tokens.background,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: tokens.onSurface,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: tokens.background,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: tokens.onSurface,
  },
  inputDark: { backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC' },
  textLight: { color: '#F8FAFC' },
  mutedLight: { color: '#94A3B8' },
});
