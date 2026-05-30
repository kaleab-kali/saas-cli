import React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteFile, useFiles, useUploadFile } from "../api/files.hooks";

const formatSize = (bytes: number) => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const FileUploadPanel = React.memo(() => {
	const [folder, setFolder] = React.useState("general");
	const [file, setFile] = React.useState<File | null>(null);
	const { data = [], isLoading } = useFiles(folder);
	const upload = useUploadFile();
	const del = useDeleteFile();

	const submit = React.useCallback(async () => {
		if (!file) {
			toast.error("Choose a file first");
			return;
		}
		await upload.mutateAsync({ file, folder });
		setFile(null);
		toast.success("File uploaded");
	}, [file, folder, upload]);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Upload file</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
					<div>
						<Label htmlFor="folder">Folder</Label>
						<Input id="folder" value={folder} onChange={(e) => setFolder(e.target.value || "general")} />
					</div>
					<div>
						<Label htmlFor="file">File</Label>
						<Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
					</div>
					<Button onClick={submit} disabled={upload.isPending}>
						{upload.isPending ? "Uploading..." : "Upload"}
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Files</CardTitle>
				</CardHeader>
				<CardContent className="p-0 overflow-x-auto">
					{isLoading ? (
						<div className="p-4">
							<Skeleton className="h-28 w-full" />
						</div>
					) : data.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">No files in this folder.</p>
					) : (
						<table className="w-full text-sm">
							<thead className="bg-muted/50 text-muted-foreground">
								<tr>
									<th className="p-2 text-left">Name</th>
									<th className="p-2 text-left">Type</th>
									<th className="p-2 text-right">Size</th>
									<th className="p-2 text-left">Storage</th>
									<th className="p-2 text-left">Uploaded</th>
									<th className="p-2 text-right">Actions</th>
								</tr>
							</thead>
							<tbody>
								{data.map((item) => (
									<tr key={item.id} className="border-t">
										<td className="p-2 font-medium">{item.filename}</td>
										<td className="p-2 text-xs">{item.mimeType}</td>
										<td className="p-2 text-right font-mono">{formatSize(item.size)}</td>
										<td className="p-2 text-xs">{item.storageDriver}</td>
										<td className="p-2 text-xs">{new Date(item.createdAt).toLocaleString()}</td>
										<td className="p-2 text-right space-x-1">
											<Button size="sm" variant="outline" asChild>
												<a href={item.url} target="_blank" rel="noreferrer">
													Open
												</a>
											</Button>
											<Button size="sm" variant="ghost" onClick={() => del.mutate(item.id)} disabled={del.isPending}>
												Delete
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>
		</div>
	);
});
FileUploadPanel.displayName = "FileUploadPanel";
