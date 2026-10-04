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
}

export const usePosStore = create<PosStore>((set, get) => ({
  cart: [],
  totalAmount: 0,

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
