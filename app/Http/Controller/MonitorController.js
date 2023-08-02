const Joi = require('joi');
const config = require('config');
const express = require('express');
const moment = require('moment');
const router = express.Router();
const Log = require('../../Models/Log');

router.get('/:monitor_id', async (req, res) => {

    const monitor_id = req.params.monitor_id;

    const _24_hour =
        await Log.find({
                "created_at": {
                    $gt: new Date(Date.now() - 24 * 60 * 60 * 1000)
                },
                "monitor_id": {
                    $eq: monitor_id
                }
            }
        ).sort({created_at: "desc"}).limit(Math.min(48 , 24 * 60 / config.get('constants.delay_time')));

    const status_in_last_log =
        await Log.findOne({
                "monitor_id": {
                    $eq: monitor_id
                }
            }
        ).sort({created_at: "desc"});

    const last_down_time =
        await Log.findOne({
                "monitor_id": {
                    $eq: monitor_id
                },
                "is_alive": {
                    $eq: false
                },
            }
        ).sort({created_at: "desc"});

    const _30_day =
        await Log.find({
                "created_at": {
                    $gt: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000))
                },
                "monitor_id": {
                    $eq: monitor_id
                }
            }
        ).sort({created_at: "desc"});

    let average_7_day = 0;
    let all_7_day = 0;
    let average_30_day = 0;

    let _5_days = [];

    let average_ping_in_24 = 0;
    let average_ping_in_24_index = 0;

    for (let i = 0; i < _30_day.length; i++) {
        if (i <= 7 * (24 / config.get('constants.delay_time'))) {
            if (_30_day[i].is_alive)
                average_7_day++;
            all_7_day++;
        }

        if (_30_day[i].is_alive)
            average_30_day++;

        let ping = 0;

        if (_30_day[i].ping === "undefined" || typeof _30_day[i].ping === "undefined")
            ping = 0;
        else
            ping = _30_day[i].ping;

        if (ping !== "unknown")
            _5_days[i] = ping;
        else
            _5_days[i] = 0;

        if (i <= (24 / config.get('constants.delay_time'))) {
            if (ping !== "unknown" && ping !== null) {
                average_ping_in_24 += parseInt(ping);
                average_ping_in_24_index++;
            }
        }

    }

    average_7_day = average_7_day / all_7_day * 100;
    average_30_day = average_30_day / _30_day.length * 100;
    if(average_ping_in_24_index === 0){
        average_ping_in_24_index = 1;
    }
    average_ping_in_24 = average_ping_in_24 / average_ping_in_24_index;

    const down_times = await Log.find({
        "is_alive": {
            $eq: false
        },
        "monitor_id": {
            $eq: monitor_id
        }
    }).sort({created_at: "desc"}).limit(5);

    return res.send({
        _24_hour: _24_hour,
        status_in_last_log: status_in_last_log,
        last_down_time: last_down_time,
        average_7_day: average_7_day.toFixed(2),
        average_30_day: average_30_day.toFixed(2),
        _5_days: _5_days,
        down_times: down_times,
        average_ping_in_24: average_ping_in_24.toFixed(2)
    });
});

router.get('/status/:monitor_id', async (req, res) => {

    const monitor_id = req.params.monitor_id;

    await Log.remove( { created_at : {"$lt" : moment().subtract(3, 'months').format('YYYY-MM-DD') } })

    const last_log =
        await Log.findOne({
                "monitor_id": {
                    $eq: monitor_id
                }
            }
        ).sort({created_at: "desc"}).limit(1);

    const down_times =
        await Log.find({
                "monitor_id": {
                    $eq: monitor_id
                },
                "is_alive": {
                    $eq: false
                }
            }
        );


    return res.send({
        "last_log": last_log,
        "down_times": down_times,
    });
});

module.exports = router;