"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import Button from "../common/button";
import Dropdown from "../common/dropdown";
import { axiosInstance } from "@/lib/axios";
import { Loading } from "../common/Loading";
import { useUser } from "@/contexts/UserContext";

type Certification = {
  id: string;
  certificationName: string;
  status: string; 
  category: string; 
  certificateIssued?: string; 
  certificateAssessment?: string; 
  totalQuestions: number;
  createdBy?: string; 
  created: string;
  updated?: string; 
};

type CertificateApiResponse = {
  id: string;
  certificate_id: string;
  name: string;
  disclosure_price: string;
  assured_price: string;
  validity_days: number;
  validity_months: number;
  validity_years: number;
  compulsory_docs: string[];
  description: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  industry_ids: string[];
  industry_names: string[] | null;
  badges_count: string;
  sections_count: string;
  questions_count: string;
  badges: unknown[];
};

type CertificatesApiResponse = {
  success: boolean;
  message: string;
  data: {
    data: CertificateApiResponse[];
    total: number;
    page: number;
    limit: number;
  };
  statusCode: number;
  timestamp: string;
};

type Industry = {
  id: string;
  name: string;
};

type IndustriesResponse = {
  message: string;
  data: {
    data: Industry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function CertificationsPage() {
  const router = useRouter();
  const { profile } = useUser();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [data, setData] = useState<Certification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTableLoader, setShowTableLoader] = useState(false);
  const [tableLoadingProgress, setTableLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
    total: 0,
  });
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certification | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<{
    industryId: string;
  }>({
    industryId: "all",
  });
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isIndustriesLoading, setIsIndustriesLoading] = useState(false);
  const tableLoaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tableLoaderFinishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const canWrite = hasActionPermission("certifications", "write");
  const canEdit = hasActionPermission("certifications", "edit");
  const canDelete = hasActionPermission("certifications", "delete");

  const logActionPress = (
    action: string,
    certificate: Certification | null
  ) => {
    console.log(`[certifications][action] ${action}`, certificate);
  };


  useEffect(() => {
    const fetchIndustries = async () => {
      setIsIndustriesLoading(true);
      try {
        const pageSize = 200;
        const first = await axiosInstance.get<IndustriesResponse>(
          `/industries?page=1&limit=${pageSize}`
        );
        const firstData = first.data?.data?.data ?? [];
        const totalPages = first.data?.data?.totalPages ?? 1;

        const all: Industry[] = [...firstData];

        for (let page = 2; page <= totalPages; page += 1) {
          const res = await axiosInstance.get<IndustriesResponse>(
            `/industries?page=${page}&limit=${pageSize}`
          );
          all.push(...(res.data?.data?.data ?? []));
        }

        setIndustries(all);
      } catch (err) {
        console.error("Failed to fetch industries:", err);
        setIndustries([]);
      } finally {
        setIsIndustriesLoading(false);
      }
    };

    fetchIndustries();
  }, []);

  
  const fetchCertificates = async (page: number, limit: number, industryId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (industryId && industryId !== "all") {
        params.append("industry_id", industryId);
      }
      const response = await axiosInstance.get<CertificatesApiResponse>(
        `/certificates?${params.toString()}`
      );
      const apiData = response.data?.data?.data || [];
      const total = response.data?.data?.total || 0;

      
      const mappedData: Certification[] = apiData.map((cert) => ({
        id: cert.id,
        certificationName: cert.name,
        status: cert.is_published ? "Published" : "Draft", 
        category: cert.industry_names && cert.industry_names.length > 0
          ? cert.industry_names.join(", ")
          : "N/A",
        certificateIssued: undefined, 
        certificateAssessment: undefined, 
        totalQuestions: parseInt(cert.questions_count) || 0,
        createdBy: undefined, 
        created: formatDate(cert.created_at),
        updated: cert.updated_at ? formatDate(cert.updated_at) : undefined,
      }));

      setData(mappedData);
      setPagination({
        pageIndex: page - 1, 
        pageSize: limit,
        total,
      });
    } catch (err) {
      console.error("Failed to fetch certificates:", err);
      setError("Failed to load certificates. Please try again.");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  
  useEffect(() => {
    fetchCertificates(pagination.pageIndex + 1, pagination.pageSize, filters.industryId);
    
  }, [pagination.pageIndex, pagination.pageSize, filters.industryId]);

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

  
  const handleOpenActionModal = (certificate: Certification) => {
    logActionPress("open-action-menu", certificate);
    setSelectedCertificate(certificate);
    setShowActionModal(true);
  };

  
  const handleCloseActionModal = () => {
    setShowActionModal(false);
    setSelectedCertificate(null);
  };

  
  const handleEdit = () => {
    if (!canEdit) return;
    if (selectedCertificate) {
      logActionPress("edit", selectedCertificate);
      handleCloseActionModal();
      
      router.push(`/admin/certifications/create?id=${selectedCertificate.id}`);
    }
  };

  
  const handleDelete = () => {
    if (!canDelete) return;
    if (selectedCertificate) {
      logActionPress("delete-clicked", selectedCertificate);
      setShowDeleteModal(true);
      setShowActionModal(false);
    }
  };

  
  const handleConfirmDelete = async () => {
    if (!selectedCertificate) return;
    logActionPress("delete-confirm", selectedCertificate);

    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/certificates/${selectedCertificate.id}`);
      console.log("Certificate deleted successfully");
      
      
      setShowDeleteModal(false);
      setSelectedCertificate(null);
      
      
      await fetchCertificates(pagination.pageIndex + 1, pagination.pageSize, filters.industryId);
    } catch (err) {
      console.error("Failed to delete certificate:", err);
      alert("Failed to delete certificate. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedCertificate(null);
  };

  
  const handlePublish = async () => {
    if (!canWrite) return;
    if (!selectedCertificate) return;
    if (selectedCertificate.totalQuestions <= 0) return;
    logActionPress("publish", selectedCertificate);

    setIsPublishing(true);
    try {
      await axiosInstance.patch(`/certificates/${selectedCertificate.id}/publish`, {
        is_published: true,
      });
      console.log("Certificate published successfully");
      
      
      handleCloseActionModal();
      
      
      await fetchCertificates(pagination.pageIndex + 1, pagination.pageSize, filters.industryId);
    } catch (err) {
      console.error("Failed to publish certificate:", err);
      alert("Failed to publish certificate. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDuplicate = async () => {
    if (!canWrite) return;
    if (!selectedCertificate) return;
    logActionPress("duplicate", selectedCertificate);

    setIsDuplicating(true);
    try {
      await axiosInstance.post(`/certificates/${selectedCertificate.id}/duplicate`);
      console.log("Certificate duplicated successfully");

      handleCloseActionModal();

      await fetchCertificates(
        pagination.pageIndex + 1,
        pagination.pageSize,
        filters.industryId
      );
    } catch (err) {
      console.error("Failed to duplicate certificate:", err);
      alert("Failed to duplicate certificate. Please try again.");
    } finally {
      setIsDuplicating(false);
    }
  };

  
  const handleUnpublish = async () => {
    if (!canWrite) return;
    if (!selectedCertificate) return;
    logActionPress("unpublish", selectedCertificate);

    setIsPublishing(true);
    try {
      await axiosInstance.patch(`/certificates/${selectedCertificate.id}/publish`, {
        is_published: false,
      });
      console.log("Certificate unpublished successfully");
      
      
      handleCloseActionModal();
      
      
      await fetchCertificates(pagination.pageIndex + 1, pagination.pageSize, filters.industryId);
    } catch (err) {
      console.error("Failed to unpublish certificate:", err);
      alert("Failed to unpublish certificate. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const checkboxColumn = useMemo<ColumnDef<Certification>>(
    () => ({
      id: "select",
      header: () => (
        <span
          className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle whitespace-nowrap"
          style={{ color: "#9B9B9B", letterSpacing: "1%" }}
        >
          Certification Name
        </span>
      ),
      cell: ({ row }) => (
        <span
          className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray block wrap-break-word"
          style={{ letterSpacing: "1%" }}
        >
          {row.original.certificationName}
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 280,
      minSize: 240,
      maxSize: 320,
    }),
    []
  );

  const columns = useMemo<ColumnDef<Certification>[]>(
    () => [
      checkboxColumn,
      {
        accessorKey: "status",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle text-center block"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Status
          </span>
        ),
        cell: ({ getValue }) => {
          const status = getValue<string>();
          const isPublished = status === "Published";

          return (
            <div className="flex items-center justify-center">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] md:text-xs font-medium whitespace-nowrap ${
                  isPublished
                    ? "bg-white text-green-700 border border-green-500"
                    : "bg-white text-red-600 border border-red-500"
                }`}
              >
                {isPublished ? "Published" : "Draft"}
              </span>
            </div>
          );
        },
        size: 110,
        minSize: 95,
        maxSize: 130,
      },
      {
        accessorKey: "category",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Industry
          </span>
        ),
        cell: ({ getValue }) => {
          const industries = getValue<string>();
          const industryList = industries && industries !== "N/A" 
            ? industries.split(",").map(item => item.trim()).filter(item => item.length > 0)
            : [];
          
          return (
            <div className="flex flex-wrap gap-1 max-w-full">
              {industryList.length > 0 ? (
                industryList.map((industry, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-md text-[9px] md:text-xs font-normal text-secondary wrap-break-word underline"
                    
                  >
                    {industry}
                  </span>
                ))
              ) : (
                <span
                  className="px-2 py-1 rounded-md text-[9px] md:text-xs font-normal text-secondary"
                >
                  N/A
                </span>
              )}
            </div>
          );
        },
        size: 280,
        minSize: 240,
        maxSize: 320,
      },
      {
        id: "certificateIssued",
        accessorKey: "certificateIssued",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle text-center block"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Certificate Issued
          </span>
        ),
        cell: ({ row }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray whitespace-nowrap text-center block"
            style={{ letterSpacing: "1%" }}
          >
            {row.original.certificateIssued || "0"}
          </span>
        ),
        size: 110,
        minSize: 90,
        maxSize: 130,
      },
      {
        id: "certificateAssessment",
        accessorKey: "certificateAssessment",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle text-center block"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Certificate Assessment
          </span>
        ),
        cell: ({ row }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray whitespace-nowrap text-center block"
            style={{ letterSpacing: "1%" }}
          >
            {row.original.certificateAssessment || "0"}
          </span>
        ),
        size: 120,
        minSize: 100,
        maxSize: 140,
      },
      {
        accessorKey: "totalQuestions",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle text-center block"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Total Questions
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray text-center block whitespace-nowrap"
            style={{ letterSpacing: "1%" }}
          >
            {getValue<number>()}
          </span>
        ),
        size: 130,
        minSize: 110,
        maxSize: 150,
      },
      {
        id: "createdBy",
        accessorKey: "createdBy",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Created By
          </span>
        ),
        cell: ({ row }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray whitespace-nowrap"
            style={{ letterSpacing: "1%" }}
          >
            {row.original.createdBy || "N/A"}
          </span>
        ),
        size: 120,
        minSize: 100,
        maxSize: 140,
      },
      {
        accessorKey: "created",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Created
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
        id: "updated",
        accessorKey: "updated",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Updated
          </span>
        ),
        cell: ({ row }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray whitespace-nowrap"
            style={{ letterSpacing: "1%" }}
          >
            {row.original.updated || "N/A"}
          </span>
        ),
        size: 110,
        minSize: 90,
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
        cell: ({ row }) => {
          const cert = row.original;
          return (
            <div className="flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenActionModal(cert);
                }}
                className="p-1 hover:bg-zinc-100 rounded transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 10.25C14 9.91848 14.1317 9.60054 14.3661 9.36612C14.6005 9.1317 14.9185 9 15.25 9C15.5815 9 15.8995 9.1317 16.1339 9.36612C16.3683 9.60054 16.5 9.91848 16.5 10.25C16.5 10.5815 16.3683 10.8995 16.1339 11.1339C15.8995 11.3683 15.5815 11.5 15.25 11.5C14.9185 11.5 14.6005 11.3683 14.3661 11.1339C14.1317 10.8995 14 10.5815 14 10.25ZM9 10.25C9 9.91848 9.1317 9.60054 9.36612 9.36612C9.60054 9.1317 9.91848 9 10.25 9C10.5815 9 10.8995 9.1317 11.1339 9.36612C11.3683 9.60054 11.5 9.91848 11.5 10.25C11.5 10.5815 11.3683 10.8995 11.1339 11.1339C10.8995 11.3683 10.5815 11.5 10.25 11.5C9.91848 11.5 9.60054 11.3683 9.36612 11.1339C9.1317 10.8995 9 10.5815 9 10.25ZM4 10.25C4 9.91848 4.1317 9.60054 4.36612 9.36612C4.60054 9.1317 4.91848 9 5.25 9C5.58152 9 5.89946 9.1317 6.13388 9.36612C6.3683 9.60054 6.5 9.91848 6.5 10.25C6.5 10.5815 6.3683 10.8995 6.13388 11.1339C5.89946 11.3683 5.58152 11.5 5.25 11.5C4.91848 11.5 4.60054 11.3683 4.36612 11.1339C4.1317 10.8995 4 10.5815 4 10.25Z" fill="black" />
                </svg>
              </button>
            </div>
          );
        },
        enableSorting: false,
        size: 80,
        minSize: 70,
        maxSize: 90,
      },
    ],
    [checkboxColumn]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
      pagination: {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      },
    },
    enableRowSelection: true,
    pageCount: Math.ceil(pagination.total / pagination.pageSize),
    manualPagination: true,
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === "function"
          ? updater({
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
          })
          : updater;
      setPagination((prev) => ({
        ...prev,
        pageIndex: newPagination.pageIndex,
        pageSize: newPagination.pageSize,
      }));
    },
  });

  const canPublishSelected = Boolean(
    canWrite && selectedCertificate && selectedCertificate.totalQuestions > 0
  );

  return (
    <div className="bg-light-gray min-h-screen flex flex-col">
      <div className="p-3 md:p-6 flex flex-col flex-1">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-2 md:mb-3 gap-3 md:gap-0">
          <div>
            <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
              Certifications
            </h1>
            <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
              Create and manage ESG certifications for your platform
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {!isFilterOpen && (
              <button
                onClick={() => setIsFilterOpen(true)}
                className="p-2 md:p-2 border border-black-200 rounded-lg hover:bg-zinc-50 transition-colors"
                aria-label="Open filters"
                title="Filters"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 md:w-6 md:h-6"
                >
                  <path
                    d="M22 18.6049C22 18.8038 21.921 18.9946 21.7803 19.1353C21.6397 19.2759 21.4489 19.3549 21.25 19.3549H16.15C15.983 19.9778 15.6151 20.5282 15.1034 20.9207C14.5918 21.3132 13.9649 21.526 13.32 21.526C12.6751 21.526 12.0482 21.3132 11.5366 20.9207C11.0249 20.5282 10.657 19.9778 10.49 19.3549H2.75C2.55109 19.3549 2.36032 19.2759 2.21967 19.1353C2.07902 18.9946 2 18.8038 2 18.6049C2 18.406 2.07902 18.2153 2.21967 18.0746C2.36032 17.9339 2.55109 17.8549 2.75 17.8549H10.49C10.657 17.2321 11.0249 16.6817 11.5366 16.2892C12.0482 15.8966 12.6751 15.6839 13.32 15.6839C13.9649 15.6839 14.5918 15.8966 15.1034 16.2892C15.6151 16.6817 15.983 17.2321 16.15 17.8549H21.25C21.4489 17.8549 21.6397 17.9339 21.7803 18.0746C21.921 18.2153 22 18.406 22 18.6049ZM22 5.39493C22 5.59384 21.921 5.78461 21.7803 5.92526C21.6397 6.06591 21.4489 6.14493 21.25 6.14493H18.8C18.633 6.76781 18.2651 7.31817 17.7534 7.7107C17.2418 8.10323 16.6149 8.31598 15.97 8.31598C15.3251 8.31598 14.6982 8.10323 14.1866 7.7107C13.6749 7.31817 13.307 6.76781 13.14 6.14493H2.75C2.65151 6.14493 2.55398 6.12553 2.46299 6.08784C2.37199 6.05015 2.28931 5.9949 2.21967 5.92526C2.15003 5.85562 2.09478 5.77294 2.05709 5.68194C2.0194 5.59095 2 5.49342 2 5.39493C2 5.29644 2.0194 5.19891 2.05709 5.10792C2.09478 5.01692 2.15003 4.93424 2.21967 4.8646C2.28931 4.79496 2.37199 4.73971 2.46299 4.70202C2.55398 4.66433 2.65151 4.64493 2.75 4.64493H13.14C13.307 4.02205 13.6749 3.47169 14.1866 3.07916C14.6982 2.68663 15.3251 2.47388 15.97 2.47388C16.6149 2.47388 17.2418 2.68663 17.7534 3.07916C18.2651 3.47169 18.633 4.02205 18.8 4.64493H21.25C21.3489 4.64359 21.447 4.66207 21.5386 4.69928C21.6302 4.7365 21.7134 4.79169 21.7833 4.8616C21.8532 4.93152 21.9084 5.01473 21.9457 5.10633C21.9829 5.19794 22.0013 5.29607 22 5.39493ZM22 11.9949C22.0013 12.0938 21.9829 12.1919 21.9457 12.2835C21.9084 12.3751 21.8532 12.4583 21.7833 12.5283C21.7134 12.5982 21.6302 12.6534 21.5386 12.6906C21.447 12.7278 21.3489 12.7463 21.25 12.7449H9.55C9.38296 13.3678 9.01509 13.9182 8.50342 14.3107C7.99176 14.7032 7.36489 14.916 6.72 14.916C6.07511 14.916 5.44824 14.7032 4.93658 14.3107C4.42491 13.9182 4.05704 13.3678 3.89 12.7449H2.75C2.55109 12.7449 2.36032 12.6659 2.21967 12.5253C2.07902 12.3846 2 12.1938 2 11.9949C2 11.796 2.07902 11.6053 2.21967 11.4646C2.36032 11.3239 2.55109 11.2449 2.75 11.2449H3.89C4.05704 10.6221 4.42491 10.0717 4.93658 9.67916C5.44824 9.28663 6.07511 9.07388 6.72 9.07388C7.36489 9.07388 7.99176 9.28663 8.50342 9.67916C9.01509 10.0717 9.38296 10.6221 9.55 11.2449H21.25C21.4489 11.2449 21.6397 11.3239 21.7803 11.4646C21.921 11.6053 22 11.796 22 11.9949Z"
                    fill="#262626"
                  />
                </svg>
              </button>
            )}
            <Button
              onClick={
                canWrite
                  ? () =>
                      (window.location.href = "/admin/certifications/create")
                  : undefined
              }
              disabled={!canWrite}
              className={`px-4 py-2 md:px-8 md:py-3 rounded-lg text-xs md:text-sm w-full md:w-auto ${
                canWrite ? "" : "opacity-50 cursor-not-allowed"
              }`}
            >
              Create New Certifications
            </Button>
          </div>
        </div>

        {isFilterOpen && (
          <div className="flex items-start justify-between mb-4 md:mb-6 gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 flex-1">
              <Dropdown
                value={filters.industryId}
                onChange={(e) => {
                  const next = e.target.value;
                  setFilters((prev) => ({ ...prev, industryId: next }));
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                placeholder={isIndustriesLoading ? "Loading industries..." : "All Industries"}
                disabled={isIndustriesLoading}
                className="w-full sm:w-[320px]"
                options={[
                  {
                    value: "all",
                    label: isIndustriesLoading ? "Loading industries..." : "All Industries",
                  },
                  ...industries.map((ind) => ({
                    value: ind.id,
                    label: ind.name,
                  })),
                ]}
              />
            </div>
            <button
              onClick={() => {
                setFilters({ industryId: "all" });
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
                        className={`px-2 md:px-4 py-2 md:py-4 ${header.id === "certificateIssued" ||
                            header.id === "certificateAssessment" ||
                            header.id === "totalQuestions" ||
                            header.id === "action"
                            ? "text-center"
                            : "text-left"
                          } ${header.id === "action" ? "md:px-6" : ""
                          }`}
                        style={{
                          width: header.column.getSize() !== 150 ? `${header.column.getSize()}px` : undefined,
                          minWidth: `${header.column.columnDef.minSize || 100}px`,
                          maxWidth: header.column.columnDef.maxSize ? `${header.column.columnDef.maxSize}px` : undefined,
                        }}
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
                {showTableLoader ? null : error ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-8 text-center text-red-500 text-sm"
                    >
                      {error}
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-8 text-center text-gray text-sm"
                    >
                      No certifications found
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
                          className={`px-2 md:px-4 py-2 md:py-4 ${cell.column.id === "certificateIssued" ||
                              cell.column.id === "certificateAssessment" ||
                              cell.column.id === "totalQuestions" ||
                              cell.column.id === "action"
                              ? "text-center"
                              : cell.column.id === "action"
                                ? "px-2 md:px-8"
                                : ""
                            }`}
                          style={{
                            width: cell.column.getSize() !== 150 ? `${cell.column.getSize()}px` : undefined,
                            minWidth: `${cell.column.columnDef.minSize || 100}px`,
                            maxWidth: cell.column.columnDef.maxSize ? `${cell.column.columnDef.maxSize}px` : undefined,
                          }}
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
                const totalPages = table.getPageCount();
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
                      className={`px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-sm text-[10px] md:text-xs font-normal transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${currentPage === i
                          ? "bg-dull-gray text-primary"
                          : "bg-primary text-secondary border hover:bg-zinc-100"
                        }`}
                      style={
                        currentPage !== i
                          ? { borderColor: "#E6E6E6" }
                          : undefined
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
                      className={`px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-sm text-[10px] md:text-xs font-normal transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${currentPage === totalPages - 1
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
      </div>

      
      {showActionModal && selectedCertificate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleCloseActionModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="bg-linear-to-r from-zinc-50 to-zinc-100 px-6 py-4 border-b border-zinc-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-secondary mb-1">
                    Certificate Actions
                  </h3>
                  <p className="text-sm text-gray-600 truncate max-w-70">
                    {selectedCertificate.certificationName}
                  </p>
                </div>
                <button
                  onClick={handleCloseActionModal}
                  className="p-2 hover:bg-white/80 rounded-lg transition-colors shrink-0"
                  aria-label="Close modal"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15 5L5 15M5 5L15 15"
                      stroke="#666666"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            
            <div className="p-6">
              <div className="space-y-3">
                <button
                  onClick={canWrite ? handleDuplicate : undefined}
                  disabled={!canWrite || isDuplicating}
                  className={`w-full group relative px-5 py-3.5 text-left text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-3 shadow-sm ${
                    canWrite
                      ? "text-blue-700 bg-white border-2 border-blue-100 hover:border-blue-200 hover:bg-blue-50 hover:shadow-md"
                      : "text-gray-400 bg-zinc-50 border-2 border-zinc-200 cursor-not-allowed opacity-60"
                  } ${isDuplicating ? "opacity-80" : ""}`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                      canWrite ? "bg-blue-50 group-hover:bg-blue-100" : "bg-zinc-100"
                    }`}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={canWrite ? "text-blue-600" : "text-gray-400"}
                    >
                      <rect
                        x="6"
                        y="2"
                        width="8"
                        height="10"
                        rx="1.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="2"
                        y="6"
                        width="8"
                        height="8"
                        rx="1.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div
                      className={`font-semibold ${
                        canWrite ? "text-blue-700" : "text-gray-400"
                      }`}
                    >
                      {isDuplicating ? "Duplicating..." : "Create Duplicate Certificate"}
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${
                        canWrite ? "text-blue-600" : "text-gray-400"
                      }`}
                    >
                      Create a copy of this certificate
                    </div>
                  </div>
                  {isDuplicating ? (
                    <svg
                      className="animate-spin h-4 w-4 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`transition-colors ${
                        canWrite
                          ? "text-blue-400 group-hover:text-blue-600"
                          : "text-gray-300"
                      }`}
                    >
                      <path
                        d="M6 12L10 8L6 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>

                
                <button
                  onClick={canEdit ? handleEdit : undefined}
                  disabled={!canEdit}
                  className={`w-full group relative px-5 py-3.5 text-left text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-3 shadow-sm ${
                    canEdit
                      ? "text-secondary bg-white border-2 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md"
                      : "text-gray-400 bg-zinc-50 border-2 border-zinc-200 cursor-not-allowed opacity-60"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                      canEdit ? "bg-blue-50 group-hover:bg-blue-100" : "bg-zinc-100"
                    }`}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={canEdit ? "text-blue-600" : "text-gray-400"}
                    >
                      <path
                        d="M11.3333 2.00001C11.5084 1.82491 11.7163 1.68698 11.9444 1.59431C12.1726 1.50165 12.4163 1.45605 12.6622 1.46024C12.9081 1.46443 13.1504 1.51832 13.3747 1.61855C13.599 1.71878 13.8006 1.86319 13.968 2.04334C14.1354 2.22349 14.2651 2.4356 14.3498 2.66664C14.4345 2.89768 14.4723 3.14298 14.4611 3.38831C14.4499 3.63364 14.3899 3.87418 14.2847 4.09554C14.1795 4.3169 14.0314 4.51452 13.8487 4.67734L6.18133 12.3447L2 13.3333L2.98867 9.15201L10.656 1.48467L11.3333 2.00001Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div
                      className={`font-semibold ${
                        canEdit ? "text-secondary" : "text-gray-400"
                      }`}
                    >
                      Edit Certificate
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${
                        canEdit ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      Modify certificate details
                    </div>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-colors ${
                      canEdit
                        ? "text-gray-400 group-hover:text-gray-600"
                        : "text-gray-300"
                    }`}
                  >
                    <path
                      d="M6 12L10 8L6 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                
                <button
                  onClick={canDelete ? handleDelete : undefined}
                  disabled={!canDelete}
                  className={`w-full group relative px-5 py-3.5 text-left text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-3 shadow-sm ${
                    canDelete
                      ? "text-red-600 bg-white border-2 border-red-100 hover:border-red-200 hover:bg-red-50 hover:shadow-md"
                      : "text-gray-400 bg-zinc-50 border-2 border-zinc-200 cursor-not-allowed opacity-60"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                      canDelete ? "bg-red-50 group-hover:bg-red-100" : "bg-zinc-100"
                    }`}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={canDelete ? "text-red-600" : "text-gray-400"}
                    >
                      <path
                        d="M2 4H14M12.6667 4V13.3333C12.6667 13.687 12.5262 14.0261 12.2761 14.2761C12.0261 14.5262 11.687 14.6667 11.3333 14.6667H4.66667C4.31305 14.6667 3.97391 14.5262 3.72386 14.2761C3.47381 14.0261 3.33333 13.687 3.33333 13.3333V4M5.33333 4V2.66667C5.33333 2.31305 5.47381 1.97391 5.72386 1.72386C5.97391 1.47381 6.31305 1.33333 6.66667 1.33333H9.33333C9.68696 1.33333 10.0261 1.47381 10.2761 1.72386C10.5262 1.97391 10.6667 2.31305 10.6667 2.66667V4M6.66667 7.33333V11.3333M9.33333 7.33333V11.3333"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div
                      className={`font-semibold ${
                        canDelete ? "text-red-600" : "text-gray-400"
                      }`}
                    >
                      Delete Certificate
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${
                        canDelete ? "text-red-500" : "text-gray-400"
                      }`}
                    >
                      Permanently remove this certificate
                    </div>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-colors ${
                      canDelete
                        ? "text-red-400 group-hover:text-red-600"
                        : "text-gray-300"
                    }`}
                  >
                    <path
                      d="M6 12L10 8L6 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                
                {selectedCertificate.status === "Draft" ? (
                  <button
                    onClick={canPublishSelected ? handlePublish : undefined}
                    disabled={!canPublishSelected || isPublishing}
                    className={`w-full group relative px-5 py-3.5 text-left text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-3 shadow-sm ${
                      canPublishSelected
                        ? "text-green-700 bg-white border-2 border-green-100 hover:border-green-200 hover:bg-green-50 hover:shadow-md"
                        : "text-gray-400 bg-zinc-50 border-2 border-zinc-200 cursor-not-allowed opacity-60"
                    } ${isPublishing ? "opacity-80" : ""}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                        canPublishSelected ? "bg-green-50 group-hover:bg-green-100" : "bg-zinc-100"
                      }`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={canPublishSelected ? "text-green-600" : "text-gray-400"}
                      >
                        <path
                          d="M13.3333 4L6 11.3333L2.66667 8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div
                        className={`font-semibold ${
                          canPublishSelected ? "text-green-700" : "text-gray-400"
                        }`}
                      >
                        {isPublishing ? "Publishing..." : "Publish Certificate"}
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${
                          canPublishSelected ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {selectedCertificate.totalQuestions > 0
                          ? "Make this certificate publicly available"
                          : "Add at least 1 question to enable publishing"}
                      </div>
                    </div>
                    {isPublishing ? (
                      <svg
                        className="animate-spin h-4 w-4 text-green-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`transition-colors ${
                          canPublishSelected
                            ? "text-green-400 group-hover:text-green-600"
                            : "text-gray-300"
                        }`}
                      >
                        <path
                          d="M6 12L10 8L6 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={canWrite ? handleUnpublish : undefined}
                    disabled={!canWrite || isPublishing}
                    className={`w-full group relative px-5 py-3.5 text-left text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-3 shadow-sm ${
                      canWrite
                        ? "text-orange-700 bg-white border-2 border-orange-100 hover:border-orange-200 hover:bg-orange-50 hover:shadow-md"
                        : "text-gray-400 bg-zinc-50 border-2 border-zinc-200 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                        canWrite ? "bg-orange-50 group-hover:bg-orange-100" : "bg-zinc-100"
                      }`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={canWrite ? "text-orange-600" : "text-gray-400"}
                      >
                        <path
                          d="M12 4L4 12M4 4L12 12"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div
                        className={`font-semibold ${
                          canWrite ? "text-orange-700" : "text-gray-400"
                        }`}
                      >
                        {isPublishing ? "Unpublishing..." : "Unpublish Certificate"}
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${
                          canWrite ? "text-orange-600" : "text-gray-400"
                        }`}
                      >
                        Make this certificate unavailable
                      </div>
                    </div>
                    {isPublishing ? (
                      <svg
                        className="animate-spin h-4 w-4 text-orange-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`transition-colors ${
                          canWrite
                            ? "text-orange-400 group-hover:text-orange-600"
                            : "text-gray-300"
                        }`}
                      >
                        <path
                          d="M6 12L10 8L6 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200">
              <button
                onClick={handleCloseActionModal}
                className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      
      {showDeleteModal && selectedCertificate && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleCancelDelete}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="px-6 py-5 border-b border-zinc-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-red-600"
                  >
                    <path
                      d="M12 9V11M12 15H12.01M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-secondary mb-1">
                    Delete Certificate
                  </h3>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>

            
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700 mb-1">
                Are you sure you want to delete the certificate:
              </p>
              <p className="text-sm font-semibold text-secondary mb-4">
                &quot;{selectedCertificate.certificationName}&quot;?
              </p>
              <p className="text-xs text-gray-500">
                All associated data, sections, and questions will be permanently removed.
              </p>
            </div>

            
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
