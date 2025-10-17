import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
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
  // ✅ Restore orgId on load if available
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

  // ✅ New Submission
  const handleNewSubmit = async (data) => {
console.log("success" + JSON.stringify(data));
    localStorage.setItem("industry", data.industry);
    localStorage.setItem("client", data.client);
    localStorage.setItem("owner", data.owner);
    localStorage.setItem("succees",JSON.stringify(data));

    if (!data.jobTitle || !data.jobtype || !data.jobDescription || !data.email || !data.client || !data.industry || !data.owner) {
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
      const form = new FormData();

      const stripHtml = (html) => {
        const div = document.createElement("div");
        div.innerHTML = html;
        return div.textContent || "";
      };

      const jobPayload = {
        org_id: 2, // ✅ Hardcoded for now
        exe_name: data.requiredSkills || "run 1", // ✅ Job Title used as exe_name
        workflow_id: "resume_ranker",
        job_description: stripHtml(data.jobDescription),
      };

      console.log("Sending payload:", jobPayload);

      form.append("data", JSON.stringify(jobPayload));

      data.resumeFiles.forEach((file) => {
        if (file instanceof File) {
          form.append("resumes", file);
        }
      });

      const response = await fetch("https://agentic-ai.co.in/api/agentic-ai/workflow-exe", {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Upload failed with status ${response.status}`);
      }

      console.log("✅ Response data:", result.data);

      if (result.data?.id) {
        setOrgId(result.data.id); // ✅ Store in state
        localStorage.setItem("caseId", result.data.id); // ✅ Persist across sessions
      }

      localStorage.setItem("resumeResults", JSON.stringify(result.data));
    //  localStorage.setItem("resumeResults", JSON.stringify(result.data?.result || []));

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
  owner: data.owner || "",
  skills: data.requiredSkills || "",
}).toString();

navigate(`/resumes?${params}`);

    } catch (error) {
      console.error("❌ Upload failed:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "❌ Something went wrong.",
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
            requiredSkills={formData.requiredSkills}/>
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