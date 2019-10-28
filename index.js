//Lorenzo Neri - 901009 - lorenzo.neri@studenti.unimi.it

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



var botFile='BotFinaleWithAPI.xml';
const agentXMLCreator=require('./parserGraph');
var agentXML;
agentXML=agentXMLCreator.parseGraph(botFile);
const projectId = agentXML.ProjectID;
const agentPath = agentClient.projectAgentPath(projectId);
console.log(agentXML);
  //Per ogni intent parsato dal grafico, lo andiamo ad aggiungere al nostro agente
  //Da trasformare in una funzione ricorsiva asincrona: se gli intent padre non esistono ancora su Dialogflow, andrà in errore perché non trova i followup da associare
  //Da rivedere, probabilmente non necessario
  var intentcreated=[];

 agentXML.intents.forEach((intent)=>{
  createIntent(projectId,intent.name,intent.id,intent.trainingPhrases,intent.risposte,intent.followUps,intent.parameters, intent.WebhookState)
  .then((response)=>{
      //Intent creato, passiamo a creare i context output e input
      intentcreated.push(response[0]);
      console.log(response[0].displayName+" Creato.");
      
      updateIntent(response[0],intent).then((response)=>{
          console.log("Contesti per l'intent "+response[0].displayName+" integrati.");
      });
  });
});





//Funzione per aggiungere in coda gli input/outputcontext una volta creato l'intent

async function updateIntent(intentTU,intentXML){
  const dialogflow = require('dialogflow');
  
    // Instantiates the Intent Client
    const intentsClientup = new dialogflow.IntentsClient(
        {credentials: credentials,}
    );
    const agentPath = intentsClientup.projectAgentPath(projectId);
    intentTU.inputContextNames=[];
    //Aggiungiamo gli input context
      intentXML.inputContexts.forEach((inputC)=>{
        intentTU.inputContextNames.push(agentPath+"/sessions/"+agentXML.SessionKey+"/contexts/"+inputC);
      })
      
      //Aggiungiamo gli ouput
      intentXML.outputContexts.forEach((outputC)=>{
        intentTU.outputContexts.push({
        
          name: agentPath+"/sessions/"+agentXML.SessionKey+"/contexts/"+outputC,
          lifespanCount: 10
        
      });
      })
      
    
    const updateIntentRequest = {
      parent: agentPath,
      intent: intentTU,
    };
  
    //Aggiorniamo l'intent
    try{
      const responses = await intentsClientup.updateIntent(updateIntentRequest);
      return responses;
      
    }
    catch (e){
      console.log(e);
      return e;
    }
}


//Funzione che verifica se un parametro è presente in più di una training phrase: questo perchè Dialogflow lo crea erroneamente come lista
function isParameterTwicePresent(parameter,trainingPhrases){
  var counter=0;
  trainingPhrases.forEach((trainingPhrase)=>{
    trainingPhrase.parts.forEach((piece)=>{
      if (piece.alias!=undefined){
        if (piece.alias==parameter){
          counter++;
        }

      }
    });
  });
  if (counter>1){
    return true;
  }
  return false;
}

//Funzione per creare l'intent

async function createIntent(
    projectId,
    
    displayName,
    idXML,
    trainingPhrases,
    messageTexts,
    followUps=[],
    parameters=[],
    WebhookState
    
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
            //entityType: piece.entityType.substr(1,piece.entityType.length),
            entityType: "@sys.any",
            alias:piece.entityType.substr(1,piece.entityType.length),
            userDefined: false,
            isList:false

          };
          parts.push(part);
        }
        else{
          //Pezzo di frase normale
          var part = {
            text: piece.text,
            
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
   
    //Parrebbe inutile: se metto le training phrase parametrizzate li elenca già lui i parametri

    
    const parameterBOT=[];
    parameters.forEach((parameter)=>{
      //ci prendiamo tutti i suoi attributi
      parameterBOT.push({
        displayName:parameter.name,
        entityType: "@sys.any",
        value: "$"+parameter.name,
        isList:false,


        
      })
    });
    


    
    var messageText={
      text:""
    }

    //Verifichiamo se è un intent a messaggi diretti o ad API
    //Facciamo altrettanto per i messaggi di risposta
    //TODO: capire perché non vengono presi da Dialogflow
    var messagesBuilt=[];
    messageTexts.forEach((message)=>{
        var messageToBuild="";
        message.forEach((piece)=>{
          piece.forEach((realPiece)=>{
            if (realPiece.alias!=undefined){
              //È un parameter
              //Dobbiamo verificare se non derivi da un altro contesto
              //Dobbiamo verificare se questo intent non abbia più di una training phrase associata
              if (realPiece.alias.indexOf(".")>0){
                //InputContext
                messageToBuild="#"+realPiece.alias;
              }
              else if (isParameterTwicePresent(realPiece.alias,trainingPhrasesBOT)){
                messageToBuild+="$"+realPiece.alias;
              }else{
                messageToBuild+="$"+realPiece.alias;
              }
              
            }else{
              //Pezzo di stringa normale
              messageToBuild+=" "+realPiece.text+" ";
            }
        
          });    
        });
        messageToBuild=messageToBuild.trim();
        messageToBuild=messageToBuild.replace(/\s{2,}/g, ' ');
        
        
        //Prendiamo la stringa
        //Ne facciamo l'oggetto
          messageText.text= [messageToBuild];
          var messageToAdd={
            text:messageText
          }
          
          
          messagesBuilt.push(messageToAdd);
        
        
        //Puliamo
        messageToBuild="";

    });


   
    
    //Costruiamo l'Intent
    
      const intent = {
        displayName: displayName,
        trainingPhrases: trainingPhrasesBOT,
        messages: messagesBuilt,
        //parameters:parameterBOT,
        webhookState: WebhookState
       
      };
    
    
  
    const createIntentRequest = {
      parent: agentPath,
      intent: intent,
    };
  
    // Creiamo l'intent
    try{
      const responses = await intentsClient.createIntent(createIntentRequest);
      responses[0].trainingPhrases=intent.trainingPhrases;
      responses[0].messages=intent.messages;
      
      return responses;
          
      
    }
    catch (e){
      return e;
    }
    
    // [END dialogflow_create_intent]
  }
  