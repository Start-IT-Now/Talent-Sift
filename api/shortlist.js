import axios from "axios";

export default async function handler(req, res) {
  try {
    const c = req.body;

    if (!c.source) {
      return res.status(400).json({ error: "Missing source" });
    }

    console.log("Sending to ServiceNow:", JSON.stringify({
  data: {
    case_id: c.case_id,
    results: [
      {
        name: c.name,
        email: c.email
      }
    ]
  }
}, null, 2));

    /* ================= SERVICENOW ================= */
  if (c.source === "servicenow") {

  const payload = {
    case_id: c.case_id,
    results: [
      {
        name: c.name,
        email: c.email,
        phone: c.phone,
        experience: c.experience,
        score: c.score,
        justification: c.justification,
        client: c.client,
        industry: c.industry,
        owner: c.owner,
        skills: c.skills,
      }
    ]
  };

  console.log("Final SN Payload:", JSON.stringify(payload, null, 2));

  await axios.post(
    "https://dev303448.service-now.com/api/1852827/screening_results/POST",
    payload,  
    {
      auth: {
        username: process.env.SN_USER,
        password: process.env.SN_PASS,
      },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );

  return res.json({
    status: "success",
    target: "servicenow",
  });
}


    /* ================= QNTRL ================= */
    if (c.source === "qntrl") {
      await axios.post(
        "https://api.qntrl.com/send-email", // example
        {
          name: c.name,
          email: c.email,
          phone: c.phone,
          experience: c.experience,
          score: c.score,
          industry: c.industry,
          owner: c.owner,
          client: c.client,
          skills: c.skills,
          description: c.justification,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.QNTRL_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      return res.json({
        status: "success",
        target: "qntrl",
      });
    }

    return res.status(400).json({ error: "Invalid source" });
  } catch (err) {
    console.error("Shortlist error:", err.response?.data || err);
    return res.status(500).json({ error: "Shortlist failed" });
  }
}
