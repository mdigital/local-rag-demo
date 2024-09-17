import fs from 'fs';
import fetch from 'node-fetch';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection configuration
const client = new pg.Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  database: 'localrag' // Use your specific database name
});

function chunkBySentence(filePath, chunkSize = 400) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const sentences = fileContent.split(/[.!?]+/);
  return sentences;
}

function chunkByParagraph(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const paragraphs = fileContent.split(/\n\s*\n/);
  return paragraphs;
}

// Function to chunk text
function chunkText(filePath, chunkSize = 400) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const sentences = fileContent.split(/[.!?]+/);
  const chunks = [];
  let currentChunk = [];
  let currentChunkLength = 0;

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    const sentenceLength = trimmedSentence.split(' ').length;

    if (currentChunkLength + sentenceLength > chunkSize) {
      chunks.push(currentChunk.join(' ') + '.');
      currentChunk = [trimmedSentence];
      currentChunkLength = sentenceLength;
    } else {
      currentChunk.push(trimmedSentence);
      currentChunkLength += sentenceLength;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' ') + '.');
  }

  return chunks;
}

async function getEmbeddings(chunks) {
  const results = [];
  for (const chunk of chunks) {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: "llama3.1", prompt: chunk })
    });
    const data = await response.json();
    results.push({ chunk, embedding: data.embedding });
  }
  return results;
}

// Function to get embeddings from the local model
// async function getEmbeddings(chunks) {
//   const results = [];
//   for (const chunk of chunks) {

//     const response = await fetch('http://localhost:8080/embedding', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({ text: chunk })
//     });
//     const data = await response.json();
//     results.push({ chunk, embedding: data.embedding });
//   }
//   return results;
// }

const normalizeVector = (vector) => {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / magnitude);
};

// Function to insert embeddings into the database
async function insertEmbeddings(embeddings) {
  await client.connect();

  // try {
  //   await client.query('DELETE FROM items');
  // } catch (err) {
  //   console.error('Error deleting data:', err);
  // }

  for (const item of embeddings) {
    const { chunk, embedding } = item;
    const normalizedEmbedding = normalizeVector(embedding);
    const query = 'INSERT INTO items (chunk, embedding) VALUES ($1, $2)';
    const values = [chunk, JSON.stringify(normalizedEmbedding)];

    try {
      await client.query(query, values);
    } catch (err) {
      console.error('Error inserting data:', err);
    }
  }

  await client.end();
}

// Main function to execute the script
async function main() {
  const filePath = './shackleton.txt';
  const chunks = chunkText(filePath);
  // filter out chunks that are too short or empty
  const filteredChunks = chunks.filter(chunk => chunk.length > 60);

  const embeddings = await getEmbeddings(filteredChunks);

  // Save embeddings to a file
  fs.writeFile('embeddings.json', JSON.stringify(embeddings, null, 2), (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
  });

  // Insert embeddings into the database
  await insertEmbeddings(embeddings);
  console.log('Data inserted into the database successfully');
}

// Run the main function
main().catch(err => console.error('Error in main function:', err));
