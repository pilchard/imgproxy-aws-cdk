import { mapRawData } from "./utility";

import { configSigningDisabled } from "./kvs-configs";

import { metaOptionRawData } from "./singleOptionRawData_meta";
import { stdOptionRawData } from "./singleOptionRawData_std";

export { signingTestData } from "./signingTestData";
export { targetFormatTestData } from "./targetFormatTestData";

// single option tests
export const metaOptionTestData = mapRawData(metaOptionRawData, configSigningDisabled);
export const stdOptionTestData = mapRawData(stdOptionRawData, configSigningDisabled);
