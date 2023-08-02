const Joi = require('joi');
const express = require('express');
const router = express.Router();
const ConnectedAccount = require('../../Models/ConnectedAccount');
const TelegramModel = require('../../Models/TelegramModel');

router.post('/notify', async (req, res) => {
    const {error} = Joi.object({
        send_to: Joi.string(),
        type: Joi.string().required().valid('Telegram', 'Email', "Sms"),
        code: Joi.string(),
        client_id: Joi.number().required(),
    }).validate(req.body);


    if (error)
        return res.status(400).send(error.details[0].message);

    if (req.body.type === "Telegram") {

        if (!req.body.code)
            return res.status(400).send("کد تلگرام را وارد نمایید");

        let connected_account = await ConnectedAccount.findOne({
            "code": {
                $eq: req.body.code
            },
            "send_what": {
                $eq: "Telegram"
            }
        });

        if (!connected_account)
            return res.status(400).send("کد معتبر نیست");

        connected_account.client_id = req.body.client_id;
        connected_account.save().then(function () {

            const _TelegramModel = new TelegramModel(req.body);

            _TelegramModel.send_message(`نگهبانه شما با موفقیت متصل شد.`, connected_account.send_to);

            return res.send("ok");
        }).catch(function (err) {
            return res.send(err);
        });
    }

    if (req.body.type === "Sms") {

        let connected_account = await ConnectedAccount.findOne({
            "client_id": {
                $eq: req.body.client_id
            },
            "send_what": {
                $eq: req.body.type
            }
        });

        if (!connected_account) {
            new ConnectedAccount({
                client_id: req.body.client_id,
                send_to: req.body.send_to,
                send_what: req.body.type
            }).save().then(function () {
                return res.send("ok");
            });
        } else {
            if (req.body.send_to) {
                connected_account.send_to = req.body.send_to;
                connected_account.save().then(function () {
                    return res.send("ok");
                });
            } else {
                connected_account.remove().then(function () {
                    return res.send("ok");
                });
            }

        }

    }

    if (req.body.type === "Email") {

        let connected_account = await ConnectedAccount.findOne({
            "client_id": {
                $eq: req.body.client_id
            },
            "send_what": {
                $eq: req.body.type
            }
        });

        if (!connected_account) {
            new ConnectedAccount({
                client_id: req.body.client_id,
                send_to: req.body.send_to,
                send_what: req.body.type
            }).save().then(function () {
                return res.send("ok");
            });
        } else {
            if (req.body.send_to) {
                connected_account.send_to = req.body.send_to;
                connected_account.save().then(function () {
                    return res.send("ok");
                });
            } else {
                connected_account.remove().then(function () {
                    return res.send("ok");
                });
            }

        }

    }


});

router.get('/:client_id', async (req, res) => {

    let connected_account = await ConnectedAccount.find({
        "client_id": req.params.client_id
    });

    let connected_account_1 = await ConnectedAccount.find();

    return res.send({connected_account, connected_account_1});
});

router.delete('/remove_amin', async (req, res) => {

    let connected_account = await ConnectedAccount.remove({
        "client_id": 7
    });

    return res.send(connected_account);
});


module.exports = router;