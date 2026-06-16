import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { PageShell } from "@/components/common/PageShell";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { usePageTitle } from "@/hooks/usePageTitle";

function readRouteError(error: unknown) {
	if (isRouteErrorResponse(error)) {
		return `${error.status} ${error.statusText}`;
	}
	if (error instanceof Error) return error.message;
	return "Route failed";
}

export default function ErrorPage() {
	const error = useRouteError();

	usePageTitle("Route error");

	return (
		<div className="app-shell min-h-dvh text-foreground">
			<div className="app-route-transition">
				<PageShell
					title="Route error"
					description="The current view failed before it could render."
					actions={
						<Button
							type="button"
							variant="outline"
							onClick={() => history.back()}
						>
							<Icon name="ArrowLeft" className="size-4" />
							Back
						</Button>
					}
				>
					<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
						{readRouteError(error)}
					</div>
				</PageShell>
			</div>
		</div>
	);
}
