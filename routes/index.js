var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  var pkg = require('../package.json');
  res.json({ app: `${pkg.name}`, version: `${pkg.version}` });
});

module.exports = router;
