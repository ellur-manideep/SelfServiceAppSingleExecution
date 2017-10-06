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
  $scope.uploaded = false;    //Variable to verify if the file has been uploaded or not
  $scope.scen = [];   //Variable to store list of selected scenarios
  $scope.loading = [];    //Variable for spinner gif
  $scope.buildUpdates = [];   //Variable to staore the updates
  $scope.buildUpdates[1] = "File yet to be uploaded";
  var i = 0;
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
      console.log(res.data);
      if (res.data == false) {
        $scope.buildUpdates[i] = "Script Execution Completed!"
        $scope.loading[i] = false;
        i = i + 1;
        if(i<=$scope.testData.length){
          $scope.jenkinBuild();
        }
        else {
            console.log("done");
            $scope.done=true;
        }
      }
      else {
        $window.setTimeout(function() { $scope.jbfunc();}, 20000);
      }
    });
  }

  //Get request for fetching Latest build number
  $scope.jfunc = function(){
    $scope.uploaded = true;
    if (i==0) {
      $scope.loading[i] = true;
    }
    $http({
      method: 'GET',
      url: '/jobInfo',
    })
    .then(function(res){
      console.log(res.data);
      $scope.lb=res.data;
      $window.setTimeout(function() { $scope.jbfunc();}, 5000);
    });
  }


  $scope.myFile = [];//Storage for Test data files to be uploaded

  //Function to upload and build the respective file
  $scope.jenkinBuild = function(){
    $scope.buildUpdates[i] = "File Upload In Progress";
    $scope.loading[i] = true;
    console.log($scope.testData.length);
    console.log($scope.myFile[i]);
    var file = $scope.myFile[i];
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
      $scope.buildUpdates[i] = "File Uploaded! Script execution In Progress";
      console.log(response.data);
      $scope.jfunc();
    });
  };

  //Function to add rows
  $scope.addData = function(){
    var person = {
      sno: sl+1
    };
    sl = person.sno;
    $scope.buildUpdates[sl] = "File yet to be uploaded";
    $scope.testData.push(person);
  }

}]);
