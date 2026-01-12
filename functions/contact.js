export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();

    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone') || 'Not provided';
    const message = formData.get('message');

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Send notification to Ryan
    const notificationEmail = fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Milne Masonry Website <noreply@milnemasonry.com>',
        to: 'ryan@milnemasonry.com',
        subject: `New Contact Form: ${name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      })
    });

    // Send confirmation to the customer
    const confirmationEmail = fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Milne Masonry <noreply@milnemasonry.com>',
        to: email,
        subject: 'Thanks for reaching out - Milne Masonry',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1d23;">Thanks for reaching out, ${name}!</h2>
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
        `
      })
    });

    // Send both emails in parallel
    const [notificationRes, confirmationRes] = await Promise.all([notificationEmail, confirmationEmail]);

    if (!notificationRes.ok) {
      console.error('Notification email error:', await notificationRes.text());
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log confirmation email errors but don't fail the request
    if (!confirmationRes.ok) {
      console.error('Confirmation email error:', await confirmationRes.text());
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
