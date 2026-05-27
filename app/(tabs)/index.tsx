import {
  View,
  Text,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TextInput,
  SafeAreaView,
  Animated,
} from "react-native";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: number;
  title: string;
  slug: string;
  image: string | null;
}

interface ListingVendor {
  id: number;
  username: string;
  business_name?: string | null;
  profile?: {
    vendor_badge?: string;
    rating?: string;
    total_reviews?: number;
  };
}

interface Listing {
  id: number;
  title: string;
  image: string | null;
  price: string | number;
  is_available: boolean;
  is_reserved: boolean;
  listing_type: string;
  category: string;
  created_at: string;
  vendor: ListingVendor | string | null;
}

type FeedRow =
  | { type: "sectionHeader"; title: string; count?: number; id: string }
  | { type: "row"; left: Listing; right: Listing | null; id: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function pairIntoRows(items: Listing[], idPrefix: string): FeedRow[] {
  const rows: FeedRow[] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push({
      type: "row",
      left: items[i],
      right: items[i + 1] ?? null,
      id: `${idPrefix}-${items[i].id}`,
    });
  }
  return rows;
}

function buildFeedRows(
  newArrivals: Listing[],
  older: Listing[],
  categories: Category[]
): FeedRow[] {
  const rows: FeedRow[] = [];

  if (newArrivals.length > 0) {
    rows.push({ type: "sectionHeader", title: "New Arrivals", count: newArrivals.length, id: "h-new" });
    rows.push(...pairIntoRows(newArrivals, "r-new"));
  }

  const catSlugs = new Set(categories.map((c) => c.slug));

  for (const cat of categories) {
    const items = older.filter((l) => l.category === cat.slug);
    if (!items.length) continue;
    rows.push({
      type: "sectionHeader",
      title: cat.title,
      count: items.length,
      id: `h-${cat.slug}`,
    });
    rows.push(...pairIntoRows(items, `r-${cat.slug}`));
  }

  const uncategorised = older.filter((l) => !catSlugs.has(l.category));
  if (uncategorised.length > 0) {
    rows.push({
      type: "sectionHeader",
      title: "Other",
      count: uncategorised.length,
      id: "h-other",
    });
    rows.push(...pairIntoRows(uncategorised, "r-other"));
  }

  return rows;
}

function buildSearchRows(results: Listing[]): FeedRow[] {
  if (!results.length) return [];
  const rows: FeedRow[] = [
    {
      type: "sectionHeader",
      title: `${results.length} result${results.length !== 1 ? "s" : ""}`,
      id: "h-search",
    },
  ];
  rows.push(...pairIntoRows(results, "r-s"));
  return rows;
}

function applyPriceFilter(
  items: Listing[],
  min: string,
  max: string
): Listing[] {
  const lo = min ? Number(min) : null;
  const hi = max ? Number(max) : null;
  if (!lo && !hi) return items;
  return items.filter((l) => {
    const p = Number(l.price);
    if (lo && p < lo) return false;
    if (hi && p > hi) return false;
    return true;
  });
}

// ─── ListingCard ──────────────────────────────────────────────────────────────

function ListingCard({ listing, onToast }: { listing: Listing; onToast: (msg: string, color: string) => void }) {
  const router = useRouter();
  const { addItem: addToCart } = useCartStore();
  const {
    isInWishlist,
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    items: wishlistItems,
  } = useWishlistStore();

  const vendor =
    typeof listing.vendor === "object" && listing.vendor !== null
      ? (listing.vendor as ListingVendor)
      : null;
  const vendorUsername =
    typeof listing.vendor === "string"
      ? listing.vendor
      : vendor?.username ?? "";

  const wishlisted = isInWishlist(listing.id);
  const isService = (listing.listing_type || "").toLowerCase() === "service";
  const isReserved = !isService && !!listing.is_reserved;
  const price = Number(listing.price);
  const hasImage = !!listing.image && listing.image.startsWith("http");
  const badge = vendor?.profile?.vendor_badge;
  const hasBadge = badge && badge !== "none";

  const handleWishlist = async () => {
    try {
      if (wishlisted) {
        const item = wishlistItems.find((i) => i.listing_id === listing.id);
        if (item) await removeFromWishlist(item.id);
        onToast("Removed from wishlist", "#EF4444");
      } else {
        await addToWishlist(listing.id);
        onToast("Added to wishlist", "#EF4444");
      }
    } catch {}
  };

  const handleAddToCart = async () => {
    try {
      await addToCart(listing.id, 1);
      onToast("Added to cart", "#0D9488");
    } catch {}
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/listing/${listing.id}` as any)}
      activeOpacity={0.9}
    >
      <View style={styles.cardImgContainer}>
        {hasImage ? (
          <Image
            source={{ uri: listing.image! }}
            style={styles.cardImg}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={["#0D9488", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardImg}
          />
        )}

        {!listing.is_available && (
          <View style={styles.unavailableOverlay}>
            <View style={styles.unavailablePill}>
              <Text style={styles.unavailableText}>Unavailable</Text>
            </View>
          </View>
        )}

        {hasBadge && (
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              {badge === "top"
                ? "Top Vendor"
                : badge === "trusted"
                ? "Trusted"
                : "Rising"}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.heartBtn}
          onPress={handleWishlist}
          activeOpacity={0.7}
        >
          <Ionicons
            name={wishlisted ? "heart" : "heart-outline"}
            size={15}
            color={wishlisted ? "#EF4444" : "#6b7280"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {listing.title}
        </Text>
        {vendorUsername ? (
          <Text style={styles.cardVendor} numberOfLines={1}>
            @{vendorUsername}
          </Text>
        ) : null}
        <Text style={styles.cardPrice}>₦{price.toLocaleString("en-NG")}</Text>

        {isReserved ? (
          <View style={[styles.ctaBtn, styles.ctaReserved]}>
            <Text style={[styles.ctaText, { color: "#d97706" }]}>Reserved</Text>
          </View>
        ) : isService ? (
          <TouchableOpacity
            onPress={() => router.push(`/listing/${listing.id}` as any)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#2DD4BF", "#0D9488"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              <Ionicons name="cart-outline" size={12} color="#fff" />
              <Text style={[styles.ctaText, { color: "#ffffff" }]}>Book Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleAddToCart} activeOpacity={0.8}>
            <LinearGradient
              colors={["#2DD4BF", "#0D9488"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              <Ionicons name="cart-outline" size={12} color="#fff" />
              <Text style={[styles.ctaText, { color: "#ffffff" }]}>
                Add to Cart
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { fetchCart } = useCartStore();
  const { fetchWishlist } = useWishlistStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"listings" | "vendors">("listings");
  const [refreshing, setRefreshing] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Listing[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Price filter
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const campus = (user?.school || "pau").toLowerCase();

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState("#0D9488");
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((msg: string, color: string) => {
    setToastMsg(msg);
    setToastColor(color);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(toastAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [toastAnim]);

  const loadData = useCallback(async () => {
    try {
      const [catData, listData] = await Promise.all([
        api.get<any>(`/api/services/categories/?campus=${campus}`),
        api.get<any>(`/api/services/listings/?campus=${campus}&page_size=500`),
        api.get<any>(`/api/auth/vendors/?campus=${campus}&page_size=500`),
      ]);
      setCategories(Array.isArray(catData) ? catData : catData.results ?? []);
      setListings(Array.isArray(listData) ? listData : listData.results ?? []);
    } catch {}
  }, [campus]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadData(), fetchCart(), fetchWishlist()]).finally(() =>
      setIsLoading(false)
    );
  }, [loadData]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await api.get<any>(
          `/api/services/listings/?search=${encodeURIComponent(searchQuery.trim())}`
        );
        setSearchResults(Array.isArray(data) ? data : data.results ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(), fetchCart(), fetchWishlist()]);
    setRefreshing(false);
  }, [loadData]);

  const isSearchMode = searchQuery.trim().length > 0;

  // Build feed rows
  const filtered = applyPriceFilter(
    selectedCategory === "all"
      ? listings
      : listings.filter((l) => l.category === selectedCategory),
    minPrice,
    maxPrice
  );
  const newArrivals = filtered.filter(
    (l) => Date.now() - new Date(l.created_at).getTime() < TWENTY_FOUR_HOURS
  );
  const newIds = new Set(newArrivals.map((l) => l.id));
  const older = filtered.filter((l) => !newIds.has(l.id));
  const feedRows = buildFeedRows(newArrivals, older, categories);

  const activeRows: FeedRow[] = isSearchMode
    ? buildSearchRows(searchResults)
    : activeTab === "listings"
    ? feedRows
    : [];

  // ─ ListHeaderComponent ─
  const listHeader = (
    <>
      {/* ── TOP BAR: logo + search + user ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.logoWrap}>
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require("../../assets/logo-1.jpg")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons
            name="search-outline"
            size={15}
            color="#9ca3af"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services, vendors..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.userBtn}
          onPress={() => router.push("/(tabs)/profile" as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={15} color="#9ca3af" />
          <Text style={styles.userBtnText}>
            Hi,{" "}
            <Text style={styles.userBtnName}>{user?.username ?? ""}</Text>
          </Text>
          <Ionicons name="chevron-down" size={13} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* ── Hide rest of header while searching ── */}
      {!isSearchMode && (
        <>
          {/* HERO */}
          <LinearGradient
            colors={["#6D28D9", "#4F46E5", "#06B6D4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroInner}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroTitle}>
                  {"Shop Smart.\nLive Campus."}
                </Text>
                <Text style={styles.heroSubtitle}>
                  Explore hundreds of services from verified vendors on your
                  campus, every day.
                </Text>
                <View style={styles.heroBtns}>
                  <TouchableOpacity
                    style={styles.heroShopBtn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.heroShopBtnText}>Shop Now →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.heroVendorBtn}
                    onPress={() => setActiveTab("vendors")}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.heroVendorBtnText}>View Vendors</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.heroImgWrap}>
                <Image
                  source={{
                    uri: "https://plus.unsplash.com/premium_photo-1681487865280-c2b836dd83e8?fm=jpg&q=80&w=900&auto=format&fit=crop",
                  }}
                  style={styles.heroImg}
                  resizeMode="cover"
                />
              </View>
            </View>
          </LinearGradient>

          {/* CATEGORY PILLS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
          >
            {[
              { slug: "all", title: "All Products" },
              ...categories.map((c) => ({ slug: c.slug, title: c.title })),
            ].map((cat) => {
              const isActive = selectedCategory === cat.slug;
              return (
                <TouchableOpacity
                  key={cat.slug}
                  onPress={() => setSelectedCategory(cat.slug)}
                  activeOpacity={0.7}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={["#0D9488", "#7C3AED"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.pill}
                    >
                      <Text style={[styles.pillText, styles.pillTextActive]}>{cat.title}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.pill, styles.pillInactive]}>
                      <Text style={styles.pillText}>{cat.title}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* PRICE FILTER — only in listings tab */}
          {activeTab === "listings" && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Price:</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Min ₦"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
              />
              <Text style={styles.priceDash}>—</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max ₦"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
              />
              {(minPrice || maxPrice) ? (
                <TouchableOpacity
                  style={styles.priceClearBtn}
                  onPress={() => { setMinPrice(""); setMaxPrice(""); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.priceClearText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* TRUST BAR */}
          <View style={styles.trustBar}>
            <View style={[styles.trustItem, styles.trustItemBorder]}>
              <View style={styles.trustIcon}>
                <Ionicons name="shield-checkmark" size={20} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustTitle}>Trusted Vendors</Text>
                <Text style={styles.trustDesc}>Verified sellers you can trust</Text>
              </View>
            </View>
            <View style={styles.trustItem}>
              <View style={styles.trustIcon}>
                <Ionicons name="flash" size={20} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustTitle}>Fast Service</Text>
                <Text style={styles.trustDesc}>Get it done on campus quickly</Text>
              </View>
            </View>
          </View>

          {/* FEATURED SECTION HEADER */}
          <View style={styles.featuredHeader}>
            <View>
              <Text style={styles.featuredTitle}>
                {activeTab === "vendors"
                  ? "Campus Vendors"
                  : selectedCategory === "all"
                  ? "Featured Services"
                  : categories.find((c) => c.slug === selectedCategory)?.title ?? selectedCategory}
              </Text>
              <Text style={styles.featuredSubtitle}>
                {activeTab === "listings" ? "Selected by our team for you." : "Verified campus vendors."}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => router.push("/(tabs)/search" as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={13} color="#0D9488" />
            </TouchableOpacity>
          </View>

          {/* LISTINGS / VENDORS PILL TABS */}
          <View style={styles.tabsPillRow}>
            <View style={styles.tabsPill}>
              {(["listings", "vendors"] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                  style={[styles.tabPillBtn, activeTab === tab && styles.tabPillBtnActive]}
                >
                  <Text style={[styles.tabPillText, activeTab === tab && styles.tabPillTextActive]}>
                    {tab === "listings" ? "Listings" : "Vendors"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Searching spinner */}
      {isSearchMode && isSearching && (
        <View style={styles.searchSpinner}>
          <ActivityIndicator size="small" color="#0D9488" />
        </View>
      )}
    </>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#0D9488" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Toast overlay ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          {
            opacity: toastAnim,
            transform: [{
              translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }),
            }],
          },
        ]}
      >
        <View style={[styles.toastInner, { backgroundColor: toastColor }]}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      </Animated.View>

      <FlatList<FeedRow>
        data={activeRows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === "sectionHeader") {
            return (
              <View style={styles.sectionHeader}>
                <View>
                  {item.count !== undefined && (
                    <Text style={styles.sectionCount}>
                      {item.count} LISTING{item.count !== 1 ? "S" : ""}
                    </Text>
                  )}
                  <Text style={styles.sectionTitle}>{item.title.toUpperCase()}</Text>
                </View>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                  onPress={() => router.push("/(tabs)/search" as any)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: "#0D9488", fontSize: 13, fontWeight: "600" }}>View All</Text>
                  <Ionicons name="arrow-forward" size={13} color="#0D9488" />
                </TouchableOpacity>
              </View>
            );
          }
          return (
            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <ListingCard listing={item.left} onToast={showToast} />
              </View>
              <View style={styles.gridCol}>
                {item.right ? <ListingCard listing={item.right} onToast={showToast} /> : null }

              </View>
            </View>
          );
        }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {isSearchMode
                ? `No results for "${searchQuery}"`
                : activeTab === "vendors"
                ? "Vendors tab coming soon."
                : "No listings yet. Check back soon!"}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0D9488"
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 32,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 10,
    backgroundColor: "#F5F5F5",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e7e5e4",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  logoImg: {
    width: "100%",
    height: "100%",
  },
  userBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userBtnText: {
    fontSize: 13,
    color: "#6b7280",
  },
  userBtnName: {
    fontWeight: "700",
    color: "#1c1917",
  },

  // Search bar
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f5f5f4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    gap: 6,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1c1917",
    padding: 0,
  },

  // Hero
  hero: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 40,
    marginBottom: 12,
  },
  heroInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroLeft: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
    lineHeight: 22,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 16,
    marginBottom: 12,
  },
  heroBtns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  heroShopBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  heroShopBtnText: {
    color: "#1c1917",
    fontSize: 11,
    fontWeight: "700",
  },
  heroVendorBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroVendorBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  heroImgWrap: {
    width: 112,
    height: 144,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    flexShrink: 0,
  },
  heroImg: {
    width: "100%",
    height: "100%",
  },

  // Category pills
  pillsRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
  },
  pill: {
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillInactive: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E7E5E4",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  pillTextActive: {
    color: "#ffffff",
  },

  // Price filter
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    flexWrap: "wrap",
  },
  priceLabel: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500",
  },
  priceInput: {
    width: 80,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: "#1c1917",
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  priceDash: {
    fontSize: 12,
    color: "#9ca3af",
  },
  priceClearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f5f5f4",
    borderRadius: 8,
  },
  priceClearText: {
    fontSize: 12,
    color: "#6b7280",
  },

  // Trust bar
  trustBar: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E7E5E4",
    flexDirection: "row",
    overflow: "hidden",
  },
  trustItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  trustItemBorder: {
    borderRightWidth: 1,
    borderRightColor: "#F5F5F4",
  },
  trustIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F0FDF9",
    borderWidth: 1,
    borderColor: "#CCFBEF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1C1917",
  },
  trustDesc: {
    fontSize: 11,
    color: "#A8A29E",
    marginTop: 1,
    lineHeight: 14,
  },

  // Featured section header
  featuredHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },
  featuredTitle: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#1C1917",
  },
  featuredSubtitle: {
    fontSize: 12,
    color: "#A8A29E",
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0D9488",
  },

  // Listings/Vendors pill tabs
  tabsPillRow: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  tabsPill: {
    flexDirection: "row",
    backgroundColor: "#F5F5F4",
    borderRadius: 9999,
    padding: 3,
    alignSelf: "flex-start",
  },
  tabPillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  tabPillBtnActive: {
    backgroundColor: "#ffffff",
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  tabPillTextActive: {
    color: "#1C1917",
  },

  // Search spinner
  searchSpinner: {
    paddingVertical: 24,
    alignItems: "center",
  },

  // Grid
  gridRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  gridCol: {
    flex: 1,
  },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: "#1c1917",
    letterSpacing: 0.3,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A8A29E",
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  // Empty state
  emptyWrap: {
    padding: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },

  // Toast
  toast: {
    position: "absolute",
    top: 64,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 99,
  },
  toastInner: {
    borderRadius: 9999,
    paddingHorizontal: 22,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  toastText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },

  // Card
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e7e5e4",
  },
  cardImgContainer: {
    aspectRatio: 1,
  },
  cardImg: {
    width: "100%",
    height: "100%",
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  unavailablePill: {
    backgroundColor: "#EF4444",
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unavailableText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  badgePill: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#7C3AED",
    borderRadius: 9999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardInfo: {
    padding: 10,
    gap: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: "#1c1917",
  },
  cardVendor: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: "#6b7280",
  },
  cardPrice: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: "#0D9488",
    marginTop: 2,
  },
  ctaBtn: {
    borderRadius: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 6,
    overflow: "hidden",
  },
  ctaReserved: {
    backgroundColor: "#fef3c7",
  },
  ctaText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },


});
