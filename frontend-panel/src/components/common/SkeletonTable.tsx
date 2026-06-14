import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export function SkeletonTable({
	columns,
	rows = 5,
}: {
	columns: number;
	rows?: number;
}) {
	const columnKeys = Array.from(
		{ length: columns },
		(_, index) => `column-${index}`,
	);
	const rowKeys = Array.from({ length: rows }, (_, index) => `row-${index}`);

	return (
		<Table>
			<TableHeader>
				<TableRow>
					{columnKeys.map((columnKey) => (
						<TableHead key={columnKey}>
							<Skeleton className="h-3 w-20" />
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{rowKeys.map((rowKey) => (
					<TableRow key={rowKey}>
						{columnKeys.map((columnKey) => (
							<TableCell key={`${rowKey}-${columnKey}`}>
								<Skeleton className="h-4 w-full max-w-36" />
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
