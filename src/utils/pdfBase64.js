const puppeteer = require('puppeteer');

/**
 * Converts HTML content to a base64 PDF string for DocuSign.
 * @param {string} htmlContent - The HTML content with styling.
 * @returns {Promise<string>} - Returns a base64 string of the generated PDF.
 */
async function generatePdfBase64(htmlContent) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    // Set the HTML content
    await page.setContent(htmlContent, { waitUntil: 'load' });

    // Generate the PDF as a Buffer
    const pdfBuffer = await page.pdf({
      format: 'A4', // Paper size
      printBackground: true, // Include background colors/images
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm',
      },
    });

    // Convert the PDF Buffer to a Base64 string
    const pdfBase64 = pdfBuffer.toString('base64');
    return pdfBase64;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = {
    generatePdfBase64
};
