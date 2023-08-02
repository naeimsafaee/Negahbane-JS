const winston = require("winston");


// winston.add(new winston.transports.Http());

winston.add(new winston.transports.File({
    filename: "logfile.log"
}));

module.exports = function (err , req, res , next){
    winston.error(err.message  , err);

    res.status(500).send("Something failed." + err.message);
};