"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import Dropdown from "../common/dropdown";
import Button from "../common/button";
import { Loading } from "../common/Loading";
import { axiosInstance } from "@/lib/axios";
import {
  Country as CSC,
  State as CSS,
  City as CSCity,
} from "country-state-city";
import Image from "next/image";
import { Search, ChevronDown } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

type AssignedTask = {
  id: number;
  organisation: string;
  certification: string;
  type: string;
  dueDate: string;
  status: string;
};

type ReviewerApiResponse = {
  id: string;
  name: string;
  email: string;
  tags: string[];
  accountStatus: string | boolean;
  profile_picture_url?: string;
};

type AuditorApiResponse = {
  id: string;
  name: string;
  email: string;
  region?: string;
  city?: string;
  state?: string;
  country?: string;
  assigned_certificates: string[];
  accountStatus: string | boolean;
  profile_picture_url?: string;
};

type Reviewer = {
  id: string;
  name: string;
  email: string;
  expertise: string[];
  assigned: number;
  accountStatus: "Active" | "Blocked";
  tasks?: AssignedTask[];
  profile_picture_url?: string;
};

type Auditor = {
  id: string;
  name: string;
  organization: string;
  email: string;
  country?: string;
  city?: string;
  state?: string;
  certifications: string[];
  assigned: number;
  accountStatus: "Active" | "Blocked";
  tasks?: AssignedTask[];
  profile_picture_url?: string;
};

const getInitials = (name: string): string => {
  if (!name || name.trim() === "") return "";
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  return (
    nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
  ).toUpperCase();
};

export default function AuditorsPage() {
  const { profile } = useUser();
  const [activeTab, setActiveTab] = useState<"reviewers" | "auditors">(
    "reviewers",
  );
  const [data, setData] = useState<Reviewer[]>([]);
  const [auditorData, setAuditorData] = useState<Auditor[]>([]);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false);
  const [isLoadingAuditors, setIsLoadingAuditors] = useState(false);
  const [showReviewersLoader, setShowReviewersLoader] = useState(false);
  const [reviewersLoadingProgress, setReviewersLoadingProgress] = useState(0);
  const [showAuditorsLoader, setShowAuditorsLoader] = useState(false);
  const [auditorsLoadingProgress, setAuditorsLoadingProgress] = useState(0);
  const [reviewersError, setReviewersError] = useState<string | null>(null);
  const [auditorsError, setAuditorsError] = useState<string | null>(null);
  const [isAddReviewerModalOpen, setIsAddReviewerModalOpen] = useState(false);
  const [reviewerFirstName, setReviewerFirstName] = useState("");
  const [reviewerLastName, setReviewerLastName] = useState("");
  const [email, setEmail] = useState("");
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState<Reviewer | null>(
    null,
  );
  const [isViewAuditorDetailsModalOpen, setIsViewAuditorDetailsModalOpen] =
    useState(false);
  const [selectedAuditor, setSelectedAuditor] = useState<Auditor | null>(null);

  const [isEditReviewerModalOpen, setIsEditReviewerModalOpen] = useState(false);
  const [editingReviewerId, setEditingReviewerId] = useState<string | null>(
    null,
  );
  const [editReviewerFirstName, setEditReviewerFirstName] = useState("");
  const [editReviewerLastName, setEditReviewerLastName] = useState("");
  const [editReviewerEmail, setEditReviewerEmail] = useState("");
  const [editReviewerExpertiseTags, setEditReviewerExpertiseTags] = useState<
    string[]
  >([]);
  const [editReviewerNewTag, setEditReviewerNewTag] = useState("");
  const [editReviewerIsActive, setEditReviewerIsActive] = useState(false);
  const [editReviewerErrors, setEditReviewerErrors] = useState<{
    firstName?: string;
    lastName?: string;
    tags?: string;
  }>({});
  const [originalReviewerValues, setOriginalReviewerValues] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    tags: string[];
    accountStatus: boolean;
  } | null>(null);
  const [isSavingEditReviewer, setIsSavingEditReviewer] = useState(false);

  const [isEditAuditorModalOpen, setIsEditAuditorModalOpen] = useState(false);
  const [editingAuditorId, setEditingAuditorId] = useState<string | null>(null);
  const [editAuditorFirstName, setEditAuditorFirstName] = useState("");
  const [editAuditorLastName, setEditAuditorLastName] = useState("");
  const [editAuditorEmail, setEditAuditorEmail] = useState("");
  const [editSelectedCountry, setEditSelectedCountry] = useState("");
  const [editSelectedState, setEditSelectedState] = useState("");
  const [editSelectedCity, setEditSelectedCity] = useState("");
  const [editSearchCountry, setEditSearchCountry] = useState("");
  const [editSearchState, setEditSearchState] = useState("");
  const [editSearchCity, setEditSearchCity] = useState("");
  const [editShowCountryDropdown, setEditShowCountryDropdown] = useState(false);
  const [editShowStateDropdown, setEditShowStateDropdown] = useState(false);
  const [editShowCityDropdown, setEditShowCityDropdown] = useState(false);
  const [editCertificationTags, setEditCertificationTags] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [editIsAuditorActive, setEditIsAuditorActive] = useState(false);
  const [editShowCertificatesDropdown, setEditShowCertificatesDropdown] =
    useState(false);
  const [editAuditorErrors, setEditAuditorErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    country?: string;
    state?: string;
    city?: string;
    certifications?: string;
  }>({});
  const [originalAuditorValues, setOriginalAuditorValues] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    country: string;
    state: string;
    city: string;
    assigned_certificates: string[];
    accountStatus: boolean;
  } | null>(null);
  const [isSavingEditAuditor, setIsSavingEditAuditor] = useState(false);

  const [isAddAuditorModalOpen, setIsAddAuditorModalOpen] = useState(false);
  const [auditorFirstName, setAuditorFirstName] = useState("");
  const [auditorLastName, setAuditorLastName] = useState("");
  const [auditorEmail, setAuditorEmail] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [countries, setCountries] = useState<
    Array<{
      name: { common: string };
      cca2: string;
      flags: { svg: string; png: string };
      isoCode?: string;
    }>
  >([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [searchCountry, setSearchCountry] = useState("");
  const [searchState, setSearchState] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [certificationTags, setCertificationTags] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [isAuditorActive, setIsAuditorActive] = useState(false);
  const [auditorErrors, setAuditorErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    country?: string;
    state?: string;
    city?: string;
    certifications?: string;
  }>({});
  const [isSavingAuditor, setIsSavingAuditor] = useState(false);

  const [reviewerErrors, setReviewerErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    tags?: string;
  }>({});
  const [isSavingReviewer, setIsSavingReviewer] = useState(false);
  const [availableCertificates, setAvailableCertificates] = useState<
    Array<{ id: string; name: string; product_id: string }>
  >([]);
  const [isLoadingCertificates, setIsLoadingCertificates] = useState(false);
  const [showCertificatesDropdown, setShowCertificatesDropdown] =
    useState(false);
  const [certificatesPagination, setCertificatesPagination] = useState({
    pageIndex: 1,
    pageSize: 20,
    totalPages: 1,
    total: 0,
  });
  const certificatesDropdownRef = useRef<HTMLDivElement>(null);
  const reviewersLoaderIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const reviewersLoaderFinishTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const auditorsLoaderIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const auditorsLoaderFinishTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const certificatesListRef = useRef<HTMLDivElement>(null);
  const editCertificatesDropdownRef = useRef<HTMLDivElement>(null);
  const editCertificatesListRef = useRef<HTMLDivElement>(null);
  const isSubadmin = profile?.role === "subadmin";
  const permissions = Array.isArray(profile?.permissions)
    ? (profile.permissions as Array<
        string | { resource?: string; action?: string[] }
      >)
    : [];
  const hasActionPermission = (
    resources: string[],
    action: "read" | "write" | "edit" | "delete",
  ) => {
    if (!isSubadmin) return true;
    if (!permissions.length) return false;
    return permissions.some((permission) => {
      if (typeof permission === "string") {
        return action === "read" && resources.includes(permission);
      }
      const actions = Array.isArray(permission.action) ? permission.action : [];
      return (
        resources.includes(permission.resource ?? "") && actions.includes(action)
      );
    });
  };
  const canWrite = hasActionPermission(["auditor", "auditors"], "write");
  const canEdit = hasActionPermission(["auditor", "auditors"], "edit");

  const columns = useMemo<ColumnDef<Reviewer>[]>(
    () => [
      {
        accessorKey: "name",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Name
          </span>
        ),
        cell: ({ row }) => {
          const { name, email, profile_picture_url } = row.original;
          const hasProfilePicture =
            profile_picture_url && profile_picture_url.trim() !== "";

          return (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 overflow-hidden">
                {hasProfilePicture ? (
                  <img
                    src={profile_picture_url}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-zinc-600">
                    {getInitials(name)}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <span
                  className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-secondary"
                  style={{ letterSpacing: "1%" }}
                >
                  {name}
                </span>
                <span
                  className="text-[9px] md:text-[10px] font-normal leading-[100%] align-middle text-gray-500"
                  style={{ letterSpacing: "1%" }}
                >
                  {email}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "expertise",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Expertise
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
            {row.original.expertise.map((exp, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-md text-[9px] md:text-xs font-normal text-secondary"
                style={{ backgroundColor: "#e9e9e9" }}
              >
                {exp}
              </span>
            ))}
          </div>
        ),
      },
      {
        id: "assigned",
        accessorKey: "assigned",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Assigned
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-secondary"
            style={{ letterSpacing: "1%" }}
          >
            {getValue<number>()}
          </span>
        ),
      },
      {
        id: "accountStatus",
        accessorKey: "accountStatus",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Status
          </span>
        ),
        cell: ({ getValue }) => {
          const accountStatus = getValue<string>();
          return (
            <span
              className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[9px] md:text-xs font-medium leading-[100%] align-middle border ${
                accountStatus === "Active"
                  ? "bg-green-50 text-green-600 border-green-300"
                  : "bg-red-50 text-red-600 border-red-300"
              }`}
            >
              {accountStatus}
            </span>
          );
        },
      },
      {
        id: "action",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle text-center pl-4 block"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Actions
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2 pr-8">
            <button
              onClick={() => {
                setSelectedReviewer(row.original);
                setIsViewDetailsModalOpen(true);
              }}
              className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center hover:bg-zinc-200 transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z"
                  fill="#262626"
                />
                <path
                  d="M19.3375 9.7875C18.6024 7.88603 17.3262 6.24164 15.6667 5.05755C14.0072 3.87347 12.0372 3.20161 9.99998 3.125C7.9628 3.20161 5.99272 3.87347 4.33323 5.05755C2.67374 6.24164 1.39758 7.88603 0.662478 9.7875C0.612833 9.92482 0.612833 10.0752 0.662478 10.2125C1.39758 12.114 2.67374 13.7584 4.33323 14.9424C5.99272 16.1265 7.9628 16.7984 9.99998 16.875C12.0372 16.7984 14.0072 16.1265 15.6667 14.9424C17.3262 13.7584 18.6024 12.114 19.3375 10.2125C19.3871 10.0752 19.3871 9.92482 19.3375 9.7875ZM9.99998 14.0625C9.19649 14.0625 8.41105 13.8242 7.74298 13.3778C7.0749 12.9315 6.5542 12.297 6.24672 11.5547C5.93924 10.8123 5.85879 9.99549 6.01554 9.20745C6.17229 8.4194 6.55921 7.69553 7.12736 7.12738C7.69551 6.55923 8.41938 6.17231 9.20742 6.01556C9.99547 5.85881 10.8123 5.93926 11.5546 6.24674C12.297 6.55422 12.9314 7.07492 13.3778 7.743C13.8242 8.41107 14.0625 9.19651 14.0625 10C14.0608 11.0769 13.6323 12.1093 12.8708 12.8708C12.1093 13.6323 11.0769 14.0608 9.99998 14.0625Z"
                  fill="#262626"
                />
              </svg>
            </button>

            <button
              onClick={
                canEdit
                  ? () => {
                      const reviewer = row.original;

                      const nameParts = reviewer.name.trim().split(/\s+/);
                      const firstName =
                        nameParts.length > 1
                          ? nameParts.slice(0, -1).join(" ")
                          : nameParts[0] || "";
                      const lastName =
                        nameParts.length > 1
                          ? nameParts[nameParts.length - 1]
                          : "";

                      setEditReviewerFirstName(firstName);
                      setEditReviewerLastName(lastName);
                      setEditReviewerEmail(reviewer.email);
                      setEditReviewerExpertiseTags(reviewer.expertise || []);
                      setEditReviewerIsActive(reviewer.accountStatus === "Active");

                      setOriginalReviewerValues({
                        firstName,
                        lastName,
                        email: reviewer.email,
                        tags: reviewer.expertise || [],
                        accountStatus: reviewer.accountStatus === "Active",
                      });

                      setEditingReviewerId(reviewer.id);
                      setIsEditReviewerModalOpen(true);
                    }
                  : undefined
              }
              disabled={!canEdit}
              className={`w-8 h-8 bg-zinc-100 flex items-center justify-center transition-colors rounded-lg ${
                canEdit
                  ? "hover:bg-zinc-200"
                  : "opacity-50 cursor-not-allowed"
              }`}
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
          </div>
        ),
        enableSorting: false,
      },
    ],
    [canEdit],
  );

  const auditorColumns = useMemo<ColumnDef<Auditor>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Auditor
          </span>
        ),
        cell: ({ row }) => {
          const { name, profile_picture_url } = row.original;
          const hasProfilePicture =
            profile_picture_url && profile_picture_url.trim() !== "";

          return (
            <div className="flex items-center gap-">
              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 overflow-hidden">
                {hasProfilePicture ? (
                  <img
                    src={profile_picture_url}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-zinc-600">
                    {getInitials(name)}
                  </span>
                )}
              </div>

              <span
                className="ml-1 text-[10px] md:text-xs font-normal leading-[100%] align-middle text-secondary whitespace-nowrap"
                style={{ letterSpacing: "1%" }}
              >
                {name}
              </span>
            </div>
          );
        },
      },
      {
        id: "email",
        accessorKey: "email",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Contact
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span
              className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-secondary"
              style={{ letterSpacing: "1%" }}
            >
              {row.original.email}
            </span>
          </div>
        ),
      },
      {
        id: "location",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Location
          </span>
        ),
        cell: ({ row }) => {
          const { city, state, country } = row.original;
          const locationParts = [];

          if (city && city.trim() !== "") {
            locationParts.push(city.trim());
          }
          if (state && state.trim() !== "") {
            locationParts.push(state.trim());
          }
          if (country && country.trim() !== "") {
            locationParts.push(country.trim());
          }

          const locationText =
            locationParts.length > 0 ? locationParts.join(", ") : "N/A";

          return (
            <span
              className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-secondary wrap-break-word"
              style={{ letterSpacing: "1%" }}
            >
              {locationText}
            </span>
          );
        },
      },
      {
        id: "certifications",
        accessorKey: "certifications",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Certifications
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5 max-w-full">
            {row.original.certifications.map((cert, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-md text-[9px] md:text-xs font-normal text-secondary wrap-break-word"
                style={{ backgroundColor: "#e9e9e9" }}
              >
                {cert}
              </span>
            ))}
          </div>
        ),
      },
      {
        accessorKey: "assigned",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Assigned
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-left block text-secondary"
            style={{ letterSpacing: "1%" }}
          >
            {getValue<number>()}
          </span>
        ),
      },
      {
        accessorKey: "accountStatus",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Status
          </span>
        ),
        cell: ({ getValue }) => {
          const accountStatus = getValue<string>();
          return (
            <span
              className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[9px] md:text-xs font-medium leading-[100%] align-middle border ${
                accountStatus === "Active"
                  ? "bg-green-50 text-green-600 border-green-300"
                  : "bg-red-50 text-red-600 border-red-300"
              }`}
            >
              {accountStatus}
            </span>
          );
        },
      },
      {
        id: "action",
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle text-left pl-4 block"
            style={{ color: "#9B9B9B", letterSpacing: "1%" }}
          >
            Actions
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setSelectedAuditor(row.original);
                setIsViewAuditorDetailsModalOpen(true);
              }}
              className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center hover:bg-zinc-200 transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z"
                  fill="#262626"
                />
                <path
                  d="M19.3375 9.7875C18.6024 7.88603 17.3262 6.24164 15.6667 5.05755C14.0072 3.87347 12.0372 3.20161 9.99998 3.125C7.9628 3.20161 5.99272 3.87347 4.33323 5.05755C2.67374 6.24164 1.39758 7.88603 0.662478 9.7875C0.612833 9.92482 0.612833 10.0752 0.662478 10.2125C1.39758 12.114 2.67374 13.7584 4.33323 14.9424C5.99272 16.1265 7.9628 16.7984 9.99998 16.875C12.0372 16.7984 14.0072 16.1265 15.6667 14.9424C17.3262 13.7584 18.6024 12.114 19.3375 10.2125C19.3871 10.0752 19.3871 9.92482 19.3375 9.7875ZM9.99998 14.0625C9.19649 14.0625 8.41105 13.8242 7.74298 13.3778C7.0749 12.9315 6.5542 12.297 6.24672 11.5547C5.93924 10.8123 5.85879 9.99549 6.01554 9.20745C6.17229 8.4194 6.55921 7.69553 7.12736 7.12738C7.69551 6.55923 8.41938 6.17231 9.20742 6.01556C9.99547 5.85881 10.8123 5.93926 11.5546 6.24674C12.297 6.55422 12.9314 7.07492 13.3778 7.743C13.8242 8.41107 14.0625 9.19651 14.0625 10C14.0608 11.0769 13.6323 12.1093 12.8708 12.8708C12.1093 13.6323 11.0769 14.0608 9.99998 14.0625Z"
                  fill="#262626"
                />
              </svg>
            </button>
            <button
              onClick={
                canEdit
                  ? () => {
                      const auditor = row.original;

                      const nameParts = auditor.name.trim().split(/\s+/);
                      const firstName =
                        nameParts.length > 1
                          ? nameParts.slice(0, -1).join(" ")
                          : nameParts[0] || "";
                      const lastName =
                        nameParts.length > 1
                          ? nameParts[nameParts.length - 1]
                          : "";

                      const certTags = auditor.certifications.map((cert, idx) => ({
                        id: `cert-${idx}`,
                        name: cert,
                      }));

                      setEditAuditorFirstName(firstName);
                      setEditAuditorLastName(lastName);
                      setEditAuditorEmail(auditor.email);
                      setEditSelectedCountry(auditor.country || "");
                      setEditSelectedState("");
                      setEditSelectedCity("");
                      setEditCertificationTags(certTags);
                      setEditIsAuditorActive(auditor.accountStatus === "Active");

                      setOriginalAuditorValues({
                        firstName,
                        lastName,
                        email: auditor.email,
                        country: auditor.country || "",
                        state: "",
                        city: "",
                        assigned_certificates: auditor.certifications || [],
                        accountStatus: auditor.accountStatus === "Active",
                      });

                      setEditingAuditorId(auditor.id);
                      setIsEditAuditorModalOpen(true);
                    }
                  : undefined
              }
              disabled={!canEdit}
              className={`w-8 h-8 bg-zinc-100 flex items-center justify-center transition-colors rounded-lg ${
                canEdit
                  ? "hover:bg-zinc-200"
                  : "opacity-50 cursor-not-allowed"
              }`}
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
          </div>
        ),
        enableSorting: false,
      },
    ],
    [canEdit],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const auditorTable = useReactTable({
    data: auditorData,
    columns: auditorColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const fetchCertificates = useCallback(
    async (pageIndex: number, pageSize: number, append = false) => {
      setIsLoadingCertificates(true);
      try {
        const response = await axiosInstance.get(
          `/certificates-lite?page=${pageIndex}&limit=${pageSize}`,
        );
        const certificatesData = response.data?.data?.data || [];
        const meta = response.data?.data || {
          total: 0,
          page: 1,
          limit: pageSize,
        };

        const certificates = certificatesData.map((cert: any) => ({
          id: cert.id,
          name: cert.name,
          product_id: cert.product_id,
        }));

        if (append) {
          setAvailableCertificates((prev) => [...prev, ...certificates]);
        } else {
          setAvailableCertificates(certificates);
        }

        const totalPages = Math.ceil((meta.total || 0) / pageSize);
        setCertificatesPagination({
          pageIndex,
          pageSize,
          totalPages: totalPages || 1,
          total: meta.total || 0,
        });
      } catch (error) {
        console.error("Error fetching certificates:", error);
        if (!append) {
          setAvailableCertificates([]);
        }
      } finally {
        setIsLoadingCertificates(false);
      }
    },
    [],
  );

  const loadCountries = useCallback(async () => {
    setIsLoadingCountries(true);
    try {
      const res = await axiosInstance.get("/countries");
      const apiData = res.data?.data?.data || res.data;
      const apiCountries: Array<{
        name: { common: string };
        cca2: string;
        flags: { svg: string; png: string };
        isoCode?: string;
      }> = Array.isArray(apiData) ? apiData : [];

      const allCSCCountries = CSC.getAllCountries();

      const merged = apiCountries
        .map((apiC) => {
          const cscC = allCSCCountries.find((c) => c.isoCode === apiC.cca2);
          return {
            ...apiC,
            isoCode: cscC?.isoCode || apiC.cca2,
          };
        })
        .filter((c) => {
          const stateCount = CSS.getStatesOfCountry(c.cca2).length;
          return stateCount > 0;
        })
        .sort((a, b) => a.name.common.localeCompare(b.name.common));

      if (merged.length > 0) {
        setCountries(merged);
      } else {
        const fallback = allCSCCountries
          .map((c) => ({
            name: { common: c.name },
            cca2: c.isoCode,
            flags: {
              svg: `https://flagcdn.com/${c.isoCode.toLowerCase()}.svg`,
              png: `https://flagcdn.com/w320/${c.isoCode.toLowerCase()}.png`,
            },
            isoCode: c.isoCode,
          }))
          .sort((a, b) => a.name.common.localeCompare(b.name.common));
        setCountries(fallback);
      }
    } catch (err) {
      console.error("Failed to fetch countries", err);
      const allCSCCountries = CSC.getAllCountries();
      const fallback = allCSCCountries
        .map((c) => ({
          name: { common: c.name },
          cca2: c.isoCode,
          flags: {
            svg: `https://flagcdn.com/${c.isoCode.toLowerCase()}.svg`,
            png: `https://flagcdn.com/w320/${c.isoCode.toLowerCase()}.png`,
          },
          isoCode: c.isoCode,
        }))
        .sort((a, b) => a.name.common.localeCompare(b.name.common));
      setCountries(fallback);
    } finally {
      setIsLoadingCountries(false);
    }
  }, []);

  useEffect(() => {
    if (isAddReviewerModalOpen) {
      setReviewerFirstName("");
      setReviewerLastName("");
      setEmail("");
      setExpertiseTags([]);
      setNewTag("");
      setIsActive(false);
      setReviewerErrors({});
    }
  }, [isAddReviewerModalOpen]);

  useEffect(() => {
    if (isAddAuditorModalOpen) {
      setAuditorFirstName("");
      setAuditorLastName("");
      setAuditorEmail("");
      setSelectedCountry("");
      setSelectedState("");
      setSelectedCity("");
      setSearchCountry("");
      setSearchState("");
      setSearchCity("");
      setShowCountryDropdown(false);
      setShowStateDropdown(false);
      setShowCityDropdown(false);
      setCertificationTags([]);
      setIsAuditorActive(false);
      setShowCertificatesDropdown(false);
      setAuditorErrors({});
    }
  }, [isAddAuditorModalOpen]);

  useEffect(() => {
    if (isAddAuditorModalOpen) {
      if (availableCertificates.length === 0) {
        fetchCertificates(1, 20, false);
      }
      if (countries.length === 0) {
        loadCountries();
      }
    }
  }, [
    isAddAuditorModalOpen,
    fetchCertificates,
    loadCountries,
    availableCertificates.length,
    countries.length,
  ]);

  useEffect(() => {
    if (isEditAuditorModalOpen) {
      if (availableCertificates.length === 0) {
        fetchCertificates(1, 20, false);
      }
      if (countries.length === 0) {
        loadCountries();
      }
    }
  }, [
    isEditAuditorModalOpen,
    fetchCertificates,
    loadCountries,
    availableCertificates.length,
    countries.length,
  ]);

  const handleCertificatesScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = target;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (
        isNearBottom &&
        !isLoadingCertificates &&
        certificatesPagination.pageIndex < certificatesPagination.totalPages
      ) {
        const nextPage = certificatesPagination.pageIndex + 1;
        fetchCertificates(nextPage, certificatesPagination.pageSize, true);
      }
    },
    [isLoadingCertificates, certificatesPagination, fetchCertificates],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        certificatesDropdownRef.current &&
        !certificatesDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCertificatesDropdown(false);
      }
      if (
        editCertificatesDropdownRef.current &&
        !editCertificatesDropdownRef.current.contains(event.target as Node)
      ) {
        setEditShowCertificatesDropdown(false);
      }

      const target = event.target as HTMLElement;
      if (!target.closest(".country-state-city-dropdown")) {
        setShowCountryDropdown(false);
        setShowStateDropdown(false);
        setShowCityDropdown(false);
        setEditShowCountryDropdown(false);
        setEditShowStateDropdown(false);
        setEditShowCityDropdown(false);
      }
    };

    if (
      showCertificatesDropdown ||
      editShowCertificatesDropdown ||
      showCountryDropdown ||
      showStateDropdown ||
      showCityDropdown ||
      editShowCountryDropdown ||
      editShowStateDropdown ||
      editShowCityDropdown
    ) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    showCertificatesDropdown,
    editShowCertificatesDropdown,
    showCountryDropdown,
    showStateDropdown,
    showCityDropdown,
    editShowCountryDropdown,
    editShowStateDropdown,
    editShowCityDropdown,
  ]);

  const fetchReviewers = async () => {
    setIsLoadingReviewers(true);
    setReviewersError(null);
    try {
      const response = await axiosInstance.get<{
        message: string;
        data: ReviewerApiResponse[];
      }>("/reviewers/list");
      const apiData = response.data?.data || [];

      const mappedData: Reviewer[] = apiData.map((reviewer) => {
        const isActive =
          typeof reviewer.accountStatus === "boolean"
            ? reviewer.accountStatus
            : reviewer.accountStatus === "active" ||
              reviewer.accountStatus === "Active";

        return {
          id: reviewer.id,
          name: reviewer.name,
          email: reviewer.email,
          expertise: reviewer.tags || [],
          assigned: 0,
          accountStatus: isActive ? "Active" : "Blocked",
          tasks: [],
          profile_picture_url: reviewer.profile_picture_url,
        };
      });

      setData(mappedData);
    } catch (error: any) {
      console.error("Error fetching reviewers:", error);
      setReviewersError(
        error.response?.data?.message || "Failed to load reviewers",
      );
      setData([]);
    } finally {
      setIsLoadingReviewers(false);
    }
  };

  const fetchAuditors = async () => {
    setIsLoadingAuditors(true);
    setAuditorsError(null);
    try {
      const response = await axiosInstance.get<{
        message: string;
        data: AuditorApiResponse[];
      }>("/auditors/list");
      const apiData = response.data?.data || [];

      const mappedData: Auditor[] = apiData.map((auditor) => {
        const isActive =
          typeof auditor.accountStatus === "boolean"
            ? auditor.accountStatus
            : auditor.accountStatus === "active" ||
              auditor.accountStatus === "Active";

        return {
          id: auditor.id,
          name: auditor.name,
          organization: auditor.region || "N/A",
          email: auditor.email,
          country: auditor.country,
          city: auditor.city,
          state: auditor.state,
          certifications: auditor.assigned_certificates || [],
          assigned: auditor.assigned_certificates?.length || 0,
          accountStatus: isActive ? "Active" : "Blocked",
          tasks: [],
          profile_picture_url: auditor.profile_picture_url,
        };
      });

      setAuditorData(mappedData);
    } catch (error: any) {
      console.error("Error fetching auditors:", error);
      setAuditorsError(
        error.response?.data?.message || "Failed to load auditors",
      );
      setAuditorData([]);
    } finally {
      setIsLoadingAuditors(false);
    }
  };

  useEffect(() => {
    if (activeTab === "reviewers") {
      fetchReviewers();
    } else if (activeTab === "auditors") {
      fetchAuditors();
    }
  }, [activeTab]);

  useEffect(() => {
    if (reviewersLoaderIntervalRef.current) {
      clearInterval(reviewersLoaderIntervalRef.current);
      reviewersLoaderIntervalRef.current = null;
    }
    if (reviewersLoaderFinishTimeoutRef.current) {
      clearTimeout(reviewersLoaderFinishTimeoutRef.current);
      reviewersLoaderFinishTimeoutRef.current = null;
    }

    if (isLoadingReviewers) {
      setShowReviewersLoader(true);
      setReviewersLoadingProgress(0);
      reviewersLoaderIntervalRef.current = setInterval(() => {
        setReviewersLoadingProgress((prev) => {
          if (prev >= 95) return prev;
          const step = Math.max(1, Math.round((95 - prev) / 8));
          return Math.min(prev + step, 95);
        });
      }, 120);
      return;
    }

    if (showReviewersLoader) {
      setReviewersLoadingProgress(100);
      reviewersLoaderFinishTimeoutRef.current = setTimeout(() => {
        setShowReviewersLoader(false);
        setReviewersLoadingProgress(0);
      }, 300);
    }
  }, [isLoadingReviewers, showReviewersLoader]);

  useEffect(() => {
    if (auditorsLoaderIntervalRef.current) {
      clearInterval(auditorsLoaderIntervalRef.current);
      auditorsLoaderIntervalRef.current = null;
    }
    if (auditorsLoaderFinishTimeoutRef.current) {
      clearTimeout(auditorsLoaderFinishTimeoutRef.current);
      auditorsLoaderFinishTimeoutRef.current = null;
    }

    if (isLoadingAuditors) {
      setShowAuditorsLoader(true);
      setAuditorsLoadingProgress(0);
      auditorsLoaderIntervalRef.current = setInterval(() => {
        setAuditorsLoadingProgress((prev) => {
          if (prev >= 95) return prev;
          const step = Math.max(1, Math.round((95 - prev) / 8));
          return Math.min(prev + step, 95);
        });
      }, 120);
      return;
    }

    if (showAuditorsLoader) {
      setAuditorsLoadingProgress(100);
      auditorsLoaderFinishTimeoutRef.current = setTimeout(() => {
        setShowAuditorsLoader(false);
        setAuditorsLoadingProgress(0);
      }, 300);
    }
  }, [isLoadingAuditors, showAuditorsLoader]);

  const refreshData = () => {
    if (activeTab === "reviewers") {
      fetchReviewers();
    } else if (activeTab === "auditors") {
      fetchAuditors();
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const splitName = (
    fullName: string,
  ): { firstName: string; lastName: string } => {
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return { firstName: nameParts[0], lastName: "" };
    }
    const lastName = nameParts.slice(-1)[0];
    const firstName = nameParts.slice(0, -1).join(" ");
    return { firstName, lastName };
  };

  const registerAuditor = async (auditorData: {
    email: string;
    first_name: string;
    last_name: string;
    accountStatus: boolean;
    assigned_certificates: string[];
    country?: string;
    state?: string;
    city?: string;
  }) => {
    try {
      const payload: any = {
        email: auditorData.email,
        first_name: auditorData.first_name,
        last_name: auditorData.last_name || "",
        accountStatus: auditorData.accountStatus,
        assigned_certificates: auditorData.assigned_certificates,
        role: "auditor",
      };

      if (auditorData.country) payload.country = auditorData.country;
      if (auditorData.state) payload.state = auditorData.state;
      if (auditorData.city) payload.city = auditorData.city;

      const response = await axiosInstance.post("/auth/register", payload);
      return response.data;
    } catch (error: any) {
      console.error("Error registering/updating auditor:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      throw error;
    }
  };

  const registerReviewer = async (reviewerData: {
    email: string;
    first_name: string;
    last_name: string;
    accountStatus: boolean;
    tags: string[];
  }) => {
    try {
      const payload: any = {
        email: reviewerData.email,
        first_name: reviewerData.first_name,
        last_name: reviewerData.last_name || "",
        accountStatus: reviewerData.accountStatus,
        tags: reviewerData.tags,
        role: "reviewer",
      };

      const response = await axiosInstance.post("/auth/register", payload);
      return response.data;
    } catch (error: any) {
      console.error("Error registering/updating reviewer:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      throw error;
    }
  };

  const handleSaveReviewer = async () => {
    if (!canWrite) return;
    const errors: typeof reviewerErrors = {};

    if (!reviewerFirstName.trim()) {
      errors.firstName = "First name is required";
    }

    if (!reviewerLastName.trim()) {
      errors.lastName = "Last name is required";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (expertiseTags.length === 0) {
      errors.tags = "At least one expertise tag is required";
    }

    setReviewerErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSavingReviewer(true);
    try {
      const tags = expertiseTags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const payload = {
        email: email.trim(),
        first_name: reviewerFirstName.trim(),
        last_name: reviewerLastName.trim(),
        accountStatus: isActive,
        tags,
      };

      await registerReviewer(payload);

      setIsAddReviewerModalOpen(false);
      setReviewerFirstName("");
      setReviewerLastName("");
      setEmail("");
      setExpertiseTags([]);
      setNewTag("");
      setIsActive(false);
      setReviewerErrors({});

      refreshData();
    } catch (error: any) {
      console.error("Failed to register reviewer:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.data?.message ||
        (typeof error?.message === "string" ? error.message : null) ||
        "Failed to register reviewer. Please try again.";
      setReviewerErrors((prev) => ({
        ...prev,
        email: errorMessage,
      }));
    } finally {
      setIsSavingReviewer(false);
    }
  };

  const handleSaveAuditor = async () => {
    if (!canWrite) return;
    const errors: typeof auditorErrors = {};

    if (!auditorFirstName.trim()) {
      errors.firstName = "First name is required";
    }

    if (!auditorLastName.trim()) {
      errors.lastName = "Last name is required";
    }

    if (!auditorEmail.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(auditorEmail)) {
      errors.email = "Please enter a valid email address";
    }

    if (!selectedCountry.trim()) {
      errors.country = "Country is required";
    }

    if (!selectedState.trim()) {
      errors.state = "State is required";
    }

    if (!selectedCity.trim()) {
      errors.city = "City is required";
    }

    if (certificationTags.length === 0) {
      errors.certifications = "At least one certification is required";
    }

    setAuditorErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSavingAuditor(true);
    try {
      const assigned_certificates = certificationTags
        .map((cert) => cert.name.trim())
        .filter((cert) => cert.length > 0);

      const payload = {
        email: auditorEmail.trim(),
        first_name: auditorFirstName.trim(),
        last_name: auditorLastName.trim(),
        accountStatus: isAuditorActive,
        assigned_certificates,
        country: selectedCountry.trim(),
        state: selectedState.trim(),
        city: selectedCity.trim(),
      };

      await registerAuditor(payload);

      setIsAddAuditorModalOpen(false);
      setAuditorFirstName("");
      setAuditorLastName("");
      setAuditorEmail("");
      setSelectedCountry("");
      setSelectedState("");
      setSelectedCity("");
      setSearchCountry("");
      setSearchState("");
      setSearchCity("");
      setShowCountryDropdown(false);
      setShowStateDropdown(false);
      setShowCityDropdown(false);
      setCertificationTags([]);
      setIsAuditorActive(false);
      setShowCertificatesDropdown(false);
      setAuditorErrors({});

      setAvailableCertificates([]);
      setCertificatesPagination({
        pageIndex: 1,
        pageSize: 20,
        totalPages: 1,
        total: 0,
      });

      refreshData();
    } catch (error: any) {
      console.error("Failed to register auditor:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.data?.message ||
        (typeof error?.message === "string" ? error.message : null) ||
        "Failed to register auditor. Please try again.";
      setAuditorErrors((prev) => ({
        ...prev,
        email: errorMessage,
      }));
    } finally {
      setIsSavingAuditor(false);
    }
  };

  const handleSaveEditReviewer = async () => {
    if (!canEdit) return;
    if (!editingReviewerId || !originalReviewerValues) {
      alert("Error: Missing reviewer information");
      return;
    }

    const errors: typeof editReviewerErrors = {};

    if (!editReviewerFirstName.trim()) {
      errors.firstName = "First name is required";
    }

    if (!editReviewerLastName.trim()) {
      errors.lastName = "Last name is required";
    }

    if (editReviewerExpertiseTags.length === 0) {
      errors.tags = "At least one expertise tag is required";
    }

    setEditReviewerErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSavingEditReviewer(true);
    try {
      const tags = editReviewerExpertiseTags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const currentValues = {
        firstName: editReviewerFirstName.trim(),
        lastName: editReviewerLastName.trim(),
        tags: tags,
        accountStatus: editReviewerIsActive,
      };

      const payload: any = {};

      if (currentValues.firstName !== originalReviewerValues.firstName) {
        payload.first_name = currentValues.firstName;
      }

      if (currentValues.lastName !== originalReviewerValues.lastName) {
        payload.last_name = currentValues.lastName;
      }

      const originalTagsSorted = [...originalReviewerValues.tags]
        .sort()
        .join(",");
      const currentTagsSorted = [...currentValues.tags].sort().join(",");
      if (originalTagsSorted !== currentTagsSorted) {
        payload.tags = currentValues.tags;
      }

      if (
        currentValues.accountStatus !== originalReviewerValues.accountStatus
      ) {
        payload.accountStatus = currentValues.accountStatus;
      }

      if (Object.keys(payload).length === 0) {
        alert("No changes detected");
        setIsSavingEditReviewer(false);
        return;
      }

      const response = await axiosInstance.patch(
        `/reviewers/profile?reviewerId=${editingReviewerId}`,
        payload,
      );

      setIsEditReviewerModalOpen(false);
      setEditReviewerFirstName("");
      setEditReviewerLastName("");
      setEditReviewerEmail("");
      setEditReviewerExpertiseTags([]);
      setEditReviewerNewTag("");
      setEditReviewerIsActive(false);
      setEditReviewerErrors({});
      setEditingReviewerId(null);
      setOriginalReviewerValues(null);

      refreshData();
      alert("Reviewer updated successfully!");
    } catch (error: any) {
      console.error("Failed to update reviewer:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to update reviewer. Please try again.";
      alert(errorMessage);
    } finally {
      setIsSavingEditReviewer(false);
    }
  };

  const handleSaveEditAuditor = async () => {
    if (!canEdit) return;
    if (!editingAuditorId || !originalAuditorValues) {
      alert("Error: Missing auditor information");
      return;
    }

    const errors: typeof editAuditorErrors = {};

    if (!editAuditorFirstName.trim()) {
      errors.firstName = "First name is required";
    }

    if (!editAuditorLastName.trim()) {
      errors.lastName = "Last name is required";
    }

    if (!editSelectedCountry.trim()) {
      errors.country = "Country is required";
    }

    if (editCertificationTags.length === 0) {
      errors.certifications = "At least one certification is required";
    }

    setEditAuditorErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSavingEditAuditor(true);
    try {
      const assigned_certificates = editCertificationTags
        .map((cert) => cert.name.trim())
        .filter((cert) => cert.length > 0);

      const currentValues = {
        firstName: editAuditorFirstName.trim(),
        lastName: editAuditorLastName.trim(),
        country: editSelectedCountry.trim(),
        state: editSelectedState.trim(),
        city: editSelectedCity.trim(),
        assigned_certificates: assigned_certificates,
        accountStatus: editIsAuditorActive,
      };

      const payload: any = {};

      if (currentValues.firstName !== originalAuditorValues.firstName) {
        payload.first_name = currentValues.firstName;
      }

      if (currentValues.lastName !== originalAuditorValues.lastName) {
        payload.last_name = currentValues.lastName;
      }

      if (currentValues.country !== originalAuditorValues.country) {
        payload.country = currentValues.country;
      }

      if (currentValues.state !== originalAuditorValues.state) {
        payload.state = currentValues.state;
      }

      if (currentValues.city !== originalAuditorValues.city) {
        payload.city = currentValues.city;
      }

      const originalCertsSorted = [
        ...originalAuditorValues.assigned_certificates,
      ]
        .sort()
        .join(",");
      const currentCertsSorted = [...currentValues.assigned_certificates]
        .sort()
        .join(",");
      if (originalCertsSorted !== currentCertsSorted) {
        payload.assigned_certificates = currentValues.assigned_certificates;
      }

      if (currentValues.accountStatus !== originalAuditorValues.accountStatus) {
        payload.accountStatus = currentValues.accountStatus;
      }

      if (Object.keys(payload).length === 0) {
        alert("No changes detected");
        setIsSavingEditAuditor(false);
        return;
      }

      const response = await axiosInstance.patch(
        `/auditors/profile?auditorId=${editingAuditorId}`,
        payload,
      );

      setIsEditAuditorModalOpen(false);
      setEditAuditorFirstName("");
      setEditAuditorLastName("");
      setEditAuditorEmail("");
      setEditSelectedCountry("");
      setEditSelectedState("");
      setEditSelectedCity("");
      setEditSearchCountry("");
      setEditSearchState("");
      setEditSearchCity("");
      setEditShowCountryDropdown(false);
      setEditShowStateDropdown(false);
      setEditShowCityDropdown(false);
      setEditCertificationTags([]);
      setEditIsAuditorActive(false);
      setEditShowCertificatesDropdown(false);
      setEditAuditorErrors({});
      setEditingAuditorId(null);
      setOriginalAuditorValues(null);

      refreshData();
      alert("Auditor updated successfully!");
    } catch (error: any) {
      console.error("Failed to update auditor:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to update auditor. Please try again.";
      alert(errorMessage);
    } finally {
      setIsSavingEditAuditor(false);
    }
  };

  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen flex flex-col">
      <div className="flex flex-row items-center justify-between mb-4 md:mb-6 gap-3">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
            Auditors & Reviewers
          </h1>
          <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
            Manage your internal reviewers and external auditors
          </p>
        </div>
        {activeTab === "reviewers" && (
          <button
            onClick={canWrite ? () => setIsAddReviewerModalOpen(true) : undefined}
            disabled={!canWrite}
            className={`px-4 py-2 md:px-6 md:py-3 rounded-lg transition-colors text-sm md:text-base font-medium inline-flex items-center gap-2 shrink-0 ${
              canWrite
                ? "bg-black text-white hover:bg-gray-800"
                : "bg-black/50 text-white/70 cursor-not-allowed"
            }`}
          >
            Add Reviewer
            <span className="w-5 h-5 inline-flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 13H5V11H11V5H13V11H19V13H13V19H11V13Z"
                  fill="white"
                />
              </svg>
            </span>
          </button>
        )}
        {activeTab === "auditors" && (
          <button
            onClick={canWrite ? () => setIsAddAuditorModalOpen(true) : undefined}
            disabled={!canWrite}
            className={`px-4 py-2 md:px-6 md:py-3 rounded-lg transition-colors text-sm md:text-base font-medium inline-flex items-center gap-2 shrink-0 ${
              canWrite
                ? "bg-black text-white hover:bg-gray-800"
                : "bg-black/50 text-white/70 cursor-not-allowed"
            }`}
          >
            Add Auditor
            <span className="w-5 h-5 inline-flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 13H5V11H11V5H13V11H19V13H13V19H11V13Z"
                  fill="white"
                />
              </svg>
            </span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl p-2 md:p-3 inline-flex gap-1.5 mb-3 md:mb-4">
        <button
          onClick={() => setActiveTab("reviewers")}
          className={`px-7 py-1.5 md:px-10 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors ${
            activeTab === "reviewers"
              ? "bg-black text-white shadow-lg"
              : "bg-white text-secondary hover:bg-primary"
          }`}
          style={
            activeTab === "reviewers"
              ? {
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }
              : undefined
          }
        >
          Reviewers
        </button>
        <button
          onClick={() => setActiveTab("auditors")}
          className={`px-7 py-1.5 md:px-10 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors ${
            activeTab === "auditors"
              ? "bg-black text-white shadow-lg"
              : "bg-white text-secondary hover:bg-primary"
          }`}
          style={
            activeTab === "auditors"
              ? {
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }
              : undefined
          }
        >
          Auditors
        </button>
      </div>

      <div className="flex flex-col flex-1">
        {activeTab === "reviewers" && (
          <div className="mt-2">
            <div className="bg-white rounded-xl p-2 md:p-3 shadow-sm mb-4">
              <h3 className="text-lg font-semibold text-secondary mb-1">
                About Reviewers
              </h3>
              <p className="text-xs md:text-sm font-normal text-gray leading-relaxed">
                Internal team members who review AI-flagged or selected
                self-assessments. They help validate issues but do not issue
                final audit certificates.
              </p>
            </div>
          </div>
        )}

        {activeTab === "auditors" && (
          <div className="mt-2">
            <div className="bg-white rounded-xl p-2 md:p-3 shadow-sm mb-4">
              <h3 className="text-lg font-semibold text-secondary mb-1">
                About Auditors
              </h3>
              <p className="text-xs md:text-sm font-normal text-gray leading-relaxed">
                External, independent professionals who handle formal audit
                stages. They issue audit decisions and reports when applicants
                apply for certification audits.
              </p>
            </div>
          </div>
        )}

        {activeTab === "reviewers" && (
          <>
            {reviewersError ? (
              <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center">
                <p className="text-red-600 mb-4">{reviewersError}</p>
                <button
                  onClick={fetchReviewers}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div
                className={`bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden mb-4 ${
                  showReviewersLoader ? "flex flex-col flex-1" : ""
                }`}
              >
                <div
                  className={`relative ${showReviewersLoader ? "flex-1 overflow-x-auto" : "overflow-x-auto"}`}
                >
                  <table
                    className={`w-full ${showReviewersLoader ? "h-full" : ""}`}
                    style={{ tableLayout: "auto" }}
                  >
                    <thead>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr
                          key={headerGroup.id}
                          className="border-b border-zinc-300"
                        >
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              className={`py-2 md:py-4 ${
                                header.id === "action"
                                  ? "text-right pl-2 md:pl-4"
                                  : "text-left px-2 md:px-4"
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
                    <tbody className={showReviewersLoader ? "h-full" : ""}>
                      {showReviewersLoader ? null : table.getRowModel().rows
                          .length === 0 ? (
                        <tr>
                          <td
                            colSpan={columns.length}
                            className="px-4 py-8 text-center text-gray text-sm"
                          >
                            No reviewers found
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
                                className={`py-2 md:py-4 ${
                                  cell.column.id === "action"
                                    ? "text-right pl-2 md:pl-4"
                                    : "px-2 md:px-4"
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

                  {showReviewersLoader && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loading
                        isLoading
                        size="sm"
                        progress={reviewersLoadingProgress}
                        className="p-4"
                      />
                    </div>
                  )}
                </div>

                {!showReviewersLoader &&
                  !reviewersError &&
                  table.getRowModel().rows.length > 0 && (
                    <div className="px-2 md:px-4 py-3 md:py-4 border-t border-zinc-100 flex items-center justify-center overflow-x-auto">
                      <div className="flex items-center gap-0.5 md:gap-1">
                        <button
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
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
                          <span className="hidden sm:inline ml-1 md:ml-0">
                            Back
                          </span>
                        </button>
                        {(() => {
                          const currentPage =
                            table.getState().pagination.pageIndex;
                          const totalPages = table.getPageCount();
                          const maxPagesToShow = 8;
                          let startPage = 0;
                          let endPage = Math.min(
                            maxPagesToShow - 1,
                            totalPages - 1,
                          );
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
                                onClick={() =>
                                  table.setPageIndex(totalPages - 1)
                                }
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
                          disabled={!table.getCanNextPage()}
                          className="flex items-center px-2 py-1 md:px-3 md:py-1.5 bg-zinc-100 text-gray rounded-sm text-[10px] md:text-xs font-normal hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-200"
                        >
                          <span className="hidden sm:inline mr-1 md:mr-0">
                            Next
                          </span>
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
            )}
          </>
        )}

        {activeTab === "auditors" && (
          <>
            {auditorsError ? (
              <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center">
                <p className="text-red-600 mb-4">{auditorsError}</p>
                <button
                  onClick={fetchAuditors}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div
                className={`bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden mb-4 ${
                  showAuditorsLoader ? "flex flex-col flex-1" : ""
                }`}
              >
                <div
                  className={`relative ${showAuditorsLoader ? "flex-1 overflow-x-auto" : "overflow-x-auto"}`}
                >
                  <table
                    className={`w-full ${showAuditorsLoader ? "h-full" : ""}`}
                    style={{ tableLayout: "auto" }}
                  >
                    <thead>
                      {auditorTable.getHeaderGroups().map((headerGroup) => (
                        <tr
                          key={headerGroup.id}
                          className="border-b border-zinc-300"
                        >
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              className={`py-2 md:py-4 ${
                                header.id === "action"
                                  ? "text-right pl-2 md:pl-4"
                                  : "text-left px-2 md:px-4"
                              }`}
                              style={
                                header.column.id === "name"
                                  ? { minWidth: "200px", width: "200px" }
                                  : header.column.id === "email"
                                    ? {
                                        minWidth: "180px",
                                        maxWidth: "180px",
                                        width: "180px",
                                      }
                                    : header.column.id === "location"
                                      ? { minWidth: "200px", width: "200px" }
                                      : header.column.id === "certifications"
                                        ? { minWidth: "550px", width: "550px" }
                                        : header.column.id === "assigned"
                                          ? {
                                              minWidth: "80px",
                                              maxWidth: "80px",
                                              width: "80px",
                                            }
                                          : header.column.id === "accountStatus"
                                            ? {
                                                minWidth: "100px",
                                                maxWidth: "100px",
                                                width: "100px",
                                              }
                                            : header.column.id === "action"
                                              ? {
                                                  minWidth: "120px",
                                                  maxWidth: "120px",
                                                  width: "120px",
                                                }
                                              : undefined
                              }
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
                    <tbody className={showAuditorsLoader ? "h-full" : ""}>
                      {showAuditorsLoader ? null : auditorTable.getRowModel()
                          .rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={auditorColumns.length}
                            className="px-4 py-8 text-center text-gray text-sm"
                          >
                            No auditors found
                          </td>
                        </tr>
                      ) : (
                        auditorTable.getRowModel().rows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 transition-colors"
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className={`py-2 md:py-4 ${
                                  cell.column.id === "action"
                                    ? "text-right pl-2 md:pl-4"
                                    : "px-2 md:px-4"
                                }`}
                                style={
                                  cell.column.id === "name"
                                    ? { minWidth: "200px", width: "200px" }
                                    : cell.column.id === "email"
                                      ? {
                                          minWidth: "180px",
                                          maxWidth: "180px",
                                          width: "180px",
                                        }
                                      : cell.column.id === "location"
                                        ? { minWidth: "200px", width: "200px" }
                                        : cell.column.id === "certifications"
                                          ? {
                                              minWidth: "550px",
                                              width: "550px",
                                            }
                                          : cell.column.id === "assigned"
                                            ? {
                                                minWidth: "80px",
                                                maxWidth: "80px",
                                                width: "80px",
                                              }
                                            : cell.column.id === "accountStatus"
                                              ? {
                                                  minWidth: "100px",
                                                  maxWidth: "100px",
                                                  width: "100px",
                                                }
                                              : cell.column.id === "action"
                                                ? {
                                                    minWidth: "120px",
                                                    maxWidth: "120px",
                                                    width: "120px",
                                                  }
                                                : undefined
                                }
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

                  {showAuditorsLoader && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loading
                        isLoading
                        size="sm"
                        progress={auditorsLoadingProgress}
                        className="p-4"
                      />
                    </div>
                  )}
                </div>

                {!showAuditorsLoader &&
                  !auditorsError &&
                  auditorTable.getRowModel().rows.length > 0 && (
                    <div className="px-2 md:px-4 py-3 md:py-4 border-t border-zinc-100 flex items-center justify-center overflow-x-auto">
                      <div className="flex items-center gap-0.5 md:gap-1">
                        <button
                          onClick={() => auditorTable.previousPage()}
                          disabled={!auditorTable.getCanPreviousPage()}
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
                          <span className="hidden sm:inline ml-1 md:ml-0">
                            Back
                          </span>
                        </button>
                        {(() => {
                          const currentPage =
                            auditorTable.getState().pagination.pageIndex;
                          const totalPages = auditorTable.getPageCount();
                          const maxPagesToShow = 8;
                          let startPage = 0;
                          let endPage = Math.min(
                            maxPagesToShow - 1,
                            totalPages - 1,
                          );
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
                                onClick={() => auditorTable.setPageIndex(i)}
                                className={`px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-sm text-[10px] md:text-xs font-normal transition-colors ${
                                  currentPage === i
                                    ? "bg-dull-gray text-primary"
                                    : "bg-zinc-50 text-secondary border hover:bg-zinc-100"
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
                                onClick={() =>
                                  auditorTable.setPageIndex(totalPages - 1)
                                }
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
                          onClick={() => auditorTable.nextPage()}
                          disabled={!auditorTable.getCanNextPage()}
                          className="flex items-center px-2 py-1 md:px-3 md:py-1.5 bg-zinc-100 text-gray rounded-sm text-[10px] md:text-xs font-normal hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-200"
                        >
                          <span className="hidden sm:inline mr-1 md:mr-0">
                            Next
                          </span>
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
            )}
          </>
        )}
      </div>

      {isAddReviewerModalOpen && canWrite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsAddReviewerModalOpen(false);
              setReviewerFirstName("");
              setReviewerLastName("");
              setEmail("");
              setExpertiseTags([]);
              setNewTag("");
              setIsActive(false);
              setReviewerErrors({});
            }}
          ></div>

          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-xl mx-4 p-4 md:p-6">
            {isSavingReviewer && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                <Loading isLoading size="sm" className="p-4" />
              </div>
            )}

            <div className="flex items-start justify-between mb-6">
              <h3 className="text-lg md:text-xl font-semibold text-secondary">
                Add Reviewer
              </h3>
              <button
                onClick={() => {
                  setIsAddReviewerModalOpen(false);
                  setReviewerFirstName("");
                  setReviewerLastName("");
                  setEmail("");
                  setExpertiseTags([]);
                  setNewTag("");
                  setIsActive(false);
                  setReviewerErrors({});
                }}
                className="ml-4 p-1 hover:bg-zinc-100 rounded transition-colors"
              >
                <img
                  src="/assets/imgs/admin/commons/cross.svg"
                  alt="Close"
                  className="w-5 h-5"
                />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reviewerFirstName}
                    onChange={(e) => {
                      setReviewerFirstName(e.target.value);
                      if (reviewerErrors.firstName) {
                        setReviewerErrors((prev) => ({
                          ...prev,
                          firstName: undefined,
                        }));
                      }
                    }}
                    placeholder="Enter first name"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                      reviewerErrors.firstName
                        ? "border-red-500 focus:ring-red-200"
                        : "border-zinc-200 focus:ring-zinc-300 focus:border-transparent"
                    }`}
                  />
                  {reviewerErrors.firstName && (
                    <p className="text-xs text-red-500 mt-1">
                      {reviewerErrors.firstName}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reviewerLastName}
                    onChange={(e) => {
                      setReviewerLastName(e.target.value);
                      if (reviewerErrors.lastName) {
                        setReviewerErrors((prev) => ({
                          ...prev,
                          lastName: undefined,
                        }));
                      }
                    }}
                    placeholder="Enter last name"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                      reviewerErrors.lastName
                        ? "border-red-500 focus:ring-red-200"
                        : "border-zinc-200 focus:ring-zinc-300 focus:border-transparent"
                    }`}
                  />
                  {reviewerErrors.lastName && (
                    <p className="text-xs text-red-500 mt-1">
                      {reviewerErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (reviewerErrors.email) {
                      setReviewerErrors((prev) => ({
                        ...prev,
                        email: undefined,
                      }));
                    }
                  }}
                  placeholder="Enter email address"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                    reviewerErrors.email
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-300 focus:border-transparent"
                  }`}
                />
                {reviewerErrors.email && (
                  <p className="text-xs text-red-500 mt-1">
                    {reviewerErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Expertise Tags <span className="text-red-500">*</span>
                </label>
                {reviewerErrors.tags && (
                  <p className="text-xs text-red-500 mb-2">
                    {reviewerErrors.tags}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  {expertiseTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 rounded-full text-sm text-secondary"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() =>
                          setExpertiseTags(
                            expertiseTags.filter((_, i) => i !== index),
                          )
                        }
                        className="hover:bg-zinc-200 rounded-full p-0.5 transition-colors"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9 3L3 9M3 3L9 9"
                            stroke="#262626"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && newTag.trim()) {
                        e.preventDefault();
                        setExpertiseTags([...expertiseTags, newTag.trim()]);
                        setNewTag("");
                      }
                    }}
                    placeholder="Add expertise tag"
                    className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-transparent"
                  />
                  <button
                    onClick={() => {
                      if (newTag.trim()) {
                        setExpertiseTags([...expertiseTags, newTag.trim()]);
                        setNewTag("");
                        if (reviewerErrors.tags) {
                          setReviewerErrors((prev) => ({
                            ...prev,
                            tags: undefined,
                          }));
                        }
                      }
                    }}
                    className="px-4 py-2.5 bg-zinc-100 text-secondary rounded-lg hover:bg-zinc-200 transition-colors text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-secondary">
                  Active Status
                </label>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isActive ? "bg-black" : "bg-zinc-400"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setIsAddReviewerModalOpen(false);
                  setReviewerFirstName("");
                  setReviewerLastName("");
                  setEmail("");
                  setExpertiseTags([]);
                  setNewTag("");
                  setIsActive(false);
                  setReviewerErrors({});
                }}
                className="px-4 py-1 md:px-6 md:py-2 bg-white border border-zinc-300 rounded-lg text-sm md:text-base font-medium text-secondary hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <Button onClick={handleSaveReviewer} disabled={isSavingReviewer || !canWrite}>
                {isSavingReviewer ? "Saving..." : "Save Reviewer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isEditReviewerModalOpen && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsEditReviewerModalOpen(false);
              setEditReviewerFirstName("");
              setEditReviewerLastName("");
              setEditReviewerEmail("");
              setEditReviewerExpertiseTags([]);
              setEditReviewerNewTag("");
              setEditReviewerIsActive(false);
              setEditReviewerErrors({});
              setEditingReviewerId(null);
              setOriginalReviewerValues(null);
            }}
          ></div>

          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-xl mx-4 p-4 md:p-6">
            {isSavingEditReviewer && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                <Loading isLoading size="sm" className="p-4" />
              </div>
            )}

            <div className="flex items-start justify-between mb-6">
              <h3 className="text-lg md:text-xl font-semibold text-secondary">
                Edit Reviewer
              </h3>
              <button
                onClick={() => {
                  setIsEditReviewerModalOpen(false);
                  setEditReviewerFirstName("");
                  setEditReviewerLastName("");
                  setEditReviewerEmail("");
                  setEditReviewerExpertiseTags([]);
                  setEditReviewerNewTag("");
                  setEditReviewerIsActive(false);
                  setEditReviewerErrors({});
                  setEditingReviewerId(null);
                  setOriginalReviewerValues(null);
                }}
                className="ml-4 p-1 hover:bg-zinc-100 rounded transition-colors"
              >
                <img
                  src="/assets/imgs/admin/commons/cross.svg"
                  alt="Close"
                  className="w-5 h-5"
                />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editReviewerFirstName}
                    onChange={(e) => {
                      setEditReviewerFirstName(e.target.value);
                      if (editReviewerErrors.firstName) {
                        setEditReviewerErrors((prev) => ({
                          ...prev,
                          firstName: undefined,
                        }));
                      }
                    }}
                    placeholder="Enter first name"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                      editReviewerErrors.firstName
                        ? "border-red-500 focus:ring-red-200"
                        : "border-zinc-200 focus:ring-zinc-300 focus:border-transparent"
                    }`}
                  />
                  {editReviewerErrors.firstName && (
                    <p className="text-xs text-red-500 mt-1">
                      {editReviewerErrors.firstName}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editReviewerLastName}
                    onChange={(e) => {
                      setEditReviewerLastName(e.target.value);
                      if (editReviewerErrors.lastName) {
                        setEditReviewerErrors((prev) => ({
                          ...prev,
                          lastName: undefined,
                        }));
                      }
                    }}
                    placeholder="Enter last name"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                      editReviewerErrors.lastName
                        ? "border-red-500 focus:ring-red-200"
                        : "border-zinc-200 focus:ring-zinc-300 focus:border-transparent"
                    }`}
                  />
                  {editReviewerErrors.lastName && (
                    <p className="text-xs text-red-500 mt-1">
                      {editReviewerErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editReviewerEmail}
                  disabled
                  placeholder="Enter email address"
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-secondary placeholder:text-gray-400 bg-gray-100 cursor-not-allowed opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Expertise Tags <span className="text-red-500">*</span>
                </label>
                {editReviewerErrors.tags && (
                  <p className="text-xs text-red-500 mb-2">
                    {editReviewerErrors.tags}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  {editReviewerExpertiseTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 rounded-full text-sm text-secondary"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() =>
                          setEditReviewerExpertiseTags(
                            editReviewerExpertiseTags.filter(
                              (_, i) => i !== index,
                            ),
                          )
                        }
                        className="hover:bg-zinc-200 rounded-full p-0.5 transition-colors"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9 3L3 9M3 3L9 9"
                            stroke="#262626"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editReviewerNewTag}
                    onChange={(e) => setEditReviewerNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && editReviewerNewTag.trim()) {
                        e.preventDefault();
                        setEditReviewerExpertiseTags([
                          ...editReviewerExpertiseTags,
                          editReviewerNewTag.trim(),
                        ]);
                        setEditReviewerNewTag("");
                      }
                    }}
                    placeholder="Add expertise tag"
                    className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-transparent"
                  />
                  <button
                    onClick={() => {
                      if (editReviewerNewTag.trim()) {
                        setEditReviewerExpertiseTags([
                          ...editReviewerExpertiseTags,
                          editReviewerNewTag.trim(),
                        ]);
                        setEditReviewerNewTag("");
                        if (editReviewerErrors.tags) {
                          setEditReviewerErrors((prev) => ({
                            ...prev,
                            tags: undefined,
                          }));
                        }
                      }
                    }}
                    className="px-4 py-2.5 bg-zinc-100 text-secondary rounded-lg hover:bg-zinc-200 transition-colors text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-secondary">
                  Active Status
                </label>
                <button
                  onClick={() => setEditReviewerIsActive(!editReviewerIsActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editReviewerIsActive ? "bg-black" : "bg-zinc-400"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editReviewerIsActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setIsEditReviewerModalOpen(false);
                  setEditReviewerFirstName("");
                  setEditReviewerLastName("");
                  setEditReviewerEmail("");
                  setEditReviewerExpertiseTags([]);
                  setEditReviewerNewTag("");
                  setEditReviewerIsActive(false);
                  setEditReviewerErrors({});
                  setEditingReviewerId(null);
                  setOriginalReviewerValues(null);
                }}
                className="px-4 py-1 md:px-6 md:py-2 bg-white border border-zinc-300 rounded-lg text-sm md:text-base font-medium text-secondary hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <Button
                onClick={handleSaveEditReviewer}
                disabled={isSavingEditReviewer || !canEdit}
              >
                {isSavingEditReviewer ? "Saving..." : "Update Reviewer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isAddAuditorModalOpen && canWrite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsAddAuditorModalOpen(false);

              setAuditorFirstName("");
              setAuditorLastName("");
              setAuditorEmail("");
              setSelectedCountry("");
              setSelectedState("");
              setSelectedCity("");
              setSearchCountry("");
              setSearchState("");
              setSearchCity("");
              setShowCountryDropdown(false);
              setShowStateDropdown(false);
              setShowCityDropdown(false);
              setCertificationTags([]);
              setIsAuditorActive(false);
              setShowCertificatesDropdown(false);
              setAuditorErrors({});

              setAvailableCertificates([]);
              setCertificatesPagination({
                pageIndex: 1,
                pageSize: 20,
                totalPages: 1,
                total: 0,
              });
            }}
          ></div>

          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-2xl mx-4 p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            {isSavingAuditor && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                <Loading isLoading size="sm" className="p-4" />
              </div>
            )}

            <div className="flex items-start justify-between mb-6">
              <h3 className="text-lg md:text-xl font-semibold text-secondary">
                Add Auditor
              </h3>
              <button
                onClick={() => {
                  setIsAddAuditorModalOpen(false);

                  setAuditorFirstName("");
                  setAuditorLastName("");
                  setAuditorEmail("");
                  setSelectedCountry("");
                  setSelectedState("");
                  setSelectedCity("");
                  setSearchCountry("");
                  setSearchState("");
                  setSearchCity("");
                  setShowCountryDropdown(false);
                  setShowStateDropdown(false);
                  setShowCityDropdown(false);
                  setCertificationTags([]);
                  setIsAuditorActive(false);
                  setShowCertificatesDropdown(false);
                  setAuditorErrors({});

                  setAvailableCertificates([]);
                  setCertificatesPagination({
                    pageIndex: 1,
                    pageSize: 20,
                    totalPages: 1,
                    total: 0,
                  });
                }}
                className="ml-4 p-1 hover:bg-zinc-100 rounded transition-colors"
              >
                <img
                  src="/assets/imgs/admin/commons/cross.svg"
                  alt="Close"
                  className="w-5 h-5"
                />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={auditorFirstName}
                    onChange={(e) => {
                      setAuditorFirstName(e.target.value);
                      if (auditorErrors.firstName) {
                        setAuditorErrors((prev) => ({
                          ...prev,
                          firstName: undefined,
                        }));
                      }
                    }}
                    placeholder="Enter first name"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                      auditorErrors.firstName
                        ? "border-red-500 focus:ring-red-200"
                        : "border-zinc-200 focus:ring-zinc-300 focus:border-transparent"
                    }`}
                  />
                  {auditorErrors.firstName && (
                    <p className="text-xs text-red-500 mt-1">
                      {auditorErrors.firstName}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={auditorLastName}
                    onChange={(e) => {
                      setAuditorLastName(e.target.value);
                      if (auditorErrors.lastName) {
                        setAuditorErrors((prev) => ({
                          ...prev,
                          lastName: undefined,
                        }));
                      }
                    }}
                    placeholder="Enter last name"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                      auditorErrors.lastName
                        ? "border-red-500 focus:ring-red-200"
                        : "border-zinc-200 focus:ring-zinc-300 focus:border-transparent"
                    }`}
                  />
                  {auditorErrors.lastName && (
                    <p className="text-xs text-red-500 mt-1">
                      {auditorErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={auditorEmail}
                  onChange={(e) => {
                    setAuditorEmail(e.target.value);
                    if (auditorErrors.email) {
                      setAuditorErrors((prev) => ({
                        ...prev,
                        email: undefined,
                      }));
                    }
                  }}
                  placeholder="Enter email address"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                    auditorErrors.email
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-300 focus:border-transparent"
                  }`}
                />
                {auditorErrors.email && (
                  <p className="text-xs text-red-500 mt-1">
                    {auditorErrors.email}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 country-state-city-dropdown">
                <div className="relative">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <div
                    onClick={async () => {
                      if (countries.length === 0) {
                        await loadCountries();
                      }
                      setShowCountryDropdown(!showCountryDropdown);
                      setShowStateDropdown(false);
                      setShowCityDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm cursor-pointer flex items-center justify-between ${
                      auditorErrors.country
                        ? "border-red-500"
                        : "border-zinc-200"
                    }`}
                  >
                    <span
                      className={
                        selectedCountry ? "text-secondary" : "text-gray-400"
                      }
                    >
                      {selectedCountry || "Select country"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                  {auditorErrors.country && (
                    <p className="text-xs text-red-500 mt-1">
                      {auditorErrors.country}
                    </p>
                  )}
                  {showCountryDropdown && (
                    <div className="absolute z-50 w-75 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg p-2 max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-zinc-100 flex items-center">
                        <Search className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                          type="text"
                          placeholder="Search..."
                          className="w-full text-sm outline-none"
                          value={searchCountry}
                          onChange={(e) => setSearchCountry(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {isLoadingCountries ? (
                          <div className="px-4 py-3 text-sm text-gray text-center">
                            Loading...
                          </div>
                        ) : (
                          countries
                            .filter((c) =>
                              c.name.common
                                .toLowerCase()
                                .includes(searchCountry.toLowerCase()),
                            )
                            .map((c) => (
                              <button
                                key={c.cca2}
                                type="button"
                                onClick={() => {
                                  setSelectedCountry(c.name.common);
                                  setSelectedState("");
                                  setSelectedCity("");
                                  setShowCountryDropdown(false);
                                  setSearchCountry("");
                                  if (auditorErrors.country) {
                                    setAuditorErrors((prev) => ({
                                      ...prev,
                                      country: undefined,
                                    }));
                                  }
                                }}
                                className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm hover:bg-zinc-50 text-secondary"
                              >
                                <div className="relative w-5 h-3 overflow-hidden rounded-sm ring-1 ring-zinc-100 shrink-0">
                                  <Image
                                    src={c.flags.svg}
                                    alt={c.name.common}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <span className="whitespace-normal wrap-break-word">
                                  {c.name.common}
                                </span>
                              </button>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <div
                    onClick={() => {
                      if (selectedCountry) {
                        setShowStateDropdown(!showStateDropdown);
                        setShowCityDropdown(false);
                      }
                    }}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm cursor-pointer flex items-center justify-between ${
                      !selectedCountry ? "opacity-50 cursor-not-allowed" : ""
                    } ${
                      auditorErrors.state ? "border-red-500" : "border-zinc-200"
                    }`}
                  >
                    <span
                      className={
                        selectedState ? "text-secondary" : "text-gray-400"
                      }
                    >
                      {selectedState || "Select state"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                  {auditorErrors.state && (
                    <p className="text-xs text-red-500 mt-1">
                      {auditorErrors.state}
                    </p>
                  )}
                  {showStateDropdown && selectedCountry && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg p-2 max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-zinc-100 flex items-center">
                        <Search className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                          type="text"
                          placeholder="Search..."
                          className="w-full text-sm outline-none"
                          value={searchState}
                          onChange={(e) => setSearchState(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {CSS.getStatesOfCountry(
                          countries.find(
                            (c) => c.name.common === selectedCountry,
                          )?.cca2 || "",
                        )
                          .filter((s) =>
                            s.name
                              .toLowerCase()
                              .includes(searchState.toLowerCase()),
                          )
                          .map((s) => (
                            <button
                              key={s.isoCode}
                              type="button"
                              onClick={() => {
                                setSelectedState(s.name);
                                setSelectedCity("");
                                setShowStateDropdown(false);
                                setSearchState("");
                                if (auditorErrors.state) {
                                  setAuditorErrors((prev) => ({
                                    ...prev,
                                    state: undefined,
                                  }));
                                }
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 text-secondary"
                            >
                              {s.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <div
                    onClick={() => {
                      if (selectedState) {
                        setShowCityDropdown(!showCityDropdown);
                      }
                    }}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm cursor-pointer flex items-center justify-between ${
                      !selectedState ? "opacity-50 cursor-not-allowed" : ""
                    } ${
                      auditorErrors.city ? "border-red-500" : "border-zinc-200"
                    }`}
                  >
                    <span
                      className={
                        selectedCity ? "text-secondary" : "text-gray-400"
                      }
                    >
                      {selectedCity || "Select city"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                  {auditorErrors.city && (
                    <p className="text-xs text-red-500 mt-1">
                      {auditorErrors.city}
                    </p>
                  )}
                  {showCityDropdown && selectedState && selectedCountry && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg p-2 max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-zinc-100 flex items-center">
                        <Search className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                          type="text"
                          placeholder="Search..."
                          className="w-full text-sm outline-none"
                          value={searchCity}
                          onChange={(e) => setSearchCity(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {CSCity.getCitiesOfState(
                          countries.find(
                            (c) => c.name.common === selectedCountry,
                          )?.cca2 || "",
                          CSS.getStatesOfCountry(
                            countries.find(
                              (c) => c.name.common === selectedCountry,
                            )?.cca2 || "",
                          ).find((s) => s.name === selectedState)?.isoCode ||
                            "",
                        )
                          .filter((city) =>
                            city.name
                              .toLowerCase()
                              .includes(searchCity.toLowerCase()),
                          )
                          .map((city) => (
                            <button
                              key={city.name}
                              type="button"
                              onClick={() => {
                                setSelectedCity(city.name);
                                setShowCityDropdown(false);
                                setSearchCity("");
                                if (auditorErrors.city) {
                                  setAuditorErrors((prev) => ({
                                    ...prev,
                                    city: undefined,
                                  }));
                                }
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 text-secondary"
                            >
                              {city.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative" ref={certificatesDropdownRef}>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Certifications They Can Audit{" "}
                  <span className="text-red-500">*</span>
                </label>
                {auditorErrors.certifications && (
                  <p className="text-xs text-red-500 mb-2">
                    {auditorErrors.certifications}
                  </p>
                )}

                {certificationTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {certificationTags.map((cert) => (
                      <span
                        key={cert.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 rounded-full text-sm text-secondary"
                      >
                        <span>{cert.name}</span>
                        <button
                          onClick={() =>
                            setCertificationTags(
                              certificationTags.filter((c) => c.id !== cert.id),
                            )
                          }
                          className="hover:bg-zinc-200 rounded-full p-0.5 transition-colors"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M9 3L3 9M3 3L9 9"
                              stroke="#262626"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setShowCertificatesDropdown(!showCertificatesDropdown)
                  }
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 text-gray text-sm font-normal leading-[19.2px] tracking-normal appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTciIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxNyAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUuMjQ4NjEgNi4zNzQ3Nkw4LjUwNDM3IDkuNjMwNTFMMTEuNzYwMSA2LjM3NDc2TDEyLjc1NjggNy4zNzE0Mkw4LjUwNDM3IDExLjYyMzhMNC4yNTE5NSA3LjM3MTQyTDUuMjQ4NjEgNi4zNzQ3NloiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+Cg==')] bg-size-[17px_18px] bg-position-[right_1rem_center] bg-no-repeat pr-12 text-left flex items-center justify-between focus:ring-zinc-200"
                >
                  <span
                    className={
                      certificationTags.length > 0
                        ? "text-secondary"
                        : "text-gray"
                    }
                  >
                    {certificationTags.length > 0
                      ? `${certificationTags.length} certificat${certificationTags.length === 1 ? "e" : "es"} selected`
                      : "Select certifications"}
                  </span>
                </button>

                {showCertificatesDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div
                      ref={certificatesListRef}
                      onScroll={handleCertificatesScroll}
                      className="max-h-60 overflow-y-auto"
                    >
                      {isLoadingCertificates &&
                      availableCertificates.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray text-center">
                          Loading...
                        </div>
                      ) : availableCertificates.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray text-center">
                          No certificates found
                        </div>
                      ) : (
                        <>
                          {availableCertificates.map((cert) => {
                            const isSelected = certificationTags.some(
                              (c) => c.id === cert.id,
                            );
                            return (
                              <button
                                key={cert.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setCertificationTags(
                                      certificationTags.filter(
                                        (c) => c.id !== cert.id,
                                      ),
                                    );
                                  } else {
                                    setCertificationTags([
                                      ...certificationTags,
                                      { id: cert.id, name: cert.name },
                                    ]);
                                  }
                                  if (auditorErrors.certifications) {
                                    setAuditorErrors((prev) => ({
                                      ...prev,
                                      certifications: undefined,
                                    }));
                                  }
                                }}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 transition-colors flex items-center justify-between ${
                                  isSelected
                                    ? "bg-zinc-100 text-secondary font-medium"
                                    : "text-gray"
                                }`}
                              >
                                <span>{cert.name}</span>
                                {isSelected && (
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="text-secondary"
                                  >
                                    <path
                                      d="M13.3334 4L6.00002 11.3333L2.66669 8"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                          {isLoadingCertificates && (
                            <div className="px-4 py-2 text-sm text-gray text-center">
                              Loading more...
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-secondary">
                  Active Status
                </label>
                <button
                  onClick={() => setIsAuditorActive(!isAuditorActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isAuditorActive ? "bg-black" : "bg-zinc-400"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isAuditorActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setIsAddAuditorModalOpen(false);

                  setAuditorFirstName("");
                  setAuditorLastName("");
                  setAuditorEmail("");
                  setSelectedCountry("");
                  setSelectedState("");
                  setSelectedCity("");
                  setSearchCountry("");
                  setSearchState("");
                  setSearchCity("");
                  setShowCountryDropdown(false);
                  setShowStateDropdown(false);
                  setShowCityDropdown(false);
                  setCertificationTags([]);
                  setIsAuditorActive(false);
                  setShowCertificatesDropdown(false);
                  setAuditorErrors({});

                  setAvailableCertificates([]);
                  setCertificatesPagination({
                    pageIndex: 1,
                    pageSize: 20,
                    totalPages: 1,
                    total: 0,
                  });
                }}
                className="px-4 py-1 md:px-6 md:py-2 bg-white border border-zinc-300 rounded-lg text-sm md:text-base font-medium text-secondary hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <Button onClick={handleSaveAuditor} disabled={isSavingAuditor || !canWrite}>
                {isSavingAuditor ? "Saving..." : "Save Auditor"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isEditAuditorModalOpen && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsEditAuditorModalOpen(false);
              setEditAuditorFirstName("");
              setEditAuditorLastName("");
              setEditAuditorEmail("");
              setEditSelectedCountry("");
              setEditSelectedState("");
              setEditSelectedCity("");
              setEditSearchCountry("");
              setEditSearchState("");
              setEditSearchCity("");
              setEditShowCountryDropdown(false);
              setEditShowStateDropdown(false);
              setEditShowCityDropdown(false);
              setEditCertificationTags([]);
              setEditIsAuditorActive(false);
              setEditShowCertificatesDropdown(false);
              setEditAuditorErrors({});
              setEditingAuditorId(null);
              setOriginalAuditorValues(null);
            }}
          ></div>

          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-2xl mx-4 p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            {isSavingEditAuditor && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                <Loading isLoading size="sm" className="p-4" />
              </div>
            )}

            <div className="flex items-start justify-between mb-6">
              <h3 className="text-lg md:text-xl font-semibold text-secondary">
                Edit Auditor
              </h3>
              <button
                onClick={() => {
                  setIsEditAuditorModalOpen(false);
                  setEditAuditorFirstName("");
                  setEditAuditorLastName("");
                  setEditAuditorEmail("");
                  setEditSelectedCountry("");
                  setEditSelectedState("");
                  setEditSelectedCity("");
                  setEditSearchCountry("");
                  setEditSearchState("");
                  setEditSearchCity("");
                  setEditShowCountryDropdown(false);
                  setEditShowStateDropdown(false);
                  setEditShowCityDropdown(false);
                  setEditCertificationTags([]);
                  setEditIsAuditorActive(false);
                  setEditShowCertificatesDropdown(false);
                  setEditAuditorErrors({});
                  setEditingAuditorId(null);
                  setOriginalAuditorValues(null);
                }}
                className="ml-4 p-1 hover:bg-zinc-100 rounded transition-colors"
              >
                <img
                  src="/assets/imgs/admin/commons/cross.svg"
                  alt="Close"
                  className="w-5 h-5"
                />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editAuditorFirstName}
                    onChange={(e) => {
                      setEditAuditorFirstName(e.target.value);
                      if (editAuditorErrors.firstName) {
                        setEditAuditorErrors((prev) => ({
                          ...prev,
                          firstName: undefined,
                        }));
                      }
                    }}
                    placeholder="Enter first name"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                      editAuditorErrors.firstName
                        ? "border-red-500 focus:ring-red-200"
                        : "border-zinc-200 focus:ring-zinc-300 focus:border-transparent"
                    }`}
                  />
                  {editAuditorErrors.firstName && (
                    <p className="text-xs text-red-500 mt-1">
                      {editAuditorErrors.firstName}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editAuditorLastName}
                    onChange={(e) => {
                      setEditAuditorLastName(e.target.value);
                      if (editAuditorErrors.lastName) {
                        setEditAuditorErrors((prev) => ({
                          ...prev,
                          lastName: undefined,
                        }));
                      }
                    }}
                    placeholder="Enter last name"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                      editAuditorErrors.lastName
                        ? "border-red-500 focus:ring-red-200"
                        : "border-zinc-200 focus:ring-zinc-300 focus:border-transparent"
                    }`}
                  />
                  {editAuditorErrors.lastName && (
                    <p className="text-xs text-red-500 mt-1">
                      {editAuditorErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editAuditorEmail}
                  disabled
                  placeholder="Enter email address"
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-secondary placeholder:text-gray-400 bg-gray-100 cursor-not-allowed opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 country-state-city-dropdown">
                <div className="relative">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <div
                    onClick={async () => {
                      if (countries.length === 0) {
                        await loadCountries();
                      }
                      setEditShowCountryDropdown(!editShowCountryDropdown);
                      setEditShowStateDropdown(false);
                      setEditShowCityDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm cursor-pointer flex items-center justify-between ${
                      editAuditorErrors.country
                        ? "border-red-500"
                        : "border-zinc-200"
                    }`}
                  >
                    <span
                      className={
                        editSelectedCountry ? "text-secondary" : "text-gray-400"
                      }
                    >
                      {editSelectedCountry || "Select country"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                  {editAuditorErrors.country && (
                    <p className="text-xs text-red-500 mt-1">
                      {editAuditorErrors.country}
                    </p>
                  )}
                  {editShowCountryDropdown && (
                    <div className="absolute z-50 w-75 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg p-2 max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-zinc-100 flex items-center">
                        <Search className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                          type="text"
                          placeholder="Search..."
                          className="w-full text-sm outline-none"
                          value={editSearchCountry}
                          onChange={(e) => setEditSearchCountry(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {isLoadingCountries ? (
                          <div className="px-4 py-3 text-sm text-gray text-center">
                            Loading...
                          </div>
                        ) : (
                          countries
                            .filter((c) =>
                              c.name.common
                                .toLowerCase()
                                .includes(editSearchCountry.toLowerCase()),
                            )
                            .map((c) => (
                              <button
                                key={c.cca2}
                                type="button"
                                onClick={() => {
                                  setEditSelectedCountry(c.name.common);
                                  setEditSelectedState("");
                                  setEditSelectedCity("");
                                  setEditShowCountryDropdown(false);
                                  setEditSearchCountry("");
                                  if (editAuditorErrors.country) {
                                    setEditAuditorErrors((prev) => ({
                                      ...prev,
                                      country: undefined,
                                    }));
                                  }
                                }}
                                className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm hover:bg-zinc-50 text-secondary"
                              >
                                <span>{c.name.common}</span>
                              </button>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    State
                  </label>
                  <div
                    onClick={() => {
                      if (!editSelectedCountry) {
                        alert("Please select a country first");
                        return;
                      }
                      setEditShowStateDropdown(!editShowStateDropdown);
                      setEditShowCountryDropdown(false);
                      setEditShowCityDropdown(false);
                    }}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm cursor-pointer flex items-center justify-between"
                  >
                    <span
                      className={
                        editSelectedState ? "text-secondary" : "text-gray-400"
                      }
                    >
                      {editSelectedState || "Select state"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                  {editShowStateDropdown && editSelectedCountry && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg p-2 max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-zinc-100 flex items-center">
                        <Search className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                          type="text"
                          placeholder="Search..."
                          className="w-full text-sm outline-none"
                          value={editSearchState}
                          onChange={(e) => setEditSearchState(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {CSS.getStatesOfCountry(
                          countries.find(
                            (c) => c.name.common === editSelectedCountry,
                          )?.cca2 || "",
                        )
                          .filter((s) =>
                            s.name
                              .toLowerCase()
                              .includes(editSearchState.toLowerCase()),
                          )
                          .map((s) => (
                            <button
                              key={s.isoCode}
                              type="button"
                              onClick={() => {
                                setEditSelectedState(s.name);
                                setEditSelectedCity("");
                                setEditShowStateDropdown(false);
                                setEditSearchState("");
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 text-secondary"
                            >
                              {s.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    City
                  </label>
                  <div
                    onClick={() => {
                      if (!editSelectedState) {
                        alert("Please select a state first");
                        return;
                      }
                      setEditShowCityDropdown(!editShowCityDropdown);
                      setEditShowCountryDropdown(false);
                      setEditShowStateDropdown(false);
                    }}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm cursor-pointer flex items-center justify-between"
                  >
                    <span
                      className={
                        editSelectedCity ? "text-secondary" : "text-gray-400"
                      }
                    >
                      {editSelectedCity || "Select city"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                  {editShowCityDropdown && editSelectedState && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg p-2 max-h-60 overflow-hidden">
                      <div className="p-2 border-b border-zinc-100 flex items-center">
                        <Search className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                          type="text"
                          placeholder="Search..."
                          className="w-full text-sm outline-none"
                          value={editSearchCity}
                          onChange={(e) => setEditSearchCity(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {CSCity.getCitiesOfState(
                          countries.find(
                            (c) => c.name.common === editSelectedCountry,
                          )?.cca2 || "",
                          CSS.getStatesOfCountry(
                            countries.find(
                              (c) => c.name.common === editSelectedCountry,
                            )?.cca2 || "",
                          ).find((s) => s.name === editSelectedState)
                            ?.isoCode || "",
                        )
                          .filter((c) =>
                            c.name
                              .toLowerCase()
                              .includes(editSearchCity.toLowerCase()),
                          )
                          .map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => {
                                setEditSelectedCity(c.name);
                                setEditShowCityDropdown(false);
                                setEditSearchCity("");
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 text-secondary"
                            >
                              {c.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative" ref={editCertificatesDropdownRef}>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Certifications They Can Audit{" "}
                  <span className="text-red-500">*</span>
                </label>
                {editAuditorErrors.certifications && (
                  <p className="text-xs text-red-500 mb-2">
                    {editAuditorErrors.certifications}
                  </p>
                )}

                {editCertificationTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editCertificationTags.map((cert) => (
                      <span
                        key={cert.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 rounded-full text-sm text-secondary"
                      >
                        <span>{cert.name}</span>
                        <button
                          onClick={() =>
                            setEditCertificationTags(
                              editCertificationTags.filter(
                                (c) => c.id !== cert.id,
                              ),
                            )
                          }
                          className="hover:bg-zinc-200 rounded-full p-0.5 transition-colors"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M9 3L3 9M3 3L9 9"
                              stroke="#262626"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setEditShowCertificatesDropdown(
                      !editShowCertificatesDropdown,
                    )
                  }
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 text-gray text-sm font-normal leading-[19.2px] tracking-normal appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTciIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxNyAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUuMjQ4NjEgNi4zNzQ3Nkw4LjUwNDM3IDkuNjMwNTFMMTEuNzYwMSA2LjM3NDc2TDEyLjc1NjggNy4zNzE0Mkw4LjUwNDM3IDExLjYyMzhMNC4yNTE5NSA3LjM3MTQyTDUuMjQ4NjEgNi4zNzQ3NloiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+Cg==')] bg-size-[17px_18px] bg-position-[right_1rem_center] bg-no-repeat pr-12 text-left flex items-center justify-between focus:ring-zinc-200"
                >
                  <span
                    className={
                      editCertificationTags.length > 0
                        ? "text-secondary"
                        : "text-gray"
                    }
                  >
                    {editCertificationTags.length > 0
                      ? `${editCertificationTags.length} certificat${editCertificationTags.length === 1 ? "e" : "es"} selected`
                      : "Select certifications"}
                  </span>
                </button>

                {editShowCertificatesDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div
                      ref={editCertificatesListRef}
                      onScroll={handleCertificatesScroll}
                      className="max-h-60 overflow-y-auto"
                    >
                      {isLoadingCertificates &&
                      availableCertificates.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray text-center">
                          Loading...
                        </div>
                      ) : availableCertificates.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray text-center">
                          No certificates found
                        </div>
                      ) : (
                        <>
                          {availableCertificates.map((cert) => {
                            const isSelected = editCertificationTags.some(
                              (c) => c.id === cert.id,
                            );
                            return (
                              <button
                                key={cert.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setEditCertificationTags(
                                      editCertificationTags.filter(
                                        (c) => c.id !== cert.id,
                                      ),
                                    );
                                  } else {
                                    setEditCertificationTags([
                                      ...editCertificationTags,
                                      { id: cert.id, name: cert.name },
                                    ]);
                                  }
                                  if (editAuditorErrors.certifications) {
                                    setEditAuditorErrors((prev) => ({
                                      ...prev,
                                      certifications: undefined,
                                    }));
                                  }
                                }}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 transition-colors flex items-center justify-between ${
                                  isSelected
                                    ? "bg-zinc-100 text-secondary font-medium"
                                    : "text-gray"
                                }`}
                              >
                                <span>{cert.name}</span>
                                {isSelected && (
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="text-secondary"
                                  >
                                    <path
                                      d="M13.3334 4L6.00002 11.3333L2.66669 8"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                          {isLoadingCertificates && (
                            <div className="px-4 py-2 text-sm text-gray text-center">
                              Loading more...
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-secondary">
                  Active Status
                </label>
                <button
                  onClick={() => setEditIsAuditorActive(!editIsAuditorActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editIsAuditorActive ? "bg-black" : "bg-zinc-400"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editIsAuditorActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setIsEditAuditorModalOpen(false);
                  setEditAuditorFirstName("");
                  setEditAuditorLastName("");
                  setEditAuditorEmail("");
                  setEditSelectedCountry("");
                  setEditSelectedState("");
                  setEditSelectedCity("");
                  setEditSearchCountry("");
                  setEditSearchState("");
                  setEditSearchCity("");
                  setEditShowCountryDropdown(false);
                  setEditShowStateDropdown(false);
                  setEditShowCityDropdown(false);
                  setEditCertificationTags([]);
                  setEditIsAuditorActive(false);
                  setEditShowCertificatesDropdown(false);
                  setEditAuditorErrors({});
                  setEditingAuditorId(null);
                  setOriginalAuditorValues(null);
                }}
                className="px-4 py-1 md:px-6 md:py-2 bg-white border border-zinc-300 rounded-lg text-sm md:text-base font-medium text-secondary hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <Button
                onClick={handleSaveEditAuditor}
                disabled={isSavingEditAuditor || !canEdit}
              >
                {isSavingEditAuditor ? "Saving..." : "Update Auditor"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isViewDetailsModalOpen && selectedReviewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsViewDetailsModalOpen(false)}
          ></div>

          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-2xl mx-4 p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-semibold text-secondary">
                Details
              </h3>
              <button
                onClick={() => setIsViewDetailsModalOpen(false)}
                className="ml-4 p-1 hover:bg-zinc-100 rounded transition-colors shrink-0"
              >
                <img
                  src="/assets/imgs/admin/commons/cross.svg"
                  alt="Close"
                  className="w-5 h-5"
                />
              </button>
            </div>

            <div className="mb-6 border border-zinc-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="text-lg md:text-xl font-semibold text-secondary">
                    {selectedReviewer.name}
                  </h4>
                  <p className="text-sm md:text-base text-gray mb-3">
                    {selectedReviewer.email}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedReviewer.expertise.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm text-secondary"
                        style={{ backgroundColor: "#2626261A" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center justify-center px-4 md:px-6 py-1 rounded-md text-sm font-medium border ${
                      selectedReviewer.accountStatus === "Active"
                        ? "bg-green-50 text-green-600 border-green-300"
                        : "bg-red-50 text-red-600 border-red-300"
                    }`}
                  >
                    {selectedReviewer.accountStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 border border-zinc-200 rounded-lg p-4">
              <h4 className="text-lg md:text-xl font-semibold text-secondary mb-4">
                Assigned Tasks
              </h4>
              <div className="space-y-3">
                {selectedReviewer.tasks && selectedReviewer.tasks.length > 0 ? (
                  selectedReviewer.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white border border-zinc-200 rounded-lg p-4"
                    >
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500 mb-1">
                            Organization:
                          </span>
                          <span className="text-sm font-semibold text-secondary">
                            {task.organisation}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500 mb-1">
                            Certification:
                          </span>
                          <span className="text-sm font-semibold text-secondary">
                            {task.certification}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500 mb-1">
                            Type:
                          </span>
                          <span
                            className="inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium text-white border w-fit"
                            style={{
                              backgroundColor: "#262626",
                              borderColor: "#262626",
                            }}
                          >
                            {task.type}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500 mb-1">
                            Due Date:
                          </span>
                          <span className="text-sm font-semibold text-secondary">
                            {task.dueDate}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500 mb-1">
                            Status:
                          </span>
                          <span
                            className="inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium border w-fit"
                            style={{
                              backgroundColor: "#FEF3C7",
                              color: "#F59E0B",
                              borderColor: "#F59E0B",
                            }}
                          >
                            {task.status}
                          </span>
                        </div>
                        <div className="flex flex-col"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray text-sm">
                    No assigned tasks
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isViewAuditorDetailsModalOpen && selectedAuditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsViewAuditorDetailsModalOpen(false)}
          ></div>

          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-2xl mx-4 p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-semibold text-secondary">
                Details
              </h3>
              <button
                onClick={() => setIsViewAuditorDetailsModalOpen(false)}
                className="ml-4 p-1 hover:bg-zinc-100 rounded transition-colors shrink-0"
              >
                <img
                  src="/assets/imgs/admin/commons/cross.svg"
                  alt="Close"
                  className="w-5 h-5"
                />
              </button>
            </div>

            <div className="mb-6 border border-zinc-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="text-lg md:text-xl font-semibold text-secondary">
                    {selectedAuditor.name}
                  </h4>
                  <p className="text-sm md:text-base text-gray mb-3">
                    {selectedAuditor.email}
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12.6668 5.99967C12.6668 5.38684 12.5461 4.78 12.3116 4.21382C12.0771 3.64763 11.7333 3.13318 11.3 2.69984C10.8667 2.2665 10.3522 1.92276 9.78602 1.68824C9.21983 1.45371 8.613 1.33301 8.00016 1.33301C7.38733 1.33301 6.78049 1.45371 6.21431 1.68824C5.64812 1.92276 5.13367 2.2665 4.70033 2.69984C4.26699 3.13318 3.92325 3.64763 3.68872 4.21382C3.4542 4.78 3.3335 5.38684 3.3335 5.99967C3.3335 6.92434 3.60616 7.78434 4.07016 8.50967H4.06483L8.00016 14.6663L11.9355 8.50967H11.9308C12.4114 7.76074 12.6669 6.88956 12.6668 5.99967ZM8.00016 7.99967C7.46973 7.99967 6.96102 7.78896 6.58595 7.41389C6.21088 7.03882 6.00016 6.53011 6.00016 5.99967C6.00016 5.46924 6.21088 4.96053 6.58595 4.58546C6.96102 4.21039 7.46973 3.99967 8.00016 3.99967C8.5306 3.99967 9.0393 4.21039 9.41438 4.58546C9.78945 4.96053 10.0002 5.46924 10.0002 5.99967C10.0002 6.53011 9.78945 7.03882 9.41438 7.41389C9.0393 7.78896 8.5306 7.99967 8.00016 7.99967Z"
                        fill="#999999"
                      />
                    </svg>
                    <span className="text-sm md:text-base text-gray">
                      {selectedAuditor.country} {selectedAuditor.organization}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedAuditor.certifications.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm text-secondary"
                        style={{ backgroundColor: "#2626261A" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center justify-center px-4 md:px-6 py-1 rounded-md text-sm font-medium border ${
                      selectedAuditor.accountStatus === "Active"
                        ? "bg-green-50 text-green-600 border-green-300"
                        : "bg-red-50 text-red-600 border-red-300"
                    }`}
                  >
                    {selectedAuditor.accountStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 border border-zinc-200 rounded-lg p-4">
              <h4 className="text-lg md:text-xl font-semibold text-secondary mb-4">
                Assigned Audits
              </h4>
              <div className="space-y-3">
                {selectedAuditor.tasks && selectedAuditor.tasks.length > 0 ? (
                  selectedAuditor.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white border border-zinc-200 rounded-lg p-4"
                    >
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500 mb-1">
                            Organization:
                          </span>
                          <span className="text-sm font-semibold text-secondary">
                            {task.organisation}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500 mb-1">
                            Certification:
                          </span>
                          <span className="text-sm font-semibold text-secondary">
                            {task.certification}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500 mb-1">
                            Type:
                          </span>
                          <span
                            className="inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium text-white border w-fit"
                            style={{
                              backgroundColor: "#262626",
                              borderColor: "#262626",
                            }}
                          >
                            {task.type}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500 mb-1">
                            Due Date:
                          </span>
                          <span className="text-sm font-semibold text-secondary">
                            {task.dueDate}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500 mb-1">
                            Status:
                          </span>
                          <span
                            className="inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium border w-fit"
                            style={{
                              backgroundColor: "#FEF3C7",
                              color: "#F59E0B",
                              borderColor: "#F59E0B",
                            }}
                          >
                            {task.status}
                          </span>
                        </div>
                        <div className="flex flex-col"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray text-sm">
                    No assigned audits
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
