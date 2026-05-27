import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Switch, Modal,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import WebView from "react-native-webview";
import { useCartStore } from "@/stores/cartStore";
import { useBookingStore } from "@/stores/bookingStore";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";

const FUTO_LOCATIONS = ["Love Garden", "Tetfund", "SEET Roundabout", "ICT"];

function calcServiceFee(amount: number) {
  return Math.min(Math.max(amount * 0.08, 50), 3500);
}

export default function CheckoutScreen() {
  const { items, clearCart }       = useCartStore();
  const { booking, clearBooking }  = useBookingStore();
  const { user }                   = useAuthStore();
  const router                     = useRouter();

  const isServiceBooking = !!booking && items.length === 0;
  const isFoodOrder      = items.length > 0;

  const [deliveryLocation, setDeliveryLocation]    = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isProcessing, setIsProcessing]            = useState(false);
  const [accessCode, setAccessCode]                = useState("");
  const [reference, setReference]                  = useState("");
  const [showPaystack, setShowPaystack]            = useState(false);
  const [paymentError, setPaymentError]            = useState("");
  const [loyaltyBalance, setLoyaltyBalance]        = useState(0);
  const [useCredits, setUseCredits]                = useState(false);
  const [discount, setDiscount] = useState<{
    hasDiscount: boolean; discountAmount: number; finalBase: number;
  } | null>(null);

  const isFuto = user?.school?.toLowerCase() === "futo";

  // ── Base total depends on order type ─────────────────────────────────
  const rawBase = isServiceBooking
    ? (booking?.total || 0)
    : items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const discountedBase       = discount?.hasDiscount ? discount.finalBase : rawBase;
  const fullCheckoutAmount   = discountedBase + calcServiceFee(discountedBase);
  const creditsToApply       = useCredits ? Math.min(loyaltyBalance, fullCheckoutAmount) : 0;
  const isFullyCoveredByCredits = useCredits && creditsToApply >= fullCheckoutAmount && fullCheckoutAmount > 0;
  const baseAfterCredits     = isFullyCoveredByCredits ? 0 : Math.max(discountedBase - creditsToApply, 0);
  const serviceFee           = isFullyCoveredByCredits ? 0 : calcServiceFee(baseAfterCredits);
  const finalTotal           = isFullyCoveredByCredits ? 0 : baseAfterCredits + serviceFee;

  // ── Fetch loyalty balance + discount preview on mount ─────────────────
  useEffect(() => {
    if (rawBase <= 0) return;
    api.get<{ credit_balance: string }>("/api/loyalty/status/")
      .then(d => setLoyaltyBalance(parseFloat(d.credit_balance) || 0))
      .catch(() => {});
    api.post<{ discount_eligible: boolean; discount_amount: string; final_amount: string }>(
      "/api/payments/preview-price/", { amount: rawBase }
    )
      .then(d => {
        if (d.discount_eligible) {
          setDiscount({
            hasDiscount: true,
            discountAmount: parseFloat(d.discount_amount) || 0,
            finalBase: parseFloat(d.final_amount) || rawBase,
          });
        }
      })
      .catch(() => {});
  }, []);

  // ── Shared: resolve listing ID ────────────────────────────────────────
  function getListingId() {
    return isServiceBooking ? booking?.providerId : String(items[0]?.listing_id ?? "");
  }

  // ── Credits-only payment ──────────────────────────────────────────────
  async function handleCreditsOnlyPayment() {
    setIsProcessing(true);
    setPaymentError("");
    try {
      const listingId = getListingId();
      if (!listingId) throw new Error("Could not determine listing. Please go back and try again.");
      const data = await api.post<{ order_id: number }>("/api/payments/pay-with-credits/", { listing_id: listingId });
      if (isFoodOrder) await clearCart();
      if (isServiceBooking) clearBooking();
      router.replace(`/order-confirmation/${data.order_id}` as any);
    } catch (err: any) {
      setPaymentError(err.message || "Payment failed. Please try again.");
      setIsProcessing(false);
    }
  }

  // ── Normal payment: initialize → Paystack ─────────────────────────────
  async function handlePayment() {
    setPaymentError("");

    if (isFoodOrder && !deliveryLocation.trim()) {
      setPaymentError("Please enter your campus delivery location.");
      return;
    }
    const listingId = getListingId();
    if (!listingId) {
      setPaymentError("Could not determine listing. Please go back and try again.");
      return;
    }
    if (isFullyCoveredByCredits) {
      handleCreditsOnlyPayment();
      return;
    }

    setIsProcessing(true);
    try {
      const payload: Record<string, any> = { listing_id: listingId };
      if (isFoodOrder) {
        payload.cart_amount = parseFloat(rawBase.toFixed(2));
        payload.delivery_location = deliveryLocation.trim();
      }
      if (creditsToApply > 0) payload.use_credits = true;

      const data = await api.post<{ access_code: string; reference: string; amount_kobo: number }>(
        "/api/payments/initialize/", payload
      );
      setAccessCode(data.access_code);
      setReference(data.reference);
      setShowPaystack(true);
    } catch (err: any) {
      setPaymentError(err.message || "Could not initialize payment. Please try again.");
      setIsProcessing(false);
    }
  }

  // ── Verify after Paystack success ─────────────────────────────────────
  async function handleVerify(_response: any) {
    try {
      let verifyBody: Record<string, any> = {
        reference,
        transaction_id: reference,
        use_credits: creditsToApply > 0,
        credits_applied: creditsToApply,
      };

      if (isServiceBooking) {
        verifyBody = { ...verifyBody, listing_id: booking!.providerId, order_type: "service" };
      } else {
        verifyBody = {
          ...verifyBody,
          items: items.map(i => ({ listing_id: i.listing_id, quantity: i.quantity })),
          order_type: "product",
          delivery_location: deliveryLocation.trim(),
        };
      }

      const data = await api.post<{ order_id: number }>("/api/payments/verify/", verifyBody);
      if (isFoodOrder) await clearCart();
      if (isServiceBooking) clearBooking();
      router.replace(`/order-confirmation/${data.order_id}` as any);
    } catch {
      setPaymentError(`Payment received but order creation failed. Save this reference and contact support: ${reference}`);
    } finally {
      setIsProcessing(false);
    }
  }

  const buttonLabel = isProcessing
    ? "Processing..."
    : isFullyCoveredByCredits
    ? "Redeem Credits & Place Order"
    : `Pay ₦${finalTotal.toLocaleString("en-NG")} Now`;

  // ── Empty state ───────────────────────────────────────────────────────
  if (!isFoodOrder && !isServiceBooking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF8F0", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <LinearGradient
          colors={["#0D9488", "#7C3AED"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: 88, height: 88, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 20 }}
        >
          <Ionicons name="bag-outline" size={44} color="#fff" />
        </LinearGradient>
        <Text style={{ fontSize: 11, color: "#0D9488", letterSpacing: 2, textTransform: "uppercase", fontWeight: "600", marginBottom: 8 }}>
          Empty
        </Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#1c1917", textAlign: "center", marginBottom: 8 }}>
          Nothing to checkout
        </Text>
        <Text style={{ fontSize: 14, color: "#a8a29e", textAlign: "center", marginBottom: 32 }}>
          Book a service or add items to your cart first.
        </Text>
        <TouchableOpacity onPress={() => router.replace("/(tabs)" as any)} activeOpacity={0.8}>
          <LinearGradient
            colors={["#0D9488", "#7C3AED"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 9999, paddingVertical: 14, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Explore StudEx</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF8F0" }}>

      {/* ── Paystack hosted checkout ── */}
      <Modal visible={showPaystack} animationType="slide" onRequestClose={() => { setShowPaystack(false); setIsProcessing(false); }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" }}>
            <TouchableOpacity onPress={() => { setShowPaystack(false); setIsProcessing(false); }} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#1c1917" />
            </TouchableOpacity>
            <Text style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: "700", color: "#1c1917", marginRight: 24 }}>
              Secure Payment
            </Text>
          </View>
          <WebView
            source={{ uri: `https://checkout.paystack.com/${accessCode}` }}
            style={{ flex: 1 }}
            startInLoadingState
            renderLoading={() => (
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" color="#0D9488" />
              </View>
            )}
            onShouldStartLoadWithRequest={(req) => {
              if (!req.url.includes("checkout.paystack.com") && req.url.includes("reference=")) {
                setShowPaystack(false);
                handleVerify(null);
                return false;
              }
              return true;
            }}
            onNavigationStateChange={(navState) => {
              const url = navState.url;
              if (url && !url.includes("checkout.paystack.com") && !url.startsWith("about:") && url.includes("reference=")) {
                setShowPaystack(false);
                handleVerify(null);
              }
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* ── FUTO location bottom-sheet picker ── */}
      <Modal visible={showLocationPicker} transparent animationType="slide" onRequestClose={() => setShowLocationPicker(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setShowLocationPicker(false)}
        >
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 }}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#1c1917" }}>Select Delivery Location</Text>
            </View>
            {FUTO_LOCATIONS.map(loc => (
              <TouchableOpacity
                key={loc}
                onPress={() => { setDeliveryLocation(loc); setShowLocationPicker(false); }}
                style={{ paddingVertical: 16, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
              >
                <Text style={{ fontSize: 15, color: "#1c1917" }}>{loc}</Text>
                {deliveryLocation === loc && <Ionicons name="checkmark" size={18} color="#0D9488" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Header ── */}
        <View style={{ paddingTop: 48, paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#1c1917" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 11, color: "#0D9488", fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>
              {isServiceBooking ? "SERVICE BOOKING" : "PRODUCT ORDER"}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#1c1917" }}>Review your order</Text>
          </View>
        </View>

        {/* ── Error alert ── */}
        {!!paymentError && (
          <View style={{
            marginHorizontal: 16, marginBottom: 12,
            backgroundColor: "#FEE2E2", borderRadius: 12, padding: 14,
            flexDirection: "row", alignItems: "flex-start", gap: 10,
          }}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 13, color: "#DC2626", fontWeight: "500" }}>{paymentError}</Text>
          </View>
        )}

        {/* ── Service Booking Details card ── */}
        {isServiceBooking && booking && (
          <View style={{
            backgroundColor: "#fff", borderRadius: 16,
            marginHorizontal: 16, marginBottom: 12, padding: 20,
            shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 }, elevation: 2,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <LinearGradient
                colors={["#0D9488", "#7C3AED"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="calendar-outline" size={20} color="#fff" />
              </LinearGradient>
              <View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#1c1917" }}>{booking.providerName}</Text>
                <Text style={{ fontSize: 12, color: "#0D9488", fontWeight: "600" }}>Service Booking</Text>
              </View>
            </View>
            <View style={{ backgroundColor: "#F9F9F9", borderRadius: 12, padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="calendar-outline" size={16} color="#0D9488" />
                <Text style={{ fontSize: 14, color: "#44403C" }}>{booking.date}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="time-outline" size={16} color="#0D9488" />
                <Text style={{ fontSize: 14, color: "#44403C" }}>{booking.time}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="location-outline" size={16} color="#0D9488" />
                <Text style={{ fontSize: 14, color: "#44403C" }}>{booking.location}</Text>
              </View>
              {!!booking.note && (
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#0D9488" style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, fontSize: 14, color: "#44403C" }}>{booking.note}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Cart Items card (food orders only) ── */}
        {isFoodOrder && (
          <View style={{
            backgroundColor: "#fff", borderRadius: 16,
            marginHorizontal: 16, marginBottom: 12, padding: 20,
            shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 }, elevation: 2,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Ionicons name="cube-outline" size={16} color="#1c1917" />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1c1917" }}>Order Items</Text>
            </View>
            {items.map(item => (
              <View key={item.id} style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <Text style={{ flex: 1, fontSize: 14, color: "#1c1917" }} numberOfLines={1}>{item.title}</Text>
                <Text style={{ fontSize: 13, color: "#6b7280", marginRight: 12 }}>×{item.quantity}</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#0D9488" }}>
                  ₦{(item.price * item.quantity).toLocaleString("en-NG")}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Delivery Location card (food orders only) ── */}
        {isFoodOrder && (
          <View style={{
            backgroundColor: "#fff", borderRadius: 16,
            marginHorizontal: 16, marginBottom: 12, padding: 20,
            shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 }, elevation: 2,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Ionicons name="location-outline" size={16} color="#1c1917" />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1c1917" }}>Delivery Location</Text>
            </View>
            <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
              Must be within school surroundings. Specify your hostel, hall, or landmark.
            </Text>
            {isFuto ? (
              <TouchableOpacity
                onPress={() => setShowLocationPicker(true)}
                style={{
                  borderWidth: 1, borderColor: "#E7E5E4", borderRadius: 12, padding: 14,
                  flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 14, color: deliveryLocation ? "#1c1917" : "#9ca3af" }}>
                  {deliveryLocation || "Select delivery location"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ) : (
              <TextInput
                value={deliveryLocation}
                onChangeText={setDeliveryLocation}
                placeholder="e.g. Love Garden"
                placeholderTextColor="#9ca3af"
                style={{
                  borderWidth: 1, borderColor: "#E7E5E4", borderRadius: 12,
                  padding: 14, fontSize: 14, color: "#1c1917",
                }}
              />
            )}
          </View>
        )}

        {/* ── Order Summary card ── */}
        <View style={{
          backgroundColor: "#fff", borderRadius: 16,
          marginHorizontal: 16, marginBottom: 12, padding: 20,
          shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 }, elevation: 2,
        }}>
          <Text style={{
            fontSize: 11, fontWeight: "700", color: "#0D9488",
            letterSpacing: 1, textTransform: "uppercase", marginBottom: 16,
          }}>
            Order Summary
          </Text>

          {/* Base price */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ fontSize: 14, color: "#6b7280" }}>
              {isServiceBooking ? "Service price" : "Items total"}
            </Text>
            <Text style={{
              fontSize: 14,
              color: discount?.hasDiscount ? "#9ca3af" : "#1c1917",
              textDecorationLine: discount?.hasDiscount ? "line-through" : "none",
            }}>
              ₦{rawBase.toLocaleString("en-NG")}
            </Text>
          </View>

          {/* Profile discount */}
          {discount?.hasDiscount && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 14, color: "#059669" }}>🎉 Profile bonus (5% off)</Text>
              <Text style={{ fontSize: 14, color: "#059669", fontWeight: "600" }}>
                -₦{discount.discountAmount.toLocaleString("en-NG")}
              </Text>
            </View>
          )}

          {/* Loyalty Credits toggle */}
          <View style={{
            borderRadius: 12, padding: 14, marginBottom: 10,
            backgroundColor: useCredits && loyaltyBalance > 0 ? "#FFFBEB" : "#F9F9F9",
            borderWidth: 1,
            borderColor: useCredits && loyaltyBalance > 0 ? "#FCD34D" : "#E7E5E4",
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            opacity: loyaltyBalance === 0 ? 0.5 : 1,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 18 }}>🎁</Text>
              <View>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#1c1917" }}>Loyalty Credits</Text>
                <Text style={{ fontSize: 12, color: "#6b7280" }}>
                  {loyaltyBalance > 0
                    ? `₦${loyaltyBalance.toLocaleString("en-NG")} available`
                    : "No credits yet"}
                </Text>
              </View>
            </View>
            <Switch
              value={useCredits && loyaltyBalance > 0}
              onValueChange={v => setUseCredits(v)}
              disabled={loyaltyBalance === 0}
              trackColor={{ false: "#D1D5DB", true: "#F59E0B" }}
              thumbColor="#fff"
            />
          </View>

          {/* Credits applied */}
          {useCredits && creditsToApply > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 14, color: "#D97706" }}>🎁 Credits applied</Text>
              <Text style={{ fontSize: 14, color: "#D97706", fontWeight: "600" }}>
                -₦{creditsToApply.toLocaleString("en-NG")}
              </Text>
            </View>
          )}

          {/* Service fee */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
            <Text style={{ fontSize: 14, color: "#6b7280" }}>
              {isFullyCoveredByCredits ? "Service fee" : "Service fee (8%)"}
            </Text>
            <Text style={{ fontSize: 14, color: isFullyCoveredByCredits ? "#059669" : "#1c1917" }}>
              {isFullyCoveredByCredits ? "₦0.00 (covered)" : `₦${serviceFee.toLocaleString("en-NG")}`}
            </Text>
          </View>

          {/* Total */}
          <View style={{
            borderTopWidth: 1, borderTopColor: "#F5F5F5", paddingTop: 14,
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
          }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#1c1917" }}>Total</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#7C3AED" }}>
              ₦{finalTotal.toLocaleString("en-NG")}
            </Text>
          </View>
        </View>

        {/* ── Transparent Pricing info ── */}
        <View style={{
          backgroundColor: "#fff", borderRadius: 12,
          marginHorizontal: 16, marginBottom: 12, padding: 14,
        }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#0D9488", marginBottom: 4 }}>
            Transparent Pricing
          </Text>
          <Text style={{ fontSize: 12, color: "#134E4A", lineHeight: 18 }}>
            Our 8% service fee (min ₦50, max ₦3,500) covers both the StudEx platform and Paystack's payment processing cost with no hidden charges on top of what you see here. The vendor receives their full listed price.
            {discount?.hasDiscount ? " Your 5% profile completion bonus has been applied." : ""}
          </Text>
        </View>

        {/* ── Security badges ── */}
        <View style={{
          backgroundColor: "#fff", borderRadius: 16,
          marginHorizontal: 16, marginBottom: 24, padding: 16,
          flexDirection: "row", justifyContent: "space-around",
          shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 }, elevation: 1,
        }}>
          {(
            [
              { icon: "shield-checkmark-outline", label: "Secure" },
              { icon: "lock-closed-outline",      label: "Encrypted" },
              { icon: "checkmark-circle-outline", label: "Protected" },
            ] as const
          ).map(b => (
            <View key={b.label} style={{ alignItems: "center", gap: 6 }}>
              <Ionicons name={b.icon} size={22} color="#0D9488" />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#0D9488" }}>{b.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Pay button ── */}
        <TouchableOpacity
          onPress={handlePayment}
          disabled={isProcessing}
          activeOpacity={0.85}
          style={{ marginHorizontal: 16, marginBottom: 16, opacity: isProcessing ? 0.7 : 1 }}
        >
          <LinearGradient
            colors={["#0D9488", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 9999, paddingVertical: 16,
              alignItems: "center", justifyContent: "center",
              flexDirection: "row", gap: 8,
            }}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                {isFullyCoveredByCredits
                  ? <Text style={{ fontSize: 18 }}>🎁</Text>
                  : <Ionicons name="card-outline" size={18} color="#fff" />
                }
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{buttonLabel}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Footer ── */}
        <View style={{ alignItems: "center", gap: 10, paddingHorizontal: 24 }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={{ fontSize: 13, color: "#78716c" }}>← Cancel and go back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: "#a8a29e", textAlign: "center", lineHeight: 18 }}>
            By completing this purchase you agree to StudEx{" "}
            <Text style={{ color: "#0D9488", textDecorationLine: "underline" }}>Terms & Conditions</Text>
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
