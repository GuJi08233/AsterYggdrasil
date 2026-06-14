import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function UserDetailFooterActions({
	busy,
	hasProfileChanges,
	profileInvalid,
	savingProfile,
	onBack,
	onSave,
}: {
	busy: boolean;
	hasProfileChanges: boolean;
	profileInvalid: boolean;
	savingProfile: boolean;
	onBack?: () => void;
	onSave: () => void;
}) {
	const { t } = useTranslation();
	return (
		<div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border/70 px-5 py-4 dark:border-white/10">
			{onBack ? (
				<Button
					type="button"
					variant="outline"
					disabled={busy}
					onClick={onBack}
				>
					<Icon name="ArrowLeft" className="mr-2 size-4" />
					{t("admin.users.backToUsers")}
				</Button>
			) : null}
			<Button
				type="button"
				disabled={!hasProfileChanges || savingProfile || profileInvalid}
				onClick={onSave}
			>
				<Icon
					name={savingProfile ? "Spinner" : "FloppyDisk"}
					className={cn("mr-2 size-4", savingProfile && "animate-spin")}
				/>
				{t("admin.users.saveChanges")}
			</Button>
		</div>
	);
}
