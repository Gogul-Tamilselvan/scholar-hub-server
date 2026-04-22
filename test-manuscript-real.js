import fetch from 'node-fetch';

async function testManuscriptMail() {
  const payload = {
    name: "Dr. Test Author",
    email: "gogultamilselvan@gmail.com",
    manuscriptId: "MANSJHSS26ABCD1234",
    title: "Impact of Artificial Intelligence on Higher Education: A Case Study",
    journal: "Scholar Journal of Humanities and Social Sciences"
  };

  try {
    console.log("🚀 Sending realistic MANUSCRIPT test email to Vercel...");
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
      console.log("✅ SUCCESS: Manuscript test email sent successfully!");
    } else {
      console.log("❌ SERVER ERROR:", data.error);
    }
  } catch (err) {
    console.error("❌ NETWORK ERROR:", err.message);
  }
}

testManuscriptMail();
