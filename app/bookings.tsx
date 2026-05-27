import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Alert, Modal,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import WebView from "react-native-webview";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";

interface Booking {
  id: number;
  listing: number;
  listing_title: string;
  buyer_username: string;
  vendor_name: string;
  status: "pending" | "confirmed" | "paid" | "cancelled";
  scheduled_date: string;
  scheduled_time: string;
  listing_price: string;
  note: string;
}

type FilterType = "all" | "pending" | "confirmed" | "cancelled";

function calcServiceFee(amount: number) {
  return Math.min(Math.max(amount * 0.08, 50), 3500);
}

const STATUS_COLORS: Record<string, { bg: string; border: string }> = {
  pending:   { bg: "#fffbeb", border: "#fcd34d" },
  confirmed: { bg: "#f0fdfa", border: "#99f6e4" },
  paid:      { bg: "#f0fdf4", border: "#86efac" },
  cancelled: { bg: "#fef2f2", border: "#fca5a5" },
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: "#fef3c7", text: "#d97706", label: "Awaiting Vendor" },
  confirmed: { bg: "#CCFBF1", text: "#0D9488", label: "Accepted — Pay Now" },
  paid:      { bg: "#dcfce7", text: "#16a34a", label: "Paid ✓" },
  cancelled: { bg: "#fee2e2", text: "#dc2626", label: "Cancelled" },
};

const STATUS_MSG: Record<string, { color: string; text: string }> = {
  pending:   { color: "#d97706", text: "Your booking has been sent. Waiting for the vendor to accept or decline." },
  confirmed: { color: "#0D9488", text: "The vendor has accepted your booking! Complete your payment to confirm." },
  paid:      { color: "#16a34a", text: "Payment received. Your appointment is confirmed." },
  cancelled: { color: "#dc2626", text: "This booking was cancelled. You can rebook or try a different vendor." },
};

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "pending",   label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function BookingsScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [accessCode, setAccessCode] = useState("");
  const [reference, setReference]   = useState("");
  const [showPaystack, setShowPaystack] = useState(false);
  const [activeBookingForPayment, setActiveBookingForPayment] = useState<Booking | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  const fetchBookings = async () => {
    try {
      const data = await api.get<any>("/api/orders/bookings/");
      const raw: Booking[] = Array.isArray(data) ? data : (data.results ?? []);
      setBookings(raw.filter(b => b.buyer_username === user?.username));
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const filtered = activeFilter === "all"
    ? bookings
    : bookings.filter(b => b.status === activeFilter);

  const countFor = (f: FilterType) =>
    f === "all" ? bookings.length : bookings.filter(b => b.status === f).length;

  // ── Cancel ───────────────────────────────────────────────────────────────

  const handleCancel = (booking: Booking) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking?",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel Booking",
          style: "destructive",
          onPress: async () => {
            setCancellingId(booking.id);
            try {
              await api.post(`/api/orders/bookings/${booking.id}/cancel/`, {});
              await fetchBookings();
            } catch {
              Alert.alert("Error", "Could not cancel booking. Please try again.");
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Pay confirmed booking ────────────────────────────────────────────────

  const handlePayBooking = async (booking: Booking) => {
    setPayLoading(true);
    try {
      const data = await api.post<{ access_code: string; reference: string; amount_kobo: number }>(
        "/api/payments/initialize/",
        { listing_id: booking.listing, use_credits: false }
      );
      setAccessCode(data.access_code);
      setReference(data.reference);
      setActiveBookingForPayment(booking);
      setShowPaystack(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not initialize payment. Please try again.");
    } finally {
      setPayLoading(false);
    }
  };

  const handleVerifyBookingPayment = async () => {
    setShowPaystack(false);
    setPayLoading(true);
    try {
      const data = await api.post<{ order_id: number }>("/api/payments/verify/", {
        reference,
        transaction_id: reference,
        listing_id: activeBookingForPayment!.listing,
        order_type: "service",
        use_credits: false,
        credits_applied: 0,
      });
      router.replace(`/order-confirmation/${data.order_id}` as any);
    } catch {
      Alert.alert("Error", "Payment verification failed. Contact support.");
    } finally {
      setPayLoading(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F5F5" }}>

      {/* ── Paystack WebView Modal ── */}
      <Modal
        visible={showPaystack}
        animationType="slide"
        onRequestClose={() => { setShowPaystack(false); setPayLoading(false); }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={{
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: 16, paddingVertical: 12,
            borderBottomWidth: 1, borderBottomColor: "#F5F5F5",
          }}>
            <TouchableOpacity onPress={() => { setShowPaystack(false); setPayLoading(false); }} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#1c1917" />
            </TouchableOpacity>
            <Text style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: "700", color: "#1c1917", marginRight: 24 }}>
              Secure Payment
            </Text>
          </View>
          <WebView
            source={{ uri: `https://checkout.paystack.com/${accessCode}` }}
            style={{ flex: 1 }}
            startInLoadingState
            renderLoading={() => (
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" color="#0D9488" />
              </View>
            )}
            onShouldStartLoadWithRequest={(req) => {
              if (!req.url.includes("checkout.paystack.com") && req.url.includes("reference=")) {
                handleVerifyBookingPayment();
                return false;
              }
              return true;
            }}
            onNavigationStateChange={(navState) => {
              const url = navState.url;
              if (url && !url.includes("checkout.paystack.com") && !url.startsWith("about:") && url.includes("reference=")) {
                handleVerifyBookingPayment();
              }
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* ── Header ── */}
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center",
            shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#1c1917" />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 11, color: "#0D9488", letterSpacing: 2, textTransform: "uppercase", fontWeight: "600" }}>
            Appointments
          </Text>
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#1c1917", marginTop: 2 }}>
            My Bookings
          </Text>
        </View>
      </View>

      {/* ── Filter tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ height: 50 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: "row", alignItems: "center" }}
      >
        {FILTERS.map(f => {
          const isActive = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.8}
              style={{
                backgroundColor: isActive ? "#0D9488" : "#ffffff",
                borderRadius: 9999,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: isActive ? "#0D9488" : "#d1d5db",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: isActive ? "#fff" : "#6b7280" }}>
                {f.label} ({countFor(f.key)})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Bookings list ── */}
      <FlatList
        data={filtered}
        keyExtractor={b => String(b.id)}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 64, paddingHorizontal: 24 }}>
            <Ionicons name="calendar-outline" size={64} color="#E7E5E4" />
            <Text style={{ fontSize: 16, color: "#6b7280", marginTop: 16, textAlign: "center" }}>
              No bookings found
            </Text>
          </View>
        }
        renderItem={({ item: b }) => {
          const colors  = STATUS_COLORS[b.status] ?? STATUS_COLORS.pending;
          const badge   = STATUS_BADGE[b.status]  ?? STATUS_BADGE.pending;
          const msg     = STATUS_MSG[b.status]    ?? STATUS_MSG.pending;
          const price   = parseFloat(b.listing_price);
          const total   = price + calcServiceFee(price);
          const isCancelling = cancellingId === b.id;

          return (
            <View style={{
              backgroundColor: colors.bg,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 16,
              marginHorizontal: 16,
              marginBottom: 12,
              padding: 16,
            }}>
              {/* Title + badge */}
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: "#1c1917" }} numberOfLines={2}>
                  {b.listing_title}
                </Text>
                <View style={{ backgroundColor: badge.bg, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: badge.text }}>{badge.label}</Text>
                </View>
              </View>

              {/* Vendor */}
              <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>by @{b.vendor_name}</Text>

              {/* Info boxes — row 1: date + time */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 10, padding: 10, alignItems: "center" }}>
                  <Ionicons name="calendar-outline" size={14} color="#0D9488" />
                  <Text style={{ fontSize: 12, color: "#1c1917", fontWeight: "600", marginTop: 3, textAlign: "center" }}>
                    {b.scheduled_date || "TBD"}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 10, padding: 10, alignItems: "center" }}>
                  <Ionicons name="time-outline" size={14} color="#0D9488" />
                  <Text style={{ fontSize: 12, color: "#1c1917", fontWeight: "600", marginTop: 3, textAlign: "center" }}>
                    {b.scheduled_time || "TBD"}
                  </Text>
                </View>
              </View>
              {/* Info boxes — row 2: price */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 10, padding: 10, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>Price</Text>
                  <Text style={{ fontSize: 13, color: "#0D9488", fontWeight: "700" }}>
                    {"₦"}{price.toLocaleString("en-NG")}
                  </Text>
                </View>
                <View style={{ flex: 1 }} />
              </View>

              {/* Status message */}
              <Text style={{ fontSize: 13, color: msg.color, marginTop: 10, lineHeight: 18 }}>
                {msg.text}
              </Text>

              {/* Note */}
              {!!b.note && (
                <View style={{
                  backgroundColor: "#fff", borderRadius: 8, padding: 10, marginTop: 8,
                  flexDirection: "row", alignItems: "flex-start", gap: 6,
                }}>
                  <Ionicons name="document-text-outline" size={14} color="#6b7280" style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>{b.note}</Text>
                </View>
              )}

              {/* Pay button — confirmed */}
              {b.status === "confirmed" && (
                <TouchableOpacity
                  onPress={() => handlePayBooking(b)}
                  disabled={payLoading}
                  activeOpacity={0.85}
                  style={{ marginTop: 12 }}
                >
                  <LinearGradient
                    colors={["#0D9488", "#7C3AED"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 9999, paddingVertical: 12, alignItems: "center" }}
                  >
                    {payLoading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                          Pay {"₦"}{total.toLocaleString("en-NG")}
                        </Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Cancel button — pending */}
              {b.status === "pending" && (
                <TouchableOpacity
                  onPress={() => handleCancel(b)}
                  disabled={isCancelling}
                  activeOpacity={0.85}
                  style={{
                    marginTop: 12,
                    alignSelf: "flex-start",
                    borderWidth: 1, borderColor: "#EF4444",
                    borderRadius: 9999, paddingVertical: 9,
                    paddingHorizontal: 18,
                    flexDirection: "row", alignItems: "center", gap: 6,
                  }}
                >
                  {isCancelling
                    ? <ActivityIndicator color="#EF4444" size="small" />
                    : <>
                        <Ionicons name="remove-circle-outline" size={15} color="#EF4444" />
                        <Text style={{ color: "#EF4444", fontWeight: "600", fontSize: 14 }}>Cancel</Text>
                      </>
                  }
                </TouchableOpacity>
              )}

              {/* Rebook button — cancelled */}
              {b.status === "cancelled" && (
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)" as any)}
                  activeOpacity={0.85}
                  style={{
                    marginTop: 12,
                    borderWidth: 1, borderColor: "#9ca3af",
                    borderRadius: 9999, paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#6b7280", fontWeight: "600", fontSize: 14 }}>Find another vendor</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      {/* Full-screen loading overlay during payment init/verify */}
      {payLoading && !showPaystack && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.3)",
          alignItems: "center", justifyContent: "center",
        }}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      )}

    </SafeAreaView>
  );
}
