console.log("Content script running...");

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
  overlay.style.display = "none";
  form.style.display = "none";
});

// Create and inject the form
const form = document.createElement("form");
form.id = "scraper-form";
form.style.display = "none"; // Initially hide the form
form.innerHTML = `
  <h2>Scraper Form</h2>
  <label for="start-id">Starting ID:</label>
  <input required type="number" id="start-id" required>
  <label for="end-id">Ending ID:</label>
  <input required type="number" id="end-id" required>
  <button id="scrape-now">Scrape Now</button>
`;
document.body.appendChild(form);

// Add event listeners
scraperButton.addEventListener("click", () => {
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
  const idsToScrape = Array.from(
    { length: endId - startId + 1 },
    (_, i) => startId + i
  );

  console.log(idsToScrape);

  console.log(`Starting to scrape ${idsToScrape.length} students...`);

  const promises = idsToScrape.map((id) => getStudentDetails(id));

  const data = await Promise.all(promises);

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
  return student;
}

function htmlTableToJson(table) {
  console.log(table);
  if (!table)
    return [
      {
        Error: "No data found",
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
