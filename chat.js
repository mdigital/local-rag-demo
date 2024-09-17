import fetch from 'node-fetch';
import readline from 'readline';
import dotenv from 'dotenv';

import cosineSimilaritySearch from './cosineSimilaritySearch.js';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


const getLLMResponse = async (prompt) => {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: "llama3.1", prompt: prompt, "stream": false})
  });
  const data = await response.json();
  
  return data.response;
}

const safetyCheck = async (question) => {

  const prompt = `A question was asked of: ${question} 

  If this is in any way rude, inappropriate, or harmful, please respond simply with one word: REJECTED and no other response.`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: "llama3.1", prompt: prompt, "stream": false})
  });
  const data = await response.json();
  
  return data.response;
}
// Function to get embedding vector from local model
const getEmbedding = async (text) => {
  console.log('\x1b[33m%s\x1b[0m','Getting embedding from llama3.1');
  try {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: "llama3.1", prompt: text })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return JSON.stringify(data.embedding);
  } catch (err) {
    console.error('Error getting embedding:', err);
    throw err;
  }
};


const expandPrompt = async (text) => {
  const response = await getLLMResponse(`You are a chatbot that responds to questions about antarctic explorer Ernest Shackleton. Please expand upon the question to improve the search results against the vector DB of his writings, the question is: ${text}, if it's got nothing to do with exploration, simply reply with the original question`);
  console.log('\x1b[33m%s\x1b[0m', "Expanding prompt");
  // console.log('\x1b[33m%s\x1b[0m',`better response: ${response}`);
  return response;
}


const getAnswer = async (question) => {
  
    // const safety = await safetyCheck(question);

    // if (safety === 'REJECTED') {
    //   console.log('Question rejected. Please ask a different question.');
    //   return;
    // }
  
    const expandedPrompt = await expandPrompt(question);
    const embedding = await getEmbedding(expandedPrompt);
    
    console.log('\x1b[33m%s\x1b[0m', 'Searching for similar chunks...');
    const results = await cosineSimilaritySearch(embedding);
    const similarities = results.map(row => row.similarity);
    const minSimilarity = Math.min(...similarities);
    const maxSimilarity = Math.max(...similarities);  
    // console.log('\x1b[33m%s\x1b[0m',`Found similar chunks between ${minSimilarity} and ${maxSimilarity}`);
    const topResults = results.slice(0, 5);

    // console.log('Top results:',topResults);
    
    const context = topResults.map(result => result.chunk).join(' ');

    const relevantResults = results.filter(result => result.similarity > 0.45);
    // console.log('Relevant results:',relevantResults);

    let prompt = '';
    
    if (relevantResults.length === 0) {
      prompt = `A question was asked of: ${question}
      
      However, no relevant information was found in the database. Please respond in character as Ernest Shackleton, the explorer. The response should be a short paragraph. Do not hallucinate or talk of anything other than that you have no knowledge of what was asked.`;
    } else {

      prompt = `Please answer the following question, using the following context.

      Question:
  
      ${question}
  
      Context:
  
      ${context}
  
      Write your answer in the tone of Ernest Shackleton, the explorer. The answer should be a short paragraph.
  
      Do not hallucinate or talk of anything other than the context provided`;

    }

    // console.log(prompt);   
    
    const response = await getLLMResponse(prompt);
    console.log(response);
  
}

const main = async () => {
  // await client.connect();

  rl.setPrompt('Please enter a question (or type "bye" to exit): ');
  console.log("\n\n");
  rl.prompt();

  rl.on('line', async (line) => {
    if (line === 'bye') {
      rl.close();
      // await client.end();
    } else {
      const answer = await getAnswer(line);
      console.log(answer,"\n\n");
      rl.prompt();
    }
  });
};

main();
