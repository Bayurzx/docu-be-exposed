const fs = require('fs').promises; // Use the Promise version of fs
const path = require('path');
const cheerio = require('cheerio');

// List of HTML files as an object (you can dynamically populate this from your directory)
const files = {
  1: "Partnership Contract.html",
  2: "Another Document.html",
  3: "Sample Document.html",
  4: "Report.html",
  5: "Meeting Notes.html",
  // add more files as necessary
};

// Function to extract text from a specific HTML file based on key
async function extractHtmlFromFile(key) {
  // Check if the key exists in the object
  if (!files[key]) {
    throw new Error('File not found for the provided key.');
  }

  // Get the file name from the key
  const fileName = files[key];

  // Path to the file in the 'documents' directory
  const filePath = path.join(__dirname, 'documents', fileName);

  try {
    // Read the HTML file using the Promise version of fs.readFile
    const data = await fs.readFile(filePath, 'utf8');

    // Load the HTML content into Cheerio for parsing
    const $ = cheerio.load(data);

    // Extract all the text from the body of the HTML file
    const textContent = $('body').text();

    // Return the extracted text content
    return textContent;
  } catch (err) {
    throw new Error('Error reading the file: ' + err.message);
  }
}

// Export the function so it can be used in other files
module.exports = extractHtmlFromFile;
