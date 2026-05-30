import {
	type ColumnDef,
	type ColumnFiltersState,
	type FilterFn,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type Header,
	type PaginationState,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type FilterOption = { readonly value: string; readonly label: string };

type FilterConfig =
	| { readonly type: "text" }
	| { readonly type: "select"; readonly options: readonly FilterOption[] }
	| { readonly type: "boolean" }
	| { readonly type: "number-range" }
	| { readonly type: "date-range" };

type FilterValue = {
	readonly type: FilterConfig["type"];
	readonly value?: string;
	readonly min?: string;
	readonly max?: string;
};

declare module "@tanstack/react-table" {
	interface ColumnMeta<TData, TValue> {
		readonly filter?: FilterConfig;
		readonly className?: string;
		readonly headerClassName?: string;
	}
}

interface DataTableProps<TData, TValue> {
	readonly columns: ColumnDef<TData, TValue>[];
	readonly data: readonly TData[];
	readonly isLoading?: boolean;
	readonly error?: unknown;
	readonly onRetry?: () => void;
	readonly searchPlaceholder?: string;
	readonly searchKey?: keyof TData & string;
	readonly emptyTitle?: string;
	readonly emptyMessage?: string;
	readonly emptyAction?: React.ReactNode;
	readonly pageSize?: number;
	readonly totalCount?: number;
	readonly enableSearch?: boolean;
	readonly enablePagination?: boolean;
	readonly enableColumnFilters?: boolean;
	readonly enableColumnVisibility?: boolean;
	readonly toolbarActions?: React.ReactNode;
	readonly getRowId?: (row: TData, index: number) => string;
	readonly onRowClick?: (row: TData) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const ALL_VALUE = "__all";

function useDebouncedValue(value: string, delayMs: number) {
	const [debounced, setDebounced] = React.useState(value);
	React.useEffect(() => {
		const timeout = window.setTimeout(() => setDebounced(value), delayMs);
		return () => window.clearTimeout(timeout);
	}, [delayMs, value]);
	return debounced;
}

const normalize = (value: unknown) => String(value ?? "").toLowerCase();

const hasFilterValue = (value: unknown) => {
	if (!value || typeof value !== "object") return Boolean(value);
	const filter = value as FilterValue;
	return Boolean(filter.value || filter.min || filter.max);
};

const matchesFilter = (cellValue: unknown, filter: unknown) => {
	if (!hasFilterValue(filter)) return true;
	const config = filter as FilterValue;
	const raw = normalize(cellValue);

	if (config.type === "number-range") {
		const numeric = Number(cellValue);
		if (Number.isNaN(numeric)) return false;
		const min = config.min ? Number(config.min) : null;
		const max = config.max ? Number(config.max) : null;
		if (min !== null && numeric < min) return false;
		if (max !== null && numeric > max) return false;
		return true;
	}

	if (config.type === "date-range") {
		const time = new Date(String(cellValue)).getTime();
		if (Number.isNaN(time)) return false;
		const min = config.min ? new Date(config.min).getTime() : null;
		const max = config.max ? new Date(config.max).getTime() : null;
		if (min !== null && time < min) return false;
		if (max !== null && time > max) return false;
		return true;
	}

	if (config.type === "select" || config.type === "boolean") {
		return raw === normalize(config.value);
	}

	return raw.includes(normalize(config.value));
};

function DataTableColumnFilter<TData, TValue>({ header }: { readonly header: Header<TData, TValue> }) {
	const config = header.column.columnDef.meta?.filter;
	const value = header.column.getFilterValue() as FilterValue | undefined;

	if (!config || !header.column.getCanFilter()) return <div className="h-9" />;

	if (config.type === "select") {
		return (
			<Select
				value={value?.value ?? ALL_VALUE}
				onValueChange={(next) =>
					header.column.setFilterValue(next === ALL_VALUE ? undefined : { type: config.type, value: next })
				}
			>
				<SelectTrigger className="h-8 min-w-32">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_VALUE}>All</SelectItem>
					{config.options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	if (config.type === "boolean") {
		return (
			<Select
				value={value?.value ?? ALL_VALUE}
				onValueChange={(next) =>
					header.column.setFilterValue(next === ALL_VALUE ? undefined : { type: config.type, value: next })
				}
			>
				<SelectTrigger className="h-8 min-w-28">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_VALUE}>All</SelectItem>
					<SelectItem value="true">Yes</SelectItem>
					<SelectItem value="false">No</SelectItem>
				</SelectContent>
			</Select>
		);
	}

	if (config.type === "number-range" || config.type === "date-range") {
		const inputType = config.type === "number-range" ? "number" : "date";
		return (
			<div className="flex min-w-44 gap-1">
				<Input
					type={inputType}
					className="h-8"
					placeholder="Min"
					value={value?.min ?? ""}
					onChange={(event) =>
						header.column.setFilterValue({
							type: config.type,
							min: event.target.value,
							max: value?.max,
						})
					}
				/>
				<Input
					type={inputType}
					className="h-8"
					placeholder="Max"
					value={value?.max ?? ""}
					onChange={(event) =>
						header.column.setFilterValue({
							type: config.type,
							min: value?.min,
							max: event.target.value,
						})
					}
				/>
			</div>
		);
	}

	return (
		<Input
			className="h-8 min-w-32"
			placeholder="Filter..."
			value={value?.value ?? ""}
			onChange={(event) =>
				header.column.setFilterValue(event.target.value ? { type: config.type, value: event.target.value } : undefined)
			}
		/>
	);
}

export function DataTable<TData, TValue>({
	columns,
	data,
	isLoading = false,
	error,
	onRetry,
	searchPlaceholder,
	searchKey,
	emptyTitle = "No results",
	emptyMessage,
	emptyAction,
	pageSize = 20,
	totalCount,
	enableSearch = true,
	enablePagination = true,
	enableColumnFilters = true,
	enableColumnVisibility = true,
	toolbarActions,
	getRowId,
	onRowClick,
}: DataTableProps<TData, TValue>) {
	const { t } = useTranslation();
	const resolvedSearchPlaceholder = searchPlaceholder ?? t("common.searchDots");
	const resolvedEmptyMessage = emptyMessage ?? t("common.noResults");
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [globalFilterInput, setGlobalFilterInput] = React.useState("");
	const [globalFilter, setGlobalFilter] = React.useState("");
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: pageSize,
	});
	const debouncedGlobalFilter = useDebouncedValue(globalFilterInput, 300);
	const dataTableFilter = React.useCallback<FilterFn<TData>>(
		(row, columnId, filterValue) => matchesFilter(row.getValue(columnId), filterValue),
		[],
	);

	React.useEffect(() => {
		setGlobalFilter(debouncedGlobalFilter);
	}, [debouncedGlobalFilter]);

	const mutableData = React.useMemo(() => [...data], [data]);

	const table = useReactTable({
		data: mutableData,
		columns,
		getRowId,
		state: {
			sorting,
			globalFilter,
			columnFilters,
			columnVisibility,
			pagination,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onPaginationChange: setPagination,
		defaultColumn: {
			filterFn: dataTableFilter,
		},
		globalFilterFn: searchKey
			? (row, _columnId, filterValue) => normalize(row.original[searchKey]).includes(normalize(filterValue))
			: (row, columnId, filterValue) => normalize(row.getValue(columnId)).includes(normalize(filterValue)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
		autoResetPageIndex: false,
	});

	const handlePageSizeChange = React.useCallback((value: string) => {
		const size = Number(value);
		setPagination({ pageIndex: 0, pageSize: size });
	}, []);

	const resetFilters = React.useCallback(() => {
		setGlobalFilterInput("");
		setGlobalFilter("");
		setColumnFilters([]);
		table.resetColumnFilters();
	}, [table]);

	const hasFilters = Boolean(
		globalFilterInput || globalFilter || columnFilters.some((filter) => hasFilterValue(filter.value)),
	);
	const visibleColumns = table.getVisibleLeafColumns();
	const pageIndex = pagination.pageIndex;
	const currentPageSize = pagination.pageSize;
	const pageCount = table.getPageCount();
	const filteredRows = table.getFilteredRowModel().rows.length;
	const totalRows = totalCount ?? filteredRows;
	const firstRow = filteredRows === 0 ? 0 : pageIndex * currentPageSize + 1;
	const lastRow = Math.min((pageIndex + 1) * currentPageSize, totalRows);
	const showFilterRow =
		enableColumnFilters &&
		table.getHeaderGroups().some((group) => group.headers.some((header) => header.column.columnDef.meta?.filter));

	return (
		<div className="space-y-4">
			{(enableSearch || toolbarActions || enableColumnVisibility || hasFilters) && (
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
						{enableSearch && (
							<Input
								placeholder={resolvedSearchPlaceholder}
								value={globalFilterInput}
								onChange={(event) => setGlobalFilterInput(event.target.value)}
								className="w-full max-w-sm"
							/>
						)}
						{hasFilters && (
							<Button variant="ghost" size="sm" onClick={resetFilters}>
								Reset filters
							</Button>
						)}
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{toolbarActions}
						{enableColumnVisibility && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										Columns
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{table
										.getAllLeafColumns()
										.filter((column) => column.getCanHide())
										.map((column) => (
											<DropdownMenuCheckboxItem
												key={column.id}
												checked={column.getIsVisible()}
												onCheckedChange={(value) => column.toggleVisibility(!!value)}
											>
												{column.id}
											</DropdownMenuCheckboxItem>
										))}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				</div>
			)}

			<div className="overflow-x-auto rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<React.Fragment key={headerGroup.id}>
								<TableRow>
									{headerGroup.headers.map((header) => (
										<TableHead
											key={header.id}
											className={header.column.columnDef.meta?.headerClassName}
											onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
										>
											{header.isPlaceholder ? null : (
												<div
													className={
														header.column.getCanSort()
															? "flex cursor-pointer select-none items-center gap-1 hover:text-foreground"
															: "flex items-center gap-1"
													}
												>
													{flexRender(header.column.columnDef.header, header.getContext())}
													{header.column.getCanSort() && (
														<span className="text-xs text-muted-foreground">
															{header.column.getIsSorted() === "asc"
																? "\u2191"
																: header.column.getIsSorted() === "desc"
																	? "\u2193"
																	: "\u2195"}
														</span>
													)}
												</div>
											)}
										</TableHead>
									))}
								</TableRow>
								{showFilterRow && (
									<TableRow>
										{headerGroup.headers.map((header) => (
											<TableHead key={`${header.id}-filter`} className="bg-muted/30 py-2 align-top">
												{header.isPlaceholder ? null : <DataTableColumnFilter header={header} />}
											</TableHead>
										))}
									</TableRow>
								)}
							</React.Fragment>
						))}
					</TableHeader>
					<TableBody>
						{error ? (
							<TableRow>
								<TableCell colSpan={visibleColumns.length} className="h-32 text-center">
									<div className="flex flex-col items-center gap-3">
										<div>
											<div className="font-medium">Could not load rows</div>
											<div className="text-sm text-muted-foreground">
												{error instanceof Error ? error.message : "The table request failed."}
											</div>
										</div>
										{onRetry && (
											<Button variant="outline" size="sm" onClick={onRetry}>
												Retry
											</Button>
										)}
									</div>
								</TableCell>
							</TableRow>
						) : isLoading ? (
							Array.from({ length: Math.min(currentPageSize, 8) }).map((_, i) => (
								<TableRow key={`loading-${i}`}>
									{visibleColumns.map((column) => (
										<TableCell key={`loading-${i}-${column.id}`}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : table.getRowModel().rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={visibleColumns.length} className="h-40 text-center">
									<div className="flex flex-col items-center gap-3">
										<div>
											<div className="font-medium">{emptyTitle}</div>
											<div className="text-sm text-muted-foreground">{resolvedEmptyMessage}</div>
										</div>
										{emptyAction}
									</div>
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									className={onRowClick ? "cursor-pointer" : undefined}
									onClick={onRowClick ? () => onRowClick(row.original) : undefined}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{enablePagination && totalRows > 0 && (
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="text-sm text-muted-foreground">
						{t("common.showingRange", { from: firstRow, to: lastRow, total: totalRows })}
					</div>
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">{t("common.rowsPerPage")}</span>
							<Select value={String(currentPageSize)} onValueChange={handlePageSizeChange}>
								<SelectTrigger className="h-8 w-20">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PAGE_SIZE_OPTIONS.map((n) => (
										<SelectItem key={n} value={String(n)}>
											{n}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-1">
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.setPageIndex(0)}
								disabled={!table.getCanPreviousPage()}
								title={t("common.firstPage")}
							>
								{"<<"}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
								title={t("common.previousPage")}
							>
								{"<"}
							</Button>
							<span className="mx-2 whitespace-nowrap text-sm">
								{t("common.pageOfN", { current: pageIndex + 1, total: Math.max(1, pageCount) })}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
								title={t("common.nextPage")}
							>
								{">"}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.setPageIndex(pageCount - 1)}
								disabled={!table.getCanNextPage()}
								title={t("common.lastPage")}
							>
								{">>"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
