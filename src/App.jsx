import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import Footer from "@/components/Footer";
import JobFormStep1 from "@/components/JobFormStep1";
import ResumeList from "@/components/existing";
import logo from "./logo.png";

function App() {
  const [formData, setFormData] = useState({
    jobTitle: "",
    yearsOfExperience: "",
    jobtype: "",
    industry: "",
    client: "",
    requiredSkills: "",
    owner: "",
    email: "",
    jobDescription: "",
    requestor: "",
    resumeFiles: [],
  });

  const [orgId, setOrgId] = useState(null); 
  const [submittedExisting, setSubmittedExisting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState(null);

  

  // Auto-populate jobDescription and requiredSkills from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // localStorage.setItem("industry", decodeSafe(params.get('industry') || ''));
    //  localStorage.setItem("client", decodeSafe(params.get('client') || ''));
    const decodeSafe = (str) => {
      try {
        return decodeURIComponent(str);
      } catch {
        return '';
      }
    };
 
  
    setFormData(prev => ({
      ...prev,
      requiredSkills: decodeSafe(params.get('skills') || ''),
      jobDescription: decodeSafe(params.get('job') || ''),
      yearsOfExperience: decodeSafe(params.get('yoe') || ''),
      jobTitle: decodeSafe(params.get('title') || ''),
      industry: decodeSafe(params.get('industry') || ''),
      owner: decodeSafe(params.get('owner') || ' Default Owner'),
      client: decodeSafe(params.get('client') || 'Default Client'),
      requestor: decodeSafe(params.get('requestor') || 'Default Requestor'),
      jobtype: decodeSafe(params.get('jobtype') || ''), 
      email: decodeSafe(params.get('mail') || ''), // THIS MUST BE a valid option value or empty string
    }));
  }, []);
  
  // Helper to strip HTML tags from job description
  const stripHtml = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    // Add space after block elements to keep words separate
    const blockTags = ['p', 'div', 'br', 'li'];
    blockTags.forEach(tag => {
      const elements = div.getElementsByTagName(tag);
      for (let el of elements) {
        el.appendChild(document.createTextNode(' '));
      }
    });
    return div.textContent || div.innerText || '';
  };
  // Restore orgId on load if available
  useEffect(() => {
    const storedId = localStorage.getItem("caseId");
    if (storedId) setOrgId(storedId);
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
  const storedRequestor = localStorage.getItem("requestor");
  if (storedRequestor) {
    setOrgId(storedRequestor); // Set as orgId
  } else {
    const params = new URLSearchParams(window.location.search);
    const reqFromUrl = params.get("requestor");
    if (reqFromUrl) {
      localStorage.setItem("requestor", reqFromUrl);
      setOrgId(reqFromUrl);
    }
  }
}, []);


  const handleNewSubmit = async (data) => {
  console.log("Form submission:", data);
  setIsProcessing(true);
  setLastError(null);

  // Basic validation
  if (
    !data.jobTitle ||
    !data.jobtype ||
    !data.jobDescription ||
    !data.email ||
    !data.client ||
    !data.industry ||
    !data.owner ||
    !data.requestor
  ) {
    toast({
      title: "Missing Information",
      description: "Please fill in all required fields before submitting.",
      variant: "destructive",
    });
    setIsProcessing(false);
    return;
  }

  if (!data.resumeFiles?.length) {
    toast({
      title: "Missing Resume",
      description: "Please upload at least one resume before submitting.",
      variant: "destructive",
    });
    setIsProcessing(false);
    return;
  }

  // Validate user email
  try {
    const validateRes = await fetch("/api/validateuser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    });
    const validateData = await validateRes.json().catch(() => ({}));
    if (validateRes.status !== 200 || validateData.status !== "success") {
      throw new Error(validateData.message || "Unauthorized company domain");
    }
  } catch (e) {
    setLastError(e.message);
    toast({ title: "Unauthorized", description: e.message, variant: "destructive" });
    setIsProcessing(false);
    return;
  }

  try {
    // 1) Upload resumes to Supabase
    const uploadedResumeUrls = [];
    for (const file of data.resumeFiles) {
      if (!(file instanceof File)) continue;

      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("Talent Sift")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        throw new Error(`Failed to upload ${file.name}.`);
      }

      const { data: pub, error: pubErr } = supabase
        .storage
        .from("Talent Sift")
        .getPublicUrl(uploadData.path);

      if (pubErr) {
        console.error("Public URL error:", pubErr);
        throw new Error(`Failed to generate URL for ${file.name}.`);
      }

      uploadedResumeUrls.push(pub.publicUrl);
    }

    if (!uploadedResumeUrls.length) {
      throw new Error("Could not upload resumes. Please try again.");
    }
    console.log("✅ Uploaded resumes:", uploadedResumeUrls);

    // 2) Prepare workflow payload
    const plainJD = stripHtml(data.jobDescription || "");
    const dynamicOrgId = Number(data.requestor || orgId || localStorage.getItem("requestor") || 1);

 const form = new FormData();

// server expects a field named 'data' containing JSON
form.append('data', JSON.stringify({
  org_id: Number(dynamicOrgId),
  exe_name: requiredSkills || "Untitled Job",
  workflow_id: 'resume_ranker',
  job_description: plainJD,
  // do not include raw File objects in this JSON — resume file parts go separately below
}));

// add file parts (if the API accepts 'resumes' multiple parts)
for (const file of data.resumeFiles) {
  if (file instanceof File) form.append('resumes', file);
}

    console.log("🚀 Sending payload:", payload);

    // 3) Call workflow API (JSON)
    const response = await fetch("https://agentic-ai.co.in/api/agentic-ai/workflow-exe", {
      method: "POST",
      body: form,
    });

    const workflowResult = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Workflow error", response.status, workflowResult);
      throw new Error(workflowResult?.detail?.[0]?.msg || workflowResult.message || `Workflow failed: ${response.status}`);
    }
    console.log("✅ Workflow success:", workflowResult);

    // 4) Save AI results to Supabase (choose one table)
    const candidates = workflowResult?.data?.result || [];

    // A) If you want to save to `resume_results` (flat table)
    /*
    const rows = candidates.map((c, i) => ({
      org_id: dynamicOrgId,
      exe_name: workflowResult.data?.exe_name || data.jobTitle,
      candidate_id: Number(c.candidateId ?? i + 1),
      name: c.name ?? null,
      email: c.email ?? null,
      phone: c.phone ?? null,
      experience: Number(c.experience ?? 0),
      rank: Number(c.Rank ?? 0),
      justification: c.justification ?? null,
    }));
    const { data: inserted, error: insertErr } = await supabase
      .from("resume_results")
      .insert(rows)
      .select();
    if (insertErr) throw insertErr;
    */

    // B) If you want to save to `applicants` (jsonb + context)
    if (candidates.length) {
      const rows = candidates.map((c, i) => ({
        name: c.name || "Unknown",
        score: String(c.score ?? 0),
        email: c.email || "",
        phone: c.phone || "",
        skills: data.requiredSkills || "",
        job_title: data.jobTitle || "",
        job_description: plainJD,
        years_of_experience: String(data.yearsOfExperience ?? ""),
        industry: data.industry || "",
        owner: data.owner || "",
        client: data.client || "",
        requestor: String(dynamicOrgId),
        job_type: data.jobtype || "",
        resume_url: uploadedResumeUrls[i] || "",
        agent_output: {
          justification: c.justification || "",
          experience: c.experience || "",
          rank: c.Rank || i + 1,
          org_id: dynamicOrgId,
          exe_name: workflowResult.data?.exe_name || data.jobTitle,
        },
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from("applicants")
        .insert(rows)
        .select();

      if (insertErr) {
        console.error("❌ Supabase insert error:", insertErr);
        throw new Error(insertErr.message || "Failed to save applicants.");
      }
      console.log("✅ Stored applicants in Supabase:", inserted);
    } else {
      console.warn("⚠️ No candidates found to store.");
    }

    // 5) Log to Google Sheet
    try {
      await fetch("/api/logToGoogleSheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          resumeCount: data.resumeFiles.length,
          caseId: workflowResult?.data?.id || "N/A",
        }),
      });
    } catch (sheetError) {
      console.warn("⚠️ Google Sheet log failed:", sheetError);
    }

    // 6) Success toast + redirect
    toast({ title: "Success!", description: "✅ Resumes processed successfully." });

    const params = new URLSearchParams({
      client: data.client || "",
      industry: data.industry || "",
      requestor: data.requestor || "",
      owner: data.owner || "",
      skills: data.requiredSkills || "",
    }).toString();
    navigate(`/resumes?${params}`);

  } catch (error) {
    console.error("❌ Upload/Process failed:", error);
    setLastError(error.message || String(error));
    toast({
      title: "Upload Failed",
      description: error.message || "❌ Something went wrong.",
      variant: "destructive",
    });
  } finally {
    setIsProcessing(false);
  }
};

  // ✅ Existing Flow
  const handleExistingSubmit = () => {
    setSubmittedExisting(true);
  };

  
  return (
    <div className="min-h-screen bg-gray-100 relative overflow-hidden">
      <Helmet>
        <title>Talent Sift - Resume Screening Platform</title>
        <meta
          name="description"
          content="Create and post job opportunities with Talent Sift's intuitive job posting platform"
        />
      </Helmet>

      {/* Background floating blobs */}
      <motion.div
        className="absolute inset-0 opacity-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-white rounded-full blur-xl animate-pulse delay-500"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white rounded-full blur-lg animate-pulse delay-1000"></div>
      </motion.div>

      {/* App Content */}
      <div className="relative z-10 min-h-screen flex flex-col ">
        {/* Logo/Header */}
        <div className="p-8 flex items-center justify-start space-x-4">
          <img src={logo} alt="Talent Sift Logo" className="h-10" />
          <div className="absolute top-0 right-0 p-4 flex items-center justify-end space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-blue font-bold">T</span>
            </div>
            <span className="text-2xl font-serif font-bold text-gray-800">Talent Sift</span>
          </div>
          <div className="absolute top-6 right-0 p-4 flex items-center justify-end space-x-2">
            <span className="text-s font-serif text-gray-500">Enterprise</span>
          </div>
        </div>

        {/* Main Section */}
        <div className="flex-1 flex items-center justify-center p-4">
          {!submittedExisting ? (
            <JobFormStep1
              formData={formData}
              handleInputChange={handleInputChange}
              onNewSubmit={handleNewSubmit}
              onExistingSubmit={handleExistingSubmit}
            />
          ) : (
            <ResumeList 
            client={formData.client}
            industry={formData.industry}
            owner={formData.owner}
            requestor={formData.requestor}
            requiredSkills={formData.requiredSkills}
            onGoHome={() => setSubmittedExisting(false)}/>
          )}
        </div>

        {/* Global Toaster */}
        <Toaster />
      </div>

      {/* Footer */}
          <div className="mt-8 ml-1 w-full">
            <Footer />
          </div>
    </div>
  );
}

export default App;