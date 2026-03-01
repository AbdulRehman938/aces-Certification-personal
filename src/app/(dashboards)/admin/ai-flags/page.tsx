"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { axiosInstance } from "@/lib/axios";
import axios from "axios";
import Dropdown from "../common/dropdown";
import { Loading } from "../common/Loading";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";

type AIFlag = {
  id: string;
  organisation: string;
  certification: string;
  type: string;
  status: string;
  summary: string;
  summarySubtext: string;
  flagged: string;
};

type AiFlagsApiItem = {
  id: string;
  organization_name?: string;
  certificate_name?: string;
  assessment_type?: string;
  status?: string;
  summary?: string;
  flagged_at?: string;
  total_flags?: number;
  risk_level?: string;
};

type AiFlagsApiResponse = {
  success: boolean;
  message?: string;
  statusCode?: number;
  timestamp?: string;
  data?: {
    flags?: AiFlagsApiItem[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
};

export default function AIFlagsPage() {
  const router = useRouter();
  const [data, setData] = useState<AIFlag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showTableLoader, setShowTableLoader] = useState(false);
  const [tableLoadingProgress, setTableLoadingProgress] = useState(0);
  const tableLoaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const tableLoaderFinishTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
    total: 0,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-red-50 text-red-600 border-red-300";
      case "Pending":
        return "bg-yellow-50 text-yellow-600 border-yellow-300";
      case "Escalated":
        return "bg-zinc-100 text-secondary border-black";
      case "Resolved":
        return "bg-green-50 text-green-600 border-green-300";
      default:
        return "bg-zinc-100 text-secondary border-zinc-300";
    }
  };

  const columns = useMemo<ColumnDef<AIFlag>[]>(
    () => [
      {
        accessorKey: "organisation",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Organization
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray underline cursor-pointer"
            style={{ letterSpacing: "1%" }}
          >
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "certification",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Certification
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray underline cursor-pointer"
            style={{ letterSpacing: "1%" }}
          >
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Type
          </span>
        ),
        cell: ({ getValue }) => (
          <span className="inline-flex items-center justify-center px-2 py-1.5 rounded-md text-[9px] md:text-xs font-medium leading-[100%] align-middle bg-green-50 text-green-600 border border-green-300 min-w-[70px] md:min-w-[90px] text-center">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Status
          </span>
        ),
        cell: ({ getValue }) => {
          const status = getValue<string>();
          return (
            <span
              className={`inline-flex items-center justify-center px-2 py-1.5 rounded-md text-[9px] md:text-xs font-medium leading-[100%] align-middle border min-w-[70px] md:min-w-[90px] text-center ${getStatusBadgeClass(
                status,
              )}`}
            >
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: "summary",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Summary
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span
              className="text-[11px] md:text-xs font-normal leading-[100%] align-middle text-black"
              style={{
                letterSpacing: "1%",
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
              }}
            >
              {row.original.summary}
            </span>
            <span
              className="text-[9px] md:text-[10px] font-normal leading-[100%] align-middle text-gray-500 mt-1"
              style={{ letterSpacing: "1%" }}
            >
              {row.original.summarySubtext}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "flagged",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Flagged
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray"
            style={{ letterSpacing: "1%" }}
          >
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: "action",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle text-center block"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Actions
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <button
              onClick={() =>
                router.push(`/admin/ai-flags/review?id=${row.original.id}`)
              }
              className="px-3 py-1.5 border border-black rounded-lg text-[10px] md:text-xs font-normal text-secondary hover:bg-zinc-50 transition-colors"
            >
              Review
            </button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [router],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(pagination.total / pagination.pageSize)),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    state: {
      pagination: {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      },
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
            })
          : updater;
      setPagination((prev) => ({
        ...prev,
        pageIndex: next.pageIndex,
        pageSize: next.pageSize,
      }));
    },
  });

  useEffect(() => {
    let isCancelled = false;

    const fetchFlags = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const pageNumber = pagination.pageIndex + 1;
        const limit = pagination.pageSize;
        const params: { pageNumber: number; limit: number; status?: string } = {
          pageNumber,
          limit,
        };
        if (statusFilter !== "all") {
          params.status = statusFilter;
        }

        const response = await axiosInstance.get<AiFlagsApiResponse>(
          "/ai-flags",
          { params },
        );
        console.log("AI Flags request params:", params);
        console.log("AI Flags response:", response.data);
        if (isCancelled) return;

        const flags = Array.isArray(response.data?.data?.flags)
          ? response.data.data.flags
          : [];
        const total =
          typeof response.data?.data?.total === "number"
            ? response.data.data.total
            : flags.length;

        const mapped: AIFlag[] = flags.map((flag) => {
          const riskLevelLabel = flag.risk_level
            ? `Risk: ${flag.risk_level.charAt(0).toUpperCase()}${flag.risk_level.slice(1)}`
            : "";
          const totalFlagsLabel =
            typeof flag.total_flags === "number"
              ? `${flag.total_flags} flag${flag.total_flags === 1 ? "" : "s"}`
              : "";
          const summarySubtext = [riskLevelLabel, totalFlagsLabel]
            .filter(Boolean)
            .join(" | ");
          const flaggedAtDate = flag.flagged_at ? new Date(flag.flagged_at) : null;

          return {
            id: flag.id,
            organisation: flag.organization_name || "N/A",
            certification: flag.certificate_name || "N/A",
            type: flag.assessment_type || "N/A",
            status: flag.status
              ? flag.status.charAt(0).toUpperCase() + flag.status.slice(1)
              : "N/A",
            summary: flag.summary || "N/A",
            summarySubtext,
            flagged:
              flaggedAtDate && !Number.isNaN(flaggedAtDate.getTime())
                ? new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(flaggedAtDate)
                : "N/A",
          };
        });

        setData(mapped);
        setPagination((prev) => ({
          ...prev,
          total,
        }));
      } catch (error: unknown) {
        if (!isCancelled) {
          console.error("Failed to fetch AI flags:", error);
          const message = axios.isAxiosError(error)
            ? error.response?.data?.message || "Failed to load AI flags"
            : "Failed to load AI flags";
          setLoadError(message);
          setData([]);
          setPagination((prev) => ({ ...prev, total: 0 }));
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchFlags();

    return () => {
      isCancelled = true;
    };
  }, [pagination.pageIndex, pagination.pageSize, statusFilter]);

  useEffect(() => {
    if (tableLoaderIntervalRef.current) {
      clearInterval(tableLoaderIntervalRef.current);
      tableLoaderIntervalRef.current = null;
    }
    if (tableLoaderFinishTimeoutRef.current) {
      clearTimeout(tableLoaderFinishTimeoutRef.current);
      tableLoaderFinishTimeoutRef.current = null;
    }

    if (isLoading) {
      setShowTableLoader(true);
      setTableLoadingProgress(0);
      tableLoaderIntervalRef.current = setInterval(() => {
        setTableLoadingProgress((prev) => {
          if (prev >= 95) return prev;
          const step = Math.max(1, Math.round((95 - prev) / 8));
          return Math.min(prev + step, 95);
        });
      }, 120);
      return;
    }

    if (showTableLoader) {
      setTableLoadingProgress(100);
      tableLoaderFinishTimeoutRef.current = setTimeout(() => {
        setShowTableLoader(false);
        setTableLoadingProgress(0);
      }, 300);
    }
  }, [isLoading, showTableLoader]);

  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen flex flex-col">
      <div className="flex flex-row items-start justify-between mb-4 md:mb-6 gap-3">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
            AI Flags
          </h1>
          <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
            Assessments requiring admin attention
          </p>
        </div>
        {!isFilterOpen && (
          <button
            onClick={() => setIsFilterOpen(true)}
            className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 border border-black"
          >
            <img
              src="/assets/imgs/admin/commons/filter.svg"
              alt="Filter"
              className="w-6 h-6 md:w-7 md:h-7"
            />
          </button>
        )}
      </div>

      {isFilterOpen && (
        <div className="flex items-start justify-between mb-4 md:mb-6 gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 flex-1">
            <Dropdown
              value={statusFilter}
              onChange={(e) => {
                const next = e.target.value;
                setStatusFilter(next);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              placeholder="All Status"
              className="w-full sm:w-[260px]"
              options={[
                { value: "all", label: "--" },
                { value: "open", label: "Open" },
                { value: "pending", label: "Pending" },
                { value: "escalated", label: "Escalated" },
                { value: "resolved", label: "Resolved" },
              ]}
            />
          </div>
          <button
            onClick={() => {
              setStatusFilter("all");
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              setIsFilterOpen(false);
            }}
            className="p-2 md:p-2 border border-black-200 rounded-lg hover:bg-zinc-50 transition-colors shrink-0 flex items-center justify-center"
            aria-label="Reset filters"
            title="Reset filters"
          >
            <img
              src="/assets/imgs/admin/commons/cross.svg"
              alt="Reset"
              className="w-5 h-5 md:w-6 md:h-6"
            />
          </button>
        </div>
      )}

      <div className="mb-4 md:mb-6">
        <p className="text-sm md:text-base font-medium text-secondary">
          Showing {data.length} of {pagination.total} flags
        </p>
        {loadError && <p className="text-xs text-red-500 mt-1">{loadError}</p>}
      </div>

      <div
        className={`bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden ${
          showTableLoader ? "flex flex-col flex-1" : ""
        }`}
      >
        <div
          className={`relative ${showTableLoader ? "flex-1 overflow-x-auto" : "overflow-x-auto"}`}
        >
          <table
            className={`w-full min-w-250 ${showTableLoader ? "h-full" : ""}`}
            style={{ tableLayout: "fixed" }}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-zinc-100">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-2 md:px-4 py-2 md:py-4 ${
                        header.id === "action" ? "text-center" : "text-left"
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className={showTableLoader ? "h-full" : ""}>
              {showTableLoader ? null : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-gray text-sm"
                  >
                    No flags found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-2 md:px-4 py-2 md:py-4 ${
                          cell.column.id === "action" ? "text-center" : ""
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {showTableLoader && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loading
                isLoading
                size="sm"
                progress={tableLoadingProgress}
                className="p-4"
              />
            </div>
          )}
        </div>
        <div className="px-2 md:px-4 py-3 md:py-4 border-t border-zinc-100 flex items-center justify-center overflow-x-auto">
          <div className="flex items-center gap-0.5 md:gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={isLoading || !table.getCanPreviousPage()}
              className="flex items-center px-2 py-1 md:px-3 md:py-1.5 bg-zinc-100 text-gray rounded-sm text-[10px] md:text-xs font-normal hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-200"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-3 h-3 md:w-4 md:h-4"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10.2325 4.18414C10.4622 4.423 10.4547 4.80282 10.2159 5.0325L7.06567 8L10.2159 10.9675C10.4547 11.1972 10.4622 11.577 10.2325 11.8159C10.0028 12.0547 9.623 12.0622 9.38414 11.8325L5.78413 8.4325C5.66649 8.31938 5.6 8.16321 5.6 8C5.6 7.83679 5.66649 7.68062 5.78413 7.5675L9.38414 4.1675C9.623 3.93782 10.0028 3.94527 10.2325 4.18414Z"
                  fill="#999999"
                />
              </svg>
              <span className="hidden sm:inline ml-1 md:ml-0">Back</span>
            </button>
            {(() => {
              const currentPage = table.getState().pagination.pageIndex;
              const totalPages = table.getPageCount();
              const maxPagesToShow = 8;
              let startPage = 0;
              let endPage = Math.min(maxPagesToShow - 1, totalPages - 1);
              if (currentPage >= maxPagesToShow) {
                startPage = currentPage;
                endPage = Math.min(
                  currentPage + maxPagesToShow - 1,
                  totalPages - 1,
                );
              }
              const pages = [];
              if (startPage > 0) {
                pages.push(
                  <span
                    key="dots-before"
                    className="px-1 md:px-2 text-[10px] md:text-xs text-gray"
                  >
                    ...
                  </span>,
                );
              }
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => table.setPageIndex(i)}
                    className={`px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-sm text-[10px] md:text-xs font-normal transition-colors ${
                      currentPage === i
                        ? "bg-dull-gray text-primary"
                        : "bg-zinc-50 text-secondary border hover:bg-zinc-100"
                    }`}
                    style={
                      currentPage !== i ? { borderColor: "#E6E6E6" } : undefined
                    }
                  >
                    {i + 1}
                  </button>,
                );
              }
              if (endPage < totalPages - 1) {
                pages.push(
                  <span
                    key="dots-after"
                    className="px-1 md:px-2 text-[10px] md:text-xs text-gray"
                  >
                    ...
                  </span>,
                );
                pages.push(
                  <button
                    key={totalPages - 1}
                    onClick={() => table.setPageIndex(totalPages - 1)}
                    className={`px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-sm text-[10px] md:text-xs font-normal transition-colors ${
                      currentPage === totalPages - 1
                        ? "bg-dull-gray text-primary"
                        : "bg-zinc-50 text-secondary border hover:bg-zinc-100"
                    }`}
                    style={
                      currentPage !== totalPages - 1
                        ? { borderColor: "#E6E6E6" }
                        : undefined
                    }
                  >
                    {totalPages}
                  </button>,
                );
              }
              return pages;
            })()}
            <button
              onClick={() => table.nextPage()}
              disabled={isLoading || !table.getCanNextPage()}
              className="flex items-center px-2 py-1 md:px-3 md:py-1.5 bg-zinc-100 text-gray rounded-sm text-[10px] md:text-xs font-normal hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-200"
            >
              <span className="hidden sm:inline mr-1 md:mr-0">Next</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-3 h-3 md:w-4 md:h-4"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.76748 11.8159C5.5378 11.577 5.54525 11.1972 5.78411 10.9675L8.93431 8L5.78411 5.0325C5.54525 4.80282 5.5378 4.423 5.76748 4.18413C5.99715 3.94527 6.37698 3.93782 6.61584 4.1675L10.2158 7.5675C10.3335 7.68062 10.4 7.83679 10.4 8C10.4 8.16321 10.3335 8.31938 10.2158 8.4325L6.61584 11.8325C6.37698 12.0622 5.99715 12.0547 5.76748 11.8159Z"
                  fill="#999999"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
