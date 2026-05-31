import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/user.js';
import { PLAN_LIMITS } from '../middleware/planLimits.js';

// Lazily construct the Razorpay client on first use. Building it eagerly at
// import time throws when RAZORPAY_* keys are absent (e.g. CI/tests), which
// would crash the whole app on import. This defers that to actual payment calls.
let _razorpay = null;
function getRazorpay() {
    if (!_razorpay) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            throw Object.assign(new Error('Payments are not configured on the server.'), { status: 503 });
        }
        _razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return _razorpay;
}

const PRO_AMOUNT = 49900; // ₹499 in paise

export const createOrder = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('subscription');
        if (!user) return res.status(401).json({ message: "User not found" });

        if (user.subscription.plan === 'PRO') {
            return res.status(400).json({ message: "Already on Pro plan" });
        }

        const order = await getRazorpay().orders.create({
            amount: PRO_AMOUNT,
            currency: 'INR',
            receipt: `user_${Date.now()}`,
            notes: { userId: req.userId }
        });

        res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error("Error creating order:", error?.error?.description || error.message);
        res.status(500).json({ error: "Failed to create payment order" });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Missing payment verification fields" });
        }

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: "Invalid payment signature" });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(401).json({ message: "User not found" });

        user.subscription.plan = 'PRO';
        user.subscription.razorpayPaymentId = razorpay_payment_id;
        // 1-year access (hackathon demo — no recurring billing).
        const periodEnd = new Date();
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        user.subscription.currentPeriodEnd = periodEnd;
        await user.save();

        res.status(200).json({
            message: "Payment verified. Upgraded to Pro!",
            plan: 'PRO',
            currentPeriodEnd: user.subscription.currentPeriodEnd
        });
    } catch (error) {
        console.error("Error verifying payment:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const cancelSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(401).json({ message: "User not found" });

        if (user.subscription.plan !== 'PRO') {
            return res.status(400).json({ message: "No active Pro subscription" });
        }

        user.subscription.plan = 'FREE';
        user.subscription.razorpayPaymentId = null;
        user.subscription.currentPeriodEnd = null;
        await user.save();

        res.status(200).json({ message: "Subscription cancelled. Downgraded to Free." });
    } catch (error) {
        console.error("Error cancelling subscription:", error.message);
        res.status(500).json({ error: "Failed to cancel subscription" });
    }
};

// JSON.stringify(Infinity) emits null, which would land on the client as
// "limit: null" and break any "X / Y used" UI. Serialize unlimited as -1
// so the client can render a clear "Unlimited" without ambiguity.
const serializeLimit = (n) => (n === Infinity ? -1 : n);

export const getSubscriptionStatus = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('subscription').lean();
        if (!user) return res.status(401).json({ message: "User not found" });

        const plan = user.subscription?.plan || 'FREE';
        res.status(200).json({
            plan,
            currentPeriodEnd: user.subscription?.currentPeriodEnd || null,
            aiRequestsUsed: user.subscription?.aiRequestsUsed || 0,
            aiRequestsResetAt: user.subscription?.aiRequestsResetAt || null,
            limits: {
                workspaces:  serializeLimit(PLAN_LIMITS.workspaces[plan]),
                projects:    serializeLimit(PLAN_LIMITS.projects[plan]),
                tasks:       serializeLimit(PLAN_LIMITS.tasks[plan]),
                wikiPages:   serializeLimit(PLAN_LIMITS.wikiPages[plan]),
                whiteboards: serializeLimit(PLAN_LIMITS.whiteboards[plan]),
                snippets:    serializeLimit(PLAN_LIMITS.snippets[plan]),
                members:     serializeLimit(PLAN_LIMITS.members[plan]),
                aiRequests:  serializeLimit(PLAN_LIMITS.aiRequests[plan])
            }
        });
    } catch (error) {
        console.error("Error fetching subscription status:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
