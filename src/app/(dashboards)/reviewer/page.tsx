"use client";

import { useEffect, useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import Button from "../admin/common/button";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  icon: string;
}

function StatCard({ label, value, trend, icon }: StatCardProps) {
  const isPositive = trend.startsWith("+");

  return (
    <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm min-h-[140px] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <img src={icon} alt={label} className="w-12 h-12" />
        <span
          className={`text-[14px] font-medium text-center leading-[14px] align-middle ${
            isPositive ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend}
        </span>
      </div>
      <div>
        <p
          className="text-sm md:text-[16px] font-normal md:leading-[24px] align-middle mb-2 px-2"
          style={{ color: "#060707" }}
        >
          {label}
        </p>
        <p className="text-[26px] font-medium text-secondary leading-[31.2px] align-middle px-2">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm min-h-[140px] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <Skeleton width={48} height={48} borderRadius={8} />
        <Skeleton width={46} height={14} borderRadius={6} />
      </div>
      <div>
        <Skeleton width="70%" height={18} borderRadius={6} className="mb-2" />
        <Skeleton width="35%" height={30} borderRadius={6} />
      </div>
    </div>
  );
}

const selfAssessmentCards = [
  {
    label: "Total Certificates",
    value: "52",
    trend: "+12%",
    icon: "/assets/imgs/admin/dashboard/totalSold.svg",
  },
  {
    label: "Pending Review (AI Flags)",
    value: "11",
    trend: "+8%",
    icon: "/assets/imgs/admin/dashboard/inProgress.svg",
  },
  {
    label: "Completed",
    value: "19",
    trend: "-5%",
    icon: "/assets/imgs/admin/dashboard/completed.svg",
  },
  {
    label: "Clarifications Pending",
    value: "15",
    trend: "+3%",
    icon: "/assets/imgs/admin/dashboard/idle.svg",
  },
];

const assuredCertificationCards = [
  {
    label: "Total Certificates",
    value: "96",
    trend: "+12%",
    icon: "/assets/imgs/admin/dashboard/totalSold.svg",
  },
  {
    label: "Sent to Auditor",
    value: "34",
    trend: "+8%",
    icon: "/assets/imgs/admin/dashboard/inProgress.svg",
  },
  {
    label: "Accepted by Auditor",
    value: "41",
    trend: "-5%",
    icon: "/assets/imgs/admin/dashboard/completed.svg",
  },
  {
    label: "Pending Reviews",
    value: "21",
    trend: "+3%",
    icon: "/assets/imgs/admin/dashboard/idle.svg",
  },
];

interface AssignedAudit {
  id: string;
  organization: string;
  certification: string;
  startDate: string;
  time: string;
  dueDate: string;
  status: "In Progress" | "Pending" | "Overdue";
}

const assignedAuditsData: AssignedAudit[] = [
  {
    id: "1",
    organization: "Grand Hyatt Singapore",
    certification: "ISO 14001 Environmental Management",
    startDate: "Dec 20, 2024",
    time: "02:00 PM",
    dueDate: "Dec 20, 2024",
    status: "In Progress",
  },
  {
    id: "2",
    organization: "Marina Bay Sands",
    certification: "Carbon Neutral Certification",
    startDate: "Dec 20, 2024",
    time: "02:00 PM",
    dueDate: "Dec 20, 2024",
    status: "Pending",
  },
  {
    id: "3",
    organization: "Raffles Hotel",
    certification: "Sustainable Supply Chain Certification",
    startDate: "Dec 20, 2024",
    time: "02:00 PM",
    dueDate: "Dec 20, 2024",
    status: "Pending",
  },
  {
    id: "4",
    organization: "CapitaLand Group",
    certification: "ESG Reporting Excellence",
    startDate: "Dec 20, 2024",
    time: "02:00 PM",
    dueDate: "Dec 20, 2024",
    status: "Overdue",
  },
  {
    id: "5",
    organization: "DBS Bank",
    certification: "Green Building Certification",
    startDate: "Dec 21, 2024",
    time: "10:00 AM",
    dueDate: "Dec 25, 2024",
    status: "In Progress",
  },
  {
    id: "6",
    organization: "Singapore Airlines",
    certification: "Carbon Offset Program",
    startDate: "Dec 22, 2024",
    time: "03:00 PM",
    dueDate: "Dec 28, 2024",
    status: "Pending",
  },
];

const upcomingDeadlinesData = [
  {
    id: "1",
    organization: "GreenTech Solutions",
    certification: "ISO 14001:2015",
    daysLeft: 2,
    date: "Jan 2, 2025",
    status: "overdue",
  },
  {
    id: "2",
    organization: "GreenTech Solutions",
    certification: "ISO 14001:2015",
    daysLeft: 5,
    date: "Jan 2, 2025",
    status: "pending",
  },
  {
    id: "3",
    organization: "Sustainable Corp",
    certification: "ISO 45001:2018",
    daysLeft: 8,
    date: "Jan 2, 2025",
    status: "pending",
  },
  {
    id: "4",
    organization: "Sustainable Corp",
    certification: "ISO 45001:2018",
    daysLeft: 8,
    date: "Jan 2, 2025",
    status: "pending",
  },
  {
    id: "5",
    organization: "Sustainable Corp",
    certification: "ISO 45001:2018",
    daysLeft: 8,
    date: "Jan 2, 2025",
    status: "pending",
  },
];

export default function AuditorDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [showAllAudits, setShowAllAudits] = useState(false);
  const [showAllDeadlines, setShowAllDeadlines] = useState(false);
  const hasMoreAudits = assignedAuditsData.length > 3;
  const hasMoreDeadlines = upcomingDeadlinesData.length > 3;
  const displayedData = showAllAudits
    ? assignedAuditsData
    : assignedAuditsData.slice(0, 4);
  const displayedDeadlines = showAllDeadlines
    ? upcomingDeadlinesData
    : upcomingDeadlinesData.slice(0, 3);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "In Progress":
        return "bg-[#e9e9e9] border border-black";
      case "Pending":
        return "bg-[#fef7e5] text-[#FAAB00] border border-[#FAAB00]";
      case "Overdue":
        return "bg-[#fef7e5] text-[#FF0909] border border-[#FF0909]";
      default:
        return "bg-[#e9e9e9] border border-black";
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
          return (
            <div className="flex items-center justify-end">
              <button
                className="px-8 py-1.5 text-[12px] md:text-sm font-medium border border-black rounded-lg"
                style={{ backgroundColor: "#262626", color: "#fff" }}
                onClick={() => console.log("Audit clicked:", row.id)}
              >
                Audit
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
    data: displayedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 600);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="p-6 bg-light-gray min-h-screen">
      <div className="mb-8">
        <h1 className="text-[24px] font-semibold text-secondary mb-2 leading-[21.6px] align-middle">
          Dashboard
        </h1>
        <p className="text-[15px] font-normal text-gray leading-[21.6px] align-middle">
          Overview of your reviewers assignments and progress
        </p>
      </div>
      <div className="mb-10">
        <h2 className="text-[20px] font-semibold text-secondary mb-4 leading-[21.6px] align-middle">
          Assured Certification
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {isLoading
            ? selfAssessmentCards.map((_, index) => (
                <StatCardSkeleton key={`reviewer-self-assessment-skeleton-${index}`} />
              ))
            : selfAssessmentCards.map((card, index) => (
                <StatCard
                  key={`self-assessment-${index}`}
                  label={card.label}
                  value={card.value}
                  trend={(card as any).trend || ""}
                  icon={card.icon}
                />
              ))}
        </div>

        <h2 className="text-[20px] font-semibold text-secondary mb-4 leading-[21.6px] align-middle">
          Assured Certification
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {isLoading
            ? assuredCertificationCards.map((_, index) => (
                <StatCardSkeleton key={`reviewer-assured-certification-skeleton-${index}`} />
              ))
            : assuredCertificationCards.map((card, index) => (
                <StatCard
                  key={`assured-certification-${index}`}
                  label={card.label}
                  value={card.value}
                  trend={(card as any).trend || ""}
                  icon={card.icon}
                />
              ))}
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <div className="flex items-center justify-between py-1">
            <h2 className="text-base font-semibold text-secondary">
              Assigned Reviewers
            </h2>
            {hasMoreAudits && !showAllAudits && !isLoading && (
              <button
                onClick={() => setShowAllAudits(true)}
                className="px-3 py-1.5 border bg-white border-black rounded-lg text-xs font-medium text-secondary hover:bg-gray-50 transition-colors"
              >
                View All
              </button>
            )}
          </div>
          <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table
                className="w-full min-w-250"
                style={{ tableLayout: "fixed" }}
              >
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-zinc-100"
                    >
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
                    Array.from({ length: 4 }).map((_, rowIndex) => (
                      <tr
                        key={`reviewer-dashboard-assigned-skeleton-row-${rowIndex}`}
                        className="border-b border-zinc-100 last:border-b-0"
                      >
                        {table.getVisibleLeafColumns().map((column) => (
                          <td
                            key={`reviewer-dashboard-assigned-skeleton-cell-${rowIndex}-${column.id}`}
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

          <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-4 md:p-6 flex flex-col gap-4 mt-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 py-1">
              <h2 className="text-base font-semibold text-secondary">
                Upcoming Deadlines
              </h2>
              {hasMoreDeadlines && !showAllDeadlines && !isLoading && (
                <button
                  onClick={() => setShowAllDeadlines(true)}
                  className="px-3 py-1.5 border border-black rounded-lg text-xs font-medium text-secondary hover:bg-gray-50 transition-colors"
                >
                  View All
                </button>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`reviewer-dashboard-deadline-skeleton-${index}`}
                      className="p-4 rounded-xl relative overflow-hidden bg-white border border-zinc-100"
                    >
                      <div className="flex items-start gap-4">
                        <Skeleton width={32} height={32} borderRadius={8} />
                        <div className="flex-1 min-w-0">
                          <Skeleton width="55%" height={18} borderRadius={6} />
                          <Skeleton
                            width="72%"
                            height={14}
                            borderRadius={6}
                            className="mt-2"
                          />
                        </div>
                        <div className="shrink-0 text-right">
                          <Skeleton width={72} height={14} borderRadius={6} />
                          <Skeleton
                            width={64}
                            height={12}
                            borderRadius={6}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                : displayedDeadlines.map((deadline) => (
                    <div
                      key={deadline.id}
                      className={`p-4 rounded-xl relative overflow-hidden ${
                        deadline.status === "overdue"
                          ? "bg-[#fef2f2]"
                          : "bg-[#fef7e5]"
                      }`}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
                        style={{
                          backgroundColor:
                            deadline.status === "overdue" ? "#FF0909" : "#FAAB00",
                        }}
                      ></div>
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          {deadline.status === "overdue" ? (
                            <svg
                              width="32"
                              height="32"
                              viewBox="0 0 32 32"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M3.63332 28C3.38888 28 3.16666 27.9391 2.96666 27.8173C2.76666 27.6956 2.6111 27.5342 2.49999 27.3333C2.38888 27.1324 2.32799 26.9156 2.31732 26.6827C2.30666 26.4498 2.36755 26.2222 2.49999 26L14.8333 4.66667C14.9667 4.44444 15.1391 4.27778 15.3507 4.16667C15.5622 4.05556 15.7787 4 16 4C16.2213 4 16.4382 4.05556 16.6507 4.16667C16.8631 4.27778 17.0351 4.44444 17.1667 4.66667L29.5 26C29.6333 26.2222 29.6947 26.4502 29.684 26.684C29.6733 26.9178 29.612 27.1342 29.5 27.3333C29.388 27.5324 29.2324 27.6938 29.0333 27.8173C28.8342 27.9409 28.612 28.0018 28.3667 28H3.63332ZM16 24C16.3778 24 16.6947 23.872 16.9507 23.616C17.2067 23.36 17.3342 23.0436 17.3333 22.6667C17.3324 22.2898 17.2044 21.9733 16.9493 21.7173C16.6942 21.4613 16.3778 21.3333 16 21.3333C15.6222 21.3333 15.3058 21.4613 15.0507 21.7173C14.7955 21.9733 14.6675 22.2898 14.6667 22.6667C14.6658 23.0436 14.7938 23.3604 15.0507 23.6173C15.3075 23.8742 15.624 24.0018 16 24ZM16 20C16.3778 20 16.6947 19.872 16.9507 19.616C17.2067 19.36 17.3342 19.0436 17.3333 18.6667V14.6667C17.3333 14.2889 17.2053 13.9724 16.9493 13.7173C16.6933 13.4622 16.3769 13.3342 16 13.3333C15.6231 13.3324 15.3067 13.4604 15.0507 13.7173C14.7947 13.9742 14.6667 14.2907 14.6667 14.6667V18.6667C14.6667 19.0444 14.7947 19.3613 15.0507 19.6173C15.3067 19.8733 15.6231 20.0009 16 20Z"
                                fill="#FF0909"
                              />
                            </svg>
                          ) : (
                            <svg
                              width="32"
                              height="32"
                              viewBox="0 0 32 32"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M16 2.66669C23.364 2.66669 29.3333 8.63602 29.3333 16C29.3333 23.364 23.364 29.3334 16 29.3334C8.63599 29.3334 2.66666 23.364 2.66666 16C2.66666 8.63602 8.63599 2.66669 16 2.66669ZM16 8.00002C15.6464 8.00002 15.3072 8.1405 15.0572 8.39054C14.8071 8.64059 14.6667 8.97973 14.6667 9.33335V16C14.6667 16.3536 14.8073 16.6927 15.0573 16.9427L19.0573 20.9427C19.3088 21.1856 19.6456 21.32 19.9952 21.3169C20.3448 21.3139 20.6792 21.1737 20.9264 20.9264C21.1736 20.6792 21.3138 20.3448 21.3169 19.9952C21.3199 19.6456 21.1855 19.3088 20.9427 19.0574L17.3333 15.448V9.33335C17.3333 8.97973 17.1928 8.64059 16.9428 8.39054C16.6927 8.1405 16.3536 8.00002 16 8.00002Z"
                                fill="#FAAB00"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-secondary mb-1">
                            {deadline.organization}
                          </h3>
                          <p className="text-sm text-gray">
                            {deadline.certification}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={`text-sm font-semibold mb-1 ${
                              deadline.status === "overdue"
                                ? "text-[#FF0909]"
                                : "text-[#FAAB00]"
                            }`}
                          >
                            {deadline.daysLeft} days left
                          </p>
                          <p className="text-xs text-gray">{deadline.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
