import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, SafeAreaView, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, User, ArrowRight, Phone, CreditCard, ShieldCheck } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { useAuth } from '../store/useAuth';

export default function SignupScreen({ navigation }) {
  const { login } = useAuth();
  const [step, setStep] = useState(1); // 1 = form, 2 = OTP
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (!name || !email || !password || !phone) {
      setErrorMsg('Please fill in all required fields');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit phone number');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    if (!email.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);
    try {
      await api.post('/auth/send-otp', { name, email });
      setStep(2);
      startResendTimer();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to send OTP. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyAndSignup = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit OTP');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);
    try {
      await api.post('/auth/signup', {
        name, email, phone: phone.replace(/\s/g, ''), password, upi_id: upiId.trim(), otp: otpString
      });
      await login(email, password);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Verification failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      await api.post('/auth/send-otp', { name, email });
      setOtp(['', '', '', '', '', '']);
      startResendTimer();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E1EEFE', '#F4F8FB']}
        style={styles.gradientBackground}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            {/* ─── STEP 1: Registration Form ─── */}
            {step === 1 && (
              <>
                <View style={styles.header}>
                  <Text style={styles.title}>Create Account</Text>
                  <Text style={styles.subtitle}>Join SmartPocket and track expenses together.</Text>
                </View>

                <View style={styles.form}>
                  {/* Full Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <View style={styles.inputContainer}>
                      <User color={colors.textMuted} size={20} style={styles.inputIcon} />
                      <TextInput style={styles.input} placeholder="Enter your name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoCapitalize="words" />
                    </View>
                  </View>

                  {/* Email */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <View style={styles.inputContainer}>
                      <Mail color={colors.textMuted} size={20} style={styles.inputIcon} />
                      <TextInput style={styles.input} placeholder="Enter your email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                    </View>
                  </View>

                  {/* Phone */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
                    <View style={styles.inputContainer}>
                      <Phone color={colors.textMuted} size={20} style={styles.inputIcon} />
                      <TextInput style={styles.input} placeholder="10-digit mobile number" placeholderTextColor={colors.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={15} />
                    </View>
                  </View>

                  {/* Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputContainer}>
                      <Lock color={colors.textMuted} size={20} style={styles.inputIcon} />
                      <TextInput style={styles.input} placeholder="Min. 6 characters" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
                    </View>
                  </View>

                  {/* UPI ID */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>UPI ID</Text>
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>⚡ Recommended</Text>
                      </View>
                    </View>
                    <View style={styles.inputContainer}>
                      <CreditCard color={colors.textMuted} size={20} style={styles.inputIcon} />
                      <TextInput style={styles.input} placeholder="yourname@upi" placeholderTextColor={colors.textMuted} value={upiId} onChangeText={setUpiId} autoCapitalize="none" keyboardType="email-address" />
                    </View>
                    <Text style={styles.upiHint}>Optional — enables friends to pay you directly via UPI</Text>
                  </View>

                  {!!errorMsg && (
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorText}>⚠️  {errorMsg}</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.signupBtn} onPress={handleSendOTP} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color={colors.surface} /> : (
                      <>
                        <Text style={styles.signupBtnText}>Send Verification Code</Text>
                        <ArrowRight color={colors.surface} size={18} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.loginText}>Log In</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ─── STEP 2: OTP Verification ─── */}
            {step === 2 && (
              <>
                <View style={styles.header}>
                  <View style={styles.shieldIcon}>
                    <ShieldCheck color={colors.primary} size={40} />
                  </View>
                  <Text style={styles.title}>Verify Email</Text>
                  <Text style={styles.subtitle}>
                    We sent a 6-digit code to{'\n'}<Text style={{ color: colors.primary, fontWeight: '700' }}>{email}</Text>
                  </Text>
                </View>

                <View style={styles.form}>
                  <Text style={styles.otpLabel}>Enter OTP</Text>
                  <View style={styles.otpRow}>
                    {otp.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={ref => otpRefs.current[i] = ref}
                        style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                        value={digit}
                        onChangeText={v => handleOtpChange(v.replace(/[^0-9]/g, ''), i)}
                        onKeyPress={e => handleOtpKeyPress(e, i)}
                        keyboardType="number-pad"
                        maxLength={1}
                        textAlign="center"
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  {!!errorMsg && (
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorText}>⚠️  {errorMsg}</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.signupBtn} onPress={handleVerifyAndSignup} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color={colors.surface} /> : (
                      <>
                        <Text style={styles.signupBtnText}>Verify & Create Account</Text>
                        <ShieldCheck color={colors.surface} size={18} />
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.resendBtn} onPress={handleResendOTP} disabled={resendTimer > 0}>
                    <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabled]}>
                      {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.backBtn} onPress={() => { setStep(1); setErrorMsg(''); setOtp(['','','','','','']); }}>
                    <Text style={styles.backText}>← Change Email / Details</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  gradientBackground: { position: 'absolute', left: 0, right: 0, top: 0, height: '60%' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  keyboardView: { flex: 1 },
  content: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  header: { marginBottom: 36 },
  title: { fontSize: 34, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, lineHeight: 24 },
  form: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inputGroup: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  required: { color: colors.danger || '#E53E3E' },
  recommendedBadge: {
    backgroundColor: '#FFF7E6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  recommendedText: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: colors.textPrimary, height: '100%' },
  upiHint: { fontSize: 12, color: colors.textMuted, marginTop: 6, paddingLeft: 4 },
  errorBanner: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: '#C53030', fontWeight: '600' },
  signupBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  signupBtnText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  footerText: { fontSize: 14, color: colors.textSecondary },
  loginText: { fontSize: 14, fontWeight: '700', color: colors.primary },

  // OTP Step styles
  shieldIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  otpLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.borderMedium,
    backgroundColor: colors.background,
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: '#EEF2FF',
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  resendDisabled: {
    color: colors.textMuted,
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
