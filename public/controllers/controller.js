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

sapApp.directive('tooltip', function(){
    return {
        restrict: 'A',
        link: function(scope, element, attrs){
            $(element).hover(function(){
                // on mouseenter
                $(element).tooltip('show');
            }, function(){
                // on mouseleave
                $(element).tooltip('hide');
            });
        }
    };
});

sapApp.config(['$routeProvider', function ($routeProvider){
  $routeProvider
  .when('/start', {
    templateUrl: 'views/execute.html'
  })
  .when('/status', {
    templateUrl: 'views/status.html'
  })
  .when('/help', {
    templateUrl: 'views/help.html'
  })
  .otherwise({
      redirectTo: '/start'
  });
}]);

sapApp.controller('SapCtrl', ['$scope', '$timeout', '$mdSidenav', '$log', '$http', '$window', '$location', function($scope, $timeout, $mdSidenav, $log, $http, $window, $location){
  $scope.done = false;  //Variable to display completion of execution
  $scope.uploading = false;    //Variable to verify if the file has been uploaded or not
  $scope.upload = false;
  $scope.adding = true;
  $scope.scen = [];   //Variable to store list of selected scenarios
  $scope.loading = [];    //Variable for spinner gif
  $scope.myFile = [];   //Variable to store Test data files
  $scope.userName;
  $scope.remarks = [];
  $scope.getData;
  var inslenid;
  var previnslenid;
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


//Get request for fetching whole db details
$scope.getData = function(){
  $http({
    method: 'GET',
    url: '/getData',
  })
  .then(function(response){
    $scope.listOfData = response.data;
    for (var i = 0; i < $scope.listOfData.length; i++) {
      if ($scope.listOfData[i].execution == 0) {
        $scope.listOfData[i].execution = "In Queue";
      }
      else if ($scope.listOfData[i].execution == 1) {
        $scope.listOfData[i].execution = "In Progress";
        $scope.loading[i+1] = true;
      }
      else {
        $scope.listOfData[i].execution = "Completed";
        $scope.loading[i+1] = false;
      }
      if ($scope.listOfData[i].result == "FAILURE") {
        $scope.remarks[i+1] = "Check Mailed Reports for Details!"
      }
      else {
        $scope.remarks[i+1] = "NA"
      }
    }
    $timeout(function() { $scope.getData();}, 3000);
  });
}

//Function call to get whole db details
$scope.getData();

  $scope.insData = [
    {username: null, scenarios: null, testdatafile: null}
  ];

  $scope.insLenData = [
    {testdatalength: null}
  ]
  //Function to add rows
  $scope.addData = function(){
    var person = {
      sno: sl+1
    };
    sl = person.sno;
    $scope.testData.push(person);
    console.log($scope.testData);
    $scope.adding = false;
  }

  $scope.deleteData = function(id){
    if (sl != 1) {
      console.log($scope.testData);
      $scope.testData.splice(id-1, 1);
      $scope.myFile.splice(id, 1);
      $scope.scen.splice(id, 1);
      console.log($scope.testData);
      for (var i = id-1; i < $scope.testData.length; i++) {
        console.log("Testdata that has to be updated: " + $scope.testData[i].sno);
        $scope.testData[i].sno = i+1;
      }
      console.log($scope.testData.length);
      console.log($scope.testData);
      sl--;
    }
    else {
      $window.alert("Cannot delete the only row!");
    }
  }

  //function to insert the details into db
  $scope.ins = function(){
    if ($scope.userName == undefined) {
        $window.alert("Username Not entered");
        return;
    }
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
    $scope.upload = true;
    $scope.loading[0] = true;

    $scope.insertTestData();
  }

  //Function to insert Test Data Length into insertion db
  $scope.insertTestData = function(){
    console.log("Length to be inserted: " +  $scope.testData.length);
    var info = {
      testdatalength: $scope.testData.length
    }
    $scope.insLenData.push(info);
    $http({
      method: 'POST',
      url: '/insertLength',
      data: $scope.insLenData
    })
    .then(function(response){
      $scope.insLenData.pop();
      console.log("Length Inserted with id: " + response.data);
      inslenid = response.data;
      previnslenid = inslenid-1;
      $scope.getLength();
    });
  }

  //Function to get the length of previously inserted Test Data Length
  $scope.getLength = function(){
    if (inslenid != 1) {
      console.log("Previous inslen: " + previnslenid);
      $http({
        method: 'GET',
        url: '/getLength/' + previnslenid,
      })
      .then(function(response){
        console.log("Previous testdatalength:" + response.data);
        if (response.data == 0) {
            $scope.insertFile();  //Function call to insert files ensuring insertion of previous data into ssa db
        }
        else {
            $timeout(function() { $scope.getLength();}, 3000);  //Recursively calling the function ensuring queuing of data
        }
      });
    }
    else {
      $scope.insertFile();  //Function to insert data for the first slno
    }
  }

  //Function to insert Test Data Files
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
          username: $scope.userName,
          scenarios: $scope.scen[insertFile],
          testdatafile: response.data,
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
          $scope.updateLen();
        });
      });
    }
    else {
      console.log("All your data has been inserted");
      $scope.done = true;
      $scope.loading[0] = false;
      $scope.upload = false;
    }
  }


  //Function to update the insertion db Test Data Length
  $scope.updateLen = function(){
    $http({
      method: 'POST',
      url: '/updateLen/' + inslenid
    })
    .then(function(response){
      console.log("Updated");
      $scope.insertFile();
    });
  }

  //Function to get the status of the user request
  $scope.getStatus = function(){
    $location.path('/status');
  }

  $scope.back = function(){
    $location.path("/start");
  }
}]);
