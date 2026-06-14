import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";

type CopyFieldProps = {
	label: string;
	value: string;
	compact?: boolean;
};

export function CopyField({ label, value, compact = false }: CopyFieldProps) {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);

	async function copy() {
		await navigator.clipboard.writeText(value);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1200);
	}

	return (
		<div className="grid gap-1.5">
			<span className="text-xs font-medium text-muted-foreground">{label}</span>
			<span className="flex min-w-0 gap-2">
				<Input
					readOnly
					value={value}
					className={compact ? "h-8 font-mono text-xs" : "font-mono text-xs"}
				/>
				<Button
					type="button"
					variant="outline"
					size="icon"
					aria-label={t("common.copy", { label })}
					onClick={() => void copy()}
				>
					<Icon name={copied ? "Check" : "Copy"} className="size-4" />
				</Button>
			</span>
		</div>
	);
}
