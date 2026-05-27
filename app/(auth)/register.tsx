import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState, useRef } from "react";
import { useRouter } from "expo-router";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "@/stores/authStore";
import type { RegisterPayload } from "@/stores/authStore";
import { API_BASE_URL } from "@/lib/api";

const GRAD_COLORS = ["#0D9488", "#7C3AED"] as const;

const PAU_HOSTELS = [
  "Cedar", "Trezadel", "Trinity", "Pearl", "Redwood",
  "Cooperative Queens", "Queen Mary", "Aster Hall",
  "Cooperative Kings", "Pod", "Faith", "Amethyst", "Emerald", "EDC",
];
const FUTO_HOSTELS = [
  "Tetfund Boys", "Tetfund Girls", "NDDC Hostel",
  "Hostel A", "Hostel B", "Hostel C", "Hostel D", "Hostel E",
  "Umuchima", "PG Hostel", "Eziobodo", "Ihiagwa", "Off-Campus",
];
const NON_STUDENT_LOCATIONS = ["Umuchima", "Eziobodo", "Ihiagwa", "Off-Campus"];

const SCHOOL_OPTIONS = [
  { label: "Pan-Atlantic University (PAU)", value: "PAU" },
  { label: "Fed. University of Technology, Owerri (FUTO)", value: "FUTO" },
];

// ── Validators ─────────────────────────────────────────────────────────────────

function validateUsername(v: string) {
  if (!v) return { ok: false, msg: "" };
  if (v.includes(" ")) return { ok: false, msg: "No spaces allowed" };
  if (!/^[a-zA-Z0-9_]+$/.test(v)) return { ok: false, msg: "Only letters, numbers and underscores" };
  if (v.length < 3) return { ok: false, msg: "At least 3 characters" };
  if (v.length > 30) return { ok: false, msg: "Max 30 characters" };
  return { ok: true, msg: "Looks good!" };
}

function validateEmail(v: string, school: string, isNonStudent: boolean) {
  if (!v) return { ok: false, msg: "" };
  if (isNonStudent) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    return { ok, msg: ok ? "Valid email ✓" : "Enter a valid email address" };
  }
  if (!v.includes("@")) return { ok: false, msg: "Enter a valid email address" };
  if (school === "PAU") {
    if (!v.toLowerCase().endsWith("@pau.edu.ng"))
      return { ok: false, msg: "PAU students must use @pau.edu.ng email" };
    return { ok: true, msg: "Valid PAU email ✓" };
  }
  if (school === "FUTO") {
    const ok = v.toLowerCase().endsWith("@futo.edu.ng") || v.toLowerCase().endsWith("@gmail.com");
    if (!ok) return { ok: false, msg: "Use your @futo.edu.ng or Gmail address" };
    return { ok: true, msg: "Valid FUTO email ✓" };
  }
  return { ok: false, msg: "Please select your school first" };
}

function validatePhone(v: string) {
  if (!v) return { ok: false, msg: "" };
  const cleaned = v.replace(/[\s\-]/g, "");
  if (!/^\d+$/.test(cleaned)) return { ok: false, msg: "Numbers only" };
  if (cleaned.length < 11) return { ok: false, msg: `${11 - cleaned.length} more digit(s) needed` };
  if (cleaned.length > 11) return { ok: false, msg: "Must be exactly 11 digits" };
  if (!cleaned.startsWith("0")) return { ok: false, msg: "Must start with 0 (e.g. 08012345678)" };
  return { ok: true, msg: "Valid phone number ✓" };
}

function validateMatric(v: string) {
  if (!v) return { ok: false, msg: "" };
  if (!/^\d{11}$/.test(v)) return { ok: false, msg: "Must be exactly 11 digits" };
  const year = parseInt(v.substring(0, 4));
  const currentYear = new Date().getFullYear();
  if (year < 2015 || year > currentYear) return { ok: false, msg: "Enter a valid admission year" };
  return { ok: true, msg: "Valid matric number ✓" };
}

function validateNIN(v: string) {
  if (!v) return { ok: false, msg: "" };
  if (!/^\d{11}$/.test(v)) return { ok: false, msg: "NIN must be exactly 11 digits" };
  return { ok: true, msg: "Valid NIN ✓" };
}

function validatePassword(v: string) {
  if (!v)
    return { ok: false, checks: { length: false, upper: false, lower: false, number: false } };
  const checks = {
    length: v.length >= 8,
    upper: /[A-Z]/.test(v),
    lower: /[a-z]/.test(v),
    number: /\d/.test(v),
  };
  return { ok: Object.values(checks).every(Boolean), checks };
}

// ── DropdownField ──────────────────────────────────────────────────────────────

interface DropdownOption { label: string; value: string }

interface DropdownFieldProps {
  value: string;
  placeholder: string;
  options: DropdownOption[];
  onChange: (v: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  isSuccess?: boolean;
  title?: string;
  icon: string;
}

function DropdownField({
  value, placeholder, options, onChange, disabled, hasError, isSuccess, title, icon,
}: DropdownFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.inputRow,
          isSuccess ? styles.inputRowSuccess : hasError ? styles.inputRowError : undefined,
        ]}
        onPress={() => setOpen(true)}
        disabled={disabled}
        activeOpacity={0.75}
      >
        <Ionicons name={icon as any} size={16} color="#A8A29E" style={styles.fieldIcon} />
        <Text
          style={[styles.inputBorderless, !selectedLabel && { color: "#A8A29E" }]}
          numberOfLines={1}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#A8A29E" style={{ paddingRight: 14 }} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {title && <Text style={styles.modalTitle}>{title}</Text>}
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const selected = value === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.modalOption, selected && styles.modalOptionSelected]}
                    onPress={() => { onChange(opt.value); setOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalOptionText, selected && styles.modalOptionTextSelected]}>
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={18} color="#0D9488" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const [step, setStep] = useState<1 | 2>(1);
  const [isNonStudent, setIsNonStudent] = useState(false);
  const [school, setSchool] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [matricNumber, setMatricNumber] = useState("");
  const [nin, setNin] = useState("");
  const [otp, setOtp] = useState("");

  const [touched, setTouched] = useState({
    username: false, email: false, phone: false, password: false, school: false,
  });

  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameCheckFailed, setUsernameCheckFailed] = useState(false);
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { register } = useAuthStore();
  const router = useRouter();

  const isFUTO = school === "FUTO";
  const hostelOptions: DropdownOption[] = (
    isNonStudent
      ? NON_STUDENT_LOCATIONS
      : isFUTO ? FUTO_HOSTELS : school === "PAU" ? PAU_HOSTELS : []
  ).map((h) => ({ label: h, value: h }));

  const usernameVal = validateUsername(username);
  const emailVal = validateEmail(email, school, isNonStudent);
  const phoneVal = validatePhone(phone);
  const passwordVal = validatePassword(password);
  const matricVal = validateMatric(matricNumber);
  const ninVal = validateNIN(nin);

  const { checks } = passwordVal;
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const strengthColor = ["#EF4444", "#F97316", "#EAB308", "#0D9488"][passedChecks - 1] ?? "#E7E5E4";

  const step1Valid =
    usernameVal.ok &&
    usernameAvailable !== false &&
    emailVal.ok &&
    phoneVal.ok &&
    !!hostel &&
    passwordVal.ok &&
    !!school &&
    (isNonStudent ? ninVal.ok : isFUTO ? matricVal.ok : true);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const touch = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const touchAll = () =>
    setTouched({ username: true, email: true, phone: true, password: true, school: true });

  const handleUsernameChange = (v: string) => {
    setUsername(v);
    if (!touched.username) setTouched((prev) => ({ ...prev, username: true }));
    setUsernameAvailable(null);
    setUsernameCheckFailed(false);
    if (!validateUsername(v).ok || !v) { setUsernameChecking(false); return; }
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    setUsernameChecking(true);
    usernameTimer.current = setTimeout(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/auth/check-username/?username=${encodeURIComponent(v)}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        const data = await res.json();
        setUsernameAvailable(data.available ?? null);
      } catch {
        clearTimeout(timeoutId);
        setUsernameAvailable(null);
        setUsernameCheckFailed(true);
      } finally {
        setUsernameChecking(false);
      }
    }, 600);
  };

  const sendOtp = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") throw new Error("Request timed out. Please try again.");
      throw err;
    }
  };

  const handleSendOtp = async () => {
    setError("");
    touchAll();
    if (!step1Valid) { setError("Please fill in all required fields before continuing."); return; }
    setSubmitting(true);
    try {
      await sendOtp();
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to send code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setSubmitting(true);
    try {
      await sendOtp();
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteSignup = async () => {
    setError("");
    if (otp.length !== 6) { setError("Enter the full 6-digit code."); return; }
    setSubmitting(true);
    try {
      const verifyRes = await fetch(`${API_BASE_URL}/api/auth/verify-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Invalid code");

      const payload: RegisterPayload = {
        username, email, phone, password, password2: password,
        user_type: isNonStudent ? "non_student" : "student",
        hostel, school, campus: school.toLowerCase(),
        ...(matricNumber ? { matric_number: matricNumber } : {}),
        ...(nin ? { nin } : {}),
      };
      await register(payload);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your details.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldFeedback = (ok: boolean, msg: string) => {
    if (!msg) return null;
    return (
      <View style={styles.feedbackRow}>
        <Ionicons name={ok ? "checkmark-circle" : "close-circle"} size={13} color={ok ? "#0D9488" : "#EF4444"} />
        <Text style={[styles.feedbackText, { color: ok ? "#0D9488" : "#EF4444" }]}>{msg}</Text>
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>

          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ alignSelf: "flex-start", marginBottom: 8, padding: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color="#44403C" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={GRAD_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.iconBox}
            >
              <Ionicons name="storefront-outline" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.brandLabel}>STUDEX</Text>
            <Text style={styles.title}>{step === 1 ? "Create Account" : "Verify Email"}</Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? "Join your campus marketplace in 30 seconds"
                : `Enter the code sent to ${email}`}
            </Text>
          </View>

          {step === 1 ? (
            <>
              {/* Account type toggle */}
              <View style={styles.toggleContainer}>
                {(["Student", "Non-Student"] as const).map((label) => {
                  const val = label === "Non-Student";
                  const active = isNonStudent === val;
                  return (
                    <TouchableOpacity
                      key={label}
                      style={[styles.togglePill, active && styles.togglePillActive]}
                      onPress={() => {
                        setIsNonStudent(val);
                        setSchool("");
                        setHostel("");
                        setMatricNumber("");
                        setNin("");
                      }}
                      activeOpacity={0.75}
                      disabled={submitting}
                    >
                      <View style={styles.togglePillInner}>
                        {val ? (
                          <Ionicons name="person-outline" size={14} color={active ? "#0D9488" : "#78716C"} />
                        ) : (
                          <FontAwesome name="graduation-cap" size={13} color={active ? "#0D9488" : "#78716C"} />
                        )}
                        <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                          {label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* School dropdown — all users */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>School / University</Text>
                <DropdownField
                  icon="school-outline"
                  value={school}
                  placeholder="Select your school"
                  options={SCHOOL_OPTIONS}
                  onChange={(v) => { setSchool(v); setHostel(""); setMatricNumber(""); touch("school"); }}
                  disabled={submitting}
                  hasError={touched.school && !school}
                  isSuccess={!!school}
                  title="Select School"
                />
                {touched.school && !school && (
                  <Text style={styles.inlineError}>Please select your school</Text>
                )}
              </View>

              {/* Username */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>Username</Text>
                <View
                  style={[
                    styles.inputRow,
                    touched.username && username
                      ? !usernameVal.ok || usernameAvailable === false
                        ? styles.inputRowError
                        : usernameAvailable === true
                          ? styles.inputRowSuccess
                          : undefined
                      : undefined,
                  ]}
                >
                  <Ionicons name="person-outline" size={16} color="#A8A29E" style={styles.fieldIcon} />
                  <Text style={styles.atPrefix}>@</Text>
                  <TextInput
                    style={styles.inputBorderless}
                    value={username}
                    onChangeText={handleUsernameChange}
                    onBlur={() => touch("username")}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="your_username"
                    placeholderTextColor="#A8A29E"
                    editable={!submitting}
                  />
                  {usernameChecking ? (
                    <ActivityIndicator size="small" color="#0D9488" style={{ paddingRight: 12 }} />
                  ) : username && usernameVal.ok && usernameAvailable === true ? (
                    <Ionicons name="checkmark-circle" size={18} color="#0D9488" style={{ paddingRight: 12 }} />
                  ) : username && (usernameVal.ok ? usernameAvailable === false : true) ? (
                    <Ionicons name="close-circle" size={18} color="#EF4444" style={{ paddingRight: 12 }} />
                  ) : null}
                </View>
                {touched.username && usernameVal.msg && !usernameCheckFailed &&
                  fieldFeedback(usernameVal.ok && usernameAvailable !== false, usernameVal.msg)}
                {touched.username && username && usernameVal.ok && usernameAvailable === false &&
                  fieldFeedback(false, "Username is already taken")}
                {usernameCheckFailed && usernameVal.ok && (
                  <View style={styles.feedbackRow}>
                    <Ionicons name="warning-outline" size={13} color="#F97316" />
                    <Text style={[styles.feedbackText, { color: "#F97316" }]}>
                      Couldn't verify availability — you can still continue
                    </Text>
                  </View>
                )}
              </View>

              {/* Email */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>
                  {isNonStudent ? "Email"
                    : school === "PAU" ? "Email (@pau.edu.ng)"
                      : school === "FUTO" ? "Email (@futo.edu.ng or Gmail)"
                        : "Email"}
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    touched.email && email
                      ? emailVal.ok ? styles.inputRowSuccess : styles.inputRowError
                      : undefined,
                  ]}
                >
                  <Ionicons name="mail-outline" size={16} color="#A8A29E" style={styles.fieldIcon} />
                  <TextInput
                    style={styles.inputBorderless}
                    value={email}
                    onChangeText={(v) => { setEmail(v); if (!touched.email) touch("email"); }}
                    onBlur={() => touch("email")}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder={
                      isNonStudent ? "you@email.com"
                        : school === "PAU" ? "you@pau.edu.ng"
                          : school === "FUTO" ? "you@futo.edu.ng"
                            : "Select school first"
                    }
                    placeholderTextColor="#A8A29E"
                    editable={!submitting}
                  />
                </View>
                {touched.email && fieldFeedback(emailVal.ok, emailVal.msg)}
              </View>

              {/* Phone */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>Phone Number</Text>
                <View
                  style={[
                    styles.inputRow,
                    touched.phone && phone
                      ? phoneVal.ok ? styles.inputRowSuccess : styles.inputRowError
                      : undefined,
                  ]}
                >
                  <Ionicons name="call-outline" size={16} color="#A8A29E" style={styles.fieldIcon} />
                  <TextInput
                    style={styles.inputBorderless}
                    value={phone}
                    onChangeText={(v) => { setPhone(v); if (!touched.phone) touch("phone"); }}
                    onBlur={() => touch("phone")}
                    keyboardType="number-pad"
                    placeholder="08012345678"
                    placeholderTextColor="#A8A29E"
                    maxLength={11}
                    editable={!submitting}
                  />
                </View>
                {touched.phone && fieldFeedback(phoneVal.ok, phoneVal.msg)}
              </View>

              {/* Matric (FUTO students only) */}
              {!isNonStudent && isFUTO && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.label}>Matric Number</Text>
                  <View
                    style={[
                      styles.inputRow,
                      matricNumber
                        ? matricVal.ok ? styles.inputRowSuccess : styles.inputRowError
                        : undefined,
                    ]}
                  >
                    <Ionicons name="id-card-outline" size={16} color="#A8A29E" style={styles.fieldIcon} />
                    <TextInput
                      style={styles.inputBorderless}
                      value={matricNumber}
                      onChangeText={setMatricNumber}
                      keyboardType="number-pad"
                      placeholder="e.g. 20201234567"
                      placeholderTextColor="#A8A29E"
                      maxLength={11}
                      editable={!submitting}
                    />
                  </View>
                  {matricNumber && fieldFeedback(matricVal.ok, matricVal.msg)}
                </View>
              )}

              {/* NIN (non-students only) */}
              {isNonStudent && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.label}>NIN (National ID Number)</Text>
                  <View
                    style={[
                      styles.inputRow,
                      nin ? ninVal.ok ? styles.inputRowSuccess : styles.inputRowError : undefined,
                    ]}
                  >
                    <Ionicons name="finger-print-outline" size={16} color="#A8A29E" style={styles.fieldIcon} />
                    <TextInput
                      style={styles.inputBorderless}
                      value={nin}
                      onChangeText={setNin}
                      keyboardType="number-pad"
                      placeholder="11-digit NIN"
                      placeholderTextColor="#A8A29E"
                      maxLength={11}
                      editable={!submitting}
                    />
                  </View>
                  {nin && fieldFeedback(ninVal.ok, ninVal.msg)}
                </View>
              )}

              {/* Hostel / Location dropdown */}
              {!!school && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.label}>{isNonStudent ? "Location" : "Hostel"}</Text>
                  <DropdownField
                    icon="location-outline"
                    value={hostel}
                    placeholder={isNonStudent ? "Select your location" : "Select your hostel"}
                    options={hostelOptions}
                    onChange={setHostel}
                    disabled={submitting}
                    hasError={touched.school && !hostel}
                    isSuccess={!!hostel}
                    title={isNonStudent ? "Select Location" : "Select Hostel"}
                  />
                  {touched.school && !hostel && (
                    <Text style={styles.inlineError}>
                      Please select a {isNonStudent ? "location" : "hostel"}
                    </Text>
                  )}
                </View>
              )}

              {/* Password */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={16} color="#A8A29E" style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.inputBorderless, { paddingRight: 44 }]}
                    value={password}
                    onChangeText={(v) => { setPassword(v); if (!touched.password) touch("password"); }}
                    onBlur={() => touch("password")}
                    secureTextEntry={!showPassword}
                    placeholder="Create a strong password"
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
                {password.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBars}>
                      {[0, 1, 2, 3].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.strengthBar,
                            { backgroundColor: i < passedChecks ? strengthColor : "#E7E5E4" },
                          ]}
                        />
                      ))}
                    </View>
                    <View style={styles.checksGrid}>
                      {(
                        [
                          { key: "length", label: "8+ characters" },
                          { key: "upper", label: "Uppercase" },
                          { key: "lower", label: "Lowercase" },
                          { key: "number", label: "Number" },
                        ] as const
                      ).map(({ key, label }) => {
                        const passed = checks[key];
                        return (
                          <View key={key} style={styles.checkItem}>
                            <Ionicons
                              name={passed ? "checkmark-circle" : "close-circle"}
                              size={12}
                              color={passed ? "#0D9488" : "#A8A29E"}
                            />
                            <Text style={[styles.checkLabel, { color: passed ? "#0D9488" : "#A8A29E" }]}>
                              {label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={submitting}
                activeOpacity={0.85}
                style={{ marginTop: 20 }}
              >
                <LinearGradient
                  colors={GRAD_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryBtnText}>Send Verification Code</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.back()} disabled={submitting}>
                  <Text style={styles.footerLink}>Login here</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.copyright}>© 2026 StudEx</Text>
            </>
          ) : (
            <>
              <View style={styles.otpInfoBox}>
                <Ionicons name="mail-outline" size={16} color="#0D9488" />
                <Text style={styles.otpInfoText}>
                  A 6-digit code was sent to{" "}
                  <Text style={styles.otpInfoEmail}>{email}</Text>
                </Text>
              </View>

              <View style={{ marginTop: 20 }}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  placeholder="000000"
                  placeholderTextColor="#D4D4D0"
                  maxLength={6}
                  editable={!submitting}
                />
              </View>

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                onPress={handleCompleteSignup}
                disabled={submitting}
                activeOpacity={0.85}
                style={{ marginTop: 20 }}
              >
                <LinearGradient
                  colors={GRAD_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryBtnText}>Complete Signup</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.otpFooter}>
                <TouchableOpacity onPress={handleResendOtp} disabled={submitting}>
                  <Text style={styles.otpResend}>Resend code</Text>
                </TouchableOpacity>
                <Text style={styles.otpDot}>·</Text>
                <TouchableOpacity
                  onPress={() => { setStep(1); setOtp(""); setError(""); }}
                  disabled={submitting}
                >
                  <Text style={styles.otpBack}>Go back</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FAFAF9" },

  blobTopRight: {
    position: "absolute", top: -80, right: -80, width: 260, height: 260,
    borderRadius: 130, backgroundColor: "rgba(204,251,241,0.55)", opacity: 0.6,
  },
  blobBottomLeft: {
    position: "absolute", bottom: -60, left: -60, width: 180, height: 180,
    borderRadius: 90, backgroundColor: "rgba(243,232,255,0.45)", opacity: 0.6,
  },

  scroll: {
    flexGrow: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 20, paddingVertical: 48,
  },

  card: {
    width: "100%", backgroundColor: "#ffffff", borderRadius: 16,
    borderWidth: 1, borderColor: "#F5F5F4", padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 8,
  },

  header: { alignItems: "center", marginBottom: 22 },
  iconBox: {
    width: 64, height: 64, borderRadius: 16,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
    shadowColor: "#0D9488", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  brandLabel: {
    fontSize: 10, fontWeight: "600", color: "#0D9488",
    letterSpacing: 4, textTransform: "uppercase", marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#1C1917", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#A8A29E", textAlign: "center" },

  label: { fontSize: 14, fontWeight: "500", color: "#44403C", marginBottom: 6 },

  // Unified input row (icon + text/input + optional right widget)
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#E7E5E4",
    borderRadius: 12, backgroundColor: "#ffffff",
  },
  inputRowSuccess: { borderColor: "#2DD4BF" },
  inputRowError: { borderColor: "#FCA5A5" },

  fieldIcon: { paddingLeft: 14, paddingRight: 4 },
  atPrefix: { fontSize: 14, color: "#78716C", paddingRight: 2 },

  inputBorderless: {
    flex: 1, paddingVertical: 12, paddingRight: 12,
    fontSize: 14, color: "#1C1917",
  },

  eyeBtn: {
    position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center",
  },

  // Field feedback
  feedbackRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  feedbackText: { fontSize: 12, fontWeight: "600" },
  inlineError: { fontSize: 12, color: "#EF4444", marginTop: 4 },

  // Account type toggle
  toggleContainer: {
    flexDirection: "row", backgroundColor: "#F5F5F4",
    borderRadius: 9999, padding: 4,
  },
  togglePill: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 9999 },
  togglePillActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  togglePillInner: { flexDirection: "row", alignItems: "center", gap: 5 },
  toggleText: { fontSize: 13, color: "#78716C", fontWeight: "500" },
  toggleTextActive: { color: "#0D9488", fontWeight: "700" },

  // Bottom-sheet modal
  modalOverlay: {
    flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    maxHeight: "70%",
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#E7E5E4", alignSelf: "center",
    marginTop: 12, marginBottom: 8,
  },
  modalTitle: {
    fontSize: 15, fontWeight: "600", color: "#1C1917",
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#F5F5F4",
  },
  modalOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F5F5F4",
  },
  modalOptionSelected: { backgroundColor: "#F0FDFA" },
  modalOptionText: { fontSize: 14, color: "#44403C" },
  modalOptionTextSelected: { color: "#0D9488", fontWeight: "600" },

  // Password strength
  strengthContainer: { marginTop: 8 },
  strengthBars: { flexDirection: "row", gap: 4, marginBottom: 8 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  checksGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  checkItem: { flexDirection: "row", alignItems: "center", gap: 3, width: "48%" },
  checkLabel: { fontSize: 11 },

  errorText: { fontSize: 14, color: "#EF4444", textAlign: "center", marginTop: 12 },

  primaryBtn: { borderRadius: 9999, paddingVertical: 16, alignItems: "center" },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },

  // OTP step
  otpInfoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#CCFBF1", borderRadius: 12, padding: 12, marginTop: 4,
  },
  otpInfoText: { flex: 1, fontSize: 13, color: "#0F766E", lineHeight: 18 },
  otpInfoEmail: { fontWeight: "700" },
  otpInput: {
    borderWidth: 2, borderColor: "#0D9488", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 32, color: "#1C1917", backgroundColor: "#ffffff",
    textAlign: "center", letterSpacing: 10, fontWeight: "700",
  },
  otpFooter: {
    flexDirection: "row", justifyContent: "center",
    alignItems: "center", gap: 8, marginTop: 16,
  },
  otpResend: { fontSize: 14, color: "#0D9488", fontWeight: "600" },
  otpDot: { fontSize: 14, color: "#A8A29E" },
  otpBack: { fontSize: 14, color: "#78716C", fontWeight: "500" },

  footerRow: {
    flexDirection: "row", justifyContent: "center",
    alignItems: "center", marginTop: 20,
  },
  footerText: { fontSize: 14, color: "#78716C" },
  footerLink: { fontSize: 14, fontWeight: "600", color: "#0D9488" },
  copyright: { fontSize: 12, color: "#A8A29E", textAlign: "center", marginTop: 8 },
});
