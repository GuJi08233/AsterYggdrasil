import type { ReactNode } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonTable } from "@/components/common/SkeletonTable";
import { AdminSurface } from "@/components/layout/AdminSurface";
import { cn } from "@/lib/utils";
import { AdminTable, AdminTableBody, AdminTableShell } from "./AdminTable";

export function AdminTableList<T>({
	className,
	columns,
	emptyAction,
	emptyDescription,
	emptyIcon,
	emptyTitle,
	filtered = false,
	filteredEmptyAction,
	filteredEmptyDescription,
	filteredEmptyTitle,
	headerRow,
	items,
	loading,
	pagination,
	renderRow,
	rows = 5,
	toolbar,
}: {
	className?: string;
	columns: number;
	emptyAction?: ReactNode;
	emptyDescription?: string;
	emptyIcon?: ReactNode;
	emptyTitle: string;
	filtered?: boolean;
	filteredEmptyAction?: ReactNode;
	filteredEmptyDescription?: string;
	filteredEmptyTitle?: string;
	headerRow: ReactNode;
	items: T[];
	loading: boolean;
	pagination?: ReactNode;
	renderRow: (item: T) => ReactNode;
	rows?: number;
	toolbar?: ReactNode;
}) {
	return (
		<div className={cn("flex min-h-0 flex-col gap-3", className)}>
			{toolbar ? (
				<AdminSurface padded={false} className="px-3 py-2">
					<div className="flex flex-wrap items-center gap-2">{toolbar}</div>
				</AdminSurface>
			) : null}
			{loading ? (
				<AdminTableShell>
					<SkeletonTable columns={columns} rows={rows} />
				</AdminTableShell>
			) : items.length === 0 ? (
				<AdminSurface padded={false}>
					<EmptyState
						icon={emptyIcon}
						title={filtered ? (filteredEmptyTitle ?? emptyTitle) : emptyTitle}
						description={
							filtered
								? (filteredEmptyDescription ?? emptyDescription)
								: emptyDescription
						}
						action={
							filtered ? (filteredEmptyAction ?? emptyAction) : emptyAction
						}
					/>
				</AdminSurface>
			) : (
				<AdminTableShell>
					<AdminTable>
						{headerRow}
						<AdminTableBody>{items.map(renderRow)}</AdminTableBody>
					</AdminTable>
				</AdminTableShell>
			)}
			{pagination ? <div className="flex-none">{pagination}</div> : null}
		</div>
	);
}
