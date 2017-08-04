$(document).ready(function(){
  function updateActiveNumbers(numberString) {
    activeNumberObj.innerHTML = numberString;
  }

  console.log("Initialized");
  // Pusher initialization
  var pusher = new Pusher('9c4d0fbc3061dba493b0');
  var channel = pusher.subscribe('YOURAPPKEY');
  var channel_data = {};
  var current_member_in_room = {}
  var members_in_room = [];
  var other_members_in_room = [];
  var room_name = '';

  const activeNumberObj = document.getElementById("activeNumberId");
  const apiKeyObj = document.getElementById("apiKeyId");

  let APIdazeAPIkey = null;

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
  });

  channel.bind('incomingcall', function(data) {
    console.log("PUSHER incomingcall event received with uuid : " + data.uuid + ", caller id number : " + data.caller_id_number + ", exiting : " + data.exiting);
    channel_data = data; // Fill channel_data with what we received from Pusher
    $("#call_to_answer").text(data.caller_id_number);
    $("#answer").attr("disabled", false);
    if (data.exiting === "true") {
      // Caller has hung up the call
      $("#answer").attr("disabled", true);
      $("#call_to_answer").empty();
      channel_data = {};
    }
  });
  // APIdaze client initialization
  var call = {};
  var audiostarted = false;
  var client = new APIdaze.CLIENT({
    type:"webrtc",
    debug:true,
    audio:true,
    video:false,
    apiKey: APIdazeAPIkey,
    forcewsurl: "wss://ws2.apidaze.io:443",
    onReady: function(){
      console.log("Client ready");
      $("#call").attr("disabled", false).val("Call");
    },
    onDisconnected: function(){
      console.log("Client disconnected");
      $("#call").attr("disabled", false).val("Call");
    }
  });
  function resetClient() {
    client.freeALL();
    client = new APIdaze.CLIENT({
      type:"webrtc",
      debug:true,
      audio:true,
      video:false,
      apiKey: APIdazeAPIkey,
      forcewsurl: "wss://ws2.apidaze.io:443",
      onReady: function(){
        $("#call").attr("disabled", false).val("Call");
      },
      onDisconnected: function(){
        resetClient();
        $("#call").attr("disabled", false).val("Call");
      }
    });
  };
  // Answer a call
  $("#answer").click(function(){
    $("#hangup-in").attr("disabled", false);
    $("#answer").attr("disabled", true).val("In call");
    call = client.call(
      {
        destination_number: "interception",
        uuid_to_intercept: channel_data.uuid
      },
      {
        onHangup: function() {
          console.log("Call hangup");
          $("#answer").attr("disabled", false).val("Answer");
          $("#hangup-in").attr("disabled", true);
          channel_data = {};
          resetClient();
        }
      }
    );
  });
  // Place a call
  $("#call").click(function(){
    $("#call").attr("disabled", true).val("Calling");
    call = client.call(
      {
        destination_number: $("#number_to_call").val(),
        action: "directcall"
      },
      {
        onRinging: function() {
          console.log("Call ringing");
          $("#call").val("Ringing");
        },
        onAnswer: function() {
          console.log("Call answered");
          $("#hangup").attr("disabled", false);
          $("#call").val("In call");
          audiostarted = true;
          console.log("Call answered");
        },
        onHangup: function() {
          console.log("Call hangup");
          $("#hangup").attr("disabled", true);
          $("#call").attr("disabled", false).val("Call");
          resetClient();
        }
      }
    );
  });
  $("#hangup").click(function(){
    call.hangup();
    $("#hangup").attr("disabled", true);
  });
  $("#hangup-in").click(function(){
    call.hangup();
    $("#hangup-in").attr("disabled", true);
  });
  $("#invite_number_to_conference").on("click", "input[type='button']", function(){
    console.log("Clicked invite");
    var number = $("#invite_number_to_conference input[type='text']").val();
    console.log("Number : " + number);
    call.inviteToConference(room_name, number, "33170567760");
  });
  $("tbody").on("click", "input.kick_button", function(){
    var sessid = $(this).attr("sessid");
    console.log("Clicked on kick button sessid : " + sessid);
    call.kickFromConference(room_name, sessid);
  });
  $("tbody").on("click", "input.mute_button", function(){
    var conference_member_id = $(this).attr("confMemberID");
    console.log("Clicked on mute button conference_member_id : " + conference_member_id);
    var muted = $("#" + $(this).attr("sessid")).attr("muted");
    console.log("muted : " + muted);
    if (muted === "true") {
      call.unmuteInConference(room_name, conference_member_id);
    } else {
      call.muteInConference(room_name, conference_member_id);
    }
  });
  $("#joinroom").click(function(){
    call = client.call(
      {
        command: "joinroom",
        username: "guest",
      },
      {
        onRoomInit: function(event) {
          console.log('RoomInit : ' + JSON.stringify(event.roomname));
          var room = event.roomname;
          $("#joinroom").attr("disabled", true);
          $("#my_status_inroom").text("In '" + room + "'");
          room_name = room;
        },
        onRoommembers: function(event) {
          console.log('Got members for this room : ' + JSON.stringify(event.members));
          members_in_room = event.members;
          other_members_in_room = [];
          $("#members_in_room_id > tbody").empty();
          if(typeof members_in_room !== "undefined" && members_in_room !== null && call !== null) {
            members_in_room.forEach(function (member) {
              console.log("call.callID : " + call.callID);
              console.log("member.sessid : " + member.sessid);
              $("#invite_number_to_conference input").attr("disabled", false);
              //	$("#members_in_room_id > tbody").append('<tr id="invite_number_to_conference"><td style="width: 150px"><input type="text" placeholder="E.g. : 33123456789"/></td><td><input type="button" style="width: 90px" value="Call" /></td></tr>');
              if (member.sessid === call.callID) {
                $("#members_in_room_id > tbody").append('<tr id="' + member.sessid +'" muted=false><td style="width: 150px">' + member.nickname + ' (me)</td><td style="width: 100px" id="' + member.sessid + '-energyscore"></td><td><input class="mute_button" confMemberID="' + member.conferenceMemberID + '" sessid="' + member.sessid + '" type="button" style="width: 90px" value="Toggle Mute" /><input class="kick_button" sessid="' + member.sessid + '" type="button" style="width: 90px" value="Leave" /></td></tr>');
                current_member_in_room = member;
              } else {
                $("#members_in_room_id > tbody").append('<tr id="' + member.sessid +'" muted=false><td style="width: 150px">' + member.nickname + '</td><td style="width: 100px" id="' + member.sessid + '-energyscore"></td><td><input class="mute_button" confMemberID="' + member.conferenceMemberID + '" sessid="' + member.sessid + '" type="button" style="width: 90px" value="Toggle Mute" /><input class="kick_button" sessid="' + member.sessid + '" type="button" style="width: 90px" value="Kick" /></td></tr>');
                other_members_in_room.push(member);
              }
            });
          }
          console.log('current_member_in_room : ' + JSON.stringify(current_member_in_room));
          console.log('other_members_in_room : ' + JSON.stringify(other_members_in_room));
          console.log('members_in_room : ' + JSON.stringify(members_in_room));
        },
        onJoinedroom: function(event) {
          console.log('New member : ' + JSON.stringify(event.member));
          members_in_room.push(event.member);
          other_members_in_room.push(event.member);
          $("#members_in_room_id > tbody").append('<tr id="' + event.member.sessid +'" muted=false><td style="width: 150px">' + event.member.nickname + ' </td><td style="width: 150px" id="' + event.member.sessid + '-energyscore"></td><td><input class="mute_button" confMemberID="' + event.member.conferenceMemberID + '" sessid="' + event.member.sessid + '" type="button" style="width: 90px" value="Toggle Mute" /><input class="kick_button" sessid="' + event.member.sessid + '" type="button" style="width: 90px" value="Kick" /></td></tr>');
        },
        onLeftroom: function(event) {
          console.log('Member left : ' + JSON.stringify(event.member));
          $("#" + event.member.sessid).remove();
          if(call !== null && event.member.sessid === call.callID) {
            current_member_in_room = '';
          }
          for (var index = 0; index < members_in_room.length; index++){
            if (members_in_room[index].sessid === event.member.sessid) {
              members_in_room.splice(index,1);
              console.log('after user left members : ' + JSON.stringify(members_in_room));
            }
          }
          for (var index = 0; index < other_members_in_room.length; index++){
            if (other_members_in_room[index].sessid === event.member.sessid) {
              other_members_in_room.splice(index,1);
              console.log('after user left other members : ' + JSON.stringify(other_members_in_room));
            }
          }
        },
        onTalking: function(event) {
          console.log("Talking event : " + JSON.stringify(event.member));
          $("#" + event.member.sessid + "-energyscore").text(event.member.energyScore);
          if (event.member.muted === true) {
            $("#" + event.member.sessid + " td").css('background-color', 'red');
            $("#" + event.member.sessid).attr("muted", true);
            $("#" + event.member.sessid + "-energyscore").text('N/A');
          } else {
            $("#" + event.member.sessid + " td").css('background-color', 'white');
            $("#" + event.member.sessid).attr("muted", false);
          }
        },
        onHangup: function(){
          console.log('Hangup ; Conference ');
          $("#joinroom").attr("disabled", false);
          $("#my_status_inroom").empty();
          $("#members_in_room_id > tbody").empty();
          $("#invite_number_to_conference input").attr("disabled", true);
          resetClient();
        }
      });
    });
  })