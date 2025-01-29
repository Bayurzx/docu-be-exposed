const fs = require('fs').promises;
const path = require('path');

// Convert HTML files to JSON
async function htmlFilesToJson(outputJsonPath = './htmlFiles.json') {
    try {
        // Read all files in current directory
        const files = await fs.readdir('.');
        
        // Filter HTML files
        const htmlFiles = files.filter(file => path.extname(file).toLowerCase() === '.html');
        
        // Create object to store HTML contents
        const htmlContents = {};
        
        // Read each HTML file
        for (const file of htmlFiles) {
            const content = await fs.readFile(file, 'utf8');
            htmlContents[file] = content;
        }
        
        // Write to JSON file
        await fs.writeFile(outputJsonPath, JSON.stringify(htmlContents, null, 2));
        console.log(`Successfully converted HTML files to ${outputJsonPath}`);
        return htmlContents;
    } catch (error) {
        console.error('Error converting HTML files to JSON:', error);
        throw error;
    }
}

// Convert JSON back to HTML files
async function jsonToHtmlFiles(inputJsonPath = 'htmlFiles.json') {
    try {
        // Read JSON file
        const jsonContent = await fs.readFile(inputJsonPath, 'utf8');
        const htmlFiles = JSON.parse(jsonContent);
        
        // Write each HTML file
        for (const [filename, content] of Object.entries(htmlFiles)) {
            await fs.writeFile(filename, content);
            console.log(`Successfully created ${filename}`);
        }
        
        console.log('Successfully converted JSON back to HTML files');
    } catch (error) {
        console.error('Error converting JSON to HTML files:', error);
        throw error;
    }
}

async function getHtmlContent(filename, jsonPath = 'htmlFiles.json') {
    try {
        // Read JSON file
        const jsonContent = await fs.readFile(jsonPath, 'utf8');
        const htmlFiles = JSON.parse(jsonContent);
        
        // Return content if file exists, otherwise null
        if (filename in htmlFiles) {
            return htmlFiles[filename];
        } else {
            console.log(`File ${filename} not found in ${jsonPath}`);
            return null;
        }
    } catch (error) {
        console.error('Error reading HTML content:', error);
        throw error;
    }
}


// Example usage:
// Convert HTML to JSON
// htmlFilesToJson();

// Convert JSON back to HTML
// jsonToHtmlFiles();

// ***********************************************************************
// As a script - Create a new file (e.g., convert.js) and run it directly:
// const { htmlFilesToJson, jsonToHtmlFiles } = require('./html-json-converter.js');

// // To convert HTML files to JSON:
// htmlFilesToJson();

// // To convert back to HTML files:
// jsonToHtmlFiles();


// ***********************************************************************

// from node command line REPL:
// # Convert HTML to JSON
// node -e "require('./html-json-converter.js').htmlFilesToJson()"

// # Convert JSON back to HTML
// node -e "require('./html-json-converter.js').jsonToHtmlFiles()"
// ***********************************************************************

module.exports = {
    htmlFilesToJson,
    jsonToHtmlFiles,
    getHtmlContent
};