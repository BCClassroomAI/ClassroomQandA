/* Classroom Q&A Skill */

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

    },

    'ReadTags': function () {



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