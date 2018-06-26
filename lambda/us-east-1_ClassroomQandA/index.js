/* Classroom Q&A Skill */

const tagAnswers = {
    "Gettysburg": "Gettysburg is a town in Pennsylvania that is known as a turning point in the Civil War. Bazinga!",
    "pythagorean theorem": "A squared plus B squared equals C squared in the case of all right triangles. Bazinga!",
    "passive voice": "Passive voice is a mode of verb where the subject is acted on by the verb. Bazinga!"
};

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

        const tag = this.event.request.intent.slots.tag.value;
        const speechOutput = tagAnswers[tag];
        this.response.speak(speechOutput);
        this.emit(':responseReady');

    },

    'ReadTags': function () {

        let speechOutput = '';
        const tagList = Object.keys(tagAnswers);
        tagList.forEach(tag => speechOutput += tag);
        this.response.speak(speechOutput);
        this.emit(':responseReady');

    }

};

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