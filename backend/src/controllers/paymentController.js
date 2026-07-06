import Stripe from "stripe";

// Initialize using your private Stripe Secret Key packed securely inside your .env file
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

export const createPaymentIntent = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid transaction amount variable." });
    }

    // Stripe processes values in the smallest currency unit (e.g., Paise for INR, Cents for USD).
    // Multiply by 100 to map the price point correctly.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100),
      currency: "inr",
      metadata: { userId: req.user.id.toString() },
      automatic_payment_methods: { enabled: true },
    });

    // Send the clientSecret token back to the frontend to authorize the UI card elements mesh
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error("❌ Stripe PaymentIntent Creation Failure:", err.message);
    res.status(500).json({ error: err.message });
  }
};