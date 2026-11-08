import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { OnboardingSlide } from '../components/OnboardingSlide';
import { useAuth } from '../context/AuthContext';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingLocate'>;

interface Props {
  navigation: NavProp;
}

export const OnboardingLocateScreen: React.FC<Props> = ({ navigation }) => {
  const { completeOnboarding } = useAuth();

  const finish = async () => {
    await completeOnboarding();
    navigation.replace('SignIn');
  };

  return (
    <OnboardingSlide
      source={require('../../assets/images/onboarding-3-digital-physical-ghost.jpg')}
      ctaLabel="Get Started"
      onNext={() => {
        void finish();
      }}
      onSkip={() => {
        void finish();
      }}
      onBack={() => navigation.goBack()}
    />
  );
};
