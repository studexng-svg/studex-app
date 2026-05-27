import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  SafeAreaView,
  Modal,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "@/stores/cartStore";
import { api } from "@/lib/api";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Review {
  id: number;
  reviewer_username: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface ListingVendor {
  id: number;
  username: string;
  business_name?: string;
  profile?: {
    vendor_badge: "none" | "rising" | "trusted" | "top";
    completion_rate: number;
    rating: number;
    total_reviews: number;
  };
}

interface Listing {
  id: number;
  title: string;
  description: string;
  price: string | number;
  image: string | null;
  is_available: boolean;
  is_reserved: boolean;
  listing_type: string;
  track_inventory?: boolean;
  stock_quantity?: number;
  category: { id: number; title: string; slug: string } | string;
  vendor: ListingVendor | string;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TIME_SLOTS = [
  "6:00 AM",  "7:00 AM",  "8:00 AM",
  "9:00 AM",  "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM",  "2:00 PM",
  "3:00 PM",  "4:00 PM",  "5:00 PM",
  "6:00 PM",  "7:00 PM",  "8:00 PM",
  "9:00 PM",  "10:00 PM", "11:00 PM",
  "12:00 AM",
];

const SLOT_ROWS: string[][] = [];
for (let i = 0; i < TIME_SLOTS.length; i += 3) {
  SLOT_ROWS.push(TIME_SLOTS.slice(i, i + 3));
}

const BADGE_LABELS: Record<string, string> = {
  top: "Top Vendor",
  trusted: "Trusted",
  rising: "Rising",
};

// â”€â”€â”€ Calendar Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CalendarModal({
  visible, onClose, onSelect, selectedDate,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (iso: string) => void;
  selectedDate: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year  = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const firstWeekday  = new Date(year, month, 1).getDay();
  const monthLabel    = viewMonth.toLocaleDateString("en-NG", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const canGoPrev = month > today.getMonth() || year > today.getFullYear();

  function isoForDay(d: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  function isPast(d: number) {
    return new Date(year, month, d) < today;
  }
  function isSelected(d: number) {
    return isoForDay(d) === selectedDate;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 }}
          onStartShouldSetResponder={() => true}
        >
          {/* Month nav */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: "#f5f5f4" }}>
            <TouchableOpacity onPress={() => setViewMonth(new Date(year, month - 1, 1))} disabled={!canGoPrev} style={{ opacity: canGoPrev ? 1 : 0.25, padding: 4 }}>
              <Ionicons name="chevron-back" size={22} color="#1c1917" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1c1917" }}>{monthLabel}</Text>
            <TouchableOpacity onPress={() => setViewMonth(new Date(year, month + 1, 1))} style={{ padding: 4 }}>
              <Ionicons name="chevron-forward" size={22} color="#1c1917" />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
              <Text key={d} style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", color: "#9ca3af" }}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={{ paddingHorizontal: 16 }}>
            {weeks.map((week, wi) => (
              <View key={wi} style={{ flexDirection: "row", marginBottom: 2 }}>
                {week.map((day, di) => {
                  if (!day) return <View key={di} style={{ flex: 1, height: 44 }} />;
                  const past     = isPast(day);
                  const selected = isSelected(day);
                  return (
                    <TouchableOpacity
                      key={di}
                      onPress={() => { if (!past) { onSelect(isoForDay(day)); onClose(); } }}
                      activeOpacity={past ? 1 : 0.7}
                      style={{ flex: 1, height: 44, alignItems: "center", justifyContent: "center" }}
                    >
                      {selected ? (
                        <LinearGradient
                          colors={["#0D9488", "#7C3AED"]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }}
                        >
                          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{day}</Text>
                        </LinearGradient>
                      ) : (
                        <Text style={{ fontSize: 14, color: past ? "#d1d5db" : "#1c1917", fontWeight: "500" }}>{day}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function formatDateDisplay(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-NG", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

// â”€â”€â”€ Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem: addToCart } = useCartStore();

  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReserved, setIsReserved] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  const [bookingDate, setBookingDate]     = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bookingTime, setBookingTime]     = useState("");
  const [bookingLocation, setBookingLocation] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [bookingStep, setBookingStep] = useState<"form" | "submitting" | "done">("form");
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([
      api.get<Listing>(`/api/services/listings/${id}/`),
      api.get<any>(`/api/reviews/reviews/?listing=${id}`),
    ])
      .then(([listingData, reviewsData]) => {
        setListing(listingData);
        setIsReserved(listingData.is_reserved);
        const r = Array.isArray(reviewsData)
          ? reviewsData
          : reviewsData.results ?? [];
        setReviews(r);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!listing) return;
    try {
      await addToCart(listing.id, 1);
    } catch (err: any) {
      if ((err?.message ?? "").toLowerCase().includes("reserved")) {
        setIsReserved(true);
      }
    }
  };

  const handleBooking = async () => {
    if (!bookingDate.trim()) { setBookingError("Please enter a date."); return; }
    if (!bookingTime)         { setBookingError("Please pick a time slot."); return; }
    if (!bookingLocation.trim()) { setBookingError("Please enter a location."); return; }
    setBookingError("");
    setBookingStep("submitting");
    try {
      await api.post("/api/orders/bookings/", {
        listing: listing!.id,
        scheduled_date: bookingDate.trim(),
        scheduled_time: bookingTime,
        note: bookingNote,
        location: bookingLocation.trim(),
      });
      setBookingStep("done");
    } catch (err: any) {
      setBookingError(err?.message ?? "Could not place booking. Try again.");
      setBookingStep("form");
    }
  };

  // â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#0D9488" />
      </SafeAreaView>
    );
  }

  // â”€ Not found â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (!listing) {
    return (
      <SafeAreaView style={styles.centered}>
        <TouchableOpacity
          style={styles.backBtnAlt}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#1c1917" />
        </TouchableOpacity>
        <View style={{ alignItems: "center", paddingHorizontal: 32 }}>
          <Text style={styles.notFoundTitle}>Listing not found</Text>
          <Text style={styles.notFoundSub}>
            This listing may have been removed.
          </Text>
          <TouchableOpacity
            style={styles.notFoundBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.notFoundBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // â”€ Derived values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const categoryTitle =
    typeof listing.category === "object" && listing.category !== null
      ? listing.category.title
      : String(listing.category || "");

  const vendor =
    typeof listing.vendor === "object" && listing.vendor !== null
      ? (listing.vendor as ListingVendor)
      : null;
  const vendorName =
    vendor?.business_name ||
    vendor?.username ||
    (typeof listing.vendor === "string" ? listing.vendor : "");
  const vendorInitial = vendorName[0]?.toUpperCase() || "?";
  const badge = vendor?.profile?.vendor_badge;
  const hasBadge = badge && badge !== "none";
  const rating = vendor?.profile?.rating ?? 0;
  const totalReviews = vendor?.profile?.total_reviews ?? 0;
  const completionRate = vendor?.profile?.completion_rate ?? 0;
  const isService = (listing.listing_type || "").toLowerCase() === "service";
  const hasImage = !!listing.image && listing.image.startsWith("http");

  // â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* â”€â”€ HERO IMAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <View style={styles.heroWrap}>
          {hasImage ? (
            <Image
              source={{ uri: listing.image! }}
              style={styles.heroImage}
              resizeMode="contain"
            />
          ) : (
            <LinearGradient
              colors={["#0D9488", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroImage}
            />
          )}

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)"]}
            style={styles.heroGradient}
          />

          {!listing.is_available && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>Unavailable</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* â”€â”€ TITLE + PRICE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <View style={[styles.card, { margin: 16 }]}>
          {!!categoryTitle && (
            <Text style={styles.catLabel}>{categoryTitle.toUpperCase()}</Text>
          )}
          <View style={styles.titleRow}>
            <Text style={styles.titleText} numberOfLines={4}>
              {listing.title}
            </Text>
            <Text style={styles.priceText}>
              â‚¦{Number(listing.price).toLocaleString("en-NG")}
            </Text>
          </View>

          {totalReviews > 0 && (
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name="star"
                  size={14}
                  color={s <= Math.round(rating) ? "#f59e0b" : "#e7e5e4"}
                />
              ))}
              <Text style={styles.ratingText}>
                {rating} ({totalReviews} reviews)
              </Text>
            </View>
          )}

          {!!listing.description && (
            <Text style={styles.descText}>{listing.description}</Text>
          )}
        </View>

        {/* â”€â”€ ADD TO CART (products only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!isService && (
          <View style={styles.ctaWrap}>
            {isReserved ? (
              <View style={styles.reservedBtn}>
                <Text style={styles.reservedText}>Reserved</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleAddToCart} activeOpacity={0.87}>
                <LinearGradient
                  colors={["#0D9488", "#7C3AED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradBtn}
                >
                  <Text style={styles.gradBtnText}>Add to Cart</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* â”€â”€ VENDOR CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <View style={[styles.card, styles.hz]}>
          <Text style={styles.sectionLabel}>VENDOR</Text>
          <View style={styles.vendorRow}>
            <LinearGradient
              colors={["#0D9488", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{vendorInitial}</Text>
            </LinearGradient>

            <View style={styles.vendorInfo}>
              <View style={styles.vendorNameRow}>
                <Text style={styles.vendorName}>{vendorName}</Text>
                {hasBadge && (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgeText}>
                      {BADGE_LABELS[badge!] ?? badge}
                    </Text>
                  </View>
                )}
              </View>
              {completionRate > 0 && (
                <Text style={styles.completionText}>
                  {completionRate}% completion rate
                </Text>
              )}
            </View>

            <TouchableOpacity style={styles.messageBtn} activeOpacity={0.7}>
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* â”€â”€ TRUST BADGES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <View style={[styles.card, styles.hz, styles.trustRow]}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={16} color="#0D9488" />
            <Text style={styles.trustText}>Vendor Verified</Text>
          </View>
          {totalReviews > 0 && (
            <View style={styles.trustItem}>
              <Ionicons name="star" size={16} color="#f59e0b" />
              <Text style={styles.trustText}>
                {rating} ({totalReviews} reviews)
              </Text>
            </View>
          )}
        </View>

        {/* â”€â”€ BOOKING SECTION (services only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {isService && (
          <View style={[styles.card, styles.hz, { padding: 0, overflow: "hidden" }]}>
            {/* Toggle header */}
            <TouchableOpacity
              style={styles.bookingHeader}
              onPress={() => setShowBooking((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={styles.bookingHeaderLeft}>
                <Ionicons name="calendar" size={18} color="#0D9488" />
                <Text style={styles.bookingHeaderText}>Book a Date & Time</Text>
              </View>
              <Ionicons
                name={showBooking ? "chevron-up" : "chevron-down"}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>

            {/* Collapsed Book button */}
            {!showBooking && listing.is_available && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setShowBooking(true)}
                  activeOpacity={0.87}
                >
                  <LinearGradient
                    colors={["#0D9488", "#7C3AED"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradBtn}
                  >
                    <Text style={styles.gradBtnText}>Book</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Booking form */}
            {showBooking && (
              <View style={styles.bookingForm}>
                {bookingStep === "done" ? (
                  <View style={styles.successWrap}>
                    <View style={styles.successCircle}>
                      <Ionicons name="checkmark" size={32} color="#0D9488" />
                    </View>
                    <Text style={styles.successTitle}>
                      Booking Request Sent!
                    </Text>
                    <Text style={styles.successSub}>
                      The vendor will confirm your booking. You'll get a
                      notification when they do.
                    </Text>
                    <TouchableOpacity
                      style={styles.viewBookingsBtn}
                      onPress={() => router.back()}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.viewBookingsBtnText}>
                        View My Bookings
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {/* Date */}
                    <CalendarModal
                      visible={showDatePicker}
                      onClose={() => setShowDatePicker(false)}
                      onSelect={setBookingDate}
                      selectedDate={bookingDate}
                    />
                    <Text style={styles.fieldLabel}>PICK A DATE</Text>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.7}
                      style={[styles.fieldInput, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
                    >
                      <Text style={{ fontSize: 14, color: bookingDate ? "#1c1917" : "#9ca3af" }}>
                        {bookingDate ? formatDateDisplay(bookingDate) : "Select a date"}
                      </Text>
                      <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
                    </TouchableOpacity>

                    {/* Time slots */}
                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                      PICK A TIME SLOT
                    </Text>
                    <View style={styles.slotsWrap}>
                      {SLOT_ROWS.map((row, rowIdx) => (
                        <View key={rowIdx} style={styles.slotRow}>
                          {row.map((slot) => (
                            <TouchableOpacity
                              key={slot}
                              style={[
                                styles.slotBtn,
                                bookingTime === slot && styles.slotBtnActive,
                              ]}
                              onPress={() => setBookingTime(slot)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.slotText,
                                  bookingTime === slot && styles.slotTextActive,
                                ]}
                              >
                                {slot}
                              </Text>
                            </TouchableOpacity>
                          ))}
                          {row.length < 3 &&
                            Array(3 - row.length)
                              .fill(null)
                              .map((_, i) => (
                                <View
                                  key={`pad-${i}`}
                                  style={[styles.slotBtn, { opacity: 0 }]}
                                />
                              ))}
                        </View>
                      ))}
                    </View>

                    {/* Location */}
                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                      LOCATION
                    </Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. Cedar hostel, room 12"
                      placeholderTextColor="#9ca3af"
                      value={bookingLocation}
                      onChangeText={setBookingLocation}
                    />
                    <Text style={styles.fieldHint}>
                      Where should the vendor meet you?
                    </Text>

                    {/* Note */}
                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                      NOTE (OPTIONAL)
                    </Text>
                    <TextInput
                      style={[styles.fieldInput, styles.textArea]}
                      placeholder="Any special requests or details..."
                      placeholderTextColor="#9ca3af"
                      value={bookingNote}
                      onChangeText={setBookingNote}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />

                    {/* Error */}
                    {!!bookingError && (
                      <View style={styles.errorWrap}>
                        <Ionicons
                          name="alert-circle"
                          size={16}
                          color="#ef4444"
                        />
                        <Text style={styles.errorText}>{bookingError}</Text>
                      </View>
                    )}

                    {/* Submit */}
                    <TouchableOpacity
                      onPress={handleBooking}
                      activeOpacity={0.87}
                      disabled={bookingStep === "submitting"}
                      style={{
                        marginTop: 16,
                        opacity: bookingStep === "submitting" ? 0.6 : 1,
                      }}
                    >
                      <LinearGradient
                        colors={["#0D9488", "#7C3AED"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradBtn}
                      >
                        <Text style={styles.gradBtnText}>
                          {bookingStep === "submitting"
                            ? "Sending..."
                            : "Send Booking Request"}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <Text style={styles.bookingFootnote}>
                      Vendor must confirm before it's finalised. You'll receive
                      reminders before your appointment.
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* â”€â”€ REVIEWS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {reviews.length > 0 && (
          <View style={[styles.card, { marginHorizontal: 16, marginBottom: 24, marginTop: 8 }]}>
            <View style={styles.reviewsHeader}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={styles.reviewsTitle}>
                REVIEWS ({reviews.length})
              </Text>
            </View>

            {reviews.map((review, idx) => (
              <View
                key={review.id}
                style={[
                  styles.reviewItem,
                  idx < reviews.length - 1 && styles.reviewDivider,
                ]}
              >
                <View style={styles.reviewTopRow}>
                  <Text style={styles.reviewerName}>
                    {review.reviewer_username}
                  </Text>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name="star"
                        size={12}
                        color={s <= review.rating ? "#f59e0b" : "#e7e5e4"}
                      />
                    ))}
                  </View>
                </View>
                {!!review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
                <Text style={styles.reviewDate}>
                  {new Date(review.created_at).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  // Not found
  backBtnAlt: {
    position: "absolute",
    top: 56,
    left: 16,
    padding: 8,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1c1917",
    marginBottom: 8,
    textAlign: "center",
  },
  notFoundSub: {
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 24,
    textAlign: "center",
  },
  notFoundBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: "#0D9488",
    borderRadius: 9999,
  },
  notFoundBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },

  // Hero
  heroWrap: {
    width: "100%",
    height: 260,
    backgroundColor: "#1c1917",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  unavailableText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  backBtn: {
    position: "absolute",
    top: 48,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Card base
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  hz: {
    marginHorizontal: 16,
    marginBottom: 8,
  },

  // Title + price
  catLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D9488",
    letterSpacing: 1,
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  titleText: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#1c1917",
    lineHeight: 24,
  },
  priceText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#7C3AED",
    flexShrink: 0,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 8,
  },
  ratingText: {
    fontSize: 13,
    color: "#6b7280",
    marginLeft: 4,
  },
  descText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 22,
    marginTop: 10,
  },

  // CTA
  ctaWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  reservedBtn: {
    backgroundColor: "#fef3c7",
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: "center",
  },
  reservedText: {
    color: "#d97706",
    fontWeight: "700",
    fontSize: 16,
  },
  gradBtn: {
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: "center",
  },
  gradBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },

  // Vendor
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D9488",
    letterSpacing: 1,
    marginBottom: 10,
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  vendorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  vendorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  vendorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1c1917",
  },
  badgePill: {
    backgroundColor: "#7C3AED",
    borderRadius: 9999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  completionText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  messageBtn: {
    borderWidth: 1,
    borderColor: "#0D9488",
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  messageBtnText: {
    color: "#0D9488",
    fontSize: 13,
    fontWeight: "600",
  },

  // Trust badges
  trustRow: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  trustText: {
    fontSize: 13,
    color: "#1c1917",
  },

  // Booking
  bookingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bookingHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  bookingHeaderText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1c1917",
  },
  bookingForm: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f4",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1c1917",
    backgroundColor: "#ffffff",
  },
  fieldHint: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  textArea: {
    minHeight: 72,
  },
  slotsWrap: {
    gap: 8,
  },
  slotRow: {
    flexDirection: "row",
    gap: 8,
  },
  slotBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  slotBtnActive: {
    backgroundColor: "#0D9488",
    borderColor: "#0D9488",
  },
  slotText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  slotTextActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  bookingFootnote: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },

  // Booking success
  successWrap: {
    alignItems: "center",
    paddingVertical: 24,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f0fdfa",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1c1917",
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  viewBookingsBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#0D9488",
    borderRadius: 9999,
  },
  viewBookingsBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },

  // Reviews
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  reviewsTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D9488",
    letterSpacing: 1,
  },
  reviewItem: {
    paddingVertical: 12,
  },
  reviewDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f4",
  },
  reviewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1c1917",
  },
  reviewStars: {
    flexDirection: "row",
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginTop: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
});
