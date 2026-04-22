import fetch from 'node-fetch';

async function testProdMail() {
  const payload = {
    email: "gogultamilselvan@gmail.com", // user's personal email
    name: "Scholar India Support",
    manuscriptId: "TEST-VERCEL-2026",
    title: "Vercel Production Mail Test",
    journal: "Scholar Journal of Humanities and Social Sciences"
  };

  try {
    console.log("🚀 Sending test email to Vercel production server...");
    const response = await fetch('https://scholar-hub-server-seven.vercel.app/send/manuscript-submitted', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'scholar_india_mail_secret_2026'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.success) {
      console.log("✅ SUCCESS: Production test email sent successfully via Vercel!");
    } else {
      console.log("❌ SERVER ERROR:", data.error);
    }
  } catch (err) {
    console.error("❌ NETWORK ERROR:", err.message);
  }
}

testProdMail();
