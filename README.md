# PoGo Raid Helper
Telegram Bot for summaries and deleting of raids in combination with PokeAlarm and MyPGoBot
![pogo-raid-helper](assets/summary.png?raw=true)

### Prerequisites
* Git
* NodeJS, NPM
* Telegram Bot ('/newbot' in a chat with the Botfather)

### Installation 
* Clone the source `git clone https://github.com/PickleRickVE/PoGo-Raid-Helper.git`
* Run `npm install` to set up the project
* Copy config.js.example to config.js, edit the latter and add your bot-token
* Set a webhook for your bot in your browser: `https://api.telegram.org/bot<token>/setwebhook?url=<https://your-server:3000>` (a certificate is needed, take a look at this [guide](https://core.telegram.org/bots/webhooks))

### Running

* Run `npm start` (preferred in a tmux or screen session)
* Add your bot to one or more channels in Telegram

### Way of working
* The bot reads new raid messages posted to a channel by PokeAlarm and/or MyPGoBot and adds them to a summary (works with styles shown below)
* The summary will be deleted and reposted when a raid is added
* Raids will be deleted in summary and channel if expired
* Channels will be cleaned at 21:30h (local time)

### Possible Styles
![pogo-raid-helper](assets/raidstyle_1.png?raw=true)