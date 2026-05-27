import {
  View, Text, FlatList, Image, TextInput, TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface Category {
  id: number;
  title: string;
  slug: string;
  image: string;
}

interface Listing {
  id: number;
  title: string;
  price: string;
  image: string;
  listing_type: "product" | "service";
  is_available: boolean;
  avg_rating: number;
  review_count: number;
  vendor: { username: string; business_name?: string | null };
}

// ─────────────────────────────────────────
// Listing card — defined outside to avoid remount churn
// ─────────────────────────────────────────
function ListingCard({ item, onPress }: { item: Listing; onPress: () => void }) {
  const displayPrice = parseFloat(item.price);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        flex: 1, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1,
        borderColor: "#E7E5E4", overflow: "hidden", margin: 5,
      }}
    >
      {/* Image */}
      <View style={{ backgroundColor: "#1C1917", height: 115 }}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={{ width: "100%", height: 115 }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="sparkles-outline" size={28} color="#555" />
          </View>
        )}
        {!item.is_available && (
          <View style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Unavailable</Text>
          </View>
        )}
      </View>
      {/* Info */}
      <View style={{ padding: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1C1917", lineHeight: 16 }} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: "800", color: "#7C3AED", marginTop: 5 }}>
          ₦{displayPrice.toLocaleString()}
        </Text>
        {item.avg_rating > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 }}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={{ fontSize: 11, color: "#A8A29E" }}>
              {item.avg_rating.toFixed(1)} ({item.review_count})
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────
// Category card — defined outside for performance
// ─────────────────────────────────────────
function CategoryCard({ cat, onPress }: { cat: Category; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{ flex: 1, margin: 5, height: 120, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#E7E5E4" }}
    >
      {cat.image?.startsWith("http") ? (
        <Image source={{ uri: cat.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={["#CCFBF1", "#EDE9FE"]}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="sparkles-outline" size={36} color="#D6D3D1" />
        </LinearGradient>
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.72)"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, justifyContent: "flex-end", padding: 10 }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }} numberOfLines={1}>
          {cat.title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────
// Screen
// ─────────────────────────────────────────
export default function SearchScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const school = user?.school ?? "pau";

  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<Listing[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    api
      .get<{ results?: Category[] } | Category[]>(`/api/services/categories/?campus=${school}`)
      .then(data => {
        setCategories(Array.isArray(data) ? data : (data.results ?? []));
      })
      .catch(() => {})
      .finally(() => setCatLoading(false));
  }, [school]);

  // Fetch listings by category slug
  useEffect(() => {
    if (!selectedCat) return;
    setSearching(true);
    api
      .get<{ results?: Listing[] } | Listing[]>(
        `/api/services/listings/?category=${selectedCat.slug}&campus=${school}&page_size=100`
      )
      .then(data => setResults(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, [selectedCat, school]);

  // Debounced text search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await api.get<{ results?: Listing[] } | Listing[]>(
          `/api/services/listings/?search=${encodeURIComponent(trimmed)}&campus=${school}`
        );
        setResults(Array.isArray(data) ? data : (data.results ?? []));
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 400);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, school]);

  function handleCategoryPress(cat: Category) {
    setSelectedCat(cat);
    setQuery("");
  }

  function clearResults() {
    setSelectedCat(null);
    setQuery("");
    setResults([]);
  }

  const isSearchMode = query.trim().length > 0 || selectedCat !== null;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>

      {/* ── Search bar ── */}
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#F5F5F5" }}>
        <View style={{
          flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
          borderRadius: 14, borderWidth: 1, borderColor: "#E7E5E4",
          paddingHorizontal: 14, paddingVertical: 10, gap: 10,
        }}>
          <Ionicons name="search-outline" size={20} color="#A8A29E" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search listings, vendors..."
            placeholderTextColor="#A8A29E"
            style={{ flex: 1, fontSize: 15, color: "#1C1917", paddingVertical: 0 }}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isSearchMode && (
            <TouchableOpacity onPress={clearResults}>
              <Ionicons name="close-circle" size={18} color="#A8A29E" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Categories view ── */}
      {!isSearchMode && (
        catLoading ? (
          <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            numColumns={2}
            data={categories}
            keyExtractor={c => String(c.id)}
            contentContainerStyle={{ paddingHorizontal: 11, paddingBottom: 100 }}
            ListHeaderComponent={
              <View style={{ paddingHorizontal: 4, paddingTop: 8, paddingBottom: 16 }}>
                <Text style={{ fontSize: 11, color: "#0D9488", letterSpacing: 2, textTransform: "uppercase", fontWeight: "600" }}>
                  Browse
                </Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: "#1C1917", marginTop: 2 }}>
                  What do you need today?
                </Text>
                <Text style={{ fontSize: 13, color: "#A8A29E", marginTop: 2 }}>
                  All services available on campus.
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 40 }}>
                <Ionicons name="sparkles-outline" size={48} color="#E7E5E4" />
                <Text style={{ color: "#A8A29E", fontSize: 15, marginTop: 12 }}>No categories yet</Text>
              </View>
            }
            renderItem={({ item: cat }) => (
              <CategoryCard cat={cat} onPress={() => handleCategoryPress(cat)} />
            )}
          />
        )
      )}

      {/* ── Search / category results view ── */}
      {isSearchMode && (
        <FlatList
          numColumns={2}
          data={results}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 11, paddingBottom: 100 }}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 4, paddingTop: 8, paddingBottom: 12 }}>
              {selectedCat && (
                <TouchableOpacity
                  onPress={clearResults}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={16} color="#0D9488" />
                  <Text style={{ fontSize: 13, color: "#0D9488", fontWeight: "600" }}>All Categories</Text>
                </TouchableOpacity>
              )}
              {searching ? (
                <Text style={{ fontSize: 13, color: "#A8A29E" }}>Loading...</Text>
              ) : selectedCat ? (
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#1C1917" }}>
                  {selectedCat.title}
                  <Text style={{ fontSize: 13, fontWeight: "400", color: "#A8A29E" }}>
                    {"  "}{results.length} listing{results.length !== 1 ? "s" : ""}
                  </Text>
                </Text>
              ) : (
                <Text style={{ fontSize: 13, color: "#A8A29E" }}>
                  {results.length > 0
                    ? `${results.length} result${results.length !== 1 ? "s" : ""} for "${query.trim()}"`
                    : `No results for "${query.trim()}"`}
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            !searching ? (
              <View style={{ alignItems: "center", paddingTop: 32, paddingHorizontal: 24 }}>
                <Ionicons name="search-outline" size={48} color="#E7E5E4" />
                <Text style={{ color: "#A8A29E", fontSize: 15, marginTop: 12, textAlign: "center" }}>
                  {selectedCat ? `No listings in ${selectedCat.title} yet.` : "No listings match your search."}
                </Text>
                <Text style={{ color: "#D6D3D1", fontSize: 13, marginTop: 4, textAlign: "center" }}>
                  Try a different keyword or browse a category.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ListingCard
              item={item}
              onPress={() => router.push(`/listing/${item.id}`)}
            />
          )}
        />
      )}

      {/* Loading spinner overlay */}
      {searching && isSearchMode && (
        <View style={{ position: "absolute", top: 130, left: 0, right: 0, alignItems: "center" }}>
          <ActivityIndicator size="small" color="#0D9488" />
        </View>
      )}
    </View>
  );
}
