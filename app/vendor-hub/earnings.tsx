import { View, Text, ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { S } from "./_shared";

export default function VendorEarningsPage() {
  const [earnings,     setEarnings]     = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [earn, txns] = await Promise.all([
        api.get<any>("/api/payments/seller/earnings/"),
        api.get<any>("/api/payments/seller/transactions/"),
      ]);
      setEarnings(earn);
      setTransactions(Array.isArray(txns) ? txns : (txns.results ?? []));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalEarned = Number(earnings?.total_earned || 0);
  const totalOrders = Number(earnings?.total_orders ?? 0);

  if (loading) return <ActivityIndicator color="#0D9488" style={{ marginTop: 48 }} />;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 16, paddingTop: 20 }}>
      <Text style={S.sectionLabel}>OVERVIEW</Text>
      <Text style={{ fontSize: 26, fontFamily: "DMSans_700Bold", color: "#1c1917", marginTop: 2, marginBottom: 16 }}>Your Earnings</Text>

      {/* Stat cards */}
      <View style={[S.card, { marginHorizontal: 0, marginBottom: 10 }]}>
        <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans_400Regular" }}>Total Earned</Text>
        <Text style={{ fontSize: 28, color: "#0D9488", fontFamily: "DMSans_700Bold", marginTop: 4 }}>₦{totalEarned.toLocaleString("en-NG")}</Text>
        <Text style={{ fontSize: 12, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 4 }}>Your cumulative payouts</Text>
      </View>
      <View style={[S.card, { marginHorizontal: 0, marginBottom: 10 }]}>
        <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans_400Regular" }}>Completed Orders</Text>
        <Text style={{ fontSize: 28, color: "#7C3AED", fontFamily: "DMSans_700Bold", marginTop: 4 }}>{totalOrders}</Text>
        <Text style={{ fontSize: 12, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 4 }}>All time</Text>
      </View>
      <View style={[S.card, { marginHorizontal: 0, marginBottom: 20 }]}>
        <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans_400Regular" }}>Service Fee</Text>
        <Text style={{ fontSize: 28, color: "#1c1917", fontFamily: "DMSans_700Bold", marginTop: 4 }}>8%</Text>
        <Text style={{ fontSize: 12, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 4 }}>Min ₦50 · Max ₦3,500 per transaction</Text>
      </View>

      {/* Payouts explanation */}
      <View style={[S.card, { marginHorizontal: 0, marginBottom: 20 }]}>
        <Text style={[S.sectionLabel, { marginBottom: 6 }]}>PAYOUTS</Text>
        <Text style={{ fontSize: 18, fontFamily: "DMSans_700Bold", color: "#1c1917", marginBottom: 16 }}>How You Get Paid</Text>
        {[
          { n: "1", text: "A customer pays the full listing price through Paystack checkout." },
          { n: "2", text: "StudEx collects an 8% service fee (min ₦50, max ₦3,500) from the buyer. Your full listing price is transferred to your bank." },
          { n: "3", text: "Everything goes directly to your bank. Paystack pays out in real time, usually within minutes of the order completing." },
        ].map((step, i, arr) => (
          <View key={step.n} style={[{ flexDirection: "row", alignItems: "flex-start", gap: 14 }, i < arr.length - 1 && { marginBottom: 14 }]}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#f0fdfa", borderWidth: 1, borderColor: "#99f6e4", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              <Text style={{ color: "#0D9488", fontFamily: "DMSans_700Bold", fontSize: 12 }}>{step.n}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 13, color: "#44403c", fontFamily: "DMSans_400Regular", lineHeight: 20 }}>{step.text}</Text>
          </View>
        ))}
      </View>

      {/* Transactions */}
      <Text style={[S.sectionLabel, { marginBottom: 4 }]}>HISTORY</Text>
      <Text style={{ fontSize: 18, fontFamily: "DMSans_700Bold", color: "#1c1917", marginBottom: 16 }}>Transactions</Text>

      {transactions.length === 0 ? (
        <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans_400Regular", textAlign: "center", marginTop: 8 }}>No transactions yet</Text>
      ) : transactions.map((tx: any, index: number) => (
        <View key={tx.id} style={[{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 14 },
          index < transactions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0ef" }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 14, fontFamily: "DMSans_700Bold", color: "#1c1917" }}>{tx.service_name ?? `Order #${tx.order_id}`}</Text>
            <Text style={{ fontSize: 12, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 3 }}>
              {tx.buyer_name ?? ""}
              {tx.buyer_name && tx.created_at ? " · " : ""}
              {tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : ""}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 14, color: "#0D9488", fontFamily: "DMSans_700Bold" }}>₦{Number(tx.seller_amount).toLocaleString()}</Text>
            <Text style={{ fontSize: 11, color: "#9ca3af", fontFamily: "DMSans_400Regular", marginTop: 2 }}>your payout</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
