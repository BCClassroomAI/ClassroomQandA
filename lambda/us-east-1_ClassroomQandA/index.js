/* Classroom Q&A Skill */

const handlers = {

    'LaunchRequest': function () {



    },

    'Unhandled': function () {



    },

    'AMAZON.CancelIntent': function () {



    },

    'SessionEndedRequest': function () {



    },

    'AnswerIntent': function () {



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