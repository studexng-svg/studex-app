import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { S, StatusBadge } from "./_shared";

type BookingFilter = "all" | "pending" | "confirmed";

export default function VendorBookingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [bookings,       setBookings]       = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [filter,         setFilter]         = useState<BookingFilter>("pending");
  const [actionLoading,  setActionLoading]  = useState<number | null>(null);
  const [chatLoading,    setChatLoading]    = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<any>("/api/orders/bookings/");
      const list = Array.isArray(data) ? data : (data.results ?? []);
      setBookings(list.filter((b: any) => b.vendor_username === user?.username));
    } catch {} finally { setLoading(false); }
  }, [user?.username]);

  useEffect(() => { load(); }, [load]);

  const handleMessageBuyer = async (booking: any) => {
    setChatLoading(booking.id);
    try {
      const conv = await api.post<any>("/api/chat/conversations/for-booking/", { booking_id: booking.id });
      router.push(`/chat/${conv.id}` as any);
    } catch { Alert.alert("Error", "Could not open conversation."); }
    finally { setChatLoading(null); }
  };

  const handleAction = async (id: number, action: "confirm" | "cancel") => {
    if (action === "cancel") {
      const ok = await new Promise<boolean>(res =>
        Alert.alert("Decline booking?", "This will decline the customer's booking.", [
          { text: "Cancel", style: "cancel", onPress: () => res(false) },
          { text: "Decline", style: "destructive", onPress: () => res(true) },
        ])
      );
      if (!ok) return;
    }
    setActionLoading(id);
    try {
      await api.post(`/api/orders/bookings/${id}/${action}/`);
      load();
    } catch { Alert.alert("Error", "Could not update booking."); }
    finally { setActionLoading(null); }
  };

  const filtered = bookings.filter(b => filter === "all" || b.status === filter);

  if (loading) return <ActivityIndicator color="#0D9488" style={{ marginTop: 48 }} />;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 16, paddingTop: 20 }}>
      <Text style={S.sectionLabel}>MANAGE</Text>
      <Text style={{ fontSize: 26, fontFamily: "DMSans_700Bold", color: "#1c1917", marginTop: 2, marginBottom: 18 }}>Bookings</Text>

      {/* Filter chips */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
        {(["pending", "confirmed", "all"] as BookingFilter[]).map(f => {
          const active = filter === f;
          const cnt = f !== "all" ? bookings.filter(b => b.status === f).length : null;
          const label = f.charAt(0).toUpperCase() + f.slice(1) + (cnt !== null ? ` (${cnt})` : "");
          return (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} activeOpacity={0.75}
              style={[S.filterChip, active && { backgroundColor: "#0D9488", borderColor: "#0D9488" }]}>
              <Text style={[S.filterChipText, active && S.filterChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <View style={S.emptyState}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#f0fdfa", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Ionicons name="calendar-outline" size={36} color="#0D9488" />
          </View>
          <Text style={{ fontSize: 15, color: "#9ca3af", fontFamily: "DMSans_400Regular" }}>
            No {filter === "all" ? "" : filter} bookings
          </Text>
        </View>
      ) : filtered.map(booking => (
        <View key={booking.id} style={S.card}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
              <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 14 }}>{(booking.buyer_username?.[0] ?? "?").toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardTitle}>{booking.buyer_username}</Text>
              <Text style={S.cardSub}>{booking.listing_title}</Text>
            </View>
            <StatusBadge status={booking.status} />
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
            <View style={S.bookingInfoBox}><Text style={S.cardMeta}>Date</Text><Text style={S.cardVal}>{booking.scheduled_date}</Text></View>
            <View style={S.bookingInfoBox}><Text style={S.cardMeta}>Time</Text><Text style={S.cardVal}>{booking.scheduled_time}</Text></View>
          </View>
          {booking.location ? <View style={[S.bookingInfoBox, { marginBottom: 8 }]}><Text style={S.cardMeta}>Location</Text><Text style={S.cardVal}>{booking.location}</Text></View> : null}
          <View style={[S.bookingInfoBox, { backgroundColor: "#f0fdfa", borderColor: "#99f6e4", marginBottom: 8 }]}>
            <Text style={{ fontSize: 11, color: "#0D9488", fontFamily: "DMSans_500Medium" }}>Your payout</Text>
            <Text style={{ fontSize: 20, color: "#0D9488", fontFamily: "DMSans_700Bold" }}>₦{Number(booking.listing_price || 0).toLocaleString()}</Text>
            <Text style={{ fontSize: 11, color: "#6b7280", fontFamily: "DMSans_400Regular", marginTop: 2 }}>Your full listing price (8% fee charged to buyer)</Text>
          </View>
          {booking.note ? <View style={[S.bookingInfoBox, { marginBottom: 8 }]}><Text style={S.cardMeta}>Customer note</Text><Text style={[S.cardVal, { fontFamily: "DMSans_400Regular" }]}>{booking.note}</Text></View> : null}
          {booking.status === "pending" && (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
              <TouchableOpacity onPress={() => handleAction(booking.id, "confirm")} disabled={actionLoading === booking.id} activeOpacity={0.87}
                style={[S.cardActionBtn, { flex: 1, backgroundColor: "#0D9488", opacity: actionLoading === booking.id ? 0.6 : 1 }]}>
                {actionLoading === booking.id
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Ionicons name="checkmark" size={14} color="#fff" /><Text style={S.cardActionBtnText}>Accept</Text></>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAction(booking.id, "cancel")} disabled={actionLoading === booking.id} activeOpacity={0.87} style={[S.declineBtn, { opacity: actionLoading === booking.id ? 0.6 : 1 }]}>
                <Ionicons name="close" size={14} color="#ef4444" />
                <Text style={{ fontSize: 13, color: "#ef4444", fontFamily: "DMSans_600SemiBold" }}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
          {booking.status === "confirmed" && (
            <TouchableOpacity onPress={() => handleMessageBuyer(booking)} disabled={chatLoading === booking.id} activeOpacity={0.8}
              style={{ marginTop: 10, paddingVertical: 10, borderWidth: 1, borderColor: "#5eead4", borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {chatLoading === booking.id
                ? <ActivityIndicator size="small" color="#0D9488" />
                : <><Ionicons name="chatbubble-outline" size={15} color="#0D9488" /><Text style={{ fontSize: 13, color: "#0D9488", fontFamily: "DMSans_600SemiBold" }}>Message Buyer</Text></>
              }
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
