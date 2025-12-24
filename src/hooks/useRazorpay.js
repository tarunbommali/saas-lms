import { useState, useCallback } from "react";
import { createEnrollmentWithPayment } from "../services/index.js";

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

/**
 * Custom hook to manage the Razorpay checkout process.
 * It loads the Razorpay SDK script and provides a payment initiation function.
 * @param {object} currentUser - The authenticated user object (from useAuth).
 * @param {function} onPaymentSuccess - Callback function to run after successful payment confirmation.
 */
const useRazorpay = (currentUser, onPaymentSuccess) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dynamic Script Loading Function
  const loadScript = useCallback((src) => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  // Main Payment Initiation Function
  const initializePayment = useCallback(
    async (paymentDetails) => {
      if (!currentUser || !RAZORPAY_KEY_ID) {
        setError("Authentication or Razorpay Key is missing.");
        return false;
      }

      setIsLoading(true);
      setError(null);

      // Ensure Razorpay script is loaded
      const res = await loadScript(
        "https://checkout.razorpay.com/v1/checkout.js"
      );

      if (!res) {
        setError(
          "Razorpay SDK failed to load. Are you connected to the internet?"
        );
        setIsLoading(false);
        return false;
      }

      const amountInPaise = Math.round(paymentDetails.amount * 100);

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: "INR",
        name: "JNTU-GV Certification",
        description: `Enrollment for ${paymentDetails.courseTitle}`,
        image: "YOUR_COURSE_LOGO_URL",
        order_id: paymentDetails.orderId || "",

        handler: async (response) => {
          try {
            const enrollmentPayload = {
              courseId: paymentDetails.courseId,
              courseTitle: paymentDetails.courseTitle,
              status: "SUCCESS",
              paymentData: {
                paymentId: response.razorpay_payment_id,
                method: "online",
                status: "captured",
                amount: paymentDetails.amount,
                amountPaid: paymentDetails.amount,
                couponCode: paymentDetails.coupon || null,
                couponDiscount: paymentDetails.couponDiscount || 0,
                razorpay: {
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  signature: response.razorpay_signature,
                },
              },
              billingInfo: paymentDetails.billingInfo,
            };

            const paymentPayload = {
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              courseId: paymentDetails.courseId,
              amount: paymentDetails.amount,
              currency: "INR",
              status: "captured",
              couponCode: paymentDetails.coupon || null,
              couponDiscount: paymentDetails.couponDiscount || 0,
              metadata: {
                signature: response.razorpay_signature,
              },
            };

            const result = await createEnrollmentWithPayment(enrollmentPayload, paymentPayload);

            if (!result?.success) {
              setError(result?.error || "Payment recorded, but enrollment could not be saved. Please contact support.");
              return;
            }

            if (onPaymentSuccess) {
              const enrollmentId = result.data?.enrollment?.id || result.data?.enrollment?.enrollmentId || null;
              onPaymentSuccess(enrollmentId, paymentDetails.courseId);
            }
          } catch (err) {
            const message = err?.message ? ` (${err.message})` : '';
            setError(`Payment recorded, but enrollment could not be saved. Please contact support.${message}`);
          } finally {
            setIsLoading(false);
          }
        },

        // Pre-fill user details for better conversion
        prefill: {
          name: paymentDetails.billingInfo?.name || currentUser.displayName || "",
          email: paymentDetails.billingInfo?.email || currentUser.email || "",
          contact: paymentDetails.billingInfo?.phone || currentUser.phoneNumber || "",
        },

        theme: {
          color: "#004080",
        },
      };

      const rzp1 = new window.Razorpay(options);

      // Handle payment failure event
      rzp1.on("payment.failed", function (response) {
        setError(
          `Payment failed. Code: ${response.error.code}. Reason: ${response.error.description}`
        );
        setIsLoading(false);
      });

      rzp1.open();
      setIsLoading(false);
      return true;
    },
    [currentUser, loadScript, onPaymentSuccess]
  );

  return { initializePayment, isLoading, error };
};

export default useRazorpay;