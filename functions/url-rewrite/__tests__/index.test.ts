import { describe, expect, test } from "@jest/globals";
import { handler } from "../index";

import { event1 } from "../__mocks__/test-events";

describe("url-rewrite cloudfront function", () => {
	test("valid signed uri", async () => {
		const reqres = await handler(event1);

		// should return request
		expect("uri" in reqres).toBe(true);

		if ("uri" in reqres) {
			// should accurately rewrite URI
			expect(reqres.uri).toBe(
				"/uCscSk36vAyo8Qd5ZGdtd9ZsKzjEPD1uXf0PpmCXiIg/rt:fill/h:100/el:0/pr:tall/pr:wide/w:30/g:ce/pr:cat/czM6Ly9pbWdwcm94eS1pbWFnZS1idWNrZXQvMjAyNDEyMTctRFNDXzA4MjlfY2xvc2UtY3JvcF9iLXcucG5n",
			);
		}
	});

	// +
	// should accept any value if key/salt empty
	// should correclty sort options
	// should correctly expand meta-opitons
	// should maintain `preset` option order
	// should use the shorthand option name for all options

	// -
	// should
});
