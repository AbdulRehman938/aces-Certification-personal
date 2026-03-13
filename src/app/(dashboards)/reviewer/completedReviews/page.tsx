"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { axiosInstance } from "@/lib/axios";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

interface CompletedReview {
  id: string;
  assessmentId?: string;
  auditId?: string;
  organization: string;
  certification: string;
  status: string;
}

type ReviewerAuditItem = {
  assessment_id?: string;
  assessmentId?: string;
  audit_id?: string;
  auditId?: string;
  organization_name?: string;
  organizationName?: string;
  certificate_name?: string;
  certificateName?: string;
  computed_status?: string;
  computedStatus?: string;
  review_status?: string;
  reviewStatus?: string;
  audit_status?: string;
  auditStatus?: string;
};

const DEFAULT_PAGE_SIZE = 10;

const formatStatusLabel = (value?: string): string => {
  const raw = String(value || "").trim();
  if (!raw) return "N/A";
  return raw
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function CompletedReviews() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [completedReviews, setCompletedReviews] = useState<CompletedReview[]>(
    [],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    let isCancelled = false;

    const fetchReviewerAudits = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get("/reviewers/audits", {
          params: {
            page: currentPage,
            limit: DEFAULT_PAGE_SIZE,
          },
          signal: controller.signal,
        });
        if (isCancelled || controller.signal.aborted) return;

        const payload = response.data?.data;
        const items: ReviewerAuditItem[] = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(response.data?.items)
            ? response.data.items
            : [];

        const mappedRows: CompletedReview[] = items.map((item, index) => {
          const assessmentId = item.assessment_id || item.assessmentId || "";
          const auditId = item.audit_id || item.auditId || "";

          return {
            id:
              auditId ||
              assessmentId ||
              `review-audit-${currentPage}-${index + 1}`,
            assessmentId: assessmentId || undefined,
            auditId: auditId || undefined,
            organization:
              item.organization_name || item.organizationName || "N/A",
            certification:
              item.certificate_name || item.certificateName || "N/A",
            status: formatStatusLabel(
              item.computed_status ||
                item.computedStatus ||
                item.review_status ||
                item.reviewStatus ||
                item.audit_status ||
                item.auditStatus,
            ),
          };
        });

        const responseTotalPages = Number(
          payload?.totalPages ?? response.data?.totalPages,
        );
        const responseTotal = Number(payload?.total ?? response.data?.total);
        const resolvedTotalPages =
          Number.isFinite(responseTotalPages) && responseTotalPages > 0
            ? responseTotalPages
            : Number.isFinite(responseTotal) && responseTotal > 0
              ? Math.ceil(responseTotal / DEFAULT_PAGE_SIZE)
              : 1;

        setCompletedReviews(mappedRows);
        setTotalPages(resolvedTotalPages);

        if (currentPage > resolvedTotalPages && resolvedTotalPages > 0) {
          setCurrentPage(resolvedTotalPages);
        }
      } catch (error) {
        if (isCancelled || controller.signal.aborted) return;
        console.error("Failed to fetch reviewer audits:", error);
        setCompletedReviews([]);
        setTotalPages(1);
      } finally {
        if (!isCancelled && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchReviewerAudits();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [currentPage]);

  const getStatusStyles = (status: string) => {
    const key = status.toLowerCase();
    if (key.includes("completed") || key.includes("approved")) {
      return "bg-[#f2fff7] text-[#00B448] border border-[#00B448]";
    }
    if (key.includes("in progress")) {
      return "bg-[#FFF9E6] text-[#FFB020] border border-[#FFD580]";
    }
    if (key.includes("rejected") || key.includes("close")) {
      return "bg-[#fef7e5] text-[#FF0909] border border-[#FF0909]";
    }
    return "bg-[#e9e9e9] text-black border border-black";
  };

  const columns = useMemo<ColumnDef<CompletedReview>[]>(
    () => [
      {
        accessorKey: "organization",
        header: () => (
          <span className="text-[12px] font-medium text-gray">
            Organization
          </span>
        ),
        cell: ({ getValue }) => (
          <span className="text-sm text-dull-gray underline cursor-pointer block truncate max-w-[220px]">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "certification",
        header: () => (
          <span className="text-[12px] font-medium text-gray">
            Certification
          </span>
        ),
        cell: ({ getValue }) => (
          <span className="text-sm text-dull-gray underline cursor-pointer block truncate max-w-75">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <span className="text-[12px] font-medium text-gray">Status</span>
        ),
        cell: ({ getValue }) => (
          <span
            className={`inline-flex items-center justify-center px-4 py-1.5 rounded-md text-sm font-medium leading-[100%] align-middle border min-w-[120px] md:min-w-[140px] text-center ${getStatusStyles(getValue<string>())}`}
          >
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: "action",
        header: () => (
          <span className="text-[12px] font-medium text-gray text-center block">
            Action
          </span>
        ),
        cell: (info: any) => {
          const row = info.row.original as CompletedReview;
          const navigateId = row.assessmentId || row.auditId;
          const detailRoute = navigateId
            ? `/reviewer/completedReviews/review?assessmentId=${encodeURIComponent(navigateId)}`
            : "/reviewer/completedReviews/review";

          return (
            <div className="flex items-center justify-center gap-2 pl-8">
              <button
                className="p-2 rounded-md border"
                style={{ borderColor: "#9B9B9B" }}
                onClick={() => router.push(detailRoute)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 7.5C6.82843 7.5 7.5 6.82843 7.5 6C7.5 5.17157 6.82843 4.5 6 4.5C5.17157 4.5 4.5 5.17157 4.5 6C4.5 6.82843 5.17157 7.5 6 7.5Z"
                    fill="#9B9B9B"
                  />
                  <path
                    d="M11.6025 5.8725C11.1614 4.73162 10.3957 3.74498 9.40001 3.03453C8.40432 2.32408 7.22227 1.92096 5.99996 1.875C4.77766 1.92096 3.59561 2.32408 2.59991 3.03453C1.60422 3.74498 0.838523 4.73162 0.397463 5.8725C0.367675 5.95489 0.367675 6.04511 0.397463 6.1275C0.838523 7.26838 1.60422 8.25502 2.59991 8.96547C3.59561 9.67592 4.77766 10.079 5.99996 10.125C7.22227 10.079 8.40432 9.67592 9.40001 8.96547C10.3957 8.25502 11.1614 7.26838 11.6025 6.1275C11.6323 6.04511 11.6323 5.95489 11.6025 5.8725ZM5.99996 8.4375C5.51787 8.4375 5.04661 8.29454 4.64576 8.02671C4.24492 7.75887 3.9325 7.37819 3.74801 6.93279C3.56352 6.4874 3.51525 5.9973 3.6093 5.52447C3.70335 5.05164 3.9355 4.61732 4.27639 4.27643C4.61728 3.93554 5.0516 3.70339 5.52443 3.60934C5.99726 3.51528 6.48736 3.56356 6.93275 3.74804C7.37815 3.93253 7.75883 4.24495 8.02667 4.6458C8.29451 5.04664 8.43746 5.51791 8.43746 6C8.43647 6.64616 8.17935 7.26557 7.72244 7.72248C7.26554 8.17938 6.64612 8.43651 5.99996 8.4375Z"
                    fill="#9B9B9B"
                  />
                </svg>
              </button>
              <button
                className="p-2 rounded-md border"
                style={{ borderColor: "#9B9B9B" }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 7.7875C5.93333 7.7875 5.87083 7.77717 5.8125 7.7565C5.75417 7.73584 5.7 7.70034 5.65 7.65L3.85 5.85C3.75 5.75 3.702 5.63334 3.706 5.5C3.71 5.36667 3.758 5.25 3.85 5.15C3.95 5.05 4.06883 4.998 4.2065 4.994C4.34417 4.99 4.46283 5.03783 4.5625 5.1375L5.5 6.075V2.5C5.5 2.35834 5.548 2.23967 5.644 2.144C5.74 2.04834 5.85867 2.00034 6 2C6.14133 1.99967 6.26017 2.04767 6.3565 2.144C6.45283 2.24034 6.50067 2.359 6.5 2.5V6.075L7.4375 5.1375C7.5375 5.0375 7.65633 4.9895 7.794 4.9935C7.93167 4.9975 8.05033 5.04967 8.15 5.15C8.24167 5.25 8.28967 5.36667 8.294 5.5C8.29833 5.63334 8.25033 5.75 8.15 5.85L6.35 7.65C6.3 7.7 6.24583 7.7355 6.1875 7.7565C6.12917 7.7775 6.06667 7.78784 6 7.7875ZM3 10C2.725 10 2.48967 9.90217 2.294 9.7065C2.09833 9.51084 2.00033 9.27534 2 9V8C2 7.85834 2.048 7.73967 2.144 7.644C2.24 7.54834 2.35867 7.50034 2.5 7.5C2.64133 7.49967 2.76017 7.54767 2.8565 7.644C2.95283 7.74034 3.00067 7.859 3 8V9H9V8C9 7.85834 9.048 7.73967 9.144 7.644C9.24 7.54834 9.35867 7.50034 9.5 7.5C9.64133 7.49967 9.76017 7.54767 9.8565 7.644C9.95283 7.74034 10.0007 7.859 10 8V9C10 9.275 9.90217 9.5105 9.7065 9.7065C9.51083 9.9025 9.27533 10.0003 9 10H3Z"
                    fill="#999999"
                  />
                </svg>
              </button>
            </div>
          );
        },
      },
    ],
    [router],
  );

  const table = useReactTable({
    data: completedReviews,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="p-6 bg-light-gray min-h-screen">
      <div className="mb-8">
        <h1 className="text-[24px] font-semibold text-secondary mb-2 leading-[21.6px] align-middle">
          Completed Reviews
        </h1>
        <p className="text-[15px] font-normal text-gray leading-[21.6px] align-middle">
          View all completed review submissions
        </p>
      </div>

      <h2 className="text-[18px] font-semibold text-secondary mb-2 leading-[21.6px] align-middle">
        Completed Reviews
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
                Array.from({ length: DEFAULT_PAGE_SIZE }).map((_, rowIndex) => (
                  <tr
                    key={`completed-reviews-skeleton-row-${rowIndex}`}
                    className="border-b border-zinc-100 last:border-b-0"
                  >
                    {table.getVisibleLeafColumns().map((column) => (
                      <td
                        key={`completed-reviews-skeleton-cell-${rowIndex}-${column.id}`}
                        className="px-2 md:px-4 py-2 md:py-4"
                        style={{
                          width: `${100 / table.getAllColumns().length}%`,
                        }}
                      >
                        <div
                          className={
                            column.id === "action" ? "flex justify-center" : ""
                          }
                        >
                          <Skeleton
                            height={18}
                            width={column.id === "action" ? 70 : "70%"}
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
                    No completed reviews found
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
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={isLoading || currentPage <= 1}
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
              const maxPagesToShow = 8;
              let startPage = Math.max(1, currentPage - 3);
              const endPage = Math.min(
                totalPages,
                startPage + maxPagesToShow - 1,
              );

              if (endPage - startPage + 1 < maxPagesToShow) {
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
              }

              const pages = [];
              if (startPage > 1) {
                pages.push(
                  <span
                    key="dots-before"
                    className="px-1 md:px-2 text-[10px] md:text-xs text-gray"
                  >
                    ...
                  </span>,
                );
              }

              for (let page = startPage; page <= endPage; page += 1) {
                pages.push(
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    disabled={isLoading}
                    className={`px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-sm text-[10px] md:text-xs font-normal transition-colors ${
                      currentPage === page
                        ? "bg-dull-gray text-primary"
                        : "bg-zinc-50 text-secondary border hover:bg-zinc-100"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={
                      currentPage !== page
                        ? { borderColor: "#E6E6E6" }
                        : undefined
                    }
                  >
                    {page}
                  </button>,
                );
              }

              if (endPage < totalPages) {
                pages.push(
                  <span
                    key="dots-after"
                    className="px-1 md:px-2 text-[10px] md:text-xs text-gray"
                  >
                    ...
                  </span>,
                );
              }
              return pages;
            })()}
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={isLoading || currentPage >= totalPages}
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
