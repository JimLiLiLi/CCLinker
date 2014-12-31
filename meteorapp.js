// simple-todos.js
Games = new Mongo.Collection('games');
Chatrooms = new Mongo.Collection('chatrooms');
usersData = new Mongo.Collection('usersData');
GlobalChat = new Mongo.Collection('globalchat');

if (Meteor.isClient) {

    Meteor.subscribe('games');
    Meteor.subscribe('chatrooms');
    Meteor.subscribe('globalchat');
    Meteor.autosubscribe(function(){
      Meteor.subscribe('usersData');
    });  

  Accounts.ui.config({ passwordSignupFields: 'USERNAME_ONLY' }); 




Template.globalchat.events({
  'keypress input, click .send-new-message-global' : function(event, template){
    if((event.type === 'click') || (event.keyCode === 13)){
      var message = template.find('.new-message-global').value;
      if(message){
        Session.set('sendingmMessage', true);
        Meteor.call('saveMessageGlobal', {user:Meteor.user().username, message:message}, function(err, id){
          if (err) {
            console.log(err);
            alert('Something defnitely went wrong!');
            Session.set('sendingmMessage', false);
          }          
          else {
            template.find('.new-message-global').value = '';
            Session.set('sendingmMessage', false);
          }

        });   
      }
    } 
  },
});

Template.globalchat.helpers({
  messages: function(){
    return GlobalChat.find({}, {sort: {timestamp:1}});
  },
  hidden: function(){
    return Session.get('sendingmMessage');
  },

});

UI.registerHelper("formatDate", function(date){
    var dt = new Date(date);
    return dt.toLocaleTimeString();
});


Template.participants.helpers({
  participants: function(){
    var users = Meteor.users.find({"status.online":true}).fetch(); 
    return _.sortBy(users, function(users) {
      return users.username.toLowerCase();
    }); 

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
      } else if(exist){
            var user =  Meteor.userId();
            Meteor.call('reopenChatRoom', {user:user,toId:toId,fromId: fromId}, function(err, success){

        });
      }  else{
        alert('error');
      } 
    }
  }
});

Template.chatrooms.helpers({

  chatrooms: function(){
    return Chatrooms.find({hidden:{$not:Meteor.userId()}});
  },

});

Template.chatroom.helpers({
  onlineFrom:function(){
    return Meteor.users.find({$and:[{"status.online":true},{"_id":this.fromId}]}).count();
  },
  onlineTo:function(){
    return Meteor.users.find({$and:[{"status.online":true},{"_id":this.toId}]}).count();
  },
  hidden:function(){
    var hideCount = Chatrooms.find(
    {
      $and:[
        {"_id":this._id},
        {'hidden.0': {$exists:true} }
      ]  
    }
    ).count();
    if (hideCount > 0){
      return true;
    } else{
      return false;
    }
  }
})

Chatrooms.find().observe({
  added: function(post){
    var wait = Meteor.setTimeout(function(){
      $('.chatroom').addClass(' active');
    }, 300);      
  },
  changed: function(post) {
    var wait = Meteor.setTimeout(function(){
      $('.messages').each(function(){
        $(this)[0].scrollTop =  $(this)[0].scrollHeight;
      });
    }, 300);    
  }
});

Template.chatroom.events({
  'keypress input, click .send-new-message' : function(event, template){
    if((event.type === 'click') || (event.keyCode === 13)){
      var message = template.find('.new-message').value;
      if(message){
        Meteor.call('saveMessage', {from:Meteor.user().username,message: message, timestamp: Date.now(), chatroom:this._id}, function(err, id){
          if (err) {
            alert('Something defnitely went wrong!');
          }          
          else {
            template.find('.new-message').value = '';
          }
        });   
      }
    } 
  },
  'click .close-chatroom' : function(events,template){
    var user =  Meteor.userId();
    Meteor.call('hideChat', {user:user,chatroom:this._id}, function(err, success){

    });
  },
  'click .header-chatroom, click .minus-chatroom': function(event,template){
    if(template.firstNode.className.indexOf('active') < 0){
        template.firstNode.className = template.firstNode.className + ' active';
    }else{
      template.firstNode.className = 'chatroom';
    }

  }
});

Template.message.helpers({
  fromMe: function(){
    return this.from === Meteor.user().username;
  }
});


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


HTTP.get('http://ip4.telize.com', function(err, result){
  if(err){
    console.log(err);
  } else {
    Session.set('ipUser', result.content);
  }
});

  HTTP.get('http://www.telize.com/geoip', function(err, result) {
    if(err){
      console.log(err);
    }else{
      var country = result.data.country_code;
      var continent = result.data.continent_code;
      Session.set('countryUser', country);
      Session.set('continentUser', continent);
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
      return Meteor.users.find({ "status.online": true }).count();
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
  alert(text.replace('\n',''));
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

Meteor.publish("usersData", function(users) {
    return Meteor.users.find({},{status:0});
});

Meteor.publish('globalchat', function(){
  return GlobalChat.find({},{sort:{timestamp:-1}, limit:50});
});

  UserStatus.events.on("connectionLogout", function(fields) {
    var user = fields.userId;
    var logOut = fields.logoutTime;

    Meteor.setTimeout(function(){

      var verifUser = Meteor.users.find({$and:[{"status.online":true},{"_id":user}]}).count();
      if(verifUser < 1){
        Games.remove({owner:user});
      }
    }, 30000);
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
  reopenChatRoom: function(chatroom){
      Chatrooms.update(
      {
        $and:[
          {'toId': chatroom.toId},
          {"fromId": chatroom.fromId}
        ]
        
      },
      {
        $pullAll:{
          hidden: [chatroom.toId,chatroom.fromId]
        }
      }
    )
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
  },
  saveMessageGlobal: function(message){
    console.log(message)
    GlobalChat.insert(
    {
      user: message.user,
      message: message.message,
      timestamp: Date.now()
    });
  }
});
}