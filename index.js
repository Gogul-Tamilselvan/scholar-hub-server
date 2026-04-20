import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// ── Rate Limiting ────────────────────────────────────────────────────────────

// General API protection (100 per 15 mins)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Tight limit for email sending (10 per minute)
const mailLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Mail quota reached. Please wait a minute before sending more.' }
});

app.use(apiLimiter);

// ── Security Guard ───────────────────────────────────────────────────────────
// Protects all email endpoints
app.use('/send', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const VALID_KEY = process.env.MAIL_API_KEY || 'scholar_india_mail_secret_2026';
  
  if (!apiKey || apiKey !== VALID_KEY) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing API key' });
  }
  next();
}, mailLimiter);

// ── Transporter ─────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

transporter.verify((err) => {
  if (err) console.error('❌ Mail error:', err.message);
  else     console.log('✅ Mail server ready');
});

const FROM = `"Scholar India Publishers" <${process.env.MAIL_USER}>`;

async function sendMail({ to, subject, html }) {
  return transporter.sendMail({ from: FROM, to, subject, html });
}

// ── Shared Styles ────────────────────────────────────────────────────────────
const wrapper = (content) => `
<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:20px;background:#f1f5f9;font-family:Arial,sans-serif;">
  <div style="max-width:620px;margin:auto;">
    <!-- Header -->
    <div style="background:#213361;padding:20px 32px;border-radius:10px 10px 0 0;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:0.5px;">Scholar India Publishers</h1>
      <p style="color:#93c5fd;margin:4px 0 0;font-size:12px;font-style:italic;">International Peer-Reviewed Academic Journals and Book Publishing Excellence Since 2022</p>
    </div>
    <!-- Body -->
    <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="background:#213361;padding:16px 32px;border-radius:0 0 10px 10px;text-align:center;">
      <p style="margin:0;color:#93c5fd;font-size:11px;">© 2026 Scholar India Publishers | Chennai, Tamil Nadu, India</p>
      <p style="margin:4px 0 0;color:#60a5fa;font-size:11px;">www.scholarindiapub.com</p>
      <p style="margin:6px 0 0;color:#475569;font-size:10px;">This is a computer-generated email. No signature is required.</p>
    </div>
  </div>
</body></html>`;

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Scholar India Mail Server' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ════════════════════════════════════════════════════════════════════════════
// 1. MANUSCRIPT SUBMISSION CONFIRMATION
// POST /send/manuscript-submitted
// { name, email, manuscriptId, title, journal, researchField }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/manuscript-submitted', async (req, res) => {
  const { name, email, manuscriptId, title, journal, researchField } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const html = wrapper(`
    <p style="color:#1e293b;font-size:15px;">Dear <strong>${name || 'Author'}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;">
      Your manuscript has been successfully submitted to <strong>Scholar India Publishers</strong>. 
      Our editorial team will begin the review process shortly.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;width:40%;">Manuscript ID</td>
            <td style="padding:6px 0;font-size:14px;font-weight:900;color:#213361;font-family:monospace;">${manuscriptId || 'Pending'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Title</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#334155;">${title || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Journal</td>
            <td style="padding:6px 0;font-size:13px;color:#334155;">${journal || '—'}</td></tr>
        ${researchField ? `<tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Research Field</td>
            <td style="padding:6px 0;font-size:13px;color:#334155;">${researchField}</td></tr>` : ''}
      </table>
    </div>
    <p style="color:#475569;font-size:13px;line-height:1.6;">
      You will receive further updates as your manuscript progresses through peer review. 
      Please retain your Manuscript ID for all future correspondence.
    </p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;"/>
    <p style="color:#94a3b8;font-size:12px;">Best Regards,<br/><strong>Editorial Team</strong><br/>Scholar India Publishers<br/>scholarindiapub@gmail.com</p>
  `);

  try {
    await sendMail({ to: email, subject: `Manuscript Received – ${manuscriptId || 'New'} | Scholar India Publishers`, html });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 2. EDITOR / REVIEWER APPLICATION CONFIRMATION
// POST /send/reviewer-applied
// { name, email, reviewerId, role, journal }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/reviewer-applied', async (req, res) => {
  const { name, email, reviewerId, role, journal } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const html = wrapper(`
    <div style="text-align:center;margin-bottom:20px;">
      <span style="background:#dbeafe;color:#1d4ed8;padding:4px 16px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.05em;">APPLICATION RECEIVED</span>
    </div>
    <p style="color:#1e293b;font-size:15px;">Dear <strong>${name || 'Applicant'}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;">
      Thank you for applying as a <strong>${role || 'Reviewer'}</strong> for 
      <strong>${journal || 'Scholar India Publishers'}</strong>. 
      We have received your application and profile successfully.
    </p>
    <div style="background:#213361;border-radius:10px;padding:20px;margin:24px 0;text-align:center;">
      <p style="color:#93c5fd;margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Your Application ID</p>
      <p style="color:#fff;margin:0;font-size:26px;font-weight:900;font-family:monospace;letter-spacing:0.08em;">${reviewerId || '—'}</p>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Please save this ID. You can use it to track your application status on our website.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://scholar-india-publishers.vercel.app/reviewer-search" 
         style="background:#213361;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;display:inline-block;">
        Track Application Status →
      </a>
    </div>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;"/>
    <p style="color:#94a3b8;font-size:12px;">Best Regards,<br/><strong>Editorial Office</strong><br/>Scholar India Publishers<br/>scholarindiapub@gmail.com</p>
  `);

  try {
    await sendMail({ to: email, subject: `Application Received – ${reviewerId} | Scholar India Publishers`, html });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 3. PAYMENT CONFIRMED – SEND INVOICE
// POST /send/payment-invoice
// { name, email, manuscriptId, title, amount, paymentMode, transactionRef,
//   paymentDate, invoiceNo }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/payment-invoice', async (req, res) => {
  const { name, email, manuscriptId, title, amount, paymentMode, transactionRef, paymentDate, invoiceNo } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const today = paymentDate || new Date().toLocaleDateString('en-GB');
  const inv = invoiceNo || `SIP${Date.now().toString().slice(-8)}`;

  const html = wrapper(`
    <div style="text-align:center;margin-bottom:20px;">
      <span style="background:#16a34a;color:#fff;padding:5px 20px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.08em;">INVOICE</span>
    </div>

    <!-- Invoice Box -->
    <div style="border:2px solid #213361;border-radius:10px;overflow:hidden;">
      <!-- Invoice Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:20px 24px;border-bottom:2px solid #213361;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:44px;height:44px;background:#213361;border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <span style="color:#fff;font-weight:900;font-size:14px;">SIP</span>
          </div>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:16px;font-weight:900;color:#213361;text-transform:uppercase;letter-spacing:0.05em;">Invoice / Receipt</p>
          <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Invoice No: <strong>${inv}</strong></p>
          <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Date: ${today}</p>
        </div>
      </div>

      <!-- Bill To -->
      <div style="padding:16px 24px;border-bottom:1px solid #e2e8f0;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#213361;text-transform:uppercase;letter-spacing:0.05em;">Bill To:</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#1e293b;">${name || '—'}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#64748b;">${email}</p>
      </div>

      <!-- Service Table -->
      <div style="padding:0 24px;">
        <p style="font-size:11px;font-weight:700;color:#213361;text-transform:uppercase;letter-spacing:0.05em;margin:16px 0 8px;">Service Description</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#213361;">
              <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px;">Description</th>
              <th style="padding:10px 12px;text-align:right;color:#fff;font-size:12px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:12px;font-size:13px;color:#334155;">
                <strong>Article Processing Charges (APC)</strong><br/>
                <span style="font-size:11px;color:#64748b;">Manuscript ID: ${manuscriptId || '—'}</span><br/>
                <span style="font-size:11px;color:#64748b;">Title: ${title || '—'}</span>
              </td>
              <td style="padding:12px;text-align:right;font-size:14px;font-weight:700;color:#213361;">₹${amount || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Payment Info + Total -->
      <div style="padding:16px 24px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #e2e8f0;flex-wrap:wrap;gap:12px;">
        <div>
          <p style="margin:0 0 4px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;">Payment Information</p>
          <p style="margin:2px 0;font-size:12px;color:#475569;">Mode: ${paymentMode || '—'}</p>
          <p style="margin:2px 0;font-size:12px;color:#475569;">Transaction Ref: ${transactionRef || '—'}</p>
          <p style="margin:2px 0;font-size:12px;color:#475569;">Payment Date: ${today}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:16px;font-weight:900;color:#213361;">Grand Total: ₹${amount || '—'}</p>
          <p style="margin:4px 0 0;font-size:12px;font-weight:700;color:#16a34a;">Status: PAID IN FULL</p>
        </div>
      </div>

      <!-- Production Note -->
      <div style="background:#f0fdf4;border-top:2px solid #16a34a;padding:16px 24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#15803d;">Production Update:</p>
        <p style="margin:0;font-size:12px;color:#166534;line-height:1.6;">
          Your manuscript has been sent to our production department. This process (typesetting, proofing, and archiving) 
          takes a <strong>minimum of 30 working days</strong>. You will be notified with the DOI details immediately upon publication.
        </p>
      </div>
    </div>

    <p style="color:#475569;font-size:13px;margin-top:24px;">Best Regards,<br/><strong>Accounts Department</strong><br/>Scholar India Publishers<br/>scholarindiapub@gmail.com</p>
  `);

  try {
    await sendMail({ to: email, subject: `Invoice ${inv} – Payment Confirmed | Scholar India Publishers`, html });
    res.json({ success: true, invoiceNo: inv });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 4. REVIEWER ASSIGNED TO MANUSCRIPT
// POST /send/work-assigned
// { name, email, reviewerId, manuscriptId, manuscriptTitle, dueDate, manuscriptLink }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/work-assigned', async (req, res) => {
  const { name, email, reviewerId, manuscriptId, manuscriptTitle, dueDate, manuscriptLink } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const html = wrapper(`
    <div style="text-align:center;margin-bottom:20px;">
      <span style="background:#f0fdf4;color:#16a34a;padding:4px 16px;border-radius:20px;font-size:12px;font-weight:700;border:1px solid #bbf7d0;">NEW ASSIGNMENT</span>
    </div>
    <p style="color:#1e293b;font-size:15px;">Dear <strong>${name || 'Reviewer'}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;">
      A manuscript has been assigned to you for peer review. Please log in to your Reviewer Dashboard to accept or review the assignment.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #213361;border-radius:0 10px 10px 0;padding:20px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;width:40%;">Reviewer ID</td>
            <td style="padding:6px 0;font-size:13px;font-family:monospace;font-weight:700;color:#213361;">${reviewerId || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Manuscript ID</td>
            <td style="padding:6px 0;font-size:13px;font-family:monospace;font-weight:700;color:#213361;">${manuscriptId || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Title</td>
            <td style="padding:6px 0;font-size:13px;color:#334155;font-weight:600;">${manuscriptTitle || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Due Date</td>
            <td style="padding:6px 0;font-size:13px;color:#dc2626;font-weight:700;">${dueDate || 'As soon as possible'}</td></tr>
      </table>
    </div>
    ${manuscriptLink ? `
    <div style="text-align:center;margin:24px 0;">
      <a href="${manuscriptLink}" style="background:#213361;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;display:inline-block;">
        View Manuscript →
      </a>
    </div>` : ''}
    <p style="color:#475569;font-size:13px;line-height:1.6;">
      Please submit your review before the due date. For any queries, contact us at scholarindiapub@gmail.com.
    </p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;"/>
    <p style="color:#94a3b8;font-size:12px;">Best Regards,<br/><strong>Editorial Team</strong><br/>Scholar India Publishers</p>
  `);

  try {
    await sendMail({ to: email, subject: `New Review Assignment – ${manuscriptId} | Scholar India Publishers`, html });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 5. FINAL SUBMISSION ACCEPTED / APPROVED FOR PRODUCTION
// POST /send/final-accepted
// { name, email, manuscriptId, title, journal }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/final-accepted', async (req, res) => {
  const { name, email, manuscriptId, title, journal } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const html = wrapper(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:60px;height:60px;background:#f0fdf4;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:2px solid #16a34a;">
        <span style="font-size:28px;">✓</span>
      </div>
      <h2 style="color:#15803d;margin:12px 0 4px;font-size:20px;">Approved for Publication!</h2>
      <p style="color:#64748b;margin:0;font-size:13px;">Congratulations on this milestone</p>
    </div>
    <p style="color:#1e293b;font-size:15px;">Dear <strong>${name || 'Author'}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;">
      We are pleased to inform you that your manuscript has been <strong>approved for production</strong> and will be published in 
      <strong>${journal || 'Scholar India Publishers'}</strong>.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;width:40%;">Manuscript ID</td>
            <td style="padding:6px 0;font-size:14px;font-family:monospace;font-weight:900;color:#15803d;">${manuscriptId || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Title</td>
            <td style="padding:6px 0;font-size:13px;color:#334155;font-weight:600;">${title || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Journal</td>
            <td style="padding:6px 0;font-size:13px;color:#334155;">${journal || '—'}</td></tr>
      </table>
    </div>
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#92400e;">Production Timeline:</p>
      <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">
        The production process (typesetting, proofing, and archiving) takes a minimum of <strong>30 working days</strong>. 
        You will be notified with the DOI details immediately upon publication.
      </p>
    </div>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;"/>
    <p style="color:#94a3b8;font-size:12px;">Congratulations once again!<br/><strong>Editorial Board</strong><br/>Scholar India Publishers<br/>scholarindiapub@gmail.com</p>
  `);

  try {
    await sendMail({ to: email, subject: `🎉 Manuscript Approved for Publication – ${manuscriptId} | Scholar India Publishers`, html });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 6. EDITOR / REVIEWER APPLICATION APPROVED (Status → Active)
// POST /send/reviewer-approved
// { name, email, reviewerId, role, journal, message }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/reviewer-approved', async (req, res) => {
  const { name, email, reviewerId, role, journal, message } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const html = wrapper(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:60px;height:60px;background:#eff6ff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:2px solid #2563eb;">
        <span style="font-size:26px;">🎓</span>
      </div>
      <h2 style="color:#1d4ed8;margin:12px 0 4px;font-size:20px;">Welcome to Our Editorial Panel!</h2>
      <p style="color:#64748b;margin:0;font-size:13px;">Your application has been approved</p>
    </div>
    <p style="color:#1e293b;font-size:15px;">Dear <strong>${name || 'Applicant'}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;">
      We are delighted to inform you that your application to join Scholar India Publishers as a 
      <strong>${role || 'Reviewer'}</strong> has been <strong style="color:#16a34a;">APPROVED</strong>. 
      You are now an active member of our editorial community.
    </p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;width:40%;">Your ID</td>
            <td style="padding:6px 0;font-size:14px;font-family:monospace;font-weight:900;color:#1d4ed8;">${reviewerId || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Role</td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:#213361;">${role || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Journal</td>
            <td style="padding:6px 0;font-size:13px;color:#334155;">${journal || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Status</td>
            <td style="padding:6px 0;"><span style="background:#dcfce7;color:#16a34a;padding:2px 12px;border-radius:20px;font-size:12px;font-weight:700;">ACTIVE</span></td></tr>
      </table>
    </div>
    ${message ? `<div style="background:#f8fafc;border-left:4px solid #213361;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:#475569;font-style:italic;">"${message}"</p>
    </div>` : ''}
    <p style="color:#475569;font-size:13px;line-height:1.6;">
      You will be contacted when manuscripts are assigned to you for review. 
      Please log in to your <a href="https://scholar-india-publishers.vercel.app/reviewer-dashboard" style="color:#213361;font-weight:700;">Reviewer Dashboard</a> to manage your profile.
    </p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;"/>
    <p style="color:#94a3b8;font-size:12px;">Welcome to the team!<br/><strong>Editorial Office</strong><br/>Scholar India Publishers<br/>scholarindiapub@gmail.com</p>
  `);

  try {
    await sendMail({ to: email, subject: `Welcome! Application Approved – ${reviewerId} | Scholar India Publishers`, html });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 7. MANUSCRIPT STATUS UPDATE (Ported from GAS V9.0)
// POST /send/status-update
// { name, email, mID, manuscriptTitle, journalName, status, recommendation, 
//   reviewerComments[], doi, plag }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/status-update', async (req, res) => {
  const { name, email, mID, manuscriptTitle, journalName, status, recommendation, reviewerComments, doi, plag } = req.body;
  if (!email || !status) return res.status(400).json({ error: 'email and status required' });

  const currentStatus = status.toLowerCase();
  let badgeColor = "#64748b";
  let mailHeading = "STATUS UPDATE";
  let specificMessage = "";
  let actionArea = "";

  // Helper for Reviewer Feedback Section
  const getFeedbackHtml = () => {
    if (!reviewerComments || !reviewerComments.length) return "";
    const commentsHtml = reviewerComments.map((c, i) => `
      <div style="margin-bottom: 12px; font-size:14px; color:#334155;">
        <strong style="color:#213361;">Reviewer ${i + 1}:</strong><br>
        <p style="margin:4px 0 0; line-height:1.5; font-style:italic;">"${c}"</p>
      </div>`).join('');
    
    return `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:20px; border-radius:10px; margin:24px 0;">
        <p style="margin:0 0 16px 0; color:#1e293b; font-weight:800; font-size:13px; text-transform:uppercase; letter-spacing:0.05em;">Peer Reviewer Feedback:</p>
        ${commentsHtml}
      </div>`;
  };

  const navDashboard = `
    <div style="background:#f8fafc; padding:24px; border-radius:12px; margin-top:32px; border:1px solid #e2e8f0;">
      <p style="margin:0 0 16px 0; font-weight:800; color:#213361; font-size:11px; text-align:center; text-transform:uppercase; letter-spacing:0.1em;">Author Services & Quick Links</p>
      <div style="display:flex; gap:12px; margin-bottom:12px;">
        <a href="https://scholarindiapub.com/submit" style="flex:1; background:#213361; color:#ffffff; padding:12px; border-radius:6px; text-decoration:none; text-align:center; font-size:12px; font-weight:700;">Submit Manuscript</a>
        <a href="https://scholarindiapub.com/manuscript-track" style="flex:1; background:#213361; color:#ffffff; padding:12px; border-radius:6px; text-decoration:none; text-align:center; font-size:12px; font-weight:700;">Track Progress</a>
      </div>
      <a href="https://scholarindiapub.com/commerce-management" style="display:block; background:#fff; border:2px solid #213361; color:#213361; padding:12px; border-radius:6px; text-decoration:none; text-align:center; font-size:12px; font-weight:700; margin-bottom:10px;">Scholar Journal of Commerce and Management</a>
      <a href="https://scholarindiapub.com/humanities" style="display:block; background:#fff; border:2px solid #213361; color:#213361; padding:12px; border-radius:6px; text-decoration:none; text-align:center; font-size:12px; font-weight:700;">Scholar Journal of Humanities and Social Sciences</a>
    </div>`;

  // Status Logic
  if (currentStatus === "under review") {
    badgeColor = "#0284c7";
    mailHeading = "MANUSCRIPT ACKNOWLEDGEMENT";
    specificMessage = `Thank you for choosing <strong>Scholar India Publishers</strong>. We acknowledge the receipt of your manuscript. It is currently in the <strong>Initial Screening Stage</strong> (Plagiarism & Scope check). This ensures your work meets our quality standards before peer review.`;
    actionArea = `<div style="background:#f0f9ff; border:1px solid #bae6fd; padding:20px; border-radius:10px; margin:24px 0;"><p style="font-size:13px; color:#0369a1; margin:0; font-weight:600;">You will be notified via email once the manuscript is cleared for peer review.</p></div>`;
  } 
  else if (currentStatus === "under process") {
    badgeColor = "#d97706";
    mailHeading = "STATUS UPDATE: UNDER PROCESS";
    specificMessage = `We appreciate your patience. Your manuscript is now <strong>Under Process</strong>. It has been assigned to our expert committee for a double-blind evaluation of your research methodology and findings.`;
    actionArea = `<div style="background:#fffcf0; border:1px solid #fef3c7; padding:20px; border-radius:10px; margin:24px 0;"><p style="font-size:13px; color:#92400e; margin:0; font-weight:600;">The technical evaluation typically takes 10 to 15 working days.</p></div>`;
  }
  else if (currentStatus === "accepted") {
    badgeColor = "#16a34a";
    mailHeading = "DECISION: ACCEPTED FOR PUBLICATION";
    const recText = recommendation ? `with ${recommendation}` : "without any revision";
    specificMessage = `After careful peer review and editorial evaluation, we are pleased to inform you that your manuscript has been <strong>Accepted</strong> for publication ${recText}. <br><br><strong>Action Required:</strong> You must incorporate the reviewer comments provided below into your final paper before completing the submission steps.`;
    
    actionArea = getFeedbackHtml() + `
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:24px; border-radius:12px; margin:24px 0;">
        <p style="margin:0 0 16px 0; color:#166534; font-weight:800; font-size:14px; text-transform:uppercase;">Next Steps (Complete within 10 days):</p>
        <a href="https://scholarindiapub.com/final-paper" style="display:block; background:#16a34a; color:#fff; padding:14px; text-decoration:none; border-radius:8px; font-weight:700; font-size:14px; text-align:center; margin-bottom:16px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">Complete Final Submission Step →</a>
        <p style="font-size:12px; color:#991b1b; margin:0; line-height:1.6; border-top:1px solid #dcfce7; padding-top:12px; font-weight:600;">
          ⚠️ <strong>IMPORTANT:</strong> Final submission must be completed within 10 days. Late submissions may lead to automatic rejection without further notice.
        </p>
      </div>`;
  }
  else if (currentStatus === "complement") {
    badgeColor = "#0891b2";
    mailHeading = "DECISION: ACCEPTED (Complement)";
    specificMessage = `After careful peer review and editorial evaluation, we are pleased to inform you that your manuscript has been <strong>Accepted</strong> for publication under our <strong>Complimentary Waiver (No APC Required)</strong> program. <br><br><strong>Note:</strong> You must incorporate the reviewer comments provided below into your final paper before finishing the process.`;
    
    actionArea = getFeedbackHtml() + `
      <div style="background:#ecfeff; border:1px solid #cffafe; padding:24px; border-radius:12px; margin:24px 0;">
        <p style="margin:0 0 16px 0; color:#0e7490; font-weight:800; font-size:14px; text-transform:uppercase;">Final Steps (Complete within 10 days):</p>
        <a href="https://scholarindiapub.com/final-paper" style="display:block; background:#0891b2; color:#fff; padding:14px; text-decoration:none; border-radius:8px; font-weight:700; font-size:14px; text-align:center; margin-bottom:16px;">Finish Final Paper Submission →</a>
        <p style="font-size:12px; color:#991b1b; margin:0; line-height:1.6; border-top:1px solid #e0faff; padding-top:12px; font-weight:600;">
          ⚠️ <strong>IMPORTANT:</strong> Please complete within 10 days to secure your publication slot.
        </p>
      </div>`;
  }
  else if (currentStatus === "rejected") {
    badgeColor = "#dc2626";
    mailHeading = "DECISION: MANUSCRIPT REJECTED";
    specificMessage = `Thank you for your submission to Scholar India Publishers. After a thorough technical evaluation, we regret to inform you that your manuscript has been <strong>Rejected</strong> for publication. This decision was based on internal editorial standards and peer observations.`;
    actionArea = `<div style="background:#fef2f2; border:1px solid #fee2e2; padding:20px; border-radius:10px; margin:24px 0;"><p style="font-size:13px; color:#334155; margin:0;"><strong>Primary Observation:</strong> Technical/Peer Review criteria not satisfied ${plag ? `(Plagiarism: ${plag})` : ''}.</p></div>`;
  }
  else if (currentStatus === "published") {
    badgeColor = "#2563eb";
    mailHeading = "PUBLICATION NOTIFICATION";
    const jName = (journalName || "").toLowerCase();
    let currentIssueLink = "https://scholarindiapub.com/";
    if (jName.includes("commerce") || jName.includes("management")) currentIssueLink = "https://scholarindiapub.com/commerce-management#current-issue";
    else if (jName.includes("humanities") || jName.includes("social")) currentIssueLink = "https://scholarindiapub.com/humanities#current-issue";

    specificMessage = `Congratulations! Your latest research article has been <strong>Published</strong> and is now officially part of our digital library. We thank you for choosing us as your publishing partner and look forward to your future contributions.`;
    
    actionArea = `
      <div style="background:#eff6ff; padding:24px; border-radius:12px; margin:24px 0; border:1px solid #dbeafe; text-align:center;">
        <p style="margin:0 0 16px 0; font-size:13px; color:#1e3a8a;"><strong>Digital Object Identifier (DOI):</strong></p>
        <a href="${doi || '#'}" style="color:#2563eb; font-weight:900; font-size:15px; text-decoration:none; word-break:break-all; display:block; margin-bottom:20px;">${doi || 'DOI Pending'}</a>
        <a href="${currentIssueLink}" style="background:#2563eb; color:#ffffff; padding:12px 24px; border-radius:6px; text-decoration:none; font-size:13px; font-weight:700; display:inline-block;">VIEW CURRENT ISSUE →</a>
      </div>
      <div style="background:#fffcf0; padding:20px; border-left:5px solid #fbbf24; border-radius:8px; margin:24px 0; font-size:14px; color:#451a03; line-height:1.6;">
        <strong style="color:#92400e; font-size:15px; display:block; margin-bottom:8px;">🚀 Maximize Your Research Impact!</strong>
        We highly encourage you to upload your published paper's PDF to platforms like <strong>ResearchGate</strong> and <strong>Academia.edu</strong>. Sharing your work widely is a proven way to increase global visibility and attract citations.
      </div>`;
  }

  const html = wrapper(`
    <div style="text-align:center;margin-bottom:24px;">
      <span style="background:${badgeColor}20; color:${badgeColor}; padding:6px 16px; border-radius:20px; font-size:12px; font-weight:800; border:1.5px solid ${badgeColor}; text-transform:uppercase; letter-spacing:0.05em;">${status}</span>
    </div>
    
    <h2 style="color:${badgeColor}; margin:0 0 24px; font-size:20px; text-align:center; font-weight:900; letter-spacing:-0.02em;">${mailHeading}</h2>
    
    <p style="color:#1e293b; font-size:15px;">Dear <strong>${name || 'Author'}</strong>,</p>
    <p style="color:#475569; font-size:14px; line-height:1.8;">${specificMessage}</p>
    
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:20px; margin:24px 0;">
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="padding:6px 0; color:#64748b; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; width:35%;">Manuscript ID</td>
            <td style="padding:6px 0; font-size:14px; font-weight:900; color:#213361; font-family:monospace;">${mID || '—'}</td></tr>
        <tr><td style="padding:6px 0; color:#64748b; font-size:11px; font-weight:800; text-transform:uppercase;">Journal</td>
            <td style="padding:6px 0; font-size:13px; color:#334155;">${journalName || '—'}</td></tr>
        <tr><td style="padding:6px 0; color:#64748b; font-size:11px; font-weight:800; text-transform:uppercase;">Title</td>
            <td style="padding:6px 0; font-size:13px; color:#334155; font-weight:600; line-height:1.5;">${manuscriptTitle || 'Untitled'}</td></tr>
      </table>
    </div>

    ${actionArea}
    ${navDashboard}

    <div style="margin-top:32px; padding-top:24px; border-top:1.5px solid #f1f5f9; color:#94a3b8; font-size:12px; line-height:1.6;">
      Warmest Regards,<br/>
      <strong style="color:#475569; font-size:13px;">Editorial Office</strong><br/>
      Scholar India Publishers<br/>
      scholarindiapub@gmail.com
    </div>
  `);

  try {
    await sendMail({ to: email, subject: `Status Update: Manuscript [ID: ${mID}] - ${status}`, html });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 8. REVIEWER / EDITOR APPLICATION STATUS (Ported from GAS v3.5.5)
// POST /send/reviewer-status-update
// { name, email, rID, role, journal, status }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/reviewer-status-update', async (req, res) => {
  const { name, email, rID, role, journal, status } = req.body;
  if (!email || !status) return res.status(400).json({ error: 'email and status required' });

  const currentStatus = status.toLowerCase();
  let label = "APPLICATION UPDATE";
  let color = "#6c757d";
  let subject = `Application Update: ${role || 'Reviewer'}`;
  let content = "";

  const navDashboard = `
    <div style="background:#f8fafc; padding:20px; border-radius:10px; margin-top:30px; border:1px solid #e2e8f0;">
      <p style="margin:0 0 15px 0; font-weight:800; color:#213361; font-size:11px; text-align:center; text-transform:uppercase; letter-spacing:0.1em;">Quick Links</p>
      <div style="display:flex; gap:12px; margin-bottom:12px;">
        <a href="https://scholarindiapub.com/submit" style="flex:1; background:#213361; color:#ffffff; padding:10px; border-radius:4px; text-decoration:none; text-align:center; font-size:11px; font-weight:700;">Submit Manuscript</a>
        <a href="https://scholarindiapub.com/manuscript-track" style="flex:1; background:#213361; color:#ffffff; padding:10px; border-radius:4px; text-decoration:none; text-align:center; font-size:11px; font-weight:700;">Track Status</a>
      </div>
      <a href="https://scholarindiapub.com/commerce-management" style="display:block; background:#fff; border:1px solid #e2e8f0; color:#213361; padding:10px; border-radius:4px; text-decoration:none; text-align:center; font-size:11px; font-weight:700; margin-bottom:5px;">Scholar Journal of Commerce & Mgmt.</a>
      <a href="https://scholarindiapub.com/humanities" style="display:block; background:#fff; border:1px solid #e2e8f0; color:#213361; padding:10px; border-radius:4px; text-decoration:none; text-align:center; font-size:11px; font-weight:700;">Scholar Journal of Humanities & Social Sciences</a>
    </div>`;

  if (currentStatus === "pending") {
    label = "Application Pending";
    color = "#64748b";
    subject = `Application Under Review: ${role} [ID: ${rID}]`;
    content = `
      <p>Thank you for your interest in joining <strong>Scholar India Publishers</strong> as a <strong>${role}</strong>.</p>
      <p>We confirm that your application for the <strong>${journal || 'Scholar India Journals'}</strong> has been received and is currently <strong>Under Review</strong>.</p>
      <p>Our editorial team will make a final decision based on the verification of your official email ID, your publication history, and citation records.</p>`;
  } 
  else if (currentStatus === "active") {
    label = "Official Appointment";
    color = "#16a34a";
    subject = `Official Appointment Letter: ${role} - ${journal}`;
    content = `
      <p>Greetings from Scholar India Publishers!</p>
      <p>Based on your expressed interest in joining our editorial team, we are pleased to inform you that you have been selected and appointed as an <strong>${role}</strong> of our <strong>${journal}</strong>, published under Scholar India Publishers (SIP).</p>
      
      <div style="background:#f8fafc; padding:25px; border-radius:10px; font-size:14px; color:#334155; border: 1px solid #e2e8f0; margin: 24px 0;">
        <h3 style="color:#213361; margin-top:0; font-size:16px; border-bottom: 2px solid #213361; padding-bottom: 10px; text-transform:uppercase; letter-spacing:0.05em;">Roles and Responsibilities</h3>
        <ul style="padding-left:18px; line-height:1.7; margin-top:15px;">
          <li><strong>Editorial Oversight:</strong> Assist in maintaining academic quality and integrity through peer review management.</li>
          <li><strong>Manuscript Handling:</strong> Evaluate submissions, assign reviewers, and provide editorial recommendations.</li>
          <li><strong>Promotion:</strong> Encourage high-quality submissions and enhance the journal's reputation globally.</li>
          <li><strong>Strategic Development:</strong> Contribute ideas for reaching new research trends and increasing impact.</li>
          <li><strong>Ethical Standards:</strong> Ensure adherence to COPE (Committee on Publication Ethics) guidelines.</li>
        </ul>
        <p style="margin-top:20px;"><strong>Tenure:</strong> Initially for <strong>two (2) years</strong>, renewable by mutual consent.</p>
        <p><strong>Financial Commitment:</strong> This is an <strong>honorary</strong> position; no financial remuneration is involved.</p>
        <p style="font-size:11px; color:#64748b; font-style:italic; border-top:1px solid #e2e8f0; padding-top:12px; margin-top:15px;">
          <strong>Termination Clause:</strong> The Publisher reserves authority to withdraw appointment if provided information is incorrect or contributions are insufficient.
        </p>
      </div>
      <p>We warmest welcome you to the team and look forward to your valuable contributions to <strong>${journal}</strong>.</p>`;
  }
  else if (currentStatus === "hold") {
    label = "Action Required";
    color = "#d97706";
    subject = `Action Required: Application for ${role} [ID: ${rID}]`;
    content = `
      <p>We are writing to inform you that your application for <strong>${role}</strong> is currently <strong>On Hold</strong>.</p>
      <div style="background:#fffcf0; border:1px solid #fef3c7; padding:20px; border-radius:8px; margin:24px 0;">
        <p style="margin:0 0 10px 0; font-weight:800; color:#92400e; font-size:14px;">Reason: Mandatory Verification Pending</p>
        <p style="font-size:13px; color:#451a03; line-height:1.5;">To maintain academic integrity, we <strong>require an official institutional email ID</strong> (e.g., yourname@university.edu) for all editorial board appointments.</p>
      </div>
      <p><strong>Action:</strong> Please <strong>reapply</strong> using your official institutional email address. Applications using personal accounts (Gmail, Yahoo, etc.) cannot be processed for active status.</p>
      <div style="text-align:center; margin:24px 0;">
         <a href="https://scholarindiapub.com/join-reviewer" style="background:#213361; color:#ffffff; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:700; display:inline-block;">Resubmit Application →</a>
      </div>`;
  }
  else if (currentStatus === "reject" || currentStatus === "rejected") {
    label = "Application Declined";
    color = "#dc2626";
    subject = `Application Decision: ${role}`;
    content = `
      <p>Thank you for your interest in joining the editorial board of Scholar India Publishers.</p>
      <p>After a rigorous review of your submitted credentials, we regret to inform you that your application has been <strong>Declined</strong> at this stage.</p>
      <div style="border-left:4px solid #ef4444; padding:4px 20px; margin:24px 0; color:#475569; font-size:13px; line-height:1.6;">
        <p style="font-weight:700; color:#1e293b; margin-bottom:8px;">Ineligibility Factors:</p>
        <ul style="margin:0; padding-left:16px;">
          <li>Lack of verifiable institutional/official email ID.</li>
          <li>Insufficient research impact or citation history in the designated field.</li>
          <li>Profile does not meet current technical requirements for the board.</li>
        </ul>
      </div>
      <p>You may reapply only if you can demonstrate significantly updated academic credentials and provide an institutional email.</p>`;
  }

  const html = `
  <div style="background-color:#f1f5f9; padding:40px 0; font-family:Arial, sans-serif;">
    <div style="max-width:620px; margin:auto; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color:#213361; color:#ffffff; text-align:center; padding:40px 20px;">
        <h1 style="margin:0; font-size:24px;">Scholar India Publishers</h1>
        <div style="margin-top:8px; font-size:11px; opacity:0.8; letter-spacing:0.05em;">International Peer-Reviewed Academic Journals & Book Publishing</div>
      </div>
      <div style="padding:40px; color:#1e293b; line-height:1.7;">
        <div style="text-align:center; margin-bottom:32px;">
          <span style="background-color:${color}; color:#ffffff; padding:10px 28px; border-radius:6px; font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; border-bottom:3px solid rgba(0,0,0,0.15);">
            ${label}
          </span>
        </div>
        <p style="font-size:15px;">Dear <strong>${name || 'Applicant'}</strong>,</p>
        <div style="font-size:14px; color:#475569;">${content}</div>
        <div style="background-color:#f8fafc; border-left:4px solid #213361; padding:20px; border-radius:0 8px 8px 0; margin:32px 0; font-size:13px;">
           <table style="width:100%;">
             <tr><td style="color:#64748b; font-weight:700; width:35%;">Application ID:</td><td style="color:#213361; font-weight:900; font-family:monospace;">${rID || 'N/A'}</td></tr>
             <tr><td style="color:#64748b; font-weight:700;">Designation:</td><td style="color:#334155; font-weight:700;">${role || '—'}</td></tr>
             <tr><td style="color:#64748b; font-weight:700;">Applied Journal:</td><td style="color:#334155;">${journal || '—'}</td></tr>
           </table>
        </div>
        ${navDashboard}
        <div style="margin-top:32px; padding-top:24px; border-top:1px solid #f1f5f9; font-size:12px; color:#94a3b8;">
          Best Regards,<br/><strong style="color:#475569;">Editorial Office</strong><br/>Scholar India Publishers<br/>scholarindiapub@gmail.com
        </div>
      </div>
      <div style="background-color:#213361; color:#ffffff; text-align:center; padding:20px; font-size:10px;">
        © 2026 Scholar India Publishers | Chennai, India<br/>
        <a href="https://scholarindiapub.com" style="color:#fbbf24; text-decoration:none;">www.scholarindiapub.com</a>
      </div>
    </div>
  </div>`;

  try {
    await sendMail({ to: email, subject: subject, html: html });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 9. PAYMENT STATUS & INVOICE (Ported from GAS v1.2)
// POST /send/payment-status-update
// { name, email, status, details: { affiliation, pubType, msId, title, authType, 
//   currency, mode, transId, amount, invNo, date } }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/payment-status-update', async (req, res) => {
  const { name, email, status, details } = req.body;
  if (!email || !status || !details) return res.status(400).json({ error: 'email, status, and details required' });

  const currentStatus = status.toLowerCase();
  let typeLabel = "Payment Update";
  let labelColor = "#64748b";
  let subject = `Payment Update: ${details.msId}`;
  let content = "";
  let isInvoice = false;

  const today = details.date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

  if (currentStatus === "under process") {
    subject = `Acknowledgement: Payment Received for ${details.msId}`;
    typeLabel = "Payment Acknowledgement";
    labelColor = "#d97706";
    content = `
      <p style="font-size:14px; color:#475569;">We have received the payment details for your manuscript: <strong>${details.msId}</strong>.</p>
      <p style="font-size:14px; color:#475569;">Verification is <strong>Under Process</strong>. Our accounts team will verify the transaction within 24-48 working hours.</p>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:20px; margin:24px 0;">
        <p style="margin:0 0 16px 0; color:#1e293b; font-weight:800; font-size:11px; text-transform:uppercase; letter-spacing:0.05em;">Submitted Payment Details:</p>
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <tr><td style="padding:6px 0; color:#64748b; font-weight:700; width:45%;">Transaction Number</td><td style="padding:6px 0; color:#213361; font-weight:900; font-family:monospace;">${details.transId || '—'}</td></tr>
          <tr><td style="padding:6px 0; color:#64748b; font-weight:700;">Amount Paid</td><td style="padding:6px 0; color:#334155; font-weight:700;">${details.currency || 'INR'} ${details.amount || '0'}</td></tr>
          <tr><td style="padding:6px 0; color:#64748b; font-weight:700;">Date of Payment</td><td style="padding:6px 0; color:#334155;">${today}</td></tr>
          <tr><td style="padding:6px 0; color:#64748b; font-weight:700;">Mode of Payment</td><td style="padding:6px 0; color:#334155;">${details.mode || '—'}</td></tr>
        </table>
      </div>`;
  } 
  else if (currentStatus === "success") {
    subject = `Invoice: ${details.invNo || 'SIP-Receipt'}`;
    typeLabel = "Invoice";
    labelColor = "#16a34a";
    isInvoice = true;

    let serviceDescription = "Article Processing Charges (APC)";
    const pType = String(details.pubType || "").toLowerCase();
    if (pType.includes("book")) serviceDescription = "Book Publication Charges";

    content = `
      <div style="border:2.5px solid #213361; border-radius:12px; background:#fff; margin-bottom:10px; overflow:hidden;">
        <!-- Mobile-Responsive Header -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom:2px solid #213361; background:#f8fafc;">
          <tr>
            <td style="padding:20px;">
              <!--[if mso | IE]>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="300" align="left" valign="top">
              <![endif]-->
              <div style="display:inline-block; vertical-align:top; width:100%; max-width:280px; margin-bottom:15px;">
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="min-width:44px; height:44px; background:#213361; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                    <span style="color:#fff; font-weight:900; font-size:14px;">SIP</span>
                  </div>
                  <div>
                     <p style="margin:0; font-size:16px; font-weight:900; color:#213361; text-transform:uppercase; letter-spacing:0.05em; line-height:1.2;">Invoice / Receipt</p>
                     <p style="margin:2px 0 0; font-size:10px; color:#64748b; font-weight:700;">Official Confirmation</p>
                  </div>
                </div>
              </div>
              <!--[if mso | IE]>
                  </td>
                  <td width="200" align="right" valign="top">
              <![endif]-->
              <div style="display:inline-block; vertical-align:top; width:100%; max-width:240px; text-align:left;">
                <p style="margin:0; font-size:12px; color:#334155; line-height:1.4;">
                  <strong>Invoice No:</strong> <span style="font-family:monospace; font-weight:900; color:#213361;">${details.invNo}</span><br>
                  <strong>Date:</strong> ${today}
                </p>
              </div>
              <!--[if mso | IE]>
                  </td>
                </tr>
              </table>
              <![endif]-->
            </td>
          </tr>
        </table>

        <!-- Bill To Section -->
        <div style="padding:20px; border-bottom:1px solid #f1f5f9;">
           <p style="margin:0 0 6px 0; font-size:10px; font-weight:800; color:#213361; text-transform:uppercase; letter-spacing:0.1em;">Bill To:</p>
           <p style="margin:0; font-size:14px; font-weight:900; color:#1e293b;">${details.name || '—'}</p>
           <p style="margin:4px 0 0; font-size:12px; color:#475569; line-height:1.4;">${details.affiliation || 'Author / Researcher'}</p>
        </div>

        <!-- Service Line Items (Fluid) -->
        <div style="padding:15px 20px;">
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="background:#213361;">
                <th align="left" style="padding:10px 14px; color:#fff; font-size:11px; border-radius:6px 0 0 6px;">Description</th>
                <th align="right" style="padding:10px 14px; color:#fff; font-size:11px; border-radius:0 6px 6px 0;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:16px 14px; border-bottom:1px solid #f1f5f9; vertical-align:top;">
                  <strong style="color:#1e293b; font-size:13px; display:block; margin-bottom:4px;">${serviceDescription}</strong>
                  <div style="font-size:11px; color:#64748b; line-height:1.5; word-break:break-word;">
                    ID: <strong style="color:#475569;">${details.msId}</strong><br>
                    Title: ${details.title || 'Untitled Manuscript'}
                  </div>
                </td>
                <td align="right" style="padding:16px 14px; border-bottom:1px solid #f1f5f9; font-weight:900; color:#213361; font-size:14px; vertical-align:top; white-space:nowrap;">
                  ${details.currency || 'INR'} ${details.amount || '0'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Totals & Info Section (Stackable) -->
        <div style="padding:20px;">
           <!--[if mso | IE]>
           <table border="0" cellpadding="0" cellspacing="0" width="100%">
             <tr>
               <td width="300" align="left" valign="bottom">
           <![endif]-->
           <div style="display:inline-block; vertical-align:bottom; width:100%; max-width:280px; margin-bottom:20px;">
             <p style="margin:0 0 6px 0; font-weight:800; color:#213361; text-transform:uppercase; font-size:10px;">Payment Info:</p>
             <div style="font-size:11px; color:#64748b; line-height:1.6;">
               Mode: ${details.mode || 'Online'}<br>
               Ref: <span style="font-family:monospace;">${details.transId}</span><br>
               Author: ${details.authType || 'Direct'}
             </div>
           </div>
           <!--[if mso | IE]>
               </td>
               <td width="240" align="right" valign="bottom">
           <![endif]-->
           <div style="display:inline-block; vertical-align:bottom; width:100%; max-width:240px; text-align:left;">
             <div style="background:#f8fafc; padding:15px; border-radius:10px; border:1px solid #e2e8f0;">
               <p style="margin:0; font-size:16px; font-weight:900; color:#213361;">Total: ${details.currency} ${details.amount}</p>
               <p style="margin:4px 0 0; font-size:11px; font-weight:800; color:#16a34a; text-transform:uppercase;">Status: Paid</p>
             </div>
           </div>
           <!--[if mso | IE]>
               </td>
             </tr>
           </table>
           <![endif]-->
        </div>

        <!-- Production Note -->
        <div style="margin:0 20px 20px; padding:16px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; font-size:12px; color:#166534; line-height:1.6;">
           <strong style="color:#15803d; font-size:12px; display:block; margin-bottom:2px;">Production Update:</strong>
           Sent for typesetting. Estimated timeline: <strong>30 working days</strong>. You will receive the DOI once published.
        </div>
      </div>`;
  }
  else if (currentStatus === "failed") {
    subject = `Action Required: Payment Not Received for ${details.msId}`;
    typeLabel = "Payment Failed";
    labelColor = "#dc2626";
    content = `
      <p style="font-size:15px; color:#1e293b;">We are writing to inform you that we have <strong>not received</strong> the payment for your manuscript: <strong>${details.msId}</strong>.</p>
      <div style="background:#fef2f2; border:1.5px solid #fee2e2; padding:20px; border-radius:10px; margin:24px 0; color:#ef4444;">
        <p style="margin:0; font-weight:800; font-size:14px;">Status: Transaction not found in our records.</p>
      </div>
      <p style="font-size:14px; color:#475569; line-height:1.7;">If you have already made the payment, please <strong>reply to this email with a screenshot or PDF receipt</strong> of the transaction for manual verification by our accounts team.</p>
      <p style="font-size:13px; color:#94a3b8; font-style:italic;">Kindly ensure the transaction number and date are clearly visible in the attachment.</p>`;
  }

  const html = `
  <div style="background-color:#f1f5f9; padding:40px 0; font-family:Arial, sans-serif;">
    <div style="max-width:620px; margin:auto; background-color:#ffffff; border-radius:12px; border:1px solid #e2e8f0; border-top: 6px solid #213361; overflow:hidden; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
      <div style="text-align:center; padding:32px 20px; border-bottom:1px solid #f1f5f9;">
        <h1 style="margin:0; font-size:24px; color:#213361; font-weight:900;">Scholar India Publishers</h1>
        <p style="font-size:10px; color:#94a3b8; margin:6px 0 0; font-style:italic; letter-spacing:0.02em;">(International Peer-Reviewed Academic Journals and Book Publishing Excellence Since 2022)</p>
        <div style="margin-top:20px; display:inline-block; padding:8px 24px; background-color:${labelColor}; color:#ffffff; font-weight:800; border-radius:30px; font-size:11px; text-transform:uppercase; letter-spacing:0.1em; border-bottom:3px solid rgba(0,0,0,0.2);">
          ${typeLabel}
        </div>
      </div>
      <div style="padding:40px; color:#334155;">
        ${!isInvoice ? `<p style="font-size:15px; margin-bottom:24px;">Dear <strong>${name || 'Author'}</strong>,</p>` : ''}
        ${content}
        
        <div style="margin-top:40px; border-top:1px solid #f1f5f9; padding-top:24px; font-size:12px; color:#94a3b8; line-height:1.6;">
          Warm Regards,<br/>
          <strong style="color:#475569; font-size:13px;">Accounts Department</strong><br/>
          Scholar India Publishers<br/>
          <a href="mailto:editor@scholarindiapub.com" style="color:#213361; text-decoration:none; font-weight:700;">editor@scholarindiapub.com</a>
        </div>
      </div>
      <div style="background-color:#213361; color:#ffffff; text-align:center; padding:24px; font-size:10px; border-top:1px solid rgba(255,255,255,0.05);">
        © 2026 Scholar India Publishers | Chennai, Tamil Nadu, India<br/>
        <a href="https://scholarindiapub.com" style="color:#fbbf24; text-decoration:none;">www.scholarindiapub.com</a>
        <div style="margin-top:12px; opacity:0.6; font-size:9px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
          This is an official computer-generated document. No digital signature required.
        </div>
      </div>
    </div>
  </div>`;

  try {
    await sendMail({ to: email, subject: subject, html: html });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 10. BOOK MANAGEMENT STATUS (Ported from GAS v1.4)
// POST /send/book-status-update
// { name, email, status, details: { bID, bookTitle, pubType, format, isbn, plag } }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/book-status-update', async (req, res) => {
  const { name, email, status, details } = req.body;
  if (!email || !status || !details) return res.status(400).json({ error: 'email, status, and details required' });

  const currentStatus = status.toLowerCase();
  let label = "BOOK UPDATE";
  let badgeColor = "#64748b";
  let subject = `Book Update: ${details.bookTitle}`;
  let content = "";
  let actionArea = "";

  if (currentStatus === "under review") {
    subject = `Technical Review: ${details.bookTitle} [ID: ${details.bID}]`;
    label = "Under Review";
    badgeColor = "#f59e0b";
    content = `<p>We confirm that your proposal titled <strong>"${details.bookTitle}"</strong> is currently <strong>Under Technical Review</strong>.</p>
               <p>Our editorial team is assessing the scope, content quality, and academic relevance.</p>`;
    actionArea = `
      <div style="background:#fffcf0; border:1px solid #fef3c7; padding:20px; border-radius:10px; font-size:13px; color:#92400e;">
        <p style="margin:0;"><strong style="text-transform:uppercase; letter-spacing:0.05em;">Timeline:</strong> This process usually takes 7-10 working days.</p>
      </div>`;
  }
  else if (currentStatus === "accepted") {
    subject = `Acceptance & Payment: ${details.bookTitle} [ID: ${details.bID}]`;
    label = "Proposal Accepted";
    badgeColor = "#16a34a";
    
    let feeAmount = "INR 15,000";
    let feeDetails = "(Includes 4 Hard Copies of the Book)";
    
    if (String(details.pubType || "").toLowerCase().includes("chapter")) {
      feeAmount = "INR 1,000 per Chapter";
      feeDetails = "(Processing & Digital Publication Fee)";
    }

    content = `
      <p>Congratulations! We are pleased to inform you that your work <strong>"${details.bookTitle}"</strong> has been <strong>Accepted</strong> for publication.</p>
      <p>To proceed with ISBN allotment, formatting, and production, please complete the processing fee payment.</p>`;
    
    actionArea = `
      <div style="background:#f0fdf4; border:1.5px solid #16a34a; padding:28px; border-radius:12px; text-align:center;">
        <p style="margin:0; font-size:18px; font-weight:900; color:#166534;">Processing Fee: ${feeAmount}</p>
        <p style="margin:6px 0 20px 0; font-size:12px; color:#15803d; font-weight:700;">${feeDetails}</p>
        
        <div style="background:#fff; padding:12px 20px; border:1px dashed #16a34a; display:inline-block; margin-bottom:24px; font-size:12px; color:#1e293b; border-radius:8px;">
          <strong>Payment Note:</strong> Please quote Ref No: <span style="color:#be123c; font-weight:900; font-family:monospace;">${details.bID}</span> in remarks.
        </div>
        <br>
        <a href="https://scholarindiapub.com/payment" style="background:#16a34a; color:#ffffff; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:800; display:inline-block; box-shadow:0 4px 6px -1px rgba(22,163,74,0.3);">Pay & Submit Receipt →</a>
      </div>`;
  }
  else if (currentStatus === "reject" || currentStatus === "rejected") {
    subject = `Editorial Decision: ${details.bookTitle}`;
    label = "Application Declined";
    badgeColor = "#dc2626";
    content = `<p>After a thorough screening of your submission, we regret to inform you that we cannot proceed with your publication at this time.</p>`;
    actionArea = `
      <div style="background:#fef2f2; border:1px solid #fee2e2; padding:20px; border-radius:10px;">
        <p style="margin:0 0 12px 0; color:#ef4444; font-weight:800; font-size:13px; text-transform:uppercase; letter-spacing:0.05em;">Review Summary:</p>
        <ul style="font-size:13px; color:#334155; line-height:1.7; margin:0; padding-left:18px;">
          <li><strong>Plagiarism Level:</strong> ${details.plag || 'N/A'}</li>
          <li><strong>Decision:</strong> Declined due to high similarity index or scope misalignment.</li>
        </ul>
      </div>`;
  }
  else if (currentStatus === "published") {
    subject = `Publication Announcement: ${details.bookTitle} [ISBN: ${details.isbn || 'Pending'}]`;
    label = "Officially Published";
    badgeColor = "#2563eb";
    content = `<p>We are delighted to announce that your work <strong>"${details.bookTitle}"</strong> is now <strong>Published</strong> and available in our repository.</p>`;
    actionArea = `
      <div style="background:#eff6ff; border:1.5px solid #2563eb; padding:28px; border-radius:12px; text-align:center;">
        <p style="font-size:11px; color:#1e3a8a; text-transform:uppercase; font-weight:800; letter-spacing:0.15em; margin-bottom:8px;">Permanent Allotted ISBN</p>
        <strong style="font-size:24px; color:#1d4ed8; letter-spacing:2px; font-family:monospace;">${details.isbn || 'Pending'}</strong>
      </div>`;
  }

  const html = `
  <div style="background-color:#f8fafc; padding:40px 0; font-family:Arial, sans-serif;">
    <div style="max-width:640px; margin:auto; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
      <div style="background-color:#213361; color:#ffffff; text-align:center; padding:45px 25px;">
        <h1 style="margin:0; font-size:26px; font-weight:900;">Scholar India Publishers</h1>
        <p style="margin-top:8px; font-size:10px; opacity:0.8; font-style:italic; line-height:1.4; max-width:400px; margin-left:auto; margin-right:auto;">
          (International Peer-Reviewed Academic Journals and Book Publishing Excellence Since 2022)
        </p>
      </div>
      <div style="padding:45px; color:#1e293b; line-height:1.7;">
        <div style="text-align:center; margin-bottom:35px;">
          <span style="background-color:${badgeColor}; color:#ffffff; padding:10px 30px; border-radius:6px; font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; border-bottom:3px solid rgba(0,0,0,0.15);">
            ${label}
          </span>
        </div>
        <p style="font-size:16px;">Dear <strong>${name || 'Author'}</strong>,</p>
        <div style="font-size:15px; color:#475569;">${content}</div>
        <div style="background-color:#f1f5f9; border-left:5px solid #213361; padding:25px; border-radius:0 12px 12px 0; margin:35px 0; font-size:13px;">
            <table style="width:100%; border-collapse:collapse;">
              <tr><td style="color:#64748b; font-weight:700; padding-bottom:8px; width:35%;">Book Ref No:</td><td style="color:#213361; font-weight:900; font-family:monospace; padding-bottom:8px;">${details.bID || 'N/A'}</td></tr>
              <tr><td style="color:#64748b; font-weight:700; padding-bottom:8px;">Book Title:</td><td style="color:#334155; font-weight:800; padding-bottom:8px;">${details.bookTitle}</td></tr>
              <tr><td style="color:#64748b; font-weight:700;">Publication Type:</td><td style="color:#334155;">${details.pubType} (${details.format || 'Digital/Hardcopy'})</td></tr>
            </table>
        </div>
        ${actionArea}
        <div style="margin-top:45px; border-top:1px solid #f1f5f9; padding-top:25px; font-size:12px; color:#94a3b8;">
          Best Regards,<br/><br/>
          <strong style="color:#475569; font-size:13px;">Editor (Book Publication)</strong><br/>
          Scholar India Publishers<br/>
          <a href="mailto:editor@scholarindiapub.com" style="color:#213361; text-decoration:none; font-weight:700;">editor@scholarindiapub.com</a>
        </div>
      </div>
      <div style="background-color:#213361; color:#ffffff; text-align:center; padding:25px; font-size:10px;">
        © 2026 Scholar India Publishers | Chennai, India<br/>
        <a href="https://scholarindiapub.com" style="color:#fbbf24; text-decoration:none; font-weight:700;">www.scholarindiapub.com</a>
      </div>
    </div>
  </div>`;

  try {
    await sendMail({ to: email, subject: subject, html: html });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 11. REVIEWER ASSIGNMENT FLOW (Ported from GAS v10.0)
// POST /send/reviewer-assignment-update
// { email, type, details: { rName, mID, mTitle, dateStr, link, rID }, attachment? }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/reviewer-assignment-update', async (req, res) => {
  const { email, type, details, attachment } = req.body;
  if (!email || !type || !details) return res.status(400).json({ error: 'email, type, and details required' });

  const flowType = type.toUpperCase();
  let subject = "";
  let badgeLabel = "Review Update";
  let badgeColor = "#213361";
  let content = "";
  let attachments = [];

  if (flowType === "INVITATION") {
    subject = `Review Invitation: [ID: ${details.mID}] - Scholar India Publishers`;
    badgeLabel = "New Assignment";
    badgeColor = "#213361";
    content = `
      <p>Dear <strong>${details.rName}</strong>,</p>
      <p>We are pleased to invite you to review the manuscript titled <strong>[ID: ${details.mID}]</strong> for our journal.</p>
      <p>Your expertise is highly valued in maintaining the academic rigor and quality of our publications.</p>
      <div style="background:#f1f5f9; padding:20px; border-radius:10px; margin:24px 0; border:1px solid #e2e8f0;">
        <p style="margin:0 0 10px 0;"><strong style="color:#64748b;">Review Due Date:</strong> <span style="color:#dc2626; font-weight:800;">${details.dateStr || 'TBD'}</span></p>
        <p style="margin:0;"><strong style="color:#64748b;">Manuscript:</strong> <a href="${details.link || '#'}" style="color:#2563eb; text-decoration:none; font-weight:700;">View Document →</a></p>
      </div>
      <div style="text-align:center; margin:32px 0;">
        <a href="https://scholarindiapub.com/reviewer-login" style="display:inline-block; background:#213361; color:#ffffff; padding:14px 32px; text-decoration:none; border-radius:8px; font-weight:800; font-size:14px; box-shadow:0 4px 6px -1px rgba(33,51,97,0.3);">LOGIN TO REVIEWER PORTAL</a>
      </div>`;
  } 
  else if (flowType === "REMINDER") {
    subject = `URGENT REMINDER: Review Due in 48 Hours [ID: ${details.mID}]`;
    badgeLabel = "Deadline Near";
    badgeColor = "#dc2626";
    content = `
      <p>Dear <strong>${details.rName}</strong>,</p>
      <p>This is a professional reminder that your review for <strong>"${details.mTitle || 'Draft Manuscript'}"</strong> is due in <strong>2 days</strong> (${details.dateStr}).</p>
      <p>Kindly submit your evaluation as soon as possible to ensure timely feedback to the authors.</p>
      <div style="text-align:center; margin:32px 0;">
        <a href="https://scholarindiapub.com/reviewer-login" style="display:inline-block; border:2px solid #213361; color:#213361; padding:12px 28px; text-decoration:none; border-radius:8px; font-weight:800; font-size:14px;">ACCESS REVIEWER PORTAL</a>
      </div>`;
  }
  else if (flowType === "COMPLETED") {
    subject = `Acknowledgement & Certificate: Review Completed [ID: ${details.mID}]`;
    badgeLabel = "Review Completed";
    badgeColor = "#16a34a";
    content = `
      <p>Dear <strong>${details.rName}</strong>,</p>
      <p>Thank you for completing the professional peer review for the manuscript titled <strong>"${details.mTitle}"</strong>.</p>
      <p>In recognition of your exceptional service and contribution to the academic community, we are pleased to issue your **Official Certificate of Reviewing**.</p>
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:18px; border-radius:10px; margin:24px 0; color:#166534; font-size:13px; display:flex; align-items:center; gap:12px;">
         <span style="font-size:24px;">🎓</span>
         <div>
           <strong>Awarded Category:</strong> Distinguished Peer Reviewer<br/>
           <strong>Certificate ID:</strong> ${details.rID || 'SIP'}-${details.mID}
         </div>
      </div>
      <p>Your official e-certificate is attached to this email as a PDF document.</p>`;
    
    if (attachment) {
      attachments.push({
        filename: `Reviewer_Certificate_${details.mID}.pdf`,
        content: attachment,
        encoding: 'base64'
      });
    }
  }

  const html = `
  <div style="background-color:#f1f5f9; padding:40px 0; font-family:Arial, sans-serif;">
    <div style="max-width:620px; margin:auto; background-color:#ffffff; border-radius:12px; border:1px solid #e2e8f0; border-top: 6px solid ${badgeColor}; overflow:hidden; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
      <div style="background-color:#213361; color:#ffffff; text-align:center; padding:32px 20px;">
        <h1 style="margin:0; font-size:24px; font-weight:900;">Scholar India Publishers</h1>
        <p style="margin-top:6px; font-size:10px; opacity:0.75; font-style:italic;">International Peer-Reviewed Academic Journals</p>
      </div>
      <div style="padding:40px; color:#1e293b; line-height:1.7;">
        <div style="text-align:center; margin-bottom:32px;">
          <span style="background-color:${badgeColor}; color:#ffffff; padding:8px 24px; border-radius:30px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; border-bottom:3px solid rgba(0,0,0,0.1);">
            ${badgeLabel}
          </span>
        </div>
        <div style="font-size:15px; color:#334155;">${content}</div>
        <div style="margin-top:40px; border-top:1px solid #f1f5f9; padding-top:24px; font-size:12px; color:#94a3b8;">
          Best Regards,<br/>
          <strong style="color:#475569; font-size:13px;">Editorial Office</strong><br/>
          Scholar India Publishers<br/>
          <a href="mailto:editor@scholarindiapub.com" style="color:#213361; text-decoration:none; font-weight:700;">editor@scholarindiapub.com</a>
        </div>
      </div>
      <div style="background-color:#213361; color:#ffffff; text-align:center; padding:20px; font-size:10px;">
        © 2026 Scholar India Publishers | Chennai, India<br/>
        <a href="https://scholarindiapub.com" style="color:#fbbf24; text-decoration:none;">www.scholarindiapub.com</a>
      </div>
    </div>
  </div>`;

  try {
    await sendMail({ to: email, subject: subject, html: html, attachments: attachments });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 12. ERP SUBMISSION CONFIRMATIONS (Manuscript, Reviewer, Book, Contact)
// ════════════════════════════════════════════════════════════════════════════

// A. Manuscript Submission Confirmation
app.post('/send/manuscript-submission', async (req, res) => {
  const { name, email, msId, title, journal } = req.body;
  const subject = `Manuscript Received: [ID: ${msId}] - ${journal}`;
  const html = wrapper(`
    <p>Dear <strong>${name}</strong>,</p>
    <p>Thank you for submitting your manuscript to <strong>Scholar India Publishers</strong>.</p>
    <p>Your work has been successfully recorded in our system and is awaiting technical screening by our editorial board.</p>
    <div style="background:#f1f5f9; padding:20px; border-radius:10px; margin:24px 0;">
       <p style="margin:0 0 8px 0; font-size:11px; font-weight:800; color:#213361; text-transform:uppercase;">Submission Details:</p>
       <table style="width:100%; font-size:13px;">
          <tr><td style="color:#64748b; font-weight:700; width:35%;">Tracking ID:</td><td style="color:#213361; font-weight:900;">${msId}</td></tr>
          <tr><td style="color:#64748b; font-weight:700;">Title:</td><td>${title}</td></tr>
          <tr><td style="color:#64748b; font-weight:700;">Journal:</td><td>${journal}</td></tr>
       </table>
    </div>
    <p>You can track the live status of your manuscript anytime using the button below:</p>
    <div style="text-align:center; margin-top:28px;">
       <a href="https://scholarindiapub.com/manuscript-track" style="background:#213361; color:#fff; padding:12px 25px; border-radius:8px; text-decoration:none; font-weight:800; font-size:13px;">TRACK MANUSCRIPT STATUS</a>
    </div>
  `, "Submission Received", "#1e3a8a");
  
  try { await sendMail({ to: email, subject, html }); res.json({ success: true }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// B. Reviewer Application Confirmation
app.post('/send/reviewer-application-received', async (req, res) => {
  const { name, email, role, journal } = req.body;
  const subject = `Application Received: Editorial Board - Scholar India`;
  const html = wrapper(`
    <p>Dear <strong>${name}</strong>,</p>
    <p>Thank you for applying to join the editorial team of <strong>Scholar India Publishers</strong> as a <strong>${role}</strong>.</p>
    <p>Our academic council will review your profile, publication history, and institutional affiliations. This verification process typically takes 5-7 working days.</p>
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:18px; border-radius:10px; margin:24px 0; color:#166534; font-size:13px;">
       <strong>Status:</strong> Verification Under Process<br/>
       <strong>Target Journal:</strong> ${journal || 'Scholar India Group'}
    </div>
    <p>We appreciate your interest in contributing to the global research community.</p>
  `, "Application Received", "#16a34a");

  try { await sendMail({ to: email, subject, html }); res.json({ success: true }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// C. Book Proposal Confirmation
app.post('/send/book-submission', async (req, res) => {
  const { name, email, refNo, title } = req.body;
  const subject = `Book Proposal Received: [Ref: ${refNo}]`;
  const html = wrapper(`
    <p>Dear <strong>${name}</strong>,</p>
    <p>Thank you for submitting your book proposal / chapter to <strong>Scholar India Publishers</strong>.</p>
    <p>Our book division will evaluate the technical scope and plagiarism level of your submission.</p>
    <div style="background:#f8fafc; border-left:4px solid #2563eb; padding:20px; border-radius:0 8px 8px 0; margin:24px 0;">
       <table style="width:100%; font-size:13px;">
          <tr><td style="color:#64748b; font-weight:700; width:35%;">Ref Number:</td><td style="color:#213361; font-weight:900;">${refNo}</td></tr>
          <tr><td style="color:#64748b; font-weight:700;">Book Title:</td><td>${title}</td></tr>
       </table>
    </div>
    <p>An editorial decision will be communicated to you via email within 7-10 working hours.</p>
  `, "Proposal Received", "#2563eb");

  try { await sendMail({ to: email, subject, html }); res.json({ success: true }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// D. Contact Inquiry Confirmation
app.post('/send/contact-acknowledgement', async (req, res) => {
  const { name, email, subject: userSubject, type } = req.body;
  const subject = `Inquiry Received: ${userSubject}`;
  const html = wrapper(`
    <p>Dear <strong>${name}</strong>,</p>
    <p>We have received your enquiry regarding <strong>"${type}"</strong>.</p>
    <p>A member of our support team or the office of the Managing Editor will respond to your query shortly.</p>
    <div style="background:#fffcf0; border:1px solid #fef3c7; padding:15px; border-radius:8px; margin:24px 0; color:#92400e; font-size:12px;">
       <strong>Reference:</strong> Support Ticket #${Date.now().toString().slice(-6)}
    </div>
  `, "Inquiry Received", "#d97706");

  try { await sendMail({ to: email, subject, html }); res.json({ success: true }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// E. Message/Broadcast Notification
app.post('/send/message-notification', async (req, res) => {
  const { toName, email, fromName, messageSnippet } = req.body;
  const subject = `New Message from ${fromName} - Scholar India Portal`;
  const html = wrapper(`
    <p>Dear <strong>${toName}</strong>,</p>
    <p>You have received a new message on the <strong>Scholar India Publishers ERP Portal</strong>.</p>
    <div style="background:#f1f5f9; padding:20px; border-radius:10px; margin:24px 0; border:1px solid #e2e8f0; font-style:italic; color:#475569;">
       "${messageSnippet || 'You have a new message from the editorial office.'}"
    </div>
    <div style="text-align:center; margin-top:28px;">
       <a href="https://scholarindiapub.com/login" style="background:#213361; color:#fff; padding:12px 25px; border-radius:8px; text-decoration:none; font-weight:800; font-size:13px;">LOGIN TO VIEW FULL MESSAGE</a>
    </div>
  `, "New Message", "#213361");

  try { await sendMail({ to: email, subject, html }); res.json({ success: true }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// 13. FINAL PRODUCTION GATEWAY (Ported from GAS v1.4)
// POST /send/production-status-update
// { name, email, mode, details: { mID, mTitle, formatStatus, copyrightStatus, paymentStatus } }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/production-status-update', async (req, res) => {
  const { name, email, mode, details } = req.body;
  if (!email || !mode || !details) return res.status(400).json({ error: 'email, mode, and details required' });

  const currentMode = mode.toLowerCase();
  let subject = "";
  let badgeLabel = "Production Update";
  let badgeColor = "#213361";
  let content = "";

  const format = String(details.formatStatus || "").toLowerCase();
  const copyright = String(details.copyrightStatus || "").toLowerCase();
  const payment = String(details.paymentStatus || "").toLowerCase();

  if (currentMode === "production") {
    subject = `Production Update: Manuscript [ID: ${details.mID}] Sent for Archiving`;
    badgeLabel = "Sent to Production";
    badgeColor = "#16a34a";
    
    const paymentNote = (payment === "yes") 
      ? `<p>Furthermore, we confirm the receipt of your publication fee.</p>` 
      : (payment === "complement" ? `<p>This manuscript is being processed as a complementary publication.</p>` : "");
    
    content = `
      <p>We are pleased to inform you that we have successfully received your <strong>Copyright Transfer Form</strong> and the <strong>Final Camera-Ready Paper</strong>.</p>
      ${paymentNote}
      <div style="background-color:#f0fdf4; border-left:5px solid #16a34a; padding:20px; margin:24px 0; color:#14532d; border-radius:0 8px 8px 0;">
        <strong style="font-size:14px; display:block; margin-bottom:4px;">Status: Global Repository Archiving</strong>
        Your manuscript is now being processed for typesetting, metadata indexing, and DOI assignment.
      </div>
      <p>The final publication process takes approximately <strong>30 working days</strong>. You will be notified with the live link once complete.</p>`;
  } 
  else if (currentMode === "missing") {
    subject = `Action Required: Pending Documents for [ID: ${details.mID}]`;
    badgeLabel = "Action Required";
    badgeColor = "#dc2626";

    let missingList = [];
    if (format === "no") missingList.push("<strong>1. Formatting:</strong> Paper is not in the required journal template.");
    if (copyright === "no") missingList.push("<strong>2. Copyright:</strong> Transfer form is missing or incomplete.");
    if (payment === "no") missingList.push("<strong>3. Payment:</strong> Publication fee / APC is pending.");

    content = `
      <p>To proceed with the publication of <strong>"${details.mTitle}"</strong>, we requires the following actions from your end:</p>
      <div style="background-color:#fff1f2; border:1px solid #fecaca; padding:20px; border-radius:12px; margin:24px 0;">
        <ul style="margin:0; padding-left:18px; color:#991b1b; line-height:1.8; font-size:13px;">
          ${missingList.map(item => `<li>${item}</li>`).join("")}
        </ul>
      </div>
      <p>Kindly upload these missing documents via the portal or reply directly to this email with attachments.</p>`;
  }

  const html = wrapper(content, badgeLabel, badgeColor, details.mID, details.mTitle);

  try {
    await sendMail({ to: email, subject: subject, html: html });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`\n📧 Scholar India Mail Server → http://localhost:${PORT}\n`);
});

export default app;
