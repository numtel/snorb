'use strict';

var lute;

jQuery(function($){
  // Initialize snorb
  lute = new snorb.core.Scene('game');
  lute.addTerra();

  // Build simple UI
  var filename = '',
      panel = $('<div id="panel" />'),
      actionBar = $('<div id="action-bar" />').appendTo(panel),
      actionNew = $('<button><i class="fa fa-file-o"></i></button>').appendTo(actionBar)
        .on('click', function(){
          var size=prompt('What size for map?', '100, 100');
          if(size === null){
            return;
          }
          size = size.split(',');
          if(size.length === 2){
            var isValid = true;
            _.each(size, function(s, i, l){
              l[i] = parseInt($.trim(s),10);
              if(isNaN(l[i]) || l[i]<0){
                isValid = false;
              };
            });
            if(!isValid){
              alert('Invalid integer!');
              return;
            };
          }else{
            alert('Invalid input!');
            return;
          }
          lute.reset();
          lute.addTerra({size: {x:size[0], y:size[1]}});
          toolSelector.trigger('change');
          filename='';
        }),
      actionOpen = $('<button><i class="fa fa-folder-open-o"></i></button>').appendTo(actionBar)
        .on('click', function(){
          var name = prompt('Please input the name you would like to open:');
          if(name!==null){
            var data = window.localStorage.getItem(name);
            if(data === null){
              alert('No save exists with that name. Please try again.');
              return;
            }
            filename = name;
            var parsedData = JSON.parse(data);
            lute.reset(parsedData);
            toolSelector.trigger('change');
          }
        }),
      actionSave = $('<button><i class="fa fa-floppy-o"></i></button>').appendTo(actionBar)
        .on('click', function(){
          var name = prompt('Please input the name you would like to save as:', filename);
          if(name!==null && name!==''){
            var data = window.localStorage.getItem(name);
            if(data !== null && !confirm('A save already exists with that name. Overwrite?')){
              return;
            }
            var newData = JSON.stringify(lute.prepareData());
            window.localStorage.setItem(name, newData);
            filename = name;
          }
        }),
      toolSelector = $('<select id="active-tool" />').appendTo(panel)
        .on('change', function(){
          lute.setTool($(this).val());
        });
  // Add tools to selector
  _.each(lute.tools, function(tool, key){
    toolSelector.append('<option value="' + _.escape(key) + '"' +
      (lute.activeTool === key ? ' selected' : '') + '>' + 
      _.escape(tool.label) + '</option>');
  });
  // Build initial options panel
  toolSelector.trigger('change');
  panel.appendTo('body');
});
