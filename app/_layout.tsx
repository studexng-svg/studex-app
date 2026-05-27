import { useEffect, useRef, useState } from "react";
import { Animated, Image, Text, View } from "react-native";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "@/stores/authStore";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";

function AppSplash() {
  const fade     = useRef(new Animated.Value(0)).current;
  const scale    = useRef(new Animated.Value(0.78)).current;
  const tagFade  = useRef(new Animated.Value(0)).current;
  const dotScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo springs in
      Animated.parallel([
        Animated.timing(fade,  { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]),
      // Tagline + dots fade up shortly after
      Animated.parallel([
        Animated.timing(tagFade,  { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(dotScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={["#5B21B6", "#7C3AED", "#0D9488"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      {/* Decorative soft circles */}
      <View style={{
        position: "absolute", top: -80, left: -80,
        width: 320, height: 320, borderRadius: 160,
        backgroundColor: "rgba(255,255,255,0.06)",
      }} />
      <View style={{
        position: "absolute", bottom: -60, right: -60,
        width: 260, height: 260, borderRadius: 130,
        backgroundColor: "rgba(255,255,255,0.05)",
      }} />

      {/* Logo */}
      <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
        <Image
          source={require("../assets/logo-white.png")}
          style={{ width: 180, height: 180 }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={{ opacity: tagFade, alignItems: "center", marginTop: 28 }}>
        <Text style={{ color: "rgba(255,255,255,0.95)", fontSize: 17, fontWeight: "700", letterSpacing: 0.4 }}>
          Campus marketplace
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 4, letterSpacing: 0.2 }}>
          Buy, sell & hire on campus
        </Text>
      </Animated.View>

      {/* Loading dots */}
      <Animated.View style={{
        position: "absolute", bottom: 64,
        flexDirection: "row", gap: 8,
        opacity: tagFade, transform: [{ scale: dotScale }],
      }}>
        {[0, 1, 2].map(i => (
          <View key={i} style={{
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: "rgba(255,255,255,0.5)",
          }} />
        ))}
      </Animated.View>
    </LinearGradient>
  );
}

export default function RootLayout() {
  const { initialize, isLoading } = useAuthStore();
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    initialize();
    const t = setTimeout(() => setMinTimePassed(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (isLoading || !minTimePassed || !fontsLoaded) return <AppSplash />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="wishlist" />
      <Stack.Screen name="order/[id]" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="order-confirmation/[id]" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
