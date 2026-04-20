import fetch from 'node-fetch';

async function testMail() {
  const payload = {
    email: "editor@scholarindiapub.com",
    name: "Scholar India Support",
    mID: "TEST-2026-OK",
    manuscriptTitle: "Local Mail Server Connectivity Test",
    journalName: "Scholar Journal of Humanities and Social Sciences",
    status: "Published",
    doi: "https://doi.org/10.1234/sip.test",
    plag: "1%"
  };

  try {
    console.log("🚀 Sending test email...");
    const response = await fetch('http://localhost:4001/send/status-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'scholar_india_mail_secret_2026'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.success) {
      console.log("✅ SUCCESS: Test email sent to editor@scholarindiapub.com");
    } else {
      console.log("❌ ERROR:", data.error);
    }
  } catch (err) {
    console.error("❌ FETCH ERROR:", err.message);
  }
}

testMail();
