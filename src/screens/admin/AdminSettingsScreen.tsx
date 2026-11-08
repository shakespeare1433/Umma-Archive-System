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
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { AppearancePicker } from '../../components/AppearancePicker';
import { NotificationCard, iconForNotice, labelForNotice, toneForNotice } from '../../components/NotificationCard';
import { useAuth } from '../../context/AuthContext';
import { adminPalette, useTheme } from '../../context/ThemeContext';
import { useVault } from '../../context/VaultContext';
import {
  addAcademicSession,
  addProgramme,
  addSchool,
  loadAcademicSessions,
  loadProgrammesBySchool,
  loadSchools,
  removeAcademicSession,
  removeProgramme,
} from '../../services/catalogService';
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
  preferences: { title: 'App Preferences', subtitle: 'Theme, schools, programmes, and sessions' },
  about: { title: 'About', subtitle: 'App information and help' },
};

export const AdminSettingsScreen: React.FC = () => {
  const { logout, user, updateUserProfile, changePassword } = useAuth();
  const { settings, updateSettings } = useVault();
  const { theme } = useTheme();
  const palette = adminPalette(theme);
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
  const [programmeSchool, setProgrammeSchool] = useState('');
  const [programmeInput, setProgrammeInput] = useState('');
  const [liveSchools, setLiveSchools] = useState<string[]>([]);
  const [liveProgrammes, setLiveProgrammes] = useState<Record<string, string[]>>({});
  const [liveSessions, setLiveSessions] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
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

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [schools, programmes, sessions] = await Promise.all([
        loadSchools(),
        loadProgrammesBySchool(),
        loadAcademicSessions(),
      ]);
      setLiveSchools(schools);
      setLiveProgrammes(programmes);
      setLiveSessions(sessions);
      setProgrammeSchool((current) => (current && schools.includes(current) ? current : schools[0] || ''));
    } catch {
      setLiveSchools(settings.faculties);
      setLiveSessions(settings.sessions);
    } finally {
      setCatalogLoading(false);
    }
  }, [settings.faculties, settings.sessions]);

  useEffect(() => {
    if (panel === 'notifications') void loadNotes();
  }, [panel, loadNotes]);

  useEffect(() => {
    if (panel === 'preferences') void loadCatalog();
  }, [panel, loadCatalog]);

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
    setSaving(true);
    setNotice('');
    try {
      await updateSettings({
        academicYear: year.trim() || settings.academicYear,
        dispatchHours: Number.isFinite(parsed) && parsed > 0 ? parsed : settings.dispatchHours,
        faculties: liveSchools.length ? liveSchools : settings.faculties,
        sessions: liveSessions.length ? liveSessions : settings.sessions,
      });
      setNotice('Archive settings saved. Officers and lecturers use the school, programme, and session lists below.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const addSchoolItem = async () => {
    const value = facultyInput.trim();
    if (!value) return;
    setSaving(true);
    setNotice('');
    try {
      await addSchool(value);
      const nextSchools = liveSchools.includes(value) ? liveSchools : [...liveSchools, value].sort((a, b) => a.localeCompare(b));
      setLiveSchools(nextSchools);
      setFacultyInput('');
      await updateSettings({ faculties: nextSchools });
      setNotice('School added for officer archive and lecturer search.');
      await loadCatalog();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not add school.');
    } finally {
      setSaving(false);
    }
  };

  const addSessionItem = async () => {
    const value = sessionInput.trim();
    if (!value) return;
    setSaving(true);
    setNotice('');
    try {
      await addAcademicSession(value);
      const nextSessions = liveSessions.includes(value)
        ? liveSessions
        : [...liveSessions, value].sort((a, b) => a.localeCompare(b));
      setLiveSessions(nextSessions);
      setSessionInput('');
      await updateSettings({ sessions: nextSessions });
      setNotice('Academic session added for officers and lecturers.');
      await loadCatalog();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not add session.');
    } finally {
      setSaving(false);
    }
  };

  const addProgrammeItem = async () => {
    const school = programmeSchool.trim();
    const code = programmeInput.trim();
    if (!school || !code) {
      setNotice('Choose a school and enter a programme code.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      await addProgramme(school, code);
      setProgrammeInput('');
      setNotice(`Programme ${code} added under ${school}.`);
      await loadCatalog();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not add programme.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSessionItem = (value: string) => {
    Alert.alert('Remove session', `Remove “${value}” from officer and lecturer lists?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true);
            setNotice('');
            try {
              await removeAcademicSession(value);
              const nextSessions = liveSessions.filter((item) => item !== value);
              setLiveSessions(nextSessions);
              await updateSettings({ sessions: nextSessions });
              setNotice('Session removed.');
            } catch (error) {
              setNotice(error instanceof Error ? error.message : 'Could not remove session.');
            } finally {
              setSaving(false);
            }
          })();
        },
      },
    ]);
  };

  const deleteProgrammeItem = (school: string, code: string) => {
    Alert.alert('Remove programme', `Remove ${code} from ${school}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true);
            setNotice('');
            try {
              await removeProgramme(school, code);
              setNotice(`Programme ${code} removed.`);
              await loadCatalog();
            } catch (error) {
              setNotice(error instanceof Error ? error.message : 'Could not remove programme.');
            } finally {
              setSaving(false);
            }
          })();
        },
      },
    ]);
  };

  const signOut = () => {
    Alert.alert('Log out', 'Leave the admin portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.page }]}>
      <LecturerTopHeader subtitle="Admin Portal" />
      <KeyboardScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {panel ? (
          <TouchableOpacity style={styles.panelBack} onPress={closePanel} accessibilityRole="button" accessibilityLabel="Back to settings">
            <Feather name="chevron-left" size={20} color={tokens.primary} />
            <View>
              <Text style={[styles.pageTitle, { color: palette.ink }]}>{header.title}</Text>
              <Text style={[styles.pageSub, { color: palette.muted }]}>{header.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={[styles.pageTitle, { color: palette.ink }]}>Settings</Text>
            <Text style={[styles.pageSub, { color: palette.muted }]}>System preferences and security</Text>
          </>
        )}
        {panel === null ? (
          <>
            <BrandHero />

            <View style={[styles.menuCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
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
                hint="Theme, schools, programmes, and sessions"
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
              <MaterialCommunityIcons name="logout" size={18} color={tokens.onPrimary} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {panel === 'account' ? (
          <View style={[styles.panelCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
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
            <Text style={[styles.help, { color: palette.muted }]}>
              Staff account, retrieval, and booklet alerts for this admin sign-in appear here.
            </Text>
            {notesLoading ? <ActivityIndicator color={tokens.primary} style={styles.spinner} /> : null}
            {!notesLoading && notes.length === 0 ? (
              <Text style={[styles.empty, { color: palette.muted }]}>No notifications yet.</Text>
            ) : null}
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
          <View style={[styles.panelCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
            <Text style={[styles.help, { color: palette.muted }, styles.helpInCard]}>
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
            <Text style={[styles.help, { color: palette.muted }]}>
              These lists power officer archive forms and lecturer search. Changes here show up for both roles.
            </Text>

            <View style={[styles.panelCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
              <Text style={[styles.section, styles.sectionFirst, { color: palette.ink }]}>Archive display</Text>
              <Field label="Academic year" value={year} onChangeText={setYear} />
              <Field label="Dispatch window (hours)" value={hours} onChangeText={setHours} keyboardType="number-pad" />
              <TouchableOpacity style={styles.primary} onPress={() => void saveArchive()} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={tokens.onPrimary} />
                ) : (
                  <Text style={styles.primaryText}>Save display settings</Text>
                )}
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.panelCard,
                styles.aboutCardGap,
                { backgroundColor: palette.card, borderColor: palette.line },
              ]}
            >
              <View style={styles.prefHead}>
                <Text style={[styles.section, styles.sectionFirst, { color: palette.ink }]}>
                  Schools (officer + lecturer)
                </Text>
                {catalogLoading ? <ActivityIndicator color={tokens.primary} /> : null}
              </View>
              {liveSchools.length === 0 ? (
                <Text style={[styles.emptyInline, { color: palette.muted }]}>No schools loaded yet.</Text>
              ) : (
                liveSchools.map((faculty) => (
                  <Text key={faculty} style={[styles.chip, { color: palette.ink, backgroundColor: palette.soft }]}>
                    {faculty}
                  </Text>
                ))
              )}
              <View style={styles.row}>
                <TextInput
                  style={[
                    styles.inlineInput,
                    { backgroundColor: palette.field, borderColor: palette.line, color: palette.ink },
                  ]}
                  placeholder="Add school"
                  placeholderTextColor={palette.muted}
                  value={facultyInput}
                  onChangeText={setFacultyInput}
                />
                <TouchableOpacity style={styles.smallBtn} onPress={() => void addSchoolItem()} disabled={saving}>
                  <Text style={styles.smallBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.panelCard,
                styles.aboutCardGap,
                { backgroundColor: palette.card, borderColor: palette.line },
              ]}
            >
              <Text style={[styles.section, styles.sectionFirst, { color: palette.ink }]}>
                Programmes by school
              </Text>
              <Text style={[styles.help, styles.helpInCard, { color: palette.muted }]}>
                Officers pick these when archiving. Lecturers use them when searching.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.schoolChipRow}>
                {liveSchools.map((school) => {
                  const on = programmeSchool === school;
                  return (
                    <TouchableOpacity
                      key={school}
                      style={[
                        styles.schoolChip,
                        { backgroundColor: on ? tokens.primary : palette.soft },
                      ]}
                      onPress={() => setProgrammeSchool(school)}
                    >
                      <Text style={[styles.schoolChipText, { color: on ? tokens.onPrimary : palette.ink }]} numberOfLines={1}>
                        {school.replace('School of ', '')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {(liveProgrammes[programmeSchool] || []).length === 0 ? (
                <Text style={[styles.emptyInline, { color: palette.muted }]}>
                  No programmes listed for this school yet.
                </Text>
              ) : (
                (liveProgrammes[programmeSchool] || []).map((code) => (
                  <View key={`${programmeSchool}-${code}`} style={styles.prefItemRow}>
                    <Text style={[styles.chip, styles.prefItemChip, { color: palette.ink, backgroundColor: palette.soft }]}>
                      {code}
                    </Text>
                    <TouchableOpacity
                      onPress={() => deleteProgrammeItem(programmeSchool, code)}
                      hitSlop={8}
                      accessibilityLabel={`Remove ${code}`}
                    >
                      <Feather name="x" size={16} color={palette.muted} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <View style={styles.row}>
                <TextInput
                  style={[
                    styles.inlineInput,
                    { backgroundColor: palette.field, borderColor: palette.line, color: palette.ink },
                  ]}
                  placeholder="Add programme code"
                  placeholderTextColor={palette.muted}
                  autoCapitalize="characters"
                  value={programmeInput}
                  onChangeText={setProgrammeInput}
                />
                <TouchableOpacity style={styles.smallBtn} onPress={() => void addProgrammeItem()} disabled={saving}>
                  <Text style={styles.smallBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.panelCard,
                styles.aboutCardGap,
                { backgroundColor: palette.card, borderColor: palette.line },
              ]}
            >
              <Text style={[styles.section, styles.sectionFirst, { color: palette.ink }]}>
                Academic sessions
              </Text>
              {liveSessions.length === 0 ? (
                <Text style={[styles.emptyInline, { color: palette.muted }]}>No sessions loaded yet.</Text>
              ) : (
                liveSessions.map((session) => (
                  <View key={session} style={styles.prefItemRow}>
                    <Text style={[styles.chip, styles.prefItemChip, { color: palette.ink, backgroundColor: palette.soft }]}>
                      {session}
                    </Text>
                    <TouchableOpacity
                      onPress={() => deleteSessionItem(session)}
                      hitSlop={8}
                      accessibilityLabel={`Remove ${session}`}
                    >
                      <Feather name="x" size={16} color={palette.muted} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <View style={styles.row}>
                <TextInput
                  style={[
                    styles.inlineInput,
                    { backgroundColor: palette.field, borderColor: palette.line, color: palette.ink },
                  ]}
                  placeholder="e.g. 2027 Jan – Apr"
                  placeholderTextColor={palette.muted}
                  value={sessionInput}
                  onChangeText={setSessionInput}
                />
                <TouchableOpacity style={styles.smallBtn} onPress={() => void addSessionItem()} disabled={saving}>
                  <Text style={styles.smallBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          </View>
        ) : null}

        {panel === 'about' ? (
          <View>
            <BrandHero>
              <Text style={styles.aboutCopy}>Umma Exam Archive · Version 1.0.0</Text>
            </BrandHero>

            <View style={[styles.panelCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
              <Text style={[styles.section, styles.sectionFirst, { color: palette.ink }]}>App information</Text>
              <AboutRow
                label="App name"
                value="Umma Exam Archive"
                ink={palette.ink}
                muted={palette.muted}
                line={palette.line}
              />
              <AboutRow
                label="Version"
                value="1.0.0"
                ink={palette.ink}
                muted={palette.muted}
                line={palette.line}
              />
              <AboutRow
                label="Institution"
                value="Umma University"
                ink={palette.ink}
                muted={palette.muted}
                line={palette.line}
              />
              <AboutRow
                label="Purpose"
                value="Store, organise, and retrieve examination booklets and PDFs by school, session, and unit."
                ink={palette.ink}
                muted={palette.muted}
                line={palette.line}
                last
              />
            </View>

            <View
              style={[
                styles.panelCard,
                styles.aboutCardGap,
                { backgroundColor: palette.card, borderColor: palette.line },
              ]}
            >
              <Text style={[styles.section, styles.sectionFirst, { color: palette.ink }]}>
                What admins can do
              </Text>
              <HelpBullet text="Create and replace lecturer and examination officer accounts from Users." muted={palette.muted} />
              <HelpBullet text="Monitor uploads, downloads, and locate requests from Activity and the home tiles." muted={palette.muted} />
              <HelpBullet text="Manage schools, programmes, and sessions under App Preferences so officers and lecturers see the same lists." muted={palette.muted} />
              <HelpBullet
                text="Change your admin password and end the current session from Security."
                muted={palette.muted}
                last
              />
            </View>

            <View
              style={[
                styles.panelCard,
                styles.aboutCardGap,
                { backgroundColor: palette.card, borderColor: palette.line },
              ]}
            >
              <Text style={[styles.section, styles.sectionFirst, { color: palette.ink }]}>Help</Text>
              <HelpBullet text="Home tiles open the matching Users or Activity filter when tapped." muted={palette.muted} />
              <HelpBullet text="Pull down on Home or Activity to refresh live counts and recent events." muted={palette.muted} />
              <HelpBullet text="Use Appearance in Settings to switch light or dark mode for the whole admin portal." muted={palette.muted} />
              <HelpBullet
                text="For account or archive issues, contact the examinations office or your system administrator."
                muted={palette.muted}
                last
              />
            </View>
          </View>
        ) : null}
      </KeyboardScrollView>
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

function AboutRow({
  label,
  value,
  ink,
  muted,
  line,
  last,
}: {
  label: string;
  value: string;
  ink: string;
  muted: string;
  line: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.aboutRow, !last && { borderBottomWidth: 1, borderBottomColor: line }]}>
      <Text style={[styles.aboutLabel, { color: muted }]}>{label}</Text>
      <Text style={[styles.aboutValue, { color: ink }]}>{value}</Text>
    </View>
  );
}

function HelpBullet({ text, muted, last }: { text: string; muted: string; last?: boolean }) {
  return (
    <View style={[styles.helpBullet, last && styles.helpBulletLast]}>
      <View style={[styles.helpDot, { backgroundColor: muted }]} />
      <Text style={[styles.helpBulletText, { color: muted }]}>{text}</Text>
    </View>
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
  const palette = adminPalette(theme);
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
        <Text style={[styles.menuTitle, { color: palette.ink }]}>{title}</Text>
        <Text style={[styles.menuHint, { color: palette.muted }]}>{hint}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={palette.muted} />
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
    backgroundColor: tokens.primary,
    borderRadius: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { color: tokens.onPrimary, fontWeight: '700', fontSize: 15 },
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
  aboutCardGap: { marginTop: 12 },
  sectionFirst: { marginTop: 0 },
  aboutRow: { paddingVertical: 10 },
  aboutLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  aboutValue: { marginTop: 4, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  helpBullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  helpBulletLast: { marginBottom: 0 },
  helpDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  helpBulletText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500' },
  prefHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  emptyInline: { fontSize: 13, marginBottom: 10 },
  schoolChipRow: { gap: 8, paddingBottom: 12 },
  schoolChip: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 180,
  },
  schoolChipText: { fontSize: 12, fontWeight: '700' },
  prefItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  prefItemChip: { flex: 1, marginBottom: 0 },
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
