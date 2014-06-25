'use strict';

var lute;

jQuery(function($){
  // Initialize snorb
  lute = new snorb.core.Scene('game');
  lute.addTerra();

  // Build simple UI
  var filename = '',
      panel = $('<div id="panel" />'),
      loading = $('#loading'),
      actionBar = $('<div id="action-bar" />').appendTo(panel),
      actionNew = $('<button><i class="fa fa-file-o"></i></button>')
        .appendTo(actionBar)
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
          };
          loading.show();
          setTimeout(function(){
            lute.reset();
            lute.addTerra({size: {x:size[0], y:size[1]}});
            toolSelector.trigger('change');
            filename='';
            loading.hide();
          },0);
        }),
      actionOpen = $('<button><i class="fa fa-folder-open-o"></i></button>')
        .appendTo(actionBar)
        .on('click', function(){
          var name = prompt('Please input the name you would like to open:');
          if(name!==null){
            var data = window.localStorage.getItem(name);
            if(data === null){
              alert('No save exists with that name. Please try again.');
              return;
            };
            loading.show();
            setTimeout(function(){
              filename = name;
              var parsedData = JSON.parse(data);
              lute.reset(parsedData);
              toolSelector.trigger('change');
              loading.hide();
            },0);
          };
        }),
      actionSave = $('<button><i class="fa fa-floppy-o"></i></button>')
        .appendTo(actionBar)
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
      actionHelp = $('<button><i class="fa fa-question"></i></button>')
        .appendTo(actionBar)
        .on('click', function(){
          alert(['Right Click - Center View on Map',
                 'Mouse Wheel - Zoom',
                 'Shift - Rotate View Temporarily',
                 '',
                 'Games are saved in local storage.'].join('\n'));
        }),
      toolSelector = $('<select id="active-tool" />')
        .appendTo(actionBar)
        .on('change', function(){
          lute.setTool($(this).val());
          if(activeToolOptions){
            activeToolOptions.remove();
          }
          activeToolOptions = buildToolOptions();
          activeToolOptions.appendTo(panel);
        }),
      buildToolOptions = function(toolKey){
        if(toolKey === undefined){
          toolKey = toolSelector.val();
        }
        var optionPanel = $('<div class="tool-options" />'),
            tool = lute.tools[toolKey],
            activeRow, curEl;
        for(var i in tool.fieldDefinitions){
          if(tool.fieldDefinitions.hasOwnProperty(i) && 
              typeof tool.fieldDefinitions[i] === 'object'){
            activeRow = $('<label />').appendTo(optionPanel);
            activeRow.append('<span>' + _.escape(tool.fieldDefinitions[i].label) + '</span>');
            switch(tool.fieldDefinitions[i].type){
              case 'int':
                curEl = $(
                  '<input type="range" min="' + _.escape(tool.fieldDefinitions[i].min) + '" ' +
                  'max="' + _.escape(tool.fieldDefinitions[i].max) + '" step="1" value="' +
                  _.escape(tool.data[i]) + '" name="' + _.escape(i) + '">');
                curEl.on('change', function(){
                  var optionName=$(this).attr('name'),
                      newValue=parseInt($(this).val(),10);
                  tool.data[optionName]=newValue;
                  if(tool.optionChange){
                    tool.optionChange.call(tool, optionName);  
                  }
                });
                activeRow.append(curEl);
                break;
              case 'enum':
                var enumValues = tool.fieldDefinitions[i].values;
                if(typeof enumValues === 'function'){
                  enumValues = enumValues.call(tool);
                }
                curEl = $('<select name="' + _.escape(i) + '" />');
                for(var j in enumValues){
                  if(enumValues.hasOwnProperty(j)){
                    curEl.append('<option value="' + j + '"' + 
                                (tool.data[i] === j ? ' selected' : '') +
                                '>' + enumValues[j] + '</option>');
                  }
                }
                curEl.on('change', function(){
                  var optionName=$(this).attr('name'),
                      newValue=$(this).val();
                  tool.data[optionName]=newValue;
                  if(tool.optionChange){
                    tool.optionChange.call(tool, optionName);  
                  }
                }).trigger('change');
                activeRow.append(curEl);
                break;
              case 'button':
                curEl = $('<button name="' + _.escape(i) + '">' +
                          tool.fieldDefinitions[i].label + '</button>');
                curEl.on('click', function(){
                  var optionName=$(this).attr('name');
                  tool.fieldDefinitions[optionName].click.call(tool);
                });
                activeRow.empty().append(curEl);
                break;
            }
          }
        }
        return optionPanel;
      },
      activeToolOptions;
  // Add tools to selector
  _.each(lute.tools, function(tool, key){
    toolSelector.append('<option value="' + _.escape(key) + '"' +
      (lute.activeTool === key ? ' selected' : '') + '>' + 
      _.escape(tool.label) + '</option>');
  });
  // Build initial options panel
  toolSelector.trigger('change');
  panel.appendTo('body');

  loading.hide();
});
