var progress = null;

function init_fileupload(inputId) {
  document.getElementById(inputId).addEventListener('change', handleFileSelect, false);
  progress = document.querySelector('.percent');
}

function setProgress(percent) {
  progress.style.width = percent + '%';
  progress.textContent = percent + '%';
}

function updateProgress(event) {
  if (event.lengthComputable) {
    var percentLoaded = Math.rount((event.loaded / event.total) * 100);
    console.log(percentLoaded);
    if (percentLoaded < 100) {
      setProgress(percentLoaded);
    }
  }
}

function handleFileSelect(event) {
  console.log(event);
  setProgress(0);

  var file = event.target.files[0];

  if (file.type.match('image.*')) {
    var reader = new FileReader();

    reader.onprogress = updateProgress;

    reader.onloadstart = function(e) {
      document.getElementById('progress_bar').className = 'loading';
    };

    reader.onload = (function(theFile) {
      return function(e) {
        setProgress(100);
        setTimeout("document.getElementById('progress_bar').className='';", 2000);

        setImage(e.target.result);
      };
    })(file);

    reader.readAsDataURL(file);
    // reader.readAsBinaryString(file);
  }
}
