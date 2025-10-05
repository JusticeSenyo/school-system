// Vercel Serverless Function: Verify a Paystack transaction
module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ status: false, message: "Method Not Allowed" });
  }

  try {
    const secret = process.env.PAYSTACK_SECRET_KEY || "";
    if (!secret.startsWith("sk_")) {
      return res.status(500).json({ status: false, message: "PAYSTACK_SECRET_KEY not configured" });
    }

    const ref = req.query?.ref || req.query?.reference;
    if (!ref) {
      return res.status(400).json({ status: false, message: "Missing ref" });
    }

    const upstream = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );

    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (e) {
    return res.status(500).json({ status: false, message: e?.message || "verify failed" });
  }
};
