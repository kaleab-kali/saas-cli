import type * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeader({
	eyebrow,
	title,
	description,
	actions,
}: {
	readonly eyebrow?: string;
	readonly title: string;
	readonly description?: string;
	readonly actions?: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
			<div className="min-w-0 space-y-1">
				{eyebrow && <p className="text-xs font-medium uppercase text-muted-foreground">{eyebrow}</p>}
				<h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
				{description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
			</div>
			{actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
		</div>
	);
}

export function MetricCard({
	label,
	value,
	helper,
	className,
}: {
	readonly label: string;
	readonly value: React.ReactNode;
	readonly helper?: string;
	readonly className?: string;
}) {
	return (
		<Card className={cn("min-w-0", className)}>
			<CardHeader className="pb-2">
				<CardTitle className="text-xs font-medium uppercase text-muted-foreground">{label}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-1">
				<div className="text-2xl font-semibold">{value}</div>
				{helper && <p className="text-xs text-muted-foreground">{helper}</p>}
			</CardContent>
		</Card>
	);
}

export function EmptyState({
	title,
	description,
	action,
}: {
	readonly title: string;
	readonly description?: string;
	readonly action?: React.ReactNode;
}) {
	return (
		<div className="flex min-h-44 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
			<div className="space-y-1">
				<h2 className="text-base font-medium">{title}</h2>
				{description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
			</div>
			{action}
		</div>
	);
}

export function LoadingState({ rows = 4 }: { readonly rows?: number }) {
	return (
		<div className="space-y-3">
			{Array.from({ length: rows }).map((_, index) => (
				<Skeleton key={index} className="h-12 w-full" />
			))}
		</div>
	);
}
