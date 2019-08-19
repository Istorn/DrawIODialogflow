'use strict';

//TODO https://blog.dialogflow.com/post/create-and-manage-entities-with-api/

const admin=require('firebase-admin');


const dialogflow = require('dialogflow');

// Read in credentials from file. To get it, follow instructions here, but
// choose 'API Admin' instead of 'API Client':
// https://dialogflow.com/docs/reference/v2-auth-setup
const credentials = require('./test1drawio.json');

const entitiesClient = new dialogflow.EntityTypesClient({
 credentials: credentials,
});

const projectId = 'test1drawio-ttlbdt';
const agentPath = entitiesClient.projectAgentPath(projectId);

const cityEntityType = {
    displayName: 'city',
    kind: 'KIND_MAP',
    entities: [
      {value: 'New York', synonyms: ['New York', 'NYC']},
      {value: 'Los Angeles', synonyms: ['Los Angeles', 'LA', 'L.A.']},
    ],
   };

   const cityRequest = {
    parent: agentPath,
    entityType: cityEntityType,
   };
   
   entitiesClient
      .createEntityType(cityRequest)
      .then((responses) => {
            console.log('Created new entity type:', JSON.stringify(responses[0]));
        
            const streetEntityType = {
                displayName: 'street',
                kind: 'KIND_MAP',
                entities: [
                {value: 'Broadway', synonyms: ['Broadway']},
                ]
            };
        
            const streetRequest = {
                parent: agentPath,
                entityType: streetEntityType,
            };
        
            return entitiesClient.createEntityType(streetRequest);
        })
  
        .then((responses) => {
            console.log('Created new entity type:', JSON.stringify(responses[0]));
        })
        .catch((err) => {
            console.error('Error creating entity type:', err);
        });