// pages/api/send-email.js
import sgMail from "@sendgrid/mail";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // quick env-check
  const okApiKey = !!process.env.SENDGRID_API_KEY;
  const okFrom = !!process.env.FROM_EMAIL;
  const okTo = !!process.env.QNTRL_EMAIL;

  if (!okApiKey || !okFrom || !okTo) {
    console.error("Missing env:", { SENDGRID_API_KEY: okApiKey, FROM_EMAIL: okFrom, QNTRL_EMAIL: okTo });
    return res.status(500).json({ error: "Server misconfiguration: missing SENDGRID_API_KEY, FROM_EMAIL or QNTRL_EMAIL" });
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  try {
    const { name, email, phone, experience, score, Skills, client, industry, owner, description } = req.body || {};

    if (!name || !email) return res.status(400).json({ error: "Missing candidate name or email" });

    const msg = {
      to: process.env.QNTRL_EMAIL,
      from: process.env.FROM_EMAIL, // must be verified in SendGrid
      replyTo: email,
      subject: `Shortlisted Candidate: ${name}`,
      text: `Candidate: ${name}\nEmail: ${email}\nPhone: ${phone}\nExperience: ${experience}\nScore: ${score}\nSkills: ${Skills}\nClient: ${client}\nIndustry: ${industry}\nOwner: ${owner}\n\n${description || ""}`,
      html: `<p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Phone:</b> ${phone}</p><p>${description || ""}</p>`,
    };

    const response = await sgMail.send(msg);
    console.log("SendGrid response:", response);
    return res.status(200).json({ success: true, message: "Email sent", sendgridResponse: response });
  } catch (error) {
    const details = error?.response?.body || error?.message || error;
    console.error("SendGrid full error:", error);
    if (error?.response?.body) console.error("SendGrid error body:", JSON.stringify(error.response.body, null, 2));
    // return details so you can paste it here
    return res.status(500).json({ error: "Failed to send email", details });
  }
}
