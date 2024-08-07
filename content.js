console.log("Content script running...");

if (!location.href.includes("ueab.ac.ke"))
  throw "Not executing on non ueab website";

let totalToScrape = 0;
let totalScraped = 0;

function updateProgress() {
  const progress = document.querySelector("#scraper-form h2 span");
  progress.textContent = `${totalScraped}/${totalToScrape}`;

  totalScraped++;
}

function initProgress(total) {
  totalToScrape = total;
  totalScraped = 0;
  const progress = document.querySelector("#scraper-form h2 span");
  progress.textContent = `0/${total}`;

  // disable the form
  document.getElementById("start-id").disabled = true;
  document.getElementById("end-id").disabled = true;
  document.getElementById("scrape-now").disabled = true;
}

function finishProgress() {
  const progress = document.querySelector("#scraper-form h2 span");
  progress.textContent = `${totalToScrape}/${totalToScrape}`;

  totalScraped = totalToScrape;

  // enable the form

  document.getElementById("start-id").disabled = false;
  document.getElementById("end-id").disabled = false;
  document.getElementById("scrape-now").disabled = false;
}

// Create and inject the Scraper button
const scraperButton = document.createElement("button");
scraperButton.id = "scraper-button";
scraperButton.textContent = "Scraper";
document.body.appendChild(scraperButton);

// Create and inject the overlay
const overlay = document.createElement("div");
overlay.className = "scraper-overlay";
document.body.appendChild(overlay);
overlay.style.display = "none";

overlay.addEventListener("click", () => {
  if (totalScraped !== totalToScrape) return;

  overlay.style.display = "none";
  form.style.display = "none";
});

// Create and inject the form
const form = document.createElement("form");
form.id = "scraper-form";
form.style.display = "none"; // Initially hide the form
form.innerHTML = `
  <h2>Scraper (<span>0/0<span>)</h2>
  
  <label for="start-id">Starting ID:</label>
  <input placeholder='e.g 1019' required type="number" id="start-id" required>
  <label for="end-id">Ending ID:</label>
  <input placeholder="e.g 1025" required type="number" id="end-id" required>
  <button id="scrape-now">Scrape Now</button>
`;
document.body.appendChild(form);

// Add event listeners
scraperButton.addEventListener("click", () => {
  if (totalScraped !== totalToScrape) return;

  form.style.display = form.style.display === "none" ? "block" : "none";
  overlay.style.display = overlay.style.display === "none" ? "block" : "none";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const startId = Number(document.getElementById("start-id").value);
  const endId = Number(document.getElementById("end-id").value);
  console.log("Starting ID:", startId);
  console.log("Ending ID:", endId);

  scrapeStudentDetails(startId, endId);
});

async function scrapeStudentDetails(startId, endId) {
  const isLoggedIn = await checkIsLoggedIn();

  if (!isLoggedIn) {
    const proceed = confirm(
      "The scraper will not function properly unless you are logged in to iCampus. If you are willing to proceed with invalid data, please click 'OK'. Otherwise, please log in first."
    );

    if (!proceed) return;
  }

  if (startId > endId) {
    alert("Starting ID cannot be greater than Ending ID");
    return;
  }
  const idsToScrape = Array.from(
    { length: endId - startId + 1 },
    (_, i) => startId + i
  );

  initProgress(idsToScrape.length);

  console.log(`Starting to scrape ${idsToScrape.length} students...`);

  const promises = idsToScrape.map((id) => getStudentDetails(id));

  const data = await Promise.all(promises);

  downloadJson(data);

  finishProgress();

  console.log(data);
}

// selectors
const applicantDetailsTableSelector = `#pageview > div > div:nth-child(10) > div.col-md-4 > table`;
const summaryTableSelector = `#mainContent_uiGradDetail_grdSumm`;
const finishedCoursesTableSelector = `#mainContent_uiGradDetail_grd`;
const pendingCoursesTableSelector = `#mainContent_uiGradDetail_grdPend`;

// helpers
async function getStudentDetails(id) {
  console.log("Getting student details for ID:", id);
  // https://icampus.ueab.ac.ke/iStudent/Auth/apply/Graduation/GradDetailVw?id=1019

  const url = `https://icampus.ueab.ac.ke/iStudent/Auth/apply/Graduation/GradDetailVw?id=${id}`;

  const res = await fetch(url);

  const html = await res.text();

  //   console.log(html);

  const parser = new DOMParser();

  const doc = parser.parseFromString(html, "text/html");

  const applicantDetailsTable = doc.querySelector(
    applicantDetailsTableSelector
  );
  const summaryTable = doc.querySelector(summaryTableSelector);
  const finishedCoursesTable = doc.querySelector(finishedCoursesTableSelector);
  const pendingCoursesTable = doc.querySelector(pendingCoursesTableSelector);

  const student = {
    basicDetails: htmlTableToJson(applicantDetailsTable),
    perfomanceSummary: htmlTableToJson(summaryTable),
    finishedCourses: htmlTableToJson(finishedCoursesTable),
    pendingCourses: htmlTableToJson(pendingCoursesTable),
  };

  //   console.log(student);
  console.log(`Student with ID ${id} scraped successfully!`);
  updateProgress();
  return student;
}

function htmlTableToJson(table) {
  // console.log(table);
  if (!table)
    return [
      {
        Error:
          "No data found. Either the student id does not exist or you are not logged in.",
      },
    ];
  const headers = [];
  const rows = table.rows;
  const jsonData = [];

  if (!rows?.length) return jsonData;

  // Get the table headers
  for (let i = 0; i < rows[0].cells.length; i++) {
    headers[i] = rows[0].cells[i]?.innerText.trim();
  }

  // Get the table rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const data = {};

    for (let j = 0; j < row.cells.length; j++) {
      data[headers[j] ?? "Value"] = row.cells[j]?.innerText.trim();
    }

    jsonData.push(data);
  }

  return jsonData;
}

function downloadJson(jsonArray) {
  // Convert the JavaScript array object to a JSON string
  const jsonString = JSON.stringify(jsonArray);

  // Create a Blob from the JSON string
  const blob = new Blob([jsonString], { type: "application/json" });

  // Create a URL for the Blob
  const url = URL.createObjectURL(blob);

  // Create an anchor element
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.json"; // Specify the file name

  // Programmatically click the anchor element to trigger the download
  document.body.appendChild(a);
  a.click();

  // Remove the anchor element from the document
  document.body.removeChild(a);

  // Revoke the object URL to free up memory
  URL.revokeObjectURL(url);
}

async function checkIsLoggedIn() {
  const res = await fetch(`https://icampus.ueab.ac.ke/iStudent/Auth/Classes/`);
  const text = await res.text();

  const hasLogoutButton = text.includes(`Logout`);

  return hasLogoutButton;
}
