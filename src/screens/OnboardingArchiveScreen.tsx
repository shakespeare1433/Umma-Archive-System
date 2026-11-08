import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { OnboardingSlide } from '../components/OnboardingSlide';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingArchive'>;

interface Props {
  navigation: NavProp;
}

export const OnboardingArchiveScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <OnboardingSlide
      source={require('../../assets/images/onboarding-1-archive-gateway-bright.jpg')}
      ctaLabel="Next"
      onNext={() => navigation.navigate('OnboardingSearch')}
      onSkip={() => navigation.replace('SignIn')}
    />
  );
};
