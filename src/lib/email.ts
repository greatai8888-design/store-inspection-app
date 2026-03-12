// Email service - replace RESEND_API_KEY in .env.local with your actual key
// Sign up at https://resend.com to get an API key

interface SendEmailParams {
  to: string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey === 'YOUR_RESEND_API_KEY_HERE') {
    console.log('[Email Placeholder] Would send email:');
    console.log(`  To: ${to.join(', ')}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body length: ${html.length} chars`);
    return { success: true, placeholder: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'Store Inspection <noreply@yourdomain.com>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error('Email send failed:', error);
    return { success: false, error };
  }

  return { success: true };
}

export async function sendInspectionReport(
  to: string[],
  storeName: string,
  pdfUrl: string,
  inspectorEmail: string
) {
  return sendEmail({
    to,
    subject: `巡店報告 - ${storeName}`,
    html: `
      <h2>巡店報告</h2>
      <p>門店：${storeName}</p>
      <p>巡檢人：${inspectorEmail}</p>
      <p>時間：${new Date().toLocaleString('zh-TW')}</p>
      <p><a href="${pdfUrl}">下載 PDF 報告</a></p>
    `,
  });
}

export async function sendOverdueWarning(
  to: string[],
  storeName: string,
  daysSince: number
) {
  return sendEmail({
    to,
    subject: `⚠️ 巡店逾期警告 - ${storeName}`,
    html: `
      <h2>巡店逾期警告</h2>
      <p>門店「${storeName}」已超過 <strong>${daysSince}</strong> 天未巡店。</p>
      <p>請盡快安排巡店。</p>
    `,
  });
}
