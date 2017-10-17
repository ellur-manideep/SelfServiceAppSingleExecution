
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
var slNumber;
var currSlno;
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
});

app.get('/getData', function(req, res){
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('SELECT * from ssa', function(err, result){
      if(!err){
        res.json(result);
        connection.release();
      }
      else{
        console.log(err);
      }
    });
  });
})

//Function call to remove files from a directory
removeDirForce("public/uploads/");

//Inserting into db
app.post("/insert", function(req, res){
  console.log(req.body);
  console.log("Length of data to be inserted: " + req.body.length);
  var jsondata = req.body;
  var values = [];
  for (var i = 1; i < jsondata.length; i++) {
    values.push([jsondata[i].username, jsondata[i].scenarios, jsondata[i].testdatafile]);
  }
  console.log(values);
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('INSERT INTO ssa (username, scenarios, testdatafile) VALUES ?', [values], function(err, result){
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

app.post("/insertLength", function(req, res){
  console.log("Data to be inserted: " + req.body);
  var jsondata = req.body;
  var values = [];
  for (var i = 1; i < jsondata.length; i++) {
    values.push([jsondata[i].testdatalength]);
  }
  console.log(values);
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('INSERT INTO insertion (testdatalength) VALUES ?', [values], function(err, result){
      if(!err){
        console.log("Inserted length with id: " + result.insertId);
        res.json(result.insertId);
        connection.release();
      }
      else{
        console.log(err);
      }
    });
  });
});

app.post("/updateLen/:id", function(req, res){
  console.log("Id to be updated: " + req.params.id);
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('UPDATE insertion set testdatalength = testdatalength-1 where slno = ?', req.params.id, function(err, result){
      if(!err){
        console.log("Updated");
        res.json("Updated");
        connection.release();
      }
      else{
        console.log(err);
      }
    });
  });
});

app.get('/getLength/:id', function(req, res){
  console.log("Prevlenid: " + req.params.id);
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('SELECT testdatalength from insertion where slno = ?', req.params.id, function(err, result){
      if(!err){
        console.log("testdatalength of previnslenid: " + result[0].testdatalength);
        res.json(result[0].testdatalength);
        connection.release();
      }
      else{
        console.log(err);
      }
    });
  });
})

app.post("/multer", upload.single('file'), insFile);

startExec();
//********************************************************************************

//Functions
function startExec(){
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('SELECT min(slno) as minSlno from ssa where execution = 0', function(err, result){
      if(!err){
        //console.log("slno for execution: " + result[0].minSlno);
        connection.release();
        if (result[0].minSlno == null) {
          sleep(5000);
          startExec();
        }
        else {
          slNumber = result[0].minSlno;
          console.log(slNumber-1);
          if (slNumber != 1) {
            console.log("Previous Slno: " + slNumber-1)
            checkExec(slNumber-1);
          }
          else {
            uploadFile(slNumber);
          }
        }
      }
      else{
        console.log(err);
      }
    });
  });
}

function checkExec(prevSlno){
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    console.log("Previous slno: " + prevSlno);
    connection.query('SELECT execution from ssa where slno = ?', prevSlno, function(err, result){
      if(!err){
        console.log("Previous execution value: " + result[0].execution);
        connection.release();
        if (result[0].execution == 2) {
          uploadFile(slNumber);
        }
        else {
          sleep(5000);
          console.log("Recursive call for checking execution value of previous slno.");
          checkExec(prevSlno);
        }
      }
      else{
        console.log(err);
      }
    });
  });
}

function insFile(req, res){
  sleep(2*1000);
  fs.readdir('public/uploads/', (err, files) => {
    files.forEach(file => {
      console.log("Original file name: " + file);
      sleep(1*1000);
      fs1.move('public/uploads/' + file, 'public/InsertedFiles/' + file, function(err){
        if(err){
          console.log(err);
        }
        else {
          console.log("File moved to InsertedFiles folder");
          res.json(file);
        }
      });
    });
  });
}

function updateExec1(currSlno){
  console.log("slno: " + currSlno);
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('UPDATE ssa set execution = 1 where slno = ?', currSlno, function(err, result){
      if(!err){
        console.log(result);
        console.log("Updated to 1");
        connection.release();
      }
      else{
        console.log("error");
      }
    });
  });
}

function updateExec2(currSlno){
  console.log("slno: " + currSlno);
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('UPDATE ssa set execution = 2 where slno = ?', currSlno, function(err, result){
      if(!err){
        console.log(result);
        console.log("Updated to 2");
        connection.release();
        sleep(3000);
        startExec();
      }
      else{
        console.log("error");
      }
    });
  });
}

//Function to upload and run the jenkins
function uploadFile(currSlno){
  updateExec1(currSlno);
  sleep(2*1000);
  pool.getConnection(function(err, connection){
    if (err) {
      throw err;
    };
    connection.query('SELECT testdatafile from ssa where slno = ?', currSlno, function(err, result){
      if(!err){
        console.log("Test Data file name: " + result[0].testdatafile);
        connection.release();
        //Reading files from the folder upload
        fs.readdir('public/InsertedFiles/', (err, files) => {
          files.forEach(file => {
            if (file == result[0].testdatafile) {
              console.log("Original file name: " + file);
              sleep(1*1000);
              //Renaming the uploaded file name to TestData_SAP_Automation.xls
              removeDirForce("IT-SAP-UFT-AUTOMATION_POC/TestData/");
              fs1.copy('public/InsertedFiles/' + file, 'IT-SAP-UFT-AUTOMATION_POC/TestData/' + file, function(err) {
                if ( err ) console.log('ERROR: ' + err);
                else {
                  console.log("Copied the file to the cloned repo.");
                  sleep(1*1000);
                  //Moving the uploaded file to the cloned repo
                  fs1.rename('IT-SAP-UFT-AUTOMATION_POC/TestData/' + file, 'IT-SAP-UFT-AUTOMATION_POC/TestData/TestData_SAP_Automation.xls', function(err){
                    if(err){
                      console.log(err);
                    }
                    else {
                      console.log("Renamed the file");
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
                          //Triger Build from Jenkins
                          jenkins.job.build({name:"ITQA_FT_UFT_SAP", parameters: { name: 'Test' }}, function(err, data) {
                            sleep(3*1000);
                            if (err) throw err;
                            else {
                              console.log('queue item number', data);
                              sleep(10*1000);
                              getJobInfo(currSlno);
                            }
                          });
                        });
                      });
                    }
                  });
                }
              });
            }
          });
        })
      }
      else{
        console.log("error");
      }
    });
  });

}

function getJobInfo(currSlno){
  jenkins.job.get('ITQA_FT_UFT_SAP', function(err, data) {
    if (err) throw err;
    else {
      console.log('Last build run: ', data.lastBuild.number);
      getBuildInfo(data.lastBuild.number, currSlno);
    }
  });
}

function getBuildInfo(buildNumber, currSlno){
  jenkins.build.get('ITQA_FT_UFT_SAP', buildNumber, function(err, data) {
    if (err) throw err;
    else {
      console.log('A build is currently Running: ', data.building);
      if (data.building == true) {
        sleep(5000);
        getBuildInfo(buildNumber, currSlno);
      }
      else {
        updateExec2(currSlno);
      }
    }
  });
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
