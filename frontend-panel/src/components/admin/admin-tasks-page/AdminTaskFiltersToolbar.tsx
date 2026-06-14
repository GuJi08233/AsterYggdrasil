import { AdminFilterToolbar } from "@/components/common/AdminFilterToolbar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface AdminTaskFiltersToolbarProps {
	activeFilterCount: number;
	onResetFilters: () => void;
	onStatusChange: (value: string | null) => void;
	statusFilter: string;
	statusOptions: ReadonlyArray<{ label: string; value: string }>;
	statusLabel: string;
}

export function AdminTaskFiltersToolbar({
	activeFilterCount,
	onResetFilters,
	onStatusChange,
	statusFilter,
	statusOptions,
	statusLabel,
}: AdminTaskFiltersToolbarProps) {
	return (
		<AdminFilterToolbar
			activeFilterCount={activeFilterCount}
			inline
			onResetFilters={onResetFilters}
		>
			<Select
				items={statusOptions}
				value={statusFilter}
				onValueChange={onStatusChange}
			>
				<SelectTrigger width="compact" aria-label={statusLabel}>
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
		</AdminFilterToolbar>
	);
}
