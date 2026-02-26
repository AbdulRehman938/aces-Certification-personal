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

interface AssignedAudit {
  id: string;
  organization: string;
  certification: string;
  startDate: string;
  time: string;
  dueDate: string;
  status: "In Progress" | "Pending" | "Overdue" | "Submitted";
}

const assignedAuditsData: AssignedAudit[] = [
  {
    id: "1",
    organization: "Grand Hyatt....",
    certification: "ISO 14001 Environment....",
    startDate: "Dec 20, 2024",
    time: "02:00 PM",
    dueDate: "Dec 20, 2024",
    status: "In Progress",
  },
  {
    id: "2",
    organization: "Marina Bay....",
    certification: "Carbon Neutral Certif....",
    startDate: "Dec 20, 2024",
    time: "02:00 PM",
    dueDate: "Dec 20, 2024",
    status: "Pending",
  },
  {
    id: "3",
    organization: "Raffles Hotel",
    certification: "Sustainable Supply....",
    startDate: "Dec 20, 2024",
    time: "02:00 PM",
    dueDate: "Dec 20, 2024",
    status: "Pending",
  },
  {
    id: "4",
    organization: "CapitaLand....",
    certification: "ESG Reporting Excell....",
    startDate: "Dec 20, 2024",
    time: "02:00 PM",
    dueDate: "Dec 20, 2024",
    status: "Overdue",
  },
  {
    id: "5",
    organization: "Mandarin Or....",
    certification: "ISO 14001 Environmen....",
    startDate: "Dec 20, 2024",
    time: "02:00 PM",
    dueDate: "Dec 20, 2024",
    status: "Submitted",
  },
  {
    id: "6",
    organization: "Far East Or....",
    certification: "ESG Reporting Excell....",
    startDate: "Dec 20, 2024",
    time: "02:00 PM",
    dueDate: "Dec 20, 2024",
    status: "Pending",
  },
];

export default function AssignAudits() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"reviewer" | "admin">("reviewer");

  useEffect(() => {
    const fetchAssignedAssessments = async () => {
      try {
        const response = await axiosInstance.get(
          "/auditors/assigned-assessments",
        );
        console.log("assigned assessments response:", response);
        console.log("assigned assessments data:", response.data);
      } catch (error) {
        console.error("Failed to fetch assigned assessments:", error);
      }
    };

    fetchAssignedAssessments();
  }, []);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "In Progress":
        return "bg-[#e9e9e9] text-black border border-black";
      case "Pending":
        return "bg-[#fef7e5] text-[#FAAB00] border border-[#FAAB00]";
      case "Overdue":
        return "bg-red-50 text-red-600 border border-red-600";
      case "Submitted":
        return "bg-green-50 text-green-600 border border-green-600";
      default:
        return "bg-[#e9e9e9] text-black border border-black";
    }
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
        cell: (info: any) => {
          const row = info.row.original as AssignedAudit;
          const showViewButton =
            row.status === "Overdue" || row.status === "Submitted";
          return (
            <div className="flex items-center justify-end">
              <button
                className={`px-8 py-1.5 text-[12px] md:text-sm font-medium border border-black rounded-lg ${
                  showViewButton
                    ? "bg-white text-secondary"
                    : "bg-[#262626] text-white"
                }`}
                onClick={() => router.push("/auditor/assignAudits/review")}
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
    [],
  );

  const table = useReactTable({
    data: assignedAuditsData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen">
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
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-250"
              style={{ tableLayout: "fixed" }}
            >
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
                {table.getRowModel().rows.length === 0 ? (
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
        </div>
      )}

      {activeTab === "admin" && (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-250"
              style={{ tableLayout: "fixed" }}
            >
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
                {table.getRowModel().rows.length === 0 ? (
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
        </div>
      )}
    </div>
  );
}

