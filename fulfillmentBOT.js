//Fullfillment file. Necessario qual ora l'agente debba invocare servizi di terze parti esterni a Dialogflow

'use strict';
            const axios=require('axios');
            const functions = require('firebase-functions');
            const {WebhookClient} = require('dialogflow-fulfillment');
            const {Card, Suggestion} = require('dialogflow-fulfillment');
            
            process.env.DEBUG = 'dialogflow:debug'; 
             
            exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
              const agent = new WebhookClient({ request, response });
              console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
              console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
             
              function welcome(agent) {
                agent.add('Benvenuto!');
              }
             
              function fallback(agent) {
                agent.add('Mi dispiace, ma non riesco a capire cosa hai detto.');
                agent.add('Scusami, potresti ripetere di nuovo?');
              }let intentMap = new Map();
            intentMap.set('Default Welcome Intent', welcome);
            intentMap.set('Default Fallback Intent', fallback);agent.handleRequest(intentMap);        
        });