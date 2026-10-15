import * as cheerio from 'cheerio';

async function testGoogle() {
    const url = 'https://www.google.com/search?q=latest+news+photos&tbm=isch';
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    let count = 0;
    
    // In google images, img tags have src or data-src but usually low res. 
    // Data is often inside scripts. Let's see if we can find typical google image patterns.
    $('img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && src.startsWith('http')) {
            count++;
        }
    });

    console.log(`Found ${count} images in google HTML.`);
    
    const scripts = $('script').map((i, el) => $(el).html()).get();
    const dataScripts = scripts.filter(s => s.includes('AF_initDataCallback'));
    console.log(`Found ${dataScripts.length} data scripts.`);
}
testGoogle();
