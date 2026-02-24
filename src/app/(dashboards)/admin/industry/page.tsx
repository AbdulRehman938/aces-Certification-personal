"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import axios from "axios";
import { axiosInstance } from "@/lib/axios";
import { Loading } from "../common/Loading";
import { useUser } from "@/contexts/UserContext";

type Industry = {
  id: string;
  name: string;
  updated_at?: string;
};

interface IndustriesResponse {
  message: string;
  data: {
    data: Industry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export default function IndustryPage() {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { profile } = useUser();
  const [data, setData] = useState<Industry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState<Industry | null>(null);
  const [deletingIndustry, setDeletingIndustry] = useState<Industry | null>(null);
  const [industryName, setIndustryName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTableLoader, setShowTableLoader] = useState(false);
  const [tableLoadingProgress, setTableLoadingProgress] = useState(0);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [modalError, setModalError] = useState("");
  const [editModalError, setEditModalError] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [paginationMeta, setPaginationMeta] = useState({
    total: 0,
    totalPages: 0,
  });
  const tableLoaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tableLoaderFinishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isListLoading = isLoading && !isModalOpen && !isEditModalOpen && !isDeleteModalOpen;
  const isSubadmin = profile?.role === "subadmin";
  const permissions = Array.isArray(profile?.permissions)
    ? (profile.permissions as Array<
        string | { resource?: string; action?: string[] }
      >)
    : [];
  const hasActionPermission = (
    resource: string,
    action: "read" | "write" | "edit" | "delete",
  ) => {
    if (!isSubadmin) return true;
    if (!permissions.length) return false;
    return permissions.some((permission) => {
      if (typeof permission === "string") {
        return action === "read" && permission === resource;
      }
      const actions = Array.isArray(permission.action) ? permission.action : [];
      return permission.resource === resource && actions.includes(action);
    });
  };
  const canWrite = hasActionPermission("industry", "write");
  const canEdit = hasActionPermission("industry", "edit");
  const canDelete = hasActionPermission("industry", "delete");

  const CheckboxColumn: ColumnDef<Industry> = {
    id: "select",
    header: () => (
      <span
        className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
        style={{ color: "#9B9B9B", letterSpacing: "1%" }}
      >
        Industry Name
      </span>
    ),
    cell: ({ row }) => (
      <span
        className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray truncate"
        style={{ letterSpacing: "1%" }}
      >
        {row.original.name}
      </span>
    ),
    enableSorting: false,
    enableHiding: false,
  };

  const columns = useMemo<ColumnDef<Industry>[]>(
    () => [
      CheckboxColumn,
      {
        id: "action",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Action
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1 md:gap-2">
            <button
              onClick={
                canEdit
                  ? () => {
                      setEditingIndustry(row.original);
                      setIndustryName(row.original.name);
                      setEditModalError("");
                      setIsEditModalOpen(true);
                    }
                  : undefined
              }
              disabled={!canEdit}
              className={`px-2 py-0.5 md:px-5 rounded-lg text-[9px] md:text-[11px] font-normal leading-[22px] align-middle whitespace-nowrap shrink-0 transition-colors ${
                canEdit
                  ? "bg-dull-gray text-primary hover:bg-dull-gray/90"
                  : "bg-dull-gray/40 text-primary/50 cursor-not-allowed"
              }`}
              style={{ letterSpacing: "0%" }}
            >
              Edit
            </button>
            <button
              onClick={
                canDelete
                  ? () => {
                      setDeletingIndustry(row.original);
                      setIsDeleteModalOpen(true);
                    }
                  : undefined
              }
              disabled={!canDelete}
              className={`px-2 py-0.5 md:px-6 rounded-lg text-[9px] md:text-[11px] font-normal leading-[22px] align-middle whitespace-nowrap shrink-0 transition-colors ${
                canDelete
                  ? "bg-zinc-100 text-secondary hover:bg-zinc-200"
                  : "bg-zinc-100/50 text-secondary/50 cursor-not-allowed"
              }`}
              style={{ letterSpacing: "0%" }}
            >
              Delete
            </button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [CheckboxColumn, canDelete, canEdit]
  );

  
  const fetchIndustries = async (pageIndex: number, pageSize: number) => {
    setIsLoading(true);
    setError("");
    try {
      
      const apiPage = pageIndex + 1;
      const response = await axiosInstance.get<IndustriesResponse>(
        `/industries?page=${apiPage}&limit=${pageSize}`
      );      
      const industriesData = response.data?.data?.data || [];
      const meta = response.data?.data || { total: 0, totalPages: 0 };
      
      setData(industriesData);
      setPaginationMeta({
        total: meta.total,
        totalPages: meta.totalPages,
      });
    } catch (err) {
      console.error("Failed to fetch industries:", err);
      let errorMessage = "Failed to load industries. Please try again.";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setError(errorMessage);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  
  useEffect(() => {
    if (searchQuery.trim().length >= 2) return;
    fetchIndustries(pagination.pageIndex, pagination.pageSize);
    
  }, [pagination.pageIndex, pagination.pageSize, searchQuery]);

  useEffect(() => {
    const query = searchQuery.trim();

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    if (query.length < 2) {
      setIsSearching(false);
      setSearchError("");
      return;
    }

    let isCancelled = false;
    setIsSearching(true);
    setSearchError("");

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await axiosInstance.get(`/industries/search?q=${encodeURIComponent(query)}`);
        if (isCancelled) return;
        const results = response.data?.data || [];
        setData(results);
        setPaginationMeta({
          total: results.length,
          totalPages: 1,
        });
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to search industries:", err);
          let errorMessage = "Failed to search industries. Please try again.";
          if (axios.isAxiosError(err)) {
            errorMessage = err.response?.data?.message || errorMessage;
          }
          setSearchError(errorMessage);
          setData([]);
          setPaginationMeta({ total: 0, totalPages: 1 });
        }
      } finally {
        if (!isCancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      isCancelled = true;
    };
  }, [searchQuery]);

  useEffect(() => {
    if (tableLoaderIntervalRef.current) {
      clearInterval(tableLoaderIntervalRef.current);
      tableLoaderIntervalRef.current = null;
    }
    if (tableLoaderFinishTimeoutRef.current) {
      clearTimeout(tableLoaderFinishTimeoutRef.current);
      tableLoaderFinishTimeoutRef.current = null;
    }

    if (isListLoading) {
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
  }, [isListLoading, showTableLoader]);
  
  const handleCreate = async () => {
    if (!industryName.trim()) {
      setModalError("Industry name is required");
      return;
    }

    setIsLoading(true);
    setModalError("");
    try {
      await axiosInstance.post(`/industries`, {
        name: industryName.trim(),
      });
      
      setIsModalOpen(false);
      setIndustryName("");
      setModalError("");
      
      await fetchIndustries(pagination.pageIndex, pagination.pageSize);
    } catch (err) {
      console.error("Failed to create industry:", err);
      let errorMessage = "Failed to create industry. Please try again.";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setModalError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleUpdate = async () => {
    if (!industryName.trim() || !editingIndustry) {
      setEditModalError("Industry name is required");
      return;
    }

    setIsLoading(true);
    setEditModalError("");
    try {
      await axiosInstance.put(`/industries/${editingIndustry.id}`, {
        name: industryName.trim(),
      });
      
      setIsEditModalOpen(false);
      setEditingIndustry(null);
      setIndustryName("");
      setEditModalError("");
      
      await fetchIndustries(pagination.pageIndex, pagination.pageSize);
    } catch (err) {
      console.error("Failed to update industry:", err);
      let errorMessage = "Failed to update industry. Please try again.";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setEditModalError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleDeleteConfirm = async () => {
    if (!deletingIndustry) {
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      await axiosInstance.delete(`/industries/${deletingIndustry.id}`);
      
      setIsDeleteModalOpen(false);
      setDeletingIndustry(null);
      
      await fetchIndustries(pagination.pageIndex, pagination.pageSize);
    } catch (err) {
      console.error("Failed to delete industry:", err);
      let errorMessage = "Failed to delete industry. Please try again.";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount: paginationMeta.totalPages,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
      pagination,
    },
    onPaginationChange: (updater) => {
      setPagination((prev) => {
        if (typeof updater === "function") {
          return updater(prev);
        }
        return updater;
      });
    },
    enableRowSelection: true,
  });

  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen flex flex-col">
      <div className="flex flex-row items-start justify-between mb-4 md:mb-6 gap-3">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
            Industry
          </h1>
          <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
            Create and edit industry&apos;s
          </p>
        </div>
        <button
          onClick={
            canWrite
              ? () => {
                  setIsModalOpen(true);
                  setModalError("");
                  setIndustryName("");
                }
              : undefined
          }
          disabled={!canWrite}
          className={`px-3 py-1.5 md:px-8 md:py-3 rounded-lg text-[10px] md:text-sm font-medium transition-colors shrink-0 ${
            canWrite
              ? "bg-dull-gray text-primary hover:bg-dull-gray/90"
              : "bg-dull-gray/40 text-primary/50 cursor-not-allowed"
          }`}
          style={{
            boxShadow:
              "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
          }}
        >
          Add Industry
        </button>
      </div>

      <div className="mb-4 md:mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search industries..."
            className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm text-secondary placeholder:text-gray focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:border-transparent"
          />
        </div>
        {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
          <p className="text-xs text-gray-500 mt-2">Type at least 2 characters to search.</p>
        )}
        {searchError && <p className="text-xs text-red-500 mt-2">{searchError}</p>}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-lg">
          <p className="text-sm font-semibold text-red">{error}</p>
        </div>
      )}

      <div
        className={`bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden ${
          showTableLoader ? "flex flex-col flex-1" : ""
        }`}
      >
        <div
          className={`relative ${showTableLoader ? "flex-1 overflow-x-auto" : "overflow-x-auto"}`}
        >
          <table
            className={`w-full ${showTableLoader ? "h-full" : ""}`}
            style={{ tableLayout: "fixed" }}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-zinc-100">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-2 md:px-4 py-2 md:py-4 text-left ${
                        header.id === "action" ? "md:px-6" : ""
                      }`}
                      style={
                        header.id === "select"
                          ? { width: "85%" }
                          : header.id === "action"
                            ? { width: "15%" }
                            : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
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
                    No industries found
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
                          cell.column.id === "action"
                            ? "px-2 md:px-8 text-right"
                            : ""
                        }`}
                        style={
                          cell.column.id === "select"
                            ? { width: "85%" }
                            : cell.column.id === "action"
                              ? { width: "15%" }
                              : undefined
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
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
              disabled={!table.getCanPreviousPage() || isLoading}
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
              const totalPages = paginationMeta.totalPages;
              const maxPagesToShow = 8;

              let startPage = 0;
              let endPage = Math.min(maxPagesToShow - 1, totalPages - 1);

              if (currentPage >= maxPagesToShow) {
                startPage = currentPage;
                endPage = Math.min(
                  currentPage + maxPagesToShow - 1,
                  totalPages - 1
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
                  </span>
                );
              }

              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => table.setPageIndex(i)}
                    disabled={isLoading}
                    className={`px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-sm text-[10px] md:text-xs font-normal transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      currentPage === i
                        ? "bg-dull-gray text-primary"
                        : "bg-primary text-secondary border hover:bg-zinc-100"
                    }`}
                    style={
                      currentPage !== i ? { borderColor: "#E6E6E6" } : undefined
                    }
                  >
                    {i + 1}
                  </button>
                );
              }

              if (endPage < totalPages - 1) {
                pages.push(
                  <span
                    key="dots-after"
                    className="px-1 md:px-2 text-[10px] md:text-xs text-gray"
                  >
                    ...
                  </span>
                );
                pages.push(
                  <button
                    key={totalPages - 1}
                    onClick={() => table.setPageIndex(totalPages - 1)}
                    disabled={isLoading}
                    className={`px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-sm text-[10px] md:text-xs font-normal transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      currentPage === totalPages - 1
                        ? "bg-dull-gray text-primary"
                        : "bg-primary text-secondary border hover:bg-zinc-100"
                    }`}
                    style={
                      currentPage !== totalPages - 1
                        ? { borderColor: "#E6E6E6" }
                        : undefined
                    }
                  >
                    {totalPages}
                  </button>
                );
              }

              return pages;
            })()}

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage() || isLoading}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setIsModalOpen(false);
              setModalError("");
              setIndustryName("");
            }}
          />

          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl mx-2 md:mx-4">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                <Loading isLoading size="sm" className="p-4" />
              </div>
            )}
            <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2
                    className="text-[16px] md:text-[18px] font-semibold text-secondary mb-1 leading-[21.6px] align-middle"
                    style={{ letterSpacing: "0%" }}
                  >
                    Add Industry
                  </h2>
                  <p
                    className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle"
                    style={{ letterSpacing: "0%" }}
                  >
                    Enter a new industry name to add it to the list.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalError("");
                    setIndustryName("");
                  }}
                  className="p-1 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M5.46995 5.47001C5.61058 5.32956 5.8012 5.25067 5.99995 5.25067C6.1987 5.25067 6.38933 5.32956 6.52995 5.47001L18.53 17.47C18.6036 17.5387 18.6627 17.6215 18.7037 17.7135C18.7447 17.8055 18.7668 17.9048 18.7685 18.0055C18.7703 18.1062 18.7518 18.2062 18.7141 18.2996C18.6764 18.393 18.6202 18.4778 18.549 18.549C18.4778 18.6203 18.3929 18.6764 18.2995 18.7141C18.2062 18.7519 18.1061 18.7704 18.0054 18.7686C17.9047 18.7668 17.8054 18.7448 17.7134 18.7038C17.6214 18.6628 17.5386 18.6037 17.4699 18.53L5.46995 6.53001C5.3295 6.38939 5.25061 6.19876 5.25061 6.00001C5.25061 5.80126 5.3295 5.61064 5.46995 5.47001Z"
                      fill="#262626"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M18.53 5.47001C18.6704 5.61064 18.7493 5.80126 18.7493 6.00001C18.7493 6.19876 18.6704 6.38939 18.53 6.53001L6.52997 18.53C6.38779 18.6625 6.19975 18.7346 6.00545 18.7312C5.81114 18.7278 5.62576 18.649 5.48835 18.5116C5.35093 18.3742 5.27222 18.1888 5.26879 17.9945C5.26537 17.8002 5.33749 17.6122 5.46997 17.47L17.47 5.47001C17.6106 5.32956 17.8012 5.25067 18 5.25067C18.1987 5.25067 18.3893 5.32956 18.53 5.47001Z"
                      fill="#262626"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="border-t border-zinc-100" />

            <div className="px-4 md:px-6 py-4 md:py-6">
              <label
                htmlFor="industry-name"
                className="block text-secondary mb-2 md:mb-3"
                style={{
                  fontWeight: 400,
                  fontSize: "13px",
                  lineHeight: "100%",
                  letterSpacing: "0%",
                }}
              >
                <span className="md:hidden" style={{ fontSize: "12px" }}>
                  Industry Name
                </span>
                <span
                  className="hidden md:inline"
                  style={{ fontSize: "14.01px" }}
                >
                  Industry Name
                </span>
              </label>
              <input
                id="industry-name"
                type="text"
                value={industryName}
                onChange={(e) => {
                  setIndustryName(e.target.value);
                  setModalError("");
                }}
                placeholder="Enter Industry Name"
                className={`w-full px-3 md:px-4 py-2 md:py-3 border rounded-lg text-secondary placeholder:text-gray focus:outline-none focus:ring-2 focus:border-transparent text-[13px] md:text-[14px] ${
                  modalError ? "border-red focus:ring-red/20" : "border-zinc-200 focus:ring-zinc-200"
                }`}
                style={{
                  fontWeight: 400,
                  lineHeight: "19.2px",
                  letterSpacing: "0%",
                }}
              />
              {modalError && (
                <p className="text-xs md:text-sm text-red mt-2 font-medium">
                  {modalError}
                </p>
              )}
            </div>

            <div className="px-4 md:px-6 pb-4 md:pb-6 flex items-center justify-end gap-2 md:gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setIndustryName("");
                  setModalError("");
                }}
                disabled={isLoading}
                className="px-6 md:px-10 py-2 md:py-2.5 bg-white text-secondary border border-zinc-200 rounded-lg text-xs md:text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isLoading || !industryName.trim()}
                className="px-8 md:px-13 py-2 md:py-2.5 bg-dull-gray text-primary rounded-lg text-xs md:text-sm font-medium hover:bg-dull-gray/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }}
              >
                {isLoading ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      
      {isEditModalOpen && editingIndustry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setIsEditModalOpen(false);
              setEditingIndustry(null);
              setIndustryName("");
              setEditModalError("");
            }}
          />

          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl mx-2 md:mx-4">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                <Loading isLoading size="sm" className="p-4" />
              </div>
            )}
            <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2
                    className="text-[16px] md:text-[18px] font-semibold text-secondary mb-1 leading-[21.6px] align-middle"
                    style={{ letterSpacing: "0%" }}
                  >
                    Edit Industry
                  </h2>
                  <p
                    className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle"
                    style={{ letterSpacing: "0%" }}
                  >
                    Update industry name
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingIndustry(null);
                    setIndustryName("");
                    setEditModalError("");
                  }}
                  className="p-1 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M5.46995 5.47001C5.61058 5.32956 5.8012 5.25067 5.99995 5.25067C6.1987 5.25067 6.38933 5.32956 6.52995 5.47001L18.53 17.47C18.6036 17.5387 18.6627 17.6215 18.7037 17.7135C18.7447 17.8055 18.7668 17.9048 18.7685 18.0055C18.7703 18.1062 18.7518 18.2062 18.7141 18.2996C18.6764 18.393 18.6202 18.4778 18.549 18.549C18.4778 18.6203 18.3929 18.6764 18.2995 18.7141C18.2062 18.7519 18.1061 18.7704 18.0054 18.7686C17.9047 18.7668 17.8054 18.7448 17.7134 18.7038C17.6214 18.6628 17.5386 18.6037 17.4699 18.53L5.46995 6.53001C5.3295 6.38939 5.25061 6.19876 5.25061 6.00001C5.25061 5.80126 5.3295 5.61064 5.46995 5.47001Z"
                      fill="#262626"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M18.53 5.47001C18.6704 5.61064 18.7493 5.80126 18.7493 6.00001C18.7493 6.19876 18.6704 6.38939 18.53 6.53001L6.52997 18.53C6.38779 18.6625 6.19975 18.7346 6.00545 18.7312C5.81114 18.7278 5.62576 18.649 5.48835 18.5116C5.35093 18.3742 5.27222 18.1888 5.26879 17.9945C5.26537 17.8002 5.33749 17.6122 5.46997 17.47L17.47 5.47001C17.6106 5.32956 17.8012 5.25067 18 5.25067C18.1987 5.25067 18.3893 5.32956 18.53 5.47001Z"
                      fill="#262626"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="border-t border-zinc-100" />

            <div className="px-4 md:px-6 py-4 md:py-6">
              <label
                htmlFor="edit-industry-name"
                className="block text-secondary mb-2 md:mb-3"
                style={{
                  fontWeight: 400,
                  fontSize: "13px",
                  lineHeight: "100%",
                  letterSpacing: "0%",
                }}
              >
                <span className="md:hidden" style={{ fontSize: "12px" }}>
                  Industry Name
                </span>
                <span
                  className="hidden md:inline"
                  style={{ fontSize: "14.01px" }}
                >
                  Industry Name
                </span>
              </label>
              <input
                id="edit-industry-name"
                type="text"
                value={industryName}
                onChange={(e) => {
                  setIndustryName(e.target.value);
                  setEditModalError("");
                }}
                placeholder="Enter Industry Name"
                className={`w-full px-3 md:px-4 py-2 md:py-3 border rounded-lg text-secondary placeholder:text-gray focus:outline-none focus:ring-2 focus:border-transparent text-[13px] md:text-[14px] ${
                  editModalError ? "border-red focus:ring-red/20" : "border-zinc-200 focus:ring-zinc-200"
                }`}
                style={{
                  fontWeight: 400,
                  lineHeight: "19.2px",
                  letterSpacing: "0%",
                }}
              />
              {editModalError && (
                <p className="text-xs md:text-sm text-red mt-2 font-medium">
                  {editModalError}
                </p>
              )}
            </div>

            <div className="px-4 md:px-6 pb-4 md:pb-6 flex items-center justify-end gap-2 md:gap-3">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingIndustry(null);
                  setIndustryName("");
                  setEditModalError("");
                }}
                disabled={isLoading}
                className="px-6 md:px-10 py-2 md:py-2.5 bg-white text-secondary border border-zinc-200 rounded-lg text-xs md:text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isLoading || !industryName.trim()}
                className="px-8 md:px-13 py-2 md:py-2.5 bg-dull-gray text-primary rounded-lg text-xs md:text-sm font-medium hover:bg-dull-gray/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }}
              >
                {isLoading ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      
      {isDeleteModalOpen && deletingIndustry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setIsDeleteModalOpen(false);
              setDeletingIndustry(null);
            }}
          />

          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl mx-2 md:mx-4">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                <Loading isLoading size="sm" className="p-4" />
              </div>
            )}
            <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2
                    className="text-[16px] md:text-[18px] font-semibold text-secondary mb-1 leading-[21.6px] align-middle"
                    style={{ letterSpacing: "0%" }}
                  >
                    Delete Industry
                  </h2>
                  <p
                    className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle"
                    style={{ letterSpacing: "0%" }}
                  >
                    Are you sure you want to delete this industry?
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingIndustry(null);
                  }}
                  className="p-1 hover:bg-zinc-100 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M5.46995 5.47001C5.61058 5.32956 5.8012 5.25067 5.99995 5.25067C6.1987 5.25067 6.38933 5.32956 6.52995 5.47001L18.53 17.47C18.6036 17.5387 18.6627 17.6215 18.7037 17.7135C18.7447 17.8055 18.7668 17.9048 18.7685 18.0055C18.7703 18.1062 18.7518 18.2062 18.7141 18.2996C18.6764 18.393 18.6202 18.4778 18.549 18.549C18.4778 18.6203 18.3929 18.6764 18.2995 18.7141C18.2062 18.7519 18.1061 18.7704 18.0054 18.7686C17.9047 18.7668 17.8054 18.7448 17.7134 18.7038C17.6214 18.6628 17.5386 18.6037 17.4699 18.53L5.46995 6.53001C5.3295 6.38939 5.25061 6.19876 5.25061 6.00001C5.25061 5.80126 5.3295 5.61064 5.46995 5.47001Z"
                      fill="#262626"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M18.53 5.47001C18.6704 5.61064 18.7493 5.80126 18.7493 6.00001C18.7493 6.19876 18.6704 6.38939 18.53 6.53001L6.52997 18.53C6.38779 18.6625 6.19975 18.7346 6.00545 18.7312C5.81114 18.7278 5.62576 18.649 5.48835 18.5116C5.35093 18.3742 5.27222 18.1888 5.26879 17.9945C5.26537 17.8002 5.33749 17.6122 5.46997 17.47L17.47 5.47001C17.6106 5.32956 17.8012 5.25067 18 5.25067C18.1987 5.25067 18.3893 5.32956 18.53 5.47001Z"
                      fill="#262626"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="border-t border-zinc-100" />

            <div className="px-4 md:px-6 py-4 md:py-6">
              <div className="mb-4">
                <p className="text-[13px] md:text-[15px] font-normal text-secondary leading-[21.6px] align-middle mb-2">
                  You are about to delete <strong>&quot;{deletingIndustry.name}&quot;</strong>
                </p>
                <p className="text-[12px] md:text-[14px] font-normal text-red leading-[21.6px] align-middle">
                  Deleting this industry will unpublish certificates related to this.
                </p>
              </div>
            </div>

            <div className="px-4 md:px-6 pb-4 md:pb-6 flex items-center justify-end gap-2 md:gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingIndustry(null);
                }}
                disabled={isLoading}
                className="px-6 md:px-10 py-2 md:py-2.5 bg-white text-secondary border border-zinc-200 rounded-lg text-xs md:text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isLoading}
                className="px-8 md:px-13 py-2 md:py-2.5 bg-secondary text-white rounded-lg text-xs md:text-sm font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

