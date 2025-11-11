import create from "zustand";

export const useRestaurantStore = create((set) => ({
	restaurantId: null,
	setRestaurantId: (id) => set({ restaurantId: id }),
}));
