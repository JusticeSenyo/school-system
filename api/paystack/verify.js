export default async function handler(req, res) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    res.status(500).json({ status: false, message: 'PAYSTACK_SECRET_KEY not set' });
    return;
  }

  const ref = req.query?.ref || req.query?.reference;
  if (!ref) {
    res.status(400).json({ status: false, message: 'Missing ref' });
    return;
  }

  try {
    const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}` },
    });
    const j = await r.json();
    res.status(r.ok ? 200 : r.status).json(j);
  } catch (err) {
    res.status(500).json({ status: false, message: err?.message || 'Verify failed' });
  }
}
