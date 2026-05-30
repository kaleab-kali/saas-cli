export interface UsageSnapshotProps {
	id: string;
	subscriptionId: string;
	organizationId: string;
	snapshotDate: Date;
	userCount: number;
	apiCallCount: number;
	emailCount: number;
	metricsJson: Record<string, number> | null;
	createdAt: Date;
}

export class UsageSnapshot {
	private constructor(private props: UsageSnapshotProps) {}

	static create(props: UsageSnapshotProps) {
		return new UsageSnapshot(props);
	}
	static rehydrate(props: {
		id: string;
		subscriptionId: string;
		organizationId: string;
		snapshotDate: Date;
		userCount: number;
		apiCallCount: number;
		emailCount: number;
		metricsJson: unknown;
		createdAt: Date;
	}) {
		return new UsageSnapshot({
			...props,
			metricsJson: (props.metricsJson as Record<string, number> | null) ?? null,
		});
	}

	toPrimitives() {
		return { ...this.props };
	}
}
