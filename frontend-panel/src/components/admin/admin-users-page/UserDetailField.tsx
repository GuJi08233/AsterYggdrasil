import { isValidElement, type ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function UserDetailField({
	children,
	description,
	error,
	label,
	required,
}: {
	children: ReactNode;
	description?: string;
	error?: string;
	label: string;
	required?: boolean;
}) {
	const controlId =
		isValidElement<{ id?: unknown }>(children) &&
		typeof children.props.id === "string"
			? children.props.id
			: undefined;

	return (
		<div className="space-y-2">
			<Label htmlFor={controlId}>
				{label}
				{required ? <span className="text-destructive"> *</span> : null}
			</Label>
			{children}
			{error ? (
				<p className="text-destructive text-xs leading-5">{error}</p>
			) : description ? (
				<p className="text-muted-foreground text-xs leading-5">{description}</p>
			) : null}
		</div>
	);
}
