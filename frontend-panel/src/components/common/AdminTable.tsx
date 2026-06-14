import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AdminSurface } from "../layout/AdminSurface";

export const ADMIN_TABLE_ROW_CLASS =
	"h-11 border-border/60 hover:bg-muted/35 data-[state=selected]:bg-muted/55";
export const ADMIN_TABLE_HEAD_CLASS =
	"h-9 bg-muted/35 px-3 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5";
export const ADMIN_TABLE_CELL_CLASS =
	"px-3 py-2 align-middle text-sm first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5";
export const ADMIN_TABLE_MUTED_TEXT_CLASS = "text-xs text-muted-foreground";
export const ADMIN_TABLE_MONO_TEXT_CLASS =
	"font-mono text-xs text-muted-foreground";

export function AdminTableShell({
	children,
	className,
	scrollAreaClassName,
}: {
	children: ReactNode;
	className?: string;
	scrollAreaClassName?: string;
}) {
	return (
		<AdminSurface
			padded={false}
			className={cn("min-h-0 overflow-hidden", className)}
		>
			<ScrollArea className={cn("min-h-0", scrollAreaClassName)}>
				{children}
			</ScrollArea>
		</AdminSurface>
	);
}

export function AdminTable({
	className,
	...props
}: ComponentProps<typeof Table>) {
	return <Table className={cn("text-sm", className)} {...props} />;
}

export function AdminTableHeader({
	className,
	...props
}: ComponentProps<typeof TableHeader>) {
	return (
		<TableHeader
			className={cn("[&_tr]:border-border/70", className)}
			{...props}
		/>
	);
}

export function AdminTableBody({
	className,
	...props
}: ComponentProps<typeof TableBody>) {
	return <TableBody className={className} {...props} />;
}

export function AdminTableRow({
	className,
	...props
}: ComponentProps<typeof TableRow>) {
	return (
		<TableRow className={cn(ADMIN_TABLE_ROW_CLASS, className)} {...props} />
	);
}

export function AdminTableHead({
	className,
	...props
}: ComponentProps<typeof TableHead>) {
	return (
		<TableHead className={cn(ADMIN_TABLE_HEAD_CLASS, className)} {...props} />
	);
}

export function AdminTableCell({
	className,
	...props
}: ComponentProps<typeof TableCell>) {
	return (
		<TableCell className={cn(ADMIN_TABLE_CELL_CLASS, className)} {...props} />
	);
}

export function AdminSortableTableHead<SortBy extends string>({
	children,
	className,
	onSortChange,
	sortBy,
	sortKey,
	sortOrder,
	...props
}: Omit<ComponentProps<typeof TableHead>, "children"> & {
	children: ReactNode;
	onSortChange: (sortBy: SortBy, sortOrder: "asc" | "desc") => void;
	sortBy: SortBy;
	sortKey: SortBy;
	sortOrder: "asc" | "desc";
}) {
	const active = sortBy === sortKey;
	const nextOrder = active && sortOrder === "asc" ? "desc" : "asc";

	return (
		<AdminTableHead
			className={cn("p-0", className)}
			aria-sort={
				active ? (sortOrder === "asc" ? "ascending" : "descending") : "none"
			}
			{...props}
		>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className={cn(
					"h-9 w-full justify-start rounded-none px-3 text-[11px] font-semibold uppercase tracking-normal hover:bg-muted/45",
					active ? "text-foreground" : "text-muted-foreground",
				)}
				onClick={() => onSortChange(sortKey, nextOrder)}
			>
				<span className="truncate">{children}</span>
				<Icon
					name={sortOrder === "asc" ? "SortAscending" : "SortDescending"}
					className={cn(
						"ml-1.5 size-3.5 shrink-0 transition-opacity",
						active ? "opacity-100" : "opacity-30",
					)}
				/>
			</Button>
		</AdminTableHead>
	);
}
