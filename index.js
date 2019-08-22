'use strict';

//TODO https://blog.dialogflow.com/post/create-and-manage-entities-with-api/

const admin=require('firebase-admin');


const dialogflow = require('dialogflow');

// Read in credentials from file. To get it, follow instructions here, but
// choose 'API Admin' instead of 'API Client':
// https://dialogflow.com/docs/reference/v2-auth-setup
const credentials = require('./test1drawio.json');

const agentClient = new dialogflow.IntentsClient({
 credentials: credentials,
});

const projectId = 'test1drawio-ttlbdt';
const agentPath = agentClient.projectAgentPath(projectId);
var botFile='test2.xml';
const agentXMLCreator=require('./parserGraph');
var agentXML;
agentXML=agentXMLCreator.parseGraph(botFile);


console.log(agentXML);
 //Tesiamo e creiamo gli intent
 agentXML.intents.forEach((intent)=>{
  createIntent(projectId,intent.name,intent.trainingPhrases,intent.risposte,intent.parameters)
  .then((response)=>{
      console.log(response);
  });
});











//Funzione per creare l'intent

async function createIntent(
    projectId,
    displayName,
    trainingPhrases,
    messageTexts,
    parameters=[]
    
  ) {
    // [START dialogflow_create_intent]
    // Imports the Dialogflow library
    const dialogflow = require('dialogflow');
  
    // Instantiates the Intent Client
    const intentsClient = new dialogflow.IntentsClient(
        {credentials: credentials,}
    );
  
    // The path to identify the agent that owns the created intent.
    const agentPath = intentsClient.projectAgentPath(projectId);
  
    const trainingPhrasesBOT = [];
    
    //Prendiamo tutte le trainingPhrases
    trainingPhrases.forEach(trainingPhrase => {
      //Prendiamo tutte le loro parti
      var parts=[];
      trainingPhrase.forEach((piece)=>{
        
        //In questo punto, verifichiamo se il pezzo della frase è un parametro oppure un semplice pezzo di testo
        if (piece.entityType!=undefined){
          //Pezzo che contiene un termine chiave per un dato parametro
          var part = {
            text: piece.text,
            entityType: piece.entityType,
            alias:piece.alias,
          };
          parts.push(part);
        }
        else{
          //Pezzo di frase normale
          var part = {
            text: piece.text,
            entityType:" ",
            alias:" ",
          };
          parts.push(part);
        }
        
      });
      //A questo punto costruiamo la trainingphrase
      const trainingPhraseFinal = {
        type: 'EXAMPLE',
        parts: parts,
      };
  
      trainingPhrasesBOT.push(trainingPhraseFinal);
      parts=[];
      
  
      
    });
    
    const parameterBOT=[];
    parameters.forEach((parameter)=>{
      //ci prendiamo tutti i suoi attributi
      parameterBOT.push({
        displayName:parameter.name,
        entityDisplayName: "@"+parameter.name,
        value: ""
      })
    });

    const messageText = {
      text: messageTexts,
    };
  
    const message = {
      text: messageText,
    };
  
    const intent = {
      displayName: displayName,
      trainingPhrases: trainingPhrases,
      messages: [message],
      parameters:parameterBOT,
     
    };
  
    const createIntentRequest = {
      parent: agentPath,
      intent: intent,
    };
  
    // Create the intent
    try{
      const responses = await intentsClient.createIntent(createIntentRequest);
      console.log(`Intent ${responses[0].name} created`);
    }
    catch (e){
      console.log(e);
    }
    
    // [END dialogflow_create_intent]
  }
  