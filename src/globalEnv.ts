const globalEnv = {

    debug: /yes|true/i.test(process.env.DEBUG),
};

export default globalEnv;