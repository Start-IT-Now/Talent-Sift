import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Range } from "react-range";
import { useNavigate, useLocation } from "react-router-dom";

const Existing = ({ client, industry, owner, requestor, requiredSkills, onGoHome }) => {
  const navigate = useNavigate();
  const [uploadedResumes, setUploadedResumes] = useState([]);
  const [searchedResumes, setSearchedResumes] = useState([]);
  const [keySkill, setKeySkill] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreRange, setScoreRange] = useState([1, 10]);
  const [experienceRange, setExperienceRange] = useState([0, 35]);
  const [filterEmail, setFilterEmail] = useState(false);
  const [filterPhone, setFilterPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  // ✅ Fetch resumes by Key Skill
const fetchResumesByKeySkill = useCallback(async () => {
  if (!keySkill.trim()) {
    setError("Please enter a Key Skill.");
    setSearchedResumes([]);
    return;
  }

  setSearched(true);
  setLoading(true);
  setError("");

  try {
    // ✅ Dynamically fetch from URL each time
    const params = new URLSearchParams(window.location.search);
    const dynamicOrgId = params.get("requestor") || 2; // fallback to 2

    console.log("🔹 Using dynamic orgId:", dynamicOrgId);

    const url = `https://agentic-ai.co.in/api/agentic-ai/workflow-exe?org_id=${dynamicOrgId}&workflow_id=resume_ranker`;

    const response = await fetch(url);
    const data = await response.json();

    const allExecutions = Array.isArray(data.data) ? data.data : [];

    const matchedExecutions = allExecutions.filter(
      (item) =>
        item.exe_name &&
        item.exe_name.toLowerCase().includes(keySkill.toLowerCase())
    );

    if (matchedExecutions.length === 0) {
      setError(`No resumes found for Key Skill: ${keySkill}`);
      setSearchedResumes([]);
      return;
    }

    const mappedResumes = matchedExecutions.flatMap((execution) => {
      const results = Array.isArray(execution.result) ? execution.result : [];
      return results.map((item, idx) => ({
        id: `${execution.exe_name}-${idx}`,
        name: item.name || `Candidate ${idx + 1}`,
        Rank: item.score || 0,
        justification: item.justification || "",
        experience: typeof item.experience === "number" ? item.experience : 0,
        email: item.email === "xxx" ? "No email" : item.email || "No email",
        phone: item.phone === "xxx" ? "No phone" : item.phone || "No phone",
        keySkills: Array.isArray(item.keySkills)
          ? item.keySkills
          : [execution.exe_name],
        executionName: execution.exe_name,
      }));
    });

    setSearchedResumes(mappedResumes);
    setError(null);
  } catch (err) {
    console.error(err);
    setError("Error retrieving resumes.");
    setSearchedResumes([]);
  } finally {
    setLoading(false);
  }
}, [keySkill]);


  // Load cached resumes after search
useEffect(() => {
  if (!searched) return;
  const key = `resumeResults_key_${keySkill}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setSearchedResumes(parsed);
    } catch (e) {
      console.error("Failed to parse local resume data", e);
    }
  }
}, [keySkill, searched]);



  const combinedResumes = useMemo(
    () => [...uploadedResumes, ...searchedResumes],
    [uploadedResumes, searchedResumes]
  );

  const filteredResumes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return combinedResumes.filter((r) => {
      const rank = Number(r.Rank) || 0;
      const matchesSearch =
        r.name.toLowerCase().includes(q) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.justification && r.justification.toLowerCase().includes(q));
      const inScoreRange = rank >= scoreRange[0] && rank <= scoreRange[1];
      const inExpRange =
        r.experience >= experienceRange[0] &&
        r.experience <= experienceRange[1];
      const hasEmail = filterEmail ? r.email && r.email !== "No email" : true;
      const hasPhone = filterPhone ? r.phone && r.phone !== "No phone" : true;
      return matchesSearch && inScoreRange && inExpRange && hasEmail && hasPhone;
    });
  }, [
    combinedResumes,
    searchQuery,
    scoreRange,
    experienceRange,
    filterEmail,
    filterPhone,
  ]);

  const allKeySkills = useMemo(() => {
    return [...new Set(combinedResumes.flatMap((r) => r.keySkills || []))];
  }, [combinedResumes]);

  const handleShortlist = async (candidate) => {
    try {
      setLoadingId(candidate.id);
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: candidate.name || "No name",
          email: candidate.email || "No email",
          phone: candidate.phone || "No phone",
          experience: candidate.experience || 0,
          score: candidate.score || candidate.Rank || 0,
          description: candidate.justification || "No description provided",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSearchedResumes((prev) =>
          prev.map((res) =>
            res.id === candidate.id ? { ...res, shortlisted: true } : res
          )
        );
        alert(`✅ Candidate ${candidate.name} sent to QNTRL.`);
      } else {
        alert(`❌ Failed: ${data?.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error(error);
      alert("⚠️ Error sending email. Please try again.");
  } finally {
    setLoadingId(null);
  }
};

const location = useLocation();
console.log("Current route:", location.pathname);

function renderThumb({ index, props }) {
    return (
      <div
        {...props}
        key={index}
        className="h-5 w-5 rounded-full bg-orange-400 shadow-md cursor-pointer"
      />
    );
  }

  return (
<div className="min-h-screen w-full bg-white p-4">
  <div className="shadow-lg rounded-xl w-full p-4 flex flex-col md:flex-row gap-6 h-full">
    
    {/* Sidebar Filters */}
    <div className="w-full md:w-64 bg-gray-700 rounded-xl p-4 shadow-md flex-shrink-0 text-[#EAEAEA]">
          <h3 className="font-bold mb-5 text-xl">🔍 Search Resumes</h3>

<form
  onSubmit={(e) => {
    e.preventDefault();
    if (!loading) fetchResumesByKeySkill();
  }}
>

            <label className="font-semibold block mb-4">Key Skill</label>
            <input
              type="text"
              placeholder="Enter Key Skill"
              value={keySkill}
              onChange={(e) => {
              setKeySkill(e.target.value);
              setSearched(false);
              }}
                onKeyDown={(e) => {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      fetchResumesByKeySkill();
    }
  }}
              className="w-full px-4 py-2 border border-gray-600 bg-white text-gray-600 rounded-md "
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-3 bg-orange-400 hover:bg-[#E14A42] text-white font-bold px-4 py-2 rounded-md w-full disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
            {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
          </form>

          <input
            type="text"
            placeholder="Search ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4 mt-4 px-4 py-3 rounded-lg border border-gray-600 bg-white text-gray-500 focus:outline-none"
          />

          <div className="mt-6">
            <h3 className="font-bold mb-3 text-lg">🛠️ Key Skills</h3>
            <div className="flex flex-wrap gap-2 bg-white border border-gray-700 rounded-md p-3 shadow-inner min-h-[40px]">
              {allKeySkills.length > 0 ? (
                allKeySkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-orange-400 text-white text-xs font-medium rounded-lg"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-gray-400 text-sm">No key skills available</p>
              )}
            </div>
          </div>

          <label className="font-semibold mb-3 block text-lg text-white">
            Score Range
          </label>
          <div className="flex justify-between mb-3 font-semibold text-sm text-white">
            <span>{scoreRange[0]}</span>
            <span>{scoreRange[1]}</span>
          </div>
          <Range
            step={1}
            min={1}
            max={10}
            values={scoreRange}
            onChange={setScoreRange}
            renderTrack={({ props, children }) => (
              <div
                {...props}
                style={{ ...props.style, height: "6px", backgroundColor: "#555" }}
              >
                <div
                  style={{
                    height: "6px",
                    backgroundColor: "#fb923c",
                    marginLeft: `${((scoreRange[0] - 1) / 9) * 100}%`,
                    width: `${((scoreRange[1] - scoreRange[0]) / 9) * 100}%`,
                  }}
                />
                {children}
              </div>
            )}
            renderThumb={renderThumb}
          />

          <label className="font-semibold mt-6 mb-3 block text-lg text-white">
            Experience (years)
          </label>
          <div className="flex justify-between mb-3 font-semibold text-sm text-white">
            <span>{experienceRange[0]}</span>
            <span>{experienceRange[1]}</span>
          </div>
          <Range
            step={1}
            min={0}
            max={35}
            values={experienceRange}
            onChange={setExperienceRange}
            renderTrack={({ props, children }) => (
              <div {...props} style={{ ...props.style, height: "6px", background: "#555" }}>
                <div
                  style={{
                    height: "6px",
                    width: `${((experienceRange[1] - experienceRange[0]) / 35) * 100}%`,
                    backgroundColor: "#fb923c",
                    marginLeft: `${(experienceRange[0] / 35) * 100}%`,
                  }}
                />
                {children}
              </div>
            )}
            renderThumb={renderThumb}
          />

          <div className="mt-6 flex flex-row gap-x-6">
            <label className="inline-flex items-center gap-2 text-white font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={filterEmail}
                onChange={() => setFilterEmail(!filterEmail)}
                className="rounded border-gray-400 text-[#FF5A52] focus:ring-[#FF5A52]"
              />
              Email
            </label>
            <label className="inline-flex items-center gap-2 text-white font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={filterPhone}
                onChange={() => setFilterPhone(!filterPhone)}
                className="rounded border-gray-400 text-[#FF5A52] focus:ring-[#FF5A52]"
              />
              Phone
            </label>
          </div>
        </div>

    <motion.div 
      layout
className="flex-1 flex flex-col space-y-6 overflow-auto min-h-[500px] max-h-[150vh]"

    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-3xl font-semibold text-[#333333]">📄 Talent Sift</h2>
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-orange-400 font-medium">
          Showing {filteredResumes.length} result
          {filteredResumes.length !== 1 ? "s" : ""}
        </p>

        <div className="flex gap-3">
<button
  type="button"
  onClick={() => {
    onGoHome?.(); // ✅ switch App back to “New Case” view
    navigate("/"); // ✅ keep URL consistent
  }}
  className="px-4 py-2 bg-orange-400 hover:bg-[#E14A42] text-white font-bold rounded"
>
  Home
</button>


          <button
            type="button"
            onClick={() =>
              window.open(
                "https://core.qntrl.com/blueprint/startitnow/job/processtab/30725000001415521/30725000000000419",
                "_blank"
              )
            }
            className="px-6 py-3 bg-orange-400 hover:bg-[#E14A42] text-white font-bold rounded"
          >
            Candidate Management
          </button>
        </div>
      </div>

      {/* Resume Cards */}
 <div
  key={keySkill} // 👈 ensures full refresh when skill changes
  className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto pb-6"
>
  {filteredResumes.map((resume, idx) => (
    <motion.div
      key={`${keySkill}-${resume.id}-${idx}`} // 👈 unique per skill + resume
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl shadow-md p-5 flex flex-col relative"
    >
      {!resume.shortlisted && (
        <button
          onClick={() => handleShortlist(resume)}
          disabled={loadingId === resume.id}
          className={`absolute top-2 right-2 px-3 py-1 rounded-md font-bold text-m transition ${
            loadingId === resume.id
              ? "bg-gray-400 cursor-not-allowed text-white"
              : "bg-orange-400 hover:bg-[#E14A42] text-white"
          }`}
        >
          {loadingId === resume.id ? "..." : "Shortlist"}
        </button>
      )}

      {resume.shortlisted && (
        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow">
          ✅ Shortlisted
        </div>
      )}
                <h3 className="text-xl font-semibold text-[#333333] mb-2">{resume.name}</h3>
                <p className="text-sm text-[#333333] mb-1"><strong>Score:</strong> {resume.Rank}</p>
                <p className="text-sm text-[#333333] mb-1"><strong>Experience:</strong> {resume.experience} years</p>
                <p className="text-sm text-[#555555] mb-1"><strong>Email:</strong> {resume.email}</p>
                <p className="text-sm text-[#555555] mb-3"><strong>Phone:</strong> {resume.phone}</p>
                {resume.justification && (
                  <p className="text-sm text-[#555555] italic mt-3 leading-relaxed">"{resume.justification}"</p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Existing;
