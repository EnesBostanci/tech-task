import "dotenv/config";

import { runIngest } from "@/server/ingest";

async function main() {
    const result = await runIngest();
    console.log(`Ingest for ${result.day}`);
    console.log(JSON.stringify(result, null, 2));

    if (result.failures.length > 0) {
        process.exit(1);
    }

    process.exit(0);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
