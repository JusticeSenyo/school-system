// Vercel Serverless Function: Initialize a Paystack transaction
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ status: false, message: "Method Not Allowed" });
  }

  try {
    const secret = process.env.PAYSTACK_SECRET_KEY || "";
    if (!secret.startsWith("sk_")) {
      return res.status(500).json({ status: false, message: "PAYSTACK_SECRET_KEY not configured" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { email, amount, currency, channels, reference, callback_url, metadata } = body;

    const upstream = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount,       // subunits
        currency,     // e.g. GHS
        channels,     // optional array
        reference,
        callback_url, // optional
        metadata,     // object or string
      }),
    });

    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (e) {
    return res.status(500).json({ status: false, message: e?.message || "init failed" });
  }
};
