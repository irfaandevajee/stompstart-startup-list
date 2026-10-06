const BASE = 'https://live-api.panta.market/api/v1';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email_and_password_required' });
    }

    const login = await fetch(`${BASE}/auth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const loginText = await login.text();
    if (!login.ok) {
      return res.status(login.status).json({ error: 'panta_login_failed', detail: loginText.slice(0, 500) });
    }

    const session = JSON.parse(loginText);
    if (!session.access) {
      return res.status(502).json({ error: 'missing_access_token' });
    }

    const keyRes = await fetch(`${BASE}/account/keys/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ env: 'test', name: 'SignalDesk Hackathon', revokeOthers: false }),
    });

    const keyText = await keyRes.text();
    if (!keyRes.ok) {
      return res.status(keyRes.status).json({ error: 'key_creation_failed', detail: keyText.slice(0, 500) });
    }

    const key = JSON.parse(keyText);
    return res.status(200).json({
      ok: true,
      secret: key.secret || null,
      id: key.id || key.keyId || null,
      name: key.name || 'SignalDesk Hackathon',
      env: key.env || 'test',
    });
  } catch (error) {
    return res.status(500).json({ error: 'bootstrap_failed', detail: String(error && error.message ? error.message : error) });
  }
};
