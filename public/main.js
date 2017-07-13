// initial stuff
NodeList.prototype.map = Array.prototype.map;
NodeList.prototype.slice = Array.prototype.slice;

// console.log(canvas);
var workArea = document.getElementsByClassName("work-area")[0];
var tools = workArea.getElementsByClassName("tools-container")[0];
var brushes = workArea.getElementsByClassName("brushes")[0];
var frames = workArea.getElementsByClassName("frames")[0];
var pixelByPixel = tools.getElementsByClassName("pixel-by-pixel")[0];
var currentFrameDisplay = tools.getElementsByClassName("current-frame")[0];
var framerate = tools.getElementsByClassName("framerate")[0];
var canvasLayers = workArea.querySelector(".canvas-layers");
// var canvasLayersTabs = workArea.querySelector(".canvas-layers-tabs");
var currentLayer = workArea.querySelector(".current-layer");
var totalLayersCounter = workArea.querySelector(".total-layers");
var loadProjectInput = workArea.querySelector(".load-project");

// variables
var listenerFunctions = {},
  brushTool = "pencil",
  framesArray = [],
  selectedFrameData = {},
  currentFrame = 0,
  layerCount = 0,
  playbackRunning = false,
  playbackInterval = null,
  unsavedFrame = false,
  mouseDown = false,
  projectSaved = true,
  layerUIReferences = [];
  copiedFrameData = null;
  selectionState = {
    action: null, // null, selecting, selected
    startPoint: {}, // start selection
    point1: {}, // top-right selection
    point2: {}, // bottom-left selection
    lastMousePos: {},
    pixelsMoved: false,
    data: {
      current: {}, // the current position of the pixels
      moved: {} // the new positions of the pixels
    } // copy of selectedFrameData, but only the data within selection
  }
  ;

// http://stackoverflow.com/a/15666143/4107851
var PIXEL_RATIO = (function () {
  var ctx = document.createElement("canvas").getContext("2d"),
  dpr = window.devicePixelRatio || 1,
  bsr = ctx.webkitBackingStorePixelRatio ||
  ctx.mozBackingStorePixelRatio ||
  ctx.msBackingStorePixelRatio ||
  ctx.oBackingStorePixelRatio ||
  ctx.backingStorePixelRatio || 1;

  return dpr / bsr;
})();
/* <canvas id="canvas" class="canvas" width="0" height="0"></canvas> */

var makeCanvas = function (overlay, w, h, layer, newCanvas) {
  var ratio = PIXEL_RATIO;
  var thisCanvas;
  if(newCanvas) {
    var c = document.createElement("canvas");
    c.className = "canvas";
    thisCanvas = c;
  } else {
    thisCanvas = overlay ? brushoverlay : window["canvas" + layer || canvasLayers];
  }

  thisCanvas.width = w * ratio;
  thisCanvas.height = h * ratio;
  thisCanvas.style.width = w * ratio + "px";
  thisCanvas.style.height = h * ratio + "px";
  thisCanvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
  return thisCanvas;
}
// ///////////////////////////////////////////////////////////

var colorElement = document.querySelector(".color");

loadProjectInput.onchange = function (e) {
  var files = e.target.files;
  var fr = new FileReader();
  fr.onload = function () {
    openRaw(fr.result);
  }
  fr.readAsDataURL(files[0]);
};

function initCanvas(contextValue, pixel) {
  var //pixel = 32,
  editorDimensionMultiplier = (8*8) * 10,
  w = editorDimensionMultiplier/*pixel*( (pixel*pixel) / (2) * 10 )*/,
  h = editorDimensionMultiplier/*pixel*( (pixel*pixel) / (2) * 10 )*/;// Math.round( (32 / canvas.offsetWidth) * w);
  // console.log(editorDimensionMultiplier);
  if(typeof contextValue !== "string") return;// console.error("2nd argument needs to be a string denoting a 2d or 3d context of the canvas");

  var brushoverlay = makeCanvas(true, w, h);
  newLayer(true);

  // set the default values for the cursor so it starts neat
  drawTool(
    mouseGridPosition({
      offsetX: w/2,
      offsetY: h/2
    }, {
      pixel,
      w,
      h
    })
  );

  listenerFunctions.click = function (e) {
    mouseAction({
      e,
      once: "click",
      pixel,
      w,
      h
    });
  };
  brushoverlay.addEventListener("click", listenerFunctions.click);

  listenerFunctions.mousedown = function (e) {
    mouseAction({
      e,
      once: "press",
      pixel,
      w,
      h
    });
  };
  brushoverlay.addEventListener("mousedown", listenerFunctions.mousedown);

  listenerFunctions.mouseup = function (e) {
    mouseAction({
      e,
      once: "release",
      pixel,
      w,
      h
    });
  };
  brushoverlay.addEventListener("mouseup", listenerFunctions.mouseup);

  listenerFunctions.mousemove = function(e) {
    mouseAction({
      e,
      pixel,
      w,
      h
    });
  };
  brushoverlay.addEventListener("mousemove", listenerFunctions.mousemove);
}

function appendNewCanvasLayer(w, h) {
  var c = makeCanvas(false, w, h, null, true);
  // var length = document.querySelectorAll(".canvas").length;
  // c.id = "canvas" + length;
  c.id = "canvas" + (layerCount - 1);
  canvasLayers.appendChild(c);
  return c;
}

function appendNewLayerOption(firstSelect) {
  var layer = document.createElement("div");
  var radio = document.createElement("input");
  var layerName = document.createElement("span");
  var arrowHolder = document.createElement("div");
  var moveUp = document.createElement("div");
  var moveDown = document.createElement("div");

  radio.type = "radio";
  radio.name = "layers";
  if(firstSelect) radio.checked = true;

  moveUp.addEventListener("click", movePlace.bind(this, "up"))
  moveDown.addEventListener("click", movePlace.bind(this, "down"))
  moveUp.innerText = "UP";
  moveDown.innerText = "DOWN";

  var value = document.querySelectorAll(".canvas").length;
  layer.value = value;
  layerName.innerText = "layer" + value;

  layer.appendChild(radio);
  layer.appendChild(layerName);
  arrowHolder.appendChild(moveUp);
  arrowHolder.appendChild(moveDown);
  layer.appendChild(arrowHolder);
  currentLayer.appendChild(layer);
  layerUIReferences.push(layer);

  // console.log(layerUIReferences.indexOf(layer));

  function movePlace(dir) {
    confirmSelectionMove(function (res) {
      switch (res) {
        case 1:
        setPixelsFromSelection();
        resetSelectionState();
        setTool(brushTool === "mover" ? "select" : brushTool);
        proceed();
        break;
        case 2:
        resetSelectionState();
        setTool(brushTool === "mover" ? "select" : brushTool);
        proceed();
        break;
      }
    });

    function proceed() {
      var place = layerUIReferences.indexOf(layer);
      // console.log(place);
      if(place < 0) return console.warn("not finding correct reference");
      var swapPlace = place + (dir === "up" ? -1 : dir === "down" ? 1 : 0);
      if(swapPlace < 0 || swapPlace >= layerUIReferences.length) return console.warn("at start or end. can not swap");

      var startLayer = layerUIReferences[place];
      var targetLayer = layerUIReferences[swapPlace];

      layerUIReferences.splice(swapPlace, 1, startLayer);
      layerUIReferences.splice(place, 1, targetLayer);

      switch (dir) {
        case "up": currentLayer.insertBefore(startLayer, targetLayer); break;
        case "down": currentLayer.insertBefore(startLayer, targetLayer.nextSibling); break;
      }

      swapLayerData({
        [place]: swapPlace,
        [swapPlace]: place
      });
    }
  }
}

function swapLayerData(obj) {
  // console.log(obj);
  var firstPlaceStart, firstPlaceEnd, secondPlaceStart, secondPlaceEnd;

  var keys = Object.keys(obj);
  firstPlaceStart = keys[0];
  firstPlaceEnd = obj[firstPlaceStart];

  secondPlaceStart = keys[1];
  secondPlaceEnd = obj[secondPlaceStart];

  (function () {
    var frameData = framesArray[currentFrame];
    if(!frameData) return;
    var frameDataCopy = copyObject(frameData);
    var firstLayer = frameDataCopy["l" + firstPlaceStart];
    var secondLayer = frameDataCopy["l" + secondPlaceStart];

    frameData["l" + firstPlaceEnd] = firstLayer;
    frameData["l" + secondPlaceEnd] = secondLayer;

    frameData = null;
    frameDataCopy = null;
    firstLayer = null;
    secondLayer = null;
  })();

  var frameDataCopy = copyObject(selectedFrameData);
  // console.log(selectedFrameData);
  var firstLayer = frameDataCopy["l" + firstPlaceStart];
  var secondLayer = frameDataCopy["l" + secondPlaceStart];

  selectedFrameData["l" + firstPlaceEnd] = firstLayer;
  // console.log(selectedFrameData);
  selectedFrameData["l" + secondPlaceEnd] = secondLayer;
  // console.log(selectedFrameData);

  frameDataCopy = null;
  firstLayer = null;
  secondLayer = null;
  // console.log(selectedFrameData);
  reRender();
}

function newLayer(firstSelect) {
  layerCount++;
  totalLayersCounter.innerText = layerCount;
  appendNewLayerOption(firstSelect);
  appendNewCanvasLayer(brushoverlay.width, brushoverlay.height);
}

function getCurrentLayer(numberOnly) {
  var layer;
  for(i = 0; i < layerUIReferences.length; i++) {
    var elem = layerUIReferences[i].querySelector("input");
    // console.log(elem, elem.checked);
    // console.log(elem.checked);
    if(elem.checked) {
      layer = i;
      break;
    }
  }
  console.log(layer);
  return numberOnly ? layer : "l" + layer;
}

function mouseGridPosition(e,
  {
    pixel,
    // canvas,
    // ctx,
    w,
    h
  }) {
  var { canvas, context: ctx } = getCanvasAndContext();
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
    canvas,
    context: ctx,
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

function mouseAction(obj) {
  var {
    e,
    once,
    pixel,
    w,
    h
  } = obj;
  var mouseData = mouseGridPosition(e, {
    pixel,
    w,
    h
  });
  // console.log(e.button, e.buttons);

  var mouse = normalizeMouse(e);
  if(once) {
    // console.log(normalizeMouse(e));
    if(mouse === "left") {
      if(once === "press") {
        mouseDown = true;
        // console.log("press");
        // console.log(mouseData);
        var newMouseData = JSON.parse(JSON.stringify(mouseData));
        switch (brushTool) {
          case "select":
            selectionState.action = null;
            drawTool(mouseData);
            // if(selectionState.action !== "selecting") {
            // }
            selectionState.action = "selecting";
            selectionState.startPoint = newMouseData;
            // console.log("selecting");
            break;
          case "mover":
            selectionState.lastMousePos = newMouseData;
            break;
          case "fill":
            drawFill(mouseData);
            break;
        }
      }

      if(once === "release") {
        mouseDown = false;
        // console.log("release");
        switch (brushTool) {
          case "select":
          selectionState.action = "selected";

          // initial data
          // console.log(mouseData);
          selectionState.point1 = JSON.parse(JSON.stringify(selectionState.startPoint));
          selectionState.point2 = JSON.parse(JSON.stringify(mouseData));

          if(mouseData.centerX < selectionState.startPoint) {
            selectionState.point1.centerX = mouseData.centerX;
            selectionState.point1.left = mouseData.left;
            selectionState.point2.centerX = selectionState.startPoint.centerX;
            selectionState.point2.left = selectionState.startPoint.left;
          }
          if(mouseData.centerY < selectionState.startPoint) {
            selectionState.point1.centerY = mouseData.centerY;
            selectionState.point1.left = mouseData.left;
            selectionState.point2.centerY = selectionState.startPoint.centerY;
            selectionState.point2.left = selectionState.startPoint.left;
          }
          // console.log(selectionState.point1.centerX, selectionState.point2.centerY);
          // console.log(selectionState.point1.centerX, selectionState.point2.centerY);
          var selection = getSelection(obj);
          // console.log(selection);
          var simplifiedSelection = simplifySelection(selection);
          // console.log(simplifiedSelection);
          var selectedPixels = selectPixels(simplifiedSelection, true);
          // console.log(selectedPixels)
          selectionState.data.current = selectedPixels;
          selectionState.data.moved = selectedPixels;
          setTool("mover");
          break;
          case "mover":
          selectionState.lastMousePos = {};
          break;
          default:
          resetSelectionState();
        }
      }
    }
  }

  if(mouseDown && normalizeMouse(e) === "left") {
    switch (brushTool) {
      case "pencil":
        drawPixel(mouseData);
        break;
      case "mover":
        if(mouseDown) moveSelection(mouseData);
        break;
      case "eraser":
        drawPixel(mouseData);
        break;
    }
  }

  // draw cursor
  switch (brushTool) {
    case "mover":
      // nothing here
      break;
    default:
      drawTool(mouseData);
  }
  // console.log(selectionState);
}

function getSelection(obj) {
  var {
    pixel,
    w,
    h
  } = obj;

  var pbp = parseInt(pixelByPixel.value);
  var maxTicks = pbp*pbp, tick = 0, blocks = [], lastPoint = null, reachedEnd = false, xPoint, yPoint, xPointEnd, yPointEnd, xNeg;

  while (tick < maxTicks && !reachedEnd) {
    // console.log(reachedEnd);
    if(lastPoint) {
      if(
        lastPoint.centerX === selectionState[xPointEnd].centerX &&
        lastPoint.centerY === selectionState[yPointEnd].centerY
      ) {
        reachedEnd = true;
        continue
      };
      var x, y;
      if(lastPoint.centerX === selectionState[xPointEnd].centerX) {
        // console.log("reset x, next y");
        x = selectionState[xPoint].centerX;
        y = lastPoint.centerY + lastPoint.height;
        // console.log(y, selectionState.point2.centerY);
      } else {
        // console.log("next x");
        x = lastPoint.centerX + (lastPoint.width * xNeg);
      }
      lastPoint = JSON.parse(JSON.stringify(
        mouseGridPosition({
          offsetX: x,
          offsetY: y
        },
        {
          pixel,
          w,
          h
        })
      ))
    } else {
      // console.log("initial point");
      var x, y;
      if(selectionState.point1.centerX <= selectionState.point2.centerX) {
        x = selectionState.point1.centerX;
        xPoint = "point1";
        xPointEnd = "point2";
        xNeg = 1;
      } else {
        x = selectionState.point2.centerX;
        xPoint = "point2";
        xPointEnd = "point1";
        xNeg = 1;
      }
      if(selectionState.point1.centerY <= selectionState.point2.centerY) {
        y = selectionState.point1.centerY;
        yPoint = "point1";
        yPointEnd = "point2";
      } else {
        y = selectionState.point2.centerY;;
        yPoint = "point2";
        yPointEnd = "point1";
      }
      // console.log(x, y, xPoint, yPoint);
      lastPoint = JSON.parse(JSON.stringify(
        mouseGridPosition({
          offsetX: x,
          offsetY: y
        },
        {
          pixel,
          w,
          h
        })
      ))
    }

    blocks.push(lastPoint);
    // drawPixel(Object.assign(lastPoint,
    //   getCanvasAndContext()
    // ), true, true);

    tick++;
  }
  // console.log(lastPoint, selectionState);

  return blocks;
}

function simplifySelection(selection) {
  return selection.map(function (data) {
    return data.centerX + "_" + data.centerY;
  });
}

function selectPixels(selection, simplified) {
  var pixels = {};

  if(simplified) {
    proceed();
  } else {
    selection = selection.map(function (data) {
      return data.centerX + "_" + data.centerY;
    });
    proceed();
  }

  function proceed() {
    selection.map(function (coords) {
      if(!selectedFrameData[getCurrentLayer()]) return;
      var data = selectedFrameData[getCurrentLayer()][coords];

      if(data) pixels[coords] = JSON.parse(JSON.stringify(data));
    })
  }

  return pixels;
}

function moveSelection(mouseData) {
  if(selectionState.action !== "selected") return;
  // 1. Check mouse new position (up, down, left, right)
    // - if (mousePos.centerX < lastMousePos.centerX)
    //   xMove = "left"
    //   else
    //   xMove = "right"
    // - if (mousePos.centerY < lastMousePos.centerY)
    //   yMove = "up"
    //   else
    //   yMove = "down"

  // 2. Calculate distance needed to me moved (largestNumbers - smallestNumber)

  // 3. Figure out which unselected pixels need to be redrawn, and redraw.
    // - if(pixelPosition existsIn selectedFrameData && pixelPosition !existIn selectionState.data.current[pixelPosition])
    //   drawPixel(selectedFrameData[pixelPosition], true, true)
    //   else
    //   drawPixel(selectedFrameData[pixelPosition], true, null, true)

  // 4. Draw selected pixels at new position
    // - drawPixel(selectedFrameData[pixelPosition], true, true)

  // step one
  var xMove, yMove;
    if(mouseData.centerX < selectionState.lastMousePos.centerX) {
      xMove = "left";
    } else {
      xMove = "right";
    }
    if(mouseData.centerY < selectionState.lastMousePos.centerY) {
      yMove = "up";
    } else {
      yMove = "down";
    }

  // step two
  var xDist, yDist,
    xNumbers = [mouseData.centerX, selectionState.lastMousePos.centerX],
    yNumbers = [mouseData.centerY, selectionState.lastMousePos.centerY];
    xDist = Math.max.apply(null, xNumbers) - Math.min.apply(null, xNumbers);
    xDist = xMove === "left" ? xDist * -1 : xDist;
    if(xDist === 0) xMove = null;
    yDist = Math.max.apply(null, yNumbers) - Math.min.apply(null, yNumbers);
    yDist = yMove === "up" ? yDist * -1 : yDist;
    if(yDist === 0) yMove = null;

  // step 3
  if(xMove || yMove) {
    // var coordsOfSelected = Object.keys(selectionState.data.current);
    var coordsOfSelected = Object.keys(selectionState.data.moved);
    // var coordsOfSelectedMoved = Object.keys(selectionState.data.moved);
    var newMovedData = {};

    coordsOfSelected.map(function(coords, ind) {
      // erase the pixels at this position
      // console.log("erase old pixel position");
      // console.log(coords);
      drawPixel(selectionState.data.moved[coords], true, null, true);

      // compare coord from selection with data from current layer
      if(selectedFrameData[getCurrentLayer()][coords] && !selectionState.data.current[coords]) {
        // do this since the pixel is in selection
        // draw old pixel
        // console.log("draw old pixel");
        // console.log(coords);
        // console.log(selectedFrameData[getCurrentLayer()][coords]);
        drawPixel(selectedFrameData[getCurrentLayer()][coords], true, true);
      }
    });

    // move pixels
    coordsOfSelected.map(function(coords, ind) {
      movePixel(coords);
    });

    // step 4
    function movePixel(coords) {
      // move pixel coords
      // x
      selectionState.data.moved[coords].centerX += xDist;
      selectionState.data.moved[coords].left += xDist;
      selectionState.data.moved[coords].right += xDist;
      // y
      selectionState.data.moved[coords].centerY += yDist;
      selectionState.data.moved[coords].top += yDist;
      selectionState.data.moved[coords].bottom += yDist;

      // draw pixel at new coords
      drawPixel(selectionState.data.moved[coords], true, true);

      var newCenterX = selectionState.data.moved[coords].centerX,
      newCenterY = selectionState.data.moved[coords].centerY;

      newMovedData[newCenterX + "_" + newCenterY] = selectionState.data.moved[coords];
      // console.log(newMovedData);
    };

    // draw tool
    cursor.style.left = parseInt(cursor.style.left) + xDist + "px";
    cursor.style.top = parseInt(cursor.style.top) + yDist + "px";

    // set new move data
    delete selectionState.data.moved;
    selectionState.data.moved = newMovedData;
  }

  // set new last mouse position
  selectionState.lastMousePos = mouseData;
  // console.log(selectionState.data.moved);
  markUnsavedFrame();
  selectionState.pixelsMoved = true;
}

function setPixelsFromSelection(original) {
  var selectionCoordsCurrent = selectionState.data.current;
  var SCCArr = Object.keys(selectionCoordsCurrent);
  var selectionCoordsMoved = selectionState.data.moved;
  var SCMArr = Object.keys(selectionCoordsMoved);

  if(original) {
    // console.log("set original");
    // erase moved pixels
    SCMArr.map(function (coords) {
      drawPixel(selectionCoordsMoved[coords], true, null, true);
    });
    // redraw pixels that were in selection to their original place
    SCCArr.map(function (coords) {
      drawPixel(selectedFrameData[getCurrentLayer()][coords], true, true);
    });
    resetSelectionState();
  } else {
    // console.log("set new");
    // set new
    SCCArr.map(function (coords) {
      delete selectedFrameData[getCurrentLayer()][coords];
    });
    SCMArr.map(function (coords) {
      var pixelData = stripPixelKey(coords);
      if(
        pixelData.centerX > brushoverlay.width ||
        pixelData.centerY > brushoverlay.height ||
        pixelData.centerX < 0 ||
        pixelData.centerY < 0
      ) return;
      selectedFrameData[getCurrentLayer()][coords] = selectionCoordsMoved[coords];
    });
    selectionState.data.current = copyObject(selectionState.data.moved);
  }
}

function resetSelectionState() {
  selectionState = {
    action: null, // null, selecting, selected
    startPoint: {}, // start selection
    point1: {}, // top-right selection
    point2: {}, // bottom-left selection
    lastMousePos: {},
    data: {
      current: {}, // the current position of the pixels
      moved: {} // the new positions of the pixels
    } // copy of selectedFrameData, but only the data within selection
  }
}

function drawPixel (data, dontChangeData, alwaysDraw, erase) {
  var {
    left,
    top,
    right,
    bottom,
    width,
    height,
    centerX,
    centerY,
    canvas,
    context: ctx,
    pixel,
    color
  } = data;

  if(Object.prototype.toString.call(canvas) !== "[object HTMLCanvasElement]") {
    var CnC = getCanvasAndContext();
    canvas = CnC.canvas;
    ctx = CnC.context;
  }

  markUnsavedProject();
  // console.log(canvas);
  var layerKey = getCurrentLayer();
  var drawStyle = alwaysDraw ? "pencil" : brushTool;
  drawStyle = erase ? "eraser" : drawStyle;

  // console.log(data, dontChangeData, alwaysDraw, erase, drawStyle);
  // console.log(canvas, ctx);
  switch (drawStyle) {
    // case "select": // TEMPORARY
    case "pencil":
      ctx.globalCompositeOperation = "source-over"
      ctx.fillStyle = alwaysDraw ? color || colorElement.value : colorElement.value;
      ctx.fillRect(left, top, width, height);
      // console.log(ctx.globalCompositeOperation);
      selectedFrameData[layerKey] = selectedFrameData[layerKey] || {};
      if(!dontChangeData) selectedFrameData[layerKey][centerX + "_" + centerY] = {
        top,
        right,
        bottom,
        left,
        width,
        height,
        centerX,
        centerY,
        pixel,
        canvas,
        context: ctx,
        color: ctx.fillStyle
      };
    break;
    case "eraser":
      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.fillRect(left, top, width, height);
      selectedFrameData[getCurrentLayer()] = selectedFrameData[layerKey] || {};
      if(!dontChangeData) delete selectedFrameData[layerKey][centerX + "_" + centerY];
    break;
  }

  // console.log(selectedFrameData);
  if(!dontChangeData) {
    markUnsavedProject();
    markUnsavedFrame(currentFrame);
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
    canvas,
    context: ctx,
    pixel,
    color
  } = mouseData;

  if(Object.prototype.toString.call(canvas) !== "[object HTMLCanvasElement]") {
    var CnC = getCanvasAndContext();
    canvas = CnC.canvas;
    ctx = CnC.context;
  }

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
      console.log("pixelsToFill", pixelsToFill);
      console.log("branches", branches);
      resolve();
    })
    .then(function () {
      var stepsPerThousand = Math.ceil(pixelsToFill.length / 1000);

      for (var i = 0; i < stepsPerThousand; i++) {
        console.log((i * 1000), (i + 1) * 1000);
        setTimeout(function (arr) {
          arr.map(function (coords, ind) {
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

            drawPixel(pixelData, false, true);
          });
        }, 10, pixelsToFill.slice((i * 1000), (i + 1) * 1000));
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

function drawTool(data) {
  if(brushTool === "select" && selectionState.action) {
    switch (selectionState.action) {
      case "selecting":
        // console.log(data.centerX, selectionState.startPoint.centerX)
        if(data.centerX > selectionState.startPoint.centerX) {
          // console.log("left side");
          cursor.style.width = (data.left + data.width) - (selectionState.startPoint.left) + "px";
        } else {
          // console.log("right side");
          cursor.style.left = data.left + "px";
          cursor.style.width = (selectionState.startPoint.left + data.width) - (data.left) + "px";
        }
        if(data.centerY > selectionState.startPoint.centerY) {
          // console.log("top side");
          cursor.style.height = (data.top + data.height) - (selectionState.startPoint.top) + "px";
        } else {
          // console.log("bottom side");
          cursor.style.top = data.top + "px";
          cursor.style.height = (selectionState.startPoint.top + data.height) - (data.top) + "px";
        }
      break;
    }
  } else {
    cursor.style.left = data.centerX - (data.width / 2) + "px";
    cursor.style.top = data.centerY - (data.height / 2) + "px";
    cursor.style.width = data.width + "px";
    cursor.style.height = data.height + "px";
  }
}

function setTool(toolName) {
  // console.log(toolName, brushTool);
  if(toolName !== "mover") {
    confirmSelectionMove(function (res) {
      switch (res) {
        case 1:
          setPixelsFromSelection();
          resetSelectionState();
          proceed();
          break;
        case 2:
          setPixelsFromSelection(true);
          proceed();
          break;
      }
    });
    return;
  }

  function proceed() {
    // console.log("proceed");
    brushes.querySelector(".brush-show").className = "brush-show " + toolName;
    brushoverlay.className = toolName;
    brushTool = toolName;
    cursor.className = toolName;
  }
  proceed();
}

function clearCanvas(overlay, full) {
  // console.log("clearing canvas");
  // get canvas
  var ctx, ctxArr = [];

  if(full) {
    for (var i = 0; i < document.querySelectorAll(".canvas").length; i++) {
      ctx = window["canvas" + i].getContext("2d");
      ctxArr.push(ctx);
    }
  } else {
    ctx = window["canvas" + getCurrentLayer()].getContext("2d");
    ctxArr.push(ctx);
  }
  // erase
  ctxArr.map((ctx, ind) => {
    console.log(ind);
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.fillRect(0, 0, brushoverlay.width, brushoverlay.height);
    // return to original comp
    ctx.globalCompositeOperation = "source-over";
  })
  // console.trace();
  selectedFrameData = null;
  selectedFrameData = {};
}

function setCurrentFrame(frame) {
  currentFrameDisplay.innerText = frame+1;

  var frameElems = frames.querySelectorAll(".frame");
  var currentFrameElem = frames.querySelector(".frame.frame-" + frame);
  if(frameElems)
    frameElems.map(function (frameElem) {
      frameElem.className = frameElem.className.replace(/(\s+)?current/, "");
    });
  // else
    // console.log("no elem");
  // set the new current frame after using the old one
  currentFrame = frame;
  if(currentFrameElem)
    currentFrameElem.className = currentFrameElem.className + " current";
  // else
    // console.log("no elem");
}

function setLayerFrame(layer) {
  getCurrentLayer() = layer;
}

function storeImageData() {
  var dataStr = JSON.stringify(selectedFrameData);
  var data = JSON.parse(dataStr);
  // console.log(data === selectedFrameData);
  framesArray[currentFrame] = data;
  // console.log(framesArray[currentFrame] === selectedFrameData);
  // console.log(framesArray);
  markSavedFrame(currentFrame);
  updateDisplayFrame(currentFrame);
}

function markSavedFrame(frame) {
  // console.log(frame);
  unsavedFrame = false;
  var displayFrame = frames.querySelector(".frame.frame-" + frame);
  if(!displayFrame) return;
  // if( displayFrame.className.match("saved") && !displayFrame.className.match("unsaved") ) return
  // console.log(displayFrame);
  // if( displayFrame.className.match("unsaved") ) {
  //   displayFrame.className = displayFrame.className.replace("unsaved", "saved");
  // } else {
  //   displayFrame.className = displayFrame.className + " saved";
  // }
  displayFrame.removeClass("unsaved");
  displayFrame.addClass("saved");
}

function markUnsavedFrame(frame) {
  // console.log(console.trace());
  unsavedFrame = true;
  var displayFrame = frames.querySelector(".frame.frame-" + frame);
  if(!displayFrame) return;
  // if( displayFrame.className.match("unsaved") ) return
  // if( displayFrame.className.match("saved") ) {
  //   displayFrame.className = displayFrame.className.replace("saved", "unsaved");
  // } else {
  //   displayFrame.className = displayFrame.className + " unsaved";
  // }
  displayFrame.removeClass("saved");
  displayFrame.addClass("unsaved");
}

function markSavedProject(frame) {
  savedProject = true;
}

function markUnsavedProject(frame) {
  unsavedFrame = false;
}

function openImage(place) {
  clearCanvas(null, true);
  var canvas, ctx;
  if(framesArray[place]) {
    var layers = objDataToImageData(framesArray[place], true);
    // console.log("layers", layers);
    var longest = Math.max(layers.length, layerCount);
    // for (var ind = 0; ind < layerCount; ind++) {
    for (var ind = 0; ind < longest; ind++) {
      var imageData = layers[ind];
      // console.log("image data", imageData);
      canvas = window["canvas" + ind];
      if(!canvas) {
        newLayer();
        canvas = window["canvas" + ind];
      }
      ctx = canvas.getContext("2d");
      // if the image data is available, put it
      if(imageData) {
        ctx.putImageData(imageData, 0, 0);
      } else {
        // if it's not available get some generic blank data
        ctx.putImageData(getBlankCanvasImageData(), 0, 0);
      }
    }
  }
  selectedFrameData = JSON.parse(JSON.stringify(framesArray[place] || {}));
}

function reRender() {
  // clearCanvas(null, true);
  var canvas, ctx;
  var layers = objDataToImageData(copyObject(selectedFrameData), true);
  // console.log("layers", layers);
  var longest = Math.max(layers.length, layerCount);
  // for (var ind = 0; ind < layerCount; ind++) {
  for (var ind = 0; ind < longest; ind++) {
    var imageData = layers[ind];
    // console.log("image data", imageData);
    canvas = window["canvas" + ind];
    if(!canvas) {
      newLayer();
      canvas = window["canvas" + ind];
    }
    ctx = canvas.getContext("2d");
    // if the image data is available, put it
    if(imageData) {
      ctx.putImageData(imageData, 0, 0);
    } else {
      // if it's not available get some generic blank data
      ctx.putImageData(getBlankCanvasImageData(), 0, 0);
    }
  }
}

function getBlankCanvasImageData() {
  var c = makeCanvas(false, brushoverlay.width, brushoverlay.height, null, true);
  return c.getContext("2d").getImageData(0, 0, brushoverlay.width, brushoverlay.height);
}

function goToFrame(place) {
  console.log("go to");
  checkUnsavedFrame(function (res) {
    switch (res) {
      case 1:
        openImage(place);
        setCurrentFrame(place);
        break;
    }
  }, 2);
}

function saveFrame() {
  // console.log("saved image");
  confirmSelectionMove(function (res) {
    switch (res) {
      case 1:
        setPixelsFromSelection();
        storeImageData();
        break;
      case 2:
        setPixelsFromSelection(true);
        break;
    }
  });
}

function newFrame(emptyCanvas) {
  // console.log("next image", emptyCanvas);
  confirmSelectionMove(function (res) {
    switch (res) {
      case 1:
        setPixelsFromSelection();
        proceed();
        break;
      case 2:
        setPixelsFromSelection(true);
        break;
    }
  });

  function proceed() {
    storeImageData();
    if(framesArray[framesArray.length-1]) {
      framesArray.push(void(0));
      addDisplayFrame(framesArray.length-1);
    }
    currentFrame = framesArray.length - 1;
    openImage(currentFrame - 1);
    setCurrentFrame(currentFrame);
    if(emptyCanvas) clearCanvas();
    // console.log(currentFrame, framesArray.length);
  }
}

function stepToFrame(dir) {
  // console.log("next image", emptyCanvas);
  confirmSelectionMove(function (res) {
    switch (res) {
      case 1:
        setPixelsFromSelection();
        proceed();
        break;
      case 2:
        setPixelsFromSelection(true);
        checkUnsavedFrame(function (res) {
          switch (res) {
            case 1:
            proceed();
            break;
          }
        }, 2);
        break;
    }
  });


  function proceed() {
    // index based on direction
    var dirNum;

    switch (dir) {
      case "left": dirNum = -1; break;
      case "right": dirNum = 1; break;
    }

    storeImageData();
    if(framesArray[currentFrame + dirNum]) {
      currentFrame = currentFrame + dirNum;
      openImage(currentFrame);
      setCurrentFrame(currentFrame);
    }
  }
}

function nextFrame() {
  stepToFrame("right");
}

function prevFrame() {
  stepToFrame("left");
}

function removeFrame(place) {
  // removed image data from framesArray
  framesArray.splice(place, 1);
  editFrames(place, "remove");
}

function insertFrame(place) {
  framesArray.splice(place+1, 0, null)
  editFrames(place, "insert");
}

function copyFrameData(place) {
  place = parseInt(place) || currentFrame;
  if(!framesArray[place]) return userConfirm("Unable to copy empty frame", function (res) {

  }, 1);
  copiedFrameData = copyObject(framesArray[place]);
  console.log("copied data", copiedFrameData);
}

function pasteFrameData(place) {
  place = parseInt(place) || currentFrame;
  framesArray[place] = copiedFrameData;
  updateDisplayFrame(place);
  if(currentFrame === place) openImage(place);
  copiedFrameData = null;
  console.log("pasted data", framesArray[place]);
}

function editFrames(place, action) {
  var number = action === "remove" ? -1 : 1;
  if(action === "remove") {
    // remove display frame
    var frameElem = frames.querySelector(".frame.frame-" + place);
    // console.log("removing", place, frameElem);
    frames.removeChild(frameElem);
  }
  if(action === "insert") {
    insertDisplayFrame(place+1);
  }
  // change class and dataset of the frames ahead
  for(var i = place+1; i < framesArray.length+(action === "remove" ? 1 : -1); i++) {
    var elem = frames.querySelectorAll(".frame.frame-" + i).slice(-1)[0];
    // console.log("changing", i, elem, ".frame.frame-" + i);
    elem.className = elem.className.replace(/frame\-[0-9]+/, "frame-" + (i+number));
    elem.dataset.frame = (i+number);
  }


  if(currentFrame > place) currentFrame += number;
  setCurrentFrame(currentFrame);

  if(framesArray.length < 1) addDisplayFrame(0);
}

function createDisplayFrame(place) {
  var frame = document.createElement("div");
  frame.className = "frame frame-" + place;
  frame.dataset.frame = place;
  frame.addEventListener("click", function (e) {
    var place = parseInt(frame.dataset.frame);
    // check if they're okay with leaving the frame with unsaved data
    // console.log("here");
    checkUnsavedFrame(function (res) {
      // console.log("there");
      switch (res) {
        case 1:
          // console.log(place);
          try {
            markSavedFrame(currentFrame);
            openImage(place);
          } catch (e) {
            // console.error(e);
          }
          setCurrentFrame(place);
          break;
      }
    });
  });
  return frame;
}

function addDisplayFrame(place) {
  var frame = createDisplayFrame(place);
  frames.appendChild(frame)
}

function insertDisplayFrame(place) {
  place = parseInt(place);
  var frame = createDisplayFrame(place);
  var nextFrame = frames.querySelector(".frame.frame-" + (place))
  // console.log("action insert", place, nextFrame);
  frames.insertBefore(frame, nextFrame);
}

function updateDisplayFrame(place) {
  var image;
  if(framesArray[place]) {
    image = document.createElement("img");
    var data = objDataToImageData(framesArray[place]);
    image.src = getImageDataURL(data);
  }

  var frame = document.querySelector(".frame.frame-" + place);
  frame.innerHTML = "";
  if(image) frame.appendChild(image);
}

function remove(place) {
  place = parseInt(place) || currentFrame;
  // if(!framesArray[place]) return alert("This frame has no saved data");
  removeFrame(place);
  if(currentFrame === place) openImage(place);
}

function insert(place) {
  place = parseInt(place) || currentFrame;
  insertFrame(place);
}

function removeListeners() {
  // console.log("removing listeners");
  Object.keys(listenerFunctions).map(function(funcName) {
    brushoverlay.removeEventListener(funcName, listenerFunctions[funcName]);
  });
}

function resetFrames() {
  framesArray = [];
  currentFrame = 0;
  frames.innerHTML = "";
}

function resetLayers() {
  // reset select element
  // getCurrentLayer() = 0;
  currentLayer.innerHTML = "";
  // reset cavas containment element
  canvasLayers.innerHTML = "";
  // reset layer reference array
  layerUIReferences = null;
  layerUIReferences = [];
}

var playbackOptions;

function playbackFrames() {
  if(playbackRunning) return;
  playbackRunning = true;
  enableOrDisableTools("playback", "disable");
  var f = 0, images = submitImages(true);

  playbackOptions = openPlaybackDisplay();

  // console.log(parseInt(framerate.value));
  var tick = function() {
    setTimeout(function() {
      if(!playbackRunning) return;
      playbackOptions.setImage(images[f]);
      f++; if(f >= framesArray.length) f = 0;
      if(playbackRunning) tick();
    }, 1000/parseInt(framerate.value));
  }
  tick();

}

function openPlaybackDisplay() {
  var background = document.createElement("div");
  background.className = "overlay-background";

  var img = document.createElement("img");
  img.className = "playback-image";

  document.body.appendChild(background);
  document.body.appendChild(img);

  return {
    deleteSelf: function() {
      document.body.removeChild(background);
      document.body.removeChild(img);
    },
    setImage: function(imageData) {
      img.src = imageData;
    }
  }
}

function stopPlayback() {
  if(!playbackRunning) return;
  playbackRunning = false;
  // clearInterval(playbackInterval);
  // openImage(currentFrame);
  enableOrDisableTools("playback", "enable");
  playbackOptions.deleteSelf();
}

function enableOrDisableTools(whichTools, action) {
  var firstOpt = action === "disable" ? true : false;
  switch (whichTools) {
    case "playback":
      var list = tools.querySelectorAll(".play-lock");
      // console.log("list");
      // console.log(list);
      list.map(function (elem) {
        // console.log(elem);
        framerate.style.pointerEvents = "all";
        elem.style.pointerEvents = firstOpt ? "none" : "";
        elem.style.opacity = firstOpt ? .5 : "";
      });
    break;
  }
}

// initiates a new work area
function createCanvas() {
  // console.log(parseInt(pixelByPixel.value));
  selectedFrameData = null;
  selectedFrameData = {};
  layerCount = 0;
  framesArray = [],
  currentFrame = 0,
  playbackRunning = false,
  playbackInterval = null,
  unsavedFrame = false;
  removeListeners();
  resetFrames();
  resetLayers();
  resetSelectionState();
  addDisplayFrame(0);
  setCurrentFrame(0);
  initCanvas("2d", parseInt(pixelByPixel.value));
}

// populate options
for(var i = 1; i <= 16; i++) {
  var opt = document.createElement("option");
  opt.value = i*8;
  opt.innerText = (i*8) + "x" + (i*8);
  pixelByPixel.appendChild(opt);
}

function getCanvasAndContext(isNew, overlay) {
  // isNew - if true, returns a new canvas
  // ovelay - if true, returns the overlay canvas
  var str = "canvas" + getCurrentLayer(true);
  // console.log(str);
  var thisCanvas = overlay ? brushoverlay : window[str];
  var tempCanvas = isNew ? makeCanvas(overlay, brushoverlay.width, brushoverlay.height, null, true) : thisCanvas;
  // console.log(tempCanvas);
  var ctx = tempCanvas.getContext("2d");
  return {
    canvas: tempCanvas,
    context: ctx
  };
}

function submitImages(forPlayback) {
  return (function functionName() {
    var imageDataURLs = [];

    checkUnsavedFrame(function (res) {
      switch (res) {
        case 1:
        framesArray.map(function (imageDataObj, ind) {
          if(!imageDataObj) return;
          var dataURL = getImageDataURL(objDataToImageData(imageDataObj));
          if(forPlayback) {
            imageDataURLs.push(dataURL);
          } else {
            var parsedDataURL = parseImageDataURL(dataURL);
            imageDataURLs.push(parsedDataURL);
          }
        });
        if(!forPlayback) {
          sendImageDataURLs(imageDataURLs);
        }
        break;
      }
    }, 2);

    return imageDataURLs;
  })();
}

function saveRaw() {
  new Promise(function(resolve, reject) {
    checkUnsavedFrame(function (res) {
      switch (res) {
        case 1:
          resolve();
          break;
      }
    }, 2);
  })
  .then(function () {
    var string = JSON.stringify(framesArray);
    var blob = new Blob([string], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.setAttribute("download", "pixel-box-gif.json");
    a.click();
  })
  .catch(e => console.error(e));
}

function openRaw(data) {
  new Promise(function(resolve, reject) {
    checkUnsavedFrame(function (res) {
      switch (res) {
        case 1:
          resolve();
          break;
        case 2:
          loadProjectInput.value = "";
          break;
      }
    }, 2);
  })
  .then(function () {
    createCanvas();
    var strippedData = data.split(",").pop();
    var convertedData = atob(strippedData);
    var objectData = JSON.parse(convertedData);

    objectData.map(function (frame) {
      selectedFrameData = frame;
      newFrame();
    })
  })
  .catch(e => console.error(e));
}

function loadProject(e) {
  loadProjectInput.click();
}

function sendImageDataURLs(dataURLs) {
  // console.log("image data URLs");
  // console.log(dataURLs);
  var dataToSend = {};
  dataURLs.map(function (dataURL, ind) {
    dataToSend["frame" + ind] = dataURL;
  });
  // console.log(dataToSend);

  ajax({
    url: "/upload?framerate=" + framerate.value,
    type: "POST",
    data: JSON.stringify(dataToSend),
    success(data) {
      data = JSON.parse(data);
      console.log(data);
      var url = "http://" + location.host + "/get-file/" + data.filename;
      window["download-link"].href = url;
      window["download-link"].innerText = url;
    },
    error(data) {
      console.error(data);
    }
  });
}

function getImageDataURL(imageData) {
  if(!imageData) return;
  // console.log("getting image data url");
  var data = getCanvasAndContext(true);
  var tempCanvas = data.canvas;
  var ctx = data.context;

  // place image data
  var gpc = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "source-over"
  // console.log(ctx.globalCompositeOperation);
  ctx.putImageData(imageData, 0, 0);
  // extract dataURL
  var url = tempCanvas.toDataURL("image/png");
  // console.log(url);
  ctx.globalCompositeOperation = gpc;
  return url;
}

function parseImageDataURL(url) {
  // console.log("parsing image data url");
  var parsedURL = url.replace(/^data:image\/(png|jpg);base64,/, "");
  // console.log(parsedURL);
  return parsedURL;
}

function endOfArray(arr, ind) {
  // console.log("end of array");
  return arr.length - 1 === ind;
}

function checkUnsavedFrame(cb, buttonCount) {
  if(unsavedFrame) {
    return userConfirm("The current frame has not been saved. Are you sure you want to continue?", cb, buttonCount);
  }
  cb(1);
}

function confirmSelectionMove(cb, buttonCount) {
  if(selectionState.action === "selected" && selectionState.pixelsMoved) {
    return userConfirm("you have made changes with the selection tool. Would you like to save these changes?", cb, buttonCount);
  }
  cb(1);
}

function checkDelete() {
  return confirm("Are you sure you want to delete this frame?");
}

function objDataToImageData(data, perLayer) {
  var CnC = getCanvasAndContext(true);
  var { canvas, context: ctx } = CnC;
  canvas.className = "test";
  var dataOnLayer = [];

  Object.keys(data).map(function (_, ind) {
    var layer = "l" + ind;
    var layerData = data["l" + ind];
    // console.log("layerData", layer, layerData);
    Object.keys(layerData).map(function (key) {
      var pixelData = layerData[key];
      // console.log("pixeldata", key, pixelData);
      drawPixel(Object.assign(pixelData, CnC), true, true);
      // if we need to get the data for individual layers
    })
    // get the iamge data
    if(perLayer) {
      dataOnLayer.push( ctx.getImageData(0, 0, brushoverlay.width, brushoverlay.height) );

      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.fillRect(0, 0, brushoverlay.width, brushoverlay.height);
      // return to original comp
      ctx.globalCompositeOperation = "source-over"
    }
  })

  // console.log("blah");
  // console.log(canvas, ctx);
  // console.log(canvas.toDataURL("image/png"));
  // console.log(imageData);
  // console.log("per layer", perLayer);
  if(perLayer) {
    // console.log(dataOnLayer);
    return dataOnLayer;
  } else {
    var imageData = ctx.getImageData(0, 0, brushoverlay.width, brushoverlay.height);
    return imageData;
  }
}

function normalizeMouse(e) {
  var button;

  if(e.button === 0 && e.buttons === 0) button = "none";
  if(e.button === 0 && e.buttons === 1 || e.button === 0 && e.buttons === 0) button = "left";
  if(e.button === 1 && e.buttons === 4 || e.button === 1 && e.buttons === 0) button = "middle";
  if(e.button === 2 && e.buttons === 2 || e.button === 2 && e.buttons === 0) button = "right";
  if(e.button === 0 && e.buttons === 5) button = "left-middle";
  if(e.button === 0 && e.buttons === 3) button = "left-right";
  if(e.button === 1 && e.buttons === 6) button = "middle-right";

  return button;
}

function copyObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function userConfirm(text, res, buttonCount) {
  if(typeof res !== "function") return console.error("no response function");
  buttonCount = buttonCount || 3;
  var background = document.createElement("div");
  background.className = "overlay-background";

  var box = document.createElement("div");
  box.className = "dialog-box";

  var dialog = document.createElement("p");
  dialog.innerText = text;
  var buttons = document.createElement("div");
  buttons.className = "buttons";

  var confirm = document.createElement("button");
  confirm.innerText = "Confirm";
  confirm.addEventListener("click", function() {
    res(1, "confirm");
    deleteSelf();
  });
  var deny = document.createElement("button");
  deny.innerText = "Deny";
  deny.addEventListener("click", function() {
    res(2, "deny");
    deleteSelf();
  });
  var cancel = document.createElement("button");
  cancel.innerText = "Cancel";
  cancel.addEventListener("click", function() {
    res(3, "cancel");
    deleteSelf();
  });

  box.appendChild(dialog);
  box.appendChild(buttons);
  buttons.appendChild(confirm);
  if(buttonCount >= 2) buttons.appendChild(deny);
  if(buttonCount >= 3) buttons.appendChild(cancel);

  document.body.appendChild(background);
  document.body.appendChild(box);
  confirm.focus();

  function deleteSelf() {
    document.body.removeChild(background);
    document.body.removeChild(box);
  }
}

function makePixelKey(data) {
  return data.centerX + "_" + data.centerY;
}

function stripPixelKey(data) {
  var splitStr = data.split("_");
  return {
    centerX: parseInt(splitStr[0]),
    centerY: parseInt(splitStr[1])
  }
}

// buttons events
document.addEventListener("keydown", function (e) {
  // console.log(e);
  switch (e.key.toLowerCase()) {
    case "e": setTool("eraser"); break;
    case "q": setTool("pencil"); break;
    case "m": setTool("move"); break;
    case "f": setTool("fill"); break;
    case "s": if(!e.ctrlKey) e.shiftKey ? setTool("select") : saveFrame(); break;
    case "c": if(e.ctrlKey && e.shiftKey) { clearCanvas(); }; if(e.ctrlKey) { copyFrameData(); } break;
    case "v": if(e.ctrlKey) { pasteFrameData(); } break;
    case "n": newFrame(e.shiftKey); break;
    case "[": if(e.ctrlKey) goToFrame(currentFrame-1); break;
    case "]": if(e.ctrlKey) goToFrame(currentFrame+1); break;
    case ".": nextFrame(); break;
    case ",": prevFrame(); break;
  }
});

window["download-link"].addEventListener("click", function () {
  setTimeout(function () {
    window["download-link"].href= "#";
    window["download-link"].innerText= "";
  }, 100);
})

HTMLElement.prototype.hasClass = function(stringOrArray) {
  if(!this.className) return false;

  var proceed = function(type) {
    var yes = false;

    switch (type) {
      case "Array": yes = stringOrArray.map(check) || yes; break;
      case "String": yes = check(stringOrArray); break;
    }
    return yes;
  }

  var check = function(text) {
    return this.className.split(" ").indexOf(text) >= 0;
  }.bind(this);

  var type = Object.prototype.toString.call(stringOrArray).match(/([a-z]+)]/i)[1];
  switch (type) {
    case "String":
    case "Array":
      return proceed(type);
    break;
  }
}

HTMLElement.prototype.addClass = function(stringOrArray) {
  var proceed = function(type) {
    switch (type) {
      case "Array": stringOrArray.map(add).join(" "); break;
      case "String": add(stringOrArray); break;
    }
  }

  var add = function(text) {
    var arr = this.className ? this.className.split(" ") : [];
    if(arr.indexOf(text) !== -1) return;
    arr.push(text);
    var joined = arr.join(" ");
    this.className = joined;
  }.bind(this);

  var type = Object.prototype.toString.call(stringOrArray).match(/([a-z]+)]/i)[1];
  proceed(type);
}

HTMLElement.prototype.removeClass = function(stringOrArray) {
  var proceed = function(type) {
    switch (type) {
      case "Array": stringOrArray.map(remove).join(" "); break;
      case "String": remove(stringOrArray); break;
    }
  }

  var remove = function(text) {
    var arr = this.className ? this.className.split(" ") : [];
    var place = arr.indexOf(text);
    if(place < 0) return this.className;
    arr.splice(place, 1);
    this.className = arr.join(" ");
  }.bind(this);

  var type = Object.prototype.toString.call(stringOrArray).match(/([a-z]+)]/i)[1];
  proceed(type);
}
