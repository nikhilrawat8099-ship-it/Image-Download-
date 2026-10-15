import { search } from "google-sr";

search({ query: "new latest pictures", safe: true } as any).then((results: any) => {
    console.log(results);
}).catch((e: any) => console.error(e));
