import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserAvatarImage } from "./UserAvatarImage";

describe("UserAvatarImage", () => {
	it("renders initials when no avatar URL is available", () => {
		render(<UserAvatarImage name="Steve Alex" />);

		expect(screen.getByText("SA")).toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});

	it("prefixes internal avatar URLs with the API base URL", () => {
		render(
			<UserAvatarImage
				name="Steve"
				avatar={{
					source: "upload",
					url_512: "/auth/profile/avatar/512?v=3",
					url_1024: "/auth/profile/avatar/1024?v=3",
					version: 3,
				}}
			/>,
		);

		expect(screen.getByRole("img")).toHaveAttribute(
			"src",
			"/api/v1/auth/profile/avatar/512?v=3",
		);
	});

	it("falls back to initials when the avatar image fails to load", () => {
		render(
			<UserAvatarImage
				name="Steve"
				avatar={{
					source: "upload",
					url_512: "/auth/profile/avatar/512?v=3",
					url_1024: null,
					version: 3,
				}}
			/>,
		);

		fireEvent.error(screen.getByRole("img"));

		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(screen.getByText("ST")).toBeInTheDocument();
	});
});
