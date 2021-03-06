let log = console.log;
let ping = require('ping');
let hosts = require('./Modules/OLT');
let err_map_cache = new Map();
let dingTalk = require('./Modules/dingtalk');
let Sequ_Module = require('./mysql/Modules/Sequ_Module');
let getTime = require('./Modules/getTime');
let hourNum = 0;

async function run() {
    hourNum++
    for (let i = 0; i < hosts.length; i++) {
        if (hosts[i].status) {
            let res = await ping.promise.probe(hosts[i].host, { timeout: 4, extra: ["-i 2"] })
            if (!res.alive) {
                hosts[i].status = false;
                console.log({ title: 'OLT脱管通报', text: `### OLT脱管通报\n ${hosts[i].oltName}(${hosts[i].host})` });
                await Sequ_Module.MOD.create({
                    id: new Date().getTime(),
                    name: hosts[i].oltName,
                    start_time: getTime(),
                    end_time: null
                });
                await dingTalk({ title: 'OLT脱管通报', text: `### OLT脱管通报\n ${hosts[i].oltName}(${hosts[i].host})` });
            }
        } else {
            let res_err = await ping.promise.probe(hosts[i].host, { timeout: 4, extra: ["-i 2"] });
            if (res_err.alive) {
                hosts[i].status = true;
                console.log({ title: "已恢复OLT:", text: `> ${oltName}(${host}) 已恢复` });
                Sequ_Module.MOD.update({ end_time: getTime() }, { where: { name: hosts[i].oltName, end_time: null } });
                await dingTalk({
                    title: "已恢复OLT:",
                    text: `> ${hosts[i].oltName}(${hosts[i].host}) 已恢复`
                });
            }
        }
    }

    await (async () => {
        // 整点刷新通报
        if (hourNum === 12) {
            hourNum = 0;
            let arr_err_olts = await Sequ_Module.MOD.findAll(//query failure olts.
                {
                    where: { end_time: null }
                }
            );
            console.log(arr_err_olts.length)
            if (arr_err_olts.length) {
                let err_olts = '';
                arr_err_olts.forEach(async function (x) {
                    err_olts += x.dataValues.name + '(故障开始时间' + x.dataValues.start_time + ')\n\r' + '> ';

                })
                err_olts = '> ' + err_olts;
                err_olts = err_olts.substring(0, err_olts.length - 2);
                await dingTalk({ title: '当前仍脱管OLT:', text: `### 当前仍脱管OLT:\n ${err_olts}` });
            }
        }
    })()

}

async function wait(time) {
    await run();
    setTimeout(() => {
        wait(time)
    }, time);
}
wait(5 * 60 * 1000);
