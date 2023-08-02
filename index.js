require("express-async-errors");
const express = require('express');
const app = express();
const config = require('config');
require('dotenv').config()


app.set('view engine', 'pug');
app.set('views', './views');

require('./app/Providers/DataBaseServiceProvider');
require('./app/Providers/MailServiceProvider')(app);

require('./app/Http/Middleware/Cors')(app);

process.on("uncaughtException", (ex) => {
    throw ex;
});
process.on("unhandledRejection", (ex) => {
    throw ex;
});

app.use(express.json());

app.use(express.urlencoded({extended: true}));

app.use(express.static('public'));

app.use(config.get("api.prefix"), require(config.get('api.route')));
app.use(config.get('web.prefix'), require(config.get('web.route')));
app.use(config.get('telegram.prefix'), require(config.get('telegram.route')));


app.use(require("./app/Http/Middleware/errorMiddleware"));

app.listen(process.env.APP_PORT, function () {
    console.log(`Listening on port ${process.env.APP_PORT}...`);
});

require('./routes/queue').set_mailer(app);
