import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { adminPaths } from "@/routes/routePaths";

export type UsersSection = "users" | "invitations";

export function UsersSectionNav({ active }: { active: UsersSection }) {
	const { t } = useTranslation();
	return (
		<>
			<Button
				type="button"
				variant={active === "users" ? "default" : "outline"}
				size="sm"
				render={<Link to={adminPaths.users} />}
			>
				<Icon name="User" className="size-4" />
				{t("admin.users.userList")}
			</Button>
			<Button
				type="button"
				variant={active === "invitations" ? "default" : "outline"}
				size="sm"
				render={<Link to={adminPaths.userInvitations} />}
			>
				<Icon name="EnvelopeSimple" className="size-4" />
				{t("admin.users.invitationRecords")}
			</Button>
		</>
	);
}
