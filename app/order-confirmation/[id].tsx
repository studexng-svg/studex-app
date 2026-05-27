import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";

interface Order {
  id: number;
  reference: string;
  listing: {
    id: number;
    title: string;
    vendor: { username: string; business_name?: string };
  } | null;
  amount: string | number;
  status: string;
  created_at: string;
}

function getStatusStyle(status: string) {
  switch (status) {
    case "pending":        return { bg: "#fef3c7", text: "#d97706", label: "Pending Payment" };
    case "paid":
    case "processing":     return { bg: "#fef3c7", text: "#d97706", label: "In Progress" };
    case "seller_completed": return { bg: "#dbeafe", text: "#2563eb", label: "Ready to Confirm" };
    case "completed":      return { bg: "#dcfce7", text: "#16a34a", label: "Completed" };
    case "disputed":       return { bg: "#fee2e2", text: "#dc2626", label: "Disputed" };
    case "cancelled":      return { bg: "#fee2e2", text: "#dc2626", label: "Cancelled" };
    default:               return { bg: "#f5f5f4", text: "#6b7280", label: status };
  }
}

export default function OrderConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get<Order>(`/api/orders/orders/${id}/`)
      .then(data => setOrder(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF8F0", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  const amount = order ? parseFloat(String(order.amount)) : 0;
  const statusStyle = order ? getStatusStyle(order.status) : getStatusStyle("");
  const vendorName = order?.listing?.vendor?.business_name || order?.listing?.vendor?.username || "";
  const date = order
    ? new Date(order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF8F0" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
      >
        {/* ── Success animation ── */}
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <LinearGradient
            colors={["#0D9488", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="checkmark" size={48} color="#fff" />
          </LinearGradient>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#1c1917", marginTop: 16 }}>
            Order Confirmed!
          </Text>
          <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 4, textAlign: "center" }}>
            Your order has been placed successfully
          </Text>
        </View>

        {/* ── Order details card ── */}
        <View style={{
          backgroundColor: "#ffffff", borderRadius: 16, padding: 20, marginTop: 24,
          shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 }, elevation: 2,
        }}>
          <Text style={{
            fontSize: 11, fontWeight: "700", color: "#0D9488",
            letterSpacing: 1, textTransform: "uppercase", marginBottom: 16,
          }}>
            Order Details
          </Text>

          {/* Reference */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
            <Text style={{ fontSize: 13, color: "#6b7280" }}>Reference</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#1c1917" }}>
              {order?.reference || `STX-${id}`}
            </Text>
          </View>

          {/* Date + Status */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 13, color: "#6b7280" }}>Date</Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#1c1917", marginTop: 2 }}>{date}</Text>
            </View>
            <View style={{ backgroundColor: statusStyle.bg, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: statusStyle.text }}>{statusStyle.label}</Text>
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: "#f5f5f4", marginBottom: 14 }} />

          {/* Item */}
          {order?.listing && (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, color: "#6b7280" }}>Item</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#1c1917", marginTop: 2 }}>
                {order.listing.title}
              </Text>
              {vendorName ? (
                <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>from {vendorName}</Text>
              ) : null}
            </View>
          )}

          {/* Amount */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1c1917" }}>Amount Paid</Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#7C3AED" }}>
              ₦{amount.toLocaleString("en-NG")}
            </Text>
          </View>
        </View>

        {/* ── Paystack security banner ── */}
        <View style={{
          backgroundColor: "#CCFBF1", borderRadius: 12, padding: 14, marginTop: 12,
          flexDirection: "row", alignItems: "center",
        }}>
          <Ionicons name="shield-checkmark" size={20} color="#0D9488" />
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#0D9488", marginLeft: 8 }}>
            Payment Secured by Paystack
          </Text>
        </View>

        {/* ── Action buttons ── */}
        <View style={{ marginTop: 24, gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.push(`/order/${id}` as any)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#0D9488", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 9999, paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>View My Order</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace("/(tabs)" as any)}
            activeOpacity={0.85}
            style={{
              borderRadius: 9999, paddingVertical: 15, alignItems: "center",
              borderWidth: 1.5, borderColor: "#0D9488",
            }}
          >
            <Text style={{ color: "#0D9488", fontWeight: "700", fontSize: 15 }}>Back to Home</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
