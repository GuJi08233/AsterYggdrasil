import { create } from "zustand";
import { authService } from "@/services/authService";

type InitStatusState = {
	checking: boolean;
	initialized: boolean | null;
	error: string | null;
	check: (options?: { force?: boolean }) => Promise<boolean>;
	markInitialized: () => void;
	reset: () => void;
};

let inFlightCheck: Promise<boolean> | null = null;

export const useInitStatusStore = create<InitStatusState>((set, get) => ({
	checking: true,
	initialized: null,
	error: null,
	async check(options) {
		if (!options?.force && get().initialized !== null) {
			return get().initialized === true;
		}
		if (inFlightCheck) return inFlightCheck;

		inFlightCheck = (async () => {
			set({ checking: true, error: null });
			try {
				const result = await authService.check();
				set({
					checking: false,
					initialized: result.initialized,
					error: null,
				});
				return result.initialized;
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Initialization check failed";
				set({ checking: false, initialized: true, error: message });
				return true;
			} finally {
				inFlightCheck = null;
			}
		})();

		return inFlightCheck;
	},
	markInitialized() {
		set({ checking: false, initialized: true, error: null });
	},
	reset() {
		inFlightCheck = null;
		set({ checking: true, initialized: null, error: null });
	},
}));
