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
    var ClassintentXML=require('./IntentXML');
    var ClassfollowupXML=require('./followupXML');
    var intentsXML=[];
    var followups=[];

    //Funzione di parsing

    parser.parseString(xml_string, function(error, result) {
        if(error === null) {
            //Leggiamo il grafo
            var graphXMLCells=result.mxfile.diagram[0].mxGraphModel[0].root[0].mxCell;
            for (var i=0;i<graphXMLCells.length;i++){
                if (graphXMLCells[i].ATTR.style!=undefined){
                    //Entità del grafo valida
                    //Verifichiamo se si tratta di un intent o di una freccia, che indica il follow-up tra entità
                    var valueXML=graphXMLCells[i].ATTR.value;
                    if (graphXMLCells[i].ATTR.style.indexOf('edgeStyle')>=0){
                        //Freccia
                        var followup=new ClassfollowupXML();
                        followup.father=graphXMLCells[i].ATTR.source;
                        followup.son=graphXMLCells[i].ATTR.target;
                        //Aggiungiamo
                        followups.push(followup);
                    }else{
                        //Entity
                        
                        if (valueXML.indexOf("nome: ")<0){
                            console.error("L'intent non ha un nome impostato");
                            break;
                        }
                        else{
                            //Spezziamo il contenuto del value
    
                            //Normalizziamo i caratteri speciali
                            valueXML.replace("&lt;","<");
                            valueXML.replace("&gt;",">");
                            valueXML.replace("&quot;","\"");
                            //Nome
                            var name=valueXML.substr(valueXML.indexOf("nome: ")+"nome: ".length,valueXML.indexOf("<br>")-"nome: ".length);
                            valueXML=valueXML.substr(valueXML.indexOf("<br>")+4,valueXML.length);
                            if (valueXML.indexOf("parameters: ")>=0){
                                //Ci sono parameters da prendere
                                var parameters=[];
                                var stringParameters=valueXML.substr(valueXML.indexOf("parameters: ")+"parameters: ".length,valueXML.indexOf("<br>")-"parameters: ".length);
                                //Li normalizziamo
                                stringParameters.split("§").forEach(element => {
                                    parameters.push(getParameterByXML(element));
                                });
                                valueXML=valueXML.substr(valueXML.indexOf("<br>")+4,valueXML.length);
                                
                                
    
                            }
                            var phrases=[];
                            var stringPhrases=valueXML.substr(valueXML.indexOf("phrases: ")+"phrases: ".length,valueXML.indexOf("<br>")-"phrases: ".length);
                            phrases=stringPhrases.split("§");
                            //Dobbiamo dividere ogni frase in pezzi.
                            //Il motivo è dato dalla eventuale presenza di termini chiave da associare ai parameters
                            phrases=phrases.map((phrase)=>{
                                return splitTrainingPhrase(phrase,parameters);
                            });
    
    
                            valueXML=valueXML.substr(valueXML.indexOf("<br>")+4,valueXML.length);
                            var risposte=valueXML.substr(valueXML.indexOf("risposta: ")+"risposta: ".length,valueXML.length-"risposta: ".length);
                            //Lo stesso criterio, lo dobbiamo applicare alle risposte
                            risposte=risposte.map((risposta)=>{
                                return splitAnswer(risposta,parameters);
                            });
                            
                            //Creiamo l'intent
                            var intentXML=new ClassintentXML();
                            intentXML.id=graphXMLCells[i].ATTR.id;
                            intentXML.name=name;
                            intentXML.trainingPhrases=phrases;
                            intentXML.risposte.push(risposte);
                            intentXML.parameters=parameters;
                            //lo aggiungiamo alla lista
                            intentsXML.push(intentXML);
    
                        }
                    }
                }
            }
            
            //Creiamo l'agente
            agentXML.setIntents(intentsXML);
            
           
        }
        else {
            return error;
        }
    });
    return agentXML;
}}

//Dividiamo la training phrase per trovare eventuali termini chiave da associare ai parameters del nostro intent
function splitTrainingPhrase(trainingPhrase,parameters){
    
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



    
    var chars="";
    //1- Analizziamo l'intera frase affinché possiamo riconoscere il testo puro dai temrini chiave da associare a un parameter
    for (var i=0;i<answer.length;i++){
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

                //Svuotiamo
                chars="";
            }
            //È un termine chiave: ce lo andiamo a prendere
            var termTAG=answer.substr(i,answer.indexOf("</font>")-i+"</font>".length);
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
                    splittedAnswer.push({
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
            chars+=answer[i];
        }
    }

    //Torniamo la training phrase divisa opportunamente
    return splittedAnswer;
}