import { Badge } from "@/components/ui/badge";

export function AccessBadge({
	access,
}: {
	access: "public" | "auth" | "admin";
}) {
	const variant =
		access === "admin"
			? "destructive"
			: access === "auth"
				? "secondary"
				: "outline";
	return <Badge variant={variant}>{access}</Badge>;
}
