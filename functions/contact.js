const ALLOWED_ORIGINS = [
  'https://milnemasonry.com',
  'https://www.milnemasonry.com',
];

// Per-IP submission cap. The Cache API is per-datacenter rather than global,
// so this throttles abuse rather than enforcing an exact global count.
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 3600;

const MAX_LENGTHS = {
  name: 100,
  email: 254,
  phone: 40,
  message: 5000,
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Reads and increments a per-IP counter held in the edge cache. Fails open:
// if the cache is unavailable the submission is allowed through.
async function checkRateLimit(ip) {
  if (!ip) return { allowed: true };

  const key = new Request(`https://ratelimit.milnemasonry.com/contact/${encodeURIComponent(ip)}`);
  const cache = caches.default;

  try {
    const hit = await cache.match(key);
    const count = hit ? Number(await hit.text()) || 0 : 0;

    if (count >= RATE_LIMIT) return { allowed: false };

    await cache.put(
      key,
      new Response(String(count + 1), {
        headers: { 'Cache-Control': `max-age=${RATE_WINDOW_SECONDS}` },
      })
    );
    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check failed, allowing request:', error);
    return { allowed: true };
  }
}

async function sendEmail(apiKey, payload) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function onRequestPost(context) {
  try {
    // Only accept submissions posted from our own pages.
    const origin = context.request.headers.get('Origin');
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: 'Forbidden' }, 403);
    }

    const formData = await context.request.formData();

    // Honeypot: a hidden field real people never see, so anything that fills
    // it is a bot. Report success so the sender learns nothing.
    if (formData.get('website')) {
      return json({ success: true }, 200);
    }

    const name = (formData.get('name') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const phone = (formData.get('phone') || '').toString().trim() || 'Not provided';
    const message = (formData.get('message') || '').toString().trim();

    if (!name || !email || !message) {
      return json({ error: 'Missing required fields' }, 400);
    }

    if (
      name.length > MAX_LENGTHS.name ||
      email.length > MAX_LENGTHS.email ||
      phone.length > MAX_LENGTHS.phone ||
      message.length > MAX_LENGTHS.message
    ) {
      return json({ error: 'Field too long' }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Invalid email address' }, 400);
    }

    const ip = context.request.headers.get('CF-Connecting-IP');
    const { allowed } = await checkRateLimit(ip);
    if (!allowed) {
      return json({ error: 'Too many submissions. Please call us instead.' }, 429);
    }

    const safe = {
      name: escapeHtml(name),
      email: escapeHtml(email),
      phone: escapeHtml(phone),
      message: escapeHtml(message).replace(/\n/g, '<br>'),
    };

    // Notify Ryan first. The confirmation goes to a visitor-supplied address,
    // so it only sends once a real notification has landed in our own inbox.
    const notificationRes = await sendEmail(context.env.RESEND_API_KEY, {
      from: 'Milne Masonry Website <noreply@milnemasonry.com>',
      to: 'ryan@milnemasonry.com',
      reply_to: email,
      subject: `New Contact Form: ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${safe.name}</p>
        <p><strong>Email:</strong> ${safe.email}</p>
        <p><strong>Phone:</strong> ${safe.phone}</p>
        <p><strong>Message:</strong></p>
        <p>${safe.message}</p>
      `,
    });

    if (!notificationRes.ok) {
      console.error('Notification email error:', await notificationRes.text());
      return json({ error: 'Failed to send email' }, 500);
    }

    const confirmationRes = await sendEmail(context.env.RESEND_API_KEY, {
      from: 'Milne Masonry <noreply@milnemasonry.com>',
      to: email,
      subject: 'Thanks for reaching out - Milne Masonry',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1d23;">Thanks for reaching out, ${safe.name}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            We received your message and will get back to you within 24 hours.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            If your project is urgent, feel free to give us a call at <a href="tel:5036586444" style="color: #3b82f6;">503.658.6444</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Milne Masonry</strong><br>
            14489 SE Hwy 212, Clackamas, OR 97015<br>
            <a href="tel:5036586444" style="color: #3b82f6;">503.658.6444</a> ·
            <a href="mailto:ryan@milnemasonry.com" style="color: #3b82f6;">ryan@milnemasonry.com</a>
          </p>
        </div>
      `,
    });

    // Log confirmation email errors but don't fail the request
    if (!confirmationRes.ok) {
      console.error('Confirmation email error:', await confirmationRes.text());
    }

    return json({ success: true }, 200);
  } catch (error) {
    console.error('Error:', error);
    return json({ error: 'Server error' }, 500);
  }
}
