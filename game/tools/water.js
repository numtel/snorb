'use strict';

(function(){

  var createWaterTool = function(label, ordinal){
    // ordinal is multiple on amount to change water level by
    var waterTool = function(scene, data){
      var that = this;

      this.label = label;

      this.sideSkirtMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x334337),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });

      this.defaults = {
        amount: 10
      };
      this.data = _.defaults(data || {}, this.defaults);

      this.fieldDefinitions = {
        amount: {label: 'Amount', type: 'int', min: 1, max: 20}
      };

      this.adjustWaterLevel = function(terra, pos, amount){
        var findWaterSurfaceVertices = function(originIndex, waterAlt){
          // use nearbyVertices to determine which vertices exist
          // contiguously with the given water depth
          var vertices = terra.object.geometry.vertices,
              insideIndent = [originIndex],
              alreadyLooked = [],
              curIndex, neighbors;
          while(insideIndent.length > 0){
            curIndex = insideIndent.pop();
            alreadyLooked.push(curIndex);
            neighbors = terra.nearbyVertices(curIndex,1);
            for(var i = 0; i<neighbors[0].length; i++){
              if(vertices[neighbors[0][i]].z<waterAlt && 
                  alreadyLooked.indexOf(neighbors[0][i]) === -1 &&
                  insideIndent.indexOf(neighbors[0][i]) === -1){
                insideIndent.push(neighbors[0][i]);
              }else if(vertices[neighbors[0][i]].z>=waterAlt &&
                  alreadyLooked.indexOf(neighbors[0][i]) === -1){
                alreadyLooked.push(neighbors[0][i]);
              };
            };
          };
          return alreadyLooked;
        };
        // Find current water level
        var coord = terra.coord(pos),
            curLevel = coord.altitude;
        _.each(coord.objects, function(obj){
          if(obj.data.type === 'water'){
            curLevel = obj.data.altitude;
          };
        });
        var newLevel = curLevel + amount;

        // Find the boundary of the water body
        var indentVertices = findWaterSurfaceVertices(coord.anyVI, newLevel);

        if(indentVertices.length < 2){
          return;
        };

        var polygon;
        if(indentVertices.length === terra.object.geometry.vertices.length){
          // Water covers entire terrain, save some time here
          polygon = [
            {x: terra.data.size.x * terra.data.scale * -0.5,
             y: terra.data.size.y * terra.data.scale * -0.5},
            {x: terra.data.size.x * terra.data.scale * 0.5,
             y: terra.data.size.y * terra.data.scale * -0.5},
            {x: terra.data.size.x * terra.data.scale * 0.5,
             y: terra.data.size.y * terra.data.scale * 0.5},
            {x: terra.data.size.x * terra.data.scale * -0.5,
             y: terra.data.size.y * terra.data.scale * 0.5}
          ];
        }else{
          var pointArray = [], curV; 
          for(var i = 0; i<indentVertices.length; i++){
            curV = terra.object.geometry.vertices[indentVertices[i]];
            pointArray.push([curV.x, curV.y]);
          };
          var polygon = snorb.util.pointsToPolygon(pointArray, terra.data.scale * 2);
          if(polygon.length < 3){
            return;
          };
        };

        // Check to see if space is vacant
        var overlap = terra.repres.checkPolygon(polygon),
            isOnlyWater = true;
        for(var i = 0; i<overlap.length; i++){
          if((overlap[i].data.type === 'foliage' && overlap[i].data.pos.z < newLevel) ||
               ['water', 'foliage'].indexOf(overlap[i].data.type) === -1){
            isOnlyWater = false;
          };
        };
        if(!isOnlyWater){
          // Don't build if it would flood something
          return false;
        };
        while(overlap.length){
          // Remove any overlapping water bodies
          overlap.pop().remove();
        };
       
        if(newLevel < coord.altitude){
          // Water level has gone below ground, no need to build it.
          return true;
        };
    
        // Build Mesh 
        var waterShape = new THREE.Shape(polygon),
            waterGeometry = new THREE.ShapeGeometry(waterShape),
            waterMesh = new THREE.Mesh(waterGeometry, scene.water.material);
        waterMesh.position.z = newLevel;
        waterMesh.add(terra.scene.water.clone());
        terra.object.add(waterMesh);

        // Locate polygon vertices on edges for skirts
        var onEdge = false, cEdge, edges = [],
            adjAttr, cCoord, cAlt, hasOnEdge;
        var sideParams = [
          {attr: 'y', val: terra.data.size.y * terra.data.scale / 2,
           rotation: {x: Math.PI / 2}},
          {attr: 'y', val: -terra.data.size.y * terra.data.scale / 2,
           rotation: {x: Math.PI / 2}},
          {attr: 'x', val: terra.data.size.x * terra.data.scale / 2,
           rotation: {y: Math.PI / 2, z: Math.PI / 2}},
          {attr: 'x', val: -terra.data.size.x * terra.data.scale / 2,
           rotation: {y: Math.PI / 2, z: Math.PI / 2}}
        ];
        for(var k = 0; k<sideParams.length; k++){
          cEdge = { side: k, shape: new THREE.Shape() };
          for(var i = 0; i<polygon.length; i++){
            if(polygon[i][sideParams[k].attr] === sideParams[k].val){
              adjAttr = sideParams[k].attr === 'x' ? 'y' : 'x';
              cCoord = terra.coord(polygon[i]);
              if(cCoord.altitude > newLevel){
                cAlt = newLevel;
              }else{
                cAlt = cCoord.altitude;
              };
              if(cEdge.shape.actions.length === 0){
                if(Math.abs(polygon[i][adjAttr]) === 
                    terra.data.size[adjAttr] * terra.data.scale / 2 &&
                   cAlt < newLevel){
                  cEdge.shape.moveTo(polygon[i][adjAttr], newLevel);
                  cEdge.shape.lineTo(polygon[i][adjAttr], cAlt);
                }else{
                  cEdge.shape.moveTo(polygon[i][adjAttr], cAlt);
                };
              }else{
                if(Math.abs(polygon[i][adjAttr]) === 
                    terra.data.size[adjAttr] * terra.data.scale / 2 &&
                   cEdge.shape.actions[cEdge.shape.actions.length -1].args[1] === newLevel){
                  cEdge.shape.lineTo(polygon[i][adjAttr], newLevel);
                  cEdge.shape.lineTo(polygon[i][adjAttr], cAlt);
                }else{
                  cEdge.shape.lineTo(polygon[i][adjAttr], cAlt);
                  if(Math.abs(polygon[i][adjAttr]) === 
                      terra.data.size[adjAttr] * terra.data.scale / 2 &&
                     cAlt < newLevel){
                    cEdge.shape.lineTo(polygon[i][adjAttr], newLevel);
                  };
                };
              };
            };
          };
          if(cEdge.shape.actions.length > 0){
            edges.push(cEdge);
          };
        };
        // Build side skirt if necessary
        var skirtMesh, curSide;
        for(var i = 0; i<edges.length; i++){
          if(edges[i].shape.actions.length < 3){
            continue;
          };
          skirtMesh = new THREE.Mesh(new THREE.ShapeGeometry(edges[i].shape),
                                     that.sideSkirtMaterial);
          curSide = sideParams[edges[i].side];
          _.each(curSide.rotation, function(val, key){
            skirtMesh.rotation[key] = val;
          });
          if(curSide.val > 0){
            skirtMesh.position[curSide.attr] = curSide.val - 0.01;
          }else{
            skirtMesh.position[curSide.attr] = curSide.val + 0.01;
          };
          skirtMesh.position.z = -newLevel;
          waterMesh.add(skirtMesh);
        };

        // Build representation
        var representation = terra.repres.register(polygon);
        representation.mesh = waterMesh;
        waterMesh.representation = representation;
        representation.data.type = 'water';
        representation.data.rebuildTool = 'waterRaise';
        representation.data.altitude = newLevel;
        representation.data.depthAtPos = newLevel - coord.altitude;
        representation.data.pos = new THREE.Vector2(pos.x, pos.y);
        representation.destroy = function(){
          terra.object.remove(this.mesh);
        };
        terra.updateRenderDepth();
        return true;
      };

      this.rebuild = function(terra, data){
        this.adjustWaterLevel(terra, data.pos, data.depthAtPos);
      };

      this.select = function(){
        scene.data.cursorRadius = 10;
        scene.data.cursorVisible = true;
      };
      this.deselect = function(){
        scene.data.cursorVisible = false;
      };
      this.mousemove = function(pos, terra, event){
        if(pos === undefined && that.activeInterval !== undefined){
          // mouse has left the terrain
          that.mouseup();
          that.stalled = true;
          return;
        };
        that.lastPos = pos;
        if(that.stalled && pos && scene.mouseIsDown){
          // mouse has returned to the terrain
          that.stalled = undefined;
          that.mousedown(pos, terra, event);
        };
      };

      this.mousedown = function(pos, terra, event){
        var raiseAtCursor = function(){
          if(pos !== undefined){
            that.adjustWaterLevel(terra, pos, that.data.amount * ordinal);
          };
        };
        that.mouseup();
        that.activeInterval = setInterval(raiseAtCursor, 100);
        raiseAtCursor();
      };
      this.mouseup = function(pos, terra, event){
        if(that.activeInterval){
          clearInterval(that.activeInterval);
          delete that.activeInterval;
        };
      };
    };
    waterTool.prototype = new snorb.core.Tool();
    return waterTool;
  };

  snorb.tools.waterRaise = createWaterTool('Raise Water', 1);
  snorb.tools.waterLower = createWaterTool('Lower Water', -1);

})();
