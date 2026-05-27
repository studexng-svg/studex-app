import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface BookingItem {
  providerId: string;
  providerName: string;
  providerImg: string;
  service: string;
  date: string | null;
  time: string;
  location: string;
  addons: Record<string, number | string>;
  note: string;
  total: number;
  bookingId?: number;
  category?: string;
}

interface BookingState {
  booking: BookingItem | null;
  setBooking: (b: BookingItem) => void;
  clearBooking: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      booking: null,
      setBooking: (b) => set({ booking: b }),
      clearBooking: () => set({ booking: null }),
    }),
    {
      name: "studex-booking",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
