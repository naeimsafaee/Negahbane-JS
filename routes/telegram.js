const express = require('express');
const router = express.Router();
const config = require('config');
const request = require('request');
const TelegramModel = require('../app/Models/TelegramModel');
const ConnectedAccount = require('../app/Models/ConnectedAccount');

const url = config.get("telegram.url") + config.get("telegram.token") + "/";

router.get('/setWebhook', async (req, res) => {

    request({
        url: url + "setWebhook?url=" + process.env.APP_URL + config.get("telegram.prefix"),
        method: 'GET',
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            return res.send("body : " + body);
        } else {
            return res.send("error : " + body);
        }
    });

});

router.post("/" , async (req , res) => {

    const _TelegramModel = new TelegramModel(req.body);

    if(_TelegramModel.is_command() === "/connect") {

        let temp_connected_account = await ConnectedAccount.findOne( {
            "send_to": {
                $eq: _TelegramModel.get_chat_id()
            } ,
            "send_what" : {
                $eq: "Telegram"
            }
        });

        if(temp_connected_account){
            _TelegramModel.send_message("شما قبلا نگهبان های خود را به این اکانت متصل کرده اید!");
        } else {

            const code = Math.floor(Math.random() * 10000) + 1000;

            await new ConnectedAccount({
                code : code,
                send_what : "Telegram",
                send_to : _TelegramModel.get_chat_id()
            }).save().then(() => {

                _TelegramModel.send_message(`کد شما ${code} است لطفا داخل سایت وارد کنید.`);

            });

        }
    } else if(_TelegramModel.is_command() === "/start"){
        _TelegramModel.send_message(`به نگهبانه سایت خوش آمدید.`);
    } else {
        console.log("not connect");
    }

    return res.send("ok");
});

module.exports = router;