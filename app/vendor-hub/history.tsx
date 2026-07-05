import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Share, Alert } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { S } from "./_shared";

type Period = "all" | "week" | "month";
type Tab = "orders" | "bookings";

const ORDER_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  completed:        { bg: "#dcfce7", text: "#16a34a", label: "✓ Completed" },
  seller_completed: { bg: "#f0fdfa", text: "#0D9488", label: "⏳ Awaiting Confirmation" },
  paid:             { bg: "#eff6ff", text: "#2563eb", label: "💰 Paid — In Progress" },
};

export default function VendorHistoryPage() {
  const { user } = useAuthStore();
  const [orders,   setOrders]   = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<Tab>("orders");
  const [period,   setPeriod]   = useState<Period>("all");
  const [sharing,  setSharing]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ord, book] = await Promise.all([
        api.get<any>("/api/orders/orders/?role=seller").catch(() => []),
        api.get<any>("/api/orders/bookings/").catch(() => []),
      ]);
      const ordList  = Array.isArray(ord)  ? ord  : (ord.results  ?? []);
      const bookList = Array.isArray(book) ? book : (book.results ?? []);
      setOrders(ordList.filter((o: any) => ["paid", "seller_completed", "completed"].includes(o.status)));
      setBookings(bookList.filter((b: any) => b.vendor_username === user?.username && ["completed", "cancelled"].includes(b.status)));
    } catch {} finally { setLoading(false); }
  }, [user?.username]);

  useEffect(() => { load(); }, [load]);

  const applyPeriod = (list: any[], key = "created_at") => {
    if (period === "all") return list;
    const cutoff = Date.now() - (period === "week" ? 7 : 30) * 86400000;
    return list.filter((item: any) => item[key] && new Date(item[key]).getTime() >= cutoff);
  };

  const filteredOrders   = applyPeriod(orders);
  const filteredBookings = applyPeriod(bookings, "scheduled_date");
  const totalRevenue     = filteredOrders.reduce((s, o) => s + Number(o.listing?.price ?? o.amount ?? 0), 0);

  const exportCSV = async () => {
    setSharing(true);
    try {
      let csv = "";
      if (tab === "orders") {
        csv = "Reference,Date,Listing,Buyer,Amount,Status\n";
        csv += filteredOrders.map(o =>
          [
            `"${o.reference ?? ""}"`,
            `"${o.created_at ? new Date(o.created_at).toLocaleDateString("en-NG") : ""}"`,
            `"${(o.listing?.title ?? o.listing_title ?? "").replace(/"/g, '""')}"`,
            `"${(o.buyer ?? o.buyer_username ?? "").replace(/"/g, '""')}"`,
            `"₦${Number(o.listing?.price ?? o.amount ?? 0).toLocaleString()}"`,
            `"${o.status ?? ""}"`,
          ].join(",")
        ).join("\n");
      } else {
        csv = "Title,Buyer,Date,Time,Price,Status\n";
        csv += filteredBookings.map(b =>
          [
            `"${(b.listing_title ?? "").replace(/"/g, '""')}"`,
            `"${(b.buyer_username ?? "").replace(/"/g, '""')}"`,
            `"${b.scheduled_date ?? ""}"`,
            `"${b.scheduled_time ?? ""}"`,
            `"₦${Number(b.listing_price ?? 0).toLocaleString()}"`,
            `"${b.status ?? ""}"`,
          ].join(",")
        ).join("\n");
      }
      await Share.share({ message: csv, title: `Studex ${tab} history` });
    } catch { Alert.alert("Error", "Could not export."); }
    finally { setSharing(false); }
  };

  if (loading) return <ActivityIndicator color="#0D9488" style={{ marginTop: 48 }} />;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 16, paddingTop: 20 }}>
      <Text style={S.sectionLabel}>RECORD</Text>
      <Text style={{ fontSize: 26, fontFamily: "DMSans_700Bold", color: "#1c1917", marginTop: 2, marginBottom: 16 }}>History</Text>

      {/* Revenue summary */}
      <View style={{ backgroundColor: "#0D9488", borderRadius: 18, padding: 20, marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="trending-up" size={17} color="rgba(255,255,255,0.85)" />
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontFamily: "DMSans_600SemiBold" }}>Completed Orders Revenue</Text>
          </View>
          <TouchableOpacity onPress={exportCSV} disabled={sharing} activeOpacity={0.75}
            style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 5 }}>
            {sharing
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="download-outline" size={14} color="#fff" /><Text style={{ fontSize: 12, color: "#fff", fontFamily: "DMSans_600SemiBold" }}>Export CSV</Text></>
            }
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 32, color: "#fff", fontFamily: "DMSans_700Bold" }}>₦{totalRevenue.toLocaleString("en-NG")}</Text>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontFamily: "DMSans_400Regular", marginTop: 4 }}>
          From {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Orders / Bookings tab */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        {(["orders", "bookings"] as Tab[]).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} activeOpacity={0.75}
            style={[S.filterChip, t === tab && { backgroundColor: "#0D9488", borderColor: "#0D9488" }]}>
            <Text style={[S.filterChipText, t === tab && S.filterChipTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Period filter */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
        {([["all", "All Time"], ["week", "This Week"], ["month", "This Month"]] as [Period, string][]).map(([v, label]) => (
          <TouchableOpacity key={v} onPress={() => setPeriod(v)} activeOpacity={0.75}
            style={[S.filterChip, { paddingHorizontal: 10, paddingVertical: 6 }, v === period && { backgroundColor: "#0D9488", borderColor: "#0D9488" }]}>
            <Text style={[{ fontSize: 12 }, S.filterChipText, v === period && S.filterChipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders list */}
      {tab === "orders" && (
        filteredOrders.length === 0 ? (
          <View style={S.emptyState}>
            <Ionicons name="bag-outline" size={40} color="#e7e5e4" />
            <Text style={{ fontSize: 14, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 12 }}>No completed orders yet</Text>
          </View>
        ) : filteredOrders.map((order, i, arr) => {
          const sc = ORDER_STATUS[order.status] ?? { bg: "#f5f5f4", text: "#6b7280", label: order.status };
          return (
            <View key={order.id} style={[S.card, i < arr.length - 1 && { marginBottom: 10 }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 13, fontFamily: "DMSans_700Bold", color: "#1c1917" }}>#{order.reference}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <Ionicons name="calendar-outline" size={11} color="#9ca3af" />
                    <Text style={{ fontSize: 12, color: "#9ca3af", fontFamily: "DMSans_400Regular" }}>
                      {order.created_at ? new Date(order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : ""}
                    </Text>
                  </View>
                  {order.listing?.title ? <Text style={{ fontSize: 13, color: "#44403c", fontFamily: "DMSans_500Medium", marginTop: 6 }}>{order.listing.title}</Text> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <Ionicons name="person-outline" size={11} color="#9ca3af" />
                    <Text style={{ fontSize: 12, color: "#6b7280", fontFamily: "DMSans_400Regular" }}>{order.buyer ?? order.buyer_username}</Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 18, fontFamily: "DMSans_700Bold", color: "#16a34a" }}>
                    ₦{Number(order.listing?.price ?? order.amount ?? 0).toLocaleString()}
                  </Text>
                  <View style={{ backgroundColor: sc.bg, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 }}>
                    <Text style={{ fontSize: 10, color: sc.text, fontFamily: "DMSans_600SemiBold" }}>{sc.label}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })
      )}

      {/* Bookings list */}
      {tab === "bookings" && (
        filteredBookings.length === 0 ? (
          <View style={S.emptyState}>
            <Ionicons name="calendar-outline" size={40} color="#e7e5e4" />
            <Text style={{ fontSize: 14, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 12 }}>No past bookings yet</Text>
          </View>
        ) : filteredBookings.map((booking, i, arr) => {
          const done = booking.status === "completed";
          return (
            <View key={booking.id} style={[S.card, i < arr.length - 1 && { marginBottom: 10 }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 13, fontFamily: "DMSans_700Bold", color: "#1c1917" }}>{booking.listing_title}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Ionicons name="person-outline" size={11} color="#9ca3af" />
                    <Text style={{ fontSize: 12, color: "#6b7280", fontFamily: "DMSans_400Regular" }}>{booking.buyer_username}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <Ionicons name="calendar-outline" size={11} color="#9ca3af" />
                    <Text style={{ fontSize: 12, color: "#9ca3af", fontFamily: "DMSans_400Regular" }}>
                      {booking.scheduled_date}{booking.scheduled_time ? ` · ${booking.scheduled_time}` : ""}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 18, fontFamily: "DMSans_700Bold", color: "#1c1917" }}>
                    ₦{Number(booking.listing_price ?? 0).toLocaleString()}
                  </Text>
                  <View style={{ backgroundColor: done ? "#dcfce7" : "#fef2f2", borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 }}>
                    <Text style={{ fontSize: 10, color: done ? "#16a34a" : "#ef4444", fontFamily: "DMSans_600SemiBold" }}>
                      {done ? "✓ Completed" : "✕ Cancelled"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })
      )}

      {/* Period total */}
      {tab === "orders" && filteredOrders.length > 0 && (
        <View style={[S.card, { marginTop: 4 }]}>
          <Text style={{ fontSize: 13, color: "#44403c", fontFamily: "DMSans_400Regular" }}>
            Total for this period:{" "}
            <Text style={{ color: "#0D9488", fontFamily: "DMSans_700Bold" }}>₦{totalRevenue.toLocaleString()}</Text>
            {" "}({filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""})
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
