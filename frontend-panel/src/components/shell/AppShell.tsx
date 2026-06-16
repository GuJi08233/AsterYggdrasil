import { AppLayout } from "@/components/layout/AppLayout";
import type { ShellScope } from "@/components/shell/shellNavigation";

export function AppShell({ scope }: { scope: ShellScope }) {
	return <AppLayout scope={scope} />;
}
