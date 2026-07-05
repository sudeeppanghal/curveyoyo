async function main() {
  const apiUrl = "https://gccpanel.com/api/v2";
  const apiKey = "dd65e6481cb70716abcf21b183dd2cf1";
  
  const body = new URLSearchParams();
  body.append("key", apiKey);
  body.append("action", "services");

  const res = await fetch(apiUrl, {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  const services = await res.json();
  const tiktokViews = services.filter(s => s.name.toLowerCase().includes("tiktok") && s.name.toLowerCase().includes("view"));
  console.log("Found TikTok View services:", tiktokViews.length);
  for (const s of tiktokViews.slice(0, 10)) {
    console.log(`ID: ${s.service} | Min: ${s.min} | Max: ${s.max} | Name: ${s.name}`);
  }
}
main().catch(console.error);
