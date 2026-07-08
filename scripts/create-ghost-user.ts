import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const GHOST_EMAIL = "kg44314@gmail.com";
const GHOST_PASSWORD = "sokiak@786";
const GHOST_NAME = "User";

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("Generating bcrypt hash for password...");
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(GHOST_PASSWORD, salt).replace(/^\$2b\$/, "$2a$");
    console.log("Generated hash:", hash);

    console.log(`Checking if ghost user ${GHOST_EMAIL} exists in auth.users...`);
    const existingAuth: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM auth.users WHERE email = $1`,
      GHOST_EMAIL
    );

    let userId: string;
    const now = new Date().toISOString();

    if (existingAuth.length > 0) {
      userId = existingAuth[0].id;
      console.log(`User exists in auth.users with ID: ${userId}. Updating password and confirming...`);
      
      await prisma.$executeRawUnsafe(
        `UPDATE auth.users SET 
          encrypted_password = $1, 
          email_confirmed_at = $2::timestamptz, 
          last_sign_in_at = $2::timestamptz,
          updated_at = $2::timestamptz,
          confirmation_token = '',
          recovery_token = '',
          email_change_token_new = '',
          email_change = '',
          email_change_token_current = '',
          raw_app_meta_data = $3::jsonb,
          raw_user_meta_data = $4::jsonb
        WHERE id = $5::uuid`,
        hash,
        now,
        JSON.stringify({ provider: "email", providers: ["email"] }),
        JSON.stringify({
          sub: userId,
          name: GHOST_NAME,
          email: GHOST_EMAIL,
          email_verified: true,
          phone_verified: false,
        }),
        userId
      );
      console.log("Successfully updated auth.users record.");
    } else {
      userId = generateUUID();
      console.log(`User does not exist. Inserting new record in auth.users with ID: ${userId}...`);
      
      // Omit confirmed_at since it is a generated column in Supabase Auth v2
      await prisma.$executeRawUnsafe(
        `INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, 
          email_confirmed_at, last_sign_in_at, created_at, updated_at, 
          confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
          raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
        ) VALUES (
          '00000000-0000-0000-0000-000000000000'::uuid, $1::uuid, 'authenticated', 'authenticated', $2, $3,
          $4::timestamptz, $4::timestamptz, $4::timestamptz, $4::timestamptz,
          '', '', '', '', '',
          $5::jsonb, $6::jsonb, false, false
        )`,
        userId,
        GHOST_EMAIL,
        hash,
        now,
        JSON.stringify({ provider: "email", providers: ["email"] }),
        JSON.stringify({
          sub: userId,
          name: GHOST_NAME,
          email: GHOST_EMAIL,
          email_verified: true,
          phone_verified: false,
        })
      );
      console.log("Successfully inserted auth.users record.");
    }

    // Ensure identity exists
    console.log("Checking if identity exists in auth.identities...");
    const existingIdentities: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM auth.identities WHERE user_id = $1::uuid`,
      userId
    );

    if (existingIdentities.length === 0) {
      const identityId = generateUUID();
      console.log(`Inserting new identity in auth.identities with ID: ${identityId}...`);
      // Omit email column as it is a generated column in identities
      await prisma.$executeRawUnsafe(
        `INSERT INTO auth.identities (
          id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
        ) VALUES (
          $1::uuid, $2::uuid, $3, 'email', $4::jsonb, $5::timestamptz, $5::timestamptz, $5::timestamptz
        )`,
        identityId,
        userId,
        userId,
        JSON.stringify({
          sub: userId,
          name: GHOST_NAME,
          email: GHOST_EMAIL,
          email_verified: true,
          phone_verified: false,
        }),
        now
      );
      console.log("Successfully inserted auth.identities record.");
    } else {
      console.log("Identity already exists. Updating it...");
      await prisma.$executeRawUnsafe(
        `UPDATE auth.identities SET
          identity_data = $1::jsonb,
          last_sign_in_at = $2::timestamptz,
          updated_at = $2::timestamptz
        WHERE user_id = $3::uuid`,
        JSON.stringify({
          sub: userId,
          name: GHOST_NAME,
          email: GHOST_EMAIL,
          email_verified: true,
          phone_verified: false,
        }),
        now,
        userId
      );
      console.log("Successfully updated auth.identities record.");
    }

    // Now insert/upsert the public.users (Prisma) user table record
    console.log("Syncing with public.users table...");
    const dbUser = await prisma.user.upsert({
      where: { email: GHOST_EMAIL },
      update: {
        supabaseId: userId,
        plan: "LIFETIME",
        lifetimeUnlocked: true,
        walletMode: true,
      },
      create: {
        supabaseId: userId,
        email: GHOST_EMAIL,
        name: GHOST_NAME,
        plan: "LIFETIME",
        lifetimeUnlocked: true,
        walletMode: true,
        balance: 0.0,
      },
    });

    console.log("Prisma user table record successfully synced:", dbUser);
    console.log(`\n✅ Ghost user setup is completely finished!`);
    console.log(`  Email: ${GHOST_EMAIL}`);
    console.log(`  Password: ${GHOST_PASSWORD}`);

  } catch (err) {
    console.error("Fatal setup error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
