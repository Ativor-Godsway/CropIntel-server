/**
 * Wraps an async route handler so that any thrown error is forwarded to next().
 * Eliminates the need for try/catch boilerplate in every controller.
 */
const catchAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);

module.exports = catchAsync;
