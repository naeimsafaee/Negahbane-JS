const express = require('express');
const router = express.Router();


router.use('/monitor', require('../app/Http/Controller/MonitorController'));
router.use('/client', require('../app/Http/Controller/ClientController'));


module.exports = router;
