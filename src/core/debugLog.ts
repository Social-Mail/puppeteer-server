import globalEnv from "../globalEnv.js";

const debugLog = globalEnv.debug
    ? console.log
    : void 0 as ((...a: any[]) => void);
export default debugLog;
