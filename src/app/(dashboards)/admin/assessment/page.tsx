"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
} from "@tanstack/react-table";
import axios from "axios";
import { axiosInstance } from "@/lib/axios";
import Dropdown from "../common/dropdown";
import { Loading } from "../common/Loading";

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  count: string;
}

type AssessmentApiItem = {
  assessmentId: string;
  organizationId: string;
  organizationName: string;
  certificationType: string;
  badgeStatus: string | null;
  badgeColor: string | null;
  assignedReviewer: string | null;
  aiFlagReason: string | null;
  assignedAuditor: string | null;
  flaggedDate: string | null;
  score: number | null;
  status: string;
  assessmentType: string;
  isCertificateBlocked?: boolean | null;
};

type AssessmentsApiResponse = {
  success: boolean;
  message: string;
  data?: {
    data?: AssessmentApiItem[];
    total?: number;
    page?: number;
    limit?: number;
  };
};

type AssessmentMetricsApiResponse = {
  success: boolean;
  data?: {
    totalAssessments: number;
    aiFlagged: number;
    pendingAudits: number;
    completed: number;
  };
};

type Assessment = {
  assessmentId: string;
  organizationName: string;
  certificationType: string;
  badgeStatus: string;
  badgeColor?: string | null;
  assignedReviewer: string;
  aiFlagReason: string;
  assignedAuditor: string;
  flaggedDate: string;
  score?: number | null;
  status: string;
  assessmentType: string;
  isCertificateBlocked: boolean;
};

type AssessmentFilters = {
  organizationId: string;
  status:
    | "all"
    | "in_progress"
    | "submitted"
    | "ai_reviewing"
    | "completed"
    | "expired";
  assessmentType: "all" | "self_disclosure" | "assured";
  startDate: string;
  endDate: string;
};

const formatCount = (value: number) => String(value).padStart(2, "0");

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function StatCard({ icon, title, count }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-3 md:p-6 shadow-sm">
      <div className="flex items-start gap-2 md:gap-4">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-md flex items-center justify-center shrink-0 border border-zinc-200">
          {icon}
        </div>

        <div className="flex-1">
          <h3
            className="text-gray mb-1 font-light md:text-[18px] text-[14px]"
            style={{
              color: "#060707",
            }}
          >
            {title}
          </h3>
          <p className="text-secondary font-medium md:text-[26px] text-[20px]">
            {count}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  const router = useRouter();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [data, setData] = useState<Assessment[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<
    AssessmentMetricsApiResponse["data"] | null
  >(null);
  const [isMetricsFetching, setIsMetricsFetching] = useState(false);
  const [showTableLoader, setShowTableLoader] = useState(false);
  const [tableLoadingProgress, setTableLoadingProgress] = useState(0);
  const tableLoaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const tableLoaderFinishTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<AssessmentFilters>({
    organizationId: "",
    status: "all",
    assessmentType: "all",
    startDate: "",
    endDate: "",
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const buildFilterParams = useCallback(() => {
    const params: Record<string, string> = {};

    if (filters.organizationId) params.organizationId = filters.organizationId;
    if (filters.status !== "all") params.status = filters.status;
    if (filters.assessmentType !== "all")
      params.assessmentType = filters.assessmentType;

    if (filters.startDate)
      params.startDate = `${filters.startDate}T00:00:00.000Z`;
    if (filters.endDate) params.endDate = `${filters.endDate}T23:59:59.999Z`;

    return params;
  }, [filters]);

  const fetchAssessmentMetrics = useCallback(async () => {
    setIsMetricsFetching(true);
    try {
      const response = await axiosInstance.get<AssessmentMetricsApiResponse>(
        "/admin/assessments/metrics",
      );
      console.log("assessment metrics response:", response.data);
      setMetrics(response.data?.data ?? null);
    } catch (err) {
      console.error("Failed to fetch assessment metrics:", err);
      setMetrics(null);
    } finally {
      setIsMetricsFetching(false);
    }
  }, []);

  const fetchAssessments = useCallback(async () => {
    setIsFetching(true);
    setError("");
    try {
      const response = await axiosInstance.get<AssessmentsApiResponse>(
        "/admin/assessments",
        {
          params: {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            ...buildFilterParams(),
          },
        },
      );
      console.log("assessments list response:", response.data);

      const items = response.data?.data?.data ?? [];
      const apiTotal = response.data?.data?.total;

      const mapped: Assessment[] = items.map((a) => ({
        assessmentId: a.assessmentId,
        organizationName: a.organizationName,
        certificationType: a.certificationType,
        badgeStatus: a.badgeStatus ?? "N/A",
        badgeColor: a.badgeColor,
        assignedReviewer: a.assignedReviewer ?? "Not Assigned",
        aiFlagReason: a.aiFlagReason ?? "N/A",
        assignedAuditor: a.assignedAuditor ?? "Not Assigned",
        flaggedDate: a.flaggedDate ? formatDate(a.flaggedDate) : "N/A",
        score: a.score,
        status: a.status,
        assessmentType: a.assessmentType,
        isCertificateBlocked: Boolean(a.isCertificateBlocked),
      }));
      console.log("assessments mapped data:", mapped);

      setData(mapped);
      setTotal(typeof apiTotal === "number" ? apiTotal : 0);
    } catch (err) {
      console.error("Failed to fetch assessments:", err);
      let errorMessage = "Failed to load assessments. Please try again.";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setError(errorMessage);
      setData([]);
      setTotal(0);
    } finally {
      setIsFetching(false);
    }
  }, [buildFilterParams, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  useEffect(() => {
    fetchAssessmentMetrics();
  }, [fetchAssessmentMetrics]);

  useEffect(() => {
    if (tableLoaderIntervalRef.current) {
      clearInterval(tableLoaderIntervalRef.current);
      tableLoaderIntervalRef.current = null;
    }
    if (tableLoaderFinishTimeoutRef.current) {
      clearTimeout(tableLoaderFinishTimeoutRef.current);
      tableLoaderFinishTimeoutRef.current = null;
    }

    if (isFetching) {
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
  }, [isFetching, showTableLoader]);

  useEffect(() => {
    setPagination((prev) =>
      prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
    );
  }, [
    filters.assessmentType,
    filters.endDate,
    filters.startDate,
    filters.status,
    filters.organizationId,
  ]);

  const columns = useMemo<ColumnDef<Assessment>[]>(
    () => [
      {
        accessorKey: "organizationName",
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
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray underline cursor-pointer block w-full truncate"
            style={{ letterSpacing: "1%" }}
            title={getValue<string>()}
          >
            {getValue<string>()}
          </span>
        ),
        size: 220,
        minSize: 180,
        maxSize: 260,
      },
      {
        accessorKey: "certificationType",
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
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray block w-full truncate"
            style={{ letterSpacing: "1%" }}
            title={getValue<string>()}
          >
            {getValue<string>()}
          </span>
        ),
        size: 220,
        minSize: 180,
        maxSize: 260,
      },
      {
        accessorKey: "badgeStatus",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Badge
          </span>
        ),
        cell: ({ row, getValue }) => {
          const badge = getValue<string>();
          const badgeColor = row.original.badgeColor;
          return (
            <span
              className="inline-flex items-center justify-center px-2 py-1 md:py-2 rounded-full text-[9px] md:text-xs font-medium leading-[100%] align-middle whitespace-nowrap border"
              style={
                badgeColor
                  ? {
                      backgroundColor: `${badgeColor}14`,
                      color: badgeColor,
                      borderColor: `${badgeColor}55`,
                    }
                  : undefined
              }
            >
              {badge}
            </span>
          );
        },
        size: 180,
        minSize: 160,
        maxSize: 260,
      },
      {
        accessorKey: "assignedReviewer",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Assigned Reviewer
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray block w-full truncate"
            style={{ letterSpacing: "1%" }}
            title={getValue<string>()}
          >
            {getValue<string>()}
          </span>
        ),
        size: 160,
        minSize: 140,
        maxSize: 200,
      },
      {
        accessorKey: "aiFlagReason",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            AI Flag Reason
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray block w-full truncate"
            style={{ letterSpacing: "1%" }}
            title={getValue<string>()}
          >
            {getValue<string>()}
          </span>
        ),
        size: 220,
        minSize: 180,
        maxSize: 260,
      },
      {
        accessorKey: "assignedAuditor",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Assigned Auditor
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray block w-full truncate"
            style={{ letterSpacing: "1%" }}
            title={getValue<string>()}
          >
            {getValue<string>()}
          </span>
        ),
        size: 160,
        minSize: 140,
        maxSize: 200,
      },
      {
        accessorKey: "flaggedDate",
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
        id: "blockStatus",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle text-center block"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Status
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            {row.original.isCertificateBlocked ? (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] md:text-xs font-medium whitespace-nowrap bg-white text-red-600 border border-red-500">
                Blocked
              </span>
            ) : (
              <span className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray">
                ----
              </span>
            )}
          </div>
        ),
        enableSorting: false,
        size: 110,
        minSize: 95,
        maxSize: 130,
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
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <button
              onClick={() =>
                router.push(
                  `/admin/assessment/details?id=${row.original.assessmentId}`,
                )
              }
              className="px-2 py-1 md:px-3 md:py-1.5 border border-black rounded-lg text-[9px] md:text-xs font-normal text-secondary hover:bg-zinc-50 transition-colors whitespace-nowrap"
            >
              View Details
            </button>
          </div>
        ),
        enableSorting: false,
        size: 120,
        minSize: 100,
        maxSize: 140,
      },
    ],
    [router],
  );

  const pageCount = useMemo(() => {
    if (total > 0) return Math.max(1, Math.ceil(total / pagination.pageSize));
    if (pagination.pageIndex === 0 && data.length === 0) return 1;
    const hasNextPage = data.length === pagination.pageSize;
    return pagination.pageIndex + (hasNextPage ? 2 : 1);
  }, [data.length, pagination.pageIndex, pagination.pageSize, total]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    pageCount,
    state: {
      rowSelection,
      pagination,
    },
    onPaginationChange: setPagination,
    enableRowSelection: true,
  });

  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen flex flex-col">
      <div className="flex flex-row items-start justify-between mb-4 md:mb-6 gap-3">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
            Assessments
          </h1>
          <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
            All submitted self-assessments and audits
          </p>
        </div>
        <button
          onClick={() => setIsFilterOpen(true)}
          disabled={isFetching}
          className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 border border-black"
        >
          <img
            src="/assets/imgs/admin/commons/filter.svg"
            alt="Filter"
            className="w-6 h-6 md:w-7 md:h-7"
          />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-lg">
          <p className="text-sm font-semibold text-red">{error}</p>
        </div>
      )}

      {isFilterOpen && (
        <div className="mb-4 md:mb-6">
          <div className="flex items-start justify-between gap-3 bg-white rounded-xl border border-zinc-100 shadow-sm p-3 md:p-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 md:gap-3 flex-1">
              <Dropdown
                className="w-full lg:w-[190px]"
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: e.target.value as AssessmentFilters["status"],
                  }))
                }
                placeholder=""
                options={[
                  { value: "all", label: "All Status" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "submitted", label: "Submitted" },
                  { value: "ai_reviewing", label: "AI Reviewing" },
                  { value: "completed", label: "Completed" },
                  { value: "expired", label: "Expired" },
                ]}
              />
              <Dropdown
                className="w-full lg:w-[190px]"
                value={filters.assessmentType}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    assessmentType: e.target
                      .value as AssessmentFilters["assessmentType"],
                  }))
                }
                placeholder=""
                options={[
                  { value: "all", label: "All Types" },
                  { value: "self_disclosure", label: "Self Disclosure" },
                  { value: "assured", label: "Assured" },
                ]}
              />

              <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="w-full sm:w-[160px] px-3 md:px-4 py-2 md:py-2.5 border border-zinc-200 rounded-lg text-secondary focus:outline-none focus:ring-2 focus:ring-zinc-200 text-[13px] md:text-[14px]"
                />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className="w-full sm:w-[160px] px-3 md:px-4 py-2 md:py-2.5 border border-zinc-200 rounded-lg text-secondary focus:outline-none focus:ring-2 focus:ring-zinc-200 text-[13px] md:text-[14px]"
                />
              </div>
            </div>
            <button
              onClick={() => {
                setFilters({
                  organizationId: "",
                  status: "all",
                  assessmentType: "all",
                  startDate: "",
                  endDate: "",
                });
                setIsFilterOpen(false);
              }}
              className="p-2 md:p-2 border border-black-200 rounded-lg hover:bg-zinc-50 transition-colors shrink-0 flex items-center justify-center"
              aria-label="Reset filters"
              title="Reset filters"
              disabled={isFetching}
            >
              <img
                src="/assets/imgs/admin/commons/cross.svg"
                alt="Reset"
                className="w-4 h-4 md:w-5 md:h-5"
              />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.8333 2.5H4.16667C3.25 2.5 2.5 3.25 2.5 4.16667V15.8333C2.5 16.75 3.25 17.5 4.16667 17.5H15.8333C16.75 17.5 17.5 16.75 17.5 15.8333V4.16667C17.5 3.25 16.75 2.5 15.8333 2.5ZM7.5 14.1667H5.83333V8.33333H7.5V14.1667ZM10.8333 14.1667H9.16667V5.83333H10.8333V14.1667ZM14.1667 14.1667H12.5V10.8333H14.1667V14.1667Z"
                fill="#262626"
              />
            </svg>
          }
          title="Total Assessments"
          count={
            isMetricsFetching
              ? "--"
              : metrics
                ? formatCount(metrics.totalAssessments)
                : "--"
          }
        />
        <StatCard
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.27088 17.5C2.1181 17.5 1.97921 17.4619 1.85421 17.3858C1.72921 17.3097 1.63199 17.2089 1.56254 17.0833C1.4931 16.9578 1.45504 16.8222 1.44838 16.6767C1.44171 16.5311 1.47977 16.3889 1.56254 16.25L9.27088 2.91667C9.35421 2.77778 9.46199 2.67361 9.59421 2.60417C9.72643 2.53472 9.86171 2.5 10 2.5C10.1384 2.5 10.2739 2.53472 10.4067 2.60417C10.5395 2.67361 10.647 2.77778 10.7292 2.91667L18.4375 16.25C18.5209 16.3889 18.5592 16.5314 18.5525 16.6775C18.5459 16.8236 18.5075 16.9589 18.4375 17.0833C18.3675 17.2078 18.2703 17.3086 18.1459 17.3858C18.0214 17.4631 17.8825 17.5011 17.7292 17.5H2.27088ZM10 15C10.2362 15 10.4342 14.92 10.5942 14.76C10.7542 14.6 10.8339 14.4022 10.8334 14.1667C10.8328 13.9311 10.7528 13.7333 10.5934 13.5733C10.4339 13.4133 10.2362 13.3333 10 13.3333C9.76393 13.3333 9.56616 13.4133 9.40671 13.5733C9.24727 13.7333 9.16727 13.9311 9.16671 14.1667C9.16615 14.4022 9.24616 14.6003 9.40671 14.7608C9.56727 14.9214 9.76504 15.0011 10 15ZM10 12.5C10.2362 12.5 10.4342 12.42 10.5942 12.26C10.7542 12.1 10.8339 11.9022 10.8334 11.6667V9.16667C10.8334 8.93056 10.7534 8.73278 10.5934 8.57333C10.4334 8.41389 10.2356 8.33389 10 8.33333C9.76449 8.33278 9.56671 8.41278 9.40671 8.57333C9.24671 8.73389 9.16671 8.93167 9.16671 9.16667V11.6667C9.16671 11.9028 9.24671 12.1008 9.40671 12.2608C9.56671 12.4208 9.76449 12.5006 10 12.5Z"
                fill="#262626"
              />
            </svg>
          }
          title="AI Flagged"
          count={
            isMetricsFetching
              ? "--"
              : metrics
                ? formatCount(metrics.aiFlagged)
                : "--"
          }
        />
        <StatCard
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.875 2.08333C11.875 2.02808 11.853 1.97509 11.8139 1.93602C11.7749 1.89695 11.7219 1.875 11.6666 1.875H5.83329C5.2255 1.875 4.64261 2.11644 4.21284 2.54621C3.78307 2.97598 3.54163 3.55888 3.54163 4.16667V15.8333C3.54163 16.4411 3.78307 17.024 4.21284 17.4538C4.64261 17.8836 5.2255 18.125 5.83329 18.125H14.1666C14.7744 18.125 15.3573 17.8836 15.7871 17.4538C16.2169 17.024 16.4583 16.4411 16.4583 15.8333V7.6225C16.4583 7.56725 16.4363 7.51426 16.3973 7.47519C16.3582 7.43612 16.3052 7.41417 16.25 7.41417H12.5C12.3342 7.41417 12.1752 7.34832 12.058 7.23111C11.9408 7.1139 11.875 6.95493 11.875 6.78917V2.08333ZM12.5 10.2083C12.6657 10.2083 12.8247 10.2742 12.9419 10.3914C13.0591 10.5086 13.125 10.6676 13.125 10.8333C13.125 10.9991 13.0591 11.1581 12.9419 11.2753C12.8247 11.3925 12.6657 11.4583 12.5 11.4583H7.49996C7.3342 11.4583 7.17523 11.3925 7.05802 11.2753C6.94081 11.1581 6.87496 10.9991 6.87496 10.8333C6.87496 10.6676 6.94081 10.5086 7.05802 10.3914C7.17523 10.2742 7.3342 10.2083 7.49996 10.2083H12.5ZM12.5 13.5417C12.6657 13.5417 12.8247 13.6075 12.9419 13.7247C13.0591 13.8419 13.125 14.0009 13.125 14.1667C13.125 14.3324 13.0591 14.4914 12.9419 14.6086C12.8247 14.7258 12.6657 14.7917 12.5 14.7917H7.49996C7.3342 14.7917 7.17523 14.7258 7.05802 14.6086C6.94081 14.4914 6.87496 14.3324 6.87496 14.1667C6.87496 14.0009 6.94081 13.8419 7.05802 13.7247C7.17523 13.6075 7.3342 13.5417 7.49996 13.5417H12.5Z"
                fill="#262626"
              />
              <path
                d="M13.125 2.35322C13.125 2.19988 13.2858 2.10238 13.405 2.19822C13.5061 2.27988 13.5958 2.37488 13.6742 2.48322L16.185 5.98072C16.2417 6.06072 16.18 6.16405 16.0817 6.16405H13.3333C13.2781 6.16405 13.2251 6.1421 13.186 6.10303C13.1469 6.06396 13.125 6.01097 13.125 5.95572V2.35322Z"
                fill="#262626"
              />
            </svg>
          }
          title="Pending Audits"
          count={
            isMetricsFetching
              ? "--"
              : metrics
                ? formatCount(metrics.pendingAudits)
                : "--"
          }
        />
        <StatCard
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 1.6665C5.41669 1.6665 1.66669 5.4165 1.66669 9.99984C1.66669 14.5832 5.41669 18.3332 10 18.3332C14.5834 18.3332 18.3334 14.5832 18.3334 9.99984C18.3334 5.4165 14.5834 1.6665 10 1.6665ZM8.33335 14.1665L4.16669 9.99984L5.34169 8.82484L8.33335 11.8082L14.6584 5.48317L15.8334 6.6665L8.33335 14.1665Z"
                fill="#262626"
              />
            </svg>
          }
          title="Completed"
          count={
            isMetricsFetching
              ? "--"
              : metrics
                ? formatCount(metrics.completed)
                : "--"
          }
        />
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
                        header.id === "action" || header.id === "blockStatus"
                          ? "text-center"
                          : "text-left"
                      }`}
                      style={{
                        width: `${header.column.getSize()}px`,
                        minWidth: `${header.column.columnDef.minSize || 100}px`,
                        maxWidth: header.column.columnDef.maxSize
                          ? `${header.column.columnDef.maxSize}px`
                          : undefined,
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
            <tbody className={showTableLoader ? "h-full" : ""}>
              {showTableLoader ? null : table.getRowModel().rows.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-gray text-sm"
                  >
                    No assessments found
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
                          cell.column.id === "action" ||
                          cell.column.id === "blockStatus"
                            ? "text-center"
                            : ""
                        }`}
                        style={{
                          width: `${cell.column.getSize()}px`,
                          minWidth: `${cell.column.columnDef.minSize || 100}px`,
                          maxWidth: cell.column.columnDef.maxSize
                            ? `${cell.column.columnDef.maxSize}px`
                            : undefined,
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
              disabled={isFetching || !table.getCanPreviousPage()}
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
              disabled={isFetching || !table.getCanNextPage()}
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
