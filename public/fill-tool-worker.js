// filler data
var canvas, selectedFrameData, currentLayer, pixelByPixel;

(function () {
  console.log("fill tool web worker initiated");
})();

onmessage = function (e) {
  // console.log("received message", e.data.data);
  if(e.data.type === "init") {
    canvas = e.data.data.canvas;
    selectedFrameData = e.data.data.selectedFrameData;
    currentLayer = e.data.data.currentLayer;
    pixelByPixel = e.data.data.pixelByPixel;
    brushoverlay = e.data.data.brushoverlay;
    colorElement = e.data.data.colorElement;

    drawFill(e.data.data.initialMouseData);
  }
}

function drawFill (mouseData, dontChangeData, alwaysDraw, erase) {
  // console.log(mouseData);
  var {
    left,
    top,
    right,
    bottom,
    width,
    height,
    centerX,
    centerY,
    pixel,
    color
  } = mouseData;

  // var layerObj = selectedFrameData[getCurrentLayer()];
  // var layer = layerObj ? copyObject(layerObj) : {};
  var layer = selectedFrameData[getCurrentLayer()];
  var pixel = layer ? layer[makePixelKey(mouseData)] : null;
  var referencePixel = {
    centerX: pixel ? pixel.centerX : mouseData.centerX,
    centerY: pixel ? pixel.centerY : mouseData.centerY,
    width: pixel ? pixel.width : mouseData.width,
    height: pixel ? pixel.height : mouseData.height,
    color: pixel ? pixel.color : null
  };
  var canvasDimension = pixelByPixel.value;
  var pixelsToFill = [], maxRecur = canvasDimension*canvasDimension, recur = 0, t = 3, directions = ["up", "down", "left", "right"];

  pixelsToFill.push(makePixelKey(referencePixel));

  var branches = [referencePixel];
  // console.log(branches);
  setTimeout(function () {
    new Promise(function(resolve, reject) {
      do {
        for(var i = 0; i < branches.length; i++) {
          var refPixel = branches[i], branchIndex = i;
          var pixelsCaptured = [];
          // directions.slice(0+t,1+t).filter(function (dir) {
          directions.filter(function (dir) {
            var data = getPixel(layer, refPixel, dir);

            if(data) {
              // console.log(data.centerX, data.centerY);
              if(
                data.centerX > 0 && data.centerY > 0 &&
                data.centerX < brushoverlay.width && data.centerY < brushoverlay.height
              ) pixelsCaptured.push(data);
            }
          });

          // if(pixelsCaptured.length < 4) console.log("not getting everything");
          // console.log("captured", pixelsCaptured);

          pixelsCaptured.map(function (data) {
            if(pixelsToFill.indexOf(makePixelKey(data)) === -1) {
              pixelsToFill.push(makePixelKey(data));
              branches.push(data);
              recur++;
            }
          });

          branches.splice(branchIndex, 1);
          i--;
          // console.log(recur);
        };
      } while (recur <= maxRecur && branches.length > 0);
      // console.log("pixelsToFill", pixelsToFill);
      // console.log("branches", branches);
      resolve();
    })
    .then(function () {
      var stepsPerThousand = Math.ceil(pixelsToFill.length / 1000);
      var arr = pixelsToFill;

      for (var i = 0; i < stepsPerThousand; i++) {
        // console.log((i * 1000), (i + 1) * 1000);

        var pixelDataArray = arr.map(function (coords, ind) {
          var data = stripPixelKey(coords);
          var mgp = mouseGridPosition({
            offsetX: data.centerX,
            offsetY: data.centerY
          }, {
            w: brushoverlay.width,
            h: brushoverlay.height,
            pixel: parseInt(pixelByPixel.value)
          })
          var pixelData = Object.assign(mgp, {
            color: colorElement.value
          });
          return pixelData;
        });

        // drawPixel(pixelData, false, true);
        // (mouseData, dontChangeData, alwaysDraw, erase)
        postMessage({
          type: "final",
          data: {
            pixelDataArray,
            dontChangeData: false,
            alwaysDraw: true
          }
        });
      }
    })
    .catch(e => console.error(e));
  }, 10);
}

function getPixel(layer, pixelData, direction) {
  pixelData = copyObject(pixelData);
  var diff;
  switch (direction) {
    case "up": diff = { centerY: pixelData.centerY - pixelData.height }; break;
    case "down": diff = { centerY: pixelData.centerY + pixelData.height }; break;
    case "left": diff = { centerX: pixelData.centerX - pixelData.width }; break;
    case "right": diff = { centerX: pixelData.centerX + pixelData.width }; break;
  }
  // var layer = copyObject(selectedFrameData[getCurrentLayer()] || {});
  var pixel = layer ? layer[makePixelKey(Object.assign(pixelData, diff))] : null;
  if(pixel && pixel.color !== pixelData.color) {
    pixel = null;
  } else
  if(!pixel && pixelData.color === null) {
    pixel = Object.assign({
      centerX: pixelData.centerX,
      centerY: pixelData.centerY,
      width: pixelData.width,
      height: pixelData.height,
      color: null
    }, diff);
  }
  // console.log(pixel);

  return !pixel ? null : {
    centerX: pixel.centerX,
    centerY: pixel.centerY,
    width: pixel.width,
    height: pixel.height,
    color: pixel ? pixel.color : null
  };
}


/// copied functions
function copyObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function makePixelKey(data) {
  return data.centerX + "_" + data.centerY;
}

function mouseGridPosition(e,
  {
    pixel,
    w,
    h
  }) {
  // var { canvas, context: ctx } = getCanvasAndContext();
  // console.log("click", e);
  // console.log(canvas, ctx);
  var mX = e.offsetX;
  var mY = e.offsetY;
  // console.log( Math.round( (mX / canvas.offsetWidth) * pixel) );
  var pixelPlaceW = Math.floor( (mX / canvas.width) * pixel);
  var pixelPlaceH = Math.floor( (mY / canvas.height) * pixel);
  var x = (pixelPlaceW/pixel) * w;
  var y = (pixelPlaceH/pixel) * h;
  // console.log(pixelPlaceW, x);
  // console.log(ctx.globalCompositeOperation);

  var data = {
    left: x,
    top: y,
    right: x + w/pixel,
    bottom: y + h/pixel,
    canvasWidth: w,
    canvasHeight: h,
    pixel,
    width: w/pixel,
    height: h/pixel,
    rawMouseX: mX,
    rawMouseY: mY
  };
  data.centerX = data.left + (data.width / 2);
  data.centerY = data.top + (data.height / 2);
  // console.log(data);
  return data;
}

function getCurrentLayer() {
  return currentLayer;
}

function stripPixelKey(data) {
  var splitStr = data.split("_");
  return {
    centerX: parseInt(splitStr[0]),
    centerY: parseInt(splitStr[1])
  }
}
