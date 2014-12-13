// simple-todos.js
Games = new Mongo.Collection("games");

if (Meteor.isClient) {

  HTTP.post('//ip.jsontest.com/', function(err, result) {
    if(err){
      console.log('couldn\'t get ip')
    }else{
      var ip = result.data.ip;
      Session.set("ipuser", ip);
    }
  }); 

  // This code only runs on the client
  Template.body.helpers({
    games: function () {
      return Games.find({}, {sort: {createdAt: -1}});
    },
  });
  Template.mainNav.events({
    'click #create-lobby': function(event){
        $('#modal-create').modal('show');
    }
  });

  Template.modalCreate.helpers({
    getIp: function(){ 
      return Session.get('ipuser');     
    },
  });

  Template.modalCreate.events({
    'click #launch-host' : function(event, template){
      var set = template.find('#port').value;
      console.log(set);
      if (set !== ''){       
        $("#create-game").submit();        
      }else{
        event.preventDefault();
      }
    },    
    'submit #create-game': function (event, template){  
      event.preventDefault();

      var name = event.target.name.value;
      var port = event.target.port.value;


      if ((name !== '')&&(port !== '')){

        Games.insert({
          name: name,
          port: port,
          ip: Session.get('ipuser'),
          createdAt: new Date()
        });

        $('#modal-create').modal('hide');
        event.target.name.value = "";
        event.target.port.value = "";
      }
      return false;

    },
    'keyup input#port':function(event, template){

      setTimeout(function(){         
        var port = template.find("#port").value;
        template.find("#launch-host").href = 'cccaster:'+port;
        console.log(port);   
      }, 300);

    }
  });
}