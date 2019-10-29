module.exports={
    parseGraph: function (fileName){
    //Parser XML
    const xml2js = require('xml2js');
    const fs = require('fs');
    const parser = new xml2js.Parser({ attrkey: "ATTR" });

    // this example reads the file synchronously
    // you can read it asynchronously also
    let xml_string = fs.readFileSync("./BOTXML/"+fileName, "utf8");
    const ClassagentXML=require('./agentXML');
    var agentXML=new ClassagentXML();
    const ClassAPIClass=require('./APIClass.js');
    var APIXML=[];
    var ClassintentXML=require('./IntentXML');
    var ClassfollowupXML=require('./followupXML');
    var intentsXML=[];
    var followups=[];
    var intentAPIRequired=[];
    var APItoIntent=[];
    var intentMappedFile="";
    //Funzione di parsing

    parser.parseString(xml_string, function(error, result) {
        if(error === null) {
            //Leggiamo il grafo
            var graphXMLCells=result.mxfile.diagram[0].mxGraphModel[0].root[0].mxCell;
            for (var k=0;k<graphXMLCells.length;k++){
                if (graphXMLCells[k].ATTR.style!=undefined){
                    //Entità del grafo valida
                    //Verifichiamo se si tratta di un intent o di una freccia, che indica il follow-up tra entità
                    
                    if (graphXMLCells[k].ATTR.style.indexOf('edgeStyle')>=0){
                        //Freccia
                        var followup=new ClassfollowupXML();
                        //Prendiamo il padre della sezione più in basso.

                        followup.father=graphXMLCells[k].ATTR.source;
                        graphXMLCells.forEach((cell)=>{
                            if (cell.ATTR.id==followup.father){
                                followup.father=cell.ATTR.parent;
                                return;
                            }
                        });
                        followup.son=graphXMLCells[k].ATTR.target;
                        //Aggiungiamo
                        followups.push(followup);
                    }else if (graphXMLCells[k].ATTR.style.indexOf("childLayout")>=0){
                        //Intent/Fulfillment
                        var valueXML=graphXMLCells[k].ATTR.value;
                        
                            //Spezziamo il contenuto del value

                            //Andiamo a prendere il necessario da ogni sezione
    
                            //Normalizziamo i caratteri speciali
                            valueXML.replace("&lt;","<");
                            valueXML.replace("&gt;",">");
                            valueXML.replace("&quot;","\"");
                            valueXML.replace("&amp;","\"");
                            //Nome
                            var name=valueXML;
                            
                            //Sezione 1: frasi
                            var phraseString="";
                            graphXMLCells.forEach((cell)=>{
                                
                                if (cell.ATTR.parent==graphXMLCells[k].ATTR.id){
                                    if (cell.ATTR.value=="Frasi"){
                                        var finalFrasi="";
                                        graphXMLCells.forEach((cellFrasi)=>{
                                                if (cellFrasi.ATTR.parent==cell.ATTR.id){
                                                    finalFrasi=cellFrasi.ATTR.value;
                                                    
                                                }
                                        });
                                        phraseString=finalFrasi;
                                        //Rimuoviiamo entità HTML in eccesso
                                        phraseString=phraseString.replace(/<\/?span[^>]*>/g,"");
                                        phraseString=phraseString.replace(/<\?br[^>]*>/g,"");
                                        phraseString=phraseString.replace(/&nbsp;/g,"");
                                    }
                                }
                            });
                            //Sezione 2: parametri
                            var parameters=[];
                            var stringParameters="";
                            graphXMLCells.forEach((cell)=>{
                                
                                if (cell.ATTR.parent==graphXMLCells[k].ATTR.id){
                                    if (cell.ATTR.value=="Parametri"){
                                        var finalParams="";
                                        graphXMLCells.forEach((cellParams)=>{
                                                if (cellParams.ATTR.parent==cell.ATTR.id){
                                                    finalParams=cellParams.ATTR.value;
                                                    
                                                }
                                        });
                                        stringParameters=finalParams;
                                        //Rimuoviiamo entità HTML in eccesso
                                        stringParameters=stringParameters.replace(/<\/?span[^>]*>/g,"");
                                        stringParameters=stringParameters.replace(/<\?br[^>]*>/g,"");
                                        stringParameters=stringParameters.replace(/&nbsp;/g,"");
                                    }
                                }
                            });
                            
                                //Li normalizziamo
                                stringParameters.split("§").forEach(element => {
                                    if (element.length>0)
                                        parameters.push(getParameterByXML(element));
                                });
                         
                            var phrases=[];
                            
                            
                            phrases=phraseString.split("§");
                            //Dobbiamo dividere ogni frase in pezzi.
                            //Il motivo è dato dalla eventuale presenza di termini chiave da associare ai parameters
                            phrases=phrases.map((phrase)=>{
                                return splitTrainingPhrase(phrase,parameters);
                            });
    
                            
                            //Sezione 3: risposte
                            var stringAnswer="";
                            graphXMLCells.forEach((cell)=>{
                                
                                if (cell.ATTR.parent==graphXMLCells[k].ATTR.id){
                                    if (cell.ATTR.value=="Risposte"){
                                        var finalAnswer="";
                                        graphXMLCells.forEach((cellRisposte)=>{
                                                if (cellRisposte.ATTR.parent==cell.ATTR.id){
                                                    finalAnswer=cellRisposte.ATTR.value;
                                                    
                                                }
                                        });
                                        stringAnswer=finalAnswer;
                                        //Rimuoviiamo entità HTML in eccesso
                                        stringAnswer=stringAnswer.replace(/<\/?span[^>]*>/g,"");
                                        stringAnswer=stringAnswer.replace(/<\?br[^>]*>/g,"");
                                        stringAnswer=stringAnswer.replace(/&nbsp;/g,"");
                                    }
                                }
                            });
                            var risposte=stringAnswer.split("§");
                            
                                //Lo stesso criterio, lo dobbiamo applicare alle risposte
                                risposte=risposte.map((risposta)=>{
                                    return splitAnswer(risposta,parameters);
                                });
                               
                            //Sezione 4: API
                            var hasAPI=0;
                            graphXMLCells.forEach((cell)=>{
                                if (cell.ATTR.parent==graphXMLCells[k].ATTR.id){
                                    if (cell.ATTR.value=="API"){
                                        hasAPI=1;
                                        //Prendiamo il nome dell'api richiesta
                                        graphXMLCells.forEach((cellAPI)=>{
                                            if (cellAPI.ATTR.parent==cell.ATTR.id){
                                                intentAPIRequired.push({"intentName":name.toLowerCase(),"APIRequired":cellAPI.ATTR.value});
                                            }
                                        });
                                        
                                    }
                                }
                            });
                            //Creiamo l'intent
                            var intentXML=new ClassintentXML();
                            intentXML.id=graphXMLCells[k].ATTR.id;
                            intentXML.name=name.toLowerCase();
                            intentXML.trainingPhrases=phrases;
                            intentXML.risposte.push(risposte);
                            intentXML.parameters=parameters;
                            intentXML.inputContexts=[];
                            intentXML.outputContexts=[];
                            if (hasAPI==1){
                                intentXML.WebHookState="WEBHOOK_STATE_ENABLED_FOR_SLOT_FILLING";
                            }else{
                                intentXML.WebHookState="WEBHOOK_STATE_UNSPECIFIED";
                            }
                            //lo aggiungiamo alla lista
                            intentsXML.push(intentXML);
    
                        
                    }else if (graphXMLCells[k].ATTR.style.indexOf('dataStorage')>=0){
                        //API
                        //Prendiamo il valore della stringa intera
                        var stringAPI=graphXMLCells[k].ATTR.value;
                        stringAPI=stringAPI.replace(/<\/?div[^>]*>/g,"");
                        stringAPI=stringAPI.replace(/<\/?br[^>]*>/g,"");
                        stringAPI=stringAPI.replace(/<\/?img[^>]*>/g,"");
                        stringAPI=stringAPI.replace(/<\/?span[^>]*>/g,"");
                        stringAPI=stringAPI.replace(/&nbsp;/g," ");
                        //1- nome
                        var nameAPI=stringAPI.substr(0,stringAPI.indexOf("§"));
                        nameAPI=nameAPI.replace(/<\/?font[^>]*>/g,"");
                        nameAPI=nameAPI.substr(5,nameAPI.length-5).trim();
                        stringAPI=stringAPI.substr(stringAPI.indexOf("§")+1,stringAPI.length-(stringAPI.indexOf("§")+1));
                        //URL
                        var indirizzo=stringAPI.substr("Indirizzo: ".length,stringAPI.indexOf("§")-"Indirizzo: ".length);
                        indirizzo=indirizzo.replace(/<\/?font[^>]*>/g,"");
                        
                        stringAPI=stringAPI.substr(stringAPI.indexOf("§")+1,stringAPI.length-(stringAPI.indexOf("§")+1));
                        if (stringAPI.indexOf("</font>")>=0){
                            stringAPI=stringAPI.substr("</font>".length,stringAPI.length-("</font>".length));
                        }
                        
                        //Risposta da generare
                        var rispostaAPI=stringAPI.substr(0,stringAPI.indexOf("§"));
                        rispostaAPI=rispostaAPI.replace("Risposta: ","");
                        var finalRisposta=``;
                        var chars="";
                        var i=0;
                        //Dobbiamo separarla per capire quali pezzi sono base e quali altri invece provengono dal contesto conversazionale del bot
                        while (rispostaAPI.length>0){
                            //Leggiamo finchè non troviamo <font color="        
                            if ((rispostaAPI[0]=="<") && (rispostaAPI[1]=="f")){
                                //2- Abbiamo individuato un termine chiave
                                
                                
                                //È un termine chiave: ce lo andiamo a prendere
                                var termTAG=rispostaAPI.substr(i,rispostaAPI.indexOf("</font>")-i+"</font>".length);
                                //Andiamondiamo a verificare in base al colore se si tratta di un pezzo di frase ordinario, oppure di un termine derivante dal contesto
                                var color=termTAG.substr(termTAG.indexOf("color=\"#")+"color=\"#".length,termTAG.indexOf("\">")+"\">".length-"color=\"#".length);
                                color=color.substr(0,6);
                                if ((color=="000000")){
                                    //Pezzo normale
                                    finalRisposta+=termTAG.replace(/<\/?font[^>]*>/g,"");
                                    chars="";
                                }
                                else{
                                    
                                    var term=termTAG.replace(/<\/?font[^>]*>/g,"");
                                    term=term.split(".");
                                    if (term[0].indexOf("risposta")>=0){
                                        if ((finalRisposta[finalRisposta.length-2]=='"') && (finalRisposta[finalRisposta.length-1]=="+")){
                                            finalRisposta+=` `+term[0]+"."+term[1]+`+"`;
                                        }else{
                                            finalRisposta+=` "+`+term[0]+"."+term[1]+`+"`;
                                        }
                                        
                                    }else{
                                        if ((finalRisposta[finalRisposta.length-2]=='"') && (finalRisposta[finalRisposta.length-1]=="+")){
                                            finalRisposta+=` agent.getContext('`+term[0]+`').parameters.`+term[1]+`+"`;
                                        }
                                        else{
                                            finalRisposta+=` "+agent.getContext('`+term[0]+`').parameters.`+term[1]+`+"`;
                                        }
                                        
                                    }
                                    
                                    chars="";
                                }
                                
                                //Tagliamo
                                rispostaAPI=rispostaAPI.substr(termTAG.length,rispostaAPI.length-termTAG.length);
                                
                            }
                           
                            
                         }

                         
                        stringAPI=stringAPI.substr(stringAPI.indexOf("§")+1,stringAPI.length-(stringAPI.indexOf("§")));
                        if (stringAPI.indexOf("</font>")==0){
                            stringAPI=stringAPI.substr("</font>".length,stringAPI.length-("</font>".length));
                        }
                        //Parametri
                        var finalParams=[];
                        
                        var paramsAPI=stringAPI.replace(/<\/?font[^>]*>/g,"").trim().split("§");
                        paramsAPI=paramsAPI.filter((val)=>{
                            return val.length>0;
                        })
                        paramsAPI.forEach((paramAPI)=>{
                            paramAPI=paramAPI.replace(" ","");
                            finalParams.push({"name":paramAPI.split(":")[0],"value":"agent.getContext('"+paramAPI.split(":")[1].split(".")[0]+"').parameters."+paramAPI.split(":")[1].split(".")[1]});
                        });

                        //Arrivati a questo punto, aggiungiamo al vettore delle API
                        APIXML.push({
                            "name":nameAPI,
                            "url":indirizzo,
                            "risposta":finalRisposta,
                            "parametri":finalParams,
                            "intent":""
                        });
                    }
                    else if (graphXMLCells[k].ATTR.style.indexOf('image=img/clipart/Gear_128x128.png')>=0){
                        //Credenziali del bot
                        var stringCredentials=graphXMLCells[k].ATTR.value;
                        stringCredentials=stringCredentials.replace(/<\/?font[^>]*>/g,"");
                        stringCredentials=stringCredentials.replace(/<\/?div[^>]*>/g,"");
                        stringCredentials=stringCredentials.replace(/<\/?br[^>]*>/g,"");
                        stringCredentials=stringCredentials.replace(/<\/?img[^>]*>/g,"");
                        stringCredentials=stringCredentials.replace(/<\/?span[^>]*>/g,"");
                        //ID project
                        agentXML.ProjectID=stringCredentials.substr(3,stringCredentials.indexOf('Chiave: ')-3).trim();
                        //Session Key
                        agentXML.SessionKey=stringCredentials.substr(3+agentXML.ProjectID.length+'Chiave: '.length,stringCredentials.length-(3+agentXML.ProjectID.length+'Chiave: '.length)).trim();
                    }
                    console.log("Interpretazione grafico: "+parseInt(k/graphXMLCells.length*100)+"%");
                    
                    
                }
            }
            
            //Creiamo l'agente
            agentXML.setIntents(intentsXML);
            agentXML.setFollowups(followups);

            //Mappiamo le chiamate API sugli intent che le richiedono
            APIXML.forEach((api)=>{
                intentAPIRequired.forEach((intentAPI)=>{
                    if (api.name==intentAPI.APIRequired){
                        api.intent=intentAPI.intentName;
                        //Creiamo il codice necessario
                        //URL mappato con i parametri
                        var queryURL="";
                        api.parametri.forEach((param)=>{
                            queryURL+='"'+param.name+'="+'+param.value+'+"&"+';
                        });
                        if (queryURL.length>0){
                            queryURL=queryURL.substr(1,queryURL.length-6);
                            queryURL=`?`+queryURL;
                        }
                        
                        APItoIntent.push(`function `+api.name+`(agent){axios.get("`+api.url+queryURL+`).then((risposta)=>{
                            agent.add("`+api.risposta+` ");
                                           });
                                        }`);
                        intentMappedFile+=`
                        intentMap.set('`+intentAPI.intentName+`',`+api.name+`); `;
                    }
                });
            });
            
            //Componiamo tutto il file necessario per realizzare il fulfillment del bot
            var stringFile=`'use strict';
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
              }`;
            APItoIntent.forEach((method)=>{
                stringFile+=method;
            });
            stringFile+=`let intentMap = new Map();
            intentMap.set('Default Welcome Intent', welcome);
            intentMap.set('Default Fallback Intent', fallback);`;
            stringFile+=intentMappedFile;
            stringFile+=`agent.handleRequest(intentMap);        
        });`;
            

            //Finalizziamo il file fulfillment
            var fs=require('fs');
            
            fs.writeFile('./fulfillmentBOT.js', stringFile, function(err) {

                if(err) {
                    return console.log("Errore in fase di creazione file fulfillment: "+err);
                }
            
                console.log("File fulfillment creato. Copiarne il contenuto in Dialogflow dal file presente in questa cartella: fulfillmentBOT.js.");
            }); 

            //Creiamo la tabella dei contesti
            var tableContext=[];
            agentXML.intents.forEach((intent)=>{
                //Creo la tabella per ogni intent presente
                tableContext.push({"idIntent":intent.id,"input":"","output":[]});
                
            });

            //Prendo le relazioni in cui l'intent analizzato è padre
            tableContext.forEach((row)=>{
                var followUpsFather=agentXML.followups.filter((followup)=>{return followup.father==row.idIntent});
                followUpsFather.forEach((followup)=>{
                    //Per ogni relazione trovata, metto nella mia riga i nodi per cui sono output
                    row.output.push(followup.son);
                    //E mi metto come input nella riga di mio figlio
                    var rigaFiglio=tableContext.filter((rowFiglia)=>{
                        return rowFiglia.idIntent==followup.son;
                    });
                    rigaFiglio[0].input=followup.father;
                });

            });
            //Arrivati a questo punto, analizziamo la tabella e creiamo i contesti finali
            var inouttable=[];
            tableContext.forEach((row)=>{
                //Sono output per qualcuno? 
                if (row.output.length>0){
                    //Prendo i miei input (se ne ho), più me stesso e li imposto sul mio output
                    var output=[];
                    if (row.input.length>0)
                        output.push(row.input);
                    output.push(row.idIntent);
                    inouttable.push({"id":row.idIntent,"output":output,"input":[]});

                }
                //Ho degli input?
                if (row.input.length>0){
                    //vado nella riga del padre e prendo il suo output se non ce l'ho già nella mia
                    var rigaPadre=tableContext.filter((rowsearch)=>{
                        return rowsearch.idIntent==row.input;
                    })[0];
                    var finalInput=[];
                    //Prendo i miei
                    finalInput.push(row.input);
                    //Mi prendo quelli che non ho
                    var missingInputs=rigaPadre.output.filter((output)=>{
                        
                            return output;
                    });
                    missingInputs.forEach((input)=>{
                        finalInput.push(input);
                    })
                    //Aggiungo anche il padre
                    finalInput.push(rigaPadre.idIntent);
                    
                    //Mi devo prendere gli input mancanti nella tabella finalizzata
                    var rowToComplete=inouttable.filter((rowFatherFinal)=>{return rowFatherFinal.id==row.input})[0];
                    if (rowToComplete){
                        rowToComplete.output.forEach((out)=>{
                            finalInput.push(out);
                        });
                    }
                    //rimuovo duplicati
                    finalInput=finalInput.filter((v,i) => {return finalInput.indexOf(v) === i});
                    
                    

                    var inoutrow=inouttable.filter((rowfinal)=>{
                        return rowfinal.id==row.idIntent;
                    })[0];
                    if (inoutrow==null){
                        //Vuol dire che me la devo creare: è un intent senza output
                        //Perciò, mi prendo l'output del padre
                        var outPutFather=inouttable.filter((rowFather)=>{return rowFather.id==row.input})[0].output;
                        //rimuovo me stesso
                        outPutFather=outPutFather.filter((out)=>{return out!=row.idIntent});
                        inouttable.push({"id":row.idIntent,"output":[],"input":outPutFather});
                        

                    }else{
                        //Rimuovo me stesso dagli input
                        finalInput=finalInput.filter((final)=>{return final!=inoutrow.id});
                        inoutrow.input=finalInput;
                        inoutrow.output=inoutrow.input;
                        inoutrow.output.push(inoutrow.id);
                        inoutrow.input=inoutrow.input.filter((inc)=>{return inc!=inoutrow.id});
                    }
                    
                    
                }
                
            })
            //Arrivati a questo punto, vado a tradurre i nomi e li imposto direttamente negli input/outputcontext degli intent
            inouttable.forEach((riga)=>{
                riga.id=translateIDIntent(riga.id,agentXML);
                for (i=0;i<riga.input.length;i++){
                    riga.input[i]=translateIDIntent(riga.input[i],agentXML);
                }
                for (i=0;i<riga.output.length;i++){
                    riga.output[i]=translateIDIntent(riga.output[i],agentXML);
                }
                
            });
            for (i=0;i<agentXML.intents.length;i++){
                var intentTable=inouttable.filter((intentSearch)=>{return intentSearch.id==agentXML.intents[i].name})[0];
                agentXML.intents[i].inputContexts=intentTable.input;
                agentXML.intents[i].outputContexts=intentTable.output;

            }
            
            console.log("Interpretazione grafico completata.");


           
        }
        else {
            return error;
        }
    });
    return agentXML;
}}

//Traduce l'id xml nel nome dell'intent
function translateIDIntent(id,agent){
    return agent.intents.filter((intent)=>{return intent.id==id})[0].name;
}


//Dividiamo la training phrase per trovare eventuali termini chiave da associare ai parameters del nostro intent
function splitTrainingPhrase(trainingPhrase,parameters){
    
    trainingPhrase=trainingPhrase.replace(/<\/?span[^>]*>/g,"");
    trainingPhrase=trainingPhrase.replace(/<\/?div[^>]*>/g,"");
    trainingPhrase=trainingPhrase.replace(/<\/?br[^>]*>/g,"");
    trainingPhrase=trainingPhrase.replace(/&nbsp;/g," ");

    var splittedTrainingPhrase=[];
    var chars="";
    //1- Analizziamo l'intera frase affinché possiamo riconoscere il testo puro dai temrini chiave da associare a un parameter
    for (var i=0;i<trainingPhrase.length;i++){
            //Leggiamo finchè non troviamo <font color="        
        if ((trainingPhrase[i]=="<") && (trainingPhrase[i+1]=="f")){
            //2- Abbiamo individuato un termine chiave
            //Ma prima, verifichiamo se il buffer caratteri era pieno in precedenza
            if (chars.length>0){
                //Parte di frase normale
                //Ci salviamo il pezzo di frase normale
                splittedTrainingPhrase.push({
                    text: chars
                });

                //Svuotiamo
                chars="";
            }
            //È un termine chiave: ce lo andiamo a prendere
            var termTAG=trainingPhrase.substr(i,trainingPhrase.indexOf("</font>")-i+"</font>".length);
            //Andiamondiamo a verificare in base al colore a quale parameter associarlo
            var color=termTAG.substr(termTAG.indexOf("color=\"#")+"color=\"#".length+1,termTAG.indexOf("\">")+"\">".length-"color=\"#".length);
            color=color.substr(0,color.indexOf("\">"));
            //Andiamo a cercare nei parameters il parameter corrispondente
            parameters.forEach((parameter)=>{
                if (parameter.color==color){
                    //L'abbiamo trovato, proseguiamo
                    //In questo caso andiamo ad aggiungere il termine chiave ai valori del paramter in questione
                    var value=termTAG.substr(termTAG.indexOf("\">")+"\">".length,termTAG.indexOf("</font>")-8);
                    value=value.substr(0,value.indexOf("</font>"));   
                    parameter.userValues.push(value);
                    //E infine, aggiungiamo alla training phrase divisa
                    splittedTrainingPhrase.push({
                        text: value,
                        entityType:"@"+parameter.name,
                        alias:parameter.name,
                    });
                }
            });
            //Incrementiamo i per bypassare il pezzo appena considerato
            i+=termTAG.length;
        }
        else{
            //carattere normale da aggiungere
            chars+=trainingPhrase[i];
        }
    }
    //Parte finale da aggiungere oppure trainingPhrases senza paramaters
    if (chars.length>0){
        splittedTrainingPhrase.push({
            text: chars
        });
    }

    //Torniamo la training phrase divisa opportunamente
    return splittedTrainingPhrase;
    
}
//Impostiamo i parametri in base ai colori e ai nomi
function getParameterByXML(parameterString){
    var color=parameterString.substr(parameterString.indexOf("color=\"#")+"color=\"#".length+1,parameterString.indexOf("\">")+"\">".length-"color=\"#".length);
    color=color.substr(0,color.indexOf("\">"));
    var name=parameterString.substr(parameterString.indexOf("\">")+"\">".length,parameterString.indexOf("</font>")-8);
    name=name.substr(0,name.indexOf("</font>"));
    return {
        color: color,
        name: name,
        userValues:[],
    }
}


//Restituisce i termini chiave nella frase in funzione del colore del parametro da impostare nell'agente
function findParameterInPhraseByColor(phrase,parameterColor){
    var keyTerms=[];
    if (phrase.match(/<font/g).length>0){
        //Abbiamo almeno un termine chiave
        var colorOfTerm=color=phrase.substr(phrase.indexOf("color=\"#")+"color=\"#".length+1,phrase.indexOf("\">")+"\">".length-"color=\"#".length);
        colorOfTerm=substr(0,colorOfTerm.indexOf("\">"));
        if (colorOfTerm==parameterColor){
            //È un termine chiave 
            var keyTerm=phrase.substr(phrase.indexOf("\">")+"\">".length,phrase.indexOf("</font>")-8);
            keyTerm=keyTerm.substr(0,name.indexOf("</font>"));
            keyTerms.push(keyTerm);
        }
    }
    return keyTerms;
}

//Serve a dividere la risposta dell'intent al fine di verificare se include dei parameters
function splitAnswer(answer,parameters){
    var splittedAnswer=[];
    answer=answer.replace(/<\/?span[^>]*>/g,"");
    answer=answer.replace(/<\/?div[^>]*>/g,"");
    answer=answer.replace(/<\/?br[^>]*>/g,"");
    answer=answer.replace(/&nbsp;/g," ");


    
    var chars="";
    //1- Analizziamo l'intera frase affinché possiamo riconoscere il testo puro dai temrini chiave da associare a un parameter
    var i=0;
    var readerString=answer;
    while (i<answer.length){

            //Leggiamo finchè non troviamo <font color="        
        if ((answer[i]=="<") && (answer[i+1]=="f")){
            //2- Abbiamo individuato un termine chiave
            //Ma prima, verifichiamo se il buffer caratteri era pieno in precedenza
            if (chars.length>0){
                //Parte di frase normale
                //Ci salviamo il pezzo di frase normale
                splittedAnswer.push({
                    text: chars
                });
                readerString=readerString.substr(chars.length,readerString.length-chars.length)
                //Svuotiamo
                chars="";
            }
            //È un termine chiave: ce lo andiamo a prendere
            var termTAG=readerString.substr(0,readerString.indexOf("</font>")+"</font>".length);
            
            var termine=termTAG.substr(termTAG.indexOf("\">")+"\">".length,termTAG.indexOf("</font>")-8);
            termine=termine.substr(0,termine.indexOf("</font>")).trim();   
            
            if (termine.length>=2){
                splittedAnswer.push({
                    text: termine,
                    alias:termine
    
                });
            }
            
            /*

            Parte non necessaria
            //Andiamo a verificare in base al colore a quale parameter associarlo
            var color=termTAG.substr(termTAG.indexOf("color=\"#")+"color=\"#".length+1,termTAG.indexOf("\">")+"\">".length-"color=\"#".length);
            color=color.substr(0,color.indexOf("\">"));
            //Andiamo a cercare nei parameters il parameter corrispondente
            parameters.forEach((parameter)=>{
                if (parameter.color==color){
                    //L'abbiamo trovato, proseguiamo
                    //In questo caso andiamo ad aggiungere il termine chiave ai valori del paramter in questione
                    var value=termTAG.substr(termTAG.indexOf("\">")+"\">".length,termTAG.indexOf("</font>")-8);
                    value=value.substr(0,value.indexOf("</font>"));   
                    parameter.userValues.push(value);
                    //E infine, aggiungiamo alla training phrase divisa
                    splittedAnswer.push({
                        text: value,
                        entityType:"@"+parameter.name,
                        alias:parameter.name,
                    });
                }
            });
            */
            //Incrementiamo i per bypassare il pezzo appena considerato
            i+=termTAG.length;
            readerString=readerString.substr(termTAG.length,readerString.length-termTAG.length);
        }
        else{
            //carattere normale da aggiungere
            chars+=answer[i];
            i++;
        }
    }
    if (chars.length>0){
        //Signfica che c'è un ultimo pezzo da leggere
        splittedAnswer.push({
            text: chars
        });
        i=answer.length;
    }

    //Torniamo la training phrase divisa opportunamente
    return splittedAnswer;
}