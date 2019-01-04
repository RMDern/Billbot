[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT) 
![](https://img.shields.io/github/repo-size/rmdern/billbot.svg) 
![](https://img.shields.io/npm/collaborators/billbot.svg)
[![](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/BotCongress)
# Billbot

Billbot is a [Twitter](https://twitter.com/BotCongress) bot created with Node.js and deployed to Heroku.

The bot provides followers with up-to-date information about actions taken on bills as they move through the United States congress. It uses data from Google Trends to prioritize the most relevant topics first.

The tweets include: Latest action date, action/bill short summary, and a link to the bill on [GovTrack](https://www.govtrack.us/).

The bill links are processed by the [Bitly API](https://dev.bitly.com/) prior to being tweeted, allowing interest statistics to be gathered.   

## Installation

Clone the repository or use [npm](https://www.npmjs.com/get-npm) to install:
```bash
npm install billbot
```

## Usage
In your terminal of choice, change your current working directory to the project's root and simply run the start script:
```bash
npm start
```

## Contributing
Refer to [CONTRIBUTING.md](https://github.com/RMDern/Billbot/blob/master/CONTRIBUTING.md)

## License
[MIT](https://github.com/RMDern/Billbot/blob/master/LICENSE)
