export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ status: false, message: 'Method Not Allowed' });
    return;
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    res.status(500).json({ status: false, message: 'PAYSTACK_SECRET_KEY not set' });
    return;
  }

  try {
    const { email, amount, currency, channels, reference, callback_url, metadata } = req.body || {};
    const r = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, amount, currency, channels, reference, callback_url, metadata }),
    });
    const j = await r.json();
    res.status(r.ok ? 200 : r.status).json(j);
  } catch (err) {
    res.status(500).json({ status: false, message: err?.message || 'Init failed' });
  }
}
