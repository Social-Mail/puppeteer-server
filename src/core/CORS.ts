export const CORS = {
    get allowAll() {
        return {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "*",
            "access-control-allow-headers": "*",
            "access-control-allow-credentials": "*",
            "access-control-max-age": "300"
        };
    }
};