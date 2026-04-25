export interface UsageSnapshotProps {
	id: string;
	subscriptionId: string;
	organizationId: string;
	snapshotDate: Date;
	buildingCount: number;
	unitCount: number;
	userCount: number;
	apiCallCount: number;
	smsCount: number;
	emailCount: number;
	createdAt: Date;
}

export class UsageSnapshot {
	private constructor(private props: UsageSnapshotProps) {}

	static create(props: UsageSnapshotProps) {
		return new UsageSnapshot(props);
	}
	static rehydrate(props: UsageSnapshotProps) {
		return new UsageSnapshot(props);
	}

	toPrimitives() {
		return { ...this.props };
	}
}
