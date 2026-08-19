# Auto-AI India — Razorpay One-Time Payments

Auto-AI India uses Razorpay Standard Checkout for one-time Premium and Dealer/Business payments. There are no recurring subscriptions in this payment flow.

## Plans

| Plan | Amount | Billing |
| --- | ---: | --- |
| Premium | ₹199 | One time |
| Dealer / Business | ₹999 | One time |

## Required server secrets

Configure these only in the backend deployment environment (Render). Never commit them to GitHub and never expose secrets in browser code.

```text
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

The Key ID may be returned to the frontend for Checkout. The Key Secret and Webhook Secret must remain server-side.

## Payment flow

1. Signed-in customer selects a plan.
2. Auto-AI India creates a fresh Razorpay Order server-side.
3. The frontend opens Razorpay Standard Checkout with that Order ID.
4. Razorpay returns `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
5. Auto-AI India verifies the signature server-side using HMAC-SHA256 before granting access.
6. Payment/order identifiers are stored in MongoDB for audit and idempotency.
7. Razorpay webhooks provide server-side reconciliation for captured payments.

## Security rules

- Never accept the amount from the browser. The server selects the plan and amount.
- Never put `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` in frontend code.
- Verify the payment signature before activating Premium/Dealer access.
- Use the server-stored Razorpay order ID for verification.
- Treat only captured/confirmed payments as fulfilled.
- Keep webhook handling idempotent.
- Use Test Mode keys until the full test flow passes.

## Razorpay dashboard setup

1. Create/verify the Razorpay account.
2. In Test Mode, generate API keys from Account & Settings → API Keys.
3. Add the Test Key ID and Key Secret to Render backend environment variables.
4. Generate a webhook secret and add it to Render as `RAZORPAY_WEBHOOK_SECRET`.
5. Configure automatic payment capture in Razorpay if desired.
6. Configure the webhook URL after the backend endpoint is deployed.
7. Test UPI/cards and failed-payment paths before switching to Live Mode.

Official integration reference: https://razorpay.com/docs/developer-tools/integrations/standard-checkout/
