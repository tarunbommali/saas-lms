/* eslint-disable no-unused-vars */
/* eslint-disable no-console */

export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

export const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);

    console.error('SERVER ERROR:', err.message, err.stack);

    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
        error: process.env.NODE_ENV === 'production' ? null : err
    });
};
