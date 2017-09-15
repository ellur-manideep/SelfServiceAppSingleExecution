
//Module Requirement
var express = require('express');
var request = require('request');
var bodyparser = require('body-parser');
var xlsx = require('xlsx');
var multer = require('multer');
var fs = require('fs');
var fs1 = require('fs-extra');
var _ = require('underscore');
var jenkins = require('jenkins')({ baseUrl: 'http://rkravi:w3lcomeg!tlab@wpsa-jenkins.sndbx.junipercloud.net:8080' });

//**************************************************************************************
// Gitlab Repo Path
var url = "https://it-gitlab.junipercloud.net/wpsa-qa/IT-SAP-UFT-AUTOMATION_POC.git";

//Running the bat file for cloning
var spawn = require('child_process').exec("clone.bat", function (err, stdout, stderr) {
  if (err) {
    return console.log(err);
  }
  console.log(stdout);
});

//Path where the file has to be uploaded
var upload= multer({dest: __dirname + '/public/uploads/'});

var app = express();

app.use(bodyparser.json());

app.use(express.static(__dirname + "/public"));

//Getting the list of scenarios from excel sheet
app.get('/getScenarios', function(req, res){
  var workbook = xlsx.readFile(__dirname + '/public/Book1.xlsx');
  var sheet_name_list = workbook.SheetNames;
  var xlData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
  console.log(xlData);
  res.json(xlData);
})

//Function call to remove files from a directory
removeDirForce("public/uploads/");

//Uploading test data file and kickstart jenkins
app.post("/multer", upload.single('file'), uploadFile);

//********************************************************************************

//Functions
//Function to upload and run the jenkins
function uploadFile(req, res){
  fs.readdir('public/uploads/', (err, files) => {
    files.forEach(file => {
      console.log(file);
      //Renaming the uploaded file name to TestData_SAP_Automation.xls
      fs.rename('public/uploads/' + file, 'public/uploads/TestData_SAP_Automation.xls', function(err) {
        if ( err ) console.log('ERROR: ' + err);
        else {
          removeDirForce("IT-SAP-UFT-AUTOMATION_POC/TestData/");
          //Moving the uploaded file to the cloned repo
          fs1.move('public/uploads/TestData_SAP_Automation.xls', 'IT-SAP-UFT-AUTOMATION_POC/TestData/TestData_SAP_Automation.xls', function(err){
            if(err){
              console.log(err);
            }
            else {
              console.log("Moved");
              //Pushing the cloned and updated repo by running the bat file
              require('child_process').exec("push.bat", function (err, stdout, stderr) {
                if (err) {
                  return console.log(err);
                }
                console.log(stdout);
                //Triger Build from Jenkins
                jenkins.job.build('ITQA_FT_UFT_SAP', function(err, data) {
                  if (err) throw err;
                  console.log('queue item number', data);
                  res.json("Success");
                });
              });
            }
          });
        }
      });
    });
  })
}

//Function to remove files in a directory
function removeDirForce(path) {
  fs.readdir(path, function(err, files) {
    if (err) {
      console.log(err.toString());
    }
    else {
      if (files.length == 0) {
        console.log("Directory is Empty");
      }
      else {
        _.each(files, function(file) {
          var filePath = path + file + "/";
          fs.stat(filePath, function(err, stats) {
            if (stats.isFile()) {
              fs.unlink(filePath, function(err) {
                if (err) {
                  console.log(err.toString());
                }
                else {
                  console.log("Directory emptied");
                }
              });
            }
            if (stats.isDirectory()) {
              removeDirForce(filePath);
            }
          });
        });
      }
    }
  });
}


app.listen(8888);
console.log("Port 8888");
