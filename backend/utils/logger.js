// Simple logger wrapper. Can be replaced with Winston/Bunyan later.
const logger = {
    info: (message, meta = {}) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [INFO]: ${message}`, Object.keys(meta).length ? meta : '');
    },
    error: (message, meta = {}) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [ERROR]: ${message}`, Object.keys(meta).length ? meta : '');
    },
    warn: (message, meta = {}) => {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] [WARN]: ${message}`, Object.keys(meta).length ? meta : '');
    },
    debug: (message, meta = {}) => {
        if (process.env.NODE_ENV === 'development') {
            const timestamp = new Date().toISOString();
            console.debug(`[${timestamp}] [DEBUG]: ${message}`, Object.keys(meta).length ? meta : '');
        }
    }
};

export default logger;
