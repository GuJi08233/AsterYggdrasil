import { type FormEvent, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { NativeSelectField, TextField } from "@/components/panel/FormControls";
import { JsonPanel } from "@/components/panel/JsonPanel";
import { PageShell } from "@/components/panel/PageShell";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useAsyncTask } from "@/hooks/useAsyncTask";
import { usePageTitle } from "@/hooks/usePageTitle";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

type AuthMode = "login" | "register" | "setup";

type AuthFormState = {
	email: string;
	identifier: string;
	mode: AuthMode;
	password: string;
	username: string;
};

type AuthFormAction =
	| { type: "email"; value: string }
	| { type: "identifier"; value: string }
	| { type: "mode"; value: AuthMode }
	| { type: "password"; value: string }
	| { type: "username"; value: string };

const initialAuthFormState: AuthFormState = {
	email: "admin@example.com",
	identifier: "admin",
	mode: "login",
	password: "",
	username: "admin",
};

function authFormReducer(
	state: AuthFormState,
	action: AuthFormAction,
): AuthFormState {
	return { ...state, [action.type]: action.value };
}

export default function AuthPage() {
	const { t } = useTranslation();
	const [form, dispatch] = useReducer(authFormReducer, initialAuthFormState);

	usePageTitle(t("admin.authConsolePage.title"));

	const { email, identifier, mode, password, username } = form;
	const task = useAsyncTask<unknown>();
	const user = useAuthStore((state) => state.user);
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const setup = useAuthStore((state) => state.setup);
	const register = useAuthStore((state) => state.register);
	const login = useAuthStore((state) => state.login);
	const refresh = useAuthStore((state) => state.refresh);
	const logout = useAuthStore((state) => state.logout);
	const clear = useAuthStore((state) => state.clear);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		await task.run(async () => {
			if (mode === "setup") {
				await setup(username, email, password);
				return {
					action: "setup_first_admin",
					user: useAuthStore.getState().user,
				};
			}
			if (mode === "register") {
				await register(username, email, password);
				return { action: "register", user: useAuthStore.getState().user };
			}
			await login(identifier, password);
			return { action: "login", user: useAuthStore.getState().user };
		});
	}

	return (
		<PageShell
			title={t("admin.authConsolePage.title")}
			description={t("admin.authConsolePage.description")}
		>
			<div className="grid gap-4 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
				<Card>
					<CardHeader className="border-b border-border/60 pb-4">
						<CardTitle className="flex items-center gap-2">
							<Icon name="Key" className="size-4" />
							{t("admin.authConsolePage.sessionControl")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<form className="grid gap-3" onSubmit={submit}>
							<NativeSelectField
								label={t("admin.authConsolePage.mode")}
								value={mode}
								onChange={(value) =>
									dispatch({ type: "mode", value: value as AuthMode })
								}
								options={[
									{
										label: t("admin.authConsolePage.modeLogin"),
										value: "login",
									},
									{
										label: t("admin.authConsolePage.modeRegister"),
										value: "register",
									},
									{
										label: t("admin.authConsolePage.modeSetup"),
										value: "setup",
									},
								]}
							/>
							{mode === "login" ? (
								<TextField
									label={t("login.identifier")}
									value={identifier}
									onChange={(value) => dispatch({ type: "identifier", value })}
									required
								/>
							) : (
								<>
									<TextField
										label={t("login.username")}
										value={username}
										onChange={(value) => dispatch({ type: "username", value })}
										required
									/>
									<TextField
										label={t("login.email")}
										type="email"
										value={email}
										onChange={(value) => dispatch({ type: "email", value })}
										required
									/>
								</>
							)}
							<TextField
								label={t("login.password")}
								type="password"
								value={password}
								onChange={(value) => dispatch({ type: "password", value })}
								required
							/>
							<div className="flex flex-wrap gap-2">
								<Button type="submit" disabled={task.loading}>
									<Icon
										name={task.loading ? "Spinner" : "SignIn"}
										className={task.loading ? "size-4 animate-spin" : "size-4"}
									/>
									{t("admin.authConsolePage.submit")}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => void task.run(() => authService.check())}
								>
									<Icon name="Eye" className="size-4" />
									{t("admin.authConsolePage.check")}
								</Button>
								<Button
									type="button"
									variant="outline"
									disabled={!isAuthenticated}
									onClick={() =>
										void task.run(async () => {
											await refresh();
											return {
												action: "refresh_token",
												user: useAuthStore.getState().user,
											};
										})
									}
								>
									<Icon name="ArrowsClockwise" className="size-4" />
									{t("common.refresh")}
								</Button>
								<Button
									type="button"
									variant="outline"
									disabled={!isAuthenticated}
									onClick={() =>
										void task.run(async () => {
											await logout();
											return { action: "logout" };
										})
									}
								>
									<Icon name="SignOut" className="size-4" />
									{t("nav.logout")}
								</Button>
								<Button type="button" variant="ghost" onClick={clear}>
									<Icon name="X" className="size-4" />
									{t("admin.authConsolePage.clearLocal")}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>

				<div className="grid gap-4">
					<JsonPanel
						title={t("admin.authConsolePage.resultTitle")}
						value={task.result}
						error={task.error}
						loading={task.loading}
					/>
					<Card size="sm">
						<CardHeader>
							<CardTitle>{t("admin.authConsolePage.currentSession")}</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-2 text-sm">
							<div>
								{t("admin.authConsolePage.user")}: {user?.username ?? "-"}
							</div>
							<div>
								{t("dashboard.role")}: {user?.role ?? "-"}
							</div>
							<div>
								{t("admin.authConsolePage.authenticated")}:{" "}
								{isAuthenticated
									? t("admin.common.enabled")
									: t("common.missing")}
							</div>
							<div>{t("admin.authConsolePage.credentialStorage")}</div>
						</CardContent>
					</Card>
				</div>
			</div>

			<Card>
				<CardHeader className="border-b border-border/60 pb-4">
					<CardTitle className="flex items-center gap-2">
						<Icon name="Wrench" className="size-4" />
						{t("admin.authConsolePage.utilitiesTitle")}
					</CardTitle>
					<CardDescription>
						{t("admin.authConsolePage.utilitiesDescription")}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => void task.run(() => authService.me({ force: true }))}
					>
						<Icon name="User" className="size-4" />
						{t("admin.authConsolePage.loadMe")}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							void task.run(() => authService.sessions({ force: true }))
						}
					>
						<Icon name="Key" className="size-4" />
						{t("admin.authConsolePage.loadSessions")}
					</Button>
				</CardContent>
			</Card>
		</PageShell>
	);
}
