const statusText = document.querySelector("#status");
const company = document.querySelector("#company");
const role = document.querySelector("#role");
const jobLink = document.querySelector("#job-link");

async function detectJob() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  jobLink.value = tab.url || "";
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
    const text = selectors => selectors.map(selector => document.querySelector(selector)?.textContent?.trim()).find(Boolean) || "";
    const title = text(["h1", "[data-testid*='job-title']", "[class*='job-title']", "[class*='jobTitle']"]);
    const employer = text(["[data-testid*='company']", "[class*='company-name']", "[class*='companyName']", ".topcard__org-name-link"]);
    const site = document.querySelector("meta[property='og:site_name']")?.content || "";
    return { role: title || document.title.split(/[|\-–]/)[0].trim(), company: employer || site };
  }});
  role.value = result.role; company.value = result.company;
}

document.querySelector("#capture-form").addEventListener("submit", async event => {
  event.preventDefault(); statusText.textContent = "Saving..."; statusText.className = "";
  try {
    const response = await fetch("http://localhost:3000/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: company.value, role: role.value, stage: "Applied", appliedDate: new Date().toISOString().slice(0, 10), jobLink: jobLink.value, notes: document.querySelector("#notes").value }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.errors?.join(" ") || result.error || "Unable to save.");
    statusText.textContent = "Saved to ApplyFlow."; statusText.className = "success";
  } catch (error) { statusText.textContent = error.message.includes("Failed to fetch") ? "Start ApplyFlow at localhost:3000, then try again." : error.message; statusText.className = "error"; }
});
detectJob().catch(() => { statusText.textContent = "Enter the job details below."; });
