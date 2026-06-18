import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { adminPaths } from "@/routes/routePaths";

export type TextureLibrarySection = "textures" | "reviews" | "reports" | "tags";

export function TextureLibrarySectionNav({
	active,
}: {
	active: TextureLibrarySection;
}) {
	const { t } = useTranslation();
	return (
		<>
			<Button
				type="button"
				variant={active === "textures" ? "default" : "outline"}
				size="sm"
				render={<Link to={adminPaths.textureLibrary} />}
			>
				<Icon name="Images" className="size-4" />
				{t("admin.textureLibraryTexturesPage.allTextures")}
			</Button>
			<Button
				type="button"
				variant={active === "reviews" ? "default" : "outline"}
				size="sm"
				render={<Link to={adminPaths.textureLibraryReviews} />}
			>
				<Icon name="ListChecks" className="size-4" />
				{t("admin.textureLibraryTexturesPage.reviewQueue")}
			</Button>
			<Button
				type="button"
				variant={active === "reports" ? "default" : "outline"}
				size="sm"
				render={<Link to={adminPaths.textureLibraryReports} />}
			>
				<Icon name="Flag" className="size-4" />
				{t("admin.textureLibraryReportsPage.reports")}
			</Button>
			<Button
				type="button"
				variant={active === "tags" ? "default" : "outline"}
				size="sm"
				render={<Link to={adminPaths.textureLibraryTags} />}
			>
				<Icon name="ListBullets" className="size-4" />
				{t("admin.textureLibraryTexturesPage.tags")}
			</Button>
		</>
	);
}
