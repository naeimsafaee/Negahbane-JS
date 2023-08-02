const ping = require('ping');
const config = require('config');
const moment = require('moment');
const request = require('request');

const Log = require('../app/Models/Log');
const ConnectedAccount = require('../app/Models/ConnectedAccount');
const TelegramModel = require('../app/Models/TelegramModel');

let queue = [];

let mailer;

class Queue {

    constructor() {
        console.log('queue created.');
        if (typeof this.interval === "undefined") {
            this.interval = setInterval(run, config.get("constants.delay_time") * 60 * 1000);
        }
    }

    clear() {
        clearInterval(this.interval);
    }

    push(param) {
        queue.push(param);
        console.log(`queue length changed, it is ${queue.length} now`);
    }

    set_mailer(app) {
        mailer = app.mailer;
    }

}

async function run() {
    console.log('queue is running....');

    await ConnectedAccount.remove({
        $and: [
            {"client_id": {$exists: false}},
            {"send_what": "Telegram"}
        ]
    });

    request({
        url: config.get('laravel_app_url') + "api/all_monitor",
        method: 'GET',
    }, async function (error, response, body) {

        if (!error && response.statusCode === 200) {

            body = JSON.parse(body);

            queue = body.data;

            console.log(`queue length is ${queue.length}`);

            for (const host of queue) {
                if (host.type === config.get('constants.types.ping')) {
                    get_ping(host);
                } else {
                    let url = host.destination;

                    if (url.search("https://") < 0 && url.search("http://") < 0)
                        url = "http://" + url;

                    try {
                        const response = await makeHTTPRequest(url, host.id, host.client_id, host);
                        console.log(`${url} status code is : ${response}`);
                    } catch (error) {
                        console.log(`${url} error message is : ${error}`);
                    }

                }

            }

        } else {
            console.log(`error while getting monitors` + error);
        }
    });

}

const get_ping = (host) => {
    ping.promise.probe(host.destination)
        .then(
            async function (res) {
                console.log(host.destination + " ping is : " + res.time)

                let last_log = await Log.findOne({
                    monitor_id: {$eq: host.id}
                }).sort({created_at: "desc"});

                if (last_log && last_log.is_alive === false) {
                    await send_every_thing_positive(host.client_id, host);
                }

                let log = new Log(
                    {
                        monitor_id: host.id,
                        ping: res.time,
                        is_alive: res.alive,
                        status: 1
                    }
                ).save();

            }
        )
        .catch(
            async function (err) {
                console.log("ping error : " + err);

                let Logs = await Log.find({
                    monitor_id: {$eq: host.id}
                }).sort({created_at: "desc"});

                for (let i = 0; i < Logs.length; i++) {
                    const log = Logs[i];
                    if (log.is_alive && log.is_alive === true) {
                        if (i > 0) {
                            await send_every_thing(host.client_id, host, Logs[i - 1].created_at);
                            break;
                        }
                    }
                }


                let log = new Log(
                    {
                        monitor_id: host.id,
                        is_alive: false,
                        error: err,
                        ping: 0,
                        status: 0
                    }
                ).save();

            });
}

const makeHTTPRequest = (url, _id, client_id, host) => {
    return new Promise((resolve, reject) => {

        var start = Date.now();

        request({
            url: url,
            method: 'GET',
            port: 80,
            // timeout: config.get('constants.timeout')
        }, async function (error, response, body) {

            if (!error && response.statusCode === 200) {

                resolve(response.statusCode);

                let last_log = await Log.findOne({
                    monitor_id: {$eq: host.id}
                }).sort({created_at: "desc"});

                if (last_log && last_log.is_alive === false) {
                    await send_every_thing_positive(host.client_id, host);
                }

                let log = new Log(
                    {
                        monitor_id: _id,
                        status_code: response.statusCode,
                        is_alive: true,
                        ping: Date.now() - start,
                        status: 1
                    }
                ).save();

            } else {
                await send_every_thing(client_id, host);

                reject(error);
                // console.error("error" , error);

                let erro = "";

                if (error !== null && error.code !== null) {
                    if (error.code !== 'ENOTFOUND')
                        console.log("ENOTFOUND" + error.code);

                    if (error.code === 'ENOTFOUND')
                        erro = 404;
                    else if (typeof response === "undefined")
                        erro = 0
                    else
                        erro = response.statusCode;
                } else {
                    erro = 0
                }

                let log =  new Log(
                    {
                        monitor_id: _id,
                        is_alive: false,
                        status_code: erro,
                        error: error,
                        ping: 0,
                        status: 0
                    }
                ).save();
            }
        });


    })
}

const send_every_thing = async (client_id, host, down_until) => {

    const connected_accounts = await ConnectedAccount.find({client_id: client_id});

    for (const connected_account of connected_accounts) {

        const message = `🔴
service: ${host.name}
address: ${host.destination}
down until: ${moment(down_until).format('YYYY-MMM-DD hh:mm')}`.toString();


        if (connected_account.send_what === "Email") {
            /*mailer.send('email', {
                to: 'naeimsafaee1412@gmail.com',
                subject: 'Warning Email'
            }, function (err) {
                if (err) {
                    console.log("email : " + err);
                    return;
                }
                console.log('Email Sent');
            });*/
            request({
                url: config.get('laravel_app_url') + "api/send_email",
                method: 'POST',
                port: 80,
                form: {
                    email: connected_account.send_to,
                    message: message,
                    type: 0,
                }
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    console.log("Email sent");
                } else {
                    console.log("Email error : " + body + "------" + error);
                }
            });

        }
        else if (connected_account.send_what === "Telegram") {

            new TelegramModel().send_message(message, connected_account.send_to);

        }
        else if (connected_account.send_what === "Sms") {

            request({
                url: config.get('laravel_app_url') + "api/send_sms",
                method: 'POST',
                form: {
                    receptor: connected_account.send_to,
                    message: message,
                }
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    console.log("sms sent");
                } else {
                    console.log("sms error : " + body + "------" + error);
                }
            });

            /*let last_log = await Log.find({
                monitor_id: {$eq: host.id}
            }).sort({created_at: "desc"});
*/
            // console.log("last_log is " + last_log);

            /*if (last_log.length < 2) {
                console.log("token ::::::::::::::::::" + process.env.KAVENEGAR_API);
                console.log("to ::::::::::::::::::" + connected_account.send_to);

                request({
                    url: "https://api.kavenegar.com/v1/" + process.env.KAVENEGAR_API + "/sms/send.json",
                    method: 'POST',
                    port: 80,
                    form: {
                        receptor: connected_account.send_to,
                        message: message,
                    }
                }, function (error, response, body) {
                    if (!error && response.statusCode === 200) {
                        console.log("Sms sent");
                    } else {
                        console.log("Sms : " + body + "------" + error);
                    }
                });

            } else {
                if (last_log[1].is_alive !== false) {
                    console.log("sending sms  to " + connected_account.send_to);

                    request({
                        url: "https://api.kavenegar.com/v1/" + process.env.KAVENEGAR_API + "/sms/send.json",
                        method: 'POST',
                        port: 80,
                        form: {
                            receptor: connected_account.send_to,
                            message: message,
                        }
                    }, function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            console.log("Sms sent");
                        } else {
                            console.log("Sms : " + body);
                        }
                    });
                }
            }*/

        }
    }

}

const send_every_thing_positive = async (client_id, host) => {

    const back_online_message = `🟢
service: ${host.name}
address: ${host.destination}
back online`;

    const connected_accounts = await ConnectedAccount.find({client_id: client_id});

    console.log("connected" + host.destination);

    for (const connected_account of connected_accounts) {

        if (connected_account.send_what === "Telegram") {
            new TelegramModel().send_message(back_online_message, connected_account.send_to);
        }
        else if (connected_account.send_what === "Sms") {

            request({
                url: config.get('laravel_app_url') + "api/send_sms",
                method: 'POST',
                form: {
                    receptor: connected_account.send_to,
                    message: back_online_message,
                }
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    console.log("sms sent");
                } else {
                    console.log("sms error : " + body + "------" + error);
                }
            });

            /*let last_log = await Log.findOne({
                monitor_id: {$eq: host.id}
            }).sort({created_at: "desc"});

            if (!last_log) {

                request({
                    url: "https://api.kavenegar.com/v1/" + process.env.KAVENEGAR_API + "/sms/send.json",
                    method: 'POST',
                    port: 80,
                    form: {
                        receptor: connected_account.send_to,
                        message: back_online_message,
                    }
                }, function (error, response, body) {
                    if (!error && response.statusCode === 200) {
                        console.log("Sms sent");
                    } else {
                        console.log("Sms : " + body);
                    }
                });

            } else {
                console.log("last_log is " + last_log);

                if (last_log.is_alive === false) {
                    console.log("sending sms  to " + connected_account.send_to);

                    request({
                        url: "https://api.kavenegar.com/v1/" + process.env.KAVENEGAR_API + "/sms/send.json",
                        method: 'POST',
                        port: 80,
                        form: {
                            receptor: connected_account.send_to,
                            message: back_online_message,
                        }
                    }, function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            console.log("Sms sent");
                        } else {
                            console.log("Sms : " + body);
                        }
                    });
                } else {
                    console.log("sending sms  tosasdasadads ");
                }
            }*/
        }
        else if (connected_account.send_what === "Email") {
            request({
                url: config.get('laravel_app_url') + "api/send_email",
                method: 'POST',
                port: 80,
                form: {
                    email: connected_account.send_to,
                    message: back_online_message,
                    type: 1,
                }
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    console.log("Email sent");
                } else {
                    console.log("Email error : " + body + "------" + error);
                }
            });

        }
    }

}


module.exports = new Queue();
