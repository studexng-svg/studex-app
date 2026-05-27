import {
  View, Text, FlatList, Image, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useWishlistStore, WishlistItem } from "@/stores/wishlistStore";
import { useCartStore } from "@/stores/cartStore";

function WishlistRow({
  item,
  onRemove,
  onAddToCart,
}: {
  item: WishlistItem;
  onRemove: (id: number, title: string) => void;
  onAddToCart: (listingId: number) => void;
}) {
  const vendorUsername = item.vendor?.business_name || item.vendor?.username || "";

  return (
    <View style={{
      backgroundColor: "#ffffff", borderRadius: 14,
      marginHorizontal: 16, marginBottom: 10, padding: 12,
      flexDirection: "row", alignItems: "center",
      shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 2,
    }}>
      <View style={{ width: 80, height: 80, borderRadius: 10, overflow: "hidden", backgroundColor: "#F5F5F5" }}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={{ width: 80, height: 80 }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="image-outline" size={28} color="#D6D3D1" />
          </View>
        )}
      </View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1c1917" }} numberOfLines={2}>
          {item.title}
        </Text>
        {vendorUsername ? (
          <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            @{vendorUsername}
          </Text>
        ) : null}
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#0D9488", marginTop: 4 }}>
          ₦{item.price.toLocaleString("en-NG")}
        </Text>
      </View>

      <View style={{ alignItems: "center", gap: 10, marginLeft: 10 }}>
        <TouchableOpacity onPress={() => onRemove(item.id, item.title)} activeOpacity={0.7}>
          <Ionicons name="heart" size={22} color="#EF4444" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAddToCart(item.listing_id)}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#0D9488", borderRadius: 8,
            paddingHorizontal: 10, paddingVertical: 5,
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "600" }}>
            Add to Cart
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function WishlistScreen() {
  const { items, isLoading, fetchWishlist, removeItem } = useWishlistStore();
  const { addItem: addToCart } = useCartStore();
  const router = useRouter();

  useEffect(() => { fetchWishlist(); }, []);

  function handleRemove(id: number, _title: string) {
    Alert.alert(
      "Remove from Wishlist",
      "Remove this item from your wishlist?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeItem(id) },
      ]
    );
  }

  async function handleAddToCart(listingId: number) {
    try {
      await addToCart(listingId, 1);
      Alert.alert("Added to cart!");
    } catch {}
  }

  const BackButton = () => (
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
  );

  if (!isLoading && items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <BackButton />
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#1c1917" }}>Wishlist</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <Ionicons name="heart" size={64} color="#E7E5E4" />
          <Text style={{ fontSize: 16, color: "#6b7280", marginTop: 16, marginBottom: 28 }}>
            Your wishlist is empty
          </Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)" as any)} activeOpacity={0.8}>
            <LinearGradient
              colors={["#0D9488", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 9999, paddingVertical: 14, paddingHorizontal: 32 }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Browse Listings</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <BackButton />
        <View>
          <Text style={{ fontSize: 11, color: "#0D9488", letterSpacing: 2, textTransform: "uppercase", fontWeight: "600" }}>
            Saved Items
          </Text>
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#1c1917", marginTop: 2 }}>
            Wishlist ({items.length})
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <WishlistRow
              item={item}
              onRemove={handleRemove}
              onAddToCart={handleAddToCart}
            />
          )}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
