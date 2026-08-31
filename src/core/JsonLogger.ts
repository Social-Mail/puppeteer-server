export const JsonLogger = {
    log(item) {
        console.log(JSON.stringify(item));
    },
    logError(error, extra = void 0) {
        console.log(JSON.stringify({
            ... (extra || {}),
            error: error.stack ?? error,
            cause: error.cause?.stack ?? error.cause?.toString(),
        }))
    }
}