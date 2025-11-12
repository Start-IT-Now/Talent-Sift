// src/lib/saveApplicant.js
import { supabase } from "@/lib/supabaseClient";

export async function saveApplicantToSupabase(jobDetails) {
  try {
    // Only read localStorage inside the function (browser runtime)
    const owner = localStorage.getItem("owner") ?? jobDetails.owner ?? "";
    const requestor = localStorage.getItem("requestor") ?? jobDetails.requestor ?? "";

    // prepare rows (single row)
    const row = {
      job_title: jobDetails.jobTitle ?? jobDetails.job_title,
      years_of_experience: jobDetails.yearsOfExperience ?? jobDetails.years_of_experience,
      job_type: jobDetails.jobType ?? jobDetails.job_type,
      industry: jobDetails.industry ?? jobDetails.industry,
      owner,
      requestor,
      // add other fields if needed
    };

    const { data, error } = await supabase
      .from("applicants")
      .insert([row])
      .select();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("saveApplicantToSupabase error:", err);
    throw err;
  }
}
