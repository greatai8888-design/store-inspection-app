import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface SendEmailParams {
  to: string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    await transporter.sendMail({
      from: `巡店系統 <${process.env.GMAIL_USER}>`,
      to: to.join(', '),
      subject,
      html,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Email send failed:', error);
    return { success: false, error: error.message };
  }
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
      <p><a href="${pdfUrl}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">下載 PDF 報告</a></p>
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
