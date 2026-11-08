import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { KeyboardScrollView } from '../components/KeyboardScrollView';
import { colors, spacing } from '../theme';

type SignInNavProp = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;

interface Props {
  navigation: SignInNavProp;
}

export const SignInScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  const handleSignIn = () => {
    const newErrors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      newErrors.username = 'Please enter your email or username';
    }
    if (!password) {
      newErrors.password = 'Please enter your password';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    login(username.trim(), password)
      .then((error) => {
        setLoading(false);
        if (error) {
          Alert.alert('Sign in failed', error);
          return;
        }
      })
      .catch(() => {
        setLoading(false);
        Alert.alert('Sign in failed', 'Please try again.');
      });
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

          <Text style={styles.title}>Welcome Back</Text>

          <View style={styles.form}>
            <Input
              label="Email or username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (errors.username) setErrors({ ...errors, username: undefined });
              }}
              error={errors.username}
              autoCorrect={false}
              returnKeyType="next"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors({
                  ...errors,
                  password:
                    text.length > 0 && text.length < 8
                      ? 'Password must be at least 8 characters'
                      : undefined,
                });
              }}
              error={errors.password}
              isPassword
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />

            <Button
              title="Sign In"
              onPress={handleSignIn}
              loading={loading}
              style={styles.signInButton}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword', { emailOrUser: username })}
              style={styles.forgotPasswordButton}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 16,
  },
  form: {
    width: '100%',
  },
  signInButton: {
    marginTop: 12,
    backgroundColor: '#1E3A8A',
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    paddingVertical: 14,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
    textDecorationLine: 'underline',
  },
});
