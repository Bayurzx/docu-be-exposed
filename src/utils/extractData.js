// src\utils\extractData.js

function extractDocumentIds(documents) {
  if (!Array.isArray(documents)) {
    throw new Error("Invalid input: Expected an array of documents");
  }

  // Map over the array and extract the documentId from each object
  const documentIds = documents.map(doc => doc.documentId);

  return documentIds;
}

function extractEnvelopeIds(envelopes) {
  if (!Array.isArray(envelopes)) {
    throw new Error("Invalid input: Expected an array of envelopes");
  }

  // Map over the array and extract the documentId from each object
  const envelopeIds = envelopes.map(doc => doc.envelopeId);

  const uniqueEnvelopeIds = Array.from(new Set([...envelopeIds]));

  return uniqueEnvelopeIds;
}

function joinArraysUnique(array1, array2) {
  // Use the Set object to combine the arrays and remove duplicates
  return Array.from(new Set([...array1, ...array2]));
}


  
module.exports = {
  extractDocumentIds,
  joinArraysUnique,
  extractEnvelopeIds,
}