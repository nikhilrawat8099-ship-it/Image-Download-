import gis from 'g-i-s';

gis('cyberpunk city wallpaper', (error, results) => {
  if (error) {
    console.log("g-i-s error:", error);
  } else {
    console.log("g-i-s results:", results.slice(0, 3));
  }
});
