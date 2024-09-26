import { handler } from "./lambda";

handler().then(f => console.log(JSON.parse(f.body))
)