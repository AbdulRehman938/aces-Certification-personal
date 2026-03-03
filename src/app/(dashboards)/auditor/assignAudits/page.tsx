"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { axiosInstance } from "@/lib/axios";
import axios from "axios";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

interface AssignedAudit {
  id: string;
  organization: string;
  certification: string;
  startDate: string;
  time: string;
  dueDate: string;
  status: string;
}

type AssignedAssessmentApiItem = {
  id: string;
  organization_name?: string | null;
  certificate_name?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  audit_date?: string | null;
  completed_at?: string | null;
  status?: string | null;
};

type AssignedAssessmentsApiResponse = {
  message?: string;
  data?: AssignedAssessmentApiItem[];
  total?: number;
  page?: number;
  limit?: number;
};

const formatDate = (value?: string | null): string => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const formatTime = (value?: string | null): string => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getApiStatusLabel = (value?: string | null): string => {
  const raw = (value || "").trim();
  if (!raw) return "N/A";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export default function AssignAudits() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"reviewer" | "admin">("reviewer");
  const [assignedAudits, setAssignedAudits] = useState<AssignedAudit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAssignedAssessments = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await axiosInstance.get<AssignedAssessmentsApiResponse>(
          "/auditors/assigned-assessments",
          {
            params: {
              page: 1,
              limit: 10,
              assignedByRole: activeTab,
            },
          },
        );
        console.log("assigned assessments data:", response.data);

        const apiRows = Array.isArray(response.data?.data)
          ? response.data.data
          : [];

        const mappedRows: AssignedAudit[] = apiRows.map((item) => {
          const startAt = item.submitted_at || item.created_at || null;
          const dueAt = item.audit_date || item.completed_at || null;

          return {
            id: item.id,
            organization: item.organization_name || "N/A",
            certification: item.certificate_name || "N/A",
            startDate: formatDate(startAt),
            time: formatTime(startAt),
            dueDate: formatDate(dueAt),
            status: getApiStatusLabel(item.status),
          };
        });

        setAssignedAudits(mappedRows);
      } catch (error) {
        console.error("Failed to fetch assigned assessments:", error);
        let message = "Failed to fetch assigned assessments";
        if (axios.isAxiosError(error)) {
          message = error.response?.data?.message || message;
        }
        setError(message);
        setAssignedAudits([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignedAssessments();
  }, [activeTab]);

  const getStatusStyles = (status: string) => {
    const statusKey = status.toLowerCase();
    if (statusKey.includes("pending")) {
      return "bg-[#fef7e5] text-[#FAAB00] border border-[#FAAB00]";
    }
    if (statusKey.includes("overdue") || statusKey.includes("expired")) {
      return "bg-red-50 text-red-600 border border-red-600";
    }
    if (
      statusKey.includes("submitted") ||
      statusKey.includes("completed") ||
      statusKey.includes("approved")
    ) {
      return "bg-green-50 text-green-600 border border-green-600";
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
        accessorKey: "startDate",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Start Date
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
        size: 110,
        minSize: 90,
        maxSize: 130,
      },
      {
        accessorKey: "time",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Time
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
        size: 100,
        minSize: 80,
        maxSize: 120,
      },
      {
        accessorKey: "dueDate",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Due Date
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
        size: 110,
        minSize: 90,
        maxSize: 130,
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
              className={`inline-flex items-center justify-center px-2 py-1.5 rounded-md text-[9px] md:text-xs font-medium leading-[100%] align-middle border min-w-[70px] md:min-w-[90px] text-center ${getStatusStyles(status)}`}
              style={{ letterSpacing: "1%" }}
            >
              {status}
            </span>
          );
        },
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
        cell: ({ row }) => {
          const rowData = row.original;
          const statusKey = rowData.status.toLowerCase();
          const showViewButton =
            statusKey.includes("overdue") ||
            statusKey.includes("submitted") ||
            statusKey.includes("completed") ||
            statusKey.includes("approved");
          return (
            <div className="flex items-center justify-end">
              <button
                className={`px-8 py-1.5 text-[12px] md:text-sm font-medium border border-black rounded-lg ${
                  showViewButton
                    ? "bg-white text-secondary"
                    : "bg-[#262626] text-white"
                }`}
                onClick={() =>
                  router.push(
                    `/auditor/assignAudits/review?id=${encodeURIComponent(
                      rowData.id,
                    )}`,
                  )
                }
              >
                {showViewButton ? "View" : "Audit"}
              </button>
            </div>
          );
        },
        enableSorting: false,
        size: 80,
        minSize: 80,
        maxSize: 120,
      },
    ],
    [router],
  );

  const table = useReactTable({
    data: assignedAudits,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const emptyStateMessage = error || "No assigned audits found";

  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen flex flex-col">
      <div className="mb-4 md:mb-6">
        <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
          Assigned Audits
        </h1>
        <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
          View and manage all audits assigned to you
        </p>
      </div>

      <div className="bg-white rounded-xl p-2 md:p-3 inline-flex gap-1.5 mb-3 md:mb-4">
        <button
          onClick={() => setActiveTab("reviewer")}
          className={`px-7 py-1.5 md:px-10 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors ${
            activeTab === "reviewer"
              ? "bg-black text-white shadow-lg"
              : "bg-white text-secondary hover:bg-primary"
          }`}
          style={
            activeTab === "reviewer"
              ? {
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }
              : undefined
          }
        >
          Reviewer
        </button>
        <button
          onClick={() => setActiveTab("admin")}
          className={`px-7 py-1.5 md:px-10 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors ${
            activeTab === "admin"
              ? "bg-black text-white shadow-lg"
              : "bg-white text-secondary hover:bg-primary"
          }`}
          style={
            activeTab === "admin"
              ? {
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }
              : undefined
          }
        >
          Admin
        </button>
      </div>

      {activeTab === "reviewer" && (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="relative overflow-x-auto">
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
                      key={`assign-audits-reviewer-skeleton-row-${rowIndex}`}
                      className="border-b border-zinc-100 last:border-b-0"
                    >
                      {table.getVisibleLeafColumns().map((column) => (
                        <td
                          key={`assign-audits-reviewer-skeleton-cell-${rowIndex}-${column.id}`}
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
                              width={column.id === "action" ? 76 : "70%"}
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
                      {emptyStateMessage}
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
        </div>
      )}

      {activeTab === "admin" && (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="relative overflow-x-auto">
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
                      key={`assign-audits-admin-skeleton-row-${rowIndex}`}
                      className="border-b border-zinc-100 last:border-b-0"
                    >
                      {table.getVisibleLeafColumns().map((column) => (
                        <td
                          key={`assign-audits-admin-skeleton-cell-${rowIndex}-${column.id}`}
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
                              width={column.id === "action" ? 76 : "70%"}
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
                      {emptyStateMessage}
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
        </div>
      )}
    </div>
  );
}
