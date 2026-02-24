import React, { useState } from "react";
import { loadStripe, PaymentMethod } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Check, X, AlertCircle, Loader2 } from "lucide-react";
import { axiosInstance } from "@/lib/axios";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1f2937",
      fontFamily: '"Inter", "Segoe UI", sans-serif',
      "::placeholder": {
        color: "#9ca3af",
      },
      padding: "12px",
    },
    invalid: {
      color: "#ef4444",
      iconColor: "#ef4444",
    },
  },
  hidePostalCode: false,
};

type PaymentState =
  | "idle"
  | "adding_method"
  | "confirming"
  | "succeeded"
  | "failed";

interface BillingDetails {
  name: string;
  email: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface CardData {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface ExistingPaymentMethod {
  id: string;
  metadata?: {
    nickname?: string;
  };
  customer?: string;
  stripe_customer_id?: string;
  card_brand?: string;
  brand?: string;
  card_last4?: string;
  last4?: string;
}

interface StripePaymentFormProps {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  billingDetails: BillingDetails;
  stripeCustomerId?: string;
  existingMethods?: ExistingPaymentMethod[];
  onSuccess: (card: CardData) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

function StripePaymentForm({
  paymentIntentId,
  amount,
  currency,
  billingDetails,
  stripeCustomerId: initialStripeCustomerId,
  existingMethods = [],
  onSuccess,
  onCancel,
  onError,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [paymentState, setPaymentState] =
    useState<PaymentState>("adding_method");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [cardReference, setCardReference] = useState<string>("");
  const [stripeCustomerId, setStripeCustomerId] = useState<string>(
    initialStripeCustomerId || "",
  );
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const createPaymentMethod = async (): Promise<PaymentMethod | null> => {
    if (!stripe || !elements) {
      setErrorMessage("Stripe has not loaded yet. Please try again.");
      return null;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setErrorMessage("Card element not found.");
      return null;
    }

    try {
      console.log("🔧 Creating Payment Method with billing details:", {
        name: billingDetails.name,
        email: billingDetails.email,
        hasAddress: !!billingDetails.address_line1,
      });

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: billingDetails.name?.trim() || undefined,
          email: billingDetails.email?.trim() || undefined,
          address: {
            line1: billingDetails.address_line1?.trim() || undefined,
            line2: billingDetails.address_line2?.trim() || undefined,
            city: billingDetails.city?.trim() || undefined,
            state: billingDetails.state?.trim() || undefined,
            postal_code: billingDetails.postal_code?.trim() || undefined,
            country: billingDetails.country?.trim() || undefined,
          },
        },
      });

      if (error) {
        console.error("❌ Stripe createPaymentMethod error:", error);
        setErrorMessage(error.message || "Failed to create payment method");
        return null;
      }

      if (!paymentMethod) {
        console.error("❌ No payment method returned from Stripe");
        setErrorMessage("Payment method creation failed");
        return null;
      }

      console.log("✅ Payment Method Created Successfully:", {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card_brand: paymentMethod.card?.brand,
        card_last4: paymentMethod.card?.last4,
        created: paymentMethod.created,
      });

      return paymentMethod;
    } catch (err: unknown) {
      console.error("❌ Exception in createPaymentMethod:", err);
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorMessage(message);
      return null;
    }
  };

  const confirmPaymentIntent = async (
    paymentMethodId: string,
  ): Promise<boolean> => {
    try {
      console.log("🔄 Confirming Payment Intent:", {
        paymentIntentId,
        paymentMethodId,
        paymentMethodIdFormat: paymentMethodId.substring(0, 3),
        paymentMethodIdLength: paymentMethodId.length,
      });

      if (!paymentMethodId.startsWith("pm_")) {
        console.error("❌ Invalid payment method ID format:", paymentMethodId);
        setErrorMessage("Invalid payment method ID. Please try again.");
        return false;
      }

      setPaymentState("confirming");

      const response = await axiosInstance.post(
        `/payments/${paymentIntentId}/stripe/confirm`,
        {
          payment_method_id: paymentMethodId,
          off_session: false,
        },
      );

      console.log("✅ Payment Confirmed:", {
        status: response.data?.status,
        data: response.data,
      });

      return true;
    } catch (error: unknown) {
      console.error("❌ Payment Confirmation Failed:", {
        error:
          error && typeof error === "object" && "response" in error
            ? (error as { response: { data: unknown } }).response?.data
            : error,
        paymentMethodId,
        paymentIntentId,
      });
      const errorMsg =
        error &&
        typeof error === "object" &&
        "response" in error &&
        (error as { response: { data: { message?: string } } }).response?.data
          ?.message
          ? (error as { response: { data: { message: string } } }).response.data
              .message
          : "Payment confirmation failed";
      setErrorMessage(errorMsg);
      onError(errorMsg);
      return false;
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isProcessing) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      if (!stripe || !elements) return;

      if (
        cardReference &&
        existingMethods.some(
          (m) =>
            (m.metadata?.nickname || "").toLowerCase() ===
            cardReference.trim().toLowerCase(),
        )
      ) {
        setErrorMessage("A payment method with this nickname already exists.");
        setIsProcessing(false);
        return;
      }

      if (
        !initialStripeCustomerId &&
        stripeCustomerId &&
        existingMethods.some(
          (m) =>
            (m.customer || m.stripe_customer_id) === stripeCustomerId.trim(),
        )
      ) {
        setErrorMessage(
          "This Stripe Customer ID is already associated with another card.",
        );
        setIsProcessing(false);
        return;
      }

      const paymentMethod = await createPaymentMethod();
      if (!paymentMethod) {
        setIsProcessing(false);
        return;
      }

      const isDuplicateCard = existingMethods.some((m) => {
        const mBrand = m.card_brand || m.brand || "";
        const mLast4 = m.card_last4 || m.last4 || "";
        const newBrand = paymentMethod.card?.brand || "";
        const newLast4 = paymentMethod.card?.last4 || "";

        return (
          mBrand.toLowerCase() === newBrand.toLowerCase() && mLast4 === newLast4
        );
      });

      if (isDuplicateCard) {
        console.warn("⚠️ Duplicate card detected:", {
          brand: paymentMethod.card?.brand,
          last4: paymentMethod.card?.last4,
        });
        setErrorMessage("This card already exists in your payment methods.");
        setIsProcessing(false);
        return;
      }

      console.log("💳 Payment Method to be used:", {
        id: paymentMethod.id,
        hasPaymentIntent: !!paymentIntentId,
        paymentIntentId: paymentIntentId || "N/A",
      });

      if (paymentIntentId) {
        console.log(
          "🎯 Confirming payment with newly created method:",
          paymentMethod.id,
        );
        const success = await confirmPaymentIntent(paymentMethod.id);
        if (!success) {
          setPaymentState("failed");
          setIsProcessing(false);
          return;
        }
      } else {
        try {
          console.log("💾 Saving payment method to database:", {
            stripe_payment_method_id: paymentMethod.id,
            stripe_customer_id: stripeCustomerId || "none",
            card_brand: paymentMethod.card?.brand,
            card_last4: paymentMethod.card?.last4,
          });

          setPaymentState("confirming");
          const saveResponse = await axiosInstance.post(
            "/payments/payment-methods",
            {
              stripe_payment_method_id: paymentMethod.id,
              stripe_customer_id: stripeCustomerId || undefined,
              type: "card",
              card_brand: paymentMethod.card?.brand || "unknown",
              card_last4: paymentMethod.card?.last4 || "****",
              card_exp_month: paymentMethod.card?.exp_month || 0,
              card_exp_year: paymentMethod.card?.exp_year || 0,
              is_default: isDefault,
              metadata: {
                nickname: cardReference || undefined,
              },
            },
          );

          console.log(
            "✅ Payment method saved to database:",
            saveResponse.data,
          );
        } catch (error: unknown) {
          console.error(
            "❌ Failed to save payment method:",
            error && typeof error === "object" && "response" in error
              ? (error as { response: { data: unknown } }).response?.data
              : error,
          );
          const errorMsg =
            error &&
            typeof error === "object" &&
            "response" in error &&
            (error as { response: { data: { message?: string } } }).response
              ?.data?.message
              ? (error as { response: { data: { message: string } } }).response
                  .data.message
              : "Failed to save payment method";
          setErrorMessage(errorMsg);
          setPaymentState("failed");
          setIsProcessing(false);
          return;
        }
      }

      setPaymentState("succeeded");

      const cardData: CardData = {
        id: paymentMethod.id,
        brand: paymentMethod.card?.brand || "Card",
        last4: paymentMethod.card?.last4 || "****",
        exp_month: paymentMethod.card?.exp_month || 0,
        exp_year: paymentMethod.card?.exp_year || 0,
      };

      setTimeout(() => {
        onSuccess(cardData);
      }, 1500);
    } catch (error: unknown) {
      console.error("Payment handler error:", error);
      const message =
        error instanceof Error ? error.message : "Operation failed";
      setErrorMessage(message);
      setPaymentState("failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {paymentState === "adding_method" && (
          <motion.div
            key="adding"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <form onSubmit={handlePayment} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-secondary">
                    Card Nickname (Optional)
                  </label>
                  <input
                    type="text"
                    value={cardReference}
                    onChange={(e) => setCardReference(e.target.value)}
                    placeholder="e.g. My Business Card"
                    className="w-full border border-gray-200 rounded-xl p-4 bg-gray-50 focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all text-sm"
                    disabled={isProcessing}
                  />
                </div>

                {!paymentIntentId && !initialStripeCustomerId && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-secondary">
                      Stripe Customer ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={stripeCustomerId}
                      onChange={(e) => setStripeCustomerId(e.target.value)}
                      placeholder="cus_..."
                      className="w-full border border-gray-200 rounded-xl p-4 bg-gray-50 focus:ring-2 focus:ring-secondary/10 focus:border-secondary outline-none transition-all text-sm"
                      disabled={isProcessing}
                    />
                  </div>
                )}

                {!paymentIntentId && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-secondary focus:ring-secondary/20 transition-all cursor-pointer"
                      disabled={isProcessing}
                    />
                    <label
                      htmlFor="is_default"
                      className="text-sm font-medium text-secondary cursor-pointer"
                    >
                      Set as default payment method
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-secondary">
                  Card Information
                </label>
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 focus-within:ring-2 focus-within:ring-secondary/10 focus-within:border-secondary transition-all">
                  <CardElement
                    options={{
                      ...CARD_ELEMENT_OPTIONS,
                      disabled: isProcessing,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Includes secure encryption and postal code verification
                </p>
              </div>

              {paymentIntentId && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-secondary  tracking-wider">
                    Billing Details
                  </p>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>{billingDetails.name}</p>
                    <p>{billingDetails.email}</p>
                    <p className="text-xs text-gray-500">
                      {billingDetails.address_line1}, {billingDetails.city},{" "}
                      {billingDetails.state} {billingDetails.postal_code}
                    </p>
                  </div>
                </div>
              )}

              {amount > 0 && (
                <div className="bg-secondary/5 rounded-xl p-4 border border-secondary/10">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-secondary">
                      Total Amount
                    </span>
                    <span className="text-xl font-black text-secondary">
                      {(amount / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: currency || "USD",
                      })}
                    </span>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-50 text-red-600 flex items-start gap-3 text-sm font-medium">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="px-6 h-12 bg-gray-100 hover:bg-gray-200 text-secondary font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !stripe}
                  className="px-6 h-12 bg-secondary hover:bg-secondary/90 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {paymentIntentId ? "Processing..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      {paymentIntentId ? "Pay Now" : "Save Card"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {paymentState === "confirming" && (
          <motion.div
            key="confirming"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center space-y-6 py-8"
          >
            <div className="w-24 h-24 bg-secondary/5 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-12 h-12 text-secondary animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-secondary">
                {paymentIntentId ? "Confirming Payment" : "Saving Card"}
              </h3>
              <p className="text-gray text-base">
                {paymentIntentId
                  ? "Please wait while we process your payment..."
                  : "Please wait while we securely save your card..."}
              </p>
            </div>
          </motion.div>
        )}

        {paymentState === "succeeded" && (
          <motion.div
            key="succeeded"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center space-y-6 py-8"
          >
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50/50">
              <Check className="w-12 h-12 text-green-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-secondary tracking-tight">
                {paymentIntentId ? "Payment Successful!" : "Card Saved!"}
              </h3>
              <p className="text-gray text-base font-medium">
                {paymentIntentId
                  ? "Your payment has been processed successfully."
                  : "Your payment method has been saved for future use."}
              </p>
            </div>
          </motion.div>
        )}

        {paymentState === "failed" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center space-y-6 py-8"
          >
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50/50">
              <X className="w-12 h-12 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-secondary tracking-tight">
                Payment Failed
              </h3>
              <p className="text-gray text-base font-medium">
                {errorMessage ||
                  "Unable to process your payment. Please try again."}
              </p>
            </div>
            <button
              onClick={() => {
                setPaymentState("adding_method");
                setErrorMessage("");
              }}
              className="px-8 h-12 bg-secondary hover:bg-secondary/90 text-white font-semibold rounded-xl transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface StripePaymentModalProps {
  isOpen: boolean;
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  billingDetails: BillingDetails;
  stripeCustomerId?: string;
  existingMethods?: ExistingPaymentMethod[];
  onSuccess: (card: CardData) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export function StripePaymentModal({
  isOpen,
  paymentIntentId,
  clientSecret,
  amount,
  currency,
  billingDetails,
  stripeCustomerId,
  existingMethods,
  onSuccess,
  onCancel,
  onError,
}: StripePaymentModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-4xl w-full max-w-lg shadow-2xl overflow-hidden"
        >
          <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h2 className="text-2xl font-semibold text-secondary">
                Payment Method
              </h2>
              <p className="text-gray text-sm mt-1">
                Enter your card details to complete payment
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="p-8">
            <Elements stripe={stripePromise}>
              <StripePaymentForm
                paymentIntentId={paymentIntentId}
                clientSecret={clientSecret}
                amount={amount}
                currency={currency}
                billingDetails={billingDetails}
                stripeCustomerId={stripeCustomerId}
                existingMethods={existingMethods}
                onSuccess={onSuccess}
                onCancel={onCancel}
                onError={onError}
              />
            </Elements>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default StripePaymentModal;
