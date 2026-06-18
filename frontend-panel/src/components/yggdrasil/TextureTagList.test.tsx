import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	TextureTagChips,
	TextureTagPickerList,
} from "@/components/yggdrasil/TextureTagList";
import type { MinecraftTextureTagInfo } from "@/types/api";

function tag(
	overrides: Partial<MinecraftTextureTagInfo> = {},
): MinecraftTextureTagInfo {
	return {
		color: "#228855",
		created_at: "2026-06-01T00:00:00Z",
		id: 1,
		name: "Featured",
		sort_order: 10,
		updated_at: "2026-06-01T00:00:00Z",
		...overrides,
	};
}

function renderPicker({
	disabled = false,
	hasMore = false,
	loading = false,
	selectedIds = [],
	tags = [tag()],
	onLoadMore = vi.fn(),
	onToggle = vi.fn(),
}: {
	disabled?: boolean;
	hasMore?: boolean;
	loading?: boolean;
	selectedIds?: number[];
	tags?: MinecraftTextureTagInfo[];
	onLoadMore?: () => void;
	onToggle?: (tagId: number) => void;
} = {}) {
	return {
		onLoadMore,
		onToggle,
		...render(
			<TextureTagPickerList
				disabled={disabled}
				emptyLabel="No tags"
				hasMore={hasMore}
				loading={loading}
				loadingLabel="Loading tags"
				selectedIds={selectedIds}
				tags={tags}
				onLoadMore={onLoadMore}
				onToggle={onToggle}
			/>,
		),
	};
}

describe("TextureTagChips", () => {
	it("renders nothing for an empty tag list", () => {
		const { container } = render(<TextureTagChips tags={[]} />);

		expect(container).toBeEmptyDOMElement();
	});

	it("renders tag names with hash-derived colors from the tag data", () => {
		render(
			<TextureTagChips
				tags={[
					tag({ id: 1, name: "Featured", color: "#228855" }),
					tag({ id: 2, name: "Classic", color: "#aa4477" }),
				]}
			/>,
		);

		expect(screen.getByText("Featured")).toHaveStyle({
			color: "#228855",
			borderColor: "#22885555",
		});
		expect(screen.getByText("Classic")).toHaveStyle({
			color: "#aa4477",
			borderColor: "#aa447755",
		});
	});
});

describe("TextureTagPickerList", () => {
	it("renders selectable tag rows and toggles by id", () => {
		const onToggle = vi.fn();
		renderPicker({
			onToggle,
			selectedIds: [2],
			tags: [tag({ id: 1, name: "Featured" }), tag({ id: 2, name: "Classic" })],
		});

		const [featured, classic] = screen.getAllByRole("checkbox");
		expect(featured).not.toBeChecked();
		expect(classic).toBeChecked();

		fireEvent.click(featured);
		fireEvent.click(classic);

		expect(onToggle).toHaveBeenNthCalledWith(1, 1);
		expect(onToggle).toHaveBeenNthCalledWith(2, 2);
	});

	it("disables checkbox rows when editing is disabled", () => {
		const onToggle = vi.fn();
		renderPicker({ disabled: true, onToggle });

		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).toBeDisabled();

		fireEvent.click(checkbox);
		expect(onToggle).not.toHaveBeenCalled();
	});

	it("shows loading and empty labels for empty pages", () => {
		const { rerender } = render(
			<TextureTagPickerList
				emptyLabel="No tags"
				hasMore={false}
				loading={false}
				loadingLabel="Loading tags"
				selectedIds={[]}
				tags={[]}
				onLoadMore={vi.fn()}
				onToggle={vi.fn()}
			/>,
		);

		expect(screen.getByText("No tags")).toBeInTheDocument();

		rerender(
			<TextureTagPickerList
				emptyLabel="No tags"
				hasMore={false}
				loading={true}
				loadingLabel="Loading tags"
				selectedIds={[]}
				tags={[]}
				onLoadMore={vi.fn()}
				onToggle={vi.fn()}
			/>,
		);

		expect(screen.getByText("Loading tags")).toBeInTheDocument();
	});

	it("renders inline loading state when appending more tags", () => {
		renderPicker({ loading: true });

		expect(screen.getByText("Loading tags")).toBeInTheDocument();
		expect(screen.getByText("Featured")).toBeInTheDocument();
	});

	it("loads the next page only near the scroll boundary", () => {
		const { container, onLoadMore, rerender } = renderPicker({
			hasMore: true,
			tags: [tag()],
		});
		const scrollBox = container.firstElementChild as HTMLElement;
		Object.defineProperties(scrollBox, {
			clientHeight: { configurable: true, value: 40 },
			scrollHeight: { configurable: true, value: 200 },
			scrollTop: { configurable: true, value: 80 },
		});

		fireEvent.scroll(scrollBox);
		expect(onLoadMore).not.toHaveBeenCalled();

		Object.defineProperty(scrollBox, "scrollTop", {
			configurable: true,
			value: 150,
		});
		fireEvent.scroll(scrollBox);
		expect(onLoadMore).toHaveBeenCalledTimes(1);

		rerender(
			<TextureTagPickerList
				emptyLabel="No tags"
				hasMore={true}
				loading={true}
				loadingLabel="Loading tags"
				selectedIds={[]}
				tags={[tag()]}
				onLoadMore={onLoadMore}
				onToggle={vi.fn()}
			/>,
		);
		fireEvent.scroll(scrollBox);
		expect(onLoadMore).toHaveBeenCalledTimes(1);
	});
});
