import { useTranslation } from "react-i18next";
import { AdminFilterToolbar } from "@/components/common/AdminFilterToolbar";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface UserFilterOption {
	label: string;
	value: string;
}

export function AdminUserFiltersToolbar({
	activeFilterCount,
	keyword,
	onKeywordChange,
	onResetFilters,
	onRoleChange,
	onStatusChange,
	role,
	roleOptions,
	status,
	statusOptions,
}: {
	activeFilterCount: number;
	keyword: string;
	onKeywordChange: (value: string) => void;
	onResetFilters: () => void;
	onRoleChange: (value: string | null) => void;
	onStatusChange: (value: string | null) => void;
	role: string;
	roleOptions: ReadonlyArray<UserFilterOption>;
	status: string;
	statusOptions: ReadonlyArray<UserFilterOption>;
}) {
	const { t } = useTranslation();

	return (
		<AdminFilterToolbar
			activeFilterCount={activeFilterCount}
			inline
			onResetFilters={onResetFilters}
		>
			<div className="relative min-w-[240px] flex-1 md:max-w-sm">
				<Icon
					name="MagnifyingGlass"
					className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					value={keyword}
					onChange={(event) => onKeywordChange(event.target.value)}
					placeholder={t("admin.users.searchPlaceholder")}
					className="pl-9"
				/>
			</div>
			<Select items={roleOptions} value={role} onValueChange={onRoleChange}>
				<SelectTrigger width="compact" aria-label={t("admin.users.roleLabel")}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent align="start">
					{roleOptions.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				items={statusOptions}
				value={status}
				onValueChange={onStatusChange}
			>
				<SelectTrigger
					width="compact"
					aria-label={t("admin.users.statusLabel")}
				>
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
