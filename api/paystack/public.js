// Vercel Serverless Function: returns a safe PUBLIC key
export default async function handler(req, res) {
  try {
    const key =
      process.env.VITE_PAYSTACK_PUBLIC_KEY ||
      process.env.REACT_APP_PAYSTACK_PUBLIC_KEY ||
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
      process.env.PAYSTACK_PUBLIC_KEY || "";
    res.status(200).json({ key });
  } catch (err) {
    res.status(500).json({ key: "", error: err?.message || "Failed to read public key" });
  }
}

