"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { axiosInstance } from "@/lib/axios";
import { Loading } from "../../common/Loading";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

type ProfilePermission = {
  resource: string;
  action: string[];
};

type SubadminProfile = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profile_picture?: string | null;
  created_at: string;
  updated_at: string;
  accountstatus: boolean;
  permissions: ProfilePermission[];
};

type SubadminProfileResponse = {
  message: string;
  data: SubadminProfile;
};

type PermissionRow = {
  resource: string;
  pageName: string;
  read: boolean;
  write: boolean;
  edit: boolean;
  delete: boolean;
};

const initialPermissions: PermissionRow[] = [
  {
    resource: "industry",
    pageName: "Industry",
    read: false,
    write: false,
    edit: false,
    delete: false,
  },
  {
    resource: "certifications",
    pageName: "Certifications",
    read: false,
    write: false,
    edit: false,
    delete: false,
  },
  {
    resource: "assessment",
    pageName: "Assessment",
    read: false,
    write: false,
    edit: false,
    delete: false,
  },
  {
    resource: "aiFlags",
    pageName: "Ai Flags",
    read: false,
    write: false,
    edit: false,
    delete: false,
  },
  {
    resource: "auditor",
    pageName: "Auditor & Reviewer",
    read: false,
    write: false,
    edit: false,
    delete: false,
  },
  {
    resource: "payment",
    pageName: "Payments",
    read: false,
    write: false,
    edit: false,
    delete: false,
  },
  {
    resource: "setting",
    pageName: "Settings",
    read: false,
    write: false,
    edit: false,
    delete: false,
  },
  {
    resource: "supportCenter",
    pageName: "Support Center",
    read: false,
    write: false,
    edit: false,
    delete: false,
  },
  {
    resource: "messages",
    pageName: "Messages",
    read: false,
    write: false,
    edit: false,
    delete: false,
  },
];

const PermissionsContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subadminId = searchParams.get("id") || "";
  const [userName, setUserName] = useState("User");
  const [permissions, setPermissions] =
    useState<PermissionRow[]>(initialPermissions);
  const [originalPermissions, setOriginalPermissions] =
    useState<PermissionRow[]>(initialPermissions);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [showSaveLoader, setShowSaveLoader] = useState(false);
  const [saveLoadingProgress, setSaveLoadingProgress] = useState(0);
  const saveLoaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const saveLoaderFinishTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    if (!subadminId) return;

    const fetchProfile = async () => {
      setIsProfileLoading(true);
      try {
        const response = await axiosInstance.get<SubadminProfileResponse>(
          `/subadmins/${subadminId}/profile`,
        );
        const profile = response.data?.data;
        if (!profile) return;

        const fullName =
          `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
        setUserName(fullName || "User");

        const permissionMap = new Map<string, Set<string>>();
        profile.permissions?.forEach((permission) => {
          permissionMap.set(
            permission.resource,
            new Set(permission.action ?? []),
          );
        });

        const nextPermissions = initialPermissions.map((row) => {
          const actions = permissionMap.get(row.resource) ?? new Set<string>();
          const hasRead =
            actions.has("read") ||
            actions.has("write") ||
            actions.has("edit") ||
            actions.has("delete");
          return {
            ...row,
            read: hasRead,
            write: actions.has("write"),
            edit: actions.has("edit"),
            delete: actions.has("delete"),
          };
        });

        setPermissions(nextPermissions);
        setOriginalPermissions(nextPermissions.map((row) => ({ ...row })));
      } catch (error) {
        console.error("Failed to fetch subadmin profile:", error);
      } finally {
        setIsProfileLoading(false);
      }
    };

    fetchProfile();
  }, [subadminId]);

  const handleToggle = (
    resource: string,
    key: "read" | "write" | "edit" | "delete",
  ) => {
    setPermissions((prev) =>
      prev.map((row) =>
        row.resource === resource
          ? {
              ...row,
              read: key === "read" ? !row.read : row.read || !row[key],
              write:
                key === "read" && row.read
                  ? false
                  : key === "write"
                    ? !row.write
                    : row.write,
              edit:
                key === "read" && row.read
                  ? false
                  : key === "edit"
                    ? !row.edit
                    : row.edit,
              delete:
                key === "read" && row.read
                  ? false
                  : key === "delete"
                    ? !row.delete
                    : row.delete,
            }
          : row,
      ),
    );
  };

  const getActions = (row: PermissionRow) =>
    (["read", "write", "edit", "delete"] as const).filter(
      (action) => row[action],
    );

  const handleSavePermissions = () => {
    if (!subadminId) {
      console.error("Missing subadmin id in query params.");
      return;
    }

    const originalMap = new Map<string, Set<string>>();
    originalPermissions.forEach((row) => {
      originalMap.set(row.resource, new Set(getActions(row)));
    });

    const currentMap = new Map<string, Set<string>>();
    permissions.forEach((row) => {
      currentMap.set(row.resource, new Set(getActions(row)));
    });

    const resources = new Set<string>([
      ...originalMap.keys(),
      ...currentMap.keys(),
    ]);

    const toGrant: { resource: string; action: string[] }[] = [];
    const toRemove: { resource: string; action: string[] }[] = [];

    resources.forEach((resource) => {
      const originalActions = originalMap.get(resource) ?? new Set<string>();
      const currentActions = currentMap.get(resource) ?? new Set<string>();

      const grantActions: string[] = [];
      const removeActions: string[] = [];

      currentActions.forEach((action) => {
        if (!originalActions.has(action)) grantActions.push(action);
      });

      originalActions.forEach((action) => {
        if (!currentActions.has(action)) removeActions.push(action);
      });

      if (grantActions.length > 0) {
        toGrant.push({ resource, action: grantActions });
      }
      if (removeActions.length > 0) {
        toRemove.push({ resource, action: removeActions });
      }
    });

    if (toGrant.length === 0 && toRemove.length === 0) {
      router.push("/admin/team");
      return;
    }

    setIsSavingPermissions(true);
    const requests: Promise<unknown>[] = [];

    if (toGrant.length > 0) {
      requests.push(
        axiosInstance.post(`/subadmins/${subadminId}/permissions/grant`, {
          permissions: toGrant,
        }),
      );
    }
    if (toRemove.length > 0) {
      requests.push(
        axiosInstance.post(`/subadmins/${subadminId}/permissions/remove`, {
          permissions: toRemove,
        }),
      );
    }

    Promise.all(requests)
      .then(() => {
        setOriginalPermissions(permissions.map((row) => ({ ...row })));
        router.push("/admin/team");
      })
      .catch((error) => {
        console.error("Failed to save permissions:", error);
      })
      .finally(() => {
        setIsSavingPermissions(false);
      });
  };

  useEffect(() => {
    if (saveLoaderIntervalRef.current) {
      clearInterval(saveLoaderIntervalRef.current);
      saveLoaderIntervalRef.current = null;
    }
    if (saveLoaderFinishTimeoutRef.current) {
      clearTimeout(saveLoaderFinishTimeoutRef.current);
      saveLoaderFinishTimeoutRef.current = null;
    }

    if (isSavingPermissions) {
      setShowSaveLoader(true);
      setSaveLoadingProgress(0);
      saveLoaderIntervalRef.current = setInterval(() => {
        setSaveLoadingProgress((prev) => {
          if (prev >= 95) return prev;
          const step = Math.max(1, Math.round((95 - prev) / 8));
          return Math.min(prev + step, 95);
        });
      }, 120);
      return;
    }

    if (showSaveLoader) {
      setSaveLoadingProgress(100);
      saveLoaderFinishTimeoutRef.current = setTimeout(() => {
        setShowSaveLoader(false);
        setSaveLoadingProgress(0);
      }, 300);
    }
  }, [isSavingPermissions, showSaveLoader]);

  return (
    <div className="relative bg-light-gray min-h-screen p-3 md:p-6">
      {showSaveLoader && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-light-gray/80 backdrop-blur-sm">
          <Loading
            isLoading
            size="lg"
            progress={saveLoadingProgress}
            className="p-6"
          />
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 md:mb-6 gap-3 md:gap-0">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
            Permission
          </h1>
          <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
            Manage permissions as per your team requirements.
          </p>
        </div>
        <button
          className="px-3 py-1.5 md:px-8 md:py-3 bg-dull-gray text-primary rounded-lg text-[10px] md:text-sm font-medium hover:bg-dull-gray/90 transition-colors shrink-0"
          onClick={handleSavePermissions}
          disabled={isSavingPermissions || isProfileLoading}
          style={{
            boxShadow:
              "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
          }}
        >
          {isSavingPermissions ? "Saving..." : "Save Permissions"}
        </button>
      </div>

      <h1 className="text-[16px] md:text-[20px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
        Manage permissions for{" "}
        <span className="text-secondary">{userName}</span>
      </h1>

      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-2 md:px-4 py-2 md:py-4 text-left">
                  <span
                    className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
                    style={{ color: "#9B9B9B", letterSpacing: "1%" }}
                  >
                    Page Name
                  </span>
                </th>
                {["Read", "Write", "Edit", "Delete"].map((label) => (
                  <th
                    key={label}
                    className="px-2 md:px-4 py-2 md:py-4 text-center"
                  >
                    <span
                      className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
                      style={{ color: "#9B9B9B", letterSpacing: "1%" }}
                    >
                      {label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isProfileLoading
                ? initialPermissions.map((_, rowIndex) => (
                    <tr
                      key={`permissions-skeleton-row-${rowIndex}`}
                      className="border-b border-zinc-100 last:border-b-0"
                    >
                      <td className="px-2 md:px-4 py-2 md:py-4">
                        <Skeleton height={18} width="60%" borderRadius={6} />
                      </td>
                      {["read", "write", "edit", "delete"].map((key) => (
                        <td
                          key={`permissions-skeleton-cell-${rowIndex}-${key}`}
                          className="px-1 md:px-2 py-2 md:py-4 text-center"
                        >
                          <div className="flex justify-center">
                            <Skeleton height={16} width={16} borderRadius={4} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))
                : permissions.map((row) => (
                    <tr
                      key={row.resource}
                      className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 transition-colors"
                    >
                      <td className="px-2 md:px-4 py-2 md:py-4">
                        <span
                          className="text-[12px] md:text-sm font-normal leading-[100%] align-middle text-secondary"
                          style={{ letterSpacing: "1%" }}
                        >
                          {row.pageName}
                        </span>
                      </td>
                      {(["read", "write", "edit", "delete"] as const).map((key) => (
                        <td
                          key={key}
                          className="px-1 md:px-2 py-2 md:py-4 text-center"
                        >
                          <input
                            type="checkbox"
                            checked={row[key]}
                            onChange={() => handleToggle(row.resource, key)}
                            disabled={key !== "read" && !row.read}
                            className="h-4 w-4 accent-black cursor-pointer"
                            aria-label={`${row.pageName} ${key}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function PermissionsPage() {
  return (
    <Suspense fallback={<div>Loading permissions...</div>}>
      <PermissionsContent />
    </Suspense>
  );
}
