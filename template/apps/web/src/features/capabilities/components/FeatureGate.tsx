import type { ReactNode } from "react";
import { type Capability, type FeatureKey, useCapability } from "../api/capabilities.hooks";

interface FeatureGateProps {
	readonly featureKey: FeatureKey;
	readonly requireCapacity?: boolean;
	readonly fallback?: ReactNode;
	readonly children: ReactNode | ((capability: Capability) => ReactNode);
}

export function FeatureGate({ featureKey, requireCapacity = false, fallback = null, children }: FeatureGateProps) {
	const { capability, enabled, hasCapacity, isLoading } = useCapability(featureKey);
	if (isLoading) return null;
	if (!capability || !enabled || (requireCapacity && !hasCapacity)) return <>{fallback}</>;
	return <>{typeof children === "function" ? children(capability) : children}</>;
}
