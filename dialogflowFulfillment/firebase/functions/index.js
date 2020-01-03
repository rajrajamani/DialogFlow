// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const admin = require('firebase-admin');
const settings = {/* your settings... */ timestampsInSnapshots: true};
 
process.env.DEBUG = 'dialogflow:*'; // enables lib debugging statements
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
   //function yourFunctionHandler(agent) {
    //agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
    //agent.add(new Card({
    //     title: `Title: this is a card title`,
    //     imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
    //     text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
    //     buttonText: 'This is a button',
    //     buttonUrl: 'https://assistant.google.com/'
    //  })
    // );
     //agent.add(new Suggestion(`Quick Reply`));
     //agent.add(new Suggestion(`Suggestion`));
     //agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
   //}
  
  function initDatabase() {
    // The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
	const functions = require('firebase-functions');

	// The Firebase Admin SDK to access the Firebase Realtime Database.
	const admin = require('firebase-admin');
	admin.initializeApp();
    return admin.firestore();
  }
  
  function attitudeCaptureHandler(agent) {
	 // Get parameter from Dialogflow with the string to add to the database
    const scoreVal = agent.parameters.score;
	var dVal = agent.parameters.date;
    const person = agent.parameters.person.name.toLowerCase();
	var dateVal = null;
    if (dVal === null || dVal === '') {
        var localDate = new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"}); 
    	dateVal = new Date(localDate);
    } else {
      	dateVal = new Date (dVal);
    }
    
    let formatted_date =  (dateVal.getMonth() + 1) + "-" + dateVal.getDate() + "-" + dateVal.getFullYear();
    
    var isAnika = person === 'anika';
    var isArjun = person === 'arjun';
    
    if (scoreVal > 5) {
      agent.add(`Sorry, ${person}, Scores can't be greater than 5`);
      return;
    }
    
    // Get the database collection 'dialogflow' and document 'agent' and store
    // the document  {entry: "<value of database entry>"} in the 'agent' document
    var dialogflowAgentRef = null;
    var statsRef = null;
   	
    let data = {
      	person:person, 
  		score: scoreVal
	};
    
    dialogflowAgentRef = db.collection('atscores').doc(formatted_date);

    var average = -1;
    var count = -1;
    return db.runTransaction(t => {
      if (isAnika) {
        statsRef = db.collection('stats').doc('anika');
        return t.get(statsRef)
        	.then(doc=> {
        		average = doc.data().allTimeAverage;
          		count = doc.data().allTimeCount;
          		let newAverage = (average * count + scoreVal)/(count+1);
          		let newCount = count+1;
          		t.update(statsRef,{allTimeCount:newCount});
          		t.update(statsRef,{allTimeAverage:newAverage});
			    t.set(dialogflowAgentRef, {anika:data}, {merge: true});
          		average = newAverage;
          		count = newCount;
        });
      } else if (isArjun) {
        statsRef = db.collection('stats').doc('arjun');
        return t.get(statsRef)
        	.then(doc=> {
        		average = doc.data().allTimeAverage;
          		count = doc.data().allTimeCount;
          		let newAverage = (average * count + scoreVal)/(count+1);
          		let newCount = count+1;
          		t.update(statsRef,{allTimeCount:newCount});
          		t.update(statsRef,{allTimeAverage:newAverage});
			    t.set(dialogflowAgentRef, {arjun:data}, {merge: true});
          		average = newAverage;
          		count = newCount;
        });
      } else {
	    t.set(dialogflowAgentRef, {default:data}, {merge: true});  
      }
      return Promise.resolve('Write complete');
    }).then(doc => {
      agent.add(`Thanks ${person}.  I have logged "${scoreVal}" to the database. Your average is ${average} from ${count} days`);
    }).catch(err => {
      console.log(`Error writing to Firestore: ${err}`);
      agent.add(`Failed to write "${scoreVal}" to the database.`);
    });
  }

    
  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('Attitude Capture', attitudeCaptureHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});
