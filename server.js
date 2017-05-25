var path = require("path");
var fs = require("fs");
var cp = require("child_process");
var express = require("express");
var app = express();
var giffy = require("./giffy");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/upload", function(req, res, next) {
  // console.log("this will handle file data");
  var body = "";

  req.on("data", function (chunk) {
    // console.log("chunk", chunk);
    body += chunk;
  });
  req.on("end", function() {
    // console.log("finished");
    // console.log(JSON.parse(body));
    req.files = formatFiles(JSON.parse(body));
    next();
  });
}, function (req, res) {
  console.log("this finishes the upload");
  // console.log(req.files);
  saveFiles({
    files: req.files,
    framerate: req.query.framerate
  }, function (result) {
    if(result.success) {
      res.status(200).send(result.message);
    } else {
      res.status(403).send("There was an issue saving your image: " + result.message);
    }
  });
});


function formatFiles(body) {
  console.log("Formatting...");
  var urls = [];

  Object.keys(body).map(function (frameKey) {
    urls.push(body[frameKey]);
  });

  return urls;
}

function saveFiles(obj, cb) {
  var files = obj.files;
  var framerate = parseInt(obj.framerate);
  var stop = false;

  new Promise(function(resolve, reject) {
    // create unique folder
    var uniqueFolderName = "date-utc-" + Date.now();
    fs.mkdir(path.join(__dirname, "public", uniqueFolderName), function (err) {
      if(err) {
        stop = true;
        console.error(err.stack || err);
        cb({
          success: false,
          message: err.message || err
        });
        reject();
      }
      resolve(uniqueFolderName);
    });
  })
  .then(function (uniqueFolderName) {
    files.map(function (fileInfo, ind) {
      if(stop) return;
      // fileInfo = String dataURL
      var binaryData = convertToBinary(fileInfo);
      var filename = "frame" + ind + ".png"; // fileInfo.contentDisposition.split(/;\s/g).pop().split("=").pop().replace(/\"/g, "")
      console.log("filename", filename);
      // write file
      var folderPath = path.join(__dirname, "public", uniqueFolderName);
      var filePath = path.join(folderPath, filename);
      fs.writeFile(filePath, binaryData, "binary", function (err) {
        if(err) {
          stop = true;
          console.error(err.stack || err);
          cb({
            success: false,
            message: err.message || err
          });
          return;
        }
        if(endOfArray(files, ind)) {
          giffy({
            source: uniqueFolderName,
            filename: "gif-" + uniqueFolderName,
            fileCount: files.length,
            framerate: framerate
          }, function (result) {
            // remove folder
            var cmd = "rm '" + folderPath + "' -r";
            console.log(cmd);
            cp.exec(cmd, function (error, stdout, stderr) {
              if (error) {
                console.error("exec error: " + error);
                return;
              }
              console.log("stdout: " + stdout);
              console.log("stderr: " + stderr);
            });

            if(result.success) {
              cb({
                success: true,
                message: "Gif created successfully!"
              });
            } else {
              cb({
                success: false,
                message: result.message.message || result.message
              });
            }
          })
        }
      });
    });
  })
  .catch(e => console.error(e.stack || e));
}

app.listen(process.env["PORT"] || 8000, function () {
  console.log("now listening on port 8000");
});

function convertToBinary(data) {
  var buf = new Buffer(data, "base64");
  // console.log(buf);
  return buf;
}

// ------WebKitFormBoundaryE42X5pTHzbD1OXEF
// Content-Disposition: form-data; name="frame1"; filename="frame1.png"
// Content-Type: image/png
// ------WebKitFormBoundaryE42X5pTHzbD1OXEF--

function endOfArray(arr, ind) {
  var end = arr.length - 1 === ind;
  if(end) console.log("end of array");
  return end;
}

function btoa(str) {
  return new Buffer(str).toString("base64");
}
function atob(str) {
  return new Buffer(str, "base64").toString("ascii");
}
