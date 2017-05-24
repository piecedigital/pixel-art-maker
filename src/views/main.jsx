import React from "react";
import { render } from "react-dom";

this.listenerFunctions = {};

const SelectOption = React.createClass({
  render() {
    const { value } = this.props;

    return (
      <option value={value}>
        {`${value}x${value}`}
      </option>
      var opt = document.createElement("option");
    );
  }
});

const Canvas = React.createClass({
  getInitialState() {
    return {
      className: "canvas"
    };
  },
  openImage(place) {
    this.ctx.putImageData(this.props.data, 0, 0);
  },
  clearCanvas() {
    wipeCanvas(this.canvas);
  },

  componentWillReceiveProps() {
    this.canvas.className = "canvas canvas-" + this.props.layer;
    this.openImage();
  },
  componentDidMount() {
    const {
      canvasProperties: {
        width,
        height
      }
    } = this.props;
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.className = "canvas canvas-" + this.props.layer;
    this.ctx = this.canvas.getContext("2d");
    this.openImage();
  },
  render() {
    return (
      return this.canvas;
    );
  };
});

const CanvasContainer = React.createClass({
  getInitialState() {
    return {
      imageObjectData: []
    }
  },
  initCanvas(canvas, contextValue, pixel) {
    const ( canvasProperties ) = this.props;

    var //pixel = 32,
    editorDimensionMultiplier = (16*4) * 10,
    w = editorDimensionMultiplier/*pixel*( (pixel*pixel) / (2) * 10 )*/,
    h = editorDimensionMultiplier/*pixel*( (pixel*pixel) / (2) * 10 )*/;// Math.round( (32 / canvas.offsetWidth) * w);
    // console.log(editorDimensionMultiplier);
    if(Object.prototype.toString.call(canvas) !== "[object HTMLCanvasElement]") return;// console.error("1st argument needs to be an HTML canvas element");
    if(typeof contextValue !== "string") return;// console.error("2nd argument needs to be a string denoting a 2d or 3d context of the canvas");

    // var canvas = makeCanvas(false, w,h), brushoverlay = makeCanvas(true, w,h);
    // var ctx = canvas.getContext(contextValue);
    this.ctx = this.refs.brushoverlay.getContext("2d");

    listenerFunctions.click = (e) => {
      this.drawPixel(mouseGridPosition(e, {
        pixel,
        w,
        h
      }))
    };
    this.refs.brushoverlay.addEventListener("click", listenerFunctions.click);

    listenerFunctions.mousemove = (e) => {
      var mouseData = mouseGridPosition(e, {
        pixel,
        w,
        h
      });
      if(e.button === 0 && e.buttons === 1) {
        this.drawPixel(mouseData);
      }
      drawOnToolOverlay(mouseData);
    };
    this.refs.brushoverlay.addEventListener("mousemove", listenerFunctions.mousemove);
  },
  mouseGridPosition(e, { w, h }) {
    // if(!canvas) ({ canvas, context: ctx } = getCanvasAndContext());
    // console.log("click", e);
    const canvas = this.refs.brushoverlay;
    const ctx = this.ctx;
    const mX = e.offsetX;
    const mY = e.offsetY;
    // console.log( Math.round( (mX / canvas.offsetWidth) * pixel) );
    const pixelPlaceW = Math.floor( (mX / canvas.offsetWidth) * pixel);
    const pixelPlaceH = Math.floor( (mY / canvas.offsetHeight) * pixel);
    const x = (pixelPlaceW/pixel) * w;
    const y = (pixelPlaceH/pixel) * h;
    // console.log(pixelPlaceW, x);
    // console.log(ctx.globalCompositeOperation);
    var data = {
      left: x < 0 ? 0 : x,
      top: y < 0 ? 0 : y,
      canvasWidth: w,
      canvasHeight: h,
      pixel,
      canvas,
      context: ctx,
      width: w/pixel,
      height: h/pixel,
    };
    data.right = x + data.width;
    data.bottom = y + data.height;
    data.centerX = data.left + (data.right / 2);
    data.centerY = data.top + (data.bottom / 2);
    // console.log(data);
    return data;
  },
  drawPixel (data) {
    var {
      left,
      top,
      width,
      height,
      centerX,
      centerY,
      pixel,
      canvas,
      context: ctx
    } = data;

    // console.log(canvas);
    switch (brushTool) {
      case "pencil":
        ctx.globalCompositeOperation = "source-over"
        ctx.fillStyle = colorElement.value;
        ctx.fillRect(left, top, width, height);
      break;
      case "eraser":
        ctx.globalCompositeOperation = "destination-out"
        ctx.fillStyle = "rgba(255,255,255,1)";
        ctx.fillRect(left, top, width, height);
      break;
    }

    this.props.methods.markUnsavedFrame(currentFrame);
  },
  drawOnToolOverlay(data) {
    clearCanvas(true);
    // drawPixel(Object.assign(data, {
    //   canvas,
    //   context: ctx
    // }));
    // console.log(data);
    var cursor = this.refs.cursor;
    cursor.style.top = data.top+"px";
    cursor.style.left = data.left+"px";
    cursor.style.width = data.width+"px";
    cursor.style.height = data.height+"px";
  },
  clearCanvas(overlay) {
    const {
      imageObjectData,
      frame
    } = this.state;

    if(overlay) {
      wipeCanvas(this.refs.brushoverlay);
    } else {
      imageObjectData[frame].map((_, ind) => {
        this.refs[`layer${ind}`].clearCanvas();
      });
    }
  },
  setCurrentFrame(place) {
    this.setState({
      frame: place
    })
  },

  componentDidMount() {
    const {
      canvasProperties,
    } = this.props;

    this.initCanvas(this.refs.brushoverlay, canvasProperties.contextValue, canvasProperties.pixelValue);
  },
  render() {
    const {
      frameLayers,
      brushOverlay,
      canvasProperties,
    } = this.props;

    const {
      imageObjectData,
      frame
    } = this.state;

    return (
      <div className="canvas-container">
        <div className="frames play-lock"></div>
        <span className="canvas-wrap">
          {
            // imageObjectData[frame].map((data, ind) => {
            imageObjectData.map((data, ind) => {
              return <Canvas key={ind} ref={`layer${ind}`} {...{
                data,
                canvasProperties,
                layer
              }} />;
            })
          }
          <canvas ref="brushoverlay" id="brushoverlay" width="0" height="0"></canvas>
          <div className="cursor-changer"></div>
          <div ref="cursor" className="cursor"></div>
        </span>
      </div>
    );
  }
});

const ToolsContainer = React.createClass({
  getInitialState() {
    return {
      brushTools: ["pencil", "eraser"]
    }
  },

  goToFrame(index) {
    const {
      methods: {
        checkUnsavedFrame,
        setCurrentFrame
      }
    } = this.props;

    if(!checkUnsavedFrame()) return;
    // openImage(index);
    setCurrentFrame(index);
  },

  render() {
    const {
      brushTools,
      methods: {
        setTool,
        clearCanvas,
        createCanvas
      }
    } = this.props

    return (
      <div className="tools-container">
        <div className="tools play-lock">
          <div className="">
            <h4 for="">Make New Canvas</h4>
          </div>
          <div className="">
            <label for="">Image Dimensions (virtual pixel by pixel): </label>
            <select className="pixel-by-pixel" name=""></select>
          </div>
          <div className="">
            <button type="button" name="button" onClick={createCanvas.bind(null)}>Make New Canvas</button>
          </div>
        </div>
        <div className="tools play-lock">
          <div className="">
            <h4 for="">Editing Tools</h4>
          </div>
          <div className="">
            <label for="">Current Frame: </label><span className="current-frame"></span>
          </div>
          <div className="">
            <label for="">Color: </label>
            <input className="color" type="color" name="" value="fff"/>
          </div>
          <div className="brushes">
            <span className={`brush-show ${brushTool}`}></span>
            {
              brushTools.map(tool => {
                <button className={`brush ${tool}`} title={`${tool.toUpperCase()} tool`} type="button" name="button" onClick={setTool.bind(null, 'pencil')}></button>
              })
            }
          </div>
          <div className="">
            <button type="button" name="button" onClick={clearCanvas.bind(null)}>Clear The Canvas</button>
            <button type="button" name="button" onClick={saveFrame.bind(null)}>Save Frame</button>
            <button type="button" name="button" onClick={newFrame.bind(null)}>New Frame</button>
            <button type="button" name="button" onClick={newFrame.bind(null, true)}>New Empty Frame</button>
          </div>
          <div className="">
            <button type="button" name="button" onClick={remove.bind(null)}>Remove Current Frame</button>
            <button type="button" name="button" onClick={insert.bind(null)}>Insert After Current Frame</button>
          </div>
        </div>
        <div className="tools">
          <div className="">
            <h4 for="">Playback Tools</h4>
          </div>
          <div className="">
            <button type="button" name="button" onClick={playbackFrames.bind(null)}>Playback Image</button>
            <button type="button" name="button" onClick={stopPlayback.bind(null)}>Stop Playback</button>
          </div>
          <div className="">
            <label for="">Framerate: </label>
            <select className="framerate">
              {
                canvasOptions.map(data => {
                  return <SelectOption value={data} />;
                })
              }
            </select>
          </div>
        </div>
        <div className="tools play-lock">
          <div className="">
            <h4 for="">Gif Save Options</h4>
          </div>
          <div className="">
            <label for=""><i>The framerate in "Playback Tools" will determine the framerate of your gif</i></label>
          </div>
          <div className="">
            <button type="button" name="button" onClick="submitImages()">Save Gif</button>
          </div>
        </div>
      </div>
    );
  }
});

const Root = React.createClass({
  displayName: "Root",
  getInitialState() {
    // http://stackoverflow.com/a/15666143/4107851
    var pixelRatio = (function () {
      var ctx = document.createElement("canvas").getContext("2d"),
      dpr = window.devicePixelRatio || 1,
      bsr = ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1;

      return dpr / bsr;
    })();
    // populate options
    var canvasOptions = [];
    for(var i = 1; i <= 16; i++) {
      canvasOptions.push(opt);
    }
    return ({
      brushTool: "pencil",
      currentFrame: 0,
      playbackRunning: false,
      playbackInterval: null,
      unsavedFrame: false,
      canvasOptions,
      canvasProperties: {
        pixelRatio,
        width: 0,
        height: 0,
        contextValue: "2d"
      }
    });
  },
  // makeCanvas(overlay, w, h, ratio, newCanvas) {
  //   // var ratio = ratio || PIXEL_RATIO;
  //   // var thisCanvas = newCanvas ? document.createElement("canvas") : (overlay ? brushoverlay : canvas);
  //   // thisCanvas.width = w * ratio;
  //   // thisCanvas.height = h * ratio;
  //   // thisCanvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
  //   // return thisCanvas;
  // },
  // initCanvas(canvas, contextValue, pixel) {
  //   var //pixel = 32,
  //   editorDimensionMultiplier = (16*4) * 10,
  //   w = editorDimensionMultiplier/*pixel*( (pixel*pixel) / (2) * 10 )*/,
  //   h = editorDimensionMultiplier/*pixel*( (pixel*pixel) / (2) * 10 )*/;// Math.round( (32 / canvas.offsetWidth) * w);
  //   // console.log(editorDimensionMultiplier);
  //   if(Object.prototype.toString.call(canvas) !== "[object HTMLCanvasElement]") return;// console.error("1st argument needs to be an HTML canvas element");
  //   if(typeof contextValue !== "string") return;// console.error("2nd argument needs to be a string denoting a 2d or 3d context of the canvas");
  //
  //   var canvas = makeCanvas(false, w,h), brushoverlay = makeCanvas(true, w,h);
  //   var ctx = canvas.getContext(contextValue);
  //
  //   listenerFunctions.click = function (e) {
  //     drawPixel(mouseGridPosition(e, {
  //       pixel,
  //       canvas,
  //       ctx,
  //       w,
  //       h
  //     }))
  //   };
  //   canvas.addEventListener("click", listenerFunctions.click);
  //
  //   listenerFunctions.mousemove = function(e) {
  //     var mouseData = mouseGridPosition(e, {
  //       pixel,
  //       canvas,
  //       ctx,
  //       w,
  //       h
  //     });
  //     if(e.button === 0 && e.buttons === 1) {
  //       drawPixel(mouseData);
  //     }
  //     drawOnToolOverlay(mouseData);
  //   };
  //   canvas.addEventListener("mousemove", listenerFunctions.mousemove);
  // },
  // mouseGridPosition(e,
  //   {
  //     pixel,
  //     canvas,
  //     ctx,
  //     w,
  //     h
  //   }) {
  //   if(!canvas) ({ canvas, context: ctx } = getCanvasAndContext());
  //   // console.log("click", e);
  //   var mX = e.offsetX;
  //   var mY = e.offsetY;
  //   // console.log( Math.round( (mX / canvas.offsetWidth) * pixel) );
  //   var pixelPlaceW = Math.floor( (mX / canvas.offsetWidth) * pixel);
  //   var pixelPlaceH = Math.floor( (mY / canvas.offsetHeight) * pixel);
  //   var x = (pixelPlaceW/pixel) * w;
  //   var y = (pixelPlaceH/pixel) * h;
  //   // console.log(pixelPlaceW, x);
  //   // console.log(ctx.globalCompositeOperation);
  //   var data = {
  //     left: x < 0 ? 0 : x,
  //     top: y < 0 ? 0 : y,
  //     canvasWidth: w,
  //     canvasHeight: h,
  //     pixel,
  //     canvas,
  //     context: ctx,
  //     width: w/pixel,
  //     height: h/pixel,
  //   };
  //   data.right = x + data.width;
  //   data.bottom = y + data.height;
  //   data.centerX = data.left + (data.right / 2);
  //   data.centerY = data.top + (data.bottom / 2);
  //   // console.log(data);
  //   return data;
  // },
  // drawPixel (data) {
  //   var {
  //     left,
  //     top,
  //     width,
  //     height,
  //     centerX,
  //     centerY,
  //     pixel,
  //     canvas,
  //     context: ctx
  //   } = data;
  //
  //   // console.log(canvas);
  //   switch (brushTool) {
  //     case "pencil":
  //       ctx.globalCompositeOperation = "source-over"
  //       ctx.fillStyle = colorElement.value;
  //       ctx.fillRect(left, top, width, height);
  //     break;
  //     case "eraser":
  //       ctx.globalCompositeOperation = "destination-out"
  //       ctx.fillStyle = "rgba(255,255,255,1)";
  //       ctx.fillRect(left, top, width, height);
  //     break;
  //   }
  //
  //   markUnsavedFrame(currentFrame);
  // },
  // drawOnToolOverlay(data) {
  //   var { canvas, context: ctx } = getCanvasAndContext(false, true);
  //
  //   clearCanvas(true);
  //   // drawPixel(Object.assign(data, {
  //   //   canvas,
  //   //   context: ctx
  //   // }));
  //   // console.log(data);
  //   var cursor = workArea.querySelector(".cursor");
  //   cursor.style.top = data.top+"px";
  //   cursor.style.left = data.left+"px";
  //   cursor.style.width = data.width+"px";
  //   cursor.style.height = data.height+"px";
  // },
  // goToFrame(place) {
  //   if(!checkUnsavedFrame()) return;
  //   openImage(place);
  //   setCurrentFrame(place);
  // },
  setTool(toolName) {
    // console.log(toolName);
    this.setState({
      brushTool: toolName
    });
  },
  clearCanvas(overlay) {
    // // get canvas
    // var data = getCanvasAndContext(false, overlay);
    // var canvas = data.canvas;
    // var ctx = data.context;
    // // console.log("clear", canvas);
    // // erase
    // ctx.globalCompositeOperation = "destination-out"
    // ctx.fillStyle = "rgba(255,255,255,1)";
    // ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    // // return to original comp
    // ctx.globalCompositeOperation = "source-over"
    this.refs.canvasContainer.clearCanvas(overlay);
  },
  setCurrentFrame(frame) {
    // currentFrameDisplay.innerText = frame+1;
    //
    // var frameElems = frames.querySelectorAll(".frame");
    // var currentFrameElem = frames.querySelector(".frame.frame-" + frame);
    // if(frameElems)
    //   frameElems.map(function (frameElem) {
    //     frameElem.className = frameElem.className.replace(/(\s+)?current/, "");
    //   });
    // // else
    //   // console.log("no elem");
    // // set the new current frame after using the old one
    // currentFrame = frame;
    // if(currentFrameElem)
    //   currentFrameElem.className = currentFrameElem.className + " current";
    // // else
    //   // console.log("no elem");
    this.refs.canvasContainer.setCurrentFrame(frame);
  },
  storeImageData() {
    var ctx = canvas.getContext("2d");
    var data = ctx.getImageData(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    // var place = framesArray.length > 0 ? framesArray.length - 1 : 0;
    framesArray[currentFrame] = data;
    markSavedFrame(currentFrame);
    updateDisplayFrame(currentFrame);
  },
  markSavedFrame(frame) {
    unsavedFrame = false;
    var displayFrame = frames.querySelector(".frame.frame-" + frame);
    if(!displayFrame) return;
    if( displayFrame.className.match("saved") && !displayFrame.className.match("unsaved") ) return
    if( displayFrame.className.match("unsaved") ) {
      displayFrame.className = displayFrame.className.replace("unsaved", "saved");
    } else {
      displayFrame.className = displayFrame.className + " saved";
    }
  },
  markUnsavedFrame(frame) {
    unsavedFrame = true;
    var displayFrame = frames.querySelector(".frame.frame-" + frame);
    if(!displayFrame) return;
    if( displayFrame.className.match("unsaved") ) return
    if( displayFrame.className.match("saved") ) {
      displayFrame.className = displayFrame.className.replace("saved", "unsaved");
    } else {
      displayFrame.className = displayFrame.className + " unsaved";
    }
  },
  saveFrame() {
    // console.log("saved image");
    storeImageData();
  },
  newFrame(emptyCanvas) {
    // console.log("next image", emptyCanvas);
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
  },
  removeFrame(place) {
    // removed image data from framesArray
    framesArray.splice(place, 1);
    editFrames(place, "remove");
  },
  insertFrame(place) {
    framesArray.splice(place+1, 0, null)
    editFrames(place, "insert");
  },
  editFrames(place, action) {
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
  },
  createDisplayFrame(place) {
    var frame = document.createElement("div");
    frame.className = "frame frame-" + place;
    frame.dataset.frame = place;
    frame.addEventListener("click", function (e) {
      var place = parseInt(frame.dataset.frame);
      // check if they're okay with leaving the frame with unsaved data

      if(!checkUnsavedFrame()) return;
      // console.log(place);
      try {
        markSavedFrame(currentFrame);
        openImage(place);
      } catch (e) {
        // console.error(e);
      }
      setCurrentFrame(place);
    });
    return frame;
  },
  addDisplayFrame(place) {
    var frame = createDisplayFrame(place);
    frames.appendChild(frame)
  },
  insertDisplayFrame(place) {
    place = parseInt(place);
    var frame = createDisplayFrame(place);
    var nextFrame = frames.querySelector(".frame.frame-" + (place))
    // console.log("action insert", place, nextFrame);
    frames.insertBefore(frame, nextFrame);
  },
  updateDisplayFrame(place) {
    var image;
    if(framesArray[place]) {
      image = document.createElement("img");
      image.src = getImageDataURL(framesArray[place]);
    }

    var frame = document.querySelector(".frame.frame-" + place);
    frame.innerHTML = "";
    if(image) frame.appendChild(image);
  },
  remove(place) {
    place = parseInt(place) || currentFrame;
    // if(!framesArray[place]) return alert("This frame has no saved data");
    removeFrame(place);
    if(currentFrame === place) openImage(place);
  },
  insert(place) {
    place = parseInt(place) || currentFrame;
    insertFrame(place);
  },
  removeListeners() {
    // console.log("removing listeners");
    Object.keys(listenerFunctions).map(function(funcName) {
      canvas.removeEventListener(funcName, listenerFunctions[funcName]);
    });
  },
  resetFrames() {
    framesArray = [];
    currentFrame = 0;
    frames.innerHTML = "";
  },
  playbackFrames() {
    if(playbackRunning) return;
    playbackRunning = true;
    enableOrDisableTools("playback", "disable");
    var f = 0;
    // console.log(parseInt(framerate.value));
    var tick = function() {
      setTimeout(function() {
        if(!playbackRunning) return;
        openImage(f);
        f++; if(f >= framesArray.length) f = 0;
        if(playbackRunning) tick();
      }, 1000/parseInt(framerate.value));
    }
    tick();
  },
  stopPlayback() {
    if(!playbackRunning) return;
    playbackRunning = false;
    // clearInterval(playbackInterval);
    openImage(currentFrame);
    enableOrDisableTools("playback", "enable");
  },
  enableOrDisableTools(whichTools, action) {
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
  },
  createCanvas() {
    // console.log(parseInt(pixelByPixel.value));
    removeListeners();
    resetFrames();
    addDisplayFrame(0);
    setCurrentFrame(0);
    initCanvas(canvas, "2d", parseInt(pixelByPixel.value));
  },
  getCanvasAndContext(isNew, overlay) {
    // isNew - if true, returns a new canvas
    // ovelay - if true, returns the overlay canvas
    var thisCanvas = overlay ? brushoverlay : canvas;
    // http://stackoverflow.com/a/934925/4107851
    var tempCanvas = isNew ? makeCanvas(overlay, canvas.offsetWidth, canvas.offsetHeight, null, true) : brushoverlay;
    // console.log(tempCanvas);
    var ctx = tempCanvas.getContext("2d");
    return {
      canvas: tempCanvas,
      context: ctx
    };
  },
  submitImages() {
    if(!checkUnsavedFrame()) return;
    // var imageBlobs = [];
    var imageDataURLs = [];
    framesArray.map(function (imageData, ind) {
      if(!imageData) return;
      // console.log("working on saving images");
      var parsedDataURL = parseImageDataURL(getImageDataURL(imageData));
      imageDataURLs.push(parsedDataURL);
      // getImageBlob(function (blob) {
      //   imageBlobs.push(blob);
      //   if(endOfArray(framesArray, ind)) sendImageBlobs(imageBlobs);
      // });
    });
    sendImageDataURLs(imageDataURLs);
  },
  sendImageDataURLs(dataURLs) {
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
        console.log(data);
      },
      error(data) {
        console.error(data);
      }
    });
  },
  getImageDataURL(imageData) {
    if(!imageData) return;
    // console.log("getting image data url");
    var data = getCanvasAndContext(true);
    var tempCanvas = data.canvas;
    var ctx = data.context;

    // place image data
    ctx.putImageData(imageData, 0, 0);
    // extract dataURL
    var url = tempCanvas.toDataURL("image/png");
    // console.log(url);
    return url;
  },
  parseImageDataURL(url) {
    // console.log("parsing image data url");
    var parsedURL = url.replace(/^data:image\/(png|jpg);base64,/, "");
    // console.log(parsedURL);
    return parsedURL;
  },
  endOfArray(arr, ind) {
    // console.log("end of array");
    return arr.length - 1 === ind;
  },
  checkUnsavedFrame() {
    if(this.state.unsavedFrame) {
      return confirm("The current frame has not been saved. Are you sure you want to continue?");
    }
    return true;
  },
  checkDelete() {
    return confirm("Are you sure you want to delete this frame?");
  },

  componentDidMount() {
    // buttons events
    document.addEventListener("keydown", function (e) {
      // console.log(e);
      switch (e.key.toLowerCase()) {
        case "e": this.setTool("eraser"); break;
        case "q": this.setTool("pencil"); break;
        case "c": if(e.ctrlKey) this.refs.canvasContainer.clearCanvas(); break;
        case "n": this.newFrame(e.shiftKey); break;
        case "s": if(e.ctrlKey) { this.saveFrame(); } else { /*setTool("select")*/ } break;
        case "[": if(e.ctrlKey) this.refs.toolsContainer.goToFrame("next"); break;
        case "]": if(e.ctrlKey) this.refs.toolsContainer.goToFrame("prev"); break;
      }
    });
  },
  render() {
    const {
      brushTool,
      canvasProperties
    } = this.state;

    return (
      <div className="work-area">
        <ToolsContainer ref="toolsContainer" {...{
          unsavedFrame,
          brushTool,
          markUnsavedFrame: this.markUnsavedFrame
        }}/>
        <CanvasContainer ref="canvasContainer" {...{
          unsavedFrame,
          canvasProperties: Object.assign(canvasProperties, {
            pixelValue: canvasOptions
          }),
          methods: {
            checkUnsavedFrame: this.checkUnsavedFrame,
            setTool: this.setTool,
            clearCanvas: this.clearCanvas,
            createCanvas: this.createCanvas,
            markSavedFrame: this.markUnsavedFrame,
            markUnsavedFrame: this.markUnsavedFrame,
            setCurrentFrame: this.setCurrentFrame,
          }
        }}/>
      </div>
    );
  }
});

function wipeCanvas(canvas) {
  // get canvas
  const ctx = canvas.getContext("2d");
  // console.log("clear", canvas);
  const prevComp = ctx.globalCompositeOperation;

  // erase
  ctx.globalCompositeOperation = "destination-out"
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  // return to original comp
  ctx.globalCompositeOperation = prevComp;
}

const container = document.querySelector(".react-app");

render(Root, container);
