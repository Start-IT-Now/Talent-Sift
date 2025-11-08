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

  const [orgId, setOrgId] = useState(null); // ✅ Track case/org ID
  const [submittedExisting, setSubmittedExisting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  

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

// //  Upload resume file to Supabase Storage and get its public URL
// const uploadResumeToSupabase = async (file) => {
//   if (!file) return null;
//   const fileName = `${Date.now()}_${file.name}`;

//   const { data, error } = await supabase.storage
//     .from("Talent Sift") // Your bucket name
//     .upload(fileName, file);

//   if (error) {
//     console.error("❌ Resume upload failed:", error.message);
//     return null;
//   }

//   const { data: publicData } = supabase.storage
//     .from("Talent Sift")
//     .getPublicUrl(fileName);

//   return publicData.publicUrl;
// };


  //  New Submission
 // ✅ New Submission (Fixed)
const handleNewSubmit = async (data) => {
  console.log("🚀 Starting new job submission:", data);

  // ✅ Save context for later
  localStorage.setItem("industry", data.industry);
  localStorage.setItem("client", data.client);
  localStorage.setItem("owner", data.owner);
  localStorage.setItem("requestor", data.requestor);

  // ✅ Basic validations
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
    return;
  }

  if (!data.resumeFiles?.length) {
    toast({
      title: "Missing Resume",
      description: "Please upload at least one resume before submitting.",
      variant: "destructive",
    });
    return;
  }

  // ✅ Validate user domain
  const validateRes = await fetch("/api/validateuser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: data.email }),
  });

  const validateData = await validateRes.json();
  if (validateRes.status !== 200 || validateData.status !== "success") {
    toast({
      title: "Unauthorized",
      description: validateData.message || "Unauthorized company domain",
      variant: "destructive",
    });
    return;
  }

  try {
    // ✅ Upload resumes to Supabase
    const uploadedResumeUrls = [];
    for (const file of data.resumeFiles) {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("Talent Sift")
        .upload(fileName, file);

      if (uploadErr) {
        console.error("❌ Upload failed:", uploadErr.message);
        continue;
      }

      const { data: publicData } = supabase.storage
        .from("Talent Sift")
        .getPublicUrl(fileName);

      if (publicData?.publicUrl) uploadedResumeUrls.push(publicData.publicUrl);
    }

    console.log("✅ Uploaded resumes:", uploadedResumeUrls);

    // ✅ FIXED: Send correct body to Agentic AI API (no nested `data`)
    const agentPayload = {
      source: "web",
      title: data.jobTitle,
      job: stripHtml(data.jobDescription),
      skills: data.requiredSkills,
      jobtype: data.jobtype,
      yoe: data.yearsOfExperience,
      industry: data.industry,
      mail: data.email,
      client: data.client,
      owner: data.owner,
      requestor: data.requestor,
    };

    const response = await fetch("https://agentic-ai.co.in/api/agentic-ai/workflow-exe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({data: agentPayload}),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || `Agentic AI error: ${response.status}`);

    console.log("✅ Agentic AI result:", result);

    // ✅ Save applicant info
    const { error: dbError } = await supabase.from("applicants").insert([
      {
        name: data.owner || "Unknown Owner",
        email: data.email,
        skills: data.requiredSkills,
        job_title: data.jobTitle,
        job_description: stripHtml(data.jobDescription),
        years_of_experience: data.yearsOfExperience,
        industry: data.industry,
        owner: data.owner,
        client: data.client,
        requestor: data.requestor,
        job_type: data.jobtype,
        resume_url:
          uploadedResumeUrls.length > 1
            ? JSON.stringify(uploadedResumeUrls)
            : uploadedResumeUrls[0] || null,
        agent_output: result.data || {},
      },
    ]);

    if (dbError) console.error("⚠️ Failed to save to Supabase:", dbError.message);
    else console.log("✅ Saved applicant record to Supabase.");

    // ✅ Success Flow
    if (result.data?.id) {
      setOrgId(result.data.id);
      localStorage.setItem("caseId", result.data.id);
      localStorage.setItem("resumeResults", JSON.stringify(result.data));

      try {
        await fetch("/api/logToGoogleSheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            resumeCount: data.resumeFiles.length,
            caseId: result.data?.id || "N/A",
          }),
        });
      } catch (sheetError) {
        console.warn("⚠️ Failed to log to Google Sheets:", sheetError);
      }

      toast({
        title: "Success!",
        description: "✅ Resumes processed successfully.",
      });

      const params = new URLSearchParams({
        client: data.client || "",
        industry: data.industry || "",
        requestor: data.requestor || "",
        owner: data.owner || "",
        skills: data.requiredSkills || "",
      }).toString();

      navigate(`/resumes?${params}`);
    }
  } catch (error) {
    console.error("❌ Submission failed:", error);
    toast({
      title: "Error",
      description: error.message || "Something went wrong.",
      variant: "destructive",
    });
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