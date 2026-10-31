/**
 * PROTOF (protof.pl) — Cloudflare Worker do obsługi formularza kontaktowego
 * Wysyła zgłoszenie na kontakt@protof.pl oraz (opcjonalnie) kopię potwierdzenia do nadawcy
 * przez Microsoft Graph API (OAuth 2.0 Client Credentials) + weryfikację Cloudflare Turnstile.
 *
 * Wymagane zmienne (Settings -> Variables and Secrets w panelu Cloudflare Workera):
 *   - TENANT_ID             : Identyfikator dzierżawy Microsoft Entra ID
 *   - CLIENT_ID             : Identyfikator aplikacji (klienta) Microsoft Entra ID
 *   - CLIENT_SECRET         : Wartość klucza tajnego z Entra ID (jako Secret!)
 *   - CONTACT_MAILBOX       : kontakt@protof.pl (lub omnidesk@protof.pl do wysyłki technicznej)
 *   - TURNSTILE_SECRET_KEY  : Secret Key z Cloudflare Turnstile (jako Secret! Opcjonalne na czas pierwszego testu)
 */

const ALLOWED_ORIGINS = [
  'https://protof.pl',
  'https://www.protof.pl',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://localhost:8080'
];

function getCorsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://protof.pl';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 160;
}

async function getGraphAccessToken(env) {
  const tokenUrl = `https://login.microsoftonline.com/${env.TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: env.CLIENT_ID,
    client_secret: env.CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Entra ID token error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function sendGraphMail({ accessToken, senderMailbox, fromName, toEmail, replyToEmail, replyToName, subject, htmlBody, saveToSentItems }) {
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderMailbox)}/sendMail`;

  const message = {
    subject,
    body: {
      contentType: 'HTML',
      content: htmlBody
    },
    from: {
      emailAddress: {
        address: senderMailbox,
        name: fromName
      }
    },
    toRecipients: [
      {
        emailAddress: {
          address: toEmail
        }
      }
    ]
  };

  if (replyToEmail) {
    message.replyTo = [
      {
        emailAddress: {
          address: replyToEmail,
          name: replyToName || replyToEmail
        }
      }
    ];
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      saveToSentItems: Boolean(saveToSentItems)
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph sendMail error (${res.status}): ${errText}`);
  }
}

function buildInternalEmailHtml({ name, email, message, sendCopy, timestamp }) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMsg = escapeHtml(message).replace(/\r?\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background-color:#070b14;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background:#0d1527;border:1px solid #1e293b;border-radius:14px;overflow:hidden;">
    <tr>
      <td style="padding:24px 28px;background:linear-gradient(135deg,#0891b2 0%,#0f172a 100%);border-bottom:1px solid #1e293b;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#67e8f9;font-weight:700;">PROTOF.PL • FORMULARZ KONTAKTOWY</div>
        <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;">Nowe zapytanie ze strony internetowej</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 28px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#090e1a;border:1px solid #1e293b;border-radius:10px;padding:16px;margin-bottom:20px;">
          <tr>
            <td style="padding:6px 8px;color:#94a3b8;font-size:13px;width:130px;">Nadawca / Firma:</td>
            <td style="padding:6px 8px;color:#ffffff;font-size:14px;font-weight:600;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding:6px 8px;color:#94a3b8;font-size:13px;">Adres e-mail:</td>
            <td style="padding:6px 8px;font-size:14px;"><a href="mailto:${safeEmail}" style="color:#22d3ee;text-decoration:none;font-weight:600;">${safeEmail}</a></td>
          </tr>
          <tr>
            <td style="padding:6px 8px;color:#94a3b8;font-size:13px;">Data zgłoszenia:</td>
            <td style="padding:6px 8px;color:#cbd5e1;font-size:13px;">${escapeHtml(timestamp)}</td>
          </tr>
          <tr>
            <td style="padding:6px 8px;color:#94a3b8;font-size:13px;">Kopia dla klienta:</td>
            <td style="padding:6px 8px;color:#cbd5e1;font-size:13px;">${sendCopy ? 'Tak (wysłano potwierdzenie)' : 'Nie'}</td>
          </tr>
        </table>

        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:8px;font-weight:600;">Treść wiadomości:</div>
        <div style="background:#090e1a;border-left:3px solid #00ced1;border-radius:6px;padding:16px 18px;color:#f1f5f9;font-size:14px;line-height:1.6;">
          ${safeMsg}
        </div>

        <p style="margin:20px 0 0;font-size:12px;color:#64748b;">
          Wskazówka: kliknij <strong>Odpowiedz</strong> w programie pocztowym, aby odpisać bezpośrednio na adres <strong>${safeEmail}</strong>.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildCopyForSenderHtml({ name, message, timestamp }) {
  const safeName = escapeHtml(name);
  const safeMsg = escapeHtml(message).replace(/\r?\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
    <tr>
      <td style="padding:26px 30px;background:linear-gradient(135deg,#090e1a 0%,#0e3a47 100%);">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#22d3ee;font-weight:700;">PROTOF • SOLUTIONS DRIVEN BY THE FUTURE</div>
        <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;">Potwierdzenie wysłania wiadomości</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:26px 30px;">
        <p style="margin:0 0 14px;font-size:15px;color:#1e293b;line-height:1.6;">
          Dzień dobry <strong>${safeName}</strong>,
        </p>
        <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
          Dziękujemy za kontakt z <strong>PROTOF</strong>. Otrzymaliśmy Twoje zapytanie i odpowiemy na nie najszybciej, jak to możliwe. Poniżej przesyłamy kopię Twojej wiadomości (${escapeHtml(timestamp)}):
        </p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #00ced1;border-radius:8px;padding:16px 18px;color:#1e293b;font-size:14px;line-height:1.6;margin-bottom:22px;">
          ${safeMsg}
        </div>

        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">
          Pozdrawiamy,<br>
          <strong>Zespół PROTOF</strong><br>
          <a href="https://protof.pl" style="color:#0891b2;text-decoration:none;">protof.pl</a> • <a href="mailto:kontakt@protof.pl" style="color:#0891b2;text-decoration:none;">kontakt@protof.pl</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = getCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const payload = await request.json();
      const name = String(payload.name || '').trim();
      const email = String(payload.email || '').trim();
      const message = String(payload.message || '').trim();
      const sendCopy = Boolean(payload.sendCopy);
      const honeypot = String(payload.website || '').trim();
      const turnstileToken = String(payload.turnstileToken || '').trim();

      // 1. Pułapka Honeypot na proste boty
      if (honeypot.length > 0) {
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
      }

      // 2. Walidacja pól formularza
      if (name.length < 2 || name.length > 120) {
        return new Response(JSON.stringify({ ok: false, error: 'Podaj imię lub nazwę firmy (2–120 znaków).' }), {
          status: 400,
          headers: corsHeaders
        });
      }

      if (!isValidEmail(email)) {
        return new Response(JSON.stringify({ ok: false, error: 'Podaj prawidłowy adres e-mail.' }), {
          status: 400,
          headers: corsHeaders
        });
      }

      if (message.length < 5 || message.length > 4000) {
        return new Response(JSON.stringify({ ok: false, error: 'Wiadomość powinna zawierać od 5 do 4000 znaków.' }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // 3. Weryfikacja Cloudflare Turnstile (gdy klucz TURNSTILE_SECRET_KEY jest ustawiony w Workerze)
      if (env.TURNSTILE_SECRET_KEY) {
        if (!turnstileToken) {
          return new Response(JSON.stringify({ ok: false, error: 'Potwierdź weryfikację anty-spam (Turnstile).' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        const ip = request.headers.get('CF-Connecting-IP') || '';
        const verifyForm = new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: ip
        });

        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: verifyForm.toString()
        });

        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          return new Response(JSON.stringify({ ok: false, error: 'Weryfikacja anty-spam nie powiodła się. Odśwież stronę i spróbuj ponownie.' }), {
            status: 403,
            headers: corsHeaders
          });
        }
      }

      // 4. Pobranie tokenu OAuth 2.0 z Microsoft Entra ID i wysyłka przez Graph API
      const contactMailbox = (env.CONTACT_MAILBOX || 'kontakt@protof.pl').trim();
      const accessToken = await getGraphAccessToken(env);

      const timestamp = new Intl.DateTimeFormat('pl-PL', {
        timeZone: 'Europe/Warsaw',
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(new Date());

      // Wiadomość #1 -> do firmy (kontakt@protof.pl) z Reply-To na klienta
      await sendGraphMail({
        accessToken,
        senderMailbox: contactMailbox,
        fromName: 'Protof — Formularz WWW',
        toEmail: contactMailbox,
        replyToEmail: email,
        replyToName: name,
        subject: `Zapytanie ze strony protof.pl od: ${name}`,
        htmlBody: buildInternalEmailHtml({ name, email, message, sendCopy, timestamp }),
        saveToSentItems: false
      });

      // Wiadomość #2 -> kopia potwierdzająca dla klienta (jeśli zaznaczył checkbox)
      if (sendCopy) {
        await sendGraphMail({
          accessToken,
          senderMailbox: contactMailbox,
          fromName: 'Protof — Kontakt',
          toEmail: email,
          replyToEmail: contactMailbox,
          replyToName: 'Protof — Kontakt',
          subject: 'Potwierdzenie otrzymania wiadomości — PROTOF (protof.pl)',
          htmlBody: buildCopyForSenderHtml({ name, message, timestamp }),
          saveToSentItems: true
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: corsHeaders
      });
    } catch (err) {
      console.error('[protof-contact-worker]', err);
      return new Response(JSON.stringify({
        ok: false,
        error: 'Wystąpił problem podczas wysyłania wiadomości. Napisz bezpośrednio na kontakt@protof.pl.'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};

