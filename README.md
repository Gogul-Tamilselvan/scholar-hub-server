# Scholar India Mail Server

A standalone Node.js + Express email server using Nodemailer.

## Setup

```bash
cd mail-server
npm install
cp .env.example .env
# Fill in MAIL_USER and MAIL_PASS in .env
npm run dev
```

## Gmail App Password
1. Go to https://myaccount.google.com/apppasswords  
2. Create an App Password for "Mail"  
3. Paste it as `MAIL_PASS` in `.env`

## API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/health` | Check if server is running |
| POST | `/send/reviewer-applied` | Confirmation to new reviewer/EB applicant |
| POST | `/send/manuscript-submitted` | Confirmation to manuscript author |
| POST | `/send/status-update` | Notify reviewer of status change (Active/Rejected) |
| POST | `/send/custom` | Send any custom HTML email |

## Example Call from Frontend

```js
await fetch('http://localhost:4001/send/reviewer-applied', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Dr. Thenmozhi',
    email: 'thenmozhi@example.com',
    reviewerId: 'REVSJCM26AYKPI0',
    role: 'Reviewer',
    journal: 'Scholar Journal of Commerce and Management'
  })
});
```
