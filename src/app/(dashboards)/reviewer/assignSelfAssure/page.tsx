"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { axiosInstance } from "@/lib/axios";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

interface AssignedAudit {
  id: string;
  organization: string;
  certification: string;
  aiFlags?: number;
  assignedDate?: string;
  status: string;
}

type ReviewerCertificateAssessmentItem = {
  id?: string;
  assessmentId?: string;
  certificateAssessmentId?: string;
  organizationName?: string;
  certificateName?: string;
  totalAiFlags?: number;
  assignedDate?: string;
  status?: string;
  productId?: string;
  certificateId?: string;
};

const formatAssignedDate = (value?: string): string => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const formatStatusLabel = (value?: string): string => {
  const raw = String(value || "").trim();
  if (!raw) return "N/A";
  return raw
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function AssignSelfAssure() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [assignedAudits, setAssignedAudits] = useState<AssignedAudit[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let isCancelled = false;

    const fetchAssignedAssessments = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(
          "/reviewers/certificate-assessments",
          {
            params: {
              page: 1,
              limit: 10,
            },
            signal: controller.signal,
          },
        );

        if (isCancelled || controller.signal.aborted) return;

        const payload = response.data?.data;
        const items: ReviewerCertificateAssessmentItem[] = Array.isArray(
          payload?.items,
        )
          ? payload.items
          : Array.isArray(response.data?.items)
            ? response.data.items
            : [];

        const mappedRows: AssignedAudit[] = items.map((item, index) => ({
          id:
            item.id ||
            item.assessmentId ||
            item.certificateAssessmentId ||
            item.productId ||
            `${item.certificateId || "assessment"}-${index}`,
          organization: item.organizationName || "N/A",
          certification: item.certificateName || "N/A",
          aiFlags: Number.isFinite(Number(item.totalAiFlags))
            ? Number(item.totalAiFlags)
            : 0,
          assignedDate: formatAssignedDate(item.assignedDate),
          status: formatStatusLabel(item.status),
        }));

        setAssignedAudits(mappedRows);
      } catch (error) {
        if (isCancelled || controller.signal.aborted) return;
        console.error(
          "Failed to fetch reviewer certificate assessments:",
          error,
        );
        setAssignedAudits([]);
      } finally {
        if (!isCancelled && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchAssignedAssessments();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, []);

  const getStatusStyles = (status: string) => {
    const statusKey = status.toLowerCase();
    if (statusKey.includes("flag")) {
      return "bg-[#FFEBEB] text-[#D32F2F] border border-[#FF8A8A]";
    }
    if (statusKey.includes("under review")) {
      return "bg-[#FFF9E6] text-[#FFB020] border border-[#FFD580]";
    }
    if (statusKey.includes("assigned to auditor")) {
      return "bg-[#F0F0F0] text-[#1D2939] border border-[#D0D5DD]";
    }
    if (statusKey.includes("completed")) {
      return "bg-[#F0F0F0] text-[#1D2939] border border-[#D0D5DD]";
    }
    if (statusKey.includes("approved")) {
      return "bg-[#ECFDF3] text-[#027A48] border border-[#6CE9A6]";
    }
    if (statusKey.includes("blocked")) {
      return "bg-[#FFEBEB] text-[#D32F2F] border border-[#FF8A8A]";
    }
    return "bg-[#e9e9e9] text-black border border-black";
  };

  const columns = useMemo<ColumnDef<AssignedAudit>[]>(
    () => [
      {
        accessorKey: "organization",
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
        accessorKey: "aiFlags",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            AI Flags
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray"
            style={{ letterSpacing: "1%" }}
          >
            {getValue<number>()}
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
              className={`inline-flex items-center justify-center  py-1.5 rounded-md text-[9px] md:text-xs font-medium leading-[100%] align-middle border w-[140px] text-center ${getStatusStyles(status)}`}
              style={{ letterSpacing: "1%" }}
            >
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: "assignedDate",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Assigned Date
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray whitespace-nowrap"
            style={{ letterSpacing: "1%" }}
          >
            {getValue<string>()}
          </span>
        ),
        size: 120,
        minSize: 100,
        maxSize: 140,
      },
      {
        id: "action",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle text-center block"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Action
          </span>
        ),
        cell: (info: any) => {
          const row = info.row.original as AssignedAudit;
          const statusKey = row.status.toLowerCase();
          const isView =
            statusKey.includes("completed") || statusKey.includes("approved");
          const targetId = encodeURIComponent(row.id);
          return (
            <div className="flex items-center justify-end">
              <button
                className={`px-6 py-1.5 text-[12px] md:text-sm font-medium border rounded-lg w-[100px] ${
                  isView
                    ? "bg-white text-secondary border-black"
                    : "bg-[#262626] text-white border-[#262626]"
                }`}
                onClick={() =>
                  router.push(
                    `/reviewer/assignSelfAssure/review?id=${targetId}`,
                  )
                }
              >
                {isView ? "View" : "Review"}
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [router],
  );

  const table = useReactTable({
    data: assignedAudits,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen">
      <div className="mb-4 md:mb-6">
        <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
          Self-assured Certificates
        </h1>
        <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
          View and manage all Assigned Assurance to you
        </p>
      </div>

      <h2 className="text-[20px] font-semibold text-secondary mb-4 leading-[21.6px] align-middle">
        Assigned Self-assured Certificates
      </h2>

      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-250" style={{ tableLayout: "fixed" }}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-zinc-100">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-2 md:px-4 py-2 md:py-4 text-left`}
                      style={{
                        width: `${100 / table.getAllColumns().length}%`,
                      }}
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
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, rowIndex) => (
                  <tr
                    key={`reviewer-assign-skeleton-row-${rowIndex}`}
                    className="border-b border-zinc-100 last:border-b-0"
                  >
                    {table.getVisibleLeafColumns().map((column) => (
                      <td
                        key={`reviewer-assign-skeleton-cell-${rowIndex}-${column.id}`}
                        className="px-2 md:px-4 py-2 md:py-4"
                        style={{
                          width: `${100 / table.getAllColumns().length}%`,
                        }}
                      >
                        <div
                          className={
                            column.id === "action" ? "flex justify-end" : ""
                          }
                        >
                          <Skeleton
                            height={18}
                            width={column.id === "action" ? 90 : "70%"}
                            borderRadius={6}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-gray text-sm"
                  >
                    No assigned audits found
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
                        className="px-2 md:px-4 py-2 md:py-4"
                        style={{
                          width: `${100 / table.getAllColumns().length}%`,
                        }}
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
        </div>
        <div className="px-2 md:px-4 py-3 md:py-4 border-t border-zinc-100 flex items-center justify-center overflow-x-auto">
          <div className="flex items-center gap-0.5 md:gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
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
              disabled={!table.getCanNextPage()}
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
