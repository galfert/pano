var progress = null;

function init_fileupload(inputId) {
  document.getElementById(inputId).addEventListener('change', handleFileSelect, false);
  progress = document.querySelector('.percent');

  var dropZone = document.getElementById('canvas');
  dropZone.addEventListener('dragover', handleDragOver, false);
  dropZone.addEventListener('drop', handleFileSelect, false);
}

function setProgress(percent) {
  progress.style.width = percent + '%';
  progress.textContent = percent + '%';
}

function updateProgress(event) {
  if (event.lengthComputable) {
    var percentLoaded = Math.round((event.loaded / event.total) * 100);
    if (percentLoaded < 100) {
      setProgress(percentLoaded);
    }
  }
}

function handleFileSelect(event) {
  event.stopPropagation();
  event.preventDefault();

  setProgress(0);

  var file = null;
  switch(event.type) {
    case "drop":
      file = event.dataTransfer.files[0];
      break;
    case "change":
      file = event.target.files[0];
      break;
  }

  if (file != undefined && file.type.match('image.*')) {
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

function handleDragOver(event) {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
}
