module.exports=class AgentXML{
    constructor(){
        this.name="";
        this.intents=[];
        this.contexts=[];
        this.fullfillment="";
        this.followups=[];
    }
    setIntents(intents){
        this.intents=intents;
    };
    setContexts(contexts){
        this.contexts=contexts;

    }
    setFullfillment(fullfillmentFile){
        this.fullfillment=fullfillmentFile;
    }
    setFollowups(followups){
        this.followups=followups;
    }
}