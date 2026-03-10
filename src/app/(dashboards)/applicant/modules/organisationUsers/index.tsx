"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui";
import { axiosInstance } from "@/lib/axios";
import type { ApiError } from "@/lib/api-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { Lock } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { IoIosAlert } from "react-icons/io";
import { MdFilterListAlt } from "react-icons/md";
import { FiRefreshCw } from "react-icons/fi";
import {
  Grid,
  Award,
  GitBranch,
  User,
  Users,
  HelpCircle,
  FileText,
  Camera,
  X,
} from "lucide-react";

type OrganisationUser = {
  employeeId?: string;
  userId?: string;
  branchId?: string;
  name: string;
  email: string;
  branch: string;
  designation: string;
  department?: string;
  status: "Active" | "Pending";
  profilePicture?: string | null;
};

const initialOrganisationUsers: OrganisationUser[] = [];

type Branch = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
};

type PermissionKey =
  | "dashboard"
  | "certificates"
  | "branches"
  | "profile"
  | "organization_users"
  | "support_center"
  | "legal";

type PermissionState = {
  enabled: boolean;
  read: boolean;
  write: boolean;
};

type PermissionsState = Record<PermissionKey, PermissionState>;

type ApiPermission = {
  resource?: string;
  action?: string[] | string;
};

const permissionResourceAliases: Record<string, PermissionKey> = {
  dashboard: "dashboard",
  certificates: "certificates",
  certificate: "certificates",
  branches: "branches",
  branch: "branches",
  profile: "profile",
  organization_users: "organization_users",
  "organization-users": "organization_users",
  organizationusers: "organization_users",
  users: "organization_users",
  support_center: "support_center",
  "support-center": "support_center",
  supportcenter: "support_center",
  support: "support_center",
  legal: "legal",
};

const buildEmptyPermissions = (): PermissionsState => ({
  dashboard: { enabled: false, read: false, write: false },
  certificates: { enabled: false, read: false, write: false },
  branches: { enabled: false, read: false, write: false },
  profile: { enabled: false, read: false, write: false },
  organization_users: { enabled: false, read: false, write: false },
  support_center: { enabled: false, read: false, write: false },
  legal: { enabled: false, read: false, write: false },
});

const mapApiPermissionsToForm = (
  apiPermissions?: ApiPermission[] | null,
): PermissionsState => {
  const mapped = buildEmptyPermissions();

  if (!Array.isArray(apiPermissions)) {
    return mapped;
  }

  for (const permission of apiPermissions) {
    const rawResource =
      typeof permission?.resource === "string"
        ? permission.resource.trim().toLowerCase()
        : "";
    const key = permissionResourceAliases[rawResource];
    if (!key) continue;

    const actions = Array.isArray(permission.action)
      ? permission.action
      : typeof permission.action === "string"
        ? [permission.action]
        : [];
    const actionSet = new Set(
      actions.map((action) => action.trim().toLowerCase()),
    );

    const read = actionSet.has("read");
    const write = actionSet.has("write");

    mapped[key] = {
      enabled: read || write,
      read,
      write,
    };
  }

  return mapped;
};

const PAGE_SIZE = 12;

export function OrganisationUsersPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [isInviteSuccessOpen, setIsInviteSuccessOpen] = useState(false);
  const [users, setUsers] = useState(initialOrganisationUsers);
  const [userToDelete, setUserToDelete] = useState<OrganisationUser | null>(
    null,
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUserIndex, setEditingUserIndex] = useState<number | null>(null);
  const [originalEmail, setOriginalEmail] = useState("");
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [resendCooldowns, setResendCooldowns] = useState<
    Record<string, number>
  >({});
  const [isResending, setIsResending] = useState<Record<string, boolean>>({});
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "pending"
  >("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isBranchesLoading, setIsBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [branchSearch, setBranchSearch] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifiedEmailOtp, setVerifiedEmailOtp] = useState("");

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const [profileData, setProfileData] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("organization_profile");
      try {
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const {
    isEmployee: isEmployeeRole,
    hasAccess,
    hasWrite,
  } = useEmployeePermissions(profileData);
  const canAccess = !isEmployeeRole || hasAccess("organization_users");
  const canInvite = !isEmployeeRole || hasWrite("organization_users");

  useEffect(() => {
    const loadProfile = () => {
      const stored = localStorage.getItem("organization_profile");
      if (stored) {
        try {
          setProfileData(JSON.parse(stored));
        } catch (e) {}
      }
    };
    window.addEventListener("storage", loadProfile);
    window.addEventListener("profile-updated", loadProfile);
    return () => {
      window.removeEventListener("storage", loadProfile);
      window.removeEventListener("profile-updated", loadProfile);
    };
  }, []);

  const branchFieldRef = useRef<HTMLDivElement | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setApiErrorMessage("Image size must be less than 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      setApiErrorMessage(null);
      setIsUploadingAvatar(true);
      const response = await axiosInstance.post("/uploads/images", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.url) {
        formik.setFieldValue("profile_picture_url", response.data.url);
      }
    } catch (error: any) {
      setApiErrorMessage(
        error?.response?.data?.message ||
          "Failed to upload image. Please try again.",
      );
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const emptyInviteValues: {
    name: string;
    email: string;
    branch: string;
    designation: string;
    department: string;
    permissions: PermissionsState;
    profile_picture_url: string | null;
  } = {
    name: "",
    email: "",
    branch: "",
    designation: "",
    department: "",
    permissions: buildEmptyPermissions(),
    profile_picture_url: null,
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .required("Name is required")
      .test(
        "is-full-name",
        "Please enter both first and last name",
        (value) => {
          if (!value) return false;
          const parts = value.trim().split(/\s+/);
          return parts.length >= 2 && parts.every((part) => part.length >= 2);
        },
      ),
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    branch: Yup.string().required("Branch is required"),
    designation: Yup.string().required("Designation is required"),
    department: Yup.string().optional(),
  });

  const formik = useFormik<{
    name: string;
    email: string;
    branch: string;
    designation: string;
    department: string;
    permissions: PermissionsState;
    profile_picture_url: string | null;
  }>({
    initialValues: emptyInviteValues,
    validationSchema,
    onSubmit: async (values, { resetForm, setSubmitting, setFieldError }) => {
      setApiErrorMessage(null);
      const isEditMode = editingUserIndex !== null;

      const hasInvalidPermissions = Object.values(values.permissions).some(
        (perm) => perm.enabled && !perm.read && !perm.write,
      );
      if (hasInvalidPermissions) {
        setApiErrorMessage(
          "For each selected page, choose at least Read or Write access.",
        );
        setSubmitting(false);
        return;
      }

      const hasAnyPermission = Object.values(values.permissions).some(
        (perm) => perm.enabled && (perm.read || perm.write),
      );
      if (!hasAnyPermission) {
        setApiErrorMessage(
          "Please assign at least one page permission before saving.",
        );
        setSubmitting(false);
        return;
      }

      if (!isEditMode) {
        const emailExists = users.some(
          (user) => user.email.toLowerCase() === values.email.toLowerCase(),
        );
        if (emailExists) {
          setFieldError("email", "A user with this email already exists.");
          setSubmitting(false);
          return;
        }
      }

      try {
        if (!isEditMode) {
          const [firstName, ...rest] = values.name.trim().split(" ");
          const lastName = rest.join(" ");

          const selectedBranch = branches.find(
            (branch) => branch.name === values.branch,
          );

          if (!selectedBranch) {
            setFieldError("branch", "Please select a valid branch");
            setSubmitting(false);
            return;
          }

          const permissionsPayload = Object.entries(values.permissions)
            .filter(([, perm]) => perm.enabled && (perm.read || perm.write))
            .map(([resourceKey, perm]) => {
              const actions: string[] = [];
              if (perm.read) actions.push("read");
              if (perm.write) actions.push("write");
              return {
                resource: resourceKey,
                action: actions,
              };
            });

          const payload = {
            email: values.email,
            first_name: firstName,
            last_name: lastName,
            position: values.designation,
            department: values.department,
            branch_id: selectedBranch.id,
            permissions: permissionsPayload,
          };

          const response = await axiosInstance.post<{
            message: string;
            data: {
              id: string;
              user_id: string;
              first_name: string;
              last_name: string;
              organization_id: string;
              branch_id: string;
              position: string;
              department: string;
              profile_picture: string | null;
              created_at: string;
              updated_at: string;
            };
          }>("/employee/create-account", payload);

          const createdEmployee = response.data.data;

          setUsers((prev) => {
            const next = [
              {
                employeeId: createdEmployee.id,
                userId: createdEmployee.user_id,
                branchId: createdEmployee.branch_id,
                name:
                  `${createdEmployee.first_name} ${createdEmployee.last_name}`.trim() ||
                  values.name,
                email: values.email,
                branch: values.branch,
                designation: createdEmployee.position || values.designation,
                department: createdEmployee.department || values.department,
                status: "Pending" as const,
                profilePicture: values.profile_picture_url,
              },
              ...prev,
            ];
            setCurrentPage(1);
            return next;
          });

          resetForm({ values: emptyInviteValues });
          setIsInviteOpen(false);
          setEditingUserIndex(null);
          setOriginalEmail("");
          setIsBranchOpen(false);
          setIsInviteSuccessOpen(true);
          return;
        } else {
          const emailChanged =
            values.email.toLowerCase() !== originalEmail.toLowerCase();

          if (emailChanged && !verifiedEmailOtp) {
            setIsSendingOtp(true);
            try {
              await axiosInstance.post("/auth/send-otp", {
                email: originalEmail,
                purpose: "email_verification",
              });
              setIsOtpModalOpen(true);
              setSubmitting(false);
              return;
            } catch (err: any) {
              setApiErrorMessage(
                err.message ||
                  "Unable to send OTP. You must verify email to update auditor email.",
              );
              setSubmitting(false);
              return;
            } finally {
              setIsSendingOtp(false);
            }
          }

          const userToEdit = users[editingUserIndex as number];
          const employeeId = userToEdit?.employeeId;

          const [firstName, ...rest] = values.name.trim().split(" ");
          const lastName = rest.join(" ");
          const selectedBranch = branches.find((b) => b.name === values.branch);

          const permissionsPayload = Object.entries(values.permissions)
            .filter(([, perm]) => perm.enabled && (perm.read || perm.write))
            .map(([resourceKey, perm]) => {
              const actions: string[] = [];
              if (perm.read) actions.push("read");
              if (perm.write) actions.push("write");
              return {
                resource: resourceKey,
                action: actions,
              };
            });

          const profilePayload = {
            first_name: firstName,
            last_name: lastName,
            position: values.designation,
            department: values.department,
            profile_picture_url: values.profile_picture_url || null,
            branch_id: selectedBranch?.id,
            permissions: permissionsPayload,
            status: userToEdit.status.toLowerCase(),
          };

          await axiosInstance.patch(
            `/employee/profile?employeeId=${employeeId}`,
            profilePayload,
          );
          if (emailChanged && verifiedEmailOtp) {
            await axiosInstance.patch(
              `/employee/email?employeeId=${employeeId}`,
              {
                email: values.email,
                otp: verifiedEmailOtp,
              },
            );
          }
          setUsers((prev) =>
            prev.map((user, index) =>
              index === editingUserIndex
                ? {
                    ...user,
                    name: values.name,
                    email: values.email,
                    branch: values.branch,
                    designation: values.designation,
                    department: values.department,
                    profilePicture: values.profile_picture_url,
                  }
                : user,
            ),
          );

          resetForm({ values: emptyInviteValues });
          setIsInviteOpen(false);
          setEditingUserIndex(null);
          setOriginalEmail("");
          setVerifiedEmailOtp("");
          setIsBranchOpen(false);
        }
      } catch (error: unknown) {
        const apiError = error as ApiError;

        if (apiError?.errors) {
          Object.entries(apiError.errors).forEach(([field, messages]) => {
            const message = messages?.[0];
            if (message) {
              setFieldError(field as keyof typeof values, message);
            }
          });
        }

        setApiErrorMessage(
          apiError?.message ||
            "Unable to create user account. Please try again.",
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  const fetchBranches = async () => {
    try {
      setIsBranchesLoading(true);
      setBranchesError(null);

      const response = await axiosInstance.get<{
        data: Branch[];
      }>("/branches/list");

      setBranches(response.data?.data ?? []);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setBranchesError(
        apiError?.message || "Unable to load branches. Please try again.",
      );
    } finally {
      setIsBranchesLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axiosInstance.get<{
        message: string;
        data: {
          id: string;
          user_id: string;
          first_name: string;
          last_name: string;
          organization_id: string;
          branch_id: string;
          position: string;
          department: string;
          profile_picture: string | null;
          status: string;
          created_at: string;
          updated_at: string;
          email: string;
        }[];
        pagination: {
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
      }>("/employee/list");

      const employees = response.data?.data ?? [];

      setUsers(
        employees.map((employee) => {
          const branchFromList = branches.find(
            (b) => b.id === employee.branch_id,
          );
          return {
            employeeId: employee.id,
            userId: employee.user_id,
            branchId: employee.branch_id,
            name: `${employee.first_name} ${employee.last_name}`.trim(),
            email: employee.email,
            branch: branchFromList?.name || "",
            designation: employee.position,
            department: employee.department,
            status:
              employee.status?.toLowerCase() === "active"
                ? "Active"
                : "Pending",
            profilePicture: employee.profile_picture || "",
          };
        }),
      );
      setCurrentPage(1);
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Failed to load employees", apiError);
    }
  };

  const canWriteOrgUsers = useMemo(() => {
    if (typeof window === "undefined") return true;
    try {
      const raw = localStorage.getItem("organization_profile");
      if (!raw) return true;
      const profile = JSON.parse(raw);
      if (profile?._type !== "employee") return true;
      const perms: { resource: string; action: string[] | string }[] =
        profile?.permissions ?? [];
      return perms.some((p) => {
        const actions = Array.isArray(p.action)
          ? p.action
          : typeof p.action === "string"
            ? [p.action]
            : [];
        return (
          p.resource === "organization_users" &&
          actions.some((a) => a.toLowerCase() === "write")
        );
      });
    } catch {
      return true;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadInitial = async () => {
      setIsInitialLoading(true);
      setLoadingProgress(10);

      try {
        setLoadingProgress(30);
        await fetchBranches();
        setLoadingProgress(60);
        await fetchEmployees();
        setLoadingProgress(100);
      } finally {
        if (isMounted) {
          setTimeout(() => setIsInitialLoading(false), 500);
        }
      }
    };

    const orgId =
      typeof window !== "undefined"
        ? localStorage.getItem("organization_id")
        : null;

    if (orgId && orgId !== "undefined") {
      loadInitial();
    } else {
      const handleProfileUpdate = () => {
        if (isMounted) loadInitial();
      };
      window.addEventListener("profile-updated", handleProfileUpdate);
    }

    return () => {
      isMounted = false;
      window.removeEventListener("profile-updated", loadInitial as any);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const anyModalOpen =
      isInviteOpen || isInviteSuccessOpen || isDeleteOpen || isCloseConfirmOpen;

    if (anyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isInviteOpen, isInviteSuccessOpen, isDeleteOpen, isCloseConfirmOpen]);

  useEffect(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const visibleUsers = users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.status === "Active") ||
        (statusFilter === "pending" && user.status === "Pending");

      return matchesSearch && matchesStatus;
    });

    const totalPagesForFilter = Math.max(
      1,
      Math.ceil(visibleUsers.length / PAGE_SIZE),
    );

    setCurrentPage((prev) => Math.min(prev, totalPagesForFilter));
  }, [users, searchTerm, statusFilter]);

  useEffect(() => {
    if (Object.keys(resendCooldowns).length === 0) return;

    const interval = setInterval(() => {
      setResendCooldowns((prev) => {
        const next: Record<string, number> = {};
        for (const [email, seconds] of Object.entries(prev)) {
          if (seconds > 1) {
            next[email] = seconds - 1;
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCooldowns]);

  if (!canAccess) {
    const isEmployee = pathname.startsWith("/employee");
    const base = isEmployee ? "/employee" : "/applicant";
    return (
      <div className="p-6 lg:p-10 bg-dull-white/10 min-h-[80vh] flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-sm border border-zinc-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-secondary mb-2">
            Access Denied
          </h2>
          <p className="text-gray text-sm mb-6">
            You do not have permission to view this page. Please contact your
            administrator to request access.
          </p>
          <Button
            variant="secondary"
            className="w-full h-12 bg-secondary text-primary hover:bg-zinc-800 transition-colors rounded-xl"
            onClick={() => router.push(base)}
          >
            Go Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !normalizedSearch ||
      user.name.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.status === "Active") ||
      (statusFilter === "pending" && user.status === "Pending");

    return matchesSearch && matchesStatus;
  });

  const pendingCount = users.filter((u) => u.status === "Pending").length;
  const activeCount = users.filter((u) => u.status === "Active").length;

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  const isEditMode = editingUserIndex !== null;
  const emailChanged =
    isEditMode && formik.values.email && formik.values.email !== originalEmail;

  const buildFormValuesFromUser = (user: OrganisationUser) => ({
    name: user.name,
    email: user.email,
    branch: user.branch,
    designation: user.designation,
    department: user.department || "",
    permissions: buildEmptyPermissions(),
    profile_picture_url: user.profilePicture || null,
  });

  const handleRequestCloseInvite = () => {
    if (formik.dirty) {
      setIsCloseConfirmOpen(true);
    } else {
      formik.resetForm({ values: emptyInviteValues });
      setIsInviteOpen(false);
      setEditingUserIndex(null);
      setOriginalEmail("");
      setApiErrorMessage(null);
      setOtpError(null);
      setEmailOtp("");
      setVerifiedEmailOtp("");
    }
  };

  const handleEditUser = async (
    user: OrganisationUser,
    absoluteIndex: number,
  ) => {
    setEditingUserIndex(absoluteIndex);
    setOriginalEmail(user.email);
    formik.setValues(buildFormValuesFromUser(user));
    formik.setTouched({}, false);
    formik.setErrors({});
    setIsInviteOpen(true);

    if (!user.employeeId || !user.userId) return;

    try {
      const response = await axiosInstance.get<{
        message: string;
        data: {
          id: string;
          user_id: string;
          first_name: string;
          last_name: string;
          email: string;
          organization_id: string;
          position: string;
          department: string;
          branch_id: string;
          profile_picture: string | null;
          created_at: string;
          updated_at: string;
          permissions?: ApiPermission[];
        };
      }>(`/employee/${user.employeeId}`);

      const employee = response.data.data;

      const branchFromList = branches.find(
        (branch) => branch.id === employee.branch_id,
      );

      formik.setValues({
        ...formik.values,
        name:
          `${employee.first_name} ${employee.last_name}`.trim() ||
          formik.values.name,
        email: employee.email || formik.values.email,
        designation: employee.position || formik.values.designation,
        department: employee.department || formik.values.department,
        branch: branchFromList?.name || formik.values.branch,
        permissions: mapApiPermissionsToForm(employee.permissions),
        profile_picture_url: employee.profile_picture || null,
      });
    } catch (error) {
      const apiError = error as ApiError;
      setApiErrorMessage(
        apiError?.message || "Unable to load employee details.",
      );
    }
  };

  const handleVerifyOtp = () => {
    if (emailOtp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP.");
      return;
    }
    setVerifiedEmailOtp(emailOtp);
    setIsOtpModalOpen(false);
    setTimeout(() => {
      formik.handleSubmit();
    }, 0);
  };

  const handleResendCredentials = async (email: string) => {
    if (isResending[email]) return;

    try {
      setApiErrorMessage(null);
      setIsResending((prev) => ({ ...prev, [email]: true }));

      await axiosInstance.post("/employee/resend-invite", { email });

      setResendSuccess(
        `Invite resent successfully. New credentials have been sent to ${email}`,
      );
      setTimeout(() => setResendSuccess(null), 5000);

      setResendCooldowns((prev) => ({
        ...prev,
        [email]: 60,
      }));
    } catch (error: any) {
      const apiError = error as ApiError;
      const message =
        apiError?.message || "Failed to resend credentials. Please try again.";
      setApiErrorMessage(message);
      if (!isInviteOpen) {
        setTimeout(() => setApiErrorMessage(null), 5000);
      }
    } finally {
      setIsResending((prev) => ({ ...prev, [email]: false }));
    }
  };

  return (
    <div className="bg-zinc-50 px-4 py-6 md:pt-3 md:px-8 md:py-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-2xl font-semibold text-secondary">
              Organization users
            </h1>
            <p className="text-sm md:text-base font-medium text-gray">
              Invite and manage members of your organization.
            </p>
          </div>

          {canWriteOrgUsers && (
            <Button
              variant="secondary"
              className="w-full sm:w-auto h-11 px-6 rounded-xl text-sm font-semibold whitespace-nowrap md:self-auto"
              onClick={() => {
                setEditingUserIndex(null);
                setOriginalEmail("");
                setApiErrorMessage(null);
                setOtpError(null);
                setEmailOtp("");
                setVerifiedEmailOtp("");
                formik.resetForm({ values: emptyInviteValues });
                setIsInviteOpen(true);
              }}
            >
              Invite Organization User
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {resendSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-secondary/20 bg-secondary/5 px-4 py-3 text-sm font-medium text-secondary flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              {resendSuccess}
            </motion.div>
          )}

          {apiErrorMessage && !isInviteOpen && !isDeleteOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-red/20 bg-red/5 px-4 py-3 text-sm font-medium text-red flex items-center gap-2"
            >
              <IoIosAlert className="w-5 h-5" />
              {apiErrorMessage}
            </motion.div>
          )}
        </div>

        {users.length > 0 && (
          <div className="mt-3 flex flex-col gap-3 px-0 md:px-0 md:flex-row md:items-center md:justify-between">
            {users.length > PAGE_SIZE && (
              <div className="w-full md:max-w-xs">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search users"
                  className="form-select-search h-9"
                />
              </div>
            )}
            <div className="relative self-start md:self-auto ml-auto">
              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className={`form-dropdown-trigger h-9 w-44 ${isFilterOpen ? "ring-2 ring-secondary/10" : ""}`}
              >
                <MdFilterListAlt className="w-4 h-4" />
                <span>
                  {statusFilter === "all"
                    ? "All users"
                    : statusFilter === "active"
                      ? "Active"
                      : "Pending"}
                </span>
              </button>
              {isFilterOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsFilterOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-light-gray-2 bg-zinc-50 shadow-[0_10px_30px_rgba(0,0,0,0.12)] py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("all");
                        setIsFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`form-dropdown-item ${
                        statusFilter === "all"
                          ? "form-dropdown-item-active"
                          : "form-dropdown-item-inactive"
                      }`}
                    >
                      <span>All users</span>
                      <span className="text-[11px] opacity-70">
                        {users.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("active");
                        setIsFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`form-dropdown-item ${
                        statusFilter === "active"
                          ? "form-dropdown-item-active"
                          : "form-dropdown-item-inactive"
                      }`}
                    >
                      <span>Active</span>
                      <span className="text-[11px] opacity-70">
                        {activeCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("pending");
                        setIsFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`form-dropdown-item ${
                        statusFilter === "pending"
                          ? "form-dropdown-item-active"
                          : "form-dropdown-item-inactive"
                      }`}
                    >
                      <span>Pending</span>
                      <span className="text-[11px] opacity-70">
                        {pendingCount}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {isInitialLoading || users.length === 0 ? (
          <div className="mt-2 bg-zinc-50 rounded-3xl border border-light-gray-2 shadow-sm flex flex-col items-center justify-center px-4 py-12 sm:px-8 sm:py-16 text-center min-h-100">
            {isInitialLoading ? (
              <div className="w-full">
                <div className="bg-zinc-50 border-b border-light-gray-2 flex px-6 py-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex-1">
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-light-gray-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex px-6 py-8">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <div key={j} className="flex-1">
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <p className="text-xl sm:text-2xl font-semibold text-secondary mb-2">
                  No organization users yet
                </p>
                <p className="text-xs sm:text-sm font-medium text-gray max-w-md">
                  Invite team members to collaborate on your certifications and
                  manage access to your organization&apos;s data.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="mt-2 bg-zinc-50 rounded-3xl border border-light-gray-2 shadow-sm overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-transparent border-b border-light-gray-2">
                  <tr>
                    <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-dull-gray  tracking-[0.08em]">
                      User
                    </th>
                    <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-dull-gray  tracking-[0.08em]">
                      Branch
                    </th>
                    <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-dull-gray  tracking-[0.08em]">
                      Department
                    </th>
                    <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-dull-gray  tracking-[0.08em]">
                      Designation
                    </th>
                    <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-dull-gray  tracking-[0.08em]">
                      Status
                    </th>
                    <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-dull-gray  tracking-[0.08em] pr-4 ">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-gray-2">
                  {paginatedUsers.map((user, index) => {
                    const cooldown = resendCooldowns[user.email] ?? 0;
                    const isCoolingDown = cooldown > 0;

                    return (
                      <tr
                        key={`${user.email}-${index}`}
                        className="bg-transparent"
                      >
                        <td className="px-4 py-4 md:px-6 md:py-5 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-light-gray-2 bg-light-gray flex items-center justify-center shrink-0">
                              {user.profilePicture ? (
                                <img
                                  src={user.profilePicture}
                                  alt={user.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-gray" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-base font-semibold text-secondary">
                                {user.name}
                              </span>
                              <span className="text-xs md:text-sm font-medium text-gray mt-1 break-all">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 md:px-6 md:py-5 align-middle">
                          {(() => {
                            const branchName =
                              user.branch ||
                              branches.find((b) => b.id === user.branchId)
                                ?.name ||
                              "-";
                            return (
                              <span className="text-sm font-medium text-dull-gray">
                                {branchName}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 md:px-6 md:py-5 align-middle">
                          <span className="text-base font-medium text-dull-gray">
                            {user.department || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-4 md:px-6 md:py-5 align-middle">
                          <span className="text-base font-medium text-dull-gray">
                            {user.designation}
                          </span>
                        </td>
                        <td className="px-4 py-4 md:px-6 md:py-5 align-middle">
                          {user.status === "Active" ? (
                            <span className="inline-flex items-center px-6 py-2 rounded-lg border-2 border-secondary bg-secondary/20 text-xs font-semibold text-dull-gray">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-5 py-2 rounded-lg border-2 border-yellow bg-dull-yellow text-xs font-semibold text-yellow">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 pr-4 md:px-6 md:py-5 md:pr-8 align-middle">
                          <div className="flex items-center justify-start gap-2 md:gap-3">
                            {canWriteOrgUsers ? (
                              <>
                                <Button
                                  variant="secondary"
                                  className="w-auto h-9 md:h-10 cursor-pointer px-4 md:px-7 rounded-lg text-xs md:text-sm font-semibold"
                                  onClick={() =>
                                    handleEditUser(user, startIndex + index)
                                  }
                                >
                                  Edit
                                </Button>
                                <button
                                  className="h-9 md:h-10 px-4 md:px-6 rounded-lg border-2 border-secondary/40 bg-gray/20 text-xs md:text-sm font-semibold cursor-pointer text-dull-gray hover:bg-light-gray transition-colors"
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setIsDeleteOpen(true);
                                  }}
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-zinc-400 italic">
                                Read only
                              </span>
                            )}
                            {user.status === "Pending" && (
                              <button
                                type="button"
                                disabled={
                                  isCoolingDown || isResending[user.email]
                                }
                                className={`h-9 md:h-10 px-3 md:px-4 rounded-lg text-[11px] md:text-xs font-semibold cursor-pointer transition-colors ${
                                  isCoolingDown || isResending[user.email]
                                    ? "border-light-gray-2 bg-light-gray text-dull-gray cursor-not-allowed"
                                    : "border-yellow-400 border-2 bg-dull-yellow/30 text-yellow hover:bg-dull-yellow"
                                }`}
                                onClick={() =>
                                  handleResendCredentials(user.email)
                                }
                              >
                                {isResending[user.email] ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-yellow border-t-transparent rounded-full animate-spin" />
                                    <span>Sending...</span>
                                  </div>
                                ) : isCoolingDown ? (
                                  `${cooldown}s`
                                ) : (
                                  "Resend Invite"
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="block md:hidden space-y-3">
              {paginatedUsers.map((user, index) => {
                const cooldown = resendCooldowns[user.email] ?? 0;
                const isCoolingDown = cooldown > 0;

                return (
                  <div
                    key={`${user.email}-${index}-card`}
                    className="rounded-2xl border border-light-gray-2 bg-zinc-50 px-4 py-3 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-light-gray-2 bg-light-gray flex items-center justify-center shrink-0">
                          {user.profilePicture ? (
                            <img
                              src={user.profilePicture}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-gray" />
                          )}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-secondary">
                            {user.name}
                          </p>
                          <p className="text-xs font-medium text-gray mt-0.5 break-all">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="mt-0.5 shrink-0">
                        {user.status === "Active" ? (
                          <span className="inline-flex items-center px-4 py-1.5 rounded-lg border-2 border-secondary bg-secondary/20 text-[10px] font-semibold text-dull-gray">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3.5 py-1.5 rounded-lg border-2 border-yellow bg-dull-yellow text-[10px] font-semibold text-yellow">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[12px] font-semibold text-dull-gray  tracking-[0.08em]">
                          Branch
                        </p>
                        <p className="mt-0.5 font-medium text-secondary text-sm">
                          {user.branch ||
                            branches.find((b) => b.id === user.branchId)
                              ?.name ||
                            "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-dull-gray  tracking-[0.08em]">
                          Designation
                        </p>
                        <p className="mt-0.5 font-medium text-secondary text-sm">
                          {user.designation}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[12px] font-semibold text-dull-gray  tracking-[0.08em]">
                          Department
                        </p>
                        <p className="mt-0.5 font-medium text-secondary text-sm">
                          {user.department || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      {user.status === "Pending" && (
                        <button
                          type="button"
                          disabled={isCoolingDown || isResending[user.email]}
                          className={`flex-1 h-9 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                            isCoolingDown || isResending[user.email]
                              ? "border-light-gray-2 bg-light-gray text-dull-gray cursor-not-allowed"
                              : "border-yellow-700 border-2 bg-dull-yellow/30 text-yellow hover:bg-dull-yellow"
                          }`}
                          onClick={() => handleResendCredentials(user.email)}
                        >
                          {isResending[user.email] ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-3 h-3 border-2 border-yellow border-t-transparent rounded-full animate-spin" />
                              <span>Sending...</span>
                            </div>
                          ) : isCoolingDown ? (
                            `${cooldown}s`
                          ) : (
                            "Resend Invite"
                          )}
                        </button>
                      )}
                      {canWriteOrgUsers ? (
                        <>
                          <Button
                            variant="secondary"
                            className="flex-1 h-9 cursor-pointer rounded-lg text-[11px] font-semibold"
                            onClick={() =>
                              handleEditUser(user, startIndex + index)
                            }
                          >
                            Edit
                          </Button>
                          <button
                            className="flex-1 h-9 rounded-lg border-2 border-secondary/40 bg-gray/20 text-[11px] font-semibold cursor-pointer text-dull-gray hover:bg-light-gray transition-colors"
                            onClick={() => {
                              setUserToDelete(user);
                              setIsDeleteOpen(true);
                            }}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">
                          Read only
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredUsers.length > PAGE_SIZE && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 md:px-6 py-3 border-t border-light-gray-2 bg-primary">
                <p className="text-[11px] md:text-xs font-medium text-gray">
                  Showing {startIndex + 1}–
                  {Math.min(
                    startIndex + paginatedUsers.length,
                    filteredUsers.length,
                  )}{" "}
                  of {filteredUsers.length} members
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 rounded-lg border border-light-gray-2 text-xs font-semibold text-dull-gray bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-light-gray transition-colors"
                  >
                    Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const page = idx + 1;
                      const isActive = page === currentPage;
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                            isActive
                              ? "bg-secondary text-primary"
                              : "bg-zinc-50 text-dull-gray border border-light-gray-2 hover:bg-light-gray"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 rounded-lg border border-light-gray-2 text-xs font-semibold text-dull-gray bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-light-gray transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isInviteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto scrollbar-hide"
          >
            <div
              className="absolute inset-0 bg-secondary/30 backdrop-blur-sm"
              onClick={() => {
                if (!isUploadingAvatar && !formik.isSubmitting) {
                  handleRequestCloseInvite();
                }
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-zinc-50 border border-light-gray-2 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden"
            >
              <form
                onSubmit={formik.handleSubmit}
                className="flex flex-col min-h-0 h-full"
              >
                {/* Header */}
                <div className="flex items-start gap-3 px-6 pt-6 pb-4 shrink-0 border-b border-light-gray-2/40">
                  <div className="w-12 h-12 rounded-full bg-light-gray-2 flex items-center justify-center shrink-0">
                    <img
                      src="../assets/imgs/icons/envelope.svg"
                      alt="envelope icon"
                      className="w-5 h-5 invert"
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h2 className="text-xl font-semibold text-secondary">
                      {isEditMode ? "Edit User" : "Invite Organization User"}
                    </h2>
                    <p className="text-sm text-gray leading-relaxed">
                      Send an invitation to join your organization. They will
                      receive an email with instructions.
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-5 space-y-6 min-h-0">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-0.5">
                        <h3 className="text-lg font-semibold text-secondary">
                          Personal Details
                        </h3>
                        <p className="text-xs text-gray">
                          Basic information for the new account.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isEditMode && (
                          <div className="md:col-span-2 flex flex-col items-center justify-center p-4 bg-light-gray/20 rounded-2xl border-2 border-dashed border-light-gray-2/60 space-y-3 mb-4">
                            <div className="relative group">
                              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary bg-light-gray flex items-center justify-center relative shadow-md">
                                {formik.values.profile_picture_url ? (
                                  <img
                                    src={formik.values.profile_picture_url}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-10 h-10 text-gray" />
                                )}

                                {isUploadingAvatar && (
                                  <div className="absolute inset-0 bg-secondary/40 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                  </div>
                                )}
                              </div>

                              <label
                                className={`absolute bottom-0 right-0 w-8 h-8 rounded-full bg-secondary text-primary flex items-center justify-center cursor-pointer shadow-lg hover:bg-secondary/90 transition-all ${
                                  isUploadingAvatar || formik.isSubmitting
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleImageUpload}
                                  disabled={
                                    isUploadingAvatar || formik.isSubmitting
                                  }
                                />
                                <Camera className="w-4 h-4" />
                              </label>

                              {formik.values.profile_picture_url &&
                                !isUploadingAvatar && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      formik.setFieldValue(
                                        "profile_picture_url",
                                        "",
                                      )
                                    }
                                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red text-white flex items-center justify-center shadow-md hover:bg-red/90 transition-all"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                            </div>
                            <div className="text-center space-y-1">
                              <p className="text-sm font-semibold text-secondary">
                                Profile Picture
                              </p>
                              <p className="text-[10px] text-gray uppercase tracking-wider font-medium">
                                JPG, PNG OR WEBP • MAX 5MB
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="form-field-wrapper">
                          <label className="form-label">Full Name</label>
                          <input
                            name="name"
                            placeholder="e.g. John Doe"
                            value={formik.values.name}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            className={`form-input ${
                              formik.touched.name && formik.errors.name
                                ? "form-input-error"
                                : ""
                            }`}
                          />
                          {formik.touched.name && formik.errors.name && (
                            <p className="form-error-message">
                              {formik.errors.name}
                            </p>
                          )}
                        </div>

                        <div className="form-field-wrapper">
                          <label className="form-label">Email Address</label>
                          <input
                            name="email"
                            placeholder="name@company.com"
                            value={formik.values.email}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            className={`form-input ${
                              formik.touched.email && formik.errors.email
                                ? "form-input-error"
                                : ""
                            }`}
                          />
                          {formik.touched.email && formik.errors.email && (
                            <p className="form-error-message">
                              {formik.errors.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <hr className="border-light-gray-2/60" />

                    <div className="space-y-4">
                      <div className="space-y-0.5">
                        <h3 className="text-lg font-semibold text-secondary">
                          Role & Location
                        </h3>
                        <p className="text-xs text-gray">
                          Assign their position and workplace.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-field-wrapper">
                          <label className="form-label">Department</label>
                          <input
                            name="department"
                            placeholder="e.g. Engineering"
                            value={formik.values.department}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            className={`form-input ${
                              formik.touched.department &&
                              formik.errors.department
                                ? "form-input-error"
                                : ""
                            }`}
                          />
                          {formik.touched.department &&
                            formik.errors.department && (
                              <p className="form-error-message">
                                {formik.errors.department}
                              </p>
                            )}
                        </div>

                        <div className="form-field-wrapper">
                          <label className="form-label">Designation</label>
                          <input
                            name="designation"
                            placeholder="e.g. Senior Manager"
                            value={formik.values.designation}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            className={`form-input ${
                              formik.touched.designation &&
                              formik.errors.designation
                                ? "form-input-error"
                                : ""
                            }`}
                          />
                          {formik.touched.designation &&
                            formik.errors.designation && (
                              <p className="form-error-message">
                                {formik.errors.designation}
                              </p>
                            )}
                        </div>

                        <div
                          ref={branchFieldRef}
                          className="space-y-1.5 md:col-span-2"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <label className="form-label">
                              Branch Location
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isBranchesLoading) {
                                  fetchBranches();
                                }
                              }}
                              className="flex items-center gap-1.5 text-xs font-semibold text-primary-blue hover:text-primary-blue/80 transition-colors"
                            >
                              <motion.span
                                animate={
                                  isBranchesLoading
                                    ? { rotate: 360 }
                                    : { rotate: 0 }
                                }
                                transition={
                                  isBranchesLoading
                                    ? {
                                        repeat: Infinity,
                                        duration: 0.8,
                                        ease: "linear",
                                      }
                                    : { duration: 0.2 }
                                }
                              >
                                <FiRefreshCw className="h-3 w-3" />
                              </motion.span>
                              Refresh List
                            </button>
                          </div>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setIsBranchOpen((prev) => {
                                  const next = !prev;
                                  if (!prev && next) {
                                    setTimeout(() => {
                                      branchFieldRef.current?.scrollIntoView({
                                        behavior: "smooth",
                                        block: "center",
                                      });
                                    }, 0);
                                  }
                                  return next;
                                })
                              }
                              className={`form-dropdown-trigger ${
                                formik.touched.branch && formik.errors.branch
                                  ? "form-dropdown-trigger-error"
                                  : ""
                              }`}
                            >
                              <span
                                className={
                                  formik.values.branch
                                    ? "text-secondary font-medium whitespace-nowrap"
                                    : "text-gray/50 whitespace-nowrap"
                                }
                              >
                                {formik.values.branch ||
                                  (isBranchesLoading
                                    ? "Loading..."
                                    : "Select Branch Location")}
                              </span>
                              <span className="text-gray text-xs">▾</span>
                            </button>

                            <AnimatePresence>
                              {isBranchOpen && (
                                <>
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-10"
                                    onClick={() => setIsBranchOpen(false)}
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute z-20 mt-1 w-full rounded-xl bg-zinc-50 border border-light-gray-2 shadow-[0_10px_40px_rgba(0,0,0,0.15)] max-h-56 overflow-y-auto scrollbar-hide"
                                  >
                                    <div className="p-2 border-b border-light-gray-2 bg-primary/95 sticky top-0 backdrop-blur-sm z-30">
                                      <input
                                        type="text"
                                        value={branchSearch}
                                        onChange={(e) =>
                                          setBranchSearch(e.target.value)
                                        }
                                        placeholder="Search..."
                                        className="form-select-search h-8"
                                      />
                                    </div>
                                    {isBranchesLoading &&
                                      branches.length === 0 && (
                                        <div className="px-3 py-4 text-center text-xs text-gray">
                                          Loading...
                                        </div>
                                      )}
                                    {!isBranchesLoading &&
                                      branches.length === 0 && (
                                        <div className="px-3 py-4 text-center text-xs text-gray">
                                          No branches found.
                                        </div>
                                      )}
                                    {branches
                                      .filter((branch) => {
                                        const q = branchSearch
                                          .trim()
                                          .toLowerCase();
                                        if (!q) return true;
                                        const haystack = `$
                                      {branch.name} $
                                      {branch.address} $
                                      {branch.city} $
                                      {branch.state} $
                                      {branch.country}
                                    `.toLowerCase();
                                        return haystack.includes(q);
                                      })
                                      .map((branch) => {
                                        const addressParts = [
                                          branch.address,
                                          branch.city,
                                          branch.state,
                                          branch.country,
                                        ].filter(Boolean);
                                        const fullAddress =
                                          addressParts.join(", ");

                                        return (
                                          <button
                                            key={branch.id}
                                            type="button"
                                            onClick={() => {
                                              formik.setFieldValue(
                                                "branch",
                                                branch.name,
                                              );
                                              formik.setFieldTouched(
                                                "branch",
                                                true,
                                                false,
                                              );
                                              setIsBranchOpen(false);
                                            }}
                                            className={`form-dropdown-item ${
                                              formik.values.branch ===
                                              branch.name
                                                ? "form-dropdown-item-active"
                                                : "form-dropdown-item-inactive"
                                            }`}
                                          >
                                            <span
                                              className={`block text-sm ${formik.values.branch === branch.name ? "font-semibold" : "font-medium"}`}
                                            >
                                              {branch.name}
                                            </span>
                                            {fullAddress && (
                                              <span className="mt-0.5 block text-[10px] text-gray/80">
                                                {fullAddress}
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                          {branchesError && (
                            <p className="text-xs font-medium text-red">
                              {branchesError}
                            </p>
                          )}
                          {formik.touched.branch && formik.errors.branch && (
                            <p className="form-error-message">
                              {formik.errors.branch}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <hr className="border-light-gray-2/60" />

                    <div className="space-y-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h3 className="text-lg font-semibold text-secondary">
                            Access Permissions
                          </h3>
                          <p className="text-xs text-gray">
                            Control what this user can view and manage.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 px-3 w-auto text-xs font-semibold rounded-lg bg-light-gray text-secondary hover:bg-light-gray-2"
                          onClick={() => {
                            const allKeys = Object.keys(
                              formik.values.permissions,
                            ) as Array<keyof typeof formik.values.permissions>;
                            const allSelected = allKeys.every((k) => {
                              const perm = formik.values.permissions[k];
                              return perm.enabled && perm.read && perm.write;
                            });

                            const nextPermissions = {
                              ...formik.values.permissions,
                            };
                            allKeys.forEach((k) => {
                              nextPermissions[k] = {
                                enabled: !allSelected,
                                read: !allSelected,
                                write: !allSelected,
                              };
                            });
                            formik.setFieldValue(
                              "permissions",
                              nextPermissions,
                            );
                          }}
                        >
                          {Object.values(formik.values.permissions).every(
                            (perm) => perm.enabled && perm.read && perm.write,
                          )
                            ? "Unselect All"
                            : "Select All"}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between px-1 text-[10px] font-semibold text-gray  tracking-wide">
                        <span>Permissions</span>
                        <span>Actions</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {[
                          {
                            key: "dashboard" as const,
                            label: "Dashboard",
                            Icon: Grid,
                          },
                          {
                            key: "certificates" as const,
                            label: "Certificates",
                            Icon: Award,
                          },
                          {
                            key: "branches" as const,
                            label: "Branches",
                            Icon: GitBranch,
                          },
                          {
                            key: "profile" as const,
                            label: "Profile",
                            Icon: User,
                          },
                          {
                            key: "organization_users" as const,
                            label: "Team Members",
                            Icon: Users,
                          },
                          {
                            key: "support_center" as const,
                            label: "Support Center",
                            Icon: HelpCircle,
                          },
                          {
                            key: "legal" as const,
                            label: "Legal",
                            Icon: FileText,
                          },
                        ].map((item) => {
                          const permission =
                            formik.values.permissions[item.key];
                          const enabled = permission?.enabled ?? false;
                          const readChecked = permission?.read ?? false;
                          const writeChecked = permission?.write ?? false;
                          return (
                            <div
                              key={item.key}
                              className={`flex items-start gap-3 rounded-xl border p-3 transition-all hover:shadow-sm ${
                                enabled
                                  ? "border-secondary bg-secondary/5"
                                  : "border-light-gray-2 bg-zinc-50 hover:border-gray/30"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextEnabled = !enabled;
                                    formik.setFieldValue(
                                      `permissions.${item.key}.enabled`,
                                      nextEnabled,
                                    );
                                    if (
                                      nextEnabled &&
                                      !readChecked &&
                                      !writeChecked
                                    ) {
                                      formik.setFieldValue(
                                        `permissions.${item.key}.read`,
                                        true,
                                      );
                                    }
                                    if (!nextEnabled) {
                                      formik.setFieldValue(
                                        `permissions.${item.key}.read`,
                                        false,
                                      );
                                      formik.setFieldValue(
                                        `permissions.${item.key}.write`,
                                        false,
                                      );
                                    }
                                  }}
                                  className="flex items-center gap-2 text-left"
                                >
                                  <span
                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                      enabled
                                        ? "border-secondary bg-secondary text-primary"
                                        : "border-gray/30 bg-primary"
                                    }`}
                                  >
                                    {enabled && (
                                      <svg
                                        width="10"
                                        height="8"
                                        viewBox="0 0 10 8"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M1 4L3.5 6.5L9 1"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    )}
                                  </span>
                                  <span
                                    className={`text-sm font-semibold flex items-center gap-2 ${
                                      enabled ? "text-secondary" : "text-gray"
                                    }`}
                                  >
                                    <item.Icon
                                      className={`w-3.5 h-3.5 ${
                                        enabled
                                          ? "text-secondary"
                                          : "text-gray/70"
                                      }`}
                                    />
                                    {item.label}
                                  </span>
                                </button>

                                <div className="flex items-center gap-3 text-xs font-medium text-gray">
                                  <button
                                    type="button"
                                    className={`inline-flex items-center gap-1 select-none ${
                                      writeChecked
                                        ? "cursor-not-allowed opacity-80"
                                        : "cursor-pointer"
                                    }`}
                                    onClick={() => {
                                      if (writeChecked) return;

                                      const checked = !readChecked;
                                      formik.setFieldValue(
                                        `permissions.${item.key}.read`,
                                        checked,
                                      );
                                      if (checked && !enabled) {
                                        formik.setFieldValue(
                                          `permissions.${item.key}.enabled`,
                                          true,
                                        );
                                      }
                                      if (!checked && !writeChecked) {
                                        formik.setFieldValue(
                                          `permissions.${item.key}.enabled`,
                                          false,
                                        );
                                      }
                                    }}
                                  >
                                    <span
                                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[8px] transition-colors ${
                                        readChecked
                                          ? writeChecked
                                            ? "border-secondary/40 bg-secondary/5 text-secondary/60"
                                            : "border-secondary/70 bg-secondary/10 text-secondary"
                                          : "border-gray/40 bg-zinc-50 text-transparent"
                                      }`}
                                    >
                                      {readChecked && (
                                        <svg
                                          width="8"
                                          height="6"
                                          viewBox="0 0 10 8"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            d="M1 4L3.5 6.5L9 1"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      )}
                                    </span>
                                    <span className="text-[10px]">Read</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 cursor-pointer select-none"
                                    onClick={() => {
                                      const newWriteValue = !writeChecked;

                                      formik.setFieldValue(
                                        `permissions.${item.key}.write`,
                                        newWriteValue,
                                      );
                                      if (newWriteValue) {
                                        formik.setFieldValue(
                                          `permissions.${item.key}.read`,
                                          true,
                                        );
                                      }

                                      if (newWriteValue) {
                                        formik.setFieldValue(
                                          `permissions.${item.key}.enabled`,
                                          true,
                                        );
                                      } else if (!readChecked) {
                                        formik.setFieldValue(
                                          `permissions.${item.key}.enabled`,
                                          false,
                                        );
                                      }
                                    }}
                                  >
                                    <span
                                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[8px] transition-colors ${
                                        writeChecked
                                          ? "border-secondary/70 bg-secondary/10 text-secondary"
                                          : "border-gray/40 bg-zinc-50 text-transparent"
                                      }`}
                                    >
                                      {writeChecked && (
                                        <svg
                                          width="8"
                                          height="6"
                                          viewBox="0 0 10 8"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            d="M1 4L3.5 6.5L9 1"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      )}
                                    </span>
                                    <span className="text-[10px]">Write</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-4 flex flex-col gap-3 shrink-0 bg-zinc-50 border-t border-light-gray-2">
                  {apiErrorMessage && (
                    <div className="rounded-xl border border-red/30 bg-red/5 px-4 py-2 text-xs font-medium text-red">
                      {apiErrorMessage}
                    </div>
                  )}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={formik.isSubmitting || isUploadingAvatar}
                      onClick={handleRequestCloseInvite}
                      className="h-10 px-6 cursor-pointer rounded-xl border border-light-gray-2 bg-zinc-50 text-xs font-semibold text-dull-gray hover:bg-light-gray transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isEditMode ? "Cancel" : "Close"}
                    </button>
                    {isEditMode && (
                      <button
                        type="button"
                        disabled={
                          isResending[formik.values.email] ||
                          (resendCooldowns[formik.values.email] ?? 0) > 0
                        }
                        onClick={() =>
                          handleResendCredentials(formik.values.email)
                        }
                        className={`h-10 px-6 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
                          (resendCooldowns[formik.values.email] ?? 0) > 0 ||
                          isResending[formik.values.email]
                            ? "bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed"
                            : "bg-yellow-50 text-yellow border border-yellow-200 hover:bg-yellow-100"
                        }`}
                      >
                        {isResending[formik.values.email] ? (
                          <div className="w-4 h-4 border-2 border-yellow border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FiRefreshCw className="w-3.5 h-3.5" />
                        )}
                        {(resendCooldowns[formik.values.email] ?? 0) > 0
                          ? `Resend in ${resendCooldowns[formik.values.email]}s`
                          : "Resend Credentials"}
                      </button>
                    )}
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={formik.isSubmitting || isUploadingAvatar}
                      className="w-auto h-10 px-6 rounded-xl text-xs font-semibold shadow-lg shadow-secondary/10"
                    >
                      {isEditMode
                        ? emailChanged
                          ? "Update & Send Invite"
                          : "Update User"
                        : "Send Invitation"}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInviteSuccessOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center px-4"
          >
            <div
              className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
              onClick={() => setIsInviteSuccessOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-sm rounded-2xl bg-zinc-50 border border-light-gray-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)] p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-7 md:h-10 rounded-full bg-light-gray-2 flex items-center justify-center">
                  <img
                    src="../assets/imgs/icons/envelope.svg"
                    alt="envelope icon"
                    className="md:w-5 md:h-5 w-4 h-4 invert"
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-secondary">
                    Invitation sent
                  </h3>
                  <p className="mt-1 text-sm font-medium text-gray">
                    The user has been invited and will receive an email
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 px-5 rounded-lg text-xs font-semibold"
                  onClick={() => setIsInviteSuccessOpen(false)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteOpen && userToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center px-4"
          >
            <div
              className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
              onClick={() => setIsDeleteOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-md rounded-3xl bg-zinc-50 border border-light-gray-2 shadow-[0_22px_45px_rgba(0,0,0,0.2)] p-7 space-y-6"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray/30">
                  <IoIosAlert className="h-5 w-5" />
                </div>
                <div className="mt-1.5">
                  <h3 className="text-xl font-medium text-secondary">
                    Remove Team Member
                  </h3>
                </div>
              </div>
              <p className="text-sm text-gray -mt-2">
                Are you sure you want to remove this user from your
                organization? They will immediately lose access to all
                certifications and data.
              </p>

              <div className="rounded-xl border border-light-gray-2 px-4 py-3">
                <p className="text-sm font-semibold text-secondary">
                  {userToDelete.name}
                </p>
                <p className="text-xs font-medium text-gray mt-0.5">
                  {userToDelete.email}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="h-10 px-6 rounded-lg border cursor-pointer border-light-gray-2 bg-zinc-50 text-xs font-semibold text-dull-gray hover:bg-light-gray transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!userToDelete) return;

                    try {
                      if (userToDelete.employeeId && userToDelete.userId) {
                        await axiosInstance.delete(
                          `/employee/${userToDelete.employeeId}`,
                        );
                      }

                      setUsers((prev) =>
                        prev.filter((u) =>
                          u.employeeId
                            ? u.employeeId !== userToDelete.employeeId
                            : !(
                                u.email === userToDelete.email &&
                                u.branch === userToDelete.branch &&
                                u.designation === userToDelete.designation
                              ),
                        ),
                      );
                      setIsDeleteOpen(false);
                      setUserToDelete(null);
                    } catch (error) {
                      const apiError = error as ApiError;
                      setApiErrorMessage(
                        apiError?.message ||
                          "Unable to remove this employee. Please try again.",
                      );
                    }
                  }}
                  className="h-10 px-6 rounded-lg cursor-pointer bg-red text-xs font-semibold text-primary hover:bg-red/90 transition-colors"
                >
                  Remove User
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCloseConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center px-4"
          >
            <div
              className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
              onClick={() => setIsCloseConfirmOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-sm rounded-2xl bg-zinc-50 border border-light-gray-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)] p-6 space-y-4"
            >
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-secondary">
                  Discard changes?
                </h3>
                <p className="text-sm font-medium text-gray">
                  You have unsaved changes. If you close now, your data will be
                  lost.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCloseConfirmOpen(false)}
                  className="h-9 px-4 rounded-lg border border-light-gray-2 bg-zinc-50 text-xs font-semibold text-dull-gray hover:bg-light-gray transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-auto h-9 px-5 rounded-lg text-xs font-semibold"
                  onClick={() => {
                    formik.resetForm({ values: emptyInviteValues });
                    setIsCloseConfirmOpen(false);
                    setIsInviteOpen(false);
                    setEditingUserIndex(null);
                    setOriginalEmail("");
                    setApiErrorMessage(null);
                    setOtpError(null);
                    setEmailOtp("");
                    setVerifiedEmailOtp("");
                  }}
                >
                  Discard
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOtpModalOpen && (
          <div className="fixed inset-0 z-120 flex items-center justify-center px-4 py-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-secondary/30 backdrop-blur-sm"
              onClick={() => setIsOtpModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-xl overflow-hidden border border-zinc-100"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
                  <FiRefreshCw className="w-8 h-8 text-secondary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-secondary">
                    Verify Email Update
                  </h2>
                  <p className="text-sm text-gray max-w-xs mx-auto">
                    We've sent a verification code to{" "}
                    <strong>{originalEmail}</strong>. You must verify email to
                    update auditor email.
                  </p>
                </div>

                <div className="w-full space-y-4">
                  <div className="form-field-wrapper">
                    <label className="form-label text-left w-full block">
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) =>
                        setEmailOtp(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Enter 6-digit code"
                      className={`form-input text-center text-2xl tracking-[0.5em] font-bold ${
                        otpError ? "form-input-error" : ""
                      }`}
                    />
                    {otpError && (
                      <p className="form-error-message text-center">
                        {otpError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleVerifyOtp}
                      className="w-full h-12 rounded-xl bg-secondary text-white font-semibold"
                    >
                      Verify and Save Changes
                    </Button>
                    <button
                      type="button"
                      onClick={() => setIsOtpModalOpen(false)}
                      className="text-sm font-semibold text-gray hover:text-secondary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
