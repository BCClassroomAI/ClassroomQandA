/* Classroom Q&A Skill */

const Alexa = require('alexa-sdk');
const AWS = require('aws-sdk');
const googleSDK = require('./GoogleSdk.js');
AWS.config.update({region: 'us-east-1'});

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.registerHandlers(handlers);
    alexa.dynamoDBTableName = "ClassroomQandA";
    alexa.execute();
};

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

let sampleScheduleObj = {
    '1111': {
        '111101': {
            'dayOfWeek': 'TR',
            'start': 0.4,
            'end': 0.5
        },
        '111102': {
            'dayOfWeek': 'TR',
            'start': 0.55,
            'end': 0.6
        }
    },
    '2222': {
        '222201': {
            'dayOfWeek': 'MWF',
            'start': 0.4375,
            'end': 0.5
        },
        '222202': {
            'dayOfWeek': 'MWF',
            'start': 0.55,
            'end': 0.6
        }
    }
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
            let DOWList = sectionObj[Object.keys(sectionObj)[0]].split("");
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

let scheduleObj = googleSDK.readTab("1f_zgHHi8ZbS6j0WsIQpbkcpvhNamT2V48GuLc0odyJ0", "Schedule")
    .then(data => {
        console.log(data);
        console.log(checkSchedule(data));
    })
    .catch(err => {
    });

console.log(checkSchedule(sampleScheduleObj));

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
