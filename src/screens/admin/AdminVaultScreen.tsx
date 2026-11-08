import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { adminPalette, useTheme } from '../../context/ThemeContext';
import { useVault } from '../../context/VaultContext';
import { ALL_FACULTIES, ALL_SESSIONS } from '../../types';

export const AdminVaultScreen: React.FC = () => {
  const { theme } = useTheme();
  const palette = adminPalette(theme);
  const { records, settings, addRecord } = useVault();
  const [show, setShow] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [shelf, setShelf] = useState('Shelf A1');

  const save = async () => {
    if (!courseCode.trim() || !courseName.trim() || !studentName.trim() || !admissionNumber.trim()) {
      Alert.alert('Missing fields', 'Course, student, and admission number are required.');
      return;
    }
    await addRecord({
      courseCode: courseCode.trim(),
      courseName: courseName.trim(),
      session: settings.sessions[0] || ALL_SESSIONS,
      faculty: settings.faculties[0] || ALL_FACULTIES,
      studentName: studentName.trim(),
      admissionNumber: admissionNumber.trim(),
      shelf,
      rack: 'Rack 01',
      box: 'Box 01',
      pos: 'Pos 01',
      status: 'Original Booklet',
      vaultStatus: 'Verified in Vault',
      scriptCount: 1,
      isRequested: false,
    });
    setShow(false);
    setCourseCode('');
    setCourseName('');
    setStudentName('');
    setAdmissionNumber('');
  };

  const fieldStyle = {
    backgroundColor: palette.field,
    borderColor: palette.line,
    color: palette.ink,
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.page }]}>
      <LecturerTopHeader subtitle="Admin Portal" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: palette.ink }]}>Records</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShow(true)}>
            <Text style={styles.addBtnText}>Add record</Text>
          </TouchableOpacity>
        </View>
        {records.map((rec) => (
          <View
            key={rec.id}
            style={[styles.card, { backgroundColor: palette.card, borderColor: palette.line }]}
          >
            <Text style={styles.code}>
              {rec.courseCode} • {rec.faculty}
            </Text>
            <Text style={[styles.name, { color: palette.ink }]}>{rec.courseName}</Text>
            <Text style={[styles.meta, { color: palette.muted }]}>
              {rec.studentName} • {rec.admissionNumber}
            </Text>
            <Text style={[styles.meta, { color: palette.muted }]}>
              {rec.session} • {rec.vaultStatus}
            </Text>
          </View>
        ))}
      </ScrollView>
      <Modal visible={show} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: palette.card, maxHeight: '90%' }]}>
            <KeyboardScrollView bottomOffset={16} showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, { color: palette.ink }]}>New vault record</Text>
              <TextInput
                style={[styles.input, fieldStyle]}
                placeholder="Unit code"
                placeholderTextColor={palette.muted}
                value={courseCode}
                onChangeText={setCourseCode}
              />
              <TextInput
                style={[styles.input, fieldStyle]}
                placeholder="Unit name"
                placeholderTextColor={palette.muted}
                value={courseName}
                onChangeText={setCourseName}
              />
              <TextInput
                style={[styles.input, fieldStyle]}
                placeholder="Student name"
                placeholderTextColor={palette.muted}
                value={studentName}
                onChangeText={setStudentName}
              />
              <TextInput
                style={[styles.input, fieldStyle]}
                placeholder="Admission number"
                placeholderTextColor={palette.muted}
                value={admissionNumber}
                onChangeText={setAdmissionNumber}
              />
              <TextInput
                style={[styles.input, fieldStyle]}
                placeholder="Shelf"
                placeholderTextColor={palette.muted}
                value={shelf}
                onChangeText={setShelf}
              />
              <TouchableOpacity style={styles.primary} onPress={save}>
                <Text style={styles.primaryText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShow(false)}>
                <Text style={[styles.cancel, { color: palette.muted }]}>Cancel</Text>
              </TouchableOpacity>
            </KeyboardScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7FC' },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1E2B58', fontFamily: 'serif' },
  addBtn: { backgroundColor: '#35477B', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  code: { color: '#35477B', fontWeight: '700', fontSize: 12 },
  name: { fontWeight: '700', color: '#111827', marginTop: 4 },
  meta: { fontSize: 12, color: '#64748B', marginTop: 3 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18 },
  sheetTitle: { fontWeight: '700', fontSize: 18, color: '#1E2B58', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  primary: { backgroundColor: '#35477B', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  cancel: { textAlign: 'center', marginTop: 12, color: '#64748B' },
});
