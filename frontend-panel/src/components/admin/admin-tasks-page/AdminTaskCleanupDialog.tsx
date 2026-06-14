import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface AdminTaskCleanupDialogProps {
	description: string;
	finishedBefore: string;
	onFinishedBeforeChange: (value: string) => void;
	onOpenChange: (open: boolean) => void;
	onResetConditions: () => void;
	onStatusFilterChange: (value: string | null) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	open: boolean;
	statusFilter: string;
	statusOptions: ReadonlyArray<{ label: string; value: string }>;
	submitDisabled: boolean;
	submitting: boolean;
}

export function AdminTaskCleanupDialog({
	description,
	finishedBefore,
	onFinishedBeforeChange,
	onOpenChange,
	onResetConditions,
	onStatusFilterChange,
	onSubmit,
	open,
	statusFilter,
	statusOptions,
	submitDisabled,
	submitting,
}: AdminTaskCleanupDialogProps) {
	const { t } = useTranslation();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent keepMounted className="sm:max-w-md">
				<form onSubmit={onSubmit} className="space-y-4">
					<DialogHeader>
						<DialogTitle>{t("admin.tasks.cleanup.title")}</DialogTitle>
						<DialogDescription>
							{t("admin.tasks.cleanup.description")}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="task-cleanup-finished-before">
							{t("admin.tasks.cleanup.finishedBefore")}
						</Label>
						<Input
							id="task-cleanup-finished-before"
							type="datetime-local"
							value={finishedBefore}
							onChange={(event) => onFinishedBeforeChange(event.target.value)}
							aria-label={t("admin.tasks.cleanup.finishedBefore")}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="task-cleanup-status">
							{t("admin.tasks.cleanup.status")}
						</Label>
						<Select
							items={statusOptions}
							value={statusFilter}
							onValueChange={onStatusFilterChange}
						>
							<SelectTrigger id="task-cleanup-status" width="full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent align="start">
								{statusOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs leading-5 text-muted-foreground dark:border-white/10 dark:bg-muted/10">
						{description}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={submitting}
						>
							{t("common.cancel")}
						</Button>
						<Button
							type="button"
							variant="ghost"
							onClick={onResetConditions}
							disabled={submitting}
						>
							{t("admin.tasks.cleanup.reset")}
						</Button>
						<Button
							type="submit"
							variant="destructive"
							disabled={submitDisabled}
						>
							<Icon
								name={submitting ? "Spinner" : "Trash"}
								className={submitting ? "size-4 animate-spin" : "size-4"}
							/>
							{t("admin.tasks.cleanup.submit")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
