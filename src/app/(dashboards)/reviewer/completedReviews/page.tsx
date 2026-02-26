"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";

interface CompletedReview {
  id: string;
  organization: string;
  certification: string;
  finalResult: "Approved" | "Conditionally Approved" | "Rejected";
  status: "Submitted" | "Close" | "Submitted";
}

const completedReviewsData: CompletedReview[] = [
  {
    id: "1",
    organization: "Grand Hyatt Singapore",
    certification: "ISO 14001 Environmental Certification",
    finalResult: "Approved",
    status: "Submitted",
  },
  {
    id: "2",
    organization: "Marina Bay Sands",
    certification: "Carbon Neutral Certification",
    finalResult: "Approved",
    status: "Close",
  },
  {
    id: "3",
    organization: "Raffles Hotel",
    certification: "Sustainable Supply Chain",
    finalResult: "Approved",
    status: "Submitted",
  },
  {
    id: "4",
    organization: "CapitaLand Group",
    certification: "ESG Reporting Excellence",
    finalResult: "Approved",
    status: "Close",
  },
  {
    id: "5",
    organization: "Mandarin Oriental",
    certification: "ISO 14001 Environmental Certification",
    finalResult: "Approved",
    status: "Close",
  },
  {
    id: "6",
    organization: "Far East Organization",
    certification: "ESG Reporting Excellence",
    finalResult: "Approved",
    status: "Submitted",
  },
];

export default function CompletedReviews() {
  const router = useRouter();

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Submitted":
        return "bg-green-50 text-green-600 border border-green-600";
      case "Close":
        return "bg-red-50 text-red-600 border border-red-600";
      default:
        return "bg-[#e9e9e9] text-black border border-black";
    }
  };

  const getResultStyles = (res: string) => {
    switch (res) {
      case "Approved":
        return "bg-[#f2fff7] text-[#00B448] border border-[#00B448]";
      case "Close":
        return "bg-[#fef7e5] text-[#FF0909] border border-[#FF0909]";
      case "Submitted":
        return "bg-[#f2ff7] text-[#00B448] border border-[#00B448]";
      case "Conditionally Approved":
        return "bg-white text-[#FAAB00] border border-[#FAAB00]";
      case "Rejected":
        return "bg-[#fef7e5] text-[#FF0909] border border-[#FF0909]";
      default:
        return "bg-white text-black border border-black";
    }
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
        accessorKey: "finalResult",
        header: () => (
          <span className="text-[12px] font-medium text-gray">
            Final Result
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className={`inline-flex items-center justify-center px-4 py-1.5 rounded-md text-sm font-medium leading-[100%] align-middle border min-w-[120px] md:min-w-[140px] text-center ${getResultStyles(getValue<string>())}`}
          >
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
          return (
            <div className="flex items-center justify-center gap-2 pl-8">
              <button
                className="p-2 rounded-md border"
                style={{ borderColor: "#9B9B9B" }}
                onClick={() => router.push("/reviewer/completedReviews/review")}
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
    [],
  );

  const table = useReactTable({
    data: completedReviewsData,
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
              {table.getRowModel().rows.length === 0 ? (
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
      </div>
    </div>
  );
}

