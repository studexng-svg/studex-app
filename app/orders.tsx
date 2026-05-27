import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";

interface Order {
  id: number;
  reference: string;
  listing: { id: number; title: string; vendor: { username: string } } | null;
  amount: string | number;
  created_at: string;
  status: "pending" | "paid" | "processing" | "seller_completed" | "completed" | "disputed" | "cancelled";
}

function getStatusStyle(status: string) {
  switch (status) {
    case "pending":
      return { bg: "#fef3c7", text: "#d97706", label: "Pending Payment" };
    case "paid":
    case "processing":
      return { bg: "#fef3c7", text: "#d97706", label: "In Progress" };
    case "seller_completed":
      return { bg: "#dbeafe", text: "#2563eb", label: "Ready to Confirm" };
    case "completed":
      return { bg: "#dcfce7", text: "#16a34a", label: "Completed" };
    case "disputed":
      return { bg: "#fee2e2", text: "#dc2626", label: "Disputed" };
    case "cancelled":
      return { bg: "#fee2e2", text: "#dc2626", label: "Cancelled" };
    default:
      return { bg: "#f5f5f4", text: "#6b7280", label: status };
  }
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get<Order[] | { results: Order[] }>("/api/orders/orders/")
      .then(data => setOrders(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const Header = () => (
    <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
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
          History
        </Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#1c1917", marginTop: 2 }}>
          My Orders
        </Text>
      </View>
    </View>
  );

  if (!isLoading && orders.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
        <Header />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <Ionicons name="bag-outline" size={64} color="#E7E5E4" />
          <Text style={{ fontSize: 16, color: "#6b7280", marginTop: 16, marginBottom: 28 }}>
            No orders yet
          </Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)" as any)} activeOpacity={0.8}>
            <LinearGradient
              colors={["#0D9488", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 9999, paddingVertical: 14, paddingHorizontal: 32 }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Start Shopping</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <Header />

      {isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const s = getStatusStyle(item.status);
            const amount = parseFloat(String(item.amount));
            const date = new Date(item.created_at).toLocaleDateString("en-NG", {
              day: "numeric", month: "short", year: "numeric",
            });

            return (
              <TouchableOpacity
                onPress={() => router.push(`/order/${item.id}` as any)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: "#ffffff", borderRadius: 14,
                  marginHorizontal: 16, marginBottom: 10, padding: 16,
                  shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4,
                  shadowOffset: { width: 0, height: 1 }, elevation: 2,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1c1917" }}>
                    Order #{item.reference || item.id}
                  </Text>
                  <View style={{
                    backgroundColor: s.bg, borderRadius: 9999,
                    paddingHorizontal: 10, paddingVertical: 4,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: s.text }}>{s.label}</Text>
                  </View>
                </View>

                {item.listing && (
                  <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }} numberOfLines={1}>
                    {item.listing.title}
                  </Text>
                )}

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#0D9488" }}>
                    ₦{amount.toLocaleString("en-NG")}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9ca3af" }}>{date}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
