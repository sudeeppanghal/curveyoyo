import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const GHOST_EMAIL = "kg44314@gmail.com";
const GHOST_PASSWORD = "sokiak@786";

async function main() {
  const prisma = new PrismaClient();
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    console.log(`1. Deleting existing ghost user ${GHOST_EMAIL} from auth.users...`);
    await prisma.$executeRawUnsafe(
      `DELETE FROM auth.users WHERE email = $1`,
      GHOST_EMAIL
    );
    console.log("Successfully deleted old record.");

    console.log(`2. Signing up ghost user natively via Supabase GoTrue API...`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: GHOST_EMAIL,
      password: GHOST_PASSWORD,
      options: {
        data: { name: "User" }
      }
    });

    if (signUpError) {
      throw new Error(`Supabase signUp failed: ${signUpError.message}`);
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      throw new Error("No user ID returned from signUp");
    }
    console.log(`Successfully created user in GoTrue with ID: ${userId}`);

    console.log("3. Instantly confirming the user email and token in auth.users...");
    await prisma.$executeRawUnsafe(
      `UPDATE auth.users SET 
        email_confirmed_at = NOW(), 
        last_sign_in_at = NOW(),
        updated_at = NOW(),
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change = '',
        email_change_token_current = ''
      WHERE id = $1::uuid`,
      userId
    );
    console.log("Instantly confirmed user email in GoTrue.");

    console.log("4. Syncing public.users record to LIFETIME with ₹2000 balance...");
    const dbUser = await prisma.user.upsert({
      where: { email: GHOST_EMAIL },
      update: {
        supabaseId: userId,
        plan: "LIFETIME",
        lifetimeUnlocked: true,
        walletMode: true,
        balance: 2000.0,
      },
      create: {
        supabaseId: userId,
        email: GHOST_EMAIL,
        name: "User",
        plan: "LIFETIME",
        lifetimeUnlocked: true,
        walletMode: true,
        balance: 2000.0,
      },
    });

    console.log("Prisma user successfully synced:", dbUser);

    console.log("\n5. Testing sign-in with the recreated credentials...");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: GHOST_EMAIL,
      password: GHOST_PASSWORD
    });

    if (signInError) {
      console.error("❌ Sign-in test failed after recreation:");
      console.error(signInError);
    } else {
      console.log("✅ SUCCESS! Recreated ghost user signed in perfectly!");
      console.log("Session ID:", signInData.session?.access_token.slice(0, 15) + "...");
    }

  } catch (err) {
    console.error("Recreation failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
