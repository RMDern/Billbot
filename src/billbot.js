/*
 *  billbot.js 
 *
 *  @author:     Ryan Dern
 *  @mailto:     <rdern@pm.me>
 *  @repo:       https://github.com/RMDern/Billbot 
 *  @production: https://twitter.com/BotCongress
 */

console.log('@NODE_ENV = ' + process.env.NODE_ENV + ' >> BILLBOT: Running...\n');

if (process.env.NODE_ENV  !==  'production') {
    require('dotenv-safe').config();
}
const { JSDOM }       = require('jsdom');
const jQuery          = require('jquery');
const twit            = require('twit');
const googleTrends    = require('google-trends-api');
const { BitlyClient } = require('bitly');

// Set up JSDOM window and document (required for jQuery usage in Node)
const { window }   = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document    = document;

const twitConfig = {
    consumer_key:        process.env.TWITTER_CONSUMER_KEY,
    consumer_secret:     process.env.TWITTER_CONSUMER_SECRET,
    access_token:        process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
};

const T     = new twit(twitConfig);
const $     = new jQuery(window);
const bitly = new BitlyClient(process.env.BITLY_ACCESS_TOKEN);

const MAX_TWEET_LENGTH = 277;
let oldBills = [], newBills = [];
setTimeout(main, 1000);


function main() {
    if (newBills.length == 0) {
        getBills();
    }
    else {
        oldBills.length = 0;
        for (let bill of newBills) {
            oldBills.push(bill);
        }
        newBills.length = 0;
        getBills();
    }
}


function getBills() {
   /* Returns JSON object of the form:
    *   results:   [{ Bill Object }, 
    *               { Bill Object },
    *               { Bill Object }...]  <--Array of 20 most recently updated bills
    *  **Bill details can be found at:
    *  https://projects.propublica.org/api-docs/congress-api/bills/#get-recent-bills
    */ 
    $.ajax({
        url: 'https://api.propublica.org/congress/v1/115/both/bills/updated.json',
        type:     'GET',
        dataType: 'json',
        headers: {'X-API-Key': process.env.CONGRESS_API_KEY}
    }).done(onBillsReceived);
}


function onBillsReceived(jsonData) {
    let billObject;
    for (let b of jsonData.results[0].bills) {
        billObject = {
            bill:  JSON.stringify(b),
            score: 0
        };
        newBills.push(billObject);
    }
    
    sortBillsByRelevance();
}


function sortBillsByRelevance() {
    let promises = [];

    for (let bill of newBills) {
        promises.push(setRelevanceScore(bill));
    }

    Promise.all(promises)
    .then((results) => {
        console.log(results);

        newBills.sort((a, b) => {
            return a.score - b.score; // Ascending
        });

        onBillsReady();
    })
    .catch((err) => {
        console.error('An error occurred when setting a bill\'s relevance score.\n' + err);
    });
}


function setRelevanceScore(toBeScored) {
    return new Promise((resolve, reject) => {
        let billRef     = JSON.parse(toBeScored.bill);
        let searchTerm  = billRef.primary_subject;
        let oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        // Google Trends will break if the keyword is empty,
        // so let's try 'committees' as a fallback.
        if (!searchTerm) {  
            searchTerm = billRef.committees; 
            if (!searchTerm) {
                resolve(0); // Bill was unable to be scored, set score to 0.
                return;
            }
        }

        let query = {
            keyword:   searchTerm, // REQUIRED
            startTime: oneMonthAgo,
            geo:       'US',
            property:  'news'
        };
      
        googleTrends.interestOverTime(query)
        .then((results) => {
            let score = 0;
            let jsonData = JSON.parse(results);

            for (let entry of jsonData.default.timelineData) {
                score += entry.value[0];
            }

            toBeScored.score = score;
            resolve(score);
        })
        .catch((err) => {
            console.error('Google Trends >> ' + err + '\nRequest Body: ' + err.requestBody);
            reject(err);
        });
    });
}


function onBillsReady() {
    setTimeout(main, 1000*60*60*12); // Get new bills in 12 hours
    setTimeout(postTweet, 1000);
}


function postTweet(key) {
    if (newBills.length == 0) {
        return;
    }

    let billObject = newBills.pop();
    let parsedBill = JSON.parse(billObject.bill);
    let url        = parsedBill.govtrack_url;
    
    let tweet = {
        status: ''
    };
    
    bitly.shorten(url)
    .then((result) => {
        url = result.url;
        tweet.status = 'New action taken on ' + parsedBill.latest_major_action_date + ': ' + 
                        parsedBill.latest_major_action + ' | ' + parsedBill.short_title + ' | ' + url;

        if (tweet.status.length > MAX_TWEET_LENGTH) {
            tweet.status = trimTweet(tweet.status);
        }

        T.post('statuses/update', tweet, onTweetPosted);
    })
    .catch((err) => {
        console.error(err);
    });
}


function trimTweet(tweet) {
    let ret = tweet;

    // Trim from the end of sometimes lengthy 'bill summary' which is between two '|' chars
    let prepend = ret.slice(0, ret.indexOf('|') + 1);
    let summary = ret.slice(ret.indexOf('|') + 1, ret.lastIndexOf('|'));
    let append  = ret.slice(ret.lastIndexOf('|') - 1 , ret.length);

    while (ret.length > MAX_TWEET_LENGTH) {
        summary = summary.slice(0, -1);
        ret     = prepend + summary + append;
    }

    return ret;
}


function onTweetPosted(err, data) {
    if (err) {
        console.error('An error occurred when posting a tweet.\n', err);
    } 
    else {
        console.log(data);
        setTimeout(postTweet, 1000*60*60); //  Tweet again in 1 hour
    }
}
