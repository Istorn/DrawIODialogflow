module.exports=class IntentXML{
    constructor(){
        this.id="";
        this.name="";
        this.trainingPhrases=[];
        this.risposte=[];
        this.parameters=[];
        this.parentFollowupIntentName="";
        this.rootFollowupIntentName="";
        this.inputContexts=[];
        this.outputContexts=[];
    }
}

