import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { CreateAdminUserRequest, UserRole, UserStatus } from "@/types/api";
import { RoleBadge, StatusBadge } from "./UsersTable";

type UserForm = {
	email: string;
	password: string;
	role: UserRole;
	status: UserStatus;
	username: string;
};

const emptyForm: UserForm = {
	email: "",
	password: "",
	role: "user",
	status: "active",
	username: "",
};

export function UserDialog({
	onOpenChange,
	onSubmit,
	open,
	submitting,
}: {
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: CreateAdminUserRequest) => void;
	open: boolean;
	submitting: boolean;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{open ? (
				<UserDialogForm
					onOpenChange={onOpenChange}
					onSubmit={onSubmit}
					submitting={submitting}
				/>
			) : null}
		</Dialog>
	);
}

function UserDialogForm({
	onOpenChange,
	onSubmit,
	submitting,
}: {
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: CreateAdminUserRequest) => void;
	submitting: boolean;
}) {
	const { t } = useTranslation();
	const [form, setForm] = useState<UserForm>(emptyForm);
	const roleOptions = [
		{ label: t("admin.users.role.user"), value: "user" },
		{ label: t("admin.users.role.admin"), value: "admin" },
	];
	const statusOptions = [
		{ label: t("admin.users.status.active"), value: "active" },
		{ label: t("admin.users.status.disabled"), value: "disabled" },
	];

	function submit() {
		onSubmit({
			email: form.email.trim(),
			password: form.password,
			role: form.role,
			status: form.status,
			username: form.username.trim(),
		});
	}

	return (
		<DialogContent className="sm:max-w-2xl">
			<DialogHeader>
				<DialogTitle>{t("admin.users.create")}</DialogTitle>
				<DialogDescription>
					{t("admin.users.createDescription")}
				</DialogDescription>
			</DialogHeader>
			<form
				className="grid gap-4 md:grid-cols-2"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<Field label={t("admin.users.username")} required>
					<Input
						value={form.username}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								username: event.target.value,
							}))
						}
					/>
				</Field>
				<Field label={t("admin.users.email")} required>
					<Input
						type="email"
						value={form.email}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								email: event.target.value,
							}))
						}
					/>
				</Field>
				<Field
					label={t("admin.users.password")}
					required
					description={t("admin.users.passwordCreateHint")}
				>
					<Input
						type="password"
						value={form.password}
						onChange={(event) =>
							setForm((current) => ({
								...current,
								password: event.target.value,
							}))
						}
					/>
				</Field>
				<Field label={t("admin.users.roleLabel")}>
					<Select
						items={roleOptions}
						value={form.role}
						onValueChange={(value) =>
							setForm((current) => ({
								...current,
								role: value as UserRole,
							}))
						}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="user">
								<span className="flex items-center gap-2">
									<RoleBadge userRole="user" />
								</span>
							</SelectItem>
							<SelectItem value="admin">
								<span className="flex items-center gap-2">
									<RoleBadge userRole="admin" />
								</span>
							</SelectItem>
						</SelectContent>
					</Select>
				</Field>
				<Field label={t("admin.users.statusLabel")}>
					<Select
						items={statusOptions}
						value={form.status}
						onValueChange={(value) =>
							setForm((current) => ({
								...current,
								status: value as UserStatus,
							}))
						}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="active">
								<span className="flex items-center gap-2">
									<StatusBadge status="active" />
								</span>
							</SelectItem>
							<SelectItem value="disabled">
								<span className="flex items-center gap-2">
									<StatusBadge status="disabled" />
								</span>
							</SelectItem>
						</SelectContent>
					</Select>
				</Field>
				<div className="hidden md:block" />
				<DialogFooter className="md:col-span-2">
					<Button
						type="button"
						variant="outline"
						disabled={submitting}
						onClick={() => onOpenChange(false)}
					>
						{t("common.cancel")}
					</Button>
					<Button
						type="submit"
						disabled={
							submitting ||
							!form.username.trim() ||
							!form.email.trim() ||
							form.password.trim().length < 8
						}
					>
						{submitting ? (
							<Icon name="Spinner" className="mr-2 size-4 animate-spin" />
						) : (
							<Icon name="FloppyDisk" className="mr-2 size-4" />
						)}
						{t("common.create")}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

function Field({
	children,
	description,
	label,
	required,
}: {
	children: React.ReactNode;
	description?: string;
	label: string;
	required?: boolean;
}) {
	return (
		<div className="space-y-2">
			<Label>
				{label}
				{required ? <span className="text-destructive"> *</span> : null}
			</Label>
			{children}
			{description ? (
				<p className="text-xs leading-5 text-muted-foreground">{description}</p>
			) : null}
		</div>
	);
}
