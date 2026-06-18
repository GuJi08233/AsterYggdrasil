import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextureLibraryTextureAvatar } from "./TextureLibraryTextureAvatar";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

describe("TextureLibraryTextureAvatar", () => {
	it("renders skin textures through the player avatar preview", () => {
		render(
			<TextureLibraryTextureAvatar
				texture={{
					id: 12,
					name: "Slim Skin",
					preview_url: "/textures/slim-preview.png",
					texture_type: "skin",
					url: "/textures/slim.png",
				}}
				testId="texture-avatar"
				imageTestId="texture-avatar-image"
			/>,
		);

		expect(screen.getByTestId("texture-avatar")).toBeInTheDocument();
		expect(screen.getByTestId("texture-avatar-image")).toHaveAttribute(
			"src",
			"/textures/slim.png",
		);
		expect(screen.getByTestId("texture-avatar")).toHaveAttribute(
			"title",
			"Slim Skin",
		);
	});

	it("renders cape textures as pixelated image previews and prefers preview URLs", () => {
		render(
			<TextureLibraryTextureAvatar
				texture={{
					id: 13,
					name: "Red Cape",
					preview_url: "/textures/cape-preview.png",
					texture_type: "cape",
					url: "/textures/cape.png",
				}}
				testId="texture-avatar"
				imageTestId="texture-avatar-image"
			/>,
		);

		expect(screen.getByTestId("texture-avatar")).toHaveAttribute(
			"title",
			"Red Cape",
		);
		expect(screen.getByTestId("texture-avatar-image")).toHaveAttribute(
			"src",
			"/textures/cape-preview.png",
		);
		expect(screen.getByTestId("texture-avatar-image")).toHaveAttribute(
			"crossorigin",
			"anonymous",
		);
		expect(screen.getByTestId("texture-avatar-image")).toHaveClass(
			"[image-rendering:pixelated]",
		);
	});
});
