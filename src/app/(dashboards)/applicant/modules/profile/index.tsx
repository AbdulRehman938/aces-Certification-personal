"use client";

import { Input, Button } from "@/components/ui";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useState, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";
import { FiUploadCloud, FiFileText } from "react-icons/fi";
import axios from "axios";
import { axiosInstance } from "@/lib/axios";
import { persistOrganizationId } from "@/lib/auth-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Country as CSC,
  State as CSS,
  City as CSCity,
} from "country-state-city";

interface Country {
  name: { common: string };
  cca2: string;
  flags: { svg: string; png: string };
  idd?: { root: string; suffixes: string[] };
  isoCode?: string;
}

export function ProfilePage() {
  const pathname = usePathname();
  const isEmployee = pathname.startsWith("/employee");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [industries, setIndustries] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [isIndustriesOpen, setIsIndustriesOpen] = useState(false);
  const industriesDropdownRef = useRef<HTMLDivElement | null>(null);
  const [industriesScrollTop, setIndustriesScrollTop] = useState(0);
  const [industriesSearch, setIndustriesSearch] = useState("");
  const [branchCount, setBranchCount] = useState<number | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [logoUploadSuccess, setLogoUploadSuccess] = useState<string | null>(
    null,
  );
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [documentUploadSuccess, setDocumentUploadSuccess] = useState<
    string | null
  >(null);
  const [documentUploadError, setDocumentUploadError] = useState<string | null>(
    null,
  );

  const [countries, setCountries] = useState<Country[]>([]);
  const [locationStates, setLocationStates] = useState<
    { name: string; state_code: string }[]
  >([]);
  const [locationCities, setLocationCities] = useState<string[]>([]);
  const [showLegalCountryList, setShowLegalCountryList] = useState(false);
  const [showLegalStateList, setShowLegalStateList] = useState(false);
  const [showLegalCityList, setShowLegalCityList] = useState(false);
  const [searchLegalCountry, setSearchLegalCountry] = useState("");
  const [searchLegalState, setSearchLegalState] = useState("");
  const [searchLegalCity, setSearchLegalCity] = useState("");
  const legalCountryRef = useRef<HTMLDivElement | null>(null);
  const legalStateRef = useRef<HTMLDivElement | null>(null);
  const legalCityRef = useRef<HTMLDivElement | null>(null);

  const [showPhoneCountryList, setShowPhoneCountryList] = useState(false);
  const [searchPhoneCountry, setSearchPhoneCountry] = useState("");
  const phoneCountryRef = useRef<HTMLDivElement | null>(null);
  const [selectedPhoneCountry, setSelectedPhoneCountry] =
    useState<Country | null>(null);

  const [isCompanySizeOpen, setIsCompanySizeOpen] = useState(false);
  const companySizeRef = useRef<HTMLDivElement | null>(null);

  const companySizeOptions = [
    "1-10 employees",
    "11-50 employees",
    "51-200 employees",
    "201-500 employees",
    "501-1000 employees",
    "1001-5000 employees",
    "5000+ employees",
  ];

  const [initialValues, setInitialValues] = useState({
    id: "",
    user_id: "",
    name: "",
    first_name: "",
    last_name: "",
    email: "",
    contact_no: "",
    company_size: "",
    website: "",
    logo: "",
    industry_ids: [] as string[],
    total_branches: 0,
    organization_type: "",
    business_id: "",
    legal_city: "",
    legal_state: "",
    legal_country: "",
    description: "",
    legal_document_url: "",
    position: "",
    department: "",
  });

  const router = useRouter();
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
  const canAccess = !isEmployeeRole || hasAccess("profile");
  const canUpdate = !isEmployeeRole || hasWrite("profile");

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!isIndustriesOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (industriesDropdownRef.current?.contains(target)) return;
      setIsIndustriesOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isIndustriesOpen]);

  useEffect(() => {
    if (!isIndustriesOpen) return;
    setIndustriesScrollTop(0);
  }, [isIndustriesOpen, industriesSearch]);

  useEffect(() => {
    if (!showLegalCountryList && !showLegalStateList && !showLegalCityList)
      return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (legalCountryRef.current?.contains(target)) return;
      if (legalStateRef.current?.contains(target)) return;
      if (legalCityRef.current?.contains(target)) return;

      setShowLegalCountryList(false);
      setShowLegalStateList(false);
      setShowLegalCityList(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLegalCountryList, showLegalStateList, showLegalCityList]);

  useEffect(() => {
    if (!showPhoneCountryList) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (phoneCountryRef.current?.contains(target)) return;
      setShowPhoneCountryList(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPhoneCountryList]);

  useEffect(() => {
    if (!isCompanySizeOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (companySizeRef.current?.contains(target)) return;
      setIsCompanySizeOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCompanySizeOpen]);

  const validationSchema = Yup.object({
    name: Yup.string().required("Organization Name is required"),
    contact_no: Yup.string().required("Contact Number is required"),
    email: Yup.string().email("Invalid email").nullable().notRequired(),
    website: Yup.string().url("Invalid website").nullable().notRequired(),
  });

  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        if (isEmployee) {
          const payload = {
            first_name: values.first_name,
            last_name: values.last_name,
            position: values.position,
            department: values.department,
            profile_picture_url: values.logo || null,
          };

          await axiosInstance.patch("/employee/profile", payload);
        } else {
          const payload = {
            name: values.name,
            contact_no: values.contact_no,
            website: values.website || null,
            organization_type: values.organization_type || null,
            company_size: values.company_size || null,
            legal_city: values.legal_city || null,
            legal_state: values.legal_state || null,
            legal_country: values.legal_country || null,
            description: values.description || null,
            legal_document_url: values.legal_document_url || null,
            industry_ids: values.industry_ids ?? [],
            logo_url: values.logo || null,
          };

          await axiosInstance.patch("/organization/profile", payload);
        }

        setInitialValues(values);

        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("organization_profile");
          const currentProfile = stored ? JSON.parse(stored) : {};
          const updatedProfile = {
            ...currentProfile,
            name: isEmployee
              ? `${values.first_name} ${values.last_name}`.trim()
              : values.name,
            logo: values.logo,
          };
          localStorage.setItem(
            "organization_profile",
            JSON.stringify(updatedProfile),
          );
          window.dispatchEvent(new Event("profile-updated"));
        }

        setShowSuccessModal(true);
      } catch (error) {
        console.error("Failed to update organisation profile", error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const fetchCountries = async () => {
    try {
      const res = await axiosInstance.get("/countries");
      const apiData = res.data?.data?.data || res.data?.data || res.data;
      const apiCountries: Country[] = Array.isArray(apiData) ? apiData : [];

      const allCSCCountries = CSC.getAllCountries();
      const cscMap = new Map(allCSCCountries.map((c) => [c.isoCode, c]));

      const merged: Country[] =
        apiCountries.length > 0
          ? apiCountries
              .map((apiC) => {
                const csc = cscMap.get(apiC.cca2);
                return {
                  ...apiC,
                  isoCode: csc?.isoCode || apiC.cca2,
                };
              })
              .sort((a, b) => a.name.common.localeCompare(b.name.common))
          : allCSCCountries
              .map((c) => ({
                name: { common: c.name },
                cca2: c.isoCode,
                flags: {
                  svg: `https://flagcdn.com/${c.isoCode.toLowerCase()}.svg`,
                  png: `https://flagcdn.com/w320/${c.isoCode.toLowerCase()}.png`,
                },
                idd: {
                  root: c.phonecode ? `+${c.phonecode}` : "",
                  suffixes: [],
                },
                isoCode: c.isoCode,
              }))
              .sort((a, b) => a.name.common.localeCompare(b.name.common));

      setCountries(merged);
      return merged;
    } catch (err) {
      console.error("Failed to fetch countries", err);
      const allCSCCountries = CSC.getAllCountries();
      const fallback: Country[] = allCSCCountries
        .map((c) => ({
          name: { common: c.name },
          cca2: c.isoCode,
          flags: {
            svg: `https://flagcdn.com/${c.isoCode.toLowerCase()}.svg`,
            png: `https://flagcdn.com/w320/${c.isoCode.toLowerCase()}.png`,
          },
          idd: { root: c.phonecode ? `+${c.phonecode}` : "", suffixes: [] },
          isoCode: c.isoCode,
        }))
        .sort((a, b) => a.name.common.localeCompare(b.name.common));
      setCountries(fallback);
      return fallback;
    }
  };

  useEffect(() => {}, []);

  const selectedLegalCountry = useMemo(() => {
    if (!formik.values.legal_country) return null;
    return (
      countries.find((c) => c.name.common === formik.values.legal_country) ||
      null
    );
  }, [countries, formik.values.legal_country]);

  useEffect(() => {
    const selected = selectedLegalCountry;
    if (!selected) {
      setLocationStates([]);
      setLocationCities([]);
      return;
    }

    const nextStates = CSS.getStatesOfCountry(selected.cca2).map((s) => ({
      name: s.name,
      state_code: s.isoCode,
    }));

    setLocationStates(nextStates);

    if (nextStates.length === 0) {
      setLocationCities([]);
      if (formik.values.legal_state !== selected.name.common) {
        formik.setFieldValue("legal_state", selected.name.common);
      }
      if (formik.values.legal_city !== selected.name.common) {
        formik.setFieldValue("legal_city", selected.name.common);
      }
      return;
    }

    if (formik.values.legal_state) {
      const stateExists = nextStates.some(
        (s) => s.name === formik.values.legal_state,
      );
      if (!stateExists) {
        formik.setFieldValue("legal_state", "");
        formik.setFieldValue("legal_city", "");
        setLocationCities([]);
      }
    } else {
      setLocationCities([]);
    }
  }, [selectedLegalCountry]);

  useEffect(() => {
    const selected = selectedLegalCountry;
    if (!selected) return;
    if (!formik.values.legal_state) {
      setLocationCities([]);
      return;
    }

    const state = locationStates.find(
      (s) => s.name === formik.values.legal_state,
    );
    if (!state) {
      setLocationCities([]);
      return;
    }

    const nextCities = CSCity.getCitiesOfState(
      selected.cca2,
      state.state_code,
    ).map((c) => c.name);

    if (nextCities.length === 0) {
      setLocationCities([]);
      if (formik.values.legal_city !== state.name) {
        formik.setFieldValue("legal_city", state.name);
      }
      return;
    }

    setLocationCities(nextCities);
    if (
      formik.values.legal_city &&
      !nextCities.includes(formik.values.legal_city)
    ) {
      formik.setFieldValue("legal_city", "");
    }
  }, [formik.values.legal_state, locationStates, selectedLegalCountry]);

  const handleSelectLegalCountry = (country: Country) => {
    formik.setFieldValue("legal_country", country.name.common);
    setShowLegalCountryList(false);
    setSearchLegalCountry("");
    setShowLegalStateList(false);
    setShowLegalCityList(false);

    const nextStates = CSS.getStatesOfCountry(country.cca2).map((s) => ({
      name: s.name,
      state_code: s.isoCode,
    }));
    setLocationStates(nextStates);

    if (nextStates.length === 0) {
      setLocationCities([]);
      formik.setFieldValue("legal_state", country.name.common);
      formik.setFieldValue("legal_city", country.name.common);
      return;
    }

    setLocationCities([]);
    formik.setFieldValue("legal_state", "");
    formik.setFieldValue("legal_city", "");
  };

  const handleSelectLegalState = (state: {
    name: string;
    state_code: string;
  }) => {
    const selected = selectedLegalCountry;
    if (!selected) return;
    formik.setFieldValue("legal_state", state.name);
    setShowLegalStateList(false);
    setSearchLegalState("");
    setShowLegalCityList(false);

    const nextCities = CSCity.getCitiesOfState(
      selected.cca2,
      state.state_code,
    ).map((c) => c.name);

    if (nextCities.length === 0) {
      setLocationCities([]);
      formik.setFieldValue("legal_city", state.name);
      return;
    }

    setLocationCities(nextCities);
    formik.setFieldValue("legal_city", "");
  };

  const handleSelectLegalCity = (city: string) => {
    formik.setFieldValue("legal_city", city);
    setShowLegalCityList(false);
    setSearchLegalCity("");
  };

  const selectedIndustryNames = useMemo(() => {
    const selectedIds = formik.values.industry_ids ?? [];
    if (!selectedIds.length || !industries.length) return [];
    const map = new Map(industries.map((i) => [i.id, i.name] as const));
    return selectedIds.map((id) => map.get(id)).filter(Boolean) as string[];
  }, [formik.values.industry_ids, industries]);

  const selectedIndustryBadges = useMemo(() => {
    const maxBadges = 6;
    const visible = selectedIndustryNames.slice(0, maxBadges);
    const remaining = Math.max(
      0,
      selectedIndustryNames.length - visible.length,
    );
    return { visible, remaining };
  }, [selectedIndustryNames]);

  const filteredIndustries = useMemo(() => {
    const query = industriesSearch.trim().toLowerCase();
    if (!query) return industries;
    return industries.filter((i) => i.name.toLowerCase().includes(query));
  }, [industries, industriesSearch]);

  const virtualIndustries = useMemo(() => {
    const rowHeight = 40;
    const viewportHeight = 160;
    const overscan = 8;

    const total = filteredIndustries.length;
    if (total === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        topSpacer: 0,
        bottomSpacer: 0,
        items: [] as { id: string; name: string }[],
      };
    }

    const visibleCount = Math.ceil(viewportHeight / rowHeight);
    const startIndex = Math.max(
      0,
      Math.floor(industriesScrollTop / rowHeight) - overscan,
    );
    const endIndex = Math.min(total, startIndex + visibleCount + overscan * 2);
    const topSpacer = startIndex * rowHeight;
    const bottomSpacer = (total - endIndex) * rowHeight;

    return {
      startIndex,
      endIndex,
      topSpacer,
      bottomSpacer,
      items: filteredIndustries.slice(startIndex, endIndex),
    };
  }, [filteredIndustries, industriesScrollTop]);

  useEffect(() => {
    let isMounted = true;

    const initPage = async () => {
      try {
        setIsLoadingProfile(true);
        setLoadingProgress(10);

        const loadedCountries = await fetchCountries();
        setLoadingProgress(30);

        if (loadedCountries.length > 0) {
          const defaultCountry =
            loadedCountries.find((c) => c.cca2 === "MY") ||
            loadedCountries.find((c) => c.cca2 === "US") ||
            loadedCountries[0];
          setSelectedPhoneCountry(defaultCountry);
        }

        let profileRes: any = null;
        try {
          if (isEmployee) {
            profileRes = await axiosInstance.get("/employee/my-profile");
          } else {
            try {
              profileRes = await axiosInstance.get("/organization/profile");
            } catch (orgErr: any) {
              if (orgErr.status === 404 || orgErr.response?.status === 404) {
                profileRes = await axiosInstance.get("/employee/my-profile");
              } else {
                throw orgErr;
              }
            }
          }
          setLoadingProgress(50);

          if (isMounted && profileRes?.data) {
            const raw = profileRes.data;
            const data = raw?.data || raw;
            if (data) {
              const isEmp = !data.organization_id && data.first_name;
              const displayName = isEmp
                ? `${data.first_name} ${data.last_name}`.trim()
                : data.name || "";
              const orgId = data.organization_id || data.user_id || data.id;
              if (orgId && typeof window !== "undefined") {
                persistOrganizationId(orgId);
              }

              setInitialValues({
                id: data.id || "",
                user_id: data.user_id || "",
                name: displayName,
                first_name: data.first_name || "",
                last_name: data.last_name || "",
                email: data.email || "",
                contact_no: data.contact_no || "",
                company_size: data.company_size || "",
                website: data.website || "",
                logo:
                  data.logo ||
                  data.profile_picture ||
                  data.profile_picture_url ||
                  "",
                industry_ids: Array.isArray(data.industry_ids)
                  ? data.industry_ids
                  : [],
                total_branches:
                  typeof data.total_branches === "number"
                    ? data.total_branches
                    : 0,
                organization_type: data.organization_type || "",
                business_id: data.business_id || "",
                legal_city: data.legal_city || "",
                legal_state: data.legal_state || "",
                legal_country: data.legal_country || "",
                description: data.description || "",
                legal_document_url: data.legal_document_url || "",
                position: data.position || "",
                department: data.department || "",
              });

              if (data.contact_no) {
                const dialCodes = loadedCountries
                  .filter((c) => c.idd?.root)
                  .map((c) => {
                    const root = c.idd!.root || "";
                    const suffix = c.idd!.suffixes?.[0] || "";
                    return {
                      code: root + suffix,
                      country: c,
                    };
                  })
                  .filter((dc) => dc.code.length > 0)
                  .sort((a, b) => b.code.length - a.code.length);

                const matched = dialCodes.find((dc) =>
                  data.contact_no.startsWith(dc.code),
                );
                if (matched) {
                  setSelectedPhoneCountry(matched.country);
                }
              }
            }
          }
        } catch (error) {
          console.error("Failed to fetch profile in initPage", error);
        }

        const industriesPromise = axiosInstance.get("/industries");

        const branchesPromise = axiosInstance.get("/branches/list");

        try {
          const industriesRes = await industriesPromise;
          setLoadingProgress(80);

          if (isMounted && industriesRes.data) {
            const raw = industriesRes.data as any;
            const list = raw?.data?.data || [];
            if (Array.isArray(list)) {
              setIndustries(
                list.map((item: any) => ({
                  id: String(item.id),
                  name: String(item.name ?? ""),
                })),
              );
            }
          }
        } catch (error) {
          console.error("Failed to load industries", error);
        }

        try {
          const branchesRes = await branchesPromise;
          setLoadingProgress(90);

          const raw = branchesRes.data as any;
          let list: any[] = [];
          if (Array.isArray(raw)) {
            list = raw;
          } else if (Array.isArray(raw?.data)) {
            list = raw.data;
          } else if (Array.isArray(raw?.branches)) {
            list = raw.branches;
          } else if (Array.isArray(raw?.data?.branches)) {
            list = raw.data.branches;
          } else if (Array.isArray(raw?.data?.data)) {
            list = raw.data.data;
          }

          if (isMounted) {
            setBranchCount(Array.isArray(list) ? list.length : 0);
          }
        } catch (error) {
          console.error("Failed to load branches", error);
          if (isMounted) setBranchCount(null);
        }

        setLoadingProgress(100);
      } catch (error) {
        console.error("Failed to init profile page", error);
      } finally {
        if (isMounted) {
          setTimeout(() => setIsLoadingProfile(false), 500);
        }
      }
    };

    initPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleIndustry = (id: string) => {
    const current = formik.values.industry_ids || [];
    if (current.includes(id)) {
      formik.setFieldValue(
        "industry_ids",
        current.filter((value) => value !== id),
      );
    } else {
      formik.setFieldValue("industry_ids", [...current, id]);
    }
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;
    try {
      setIsUploadingLogo(true);
      setLogoUploadSuccess(null);
      setLogoUploadError(null);
      const formData = new FormData();
      formData.append("image", file);

      const response = await axiosInstance.post<{
        message?: string;
        url: string;
        type: string;
      }>("/uploads/images", formData);

      const url = response.data?.url;
      if (url) {
        formik.setFieldValue("logo", url);

        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("organization_profile");
          const currentProfile = stored ? JSON.parse(stored) : {};
          const updatedProfile = {
            ...currentProfile,
            logo: url,
            name: formik.values.name,
          };
          localStorage.setItem(
            "organization_profile",
            JSON.stringify(updatedProfile),
          );
          window.dispatchEvent(new Event("profile-updated"));
        }

        setLogoUploadSuccess("Logo uploaded successfully.");
      }
    } catch (error) {
      console.error("Failed to upload logo image", error);
      setLogoUploadError("Failed to upload logo. Please try again.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleDocumentUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!allowedTypes.includes(file.type)) {
        setDocumentUploadError(
          "Invalid file type. Only PDF, DOC, DOCX, XLS, and XLSX (max 10MB) are allowed.",
        );
        return;
      }

      if (file.size > maxSize) {
        setDocumentUploadError("File too large. Maximum size is 10MB.");
        return;
      }

      setIsUploadingDocument(true);
      setDocumentUploadSuccess(null);
      setDocumentUploadError(null);
      const formData = new FormData();
      formData.append("document", file);

      const response = await axiosInstance.post<{
        message?: string;
        url: string;
        type: string;
      }>("/uploads/documents", formData);

      const url = response.data?.url;
      if (url) {
        formik.setFieldValue("legal_document_url", url);
        setDocumentUploadSuccess("Document uploaded successfully.");
      }
    } catch (error) {
      console.error("Failed to upload legal document", error);
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as any)?.message ||
          error.message ||
          "Failed to upload document. Please try again.";
        setDocumentUploadError(message);
      } else {
        setDocumentUploadError("Failed to upload document. Please try again.");
      }
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "ORG";
    const parts = name.trim().split(" ").filter(Boolean).slice(0, 2);
    if (!parts.length) return "ORG";
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  };

  if (!canAccess) {
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

  if (isLoadingProfile) {
    return (
      <div className="min-h-full bg-gray-50/20 p-4 font-sans md:p-6 lg:p-8 lg:pt-3">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <Skeleton className="h-32 w-32 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50/20 p-4 font-sans md:p-6 lg:p-8 lg:pt-3 md:pt-3">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-secondary">
              Profile Settings
            </h1>
            <p className="text-sm font-medium text-gray">
              {isEmployee
                ? "Manage your personal profile details."
                : "Manage your organization profile details."}
            </p>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-visible rounded-3xl border border-dull-white/50 bg-zinc-50 shadow-sm"
        >
          <form onSubmit={formik.handleSubmit}>
            <div className="flex flex-col gap-8 border-b border-dull-white/40 p-6 md:flex-row md:items-start lg:p-10">
              <div className="flex flex-col items-center space-y-5 md:w-56 md:items-start md:border-r md:border-dull-white/40 md:pr-10">
                <div className="relative group">
                  <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-dull-white/60 bg-dull-white/5 shadow-sm transition-all group-hover:border-secondary/20">
                    {isEmployee ? (
                      formik.values.logo ? (
                        <img
                          src={formik.values.logo}
                          alt="Profile picture"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-5xl font-semibold text-secondary/40">
                          {getInitials(
                            formik.values.first_name +
                              " " +
                              formik.values.last_name,
                          )}
                        </span>
                      )
                    ) : formik.values.logo ? (
                      <img
                        src={formik.values.logo}
                        alt="Organisation logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl font-semibold text-secondary/40">
                        {getInitials(formik.values.name)}
                      </span>
                    )}
                  </div>
                  <label
                    htmlFor="logo-upload"
                    className="absolute -bottom-1 -right-1 flex cursor-pointer items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-primary shadow-md transition-transform hover:scale-105 hover:bg-secondary/90"
                  >
                    <FiUploadCloud className="h-4 w-4" />
                    <span>Upload</span>
                  </label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleLogoUpload(e.target.files?.[0] || null)
                    }
                  />
                </div>
                <div className="text-center md:text-left">
                  <p className="text-sm font-semibold text-secondary">
                    {isEmployee ? "Profile Picture" : "Organization Logo"}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray">
                    Min 400x400px. <br /> PNG or JPG recommended.
                  </p>
                  {isUploadingLogo && (
                    <p className="mt-2 text-xs font-medium text-blue-500 animate-pulse">
                      Uploading logo...
                    </p>
                  )}
                  {!isUploadingLogo && logoUploadSuccess && (
                    <p className="mt-2 text-xs font-medium text-green-600">
                      {logoUploadSuccess}
                    </p>
                  )}
                  {!isUploadingLogo && logoUploadError && (
                    <p className="mt-2 text-xs font-medium text-red-500">
                      {logoUploadError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-7">
                <div className="mb-2 space-y-1">
                  <h3 className="text-lg font-semibold text-secondary">
                    General Information
                  </h3>
                  <p className="text-sm font-medium text-gray">
                    Basic contact details for your organization.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {isEmployee ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold tracking-wider text-secondary/80">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          name="first_name"
                          placeholder="John"
                          className="bg-gray-50/50 transition-colors focus:bg-white h-11"
                          value={formik.values.first_name}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched.first_name &&
                            Boolean(formik.errors.first_name)
                          }
                        />
                        {formik.touched.first_name &&
                          formik.errors.first_name && (
                            <p className="text-sm font-medium text-red-500">
                              {formik.errors.first_name}
                            </p>
                          )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold tracking-wider text-secondary/80">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          name="last_name"
                          placeholder="Doe"
                          className="bg-gray-50/50 transition-colors focus:bg-white h-11"
                          value={formik.values.last_name}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched.last_name &&
                            Boolean(formik.errors.last_name)
                          }
                        />
                        {formik.touched.last_name &&
                          formik.errors.last_name && (
                            <p className="text-sm font-medium text-red-500">
                              {formik.errors.last_name}
                            </p>
                          )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold tracking-wider text-secondary/80">
                        Organization Name{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Input
                        name="name"
                        placeholder="TechCorp Inc"
                        className="bg-gray-50/50 transition-colors focus:bg-white h-11"
                        value={formik.values.name}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.name && Boolean(formik.errors.name)
                        }
                      />
                      {formik.touched.name && formik.errors.name && (
                        <p className="text-sm font-medium text-red-500">
                          {formik.errors.name}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold tracking-wider text-secondary/80">
                      {isEmployee ? "Email" : "Organisation email"}
                    </label>
                    <div className="group relative">
                      <Input
                        name="email"
                        placeholder="org@example.com"
                        className={`bg-gray-50/50 transition-colors focus:bg-white h-11 ${
                          initialValues.email
                            ? "cursor-not-allowed opacity-70"
                            : ""
                        }`}
                        value={formik.values.email ?? ""}
                        onChange={
                          !initialValues.email ? formik.handleChange : undefined
                        }
                        onBlur={formik.handleBlur}
                        readOnly={!!initialValues.email}
                        aria-readonly={!!initialValues.email}
                        error={
                          formik.touched.email && Boolean(formik.errors.email)
                        }
                      />
                      {initialValues.email && (
                        <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 rounded-xl border border-dull-white/60 bg-white px-3 py-2 text-xs font-semibold text-secondary opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                          {isEmployee
                            ? "Email is not editable"
                            : "Organisation email is not editable"}
                        </div>
                      )}
                    </div>
                    {formik.touched.email && formik.errors.email && (
                      <p className="text-sm font-medium text-red-500">
                        {formik.errors.email}
                      </p>
                    )}
                  </div>

                  {isEmployee && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold tracking-wider text-secondary/80">
                          Position
                        </label>
                        <Input
                          name="position"
                          placeholder="Senior Developer"
                          className="bg-gray-50/50 transition-colors focus:bg-white h-11"
                          value={formik.values.position}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold tracking-wider text-secondary/80">
                          Department
                        </label>
                        <Input
                          name="department"
                          placeholder="Engineering"
                          className="bg-gray-50/50 transition-colors focus:bg-white h-11"
                          value={formik.values.department}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold tracking-wider text-secondary/80">
                      Contact Number
                    </label>
                    <div className="group relative" ref={phoneCountryRef}>
                      <div className="flex gap-2">
                        <div className="relative">
                          <button
                            type="button"
                            disabled={!!initialValues.contact_no}
                            onClick={() =>
                              setShowPhoneCountryList(!showPhoneCountryList)
                            }
                            className={`flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-gray-50/50 px-3 transition-colors ${
                              !initialValues.contact_no
                                ? "hover:bg-white cursor-pointer"
                                : "cursor-not-allowed opacity-80"
                            }`}
                          >
                            {selectedPhoneCountry?.flags?.svg && (
                              <img
                                src={selectedPhoneCountry.flags.svg}
                                alt=""
                                className="h-4 w-6 rounded-sm object-cover"
                              />
                            )}
                            <span className="text-sm font-medium text-secondary">
                              {selectedPhoneCountry
                                ? (selectedPhoneCountry.idd?.root || "") +
                                  (selectedPhoneCountry.idd?.suffixes
                                    ?.length === 1
                                    ? selectedPhoneCountry.idd.suffixes[0]
                                    : "")
                                : "+"}
                            </span>
                            {!initialValues.contact_no && (
                              <ChevronDown className="h-3 w-3 text-gray" />
                            )}
                          </button>

                          <AnimatePresence>
                            {showPhoneCountryList && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                className="absolute left-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-xl border border-dull-white bg-white shadow-lg"
                              >
                                <div className="border-b border-dull-white/60 p-2">
                                  <div className="flex items-center gap-1.5 rounded-lg border border-dull-white/50 bg-gray-50 px-2.5 py-1.5">
                                    <Search className="h-3.5 w-3.5 text-gray" />
                                    <input
                                      autoFocus
                                      value={searchPhoneCountry}
                                      onChange={(e) =>
                                        setSearchPhoneCountry(e.target.value)
                                      }
                                      placeholder="Search country..."
                                      className="w-full bg-transparent text-xs outline-none"
                                    />
                                  </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto p-1 scrollbar-hide">
                                  {countries
                                    .filter(
                                      (c) =>
                                        c.name.common
                                          .toLowerCase()
                                          .includes(
                                            searchPhoneCountry.toLowerCase(),
                                          ) ||
                                        (
                                          c.idd?.root +
                                          (c.idd?.suffixes?.[0] || "")
                                        ).includes(searchPhoneCountry),
                                    )
                                    .map((c) => (
                                      <button
                                        key={c.cca2}
                                        type="button"
                                        onClick={() => {
                                          setSelectedPhoneCountry(c);
                                          setShowPhoneCountryList(false);
                                          setSearchPhoneCountry("");
                                          const code =
                                            (c.idd?.root || "") +
                                            (c.idd?.suffixes?.[0] || "");
                                          const currentVal =
                                            formik.values.contact_no;
                                          const rawNum = currentVal.replace(
                                            /^\+\d+/,
                                            "",
                                          );
                                          formik.setFieldValue(
                                            "contact_no",
                                            code + rawNum,
                                          );
                                        }}
                                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-secondary hover:bg-gray-50/80"
                                      >
                                        <div className="flex items-center gap-2 truncate">
                                          <img
                                            src={c.flags.svg}
                                            alt=""
                                            className="h-3 w-4.5 rounded-sm object-cover"
                                          />
                                          <span className="truncate">
                                            {c.name.common}
                                          </span>
                                        </div>
                                        <span className="font-semibold text-gray/70">
                                          {c.idd?.root}
                                          {c.idd?.suffixes?.[0]}
                                        </span>
                                      </button>
                                    ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="flex-1">
                          <Input
                            name="contact_no"
                            placeholder="312 3456789"
                            className={`bg-gray-50/50 transition-colors focus:bg-white h-11 ${
                              initialValues.contact_no
                                ? "cursor-not-allowed"
                                : ""
                            }`}
                            value={formik.values.contact_no.replace(
                              (selectedPhoneCountry?.idd?.root || "") +
                                (selectedPhoneCountry?.idd?.suffixes?.[0] ||
                                  ""),
                              "",
                            )}
                            onChange={(e) => {
                              if (initialValues.contact_no) return;
                              const code =
                                (selectedPhoneCountry?.idd?.root || "") +
                                (selectedPhoneCountry?.idd?.suffixes?.[0] ||
                                  "");
                              const val = e.target.value.replace(/\D/g, "");
                              formik.setFieldValue("contact_no", code + val);
                            }}
                            onBlur={formik.handleBlur}
                            readOnly={!!initialValues.contact_no}
                            aria-readonly={!!initialValues.contact_no}
                            error={
                              formik.touched.contact_no &&
                              Boolean(formik.errors.contact_no)
                            }
                          />
                        </div>
                      </div>

                      {initialValues.contact_no && (
                        <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 rounded-xl border border-dull-white/60 bg-white px-3 py-2 text-xs font-semibold text-secondary opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                          Contact Number is not editable
                        </div>
                      )}
                    </div>
                    {formik.touched.contact_no && formik.errors.contact_no && (
                      <p className="text-sm font-medium text-red-500">
                        {formik.errors.contact_no}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!isEmployee && (
              <>
                <div className="grid grid-cols-1 gap-4 p-6 lg:p-10">
                  <div className="lg:col-span-2 rounded-3xl bg-dull-white/10 p-6 lg:p-8">
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                      <div className="space-y-2 lg:col-span-2">
                        <label className="text-sm font-semibold text-secondary">
                          Description
                        </label>
                        <textarea
                          name="description"
                          rows={4}
                          placeholder="Brief description of your organisation..."
                          className="w-full rounded-2xl border border-dull-white/50 bg-zinc-50 px-4 py-3 text-sm text-secondary outline-none transition-all placeholder:text-gray/50 focus:border-secondary/50 focus:ring-2 focus:ring-secondary/5"
                          value={formik.values.description}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </div>

                      {industries.length > 0 && (
                        <div
                          className="space-y-2 lg:col-span-2"
                          ref={industriesDropdownRef}
                        >
                          <label className="text-sm font-semibold text-secondary">
                            Organization Type
                          </label>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsIndustriesOpen((v) => !v)}
                              className="w-full rounded-xl border border-zinc-200 bg-gray-50/50 px-4 py-2 text-left transition-colors hover:bg-white"
                              aria-label="Select industries"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex flex-1 flex-wrap gap-2">
                                  {selectedIndustryBadges.visible.length ? (
                                    <>
                                      {selectedIndustryBadges.visible.map(
                                        (name) => (
                                          <span
                                            key={name}
                                            className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary"
                                          >
                                            {name}
                                          </span>
                                        ),
                                      )}
                                      {selectedIndustryBadges.remaining > 0 && (
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-secondary border border-dull-white/70">
                                          +{selectedIndustryBadges.remaining}{" "}
                                          more
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-sm font-medium text-gray/60">
                                      Select Organization Types
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-gray">
                                  {isIndustriesOpen ? "Close" : "Select"}
                                </span>
                              </div>
                            </button>

                            {isIndustriesOpen && (
                              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-dull-white/50 bg-white shadow-sm">
                                <div className="border-b border-dull-white/60 p-3">
                                  <div className="flex items-center gap-2 rounded-lg border border-dull-white bg-white px-3 py-2">
                                    <Search className="h-4 w-4 text-gray" />
                                    <input
                                      value={industriesSearch}
                                      onChange={(e) =>
                                        setIndustriesSearch(e.target.value)
                                      }
                                      placeholder="Search Organization Types"
                                      className="w-full bg-transparent text-sm text-secondary outline-none"
                                    />
                                  </div>
                                </div>
                                <div
                                  className="max-h-40 overscroll-contain overflow-y-auto overflow-x-hidden p-2"
                                  onScroll={(e) =>
                                    setIndustriesScrollTop(
                                      e.currentTarget.scrollTop,
                                    )
                                  }
                                  onWheel={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <div
                                    style={{
                                      height: virtualIndustries.topSpacer,
                                    }}
                                  />

                                  {virtualIndustries.items.map((industry) => {
                                    const checked =
                                      formik.values.industry_ids?.includes(
                                        industry.id,
                                      ) ?? false;

                                    return (
                                      <button
                                        key={industry.id}
                                        type="button"
                                        onClick={() =>
                                          handleToggleIndustry(industry.id)
                                        }
                                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-secondary hover:bg-gray-50"
                                      >
                                        <span className="truncate">
                                          {industry.name}
                                        </span>
                                        <span
                                          className={`ml-3 inline-flex h-5 w-5 items-center justify-center rounded border ${
                                            checked
                                              ? "bg-secondary border-secondary"
                                              : "bg-white border-dull-white/70"
                                          }`}
                                          aria-hidden="true"
                                        >
                                          {checked && (
                                            <span className="text-primary text-xs font-bold">
                                              ✓
                                            </span>
                                          )}
                                        </span>
                                      </button>
                                    );
                                  })}

                                  <div
                                    style={{
                                      height: virtualIndustries.bottomSpacer,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2 lg:col-span-2">
                        <label className="text-sm font-semibold text-secondary">
                          Legal Documentation
                        </label>
                        <div className="flex items-center justify-between rounded-xl border border-dashed border-dull-white bg-white/40 p-5 transition-colors hover:bg-white/60">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                              <FiFileText className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-semibold text-secondary">
                                Business Registration
                              </span>
                              {formik.values.legal_document_url ? (
                                <a
                                  href={formik.values.legal_document_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 underline hover:text-blue-800"
                                >
                                  View Uploaded Document
                                </a>
                              ) : (
                                <span className="text-xs text-gray">
                                  No document uploaded
                                </span>
                              )}
                            </div>
                          </div>
                          <label className="cursor-pointer rounded-lg bg-white px-4 py-2 text-xs font-semibold text-secondary border border-dull-white shadow-sm hover:bg-gray-50">
                            {isUploadingDocument ? "Uploading..." : "Upload"}
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx"
                              className="hidden"
                              onChange={(e) =>
                                handleDocumentUpload(
                                  e.target.files?.[0] || null,
                                )
                              }
                            />
                          </label>
                        </div>
                        {!isUploadingDocument && documentUploadSuccess && (
                          <p className="mt-2 text-xs font-medium text-green-600">
                            {documentUploadSuccess}
                          </p>
                        )}
                        {!isUploadingDocument && documentUploadError && (
                          <p className="mt-2 text-xs font-medium text-red-500">
                            {documentUploadError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl bg-dull-white/10 p-6 lg:col-span-2 lg:p-8">
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div
                          ref={legalCountryRef}
                          className="relative space-y-2 sm:col-span-2"
                        >
                          <label className="text-sm font-semibold text-secondary">
                            Legal Country
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setShowLegalCountryList((prev) => !prev);
                              setShowLegalStateList(false);
                              setShowLegalCityList(false);
                            }}
                            onBlur={() =>
                              formik.setFieldTouched("legal_country", true)
                            }
                            className="flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 bg-gray-50/50 px-4 text-left"
                          >
                            <span
                              className={
                                formik.values.legal_country
                                  ? "text-secondary"
                                  : "text-gray"
                              }
                            >
                              {formik.values.legal_country || "Select country"}
                            </span>
                            <ChevronDown className="h-4 w-4 text-gray" />
                          </button>
                          {formik.touched.legal_country &&
                          formik.errors.legal_country ? (
                            <p className="text-xs font-medium text-red-500">
                              {formik.errors.legal_country}
                            </p>
                          ) : null}

                          <AnimatePresence>
                            {showLegalCountryList ? (
                              <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 6 }}
                                className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl border border-dull-white bg-white shadow-sm"
                              >
                                <div className="border-b border-dull-white/60 p-3">
                                  <div className="flex items-center gap-2 rounded-lg border border-dull-white bg-white px-3 py-2">
                                    <Search className="h-4 w-4 text-gray" />
                                    <input
                                      value={searchLegalCountry}
                                      onChange={(e) =>
                                        setSearchLegalCountry(e.target.value)
                                      }
                                      placeholder="Search country"
                                      className="w-full bg-transparent text-sm text-secondary outline-none"
                                    />
                                  </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto p-2 scrollbar-hide">
                                  {countries
                                    .filter((c) =>
                                      c.name.common
                                        .toLowerCase()
                                        .includes(
                                          searchLegalCountry.toLowerCase(),
                                        ),
                                    )
                                    .map((c) => (
                                      <button
                                        key={c.cca2}
                                        type="button"
                                        onClick={() =>
                                          handleSelectLegalCountry(c)
                                        }
                                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-secondary hover:bg-dull-white/20"
                                      >
                                        <span className="flex items-center gap-2">
                                          {c.flags?.svg ? (
                                            <img
                                              src={c.flags.svg}
                                              alt=""
                                              className="h-4 w-6 rounded-sm object-cover"
                                            />
                                          ) : null}
                                          <span>{c.name.common}</span>
                                        </span>
                                        {formik.values.legal_country ===
                                        c.name.common ? (
                                          <Check className="h-4 w-4 text-secondary" />
                                        ) : null}
                                      </button>
                                    ))}
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>

                        <div ref={legalStateRef} className="relative space-y-2">
                          <label className="text-sm font-semibold text-secondary">
                            Legal State / Region
                          </label>
                          <button
                            type="button"
                            disabled={
                              !selectedLegalCountry ||
                              locationStates.length === 0
                            }
                            onClick={() => {
                              if (
                                !selectedLegalCountry ||
                                locationStates.length === 0
                              )
                                return;
                              setShowLegalStateList((prev) => !prev);
                              setShowLegalCountryList(false);
                              setShowLegalCityList(false);
                            }}
                            onBlur={() =>
                              formik.setFieldTouched("legal_state", true)
                            }
                            className="flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 bg-gray-50/50 px-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span
                              className={
                                formik.values.legal_state
                                  ? "text-secondary"
                                  : "text-gray"
                              }
                            >
                              {locationStates.length === 0
                                ? formik.values.legal_state || "Auto-filled"
                                : formik.values.legal_state || "Select state"}
                            </span>
                            <ChevronDown className="h-4 w-4 text-gray" />
                          </button>
                          {formik.touched.legal_state &&
                          formik.errors.legal_state ? (
                            <p className="text-xs font-medium text-red-500">
                              {formik.errors.legal_state}
                            </p>
                          ) : null}

                          <AnimatePresence>
                            {showLegalStateList ? (
                              <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 6 }}
                                className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl border border-dull-white bg-white shadow-sm"
                              >
                                <div className="border-b border-dull-white/60 p-3">
                                  <div className="flex items-center gap-2 rounded-lg border border-dull-white bg-white px-3 py-2">
                                    <Search className="h-4 w-4 text-gray" />
                                    <input
                                      value={searchLegalState}
                                      onChange={(e) =>
                                        setSearchLegalState(e.target.value)
                                      }
                                      placeholder="Search state"
                                      className="w-full bg-transparent text-sm text-secondary outline-none"
                                    />
                                  </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto p-2 scrollbar-hide">
                                  {locationStates
                                    .filter((s) =>
                                      s.name
                                        .toLowerCase()
                                        .includes(
                                          searchLegalState.toLowerCase(),
                                        ),
                                    )
                                    .map((s) => (
                                      <button
                                        key={s.state_code}
                                        type="button"
                                        onClick={() =>
                                          handleSelectLegalState(s)
                                        }
                                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-secondary hover:bg-dull-white/20"
                                      >
                                        <span>{s.name}</span>
                                        {formik.values.legal_state ===
                                        s.name ? (
                                          <Check className="h-4 w-4 text-secondary" />
                                        ) : null}
                                      </button>
                                    ))}
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>

                        <div ref={legalCityRef} className="relative space-y-2">
                          <label className="text-sm font-semibold text-secondary">
                            Legal City
                          </label>
                          <button
                            type="button"
                            disabled={
                              !selectedLegalCountry ||
                              !formik.values.legal_state ||
                              locationStates.length === 0 ||
                              locationCities.length === 0
                            }
                            onClick={() => {
                              if (
                                !selectedLegalCountry ||
                                !formik.values.legal_state ||
                                locationStates.length === 0 ||
                                locationCities.length === 0
                              )
                                return;
                              setShowLegalCityList((prev) => !prev);
                              setShowLegalCountryList(false);
                              setShowLegalStateList(false);
                            }}
                            onBlur={() =>
                              formik.setFieldTouched("legal_city", true)
                            }
                            className="flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 bg-gray-50/50 px-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span
                              className={
                                formik.values.legal_city
                                  ? "text-secondary"
                                  : "text-gray"
                              }
                            >
                              {locationStates.length === 0
                                ? formik.values.legal_city || "Auto-filled"
                                : locationCities.length === 0
                                  ? formik.values.legal_city || "Auto-filled"
                                  : formik.values.legal_city || "Select city"}
                            </span>
                            <ChevronDown className="h-4 w-4 text-gray" />
                          </button>
                          {formik.touched.legal_city &&
                          formik.errors.legal_city ? (
                            <p className="text-xs font-medium text-red-500">
                              {formik.errors.legal_city}
                            </p>
                          ) : null}

                          <AnimatePresence>
                            {showLegalCityList ? (
                              <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 6 }}
                                className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl border border-dull-white bg-white shadow-sm"
                              >
                                <div className="border-b border-dull-white/60 p-3">
                                  <div className="flex items-center gap-2 rounded-lg border border-dull-white bg-white px-3 py-2">
                                    <Search className="h-4 w-4 text-gray" />
                                    <input
                                      value={searchLegalCity}
                                      onChange={(e) =>
                                        setSearchLegalCity(e.target.value)
                                      }
                                      placeholder="Search city"
                                      className="w-full bg-transparent text-sm text-secondary outline-none"
                                    />
                                  </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto p-2 scrollbar-hide">
                                  {locationCities
                                    .filter((city) =>
                                      city
                                        .toLowerCase()
                                        .includes(
                                          searchLegalCity.toLowerCase(),
                                        ),
                                    )
                                    .map((city) => (
                                      <button
                                        key={city}
                                        type="button"
                                        onClick={() =>
                                          handleSelectLegalCity(city)
                                        }
                                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-secondary hover:bg-dull-white/20"
                                      >
                                        <span>{city}</span>
                                        {formik.values.legal_city === city ? (
                                          <Check className="h-4 w-4 text-secondary" />
                                        ) : null}
                                      </button>
                                    ))}
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-2 border-b border-dull-white/30 pb-2">
                        <h4 className="text-base font-semibold tracking-wide text-gray">
                          Organization Details
                        </h4>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-sm font-semibold text-secondary">
                            Website
                          </label>
                          <Input
                            name="website"
                            placeholder="https://example.com"
                            className="bg-gray-50/50 h-11"
                            value={formik.values.website}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                          />
                        </div>

                        <div className="space-y-2" ref={companySizeRef}>
                          <label className="text-sm font-semibold text-secondary">
                            Company Size
                          </label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsCompanySizeOpen((v) => !v)}
                              className="flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 bg-gray-50/50 px-4 text-left transition-colors hover:bg-white"
                            >
                              <span
                                className={
                                  formik.values.company_size
                                    ? "text-secondary"
                                    : "text-gray/60"
                                }
                              >
                                {formik.values.company_size || "Select range"}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 text-gray transition-transform duration-200 ${isCompanySizeOpen ? "rotate-180" : ""}`}
                              />
                            </button>

                            <AnimatePresence>
                              {isCompanySizeOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                  transition={{
                                    duration: 0.15,
                                    ease: "easeOut",
                                  }}
                                  className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-dull-white/50 bg-white p-1.5 shadow-xl max-h-52 overflow-y-auto"
                                >
                                  {companySizeOptions.map((option) => {
                                    const isSelected =
                                      formik.values.company_size === option;
                                    return (
                                      <button
                                        key={option}
                                        type="button"
                                        onClick={() => {
                                          formik.setFieldValue(
                                            "company_size",
                                            option,
                                          );
                                          setIsCompanySizeOpen(false);
                                        }}
                                        className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                                          isSelected
                                            ? "bg-secondary text-primary"
                                            : "text-secondary hover:bg-gray-50"
                                        }`}
                                      >
                                        <span>{option}</span>
                                        {isSelected && (
                                          <Check className="h-4 w-4 text-primary" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-dull-white/10 p-6 lg:col-span-2 lg:p-2 lg:px-8">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-secondary">
                        Business ID
                      </label>
                      <div className="group relative">
                        <Input
                          name="business_id"
                          placeholder="BIZ-ID"
                          className={`bg-white/40 font-mono h-11 ${
                            initialValues.business_id
                              ? "opacity-80 cursor-not-allowed"
                              : ""
                          }`}
                          value={formik.values.business_id}
                          onChange={
                            !initialValues.business_id
                              ? formik.handleChange
                              : undefined
                          }
                          onBlur={formik.handleBlur}
                          readOnly={!!initialValues.business_id}
                        />
                        {initialValues.business_id && (
                          <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 rounded-xl border border-dull-white/60 bg-white px-3 py-2 text-xs font-semibold text-secondary opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                            Business ID is not editable
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-secondary">
                        Total Branches
                      </label>
                      <div className="group relative">
                        <Input
                          name="total_branches"
                          className="bg-white/40 font-mono opacity-80 h-11 cursor-not-allowed"
                          value={String(
                            branchCount ?? formik.values.total_branches ?? 0,
                          )}
                          disabled
                        />
                        <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 rounded-xl border border-dull-white/60 bg-white px-3 py-2 text-xs font-semibold text-secondary opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                          Total Branches is not editable
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-dull-white/40 bg-white/80 p-6 backdrop-blur-md lg:px-10">
              <div className="flex items-center gap-3">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${formik.dirty ? "bg-yellow-400" : "bg-green-400"}`}
                />
                <p className="text-sm font-medium text-gray">
                  {formik.dirty
                    ? "You have unsaved changes"
                    : "Everything is up to date"}
                </p>
              </div>

              <AnimatePresence>
                {formik.dirty && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Button
                      type="submit"
                      variant="secondary"
                      className="h-11 px-6 text-sm shadow-md"
                      isLoading={
                        isLoadingProfile ||
                        formik.isSubmitting ||
                        isUploadingLogo ||
                        isUploadingDocument
                      }
                      disabled={
                        !formik.isValid ||
                        isLoadingProfile ||
                        formik.isSubmitting ||
                        isUploadingLogo ||
                        isUploadingDocument
                      }
                    >
                      Save Changes
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSuccessModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccessModal(false)}
              className="fixed inset-0 z-60 bg-secondary/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-70 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Check className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-secondary">
                    Success
                  </h3>
                  <p className="text-sm font-medium text-gray">
                    Your profile has been updated successfully.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full h-11 mt-2 text-sm"
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
