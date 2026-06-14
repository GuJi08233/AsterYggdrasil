import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaticSkinPreview } from "./StaticSkinPreview";

type SkinViewerMockOptions = {
	enableControls?: boolean;
	renderPaused?: boolean;
};

type SkinViewerMockInstance = {
	animation: unknown;
	autoRotate: boolean;
	disposed: boolean;
	loadSkin: ReturnType<typeof vi.fn>;
	options: SkinViewerMockOptions;
	playerWrapper: {
		rotation: {
			x: number;
			y: number;
		};
	};
	render: ReturnType<typeof vi.fn>;
	setSize: ReturnType<typeof vi.fn>;
	dispose: () => void;
};

const skinViewerMock = vi.hoisted(() => {
	const instances: SkinViewerMockInstance[] = [];
	class SkinViewer {
		animation: unknown = undefined;
		autoRotate = true;
		disposed = false;
		loadSkin = vi.fn(() => Promise.resolve());
		options: SkinViewerMockOptions;
		playerWrapper = {
			rotation: {
				x: 0,
				y: 0,
			},
		};
		render = vi.fn();
		setSize = vi.fn();

		constructor(options: SkinViewerMockOptions) {
			this.options = options;
			instances.push(this);
		}

		dispose() {
			this.disposed = true;
		}
	}
	return { instances, SkinViewer };
});

vi.mock("skinview3d", () => ({
	SkinViewer: skinViewerMock.SkinViewer,
}));

describe("StaticSkinPreview", () => {
	it("renders a still two-angle skin model preview", () => {
		skinViewerMock.instances.length = 0;

		render(
			<StaticSkinPreview
				alt="Skin preview"
				model="slim"
				skinUrl="/textures/skin.png"
			/>,
		);

		expect(
			screen.getByRole("img", { name: "Skin preview" }),
		).toBeInTheDocument();
		expect(
			document.querySelectorAll('[data-slot="static-skin-preview-canvas"]'),
		).toHaveLength(2);
		expect(skinViewerMock.instances).toHaveLength(2);
		for (const viewer of skinViewerMock.instances) {
			expect(viewer.options).toMatchObject({
				enableControls: false,
				renderPaused: true,
			});
			expect(viewer.autoRotate).toBe(false);
			expect(viewer.animation).toBeNull();
			expect(viewer.loadSkin).toHaveBeenCalledWith("/textures/skin.png", {
				ears: "load-only",
				model: "slim",
			});
			expect(viewer.playerWrapper.rotation.x).toBeCloseTo(Math.PI / 7);
		}
		expect(skinViewerMock.instances[0]?.playerWrapper.rotation.y).toBeCloseTo(
			Math.PI - Math.PI / 6,
		);
		expect(skinViewerMock.instances[1]?.playerWrapper.rotation.y).toBeCloseTo(
			-Math.PI / 6,
		);
	});
});
