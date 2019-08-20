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
                                //Ci sono variabili di input da prendere
                                var parameters=[];
                                var stringParameters=valueXML.substr(valueXML.indexOf("parameters: ")+"parameters: ".length,valueXML.indexOf("<br>")-"parameters: ".length);
                                stringParameters.split(",").forEach(element => {
                                    parameters.push(getParameterByXML(element));
                                });
                                valueXML=valueXML.substr(valueXML.indexOf("<br>")+4,valueXML.length);
                                
                                
    
                            }
                            var phrases=[];
                            var stringPhrases=valueXML.substr(valueXML.indexOf("phrases: ")+"phrases: ".length,valueXML.indexOf("<br>")-"phrases: ".length);
                            phrases=stringPhrases.split(",");
                            //Per ogni frase, dobbiamo andare a prendere il parametro
                            //Che poi diventeranno i parametri in base al colore
                            //
    
    
                            valueXML=valueXML.substr(valueXML.indexOf("<br>")+4,valueXML.length);
                            var risposte=valueXML.substr(valueXML.indexOf("risposta: ")+"risposta: ".length,valueXML.length-"risposta: ".length);
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

//Identifichiamo i parametri inseriti nella training phrase
function splitTrainingPhrases(phrase,parameters){
    //In base a come sono state colorate le parole tipo nella frase, corrispondono ai corrispettivi parametri identificati in precedenza
    
}

//Impostiamo i parametri in base ai colori e ai nomi
function getParameterByXML(parameterString){
    var color=parameterString.substr(parameterString.indexOf("color=\"#")+"color=\"#".length+1,parameterString.indexOf("\">")+"\">".length-"color=\"#".length);
    color=color.substr(0,color.indexOf("\">"));
    var name=parameterString.substr(parameterString.indexOf("\">")+"\">".length,parameterString.indexOf("</font>")-8);
    name=name.substr(0,name.indexOf("</font>"));
    return {
        color: color,
        name: name
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