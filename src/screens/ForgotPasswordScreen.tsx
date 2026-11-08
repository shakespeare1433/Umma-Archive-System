import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { KeyboardScrollView } from '../components/KeyboardScrollView';

type ForgotNavProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
type ForgotRouteProp = RouteProp<RootStackParamList, 'ForgotPassword'>;

interface Props {
  navigation: ForgotNavProp;
  route: ForgotRouteProp;
}

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { requestPasswordReset } = useAuth();
  const [identifier, setIdentifier] = useState(route.params?.emailOrUser || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState<string | undefined>();

  const handleReset = async () => {
    if (!identifier.trim()) {
      setError('Please enter your email or username');
      return;
    }
    if (password.trim().length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setError(undefined);
    setLoading(true);
    const result = await requestPasswordReset(identifier, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccessMessage(result.message);
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardScrollView bottomOffset={32} contentContainerStyle={styles.scrollContent}>
          <View style={styles.ambientDisc} />

          <View style={styles.card}>
            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/exam-archive-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.subtitle}>
              Enter your username or email, then create a new password you can use to sign in.
            </Text>

            {submitted ? (
              <View style={styles.successBox}>
                <View style={styles.successIconCircle}>
                  <MaterialIcons name="check-circle" size={32} color="#16A34A" />
                </View>
                <Text style={styles.successTitle}>Password Ready</Text>
                <Text style={styles.successMessage}>{successMessage}</Text>
                <Button
                  title="Back to Sign In"
                  onPress={() => navigation.navigate('SignIn')}
                  style={styles.backButton}
                />
              </View>
            ) : (
              <View style={styles.form}>
                <Input
                  label="Email or Username"
                  placeholder="e.g., jane.doe@example.com"
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (error) setError(undefined);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Input
                  label="New Password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError(undefined);
                  }}
                  secureTextEntry
                />

                <Input
                  label="Confirm New Password"
                  placeholder="Type the new password again"
                  value={confirm}
                  onChangeText={(text) => {
                    setConfirm(text);
                    if (error) setError(undefined);
                  }}
                  secureTextEntry
                  error={error}
                />

                <Button
                  title="Create Password"
                  iconName="lock-reset"
                  onPress={handleReset}
                  loading={loading}
                  style={styles.resetButton}
                />

                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.returnButton}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="arrow-back" size={16} color="#1E3A8A" />
                  <Text style={styles.returnText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
      </KeyboardScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EBF4F6',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  ambientDisc: {
    position: 'absolute',
    top: 60,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(210, 235, 255, 0.6)',
  },
  logoWrap: { alignItems: 'center', marginBottom: 4 },
  logo: { width: 96, height: 96 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0B1C30',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  form: {
    width: '100%',
  },
  resetButton: {
    marginTop: 10,
    backgroundColor: '#1E3A8A',
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 6,
  },
  returnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B1C30',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#1E3A8A',
  },
});
