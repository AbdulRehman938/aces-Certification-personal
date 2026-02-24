"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ChevronDown, Search, X, ChevronLeft } from "lucide-react";
import { Input, Button } from "@/components/ui";
import { axiosInstance } from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/api-error";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCreateData, setOrganisationInfoData } from "@/store/signupSlice";
import {
  Country as CSC,
  State as CSS,
  City as CSCity,
} from "country-state-city";
const steps = [
  {
    id: 1,
    title: "Organisation information",
    subtitle: "Add Your organisation info",
  },
  { id: 2, title: "Organisation info", subtitle: "Add Organisation info" },
  {
    id: 3,
    title: "Account",
    subtitle: "Create your account",
  },
];

interface Country {
  name: { common: string };
  cca2: string;
  flags: { svg: string; png: string };
  idd: { root: string; suffixes: string[] };
  isoCode?: string;
}

export default function OrganisationInfoPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const createState = useAppSelector((s) => s.signup.create);
  const orgState = useAppSelector((s) => s.signup.organisationInfo);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<{ name: string; state_code: string }[]>(
    [],
  );
  const [cities, setCities] = useState<string[]>([]);
  const [industriesList, setIndustriesList] = useState<
    { id: string; name: string }[]
  >([]);
  const [searchCountry, setSearchCountry] = useState("");
  const [searchState, setSearchState] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchIndustry, setSearchIndustry] = useState("");
  const [searchOrgType, setSearchOrgType] = useState("");
  const [showOrgTypeList, setShowOrgTypeList] = useState(false);
  const [organizationTypes, setOrganizationTypes] = useState<string[]>([
    "Private Limited Company",
    "Public Limited Company",
    "Limited Liability Partnership (LLP)",
    "Partnership Firm",
    "Sole Proprietorship",
    "Non-Profit Organization (NGO)",
    "Trust",
    "Society",
    "Cooperative Society",
    "Government Organization",
    "Public Sector Undertaking (PSU)",
    "Multinational Corporation (MNC)",
    "Startup",
    "Small and Medium Enterprise (SME)",
    "Micro Enterprise",
    "Educational Institution",
    "Healthcare Organization",
    "Financial Institution",
    "Technology Company",
    "Manufacturing Company",
    "Service Provider",
    "Retail Business",
    "E-commerce Business",
  ]);

  const [showCountryList, setShowCountryList] = useState(false);
  const [showStateList, setShowStateList] = useState(false);
  const [showCityList, setShowCityList] = useState(false);
  const [showIndustryList, setShowIndustryList] = useState(false);

  const [isHydrated, setIsHydrated] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const industryRef = useRef<HTMLDivElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);

  const cityRef = useRef<HTMLDivElement>(null);
  const orgTypeRef = useRef<HTMLDivElement>(null);

  const validationSchema = useMemo(() => {
    return Yup.object({
      organisation: Yup.string().required("Organisation Name is required"),
      organisationType: Yup.string().required("Organisation Type is required"),
      businessId: Yup.string()
        .required("Business ID is required")
        .min(6, "Business ID must be at least 6 characters")
        .max(20, "Business ID must not exceed 20 characters")
        .matches(
          /^[a-zA-Z0-9][a-zA-Z0-9-]*$/,
          "Business ID must start with a letter or number and contain only letters, numbers, and hyphens",
        ),
      industries: Yup.array()
        .min(1, "At least one industry is required")
        .max(3, "Maximum 3 industries allowed")
        .required("Industry is required"),
      country: Yup.string().required("Country is required"),
      state:
        states.length > 0
          ? Yup.string().required("State is required")
          : Yup.string(),
      city:
        cities.length > 0
          ? Yup.string().required("City is required")
          : Yup.string(),
      description: Yup.string()
        .max(500, "Description must not exceed 500 characters")
        .required("Description is required"),
    });
  }, [states.length, cities.length]);

  const formik = useFormik({
    initialValues: {
      organisation: orgState.organisation || createState.organisation || "",
      organisationType: orgState.organisationType || "",
      businessId: orgState.businessId || "",
      industries: orgState.industries || ([] as string[]),
      country: orgState.country || "",
      state: orgState.state || "",
      city: orgState.city || "",
      description: orgState.description || "",
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, setStatus }) => {
      try {
        const selectedIndustryIds = values.industries
          .map(
            (name: string) => industriesList.find((i) => i.name === name)?.id,
          )
          .filter((id: string | undefined) => id !== undefined);
        dispatch(setCreateData({ organisation: values.organisation }));
        dispatch(
          setOrganisationInfoData({
            organisation: values.organisation,
            organisationType: values.organisationType,
            businessId: values.businessId,
            industries: values.industries,
            industry_ids: selectedIndustryIds as string[],
            country: values.country,
            state: values.state,
            city: values.city,
            description: values.description,
          }),
        );

        if (typeof document !== "undefined") {
          document.cookie =
            "signup_session=active; path=/; max-age=1800; samesite=strict";
        }

        router.push("/signup/account");
      } catch (err: unknown) {
        console.error("Submission error:", err);
        setStatus({ error: getApiErrorMessage(err, "Submission failed") });
      } finally {
        setSubmitting(false);
      }
    },
    validateOnBlur: true,
    validateOnChange: true,
  });

  useEffect(() => {
    const fetchCountries = () => {
      try {
        const allCSCCountries = CSC.getAllCountries();
        const formatted: Country[] = allCSCCountries
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

        setCountries(formatted);
      } catch (err) {
        console.error("Failed to load countries", err);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    if (industriesList.length === 0) return;
    setTimeout(() => setIsHydrated(true), 100);
  }, [industriesList]);

  useEffect(() => {
    if (isHydrated && countries.length > 0) {
      const timer = setTimeout(() => {
        setShowValidation(true);
        formik.setFieldTouched("state", true, false);
        formik.setFieldTouched("city", true, false);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowValidation(false);
    }
  }, [isHydrated, countries.length, formik]);

  useEffect(() => {
    if (!isHydrated) return;
    const selectedIndustryIds = formik.values.industries
      .map((name: string) => industriesList.find((i) => i.name === name)?.id)
      .filter((id: string | undefined) => id !== undefined) as string[];

    dispatch(
      setOrganisationInfoData({
        organisation: formik.values.organisation,
        organisationType: formik.values.organisationType,
        businessId: formik.values.businessId,
        industries: formik.values.industries,
        industry_ids: selectedIndustryIds,
        country: formik.values.country,
        state: formik.values.state,
        city: formik.values.city,
        description: formik.values.description,
      }),
    );
  }, [dispatch, formik.values, industriesList, isHydrated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        industryRef.current &&
        !industryRef.current.contains(event.target as Node)
      )
        setShowIndustryList(false);
      if (
        countryRef.current &&
        !countryRef.current.contains(event.target as Node)
      )
        setShowCountryList(false);
      if (stateRef.current && !stateRef.current.contains(event.target as Node))
        setShowStateList(false);
      if (cityRef.current && !cityRef.current.contains(event.target as Node))
        setShowCityList(false);
      if (
        orgTypeRef.current &&
        !orgTypeRef.current.contains(event.target as Node)
      )
        setShowOrgTypeList(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const res = await axiosInstance.get(`/industries`);
        if (res.data?.data?.data) {
          setIndustriesList(res.data.data.data);
        }
      } catch (err: unknown) {
        console.error("Failed to fetch industries", err);
      }
    };
    fetchIndustries();
  }, []);

  useEffect(() => {
    if (formik.values.country && isHydrated && countries.length > 0) {
      const fetchStates = async () => {
        try {
          const selectedCountry = countries.find(
            (c) => c.name.common === formik.values.country,
          );
          if (!selectedCountry) {
            console.warn(
              "Selected country not found in countries list:",
              formik.values.country,
            );
            setStates([]);
            return;
          }

          const countryCode = selectedCountry.cca2;
          const fetchedStates = CSS.getStatesOfCountry(countryCode).map(
            (s) => ({
              name: s.name,
              state_code: s.isoCode,
            }),
          );

          if (fetchedStates.length === 0) {
            setStates([]);
            setCities([]);
            if (formik.values.state !== selectedCountry.name.common) {
              formik.setFieldValue("state", selectedCountry.name.common);
            }
            if (formik.values.city !== selectedCountry.name.common) {
              formik.setFieldValue("city", selectedCountry.name.common);
            }
            return;
          }

          setStates(fetchedStates);

          const stateExists = fetchedStates.some(
            (s) => s.name === formik.values.state,
          );
          if (!stateExists && formik.values.state) {
            formik.setFieldValue("state", "");
            if (formik.values.city !== "") formik.setFieldValue("city", "");
            setCities([]);
          }
        } catch (err) {
          console.error("Failed to fetch states", err);
          setStates([]);
        }
      };

      fetchStates();
    } else {
      setStates([]);
    }
  }, [formik, isHydrated, countries]);

  useEffect(() => {
    if (
      formik.values.country &&
      formik.values.state &&
      countries.length > 0 &&
      states.length > 0
    ) {
      const fetchCities = async () => {
        try {
          const selectedCountry = countries.find(
            (c) => c.name.common === formik.values.country,
          );
          const selectedState = states.find(
            (s) => s.name === formik.values.state,
          );

          if (!selectedCountry) {
            console.warn("Selected country not found:", formik.values.country);
            setCities([]);
            return;
          }

          if (!selectedState) {
            console.warn("Selected state not found:", formik.values.state);
            setCities([]);
            return;
          }

          const fetchedCities = CSCity.getCitiesOfState(
            selectedCountry.cca2,
            selectedState.state_code,
          ).map((c) => c.name);

          if (fetchedCities.length === 0) {
            setCities([]);
            if (formik.values.city !== selectedState.name) {
              formik.setFieldValue("city", selectedState.name);
            }
            return;
          }

          setCities(fetchedCities);

          if (
            formik.values.city &&
            !fetchedCities.includes(formik.values.city)
          ) {
            formik.setFieldValue("city", "");
          }
        } catch (err) {
          console.error("Failed to fetch cities", err);
          setCities([]);
        }
      };

      fetchCities();
    } else {
      setCities([]);
    }
  }, [formik, countries, states]);

  const toggleIndustry = (industry: string) => {
    const current = formik.values.industries;
    if (current.includes(industry)) {
      formik.setFieldValue(
        "industries",
        current.filter((i: string) => i !== industry),
      );
    } else {
      if (current.length < 3) {
        formik.setFieldValue("industries", [...current, industry]);
      }
    }
  };

  const filteredIndustries = industriesList
    .filter((i) => i.name.toLowerCase().includes(searchIndustry.toLowerCase()))
    .map((i) => i.name);

  const selectedCountryData = countries.find(
    (c) => c.name.common === formik.values.country,
  );

  return (
    <div className="h-screen w-full overflow-y-auto scrollbar-hide lg:fixed lg:inset-0 lg:overflow-hidden lg:p-0">
      <div className="mx-auto flex min-h-screen w-full flex-col justify-between px-2 py-6 lg:min-h-0 lg:h-full lg:max-w-7xl lg:flex-row lg:items-center lg:p-0">
        {/* Left Side (Stepper) */}
        <div className="mb-8 flex flex-col justify-center lg:mb-0 lg:w-1/2 lg:pr-20">
          <div className="mb-8 flex items-center justify-center gap-4 lg:mb-12 lg:justify-start">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg lg:h-16 lg:w-16">
              <img
                src="/assets/imgs/logo.svg"
                alt="logo"
                className="h-14 w-14"
              />
            </div>
            <div className="flex flex-col text-white">
              <span className="text-2xl font-semibold lg:text-4xl text-white">
                ACES
              </span>
              <span className="text-2xl -mt-2 font-light text-white lg:text-2xl">
                Certification
              </span>
            </div>
          </div>

          <div className="mb-10 text-center lg:mb-16 lg:text-left text-white">
            <h1 className="mb-3 text-2xl font-semibold text-white lg:mb-4 lg:text-2xl leading-tight">
              Create your account
            </h1>
            <p className="max-w-xl text-base text-white lg:text-xl leading-[1.2] short-laptop:text-lg font-light">
              Create your account and begin the <br /> certification process.
              Our AI-powered platform <br /> makes it simple.
            </p>
          </div>

          <div className="flex w-full overflow-x-auto pb-4 gap-6 lg:flex-col lg:overflow-visible lg:pb-0 scrollbar-hide">
            {steps.map((step, idx) => {
              const isActive = step.id === 2;
              const isPast = step.id < 2;
              return (
                <div
                  key={step.id}
                  className="relative flex shrink-0 items-start group"
                >
                  {idx !== steps.length - 1 && (
                    <div className="absolute left-5 top-10 hidden h-9 w-0.5 bg-white lg:block" />
                  )}
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                    {isActive && (
                      <div className="absolute inset-0 rounded-full border border-white" />
                    )}
                    <div
                      className={`flex items-center justify-center rounded-full transition-all duration-300 ${isActive ? "h-7 w-7 bg-white text-secondary" : isPast ? "h-10 w-10 bg-white text-secondary" : "h-10 w-10 border-2 border-white text-white bg-transparent"}`}
                    >
                      <span
                        className={`font-semibold ${isActive ? "text-[10px]" : "text-base"}`}
                      >
                        {step.id}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col pt-1">
                    <h3
                      className={`text-base font-semibold lg:text-lg ${isActive ? "text-white" : "text-white"}`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-[10px] text-white/40 lg:text-sm">
                      {step.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side Form Card */}
        <div
          className="flex w-full flex-col justify-start rounded-4xl md:rounded-[48px] bg-white px-5 py-8 md:p-12 short-laptop:p-5 shadow-2xl lg:h-[90%] lg:w-1/2 lg:overflow-y-auto relative"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <div className="mx-auto w-full max-w-lg">
            <div className="mb-[clamp(1rem,1vh,1rem)] text-center lg:text-left">
              <h2 className="text-2xl font-semibold text-secondary mb-0">
                Create your account
              </h2>
              <p className="text-[16px] text-[#999]">
                Create your account and begin the certification process.
              </p>
            </div>

            <form
              onSubmit={formik.handleSubmit}
              className="space-y-0 short-laptop:space-y-0 py-4"
            >
              {/* Organisation Type Dropdown */}
              <div
                className="mb-[clamp(1rem,2vh,1.5rem)] relative"
                ref={orgTypeRef}
              >
                <div className="flex items-center justify-between mb-[clamp(0.25rem,1vh,0.5rem)]">
                  <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-medium text-secondary">
                    Organisation Type
                  </label>
                  {formik.touched.organisationType &&
                    formik.errors.organisationType && (
                      <span className="text-[10px] font-semibold text-red">
                        {formik.errors.organisationType}
                      </span>
                    )}
                </div>
                <div
                  onClick={() => setShowOrgTypeList(!showOrgTypeList)}
                  className={`h-12 w-full cursor-pointer flex items-center px-4 rounded-xl border-2 ${formik.touched.organisationType && formik.errors.organisationType ? "border-red" : "border-gray-100"} bg-zinc-50/30 font-medium text-secondary shadow-sm transition-all`}
                >
                  <span
                    className={`text-base short-laptop:text-base truncate flex-1 ${!formik.values.organisationType ? "text-zinc-300" : ""}`}
                  >
                    {formik.values.organisationType || "Hotel"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${showOrgTypeList ? "rotate-180" : ""}`}
                  />
                </div>
                <AnimatePresence>
                  {showOrgTypeList && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute z-50 w-full mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
                        <Search className="w-4 h-4 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Search organisation type..."
                          className="w-full text-base bg-transparent outline-none"
                          value={searchOrgType}
                          onChange={(e) => setSearchOrgType(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto p-1 scrollbar-hide">
                        {Array.from(new Set(organizationTypes))
                          .filter((type) =>
                            type
                              .toLowerCase()
                              .includes(searchOrgType.toLowerCase()),
                          )
                          .map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                formik.setFieldValue("organisationType", type);
                                setShowOrgTypeList(false);
                                setSearchOrgType("");
                              }}
                              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                formik.values.organisationType === type
                                  ? "bg-secondary text-white"
                                  : "hover:bg-zinc-50 text-zinc-600"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        {searchOrgType &&
                          !organizationTypes.some((type) =>
                            type
                              .toLowerCase()
                              .includes(searchOrgType.toLowerCase()),
                          ) && (
                            <div className="p-4 text-center">
                              <p className="text-sm text-zinc-500 mb-3">
                                No matching organization type found
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  const newType = searchOrgType.trim();
                                  if (newType) {
                                    setOrganizationTypes([
                                      ...organizationTypes,
                                      newType,
                                    ]);
                                    formik.setFieldValue(
                                      "organisationType",
                                      newType,
                                    );
                                    setShowOrgTypeList(false);
                                    setSearchOrgType("");
                                  }
                                }}
                                className="px-4 py-2 bg-secondary text-white rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors"
                              >
                                Add &quot;{searchOrgType}&quot;
                              </button>
                            </div>
                          )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid gap-5 mb-[clamp(1rem,2vh,1.5rem)] grid-cols-1 md:grid-cols-2 xl:grid-cols-1">
                {/* Business ID */}
                <div>
                  <div className="flex items-center justify-between mb-[clamp(0.25rem,1vh,0.5rem)]">
                    <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-medium text-secondary">
                      Business ID
                    </label>
                    {formik.touched.businessId && formik.errors.businessId && (
                      <span className="text-[10px] font-semibold text-red">
                        {formik.errors.businessId}
                      </span>
                    )}
                  </div>
                  <Input
                    className="h-12 border-2 border-gray-100 shadow-sm "
                    type="text"
                    placeholder="org12345"
                    {...formik.getFieldProps("businessId")}
                    onChange={(e) => {
                      const value = e.target.value;
                      formik.setFieldValue("businessId", value);
                    }}
                    error={
                      formik.touched.businessId && !!formik.errors.businessId
                    }
                  />
                </div>

                <div className="relative" ref={industryRef}>
                  <div className="flex items-center justify-between mb-[clamp(0.25rem,1vh,0.5rem)]">
                    <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary">
                      Industry
                    </label>
                    {formik.touched.industries && formik.errors.industries && (
                      <span className="text-[10px] font-semibold text-red">
                        {formik.errors.industries as string}
                      </span>
                    )}
                  </div>
                  <div
                    onClick={() => setShowIndustryList(!showIndustryList)}
                    className={`h-12 w-full cursor-pointer flex flex-nowrap items-center gap-2 px-3 rounded-xl border-2 ${formik.touched.industries && formik.errors.industries ? "border-red" : "border-gray-100"} bg-zinc-50/30 transition-all shadow-sm overflow-hidden`}
                  >
                    {formik.values.industries.length === 0 ? (
                      <span className="text-zinc-300 text-base">
                        Select industries...
                      </span>
                    ) : (
                      formik.values.industries.map((i: string) => (
                        <span
                          key={i}
                          className={`bg-zinc-100 text-secondary font-semibold rounded-lg flex items-center gap-1 border border-zinc-200  whitespace-nowrap ${
                            formik.values.industries.length >= 3
                              ? "text-[9px] px-1.5 py-1"
                              : "text-xs px-2.5 py-1"
                          }`}
                        >
                          <span className="truncate max-w-25">{i}</span>
                          <X
                            className="w-3 h-3 text-zinc-400 hover:text-red transition-colors shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleIndustry(i);
                            }}
                          />
                        </span>
                      ))
                    )}
                    <div className="ml-auto pr-1">
                      <ChevronDown className="w-5 h-5 text-zinc-400" />
                    </div>
                  </div>
                  <p className="mt-2 font-light text-xs text-gray text-left">
                    Up to 3 industries allowed
                  </p>
                  <AnimatePresence>
                    {showIndustryList && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute z-50 w-full mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
                          <Search className="w-4 h-4 text-zinc-400" />
                          <input
                            type="text"
                            placeholder="Search industry..."
                            className="w-full text-base bg-transparent outline-none"
                            value={searchIndustry}
                            onChange={(e) => setSearchIndustry(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-44 overflow-y-auto p-1 grid grid-cols-2 gap-2">
                          {Array.from(new Set(filteredIndustries)).map(
                            (ind) => (
                              <button
                                key={ind}
                                type="button"
                                onClick={() => {
                                  toggleIndustry(ind);
                                }}
                                className={`text-left px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${formik.values.industries.includes(ind) ? "bg-secondary text-white" : "hover:bg-zinc-50 text-zinc-600"}`}
                              >
                                {ind}
                              </button>
                            ),
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div
                  className="mb-[clamp(1rem,2vh,1.5rem)] relative"
                  ref={countryRef}
                >
                  <div className="flex items-center justify-between mb-[clamp(0.25rem,1vh,0.5rem)]">
                    <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary">
                      Country
                    </label>
                    {formik.touched.country && formik.errors.country && (
                      <span className="text-[10px] font-semibold text-red">
                        {formik.errors.country}
                      </span>
                    )}
                  </div>
                  <div
                    onClick={() => setShowCountryList(!showCountryList)}
                    className={`h-12 w-full cursor-pointer flex items-center px-4 rounded-xl border-2 ${formik.touched.country && formik.errors.country ? "border-red" : "border-gray-100"} bg-zinc-50/30 font-medium text-secondary shadow-sm`}
                  >
                    {selectedCountryData && (
                      <div className="relative w-6 h-4 mr-2 overflow-hidden rounded-sm shadow-sm ring-1 ring-zinc-200">
                        <Image
                          src={selectedCountryData.flags.svg}
                          alt={selectedCountryData.name.common}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <span
                      className={`text-base short-laptop:text-base truncate ${!formik.values.country ? "text-zinc-300" : ""}`}
                    >
                      {formik.values.country || "Select..."}
                    </span>
                    <ChevronDown className="ml-auto w-4 h-4 text-zinc-400" />
                  </div>
                  <AnimatePresence>
                    {showCountryList && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute z-50 w-62.5 max-w-[calc(100vw-40px)] mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl p-2"
                      >
                        <div className="p-2 border-b border-zinc-50 flex items-center">
                          <Search className="w-4 h-4 text-zinc-400 mr-2" />
                          <input
                            type="text"
                            placeholder="Search..."
                            className="w-full text-base outline-none px-1 h-8"
                            value={searchCountry}
                            onChange={(e) => setSearchCountry(e.target.value)}
                          />
                        </div>
                        <div className="max-h-52 overflow-y-auto p-1 scrollbar-hide">
                          {countries
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
                                  formik.setFieldValue(
                                    "country",
                                    c.name.common,
                                  );
                                  setShowCountryList(false);
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

                <div
                  className="mb-[clamp(1rem,2vh,1.5rem)] relative"
                  ref={stateRef}
                >
                  <div className="flex items-center justify-between mb-[clamp(0.25rem,1vh,0.5rem)]">
                    <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary">
                      State
                    </label>
                    {showValidation &&
                      formik.values.country &&
                      formik.touched.state &&
                      formik.errors.state && (
                        <span className="text-[10px] font-semibold text-red">
                          {formik.errors.state}
                        </span>
                      )}
                    {showValidation &&
                      formik.values.country &&
                      states.length === 0 &&
                      isHydrated && (
                        <span className="text-[10px] font-semibold text-amber-500">
                          No states available
                        </span>
                      )}
                  </div>
                  <div
                    onClick={() => {
                      if (states.length > 0) setShowStateList(!showStateList);
                    }}
                    onBlur={(e) => {
                      if (showValidation) formik.handleBlur(e);
                    }}
                    className={`h-14 short-laptop:h-10 w-full cursor-pointer flex items-center px-4 short-laptop:px-3 rounded-xl border ${formik.touched.state && formik.errors.state ? "border-red" : "border-zinc-100"} bg-zinc-50/30 font-medium text-secondary shadow-sm ${!formik.values.country || states.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`text-base short-laptop:text-base truncate ${!formik.values.state ? "text-zinc-300" : ""}`}
                    >
                      {formik.values.state || "Select..."}
                    </span>
                    <ChevronDown className="ml-auto w-4 h-4 text-zinc-400" />
                  </div>
                  <AnimatePresence>
                    {showStateList && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute z-50 w-62.5 max-w-[calc(100vw-40px)] mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl p-2"
                      >
                        <div className="p-2 border-b border-zinc-50 flex items-center">
                          <Search className="w-4 h-4 text-zinc-400 mr-2" />
                          <input
                            type="text"
                            placeholder="Search..."
                            className="w-full text-base outline-none px-1 h-8"
                            value={searchState}
                            onChange={(e) => setSearchState(e.target.value)}
                          />
                        </div>
                        <div className="max-h-52 overflow-y-auto p-1 scrollbar-hide">
                          {states
                            .filter((s) =>
                              s.name
                                .toLowerCase()
                                .includes(searchState.toLowerCase()),
                            )
                            .map((s) => (
                              <button
                                key={s.name}
                                type="button"
                                onClick={() => {
                                  formik.setFieldValue("state", s.name);
                                  setShowStateList(false);
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
                <div
                  className="mb-[clamp(1rem,2vh,1.5rem)] relative"
                  ref={cityRef}
                >
                  <div className="flex items-center justify-between mb-[clamp(0.25rem,1vh,0.5rem)]">
                    <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary">
                      City
                    </label>
                    {showValidation &&
                      formik.values.country &&
                      formik.touched.city &&
                      formik.errors.city && (
                        <span className="text-[10px] font-semibold text-red">
                          {formik.errors.city}
                        </span>
                      )}
                    {showValidation &&
                      formik.values.state &&
                      cities.length === 0 &&
                      isHydrated && (
                        <span className="text-[10px] font-semibold text-amber-500">
                          No cities available
                        </span>
                      )}
                  </div>
                  <div
                    onClick={() => {
                      if (formik.values.state && cities.length > 0)
                        setShowCityList(!showCityList);
                    }}
                    onBlur={(e) => {
                      if (showValidation) formik.handleBlur(e);
                    }}
                    className={`h-14 short-laptop:h-10 w-full cursor-pointer flex items-center px-4 short-laptop:px-3 rounded-xl border ${formik.touched.city && formik.errors.city ? "border-red" : "border-zinc-100"} bg-zinc-50/30 font-medium text-secondary shadow-sm ${!formik.values.state || cities.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`text-base short-laptop:text-base truncate ${!formik.values.city ? "text-zinc-300" : ""}`}
                    >
                      {formik.values.city || "Select..."}
                    </span>
                    <ChevronDown className="ml-auto w-4 h-4 text-zinc-400" />
                  </div>
                  <AnimatePresence>
                    {showCityList && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute z-50 w-62.5 max-w-[calc(100vw-40px)] mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl p-2"
                      >
                        {!formik.values.state ? (
                          <div className="p-4 text-center text-xs text-zinc-400 font-medium">
                            Select a state first
                          </div>
                        ) : (
                          <>
                            <div className="p-2 border-b border-zinc-50 flex items-center">
                              <Search className="w-4 h-4 text-zinc-400 mr-2" />
                              <input
                                type="text"
                                placeholder="Search..."
                                className="w-full text-base outline-none px-1 h-8"
                                value={searchCity}
                                onChange={(e) => setSearchCity(e.target.value)}
                              />
                            </div>
                            <div className="max-h-52 overflow-y-auto p-1 scrollbar-hide">
                              {cities
                                .filter((c) =>
                                  c
                                    .toLowerCase()
                                    .includes(searchCity.toLowerCase()),
                                )
                                .map((city) => (
                                  <button
                                    key={city}
                                    type="button"
                                    onClick={() => {
                                      formik.setFieldValue("city", city);
                                      setShowCityList(false);
                                    }}
                                    className="w-full text-left px-4 py-3 rounded-xl text-base hover:bg-zinc-50 text-secondary font-medium"
                                  >
                                    {city}
                                  </button>
                                ))}
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Description */}
              <div className="mb-[clamp(1rem,2vh,1.5rem)]">
                <div className="flex items-center justify-between mb-[clamp(0.25rem,1vh,0.5rem)]">
                  <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary/80">
                    Description
                  </label>
                  {formik.touched.description && formik.errors.description && (
                    <span className="text-[10px] font-semibold text-red">
                      {formik.errors.description}
                    </span>
                  )}
                </div>
                <textarea
                  className={`w-full min-h-30 p-3 rounded-xl border-2 ${formik.touched.description && formik.errors.description ? "border-red" : "border-gray-100"} bg-zinc-50/30 text-base font-medium text-secondary shadow-sm outline-none resize-none transition-all focus:gray-300`}
                  placeholder="Enter a brief description of your organization..."
                  {...formik.getFieldProps("description")}
                />
              </div>

              {/* Validation and API Error Display */}
              {((formik.submitCount > 0 && !formik.isValid) ||
                formik.status?.error) && (
                <div className="mb-4 text-center bg-red/5 p-3 rounded-xl border border-red/20">
                  <p className="text-xs font-semibold text-red">
                    {formik.status?.error ||
                      "Please complete all fields correctly above."}
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center gap-4">
                <Button
                  type="button"
                  onClick={() => router.push("/signup/create")}
                  className="bg-transparent border-2 w-full max-w-[12%] border-secondary/60 text-secondary hover:bg-zinc-50 flex items-center justify-center p-0"
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  isLoading={formik.isSubmitting}
                  loadingText="Checking details..."
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>

              <div className="text-center pt-7">
                <p className="text-secondary font-medium text-base">
                  Already have an account?{" "}
                  <span
                    onClick={() => {
                      router.push("/login");
                    }}
                    className="font-semibold underline hover:opacity-80 transition-all cursor-pointer inline-block"
                  >
                    Sign in
                  </span>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
