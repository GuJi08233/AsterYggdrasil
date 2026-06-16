import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import { adminConfigService } from "@/services/adminService";
import type { ConfigSchemaItem, SystemConfig } from "@/types/api";

vi.mock("@/services/adminService", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/services/adminService")>();
	return {
		...actual,
		adminConfigService: {
			...actual.adminConfigService,
			list: vi.fn(),
			schema: vi.fn(),
			set: vi.fn(),
		},
	};
});

const config = {
	category: "site.urls",
	description: "Public site URLs",
	id: 1,
	is_sensitive: false,
	key: "site.urls",
	namespace: "site",
	requires_restart: false,
	source: "system",
	updated_at: "2026-06-15T00:00:00.000Z",
	updated_by: null,
	value: ["https://example.com"],
	value_type: "string_array",
	visibility: "public",
} satisfies SystemConfig;

const customConfig = {
	...config,
	id: 2,
	key: "custom.banner",
	source: "custom",
	value: "hello",
	value_type: "string",
	visibility: "authenticated",
} satisfies SystemConfig;

const schema = {
	category: "site.urls",
	description: "Public site URLs",
	description_i18n_key: "",
	is_sensitive: false,
	key: "site.urls",
	label_i18n_key: "",
	options: [],
	requires_restart: false,
	value_type: "string_array",
} satisfies ConfigSchemaItem;

describe("AdminSettingsPage", () => {
	beforeEach(() => {
		vi.mocked(adminConfigService.list).mockReset();
		vi.mocked(adminConfigService.schema).mockReset();
		vi.mocked(adminConfigService.set).mockReset();
	});

	it("keeps string-array input focused while editing a row", async () => {
		vi.mocked(adminConfigService.list).mockResolvedValue({
			items: [config],
			limit: 500,
			offset: 0,
			total: 1,
		});
		vi.mocked(adminConfigService.schema).mockResolvedValue([schema]);

		render(<AdminSettingsPage />);

		const input = await screen.findByDisplayValue("https://example.com");
		input.focus();
		fireEvent.change(input, {
			target: { value: "https://example.com/account" },
		});

		expect(input).toHaveValue("https://example.com/account");
		expect(document.activeElement).toBe(input);
	});

	it("does not send visibility when saving system config changes", async () => {
		vi.mocked(adminConfigService.list).mockResolvedValue({
			items: [config],
			limit: 500,
			offset: 0,
			total: 1,
		});
		vi.mocked(adminConfigService.schema).mockResolvedValue([schema]);
		vi.mocked(adminConfigService.set).mockResolvedValue({
			...config,
			value: ["https://example.com/account"],
		});

		render(<AdminSettingsPage />);

		const input = await screen.findByDisplayValue("https://example.com");
		fireEvent.change(input, {
			target: { value: "https://example.com/account" },
		});
		fireEvent.click(screen.getAllByRole("button", { name: /save/i })[0]);

		expect(adminConfigService.set).toHaveBeenCalledWith("site.urls", {
			value: ["https://example.com/account"],
		});
	});

	it("keeps visibility when saving custom config changes", async () => {
		vi.mocked(adminConfigService.list).mockResolvedValue({
			items: [customConfig],
			limit: 500,
			offset: 0,
			total: 1,
		});
		vi.mocked(adminConfigService.schema).mockResolvedValue([]);
		vi.mocked(adminConfigService.set).mockResolvedValue({
			...customConfig,
			value: "hello again",
		});

		render(<AdminSettingsPage />);

		const input = await screen.findByDisplayValue("hello");
		fireEvent.change(input, {
			target: { value: "hello again" },
		});
		fireEvent.click(screen.getAllByRole("button", { name: /save/i })[0]);

		expect(adminConfigService.set).toHaveBeenCalledWith("custom.banner", {
			value: "hello again",
			visibility: "authenticated",
		});
	});
});
