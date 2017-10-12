var sapApp = angular.module('sapApp', ['ngRoute', 'ngMaterial', 'ngSanitize'] );

sapApp.directive('fileModel', ['$parse', function ($parse) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var model = $parse(attrs.fileModel);
      var modelSetter = model.assign;

      element.bind('change', function(){
        scope.$apply(function(){
          modelSetter(scope, element[0].files[0]);
        });
      });
    }
  };
}]);

sapApp.controller('SapCtrl', ['$scope', '$timeout', '$mdSidenav', '$log', '$http', '$window', '$location', function($scope, $timeout, $mdSidenav, $log, $http, $window, $location){
  $scope.done = false;  //Variable to display completion of execution
  $scope.uploading = false;    //Variable to verify if the file has been uploaded or not
  $scope.scen = [];   //Variable to store list of selected scenarios
  $scope.loading = [];    //Variable for spinner gif
  $scope.id = [];
  $scope.sl = 0;
  $scope.buildUpdates = [];   //Variable to staore the updates
  $scope.buildUpdates[1] = "File yet to be uploaded";
  var ins;
  var insid;
  var sl = 1;
  $scope.testData = [
    {sno: sl}
  ];
  //Get request for fetching scenarios
  $http({
    method: 'GET',
    url: '/getScenarios',
  })
  .then(function(response){
    console.log(response.data);
    $scope.scenarios=response.data;
  });

  //Get request for fetching latest build response
  $scope.jbfunc = function(){
    $http({
      method: 'GET',
      url: '/jobBuild/' + $scope.lb,
    })
    .then(function(res){
      console.log("Latest Build Run Status: " + res.data);
      if (res.data == false) {
        $scope.loading[0] = false;
        $scope.buildUpdates[ins] = "Script Execution Completed!"
        $scope.loading[ins] = false;
        if (ins != 0) {
          $http({
              method: 'POST',
              url: '/updateExec/' + insid
            })
            .then(function(response){
              console.log("Updated execution to 2")
              console.log(response.data);
            });
        }
        console.log("Previous ins value: " + ins);
        console.log("Previous insid value: " + insid);
        ins++;
        insid++;
        console.log("Current ins value: " + ins);
        console.log("Current insid value: " + insid);
        if (ins <= $scope.testData.length) {
          $scope.jenkinBuild();
        }
        else {
          console.log("Done! Your request is completed!");
          $scope.done = true;
        }
      }
      else {
        $window.setTimeout(function() { $scope.jbfunc();}, 20000);
      }
    });
  }


  //Get request for fetching Latest build number
  $scope.jfunc = function(){

    $http({
      method: 'GET',
      url: '/jobInfo',
    })
    .then(function(res){
      console.log("Latest Build Run: " + res.data);
      $scope.lb=res.data;
      $window.setTimeout(function() { $scope.jbfunc();}, 5000);
    });
  }

  $scope.myFile = [];//Storage for Test data files to be uploaded

  //Function to upload and build the respective file
  $scope.jenkinBuild = function(){
    $scope.buildUpdates[ins] = "File Upload In Progress";
    $scope.loading[ins] = true;
    $http({
      method: 'POST',
      url: '/updateExecution/' + insid
    })
    .then(function(response){
      console.log("Updated execution to 1")
      console.log(response.data);
    });
    console.log($scope.myFile[ins]);
    var file = $scope.myFile[ins];
    var uploadUrl = "/multer";
    var fd = new FormData();
    fd.append('file', file);

    $http({
      method: 'POST',
      url: uploadUrl,
      data: fd,
      transformRequest: angular.identity,
      headers: {'Content-Type': undefined}
    })
    .then(function(response){
      $scope.buildUpdates[ins] = "File Uploaded! Script execution In Progress";
      console.log("Queue item number: " + response.data);
      $scope.jfunc();
    });
  };

  $scope.insData = [
    {scenarios: null, testdatafile: null, sl: null}
  ];

  //Function to add rows
  $scope.addData = function(){
    var person = {
      sno: sl+1
    };
    sl = person.sno;
    $scope.buildUpdates[sl] = "File yet to be uploaded";
    $scope.testData.push(person);
  }

  $scope.checkExec = function(){
    console.log(insid);
    if (insid != 1) {
      var previd = insid - 1;
      console.log("Previous insid: " + previd);
      $http({
        method: 'GET',
        url: '/excecValue/' + previd
      })
      .then(function(response){
        console.log("Previous execution value: " + response.data[0].execution)
        if (response.data[0].execution == 2) {
          ins--;
          insid--;
          $scope.jfunc();
        }
        else {
          $window.setTimeout(function() { $scope.checkExec();}, 10000);
        }
      });
    }
    else {
      console.log("ins value: " + ins);
      console.log("insid value: " + insid);
      ins--;
      insid--;
      console.log("ins value: " + ins);
      console.log("insid value: " + insid);
      $scope.jfunc();
    }
  }

  $scope.ins = function(){
    for (var j = 1; j <= $scope.testData.length; j++) {
      if($scope.scen[j] == undefined){
        $window.alert("Scenario not selected!");
        return;
      }
      if ($scope.myFile[j] == undefined) {
        $window.alert("File not selected!");
        return;
      }
    };
    $scope.uploading = true;
    $scope.loading[0] = true;

    for (var p = 1; p <= $scope.testData.length; p++) {
      var data = {
        scenarios: $scope.scen[p],
        testdatafile: $scope.myFile[p].name,
        sl: p
      };
      $scope.insData.push(data);
    }
    $http({
      method: 'POST',
      url: '/insert',
      data: $scope.insData
    })
    .then(function(response){
      console.log("Data Inserted");
      console.log("Insert Id: " + response.data);
      insid = response.data;
      $http({
        method: 'GET',
        url: '/sl/' + insid
      })
      .then(function(res){
        console.log("sl value for the first insid: " + res.data[0].sl);
        ins = res.data[0].sl;
      });
      $window.setTimeout(function() { $scope.checkExec();}, 3000);

    });
  }
}]);
