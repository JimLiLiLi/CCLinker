// simple-todos.js
Games = new Mongo.Collection('games');
Chatrooms = new Mongo.Collection('chatrooms');

if (Meteor.isClient) {
  
  Meteor.subscribe('games');
  Meteor.subscribe('chatrooms');

  Accounts.ui.config({ passwordSignupFields: 'USERNAME_ONLY' });

  HTTP.get('http://www.telize.com/geoip', function(err, result) {
    if(err){
      console.log(err);
    }else{
      var ip = result.data.ip;
      var country = result.data.country_code;
      var continent = result.data.continent_code;
      Session.set('ipUser', ip);
      Session.set('countryUser', country);
      Session.set('continentUser', continent);
    }
  }); 




Template.sendMessage.events({
  'click .send-message': function(event, template) {
    var from = Meteor.user().username;
    var to = this.nick;
    var fromId = Meteor.userId();
    var toId = this.owner;
    var exist = Chatrooms.find({toId:toId}).count();
    if (!from) {
      alert('Fill out both fields yo!');
    } else {
      if(!exist){
        Meteor.call('createChatRoom', {from:from,to:to,fromId: fromId, toId:toId}, function(err, succes){

        });
      } else{
        alert('already exist');
      }   
    }
  }
});

Template.chatrooms.helpers({
  chatrooms: function(){
    return Chatrooms.find({hidden:{$not:Meteor.userId()}});
  },

});



Template.chatrooms.events({
  'click .send-new-message' : function(event, template){
    var message = template.find('.new-message').value;
    var messagebox = template.find('.messages');
    if(message){

      Meteor.call('saveMessage', {message: message, timestamp: Date.now(), chatroom:this._id}, function(err, id){
        if (err) {
          alert('Something defnitely went wrong!');
        }          
        else {
          template.find('.new-message').value = '';
          messagebox.scrollTop = messagebox.scrollHeight;
          console.log(messagebox.scrollTop);
          console.log(messagebox.scrollHeight);
        }
      });   
    } 
  },
  'click .close-chatroom' : function(events,template){
    var user =  Meteor.userId();
    Meteor.call('hideChat', {user:user,chatroom:this._id}, function(err, success){

    });
  }
})


  Template.modalCreate.events({
  
    'click #launch-host': function (event, template){ 
      event.preventDefault();
      var gameName = template.find('#gameName').value;
      var description = template.find('#description').value;
      var port = template.find('#port').value;
      var nick = Meteor.user().username;


      if ((gameName !== '')&&(port !== '')){

        var game = new Object();
        game.gameName = gameName;
        game.description = description;
        if(nick === ''){
          game.nick = 'Anon';
        }else{
          game.nick = nick;
        }
        game.port = port;
        game.ip = Session.get('ipUser');
        game.country =  Session.get('countryUser').toLowerCase();
        game.continent =  Session.get('continentUser');
        game.createdAt = new Date();
        Meteor.call('addGame', game, function(err){
         if(!err){
              window.location = template.find('#launch-host').href;
          } 
        });
        $('#modal-create').modal('hide');

      }
    },
    'keyup input#port':function(event, template){
      
      setTimeout(function(){         
        var port = template.find('#port').value;
        template.find('#launch-host').href = 'cccaster:'+port; 
      }, 300);
  
    }
  });

  Template.header.events({
    'click #create-lobby': function(event){
        $('#modal-create').modal('show');
    }
  });


  Template.modalCreate.helpers({
    getIp: function(){ 
      return Session.get('ipUser');     
    },

  });




Template.currentLobbies.helpers({
    games: function () {
      if (Session.get('filteredbyRegion')){
        var continent = Session.get('filteredbyRegion');
        return Games.find({continent:continent},{sort: {createdAt: -1}});
      }else{
        return Games.find({}, {sort: {createdAt: -1}});
      }  
    },  
    players: function(){
      return Meteor.users.find().count();
    },
});

Template.currentLobbies.events({
  'click #filterRegion .dropdown-menu li a': function(event, template){
    var filter = event.target.getAttribute('data-continent');
    if(filter !== 'all'){
      Session.set('filteredbyRegion', filter);
      template.find('#filterRegion .dropdown-toggle').innerHTML = 'Region / '+filter;
    } else{
      Session.set('filteredbyRegion', '');
      template.find('#filterRegion .dropdown-toggle').innerHTML = 'Region';
    }  
  }
});


// each game template 
var clockGame = new Deps.Dependency();

function CalcElapsedtime(created){
  clockGame.changed();
}
var clock = Meteor.setInterval(CalcElapsedtime, 60000);


function toClipboard(text) {
  window.alert(text);
}

Template.game.helpers({
    isOwner: function () {
        return this.owner === Meteor.userId();
    },
    elapsedtime : function (){
      clockGame.depend();
      var created =  this.createdAt;
      var now = new Date();
      var elapsed = Math.floor((now - created)/(1000*60)) +'min';
      return elapsed;
    } 
});

Template.game.events({
    'click .delete-lobby':function(event){
      event.preventDefault();
      Meteor.call('deleteGame', this._id);
    },
    'click .clipboard': function(event){
      event.preventDefault();
      var ip = event.target.getAttribute("data-ipclipboard");
      toClipboard(ip);
    }
});
}

if (Meteor.isServer) {
  Meteor.publish("games", function () {
    return Games.find({}, {sort: {createdAt: -1}});
  });

  Meteor.publish("chatrooms", function () {
    return Chatrooms.find(
      {
        $or:[
          {
            toId:this.userId
          },
          {
            fromId:this.userId
          },
        ]
      },
      {hidden:{$not:this.userId}}
      );
  });

  UserStatus.events.on("connectionLogout", function(fields) {
    var user = fields.userId;
    var logOut = fields.logoutTime;

    Meteor.setTimeout(function(){
      var verifUser = Meteor.users.findOne({},{_id:user});
      var online = verifUser.status.online;
      console.log(online);
      if(!online){
        Games.remove({owner:user});
      }
    }, 50000);
  });

Meteor.methods({
  addGame: function(game){
    Games.insert({
      gameName: game.gameName,
      description: game.description,
      nick: game.nick,
      port: game.port,
      ip: game.ip,
      country: game.country,
      continent: game.continent,
      createdAt: game.createdAt,
      owner: Meteor.userId()
    });    
  },
  deleteGame: function(gameId){
    Games.remove(gameId);
  },
  saveMessage: function(message){
   Chatrooms.update(
     {
      "_id": message.chatroom
     },
     {
      $push:{
        "messages" : message
      }
     }
   );
  },
  createChatRoom: function(involvedPlayers){
    Chatrooms.insert(involvedPlayers);
  },
  hideChat: function(chatroom){
    Chatrooms.upsert(
      {
        "_id": chatroom.chatroom
      },
      {
        $addToSet:{
          hidden: chatroom.user
        }
      }
    )
  }
});
}