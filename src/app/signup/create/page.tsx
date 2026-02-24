"use client";

import { useEffect, useState, useRef } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ChevronDown, Search, Mail } from "lucide-react";
import { Input, Button } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api-error";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Country as CSC } from "country-state-city";
import {
  AsYouType,
  parsePhoneNumberFromString,
  CountryCode,
} from "libphonenumber-js";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCreateData } from "@/store/signupSlice";

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
  const [countries, setCountries] = useState<Country[]>([]);
  const [searchPhoneCountry, setSearchPhoneCountry] = useState("");
  const [showPhoneCountryList, setShowPhoneCountryList] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState<Country | null>(null);

  const phoneRef = useRef<HTMLDivElement>(null);

  const formik = useFormik({
    initialValues: {
      organisation: createState.organisation || "",
      email: createState.email || "",
      phoneNumber: createState.phoneNumber || "",
      phoneCountryIso: createState.phoneCountryIso || "GB",
    },
    validationSchema: Yup.object({
      organisation: Yup.string().required("Organisation Name is required"),
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required")
        .test(
          "is-company-email",
          "Personal email addresses are not allowed. Please use your company email",
          function (value) {
            if (!value) return false;
            const personalDomains = [
              "gmail.com",
              "yahoo.com",
              "hotmail.com",
              "outlook.com",
              "aol.com",
              "icloud.com",
              "mail.com",
              "protonmail.com",
              "yandex.com",
              "zoho.com",
              "gmx.com",
              "live.com",
              "msn.com",
              "yahoo.co.uk",
              "yahoo.co.in",
              "googlemail.com",
            ];
            const domain = value.split("@")[1]?.toLowerCase();
            return !personalDomains.includes(domain);
          },
        ),
      phoneNumber: Yup.string()
        .required("Phone Number is required")
        .test(
          "is-valid-phone",
          "Invalid phone number format",
          function (value) {
            if (!value) return false;
            const { phoneCountryIso } = this.parent;
            const phoneNumber = parsePhoneNumberFromString(
              value,
              (phoneCountryIso as CountryCode) || "GB",
            );
            return phoneNumber ? phoneNumber.isValid() : false;
          },
        ),
    }),
    onSubmit: async (values, { setSubmitting, setStatus }) => {
      try {
        const dialCode = getDialCode(phoneCountry);

        dispatch(
          setCreateData({
            organisation: values.organisation,
            email: values.email,
            phoneNumber: values.phoneNumber,
            phoneCountryIso: values.phoneCountryIso,
            phoneDialCode: dialCode,
            contact_no: `${dialCode}-${values.phoneNumber}`,
          }),
        );

        router.push("/signup/organisation-info");
      } catch (err: unknown) {
        console.error("Submission error:", err);
        setStatus({ error: getApiErrorMessage(err, "Submission failed") });
        setSubmitting(false);
      }
    },
    validateOnBlur: true,
    validateOnChange: true,
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const isoCode = (phoneCountry?.cca2 as CountryCode) || "GB";
    const formatter = new AsYouType(isoCode);
    const formattedValue = formatter.input(input);
    formik.setFieldValue("phoneNumber", formattedValue);
  };

  const getDialCode = (c: Country | null) => {
    if (!c) return "";
    let root = c.idd.root || "";
    const suffix = c.idd.suffixes?.[0] || "";
    if (root && !root.startsWith("+")) root = "+" + root;
    return root + suffix;
  };

  useEffect(() => {
    const fetchCountries = () => {
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
    if (countries.length === 0) return;
    const iso = formik.values.phoneCountryIso || "GB";
    const selected = countries.find((c) => c.cca2 === iso);
    const fallback = countries.find((c) => c.cca2 === "GB") || countries[0];
    const toUse = selected || fallback;
    if (toUse && (!phoneCountry || phoneCountry.cca2 !== toUse.cca2)) {
      setPhoneCountry(toUse);
    }
    setTimeout(() => setIsHydrated(true), 100);
  }, [countries, formik.values.phoneCountryIso, phoneCountry]);

  useEffect(() => {
    if (!isHydrated) return;
    dispatch(
      setCreateData({
        organisation: formik.values.organisation,
        email: formik.values.email,
        phoneNumber: formik.values.phoneNumber,
        phoneCountryIso: formik.values.phoneCountryIso,
      }),
    );
  }, [dispatch, formik.values, isHydrated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (phoneRef.current && !phoneRef.current.contains(event.target as Node))
        setShowPhoneCountryList(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
              const isActive = step.id === 1;
              const isPast = step.id < 1;
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
        <div className="flex w-full flex-col justify-center rounded-4xl md:rounded-3xl bg-white px-5 py-8 md:p-12 short-laptop:p-5 shadow-2xl lg:h-[90%] lg:w-1/2 relative">
          <div className="mx-auto w-full max-w-lg">
            <div className="mb-7 text-center lg:text-left">
              <h2 className="text-2xl font-semibold text-secondary mb-0">
                Create your account
              </h2>
              <p className="text-base text-gray">
                Create your account and begin the certification process.
              </p>
            </div>

            <form
              onSubmit={formik.handleSubmit}
              className="space-y-0 short-laptop:space-y-0"
            >
              {/* Organisation Name */}
              <div className="mb-[clamp(1rem,2vh,1.5rem)]">
                <div className="flex items-center justify-between mb-[clamp(0.25rem,1vh,0.5rem)]">
                  <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-medium text-secondary">
                    Organisation
                  </label>
                  {formik.touched.organisation &&
                    formik.errors.organisation && (
                      <span className="text-[10px] font-semibold text-red">
                        {formik.errors.organisation}
                      </span>
                    )}
                </div>
                <Input
                  className="short-laptop:h-10 rounded-lg short-laptop:text-base"
                  placeholder="Enter Your Organisation Name"
                  {...formik.getFieldProps("organisation")}
                  error={
                    formik.touched.organisation && !!formik.errors.organisation
                  }
                />
              </div>

              {/* Business Email */}
              <div className="mb-[clamp(1rem,2vh,1.5rem)]">
                <div className="flex items-center justify-between mb-[clamp(0.25rem,1vh,0.5rem)]">
                  <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-medium text-secondary">
                    Email
                  </label>
                  {formik.touched.email && formik.errors.email && (
                    <span className="text-[10px] font-semibold text-red">
                      {formik.errors.email}
                    </span>
                  )}
                </div>
                <Input
                  className="short-laptop:h-10 short-laptop:text-base"
                  type="email"
                  placeholder="Enter Your Email"
                  icon={<Mail className="w-5 h-5 text-zinc-400" />}
                  {...formik.getFieldProps("email")}
                  error={formik.touched.email && !!formik.errors.email}
                />
                <p className="mt-2 font-light text-xs text-gray text-left">
                  Only company email addresses are accepted (e.g.,
                  name@yourcompany.com). Personal emails like Gmail or Yahoo are
                  not allowed.
                </p>
              </div>

              {/* Phone Number */}
              <div className="mb-[clamp(1rem,2vh,1.5rem)]">
                <div className="flex items-center justify-between mb-[clamp(0.25rem,1vh,0.5rem)]">
                  <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary">
                    Phone Number
                  </label>
                  {formik.touched.phoneNumber && formik.errors.phoneNumber && (
                    <span className="text-[10px] font-semibold text-red">
                      {formik.errors.phoneNumber}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-3 h-14 short-laptop:h-10 w-full">
                    <div className="relative min-w-20" ref={phoneRef}>
                      <div
                        onClick={() =>
                          setShowPhoneCountryList(!showPhoneCountryList)
                        }
                        className="h-full w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/30 cursor-pointer hover:border-zinc-300 transition-all shadow-sm"
                      >
                        {phoneCountry && (
                          <div className="relative w-8 h-5 overflow-hidden rounded-sm shadow-sm ring-1 ring-zinc-100">
                            <Image
                              src={phoneCountry.flags.svg}
                              alt={phoneCountry.cca2}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      </div>
                      <AnimatePresence>
                        {showPhoneCountryList && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute z-100 left-0 mt-2 w-72 max-w-[calc(100vw-40px)] bg-white border border-zinc-100 rounded-2xl shadow-2xl p-2"
                          >
                            <div className="p-2 border-b border-zinc-50 flex items-center">
                              <Search className="w-4 h-4 text-zinc-400 mr-2" />
                              <input
                                type="text"
                                placeholder="Search country..."
                                className="w-full text-base outline-none px-1 h-8"
                                value={searchPhoneCountry}
                                onChange={(e) =>
                                  setSearchPhoneCountry(e.target.value)
                                }
                              />
                            </div>
                            <div className="max-h-32 overflow-y-auto p-1 scrollbar-hide">
                              {countries
                                .filter((c) =>
                                  c.name.common
                                    .toLowerCase()
                                    .includes(searchPhoneCountry.toLowerCase()),
                                )
                                .map((c) => (
                                  <button
                                    key={c.cca2}
                                    type="button"
                                    onClick={() => {
                                      setPhoneCountry(c);
                                      formik.setFieldValue(
                                        "phoneCountryIso",
                                        c.cca2,
                                      );
                                      setShowPhoneCountryList(false);
                                    }}
                                    className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-base hover:bg-zinc-50 text-secondary transition-colors"
                                  >
                                    <div className="relative w-6 h-4 overflow-hidden rounded-sm ring-1 ring-zinc-100 shrink-0">
                                      <Image
                                        src={c.flags.svg}
                                        alt={c.name.common}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                    <span className="truncate flex-1">
                                      {c.name.common}
                                    </span>
                                    <span className="text-xs text-zinc-400 font-semibold">
                                      +{getDialCode(c).replace("+", "")}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div
                      className={`flex-1 h-full relative overflow-hidden flex items-center rounded-xl border ${formik.touched.phoneNumber && formik.errors.phoneNumber ? "border-red" : "border-zinc-100"} bg-zinc-50/30 shadow-sm focus-within:border-secondary transition-all`}
                    >
                      <div className="pl-4 pr-1 flex items-center pointer-events-none select-none">
                        <span className="text-base short-laptop:text-base font-semibold text-secondary">
                          {getDialCode(phoneCountry)}
                        </span>
                        <span className="ml-1 text-zinc-300 font-light">-</span>
                      </div>
                      <input
                        type="text"
                        placeholder="123 456 789"
                        autoComplete="tel"
                        {...formik.getFieldProps("phoneNumber")}
                        onChange={(e) => {
                          formik.handleChange(e);
                          handlePhoneChange(e);
                        }}
                        className="flex-1 h-full bg-transparent outline-none pl-2 pr-4 text-base short-laptop:text-base font-medium text-secondary placeholder:text-zinc-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {formik.status?.error && (
                <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-lg text-center">
                  <p className="text-sm font-semibold text-red">
                    {formik.status.error}
                  </p>
                </div>
              )}

              {/* API and Validation Error Display */}
              {((formik.submitCount > 0 && !formik.isValid) ||
                formik.status?.error) && (
                <div className="mb-4 text-center bg-red/5 p-3 rounded-xl border border-red/20">
                  <p className="text-xs font-semibold text-red">
                    {formik.status?.error ||
                      "Please complete all fields correctly above."}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-0 flex items-center gap-4">
                <Button
                  type="submit"
                  variant="secondary"
                  isLoading={formik.isSubmitting}
                  loadingText="Checking details..."
                >
                  Continue
                </Button>
              </div>

              <div className="text-center pt-6">
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
