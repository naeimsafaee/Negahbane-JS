const config = require('config');
const mongoose = require('mongoose');


class DataBaseServiceProvider {

    constructor() {

        if (config.get('database.driver') === "mongodb") {
            mongoose.connect(`mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}`, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                family: 4,
                ssl: true
            }).then(() => console.log("Connected to MongoDB.")).catch(function (err) {
                console.log(err);
            });
        }

    }


}


module.exports = new DataBaseServiceProvider();