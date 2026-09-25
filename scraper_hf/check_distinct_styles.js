const { Client } = require('pg');

async function check() {
  const connectionString = "postgresql://postgres:f47ee48e1101f1ce55985563f842872c@localhost:54322/postgres";
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    // Check distinct curveStyle in orders table
    console.log("Checking distinct curveStyle in orders table:");
    const res = await client.query('SELECT DISTINCT "curveStyle" FROM orders');
    console.log(res.rows);

    // Check distinct style in curve_templates table
    console.log("\nChecking distinct style in curve_templates table:");
    const res2 = await client.query('SELECT DISTINCT style FROM curve_templates');
    console.log(res2.rows);

  } catch (err) {
    console.error("DB error:", err);
  } finally {
    await client.end();
  }
}

check();
