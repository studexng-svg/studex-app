import {
  View, Text, FlatList, Image, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCartStore, CartItem } from "@/stores/cartStore";

// ─────────────────────────────────────────
// Cart item row — defined outside to avoid remount churn
// ─────────────────────────────────────────
function CartItemRow({
  item,
  onQtyChange,
  onRemove,
}: {
  item: CartItem;
  onQtyChange: (listingId: number, qty: number) => void;
  onRemove: (listingId: number, title: string) => void;
}) {
  return (
    <View style={{
      backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 12,
      borderWidth: 1, borderColor: "#E7E5E4", flexDirection: "row", gap: 12,
    }}>
      <View style={{ width: 76, height: 76, borderRadius: 12, overflow: "hidden", backgroundColor: "#F0EDEC" }}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={{ width: 76, height: 76 }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="sparkles-outline" size={26} color="#D6D3D1" />
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#1C1917" }} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 12, color: "#A8A29E", marginTop: 2 }}>
          ₦{item.price.toLocaleString()} each
        </Text>
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#7C3AED", marginTop: 4 }}>
          ₦{(item.price * item.quantity).toLocaleString()}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end", justifyContent: "space-between" }}>
        <View style={{
          flexDirection: "row", alignItems: "center",
          backgroundColor: "#F5F5F5", borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 6,
        }}>
          <TouchableOpacity onPress={() => onQtyChange(item.listing_id, Math.max(1, item.quantity - 1))}>
            <Ionicons name="remove" size={16} color="#44403C" />
          </TouchableOpacity>
          <Text style={{ fontWeight: "700", color: "#1C1917", marginHorizontal: 8, fontSize: 14, minWidth: 16, textAlign: "center" }}>
            {item.quantity}
          </Text>
          <TouchableOpacity onPress={() => onQtyChange(item.listing_id, item.quantity + 1)}>
            <Ionicons name="add" size={16} color="#44403C" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => onRemove(item.listing_id, item.title)}>
          <Ionicons name="trash-outline" size={20} color="#D6D3D1" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// Order summary footer
// ─────────────────────────────────────────
function OrderSummary({ items, total }: { items: CartItem[]; total: number }) {
  return (
    <View style={{
      backgroundColor: "#fff", borderRadius: 16, padding: 20,
      borderWidth: 1, borderColor: "#E7E5E4", marginTop: 4,
    }}>
      <Text style={{
        fontSize: 11, color: "#0D9488", letterSpacing: 2,
        textTransform: "uppercase", fontWeight: "600", marginBottom: 12,
      }}>
        Order Summary
      </Text>
      {items.map(item => (
        <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontSize: 13, color: "#A8A29E", flex: 1, marginRight: 8 }} numberOfLines={1}>
            {item.title} × {item.quantity}
          </Text>
          <Text style={{ fontSize: 13, color: "#44403C", fontWeight: "500" }}>
            ₦{(item.price * item.quantity).toLocaleString()}
          </Text>
        </View>
      ))}
      <View style={{
        borderTopWidth: 1, borderTopColor: "#F5F5F5", marginTop: 8, paddingTop: 12,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#1C1917" }}>Total</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#7C3AED" }}>
          ₦{total.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// Screen
// ─────────────────────────────────────────
export default function CartScreen() {
  const { items, isLoading, fetchCart, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();
  const router = useRouter();

  useEffect(() => { fetchCart(); }, []);

  function handleClearCart() {
    Alert.alert("Clear Cart", "Remove all items from your cart?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear All", style: "destructive", onPress: () => clearCart() },
    ]);
  }

  function handleRemoveItem(listingId: number, title: string) {
    Alert.alert("Remove Item", `Remove "${title}" from your cart?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeItem(listingId) },
    ]);
  }

  function handleCheckout() {
    router.push("/checkout" as any);
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!isLoading && items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <LinearGradient
          colors={["#0D9488", "#7C3AED"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 88, height: 88, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 20 }}
        >
          <Ionicons name="bag-outline" size={44} color="#fff" />
        </LinearGradient>
        <Text style={{ fontSize: 11, color: "#0D9488", letterSpacing: 2, textTransform: "uppercase", fontWeight: "600", marginBottom: 8 }}>
          Empty Cart
        </Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#1C1917", textAlign: "center", marginBottom: 8 }}>
          Your cart is empty
        </Text>
        <Text style={{ fontSize: 14, color: "#A8A29E", textAlign: "center", marginBottom: 32 }}>
          Add something from our listings to get started.
        </Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)")} activeOpacity={0.8}>
          <LinearGradient
            colors={["#0D9488", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 9999, paddingVertical: 14, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Browse Listings</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const total = getTotal();

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>

      {/* ── Header ── */}
      <View style={{
        paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
        flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
      }}>
        <View>
          <Text style={{ fontSize: 11, color: "#0D9488", letterSpacing: 2, textTransform: "uppercase", fontWeight: "600" }}>
            Your Order
          </Text>
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#1C1917", marginTop: 2 }}>
            Cart ({items.length})
          </Text>
        </View>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "600" }}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <CartItemRow
              item={item}
              onQtyChange={updateQuantity}
              onRemove={handleRemoveItem}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 180 }}
          ListFooterComponent={<OrderSummary items={items} total={total} />}
        />
      )}

      {/* ── Checkout button (fixed bottom) ── */}
      {!isLoading && items.length > 0 && (
        <View style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: 20, paddingBottom: 32, backgroundColor: "#F5F5F5",
          borderTopWidth: 1, borderTopColor: "#E7E5E4",
        }}>
          <TouchableOpacity onPress={handleCheckout} activeOpacity={0.8}>
            <LinearGradient
              colors={["#0D9488", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 9999, paddingVertical: 16,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Checkout Now</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
