import React from "react";
import { useTranslation } from "react-i18next";
import { useTenantBillingSnapshot } from "#features/billing/api/entitlements.hooks";
import { Button } from "@/components/ui/button";

const Banner = React.memo(
	({ kind, message }: { readonly kind: "warning" | "danger"; readonly message: string }) => {
		const bg =
			kind === "danger"
				? "bg-destructive/10 border-destructive/30 text-destructive"
				: "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-300";
		return (
			<div className={`border-b px-4 py-2 text-sm ${bg}`}>
				<div className="flex items-center justify-between gap-3 flex-wrap">
					<span>{message}</span>
					<a href="/billing" className="underline font-medium">
						Pay now
					</a>
				</div>
			</div>
		);
	},
	(prev, next) => prev.kind === next.kind && prev.message === next.message,
);
Banner.displayName = "SubscriptionBanner";

const LockedOverlay = React.memo(
	({
		title,
		message,
		showLogout,
	}: {
		readonly title: string;
		readonly message: string;
		readonly showLogout: boolean;
	}) => {
		const { t } = useTranslation();
		const handleLogout = React.useCallback(() => {
			fetch("/api/v1/auth/sign-out", { method: "POST", credentials: "include" }).finally(() => {
				window.location.href = "/login";
			});
		}, []);
		return (
			<div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
				<div className="max-w-md w-full space-y-4 text-center">
					<div className="text-4xl">🔒</div>
					<h1 className="text-2xl font-bold text-destructive">{title}</h1>
					<p className="text-muted-foreground whitespace-pre-wrap">{message}</p>
					<div className="flex gap-2 justify-center">
						<a href="/billing">
							<Button>{t("billing.payNow", { defaultValue: "Pay now" })}</Button>
						</a>
						{showLogout && (
							<Button variant="outline" onClick={handleLogout}>
								{t("common.logout")}
							</Button>
						)}
					</div>
				</div>
			</div>
		);
	},
	(prev, next) => prev.title === next.title && prev.message === next.message && prev.showLogout === next.showLogout,
);
LockedOverlay.displayName = "LockedOverlay";

export const SubscriptionGate = React.memo(
	({ children }: { readonly children: React.ReactNode }) => {
		const { t } = useTranslation();
		const { data } = useTenantBillingSnapshot();
		const lifecycle = data?.lifecycle;

		if (!lifecycle) return <>{children}</>;

		const status = lifecycle.status;

		if (status === "suspended") {
			return (
				<LockedOverlay
					title={t("billing.suspendedTitle", { defaultValue: "Organization suspended" })}
					message={t("billing.suspendedMsg", {
						defaultValue: "Your organization has been suspended by the platform administrator. Please contact support.",
					})}
					showLogout
				/>
			);
		}
		if (status === "locked") {
			return (
				<LockedOverlay
					title={t("billing.lockedTitle", { defaultValue: "Account locked" })}
					message={t("billing.lockedMsg", {
						defaultValue: "Your subscription was not paid on time. Settle the outstanding invoice to restore access.",
					})}
					showLogout
				/>
			);
		}
		if (status === "canceled") {
			return (
				<LockedOverlay
					title={t("billing.canceledTitle", { defaultValue: "Subscription canceled" })}
					message={t("billing.canceledMsg", {
						defaultValue: "Your subscription is canceled. Start a new plan to continue using PropFlow.",
					})}
					showLogout
				/>
			);
		}

		const banner = (() => {
			if (status === "read_only") {
				const days = lifecycle.daysUntilLocked ?? 0;
				return (
					<Banner
						kind="danger"
						message={t("billing.readOnlyBanner", {
							defaultValue: "Your account is read-only. Account locks in {{days}} days. Pay outstanding invoice now.",
							days,
						})}
					/>
				);
			}
			if (status === "past_due" || status === "grace") {
				const days = lifecycle.daysUntilReadOnly ?? 0;
				return (
					<Banner
						kind="warning"
						message={t("billing.pastDueBanner", {
							defaultValue: "Payment overdue. Write access will be revoked in {{days}} days.",
							days,
						})}
					/>
				);
			}
			return null;
		})();

		return (
			<>
				{banner}
				{children}
			</>
		);
	},
	(prev, next) => prev.children === next.children,
);
SubscriptionGate.displayName = "SubscriptionGate";
