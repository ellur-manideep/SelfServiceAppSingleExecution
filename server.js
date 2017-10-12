
//Module Requirement
var express = require('express');
var request = require('request');
var bodyparser = require('body-parser');
var xlsx = require('xlsx');
var multer = require('multer');
var fs = require('fs');
var fs1 = require('fs-extra');
var _ = require('underscore');
var sleep = require('system-sleep');
var jenkins = require('jenkins')({ baseUrl: 'http://admin:juniper123@d-itqtp-app-01:8080', crumbIssuer: true });
var mysql = require('mysql');
var pool = mysql.createPool({
  connectionLimit: 50,
  host : 'inttankdev.cwkirvnl2kse.us-west-2.rds.amazonaws.com',
  user : 'inttankuser',
  password : 'inttankuser',
  database : 'inttank'
});

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

//Getting the last build number of the particular job from jenkins
app.get('/jobInfo', function(req, res){
  jenkins.job.get('ITQA_FT_UFT_SAP', function(err, data) {
    if (err) throw err;
    else {
      console.log('Last build run: ', data.lastBuild.number);
      res.json( data.lastBuild.number);
    }
  });
});

//Getting the build status of the last build number
app.get('/jobBuild/:jn', function(req, res){
  jenkins.build.get('ITQA_FT_UFT_SAP', req.params.jn, function(err, data) {
    if (err) throw err;
    else {
      console.log('A build is currently Running: ', data.building);
      res.json(data.building);
    }
  });
})

app.post("/insert", function(req, res){
  console.log(req.body);
  console.log("Length of data to be inserted: " + req.body.length);
  var jsondata = req.body;
  var values = [];
  for (var i = 1; i < jsondata.length; i++) {
    values.push([jsondata[i].scenarios, jsondata[i].testdatafile, jsondata[i].sl]);
  }
  console.log(values);
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('INSERT INTO ssa (scenarios, testdatafile, sl) VALUES ?', [values], function(err, result){
      if(!err){
        console.log(result.insertId);
        res.json(result.insertId);
        connection.release();
      }
      else{
        console.log(err);
      }
    });
  });
});

app.get('/excecValue/:id', function(req, res){
  console.log("Id: " + req.params.id);
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('SELECT execution from ssa where slno = ?', req.params.id, function(err, result){
      if(!err){
        console.log(result);
        res.json(result);
        connection.release();
      }
      else{
        console.log(err);
      }
    });
  });
});

app.get('/sl/:id', function(req, res){
  console.log("Id: " + req.params.id);
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('SELECT sl from ssa where slno = ?', req.params.id, function(err, result){
      if(!err){
        console.log(result);
        res.json(result);
        connection.release();
      }
      else{
        console.log(err);
      }
    });
  });
});

app.post('/updateExecution/:id', function(req, res) {
  console.log("slno: " + req.params.id);
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('UPDATE ssa set execution = 1 where slno = ?', req.params.id, function(err, result){
      if(!err){
        console.log(result);
        res.json("Updated");
        connection.release();
      }
      else{
        console.log("error");
      }
    });
  });
});

app.post('/updateExec/:id', function(req, res) {
  console.log("slno: " + req.params.id);
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('UPDATE ssa set execution = 2 where slno = ?', req.params.id, function(err, result){
      if(!err){
        console.log(result);
        res.json("Updated");
        connection.release();
      }
      else{
        console.log("error");
      }
    });
  });
})
//********************************************************************************

//Functions
//Function to upload and run the jenkins
function uploadFile(req, res){
  sleep(2*1000);
  //Reading files from the folder upload
  fs.readdir('public/uploads/', (err, files) => {
    files.forEach(file => {
      console.log("Original file name: " + file);
      sleep(1*1000);
      //Renaming the uploaded file name to TestData_SAP_Automation.xls
      fs.rename('public/uploads/' + file, 'public/uploads/TestData_SAP_Automation.xls', function(err) {
        if ( err ) console.log('ERROR: ' + err);
        else {
          removeDirForce("IT-SAP-UFT-AUTOMATION_POC/TestData/");
          sleep(1*1000);
          //Moving the uploaded file to the cloned repo
          fs1.move('public/uploads/TestData_SAP_Automation.xls', 'IT-SAP-UFT-AUTOMATION_POC/TestData/TestData_SAP_Automation.xls', function(err){
            if(err){
              console.log(err);
            }
            else {
              console.log("Moved the file to the cloned repo");
              //Pulling the repo from gitlab for updating the local repo
              require('child_process').exec("pull.bat", function (err, stdout, stderr) {
                if (err) {
                  return console.log(err);
                }
                console.log(stdout);
                sleep(5*1000);
                //Pushing the cloned and updated repo
                require('child_process').exec("push.bat", function (err, stdout, stderr) {
                  if (err) {
                    return console.log(err);
                  }
                  console.log(stdout);
                  //res.json("Testing");
                  //Triger Build from Jenkins
                  jenkins.job.build({name:"ITQA_FT_UFT_SAP", parameters: { name: 'Test' }}, function(err, data) {
                    sleep(3*1000);
                    if (err) throw err;
                    else {
                      console.log('queue item number', data);
                      sleep(10*1000);
                      res.json(data);
                    }
                  });
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
