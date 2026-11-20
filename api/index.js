let app;
let initError = null;

try {
  app = require('../server/app');
} catch (err) {
  initError = err;
  console.error("Initialization error in api/index.js:", err);
}

module.exports = (req, res) => {
  if (initError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: "Init Error",
      message: initError.message,
      stack: initError.stack
    }));
  }
  return app(req, res);
};
