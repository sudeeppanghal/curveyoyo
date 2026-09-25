const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function updatePassword() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const email = 'manasmandal8763@gmail.com';
  const password = 'Manas@2026SMM!';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if auth.users record exists
  const res = await client.query('SELECT id FROM auth.users WHERE lower(email) = $1', [email]);
  let authId;

  if (res.rows.length === 0) {
    const insertRes = await client.query(`
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
      VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', $1, $2, NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW(), 'authenticated', 'authenticated')
      RETURNING id
    `, [email, hashedPassword]);
    authId = insertRes.rows[0].id;
    console.log(`Created auth.users record with ID ${authId}`);
  } else {
    authId = res.rows[0].id;
    await client.query(`
      UPDATE auth.users 
      SET encrypted_password = $1, email_confirmed_at = COALESCE(email_confirmed_at, NOW()) 
      WHERE id = $2
    `, [hashedPassword, authId]);
    console.log(`Updated auth.users password for ID ${authId}`);
  }

  // Update public.users
  await client.query(`
    UPDATE users SET supabase_id = $1 WHERE lower(email) = $2
  `, [authId, email]);

  console.log(`Successfully updated public.users for ${email}`);
  await client.end();
}

updatePassword().catch(err => {
  console.error(err);
  process.exit(1);
});
