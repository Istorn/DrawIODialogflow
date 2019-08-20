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
 agenintentsXML.forEach((intent)=>{
  createIntent(projectId,intent.name,intent.trainingPhrases,intent.risposte,intent.parameters)
  .then((response)=>{
      console.log(response);
  });
});











//Funzione per creare l'intent

async function createIntent(
    projectId,
    displayName,
    trainingPhrasesParts,
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
  
    const trainingPhrases = [];
  
    trainingPhrasesParts.forEach(trainingPhrasesPart => {
      //In questo punto, verifichiamo se il pezzo della frase è un parametro oppure un semplice pezzo di testo
      const part = {
        text: trainingPhrasesPart,
      };
  
      // Here we create a new training phrase for each provided part.
      const trainingPhrase = {
        type: 'EXAMPLE',
        parts: [part],
      };
  
      trainingPhrases.push(trainingPhrase);
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
      parameters:[parameters],
     
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
  