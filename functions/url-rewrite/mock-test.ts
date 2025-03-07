import cf, { key_value_store } from "cloudfront";

const handle = cf.kvs();

try {
	const kvsResponse = await handle.get("config", { format: "json" });
	console.log(kvsResponse);
} catch (err) {
	console.log(new Error("Failed to retrieve value from key value store"));
}

key_value_store.config = JSON.stringify("sldfa");
console.log(handle.get("config", { format: "json" }));
