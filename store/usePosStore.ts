import { create } from 'zustand';

export interface CartItem {
  serialNumber: string;
  modelName: string;
  price: number;
  hpp: number;
  condition?: string;
  grade?: string | null;
  category?: string;
}

interface PosStore {
  cart: CartItem[];
  totalAmount: number;
  addToCart: (item: CartItem) => { success: boolean; message?: string };
  removeFromCart: (serialNumber: string) => void;
  clearCart: () => void;

  // Shift & User State
  user: { id?: string; name: string; role: string } | null;
  currentShift: any | null;
  isLoadingShift: boolean;
  isOpenShiftModal: boolean;
  isCloseShiftModal: boolean;
  settlementResult: any | null;

  setUser: (user: { id?: string; name: string; role: string } | null) => void;
  setCurrentShift: (shift: any | null) => void;
  setIsLoadingShift: (val: boolean) => void;
  setIsOpenShiftModal: (val: boolean) => void;
  setIsCloseShiftModal: (val: boolean) => void;
  setSettlementResult: (res: any | null) => void;
  fetchCurrentShift: (userId?: string, role?: string) => Promise<any>;
}

export const usePosStore = create<PosStore>((set, get) => ({
  cart: [],
  totalAmount: 0,

  user: null,
  currentShift: null,
  isLoadingShift: true,
  isOpenShiftModal: false,
  isCloseShiftModal: false,
  settlementResult: null,

  setUser: (user) => set({ user }),
  setCurrentShift: (currentShift) => set({ currentShift }),
  setIsLoadingShift: (isLoadingShift) => set({ isLoadingShift }),
  setIsOpenShiftModal: (isOpenShiftModal) => set({ isOpenShiftModal }),
  setIsCloseShiftModal: (isCloseShiftModal) => set({ isCloseShiftModal }),
  setSettlementResult: (settlementResult) => set({ settlementResult }),

  fetchCurrentShift: async (userId?: string, role?: string) => {
    set({ isLoadingShift: true });
    try {
      const activeUserId = userId || get().user?.id || 'demo-kasir-id';
      const activeRole = role || get().user?.role || 'KASIR';
      const res = await fetch('/api/shift/current', {
        headers: {
          'x-user-id': activeUserId,
          'x-user-role': activeRole,
        },
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data?.shift) {
        set({ currentShift: data, isLoadingShift: false });
        return data;
      } else {
        set({ currentShift: null, isLoadingShift: false });
        return null;
      }
    } catch (err) {
      console.error('Gagal mengambil shift kasir:', err);
      set({ currentShift: null, isLoadingShift: false });
      return null;
    }
  },

  addToCart: (item: CartItem) => {
    const { cart } = get();
    const normalizedSn = item.serialNumber.trim().toUpperCase();

    // Validasi duplikasi Serial Number di keranjang
    const existing = cart.find(
      (c) => c.serialNumber.trim().toUpperCase() === normalizedSn
    );

    if (existing) {
      return {
        success: false,
        message: `Unit [${normalizedSn}] sudah ada di dalam keranjang!`,
      };
    }

    const newCart = [...cart, { ...item, serialNumber: normalizedSn }];
    const newTotal = newCart.reduce((sum, i) => sum + Number(i.price), 0);

    set({
      cart: newCart,
      totalAmount: newTotal,
    });

    return { success: true };
  },

  removeFromCart: (serialNumber: string) => {
    const { cart } = get();
    const normalizedSn = serialNumber.trim().toUpperCase();
    const newCart = cart.filter(
      (c) => c.serialNumber.trim().toUpperCase() !== normalizedSn
    );
    const newTotal = newCart.reduce((sum, i) => sum + Number(i.price), 0);

    set({
      cart: newCart,
      totalAmount: newTotal,
    });
  },

  clearCart: () => {
    set({
      cart: [],
      totalAmount: 0,
    });
  },
}));
