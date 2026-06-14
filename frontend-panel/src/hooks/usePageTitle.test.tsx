import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_BRANDING } from "@/lib/branding";
import { useFrontendConfigStore } from "@/stores/frontendConfigStore";
import { usePageTitle } from "./usePageTitle";

function TitleProbe({ title }: { title: string }) {
	usePageTitle(title);
	return null;
}

describe("usePageTitle", () => {
	beforeEach(() => {
		document.title = "";
		useFrontendConfigStore.setState((state) => ({
			...state,
			branding: DEFAULT_BRANDING,
			isLoaded: false,
		}));
	});

	it("combines the page title with the current branding title", () => {
		render(<TitleProbe title="Minecraft Profiles" />);

		expect(document.title).toBe("Minecraft Profiles · AsterYggdrasil");
	});

	it("reacts to branding title updates from the public config bootstrap", async () => {
		render(<TitleProbe title="Personal settings" />);

		act(() => {
			useFrontendConfigStore.setState((state) => ({
				...state,
				branding: {
					...state.branding,
					title: "Nebula Yggdrasil",
				},
				isLoaded: true,
			}));
		});

		await waitFor(() => {
			expect(document.title).toBe("Personal settings · Nebula Yggdrasil");
		});
	});
});
