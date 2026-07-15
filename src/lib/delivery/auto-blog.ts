import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { isGhostEmail } from "@/lib/ghost";

/**
 * Automatically generates and publishes an SEO-optimized case study for a completed campaign.
 * Uses Gemini API and stores it in the Blog model.
 */
export async function generateOrderCaseStudy(orderId: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[AutoBlog] No GEMINI_API_KEY found. Skipping auto-blog.");
      return;
    }

    // 1. Fetch the completed order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, reel: true },
    });

    if (!order) {
      console.warn(`[AutoBlog] Order ${orderId} not found.`);
      return;
    }

    // Privacy Safe: Do not generate case studies for Ghost users or small campaigns
    if (isGhostEmail(order.user.email)) {
      console.log(`[AutoBlog] Skipping ghost account order.`);
      return;
    }

    if (order.viewsTarget < 5000) {
      console.log(`[AutoBlog] Campaign views target too small (${order.viewsTarget}). Skipping.`);
      return;
    }

    console.log(`[AutoBlog] Generating SEO case study for order ${orderId}...`);

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a professional SEO marketer and growth hacking expert. We want to publish a detailed case study on our blog about a successful social media campaign.

Campaign Details:
- Platform: ${order.reel.platform}
- Paced Target: ${order.viewsTarget.toLocaleString()} Views
- Campaign Duration: ${order.durationHours} Hours
- Pacing Schedule Curve: ${order.curveStyle}
- Accompanying Engagement: ${order.likesTarget} Likes, ${order.savesTarget} Saves, ${order.sharesTarget} Shares, ${order.commentsTarget} Comments

Instructions:
Generate a blog case study report in JSON format with these exact keys:
1. "title": A catchy, SEO-optimized title (e.g. "Case Study: How S-Curve Pacing Boosted an Instagram Reel to 100K Views Naturally").
2. "slug": A URL-friendly slug based on the title (e.g. "instagram-reel-growth-100k-views-case-study").
3. "excerpt": A brief, engaging 2-sentence summary.
4. "content": The body of the case study in HTML format. Write about 300-500 words. Explain how the organic pacing engine simulated natural growth patterns to bypass platform spam triggers, preserve account authority, and keep the algorithm feeding the video to real audiences. Highlight that the views and likes are distributed in randomized organic batches. Keep the client completely anonymous.

Output ONLY valid JSON. Do not include markdown code block wraps (\`\`\`json ... \`\`\`).`;

    // 2. Query Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    });

    let jsonText = response.text || "";
    
    // Clean up code block wraps if returned by the model
    if (jsonText.includes("```")) {
      jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    const data = JSON.parse(jsonText);
    if (!data.title || !data.content || !data.slug) {
      throw new Error("Missing required JSON fields from AI output");
    }

    // Ensure unique, clean URL-friendly slug
    const sanitizedSlug = data.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric except spaces and hyphens
      .replace(/[\s_]+/g, "-")      // replace spaces and underscores with a single hyphen
      .replace(/-+/g, "-");         // remove consecutive hyphens
    const cleanSlug = `${sanitizedSlug}-${Math.random().toString(36).substring(2, 6)}`;

    // Calculate read time
    const wordCount = data.content.split(/\s+/).length;
    const readTime = `${Math.max(1, Math.ceil(wordCount / 200))} min read`;

    // 3. Create the Blog Post in Database
    const blog = await prisma.blog.create({
      data: {
        title: data.title,
        slug: cleanSlug,
        excerpt: data.excerpt || "A real-time campaign performance study.",
        content: data.content,
        readTime,
        published: true,
      },
    });

    console.log(`[AutoBlog] Successfully created blog case study: ${blog.title} (Slug: ${blog.slug})`);

  } catch (err: any) {
    console.error("[AutoBlog] Failed to generate case study:", err);
  }
}
