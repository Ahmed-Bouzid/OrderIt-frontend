// shared-api/stores/useProductStore.js
import { create } from "zustand";
import { productService } from "../services/productService.js";

// ⭐ Module-level variables pour la déduplication
let fetchPromise = null;
let isFetching = false; // ⭐ Flag global pour bloquer les appels parallèles
let socketListenerAttached = false; // ⭐ Flag pour éviter les doublons

const useProductStore = create((set, get) => ({
	products: [],
	isLoading: false,

	// ⭐ Fonction pour attacher les listeners WebSocket
	attachSocketListener: (socket) => {
		if (!socket || socketListenerAttached) {
			return;
		}

		console.log("🔌 Attachement des listeners WebSocket pour produits");
		socketListenerAttached = true;

		socket.on("product", (event) => {
			const { type, data } = event;
			console.log(`📡 Événement produit reçu: ${type}`, data);

			const state = get();

			switch (type) {
				case "created": {
					const exists = state.products.some((p) => p._id === data._id);
					if (!exists) {
						set({ products: [...state.products, data] });
					}
					break;
				}

				case "updated": {
					const updated = state.products.map((p) =>
						p._id === data._id ? data : p
					);
					set({ products: updated });
					break;
				}

				case "deleted": {
					const filtered = state.products.filter((p) => p._id !== data._id);
					set({ products: filtered });
					break;
				}

				default:
					console.warn(`Unknown product event type: ${type}`);
			}
		});

		return () => {
			if (socket) {
				socket.off("product");
				socketListenerAttached = false;
			}
		};
	},

	fetchProducts: async (token) => {
		const state = get();

		// ⭐ Si les produits existent déjà en cache, ne pas refetch
		if (state.products.length > 0) {
			console.log("📦 Produits déjà en cache, pas de fetch");
			return state.products;
		}

		// ⭐ BLOQUER COMPLÈTEMENT les appels parallèles
		if (isFetching || fetchPromise) {
			console.log("⏳ Requête produits déjà en cours, attente...");
			if (fetchPromise) return fetchPromise;
			// Attendre que isFetching passe à false
			while (isFetching) {
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
			// Réessayer une fois le flag déverrouillé
			return useProductStore.getState().fetchProducts(token);
		}

		try {
			isFetching = true; // ⭐ Marquer comme en cours
			// ⭐ Créer la promesse une fois et la stocker
			fetchPromise = productService.fetchProducts(token);
			const products = await fetchPromise;
			set({ products });
			return products;
		} catch (err) {
			console.error("❌ Error fetching products:", err);
			throw err;
		} finally {
			isFetching = false; // ⭐ Déverrouiller le flag
			// ⭐ IMPORTANT - réinitialiser la promesse après
			fetchPromise = null;
		}
	},

	setProducts: (products) => set({ products }),
}));

export default useProductStore;
