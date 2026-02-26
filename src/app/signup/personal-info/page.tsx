"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { axiosInstance } from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/api-error";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "@/components/ui";
import {
  ChevronDown,
  Plus,
  MapPin,
  X,
  Search,
  ChevronLeft,
} from "lucide-react";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { resetSignup } from "@/store/signupSlice";
import { clearSignupSessionStorage } from "@/app/providers";
import {
  Country as CSC,
  State as CSS,
  City as CSCity,
} from "country-state-city";

const companySizes = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
];

const siteShadowClasses = [
  "shadow-[0_8px_24px_rgba(15,23,42,0.04)]",
  "shadow-[0_8px_24px_rgba(37,99,235,0.06)]",
  "shadow-[0_8px_24px_rgba(16,185,129,0.06)]",
  "shadow-[0_8px_24px_rgba(251,191,36,0.06)]",
  "shadow-[0_8px_24px_rgba(239,68,68,0.06)]",
  "shadow-[0_8px_24px_rgba(236,72,153,0.06)]",
  "shadow-[0_8px_24px_rgba(168,85,247,0.06)]",
  "shadow-[0_8px_24px_rgba(99,102,241,0.06)]",
  "shadow-[0_8px_24px_rgba(14,165,233,0.06)]",
  "shadow-[0_8px_24px_rgba(6,182,212,0.06)]",
  "shadow-[0_8px_24px_rgba(20,184,166,0.06)]",
  "shadow-[0_8px_24px_rgba(34,197,94,0.06)]",
  "shadow-[0_8px_24px_rgba(132,204,22,0.06)]",
  "shadow-[0_8px_24px_rgba(234,179,8,0.06)]",
  "shadow-[0_8px_24px_rgba(249,115,22,0.06)]",
  "shadow-[0_8px_24px_rgba(244,63,94,0.06)]",
  "shadow-[0_8px_24px_rgba(148,163,184,0.05)]",
  "shadow-[0_8px_24px_rgba(71,85,105,0.05)]",
  "shadow-[0_8px_24px_rgba(100,116,139,0.05)]",
  "shadow-[0_8px_24px_rgba(15,118,110,0.06)]",
  "shadow-[0_8px_24px_rgba(30,64,175,0.06)]",
  "shadow-[0_8px_24px_rgba(124,58,237,0.06)]",
  "shadow-[0_8px_24px_rgba(190,18,60,0.06)]",
  "shadow-[0_8px_24px_rgba(120,53,15,0.05)]",
];

interface Country {
  name: { common: string };
  cca2: string;
  flags: { svg: string; png: string };
  idd: { root: string; suffixes: string[] };
  isoCode?: string;
}

export default function PersonalInformationPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const createState = useAppSelector((s) => s.signup.create);
  const orgState = useAppSelector((s) => s.signup.organisationInfo);
  const [logoFileName, setLogoFileName] = useState<string>("");
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [showCompanySizeDropdown, setShowCompanySizeDropdown] = useState(false);
  const companySizeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "default" as "default" | "error" | "success",
  });

  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));

  const [sites, setSites] = useState<
    {
      id: number;
      branchId?: string;
      name: string;
      address: string;
      postalCode: string;
      country: string;
      state: string;
      city: string;
      contactNo: string;
      email: string;
      isSaved: boolean;
      isCreating?: boolean;
      isSaving?: boolean;
      errors?: {
        name?: string;
        address?: string;
        country?: string;
        state?: string;
        city?: string;
      };
      showCountryList?: boolean;
      showStateList?: boolean;
      showCityList?: boolean;
      searchCountry?: string;
      searchState?: string;
      searchCity?: string;
    }[]
  >([]);

  const [countries, setCountries] = useState<Country[]>([]);
  const [isAddingSite] = useState(false);

  const loadCountries = useCallback(() => {
    try {
      const allCSCCountries = CSC.getAllCountries();
      const formatted = allCSCCountries
        .map((c) => ({
          name: { common: c.name },
          cca2: c.isoCode,
          flags: {
            svg: `https://flagcdn.com/${c.isoCode.toLowerCase()}.svg`,
            png: `https://flagcdn.com/w320/${c.isoCode.toLowerCase()}.png`,
          },
          idd: { root: "", suffixes: [] },
          isoCode: c.isoCode,
        }))
        .sort((a, b) => a.name.common.localeCompare(b.name.common));
      setCountries(formatted);
    } catch (err) {
      console.error("Failed to load countries", err);
    }
  }, []);

  useEffect(() => {
    loadCountries();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        companySizeRef.current &&
        !companySizeRef.current.contains(event.target as Node)
      ) {
        setShowCompanySizeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [loadCountries]);

  const formik = useFormik({
    initialValues: {
      logo: "",
      companySize: "",
      website: "",
      description: "",
    },
    validationSchema: Yup.object({
      website: Yup.string().url("Enter a valid URL"),
      description: Yup.string().max(500, "Maximum 500 characters"),
    }),
    onSubmit: async (values) => {
      const currentSavedSitesCount = sites.filter((s) => s.isSaved).length;
      const hasContent =
        !!values.companySize ||
        !!values.website ||
        !!values.description ||
        currentSavedSitesCount > 0 ||
        !!logoFileName;

      if (!hasContent) {
        const accessToken = localStorage.getItem("access_token");
        if (accessToken) {
          document.cookie = `auth_token=${accessToken}; path=/; max-age=86400; samesite=strict`;
        }

        dispatch(resetSignup());
        clearSignupSessionStorage();

        document.cookie =
          "signup_completed=true; path=/; max-age=31536000; samesite=strict";
        router.push("/applicant");
        return;
      }

      if (sites.length > 0) {
        const unsaved = sites.some((site) => !site.isSaved);
        if (unsaved) {
          setModal({
            isOpen: true,
            title: "Incomplete Site Information",
            message:
              "You have created site sections that are not saved. Please fill in the required details and save them, or remove the incomplete sections.",
            type: "error",
          });
          return;
        }
      }

      try {
        const organization_id = orgState.businessId;

        if (!organization_id) {
          throw new Error("Organization ID not found in session");
        }

        const payload: Record<string, unknown> = {};

        const orgName = orgState.organisation || createState.organisation;
        if (orgName) payload.name = orgName;

        const contactNo =
          createState.contact_no ||
          (createState.phoneDialCode && createState.phoneNumber
            ? `${createState.phoneDialCode}-${createState.phoneNumber}`
            : "");
        if (contactNo) payload.contact_no = contactNo;

        if (orgState.city) payload.legal_city = orgState.city;
        if (orgState.state) payload.legal_state = orgState.state;
        if (orgState.country) payload.legal_country = orgState.country;

        if (values.logo) payload.logo_url = values.logo;
        if (values.website) payload.website = values.website;
        if (values.companySize) payload.organization_type = values.companySize;
        if (values.description) payload.description = values.description;

        console.log("Submitting payload:", payload);

        const accessToken = localStorage.getItem("access_token");

        await axiosInstance.patch(`/organization/profile`, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: { organization_id },
          // @ts-expect-error - _skipAuthRedirect is a custom property handled by the axios interceptor
          _skipAuthRedirect: true,
        });

        const savedSites = sites.filter((s) => s.isSaved);

        if (savedSites.length > 0) {
          await Promise.all(
            savedSites.map((site, index) => {
              const branchPayload = {
                name: site.name,
                branch_size: values.companySize || undefined,
                address: site.address,
                city: site.city,
                state: site.state,
                country: site.country,
                postal_code: site.postalCode || undefined,
                contact_no: site.contactNo || undefined,
                email: site.email || undefined,
              };

              if (site.branchId) {
                return axiosInstance.put(
                  `/branches/${site.branchId}`,
                  branchPayload,
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                    // @ts-expect-error - _skipAuthRedirect is a custom property handled by the axios interceptor
                    _skipAuthRedirect: true,
                  },
                );
              }

              return axiosInstance.post(
                `/branches`,
                {
                  ...branchPayload,
                  is_main: index === 0,
                },
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                  // @ts-expect-error - _skipAuthRedirect is a custom property handled by the axios interceptor
                  _skipAuthRedirect: true,
                },
              );
            }),
          );
        }

        if (accessToken) {
          document.cookie = `auth_token=${accessToken}; path=/; max-age=86400; samesite=strict`;
        }

        dispatch(resetSignup());
        clearSignupSessionStorage();

        document.cookie =
          "signup_completed=true; path=/; max-age=31536000; samesite=strict";
        router.push("/applicant");
      } catch (error: unknown) {
        console.error("Submission failed:", error);
        const errorMessage = getApiErrorMessage(
          error,
          "Failed to update organization profile.",
        );
        setModal({
          isOpen: true,
          title: "Update Failed",
          message: errorMessage,
          type: "error",
        });
      }
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFileName(file.name);

      const formData = new FormData();
      formData.append("image", file);

      try {
        setIsLogoUploading(true);
        const response = await axiosInstance.post(`/uploads/images`, formData);

        if (response.status === 201) {
          const { url } = response.data;
          formik.setFieldValue("logo", url);
        }
      } catch (error: unknown) {
        console.error("Upload failed", error);
        const errorMessage = getApiErrorMessage(
          error,
          "Failed to upload image. Please try again.",
        );

        setModal({
          isOpen: true,
          title: "Upload Failed",
          message: errorMessage,
          type: "error",
        });
        setLogoFileName("");
      } finally {
        setIsLogoUploading(false);
      }
    }
  };

  const manuallyAddSite = () => {
    const tempId = Date.now();
    setSites((prev) => [
      ...prev,
      {
        id: tempId,
        name: "",
        address: "",
        postalCode: "",
        contactNo: "",
        email: "",
        country: "",
        state: "",
        city: "",
        isSaved: false,
        isCreating: false,
        errors: {},
      },
    ]);
  };

  const savedSitesCount = sites.filter((s) => s.isSaved).length;
  const isAddDisabled = false;

  const handleDeleteSite = async (index: number) => {
    const site = sites[index];
    if (site.branchId) {
      try {
        const accessToken = localStorage.getItem("access_token");
        await axiosInstance.delete(`/branches/${site.branchId}`, {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
          // @ts-expect-error - _skipAuthRedirect is a custom property handled by the axios interceptor
          _skipAuthRedirect: true,
        });
      } catch (error) {
        console.error("Failed to delete branch", error);
      }
    }
    setSites((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSiteField = (
    index: number,
    field: string,
    value: string | boolean,
  ) => {
    setSites((prev) => {
      const newSites = [...prev];
      const errors = { ...newSites[index].errors };

      if (typeof field === "string") {
        if (field === "name") delete errors.name;
        if (field === "country") {
          delete errors.country;
          newSites[index].state = "";
          newSites[index].city = "";
        }
        if (field === "state") {
          delete errors.state;
          newSites[index].city = "";
        }
        if (field === "city") delete errors.city;
      }

      newSites[index] = { ...newSites[index], [field]: value, errors };
      return newSites;
    });
  };

  const saveSite = async (index: number) => {
    const site = sites[index];
    if (!site) return;

    if (site.isCreating) {
      setModal({
        isOpen: true,
        title: "Please wait",
        message: "We are still creating this site. Try again in a moment.",
        type: "error",
      });
      return;
    }

    const errors: {
      name?: string;
      address?: string;
      country?: string;
      state?: string;
      city?: string;
    } = {};
    let isValid = true;

    if (!site.name.trim()) {
      errors.name = "Site Name is required";
      isValid = false;
    }
    if (!site.address.trim()) {
      errors.address = "Address is required";
      isValid = false;
    }
    if (!site.country) {
      errors.country = "Country is required";
      isValid = false;
    }
    if (!site.state) {
      errors.state = "State is required";
      isValid = false;
    }
    if (!site.city) {
      errors.city = "City is required";
      isValid = false;
    }

    if (!isValid) {
      setSites((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], errors };
        return next;
      });
      return;
    }

    setSites((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isSaving: true, errors: {} };
      return next;
    });

    try {
      const accessToken = localStorage.getItem("access_token");
      const updatePayload = {
        name: site.name,
        branch_size: formik.values.companySize || undefined,
        address: site.address,
        city: site.city,
        state: site.state,
        country: site.country,
        postal_code: site.postalCode || undefined,
        contact_no: site.contactNo || undefined,
        email: site.email || undefined,
      };

      if (!site.branchId) {
        const response = await axiosInstance.post(
          `/branches`,
          {
            ...updatePayload,
            is_main: index === 0,
          },
          {
            headers: accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : undefined,
            // @ts-expect-error - _skipAuthRedirect is a custom property handled by the axios interceptor
            _skipAuthRedirect: true,
          },
        );
        const created = response.data?.data || response.data;
        const branchId = created?.id;

        if (!branchId) throw new Error("Failed to get branch ID from server");

        setSites((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            branchId,
            isSaved: true,
            isSaving: false,
            errors: {},
          };
          return next;
        });
      } else {
        await axiosInstance.put(`/branches/${site.branchId}`, updatePayload, {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
          // @ts-expect-error - _skipAuthRedirect is a custom property handled by the axios interceptor
          _skipAuthRedirect: true,
        });

        setSites((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            isSaved: true,
            isSaving: false,
            errors: {},
          };
          return next;
        });
      }
    } catch (error: unknown) {
      console.error("Failed to update branch for site", error);
      const errorMessage = getApiErrorMessage(
        error,
        "Failed to save site. Please try again.",
      );
      setModal({
        isOpen: true,
        title: "Save Failed",
        message: errorMessage,
        type: "error",
      });
      setSites((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], isSaving: false };
        return next;
      });
    }
  };

  const hasData =
    !!formik.values.companySize ||
    !!formik.values.website ||
    !!formik.values.description ||
    savedSitesCount > 0 ||
    !!logoFileName;

  return (
    <div className="h-screen w-full overflow-y-auto scrollbar-hide lg:fixed lg:inset-0 lg:overflow-hidden lg:p-10">
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
      <div className="mx-auto flex min-h-screen w-full justify-center px-2 py-6 lg:min-h-0 lg:h-full lg:max-w-7xl lg:flex-row lg:items-center lg:p-0">
        <div className="flex w-full flex-col items-center justify-center rounded-4xl md:rounded-[48px] bg-white px-4 py-6 md:p-10 short-laptop:p-5 shadow-2xl lg:h-full lg:w-[55%] relative overflow-hidden">
          <div className="h-full w-full max-w-lg overflow-y-auto pr-2 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="mb-[clamp(1.5rem,4vh,2.5rem)] text-center">
              <h2 className="text-2xl font-semibold text-secondary mb-2">
                Complete Your Profile
              </h2>
              <p className="text-[clamp(0.875rem,2vw,1rem)] text-zinc-400">
                All details on this page are optional — you can skip now and
                edit them anytime later from your dashboard.
              </p>
            </div>

            <form onSubmit={formik.handleSubmit} className="space-y-5">
              {/* Upload Logo */}
              <div className="mb-[clamp(1rem,3vh,1.5rem)]">
                <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)] block">
                  Upload Logo
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-zinc-50 border border-zinc-100 rounded-lg px-4 py-3 short-laptop:py-2 text-base short-laptop:text-xs text-zinc-400 truncate">
                    {logoFileName || "organization-logo-ACES123.png"}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 short-laptop:py-2 border border-zinc-400 rounded-xl text-base short-laptop:text-xs font-medium text-secondary hover:bg-zinc-50 transition-colors whitespace-nowrap"
                  >
                    Browse Logo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Company Size */}
              <div
                className="mb-[clamp(1rem,3vh,1.5rem)] relative"
                ref={companySizeRef}
              >
                <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)] block">
                  Company Size <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() =>
                    setShowCompanySizeDropdown(!showCompanySizeDropdown)
                  }
                  className={`flex items-center justify-between px-4 py-3.5 short-laptop:py-2 bg-white border rounded-lg cursor-pointer transition-all shadow-sm ${
                    formik.errors.companySize && formik.touched.companySize
                      ? "border-red-500"
                      : "border-zinc-100 hover:border-zinc-200"
                  }`}
                >
                  <span
                    className={`text-base short-laptop:text-xs ${
                      !formik.values.companySize
                        ? "text-zinc-400"
                        : "text-secondary"
                    }`}
                  >
                    {formik.values.companySize || "Select your company size"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </div>
                {formik.errors.companySize && formik.touched.companySize && (
                  <p className="text-xs text-red-500 pl-1">
                    {formik.errors.companySize}
                  </p>
                )}
                <AnimatePresence>
                  {showCompanySizeDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute z-50 w-full mt-1 bg-white border border-zinc-100 rounded-xl shadow-xl p-1 max-h-48 overflow-y-auto"
                    >
                      {companySizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            formik.setFieldValue("companySize", size);
                            setShowCompanySizeDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-base short-laptop:text-xs hover:bg-zinc-50 text-secondary transition-colors"
                        >
                          {size}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mb-[clamp(1rem,3vh,1.5rem)]">
                <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)] block">
                  Website (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Enter your website link"
                  {...formik.getFieldProps("website")}
                  className={`w-full px-4 py-3.5 short-laptop:py-2 bg-white border rounded-lg text-base short-laptop:text-xs outline-none transition-all placeholder:text-zinc-300 ${
                    formik.errors.website && formik.touched.website
                      ? "border-red-500 focus:border-red-500"
                      : "border-zinc-100 focus:border-secondary"
                  }`}
                />
                {formik.errors.website && formik.touched.website && (
                  <p className="text-xs text-red-500 pl-1">
                    {formik.errors.website}
                  </p>
                )}
              </div>

              <div className="mb-[clamp(1rem,3vh,1.5rem)]">
                <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)] block">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Tell us about your organization..."
                  {...formik.getFieldProps("description")}
                  rows={3}
                  className={`w-full px-4 py-3.5 short-laptop:py-2 bg-white border rounded-lg text-base short-laptop:text-xs outline-none transition-all placeholder:text-zinc-300 resize-none ${
                    formik.errors.description && formik.touched.description
                      ? "border-red-500 focus:border-red-500"
                      : "border-zinc-100 focus:border-secondary"
                  }`}
                />
                {formik.errors.description && formik.touched.description && (
                  <p className="text-xs text-red-500 pl-1">
                    {formik.errors.description}
                  </p>
                )}
                <p className="text-[14px] text-zinc-400 leading-tight">
                  Sites refer to the properties/infrastructures for your
                  business operations
                </p>
              </div>

              <div className="mb-[clamp(1rem,3vh,1.5rem)]">
                <button
                  type="button"
                  onClick={manuallyAddSite}
                  disabled={isAddDisabled || isAddingSite}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 border rounded-xl text-base font-semibold transition-colors ${
                    isAddDisabled || isAddingSite
                      ? "border-zinc-200 text-zinc-300 cursor-not-allowed bg-primary"
                      : "border-zinc-400 text-secondary hover:bg-zinc-50 cursor-pointer"
                  }`}
                >
                  {isAddingSite ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
                      <span>Adding Site...</span>
                    </span>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add Site</span>
                    </>
                  )}
                  {savedSitesCount > 0 && (
                    <span className="text-xs text-zinc-500">
                      ({savedSitesCount} Site
                      {savedSitesCount > 1 ? "es" : ""} added)
                    </span>
                  )}
                </button>
              </div>

              {/* Sitees List */}
              <div className="flex flex-col gap-6">
                {sites.map((site, index) => (
                  <div
                    key={site.id}
                    className={`animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-2xl border border-zinc-100 bg-white/80 p-5 relative ${siteShadowClasses[index % siteShadowClasses.length]}`}
                  >
                    {site.isSaved ? (
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-semibold text-secondary">
                              {site.name}
                            </h4>
                          </div>
                          {site.address && (
                            <div className="text-xs text-zinc-600">
                              {site.address}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <MapPin className="w-3 h-3" />
                            {site.city && `${site.city}, `}
                            {site.state && `${site.state}, `}
                            {site.country}
                            {site.postalCode && ` - ${site.postalCode}`}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteSite(index)}
                            className="p-1.5 rounded-full hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="bg-green-100 text-green-700 p-1.5 rounded-full">
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 relative">
                        <div className="absolute right-0 -top-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteSite(index)}
                            className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        </div>

                        <div className="mb-[clamp(1rem,3vh,1.5rem)] pr-8">
                          <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)] block">
                            Site Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter Site Name"
                            value={site.name}
                            onChange={(e) =>
                              updateSiteField(index, "name", e.target.value)
                            }
                            className={`w-full px-4 py-3.5 short-laptop:py-2 bg-white border rounded-lg text-base short-laptop:text-xs outline-none transition-all placeholder:text-zinc-300 ${
                              site.errors?.name
                                ? "border-red-500 focus:border-red-500"
                                : "border-zinc-100 focus:border-secondary"
                            }`}
                          />
                          {site.errors?.name && (
                            <p className="text-xs text-red-500">
                              {site.errors.name}
                            </p>
                          )}
                        </div>

                        <div className="mb-[clamp(1rem,3vh,1.5rem)]">
                          <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)] block">
                            Address <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            placeholder="Enter Site address"
                            value={site.address}
                            onChange={(e) =>
                              updateSiteField(index, "address", e.target.value)
                            }
                            rows={2}
                            className="w-full px-4 py-3.5 short-laptop:py-2 bg-white border border-zinc-100 rounded-lg text-base short-laptop:text-xs outline-none focus:border-secondary transition-all placeholder:text-zinc-300 resize-none"
                          />
                          {site.errors?.address && (
                            <p className="text-xs text-red-500">
                              {site.errors.address}
                            </p>
                          )}
                        </div>

                        <div className="mb-[clamp(1rem,3vh,1.5rem)]">
                          <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)] block">
                            Contact Number (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="Enter contact number"
                            value={site.contactNo}
                            onChange={(e) =>
                              updateSiteField(
                                index,
                                "contactNo",
                                e.target.value,
                              )
                            }
                            className="w-full px-4 py-3.5 short-laptop:py-2 bg-white border border-zinc-100 rounded-lg text-base short-laptop:text-xs outline-none focus:border-secondary transition-all placeholder:text-zinc-300"
                          />
                        </div>

                        <div className="mb-[clamp(1rem,3vh,1.5rem)]">
                          <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)] block">
                            Site Email (Optional)
                          </label>
                          <input
                            type="email"
                            placeholder="Enter Site email"
                            value={site.email}
                            onChange={(e) =>
                              updateSiteField(index, "email", e.target.value)
                            }
                            className="w-full px-4 py-3.5 short-laptop:py-2 bg-white border border-zinc-100 rounded-lg text-base short-laptop:text-xs outline-none focus:border-secondary transition-all placeholder:text-zinc-300"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Country */}
                          <div className="mb-[clamp(1rem,3vh,1.5rem)] relative">
                            <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)] block">
                              Country <span className="text-red-500">*</span>
                            </label>
                            <div
                              onClick={async () => {
                                if (countries.length === 0) {
                                  await loadCountries();
                                }
                                updateSiteField(
                                  index,
                                  "showCountryList",
                                  !site.showCountryList,
                                );
                              }}
                              className={`h-12 w-full cursor-pointer flex items-center px-4 rounded-xl border ${site.errors?.country ? "border-red" : "border-zinc-100"} bg-primary/30 font-medium text-secondary shadow-sm transition-all`}
                            >
                              <span
                                className={`text-base short-laptop:text-xs truncate ${!site.country ? "text-zinc-300" : ""}`}
                              >
                                {site.country || "Select..."}
                              </span>
                              <ChevronDown className="ml-auto w-4 h-4 text-zinc-400" />
                            </div>
                            {site.errors?.country && (
                              <p className="text-xs text-red-500 mt-1">
                                {site.errors.country}
                              </p>
                            )}
                            <AnimatePresence>
                              {site.showCountryList && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute z-100 w-62.5 mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl p-2"
                                >
                                  <div className="p-2 border-b border-zinc-50 flex items-center">
                                    <Search className="w-4 h-4 text-zinc-400 mr-2" />
                                    <input
                                      type="text"
                                      placeholder="Search..."
                                      className="w-full text-base outline-none px-1 h-8"
                                      value={site.searchCountry || ""}
                                      onChange={(e) =>
                                        updateSiteField(
                                          index,
                                          "searchCountry",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="max-h-52 overflow-y-auto p-1 scrollbar-hide">
                                    {countries
                                      .filter((c) =>
                                        c.name.common
                                          .toLowerCase()
                                          .includes(
                                            (
                                              site.searchCountry || ""
                                            ).toLowerCase(),
                                          ),
                                      )
                                      .map((c) => (
                                        <button
                                          key={c.cca2}
                                          type="button"
                                          onClick={() => {
                                            updateSiteField(
                                              index,
                                              "country",
                                              c.name.common,
                                            );

                                            const countryStates =
                                              CSS.getStatesOfCountry(c.cca2);
                                            if (countryStates.length === 0) {
                                              updateSiteField(
                                                index,
                                                "state",
                                                c.name.common,
                                              );
                                              updateSiteField(
                                                index,
                                                "city",
                                                c.name.common,
                                              );
                                            }
                                            updateSiteField(
                                              index,
                                              "showCountryList",
                                              false,
                                            );
                                          }}
                                          className="w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl text-base hover:bg-zinc-50 text-secondary font-medium"
                                        >
                                          <div className="relative w-5 h-3 overflow-hidden rounded-sm ring-1 ring-zinc-100">
                                            <Image
                                              src={c.flags.svg}
                                              alt={c.name.common}
                                              fill
                                              className="object-cover"
                                            />
                                          </div>
                                          <span className="truncate">
                                            {c.name.common}
                                          </span>
                                        </button>
                                      ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* State */}
                          <div className="mb-[clamp(1rem,3vh,1.5rem)] relative">
                            <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)] block">
                              State <span className="text-red-500">*</span>
                            </label>
                            <div
                              onClick={() => {
                                const countryCode =
                                  countries.find(
                                    (c) => c.name.common === site.country,
                                  )?.cca2 || "";
                                const hasStates =
                                  site.country &&
                                  CSS.getStatesOfCountry(countryCode).length >
                                    0;

                                if (hasStates)
                                  updateSiteField(
                                    index,
                                    "showStateList",
                                    !site.showStateList,
                                  );
                              }}
                              className={`h-12 w-full cursor-pointer flex items-center px-4 rounded-xl border ${site.errors?.state ? "border-red" : "border-zinc-100"} bg-primary/30 font-medium text-secondary shadow-sm transition-all ${
                                !site.country ||
                                CSS.getStatesOfCountry(
                                  countries.find(
                                    (c) => c.name.common === site.country,
                                  )?.cca2 || "",
                                ).length === 0
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              <span
                                className={`text-base short-laptop:text-xs truncate ${!site.state ? "text-zinc-300" : ""}`}
                              >
                                {site.state || "Select..."}
                              </span>
                              <ChevronDown className="ml-auto w-4 h-4 text-zinc-400" />
                            </div>
                            {site.errors?.state && (
                              <p className="text-xs text-red-500 mt-1">
                                {site.errors.state}
                              </p>
                            )}
                            <AnimatePresence>
                              {site.showStateList && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute z-100 w-62.5 mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl p-2"
                                >
                                  <div className="p-2 border-b border-zinc-50 flex items-center">
                                    <Search className="w-4 h-4 text-zinc-400 mr-2" />
                                    <input
                                      type="text"
                                      placeholder="Search..."
                                      className="w-full text-base outline-none px-1 h-8"
                                      value={site.searchState || ""}
                                      onChange={(e) =>
                                        updateSiteField(
                                          index,
                                          "searchState",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="max-h-52 overflow-y-auto p-1 scrollbar-hide">
                                    {CSS.getStatesOfCountry(
                                      countries.find(
                                        (c) => c.name.common === site.country,
                                      )?.cca2 || "",
                                    )
                                      .filter((s) =>
                                        s.name
                                          .toLowerCase()
                                          .includes(
                                            (
                                              site.searchState || ""
                                            ).toLowerCase(),
                                          ),
                                      )
                                      .map((s) => (
                                        <button
                                          key={s.isoCode}
                                          type="button"
                                          onClick={() => {
                                            updateSiteField(
                                              index,
                                              "state",
                                              s.name,
                                            );

                                            const countryCode =
                                              countries.find(
                                                (c) =>
                                                  c.name.common ===
                                                  site.country,
                                              )?.cca2 || "";
                                            const nextCities =
                                              CSCity.getCitiesOfState(
                                                countryCode,
                                                s.isoCode,
                                              );
                                            if (nextCities.length === 0) {
                                              updateSiteField(
                                                index,
                                                "city",
                                                s.name,
                                              );
                                            }
                                            updateSiteField(
                                              index,
                                              "showStateList",
                                              false,
                                            );
                                          }}
                                          className="w-full text-left px-4 py-3 rounded-xl text-base hover:bg-zinc-50 text-secondary font-medium"
                                        >
                                          {s.name}
                                        </button>
                                      ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* City */}
                          <div className="mb-[clamp(1rem,3vh,1.5rem)] relative">
                            <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)] block">
                              City <span className="text-red-500">*</span>
                            </label>
                            <div
                              onClick={() => {
                                const countryCode =
                                  countries.find(
                                    (c) => c.name.common === site.country,
                                  )?.cca2 || "";
                                const stateCode = CSS.getStatesOfCountry(
                                  countryCode,
                                ).find((s) => s.name === site.state)?.isoCode;
                                const hasCities =
                                  !!site.state &&
                                  !!stateCode &&
                                  CSCity.getCitiesOfState(
                                    countryCode,
                                    stateCode,
                                  ).length > 0;

                                if (hasCities)
                                  updateSiteField(
                                    index,
                                    "showCityList",
                                    !site.showCityList,
                                  );
                              }}
                              className={`h-12 w-full cursor-pointer flex items-center px-4 rounded-xl border ${site.errors?.city ? "border-red" : "border-zinc-100"} bg-primary/30 font-medium text-secondary shadow-sm transition-all ${
                                !site.state ||
                                CSCity.getCitiesOfState(
                                  countries.find(
                                    (c) => c.name.common === site.country,
                                  )?.cca2 || "",
                                  CSS.getStatesOfCountry(
                                    countries.find(
                                      (c) => c.name.common === site.country,
                                    )?.cca2 || "",
                                  ).find((s) => s.name === site.state)
                                    ?.isoCode || "",
                                ).length === 0
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              <span
                                className={`text-base short-laptop:text-xs truncate ${!site.city ? "text-zinc-300" : ""}`}
                              >
                                {site.city || "Select..."}
                              </span>
                              <ChevronDown className="ml-auto w-4 h-4 text-zinc-400" />
                            </div>
                            {site.errors?.city && (
                              <p className="text-xs text-red-500 mt-1">
                                {site.errors.city}
                              </p>
                            )}
                            <AnimatePresence>
                              {site.showCityList && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute z-100 w-62.5 mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl p-2"
                                >
                                  <div className="p-2 border-b border-zinc-50 flex items-center">
                                    <Search className="w-4 h-4 text-zinc-400 mr-2" />
                                    <input
                                      type="text"
                                      placeholder="Search..."
                                      className="w-full text-base outline-none px-1 h-8"
                                      value={site.searchCity || ""}
                                      onChange={(e) =>
                                        updateSiteField(
                                          index,
                                          "searchCity",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="max-h-52 overflow-y-auto p-1 scrollbar-hide">
                                    {CSCity.getCitiesOfState(
                                      countries.find(
                                        (c) => c.name.common === site.country,
                                      )?.cca2 || "",
                                      CSS.getStatesOfCountry(
                                        countries.find(
                                          (c) => c.name.common === site.country,
                                        )?.cca2 || "",
                                      ).find((s) => s.name === site.state)
                                        ?.isoCode || "",
                                    )
                                      .filter((city) =>
                                        city.name
                                          .toLowerCase()
                                          .includes(
                                            (
                                              site.searchCity || ""
                                            ).toLowerCase(),
                                          ),
                                      )
                                      .map((city) => (
                                        <button
                                          key={city.name}
                                          type="button"
                                          onClick={() => {
                                            updateSiteField(
                                              index,
                                              "city",
                                              city.name,
                                            );
                                            updateSiteField(
                                              index,
                                              "showCityList",
                                              false,
                                            );
                                          }}
                                          className="w-full text-left px-4 py-3 rounded-xl text-base hover:bg-zinc-50 text-secondary font-medium"
                                        >
                                          {city.name}
                                        </button>
                                      ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="mb-[clamp(0.5rem,1vh,0.5rem)]">
                            <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)] block">
                              Postal Code (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="Enter postal code"
                              value={site.postalCode}
                              onChange={(e) =>
                                updateSiteField(
                                  index,
                                  "postalCode",
                                  e.target.value,
                                )
                              }
                              className="w-full px-4 py-3.5 short-laptop:py-2 bg-white border border-zinc-100 rounded-lg text-base short-laptop:text-xs outline-none focus:border-secondary transition-all placeholder:text-zinc-300"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => saveSite(index)}
                            disabled={!!site.isSaving || !!site.isCreating}
                            className="px-8 py-2.5 border border-zinc-400 rounded-xl text-base font-semibold text-secondary hover:bg-zinc-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {site.isCreating
                              ? "Creating..."
                              : site.isSaving
                                ? "Saving..."
                                : "Save"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Buttons Row */}
              <div className="pt-0 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/signup/account")}
                  className="flex h-12 w-12 font-medium shrink-0 items-center justify-center cursor-pointer rounded-xl border border-zinc-400 text-secondary hover:bg-zinc-50 transition-all bg-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={formik.isSubmitting || isLogoUploading}
                  className="flex-1 py-3.5 bg-[#2E2E2E] text-white rounded-xl text-base font-semibold hover:bg-black transition-colors shadow-lg shadow-zinc-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {hasData ? "Submit & Continue" : "Skip & Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

