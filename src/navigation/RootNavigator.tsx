import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingArchiveScreen } from '../screens/OnboardingArchiveScreen';
import { OnboardingSearchScreen } from '../screens/OnboardingSearchScreen';
import { OnboardingLocateScreen } from '../screens/OnboardingLocateScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SearchResultsScreen } from '../screens/lecturer/SearchResultsScreen';
import { BookletDetailsScreen } from '../screens/lecturer/BookletDetailsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerShown: false,
  animation: 'fade_from_bottom' as const,
  contentStyle: { backgroundColor: '#F8FAFC' },
};

export const RootNavigator: React.FC = () => {
  const { isBootstrapping, isAuthenticated, startAtLogin } = useAuth();
  const guestStart = startAtLogin ? 'SignIn' : 'Splash';

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#35477B" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={isAuthenticated ? 'app' : guestStart}
      initialRouteName={isAuthenticated ? 'Dashboard' : guestStart}
      screenOptions={screenOptions}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ animation: 'fade' }} />
          <Stack.Screen
            name="LecturerSearchResults"
            component={SearchResultsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="LecturerBookletDetails"
            component={BookletDetailsScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen
            name="OnboardingArchive"
            component={OnboardingArchiveScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="OnboardingSearch"
            component={OnboardingSearchScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="OnboardingLocate"
            component={OnboardingLocateScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};
