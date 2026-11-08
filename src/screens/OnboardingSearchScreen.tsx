import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { OnboardingSlide } from '../components/OnboardingSlide';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingSearch'>;

interface Props {
  navigation: NavProp;
}

export const OnboardingSearchScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <OnboardingSlide
      source={require('../../assets/images/onboarding-2-know-location-ghost.jpg')}
      ctaLabel="Next"
      onNext={() => navigation.navigate('OnboardingLocate')}
      onSkip={() => navigation.replace('SignIn')}
      onBack={() => navigation.goBack()}
    />
  );
};
