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
  $scope.uploaded=true;

  $http({
    method: 'GET',
    url: '/getScenarios',
  })
  .then(function(response){
    console.log(response.data);
    $scope.scenarios=response.data;
  });

  $scope.myFile = [];
  $scope.uploadFile = function(i){
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
      console.log(response.data);
      $scope.uploaded=false;
      //$scope.i = $scope.i + 1;
    });
  };


  $scope.jenkinBuild = function(){
    $http({
      method: 'GET',
      url: '/buildJenkin',
    })
    .then(function(response){
      console.log(response.data);
      console.log("Building");
    });
  };

  var sl = 1;
  $scope.testData = [
    {sno: sl}
  ]
  $scope.addData = function(){
    var person = {
      sno: sl+1
    };
    sl = person.sno;
    $scope.testData.push(person);
  }

}]);