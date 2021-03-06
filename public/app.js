function updateActiveNumbers(numberString) {
  activeNumberObj.innerHTML = numberString;
  incomingCallNumberObj.innerHTML = numberString;
  activeNumber = numberString;
}

function buildIncomingCallsList(callsList) {
  incomingCallsTableObj.innerHTML = "";

  if (callsList === null) {
    return;
  }

  Object.keys(callsList).map(function(firebaseKey, index) {
    console.log("[buildIncomingCallsList] callsList[firebaseKey] :", JSON.stringify(callsList[firebaseKey]))

    let html =
    '<td style="width: 150px">' +
    '<div>' + callsList[firebaseKey].caller_id_number + '</div>' +
    '</td>' +
    '<td>' +
    '<input class="answer-button" type="button" style="width: 90px" value="Answer" />' +
    '</td>' +
    '<td>' +
    '<input class="hangup-button" type="button" style="width: 90px" value="Hangup" disabled/>' +
    '</td>';

    let tr = document.createElement("tr");
    tr.setAttribute("id", firebaseKey)
    tr.setAttribute("uuid", callsList[firebaseKey].uuid)
    tr.innerHTML = html;

    let onAnswerClicked = function(){
      console.log("Clicked to answer call, uuid : " + this.parentNode.parentNode.getAttribute("uuid"));
      this.disabled = true;
      this.parentNode.parentNode.querySelector("input.hangup-button").disabled = false;

      let callUUID = this.parentNode.parentNode.getAttribute("uuid");
      call = APIdazeClientObj.call(
        {
          destination_number: "interception",
          command: "interceptCall",
          uuid_to_intercept: callUUID
        },
        {
          onHangup: function() {
            console.log("Call hangup");
            resetView();
          }
        }
      );
    }
    let onHangupClicked = function(){
      console.log("Clicked to hangup call, uuid : " + this.parentNode.parentNode.getAttribute("uuid"));
      call.hangup();
      this.disabled = true
    }

    tr.getElementsByClassName("answer-button")[0].onclick = onAnswerClicked;
    tr.getElementsByClassName("hangup-button")[0].onclick = onHangupClicked;

    incomingCallsTableObj.appendChild(tr);
  });
}

console.log("Initialized");
var current_member_in_room = {}
var members_in_room = [];
var other_members_in_room = [];

// APIdaze APIdazeClientObj initialization
var call = null;
var conferenceCall = null;
var audiostarted = false;
var APIdazeClientObj = null;
var APIdazeAPIkey = null;
var activeNumber = "N/A";

const activeNumberObj = document.getElementById("activeNumberId");
const apiKeyObj = document.getElementById("apiKeyId");
const callActionsSectionObj = document.getElementById("callActionsSectionId");
const incomingCallNumberObj = document.getElementById("incomingCallNumberId");
const incomingCallsTableObj = document.getElementById("incomingCallsTableId");
const outgoingCallStartButtonObj = document.getElementById("outgoingCallStartButtonId");
const outgoingCallHangupButtonObj = document.getElementById("outgoingCallHangupButtonId");
const outgoingCallNumberObj = document.getElementById("outgoingCallNumberId");
const inviteNumberToConferenceButtonObj = document.getElementById("inviteNumberToConferenceButtonId");
const inviteNumberToConferenceTextObj = document.getElementById("inviteNumberToConferenceTextId");
const myStatusInRoomObj = document.getElementById("myStatusInRoomId");
const joinRoomButtonObj = document.getElementById("joinRoomButtonId");
const membersInRoomObj = document.getElementById("membersInRoomId");
const rttObj = document.getElementById("rttId");
const rttAppreciationObj = document.getElementById("rttAppreciationId");
var rttInterval = null; // Do something we this variable


/**
* Firebase listeners
*/
firebase.database().ref('number').on('value', function(snapshot) {
  console.log("numbers updated", JSON.stringify(snapshot.val()))
  updateActiveNumbers(snapshot.val() || "Please set the 'number' attribute in Firebase");
});

firebase.database().ref('apikey').on('value', function(snapshot) {
  console.log("apikey updated", JSON.stringify(snapshot.val()))
  apiKeyObj.innerHTML = snapshot.val() || "Please set the 'apikey' attribute in Firebase";
  APIdazeAPIkey = snapshot.val();
  if (snapshot.val() === null) {
    callActionsSectionObj.style.display = "none";
  } else {
    callActionsSectionObj.style.display = "inherit";
    initAPIdazeCLIENT();
  }
});

firebase.database().ref('incomingcalls').on('value', function(snapshot) {
  console.log("incomingcalls updated", JSON.stringify(snapshot.val()))
  buildIncomingCallsList(snapshot.val())
});

function resetView() {
  outgoingCallStartButtonObj.disabled = false;
  outgoingCallStartButtonObj.setAttribute("value", "Call");
  joinRoomButtonObj.disabled = false;
  joinRoomButtonObj.setAttribute("value", "Join");
  rttObj.innerHTML = "-1";
};

function initAPIdazeCLIENT() {
  APIdazeClientObj = new APIdaze.CLIENT({
    type:"webrtc",
    apiKey: APIdazeAPIkey,
    wsurl: "wss://ws2-dev-fr-par-1.apidaze.io:443",
    debug: true,
    onReady: function(){
      getRTT();
      resetView();
    },
    onDisconnected: function(){
      resetView();
    }
  });
}

function getRTT() {
  rttInterval = setInterval(function() {
    APIdazeClientObj.ping(function(rtt){
      rttObj.innerHTML = rtt;
      if (rtt <= 50) {
        rttAppreciationObj.innerHTML = "(good)";
      } else if (rtt <= 100) {
        rttAppreciationObj.innerHTML = "(that's ok)";
      } else if (rtt <= 150) {
        rttAppreciationObj.innerHTML = "(not bad)";
      } else if (rtt <= 200) {
        rttAppreciationObj.innerHTML = "(not good)";
      } else {
        rttAppreciationObj.innerHTML = "(too high)";
      }
    });
  }, 2000);
}

// Place a call
outgoingCallStartButtonObj.onclick = function(){
  outgoingCallStartButtonObj.disabled = true;
  outgoingCallStartButtonObj.setAttribute("value", "Calling");

  call = APIdazeClientObj.call(
    {
      destination_number: outgoingCallNumberObj.value,
      number_to_call: outgoingCallNumberObj.value,
      command: "placeCall"
    },
    {
      onRinging: function() {
        console.log("Call ringing");
        outgoingCallStartButtonObj.setAttribute("value", "Ringing");
      },
      onAnswer: function() {
        console.log("Call answered");
        outgoingCallHangupButtonObj.disabled = false;
        outgoingCallStartButtonObj.setAttribute("value", "In call");
        audiostarted = true;
      },
      onHangup: function() {
        console.log("Call hangup");
        outgoingCallHangupButtonObj.disabled = true;
        outgoingCallStartButtonObj.disabled = false;
        outgoingCallStartButtonObj.setAttribute("value", "Call");
        resetView();
      }
    }
  );
}

outgoingCallHangupButtonObj.onclick = function(){
  call.hangup();
  outgoingCallHangupButtonObj.disabled = true;
}

inviteNumberToConferenceButtonObj.onclick = function(){
  console.log("Clicked invite");
  var number = inviteNumberToConferenceTextObj.value;
  console.log("Number : " + number);
  conferenceCall.inviteToConference(number, activeNumber);
}

joinRoomButtonObj.onclick = function(){
  joinRoomButtonObj.disabled = true;
  conferenceCall = APIdazeClientObj.call(
    {
      command: "joinRoom",
      userName: "guest",
    },
    {
      onRoomMembersInitialList: function(members) {
        console.log('Got members for this room : ' + JSON.stringify(members));
        members_in_room = members;
        other_members_in_room = [];
        membersInRoomObj.innerHTML = "";
        if(typeof members_in_room !== "undefined" && members_in_room !== null && conferenceCall !== null) {
          members_in_room.forEach(function (member) {
            console.log("call.conferenceMemberID : " + conferenceCall.conferenceMemberID);
            console.log("member.conferenceMemberID : " + member.conferenceMemberID);
            inviteNumberToConferenceTextObj.disabled = false;
            inviteNumberToConferenceButtonObj.disabled = false;
            let tr = document.createElement("tr");
            tr.setAttribute("id", member.conferenceMemberID);
            tr.setAttribute("muted", false);

            if (member.conferenceMemberID == conferenceCall.conferenceMemberID) {
              tr.innerHTML =
              '<td style="width: 150px">' + member.nickname + ' (me)</td>' +
              '<td style="width: 100px" id="' + member.conferenceMemberID + '-energyscore"></td>' +
              '<td>' +
              ' <input class="mute_button" confmemberid="' + member.conferenceMemberID + '" type="button" style="width: 90px" value="Toggle Mute" />' +
              ' <input class="kick_button" confmemberid="' + member.conferenceMemberID + '" type="button" style="width: 90px" value="Leave" />'+
              '</td>';

              current_member_in_room = member;
            } else {
              tr.innerHTML =
              '<td style="width: 150px">' + member.nickname + '</td>' +
              '<td style="width: 100px" id="' + member.conferenceMemberID + '-energyscore"></td>' +
              '<td>' +
              ' <input class="mute_button" confmemberid="' + member.conferenceMemberID + '" type="button" style="width: 90px" value="Toggle Mute" />' +
              ' <input class="kick_button" confmemberid="' + member.conferenceMemberID + '" type="button" style="width: 90px" value="Kick" />'+
              '</td>';

              other_members_in_room.push(member);
            }

            // conference control kick mute
            tr.querySelector("input.kick_button").onclick = function(){
              console.log("Clicked on kick button confmemberid : " + this.getAttribute("confmemberid"));
              conferenceCall.kickFromConference(this.getAttribute("confmemberid"));
            }

            // conference control mute mute
            tr.querySelector("input.mute_button").onclick = function(){
              console.log("Clicked on mute button confmemberid : " + this.getAttribute("confmemberid"));
              var muted = this.parentNode.parentNode.getAttribute("muted");
              console.log("muted : " + muted);
              if (muted === "true") {
                conferenceCall.unmuteInConference(this.getAttribute("confmemberid"));
              } else {
                conferenceCall.muteInConference(this.getAttribute("confmemberid"));
              }
            }


            membersInRoomObj.appendChild(tr);
          });
        }
        console.log('current_member_in_room : ' + JSON.stringify(current_member_in_room));
        console.log('other_members_in_room : ' + JSON.stringify(other_members_in_room));
        console.log('members_in_room : ' + JSON.stringify(members_in_room));
      },
      onRoomAdd: function(member) {
        console.log('New member : ' + JSON.stringify(member));
        members_in_room.push(member);
        other_members_in_room.push(member);
        let tr = document.createElement("tr");
        tr.setAttribute("id", member.conferenceMemberID);
        tr.setAttribute("muted", false);

        tr.innerHTML =
        '<td style="width: 150px">' + member.nickname + ' </td>' +
        '<td style="width: 150px" id="' + member.conferenceMemberID + '-energyscore"></td>' +
        '<td>' +
        ' <input class="mute_button" confmemberid="' + member.conferenceMemberID + '" type="button" style="width: 90px" value="Toggle Mute" />' +
        ' <input class="kick_button" confmemberid="' + member.conferenceMemberID + '" type="button" style="width: 90px" value="Kick" />' +
        '</td>';

        // conference control kick mute
        tr.querySelector("input.kick_button").onclick = function(){
          conferenceCall.kickFromConference(this.getAttribute("confmemberid"));
        }

        // conference control mute mute
        tr.querySelector("input.mute_button").onclick = function(){
          console.log("Clicked on mute button conference_member_id : " + this.getAttribute("confmemberid"));
          var muted = this.parentNode.parentNode.getAttribute("muted");
          console.log("muted : " + muted);
          if (muted === "true") {
            conferenceCall.unmuteInConference(this.getAttribute("confmemberid"));
          } else {
            conferenceCall.muteInConference(this.getAttribute("confmemberid"));
          }
        }

        membersInRoomObj.appendChild(tr);
      },
      onRoomDel: function(member) {
        console.log('Member left : ' + JSON.stringify(member));
        document.getElementById(member.conferenceMemberID).remove();
        if(conferenceCall !== null && member.conferenceMemberID === conferenceCall.callID) {
          current_member_in_room = '';
        }
        for (var index = 0; index < members_in_room.length; index++){
          if (members_in_room[index].conferenceMemberID === member.conferenceMemberID) {
            members_in_room.splice(index,1);
            console.log('after user left members : ' + JSON.stringify(members_in_room));
          }
        }
        for (var index = 0; index < other_members_in_room.length; index++){
          if (other_members_in_room[index].conferenceMemberID === member.conferenceMemberID) {
            other_members_in_room.splice(index,1);
            console.log('after user left other members : ' + JSON.stringify(other_members_in_room));
          }
        }
      },
      onRoomTalking: function(member) {
        console.log("Talking event : " + JSON.stringify(member));
        let memberObj = document.getElementById(member.conferenceMemberID);
        let energyScoreTextObj = document.getElementById(member.conferenceMemberID + "-energyscore");

        energyScoreTextObj.innerHTML = member.energyScore;
        if (member.muted === true) {
          memberObj.querySelector("td").style.backgroundColor = "red";
          memberObj.setAttribute("muted", true);
          energyScoreTextObj.innerHTML = "N/A";
        } else {
          memberObj.querySelector("td").style.backgroundColor = "white";
          memberObj.setAttribute("muted", false);
        }
      },
      onHangup: function(){
        console.log('Hangup ; Conference ');
        joinRoomButtonObj.disabled = false;
        myStatusInRoomObj.innerHTML = "";
        membersInRoomObj.innerHTML = "";
        inviteNumberToConferenceTextObj.disabled = true;
        inviteNumberToConferenceButtonObj.disabled = true;
        resetView();
      }
    });
  }
