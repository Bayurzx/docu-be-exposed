const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');

require('dotenv').config({ path: '../../.env' });

// Main entry function to process the contract with LLM
async function processContractWithLLM(htmlPath, userData) {
    try {
        // 1. Convert HTML to JSON
        const sections = await processContract(htmlPath);

        // 2. Separate variable and static sections
        const variableSections = {};
        const staticSections = {};

        Object.entries(sections.sections).forEach(([key, section]) => {
            if (section.hasVariables) {
                variableSections[key] = section;
            } else {
                staticSections[key] = section;
            }
        });

        // 3. Process variable sections with user data
        // console.log('userData@processWithLLMBatch', userData);
        // console.log('htmlPath@processWithLLMBatch', htmlPath);
        
        const processedSections = await processWithLLMBatch(variableSections, userData);

        // 4. Merge static and processed sections
        const completeProcessedSections = {
            sections: {
                ...staticSections,
                ...processedSections,
            },
            metadata: sections.metadata,
        };

        // 5. Convert back to HTML and return as a string
        return reconstructHtml(completeProcessedSections); // Removed `await` as `reconstructHtml` no longer needs to be async.

    } catch (error) {
        console.error('Error in contract processing:', error.message);
        throw error;
    }
}

async function processWithLLMBatch(variableSections, userData) {
    // Prepare the batched prompt
    const sectionsArray = Object.entries(variableSections).map(([key, section]) => ({
        key,
        content: section.content,
    }));

    const batchedPrompt = `
    You are processing a legal contract. 
    You will receive multiple sections containing variables marked with {{variable}}.
    Replace these variables with the user-provided data while following these rules:
    - Only modify content within {{...}} and minimal surrounding text for context.
    - Maintain all HTML structure exactly.
    - Ensure changes are consistent across all sections.
    - Keep all legal language intact except where variables are replaced.

    Here is the user-provided data:
    ${Object.entries(userData)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')}

    Here are the sections to process:
    ${sectionsArray.map(({ key, content }) => `SECTION ${key}:\n${content}`).join('\n\n')}
    
    Respond with the processed sections in this format:
    SECTION <key>: <processed content>
    (repeat for each section).
    `;

    // Call the LLM with the batched prompt
    const response = await callLLM(batchedPrompt);

    // Parse the response back into sections
    const processedSections = {};
    const sectionRegex = /SECTION (\w+):([\s\S]*?)(?=SECTION \w+:|$)/g;

    let match;
    while ((match = sectionRegex.exec(response)) !== null) {
        const [, key, content] = match;
        processedSections[key] = {
            ...variableSections[key],
            content: content.trim(),
            processed: true,
        };
    }

    return processedSections;
}

// Mock LLM call - Replace with actual LLM integration
async function callLLM(prompt) {
    try {
        const openai = new OpenAI();

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are a contract processing assistant. Modify variables and surrounding text as necessary to maintain logical consistency. Preserve all HTML structure.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 2000
        });

        const processedContent = response.choices[0]?.message?.content || '';
        
        if (!validateProcessedContent(processedContent)) {
            throw new Error('LLM response validation failed. The HTML structure might have been altered.');
        }

        return processedContent;

    } catch (error) {
        console.error('Error calling LLM:', error.message);
        throw error;
    }
}

// Function to validate processed HTML content
function validateProcessedContent(content) {
    const originalTags = content.match(/<[^>]+>/g) || [];
    const processedTags = content.match(/<[^>]+>/g) || [];

    if (originalTags.length !== processedTags.length) {
        return false;
    }

    return originalTags.every((tag, index) => tag === processedTags[index]);
}

// Function to reconstruct the HTML (no longer writes to a file)
function reconstructHtml(input) {
    const sectionsData = typeof input === 'string'
        ? JSON.parse(input)
        : input;

    // Sort sections by order
    const orderedSections = Object.values(sectionsData.sections)
        .sort((a, b) => a.order - b.order);

    // Reconstruct HTML
    let htmlContent = '';
    orderedSections.forEach(section => {
        htmlContent += `<!-- SECTION: ${JSON.stringify({
            key: section.key,
            order: section.order,
            type: section.type,
            hasVariables: section.hasVariables
        })} -->\n`;
        htmlContent += section.content + '\n';
        htmlContent += `<!-- END_SECTION: ${section.key} -->\n\n`;
    });

    return htmlContent; // Return the HTML content directly as a string.
}

// Function to process the contract and extract sections into JSON
async function processContract(filePath) {
    try {
        const htmlString = await fs.readFile(filePath, 'utf8');
        return parseContractSections(htmlString); // Return JSON object instead of writing to a file.
    } catch (error) {
        console.error('Error processing file:', error.message);
        throw error;
    }
}

// Function to parse HTML sections into a structured JSON
function parseContractSections(htmlString) {
    const sectionRegex = /<!-- SECTION: (.*?) -->([\s\S]*?)<!-- END_SECTION: \w+ -->/g;

    const sections = {
        sections: {},
        metadata: {
            totalSections: 0,
            sectionsWithVariables: 0,
            created: new Date().toISOString()
        }
    };

    let match;
    while ((match = sectionRegex.exec(htmlString)) !== null) {
        const [_, metadataStr, content] = match;
        const metadata = JSON.parse(metadataStr);

        sections.sections[metadata.key] = {
            content: content.trim(),
            processed: false,
            ...metadata
        };
    }

    sections.metadata.totalSections = Object.keys(sections.sections).length;
    sections.metadata.sectionsWithVariables = Object.values(sections.sections)
        .filter(section => section.hasVariables).length;

    return sections;
}

const sampleUserData = {
    "contractName": "Supply Agreement.html",
    "signer1Email": "bayurzx@gmail.com",
    "signer2Email": "yemiade5700@gmail.com",
    "ccEmail": "docutest@iglumtech.com", 
    "ccName": "DocuTest",
    "signer1Name": "John Boe",
    "signer2Name": "Ade Yemi",
    "company": {
        "name": "Iglum Innovators Inc.",
        "street": "123 Innovation Drive",
        "city": "Tech Bay",
        "state": "California",
        "postalCode": "90021",
        "country": "USA"
    },
    "supplier": {
        "name": "Global Supplies Ltd.",
        "street": "456 Supply Lane",
        "city": "Supply Town",
        "state": "New York",
        "postalCode": "10001",
        "country": "USA",
        "date": "2025-01-10"
    },
    "products": [
        { "name": "Laptop", "description": "High-performance laptop", "price": "1200" },
        { "name": "Monitor", "description": "27-inch 4K monitor", "price": "600" },
        { "name": "Mouse", "description": "Wireless ergonomic mouse", "price": "30" },
        { "name": "Keyboard", "description": "Mechanical gaming keyboard", "price": "80" }
    ],
    "deliveryDays": "30",
    "terminationNoticeDays": "60",
    "remedyPeriodDays": "15",
    "paymentTermDays": "30",
    "interestRate": "5",
    "warrantyPeriod": "12",
    "governingState": "California",
    "supplierSignature": {
        "signature": "John Boe",
        "firstName": "John",
        "lastName": "Boe",
        "date": "2025-01-10"
    },
    "companySignature": {
        "signature": "Ade Yemi",
        "firstName": "Ade",
        "lastName": "Yemi",
        "date": "2025-01-10"
    }
}


const concateDocPath = __dirname +'/../../htmlDoc/'

module.exports = {
    concateDocPath,
    sampleUserData,
    processContractWithLLM
};

// Example usage
// const contractPath = './Supply Agreement.html';
// processContractWithLLM(contractPath, JSON.stringify(userData))
//     .then(finalHtml => {
//         console.log('Contract processed successfully');
//         console.log(finalHtml);
//     })
//     .catch(error => {
//         console.error('Error processing the contract:', error.message);
//     });


    