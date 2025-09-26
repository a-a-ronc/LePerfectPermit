import { neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/node-postgres';
import 'dotenv/config';
import ws from "ws";
import * as schema from "@shared/schema";
import {Pool} from "pg";

// Configure Neon with WebSocket constructor
neonConfig.webSocketConstructor = ws;

// Add connection retry configuration
neonConfig.poolQueryViaFetch = true;
neonConfig.fetchConnectionCache = true;
neonConfig.pipelineConnect = false;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // local Docker Postgres has no SSL
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});


// (optional) quick startup ping
// import { Client } from 'pg';
// (async () => {
//   const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: false });
//   await c.connect();
//   console.log('DB ping ok:', (await c.query('select 1 as ok')).rows[0]);
//   await c.end();
// })();

export const db = drizzle({ client: pool, schema });