import sgMail from "@sendgrid/mail";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY); // ✅ Access env safely inside handler

  try {
    const { name, email, phone, experience, score, Skills, client, industry, owner,  description } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Missing candidate details" });
    }

    const msg = {
      to: process.env.QNTRL_EMAIL,      // ✅ From Vercel env
      from: process.env.FROM_EMAIL,     // ✅ From Vercel env (must be verified in SendGrid)
      subject: `${name}`,
      text: `
Candidate has been shortlisted.

Name: ${name}
Email: ${email}
Phone: ${phone}
Experience: ${experience} years
Score: ${score}
Industry: ${industry}
Owner: ${owner}
Client: ${client}
Skills: ${Skills}

Context:
${description}
      `,
      html: `
        <h2>Shortlisted Candidate</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Experience:</b> ${experience} years</p>
        <p><b>Industry:</b> ${industry}</p>
        <p><b>Owner:</b> ${owner}</p>
        <p><b>Client:</b> ${client}</p>
        <p><b>Skills:</b> ${Skills}</p>
        <p><b>Score:</b> ${score}</p>
        <h3>Context:</h3>
        <p>${description}</p>
      `,
    };

    await sgMail.send(msg);

    return res.status(200).json({ success: true, message: "Email sent to QNTRL" });
  } catch (error) {
    console.error("SendGrid error:", error.response?.body || error.message);
    return res.status(500).json({ error: "Failed to send email" });
  }
}