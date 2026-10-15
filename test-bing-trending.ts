import * as cheerio from 'cheerio';

async function testBingTrending() {
    const url = 'https://www.bing.com/images/trending';
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    let count = 0;
    
    $('.imgpt').each((i, el) => {
        count++;
    });

    console.log(`Found ${count} trending images in Bing HTML.`);
}
testBingTrending();
