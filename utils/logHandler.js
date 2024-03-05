const logger = require('../utils/logger');

const loggerMiddleware = (req, res, next) => {
    const start = new Date();

    res.on('finish', () => {
        const end = new Date();
        const responseTime = end.getTime() - start.getTime();
        const code = res.statusCode;
        console.log({code})
        if (code < 400) {
            logger.info(`${req.method} ${req.url} ${code} ${responseTime}ms`);
        } else if (code < 600) {
            logger.error(`${req.method} ${req.url} ${code} ${responseTime}ms`);
        } else {
            logger.debug(`${req.method} ${req.url} ${code} ${responseTime}ms`);
        }
    });

    next();
};

module.exports = loggerMiddleware;
