const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws }
});

async function resetUserPassword() {
  const email = 'yashmaheswari66@gmail.com';
  const newPassword = 'Yash@2026SMM!';

  // 1. Get user by email
  const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("Error listing users:", listErr);
    process.exit(1);
  }

  let user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.log(`Creating user in Supabase Auth for ${email}...`);
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true
    });
    if (createErr) {
      console.error("Error creating user:", createErr);
      process.exit(1);
    }
    user = newUser.user;
    console.log(`Created new Supabase user: ${user.id}`);
  } else {
    console.log(`Updating password for existing Supabase user ${user.id}...`);
    const { data: updatedUser, error: updateErr } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword, email_confirm: true }
    );
    if (updateErr) {
      console.error("Error updating user password:", updateErr);
      process.exit(1);
    }
    console.log(`Password updated successfully for ${email}!`);
  }

  // Ensure user in prisma DB has supabaseId linked
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.user.updateMany({
    where: { email },
    data: { supabaseId: user.id }
  });
  console.log(`Linked Prisma user ${email} to Supabase ID ${user.id}`);
  await prisma.$disconnect();
}

resetUserPassword().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
