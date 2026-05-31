import { useNavigate, useSearch } from "@tanstack/react-router";
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
	type OnChangeFn,
	type PaginationState,
	type SortingState,
	type Table as TanStackTable,
	type Updater,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
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
	readonly enableCsvExport?: boolean;
	readonly exportFilename?: string;
	readonly virtualizeRows?: boolean;
	readonly estimateRowHeight?: number;
	readonly toolbarActions?: React.ReactNode;
	readonly getRowId?: (row: TData, index: number) => string;
	readonly onRowClick?: (row: TData) => void;
	readonly state?: {
		readonly sorting?: SortingState;
		readonly pagination?: PaginationState;
		readonly columnFilters?: ColumnFiltersState;
		readonly globalFilterInput?: string;
	};
	readonly onSortingChange?: OnChangeFn<SortingState>;
	readonly onPaginationChange?: OnChangeFn<PaginationState>;
	readonly onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
	readonly onGlobalFilterInputChange?: (value: string) => void;
	readonly manualPagination?: boolean;
	readonly manualSorting?: boolean;
	readonly manualFiltering?: boolean;
	readonly pageCount?: number;
}

interface DataTableQueryParams {
	readonly page: number;
	readonly limit: number;
	readonly search?: string;
	readonly sort?: string;
	readonly [key: `filter.${string}`]: string | undefined;
}

interface UseDataTableStateOptions {
	readonly defaultPageSize?: number;
	readonly defaultSort?: SortingState;
	readonly pageKey?: string;
	readonly limitKey?: string;
	readonly searchKey?: string;
	readonly sortKey?: string;
	readonly filterPrefix?: string;
}

function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
	return typeof updater === "function" ? (updater as (old: T) => T)(previous) : updater;
}

const readString = (value: unknown) => (typeof value === "string" ? value : undefined);

const readPositiveInt = (value: unknown, fallback: number) => {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const sortParamFromSorting = (sorting: SortingState) => {
	const first = sorting[0];
	if (!first) return undefined;
	return `${first.id}:${first.desc ? "desc" : "asc"}`;
};

const sortingFromSortParam = (value: unknown, fallback: SortingState) => {
	const raw = readString(value);
	if (!raw) return fallback;
	const [id, direction] = raw.split(":");
	if (!id) return fallback;
	return [{ id, desc: direction === "desc" }];
};

const serializeFilterValue = (value: unknown) => {
	if (!hasFilterValue(value)) return undefined;
	const filter = value as FilterValue;
	if (filter.min || filter.max) return `${filter.min ?? ""}..${filter.max ?? ""}`;
	return filter.value;
};

export function useDataTableState({
	defaultPageSize = 20,
	defaultSort = [],
	pageKey = "page",
	limitKey = "limit",
	searchKey = "search",
	sortKey = "sort",
	filterPrefix = "filter.",
}: UseDataTableStateOptions = {}) {
	const search = useSearch({ strict: false }) as Record<string, unknown>;
	const navigate = useNavigate();
	const page = readPositiveInt(search[pageKey], 1);
	const pageSize = readPositiveInt(search[limitKey], defaultPageSize);
	const searchText = readString(search[searchKey]) ?? "";
	const sorting = sortingFromSortParam(search[sortKey], defaultSort);
	const pagination = React.useMemo<PaginationState>(() => ({ pageIndex: page - 1, pageSize }), [page, pageSize]);

	const columnFilters = React.useMemo<ColumnFiltersState>(() => {
		return Object.entries(search)
			.filter(([key, value]) => key.startsWith(filterPrefix) && typeof value === "string" && value.length > 0)
			.map(([key, value]) => ({
				id: key.slice(filterPrefix.length),
				value: { type: "text", value: value as string } satisfies FilterValue,
			}));
	}, [filterPrefix, search]);

	const setSearchParams = React.useCallback(
		(patch: Record<string, string | number | boolean | undefined>) => {
			void navigate({
				replace: true,
				resetScroll: false,
				search: ((previous: Record<string, unknown>) => {
					const next = { ...previous, ...patch };
					for (const [key, value] of Object.entries(next)) {
						const shouldDrop =
							value === undefined ||
							value === "" ||
							(key === pageKey && Number(value) === 1) ||
							(key === limitKey && Number(value) === defaultPageSize) ||
							(key === sortKey && value === sortParamFromSorting(defaultSort));
						if (shouldDrop) delete next[key];
					}
					return next;
				}) as never,
			});
		},
		[defaultPageSize, defaultSort, limitKey, navigate, pageKey, sortKey],
	);

	const onPaginationChange = React.useCallback<OnChangeFn<PaginationState>>(
		(updater) => {
			const next = resolveUpdater(updater, pagination);
			setSearchParams({ [pageKey]: next.pageIndex + 1, [limitKey]: next.pageSize });
		},
		[limitKey, pageKey, pagination, setSearchParams],
	);

	const onSortingChange = React.useCallback<OnChangeFn<SortingState>>(
		(updater) => {
			const next = resolveUpdater(updater, sorting);
			setSearchParams({ [sortKey]: sortParamFromSorting(next), [pageKey]: 1 });
		},
		[pageKey, setSearchParams, sortKey, sorting],
	);

	const onColumnFiltersChange = React.useCallback<OnChangeFn<ColumnFiltersState>>(
		(updater) => {
			const next = resolveUpdater(updater, columnFilters);
			const patch: Record<string, string | number | boolean | undefined> = { [pageKey]: 1 };
			for (const key of Object.keys(search)) {
				if (key.startsWith(filterPrefix)) patch[key] = undefined;
			}
			for (const filter of next) {
				patch[`${filterPrefix}${filter.id}`] = serializeFilterValue(filter.value);
			}
			setSearchParams(patch);
		},
		[columnFilters, filterPrefix, pageKey, search, setSearchParams],
	);

	const onGlobalFilterInputChange = React.useCallback(
		(value: string) => setSearchParams({ [searchKey]: value.trim() || undefined, [pageKey]: 1 }),
		[pageKey, searchKey, setSearchParams],
	);

	const filterQueryParams = Object.fromEntries(
		columnFilters.map((filter) => [`${filterPrefix}${filter.id}`, serializeFilterValue(filter.value)]),
	) as Record<`filter.${string}`, string | undefined>;
	const sort = sortParamFromSorting(sorting);
	const queryParams = {
		page,
		limit: pageSize,
		search: searchText || undefined,
		sort,
		...filterQueryParams,
	} satisfies DataTableQueryParams;

	return {
		page,
		pageSize,
		search: searchText,
		sorting,
		pagination,
		columnFilters,
		sort,
		queryParams,
		urlSearch: search,
		setSearchParams,
		tableProps: {
			state: { sorting, pagination, columnFilters, globalFilterInput: searchText },
			onSortingChange,
			onPaginationChange,
			onColumnFiltersChange,
			onGlobalFilterInputChange,
			pageSize,
			manualPagination: true,
			manualSorting: true,
		},
	};
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

const csvValue = (value: unknown) => {
	const text = value instanceof Date ? value.toISOString() : String(value ?? "");
	const escaped = text.replaceAll('"', '""');
	return /[",\r\n]/.test(text) ? `"${escaped}"` : escaped;
};

const csvHeader = <TData, TValue>(column: ColumnDef<TData, TValue>, columnId: string) =>
	typeof column.header === "string" ? column.header : columnId;

const downloadCsv = (filename: string, rows: readonly (readonly unknown[])[]) => {
	const csv = rows.map((row) => row.map(csvValue).join(",")).join("\r\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
	link.click();
	URL.revokeObjectURL(url);
};

function useDataTableCsvExport<TData>(table: TanStackTable<TData>, exportFilename: string) {
	return React.useCallback(() => {
		const exportColumns = table.getVisibleLeafColumns().filter((column) => column.id !== "actions");
		const rows = table.getRowModel().rows;
		downloadCsv(exportFilename, [
			exportColumns.map((column) => csvHeader(column.columnDef, column.id)),
			...rows.map((row) => exportColumns.map((column) => row.getValue(column.id))),
		]);
	}, [exportFilename, table]);
}

function useDataTableVirtualRows<TData>({
	table,
	enabled,
	estimateRowHeight,
}: {
	readonly table: TanStackTable<TData>;
	readonly enabled: boolean;
	readonly estimateRowHeight: number;
}) {
	const tableContainerRef = React.useRef<HTMLDivElement>(null);
	const rowVirtualizer = useVirtualizer({
		count: table.getRowModel().rows.length,
		getScrollElement: () => tableContainerRef.current,
		estimateSize: () => estimateRowHeight,
		overscan: 8,
		enabled,
	});
	const virtualItems = enabled ? rowVirtualizer.getVirtualItems() : undefined;
	const virtualPaddingTop = virtualItems?.[0]?.start ?? 0;
	const virtualPaddingBottom = virtualItems
		? Math.max(0, rowVirtualizer.getTotalSize() - (virtualItems.at(-1)?.end ?? 0))
		: 0;

	return {
		tableContainerRef,
		virtualItems,
		virtualPaddingTop,
		virtualPaddingBottom,
	};
}

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

function DataTableToolbar<TData>({
	enableSearch,
	searchPlaceholder,
	globalFilterInput,
	setGlobalFilterInput,
	hasFilters,
	resetFilters,
	toolbarActions,
	enableColumnVisibility,
	enableCsvExport,
	exportDisabled,
	onExportCsv,
	table,
}: {
	readonly enableSearch: boolean;
	readonly searchPlaceholder: string;
	readonly globalFilterInput: string;
	readonly setGlobalFilterInput: (value: string) => void;
	readonly hasFilters: boolean;
	readonly resetFilters: () => void;
	readonly toolbarActions?: React.ReactNode;
	readonly enableColumnVisibility: boolean;
	readonly enableCsvExport: boolean;
	readonly exportDisabled: boolean;
	readonly onExportCsv: () => void;
	readonly table: TanStackTable<TData>;
}) {
	if (!(enableSearch || toolbarActions || enableColumnVisibility || enableCsvExport || hasFilters)) return null;

	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
				{enableSearch && (
					<Input
						placeholder={searchPlaceholder}
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
				{enableCsvExport && (
					<Button variant="outline" size="sm" onClick={onExportCsv} disabled={exportDisabled}>
						Export CSV
					</Button>
				)}
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
	);
}

function DataTablePagination<TData>({
	table,
	firstRow,
	lastRow,
	totalRows,
	currentPageSize,
	handlePageSizeChange,
	pageIndex,
	pageCount,
}: {
	readonly table: TanStackTable<TData>;
	readonly firstRow: number;
	readonly lastRow: number;
	readonly totalRows: number;
	readonly currentPageSize: number;
	readonly handlePageSizeChange: (value: string) => void;
	readonly pageIndex: number;
	readonly pageCount: number;
}) {
	const { t } = useTranslation();

	return (
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
	);
}

function DataTableRows<TData>({
	table,
	error,
	onRetry,
	isLoading,
	currentPageSize,
	emptyTitle,
	emptyMessage,
	emptyAction,
	onRowClick,
	virtualRows,
	virtualPaddingTop,
	virtualPaddingBottom,
}: {
	readonly table: TanStackTable<TData>;
	readonly error?: unknown;
	readonly onRetry?: () => void;
	readonly isLoading: boolean;
	readonly currentPageSize: number;
	readonly emptyTitle: string;
	readonly emptyMessage: string;
	readonly emptyAction?: React.ReactNode;
	readonly onRowClick?: (row: TData) => void;
	readonly virtualRows?: readonly VirtualItem[];
	readonly virtualPaddingTop?: number;
	readonly virtualPaddingBottom?: number;
}) {
	const visibleColumns = table.getVisibleLeafColumns();
	const rows = table.getRowModel().rows;

	if (error) {
		return (
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
		);
	}

	if (isLoading) {
		return Array.from({ length: Math.min(currentPageSize, 8) }).map((_, i) => (
			<TableRow key={`loading-${i}`}>
				{visibleColumns.map((column) => (
					<TableCell key={`loading-${i}-${column.id}`}>
						<Skeleton className="h-4 w-full" />
					</TableCell>
				))}
			</TableRow>
		));
	}

	if (rows.length === 0) {
		return (
			<TableRow>
				<TableCell colSpan={visibleColumns.length} className="h-40 text-center">
					<div className="flex flex-col items-center gap-3">
						<div>
							<div className="font-medium">{emptyTitle}</div>
							<div className="text-sm text-muted-foreground">{emptyMessage}</div>
						</div>
						{emptyAction}
					</div>
				</TableCell>
			</TableRow>
		);
	}

	const renderedRows = virtualRows ? virtualRows.map((virtualRow) => rows[virtualRow.index]).filter(Boolean) : rows;

	return (
		<>
			{Boolean(virtualPaddingTop) && (
				<TableRow aria-hidden="true">
					<TableCell
						colSpan={visibleColumns.length}
						className="border-0 p-0"
						style={{ height: `${virtualPaddingTop}px` }}
					/>
				</TableRow>
			)}
			{renderedRows.map((row) => (
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
			))}
			{Boolean(virtualPaddingBottom) && (
				<TableRow aria-hidden="true">
					<TableCell
						colSpan={visibleColumns.length}
						className="border-0 p-0"
						style={{ height: `${virtualPaddingBottom}px` }}
					/>
				</TableRow>
			)}
		</>
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
	enableCsvExport = false,
	exportFilename = "table-export.csv",
	virtualizeRows = false,
	estimateRowHeight = 48,
	toolbarActions,
	getRowId,
	onRowClick,
	state,
	onSortingChange,
	onPaginationChange,
	onColumnFiltersChange,
	onGlobalFilterInputChange,
	manualPagination = false,
	manualSorting = false,
	manualFiltering = false,
	pageCount,
}: DataTableProps<TData, TValue>) {
	const { t } = useTranslation();
	const resolvedSearchPlaceholder = searchPlaceholder ?? t("common.searchDots");
	const resolvedEmptyMessage = emptyMessage ?? t("common.noResults");
	const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
	const [globalFilterInput, setGlobalFilterInput] = React.useState(state?.globalFilterInput ?? "");
	const [internalGlobalFilter, setInternalGlobalFilter] = React.useState("");
	const [internalColumnFilters, setInternalColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: pageSize,
	});
	const lastExternalGlobalFilter = React.useRef(state?.globalFilterInput);
	const sorting = state?.sorting ?? internalSorting;
	const columnFilters = state?.columnFilters ?? internalColumnFilters;
	const pagination = state?.pagination ?? internalPagination;
	const debouncedGlobalFilter = useDebouncedValue(globalFilterInput, 300);
	const dataTableFilter = React.useCallback<FilterFn<TData>>(
		(row, columnId, filterValue) => matchesFilter(row.getValue(columnId), filterValue),
		[],
	);
	const globalFilter = manualFiltering ? globalFilterInput : internalGlobalFilter;
	const setSorting = onSortingChange ?? setInternalSorting;
	const setColumnFilters = onColumnFiltersChange ?? setInternalColumnFilters;
	const setPagination = onPaginationChange ?? setInternalPagination;

	React.useEffect(() => {
		const nextGlobalFilter = state?.globalFilterInput;
		if (nextGlobalFilter !== undefined && nextGlobalFilter !== lastExternalGlobalFilter.current) {
			lastExternalGlobalFilter.current = nextGlobalFilter;
			setGlobalFilterInput(nextGlobalFilter);
		}
	}, [state?.globalFilterInput]);

	React.useEffect(() => {
		if (onGlobalFilterInputChange) {
			if (debouncedGlobalFilter !== (state?.globalFilterInput ?? "")) {
				onGlobalFilterInputChange(debouncedGlobalFilter);
			}
			return;
		}
		setInternalGlobalFilter(debouncedGlobalFilter);
	}, [debouncedGlobalFilter, onGlobalFilterInputChange, state?.globalFilterInput]);

	const mutableData = React.useMemo(() => [...data], [data]);
	const manualPageCount =
		pageCount ?? (totalCount !== undefined ? Math.ceil(totalCount / pagination.pageSize) : undefined);

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
		onGlobalFilterChange: setInternalGlobalFilter,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onPaginationChange: setPagination,
		defaultColumn: {
			filterFn: dataTableFilter,
		},
		manualPagination,
		manualSorting,
		manualFiltering,
		pageCount: manualPagination ? manualPageCount : undefined,
		globalFilterFn: searchKey
			? (row, _columnId, filterValue) => normalize(row.original[searchKey]).includes(normalize(filterValue))
			: (row, columnId, filterValue) => normalize(row.getValue(columnId)).includes(normalize(filterValue)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
		getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
		getPaginationRowModel: enablePagination && !manualPagination ? getPaginationRowModel() : undefined,
		autoResetPageIndex: false,
	});

	const handlePageSizeChange = React.useCallback(
		(value: string) => {
			const size = Number(value);
			setPagination({ pageIndex: 0, pageSize: size });
		},
		[setPagination],
	);

	const resetFilters = React.useCallback(() => {
		setGlobalFilterInput("");
		setInternalGlobalFilter("");
		onGlobalFilterInputChange?.("");
		setColumnFilters([]);
		table.resetColumnFilters();
	}, [onGlobalFilterInputChange, setColumnFilters, table]);

	const exportCsv = useDataTableCsvExport(table, exportFilename);

	const hasFilters = Boolean(
		globalFilterInput || globalFilter || columnFilters.some((filter) => hasFilterValue(filter.value)),
	);
	const pageIndex = pagination.pageIndex;
	const currentPageSize = pagination.pageSize;
	const resolvedPageCount = manualPagination ? (manualPageCount ?? 0) : table.getPageCount();
	const filteredRows = table.getFilteredRowModel().rows.length;
	const totalRows = totalCount ?? filteredRows;
	const currentRowCount = table.getRowModel().rows.length;
	const firstRow = totalRows === 0 || currentRowCount === 0 ? 0 : pageIndex * currentPageSize + 1;
	const lastRow = manualPagination
		? Math.min(firstRow + currentRowCount - 1, totalRows)
		: Math.min((pageIndex + 1) * currentPageSize, totalRows);
	const showFilterRow =
		enableColumnFilters &&
		table.getHeaderGroups().some((group) => group.headers.some((header) => header.column.columnDef.meta?.filter));
	const shouldVirtualizeRows = !isLoading && !error && (virtualizeRows || currentPageSize >= 100);
	const { tableContainerRef, virtualItems, virtualPaddingTop, virtualPaddingBottom } = useDataTableVirtualRows({
		table,
		enabled: shouldVirtualizeRows,
		estimateRowHeight,
	});

	return (
		<div className="space-y-4">
			<DataTableToolbar
				enableSearch={enableSearch}
				searchPlaceholder={resolvedSearchPlaceholder}
				globalFilterInput={globalFilterInput}
				setGlobalFilterInput={setGlobalFilterInput}
				hasFilters={hasFilters}
				resetFilters={resetFilters}
				toolbarActions={toolbarActions}
				enableColumnVisibility={enableColumnVisibility}
				enableCsvExport={enableCsvExport}
				exportDisabled={table.getRowModel().rows.length === 0}
				onExportCsv={exportCsv}
				table={table}
			/>

			<div
				ref={tableContainerRef}
				className={`overflow-x-auto rounded-md border ${shouldVirtualizeRows ? "max-h-[70vh] overflow-y-auto" : ""}`}
			>
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
						<DataTableRows
							table={table}
							error={error}
							onRetry={onRetry}
							isLoading={isLoading}
							currentPageSize={currentPageSize}
							emptyTitle={emptyTitle}
							emptyMessage={resolvedEmptyMessage}
							emptyAction={emptyAction}
							onRowClick={onRowClick}
							virtualRows={virtualItems}
							virtualPaddingTop={virtualPaddingTop}
							virtualPaddingBottom={virtualPaddingBottom}
						/>
					</TableBody>
				</Table>
			</div>

			{enablePagination && totalRows > 0 && (
				<DataTablePagination
					table={table}
					firstRow={firstRow}
					lastRow={lastRow}
					totalRows={totalRows}
					currentPageSize={currentPageSize}
					handlePageSizeChange={handlePageSizeChange}
					pageIndex={pageIndex}
					pageCount={resolvedPageCount}
				/>
			)}
		</div>
	);
}
