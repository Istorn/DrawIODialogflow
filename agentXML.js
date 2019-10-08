module.exports=class AgentXML{
    constructor(){
        this.name="";
        this.idGraph="";
        this.intents=[];
        this.contexts=[];
        this.fullfillment="";
        this.followups=[];
        this.inputContext=[];
        this.outputContext=[];
    
        
    }
    
    setIntents(intents){
        this.intents=intents;
    };
    setOutputContexts(contexts){
        this.outputContext=contexts;

    }
    setInputcontexts(contexts){
        this.inputContext=contexts;
    }

    setFullfillment(fullfillmentFile){
        this.fullfillment=fullfillmentFile;
    }
    setFollowups(followups){
        this.followups=followups;
    }
    //Restituisce i follow up figli dato l'id dell'intent
    getFollowUPSByIntent(intentID){
        var intentsName=[];
        this.followups.forEach((followUp)=>{
            if (followUp.father==intentID){
                intentsName.push(followUp.son);
            }
        });
        return intentsName;
    }
}