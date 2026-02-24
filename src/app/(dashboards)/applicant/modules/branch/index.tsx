"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui";
import { axiosInstance } from "@/lib/axios";
import { LoadingScreen } from "../../common/loading-screen";
import { FaStar, FaExclamation } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { MdKeyboardArrowDown } from "react-icons/md";
import { FiSearch } from "react-icons/fi";
import {
  Country as CSC,
  State as CSS,
  City as CSCity,
} from "country-state-city";

type Branch = {
  id: string;
  name: string;
  address?: string;
  country: string;
  city: string;
  state?: string;
  postalCode?: string;
  contactNo?: string;
  email?: string;
  size: string;
  status: "Active";
  isMain: boolean;
  createdAt: number;
};

type BranchFormValues = {
  name: string;
  isMain: boolean;
  address: string;
  country: string;
  city: string;
  state: string;
  postalCode: string;
  contactNo: string;
  email: string;
  size: string;
};

type ApiBranch = {
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  contact_no?: string;
  email?: string;
  branch_size?: string;
  is_main?: boolean;
  created_at?: string | number;
};

type ApiCertificate = {
  id: string;
  certificate_id: string;
  name: string;
  description: string;
  disclosure_price: string;
  assured_price: string;
  industry_names: string[] | null;
};

const emptyBranchValues: BranchFormValues = {
  name: "",
  isMain: false,
  address: "",
  country: "",
  city: "",
  state: "",
  postalCode: "",
  contactNo: "",
  email: "",
  size: "",
};

const branchValidationSchema = Yup.object({
  name: Yup.string()
    .max(15, "Branch name cannot exceed 15 characters")
    .required("Branch name is required"),
  address: Yup.string().required("Address is required"),
  country: Yup.string().required("Country is required"),
  city: Yup.string().required("City is required"),
  state: Yup.string().required("State/Region is required"),
  postalCode: Yup.string().required("Postal code is required"),
  contactNo: Yup.string().required("Contact number is required"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  size: Yup.string().required("Branch size is required"),
  isMain: Yup.boolean(),
});

export function BranchPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [certificates, setCertificates] = useState<ApiCertificate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [branchBeingEdited, setBranchBeingEdited] = useState<Branch | null>(
    null,
  );
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isMainBranchConfirmOpen, setIsMainBranchConfirmOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  const [isBranchesLoading, setIsBranchesLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const canWriteBranch = useMemo(() => {
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
          p.resource === "branch" &&
          actions.some((a) => a.toLowerCase() === "write")
        );
      });
    } catch {
      return true;
    }
  }, []);

  const [countries, setCountries] = useState<
    {
      name: string;
      flag: string;
      isoCode: string;
    }[]
  >([]);
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [isCountriesLoading, setIsCountriesLoading] = useState(false);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [isStatesLoading, setIsStatesLoading] = useState(false);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const isAnyModalOpen =
      isModalOpen || isDeleteOpen || isMainBranchConfirmOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen, isDeleteOpen, isMainBranchConfirmOpen]);

  const BRANCH_STORAGE_KEY = "applicant-branches";

  const hasMainBranch = useMemo(
    () => branches.some((branch) => branch.isMain),
    [branches],
  );

  const mainBranchId = useMemo(
    () => branches.find((branch) => branch.isMain)?.id ?? null,
    [branches],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(BRANCH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Branch[];
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((branch, index) => {
            const safeName = branch.name || "Branch";
            const id =
              branch.id && branch.id !== ""
                ? `${branch.id}`
                : `${safeName}-local-${index}-${Date.now()}`;
            return { ...branch, id };
          });
          setBranches(normalized);
        }
      }
    } catch (error) {
      console.error("Failed to load branches from storage", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(branches));
    } catch (error) {
      console.error("Failed to save branches to storage", error);
    }
  }, [branches]);

  const initBranchPage = async () => {
    try {
      setIsBranchesLoading(true);
      setLoadingProgress(10);

      setLoadingProgress(30);

      const response = await axiosInstance.get<
        ApiBranch | ApiBranch[] | { data?: unknown; branches?: unknown }
      >("/branches/list");

      setLoadingProgress(70);

      const raw = response.data as any;
      let list: ApiBranch[] = [];
      if (Array.isArray(raw)) {
        list = raw as ApiBranch[];
      } else if (Array.isArray(raw?.data)) {
        list = raw.data as ApiBranch[];
      } else if (Array.isArray(raw?.branches)) {
        list = raw.branches as ApiBranch[];
      } else if (Array.isArray(raw?.data?.branches)) {
        list = raw.data.branches as ApiBranch[];
      }

      if (Array.isArray(list) && list.length > 0) {
        const mapped: Branch[] = list.map((b, index) => {
          const safeName = b.name || (b as any).branch_name || "Branch";
          const id =
            b.id ||
            (b as any).branch_id ||
            (b as any)._id ||
            (b as any).uuid ||
            `temp-${index}-${Date.now()}`;

          return {
            id: String(id),
            name: safeName,
            address: b.address || (b as any).branch_address || "",
            city: b.city || "",
            state: b.state || "",
            country: b.country || "",
            postalCode: b.postal_code || "",
            contactNo: b.contact_no || "",
            email: b.email || "",
            size: (b as any).branch_size || "",
            status: "Active",
            isMain: !!b.is_main,
            createdAt: b.created_at
              ? typeof b.created_at === "number"
                ? b.created_at
                : new Date(b.created_at).getTime()
              : Date.now(),
          };
        });
        setBranches(mapped);
      } else {
        setBranches([]);
      }
      setLoadingProgress(100);
      setTimeout(() => setIsBranchesLoading(false), 500);
    } catch (error) {
      console.error("Failed to fetch branches from API", error);
      setIsBranchesLoading(false);
    }
  };

  const fetchCertificates = async () => {
    try {
      const response = await axiosInstance.get("/certificates");
      const rawData = response?.data as any;
      let items: ApiCertificate[] = [];

      if (Array.isArray(rawData)) {
        items = rawData;
      } else if (Array.isArray(rawData?.data)) {
        items = rawData.data;
      } else if (Array.isArray(rawData?.data?.data)) {
        items = rawData.data.data;
      } else if (Array.isArray(rawData?.certificates)) {
        items = rawData.certificates;
      }

      setCertificates(items);
    } catch (error) {
      console.error("Failed to fetch certificates", error);
    }
  };

  useEffect(() => {
    const orgId =
      typeof window !== "undefined"
        ? localStorage.getItem("organization_id")
        : null;

    if (orgId && orgId !== "undefined") {
      initBranchPage();
      fetchCertificates();
    } else {
      const handleProfileUpdate = () => {
        initBranchPage();
        fetchCertificates();
      };
      window.addEventListener("profile-updated", handleProfileUpdate);
      return () =>
        window.removeEventListener("profile-updated", handleProfileUpdate);
    }
  }, []);

  useEffect(() => {
    const loadCountries = () => {
      try {
        setIsCountriesLoading(true);
        const allCSCCountries = CSC.getAllCountries();
        const mapped = allCSCCountries
          .map((country) => ({
            name: country.name,
            isoCode: country.isoCode,
            flag: `https://flagcdn.com/${country.isoCode.toLowerCase()}.svg`,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountries(mapped);
      } catch (error) {
        console.error("Failed to load countries", error);
      } finally {
        setIsCountriesLoading(false);
      }
    };

    loadCountries();
  }, []);

  const fetchCitiesForCountry = (countryName: string): string[] => {
    if (!countryName) return [];
    try {
      setIsCitiesLoading(true);
      const country = CSC.getAllCountries().find((c) => c.name === countryName);
      if (!country) return [];

      const cityList = CSCity.getCitiesOfCountry(country.isoCode) || [];
      const names = Array.from(new Set(cityList.map((c) => c.name))).sort();
      setCities(names);
      return names;
    } catch (error) {
      console.error("Failed to load cities", error);
      setCities([]);
      return [];
    } finally {
      setIsCitiesLoading(false);
    }
  };

  const fetchStatesForCountry = (countryName: string): string[] => {
    if (!countryName) return [];
    try {
      setIsStatesLoading(true);
      const country = CSC.getAllCountries().find((c) => c.name === countryName);
      if (!country) return [];

      const stateList = CSS.getStatesOfCountry(country.isoCode) || [];
      const names = stateList.map((s) => s.name).sort();
      setStates(names);
      return names;
    } catch (error) {
      console.error("Failed to load states", error);
      setStates([]);
      return [];
    } finally {
      setIsStatesLoading(false);
    }
  };

  const handleSelectCountry = (countryName: string) => {
    formik.setFieldValue("country", countryName);
    formik.setFieldTouched("country", true, false);
    formik.setFieldError("country", undefined);
    formik.setFieldValue("state", "");
    formik.setFieldValue("city", "");
    setCountrySearch("");
    setCitySearch("");
    setStateSearch("");
    setIsCountryOpen(false);

    const cityList = fetchCitiesForCountry(countryName);
    fetchStatesForCountry(countryName);

    if (!cityList.length) {
      setCountries((prev) =>
        prev.filter((country) => country.name !== countryName),
      );
      formik.setFieldValue("country", "");
      formik.setFieldError(
        "country",
        "Selected country has no cities. Please choose another.",
      );
    }
  };

  const sortedBranches = useMemo(() => {
    return [...branches].sort((a, b) => {
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      return a.createdAt - b.createdAt;
    });
  }, [branches]);

  const sortedAndFilteredBranches = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return sortedBranches;

    return sortedBranches.filter((branch) => {
      const composite =
        `${branch.name} ${branch.city} ${branch.country}`.toLowerCase();
      return composite.includes(normalized);
    });
  }, [sortedBranches, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedAndFilteredBranches.length / PAGE_SIZE) || 1,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedBranches = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return sortedAndFilteredBranches.slice(start, end);
  }, [sortedAndFilteredBranches, currentPage, PAGE_SIZE]);

  const liveSearchResults = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return [] as Branch[];

    return sortedBranches
      .filter((branch) => {
        const composite =
          `${branch.name} ${branch.city} ${branch.country}`.toLowerCase();
        return composite.includes(normalized);
      })
      .slice(0, 8);
  }, [sortedBranches, searchTerm]);

  const scrollToBranch = (branchId: string) => {
    if (typeof window === "undefined") return;

    setTimeout(() => {
      const element = document.querySelector<HTMLElement>(
        `[data-branch-id="${branchId}"]`,
      );
      if (!element) return;

      try {
        (element as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } catch {}

      const originalTransition = element.style.transition;
      const originalBoxShadow = element.style.boxShadow;
      const originalBackground = element.style.backgroundColor;

      element.style.transition =
        "box-shadow 0.3s ease, background-color 0.3s ease";
      element.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.9)";
      element.style.backgroundColor = "rgba(254,249,195,1)";

      setTimeout(() => {
        element.style.boxShadow = originalBoxShadow;
        element.style.backgroundColor = originalBackground;
        element.style.transition = originalTransition;
      }, 1000);
    }, 200);
  };

  const handleSearchResultClick = (branch: Branch) => {
    if (!branch) return;
    const index = sortedBranches.findIndex((b) => b.id === branch.id);
    const targetPage = index === -1 ? 1 : Math.floor(index / PAGE_SIZE) + 1;

    setSearchTerm("");
    setCurrentPage(targetPage);
    setIsSearchOpen(false);
    scrollToBranch(branch.id);
  };

  const formik = useFormik<BranchFormValues>({
    initialValues: emptyBranchValues,
    validationSchema: branchValidationSchema,
    onSubmit: async (values, { resetForm, setSubmitting, setFieldError }) => {
      const normalizedName = values.name.trim().toLowerCase();
      const hasDuplicate = branches.some((branch) => {
        const branchName = branch.name.trim().toLowerCase();
        if (branchBeingEdited && branch.id === branchBeingEdited.id) {
          return false;
        }
        return branchName === normalizedName;
      });

      if (hasDuplicate) {
        setFieldError("name", "Branch with this name already exists");
        setSubmitting(false);
        return;
      }

      const effectiveIsMain = values.isMain;

      try {
        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("aces_access_token") ||
              window.localStorage.getItem("access_token")
            : null;

        if (branchBeingEdited) {
          const wasMain = branchBeingEdited.isMain;
          const wantsMain = values.isMain;
          const rawId = String(branchBeingEdited.id);
          const apiId = rawId.length > 36 ? rawId.slice(0, 36) : rawId;

          try {
            const payload = {
              name: values.name,
              address: values.address,
              city: values.city,
              state: values.state,
              country: values.country,
              postal_code: values.postalCode,
              contact_no: values.contactNo,
              email: values.email,
              branch_size: values.size,
            };

            const response = await axiosInstance.put<ApiBranch>(
              `/branches/${apiId}`,
              payload,
              {
                headers: token
                  ? { Authorization: `Bearer ${token}` }
                  : undefined,
              },
            );

            const bRaw = response.data as any;
            const b = bRaw?.data || bRaw;
            const updatedBranch: Branch = {
              id: String(b.id || (b as any).branch_id || branchBeingEdited.id),
              name: b.name || values.name,
              address: b.address || values.address,
              city: b.city || values.city,
              state: b.state || values.state,
              country: b.country || values.country,
              postalCode: b.postal_code || values.postalCode,
              contactNo: b.contact_no || values.contactNo,
              email: b.email || values.email,
              size: values.size,
              status: "Active",
              isMain: wasMain,
              createdAt: b.created_at
                ? typeof b.created_at === "number"
                  ? b.created_at
                  : new Date(b.created_at).getTime()
                : branchBeingEdited.createdAt,
            };

            setBranches((prev) =>
              prev.map((branch) =>
                branch.id === branchBeingEdited.id ? updatedBranch : branch,
              ),
            );

            if (!wasMain && wantsMain) {
              try {
                const oldMain = branches.find(
                  (b) => b.isMain && b.id !== branchBeingEdited.id,
                );
                if (oldMain) {
                  const rawOldId = String(oldMain.id);
                  const oldApiId =
                    rawOldId.length > 36 ? rawOldId.slice(0, 36) : rawOldId;

                  await axiosInstance.put(
                    `/branches/${oldApiId}`,
                    {
                      name: oldMain.name,
                      address: oldMain.address,
                      city: oldMain.city,
                      state: oldMain.state,
                      country: oldMain.country,
                      postal_code: oldMain.postalCode,
                      contact_no: oldMain.contactNo,
                      email: oldMain.email,
                      branch_size: oldMain.size,
                    },
                    {
                      headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : undefined,
                    },
                  );
                }

                if (apiId && apiId.length >= 20) {
                  await axiosInstance.put(
                    `/branches/${apiId}/set-main`,
                    undefined,
                    {
                      headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : undefined,
                    },
                  );
                } else {
                  console.warn("Skipping set-main call: invalid apiId", apiId);
                }

                setBranches((prev) =>
                  prev.map((branch) => ({
                    ...branch,
                    isMain: branch.id === updatedBranch.id,
                  })),
                );
              } catch (error) {
                console.error(
                  "Failed to update main branch status via API",
                  error,
                );
              }
            }
          } catch (error) {
            console.error("Failed to update branch via API", error);
            setBranches((prev) =>
              prev.map((branch) =>
                branch.id === branchBeingEdited.id
                  ? {
                      ...branch,
                      ...values,
                      isMain: wasMain,
                    }
                  : branch,
              ),
            );
          }
        } else {
          try {
            const payload = {
              name: values.name,
              address: values.address,
              city: values.city,
              state: values.state,
              country: values.country,
              postal_code: values.postalCode,
              contact_no: values.contactNo,
              email: values.email,
              branch_size: values.size,
              is_main: effectiveIsMain,
            };

            const response = await axiosInstance.post<ApiBranch>(
              "/branches",
              payload,
              {
                headers: token
                  ? { Authorization: `Bearer ${token}` }
                  : undefined,
              },
            );

            const bRaw = response.data as any;
            const b = bRaw?.data || bRaw;
            const id = String(
              b.id || (b as any).branch_id || (b as any)._id || "",
            );
            const createdBranch: Branch = {
              id,
              name: b.name || values.name,
              address: b.address || values.address,
              city: b.city || values.city,
              state: b.state || values.state,
              country: b.country || values.country,
              postalCode: b.postal_code || values.postalCode,
              contactNo: b.contact_no || values.contactNo,
              email: b.email || values.email,
              size: values.size,
              status: "Active",
              isMain:
                typeof b.is_main === "boolean" ? b.is_main : effectiveIsMain,
              createdAt: Date.now(),
            };

            if (effectiveIsMain) {
              try {
                const apiId = id.length > 36 ? id.slice(0, 36) : id;
                const oldMain = branches.find((b) => b.isMain);
                if (oldMain) {
                  const rawOldId = String(oldMain.id);
                  const oldApiId =
                    rawOldId.length > 36 ? rawOldId.slice(0, 36) : rawOldId;

                  await axiosInstance.put(
                    `/branches/${oldApiId}`,
                    {
                      name: oldMain.name,
                      address: oldMain.address,
                      city: oldMain.city,
                      state: oldMain.state,
                      country: oldMain.country,
                      postal_code: oldMain.postalCode,
                      contact_no: oldMain.contactNo,
                      email: oldMain.email,
                      branch_size: oldMain.size,
                    },
                    {
                      headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : undefined,
                    },
                  );
                }

                if (apiId && apiId.length >= 20) {
                  await axiosInstance.put(
                    `/branches/${apiId}/set-main`,
                    undefined,
                    {
                      headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : undefined,
                    },
                  );
                } else {
                  console.warn("Skipping set-main call: invalid apiId", apiId);
                }
              } catch (error) {
                console.error("Failed to change main branch via API", error);
              }

              setBranches((prev) => {
                const demoted = prev.map((branch) => ({
                  ...branch,
                  isMain: false,
                }));
                return [...demoted, { ...createdBranch, isMain: true }];
              });
            } else {
              setBranches((prev) => [...prev, createdBranch]);
            }
          } catch (error) {
            console.error("Failed to create branch via API", error);
            const fallbackBranch: Branch = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: values.name,
              address: values.address,
              city: values.city,
              state: values.state,
              country: values.country,
              postalCode: values.postalCode,
              contactNo: values.contactNo,
              email: values.email,
              size: values.size,
              status: "Active",
              isMain: effectiveIsMain,
              createdAt: Date.now(),
            };

            setBranches((prev) => {
              if (effectiveIsMain) {
                const demoted = prev.map((branch) => ({
                  ...branch,
                  isMain: false,
                }));
                return [...demoted, fallbackBranch];
              }
              return [...prev, fallbackBranch];
            });
          }
        }
      } finally {
        setSubmitting(false);
        resetForm({ values: emptyBranchValues });
        setBranchBeingEdited(null);
        setIsModalOpen(false);
      }
    },
  });

  const openCreateModal = () => {
    setBranchBeingEdited(null);
    formik.resetForm({ values: emptyBranchValues });
    setIsModalOpen(true);
    setCities([]);
    setIsCountryOpen(false);
    setIsCityOpen(false);
    setIsSizeOpen(false);
  };

  const openEditModal = (branch: Branch) => {
    setIsModalOpen(true);
    setBranchBeingEdited(branch);

    formik.resetForm({
      values: {
        name: branch.name,
        address: branch.address || "",
        country: branch.country,
        city: branch.city,
        state: branch.state || "",
        postalCode: branch.postalCode || "",
        contactNo: branch.contactNo || "",
        email: branch.email || "",
        size: branch.size,
        isMain: branch.isMain,
      },
    });

    (async () => {
      try {
        const rawId = String(branch.id);
        const apiId = rawId.length > 36 ? rawId.slice(0, 36) : rawId;

        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("access_token")
            : null;

        const response = await axiosInstance.get<{
          message?: string;
          data?: ApiBranch;
        }>(`/branches/${apiId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const b = response.data?.data;
        if (!b) return;

        const updatedBranch: Branch = {
          id: String(b.id || (b as any).branch_id || (branch as any).id),
          name: b.name || branch.name,
          address: b.address || branch.address || "",
          city: b.city || branch.city || "",
          state: b.state || branch.state || "",
          country: b.country || branch.country || "",
          postalCode: b.postal_code || branch.postalCode || "",
          contactNo: b.contact_no || branch.contactNo || "",
          email: b.email || branch.email || "",
          size: branch.size,
          status: "Active",
          isMain: !!b.is_main,
          createdAt: b.created_at
            ? typeof b.created_at === "number"
              ? b.created_at
              : new Date(b.created_at).getTime()
            : branch.createdAt,
        };

        setBranches((prev) =>
          prev.map((item) => (item.id === branch.id ? updatedBranch : item)),
        );
        setBranchBeingEdited(updatedBranch);

        formik.resetForm({
          values: {
            name: updatedBranch.name,
            address: updatedBranch.address || "",
            country: updatedBranch.country,
            city: updatedBranch.city,
            state: updatedBranch.state || "",
            postalCode: updatedBranch.postalCode || "",
            contactNo: updatedBranch.contactNo || "",
            email: updatedBranch.email || "",
            size: updatedBranch.size,
            isMain: updatedBranch.isMain,
          },
        });

        if (updatedBranch.country) {
          fetchCitiesForCountry(updatedBranch.country);
        }
      } catch (error) {
        console.error("Failed to fetch branch details", error);
      }
    })();
  };

  const handleRequestCloseModal = () => {
    formik.resetForm({ values: emptyBranchValues });
    setBranchBeingEdited(null);
    setIsModalOpen(false);
    setCities([]);
    setIsCountryOpen(false);
    setIsCityOpen(false);
    setIsSizeOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!branchToDelete) return;
    const rawId = String(branchToDelete.id);
    const apiId = rawId.length > 36 ? rawId.slice(0, 36) : rawId;

    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("access_token")
          : null;

      if (apiId && apiId.length >= 20) {
        await axiosInstance.delete(`/branches/${apiId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      } else {
        console.warn("Skipping delete call: invalid apiId", apiId);
      }
    } catch (error) {
      console.error("Failed to delete branch via API", error);
    }

    setBranches((prev) =>
      prev.filter((branch) => branch.id !== branchToDelete.id),
    );
    setBranchToDelete(null);
    setIsDeleteOpen(false);
  };

  const handleConfirmMainBranchChange = async () => {
    setIsMainBranchConfirmOpen(false);
    formik.setFieldValue("isMain", true);
  };

  const isEditingMainBranch =
    !!branchBeingEdited &&
    branchBeingEdited.isMain &&
    branchBeingEdited.id === mainBranchId;

  const shouldShowMainToggle = !isEditingMainBranch;

  const hasAnyBranches = branches.length > 0;
  const hasVisibleBranches = sortedAndFilteredBranches.length > 0;
  const isStateDisabled = !formik.values.country;
  const isCityDisabled =
    !formik.values.country ||
    !formik.values.state ||
    isCitiesLoading ||
    cities.length === 0;

  return (
    <div className="px-4 py-8 lg:pt-3 w-full bg-zinc-50 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 md:space-y-8"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-secondary">
                Organization Branches
              </h1>
              <p className="text-base font-medium text-gray max-w-xl">
                Manage your organization&apos;s branches for certifications and
                audits.
              </p>
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-3 md:w-auto md:flex-nowrap md:gap-4">
              {hasAnyBranches && (
                <>
                  <div className="w-full md:hidden">
                    <div className="relative h-10 flex w-full items-center rounded-lg border border-light-gray-2 bg-primary shadow-sm">
                      <FiSearch className="ml-2 h-4 w-4 text-gray" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Search branches"
                        className="ml-2 h-full flex-1 bg-transparent text-sm text-secondary placeholder:text-gray/60 focus:outline-none"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm("");
                            setCurrentPage(1);
                          }}
                          className="mr-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray hover:bg-light-gray"
                        >
                          <RxCross2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <AnimatePresence>
                        {searchTerm.trim() && liveSearchResults.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            className="absolute left-0 right-0 top-full mt-1 z-20 max-h-64 overflow-y-auto rounded-xl border border-light-gray-2 bg-primary shadow-[0_10px_30px_rgba(0,0,0,0.14)]"
                          >
                            {liveSearchResults.map((branch) => (
                              <button
                                key={branch.id}
                                type="button"
                                onClick={() => handleSearchResultClick(branch)}
                                className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left text-sm hover:bg-light-gray/70"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-secondary">
                                    {branch.name}
                                  </span>
                                  <span className="text-[11px] text-gray">
                                    {branch.city}, {branch.country}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="hidden md:block">
                    <AnimatePresence initial={false}>
                      {isSearchOpen ? (
                        <motion.div
                          key="search-open"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.18, ease: "easeInOut" }}
                          className="relative h-10 flex w-full max-w-xs items-center rounded-lg border border-light-gray-2 bg-primary shadow-sm"
                        >
                          <FiSearch className="ml-2 h-4 w-4 text-gray" />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setCurrentPage(1);
                            }}
                            placeholder="Search branches"
                            className="ml-2 h-full flex-1 bg-transparent text-sm md:text-base text-secondary placeholder:text-gray/60 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchTerm("");
                              setCurrentPage(1);
                            }}
                            className="mr-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray hover:bg-light-gray"
                          >
                            <RxCross2 className="h-3.5 w-3.5" />
                          </button>

                          <AnimatePresence>
                            {searchTerm.trim() &&
                              liveSearchResults.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 6 }}
                                  transition={{
                                    duration: 0.16,
                                    ease: "easeOut",
                                  }}
                                  className="absolute left-0 right-0 top-full mt-1 z-20 max-h-64 overflow-y-auto rounded-xl border border-light-gray-2 bg-primary shadow-[0_10px_30px_rgba(0,0,0,0.14)]"
                                >
                                  {liveSearchResults.map((branch) => (
                                    <button
                                      key={branch.id}
                                      type="button"
                                      onClick={() =>
                                        handleSearchResultClick(branch)
                                      }
                                      className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left text-sm hover:bg-light-gray/70"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium text-secondary">
                                          {branch.name}
                                        </span>
                                        <span className="text-[11px] text-gray">
                                          {branch.city}, {branch.country}
                                        </span>
                                      </div>
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                          </AnimatePresence>
                        </motion.div>
                      ) : (
                        <motion.button
                          key="search-closed"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          type="button"
                          aria-label="Open search"
                          onClick={() => setIsSearchOpen(true)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-light-gray-2 bg-primary text-gray hover:bg-light-gray cursor-pointer"
                        >
                          <FiSearch className="h-5 w-5" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {canWriteBranch && (
                <Button
                  variant="secondary"
                  className="h-12 px-7 rounded-xl text-base font-semibold whitespace-nowrap md:self-auto"
                  onClick={openCreateModal}
                >
                  Add New Branch
                </Button>
              )}
            </div>
          </div>

          <div className="mt-2 bg-primary rounded-3xl border border-light-gray-2 shadow-sm overflow-hidden">
            <div className="hidden md:block relative min-h-auto">
              {isBranchesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <LoadingScreen
                    isLoading={true}
                    progress={loadingProgress}
                    size="lg"
                  />
                </div>
              ) : !hasAnyBranches ? (
                <div className="px-6 py-12 flex flex-col items-center text-center gap-2">
                  <p className="text-2xl font-semibold text-secondary">
                    No branches added yet
                  </p>
                  <p className="text-sm font-medium text-gray max-w-md">
                    Add your first branch to keep your organization&apos;s
                    locations organized for certifications and audits.
                  </p>
                </div>
              ) : !hasVisibleBranches ? (
                <div className="px-6 py-10 text-center text-sm font-medium text-gray">
                  No branches match your search.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-primary border-b border-light-gray-2">
                    <tr>
                      <th className="px-6 py-4 whitespace-nowrap text-left text-[11px] font-semibold text-dull-gray/50  tracking-[0.18em]">
                        Branch Name
                      </th>
                      <th className="px-6 py-4 whitespace-nowrap text-left text-[11px] font-semibold text-dull-gray/50  tracking-[0.18em]">
                        Main Branch
                      </th>
                      <th className="px-6 py-4 whitespace-nowrap text-left text-[11px] font-semibold text-dull-gray/50  tracking-[0.18em]">
                        Location
                      </th>
                      <th className="px-6 py-4 whitespace-nowrap text-left text-[11px] font-semibold text-dull-gray/50  tracking-[0.18em]">
                        Size
                      </th>
                      <th className="px-6 py-4 whitespace-nowrap text-left text-[11px] font-semibold text-dull-gray/50  tracking-[0.18em]">
                        Status
                      </th>
                      <th className="px-6 py-4 whitespace-nowrap text-left text-[11px] font-semibold text-dull-gray/50  tracking-[0.18em]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-gray-2">
                    {paginatedBranches.map((branch) => (
                      <tr
                        key={branch.id}
                        data-branch-id={branch.id}
                        className="bg-primary"
                      >
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center gap-2">
                            {branch.isMain && (
                              <FaStar className="text-secondary text-xs" />
                            )}
                            <span className="text-sm font-medium text-secondary">
                              {branch.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <span
                            className={`inline-flex items-center justify-center rounded-lg px-8 py-1 text-sm font-semibold ${
                              branch.isMain
                                ? "bg-secondary/5 text-secondary"
                                : "bg-secondary/5 text-dull-gray"
                            }`}
                          >
                            {branch.isMain ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-middle font-semibold text-sm text-secondary">
                          <div className="flex flex-col gap-0.5">
                            {branch.address && (
                              <span className="text-sm font-medium text-secondary">
                                {branch.address}
                              </span>
                            )}
                            <span className="text-xs text-gray">
                              {branch.city}
                              {branch.state ? `, ${branch.state}` : ""}
                              {branch.country ? `, ${branch.country}` : ""}
                              {branch.postalCode
                                ? `, ${branch.postalCode}`
                                : ""}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-middle font-semibold text-sm text-secondary">
                          {branch.size}
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <span className="inline-flex items-center justify-center rounded-lg border-2 border-secondary bg-secondary/10 px-8 py-1 text-base font-semibold text-secondary">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center justify-start gap-2">
                            {canWriteBranch ? (
                              <>
                                <Button
                                  variant="secondary"
                                  className="w-auto px-8 py-2 h-10 rounded-lg text-base font-semibold cursor-pointer"
                                  onClick={() => openEditModal(branch)}
                                >
                                  Edit
                                </Button>
                                <button
                                  className="h-10 px-6 py-2 rounded-lg border border-light-gray-2 bg-secondary/5 text-base font-semibold cursor-pointer text-dull-gray hover:bg-light-gray transition-colors"
                                  onClick={() => {
                                    setBranchToDelete(branch);
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="md:hidden divide-y divide-light-gray-2 relative min-h-100">
              {isBranchesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <LoadingScreen
                    isLoading={true}
                    progress={loadingProgress}
                    size="lg"
                  />
                </div>
              ) : !hasAnyBranches ? (
                <div className="px-4 py-10 text-center text-base font-medium text-gray">
                  No branches added yet. Tap on &quot;Add New Branch&quot; to
                  start.
                </div>
              ) : !hasVisibleBranches ? (
                <div className="px-4 py-10 text-center text-sm font-medium text-gray">
                  No branches match your search.
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedBranches.map((branch) => (
                    <div
                      key={branch.id}
                      data-branch-id={branch.id}
                      className="px-4 py-4 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {branch.isMain && (
                            <FaStar className="text-secondary text-xs" />
                          )}
                          <span className="font-semibold text-base text-secondary">
                            {branch.name}
                          </span>
                        </div>
                        <span className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold border border-light-gray-2">
                          Active
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray">
                        <span className="font-medium">Main Branch</span>
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                            branch.isMain
                              ? "bg-[#f1f1f1] text-secondary"
                              : "bg-[#f4f4f4] text-dull-gray"
                          }`}
                        >
                          {branch.isMain ? "Yes" : "No"}
                        </span>
                      </div>

                      <div className="text-xs text-gray">
                        <div className="flex justify-between">
                          <span className="font-medium mr-2">Location</span>
                          <span className="text-right">
                            {branch.address && (
                              <span className="block text-[11px] text-secondary">
                                {branch.address}
                              </span>
                            )}
                            <span className="block text-[11px] text-gray">
                              {branch.city}
                              {branch.state ? `, ${branch.state}` : ""}
                              {branch.country ? `, ${branch.country}` : ""}
                              {branch.postalCode
                                ? `, ${branch.postalCode}`
                                : ""}
                            </span>
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="font-medium mr-2">Size</span>
                          <span>{branch.size}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        {canWriteBranch ? (
                          <>
                            <Button
                              variant="secondary"
                              className="flex-1 h-10 rounded-lg text-sm font-semibold cursor-pointer"
                              onClick={() => openEditModal(branch)}
                            >
                              Edit
                            </Button>
                            <button
                              className="flex-1 h-10 rounded-lg border-2 border-secondary/40 bg-gray/20 text-sm font-semibold cursor-pointer text-dull-gray hover:bg-light-gray transition-colors"
                              onClick={() => {
                                setBranchToDelete(branch);
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
                  ))}
                </div>
              )}
            </div>
          </div>

          {hasVisibleBranches &&
            sortedAndFilteredBranches.length > PAGE_SIZE && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1 md:px-0">
                <p className="text-[11px] md:text-xs font-medium text-gray">
                  Showing
                  <span className="font-semibold text-secondary">
                    {` ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                      currentPage * PAGE_SIZE,
                      sortedAndFilteredBranches.length,
                    )} `}
                  </span>
                  of {sortedAndFilteredBranches.length} branches
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 rounded-lg border border-light-gray-2 text-xs font-semibold text-dull-gray bg-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-light-gray transition-colors"
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
                              : "bg-primary text-dull-gray border border-light-gray-2 hover:bg-light-gray"
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
                    className="h-8 px-3 rounded-lg border border-light-gray-2 text-xs font-semibold text-dull-gray bg-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-light-gray transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

          <AnimatePresence>
            {isModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 min-h-screen"
                onClick={handleRequestCloseModal}
              >
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className="relative w-full max-w-xl rounded-3xl bg-primary px-5 py-5 sm:px-6 sm:py-6 shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f5f5] text-gray hover:bg-[#ebebeb]"
                    onClick={handleRequestCloseModal}
                  >
                    <RxCross2 className="h-4 w-4" />
                  </button>

                  <div className="space-y-1 pr-8">
                    <h2 className="text-xl sm:text-2xl font-semibold text-secondary">
                      {branchBeingEdited ? "Update Branch" : "Add New Branch"}
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-gray">
                      Fill in the details to{" "}
                      {branchBeingEdited ? "update" : "create"} a new branch.
                    </p>
                  </div>

                  <form
                    onSubmit={formik.handleSubmit}
                    className="form-group-container"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="form-field-wrapper">
                        <label className="form-label">Branch Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formik.values.name}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          maxLength={15}
                          placeholder="Enter Branch Name"
                          className={`form-input ${formik.touched.name && formik.errors.name ? "form-input-error" : ""}`}
                        />
                        {formik.touched.name && formik.errors.name && (
                          <p className="form-error-message">
                            {formik.errors.name}
                          </p>
                        )}
                      </div>

                      <div className="form-field-wrapper">
                        <label className="form-label">Address</label>
                        <input
                          type="text"
                          name="address"
                          value={formik.values.address}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder="Enter Branch Address"
                          className={`form-input ${formik.touched.address && formik.errors.address ? "form-input-error" : ""}`}
                        />
                        {formik.touched.address && formik.errors.address && (
                          <p className="form-error-message">
                            {formik.errors.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {shouldShowMainToggle && (
                      <div className="form-toggle-box">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-secondary">
                              Main Branch
                            </p>
                            <p className="text-[10px] sm:text-xs font-medium text-gray">
                              Mark this as your organization&apos;s primary
                              location.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                branchBeingEdited &&
                                branchBeingEdited.id === mainBranchId &&
                                branchBeingEdited.isMain
                              ) {
                                return;
                              }
                              if (!formik.values.isMain && hasMainBranch) {
                                setIsMainBranchConfirmOpen(true);
                              } else {
                                formik.setFieldValue(
                                  "isMain",
                                  !formik.values.isMain,
                                );
                              }
                            }}
                            className={`relative inline-flex h-4 w-8 items-center rounded-full border border-transparent transition-colors cursor-pointer ${
                              formik.values.isMain
                                ? "bg-secondary"
                                : "bg-[#d4d4d4]"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 rounded-full bg-primary shadow-sm transform transition-transform ${
                                formik.values.isMain
                                  ? "translate-x-4"
                                  : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="form-field-wrapper">
                        <label className="form-label">Country</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsCountryOpen((prev) => !prev)}
                            className={`form-dropdown-trigger ${
                              formik.touched.country && formik.errors.country
                                ? "form-dropdown-trigger-error"
                                : ""
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {formik.values.country ? (
                                <>
                                  {(() => {
                                    const country = countries.find(
                                      (c) => c.name === formik.values.country,
                                    );
                                    if (!country || !country.flag) return null;
                                    return (
                                      <img
                                        src={country.flag}
                                        alt={country.name}
                                        className="h-3.5 w-3.5 rounded-full object-cover"
                                      />
                                    );
                                  })()}
                                  <span className="text-secondary truncate block max-w-30">
                                    {formik.values.country}
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray/60">
                                  {isCountriesLoading
                                    ? "Loading..."
                                    : "Select country"}
                                </span>
                              )}
                            </span>
                            <MdKeyboardArrowDown className="ml-2 h-4 w-4 text-gray shrink-0" />
                          </button>

                          <AnimatePresence>
                            {isCountryOpen && (
                              <>
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="fixed inset-0 z-10"
                                  onClick={() => setIsCountryOpen(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 8 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-light-gray-2 bg-primary shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                                >
                                  <div className="sticky top-0 z-10 bg-primary px-2 pt-2 pb-1.5 border-b border-light-gray-2">
                                    <input
                                      type="text"
                                      value={countrySearch}
                                      onChange={(e) =>
                                        setCountrySearch(e.target.value)
                                      }
                                      placeholder="Search country"
                                      className="form-select-search"
                                    />
                                  </div>
                                  {countries
                                    .filter((country) =>
                                      country.name
                                        .toLowerCase()
                                        .includes(
                                          countrySearch.trim().toLowerCase(),
                                        ),
                                    )
                                    .map((country) => (
                                      <button
                                        key={country.name}
                                        type="button"
                                        onClick={() =>
                                          handleSelectCountry(country.name)
                                        }
                                        className={`form-dropdown-item ${
                                          formik.values.country === country.name
                                            ? "form-dropdown-item-active"
                                            : "form-dropdown-item-inactive"
                                        }`}
                                      >
                                        {country.flag && (
                                          <img
                                            src={country.flag}
                                            alt={country.name}
                                            className="h-3.5 w-3.5 rounded-full object-cover"
                                          />
                                        )}
                                        <span className="truncate">
                                          {country.name}
                                        </span>
                                      </button>
                                    ))}
                                  {countries.filter((country) =>
                                    country.name
                                      .toLowerCase()
                                      .includes(
                                        countrySearch.trim().toLowerCase(),
                                      ),
                                  ).length === 0 && (
                                    <p className="px-3 py-2 text-xs text-gray">
                                      No countries found.
                                    </p>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>

                        {formik.touched.country &&
                          formik.errors.country &&
                          !formik.values.country && (
                            <p className="form-error-message">
                              {formik.errors.country}
                            </p>
                          )}
                      </div>
                      <div className="form-field-wrapper">
                        <label className="form-label">State / Region</label>
                        <div className="relative">
                          <button
                            type="button"
                            disabled={isStateDisabled}
                            onClick={() => {
                              if (isStateDisabled) return;
                              setIsStateOpen((prev) => !prev);
                            }}
                            className={`form-dropdown-trigger ${
                              formik.touched.state && formik.errors.state
                                ? "form-dropdown-trigger-error"
                                : ""
                            } ${
                              isStateDisabled
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <span
                              className={`truncate block max-w-30 ${
                                formik.values.state
                                  ? "text-secondary"
                                  : "text-gray/60"
                              }`}
                            >
                              {formik.values.state ||
                                (isStateDisabled
                                  ? "Select country first"
                                  : "Select state")}
                            </span>
                            <MdKeyboardArrowDown className="ml-2 h-4 w-4 text-gray shrink-0" />
                          </button>

                          <AnimatePresence>
                            {isStateOpen && !isStateDisabled && (
                              <>
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="fixed inset-0 z-10"
                                  onClick={() => setIsStateOpen(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 8 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-light-gray-2 bg-primary shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                                >
                                  <div className="sticky top-0 z-10 bg-primary px-2 pt-2 pb-1.5 border-b border-light-gray-2">
                                    <input
                                      type="text"
                                      value={stateSearch}
                                      onChange={(e) =>
                                        setStateSearch(e.target.value)
                                      }
                                      placeholder="Search state"
                                      className="form-select-search"
                                    />
                                  </div>
                                  {states
                                    .filter((state) =>
                                      state
                                        .toLowerCase()
                                        .includes(
                                          stateSearch.trim().toLowerCase(),
                                        ),
                                    )
                                    .map((state) => (
                                      <button
                                        key={state}
                                        type="button"
                                        onClick={() => {
                                          formik.setFieldValue("state", state);
                                          formik.setFieldTouched(
                                            "state",
                                            true,
                                            false,
                                          );
                                          setIsStateOpen(false);
                                        }}
                                        className={`form-dropdown-item ${
                                          formik.values.state === state
                                            ? "form-dropdown-item-active"
                                            : "form-dropdown-item-inactive"
                                        }`}
                                      >
                                        {state}
                                      </button>
                                    ))}
                                  {states.filter((state) =>
                                    state
                                      .toLowerCase()
                                      .includes(
                                        stateSearch.trim().toLowerCase(),
                                      ),
                                  ).length === 0 && (
                                    <p className="px-3 py-2 text-xs text-gray">
                                      No states found.
                                    </p>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                        {formik.touched.state && formik.errors.state && (
                          <p className="form-error-message">
                            {formik.errors.state}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="form-field-wrapper">
                        <label className="form-label">City</label>
                        <div className="relative">
                          <button
                            type="button"
                            disabled={isCityDisabled}
                            onClick={() => {
                              if (isCityDisabled) return;
                              setIsCityOpen((prev) => !prev);
                            }}
                            className={`form-dropdown-trigger ${
                              formik.touched.city && formik.errors.city
                                ? "form-dropdown-trigger-error"
                                : ""
                            } ${
                              isCityDisabled
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <span
                              className={`truncate block max-w-30 ${
                                formik.values.city
                                  ? "text-secondary"
                                  : "text-gray/60"
                              }`}
                            >
                              {formik.values.city ||
                                (isCityDisabled
                                  ? "Select country first"
                                  : "Select city")}
                            </span>
                            <MdKeyboardArrowDown className="ml-2 h-4 w-4 text-gray shrink-0" />
                          </button>

                          <AnimatePresence>
                            {isCityOpen && !isCityDisabled && (
                              <>
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="fixed inset-0 z-10"
                                  onClick={() => setIsCityOpen(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 8 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-light-gray-2 bg-primary shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                                >
                                  <div className="sticky top-0 z-10 bg-primary px-2 pt-2 pb-1.5 border-b border-light-gray-2">
                                    <input
                                      type="text"
                                      value={citySearch}
                                      onChange={(e) =>
                                        setCitySearch(e.target.value)
                                      }
                                      placeholder="Search city"
                                      className="form-select-search"
                                    />
                                  </div>
                                  {cities
                                    .filter((city) =>
                                      city
                                        .toLowerCase()
                                        .includes(
                                          citySearch.trim().toLowerCase(),
                                        ),
                                    )
                                    .map((city) => (
                                      <button
                                        key={city}
                                        type="button"
                                        onClick={() => {
                                          formik.setFieldValue("city", city);
                                          formik.setFieldTouched(
                                            "city",
                                            true,
                                            false,
                                          );
                                          setIsCityOpen(false);
                                        }}
                                        className={`form-dropdown-item ${
                                          formik.values.city === city
                                            ? "form-dropdown-item-active"
                                            : "form-dropdown-item-inactive"
                                        }`}
                                      >
                                        {city}
                                      </button>
                                    ))}
                                  {cities.filter((city) =>
                                    city
                                      .toLowerCase()
                                      .includes(
                                        citySearch.trim().toLowerCase(),
                                      ),
                                  ).length === 0 && (
                                    <p className="px-3 py-2 text-xs text-gray">
                                      No cities found.
                                    </p>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>

                        {formik.touched.city && formik.errors.city && (
                          <p className="form-error-message">
                            {formik.errors.city}
                          </p>
                        )}
                      </div>
                      <div className="form-field-wrapper">
                        <label className="form-label">Postal Code</label>
                        <input
                          type="text"
                          name="postalCode"
                          value={formik.values.postalCode}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder="Enter postal code"
                          className={`form-input ${formik.touched.postalCode && formik.errors.postalCode ? "form-input-error" : ""}`}
                        />
                        {formik.touched.postalCode &&
                          formik.errors.postalCode && (
                            <p className="form-error-message">
                              {formik.errors.postalCode}
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="form-field-wrapper">
                        <label className="form-label">Contact Number</label>
                        <input
                          type="text"
                          name="contactNo"
                          value={formik.values.contactNo}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder="Enter contact number"
                          className={`form-input ${formik.touched.contactNo && formik.errors.contactNo ? "form-input-error" : ""}`}
                        />
                        {formik.touched.contactNo &&
                          formik.errors.contactNo && (
                            <p className="form-error-message">
                              {formik.errors.contactNo}
                            </p>
                          )}
                      </div>
                      <div className="form-field-wrapper">
                        <label className="form-label">Branch Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formik.values.email}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder="Enter branch email"
                          className={`form-input ${formik.touched.email && formik.errors.email ? "form-input-error" : ""}`}
                        />
                        {formik.touched.email && formik.errors.email && (
                          <p className="form-error-message">
                            {formik.errors.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="form-field-wrapper">
                      <label className="form-label">Branch Size</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsSizeOpen((prev) => !prev)}
                          className={`form-dropdown-trigger ${
                            formik.touched.size && formik.errors.size
                              ? "form-dropdown-trigger-error"
                              : ""
                          }`}
                        >
                          <span
                            className={
                              formik.values.size
                                ? "text-secondary"
                                : "text-gray/60"
                            }
                          >
                            {formik.values.size || "Select branch size"}
                          </span>
                          <MdKeyboardArrowDown className="ml-2 h-4 w-4 text-gray shrink-0" />
                        </button>

                        <AnimatePresence>
                          {isSizeOpen && (
                            <>
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-10"
                                onClick={() => setIsSizeOpen(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.15 }}
                                className="absolute bottom-full mb-1 z-20 w-full overflow-hidden rounded-xl border border-light-gray-2 bg-primary shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                              >
                                {[
                                  "1-10 employees",
                                  "11-50 employees",
                                  "51-200 employees",
                                  "200+ employees",
                                ].map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                      formik.setFieldValue("size", option);
                                      formik.setFieldTouched(
                                        "size",
                                        true,
                                        false,
                                      );
                                      setIsSizeOpen(false);
                                    }}
                                    className={`form-dropdown-item ${
                                      formik.values.size === option
                                        ? "form-dropdown-item-active"
                                        : "form-dropdown-item-inactive"
                                    }`}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {formik.touched.size && formik.errors.size && (
                        <p className="form-error-message">
                          {formik.errors.size}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
                      <Button
                        variant="primary"
                        className="h-10 sm:h-11 hover:text-primary rounded-xl px-6 text-sm font-semibold border border-light-gray-2 bg-primary"
                        type="button"
                        onClick={handleRequestCloseModal}
                      >
                        Close
                      </Button>
                      <Button
                        type="submit"
                        variant="secondary"
                        className="h-10 sm:h-11 rounded-xl px-6 text-sm font-semibold shadow-[0_20px_40px_rgba(0,0,0,0.18)] disabled:opacity-60"
                        disabled={formik.isSubmitting}
                      >
                        {branchBeingEdited ? "Update Branch" : "Create Branch"}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isDeleteOpen && branchToDelete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 min-h-screen"
                onClick={() => {
                  setIsDeleteOpen(false);
                  setBranchToDelete(null);
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="relative w-full max-w-md rounded-3xl bg-primary px-6 py-6 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-light-gray-2">
                      <FaExclamation className="text-lg text-secondary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-secondary">
                        Delete Branch
                      </h3>
                      <p className="text-sm leading-relaxed text-gray">
                        Are you sure you want to delete{" "}
                        <span className="text-secondary font-medium">
                          {branchToDelete.name}
                        </span>
                        ? This action cannot be undone and will remove all
                        associated data, including assessments and audit records
                        linked to this branch.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <button
                      type="button"
                      className="flex-1 h-10 rounded-xl border border-secondary text-sm font-semibold text-secondary bg-primary hover:bg-light-gray transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      onClick={() => {
                        setIsDeleteOpen(false);
                        setBranchToDelete(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 h-10 rounded-xl bg-red text-sm font-semibold text-white hover:bg-red/90 transition-all shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      onClick={handleConfirmDelete}
                    >
                      Delete Branch
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isMainBranchConfirmOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 min-h-screen"
                onClick={() => setIsMainBranchConfirmOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="relative w-full max-w-md rounded-3xl bg-primary px-6 py-6 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                      <FaStar className="text-lg text-amber-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-secondary">
                        Change Main Branch
                      </h3>
                      <p className="text-sm leading-relaxed text-gray">
                        {branches.find((b) => b.isMain) && (
                          <>
                            The branch{" "}
                            <span className="text-secondary font-medium">
                              {branches.find((b) => b.isMain)?.name}
                            </span>{" "}
                            will no longer be the main branch.{" "}
                          </>
                        )}
                        This new branch will be marked as your organization's
                        primary location. Only one main branch is allowed at a
                        time.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <button
                      type="button"
                      className="flex-1 h-10 rounded-xl border border-secondary text-sm font-semibold text-secondary bg-primary hover:bg-light-gray transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      onClick={() => setIsMainBranchConfirmOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 h-10 rounded-xl bg-secondary text-sm font-semibold text-white hover:bg-black transition-all shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      onClick={handleConfirmMainBranchChange}
                    >
                      Confirm Change
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
