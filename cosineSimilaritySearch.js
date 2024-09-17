import pool from './db.js';

const cosineSimilaritySearch = async (embedding) => {
  console.log('\x1b[35m%s\x1b[0m','Starting cosine similarity search...');

  const query = `
    SELECT id, chunk,
    1 - (embedding <=> $1::vector) AS similarity
    FROM items
    ORDER BY similarity DESC
    LIMIT 5;
  `;
  const values = [embedding];

  try {
    console.log('\x1b[35m%s\x1b[0m','Executing query...');
    const res = await pool.query(query, values);
    console.log('\x1b[35m%s\x1b[0m','Query executed successfully');
    return res.rows;
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m','Error during cosine similarity search:', err);
    throw err;
  }
};

export default cosineSimilaritySearch;