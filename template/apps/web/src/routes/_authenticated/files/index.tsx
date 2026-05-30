import { createFileRoute } from "@tanstack/react-router";
import { FeatureGate } from "#features/capabilities/components/FeatureGate";
import { FileUploadPanel } from "#features/files/components/FileUploadPanel";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/files/")({
	component: FilesPage,
});

function FilesPage() {
	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold">Files</h1>
				<p className="text-sm text-muted-foreground">Local uploads by default, object storage when configured.</p>
			</div>
			<FeatureGate
				featureKey="platform.file-upload"
				fallback={
					<Card>
						<CardContent className="p-4 text-sm text-muted-foreground">
							File uploads are not enabled for the current plan.
						</CardContent>
					</Card>
				}
			>
				<FileUploadPanel />
			</FeatureGate>
		</div>
	);
}
