//Lorenzo Neri - 901009 - lorenzo.neri@studenti.unimi.it

'use strict';



const admin=require('firebase-admin');


const dialogflow = require('dialogflow');


const credentials = require('./credenziali.json');

const agentClient = new dialogflow.IntentsClient({
 credentials: credentials,
});



var botFile='chatbot.xml';
const agentXMLCreator=require('./parserGraph');
var agentXML;
console.log("Inizio il parsing...");
agentXML=agentXMLCreator.parseGraph(botFile);
const projectId = agentXML.ProjectID;
const agentPath = agentClient.projectAgentPath(projectId);
console.log("Agente creato. Caricamento dati in corso...");
  //Per ogni intent parsato dal grafico, lo andiamo ad aggiungere al nostro agente
  
  var intentcreated=[];

  agentXML.intents.forEach((intent)=>{
    createIntent(projectId,intent.name,intent.id,intent.trainingPhrases,intent.risposte,intent.followUps,intent.parameters, intent.WebHookState)
    .then((response)=>{
        //Verifichiamo se l'intent è stato creato. In tal caso, dobbiamo integrare i contesti del dialogo in un update
        intentcreated.push(response[0]);
        if (Array.isArray(response)){
        console.log(response[0].displayName+" Creato.");
        if ((intent.inputContexts.length>0)||(intent.outputContexts.length>0)){
            updateIntent(response[0],intent).then((response)=>{
              console.log("Contesti per l'intent "+response[0].displayName+" integrati.");
          });
        }else{
          console.log("L'intent "+response[0].displayName+" non ha contesti di input/ouput da integrare.");
        }
        
      }else{
        console.error("Errore in fase di generazione per l'intent "+intent.name+". L'intent è già stato integrato nell'agente.");
      }
      
      
      
  });
});





//Funzione per aggiungere in update gli input/outputcontext una volta creato l'intent

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
    var messageToSet=[];
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
          messageToBuild=messageToBuild.trim();
          messageToBuild=messageToBuild.replace(/\s{2,}/g, ' ');
          
          messageToSet.push(messageToBuild);
            
            
            
          
          
          //Puliamo
          messageToBuild="";  
        });
       

    });
       
          //Prendiamo la stringa
          //Ne facciamo l'oggetto
       
    messageText.text= messageToSet;
    var messageToAdd={
      text:messageText
    }
    messagesBuilt.push(messageToAdd);

   
    
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
  