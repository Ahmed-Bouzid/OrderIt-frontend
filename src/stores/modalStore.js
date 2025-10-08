import { create } from "zustand";

export const useModalStore = create((set) => ({
	isUpgradeOpen: false,
	openUpgrade: () => set({ isUpgradeOpen: true }),
	closeUpgrade: () => set({ isUpgradeOpen: false }),
}));
