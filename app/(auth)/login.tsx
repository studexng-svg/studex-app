import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";

const GRAD_COLORS = ["#0D9488", "#7C3AED"] as const;

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const { login } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || "Invalid login details, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setForgotLoading(true);
    try {
      await api.post("/api/auth/forgot-password/", { email: forgotEmail });
      setForgotSuccess(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgot = () => {
    setIsForgotPassword(false);
    setForgotSuccess(false);
    setForgotEmail("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>

          {/* Header — icon + brand label + dynamic title */}
          <View style={styles.header}>
            <LinearGradient colors={GRAD_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBox}>
              <Ionicons name="storefront-outline" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.brandLabel}>STUDEX</Text>
            <Text style={styles.title}>
              {isForgotPassword ? "Reset Password" : "Welcome Back"}
            </Text>
            <Text style={styles.subtitle}>
              {isForgotPassword
                ? "Enter your email to receive a reset link"
                : "Login to your StudEx account"}
            </Text>
          </View>

          {isForgotPassword ? (
            forgotSuccess ? (
              // ── SUCCESS STATE ─────────────────────────────────────────────────
              <View style={{ alignItems: "center", paddingVertical: 8 }}>
                <View style={styles.mailIconBox}>
                  <Ionicons name="mail" size={32} color="#0D9488" />
                </View>
                <Text style={styles.successTitle}>Check your inbox!</Text>
                <Text style={styles.successBody}>We sent a reset link to</Text>
                <Text style={styles.successEmail}>{forgotEmail}</Text>
                <Text style={styles.successHint}>
                  Can't find it? Check your spam or junk folder.
                </Text>
                <TouchableOpacity onPress={resetForgot} style={{ marginTop: 20 }}>
                  <Text style={styles.backLink}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // ── FORGOT PASSWORD FORM ──────────────────────────────────────────
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="you@school.edu.ng"
                    placeholderTextColor="#A8A29E"
                    editable={!forgotLoading}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleForgotPassword}
                  disabled={forgotLoading}
                  activeOpacity={0.85}
                  style={{ marginTop: 20 }}
                >
                  <LinearGradient
                    colors={GRAD_COLORS}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.primaryBtn, forgotLoading && styles.primaryBtnDisabled]}
                  >
                    {forgotLoading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.primaryBtnText}>Get Reset Link</Text>}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={resetForgot} style={{ marginTop: 14 }}>
                  <Text style={styles.backLink}>Back to Login</Text>
                </TouchableOpacity>
              </>
            )
          ) : (
            // ── LOGIN FORM ────────────────────────────────────────────────────
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="you@school.edu.ng"
                  placeholderTextColor="#A8A29E"
                  editable={!submitting}
                />
              </View>

              <View style={[styles.field, { marginTop: 16 }]}>
                <Text style={styles.label}>Password</Text>
                <View>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#A8A29E"
                    editable={!submitting}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#A8A29E"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.forgotRow}
                onPress={() => setIsForgotPassword(true)}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                onPress={handleLogin}
                disabled={submitting}
                activeOpacity={0.85}
                style={{ marginTop: 16 }}
              >
                <LinearGradient
                  colors={GRAD_COLORS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryBtnText}>Login to StudEx</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>New to StudEx? </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/register")} disabled={submitting}>
                  <Text style={styles.footerLink}>Create account</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.copyright}>© 2026 StudEx</Text>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FAFAF9" },

  blobTopRight: {
    position: "absolute", top: -80, right: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: "rgba(204,251,241,0.55)", opacity: 0.6,
  },
  blobBottomLeft: {
    position: "absolute", bottom: -60, left: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(243,232,255,0.45)", opacity: 0.6,
  },

  scroll: {
    flexGrow: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 20, paddingVertical: 48,
  },

  card: {
    width: "100%", backgroundColor: "#ffffff",
    borderRadius: 16, borderWidth: 1, borderColor: "#F5F5F4",
    padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 8,
  },

  header: { alignItems: "center", marginBottom: 28 },

  iconBox: {
    width: 64, height: 64, borderRadius: 16,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
    shadowColor: "#0D9488", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },

  brandLabel: {
    fontSize: 10, fontFamily: "DMSans_500Medium",
    color: "#0D9488", letterSpacing: 4,
    textTransform: "uppercase", marginBottom: 4,
  },

  title: {
    fontSize: 22, fontFamily: "DMSans_700Bold",
    color: "#1C1917", marginBottom: 4, textAlign: "center",
  },

  subtitle: {
    fontSize: 14, fontFamily: "DMSans_400Regular",
    color: "#A8A29E", textAlign: "center",
  },

  field: {},

  label: {
    fontSize: 14, fontFamily: "DMSans_500Medium",
    color: "#44403C", marginBottom: 6,
  },

  input: {
    borderWidth: 1, borderColor: "#E7E5E4", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 14, fontFamily: "DMSans_400Regular",
    color: "#1C1917", backgroundColor: "#ffffff",
  },

  passwordInput: { paddingRight: 44 },

  eyeBtn: {
    position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center",
  },

  forgotRow: { alignItems: "flex-end", marginTop: 8 },
  forgotText: { fontSize: 14, fontFamily: "DMSans_500Medium", color: "#0D9488" },

  errorText: {
    fontSize: 14, fontFamily: "DMSans_400Regular",
    color: "#EF4444", textAlign: "center", marginTop: 12,
  },

  primaryBtn: { borderRadius: 9999, paddingVertical: 14, alignItems: "center" },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: "#ffffff", fontFamily: "DMSans_600SemiBold", fontSize: 14 },

  footerRow: {
    flexDirection: "row", justifyContent: "center",
    alignItems: "center", marginTop: 20,
  },
  footerText: { fontSize: 14, fontFamily: "DMSans_400Regular", color: "#78716C" },
  footerLink: { fontSize: 14, fontFamily: "DMSans_600SemiBold", color: "#0D9488" },

  copyright: {
    fontSize: 12, fontFamily: "DMSans_400Regular",
    color: "#A8A29E", textAlign: "center", marginTop: 8,
  },

  // Forgot password
  backLink: {
    fontSize: 13, fontFamily: "DMSans_500Medium",
    color: "#0D9488", textAlign: "center",
  },

  // Success state
  mailIconBox: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: "#CCFBF1",
    alignItems: "center", justifyContent: "center",
  },
  successTitle: {
    fontSize: 20, fontFamily: "DMSans_700Bold",
    color: "#1C1917", marginTop: 16, textAlign: "center",
  },
  successBody: {
    fontSize: 14, fontFamily: "DMSans_400Regular",
    color: "#6b7280", textAlign: "center", marginTop: 8,
  },
  successEmail: {
    fontSize: 14, fontFamily: "DMSans_600SemiBold",
    color: "#0D9488", textAlign: "center",
  },
  successHint: {
    fontSize: 12, fontFamily: "DMSans_400Regular",
    color: "#9ca3af", textAlign: "center", marginTop: 8,
  },
});
