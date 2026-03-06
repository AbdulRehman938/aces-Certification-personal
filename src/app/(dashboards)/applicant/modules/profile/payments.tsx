"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Download,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  Search,
  RefreshCw,
  FileText,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosInstance } from "@/lib/axios";
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
import { StripePaymentModal } from "@/components/StripePaymentModal";

const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "bg-zinc-50 rounded-4xl border border-dull-white/50 shadow-sm p-5 lg:p-8",
      className,
    )}
  >
    {children}
  </div>
);

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

const SearchableDropdown = ({
  label,
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Select...",
}: {
  label: string;
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
        className={`form-dropdown-trigger h-12 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`block truncate ${selectedOption ? "text-secondary" : "text-gray-400"}`}
        >
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown
          className={`shrink-0 w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-gray-50 sticky top-0 bg-white">
              <div className="relative">
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
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.isoCode || opt.name}
                    onClick={() => {
                      onChange(opt.isoCode || opt.name);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`form-dropdown-item ${value === (opt.isoCode || opt.name) ? "form-dropdown-item-active" : "form-dropdown-item-inactive"}`}
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

export function PaymentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isEmployee = pathname.startsWith("/employee");
  const base = isEmployee ? "/employee" : "/applicant";
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const triggerPayment = searchParams.get("triggerPayment");
  const assessmentSubmitted = searchParams.get("assessmentSubmitted");

  useEffect(() => {
    if (triggerPayment === "true") {
      setShowStripeModal(true);
    }
  }, [triggerPayment]);

  useEffect(() => {
    if (assessmentSubmitted === "true") {
      setShowUnderReviewModal(true);
    }
  }, [assessmentSubmitted]);

  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [showPaymentTypeModal, setShowPaymentTypeModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showMethodSelectModal, setShowMethodSelectModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showUnderReviewModal, setShowUnderReviewModal] = useState(false);
  const [intentData, setIntentData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<"self_disclosure" | "assured">(
    "self_disclosure",
  );
  const [selectedSavedMethod, setSelectedSavedMethod] = useState<string | null>(
    null,
  );

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

  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [eligibilityData, setEligibilityData] = useState<any | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);

  const [savedMethods, setSavedMethods] = useState<any[]>([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof window !== "undefined") {
      const storedCert = localStorage.getItem("selected_certificate");
      if (storedCert) {
        try {
          const cert = JSON.parse(storedCert);
          setSelectedCertificate(cert);
        } catch (e) {
          console.error("Failed to parse selected certificate", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (billingDetails.country) {
      setStates(State.getStatesOfCountry(billingDetails.country));
      setCities([]);
      setBillingDetails((prev) => ({ ...prev, state: "", city: "" }));
    }
  }, [billingDetails.country]);

  useEffect(() => {
    if (billingDetails.country && billingDetails.state) {
      setCities(
        City.getCitiesOfState(billingDetails.country, billingDetails.state),
      );
      setBillingDetails((prev) => ({ ...prev, city: "" }));
    }
  }, [billingDetails.state, billingDetails.country]);

  interface PaymentRecord {
    id: string;
    user_id: string;
    certificate_id: string;
    payment_type: string;
    amount: string;
    currency: string;
    status: string;
    is_paid: boolean;
    transaction_id: string | null;
    payment_method: string | null;
    paid_at: string | null;
    created_at: string;
    updated_at: string;
    stripe_payment_intent_id: string;
    stripe_customer_id: string;
    certificate_name: string;
  }

  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const fetchPayments = async () => {
    try {
      const response = await axiosInstance.get("/payments/my-payments");
      if (response.data.success) {
        setPayments(response.data.data?.data || response.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch payments", error);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await axiosInstance.get("/organization/profile");
      const data = response?.data?.data || response?.data;
      if (data?.stripe_customer_id) {
        setStripeCustomerId(data.stripe_customer_id);
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  const fetchSavedMethods = async (preferredId?: string) => {
    try {
      const response = await axiosInstance.get("/payments/payment-methods");
      if (response.data.success) {
        const methods = response.data.data || [];
        console.log("💳 Fetched Saved Payment Methods:", {
          count: methods.length,
          methods: methods.map((m: any) => ({
            id: m.id,
            stripe_pm_id: m.stripe_payment_method_id,
            last4: m.card_last4,
            is_default: m.is_default,
          })),
          preferredId,
        });
        setSavedMethods(methods);

        let methodToSelect = null;

        if (preferredId) {
          methodToSelect = methods.find(
            (m: any) => m.stripe_payment_method_id === preferredId,
          );
          if (methodToSelect) {
            console.log("🎯 Selecting newly added card:", preferredId);
          }
        }

        if (!methodToSelect) {
          methodToSelect = methods.find((m: any) => m.is_default);
          if (methodToSelect) {
            console.log("✅ Selecting default payment method:", {
              db_id: methodToSelect.id,
              stripe_pm_id: methodToSelect.stripe_payment_method_id,
              last4: methodToSelect.card_last4,
            });
          }
        }

        if (methodToSelect) {
          setSelectedSavedMethod(methodToSelect.stripe_payment_method_id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch saved methods", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsHistoryLoading(true);
      try {
        await Promise.all([
          fetchPayments(),
          fetchSavedMethods(),
          fetchProfile(),
        ]);
      } catch (error) {
        console.error("Failed to load initial data", error);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    loadData();
  }, []);

  const handleDownloadInvoice = async (payment: PaymentRecord) => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      doc.setFontSize(22);
      doc.text("ACES Certification - Payment Invoice", 20, 20);

      doc.setFontSize(12);
      doc.text(`Payment ID: ${payment.id}`, 20, 40);
      doc.text(`Certificate: ${payment.certificate_name}`, 20, 50);
      doc.text(`Amount: ${payment.currency} ${payment.amount}`, 20, 60);
      doc.text(
        `Date: ${new Date(payment.created_at).toLocaleDateString()}`,
        20,
        70,
      );
      doc.text(`Status: ${payment.status}`, 20, 80);
      doc.text(`Transaction ID: ${payment.transaction_id || "N/A"}`, 20, 90);

      doc.text("Thank you for your business!", 20, 110);

      doc.save(`Invoice_${payment.id.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error("PDF generation failed", error);
      setApiError("Failed to generate PDF invoice. Please try again.");
    }
  };

  const handleAddPayment = async () => {
    if (selectedCertificate) {
      setIsCheckingEligibility(true);
      try {
        const storedBranchId = localStorage.getItem("selected_branch_id");
        const response = await axiosInstance.get(
          `/certificates/${selectedCertificate.id}/self-disclosure-status${storedBranchId ? `?branchId=${storedBranchId}` : ""}`,
        );
        const data = response.data.data || response.data;
        const eligibilityRes = {
          ...data,
          eligible: !!data?.isSubmitted && data?.status === "completed",
        };
        setEligibilityData(eligibilityRes);
        if (!eligibilityRes.eligible) {
          setPaymentType("self_disclosure");
        }
        setShowPaymentTypeModal(true);
      } catch (err) {
        console.error("Failed to check eligibility", err);
        setPaymentType("self_disclosure");
        setShowPaymentTypeModal(true);
      } finally {
        setIsCheckingEligibility(false);
      }
    } else {
      setIntentData(null);
      setShowStripeModal(true);
    }
  };

  const handleCreateIntent = async (preSelectedMethodId?: string) => {
    if (!selectedCertificate) {
      setShowBillingModal(false);
      setShowStripeModal(true);
      return;
    }

    setApiError(null);
    setIsLoading(true);

    try {
      const methodToUse = preSelectedMethodId || selectedSavedMethod;

      console.log("🚀 Creating Payment Intent with:", {
        certificate_id: selectedCertificate.id,
        payment_type: paymentType,
        payment_method_id: methodToUse,
        has_saved_methods: savedMethods.length > 0,
      });

      const payload = {
        certificate_id: selectedCertificate.id,
        payment_type: paymentType,
        save_payment_method: true,
        billing_details: billingDetails,
        payment_method_id: methodToUse || undefined,
      };

      const response = await axiosInstance.post(
        "/payments/stripe/create-intent",
        payload,
      );

      const intentDetails = response.data?.data || response.data || {};

      console.log("💳 Payment Intent Created:", {
        payment_id: intentDetails.payment_id,
        stripe_intent_id: intentDetails.id,
        status: intentDetails.status,
        amount: intentDetails.amount,
        fullResponse: intentDetails,
      });

      setIntentData(intentDetails);

      localStorage.setItem(
        "payment_intent_response",
        JSON.stringify(intentDetails),
      );

      const currentStatus = intentDetails?.status;

      if (currentStatus === "succeeded") {
        setTimeout(() => {
          setIsSuccess(true);
          setIsLoading(false);
          setShowBillingModal(false);

          if (selectedCertificate && intentDetails) {
            localStorage.setItem(
              "pending_assessment_ids",
              JSON.stringify({
                certificate_id: selectedCertificate.id,
                payment_id: intentDetails.payment_id,
                assessment_type: paymentType,
              }),
            );
          }

          localStorage.removeItem("selected_certificate");
          localStorage.removeItem("payment_intent_response");
          setSelectedCertificate(null);
          setIntentData(null);
          fetchPayments();
          fetchSavedMethods();
        }, 500);
      } else if (methodToUse) {
        console.log("🔄 Auto-confirming with saved method:", methodToUse);
        const paymentId = intentDetails.payment_id || intentDetails.id;
        setShowBillingModal(false);
        await handleSavedMethodPayment(paymentId);
      } else {
        setIsLoading(false);
        setShowBillingModal(false);

        if (savedMethods.length > 0) {
          setShowMethodSelectModal(true);
        } else {
          setShowStripeModal(true);
        }
      }
    } catch (error: any) {
      console.error("Payment intent creation failed", error);
      setApiError(
        error?.response?.data?.message ||
          "Failed to create payment intent. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleSavedMethodPayment = async (manualId?: string) => {
    const targetId = manualId || intentData?.payment_id || intentData?.id;

    console.log("🔍 Payment ID Debug:", {
      manualId,
      intentData_payment_id: intentData?.payment_id,
      intentData_id: intentData?.id,
      targetId,
      fullIntentData: intentData,
    });

    if (!selectedSavedMethod || !targetId) {
      console.error("❌ Missing required data:", {
        selectedSavedMethod,
        targetId,
      });
      setApiError(
        "Missing payment information. Please try creating the payment again.",
      );
      return;
    }

    if (!selectedSavedMethod.startsWith("pm_")) {
      console.error("❌ Invalid payment method ID format:", {
        selectedSavedMethod,
        format: selectedSavedMethod.substring(0, 10) + "...",
        length: selectedSavedMethod.length,
      });
      setApiError(
        "Invalid payment method ID format. This card may no longer be valid. Please try another card or add a new one.",
      );

      await fetchSavedMethods();
      setSelectedSavedMethod("");
      return;
    }

    console.log("🚀 Attempting payment with saved method:", {
      targetId,
      selectedSavedMethod,
      paymentMethodFormat: selectedSavedMethod.substring(0, 10) + "...",
      paymentMethodLength: selectedSavedMethod.length,
    });

    setIsLoading(true);
    setApiError(null);

    try {
      const confirmResponse = await axiosInstance.post(
        `/payments/${targetId}/stripe/confirm`,
        {
          payment_method_id: selectedSavedMethod,
          off_session: false,
        },
      );

      let status =
        confirmResponse.data?.data?.status || confirmResponse.data?.status;

      let statusResponse: any = null;
      if (status !== "succeeded") {
        statusResponse = await axiosInstance.get(
          `/payments/${targetId}/stripe/status`,
        );
        status =
          statusResponse.data?.data?.status ||
          statusResponse.data?.status ||
          statusResponse.data?.data;
      }

      if (status === "succeeded" || status === "paid") {
        setTimeout(() => {
          setShowMethodSelectModal(false);
          setIsSuccess(true);
          setIsLoading(false);

          if (selectedCertificate && (intentData || manualId)) {
            const assessmentId =
              confirmResponse.data?.data?.assessment_id ||
              (statusResponse as any)?.data?.data?.assessment_id;

            localStorage.setItem(
              "pending_assessment_ids",
              JSON.stringify({
                certificate_id: selectedCertificate.id,
                payment_id: manualId || intentData?.payment_id,
                assessment_id: assessmentId,
                assessment_type: paymentType,
              }),
            );
          }

          localStorage.removeItem("selected_certificate");
          localStorage.removeItem("payment_intent_response");
          setSelectedCertificate(null);
          setIntentData(null);
          fetchPayments();
          fetchSavedMethods();
        }, 500);
      } else {
        setPaymentStatus(status);
        setIsLoading(false);
        setShowMethodSelectModal(false);
      }
    } catch (error: any) {
      console.error("Saved method payment failed", error);

      const errorMessage =
        error?.response?.data?.message || "Payment failed with saved card.";

      if (
        errorMessage.includes("No such PaymentMethod") ||
        errorMessage.includes("payment method") ||
        errorMessage.includes("PaymentMethod")
      ) {
        setApiError(
          "This payment method is no longer valid. Please select another card or add a new one.",
        );

        await fetchSavedMethods();

        setSelectedSavedMethod("");

        setShowMethodSelectModal(false);

        setTimeout(() => {
          setShowStripeModal(true);
        }, 1500);
      } else {
        setApiError(errorMessage);
      }

      setIsLoading(false);
    }
  };

  const handleConfirmPayment = () => {
    setShowConfirmModal(false);
    if (selectedSavedMethod) {
      handleSavedMethodPayment();
    } else if (savedMethods.length > 0) {
      setShowMethodSelectModal(true);
    } else {
      setShowStripeModal(true);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setBillingDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleDropdownChange = (name: string, value: string) => {
    setBillingDetails((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-4 lg:p-6 bg-dull-white/10 font-sans relative">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-secondary tracking-tight">
            Payment
          </h1>
          <p className="text-gray text-sm font-medium">
            Payments are processed securely to activate certificate access.
          </p>
        </header>

        <Card className="space-y-8">
          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-secondary">
                Payment Methods
              </h3>
              <p className="text-gray text-sm font-medium">
                Manage your saved payment methods
              </p>
            </div>

            {savedMethods.length === 0 ? (
              <div className="bg-zinc-50 border border-zinc-100/50 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-zinc-100">
                    <CreditCard className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-secondary text-base">
                      No payment methods added yet
                    </p>
                    <p className="text-xs text-gray font-medium max-w-md">
                      When you add a card or bank account, it will appear here
                      as a saved payment method for future transactions.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {savedMethods.map((method) => (
                  <div
                    key={method.id}
                    className="bg-zinc-50 border border-transparent rounded-3xl p-5 flex items-center justify-between group hover:border-zinc-200/50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-x-6">
                      <div className="w-10 h-10 bg-white/0 flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-zinc-800" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-zinc-800 text-base leading-none">
                          {method.card_brand} ending in {method.card_last4}
                        </p>
                        <p className="text-zinc-400 text-xs font-medium">
                          Expires {method.card_exp_month}/{method.card_exp_year}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {method.is_default && (
                        <span className="px-4 py-1.5 bg-zinc-200/60 text-zinc-600 text-[12px] font-black rounded-full  tracking-tight">
                          Default
                        </span>
                      )}
                      <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-secondary">
                Payment History
              </h3>
              <p className="text-gray text-sm font-medium">
                View your complete payment transaction history
              </p>
            </div>

            {isHistoryLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-zinc-50 border border-transparent rounded-3xl p-5 flex items-center justify-between"
                  >
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <div className="flex gap-4">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="bg-primary/50 border border-zinc-100/50 rounded-2xl p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-secondary text-base">
                    No payments recorded yet
                  </p>
                  <p className="text-sm text-gray font-medium max-w-xl">
                    Once you complete your first payment, a detailed record of
                    all transactions and downloadable invoices will appear in
                    this section.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-zinc-50 border border-transparent rounded-3xl p-5 flex items-center justify-between group hover:border-zinc-200/50 transition-all duration-300"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-zinc-800 text-base leading-none">
                        {payment.certificate_name}
                      </p>
                      <p className="text-zinc-400 text-xs font-medium">
                        {new Date(payment.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-12">
                      <div className="text-right">
                        <p className="font-semibold text-zinc-800 text-base leading-none">
                          ${parseFloat(payment.amount).toLocaleString()}
                        </p>
                        <p className="text-zinc-400 text-[10px] font-semibold tracking-wider mt-1 ">
                          INV-{payment.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadInvoice(payment)}
                        className="p-3 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent hover:border-zinc-100"
                      >
                        <Download className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="pt-4">
            <Button
              variant="secondary"
              className="w-auto px-8 h-12 text-sm"
              onClick={handleAddPayment}
            >
              Add New Payment Method
            </Button>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {showPaymentTypeModal && selectedCertificate && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-100"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-110"
            >
              <div className="p-6 pb-3">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                  Choose Assessment Type
                </h2>
                <p className="text-gray text-xs font-medium">
                  Select the tier of certification for{" "}
                  {selectedCertificate.name}
                </p>
              </div>

              <div className="px-6 py-3 space-y-5 overflow-y-auto scrollbar-hide">
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
                  onClick={() => setPaymentType("self_disclosure")}
                  className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer group flex items-start gap-4 ${
                    paymentType === "self_disclosure"
                      ? "border-black bg-white"
                      : "border-[#F5F5F5] bg-[#FAFAFA] hover:border-gray-200"
                  }`}
                >
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      paymentType === "self_disclosure"
                        ? "bg-black text-white"
                        : "bg-[#F5F5F5] text-[#737373]"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="grow">
                    <div className="flex justify-between items-center mb-0.5">
                      <h3 className="font-bold text-[#1A1A1A] text-base">
                        Start Self-Disclosure
                      </h3>
                      <p className="font-bold text-secondary">
                        USD {selectedCertificate.disclosure_price}
                      </p>
                    </div>
                    <p className="text-gray text-xs font-medium">
                      Self-reported assessment completed by your organization
                    </p>
                  </div>
                  {paymentType === "self_disclosure" && (
                    <div className="ml-auto mt-1">
                      <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                <div
                  onClick={() =>
                    eligibilityData?.eligible && setPaymentType("assured")
                  }
                  className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer group flex items-start gap-4 ${
                    paymentType === "assured"
                      ? "border-black bg-white"
                      : "border-[#F5F5F5] bg-[#FAFAFA] hover:border-gray-200"
                  } ${!eligibilityData?.eligible ? "opacity-60 grayscale-[0.5] cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      paymentType === "assured"
                        ? "bg-black text-white"
                        : "bg-[#F5F5F5] text-[#737373]"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="grow">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-[#1A1A1A] text-base">
                          Start Assured Certification
                        </h3>
                        {!eligibilityData?.eligible && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-lg text-[10px] text-red-600 font-bold border border-red-100">
                            <AlertCircle className="w-3 h-3" /> Locked
                          </div>
                        )}
                      </div>
                      <p className="font-bold text-secondary">
                        USD {selectedCertificate.assured_price}
                      </p>
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
                  {paymentType === "assured" && (
                    <div className="ml-auto mt-1">
                      <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 pt-3 flex flex-col sm:flex-row items-center justify-end gap-3 bg-white/50 border-t border-gray-50">
                <button
                  onClick={() => setShowPaymentTypeModal(false)}
                  className="px-8 h-10 rounded-lg cursor-pointer border-2 border-[#E5E5E5] text-[#1A1A1A] text-xs font-bold hover:bg-gray-50 transition-all grow sm:grow-0"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPaymentTypeModal(false);
                    setShowBillingModal(true);
                  }}
                  className="px-10 h-10 rounded-lg cursor-pointer bg-[#1A1A1A] text-white text-xs font-bold hover:bg-black transition-all shadow-lg shadow-black/10 grow sm:grow-0"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBillingModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowBillingModal(false)}
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
                  onClick={() => setShowBillingModal(false)}
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
                      <SearchableDropdown
                        label="Country"
                        options={Country.getAllCountries()}
                        value={billingDetails.country}
                        onChange={(val) => handleDropdownChange("country", val)}
                        placeholder="Select Country"
                      />

                      <SearchableDropdown
                        label="State / Province"
                        options={states}
                        value={billingDetails.state}
                        onChange={(val) => handleDropdownChange("state", val)}
                        disabled={!billingDetails.country}
                        placeholder="Select State"
                      />

                      <SearchableDropdown
                        label="City"
                        options={cities}
                        value={billingDetails.city}
                        onChange={(val) => handleDropdownChange("city", val)}
                        disabled={!billingDetails.state}
                        placeholder="Select City"
                      />

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
                  onClick={() => setShowBillingModal(false)}
                  className="px-6 h-11 rounded-xl border-2 border-light-gray-2 text-secondary text-sm font-bold hover:bg-light-gray transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowBillingModal(false);
                    handleCreateIntent();
                  }}
                  className="px-8 h-11 rounded-xl bg-secondary text-white text-sm font-bold hover:bg-black transition-all shadow-xl shadow-black/20 disabled:opacity-50 cursor-pointer"
                  disabled={
                    !billingDetails.name ||
                    !billingDetails.email ||
                    !billingDetails.country
                  }
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    "Proceed to Card Details"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && intentData && selectedCertificate && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-4xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-xl font-semibold text-secondary">
                    Review & Confirm
                  </h2>
                  <p className="text-gray text-sm mt-1">
                    Please review your payment details before confirming.
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-8">
                  {/* Certificate Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-secondary flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" /> Certificate
                      Information
                    </h3>
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold  tracking-wider mb-1">
                            Certificate Name
                          </p>
                          <p className="font-semibold text-secondary text-base">
                            {selectedCertificate.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold  tracking-wider mb-1">
                            Certificate ID
                          </p>
                          <p className="font-medium text-secondary text-base font-mono">
                            {selectedCertificate.certificate_id ||
                              selectedCertificate.id ||
                              "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold  tracking-wider mb-1">
                            Payment Type
                          </p>
                          <p className="font-medium text-secondary text-base capitalize">
                            {paymentType.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billing Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-secondary flex items-center gap-2">
                      <FaUser className="w-4 h-4 text-gray-400" /> Billing
                      Information
                    </h3>
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold  tracking-wider mb-1">
                            Name
                          </p>
                          <p className="font-medium text-secondary">
                            {billingDetails.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold  tracking-wider mb-1">
                            Email
                          </p>
                          <p className="font-medium text-secondary">
                            {billingDetails.email}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-500 font-semibold  tracking-wider mb-1">
                            Billing Address
                          </p>
                          <p className="font-medium text-secondary">
                            {billingDetails.address_line1}{" "}
                            {billingDetails.address_line2 &&
                              `, ${billingDetails.address_line2}`}
                            <br />
                            {billingDetails.city}, {billingDetails.state},{" "}
                            {billingDetails.country},{" "}
                            {billingDetails.postal_code}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-secondary flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-gray-400" /> Payment
                      Summary
                    </h3>
                    <div className="bg-secondary/5 rounded-2xl p-6 border border-secondary/10">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-gray-600">Creation Date</span>
                          <span className="text-secondary">
                            {intentData.created
                              ? new Date(intentData.created).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  },
                                )
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="text-secondary">
                            {(intentData.amount / 100).toLocaleString("en-US", {
                              style: "currency",
                              currency: intentData.currency || "USD",
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-gray-600">Processing Fee</span>
                          <span className="text-secondary">$0.00</span>
                        </div>
                        <div className="border-t border-secondary/10 pt-3 flex justify-between items-center">
                          <span className="text-base font-semibold text-secondary">
                            Total Amount
                          </span>
                          <span className="text-lg font-black text-secondary">
                            {(intentData.amount / 100).toLocaleString("en-US", {
                              style: "currency",
                              currency: intentData.currency || "USD",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {apiError && (
                <div className="px-8 pb-4">
                  <div className="p-4 rounded-xl bg-red-50 text-red-600 flex items-start gap-3 text-sm font-medium text-left">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{apiError}</p>
                  </div>
                </div>
              )}

              <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-6 h-12 w-full md:w-1/2"
                >
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleConfirmPayment}
                  className="px-8 h-12 w-full md:w-1/2"
                >
                  Pay{" "}
                  {(intentData.amount / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: intentData.currency || "USD",
                  })}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-200 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl text-center space-y-6"
            >
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50/50">
                <Check className="w-12 h-12 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-secondary tracking-tight">
                  Success!
                </h3>
                <p className="text-gray text-base font-medium leading-relaxed">
                  Your payment has been successfully confirmed. You will be
                  notified once the admin approves your request, and your
                  assessment will begin shortly.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showMethodSelectModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-4xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-xl font-semibold text-secondary">
                    Select Payment Method
                  </h2>
                  <p className="text-gray text-sm mt-1">
                    Use a saved card or add a new one.
                  </p>
                </div>
                <button
                  onClick={() => setShowMethodSelectModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto grow h-full custom-scrollbar">
                <div className="space-y-4">
                  {savedMethods.map((method) => (
                    <div
                      key={method.id}
                      onClick={() =>
                        setSelectedSavedMethod(method.stripe_payment_method_id)
                      }
                      className={`form-dropdown-item flex items-center justify-between h-auto ${
                        selectedSavedMethod === method.stripe_payment_method_id
                          ? "form-dropdown-item-active ring-2 ring-secondary/10"
                          : "form-dropdown-item-inactive bg-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <CreditCard className="w-6 h-6 text-zinc-800" />
                        <div>
                          <p className="font-semibold text-zinc-800 capitalize">
                            {method.card_brand} ending in {method.card_last4}
                          </p>
                          <p className="text-xs text-zinc-400">
                            Expires {method.card_exp_month}/
                            {method.card_exp_year}
                          </p>
                        </div>
                      </div>
                      {selectedSavedMethod ===
                        method.stripe_payment_method_id && (
                        <FaCheckCircle className="w-5 h-5 text-secondary" />
                      )}
                    </div>
                  ))}

                  <div
                    onClick={() => {
                      setShowMethodSelectModal(false);
                      setShowStripeModal(true);
                    }}
                    className="p-6 rounded-3xl border-2 border-dashed border-gray-200 hover:border-secondary hover:bg-secondary/5 cursor-pointer transition-all flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-secondary/10">
                      <CreditCard className="w-5 h-5 text-gray-400 group-hover:text-secondary" />
                    </div>
                    <p className="font-semibold text-gray-500 group-hover:text-secondary">
                      Add New Card
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
                <Button
                  variant="primary"
                  onClick={() => setShowMethodSelectModal(false)}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleSavedMethodPayment()}
                  className="px-8"
                  disabled={!selectedSavedMethod || isLoading}
                >
                  {isLoading ? "Processing..." : "Pay Now"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {paymentStatus && paymentStatus !== "succeeded" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-200 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl text-center space-y-6"
            >
              <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-yellow-50/50">
                <AlertCircle className="w-12 h-12 text-yellow-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-secondary tracking-tight">
                  Payment Status
                </h3>
                <p className="text-gray text-base font-medium leading-relaxed capitalize">
                  Current Status: {paymentStatus.replace(/_/g, " ")}
                </p>
                <p className="text-sm text-gray/80">
                  Please check your payment details or try again.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setPaymentStatus(null)}
                className="w-full h-14 font-semibold"
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <StripePaymentModal
        isOpen={showStripeModal}
        paymentIntentId={intentData?.id || ""}
        clientSecret={intentData?.client_secret || ""}
        stripeCustomerId={stripeCustomerId || ""}
        amount={intentData?.amount || 0}
        currency={intentData?.currency || "USD"}
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
        existingMethods={savedMethods}
        onSuccess={(card) => {
          setShowStripeModal(false);

          if (intentData && selectedCertificate) {
            setIsSuccess(true);
            localStorage.setItem(
              "pending_assessment_ids",
              JSON.stringify({
                certificate_id: selectedCertificate.id,
                payment_id: intentData.payment_id,
                assessment_type: paymentType,
              }),
            );
          }

          fetchSavedMethods(card.id);
          fetchPayments();
          localStorage.removeItem("selected_certificate");
          localStorage.removeItem("payment_intent_response");
          setSelectedCertificate(null);
          setIntentData(null);
        }}
        onCancel={() => {
          setShowStripeModal(false);
          if (intentData) setShowConfirmModal(true);
        }}
        onError={(error) => {
          console.error("Payment error:", error);
          setApiError(error);
          setShowStripeModal(false);
          if (intentData) setShowConfirmModal(true);
        }}
      />

      <AnimatePresence>
        {showUnderReviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-200 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl text-center space-y-6"
            >
              <div className="w-24 h-24 bg-secondary/5 rounded-full flex items-center justify-center mx-auto ring-8 ring-secondary/10">
                <RefreshCw className="w-12 h-12 text-secondary animate-spin-slow" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black text-secondary tracking-tight">
                  Assessment Under Review
                </h3>
                <p className="text-gray text-base font-medium leading-relaxed">
                  Thank you for completing your assessment! Our experts are
                  currently reviewing your responses.
                </p>
                <p className="text-sm text-gray/70">
                  You will be notified via email once the review process is
                  complete and your results are ready.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowUnderReviewModal(false);
                  router.replace(`${base}/profile/payments`);
                }}
                className="w-full h-12 font-semibold"
              >
                Return to Payments
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
