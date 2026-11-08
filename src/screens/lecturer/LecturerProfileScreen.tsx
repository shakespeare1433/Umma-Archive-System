import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { AppearancePicker } from '../../components/AppearancePicker';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { uploadAvatarFile } from '../../services/authService';
import { colors as tokens, control } from '../../theme';
import * as ImagePicker from 'expo-image-picker';

const MENU_ICON_SIZE = 22;

interface Props {
  onLogoutPress?: () => void;
}

export const LecturerProfileScreen: React.FC<Props> = ({ onLogoutPress }) => {
  const { user, updateUserProfile, replaceLogin, logout } = useAuth();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const displayName = user?.name ?? '';
  const displayEmail = user?.email ?? '';
  const displaySchool = user?.faculty?.trim() ? user.faculty : 'Not set';

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [editName, setEditName] = useState(displayName);
  const [editEmail, setEditEmail] = useState(displayEmail);
  const [editPhone, setEditPhone] = useState(user?.phone ?? '');
  const [editSchool, setEditSchool] = useState(user?.faculty ?? '');
  const [editDepartment, setEditDepartment] = useState(user?.department ?? '');
  const [editAddress, setEditAddress] = useState(user?.address ?? '');

  const [nextUsername, setNextUsername] = useState(user?.username ?? '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState(user?.avatarUrl || '');

  useEffect(() => {
    if (user?.avatarUrl) setPhotoUri(user.avatarUrl);
  }, [user?.avatarUrl]);

  const openManageProfile = () => {
    setEditName(displayName);
    setEditEmail(displayEmail);
    setEditPhone(user?.phone ?? '');
    setEditSchool(user?.faculty ?? '');
    setEditDepartment(user?.department ?? '');
    setEditAddress(user?.address ?? '');
    setShowEditProfileModal(true);
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
    } catch (error) {
      setPhotoUri(user.avatarUrl || '');
      Alert.alert('Photo not saved', error instanceof Error ? error.message : 'The profile photo could not be uploaded.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = () => {
    updateUserProfile({
      name: editName.trim() || displayName,
      email: editEmail.trim() || displayEmail,
      phone: editPhone.trim(),
      faculty: editSchool.trim(),
      department: editDepartment.trim(),
      address: editAddress.trim(),
    });
    setShowEditProfileModal(false);
    Alert.alert('Profile Updated', 'Your profile details have been saved successfully.');
  };

  const openReplaceLogin = () => {
    setNextUsername(user?.username ?? '');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setShowChangePasswordModal(true);
  };

  const handleReplaceLogin = async () => {
    if (!nextUsername.trim() || !currentPass || !newPass || !confirmPass) {
      Alert.alert('Error', 'Enter a username, your current password, and a new password.');
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    const error = await replaceLogin(currentPass, nextUsername, newPass);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setShowChangePasswordModal(false);
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    Alert.alert(
      'Login replaced',
      `You can sign in with ${nextUsername.trim().toLowerCase()} and the new password. You can change them again whenever you want.`
    );
  };

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'L';

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of Exam Archive Lecturer Portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          logout();
          if (onLogoutPress) onLogoutPress();
        },
      },
    ]);
  };

  return (
    <View style={[styles.screenContainer, dark && styles.screenDark]}>
      <LecturerTopHeader subtitle="Lecturer Portal" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.identity}>
            <View style={styles.avatarWrap}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarPhoto} />
              ) : (
                <View style={styles.initialsCircle}>
                  <Text style={styles.initialsText}>{initials}</Text>
                </View>
              )}
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
              {displayName || 'Lecturer'}
            </Text>

            <View style={styles.rolePill}>
              <MaterialCommunityIcons name="check-circle" size={14} color={tokens.onPrimary} />
              <Text style={styles.rolePillText}>{user?.role ?? 'Lecturer'}</Text>
            </View>

            <Text style={styles.facultyText} numberOfLines={2}>
              {displaySchool}
            </Text>
          </View>
        </View>

        <View style={[styles.menuCard, dark && styles.cardDark]}>
          <MenuRow
            icon="account-edit-outline"
            title="Edit Profile"
            iconBg="#1E3A8A"
            iconColor={tokens.onPrimary}
            onPress={openManageProfile}
          />
        </View>

        <Text style={[styles.sectionLabel, dark && styles.mutedLight]}>ACCOUNT</Text>
        <View style={[styles.menuCard, dark && styles.cardDark]}>
          <MenuRow
            icon="shield-outline"
            title="Password & Security"
            iconBg="#047857"
            iconColor={tokens.onPrimary}
            onPress={openReplaceLogin}
          />
        </View>

        <Text style={[styles.sectionLabel, dark && styles.mutedLight]}>PREFERENCES</Text>
        <View style={[styles.menuCard, dark && styles.cardDark]}>
          <MenuRow
            icon="file-document-outline"
            title="About Us"
            iconBg="#6B21A8"
            iconColor={tokens.onPrimary}
            onPress={() => setShowAboutModal(true)}
          />
          <View style={[styles.rowDivider, dark && styles.dividerDark]} />
          <MenuRow
            icon="help-circle-outline"
            title="Help Center"
            iconBg="#0369A1"
            iconColor={tokens.onPrimary}
            onPress={() => setShowHelpModal(true)}
          />
        </View>

        <AppearancePicker />

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
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
          <KeyboardScrollView bottomOffset={24} contentContainerStyle={styles.modalScroll}>
          <View style={[styles.modalCard, dark && styles.cardDark]}>
            <Text style={[styles.modalHeading, dark && styles.textLight]}>Edit Profile</Text>

            <Text style={[styles.modalInputLabel, dark && styles.mutedLight]}>Username</Text>
            <TextInput
              style={[styles.modalInput, dark && styles.modalInputDark]}
              value={user?.username ? `@${user.username}` : ''}
              editable={false}
            />

            <Text style={[styles.modalInputLabel, dark && styles.mutedLight]}>Full Name</Text>
            <TextInput
              style={[styles.modalInput, dark && styles.modalInputDark]}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={[styles.modalInputLabel, dark && styles.mutedLight]}>Email Address</Text>
            <TextInput
              style={[styles.modalInput, dark && styles.modalInputDark]}
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.modalInputLabel, dark && styles.mutedLight]}>Phone Number</Text>
            <TextInput
              style={[styles.modalInput, dark && styles.modalInputDark]}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />

            <Text style={[styles.modalInputLabel, dark && styles.mutedLight]}>School</Text>
            <TextInput
              style={[styles.modalInput, dark && styles.modalInputDark]}
              value={editSchool}
              onChangeText={setEditSchool}
            />

            <Text style={[styles.modalInputLabel, dark && styles.mutedLight]}>Department</Text>
            <TextInput
              style={[styles.modalInput, dark && styles.modalInputDark]}
              value={editDepartment}
              onChangeText={setEditDepartment}
            />

            <Text style={[styles.modalInputLabel, dark && styles.mutedLight]}>Address</Text>
            <TextInput
              style={[styles.modalInput, styles.modalAddress, dark && styles.modalInputDark]}
              value={editAddress}
              onChangeText={setEditAddress}
              multiline
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, dark && styles.modalCancelDark]}
                onPress={() => setShowEditProfileModal(false)}
              >
                <Text style={[styles.modalCancelBtnText, dark && styles.textLight]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveProfile}>
                <Text style={styles.modalSaveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardScrollView>
        </View>
      </Modal>

      <Modal visible={showChangePasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardScrollView bottomOffset={24} contentContainerStyle={styles.modalScroll}>
          <View style={[styles.modalCard, dark && styles.cardDark]}>
            <Text style={[styles.modalHeading, dark && styles.textLight]}>Password & Security</Text>

            <Text style={[styles.modalInputLabel, dark && styles.mutedLight]}>Username</Text>
            <TextInput
              style={[styles.modalInput, dark && styles.modalInputDark]}
              value={nextUsername}
              onChangeText={setNextUsername}
              autoCapitalize="none"
              placeholder="New username"
              placeholderTextColor="#94A3B8"
            />

            <Text style={[styles.modalInputLabel, dark && styles.mutedLight]}>Current Password</Text>
            <TextInput
              style={[styles.modalInput, dark && styles.modalInputDark]}
              value={currentPass}
              onChangeText={setCurrentPass}
              secureTextEntry
              placeholderTextColor="#94A3B8"
            />

            <Text style={[styles.modalInputLabel, dark && styles.mutedLight]}>New Password</Text>
            <TextInput
              style={[styles.modalInput, dark && styles.modalInputDark]}
              value={newPass}
              onChangeText={setNewPass}
              secureTextEntry
              placeholderTextColor="#94A3B8"
            />

            <Text style={[styles.modalInputLabel, dark && styles.mutedLight]}>Confirm New Password</Text>
            <TextInput
              style={[styles.modalInput, dark && styles.modalInputDark]}
              value={confirmPass}
              onChangeText={setConfirmPass}
              secureTextEntry
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, dark && styles.modalCancelDark]}
                onPress={() => setShowChangePasswordModal(false)}
              >
                <Text style={[styles.modalCancelBtnText, dark && styles.textLight]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleReplaceLogin}>
                <Text style={styles.modalSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardScrollView>
        </View>
      </Modal>

      <InfoModal
        visible={showAboutModal}
        title="About Us"
        onClose={() => setShowAboutModal(false)}
        body="UMMA Archive is the examination system for storing, organizing, and retrieving past examination papers by course, year, semester, and department."
      />
      <InfoModal
        visible={showHelpModal}
        title="Help Center"
        onClose={() => setShowHelpModal(false)}
        body="Search past papers from the Search tab. Booklets you open are kept under History. Use Password & Security on this page to replace your username and password whenever you want."
      />
    </View>
  );
};

function MenuRow({
  icon,
  title,
  value,
  iconBg,
  iconColor,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  value?: string;
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
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      <Feather name="chevron-right" size={20} color={tokens.secondary} />
    </TouchableOpacity>
  );
}

function InfoModal({
  visible,
  title,
  body,
  onClose,
}: {
  visible: boolean;
  title: string;
  body: string;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, dark && styles.cardDark]}>
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.modalHeading, styles.modalHeadingInline, dark && styles.textLight]}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={20} color={dark ? '#CBD5E1' : '#64748B'} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.infoBody, dark && styles.infoBodyDark]}>{body}</Text>
          <TouchableOpacity style={[styles.modalSaveBtn, styles.infoClose]} onPress={onClose}>
            <Text style={styles.modalSaveBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  initialsCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: tokens.primaryContainer,
    borderWidth: 3,
    borderColor: tokens.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPhoto: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: tokens.primaryContainer,
    borderWidth: 3,
    borderColor: tokens.onPrimary,
  },
  initialsText: {
    color: tokens.onPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9AA3B2',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 6,
  },
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
  menuValue: {
    fontSize: 12,
    color: '#9CA3AF',
    marginRight: 6,
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
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E2B58',
    marginBottom: 12,
  },
  modalHeadingInline: {
    marginBottom: 0,
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
  modalAddress: {
    height: 72,
    paddingTop: 10,
    textAlignVertical: 'top',
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
    backgroundColor: '#35477B',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoBody: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    marginTop: 12,
  },
  infoBodyDark: {
    color: '#CBD5E1',
  },
  infoClose: {
    marginTop: 16,
  },
});
