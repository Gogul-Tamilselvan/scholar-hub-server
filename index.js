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

// ── Shared Styles (Premium UI) ──────────────────────────────────
const wrapper = (content, badgeText = "Notification", badgeColor = "#1a237e") => `
<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:30px 0;background:#f8fafc;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.08);overflow:hidden;border:1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background-color:#1e3a8a;color:#ffffff;text-align:center;padding:40px 20px;position:relative;">
      <h1 style="margin:0;font-size:26px;font-weight:900;letter-spacing:0.5px;">Scholar India Publishers</h1>
      <p style="margin:10px 0 0;font-size:12px;opacity:0.9;font-style:italic;letter-spacing:1px;text-transform:uppercase;">
        Scientific & Academic Publishing Excellence
      </p>
      <div style="margin-top:20px;">
        <span style="background:${badgeColor}; color:#ffffff; padding:6px 14px; border-radius:100px; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; border:1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 10px rgba(0,0,0,0.1);">${badgeText}</span>
      </div>
    </div>
    <!-- Body -->
    <div style="padding:45px;color:#1e293b;line-height:1.8;font-size:15px;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="background:#f1f5f9;color:#475569;text-align:center;padding:30px;font-size:11px;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-weight:700;">© ${new Date().getFullYear()} Scholar India Publishers</p>
      <p style="margin:4px 0 0;opacity:0.8;">Academic Headquarters | Chennai, India</p>
      <div style="margin:15px 0;"><a href="https://scholarindiapub.com" style="color:#1e3a8a;text-decoration:none;font-weight:700;">Visit Official Website</a></div>
      <p style="margin:15px 0 0;color:#94a3b8;font-size:10px;">This is a system-generated academic notification from the Scholar India ERP Console.</p>
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
  console.log('📥 Incoming Manuscript Submission:', JSON.stringify(req.body, null, 2));
  const { name, email, manuscriptId, mID, title, journal, researchField } = req.body;
  const targetId = manuscriptId || mID;
  if (!email) return res.status(400).json({ error: 'email required' });

  const html = wrapper(`
    <h2 style="color:#1a237e;margin-top:0;margin-bottom:20px;font-size:18px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #eee;padding-bottom:15px;">MANUSCRIPT RECEIVED</h2>
    <p>Dear <strong>${name || 'Author'}</strong>,</p>
    <p>
      Your manuscript has been successfully submitted to <strong>Scholar India Publishers</strong>. 
      Our editorial team will begin the review process shortly.
    </p>
    <div style="background:#f8faff;border-left:6px solid #1a237e;padding:25px;border-radius:4px;margin:30px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:4px 0;color:#666;font-size:11px;font-weight:700;text-transform:uppercase;width:40%;">Manuscript ID</td>
            <td style="padding:4px 0;font-size:13px;font-weight:700;color:#1a237e;font-family:monospace;">${targetId || 'Pending'}</td></tr>
        <tr><td style="padding:4px 0;color:#666;font-size:11px;font-weight:700;text-transform:uppercase;">Title</td>
            <td style="padding:4px 0;font-size:13px;color:#333;font-weight:600;">${title || '—'}</td></tr>
        <tr><td style="padding:4px 0;color:#666;font-size:11px;font-weight:700;text-transform:uppercase;">Journal</td>
            <td style="padding:4px 0;font-size:13px;color:#333;">${journal || '—'}</td></tr>
        ${researchField ? `<tr><td style="padding:4px 0;color:#666;font-size:11px;font-weight:700;text-transform:uppercase;">Research Field</td>
            <td style="padding:4px 0;font-size:13px;color:#333;">${researchField}</td></tr>` : ''}
      </table>
    </div>
    <p style="font-size:13px;color:#666;">
      You will receive further updates as your manuscript progresses through peer review. 
      Please retain your Manuscript ID for all future correspondence.
    </p>
    <p style="margin-top:30px;border-top:1px solid #eeeeee;padding-top:20px;font-size:12px;color:#666;">Best Regards,<br><strong>Editorial Office</strong><br>Scholar India Publishers</p>
  `);

  try {
    await sendMail({ to: email, subject: `Manuscript Received – ${targetId || 'New'} | Scholar India Publishers`, html });
    console.log('✅ Manuscript email sent to:', email);
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
      <span style="background:#e0f7fa;color:#006064;padding:4px 16px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.05em;border:1px solid #b2ebf2;">APPLICATION RECEIVED</span>
    </div>
    <h2 style="color:#1a237e;margin-top:0;margin-bottom:20px;font-size:18px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #eee;padding-bottom:15px;">APPLICATION STATUS</h2>
    <p>Dear <strong>${name || 'Applicant'}</strong>,</p>
    <p>
      Thank you for applying as a <strong>${role || 'Reviewer'}</strong> for 
      <strong>${journal || 'Scholar India Publishers'}</strong>. 
      We have received your application and profile successfully.
    </p>
    <div style="background:#f8faff;border-left:6px solid #1a237e;padding:25px;border-radius:4px;margin:30px 0;text-align:center;">
      <p style="color:#666;margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Your Application ID</p>
      <p style="color:#1a237e;margin:0;font-size:26px;font-weight:900;font-family:monospace;letter-spacing:0.08em;">${reviewerId || '—'}</p>
    </div>
    <p style="font-size:14px;color:#666;">
      Please save this ID. You can use it to track your application status on our website.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="https://scholarindiapub.com/reviewer-search" 
         style="background:#1a237e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:700;display:inline-block;">
        Track Application Status →
      </a>
    </div>
    <p style="margin-top:30px;border-top:1px solid #eeeeee;padding-top:20px;font-size:12px;color:#666;">Best Regards,<br><strong>Editorial Office</strong><br/>Scholar India Publishers</p>
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
    <div style="text-align:center;margin-bottom:24px;">
      <span style="background:#27ae60;color:#fff;padding:6px 24px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:0.1em;border-bottom:3px solid rgba(0,0,0,0.1);">OFFICIAL INVOICE</span>
    </div>

    <!-- Original UI Invoice Structure -->
    <div style="border:1px solid #1a237e; border-radius:4px; background:#fff; margin-bottom:10px; overflow:hidden;">
      <!-- Invoice Header -->
      <div style="padding:30px 25px; border-bottom:2px solid #1a237e; background:#ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="60%" valign="middle">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:15px;">
                    <div style="background:#1a237e; color:#ffffff; width:55px; height:55px; line-height:55px; text-align:center; border-radius:10px; font-weight:900; font-size:20px; font-family:Arial, sans-serif;">SIP</div>
                  </td>
                  <td valign="middle">
                    <div style="font-size:10px; color:#666; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:2px;">Official Receipt</div>
                    <div style="font-size:12px; color:#1a237e; font-weight:700; text-transform:uppercase;">Scholar India Publishers</div>
                  </td>
                </tr>
              </table>
            </td>
            <td width="40%" align="right" valign="middle">
              <h2 style="margin:0; font-size:22px; color:#1a237e; font-weight:900; text-transform:uppercase; letter-spacing:1px; line-height:1;">Invoice</h2>
              <div style="margin-top:8px; font-size:11px; line-height:1.4; color:#555;">
                <strong>No:</strong> <span style="color:#1a237e; font-weight:700;">${inv}</span><br>
                <strong>Date:</strong> ${today}
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Bill To -->
      <div style="padding:20px; border-bottom:1px solid #eee;">
        <p style="margin:0 0 6px; font-size:11px; font-weight:800; color:#1a237e; text-transform:uppercase;">BILL TO:</p>
        <p style="margin:0; font-size:15px; font-weight:700; color:#333;">${name || '—'}</p>
        <p style="margin:2px 0 0; font-size:13px; color:#666;">${email}</p>
      </div>

      <!-- Service Table -->
      <div style="padding:20px;">
        <table width="100%" style="border-collapse:collapse; font-size:11px;">
          <thead>
            <tr style="background:#1a237e; color:#fff;">
              <th align="left" style="padding:10px;">Description</th>
              <th align="right" style="padding:10px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:15px 10px; border-bottom:1px solid #eee;">
                <strong style="color:#1a237e; display:block; margin-bottom:4px;">Article Processing Charges (APC)</strong>
                <span style="font-size:10px; color:#555; display:block;">Manuscript ID: ${manuscriptId || '—'}</span>
                <span style="font-size:10px; color:#555; display:block;">Title: ${title || '—'}</span>
              </td>
              <td align="right" style="padding:15px 10px; border-bottom:1px solid #eee; font-weight:bold; font-size:14px; color:#1a237e;">₹${amount || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Payment Info + Total -->
      <div style="padding:15px 20px;">
        <table width="100%">
          <tr>
            <td width="60%" style="font-size:10px; color:#666; line-height:1.4;">
              <strong>Payment Information:</strong><br>
              Mode: ${paymentMode || '—'}<br>
              Transaction Ref: ${transactionRef || '—'}<br>
              Payment Date: ${today}
            </td>
            <td width="40%" align="right">
              <p style="font-size:15px; color:#1a237e; margin:0;"><strong>Grand Total: ₹${amount || '—'}</strong></p>
              <p style="font-size:11px; color:#27ae60; margin:4px 0;"><strong>Status: PAID IN FULL</strong></p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Production Note -->
      <div style="margin:20px; padding:15px; background-color:#e8f5e9; border:1px solid #c8e6c9; border-radius:4px; font-size:12px; color:#2e7d32; line-height:1.6;">
        <strong>Production Update:</strong><br>
        Your manuscript has been sent to our production department. This process (typesetting, proofing, and archiving) takes a <strong>minimum of 30 working days</strong>. You will be notified with the DOI details immediately upon publication.
      </div>
    </div>

    <p style="color:#666; font-size:12px; margin-top:30px; border-top:1px solid #eee; padding-top:20px;">Best Regards,<br/><strong>Accounts Department</strong><br/>Scholar India Publishers</p>
    <div style="margin-top:8px; opacity:0.7; font-size:9px; color:#666; text-align:center;">
      This is a computer-generated document. No signature is required.
    </div>
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
      <span style="background:#f0fdf4;color:#16a34a;padding:4px 16px;border-radius:20px;font-size:11px;font-weight:700;border:1.5px solid #16a34a;">NEW ASSIGNMENT</span>
    </div>
    <h2 style="color:#1a237e;margin-top:0;margin-bottom:20px;font-size:18px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #eee;padding-bottom:15px;">WORK ASSIGNED</h2>
    <p>Dear <strong>${name || 'Reviewer'}</strong>,</p>
    <p>
      A manuscript has been assigned to you for peer review. Please log in to your Reviewer Dashboard to accept or review the assignment.
    </p>
    <div style="background:#f8faff;border-left:6px solid #1a237e;border-radius:4px;padding:25px;margin:30px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#666;font-size:11px;font-weight:800;text-transform:uppercase;width:40%;">Reviewer ID</td>
            <td style="padding:6px 0;font-size:13px;font-family:monospace;font-weight:900;color:#1a237e;">${reviewerId || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;font-size:11px;font-weight:800;text-transform:uppercase;">Manuscript ID</td>
            <td style="padding:6px 0;font-size:13px;font-family:monospace;font-weight:900;color:#1a237e;">${manuscriptId || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;font-size:11px;font-weight:800;text-transform:uppercase;">Title</td>
            <td style="padding:6px 0;font-size:13px;color:#333;font-weight:600;">${manuscriptTitle || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;font-size:11px;font-weight:800;text-transform:uppercase;">Due Date</td>
            <td style="padding:6px 0;font-size:13px;color:#dc2626;font-weight:800;">${dueDate || 'As soon as possible'}</td></tr>
      </table>
    </div>
    ${manuscriptLink ? `
    <div style="text-align:center;margin:30px 0;">
      <a href="${manuscriptLink}" style="background:#1a237e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:700;display:inline-block;">
        View Manuscript →
      </a>
    </div>` : ''}
    <p style="font-size:13px;color:#666;">
      Please submit your review before the due date. For any queries, contact us at scholarindiapub@gmail.com.
    </p>
    <p style="margin-top:30px;border-top:1px solid #eeeeee;padding-top:20px;font-size:12px;color:#666;">Best Regards,<br><strong>Editorial Office</strong><br>Scholar India Publishers</p>
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
      <div style="width:60px;height:60px;background:#f0fdf4;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:3px solid #16a34a;margin-bottom:15px;">
        <span style="font-size:32px;color:#16a34a;">✓</span>
      </div>
      <h2 style="color:#16a34a;margin:0;font-size:22px;text-transform:uppercase;letter-spacing:1px;">Approved for Publication!</h2>
      <p style="color:#666;margin:5px 0 0;font-size:13px;font-weight:700;">Congratulations on this milestone</p>
    </div>
    <p>Dear <strong>${name || 'Author'}</strong>,</p>
    <p>
      We are pleased to inform you that your manuscript has been <strong>approved for production</strong> and will be published in 
      <strong>${journal || 'Scholar India Publishers'}</strong>.
    </p>
    <div style="background:#f8faff;border-left:6px solid #16a34a;border-radius:4px;padding:25px;margin:30px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#666;font-size:11px;font-weight:800;text-transform:uppercase;width:40%;">Manuscript ID</td>
            <td style="padding:6px 0;font-size:14px;font-family:monospace;font-weight:900;color:#16a34a;">${manuscriptId || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;font-size:11px;font-weight:800;text-transform:uppercase;">Title</td>
            <td style="padding:6px 0;font-size:13px;color:#333;font-weight:600;">${title || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;font-size:11px;font-weight:800;text-transform:uppercase;">Journal</td>
            <td style="padding:6px 0;font-size:13px;color:#333;">${journal || '—'}</td></tr>
      </table>
    </div>
    <div style="background:#fffcf0;border:1px solid #fde68a;border-left:6px solid #fbbf24;padding:20px;border-radius:8px;margin:25px 0;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:800;color:#92400e;">Production Timeline:</p>
      <p style="margin:0;font-size:12px;color:#78350f;line-height:1.7;">
        The production process (typesetting, formatting, and final archiving) takes a minimum of <strong>30 working days</strong>. 
        You will receive the DOI details and the publication link immediately once it goes live.
      </p>
    </div>
    <p style="margin-top:30px;border-top:1px solid #eeeeee;padding-top:20px;font-size:12px;color:#666;">Best Regards,<br><strong>Editorial Board</strong><br>Scholar India Publishers</p>
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
      <div style="width:60px;height:60px;background:#f0f7ff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:3px solid #1a237e;margin-bottom:15px;">
        <span style="font-size:32px;">🎓</span>
      </div>
      <h2 style="color:#1a237e;margin:0;font-size:22px;text-transform:uppercase;letter-spacing:1px;">Welcome to Our Editorial Panel!</h2>
      <p style="color:#666;margin:5px 0 0;font-size:13px;font-weight:700;">Your application has been approved</p>
    </div>
    <p>Dear <strong>${name || 'Applicant'}</strong>,</p>
    <p>
      We are delighted to inform you that your application to join Scholar India Publishers as a 
      <strong>${role || 'Reviewer'}</strong> has been <strong style="color:#16a34a;">APPROVED</strong>. 
      You are now an active member of our editorial community.
    </p>
    <div style="background:#f8faff;border-left:6px solid #1a237e;border-radius:4px;padding:25px;margin:30px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#666;font-size:11px;font-weight:800;text-transform:uppercase;width:40%;">Your ID</td>
            <td style="padding:6px 0;font-size:14px;font-family:monospace;font-weight:900;color:#1a237e;">${reviewerId || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;font-size:11px;font-weight:800;text-transform:uppercase;">Role</td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:#333;">${role || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;font-size:11px;font-weight:800;text-transform:uppercase;">Journal</td>
            <td style="padding:6px 0;font-size:13px;color:#333;">${journal || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;font-size:11px;font-weight:800;text-transform:uppercase;">Status</td>
            <td style="padding:6px 0;"><span style="background:#dcfce7;color:#16a34a;padding:2px 12px;border-radius:20px;font-size:11px;font-weight:800;border:1px solid #16a34a;">ACTIVE</span></td></tr>
      </table>
    </div>
    ${message ? `<div style="background:#f8fafc;border-left:4px solid #1a237e;padding:15px;border-radius:0 8px 8px 0;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:#444;font-style:italic;">"${message}"</p>
    </div>` : ''}
    <p style="font-size:13px;color:#666;line-height:1.6;">
      You will be contacted when manuscripts are assigned to you for review. 
      Please log in to your <a href="https://scholarindiapub.com/reviewer-dashboard" style="color:#1a237e;font-weight:700;">Reviewer Dashboard</a> to manage your profile.
    </p>
    <p style="margin-top:30px;border-top:1px solid #eeeeee;padding-top:20px;font-size:12px;color:#666;">Best Regards,<br><strong>Editorial Office</strong><br>Scholar India Publishers</p>
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
  console.log('📥 Incoming Status Update:', JSON.stringify(req.body, null, 2));
  const b = req.body;
  const d = b.details || {};
  
  const name = b.name || d.name;
  const email = b.email || d.email;
  const status = b.status || d.status;
  const targetId = b.manuscriptId || b.mID || d.manuscriptId || d.mID;
  const title = b.manuscriptTitle || b.title || d.manuscriptTitle || d.mTitle || d.title;
  const journal = b.journalName || b.journal || d.journalName || d.journal;
  const doi = b.doi || d.doi;
  const plag = b.plag || d.plag;
  const reviewerComments = b.reviewerComments || d.reviewerComments;
  const recommendation = b.recommendation || d.recommendation;

  if (!email || !status) {
    console.error('❌ Missing required fields:', { email, status });
    return res.status(400).json({ error: 'email and status required' });
  }

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
      <div style="background:#f8f9fa; border:1px solid #dee2e6; padding:20px; border-radius:10px; margin:24px 0;">
        <p style="margin:0 0 16px 0; color:#333; font-weight:bold; font-size:15px;">Reviewer Comments:</p>
        ${commentsHtml}
      </div>`;
  };

  const navDashboard = `
    <div style="background:#f8f9fa; padding:20px; border-radius:10px; margin-top:30px; border:1px solid #dee2e6;">
      <p style="margin:0 0 15px 0; font-weight:bold; color:#1a237e; font-size:12px; text-align:center; text-transform:uppercase; letter-spacing:0.1em;">Author Services & Journals</p>
      <table width="100%" cellpadding="4" cellspacing="0" style="margin-bottom:10px;">
        <tr>
          <td><a href="https://scholarindiapub.com/submit" style="display:block; background:#1a237e; color:#ffffff; padding:10px; border-radius:4px; text-decoration:none; text-align:center; font-size:11px; font-weight:bold;">Manuscript Submission</a></td>
          <td><a href="https://scholarindiapub.com/manuscript-track" style="display:block; background:#1a237e; color:#ffffff; padding:10px; border-radius:4px; text-align:center; font-size:11px; font-weight:bold;">Track Manuscript</a></td>
        </tr>
      </table>
      <a href="https://scholarindiapub.com/commerce-management" style="display:block; background:#ffffff; border:2px solid #1a237e; color:#1a237e; padding:12px; border-radius:4px; text-decoration:none; text-align:center; font-size:12px; font-weight:bold; margin-bottom:8px;">Scholar Journal of Commerce and Management</a>
      <a href="https://scholarindiapub.com/humanities" style="display:block; background:#ffffff; border:2px solid #1a237e; color:#1a237e; padding:12px; border-radius:4px; text-decoration:none; text-align:center; font-size:12px; font-weight:bold; margin-bottom:12px;">Scholar Journal of Humanities and Social Sciences</a>
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
      <div style="background:#f0f9f1; border:1px solid #198754; padding:20px; border-radius:8px; margin:20px 0;">
        <p style="margin:0 0 15px 0; color:#198754; font-weight:bold; font-size:15px;">Next Steps (Complete within 10 days):</p>
        <div style="margin-bottom:12px;"><a href="https://scholarindiapub.com/final-paper" style="display:block; background:#ffffff; border:1px solid #198754; color:#198754; padding:10px; text-decoration:none; border-radius:5px; font-weight:bold; font-size:13px; text-align:center;">STEP 1: Complete Copyright Form, Final Paper in the Template & Payment</a></div>
        <p style="font-size:12px; color:#d63031; margin:0; line-height:1.5; border-top:1px solid #d1e7dd; padding-top:10px; font-weight:bold;">
          ⚠️ IMPORTANT: Please complete all steps within 10 days. If any step is not completed, your paper will be automatically rejected for publication without further notification.
        </p>
      </div>`;
  }
  else if (currentStatus === "complement") {
    badgeColor = "#0891b2";
    mailHeading = "DECISION: ACCEPTED (Complement)";
    specificMessage = `After careful peer review and editorial evaluation, we are pleased to inform you that your manuscript has been <strong>Accepted</strong> for publication under our <strong>Complimentary Waiver (No APC Required)</strong> program. <br><br><strong>Note:</strong> You must incorporate the reviewer comments provided below into your final paper before finishing the process.`;
    
    actionArea = getFeedbackHtml() + `
      <div style="background:#e0f7fa; border:1px solid #17a2b8; padding:20px; border-radius:8px; margin:20px 0;">
         <p style="margin:0 0 15px 0; color:#006064; font-weight:bold; font-size:15px;">Next Steps (Complete within 10 days):</p>
         <div style="margin-bottom:12px;"><a href="https://scholarindiapub.com/final-paper" style="display:block; background:#ffffff; border:1px solid #17a2b8; color:#006064; padding:10px; text-decoration:none; border-radius:5px; font-weight:bold; font-size:13px; text-align:center;">Final Step: Complete Copyright Form and Final Paper in the Template</a></div>
        <p style="font-size:12px; color:#d63031; margin:0; line-height:1.5; border-top:1px solid #b2ebf2; padding-top:10px; font-weight:bold;">
          ⚠️ IMPORTANT: Please complete all steps within 10 days. If any step is not completed, your paper will be automatically rejected for publication without further notification.
        </p>
      </div>`;
  }
  else if (currentStatus === "rejected") {
    badgeColor = "#dc3545";
    mailHeading = "DECISION: MANUSCRIPT REJECTED";
    specificMessage = `Thank you for your submission. After careful technical evaluation, we regret to inform you that your manuscript has been <strong>Rejected</strong> for publication. This decision was made based on the following reviewer observations and editorial standards.`;
    const reasonText = b.reason || d.reason || `Technical/Peer Review criteria not satisfied ${plag ? `(Plagiarism: ${plag})` : ''}.`;
    actionArea = `<div style="background:#fff5f5; border:1px solid #dc3545; padding:15px; border-radius:8px; margin:20px 0;"><p style="font-size:13px; color:#333; margin:0;"><strong>Primary Reason:</strong> ${reasonText}</p></div>`;
  }
  else if (currentStatus === "published") {
    badgeColor = "#0d6efd";
    mailHeading = "PUBLICATION NOTIFICATION";
    const jName = (journal || journalName || "").toLowerCase();
    let currentIssueLink = "https://scholarindiapub.com/";
    if (jName.includes("commerce") || jName.includes("management")) currentIssueLink = "https://scholarindiapub.com/commerce-management#current-issue";
    else if (jName.includes("humanities") || jName.includes("social")) currentIssueLink = "https://scholarindiapub.com/humanities#current-issue";

    specificMessage = `Congratulations! Your latest research article has been <strong>Published</strong> and is now officially part of our digital library. We thank you for choosing us as your publishing partner and look forward to your future contributions.`;
    
    actionArea = `
      <div style="background:#eef5ff; padding:15px; border-radius:8px; margin:20px 0; border:1px solid #d0e3ff; text-align:center;">
        <p style="margin:0 0 10px 0; font-size:13px; color:#333;"><strong>Official DOI:</strong></p>
        <a href="${doi || '#'}" style="color:#0d6efd; font-weight:bold; font-size:15px; text-decoration:none; word-break:break-all; display:block; margin-bottom:15px;">${doi || 'DOI Pending'}</a>
        <a href="${currentIssueLink}" style="background:#0d6efd; color:#ffffff; padding:10px 20px; border-radius:4px; text-decoration:none; font-size:12px; font-weight:bold; display:inline-block;">VIEW CURRENT ISSUE →</a>
      </div>
      <div style="background:#fff9e6; padding:15px; border-left:5px solid #ffc107; border-radius:6px; margin:20px 0; font-size:14px; color:#333; line-height:1.6;">
        <strong style="color:#b38600; font-size:15px; display:block; margin-bottom:8px;">🚀 Maximize Your Research Impact!</strong>
        We highly encourage you to upload your published paper's PDF to platforms like <strong>ResearchGate</strong> and <strong>Academia.edu</strong>. Sharing your work widely is a proven way to increase global visibility and attract citations.
      </div>`;
  }

  const html = wrapper(`
    <div style="text-align:center;margin-bottom:24px;">
      <span style="background:${badgeColor}20; color:${badgeColor}; padding:6px 16px; border-radius:20px; font-size:12px; font-weight:800; border:1.5px solid ${badgeColor}; text-transform:uppercase; letter-spacing:0.05em;">${status}</span>
    </div>
    
    <h2 style="color:${badgeColor}; margin:0 0 24px; font-size:18px; text-align:center; font-weight:900; letter-spacing:0.5px; text-transform:uppercase; border-bottom:1px solid #eee; padding-bottom:15px;">${mailHeading}</h2>
    
    <p>Dear <strong>${name || 'Author'}</strong>,</p>
    <p>${specificMessage}</p>
    
    <div style="background-color:#f8faff; border-left:6px solid #1a237e; border-radius:4px; padding:25px; margin:30px 0;">
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="padding:6px 0; color:#666; font-size:12px; font-weight:800; text-transform:uppercase; width:35%;">Manuscript ID</td>
            <td style="padding:6px 0; font-size:14px; font-weight:900; color:#1a237e; font-family:monospace;">${targetId || '—'}</td></tr>
        <tr><td style="padding:6px 0; color:#666; font-size:12px; font-weight:800; text-transform:uppercase;">Journal</td>
            <td style="padding:6px 0; font-size:13px; color:#333;">${journal || '—'}</td></tr>
        <tr><td style="padding:6px 0; color:#666; font-size:12px; font-weight:800; text-transform:uppercase;">Title</td>
            <td style="padding:6px 0; font-size:13px; color:#333; font-weight:600; line-height:1.5;">${title || 'Untitled Manuscript'}</td></tr>
      </table>
    </div>

    ${actionArea}
    ${navDashboard}

    <p style="margin-top:30px; border-top:1px solid #eeeeee; padding-top:20px; font-size:12px; color:#666;">
      Best Regards,<br/>
      <strong>Editorial Office</strong><br/>
      Scholar India Publishers
    </p>
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
  console.log('📥 Incoming Reviewer Status Update:', JSON.stringify(req.body, null, 2));
  const b = req.body;
  const d = b.details || {};

  const name = b.name || d.name;
  const email = b.email || d.email;
  const status = b.status || d.status;
  const rID = b.rID || d.rID || b.reviewerId || d.reviewerId;
  const role = b.role || d.role;
  const journal = b.journal || d.journal;

  if (!email || !status) return res.status(400).json({ error: 'email and status required' });

  const currentStatus = status.toLowerCase();
  let label = "APPLICATION UPDATE";
  let color = "#6c757d";
  let subject = `Application Update: ${role || 'Reviewer'}`;
  let content = "";

  const navDashboard = `
    <div style="background:#f8f9fa; padding:20px; border-radius:10px; margin-top:30px; border:1px solid #dee2e6;">
      <p style="margin:0 0 15px 0; font-weight:bold; color:#1a237e; font-size:12px; text-align:center; text-transform:uppercase; letter-spacing:0.1em;">Quick Links</p>
      <table width="100%" cellpadding="4" cellspacing="0" style="margin-bottom:10px;">
        <tr>
          <td><a href="https://scholarindiapub.com/submit" style="display:block; background:#1a237e; color:#ffffff; padding:10px; border-radius:4px; text-decoration:none; text-align:center; font-size:11px; font-weight:bold;">Submit Manuscript</a></td>
          <td><a href="https://scholarindiapub.com/manuscript-track" style="display:block; background:#1a237e; color:#ffffff; padding:10px; border-radius:4px; text-align:center; font-size:11px; font-weight:bold;">Track Status</a></td>
        </tr>
      </table>
      <a href="https://scholarindiapub.com/commerce-management" style="display:block; background:#ffffff; border:1px solid #1a237e; color:#1a237e; padding:12px; border-radius:4px; text-decoration:none; text-align:center; font-size:12px; font-weight:bold; margin-bottom:8px;">Scholar Journal of Commerce and Management</a>
      <a href="https://scholarindiapub.com/humanities" style="display:block; background:#ffffff; border:1px solid #1a237e; color:#1a237e; padding:12px; border-radius:4px; text-decoration:none; text-align:center; font-size:12px; font-weight:bold; margin-bottom:12px;">Scholar Journal of Humanities and Social Sciences</a>
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
      <p>Based on your expressed interest in joining our editorial team (received via our online submission channels), we are pleased to inform you that you have been selected and appointed as an <strong>${role}</strong> of our <strong>${journal}</strong>, published under Scholar India Publishers (SIP).</p>
      <p>We extend our sincere appreciation for your willingness to contribute to the advancement of research in the fields of commerce, management, and social sciences.</p>
      
      <div style="background:#f1f3f8; padding:25px; border-radius:8px; font-size:14px; color:#333; border: 1px solid #d1d9e6; margin: 24px 0;">
        <h3 style="color:#1a237e; margin-top:0; font-size:16px; border-bottom: 2px solid #ccc; padding-bottom: 10px;">Roles and Responsibilities</h3>
        <p>As an <strong>${role}</strong>, your key roles and responsibilities include:</p>
        <ul style="padding-left:20px; line-height:1.7; margin-top:15px;">
          <li><strong>Editorial Oversight:</strong> Assist in maintaining the academic quality and integrity of the journal through the management of peer review and publication processes.</li>
          <li><strong>Manuscript Handling:</strong> Evaluate submitted manuscripts for suitability, assign reviewers, and provide editorial recommendations based on reviewer feedback.</li>
          <li><strong>Promotion of the Journal:</strong> Encourage high-quality manuscript submissions and help enhance the visibility and reputation of the journal within academic and professional circles.</li>
          <li><strong>Strategic Development:</strong> Contribute ideas and suggestions for improving the journal’s reach, impact, and alignment with current research trends.</li>
          <li><strong>Ethical Standards:</strong> Uphold and ensure adherence to the highest standards of publication ethics and integrity, following COPE (Committee on Publication Ethics) guidelines.</li>
          <li><strong>Collaboration:</strong> Work in coordination with the Editorial Board, Reviewers, Managing Editor, and Publisher to ensure a smooth editorial workflow and timely publication.</li>
        </ul>
        
        <p><strong>Tenure:</strong> Your tenure as <strong>${role}</strong> will initially be for a period of <strong>two (2) years</strong>, effective from the date of this communication, and may be renewed based on mutual consent and active participation.</p>
        <p><strong>Financial Commitment:</strong> Please note that this appointment is purely <strong>honorary</strong>. There is no financial commitment or remuneration from either end. Your contribution is recognized as a professional service to the academic community.</p>
        <p style="font-size:12px; color:#666; font-style: italic; border-top: 1px solid #ddd; padding-top:10px; margin-top:15px;">
          <strong>Termination Clause:</strong> If the Managing Editor or Publisher finds that the information you have provided is incorrect, or that you are not actively contributing to the journal’s activities, or in any way acting contrary to the journal’s interests, the Managing Editor/Publisher reserves full authority to withdraw or terminate your appointment at any time during the tenure, without prior notice or explanation.
        </p>
      </div>
      <p>We believe your expertise and dedication will play a key role in strengthening the journal’s academic standing and global outreach.</p>
      <p>We warmly welcome you to the editorial team of <strong>${journal}</strong> and look forward to your valuable contributions.</p>`;
  }
  else if (currentStatus === "hold") {
    label = "Action Required";
    color = "#d97706";
    subject = `Action Required: Application for ${role} [ID: ${rID}]`;
    content = `
      <p>We are writing to inform you that your application for the position of <strong>${role}</strong> is currently <strong>On Hold</strong>.</p>
      <div style="background-color:#fff3cd; border:1px solid #ffeeba; border-left:6px solid #856404; padding:20px; border-radius:8px; margin:24px 0;">
        <p style="margin:0; font-weight:bold; color:#856404;">Reason: Mandatory Verification Pending</p>
        <p style="font-size:13px; margin-top:10px;">To maintain the academic integrity of our journals, we <strong>require an official institutional email ID</strong> (e.g., yourname@university.edu) for all editorial board appointments.</p>
      </div>
      <p><strong>Action Required:</strong> Please <strong>reapply</strong> using the button below. Ensure you use your <strong>official institutional email address</strong> and provide updated publication/citation records. Applications using personal email accounts (Gmail, Yahoo, etc.) will not be processed.</p>
      <div style="text-align:center; margin:24px 0;">
         <a href="https://scholarindiapub.com/join-reviewer" style="background:#1a237e; color:#ffffff; padding:12px 25px; border-radius:6px; text-decoration:none; font-weight:bold; display:inline-block;">Resubmit Application Now</a>
      </div>`;
  }
  else if (currentStatus === "reject" || currentStatus === "rejected") {
    label = "Application Declined";
    color = "#dc2626";
    subject = `Application Decision: ${role}`;
    content = `
      <p>Thank you for your interest in joining the editorial board of Scholar India Publishers.</p>
      <p>After a rigorous review of your profile and submitted credentials, we regret to inform you that your application has been <strong>Declined</strong> at this stage.</p>
      <div style="border-left:6px solid #dc3545; background:#fff5f5; padding:20px; margin:24px 0; color:#444; font-size:13px; border-radius:4px;">
        <p style="font-weight:700; color:#333; margin-bottom:8px;">Common Ineligibility Factors:</p>
        <ul style="margin:0; padding-left:16px; line-height:1.7;">
          <li>Failure to provide a verifiable <strong>institutional/official email ID</strong>.</li>
          <li>Insufficient research impact or citation history in the designated field.</li>
          <li>Profile does not meet the journal's current technical requirements.</li>
        </ul>
      </div>
      <p>You are welcome to <strong>reapply</strong> only if you can provide an <strong>institutional email address</strong> and demonstrate significantly updated academic credentials. We do not accept editorial appointments via personal email accounts.</p>
      <div style="text-align:center; margin:24px 0;">
         <a href="https://scholarindiapub.com/join-reviewer" style="background:#dc3545; color:#ffffff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:12px; display:inline-block;">Update & Reapply</a>
      </div>`;
  }

  const html = `
  <div style="background-color:#f4f7f6; padding:40px 0; font-family:Arial, sans-serif;">
    <div style="max-width:620px; margin:auto; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e0e0e0; box-shadow:0 10px 30px rgba(0,0,0,0.1);">
      <div style="background-color:#1a237e; color:#ffffff; text-align:center; padding:40px 20px;">
        <h1 style="margin:0; font-size:26px;">Scholar India Publishers</h1>
        <div style="margin-top:8px; font-size:11px; opacity:0.9; line-height:1.4;">International Peer-Reviewed Academic Journals & <br>Book Publishing Excellence Since 2022</div>
      </div>
      <div style="padding:40px; color:#333333; line-height:1.7;">
        <div style="text-align:center; margin-bottom:32px;">
          <span style="background-color:${color}; color:#ffffff; padding:10px 28px; border-radius:6px; font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; border-bottom:3px solid rgba(0,0,0,0.15);">
            ${label}
          </span>
        </div>
        <p style="font-size:15px;">Dear <strong>${name || 'Applicant'}</strong>,</p>
        <div style="font-size:14px; color:#475569;">${content}</div>
        <div style="background-color:#f8faff; border-left:6px solid #1a237e; padding:20px; border-radius:0 8px 8px 0; margin:32px 0; font-size:13px;">
           <table style="width:100%;">
             <tr><td style="color:#666; font-weight:700; width:35%;">Application ID:</td><td style="color:#1a237e; font-weight:900; font-family:monospace;">${rID || 'N/A'}</td></tr>
             <tr><td style="color:#666; font-weight:700;">Designation:</td><td style="color:#333; font-weight:700;">${role || '—'}</td></tr>
             <tr><td style="color:#666; font-weight:700;">Applied Journal:</td><td style="color:#333;">${journal || '—'}</td></tr>
           </table>
        </div>
        ${navDashboard}
        <div style="margin-top:32px; padding-top:24px; border-top:1px solid #eeeeee; font-size:12px; color:#666;">
          Best Regards,<br/><strong>Editorial Office</strong><br/>Scholar India Publishers
        </div>
      </div>
      <div style="background-color:#1a237e; color:#ffffff; text-align:center; padding:20px; font-size:10px;">
        © ${new Date().getFullYear()} Scholar India Publishers | Chennai, India<br/>
        <a href="https://scholarindiapub.com" style="color:#FFD700; text-decoration:none; font-weight:700;">www.scholarindiapub.com</a>
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
      <p style="font-size:14px; color:#333;">We have received the payment details for your manuscript: <strong>${details.msId}</strong>.</p>
      <p style="font-size:14px; color:#333;">Verification is <strong>Under Process</strong>. Our accounts team will verify the transaction within 24-48 working hours.</p>
      <h4 style="color:#1a237e; margin:20px 0 5px 0; border-bottom:1px solid #eee; padding-bottom:5px; font-size:13px; text-transform:uppercase;">Payment Details</h4>
      <table width="100%" style="font-size:12px; background:#f9f9f9; padding:15px; border:1px solid #eee; line-height:1.6; border-radius:4px;">
        <tr><td width="40%"><strong>Transaction Number:</strong></td><td style="font-family:monospace; font-weight:700; color:#1a237e;">${details.transId}</td></tr>
        <tr><td><strong>Amount Paid:</strong></td><td style="font-weight:700;">${details.currency || 'INR'} ${details.amount}</td></tr>
        <tr><td><strong>Date of Payment:</strong></td><td>${today}</td></tr>
        <tr><td><strong>Mode of Payment:</strong></td><td>${details.mode}</td></tr>
      </table>`;
  } 
  else if (status === "failed") {
    typeLabel = "Payment Failed";
    labelColor = "#dc3545";
    subject = `Action Required: Payment Not Received for ${details.msId}`;
    content = `
      <p style="font-size:14px;">We are writing to inform you that we have <strong>not received</strong> the payment for your manuscript: <strong>${details.msId}</strong>.</p>
      <div style="background-color:#fff5f5; border:1px solid #feb2b2; border-left:6px solid #dc3545; padding:15px; border-radius:4px; margin:20px 0; color:#c53030;">
        <p style="margin:0; font-weight:bold;">Status: Transaction not found in our records.</p>
      </div>
      <p style="font-size:13px;">If you have already made the payment, please <strong>reply to this email with a screenshot, PDF receipt, or any evidence</strong> of the transaction for manual verification by our accounts team.</p>
      <p style="font-size:13px; color:#555;">Kindly ensure the transaction number and date are clearly visible in the attachment.</p>`;
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
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:15px;">
                    <div style="background:#1a237e; color:#ffffff; width:55px; height:55px; line-height:55px; text-align:center; border-radius:10px; font-weight:900; font-size:20px; font-family:Arial, sans-serif;">SIP</div>
                  </td>
                  <td valign="middle">
                    <div style="font-size:10px; color:#666; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:2px;">Official Receipt</div>
                    <div style="font-size:12px; color:#1a237e; font-weight:700; text-transform:uppercase;">Scholar India Publishers</div>
                  </td>
                </tr>
              </table>
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
  const b = req.body;
  const name = b.name;
  const email = b.email;
  const msId = b.msId || b.manuscriptId || b.mID;
  const title = b.title || b.manuscriptTitle;
  const journal = b.journal || b.journalName;
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

// ════════════════════════════════════════════════════════════════════════════
// 14. THIRD PARTY WORK SUBMISSION RECEIPT
// POST /send/third-party-receipt
// { name, email, workDescription, transactionId, date }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/third-party-receipt', async (req, res) => {
  const { name, email, workDescription, transactionId, date } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const subject = `Receipt: Payment Details Received [${transactionId}]`;
  const html = wrapper(`
    <p>Dear <strong>${name}</strong>,</p>
    <p>We have received your payment details and proof of transaction for: <strong>${workDescription}</strong>.</p>
    <p>Your submission is currently under manual verification. We will notify you once your payment has been approved.</p>
    <div style="background:#f1f5f9; padding:20px; border-radius:10px; margin:24px 0;">
       <table style="width:100%; font-size:13px;">
          <tr><td style="color:#64748b; font-weight:700; width:35%;">Transaction ID:</td><td style="color:#213361; font-weight:900;">${transactionId}</td></tr>
          <tr><td style="color:#64748b; font-weight:700;">Purpose:</td><td>${workDescription}</td></tr>
          <tr><td style="color:#64748b; font-weight:700;">Date:</td><td>${date}</td></tr>
       </table>
    </div>
  `);

  try { await sendMail({ to: email, subject, html }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// 15. THIRD PARTY WORK STATUS UPDATE
// POST /send/third-party-status
// { name, email, workDescription, transactionId, status, reason }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/third-party-status', async (req, res) => {
  const { name, email, workDescription, transactionId, status, reason } = req.body;
  if (!email || !status) return res.status(400).json({ error: 'email and status required' });

  let subject = `Payment Status: ${status} [${transactionId}]`;
  let content = `<p>Dear <strong>${name}</strong>,</p>`;
  if (status.toLowerCase() === 'approved') {
    content += `
      <p>We are pleased to inform you that your payment for <strong>${workDescription}</strong> (Txn: ${transactionId}) has been successfully <strong>verified and approved</strong>.</p>
      <p>Thank you for choosing our professional services.</p>`;
  } else {
    content += `
      <p>We regret to inform you that your payment for <strong>${workDescription}</strong> (Txn: ${transactionId}) has been <strong>rejected</strong> by our accounts department.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please contact our support team for further clarification.</p>`;
  }

  const html = wrapper(content);

  try { await sendMail({ to: email, subject, html }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// 16. BOOK PROPOSAL STATUS UPDATE
// POST /send/book-status-update
// { name, email, status, details: { bID, bookTitle, pubType, format, isbnVal } }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/book-status-update', async (req, res) => {
  const { name, email, status, details } = req.body;
  if (!email || !status || !details) return res.status(400).json({ error: 'email, status, and details required' });

  const currentStatus = String(status).toLowerCase();
  const authorName = name || "Author";
  const bID = details.bID || "N/A";
  const bookTitle = details.bookTitle || "Untitled Proposal";
  const pubType = details.pubType || "Full Book";
  const format = details.format || "Print + Digital";
  const isbnVal = details.isbnVal || "Pending Allotment";

  let subject = "";
  let label = "";
  let badgeColor = "#6c757d";
  let content = "";
  let actionArea = "";

  if (currentStatus.includes("under review") || currentStatus.includes("under_review")) {
    subject = `Technical Review: ${bookTitle} [ID: ${bID}]`;
    label = "Under Review";
    badgeColor = "#ff9800";
    content = `<p>We confirm that your proposal titled <strong>"${bookTitle}"</strong> is currently <strong>Under Technical Review</strong>.</p>
               <p>Our editorial team is assessing the scope, content quality, and academic relevance.</p>`;
    actionArea = `<div style="background:#fffdec; border:1px solid #ffc107; padding:15px; border-radius:8px; font-size:13px; color:#333;">
                    <strong>Timeline:</strong> This process usually takes 7-10 working days.
                  </div>`;
  } else if (currentStatus.includes("accepted")) {
    subject = `Acceptance & Payment: ${bookTitle} [ID: ${bID}]`;
    label = "Proposal Accepted";
    badgeColor = "#198754";
    
    let feeAmount = "INR 15,000";
    let feeDetails = "(Includes 4 Hard Copies of the Book)";
    
    if (pubType.toLowerCase().includes("chapter")) {
      feeAmount = "INR 1,000 per Chapter";
      feeDetails = "(Processing & Digital Publication Fee)";
    }

    content = `<p>Congratulations! We are pleased to inform you that your work <strong>"${bookTitle}"</strong> has been <strong>Accepted</strong> for publication.</p>
               <p>To proceed with ISBN allotment, formatting, and production, please complete the processing fee payment.</p>`;
    
    actionArea = `<div style="background:#f0f9f1; border:1px solid #198754; padding:20px; border-radius:8px; text-align:center;">
                    <p style="margin:0; font-size:16px; font-weight:bold; color:#198754;">Processing Fee: ${feeAmount}</p>
                    <p style="margin:5px 0 15px 0; font-size:12px; color:#555;">${feeDetails}</p>
                    
                    <div style="background:#fff; padding:10px; border:1px dashed #198754; display:inline-block; margin-bottom:15px; font-size:12px;">
                      <strong>Payment Instruction:</strong><br>
                      Please quote Ref No: <span style="color:#d63384; font-weight:bold;">${bID}</span> in the payment remarks.
                    </div>
                    <br>
                    <a href="https://scholarindiapub.com/payment" style="background:#198754; color:#ffffff; padding:12px 25px; border-radius:4px; text-decoration:none; font-weight:bold;">Pay & Submit Receipt</a>
                  </div>`;
  } else if (currentStatus.includes("rejected") || currentStatus.includes("reject")) {
    subject = `Editorial Decision: ${bookTitle}`;
    label = "Application Declined";
    badgeColor = "#dc3545";
    content = `<p>After a thorough screening of your submission, we regret to inform you that we cannot proceed with your publication at this time.</p>`;
    actionArea = `<div style="background:#fff5f5; border:1px solid #dc3545; padding:20px; border-radius:8px;">
                    <p style="margin:0 0 10px 0; color:#dc3545; font-weight:bold;">Review Summary:</p>
                    <ul style="font-size:13px; color:#333; line-height:1.6; padding-left:20px;">
                      <li><strong>Decision:</strong> Declined due to high similarity index or scope misalignment.</li>
                    </ul>
                  </div>`;
  } else if (currentStatus.includes("published")) {
    subject = `Publication Announcement: ${bookTitle} [ISBN: ${isbnVal}]`;
    label = "Officially Published";
    badgeColor = "#0d6efd";
    content = `<p>We are delighted to announce that your work <strong>"${bookTitle}"</strong> is now <strong>Published</strong> and available in our repository.</p>`;
    actionArea = `<div style="background:#eef5ff; border:1px solid #0d6efd; padding:20px; border-radius:8px; text-align:center;">
                    <span style="font-size:12px; color:#555; text-transform:uppercase;">Permanent Allotted ISBN</span><br>
                    <strong style="font-size:20px; color:#0d6efd; letter-spacing:1px;">${isbnVal}</strong>
                  </div>`;
  } else {
    subject = `Update on Book Proposal: ${bookTitle}`;
    label = "Status Update";
    badgeColor = "#6c757d";
    content = `<p>Your proposal titled <strong>"${bookTitle}"</strong> has a new status update: <strong>${status}</strong>.</p>`;
    actionArea = ``;
  }

  const html = `
  <div style="background-color:#f4f7f6;padding:20px 0;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width:650px;margin:auto;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">
      
      <div style="background-color:#1a237e;color:#ffffff;text-align:center;padding:30px 20px;">
        <h1 style="margin:0;font-size:24px;">Scholar India Publishers</h1>
        <div style="margin-top:8px;font-size:11px;opacity:0.95;font-style:italic; line-height:1.4;">
          International Peer-Reviewed Academic Journals and Book Publishing Excellence Since 2022
        </div>
      </div>

      <div style="padding:35px;color:#333333;line-height:1.6;">
        
        <div style="text-align:center; margin-bottom:30px;">
          <span style="background-color:${badgeColor}; color:#ffffff; padding:10px 25px; border-radius:4px; font-size:14px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; display:inline-block; border-bottom:3px solid rgba(0,0,0,0.1);">
            ${label}
          </span>
        </div>
        
        <p>Dear <strong>${authorName}</strong>,</p>
        ${content}
        
        <div style="background-color:#f8faff;border-left:4px solid #1a237e;padding:15px;border-radius:4px;margin:25px 0;font-size:13px;">
            <strong>Book Ref No:</strong> ${bID}<br>
            <strong>Book Title:</strong> ${bookTitle}<br>
            <strong>Publication Type:</strong> ${pubType} (${format})
        </div>

        ${actionArea}
        
        <p style="margin-top:40px;border-top:1px solid #eeeeee;padding-top:20px;font-size:12px;color:#666;">
          Best Regards,<br>
          <strong>Editor (Book Publication)</strong><br>
          Scholar India Publishers<br>
          <a href="mailto:editor@scholarindiapub.com" style="color:#1a237e;text-decoration:none;">editor@scholarindiapub.com</a>
        </p>
      </div>

      <div style="background-color:#1a237e;color:#ffffff;text-align:center;padding:20px;font-size:10px;">
        © ${new Date().getFullYear()} Scholar India Publishers | Chennai, India<br>
        <a href="https://scholarindiapub.com" style="color:#FFD700; text-decoration:none;">www.scholarindiapub.com</a>
      </div>
    </div>
  </div>`;

  try { await sendMail({ to: email, subject, html }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// 17. REVIEWER MANAGEMENT SYSTEM (INVITATION, REMINDER, COMPLETION)
// POST /send/reviewer-assignment-update
// { name, email, type, details: { mID, mTitle, dueDate } }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/reviewer-assignment-update', async (req, res) => {
  const { name, email, type, details } = req.body;
  if (!email || !type || !details) return res.status(400).json({ error: 'email, type, and details required' });

  let subject = "";
  let bodyContent = "";
  let badgeLabel = "Reviewer Notification";
  let badgeColor = "#1a237e";
  
  const mID = details.mID || "N/A";
  const mTitle = details.mTitle || "Research Manuscript";
  const dueDateStr = details.dueDate || "TBD";

  if (type === "INVITATION") {
    subject = `Review Request: [ID: ${mID}] - Scholar India Publishers`;
    badgeLabel = "New Review Assignment";
    badgeColor = "#1a237e";
    bodyContent = `
      <p>Dear <strong>${name}</strong>,</p>
      <p>We are pleased to invite you to review the manuscript titled <strong>"${mTitle}"</strong> [ID: ${mID}] for our journal.</p>
      <p>Your expertise is highly valued in maintaining the quality of our academic publications.</p>
      <div style="background:#f1f3f9; padding:15px; border-left:4px solid #1a237e; border-radius:4px; margin:20px 0;">
        <p style="margin:0 0 10px 0;"><strong>Due Date:</strong> <span style="color:#d63031; font-weight:bold;">${dueDateStr}</span></p>
        <p style="margin:0;">Please log in to the Reviewer Portal to view the document and submit your evaluation.</p>
      </div>
      <div style="text-align:center; margin:30px 0;">
        <a href="https://scholarindiapub.com/reviewer-login" style="display:inline-block; background:#1a237e; color:#fff; padding:12px 30px; text-decoration:none; border-radius:5px; font-weight:bold; text-transform:uppercase; font-size:14px; letter-spacing:1px;">Login to Reviewer Portal</a>
      </div>`;
  } 
  else if (type === "REMINDER") {
    subject = `REMINDER: Review Due Shortly [ID: ${mID}]`;
    badgeLabel = "Review Deadline Reminder";
    badgeColor = "#d63031";
    bodyContent = `
      <p>Dear <strong>${name}</strong>,</p>
      <p>This is a gentle reminder regarding your pending review for the manuscript <strong>"${mTitle}"</strong> [ID: ${mID}].</p>
      <div style="background:#fff5f5; border:1px solid #ffcdd2; padding:15px; border-radius:4px; margin:20px 0;">
        <p style="margin:0; color:#c62828;"><strong>The due date is approaching:</strong> ${dueDateStr}</p>
      </div>
      <p>We kindly request you to complete your evaluation by this date to ensure timely publication of the author's work.</p>
      <div style="text-align:center; margin:30px 0;">
        <a href="https://scholarindiapub.com/reviewer-login" style="display:inline-block; border:2px solid #1a237e; color:#1a237e; padding:12px 30px; text-decoration:none; border-radius:5px; font-weight:bold; text-transform:uppercase; font-size:14px; letter-spacing:1px;">Access Portal</a>
      </div>`;
  }
  else if (type === "COMPLETED") {
    subject = `Acknowledgement & Certificate: Review Completed [ID: ${mID}]`;
    badgeLabel = "Review Completed";
    badgeColor = "#198754";
    bodyContent = `
      <p>Dear <strong>${name}</strong>,</p>
      <p>Thank you for completing the review for the manuscript <strong>"${mTitle}"</strong> [ID: ${mID}].</p>
      <p>In recognition of your expertise and time, your <strong>official Certificate of Reviewing</strong> is being processed.</p>
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:15px; border-radius:4px; margin:20px 0;">
        <p style="margin:0; color:#166534;">Your certificate will be available to view and download via the Reviewer Dashboard once finalized by the editorial board.</p>
      </div>
      <p>We look forward to collaborating with you again soon. Thank you for your continued support of Scholar India Publishers.</p>`;
  }

  // Prepend badge to bodyContent
  const finalContent = `
    <div style="text-align:center; margin-bottom:20px;">
      <span style="background-color:${badgeColor}; color:#ffffff; padding:6px 15px; border-radius:20px; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; display:inline-block;">
        ${badgeLabel}
      </span>
    </div>
    ${bodyContent}
  `;

  const html = wrapper(finalContent);

  try { await sendMail({ to: email, subject, html }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// 17. SUB-ADMIN CREDENTIALS
// POST /send/subadmin-credentials
// { name, email, password }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/subadmin-credentials', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const subject = `Welcome to Scholar India ERP: Sub-Admin Access`;
  const html = wrapper(`
    <p>Dear <strong>${name}</strong>,</p>
    <p>An administrative account has been created for you on the Scholar India Publishers ERP Portal.</p>
    <p>You can now log in to the <strong>Sub-Admin Dashboard</strong> using the credentials below:</p>
    <div style="background:#f1f5f9; padding:20px; border-radius:10px; margin:24px 0;">
       <table style="width:100%; font-size:14px;">
          <tr><td style="color:#64748b; font-weight:700; width:30%; padding-bottom:10px;">Email:</td><td style="color:#213361; font-weight:900; padding-bottom:10px;">${email}</td></tr>
          <tr><td style="color:#64748b; font-weight:700;">Password:</td><td style="color:#213361; font-weight:900; background:#fff; padding:5px 10px; border-radius:4px; display:inline-block; border:1px solid #cbd5e1;">${password}</td></tr>
       </table>
    </div>
    <div style="text-align:center; margin-top:28px;">
       <a href="https://scholarindiapub.com/admin/login" style="background:#213361; color:#fff; padding:12px 25px; border-radius:8px; text-decoration:none; font-weight:800; font-size:13px;">LOGIN TO ERP DASHBOARD</a>
    </div>
    <p style="margin-top:24px; font-size:12px; color:#64748b;"><em>Please log in and change your password as soon as possible for security purposes.</em></p>
  `, "Sub-Admin Access", "#0369a1");

  try { await sendMail({ to: email, subject, html }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});


// ════════════════════════════════════════════════════════════════════════════
// 18. CERTIFICATE GENERATED NOTIFICATION
// POST /send/certificate-generated
// { name, email, reviewerId, journalName, manuscriptTitle, certNo, certUrl }
// ════════════════════════════════════════════════════════════════════════════
app.post('/send/certificate-generated', async (req, res) => {
  const { name, email, reviewerId, journalName, manuscriptTitle, certNo, certUrl } = req.body;
  if (!email || !reviewerId) return res.status(400).json({ error: 'email and reviewerId required' });

  const verificationUrl = `https://scholarindiapub.com/certificate-verification?id=${encodeURIComponent(reviewerId)}`;
  const subject = `Your Peer Review Certificate is Ready — Scholar India Publishers`;
  const html = wrapper(`
    <p>Dear <strong>${name}</strong>,</p>
    <p>We are pleased to inform you that your <strong>Peer Review Certificate</strong> has been officially generated and is now available for download.</p>

    <div style="background:#eef5ff; border:1px solid #bfdbfe; border-radius:12px; padding:20px; margin:24px 0;">
      <table style="width:100%; font-size:13px; border-collapse:collapse;">
        <tr><td style="color:#64748b; font-weight:700; padding:6px 0; width:38%;">Reviewer / Editor ID:</td><td style="color:#1e3a8a; font-weight:900;">${reviewerId}</td></tr>
        <tr><td style="color:#64748b; font-weight:700; padding:6px 0;">Certificate No:</td><td style="color:#1e3a8a; font-weight:900;">${certNo || '—'}</td></tr>
        <tr><td style="color:#64748b; font-weight:700; padding:6px 0;">Journal:</td><td style="font-weight:600;">${journalName || '—'}</td></tr>
        ${manuscriptTitle ? `<tr><td style="color:#64748b; font-weight:700; padding:6px 0;">Manuscript:</td><td style="font-weight:600;">${manuscriptTitle}</td></tr>` : ''}
      </table>
    </div>

    <p style="margin-bottom:20px;">You can download your certificate directly using the button below, or verify its authenticity on our public verification portal using your <strong>Reviewer/Editor ID</strong>.</p>

    <div style="text-align:center; margin:28px 0; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
      ${certUrl ? `<a href="${certUrl}" style="background:#198754; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:800; font-size:13px; display:inline-block;">⬇ Download Certificate</a>` : ''}
      <a href="${verificationUrl}" style="background:#1e3a8a; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:800; font-size:13px; display:inline-block;">🔍 Verify Certificate</a>
    </div>

    <div style="background:#f0fdf4; border-left:4px solid #198754; padding:14px 18px; border-radius:0 8px 8px 0; margin:20px 0; font-size:12px; color:#166534;">
      <strong>How to verify:</strong> Visit the verification page and enter your Reviewer ID (<strong>${reviewerId}</strong>) to confirm your certificate's authenticity and view the details online.
    </div>

    <p style="font-size:12px; color:#64748b; margin-top:20px;">If you have any questions, please contact us at <a href="mailto:editor@scholarindiapub.com" style="color:#1e3a8a;">editor@scholarindiapub.com</a>.</p>
  `, "Certificate Ready", "#198754");

  try { await sendMail({ to: email, subject, html }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`\n📧 Scholar India Mail Server → http://localhost:${PORT}\n`);
});

export default app;
