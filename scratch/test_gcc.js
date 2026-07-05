async function main() {
  const apiUrl = "https://gccpanel.com/api/v2";
  const apiKey = "dd65e6481cb70716abcf21b183dd2cf1"; // From previous context I know this is their key

  // We want to test placing an order for TikTok views
  const body = new URLSearchParams();
  body.append("key", apiKey);
  body.append("action", "add");
  body.append("service", "10003"); // TikTok Views
  body.append("link", "https://vt.tiktok.com/ZSC5g9Gcd/");
  body.append("quantity", "443"); // The amount that was calculated

  const res = await fetch(apiUrl, {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  const text = await res.text();
  console.log("Response for quantity 443:", text);
}

main().catch(console.error);
