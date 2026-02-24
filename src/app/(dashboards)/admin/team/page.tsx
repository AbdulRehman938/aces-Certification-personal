"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import axios from "axios";
import { axiosInstance } from "@/lib/axios";
import { Loading } from "../common/Loading";
import { useUser } from "@/contexts/UserContext";

type SubadminApiResponse = {
  id: string;
  name: string;
  email: string;
  accountStatus: boolean;
  permissions: string[];
  profile_picture?: string;
  profile_picture_url?: string;
};

type Subadmin = {
  id: string;
  userId: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  profile_picture?: string;
  accountStatus?: boolean;
  permissions?: string[];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.charAt(0).toUpperCase() || '';
  const last = lastName?.charAt(0).toUpperCase() || '';
  return first + last;
};

const splitName = (name: string): { first_name: string; last_name: string } => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  const first_name = parts[0];
  const last_name = parts.slice(1).join(" ");
  return { first_name, last_name };
};

export default function TeamPage() {
  const router = useRouter();
  const [data, setData] = useState<Subadmin[]>([]);
  const {profile} = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSubadmin, setEditingSubadmin] = useState<Subadmin | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showModalLoader, setShowModalLoader] = useState(false);
  const [modalLoadingProgress, setModalLoadingProgress] = useState(0);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [editModalError, setEditModalError] = useState("");

  const [editProfilePicture, setEditProfilePicture] = useState<File | null>(
    null,
  );
  const [editProfilePicturePreview, setEditProfilePicturePreview] =
    useState<string>("");
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const loaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loaderFinishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const modalLoaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const modalLoaderFinishTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await axiosInstance.post<{
      message?: string;
      url: string;
      type: string;
    }>("/uploads/images", formData);

    if (!response.data?.url) {
      throw new Error("Failed to get image URL from upload response");
    }

    return response.data.url;
  };

  const handleEditProfilePictureChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const columns = useMemo<ColumnDef<Subadmin>[]>(
    () => [
      {
        id: "name",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Name
          </span>
        ),
        cell: ({ row }) => {
          const { first_name, last_name, profile_picture } = row.original;
          const hasProfilePicture =
            profile_picture && profile_picture.trim() !== "";
          const fullName = `${first_name} ${last_name}`;

          return (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 overflow-hidden">
                {hasProfilePicture ? (
                  <img
                    src={profile_picture}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-zinc-600">
                    {getInitials(first_name, last_name)}
                  </span>
                )}
              </div>

              <span
                className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-secondary whitespace-nowrap"
                style={{ letterSpacing: "1%" }}
              >
                {fullName}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Email
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-secondary"
            style={{ letterSpacing: "1%" }}
          >
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "role",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Role
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-secondary"
            style={{ letterSpacing: "1%" }}
          >
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
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
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-secondary whitespace-nowrap"
            style={{ letterSpacing: "1%" }}
          >
            {formatDate(getValue<string>())}
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
            Action
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setEditingSubadmin(row.original);
                setFirstName(row.original.first_name);
                setLastName(row.original.last_name);
                setEditProfilePicturePreview(
                  row.original.profile_picture || "",
                );
                setEditProfilePicture(null);
                setEditModalError("");
                setIsEditModalOpen(true);
              }}
              className="w-8 h-8 bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors rounded-lg"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.5 17.5V13.9583L13.5 2.97917C13.6667 2.82639 13.8508 2.70833 14.0525 2.625C14.2542 2.54167 14.4658 2.5 14.6875 2.5C14.9092 2.5 15.1244 2.54167 15.3333 2.625C15.5422 2.70833 15.7228 2.83333 15.875 3L17.0208 4.16667C17.1875 4.31944 17.3092 4.5 17.3858 4.70833C17.4625 4.91667 17.5006 5.125 17.5 5.33333C17.5 5.55556 17.4619 5.7675 17.3858 5.96917C17.3097 6.17083 17.1881 6.35472 17.0208 6.52083L6.04167 17.5H2.5ZM14.6667 6.5L15.8333 5.33333L14.6667 4.16667L13.5 5.33333L14.6667 6.5Z"
                  fill="#262626"
                />
              </svg>
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams({
                  id: row.original.userId,
                });
                router.push(`/admin/team/permissions?${params.toString()}`);
              }}
              className="w-8 h-8 bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors rounded-lg"
              aria-label="Manage permissions"
              title="Manage permissions"
            >
              <img
                src="/assets/imgs/permission.svg"
                alt="Permissions"
                className="w-4 h-4"
              />
            </button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const totalPages = useMemo(() => {
    if (total <= 0) return 1;
    return Math.max(1, Math.ceil(total / limit));
  }, [limit, total]);

  const fetchSubadmins = useCallback(async () => {
    setIsFetching(true);
    setError("");
    try {
      const response = await axiosInstance.get<{
        message: string;
        data: SubadminApiResponse[];
        total: number;
      }>("/subadmins/list", {
        params: {
          limit,
          pageNumber,
        },
      });

      const transformedData: Subadmin[] = response.data.data.map((item) => {
        const { first_name, last_name } = splitName(item.name);
        return {
          id: item.id,
          userId: item.id,
          email: item.email,
          first_name,
          last_name,
          role: "subadmin",
          created_at: new Date().toISOString(),
          accountStatus: item.accountStatus,
          permissions: item.permissions,
          profile_picture:
            item.profile_picture || item.profile_picture_url || undefined,
        };
      });

      setData(transformedData);
      setTotal(response.data.total);
    } catch (err) {
      console.error("Failed to fetch subadmins:", err);
      let errorMessage = "Failed to load subadmins. Please try again.";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setError(errorMessage);
      setData([]);
    } finally {
      setIsFetching(false);
    }
  }, [pageNumber, limit]);

  useEffect(() => {
    fetchSubadmins();
  }, [fetchSubadmins]);

  useEffect(() => {
    if (loaderIntervalRef.current) {
      clearInterval(loaderIntervalRef.current);
      loaderIntervalRef.current = null;
    }
    if (loaderFinishTimeoutRef.current) {
      clearTimeout(loaderFinishTimeoutRef.current);
      loaderFinishTimeoutRef.current = null;
    }

    if (isFetching) {
      setShowLoader(true);
      setLoadingProgress(0);
      loaderIntervalRef.current = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 95) return prev;
          const step = Math.max(1, Math.round((95 - prev) / 8));
          return Math.min(prev + step, 95);
        });
      }, 120);
      return;
    }

    if (showLoader) {
      setLoadingProgress(100);
      loaderFinishTimeoutRef.current = setTimeout(() => {
        setShowLoader(false);
        setLoadingProgress(0);
      }, 300);
    }
  }, [isFetching, showLoader]);

  useEffect(() => {
    if (modalLoaderIntervalRef.current) {
      clearInterval(modalLoaderIntervalRef.current);
      modalLoaderIntervalRef.current = null;
    }
    if (modalLoaderFinishTimeoutRef.current) {
      clearTimeout(modalLoaderFinishTimeoutRef.current);
      modalLoaderFinishTimeoutRef.current = null;
    }

    if (isLoading) {
      setShowModalLoader(true);
      setModalLoadingProgress(0);
      modalLoaderIntervalRef.current = setInterval(() => {
        setModalLoadingProgress((prev) => {
          if (prev >= 95) return prev;
          const step = Math.max(1, Math.round((95 - prev) / 8));
          return Math.min(prev + step, 95);
        });
      }, 120);
      return;
    }

    if (showModalLoader) {
      setModalLoadingProgress(100);
      modalLoaderFinishTimeoutRef.current = setTimeout(() => {
        setShowModalLoader(false);
        setModalLoadingProgress(0);
      }, 300);
    }
  }, [isLoading, showModalLoader]);

  const handleCreate = async () => {
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setModalError("All fields are required");
      return;
    }

    setIsLoading(true);
    setModalError("");
    try {
      const payload = {
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      };

      await axiosInstance.post("/auth/register-subadmin", payload);

      await fetchSubadmins();
      setIsModalOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setModalError("");
    } catch (err) {
      console.error("Failed to create subadmin:", err);
      let errorMessage = "Failed to create subadmin. Please try again.";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setModalError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!firstName.trim() || !lastName.trim() || !editingSubadmin) {
      setEditModalError("First name and last name are required");
      return;
    }

    setIsLoading(true);
    setEditModalError("");
    try {
      let profilePictureUrl = editingSubadmin.profile_picture || "";

      if (editProfilePicture) {
        profilePictureUrl = await uploadImage(editProfilePicture);
      }

      const payload: {
        first_name: string;
        last_name: string;
        profile_picture_url?: string;
      } = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      };

      if (profilePictureUrl !== (editingSubadmin.profile_picture || "")) {
        payload.profile_picture_url = profilePictureUrl;
      }

      console.log("Update payload:", payload);
      console.log("Profile picture URL:", profilePictureUrl);
      console.log("Original profile picture:", editingSubadmin.profile_picture);

      const response = await axiosInstance.patch(
        `/subadmins/profile?subadminId=${editingSubadmin.userId}`,
        payload,
      );
      console.log("Update API response:", response);
      console.log("Update API response data:", response.data);

      await fetchSubadmins();

      setIsEditModalOpen(false);
      setEditingSubadmin(null);
      setFirstName("");
      setLastName("");
      setEditProfilePicture(null);
      setEditProfilePicturePreview("");
      if (editFileInputRef.current) {
        editFileInputRef.current.value = "";
      }
      setEditModalError("");
    } catch (err) {
      console.error("Failed to update subadmin:", err);
      let errorMessage = "Failed to update subadmin. Please try again.";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setEditModalError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-light-gray min-h-screen p-3 md:p-6 flex flex-col">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 md:mb-6 gap-3 md:gap-0">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
            Team
          </h1>
          <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
            Manage your team members and subadmins
          </p>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setModalError("");
            setEmail("");
            setFirstName("");
            setLastName("");
          }}
          className="px-3 py-1.5 md:px-8 md:py-3 bg-dull-gray text-primary rounded-lg text-[10px] md:text-sm font-medium hover:bg-dull-gray/90 transition-colors shrink-0"
          style={{
            boxShadow:
              "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
          }}
        >
          Add Subadmin
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-lg">
          <p className="text-sm font-semibold text-red">{error}</p>
        </div>
      )}

      <div
        className={`bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden ${
          showLoader ? "flex flex-col flex-1" : ""
        }`}
      >
        <div
          className={`relative ${showLoader ? "flex-1 overflow-x-auto" : "overflow-x-auto"}`}
        >
          <table
            className={`w-full min-w-250 ${showLoader ? "h-full" : ""}`}
            style={{ tableLayout: "fixed" }}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-zinc-100">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-2 md:px-4 py-2 md:py-4 text-left ${
                        header.id === "action" ? "text-center md:px-6" : ""
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
            <tbody className={showLoader ? "h-full" : ""}>
              {showLoader ? null : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-gray text-sm"
                  >
                    No subadmins found
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
                            ? "px-2 md:px-8 text-center"
                            : ""
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

          {showLoader && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loading
                isLoading
                size="sm"
                progress={loadingProgress}
                className="p-4"
              />
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="px-2 md:px-4 py-3 md:py-4 border-t border-zinc-100 flex items-center justify-center overflow-x-auto">
            <div className="flex items-center gap-0.5 md:gap-1">
              <button
                onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                disabled={pageNumber === 1 || isFetching}
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
                const currentPage = Math.min(
                  Math.max(pageNumber - 1, 0),
                  totalPages - 1,
                );
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
                      onClick={() => setPageNumber(i + 1)}
                      className={`px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-sm text-[10px] md:text-xs font-normal transition-colors ${
                        currentPage === i
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
                      onClick={() => setPageNumber(totalPages)}
                      className={`px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-sm text-[10px] md:text-xs font-normal transition-colors ${
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
                    </button>,
                  );
                }
                return pages;
              })()}
              <button
                onClick={() =>
                  setPageNumber((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={pageNumber >= totalPages || isFetching}
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
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setIsModalOpen(false);
              setModalError("");
              setEmail("");
              setFirstName("");
              setLastName("");
            }}
          />

          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl mx-2 md:mx-4">
            {showModalLoader && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                <Loading
                  isLoading
                  size="sm"
                  progress={modalLoadingProgress}
                  className="p-4"
                />
              </div>
            )}
            <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2
                    className="text-[16px] md:text-[18px] font-semibold text-secondary mb-1 leading-[21.6px] align-middle"
                    style={{ letterSpacing: "0%" }}
                  >
                    Add Subadmin
                  </h2>
                  <p
                    className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle"
                    style={{ letterSpacing: "0%" }}
                  >
                    Create a new subadmin account
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalError("");
                    setEmail("");
                    setFirstName("");
                    setLastName("");
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
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="create-email"
                    className="block text-secondary mb-2 md:mb-3"
                    style={{
                      fontWeight: 400,
                      fontSize: "13px",
                      lineHeight: "100%",
                      letterSpacing: "0%",
                    }}
                  >
                    <span className="md:hidden" style={{ fontSize: "12px" }}>
                      Email
                    </span>
                    <span
                      className="hidden md:inline"
                      style={{ fontSize: "14.01px" }}
                    >
                      Email
                    </span>
                  </label>
                  <input
                    id="create-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setModalError("");
                    }}
                    placeholder="Enter email address"
                    className={`w-full px-3 md:px-4 py-2 md:py-3 border rounded-lg text-secondary placeholder:text-gray focus:outline-none focus:ring-2 focus:border-transparent text-[13px] md:text-[14px] ${
                      modalError
                        ? "border-red focus:ring-red/20"
                        : "border-zinc-200 focus:ring-zinc-200"
                    }`}
                    style={{
                      fontWeight: 400,
                      lineHeight: "19.2px",
                      letterSpacing: "0%",
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="create-first-name"
                    className="block text-secondary mb-2 md:mb-3"
                    style={{
                      fontWeight: 400,
                      fontSize: "13px",
                      lineHeight: "100%",
                      letterSpacing: "0%",
                    }}
                  >
                    <span className="md:hidden" style={{ fontSize: "12px" }}>
                      First Name
                    </span>
                    <span
                      className="hidden md:inline"
                      style={{ fontSize: "14.01px" }}
                    >
                      First Name
                    </span>
                  </label>
                  <input
                    id="create-first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setModalError("");
                    }}
                    placeholder="Enter first name"
                    className={`w-full px-3 md:px-4 py-2 md:py-3 border rounded-lg text-secondary placeholder:text-gray focus:outline-none focus:ring-2 focus:border-transparent text-[13px] md:text-[14px] ${
                      modalError
                        ? "border-red focus:ring-red/20"
                        : "border-zinc-200 focus:ring-zinc-200"
                    }`}
                    style={{
                      fontWeight: 400,
                      lineHeight: "19.2px",
                      letterSpacing: "0%",
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="create-last-name"
                    className="block text-secondary mb-2 md:mb-3"
                    style={{
                      fontWeight: 400,
                      fontSize: "13px",
                      lineHeight: "100%",
                      letterSpacing: "0%",
                    }}
                  >
                    <span className="md:hidden" style={{ fontSize: "12px" }}>
                      Last Name
                    </span>
                    <span
                      className="hidden md:inline"
                      style={{ fontSize: "14.01px" }}
                    >
                      Last Name
                    </span>
                  </label>
                  <input
                    id="create-last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setModalError("");
                    }}
                    placeholder="Enter last name"
                    className={`w-full px-3 md:px-4 py-2 md:py-3 border rounded-lg text-secondary placeholder:text-gray focus:outline-none focus:ring-2 focus:border-transparent text-[13px] md:text-[14px] ${
                      modalError
                        ? "border-red focus:ring-red/20"
                        : "border-zinc-200 focus:ring-zinc-200"
                    }`}
                    style={{
                      fontWeight: 400,
                      lineHeight: "19.2px",
                      letterSpacing: "0%",
                    }}
                  />
                </div>

                {modalError && (
                  <p className="text-xs md:text-sm text-red mt-2 font-medium">
                    {modalError}
                  </p>
                )}
              </div>
            </div>

            <div className="px-4 md:px-6 pb-4 md:pb-6 flex items-center justify-end gap-2 md:gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEmail("");
                  setFirstName("");
                  setLastName("");
                  setModalError("");
                }}
                disabled={isLoading}
                className="px-6 md:px-10 py-2 md:py-2.5 bg-white text-secondary border border-zinc-200 rounded-lg text-xs md:text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  isLoading ||
                  !email.trim() ||
                  !firstName.trim() ||
                  !lastName.trim()
                }
                className="px-8 md:px-13 py-2 md:py-2.5 bg-dull-gray text-primary rounded-lg text-xs md:text-sm font-medium hover:bg-dull-gray/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }}
              >
                {isLoading ? "Adding..." : "Add Subadmin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingSubadmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setIsEditModalOpen(false);
              setEditingSubadmin(null);
              setFirstName("");
              setLastName("");
              setEditProfilePicture(null);
              setEditProfilePicturePreview("");
              if (editFileInputRef.current) {
                editFileInputRef.current.value = "";
              }
              setEditModalError("");
            }}
          />

          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl mx-2 md:mx-4">
            {showModalLoader && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                <Loading
                  isLoading
                  size="sm"
                  progress={modalLoadingProgress}
                  className="p-4"
                />
              </div>
            )}
            <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2
                    className="text-[16px] md:text-[18px] font-semibold text-secondary mb-1 leading-[21.6px] align-middle"
                    style={{ letterSpacing: "0%" }}
                  >
                    Edit Subadmin
                  </h2>
                  <p
                    className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle"
                    style={{ letterSpacing: "0%" }}
                  >
                    Update subadmin information
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingSubadmin(null);
                    setFirstName("");
                    setLastName("");
                    setEditProfilePicture(null);
                    setEditProfilePicturePreview("");
                    if (editFileInputRef.current) {
                      editFileInputRef.current.value = "";
                    }
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
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="edit-profile-picture"
                    className="block text-secondary mb-2 md:mb-3"
                    style={{
                      fontWeight: 400,
                      fontSize: "13px",
                      lineHeight: "100%",
                      letterSpacing: "0%",
                    }}
                  >
                    <span className="md:hidden" style={{ fontSize: "12px" }}>
                      Profile Picture
                    </span>
                    <span
                      className="hidden md:inline"
                      style={{ fontSize: "14.01px" }}
                    >
                      Profile Picture
                    </span>
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {editProfilePicturePreview ? (
                        <img
                          src={editProfilePicturePreview}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-zinc-600">
                          {getInitials(firstName, lastName) || "PP"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        id="edit-profile-picture"
                        ref={editFileInputRef}
                        onChange={handleEditProfilePictureChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="px-4 py-2 text-sm font-medium text-secondary border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                      >
                        Upload Photo
                      </button>
                      {editProfilePicture && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditProfilePicture(null);
                            setEditProfilePicturePreview(
                              editingSubadmin.profile_picture || "",
                            );
                            if (editFileInputRef.current) {
                              editFileInputRef.current.value = "";
                            }
                          }}
                          className="ml-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="edit-email"
                    className="block text-secondary mb-2 md:mb-3"
                    style={{
                      fontWeight: 400,
                      fontSize: "13px",
                      lineHeight: "100%",
                      letterSpacing: "0%",
                    }}
                  >
                    <span className="md:hidden" style={{ fontSize: "12px" }}>
                      Email
                    </span>
                    <span
                      className="hidden md:inline"
                      style={{ fontSize: "14.01px" }}
                    >
                      Email
                    </span>
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    value={editingSubadmin.email}
                    disabled
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-zinc-200 rounded-lg text-secondary bg-zinc-50 text-[13px] md:text-[14px] cursor-not-allowed"
                    style={{
                      fontWeight: 400,
                      lineHeight: "19.2px",
                      letterSpacing: "0%",
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-first-name"
                    className="block text-secondary mb-2 md:mb-3"
                    style={{
                      fontWeight: 400,
                      fontSize: "13px",
                      lineHeight: "100%",
                      letterSpacing: "0%",
                    }}
                  >
                    <span className="md:hidden" style={{ fontSize: "12px" }}>
                      First Name
                    </span>
                    <span
                      className="hidden md:inline"
                      style={{ fontSize: "14.01px" }}
                    >
                      First Name
                    </span>
                  </label>
                  <input
                    id="edit-first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setEditModalError("");
                    }}
                    placeholder="Enter first name"
                    className={`w-full px-3 md:px-4 py-2 md:py-3 border rounded-lg text-secondary placeholder:text-gray focus:outline-none focus:ring-2 focus:border-transparent text-[13px] md:text-[14px] ${
                      editModalError
                        ? "border-red focus:ring-red/20"
                        : "border-zinc-200 focus:ring-zinc-200"
                    }`}
                    style={{
                      fontWeight: 400,
                      lineHeight: "19.2px",
                      letterSpacing: "0%",
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-last-name"
                    className="block text-secondary mb-2 md:mb-3"
                    style={{
                      fontWeight: 400,
                      fontSize: "13px",
                      lineHeight: "100%",
                      letterSpacing: "0%",
                    }}
                  >
                    <span className="md:hidden" style={{ fontSize: "12px" }}>
                      Last Name
                    </span>
                    <span
                      className="hidden md:inline"
                      style={{ fontSize: "14.01px" }}
                    >
                      Last Name
                    </span>
                  </label>
                  <input
                    id="edit-last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setEditModalError("");
                    }}
                    placeholder="Enter last name"
                    className={`w-full px-3 md:px-4 py-2 md:py-3 border rounded-lg text-secondary placeholder:text-gray focus:outline-none focus:ring-2 focus:border-transparent text-[13px] md:text-[14px] ${
                      editModalError
                        ? "border-red focus:ring-red/20"
                        : "border-zinc-200 focus:ring-zinc-200"
                    }`}
                    style={{
                      fontWeight: 400,
                      lineHeight: "19.2px",
                      letterSpacing: "0%",
                    }}
                  />
                </div>

                {editModalError && (
                  <p className="text-xs md:text-sm text-red mt-2 font-medium">
                    {editModalError}
                  </p>
                )}
              </div>
            </div>

            <div className="px-4 md:px-6 pb-4 md:pb-6 flex items-center justify-end gap-2 md:gap-3">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingSubadmin(null);
                  setFirstName("");
                  setLastName("");
                  setEditModalError("");
                }}
                disabled={isLoading}
                className="px-6 md:px-10 py-2 md:py-2.5 bg-white text-secondary border border-zinc-200 rounded-lg text-xs md:text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isLoading || !firstName.trim() || !lastName.trim()}
                className="px-8 md:px-13 py-2 md:py-2.5 bg-dull-gray text-primary rounded-lg text-xs md:text-sm font-medium hover:bg-dull-gray/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }}
              >
                {isLoading ? "Updating..." : "Update Subadmin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

