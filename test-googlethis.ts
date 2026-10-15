import google from 'googlethis';
async function run() {
  const images = await google.image('cyberpunk neon city wallpaper', { safe: false });
  console.log("googlethis images:", images.slice(0, 3));
}
run();
