import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";

export function ConfirmDialog({
	cancelLabel,
	confirmLabel,
	description,
	loading = false,
	onConfirm,
	onOpenChange,
	open,
	title,
	variant = "default",
}: {
	cancelLabel: string;
	confirmLabel: string;
	description?: string;
	loading?: boolean;
	onConfirm: () => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	title: string;
	variant?: "default" | "destructive";
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent keepMounted className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description ? (
						<DialogDescription>{description}</DialogDescription>
					) : null}
				</DialogHeader>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						disabled={loading}
						onClick={() => onOpenChange(false)}
					>
						{cancelLabel}
					</Button>
					<Button
						type="button"
						variant={variant}
						disabled={loading}
						onClick={onConfirm}
					>
						{loading ? (
							<Icon name="Spinner" className="mr-2 size-4 animate-spin" />
						) : null}
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
