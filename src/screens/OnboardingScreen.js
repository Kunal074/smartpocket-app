import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, SafeAreaView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet, Users, PiggyBank, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../store/useAuth';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Track Every Rupee',
    description: 'Add expenses in just 3 taps. See where your money goes with beautiful charts and insights.',
    icon: Wallet,
    colors: ['#E1EEFE', '#F4F8FB'],
    iconBg: '#EEF2FF',
    iconColor: '#5A67D8'
  },
  {
    id: '2',
    title: 'Split Bills Easily',
    description: 'Going on a trip or living with roommates? SmartSplit makes it simple to track who owes what.',
    icon: Users,
    colors: ['#E6F6F4', '#F4F8FB'],
    iconBg: '#E6FFFA',
    iconColor: '#059669'
  },
  {
    id: '3',
    title: 'Set Smart Budgets',
    description: 'Create monthly limits for categories. We\'ll notify you before you overspend.',
    icon: PiggyBank,
    colors: ['#FCE7F3', '#F4F8FB'],
    iconBg: '#FDF2F8',
    iconColor: '#DB2777'
  }
];

export default function OnboardingScreen({ navigation }) {
  const { completeOnboarding } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentIndex(Math.round(index));
  };

  const nextSlide = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * width,
        animated: true
      });
    } else {
      completeOnboarding();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={SLIDES[currentIndex].colors}
        style={styles.gradientBackground}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.skipContainer}>
          <TouchableOpacity onPress={completeOnboarding}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
        >
          {SLIDES.map((slide, index) => {
            const Icon = slide.icon;
            return (
              <View key={slide.id} style={styles.slide}>
                <View style={[styles.iconContainer, { backgroundColor: slide.iconBg }]}>
                  <Icon color={slide.iconColor} size={64} strokeWidth={1.5} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.description}>{slide.description}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentIndex === index && styles.activeDot,
                  { backgroundColor: currentIndex === index ? colors.primary : colors.borderMedium }
                ]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={nextSlide} activeOpacity={0.8}>
            <LinearGradient
              colors={['#5A67D8', '#7C3AED']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>
                {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              {currentIndex === SLIDES.length - 1 ? (
                <CheckCircle2 color="#fff" size={20} />
              ) : (
                <ArrowRight color="#fff" size={20} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FB'
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height * 0.6
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 0
  },
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
    height: 50
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: height * 0.05
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8
  },
  textContainer: {
    alignItems: 'center'
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 32
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  activeDot: {
    width: 24,
    height: 8
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#5A67D8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700'
  }
});
