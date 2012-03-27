function init_fileupload(inputId) {
  document.getElementById(inputId).addEventListener('change', handleFileSelect, false);
}

function handleFileSelect(event) {
  console.log(event);

  var files = event.target.files;
  var file = files[0];

  if (file.type.match('image.*')) {
    var reader = new FileReader();

    reader.onload = (function(theFile) {
      return function(e) {
        setImage(e.target.result);
      };
    })(file);

    reader.readAsDataURL(file);
    // reader.readAsBinaryString(file);
  }
}
