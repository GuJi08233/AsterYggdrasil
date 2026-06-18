import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { UsersSectionNav } from "@/components/admin/UsersSectionNav";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

function renderNav(active: "users" | "invitations") {
	render(
		<MemoryRouter>
			<UsersSectionNav active={active} />
		</MemoryRouter>,
	);
}

describe("UsersSectionNav", () => {
	it("uses the admin users subpage links for every section", () => {
		renderNav("invitations");

		expect(
			screen.getByRole("link", { name: /admin.users.userList/ }),
		).toHaveAttribute("href", "/admin/users");
		expect(
			screen.getByRole("link", { name: /admin.users.invitationRecords/ }),
		).toHaveAttribute("href", "/admin/users/invitations");
	});

	it("keeps section controls visually aligned with the compact header action size", () => {
		renderNav("users");

		for (const link of screen.getAllByRole("link")) {
			expect(link).toHaveClass("h-7", "gap-1", "px-2.5", "text-[0.8rem]");
		}
	});
});
