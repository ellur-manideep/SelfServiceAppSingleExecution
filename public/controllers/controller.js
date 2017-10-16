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
  $scope.myFile = [];   //Variable to store Test data files
  var ins;    //variable to store sl value from database
  var insid;    //variable to store insertid value from database
  var insertFile = 0;
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

  //function to insert the details into db and getting the insert id and sl value
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

    $scope.insertFile();

  }

  $scope.insertFile = function(){
    insertFile++;
    console.log("insertFile Value: " + insertFile);
    if (insertFile <= $scope.testData.length) {
      console.log($scope.myFile[insertFile]);
      var file = $scope.myFile[insertFile];
      var uploadUrl = "/multer";
      var fd = new FormData();
      fd.append('file', file);
      //Request for uploading the file
      $http({
        method: 'POST',
        url: uploadUrl,
        data: fd,
        transformRequest: angular.identity,
        headers: {'Content-Type': undefined}
      })
      .then(function(response){
        console.log(response.data);
        var data = {
          scenarios: $scope.scen[insertFile],
          testdatafile: response.data,
          sl: insertFile
        };
        $scope.insData.push(data);
        console.log("Data after pushing: " + $scope.insData);
        $http({
          method: 'POST',
          url: '/insert',
          data: $scope.insData
        })
        .then(function(response){
          console.log("Data Inserted");
          $scope.insData.pop();
          console.log("Data after popping: " + $scope.insData);
          $scope.insertFile();
        });
      });
    }
    else {
      console.log("All your data has been inserted");
    }
  }
}]);
