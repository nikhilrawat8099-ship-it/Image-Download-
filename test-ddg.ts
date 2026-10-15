import { image_search } from 'duckduckgo-images-api';
image_search({ query: "new latest pictures", moderate: true }).then((results: any) => {
    console.log(results.slice(0, 2));
}).catch((e: any) => console.error(e));
