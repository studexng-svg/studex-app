import {
  View, Text, ScrollView, Image, TouchableOpacity,
  Alert, SafeAreaView, StyleSheet,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";

function MenuItem({
  icon, label, sub, colors, badge, onPress, showDivider = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  sub: string;
  colors: [string, string];
  badge?: number;
  onPress: () => void;
  showDivider?: boolean;
}) {
  return (
    <>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.menuItem}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.menuIconBox}
        >
          <Ionicons name={icon} size={18} color="#fff" />
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <Text style={styles.menuLabel}>{label}</Text>
          <Text style={styles.menuSub}>{sub}</Text>
        </View>

        {badge && badge > 0 ? (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{badge > 99 ? "99+" : badge}</Text>
          </View>
        ) : null}

        <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const [hasBankAccount, setHasBankAccount] = useState<boolean | null>(null);

  useEffect(() => {
    api.get("/api/auth/profile/")
      .then((data: any) => updateUser(data))
      .catch(() => {});
    api.get<any>("/api/payments/seller/bank-account/")
      .then(data => setHasBankAccount(!!data?.account_number))
      .catch(() => setHasBankAccount(false));
  }, []);

  function handleLogout() {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => logout() },
      ]
    );
  }

  const initial = (user?.username?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>My Account</Text>
        </View>

        {/* ── Profile card ────────────────────────────────────────────────── */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            onPress={() => Alert.alert("Coming soon", "Photo upload coming soon.")}
            activeOpacity={0.85}
          >
            {user?.profile_image ? (
              <Image source={{ uri: user.profile_image }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={["#0D9488", "#7C3AED"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.avatar, { alignItems: "center", justifyContent: "center" }]}
              >
                <Text style={{ color: "#fff", fontSize: 30, fontFamily: "DMSans_700Bold" }}>{initial}</Text>
              </LinearGradient>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.profileNameRow}>
            <Text style={styles.profileName}>{user?.username || "Campus User"}</Text>
            {user?.is_verified_vendor && (
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            )}
          </View>

          <Text style={styles.profileEmail}>{user?.email || ""}</Text>

          {(user?.school || user?.wallet_balance) ? (
            <View style={styles.profilePills}>
              {user?.school ? (
                <View style={styles.campusPill}>
                  <Text style={styles.campusPillText}>{user.school.toUpperCase()}</Text>
                </View>
              ) : null}
              {user?.wallet_balance ? (
                <View style={styles.walletPill}>
                  <Ionicons name="wallet-outline" size={11} color="#0D9488" />
                  <Text style={styles.walletPillText}>
                    ₦{parseFloat(user.wallet_balance || "0").toLocaleString("en-NG")}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity
            onPress={() => Alert.alert("Coming soon", "Photo upload coming soon.")}
            style={{ marginTop: 8 }}
          >
            <Text style={styles.changePhotoLink}>View / change photo</Text>
          </TouchableOpacity>
        </View>

        {/* ── Section label ────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Quick Access</Text>

        {/* ── Group 1: Shopping ───────────────────────────────────────────── */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="bag-outline"
            label="My Orders"
            sub="Track your purchases"
            colors={["#6366f1", "#8b5cf6"]}
            onPress={() => router.push("/orders" as any)}
            showDivider
          />
          <MenuItem
            icon="calendar-outline"
            label="My Bookings"
            sub="View upcoming appointments"
            colors={["#0D9488", "#059669"]}
            onPress={() => router.push("/bookings" as any)}
          />
        </View>

        {/* ── Group 2: Social ──────────────────────────────────────────────── */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="chatbubble-outline"
            label="Messages"
            sub="Your conversations"
            colors={["#0D9488", "#7C3AED"]}
            onPress={() => router.push("/(tabs)/chat" as any)}
            showDivider
          />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            sub="Your activity & alerts"
            colors={["#f59e0b", "#ef4444"]}
            onPress={() => router.push("/notifications" as any)}
            showDivider
          />
          <MenuItem
            icon="gift-outline"
            label="Loyalty Rewards"
            sub="Points & exclusive deals"
            colors={["#10b981", "#059669"]}
            onPress={() => Alert.alert("Coming soon", "Loyalty Rewards are coming soon.")}
            showDivider
          />
          <MenuItem
            icon="heart-outline"
            label="Wishlist"
            sub="Saved items"
            colors={["#ec4899", "#f43f5e"]}
            onPress={() => router.push("/wishlist" as any)}
          />
        </View>

        {/* ── Group 3: Settings ────────────────────────────────────────────── */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="settings-outline"
            label="Address Book"
            sub="Manage delivery addresses"
            colors={["#3b82f6", "#6366f1"]}
            onPress={() => Alert.alert("Coming soon", "Address Book is coming soon.")}
            showDivider
          />
          <MenuItem
            icon="help-circle-outline"
            label="Help & Support"
            sub="FAQs and contact"
            colors={["#14b8a6", "#0ea5e9"]}
            onPress={() => Alert.alert("Coming soon", "Help & Support is coming soon.")}
          />
        </View>

        {/* ── Vendor Hub banner ────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => Alert.alert("Vendor Hub", "Vendor features coming soon.")}
          activeOpacity={0.88}
          style={styles.vendorBanner}
        >
          <LinearGradient
            colors={["#0D9488", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.vendorBannerInner}
          >
            <View style={styles.vendorBannerIcon}>
              <Ionicons name="grid-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vendorBannerTitle}>Vendor Hub</Text>
              <Text style={styles.vendorBannerSub}>Messages, bookings, earnings & listings</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.65)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Bank account status ──────────────────────────────────────────── */}
        {hasBankAccount !== null && (
          <View style={[
            styles.bankCard,
            {
              backgroundColor: hasBankAccount ? "#f0fdfa" : "#fffbeb",
              borderColor: hasBankAccount ? "#99f6e4" : "#fde68a",
            },
          ]}>
            <View style={[styles.bankIconBox, { backgroundColor: hasBankAccount ? "#ccfbf1" : "#fef3c7" }]}>
              <Ionicons name="card-outline" size={18} color={hasBankAccount ? "#0D9488" : "#d97706"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bankTitle, { color: hasBankAccount ? "#134e4a" : "#92400e" }]}>
                {hasBankAccount ? "Payout Account Set" : "Payout Account Required"}
              </Text>
              <Text style={[styles.bankSub, { color: hasBankAccount ? "#0D9488" : "#b45309" }]}>
                {hasBankAccount ? "Your earnings will be sent here" : "Add your bank account to receive payments"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => Alert.alert("Coming soon", "Bank account settings are coming soon.")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#0D9488", "#7C3AED"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bankBtn}
              >
                <Text style={styles.bankBtnText}>{hasBankAccount ? "Update" : "Add"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Logout ──────────────────────────────────────────────────────── */}
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.7} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={16} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9F9F8" },

  pageHeader: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12 },
  pageTitle: { fontSize: 20, fontFamily: "DMSans_700Bold", color: "#1c1917" },

  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginHorizontal: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e7e5e4",
  },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  cameraBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#7C3AED", borderWidth: 2, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  profileNameRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 12 },
  profileName: { fontSize: 17, fontFamily: "DMSans_700Bold", color: "#1c1917" },
  profileEmail: { fontSize: 13, fontFamily: "DMSans_400Regular", color: "#9ca3af", marginTop: 2 },
  profilePills: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" },
  campusPill: { backgroundColor: "#CCFBF1", borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 3 },
  campusPillText: { fontSize: 10, fontFamily: "DMSans_700Bold", color: "#0D9488" },
  walletPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#f0fdfa", borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 3 },
  walletPillText: { fontSize: 10, fontFamily: "DMSans_700Bold", color: "#0D9488" },
  changePhotoLink: { fontSize: 13, fontFamily: "DMSans_400Regular", color: "#0D9488" },

  sectionLabel: {
    fontSize: 11, fontFamily: "DMSans_500Medium",
    color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase",
    paddingHorizontal: 16, marginBottom: 8,
  },

  menuSection: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e7e5e4",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    marginRight: 12,
  },
  menuLabel: { fontSize: 14, fontFamily: "DMSans_500Medium", color: "#1c1917" },
  menuSub: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "#9ca3af", marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#f0f0ef", marginLeft: 64 },
  menuBadge: {
    backgroundColor: "#ef4444", borderRadius: 9999,
    minWidth: 20, height: 20, paddingHorizontal: 4,
    alignItems: "center", justifyContent: "center", marginRight: 6,
  },
  menuBadgeText: { color: "#fff", fontSize: 10, fontFamily: "DMSans_700Bold" },

  vendorBanner: { marginHorizontal: 16, marginTop: 4, marginBottom: 12 },
  vendorBannerInner: { borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center" },
  vendorBannerIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  vendorBannerTitle: { fontSize: 14, fontFamily: "DMSans_700Bold", color: "#fff" },
  vendorBannerSub: { fontSize: 12, fontFamily: "DMSans_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 1 },

  bankCard: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row", alignItems: "center",
  },
  bankIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
  bankTitle: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
  bankSub: { fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 1 },
  bankBtn: { borderRadius: 9999, paddingVertical: 7, paddingHorizontal: 14 },
  bankBtnText: { color: "#fff", fontSize: 12, fontFamily: "DMSans_600SemiBold" },

  logoutBtn: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 13,
    backgroundColor: "#fff9f9",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#fecaca",
  },
  logoutText: { color: "#ef4444", fontFamily: "DMSans_600SemiBold", fontSize: 14 },
});
