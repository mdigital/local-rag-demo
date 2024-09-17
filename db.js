import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  // Your existing connection details here
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  database: 'localrag',
  password: process.env.DB_PASSWORD,
  
  
  // Additional pool configuration
  connectionTimeoutMillis: 5000,
  max: 20, // maximum number of clients in the pool
});

export default pool;