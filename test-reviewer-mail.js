import fetch from 'node-fetch';

async function testReviewerMail() {
  const payload = {
    name: "Dr. Gogul",
    email: "gogultamilselvan@gmail.com",
    reviewerId: "EDTSJCM26TEST01",
    role: "Editorial Board Member",
    journal: "Scholar Journal of Commerce and Management"
  };

  try {
    console.log("🚀 Sending test EDITOR application email to Vercel...");
    const response = await fetch('https://scholar-hub-server-seven.vercel.app/send/reviewer-applied', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'scholar_india_mail_secret_2026'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.success) {
      console.log("✅ SUCCESS: Editor application test email sent successfully!");
    } else {
      console.log("❌ SERVER ERROR:", data.error);
    }
  } catch (err) {
    console.error("❌ NETWORK ERROR:", err.message);
  }
}

testReviewerMail();
