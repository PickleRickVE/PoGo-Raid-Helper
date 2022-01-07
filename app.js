// imports
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
const schedule = require('node-schedule');
const axios = require('axios');
const fs = require('fs');

// config
const config = require('./config')
const port = config.port;
const botToken = config.botToken;
const de = require('./lang/de');

// global variables
let lang = de;
let raids = {};
let bossList = {};
let listMsgId = {};

// read and process raids from channels
app.post('/webhook', function(request, response) {
    const { body } = request;
    fs.writeFile(config.logFile, '------------------------\n'/* + JSON.stringify(body, null, 4) + '\n'*/, {flag: 'a'}, error => {if (error) {console.log(error)}});
    let exitus = Math.round(Date.now()/1000);
    let logTime = new Date();
    let h = logTime.getHours()<10 ? '0' + logTime.getHours() : logTime.getHours();
    let m = logTime.getMinutes()<10 ? '0' + logTime.getMinutes() : logTime.getMinutes();
    let s = logTime.getSeconds()<10 ? '0' + logTime.getSeconds() : logTime.getSeconds();
    let time = h + ':' + m + ':' + s;
    let text;
    let sumTrigger;
    let msgScheme;
    let gymTeam;
    let schemeType;
    let firstRow;

    if (body.channel_post != undefined && body.channel_post.text != undefined && body.channel_post.date > (exitus - 60)) {
        text = body.channel_post.text;
        sumTrigger = text.substring(3, 16);
        if (text.charAt(0) == '/') {
            // catch commands
            let cmdTrigger = text.substring(1,text.length);
            fs.writeFile(config.logFile, time  + ' | ' + body.channel_post.chat.username + ' | cmd triggered: ' + cmdTrigger + '\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
            switch(cmdTrigger) {
                case 'start':
                    cmdStart(body.channel_post.chat.id);
                    break;
                case 'help':
                    cmdHelp(body.channel_post.chat.id);
                    break;
                default:
                    console.log(time  + ' | ' + body.channel_post.chat.username + ' | no matching cmd')
            }
        }
        if (text.includes('❄️') || text.includes('💙')) {
            msgScheme = 'mypgobot';
            gymTeam = 'blue';
        } else if (text.includes('🔥') || text.includes('❤️')) {
            msgScheme = 'mypgobot';
            gymTeam = 'red';
        } else if (text.includes('⚡️') || text.includes('💛')) {
            msgScheme = 'mypgobot';
            gymTeam = 'yellow';
        } else {
            msgScheme = 'pa';
        }
        if (msgScheme == 'mypgobot') {
            firstRow = text.slice(0, text.indexOf('\n'));
            if (firstRow.includes('🌟') && firstRow.includes('(Mega)')) {
                schemeType = 'standard_mega';
            } else if (firstRow.includes('🌟')) {
                schemeType = 'standard';
            } else if ((firstRow.includes('1️⃣') || firstRow.includes('3️⃣') || firstRow.includes('5️⃣') || firstRow.includes('6️⃣')) && firstRow.includes('°')) {
                schemeType = 'digit_loc';
            } else if (firstRow.includes('1️⃣') || firstRow.includes('3️⃣') || firstRow.includes('5️⃣') || firstRow.includes('6️⃣')) {
                schemeType = 'digit';
            }
        }
    }

    if (text != undefined && sumTrigger != lang.sumTitle && text.charAt(0) != '/') {   
        // variables
        let timeTrigger;
        let endtimeString;
        let bossTrigger;
        let bossName;
        let gymTrigger;

        // create and update arrays
        const channel = body.channel_post.chat.id;
        if (raids[channel] == undefined) {
            raids[channel] = [];
        }
        if (bossList[channel] == undefined) {
            bossList[channel] = [];
        }
        if (listMsgId[channel] == undefined) {
            listMsgId[channel] = '';
        }

        // determine raid boss
        switch(msgScheme) {
            case 'pa':
                bossTrigger = text.indexOf('\n')-1;
                bossName = text.slice(1, bossTrigger);
                break
            case 'mypgobot':
                switch (schemeType) {
                    case 'standard':
                        bossTrigger = firstRow.indexOf('🌟')-1;
                        bossName = firstRow.slice(0, bossTrigger);
                        break;
                    case 'standard_mega':
                        bossTrigger = firstRow.indexOf('🌟')-8;
                        bossName = firstRow.slice(0, bossTrigger);
                        break;
                    case 'digit_loc':
                        bossTrigger = firstRow.indexOf(' in ');
                        bossName = firstRow.slice(3, bossTrigger);
                        break;
                    case 'digit':
                        bossTrigger = firstRow.indexOf('\n')-1;
                        bossName = firstRow.slice(3, bossTrigger);
                }
        }
        if (bossList[channel].includes(bossName)) {
            //console.log('boss already in list')
        } else {
            bossList[channel].push(bossName);
            //console.log(time  + ' | ' + body.channel_post.chat.username + ' | boss added to list')
            fs.writeFile(config.logFile, time  + ' | ' + body.channel_post.chat.username + ' | boss added to list\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
        }

        // determine and convert end time
        switch(msgScheme) {
            case 'pa':
                timeTrigger = text.indexOf('⏱');
                endtimeString = text.slice(timeTrigger + 6, timeTrigger + 14);
                break
            case 'mypgobot':
                timeTrigger = text.indexOf('⏱');
                let rowEnd = text.indexOf('\n', timeTrigger);
                let row = text.slice(timeTrigger, rowEnd);
                if (row.includes(' - ')) {
                    endtimeString = text.slice(timeTrigger + 10, timeTrigger + 15) + ':00';
                } else {
                    endtimeString = text.slice(timeTrigger + 8, timeTrigger + 13) + ':00';
                }
        }
        let today = new Date();
        today = String(String(today.getMonth() + 1).padStart(2, '0') + '/' + today.getDate()).padStart(2, '0') + '/' + today.getFullYear();
        let endtime = new Date(today + ' ' + endtimeString);
        let endtimeUnix = bossName.includes('Raid Level') ? (Date.parse(endtime)/1000)-2850 : Date.parse(endtime)/1000;

        // determine gym
        switch(msgScheme) {
            case 'pa':
                gymTrigger = text.indexOf('📍');
                break
            case 'mypgobot':
                switch(gymTeam) {
                    case 'blue':
                        gymTrigger = text.includes('❄️') ? text.indexOf('❄️') : text.indexOf('💙');
                        break
                    case 'red':
                        gymTrigger = text.includes('🔥') ? text.indexOf('🔥') : text.indexOf('❤️');
                        break
                    case 'yellow':
                        gymTrigger = text.includes('⚡️') ? text.indexOf('⚡️') : text.indexOf('💛');
                }   
        }
        let gymTriggerEnd = text.indexOf('\n', gymTrigger);
        let gymName = (text.slice(gymTrigger + 3, gymTriggerEnd)).length > 26 ? (text.slice(gymTrigger + 3, gymTriggerEnd)).slice(0, 25) + '..' : text.slice(gymTrigger + 3, gymTriggerEnd);
        if (gymName.indexOf(' ') == 0) {
            gymName.slice(1, gymName.length);
        }

        // check list for expired raids an delete them
        let raidsCount = 0;
        raids[channel].forEach(function (item) {
            if (item.endtimeUnix < exitus) {
                let chatId = item.chatId;
                let msgId = item.msgId;
                let channelName = item.channelName;
                if (msgScheme == 'pa') {
                    delRaid(chatId, msgId, channelName)
                }
                raids[channel].splice(raidsCount, 1);
                //console.log(time  + ' | ' + item.channelName + ' | raid #' + msgId + ' deleted!')
                fs.writeFile(config.logFile, time  + ' | ' + item.channelName + ' | raid #' + msgId + ' deleted!\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
            }
            raidsCount++;
        });

        // add new raid to list
        let raid = {
            "msgId": body.channel_post.message_id,
            "chatId": body.channel_post.chat.id,
            "channelName": body.channel_post.chat.username, 
            "endtime": endtimeString,
            "endtimeUnix": endtimeUnix,
            "boss": bossName,
            "gym": gymName
        }
        if (endtimeUnix > exitus) {
            raids[raid.chatId].push(raid);
            updateRaidList(raid.chatId, raid.channelName)
        } else {
            updateRaidList(raid.chatId, raid.channelName)
        }
    }

    // catch summary message
    if (sumTrigger == lang.sumTitle) {
        listMsgId[body.channel_post.chat.id] = body.channel_post.message_id;
        //console.log(time  + ' | ' + body.channel_post.chat.username + ' | listMsgId updated with id: ' + listMsgId[body.channel_post.chat.id]);
    }

    response.status(200).end();
});

// delete summary
function updateRaidList(chatId, channelName) {
    let logTime = new Date();
    let h = logTime.getHours()<10 ? '0' + logTime.getHours() : logTime.getHours();
    let m = logTime.getMinutes()<10 ? '0' + logTime.getMinutes() : logTime.getMinutes();
    let s = logTime.getSeconds()<10 ? '0' + logTime.getSeconds() : logTime.getSeconds();
    let time = h + ':' + m + ':' + s;
    
    if (listMsgId[chatId] == '') {
        //console.log(time  + ' | ' + channelName + ' | no summary available')
        fs.writeFile(config.logFile, time  + ' | ' + channelName + ' | no summary available\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
        postRaidList(chatId, channelName);
        return
    } else {
        axios.get('https://api.telegram.org/bot' + botToken + '/deleteMessage?chat_id=' + chatId + '&message_id=' + listMsgId[chatId])
        .then(response => {
            //console.log(time  + ' | ' + channelName + ' | deleted old summary!');
            fs.writeFile(config.logFile, time  + ' | ' + channelName + ' | deleted old summary!\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
            postRaidList(chatId, channelName);
            return
        })
        .catch(error => {
            //console.log(time  + ' | ' + channelName + ' | summary couldn\'t be deleted');
            fs.writeFile(config.logFile, time  + ' | ' + channelName + ' | summary couldn\'t be deleted\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
            return
        });
    }
}

// update summary
async function postRaidList(chatId, channelName) {
    let logTime = new Date();
    let h = logTime.getHours()<10 ? '0' + logTime.getHours() : logTime.getHours();
    let m = logTime.getMinutes()<10 ? '0' + logTime.getMinutes() : logTime.getMinutes();
    let s = logTime.getSeconds()<10 ? '0' + logTime.getSeconds() : logTime.getSeconds();
    let time = h + ':' + m + ':' + s;
    
    // generate list and message
    let raidString = '<b>💥 ' + lang.sumTitle + ' 💥</b>\n';
    if (raids[chatId].length > 0 && bossList[chatId].length > 0) {   
        bossList[chatId].forEach(function (item) {
            let boss = item;
            let bossString = '';
            let bossCount = 0;
            let lv = '';
            if (lang.bossLevel1.includes(boss)) {
                lv = '🌟';
            } else if (lang.bossLevel3.includes(boss)) {
                lv = '🌟🌟🌟';
            } else if (lang.bossLevel5.includes(boss)) {
                lv = '🌟🌟🌟🌟🌟';
            } else if (lang.bossLevel6.includes(boss)) {
                lv = '(Mega)';
            }
            bossString += '<b>' + boss + ' ' + lv + '</b>\n';
            for (let i=0; i<(raids[chatId].length); i++) {
                let raid = raids[chatId][i];
                if (boss == raid.boss && raidString.length < 3950) {
                    bossString += '⌊ <a href="https://t.me/' + raid.channelName + '/' + raid.msgId + '">' + raid.gym + '</a> | bis ' + raid.endtime.slice(0, -3) + 'h\n';
                    bossCount++
                }
                
            }
            if (bossCount != 0) {
                raidString = raidString + bossString;
            }
        });
    }
    
    // send new summary
    if (raids[chatId].length > 0) {
        let response = await axios.get('https://api.telegram.org/bot' + botToken + '/sendMessage?chat_id=' + chatId + '&parse_mode=html&disable_web_page_preview=true&text=' + encodeURIComponent(raidString))
            .then(function(result) {
                console.log(time  + ' | ' + channelName + ' | summary updated with id #' + result.data.result.message_id);
                fs.writeFile(config.logFile, time  + ' | ' + channelName + ' | summary updated with id #' + result.data.result.message_id + '\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
                return result
            })
            .catch(error => {
                //console.log(time  + ' | ' + channelName + ' | summary couldn\'t be sent')
                fs.writeFile(config.logFile, time  + ' | ' + channelName + ' | error sending summary\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
            });
        listMsgId[chatId] = response.data.result.message_id;
    }
}

// delete a raid in telegram
function delRaid(chatId, msgId, channelName) {
    let logTime = new Date();
    let h = logTime.getHours()<10 ? '0' + logTime.getHours() : logTime.getHours();
    let m = logTime.getMinutes()<10 ? '0' + logTime.getMinutes() : logTime.getMinutes();
    let s = logTime.getSeconds()<10 ? '0' + logTime.getSeconds() : logTime.getSeconds();
    let time = h + ':' + m + ':' + s;
    axios.get('https://api.telegram.org/bot' + botToken + '/deleteMessage?chat_id=' + chatId + '&message_id=' + msgId)
    .then(response => {
        console.log(time  + ' | ' + channelName + ' | raid #' + msgId + ' deleted in channel');
        fs.writeFile(config.logFile, time  + ' | ' + channelName + ' | raid #' + msgId + ' deleted in channel\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
    })
    .catch(error => {
        console.log(time  + ' | ' + channelName + ' | error deleting raid at telegram');
        fs.writeFile(config.logFile, time  + ' | ' + channelName + ' | error deleting raid\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
    });
}

// daily clean up function
const cleaning = schedule.scheduleJob({hour: 21, minute: 31}, () => {
    let logTime = new Date();
    let h = logTime.getHours()<10 ? '0' + logTime.getHours() : logTime.getHours();
    let m = logTime.getMinutes()<10 ? '0' + logTime.getMinutes() : logTime.getMinutes();
    let s = logTime.getSeconds()<10 ? '0' + logTime.getSeconds() : logTime.getSeconds();
    let time = h + ':' + m + ':' + s;
    let keysList = Object.keys(listMsgId);
    for (let i=0; i<keysList.length; i++) {
        let chatId = keysList[i];
        let msgId = listMsgId[chatId];
        if (msgId == '') {            
            //console.log(time  + ' | ' + chatId + ' | no summary available')
            fs.writeFile(config.logFile, time  + ' | ' + chatId + ' | no summary available\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
        } else {
            axios.get('https://api.telegram.org/bot' + botToken + '/deleteMessage?chat_id=' + chatId + '&message_id=' + msgId)
            .then(response => {
                console.log(time  + ' | channel' + chatId + ' ready for bed');
                fs.writeFile(config.logFile, time  + ' | ' + chatId + ' | deleted summary\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
            })
            .catch(error => {
                //console.log(time  + ' | ' + chatId + ' | summary couldn\'t be deleted');
                fs.writeFile(config.logFile, time  + ' | ' + chatId + ' | summary couldn\'t be deleted\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
            });
        }
    }
    let keysRaids = Object.keys(raids);
    for (let i=0; i<keysRaids.length; i++) {
        let chatId = keysRaids[i];
        raids[chatId].forEach(item => {
            axios.get('https://api.telegram.org/bot' + botToken + '/deleteMessage?chat_id=' + item.chatId + '&message_id=' + item.msgId)
            .then(response => {
                console.log(time  + ' | ' + item.channelName + ' | raid #' + item.msgId + ' deleted in channel');
                fs.writeFile(config.logFile, time  + ' | ' + item.channelName + ' | raid #' + item.msgId + ' deleted in channel\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
            })
            .catch(error => {
                console.log(time  + ' | ' + item.channelName + ' | error deleting raid at telegram');
                fs.writeFile(config.logFile, time  + ' | ' + item.channelName + ' | error deleting raid\n', {flag: 'a'}, error => {if (error) {console.log(error)}});
            });
        });
    }
    raids = {};
    listMsgId = {};
    bossList = {};
    console.log(time  + ' | scheduled cleanup done - good night!');
});

// commands
function cmdStart(chatId) {
    let cmdString = lang.start;
    axios.get('https://api.telegram.org/bot' + botToken + '/sendMessage?chat_id=' + chatId + '&parse_mode=html&disable_web_page_preview=true&text=' + encodeURIComponent(cmdString))
}
function cmdHelp(chatId) {
    let cmdString = lang.help;
    axios.get('https://api.telegram.org/bot' + botToken + '/sendMessage?chat_id=' + chatId + '&parse_mode=html&disable_web_page_preview=true&text=' + encodeURIComponent(cmdString))
}

// Dienst initialisieren
app.listen(port, () => {
    console.log(`PoGo Raid Helper is listening at http://localhost:${port}`);
});
