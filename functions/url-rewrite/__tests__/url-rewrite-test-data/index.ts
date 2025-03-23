import { mapRawData } from "./utility";

import { configSigningDisabled } from "./kvs-configs";

import { concatMergeTestRawData } from "./mergeTestRawData_concat";
import { concatGlobalMergeTestRawData } from "./mergeTestRawData_concatGlobal";
import { mergeMergeTestRawData } from "./mergeTestRawData_merge";
import { overwriteMergeTestRawData } from "./mergeTestRawData_overwrite";
import { metaOptionRawData } from "./singleOptionRawData_meta";
import { stdOptionRawData } from "./singleOptionRawData_std";

export { signingTestData } from "./signingTestData";

// merge option tests
export const overwriteMergeTestData = mapRawData(overwriteMergeTestRawData, configSigningDisabled);
export const mergeMergeTestData = mapRawData(mergeMergeTestRawData, configSigningDisabled);
export const concatMergeTestData = mapRawData(concatMergeTestRawData, configSigningDisabled);
export const concatGlobalMergeTestData = mapRawData(concatGlobalMergeTestRawData, configSigningDisabled);

// single option tests
export const metaOptionTestData = mapRawData(metaOptionRawData, configSigningDisabled);
export const stdOptionTestData = mapRawData(stdOptionRawData, configSigningDisabled);
