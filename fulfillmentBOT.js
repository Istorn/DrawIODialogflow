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
              }function ApiTrenitalia(agent){axios.get('https://www.trenitalia.com?searchTravels?Destination=agent.getContext('stazione1').parameters.stazionepartenza&Arrival=agent.getContext('stazione2').parameters.stazionedestinazione').then((risposta)=>{
                            agent.add(Il primo treno che parte da  agent.getContext('stazione1').parameters.stazionepartenza e arriva a  agent.getContext('stazione2').parameters.stazionedestinazione è il seguente:  agent.getContext('risposta[0]').parameters.nometreno alle ore  agent.getContext('risposta[0]').parameters.orario);
                                           });let intentMap = new Map();
            intentMap.set('Default Welcome Intent', welcome);
            intentMap.set('Default Fallback Intent', fallback);intentMap.set('ricercastazioni',ApiTrenitalia); agent.handleRequest(intentMap);        
        });