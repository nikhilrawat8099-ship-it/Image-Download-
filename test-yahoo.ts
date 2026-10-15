import * as cheerio from "cheerio";

async function run() {
  const response = await fetch("https://images.search.yahoo.com/search/images?p=latest+news+photos", {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
  });
  const html = await response.text();
  const $ = cheerio.load(html);
  const results: any[] = [];
  $('li.ld').each((i, el) => {
    const imgData = $(el).find('a').attr('data-bxapp');
    console.log(imgData ? "found data" : "no data");
  });
  console.log(html.substring(0, 500));
}
run();
