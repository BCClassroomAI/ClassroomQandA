/* Classroom Q&A Skill */

const Alexa = require('alexa-sdk');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.registerHandlers(handlers);
    alexa.dynamoDBTableName = "ClassroomQandA";
    alexa.execute();
};

/*
const fs = require("fs");
const util = require("util");

const writeFile = util.promisify(fs.writeFile);

writeFile("/tmp/test3.js", "console.log('Hello world with promisify!');")
  .then(() => console.log("file created successfully with promisify!"))

  .catch(error => console.log(error));

 */

const fs = require('fs');
const util = require("util");
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'credentials.json';

const readFile = util.promisify(fs.readFile);

async function loadFromSheets() {
// Load client secrets from a local file.
    let p = readFile('client_secret.json');
    let res = await p;
    let pAuth = authorize(JSON.parse(res));
    return pAuth;
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
async function authorize(credentials) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    let a = readFile(TOKEN_PATH);
    let token = await a;
    return new Promise((resolve, reject) => {
        oAuth2Client.setCredentials(JSON.parse(token));
        resolve(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return callback(err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * https://docs.google.com/spreadsheets/d/11ZmOmNRSh00YaKDXl13-_MMbeX6uDY2gLD0exVxL-14/edit#gid=0
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function getData(auth) {
    const sheets = google.sheets({version: 'v4', auth});

    let readDataParams = {
        spreadsheetId: '1f_zgHHi8ZbS6j0WsIQpbkcpvhNamT2V48GuLc0odyJ0',
        //range: sheetName,
        includeGridData: true
    };

    let p = sheets.spreadsheets.get(readDataParams);
    return p;

    //console.log(allQuestions["Sheet1"][0].tag);

    // let values = [
    //   ["Item", "Cost", "Stocked", "Ship Date"],
    //   ["Wheel", "$20.50", "4", "3/1/2016"],
    //   ["Door", "$15", "2", "3/15/2016"],
    //   ["Engine", "$100", "1", "30/20/2016"],
    //   ["Totals", "=SUM(B2:B4)", "=SUM(C2:C4)", "=MAX(D2:D4)"]
    // ];
    //
    // let body = {
    //   values: values
    // };
    //
    // let params1 = {
    //   spreadsheetId: "11ZmOmNRSh00YaKDXl13-_MMbeX6uDY2gLD0exVxL-14",
    //   range: sheetName,
    //   resource: body,
    //   valueInputOption: "USER_ENTERED"
    // };
    //
    // sheets.spreadsheets.values.update(params1)
    //   .then(data => {
    //     console.log("Success");
    //     console.log(data.toString());
    //   })
    //
    //   .catch(err => {
    //     console.log("Error");
    //     console.log(err.toString());
    //   })
}

function convertDayOfWeek(day) {
	let dayInitial;
	switch (day) {
		case 'Mon':
			dayInitial = 'M';
			break;
		case 'Tue':
			dayInitial = 'T';
			break;
		case 'Wed':
			dayInitial = 'W';
			break;
		case 'Thu':
			dayInitial = 'R';
			break;
		case 'Fri':
			dayInitial = 'F';
			break;
		case 'Sat':
			dayInitial = 'A';
			break;
		case 'Sun':
			dayInitial = 'U';
			break;
		default:
			break;
	}
	return dayInitial;
}

function convertTimeStamp(timeStamp) {
	let timeFraction;
	let timeList = timeStamp.split(':').map(time => parseInt(time));
	timeFraction = (timeList[0] * 3600 + timeList[1] * 60 + timeList[2]) / (3600 * 24);
	return timeFraction;
}

function checkSchedule(scheduleObj) {
    let dateTime = Date(Date.now());
    let dateTimeList = dateTime.split(' ');
    let dayOfWeek = convertDayOfWeek(dateTimeList[0]);
    let timeStamp = convertTimeStamp(dateTimeList[4]);
    let courseNumbers = Object.keys(scheduleObj);
    let gracePeriod = 300/(3600 * 24);

    for (let i = 0; i < courseNumbers.length; i++) {
        let sectionNumbers = Object.keys(scheduleObj[courseNumbers[i]]);
        for (let j = 0; j < sectionNumbers.length; j++) {
            let sectionObj = scheduleObj[courseNumbers[i]][sectionNumbers[j]];
            let DOWList = sectionObj[Object.keys(sectionObj)[0]].split();
            let start = sectionObj[Object.keys(sectionObj)[1]];
            let end = sectionObj[Object.keys(sectionObj)[2]];
            let dayDoesMatch = false;
            let timeDoesMatch = false;

            DOWList.forEach(day => {
                if (day == dayOfWeek) {
                    dayDoesMatch = true;
                }
            });
            if (timeStamp >= (start - gracePeriod) && timeStamp <= (end + gracePeriod)) {
                timeDoesMatch = true;
            }
            if (dayDoesMatch && timeDoesMatch) {
                return sectionObj;
            }
        }
    }
    return false;
}

const handlers = {

    'LaunchRequest': function () {
        const speechOutput = 'Welcome to classroom Q and A. You can provide me with a tag for your question or ask me to read off your tags.';
        this.response.speak(speechOutput).listen('You can provide me with a tag for your question or ask me to read off your tags.');
        this.emit(':responseReady');

    },

    'AMAZON.FallbackIntent': function () {
        const speechOutput = "I'm sorry, I didn't catch that. You can provide me with a tag for your question or ask me to read off your tags.";
        this.response.speak(speechOutput).listen('You can provide me with a tag for your question or ask me to read off your tags.');
        this.emit(':responseReady');

    },

    'AMAZON.CancelIntent': function () {
        const speechOutput = 'Now exiting the classroom Q and A skill. Goodbye.';
        this.response.speak(speechOutput);
        this.emit(':responseReady');

    },

    'SessionEndedRequest': function () {
        this.emit(':saveState', true);

    },

    'AnswerIntent': async function () {
        console.log("*** AnswerIntent Started");
        let allQuestions = {};
        let loadPromise = loadFromSheets();
        let auth = await loadPromise;
        let data = await getData(auth);
        console.log("Google Sheets Read - Success");

        let skillsSheets = data.data.sheets.slice(1);
        skillsSheets.forEach(sheet => {
            allQuestions[sheet.properties.title] = {};
            //omit element 0 because it's the header row
            let rows = sheet.data[0].rowData.slice(1);
            rows.forEach(row => {
                if (row.values) {
                    if (row.values[0].effectiveValue && row.values[1].effectiveValue) {
                        // Sets tag (first column) as key in empty object and sets question (second column) as value
                        allQuestions[sheet.properties.title][row.values[0].effectiveValue.stringValue] = row.values[1].effectiveValue.stringValue;
                    } else {
                        console.log("That row didn't have both a tag and an answer");
                    }
                } else {
                    console.log("Skipping empty row.");
                }
            });
        });

        let scheduleSheet = data.data.sheets[0];
        let profSchedule = {};
        profSchedule[scheduleSheet.properties.title] = {};
        let rows = scheduleSheet.data[0].rowData.slice(1);
        let headers = scheduleSheet.data[0].rowData[0];
        let isMissingValue = false;
        rows.forEach(row => {
            if (row.values) {
                let speechOutput;
                if (row.values[0].effectiveValue) {
                    profSchedule[scheduleSheet.properties.title][row.values[0].effectiveValue.stringValue] = {};
                }
                row.values.forEach(cell => {
                    if (!cell.effectiveValue) {
                        console.log(`Exception: missing value in ${headers.values[row.values.indexOf(cell)].effectiveValue.stringValue} column.`);
                        speechOutput = `I'm sorry, there is a missing value in the '${headers.values[row.values.indexOf(cell)].effectiveValue.stringValue}' column.`;
                        isMissingValue = true;
                    }
                });
                if (!isMissingValue) {
                    console.log(JSON.stringify(row.values));
                    profSchedule[scheduleSheet.properties.title][row.values[1].effectiveValue.stringValue.substr(0, 4)]
                        [row.values[1].effectiveValue.stringValue][headers.values[2].effectiveValue.stringValue] = row.values[2].effectiveValue.stringValue;
                    profSchedule[scheduleSheet.properties.title][row.values[1].effectiveValue.stringValue.substr(0, 4)]
                        [row.values[1].effectiveValue.stringValue][headers.values[3].effectiveValue.stringValue] = row.values[3].effectiveValue.stringValue;
                    profSchedule[scheduleSheet.properties.title][row.values[1].effectiveValue.stringValue.substr(0, 4)]
                        [row.values[1].effectiveValue.stringValue][headers.values[4].effectiveValue.stringValue] = row.values[4].effectiveValue.stringValue;
                } else {
                    this.response.speak(speechOutput);
                    this.emit(':responseReady');
                }
            }
        });

        console.log(JSON.stringify(profSchedule));

        if (this.event.request.dialogState !== 'COMPLETED') {
            this.emit(':delegate');

        } else if (!allQuestions.hasOwnProperty(this.event.request.intent.slots.courseNumber.value)) {
            const slotToElicit = 'courseNumber';
            const speechOutput = "I'm sorry, we couldn't find any data for that course number. Try again";
            this.emit(':elicitSlot', slotToElicit, speechOutput, speechOutput);

        } else if (!allQuestions[this.event.request.intent.slots.courseNumber.value].hasOwnProperty(this.event.request.intent.slots.tag.value)) {
            const slotToElicit = 'tag';
            const speechOutput = 'I\'m sorry, that tag doesn\'t currently exist. Could you provide another tag?';
            this.emit(':elicitSlot', slotToElicit, speechOutput, speechOutput);

        } else {
            const tag = this.event.request.intent.slots.tag.value;
            const courseNumber = this.event.request.intent.slots.courseNumber.value;
            const speechOutput = allQuestions[courseNumber][tag];
            this.response.speak(speechOutput);
            this.emit(':responseReady');
        }
    },

    'ReadTags': function () {

        if (!this.event.request.intent.slots.courseNumber.value) {
            this.emit(':delegate');
        } else if (!allQuestions.hasOwnProperty(this.event.request.intent.slots.courseNumber.value)) {
            const slotToElicit = 'courseNumber';
            const speechOutput = "We couldn't find that course number. Please try agian.";
            this.emit(':elicitiSlot', slotToElicit, speechOutput, speechOutput);
        } else {
            let speechOutput = '';
            const courseNumber = this.event.request.intent.slots.courseNumber.value;
            allQuestions[courseNumber].forEach(question => {
                speechOutput += (question.tag + ", ");
            });

            this.response.speak('Your current tags are: ' + speechOutput);
            this.emit(':responseReady');

        }
    }

};
