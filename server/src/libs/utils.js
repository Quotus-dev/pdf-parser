class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode || 500;
    this.status =
      (statusCode && String(statusCode)[0] === "4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

exports.removeNewlinesFromTable = (tables) => {
  // Iterate through the outer array (tables)
  for (let i = 0; i < tables.length; i++) {
    // Iterate through the inner subarray
    for (let j = 0; j < tables[i].length; j++) {
      // Replace newline characters ("\n") with an empty string
      tables[i][j] = tables[i][j].replace(/\n/g, '');
    }
  }
  return tables;
}

module.exports.AppError = AppError
module.exports.catchAsync = catchAsync