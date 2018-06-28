/* Classroom Q&A Skill */

const Alexa = require('alexa-sdk');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

exports.handler = function(event, context, callback) {
  const alexa = Alexa.handler(event, context, callback);
  alexa.appId = 'amzn1.ask.skill.f9ebd6c1-4743-40b5-acfe-8a1bad2d8c33';
  alexa.dynamoDBTableName = 'ClassroomQandA';
  alexa.registerHandlers(handlers);
  alexa.execute();
};
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'credentials.json';

let allQuestions = {};

// Load client secrets from a local file.
fs.readFile('client_secret.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), getData);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
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

  let params = {
    spreadsheetId: '1f_zgHHi8ZbS6j0WsIQpbkcpvhNamT2V48GuLc0odyJ0',
    //range: sheetName,
    includeGridData: true
  };

  sheets.spreadsheets.get(params)
    .then(data => {
      console.log("Google Sheets Read - Success");
      let sheets = data.data.sheets;
      sheets.forEach(sheet => {
        allQuestions[sheet.title] = [];
        //omit element 0 because it's the header row
        let rows = sheet.data[0].rowData.splice(1);
        rows.forEach(row => {
          if (row.values[0].effectiveValue && row.values[1].effectiveValue) {
            allQuestions[sheet.title].push({
              tag: row.values[0].effectiveValue.stringValue,
              answer: row.values[1].effectiveValue.stringValue
            })
          } else {
            console.log("That row didn't have both a tag and an answer");
          }
        });
      });
    })

    .catch(err => {
      console.log("Google Sheets Read - Error");
      console.log(err.toString());
    })

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

const handlers = {

    'LaunchRequest': function () {

      const speechOutput = 'Welcome to classroom Q and A. You can provide me with a tag for your question or ask me to read off your tags.';
      this.response.speak(speechOutput).listen('You can provide me with a tag for your question or ask me to read off your tags.');
      this.emit(':responseReady');

    },

    'Unhandled': function () {

      const speechOutput = 'I\'m sorry, I didn\'t catch that. You can provide me with a tag for your question or ask me to read off your tags.';
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

    'AnswerIntent': function () {

      if (!this.event.request.intent.slots.tag.value) {

        this.emit(':delegate');

        //we should also be getting a course number
      } else if (!allQuestions.hasOwnProperty(this.event.request.intent.slots.tag.value)) {

        const slotToElicit = 'tag';
        const speechOutput = 'I\'m sorry, that tag doesn\'t currently exist. Could you provide another tag?';
        this.emit(':elicitSlot', slotToElicit, speechOutput, speechOutput);

      } else {

        const tag = this.event.request.intent.slots.tag.value;
        const speechOutput = allQuestions[tag];
        this.response.speak(speechOutput);
        this.emit(':responseReady');

      }


    },

    'ReadTags': function () {

      let speechOutput = '';
      allQuestions["Sheet1"].forEach(question => {
        if (allQuestions["Sheet1"].indexOf(question) === allQuestions["Sheet1"].length - 1) {
          speechOutput += ('and' + question.tag);
        } else {
          speechOutput += (question.tag + "; ");
        }
      });

      this.response.speak('Your current tags are: ' + speechOutput);
      this.emit(':responseReady');

    }

};
