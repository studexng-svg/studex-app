import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, useWindowDimensions, Image,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { S } from "./_shared";

const STATUS_MAP: Record<string, { bg: string; text: string }> = {
  pending:          { bg: "#fef3c7", text: "#d97706" },
  confirmed:        { bg: "#f0fdfa", text: "#0D9488" },
  completed:        { bg: "#dcfce7", text: "#16a34a" },
  cancelled:        { bg: "#fef2f2", text: "#ef4444" },
  paid:             { bg: "#eff6ff", text: "#2563eb" },
  seller_completed: { bg: "#f5f3ff", text: "#7C3AED" },
};

function StatCard({ label, value, sub, color, bg, border, icon }: {
  label: string; value: string | number; sub: string;
  color: string; bg: string; border: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: border, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: bg, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 11, color: "#9ca3af", fontFamily: "DMSans_500Medium", marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 24, color: "#1c1917", fontFamily: "DMSans_700Bold", lineHeight: 28 }}>{value}</Text>
        <Text style={{ fontSize: 11, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 1 }}>{sub}</Text>
      </View>
    </View>
  );
}

export default function VendorOverviewPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { width: screenW } = useWindowDimensions();
  const isTablet = screenW >= 600;
  const pad = isTablet ? 24 : 16;

  const [earnings,     setEarnings]     = useState<any>(null);
  const [allOrders,    setAllOrders]    = useState<any[]>([]);
  const [listings,     setListings]     = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    if (!user?.username) return;
    setLoading(true);
    try {
      const [earn, ord, lst, txns] = await Promise.all([
        api.get<any>("/api/payments/seller/earnings/").catch(() => null),
        api.get<any>("/api/orders/orders/?role=seller").catch(() => []),
        api.get<any>(`/api/services/listings/?vendor_username=${user.username}&page_size=100`).catch(() => []),
        api.get<any>("/api/payments/seller/transactions/").catch(() => []),
      ]);
      setEarnings(earn);
      setAllOrders(Array.isArray(ord) ? ord : (ord.results ?? []));
      setListings(Array.isArray(lst) ? lst : (lst.results ?? []));
      setTransactions(Array.isArray(txns) ? txns : (txns.results ?? []));
    } finally { setLoading(false); }
  }, [user?.username]);

  useEffect(() => { load(); }, [load]);

  const totalEarned    = Number(earnings?.total_earned  || 0);
  const totalOrdersCnt = Number(earnings?.total_orders  || 0);
  const activeCnt      = listings.filter(l => l.is_available).length;
  const avgRating      = (user as any)?.profile?.rating ? Number((user as any).profile.rating).toFixed(1) : "0.0";
  const totalReviews   = (user as any)?.profile?.total_reviews || 0;
  const pendingCnt     = allOrders.filter(o => ["paid", "confirmed", "pending"].includes(o.status)).length;
  const recentOrders   = [...allOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);
  const vendorBadge    = (user as any)?.vendor_badge ?? (user as any)?.profile?.vendor_badge;
  const badgeLabel     = vendorBadge === "top" ? "🏆 Top Vendor" : vendorBadge === "trusted" ? "✅ Trusted" : vendorBadge === "rising" ? "⭐ Rising" : null;

  // Build 7-day bar chart data from transactions
  const chartData = (() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets: Record<number, number> = {};
    const now = Date.now();
    transactions.forEach((tx: any) => {
      const d = new Date(tx.created_at);
      const daysAgo = Math.floor((now - d.getTime()) / 86400000);
      if (daysAgo < 7) {
        const dow = d.getDay();
        buckets[dow] = (buckets[dow] || 0) + Number(tx.seller_amount || 0);
      }
    });
    return days.map((name, i) => ({ name, amount: buckets[i] || 0 }));
  })();
  const maxAmount = Math.max(...chartData.map(d => d.amount), 1);

  if (loading) return <ActivityIndicator color="#0D9488" style={{ marginTop: 48 }} />;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={{ maxWidth: isTablet ? 820 : undefined, width: "100%", alignSelf: "center", paddingHorizontal: pad, paddingTop: 20 }}>

        {/* Greeting */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 26, fontFamily: "DMSans_700Bold", color: "#1c1917" }}>Hello, @{user?.username}!</Text>
            <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 2 }}>Here's what's happening in your store.</Text>
          </View>
          {badgeLabel && (
            <View style={{ backgroundColor: "#fef3c7", borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#fde68a", marginLeft: 10, flexShrink: 0 }}>
              <Text style={{ color: "#d97706", fontSize: 13, fontFamily: "DMSans_600SemiBold" }}>{badgeLabel}</Text>
            </View>
          )}
        </View>

        {/* 2×2 stat grid */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <StatCard label="Total Earned" value={`₦${totalEarned >= 1000 ? (totalEarned / 1000).toFixed(1) + "k" : totalEarned.toLocaleString()}`} sub="All time" color="#0D9488" bg="#ccfbf1" border="#99f6e4" icon="cash-outline" />
          <StatCard label="Total Orders" value={totalOrdersCnt} sub="Completed" color="#7C3AED" bg="#ede9fe" border="#ddd6fe" icon="bag-outline" />
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <StatCard label="Active Listings" value={activeCnt} sub={`${listings.length} total`} color="#2563eb" bg="#dbeafe" border="#bfdbfe" icon="grid-outline" />
          <StatCard label="Rating" value={avgRating} sub={`${totalReviews} reviews`} color="#d97706" bg="#fef3c7" border="#fde68a" icon="star-outline" />
        </View>

        {/* Earnings chart card (This Week + Pending/Live) */}
        <View style={[S.card, { marginBottom: 16 }]}>
          {/* Card header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <View>
              <Text style={[S.sectionLabel, { marginBottom: 2 }]}>THIS WEEK</Text>
              <Text style={{ fontSize: 16, fontFamily: "DMSans_700Bold", color: "#1c1917" }}>Earnings Overview</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="trending-up-outline" size={15} color="#0D9488" />
              <Text style={{ fontSize: 12, color: "#0D9488", fontFamily: "DMSans_600SemiBold" }}>7-day</Text>
            </View>
          </View>

          {/* Bar chart */}
          {transactions.length === 0 ? (
            <View style={{ height: 88, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 13, color: "#d1d5db", fontFamily: "DMSans_400Regular" }}>No transactions yet</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "flex-end", height: 88, gap: 4, marginBottom: 8 }}>
              {chartData.map(d => {
                const barH = Math.max(4, (d.amount / maxAmount) * 70);
                return (
                  <View key={d.name} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
                    <View style={{ width: "55%", borderRadius: 4, backgroundColor: d.amount > 0 ? "#0D9488" : "#e7e5e4", height: barH }} />
                    <Text style={{ fontSize: 9, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 4 }}>{d.name}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Pending + Live row */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <TouchableOpacity onPress={() => router.push("/vendor-hub/orders" as any)} activeOpacity={0.8}
              style={{ flex: 1, backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fde68a", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="time-outline" size={18} color="#d97706" />
              <View>
                <Text style={{ fontSize: 11, color: "#d97706", fontFamily: "DMSans_600SemiBold" }}>Pending</Text>
                <Text style={{ fontSize: 22, color: "#1c1917", fontFamily: "DMSans_700Bold", lineHeight: 26 }}>{pendingCnt}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/vendor-hub/listings" as any)} activeOpacity={0.8}
              style={{ flex: 1, backgroundColor: "#f0fdfa", borderWidth: 1, borderColor: "#99f6e4", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#0D9488" />
              <View>
                <Text style={{ fontSize: 11, color: "#0D9488", fontFamily: "DMSans_600SemiBold" }}>Live</Text>
                <Text style={{ fontSize: 22, color: "#1c1917", fontFamily: "DMSans_700Bold", lineHeight: 26 }}>{activeCnt}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={[S.card, { padding: 0, overflow: "hidden", marginBottom: 16 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0ef" }}>
            <Text style={{ fontSize: 16, fontFamily: "DMSans_700Bold", color: "#1c1917" }}>Recent Orders</Text>
            <TouchableOpacity onPress={() => router.push("/vendor-hub/orders" as any)} activeOpacity={0.7}>
              <Text style={{ fontSize: 13, color: "#0D9488", fontFamily: "DMSans_600SemiBold" }}>View all →</Text>
            </TouchableOpacity>
          </View>
          {recentOrders.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Ionicons name="bag-outline" size={36} color="#e7e5e4" />
              <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 10 }}>No orders yet</Text>
            </View>
          ) : recentOrders.map((order: any, i: number) => {
            const sc  = STATUS_MAP[order.status] ?? { bg: "#f5f5f4", text: "#6b7280" };
            const pic = order.buyer_profile_picture ?? order.buyer_avatar ?? order.buyer?.profile_picture;
            const init = (order.buyer_username?.[0] ?? order.buyer?.[0] ?? "?").toUpperCase();
            return (
              <View key={order.id} style={[{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }, i < recentOrders.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f5f5f4" }]}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#0D9488", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0, overflow: "hidden" }}>
                  {pic
                    ? <Image source={{ uri: pic }} style={{ width: 38, height: 38 }} resizeMode="cover" />
                    : <Text style={{ color: "#fff", fontSize: 14, fontFamily: "DMSans_700Bold" }}>{init}</Text>
                  }
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontFamily: "DMSans_600SemiBold", color: "#1c1917" }} numberOfLines={1}>
                    {order.listing_title || order.listing?.title || `Order #${order.id}`}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 1 }} numberOfLines={1}>
                    @{order.buyer_username ?? order.buyer}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", flexShrink: 0, marginLeft: 8 }}>
                  <Text style={{ fontSize: 13, fontFamily: "DMSans_700Bold", color: "#1c1917" }}>
                    ₦{Number(order.total_price || order.amount || 0).toLocaleString()}
                  </Text>
                  <View style={{ backgroundColor: sc.bg, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3 }}>
                    <Text style={{ fontSize: 10, color: sc.text, fontFamily: "DMSans_600SemiBold" }}>
                      {(order.status || "").replace(/_/g, " ")}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Quick links */}
        <Text style={[S.sectionLabel, { marginBottom: 10 }]}>QUICK ACCESS</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {([
            { label: "Bookings", id: "bookings", icon: "calendar-outline",     color: "#0D9488", bg: "#f0fdfa" },
            { label: "Disputes", id: "disputes", icon: "alert-circle-outline", color: "#ef4444", bg: "#fef2f2" },
            { label: "Earnings", id: "earnings", icon: "cash-outline",         color: "#16a34a", bg: "#f0fdf4" },
            { label: "Reviews",  id: "reviews",  icon: "star-outline",         color: "#d97706", bg: "#fef3c7" },
            { label: "History",  id: "history",  icon: "time-outline",         color: "#7C3AED", bg: "#f5f3ff" },
          ] as const).map(item => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(`/vendor-hub/${item.id}` as any)}
              activeOpacity={0.8}
              style={{ width: (screenW - pad * 2 - 10 * 2) / 3, backgroundColor: item.bg, borderRadius: 14, padding: 14, alignItems: "center", gap: 6 }}
            >
              <Ionicons name={item.icon} size={20} color={item.color} />
              <Text style={{ fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#44403c" }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </View>
    </ScrollView>
  );
}
