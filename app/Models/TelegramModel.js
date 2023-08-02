const config = require('config');
const mongoose = require('mongoose');
const request = require('request');


const url = config.get("telegram.url") + config.get("telegram.token") + "/";


module.exports = class TelegramModel {

    constructor(obj) {

        if(obj === false)
            return;
        for (var prop in obj) this[prop] = obj[prop];

        this.command_list = [
            "/start", "/connect"
        ];
    }

    get_update_id() {
        return this.update_id;
    }

    get_message() {
        return this.message;
    }

    get_chat_id() {
        return this.get_message().chat.id;
    }

    is_command() {
        if(typeof this.get_message() === "undefined")
            return false;
        return this.command_list.indexOf(this.get_message().text) > -1 ? this.get_message().text : false
    }

    send_message(text , to = this.get_chat_id()){
        request({
            url: encodeURI(url + `sendMessage?chat_id=${to}&text=${text}`),
            method: 'GET'
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                console.log("message sent!");
            } else {
                console.log(error);
            }
        });

    }

};