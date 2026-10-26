import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AppearancePicker } from '../../components/AppearancePicker';
import { uploadAvatarFile } from '../../services/authService';
import { colors as tokens, control } from '../../theme';

const MENU_ICON_SIZE = 22;
const FALLBACK_AVATAR = require('../../../assets/officer-avatar.png');

type OfficerDetails = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

export const OfficerProfileView: React.FC<{
  intent: 'edit' | 'password' | 'privacy' | null;
  onIntentHandled: () => void;
}> = ({ intent, onIntentHandled }) => {
  const { user, logout, updateUserProfile, changePassword } = useAuth();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const displayName = user?.name?.trim() || 'Examination Officer';

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [draft, setDraft] = useState<OfficerDetails>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    address: user?.address ?? '',
  });
  const [pin, setPin] = useState('8421');
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [photoUri, setPhotoUri] = useState(user?.avatarUrl || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDraft({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
    });
    setPhotoUri(user.avatarUrl || '');
  }, [user]);

  useEffect(() => {
    if (!intent) return;
    if (intent === 'edit') openEdit();
    if (intent === 'password') openPassword();
    if (intent === 'privacy') openPrivacy();
    onIntentHandled();
  }, [intent, onIntentHandled]);

  const openEdit = () => {
    setDraft({
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      address: user?.address ?? '',
    });
    setNotice('');
    setShowEditProfileModal(true);
  };

  const openPassword = () => {
    setCurrentPassword('');
    setNextPassword('');
    setConfirmPassword('');
    setNotice('');
    setShowPasswordModal(true);
  };

  const openPrivacy = () => {
    setCurrentPin('');
    setNextPin('');
    setConfirmPin('');
    setNotice('');
    setShowPrivacyModal(true);
  };

  const chooseProfilePhoto = async () => {
    if (!user || uploadingPhoto) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to upload a profile picture.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    const asset = picked.assets?.[0];
    if (picked.canceled || !asset?.base64) return;
    setPhotoUri(asset.uri);
    setUploadingPhoto(true);
    try {
      const avatarUrl = await uploadAvatarFile(user.id, asset.base64);
      setPhotoUri(avatarUrl);
      await updateUserProfile({ avatarUrl });
      setNotice('Profile photo updated.');
    } catch (error) {
      setPhotoUri(user.avatarUrl || '');
      Alert.alert(
        'Photo not saved',
        error instanceof Error ? error.message : 'The profile photo could not be uploaded.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveProfile = async () => {
    const name = draft.name.trim();
    const email = draft.email.trim();
    const phone = draft.phone.trim();
    const address = draft.address.trim();
    if (!name || !email || !phone || !address) {
      setNotice('Name, email, phone, and address are required.');
      return;
    }
    setSavingProfile(true);
    setNotice('');
    try {
      await updateUserProfile({ name, email, phone, address });
      setNotice('Profile updated.');
      setShowEditProfileModal(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !nextPassword || !confirmPassword) {
      setNotice('Enter your current password and a new password.');
      return;
    }
    if (nextPassword !== confirmPassword) {
      setNotice('New password and confirmation do not match.');
      return;
    }
    setSavingPassword(true);
    setNotice('');
    try {
      const error = await changePassword(currentPassword, nextPassword);
      if (error) {
        setNotice(error);
        return;
      }
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      setShowPasswordModal(false);
      setNotice('Password updated.');
    } finally {
      setSavingPassword(false);
    }
  };

  const savePin = () => {
    if (currentPin !== pin) {
      setNotice('Current PIN does not match.');
      return;
    }
    if (!/^\d{4}$/.test(nextPin)) {
      setNotice('Enter a 4-digit PIN.');
      return;
    }
    if (nextPin !== confirmPin) {
      setNotice('New PIN and confirmation do not match.');
      return;
    }
    setPin(nextPin);
    setCurrentPin('');
    setNextPin('');
    setConfirmPin('');
    setNotice('Vault PIN updated.');
  };

  const signOut = () => {
    Alert.alert('Log out', 'Leave the officer portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.screenContainer, dark && styles.screenDark]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.identity}>
            <View style={styles.avatarWrap}>
              <Image
                source={photoUri ? { uri: photoUri } : FALLBACK_AVATAR}
                style={styles.avatarPhoto}
              />
              <TouchableOpacity
                style={styles.cameraBadge}
                onPress={chooseProfilePhoto}
                disabled={uploadingPhoto}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Upload profile photo"
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color={tokens.primary} />
                ) : (
                  <Feather name="camera" size={14} color={tokens.primary} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName} numberOfLines={2}>
              {displayName}
            </Text>
            <View style={styles.rolePill}>
              <MaterialCommunityIcons name="shield-check" size={14} color={tokens.onPrimary} />
              <Text style={styles.rolePillText}>Examination Officer</Text>
            </View>
            <Text style={styles.facultyText}>@{user?.username || 'officer'}</Text>
          </View>
        </View>

        {notice ? (
          <TouchableOpacity style={styles.banner} onPress={() => setNotice('')}>
            <Text style={styles.bannerText}>{notice}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={[styles.menuCard, dark && styles.cardDark]}>
          <MenuRow
            icon="account-edit-outline"
            title="Edit Profile"
            iconBg="#1E3A8A"
            iconColor={tokens.onPrimary}
            onPress={openEdit}
          />
          <View style={[styles.rowDivider, dark && styles.dividerDark]} />
          <MenuRow
            icon="lock-outline"
            title="Change Password"
            iconBg="#C2410C"
            iconColor={tokens.onPrimary}
            onPress={openPassword}
          />
          <View style={[styles.rowDivider, dark && styles.dividerDark]} />
          <MenuRow
            icon="shield-lock-outline"
            title="Privacy and Security"
            iconBg="#047857"
            iconColor={tokens.onPrimary}
            onPress={openPrivacy}
          />
        </View>

        <AppearancePicker />

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={signOut}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Log Out"
        >
          <MaterialCommunityIcons name="logout" size={MENU_ICON_SIZE} color={tokens.onPrimary} />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showEditProfileModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
            <View style={[styles.modalCard, dark && styles.cardDark]}>
              <Text style={[styles.modalHeading, dark && styles.textLight]}>Edit Profile</Text>
              <Field label="Full name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
              <Field
                label="Official email"
                value={draft.email}
                onChangeText={(email) => setDraft({ ...draft, email })}
                keyboardType="email-address"
              />
              <Field
                label="Phone number"
                value={draft.phone}
                onChangeText={(phone) => setDraft({ ...draft, phone })}
                keyboardType="phone-pad"
              />
              <Field label="Address" value={draft.address} onChangeText={(address) => setDraft({ ...draft, address })} />
              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, dark && styles.modalCancelDark]}
                  onPress={() => setShowEditProfileModal(false)}
                >
                  <Text style={[styles.modalCancelBtnText, dark && styles.textLight]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={saveProfile} disabled={savingProfile}>
                  {savingProfile ? (
                    <ActivityIndicator color={tokens.onPrimary} />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>Save profile</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
            <View style={[styles.modalCard, dark && styles.cardDark]}>
              <Text style={[styles.modalHeading, dark && styles.textLight]}>Change Password</Text>
              <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secure />
              <Field label="New password" value={nextPassword} onChangeText={setNextPassword} secure />
              <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secure />
              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, dark && styles.modalCancelDark]}
                  onPress={() => setShowPasswordModal(false)}
                >
                  <Text style={[styles.modalCancelBtnText, dark && styles.textLight]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={savePassword} disabled={savingPassword}>
                  {savingPassword ? (
                    <ActivityIndicator color={tokens.onPrimary} />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>Update password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showPrivacyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScroll}>
            <View style={[styles.modalCard, dark && styles.cardDark]}>
              <Text style={[styles.modalHeading, dark && styles.textLight]}>Privacy and Security</Text>
              <Text style={[styles.privacyCopy, dark && styles.mutedLight]}>
                Scanned booklets and officer details stay in the exam archive. Only staff with access can retrieve them.
              </Text>
              <Text style={[styles.modalHeading, styles.pinHeading, dark && styles.textLight]}>Vault PIN</Text>
              <Text style={[styles.pinHint, dark && styles.mutedLight]}>Current vault PIN {'•'.repeat(pin.length)}</Text>
              <Field label="Current PIN" value={currentPin} onChangeText={setCurrentPin} keyboardType="number-pad" secure />
              <Field label="New PIN" value={nextPin} onChangeText={setNextPin} keyboardType="number-pad" secure />
              <Field label="Confirm new PIN" value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" secure />
              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, dark && styles.modalCancelDark]}
                  onPress={() => setShowPrivacyModal(false)}
                >
                  <Text style={[styles.modalCancelBtnText, dark && styles.textLight]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={savePin}>
                  <Text style={styles.modalSaveBtnText}>Update PIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

function MenuRow({
  icon,
  title,
  iconBg,
  iconColor,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={MENU_ICON_SIZE} color={iconColor} />
      </View>
      <Text style={[styles.menuItemTitle, dark && styles.textLight]}>{title}</Text>
      <Feather name="chevron-right" size={20} color={tokens.secondary} />
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
    <View style={styles.fieldWrap}>
      <Text style={[styles.modalInputLabel, dark && styles.mutedLight]}>{label}</Text>
      <TextInput
        style={[styles.modalInput, dark && styles.modalInputDark]}
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
  screenContainer: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  screenDark: {
    backgroundColor: '#0F172A',
  },
  cardDark: {
    backgroundColor: '#1E293B',
  },
  textLight: {
    color: '#F8FAFC',
  },
  mutedLight: {
    color: '#94A3B8',
  },
  dividerDark: {
    backgroundColor: '#334155',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },
  profileCard: {
    backgroundColor: tokens.primary,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    marginBottom: 18,
    shadowColor: tokens.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  identity: {
    alignItems: 'center',
  },
  avatarWrap: {
    width: 96,
    height: 96,
    marginBottom: 14,
  },
  avatarPhoto: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: tokens.primaryContainer,
    borderWidth: 3,
    borderColor: tokens.onPrimary,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: tokens.onPrimary,
    borderWidth: 3,
    borderColor: tokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: tokens.onPrimary,
    textAlign: 'center',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
    marginTop: 8,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.onPrimary,
  },
  facultyText: {
    fontSize: 14,
    color: tokens.surfaceContainerHighest,
    textAlign: 'center',
    marginTop: 8,
  },
  banner: {
    marginBottom: 12,
    backgroundColor: tokens.statusVerifiedBg,
    borderRadius: 12,
    padding: 10,
  },
  bannerText: { color: tokens.statusVerifiedText, fontWeight: '700', textAlign: 'center' },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: control.minTap,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 64,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.primary,
    borderRadius: 12,
    minHeight: 48,
    marginTop: 8,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: tokens.onPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E2B58',
    marginBottom: 12,
  },
  pinHeading: {
    marginTop: 18,
  },
  privacyCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    marginBottom: 4,
  },
  pinHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  fieldWrap: {
    marginBottom: 4,
  },
  modalInputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#1E293B',
  },
  modalInputDark: {
    backgroundColor: '#0F172A',
    color: '#E2E8F0',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelDark: {
    backgroundColor: '#334155',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalSaveBtn: {
    backgroundColor: tokens.primary,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.onPrimary,
  },
  notice: { color: '#B45309', fontWeight: '600', marginTop: 8 },
});
