import { ChartLineData02Icon, DashboardSquare01Icon, Settings02Icon, Timer02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type * as React from "react";
import { LanguageSwitcher } from "#shared/components/LanguageSwitcher";

const APP_NAME = import.meta.env.VITE_APP_NAME ?? "Vyllion";

const CHECKPOINTS = [
	{ label: "Create workspace", value: "01", icon: DashboardSquare01Icon },
	{ label: "Concierge setup", value: "02", icon: Timer02Icon },
	{ label: "Enable modules", value: "03", icon: Settings02Icon },
	{ label: "Track launch", value: "04", icon: ChartLineData02Icon },
] as const;

export function AuthShell({
	eyebrow,
	title,
	description,
	children,
}: {
	readonly eyebrow: string;
	readonly title: string;
	readonly description: string;
	readonly children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-[#f7f8f3] text-foreground">
			<div className="grid min-h-screen lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
				<section className="hidden min-h-screen flex-col justify-between bg-[#11130f] p-10 text-white lg:flex">
					<div className="space-y-10">
						<div className="flex items-center gap-3">
							<div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
								<HugeiconsIcon icon={DashboardSquare01Icon} size={22} />
							</div>
							<div>
								<div className="text-lg font-semibold">{APP_NAME}</div>
								<div className="text-xs text-white/60">SaaS launch console</div>
							</div>
						</div>

						<div className="max-w-xl space-y-5">
							<p className="text-sm font-medium uppercase tracking-normal text-primary">Template command center</p>
							<h1 className="text-4xl font-semibold leading-tight tracking-normal">
								Ship tenant-aware products without rebuilding the operational layer.
							</h1>
							<p className="text-base leading-7 text-white/68">
								The base scaffold now centers onboarding, tables, reporting, billing, notifications, and admin
								operations before vertical starter packs add domain logic.
							</p>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							{CHECKPOINTS.map((checkpoint) => (
								<div key={checkpoint.label} className="rounded-lg border border-white/12 bg-white/[0.04] p-4">
									<div className="mb-5 flex items-center justify-between gap-3">
										<HugeiconsIcon icon={checkpoint.icon} size={20} className="text-primary" />
										<span className="font-mono text-xs text-white/45">{checkpoint.value}</span>
									</div>
									<div className="text-sm font-medium">{checkpoint.label}</div>
								</div>
							))}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-6 text-sm">
						<div>
							<div className="text-2xl font-semibold">3</div>
							<div className="text-white/55">Onboarding modes</div>
						</div>
						<div>
							<div className="text-2xl font-semibold">15</div>
							<div className="text-white/55">Pack-ready steps</div>
						</div>
						<div>
							<div className="text-2xl font-semibold">Cmd K</div>
							<div className="text-white/55">Global command</div>
						</div>
					</div>
				</section>

				<main className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
					<div className="absolute right-4 top-4 sm:right-8 sm:top-8">
						<LanguageSwitcher />
					</div>
					<div className="w-full max-w-md space-y-7">
						<div className="space-y-2">
							<p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{eyebrow}</p>
							<h1 className="text-3xl font-semibold tracking-normal">{title}</h1>
							<p className="text-sm leading-6 text-muted-foreground">{description}</p>
						</div>
						{children}
					</div>
				</main>
			</div>
		</div>
	);
}
