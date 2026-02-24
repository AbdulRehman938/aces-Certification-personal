"use client";

import { useEffect, useState, useRef } from "react";
import {
  ChevronLeft,
  Clock,
  MapPin,
  Users,
  Check,
  X,
  FileText,
  Shield,
  Eye,
  CreditCard,
  ChevronRight,
  Search,
  ChevronDown,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui";
import { axiosInstance } from "@/lib/axios";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import "@/styles/scrollbar-invisible.css";
import { StripePaymentModal } from "@/components/StripePaymentModal";
import { Country, State, City } from "country-state-city";
import {
  FaBuilding,
  FaCheckCircle,
  FaGlobe,
  FaMapMarkerAlt,
  FaEnvelope,
  FaUser,
  FaCity,
} from "react-icons/fa";

const SearchableDropdown = ({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Select...",
}: {
  label: string;
  icon?: any;
  options: { name: string; isoCode?: string }[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedOption = options.find(
    (opt) => (opt.isoCode || opt.name) === value,
  );

  return (
    <div className="form-field-wrapper relative" ref={dropdownRef}>
      <label className="form-label">{label}</label>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`form-dropdown-trigger cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${isOpen ? "ring-2 ring-secondary/10" : ""}`}
      >
        <span
          className={`block truncate ${selectedOption ? "text-secondary" : "text-gray/50"}`}
        >
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown
          className={`shrink-0 w-4 h-4 text-gray/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 max-h-56 overflow-y-auto rounded-xl border border-light-gray-2 bg-primary shadow-[0_10px_30px_rgba(0,0,0,0.12)] scrollbar-hide"
          >
            <div className="sticky top-0 z-10 bg-primary px-2 pt-2 pb-1.5 border-b border-light-gray-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray/40" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-select-search pl-9"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto scrollbar-hide">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.isoCode || opt.name}
                    onClick={() => {
                      onChange(opt.isoCode || opt.name);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`form-dropdown-item ${
                      value === (opt.isoCode || opt.name)
                        ? "form-dropdown-item-active"
                        : "form-dropdown-item-inactive"
                    }`}
                  >
                    {opt.name}
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-gray-400">
                  No results found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CertificateDetailsProps {
  onBack: () => void;
  certificateId: string;
  certificateCode: string;
}

export function CertificateDetails({
  onBack,
  certificateId,
  certificateCode,
}: CertificateDetailsProps) {
  const [certificate, setCertificate] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showBillingResetConfirm, setShowBillingResetConfirm] = useState(false);
  const [showEligibilityErrorModal, setShowEligibilityErrorModal] =
    useState(false);

  const [branches, setBranches] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [assessmentType, setAssessmentType] = useState<
    "self_disclosure" | "assured"
  >("self_disclosure");
  const [statusAction, setStatusAction] = useState<"assured" | "view">("view");

  const [isBranchesLoading, setIsBranchesLoading] = useState(false);
  const [isMethodsLoading, setIsMethodsLoading] = useState(false);
  const [isTypeLoading, setIsTypeLoading] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    any | null
  >(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [orgProfile, setOrgProfile] = useState<any>(null);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [stripeCustomerId, setStripeCustomerId] = useState<string>("");
  const [eligibilityData, setEligibilityData] = useState<any | null>(null);

  const [billingDetails, setBillingDetails] = useState({
    name: "",
    email: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  });

  const billingHasData = Object.values(billingDetails).some(
    (val) => val !== "",
  );

  const resetBillingDetails = () =>
    setBillingDetails({
      name: "",
      email: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
    });

  const router = useRouter();
  const pathname = usePathname();
  const isEmployee = pathname.startsWith("/employee");
  const base = isEmployee ? "/employee" : "/applicant";

  useEffect(() => {
    if (orgProfile) {
      setBillingDetails((prev) => ({
        ...prev,
        name: orgProfile.name || prev.name,
        email: orgProfile.email || prev.email,
        address_line1: orgProfile.address || prev.address_line1,
        city: orgProfile.city || prev.city,
        state: orgProfile.state || prev.state,
        postal_code: orgProfile.postal_code || prev.postal_code,
        country: orgProfile.country || prev.country,
      }));
      if (orgProfile.stripe_customer_id) {
        setStripeCustomerId(orgProfile.stripe_customer_id);
      }
    }
  }, [orgProfile]);

  useEffect(() => {
    if (billingDetails.country) {
      setStates(State.getStatesOfCountry(billingDetails.country));
      setCities([]);
    }
  }, [billingDetails.country]);

  useEffect(() => {
    if (billingDetails.country && billingDetails.state) {
      setCities(
        City.getCitiesOfState(billingDetails.country, billingDetails.state),
      );
    }
  }, [billingDetails.state, billingDetails.country]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setBillingDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleDropdownChange = (name: string, value: string) => {
    setBillingDetails((prev) => ({ ...prev, [name]: value }));
  };

  const fetchMethods = async (preferredId?: string) => {
    setIsMethodsLoading(true);
    try {
      const response = await axiosInstance.get("/payments/payment-methods");
      const data = response?.data?.data || [];
      console.log("💳 [Details] Fetched Saved Payment Methods:", {
        count: data.length,
        methods: data.map((m: any) => ({
          id: m.id,
          stripe_pm_id: m.stripe_payment_method_id,
          last4: m.card_last4,
          is_default: m.is_default,
        })),
      });
      setPaymentMethods(data);

      let methodToSelect = null;

      if (preferredId) {
        methodToSelect = data.find(
          (m: any) => m.stripe_payment_method_id === preferredId,
        );
      }

      if (!methodToSelect) {
        methodToSelect = data.find((m: any) => m.is_default);
      }

      if (!methodToSelect && data.length > 0) {
        methodToSelect = data[0];
      }

      if (methodToSelect) {
        setSelectedPaymentMethod(methodToSelect);
      }
    } catch (err) {
      console.error("Failed to fetch payment methods", err);
    } finally {
      setIsMethodsLoading(false);
    }
  };

  useEffect(() => {
    const isAnyModalOpen =
      showModal ||
      showTypeModal ||
      showConfirmModal ||
      showPaymentModal ||
      showSummaryModal ||
      showSuccessModal ||
      showBillingModal ||
      showStripeModal ||
      showEligibilityErrorModal;

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [
    showModal,
    showTypeModal,
    showConfirmModal,
    showPaymentModal,
    showSummaryModal,
    showSuccessModal,
    showBillingModal,
    showStripeModal,
    showEligibilityErrorModal,
  ]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchDetails = async () => {
      try {
        setError(null);

        const response = await axiosInstance.get(
          `/certificates/${certificateId}`,
        );

        const data = response?.data?.data ?? response?.data;
        if (isMounted) {
          setCertificate(data);
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load certificate details. Please try again.");
        }
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [certificateId]);

  useEffect(() => {
    if (showModal) {
      const fetchBranches = async () => {
        setIsBranchesLoading(true);
        try {
          const response = await axiosInstance.get("/branches/list");
          const data = response?.data?.data || [];
          setBranches(data);
          if (data.length > 0 && !selectedBranchId) {
            setSelectedBranchId(data[0].id);
          }
        } catch (err) {
          console.error("Failed to fetch branches", err);
        } finally {
          setIsBranchesLoading(false);
        }
      };
      fetchBranches();
    }
  }, [showModal]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get("/organization/profile");
        const data = response?.data?.data || response?.data;
        setOrgProfile(data);
      } catch (err) {
        console.error("Failed to fetch organization profile", err);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (showPaymentModal) {
      fetchMethods();
    }
  }, [showPaymentModal]);

  const handleConfirmAndPay = async () => {
    if (!selectedPaymentMethod || !certificate || !selectedBranch) return;

    setIsConfirmingPayment(true);
    setPaymentError(null);

    try {
      // Step 1: Create intent
      const intentResponse = await axiosInstance.post(
        "/payments/stripe/create-intent",
        {
          certificate_id: certificate.id,
          payment_type: assessmentType,
          save_payment_method: true,
          billing_details: {
            name: orgProfile?.name || "",
            email: orgProfile?.email || "",
            address_line1: orgProfile?.address || "",
            address_line2: "",
            city: orgProfile?.city || "",
            state: orgProfile?.state || "",
            postal_code: orgProfile?.postal_code || "",
            country: orgProfile?.country || "",
          },
        },
      );

      if (!intentResponse.data?.success) {
        setPaymentError(
          intentResponse.data?.message || "Failed to create payment intent",
        );
        setIsConfirmingPayment(false);
        return;
      }

      const intentData = intentResponse.data.data;
      const paymentId = intentData.payment_id || intentData.id;

      console.log("🔄 [Details] Confirming Payment Intent:", {
        paymentId,
        paymentMethodId: selectedPaymentMethod.stripe_payment_method_id,
        paymentMethodIdFormat:
          selectedPaymentMethod.stripe_payment_method_id?.substring(0, 3),
      });

      const confirmResponse = await axiosInstance.post(
        `/payments/${paymentId}/stripe/confirm`,
        {
          payment_method_id: selectedPaymentMethod.stripe_payment_method_id,
          off_session: false,
        },
      );

      if (!confirmResponse.data?.success) {
        setPaymentError(
          confirmResponse.data?.message || "Payment confirmation failed",
        );
        setIsConfirmingPayment(false);
        return;
      }

      const assessmentIdFromConfirm = confirmResponse.data?.data?.assessment_id;

      const statusResponse = await axiosInstance.get(
        `/payments/${paymentId}/stripe/status`,
      );
      const status =
        statusResponse.data.data?.status || statusResponse.data.status;

      if (status === "succeeded") {
        let assessmentId =
          assessmentIdFromConfirm || statusResponse.data.data?.assessment_id;

        try {
          const createAssessmentRes = await axiosInstance.post("/assessments", {
            certificate_id: certificate.id,
            payment_id: paymentId,
            assessment_type:
              assessmentType === "self_disclosure"
                ? "self_disclosure"
                : assessmentType,
            branch_id: selectedBranch.id,
          });

          if (createAssessmentRes.data?.success) {
            assessmentId = createAssessmentRes.data.data.id;
            console.log(
              "✅ [Details] Assessment created successfully:",
              assessmentId,
            );
          }
        } catch (createErr) {
          console.error(
            "❌ [Details] Failed to create assessment via API:",
            createErr,
          );
        }

        if (typeof window !== "undefined") {
          localStorage.setItem(
            "pending_assessment_ids",
            JSON.stringify({
              certificate_id: certificate.id,
              payment_id: paymentId,
              assessment_id: assessmentId,
              assessment_type: assessmentType,
            }),
          );
        }
        setShowSummaryModal(false);
        setShowSuccessModal(true);
      } else {
        setPaymentError(
          statusResponse.data?.message ||
            `Payment status: ${status}. Please contact support.`,
        );
      }
    } catch (err: any) {
      console.error("Payment failed", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Payment failed. Please try again.";
      setPaymentError(errorMessage);
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="min-h-screen bg-white p-6 font-sans lg:p-10 lg:pl-5"
      >
        <div className="mx-auto max-w-6xl space-y-8">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <ChevronLeft className="h-5 w-5" />
            Back
          </button>

          {!certificate && !error && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
            </div>
          )}

          {error && (
            <div className="p-8 text-center text-red-500">
              {error}
              <button onClick={onBack} className="block w-full mt-4 underline">
                Go Back
              </button>
            </div>
          )}

          {certificate && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-1">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                  <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
                    {certificate.name}
                  </h1>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-600 w-fit">
                    {certificate.industry_names?.[0] || "Hotel"}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-400">
                  {certificate.certificate_id}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {certificate.badges && certificate.badges.length > 0 ? (
                  certificate.badges.map((badge: any) => (
                    <span
                      key={badge.id}
                      className="rounded-full bg-zinc-100 px-6 py-2 text-sm font-medium text-gray-700"
                    >
                      {badge.name}
                    </span>
                  ))
                ) : (
                  <>
                    <span className="rounded-full bg-[#EBEBEB] px-8 py-2 text-sm font-medium text-gray-700">
                      Bronze
                    </span>
                    <span className="rounded-full bg-[#EBEBEB] px-8 py-2 text-sm font-medium text-gray-700">
                      Silver
                    </span>
                    <span className="rounded-full bg-[#EBEBEB] px-8 py-2 text-sm font-medium text-gray-700">
                      Gold
                    </span>
                    <span className="rounded-full bg-[#EBEBEB] px-8 py-2 text-sm font-medium text-gray-700">
                      Emerald
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed text-gray-500 max-w-4xl">
                {certificate.description ||
                  "The Data Protection Practitioner Certificate validates that your organisation has implemented robust data protection policies and procedures. This certification covers key areas including data handling, storage security, access controls, and incident response protocols."}
              </p>

              <div className="h-px w-full bg-zinc-100" />

              {/* Pricing */}
              <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Self-disclosure: USD {certificate.disclosure_price}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Per property, online checklist.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Assured: USD {certificate.assured_price}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Per certification, range by size and complexity.
                  </p>
                </div>
              </div>

              {/* Comparison Cards */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-100 p-6 shadow-sm">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900">
                    What is self assured
                  </h3>
                  <ul className="space-y-3">
                    {[
                      "A quick way to assess and demonstrate your ESG practices",
                      "Complete the assessment based on your internal review",
                      "Upload documents to support your responses",
                      "Fast and flexible process, completed at your own pace",
                      "Receive a self-declared ESG certificate",
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-2.5 text-xs leading-relaxed text-gray-500"
                      >
                        <span className="shrink-0 pt-1 text-[10px]">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-zinc-100 p-6 shadow-sm">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900">
                    What is assured
                  </h3>
                  <ul className="space-y-3">
                    {[
                      "A high-credibility ESG certification verified by independent experts",
                      "Independently reviewed and validated by certified auditors",
                      "All submitted documents are formally verified for accuracy",
                      "Audit confirmation significantly increases certificate credibility",
                      "Recognized as a stronger, assurance-backed ESG certification",
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-2.5 text-xs leading-relaxed text-gray-500"
                      >
                        <span className="shrink-0 pt-1 text-[10px]">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Compulsory Documents */}
              <div className="rounded-2xl border border-zinc-100 p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">
                  Compulsory documents
                </h3>
                <div className="space-y-3">
                  {certificate.compulsory_docs &&
                  certificate.compulsory_docs.length > 0
                    ? certificate.compulsory_docs.map(
                        (doc: string, i: number) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-semibold text-gray-500">
                              {i + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-500">
                              {doc}
                            </span>
                          </div>
                        ),
                      )
                    :
                      [
                        "Governance Framework",
                        "Risk Management Policy",
                        "Code of Conduct",
                        "ESG Policy Document",
                        "Organizational Structure / Org Chart",
                      ].map((doc, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-semibold text-gray-500">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-500">
                            {doc}
                          </span>
                        </div>
                      ))}
                </div>
              </div>

              {/* Timelines and Action */}
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="rounded-md bg-zinc-50 p-4 flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-[#1A1A1A] flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">
                        Audit Assured timeline
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        4-6 weeks
                      </p>
                    </div>
                  </div>
                  <div className="rounded-md bg-zinc-50 p-4 flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-[#1A1A1A] flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">
                        Self assesment timeline
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        within 2-3 minutes
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end w-full md:max-w-[25%] ml-auto mt-4 md:mt-0">
                  <Button
                    variant="secondary"
                    className="bg-[#1A1A1A] hover:bg-black text-white px-8 h-12 md:h-auto py-3 rounded-lg text-sm font-semibold transition-all w-full md:w-auto shadow-md md:shadow-none whitespace-nowrap"
                    onClick={() => {
                      setShowModal(true);
                    }}
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 pb-3">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                  Select Site for Certification
                </h2>
                <p className="text-gray text-xs font-medium">
                  Choose which branch you&apos;d like to certify
                </p>
              </div>

              <div className="px-6 py-3 overflow-y-auto grow space-y-3 scrollbar-hide">
                {isBranchesLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
                  </div>
                ) : branches.length > 0 ? (
                  branches.map((branch) => {
                    const isSelected = selectedBranchId === branch.id;
                    return (
                      <button
                        key={branch.id}
                        onClick={() => setSelectedBranchId(branch.id)}
                        className={`form-dropdown-item h-auto py-4 ${
                          isSelected
                            ? "form-dropdown-item-active"
                            : "form-dropdown-item-inactive"
                        }`}
                      >
                        <div className="flex-1 text-left">
                          <div className="flex justify-between items-start mb-1.5">
                            <h3 className="font-bold text-base">
                              {branch.name} - {branch.city}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                  isSelected
                                    ? "bg-white/10 text-white border-white/20"
                                    : "bg-zinc-100 text-gray-500 border-zinc-200"
                                }`}
                              >
                                Not started
                              </span>
                            </div>
                          </div>
                          <div
                            className={`flex items-center gap-4 ${
                              isSelected ? "text-black/60" : "text-black"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="text-base font-medium">
                                {branch.city}, {branch.country}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              <span className="text-base font-medium">
                                {branch.branch_size || "500+ employees"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-10">
                    <p className="text-[#737373] text-sm font-medium">
                      No sites found.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    router.push(`${base}/branch`);
                  }}
                  className="px-6 h-10 cursor-pointer rounded-lg border-2 border-[#E5E5E5] text-[#1A1A1A] text-xs font-bold hover:bg-gray-50 transition-all w-full sm:w-auto"
                >
                  Add Site
                </button>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-8 h-10 rounded-lg cursor-pointer border-2 border-[#E5E5E5] text-[#1A1A1A] text-xs font-bold hover:bg-gray-50 transition-all grow sm:grow-0"
                  >
                    Close
                  </button>
                  <button
                    disabled={!selectedBranchId}
                    onClick={async () => {
                      if (!selectedBranchId) return;
                      setIsTypeLoading(true);
                      setIsCheckingEligibility(true);

                      const checkEligibility = async (): Promise<any> => {
                        if (!certificateId) return { eligible: false };
                        const response = await axiosInstance.get(
                          `/certificates/${certificateId}/self-disclosure-status`,
                        );
                        const data = response.data.data || response.data;
                        return {
                          ...data,
                          eligible:
                            !!data?.isSubmitted && data?.status === "completed",
                        };
                      };

                      try {
                        const [branchResponse, eligibilityRes] =
                          await Promise.all([
                            axiosInstance.get(`/branches/${selectedBranchId}`),
                            checkEligibility(),
                          ]);

                        const branchData =
                          branchResponse?.data?.data || branchResponse?.data;
                        setEligibilityData(eligibilityRes);

                        if (!eligibilityRes?.eligible) {
                          setAssessmentType("self_disclosure");
                        }

                        if (
                          typeof window !== "undefined" &&
                          selectedBranchId &&
                          certificate
                        ) {
                          localStorage.setItem(
                            "selectedCertificateId",
                            certificate.certificate_id,
                          );
                          localStorage.setItem(
                            "selected_certificate",
                            JSON.stringify(certificate),
                          );
                          localStorage.setItem(
                            "selected_branch_id",
                            selectedBranchId,
                          );
                          localStorage.setItem(
                            "selected_branch_details",
                            JSON.stringify(branchData),
                          );
                        }

                        setSelectedBranch(branchData);
                        setShowModal(false);
                        setShowTypeModal(true);
                      } catch (err) {
                        console.error("Failed to fetch requirements", err);
                        setShowEligibilityErrorModal(true);
                      } finally {
                        setIsTypeLoading(false);
                        setIsCheckingEligibility(false);
                      }
                    }}
                    className="px-10 h-10 cursor-pointer rounded-lg bg-[#1A1A1A] text-white text-xs font-bold hover:bg-black transition-all shadow-lg shadow-black/10 grow sm:grow-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-25"
                  >
                    {isTypeLoading || isCheckingEligibility ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      "Continue"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showTypeModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 pb-3">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                  Choose Assessment Type
                </h2>
                <p className="text-gray text-xs font-medium">
                  {selectedBranch?.name || "Branch"} •{" "}
                  {selectedBranch?.address || selectedBranch?.city || ""},{" "}
                  {selectedBranch?.country || ""}
                </p>
              </div>

              <div className="px-6 py-3 space-y-5">
                <div className="flex items-start gap-2.5 p-3.5 bg-[#FFFBEB] border border-[#FEF3C7] rounded-xl mb-5">
                  <div className="shrink-0 w-5 h-5 bg-[#F59E0B] rounded-full flex items-center justify-center text-white">
                    <span className="font-bold text-xs">!</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#92400E] text-xs">
                      Recommendation
                    </h4>
                    <p className="text-[#92400E] text-[11px] font-medium opacity-80">
                      We recommend proceeding with Assured Certification for
                      higher trust and official certification
                    </p>
                  </div>
                </div>
                <div
                  onClick={() => setAssessmentType("self_disclosure")}
                  className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer group flex items-start gap-4 ${
                    assessmentType === "self_disclosure"
                      ? "border-black bg-white"
                      : "border-[#F5F5F5] bg-[#FAFAFA] hover:border-gray-200"
                  }`}
                >
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      assessmentType === "self_disclosure"
                        ? "bg-black text-white"
                        : "bg-[#F5F5F5] text-[#737373]"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A1A] text-base mb-0.5">
                      Start Self-Disclosure
                    </h3>
                    <p className="text-gray text-xs font-medium">
                      Self-reported assessment completed by your organization
                    </p>
                  </div>
                  {assessmentType === "self_disclosure" && (
                    <div className="ml-auto mt-1">
                      <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                <div
                  onClick={() =>
                    eligibilityData?.eligible && setAssessmentType("assured")
                  }
                  className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer group flex items-start gap-4 ${
                    assessmentType === "assured"
                      ? "border-black bg-white"
                      : "border-[#F5F5F5] bg-[#FAFAFA] hover:border-gray-200"
                  } ${!eligibilityData?.eligible ? "opacity-60 grayscale-[0.5] cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      assessmentType === "assured"
                        ? "bg-black text-white"
                        : "bg-[#F5F5F5] text-[#737373]"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="grow">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-bold text-[#1A1A1A] text-base">
                        Start Assured Certification
                      </h3>
                      {!eligibilityData?.eligible && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-lg text-[10px] text-red-600 font-bold border border-red-100">
                          <AlertCircle className="w-3 h-3" /> Locked
                        </div>
                      )}
                    </div>
                    <p className="text-gray text-xs font-medium">
                      Includes auditor review and management approval
                    </p>
                    {!eligibilityData?.eligible && (
                      <div className="mt-2.5 p-2 bg-red-50/50 rounded-lg border border-red-100/50">
                        <p className="text-[10px] text-red-500 font-bold leading-tight">
                          You must complete self disclosure to use assured
                          certifications
                        </p>
                      </div>
                    )}
                  </div>
                  {assessmentType === "assured" && (
                    <div className="ml-auto mt-1">
                      <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 pt-3 flex flex-col sm:flex-row items-center justify-end gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setShowTypeModal(false);
                      setShowModal(true);
                    }}
                    className="px-8 h-10 rounded-lg cursor-pointer border-2 border-[#E5E5E5] text-[#1A1A1A] text-xs font-bold hover:bg-gray-50 transition-all grow sm:grow-0"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setStatusAction(
                        assessmentType === "assured" ? "assured" : "view",
                      );
                      setShowTypeModal(false);
                      setShowConfirmModal(true);
                    }}
                    className="px-10 h-10 rounded-lg cursor-pointer bg-[#1A1A1A] text-white text-xs font-bold hover:bg-black transition-all shadow-lg shadow-black/10 grow sm:grow-0"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showConfirmModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#FBFBFB] rounded-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 pb-3">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                  Confirm Your Selection
                </h2>
                <p className="text-gray text-xs font-medium">
                  Review the details below before proceeding
                </p>
              </div>

              {/* Modal Content */}
              <div className="px-6 py-3 space-y-3 overflow-y-auto grow scrollbar-hide">
                {/* Branch Info */}
                <div className="bg-white p-4 rounded-xl border border-[#FAFAFA] shadow-sm">
                  <p className="text-gray text-[10px] font-bold tracking-wider mb-1.5">
                    Selected Branch
                  </p>
                  <h3 className="text-[#1A1A1A] font-bold text-base mb-0.5">
                    {selectedBranch?.name}
                  </h3>
                  <p className="text-gray text-xs font-medium">
                    {selectedBranch?.city}, {selectedBranch?.country}
                  </p>
                </div>

                {/* Certificate Info */}
                <div className="bg-white p-4 rounded-xl border border-[#FAFAFA] shadow-sm">
                  <p className="text-gray text-[10px] font-bold tracking-wider mb-1.5">
                    Selected Certificate
                  </p>
                  <h3 className="text-[#1A1A1A] font-bold text-base mb-0.5">
                    {certificate?.name}
                  </h3>
                  <p className="text-gray text-[11px] font-medium">
                    {certificate?.certificate_id}
                  </p>
                </div>

                {/* Type Info */}
                <div className="bg-white p-4 rounded-xl border border-[#FAFAFA] shadow-sm">
                  <p className="text-gray text-[10px] font-bold tracking-wider mb-1.5">
                    Assessment Type
                  </p>
                  <h3 className="text-[#1A1A1A] font-bold text-base">
                    {statusAction === "assured"
                      ? "Assured Certification"
                      : "Self-Disclosure"}
                  </h3>
                </div>

                {/* Amount Info (Black Card) */}
                <div className="bg-[#1A1A1A] p-5 rounded-xl text-white shadow-xl shadow-black/10">
                  <p className="text-white/60 text-[10px] font-bold tracking-wider mb-1.5">
                    Total Amount
                  </p>
                  <h3 className="text-xl font-bold mb-1">
                    USD{" "}
                    {statusAction === "assured"
                      ? certificate?.assured_price
                      : certificate?.disclosure_price}
                  </h3>
                  <p className="text-white/60 text-[10px] font-medium">
                    {statusAction === "assured"
                      ? "Includes auditor & management review"
                      : "Standard online assessment"}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 pt-3 flex flex-col sm:flex-row items-center justify-end gap-3 bg-white/50 backdrop-blur-sm border-t border-[#F0F0F0]">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setShowConfirmModal(false);
                      setShowTypeModal(true);
                    }}
                    className="px-8 h-10 rounded-lg cursor-pointer border-2 border-[#E5E5E5] text-[#1A1A1A] text-xs font-bold hover:bg-gray-50 transition-all grow sm:grow-0"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (
                        typeof window !== "undefined" &&
                        selectedBranchId &&
                        certificate
                      ) {
                        localStorage.setItem(
                          "selectedCertificateId",
                          certificate.certificate_id,
                        );
                        localStorage.setItem(
                          "selected_certificate",
                          JSON.stringify(certificate),
                        );
                        localStorage.setItem(
                          "selected_branch_id",
                          selectedBranchId,
                        );
                        localStorage.setItem("paymentType", assessmentType);
                      }
                      setShowConfirmModal(false);
                      setShowPaymentModal(true);
                    }}
                    className="px-10 h-10 cursor-pointer rounded-lg bg-[#1A1A1A] text-white text-xs font-bold hover:bg-black transition-all shadow-lg grow sm:grow-0"
                  >
                    Proceed to Payment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showPaymentModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-bold text-[#1A1A1A]">
                    Payment Methods
                  </h2>
                </div>
                <p className="text-gray text-xs font-medium">
                  Select your preferred way to pay
                </p>
              </div>

              {/* Modal Content */}
              <div className="px-6 py-3 space-y-2.5 overflow-y-auto grow scrollbar-hide">
                {isMethodsLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F5F5F5] border-t-black" />
                    <p className="text-gray text-xs font-medium animate-pulse">
                      Fetching your payment methods...
                    </p>
                  </div>
                ) : paymentMethods.length > 0 ? (
                  <div className="space-y-2">
                    {paymentMethods.map((method) => {
                      const isSelected =
                        selectedPaymentMethod?.id === method.id;
                      return (
                        <button
                          key={method.id}
                          onClick={() => setSelectedPaymentMethod(method)}
                          className={`form-dropdown-item cursor-pointer w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            isSelected
                              ? "border-black bg-black text-white"
                              : "border-gray-200 bg-white hover:border-gray-300 text-black"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-white/10 text-white"
                                : "bg-gray-100 text-secondary"
                            }`}
                          >
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="font-bold text-sm mb-0.5 capitalize">
                              {method.metadata?.nickname ||
                                method.card_brand ||
                                "Card"}
                            </h4>
                            <p
                              className={`text-[11px] font-medium ${isSelected ? "text-white/60" : "text-black/60"}`}
                            >
                              •••• •••• •••• {method.card_last4}
                            </p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? "border-white bg-white"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-2.5 h-2.5 text-secondary" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => {
                        setShowPaymentModal(false);
                        setShowBillingModal(true);
                      }}
                      className="w-full h-14 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 text-gray-500 hover:text-black hover:border-black hover:bg-gray-50 transition-all cursor-pointer font-bold text-xs"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Card
                    </button>
                  </div>
                ) : (
                  <div className="py-10 border-2 border-dashed border-[#F0F0F0] rounded-2xl flex flex-col items-center text-center px-4">
                    <div className="w-12 h-12 rounded-full bg-[#FAFAFA] flex items-center justify-center mb-3">
                      <CreditCard className="w-6 h-6 text-[#D0D0D0]" />
                    </div>
                    <h3 className="text-base font-bold text-[#1A1A1A] mb-1">
                      No Payment Methods
                    </h3>
                    <p className="text-gray text-xs font-medium mb-6 max-w-50">
                      You haven&apos;t added any payment methods to your profile
                      yet.
                    </p>
                    <button
                      onClick={() => {
                        setShowPaymentModal(false);
                        setShowBillingModal(true);
                      }}
                      className="w-full h-10 rounded-lg bg-[#1A1A1A] cursor-pointer text-white text-xs font-bold hover:bg-black transition-all shadow-lg"
                    >
                      Add Payment Method
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#F0F0F0]">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setShowConfirmModal(true);
                  }}
                  className="px-6 h-10 cursor-pointer rounded-lg border-2 border-[#E5E5E5] text-[#1A1A1A] text-xs font-bold hover:bg-gray-50 transition-all w-full sm:w-auto"
                >
                  Back
                </button>
                <button
                  disabled={
                    !selectedPaymentMethod || paymentMethods.length === 0
                  }
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      localStorage.setItem(
                        "selected_payment_method",
                        JSON.stringify(selectedPaymentMethod),
                      );
                    }
                    setShowPaymentModal(false);
                    setShowSummaryModal(true);
                  }}
                  className="px-10 h-10 cursor-pointer rounded-lg bg-[#1A1A1A] text-white text-xs font-bold hover:bg-black transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showSummaryModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Content */}
              <div className="p-6 pb-3">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                  Payment Summary
                </h2>
                <p className="text-gray text-xs font-medium">
                  Review the details below before proceeding
                </p>
              </div>

              <div className="px-6 py-3 space-y-4 overflow-y-auto grow scrollbar-hide">
                {/* Details Box */}
                <div className="p-4 rounded-xl bg-[#FAFAFA] space-y-3">
                  <div className="space-y-0.5">
                    <p className="text-gray text-[10px] font-bold tracking-wider">
                      Organization
                    </p>
                    <p className="text-[#1A1A1A] font-bold text-sm">
                      {orgProfile?.name || "Acme Corporation"}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-gray text-[10px] font-bold tracking-wider">
                      Branch
                    </p>
                    <p className="text-[#1A1A1A] font-bold text-sm">
                      {selectedBranch?.name || "Headquarters - New York"}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-gray text-[10px] font-bold tracking-wider">
                      Certificate
                    </p>
                    <p className="text-[#1A1A1A] font-bold text-sm">
                      {certificate?.name ||
                        "Environmental Sustainability Standard"}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-gray text-[10px] font-bold tracking-wider">
                      Assessment Type
                    </p>
                    <p className="text-[#1A1A1A] font-bold text-sm">
                      {statusAction === "assured"
                        ? "Assured Certification"
                        : "Self-Disclosure"}
                    </p>
                  </div>
                </div>

                {/* Amount Box */}
                <div className="bg-[#1A1A1A] p-4 rounded-xl flex items-center justify-between text-white">
                  <span className="text-xs font-bold">Total Amount</span>
                  <span className="text-base font-bold">
                    USD{" "}
                    {statusAction === "assured"
                      ? certificate?.assured_price?.toLocaleString() ||
                        "3,500–6,000"
                      : certificate?.disclosure_price?.toLocaleString() ||
                        "1,500"}
                  </span>
                </div>

                {/* Card Info Box */}
                <div className="p-4 rounded-xl bg-[#FAFAFA] space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-gray text-xs font-medium">
                      Cardholder Name
                    </p>
                    <p className="text-[#1A1A1A] font-bold text-sm capitalize">
                      {orgProfile?.name || "John wick"}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-gray text-xs font-medium">Card Number</p>
                    <p className="text-[#1A1A1A] font-bold text-sm">
                      •••• •••• ••••{" "}
                      {selectedPaymentMethod?.card_last4 || "4567"}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-gray text-xs font-medium">Expiry Date</p>
                    <p className="text-[#1A1A1A] font-bold text-sm">
                      {selectedPaymentMethod?.card_exp_month
                        ?.toString()
                        .padStart(2, "0")}
                      /{selectedPaymentMethod?.card_exp_year || "2026"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 pt-3 flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowSummaryModal(false);
                    setShowPaymentModal(true);
                  }}
                  className="grow h-11 cursor-pointer rounded-xl border-2 border-[#E5E5E5] text-[#1A1A1A] text-sm font-bold hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
                <button
                  disabled={isConfirmingPayment}
                  onClick={handleConfirmAndPay}
                  className="grow h-11 cursor-pointer rounded-xl bg-[#1A1A1A] text-white text-sm font-bold hover:bg-black transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isConfirmingPayment ? (
                    <>
                      <div className="w-5 h-5 border-2 cursor-pointer border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm & Pay"
                  )}
                </button>
              </div>
              {paymentError && (
                <div className="px-8 pb-4 text-center">
                  <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-xl border border-red-100 italic">
                    {paymentError}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-4xl shadow-2xl p-6 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-5">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-1.5">
                Payment Successful!
              </h2>
              <p className="text-gray text-xs font-medium mb-6">
                Your payment for {certificate?.name} has been processed
                successfully. You can now start the assessment.
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push(`${base}/assessment`);
                }}
                className="w-full h-11 rounded-xl cursor-pointer bg-[#1A1A1A] text-white text-sm font-bold hover:bg-black transition-all shadow-xl shadow-black/20"
              >
                Continue to Assessment
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Billing Details Modal */}
      <AnimatePresence>
        {showBillingModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setShowBillingModal(false);
                setShowPaymentModal(true);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-4xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-secondary">
                    Billing Details
                  </h2>
                  <p className="text-gray text-xs font-semibold mt-1">
                    Please enter your billing information
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBillingModal(false);
                    setShowPaymentModal(true);
                  }}
                  className="p-2 hover:bg-light-gray rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-8 py-4 overflow-y-auto scrollbar-hide">
                <div className="space-y-6">
                  {apiError && (
                    <div className="p-4 rounded-xl bg-dull-red text-red flex items-start gap-3 text-xs font-bold border border-red/10">
                      <div className="shrink-0 w-5 h-5 bg-red rounded-full flex items-center justify-center text-white">
                        <span className="text-[10px]">!</span>
                      </div>
                      <p>{apiError}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-field-wrapper">
                        <label className="form-label">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={billingDetails.name}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="form-field-wrapper">
                        <label className="form-label">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={billingDetails.email}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div className="form-field-wrapper">
                      <label className="form-label">Address Line 1</label>
                      <input
                        type="text"
                        name="address_line1"
                        value={billingDetails.address_line1}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div className="form-field-wrapper">
                      <label className="form-label">
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        name="address_line2"
                        value={billingDetails.address_line2}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Apt, Suite, Unit, etc."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="scrollbar-invisible">
                        <SearchableDropdown
                          label="Country"
                          options={Country.getAllCountries()}
                          value={billingDetails.country}
                          onChange={(val) =>
                            handleDropdownChange("country", val)
                          }
                          placeholder="Select Country"
                        />
                      </div>
                      <div className="scrollbar-invisible">
                        <SearchableDropdown
                          label="State / Province"
                          options={states}
                          value={billingDetails.state}
                          onChange={(val) => handleDropdownChange("state", val)}
                          disabled={!billingDetails.country}
                          placeholder="Select State"
                        />
                      </div>
                      <div className="scrollbar-invisible">
                        <SearchableDropdown
                          label="City"
                          options={cities}
                          value={billingDetails.city}
                          onChange={(val) => handleDropdownChange("city", val)}
                          disabled={!billingDetails.state}
                          placeholder="Select City"
                        />
                      </div>
                      <div className="form-field-wrapper">
                        <label className="form-label">Postal Code</label>
                        <input
                          type="text"
                          name="postal_code"
                          value={billingDetails.postal_code}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="ZIP Code"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 pt-4 flex justify-end gap-3 mt-auto">
                <button
                  onClick={() => {
                    if (billingHasData) {
                      setShowBillingResetConfirm(true);
                    } else {
                      setShowBillingModal(false);
                      setShowPaymentModal(true);
                    }
                  }}
                  className="px-6 h-11 rounded-xl border-2 border-light-gray-2 text-secondary text-sm font-bold hover:bg-light-gray transition-all cursor-pointer"
                >
                  Cancel
                </button>
                {/* Billing Reset Confirmation Modal */}
                <AnimatePresence>
                  {showBillingResetConfirm && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowBillingResetConfirm(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center"
                      >
                        <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-100">
                          <AlertCircle className="w-8 h-8 text-yellow-500" />
                        </div>
                        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">
                          Reset Billing Details?
                        </h2>
                        <p className="text-[#737373] text-sm font-medium mb-6 leading-relaxed">
                          Your progress will be reset. Are you sure you want to
                          cancel and clear all billing details?
                        </p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => setShowBillingResetConfirm(false)}
                            className="px-6 py-2 rounded-xl border-2 border-light-gray-2 text-secondary text-sm font-bold hover:bg-light-gray transition-all cursor-pointer"
                          >
                            No, Go Back
                          </button>
                          <button
                            onClick={() => {
                              resetBillingDetails();
                              setShowBillingResetConfirm(false);
                              setShowBillingModal(false);
                              setShowPaymentModal(true);
                            }}
                            className="px-6 py-2 rounded-xl bg-secondary text-white text-sm font-bold hover:bg-black transition-all cursor-pointer"
                          >
                            Yes, Reset & Close
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
                <button
                  onClick={() => {
                    setShowBillingModal(false);
                    setShowStripeModal(true);
                  }}
                  className="px-8 h-11 rounded-xl bg-secondary text-white text-sm font-bold hover:bg-black transition-all shadow-xl shadow-black/20 disabled:opacity-50 cursor-pointer"
                  disabled={
                    !billingDetails.name ||
                    !billingDetails.email ||
                    !billingDetails.country
                  }
                >
                  Proceed to Card Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stripe Payment Modal */}
      <StripePaymentModal
        isOpen={showStripeModal}
        paymentIntentId=""
        clientSecret=""
        stripeCustomerId={stripeCustomerId}
        amount={0}
        currency="USD"
        billingDetails={{
          name: billingDetails.name,
          email: billingDetails.email,
          address_line1: billingDetails.address_line1,
          address_line2: billingDetails.address_line2,
          city: billingDetails.city,
          state: billingDetails.state,
          postal_code: billingDetails.postal_code,
          country: billingDetails.country,
        }}
        existingMethods={paymentMethods}
        onSuccess={(card) => {
          setShowStripeModal(false);
          fetchMethods(card.id);
          setShowPaymentModal(true);
        }}
        onCancel={() => {
          setShowStripeModal(false);
          setShowPaymentModal(true);
        }}
        onError={(error) => {
          console.error("Payment error:", error);
          setApiError(error);
          setShowStripeModal(false);
          setShowPaymentModal(true);
        }}
      />

      {/* Eligibility Error Modal */}
      <AnimatePresence>
        {showEligibilityErrorModal && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowEligibilityErrorModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">
                Authentication Error
              </h2>
              <p className="text-[#737373] text-sm font-medium mb-6 leading-relaxed">
                We encountered an issue while verifying your eligibility. Please
                sign in again or contact support if the problem persists.
              </p>
              <button
                onClick={() => setShowEligibilityErrorModal(false)}
                className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
