export const isValidCFHandle = (handle) => /^[a-zA-Z0-9_-]{1,24}$/.test(handle);

export const validateHandleParam = (req, res, next, handle) => {
  if (!isValidCFHandle(handle)) {
    return res.status(400).json({ error: "Invalid Codeforces handle format" });
  }
  next();
};

export const validateDayParam = (req, res, next, dayStr) => {
  const day = parseInt(dayStr, 10);
  if (isNaN(day) || day < 0) {
    return res.status(400).json({ error: 'Day must be a positive integer.' });
  }
  next();
};
