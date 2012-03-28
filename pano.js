var FPS = 30;
var DEG2RAD = Math.PI/180.0;
var widthToHeight = 4 / 3;

//Canvas to which to draw the panorama
var pano_canvas = null;
var target = null;
var source = null;

//Event state
var mouseIsDown = false;
var mouseDownPosLastX = 0;
var mouseDownPosLastY = 0;
var displayInfo = false;
var highquality = true;

//Camera state
var base_heading = 0;
var cam_heading = base_heading;
var cam_pitch = 90.0;
var cam_fov = 90;

//Load image
var img_buffer = null;
var img = new Image();
img.onload = imageLoaded;

function init_pano(canvasId, image){
  //get canvas and set up callbacks
  pano_canvas = document.getElementById(canvasId);
  pano_canvas.onmousedown = mouseDown;
  window.onmousemove = mouseMove;
  window.onmouseup = mouseUp;
  window.onmousewheel = mouseScroll;
  window.onkeydown = keyDown;

  window.addEventListener('resize', resizeCanvas, false);
  window.addEventListener('orientationchange', resizeCanvas, false);

  img.src = image;
}

function resizeCanvas() {
  var container = document.getElementById('container');
  var newWidth = window.innerWidth;
  var newHeight = window.innerHeight;
  var newWidthToHeight = newWidth / newHeight;

  if (newWidthToHeight > widthToHeight) {
    newWidth = newHeight * widthToHeight;
    container.style.height = newHeight + 'px';
    container.style.width = newWidth + 'px';
  } else {
    newHeight = newWidth / widthToHeight;
    container.style.height = newHeight + 'px';
    container.style.width = newWidth + 'px';
  }

  container.style.marginTop = (-newHeight / 2) + 'px';
  container.style.marginLeft = (-newWidth / 2) + 'px';

  pano_canvas.width = newWidth;
  pano_canvas.height = newHeight;

  target = null;
  draw();
}

function setImage(imageData) {
  img.src = imageData;
}

function imageLoaded(){
  var buffer = document.createElement("canvas");
  var buffer_ctx = buffer.getContext("2d");

  //set buffer size
  buffer.width = img.width;
  buffer.height = img.height;

  //draw image
  buffer_ctx.drawImage(img, 0, 0);

  //get pixels
  source = buffer_ctx.getImageData(0, 0, buffer.width, buffer.height);

  resizeCanvas();
}

function mouseDown(e){
  mouseIsDown = true;
  mouseDownPosLastX = e.clientX;
  mouseDownPosLastY = e.clientY;
}

function mouseMove(e){
  if(mouseIsDown == true){
    cam_heading -= (e.clientX-mouseDownPosLastX);
    cam_pitch += 0.5*(e.clientY-mouseDownPosLastY);
    cam_pitch = Math.min(120, Math.max(60, cam_pitch));
    mouseDownPosLastX = e.clientX;
    mouseDownPosLastY = e.clientY;
    draw();
  }
}

function mouseUp(e){
  mouseIsDown = false;
  draw();
}

function mouseScroll(e){
  cam_fov+=e.wheelDelta/120;
  cam_fov=Math.min(90,Math.max(30, cam_fov));
  draw();
}

function keyDown(e) {
  if(e.keyCode==73) { //i==73 Info
    displayInfo = !displayInfo;
    draw();
  }
}

function drawLine(pixels, scanwidth, xofs, x0, y0, x1, y1) {
  var dx = Math.abs(x1 - x0);
  var dy = -Math.abs(y1 - y0);
  var sx = (x0 < x1) ? 1 : -1;
  var sy = (y0 < y1) ? 1 : -1;
  var err1 = dx + dy;
  var err2;

  var x = x0;
  var y = y0;

  while(true) {
    var offset=4*(y * scanwidth + x + xofs);
    pixels[offset]   = 0xff;
    pixels[offset+1] = 0x00;
    pixels[offset+2] = 0x00;
    if (x == x1 && y == y1)
      break;
    err2 = 2*err1;
    if(err2 > dy) {
      err1 += dy;
      x += sx;
    }
    if(err2 < dx) {
      err1 += dx;
      y += sy;
    }
  }
}

draw_count = 0;
function drawQuad(src, sscanwidth, sofs, tgt, tscanwidth, tofs,
                  sxl0, syl0, sxl1, syl1, sxr0, syr0, sxr1, syr1,
                  tx0, ty0, dtx, dty) {
  var dxl = sxl1 - sxl0;
  var dyl = syl1 - syl0;

  var dxr = sxr1 - sxr0;
  var dyr = syr1 - syr0;

  var xl = sxl0, yl = syl0, xr = sxr0, yr = syr0;

  var ty = Math.floor(ty0);
  for(var row = 0; row < dty; row++) {
    //if(ty > Math.floor(ty0) && ty < tyend - 1) continue;
    // Draw a line from xl to xr
    var ixl = Math.floor(xl), iyl = Math.floor(yl),
    ixr = Math.floor(xr), iyr = Math.floor(yr);
    var dx = Math.abs(ixr - ixl);
    var dy = -Math.abs(iyr - iyl);
    var dist = Math.sqrt(dx*dx + dy*dy);
    var sx = (ixl < ixr) ? 1 : -1;
    var sy = (iyl < iyr) ? 1 : -1;
    var err1 = dx + dy;
    var err2;

    var steps = (dx > -dy) ? dx : -dy;
    var tgt_step = dtx / steps;
    var tgt_frac = 0;
    var tgt_bla = 0;

    var x = ixl;
    var y = iyl;

    var tx = Math.floor(tx0);
    var txend = Math.floor(tx0 + dtx);
    var tgt_offset = 4*(ty * tscanwidth + tx + tofs);
    while(true) {
      tgt_frac += tgt_step;
      if(tgt_bla < tgt_frac)
        var src_offset=4*(y * sscanwidth +
                          (((x + sofs) % sscanwidth) + sscanwidth) % sscanwidth);

      while(tx <= txend) {
        if (tgt_bla >= tgt_frac) break;
        tgt_bla++;
        // Draw pixel.
        tgt[tgt_offset]     = src[src_offset];
        tgt[tgt_offset+1]   = src[src_offset+1];
        tgt[tgt_offset+2]   = src[src_offset+2];
        draw_count++;
        tx++;
        tgt_offset += 4;
      }

      if (x == ixr && y == iyr)
        break;

      err2 = 2*err1;
      if(err2 > dy) {
        err1 += dy;
        x += sx;
      }
      if(err2 < dx) {
        err1 += dx;
        y += sy;
      }
    }

    xl = sxl0 + dxl * row / dty;
    yl = syl0 + dyl * row / dty;
    xr = sxr0 + dxr * row / dty;
    yr = syr0 + dyr * row / dty;
    ty++;
  }
}

function renderPanorama(canvas){
  if(canvas != null && source != null){
    var ctx         = canvas.getContext("2d");
    var src_width   = img.width;
    var src_height  = img.height;
    var dest_width  = canvas.width;
    var dest_height = canvas.height;

    //ctx.drawImage(img, 0, 0, img.width, img.height, dest_width, 0,
    //        dest_width, dest_height);

    //calculate camera plane
    var theta_fac = src_height/Math.PI;
    var phi_fac = src_width*0.5/Math.PI
    var ratioUp = 2.0*Math.tan(cam_fov*DEG2RAD/2.0);
    var ratioRight = ratioUp*1.;
    var camDirX = Math.sin(cam_pitch*DEG2RAD)*Math.sin(cam_heading*DEG2RAD);
    var camDirY = Math.cos(cam_pitch*DEG2RAD);
    var camDirZ = Math.sin(cam_pitch*DEG2RAD)*Math.cos(cam_heading*DEG2RAD);
    var camUpX = ratioUp*Math.sin((cam_pitch-90.0)*DEG2RAD)*Math.sin(cam_heading*DEG2RAD);
    var camUpY = ratioUp*Math.cos((cam_pitch-90.0)*DEG2RAD);
    var camUpZ = ratioUp*Math.sin((cam_pitch-90.0)*DEG2RAD)*Math.cos(cam_heading*DEG2RAD);
    var camRightX = ratioRight*Math.sin((cam_heading-90.0)*DEG2RAD);
    var camRightY = 0.0;
    var camRightZ = ratioRight*Math.cos((cam_heading-90.0)*DEG2RAD);
    var camPlaneOriginX = camDirX + 0.5*camUpX - 0.5*camRightX;
    var camPlaneOriginY = camDirY + 0.5*camUpY - 0.5*camRightY;
    var camPlaneOriginZ = camDirZ + 0.5*camUpZ - 0.5*camRightZ;

    var fx = 0.5, fy = 0.5;
    var rayX = camPlaneOriginX + fx*camRightX - fy*camUpX;
    var rayZ = camPlaneOriginZ + fx*camRightZ - fy*camUpZ;
    var x_shift=(Math.atan2(rayZ,rayX) + Math.PI) * phi_fac;

    var camDirX = 0.0;
    var camDirZ = Math.sin(cam_pitch*DEG2RAD);
    var camUpX = 0.0;
    var camUpZ = ratioUp*Math.sin((cam_pitch-90.0)*DEG2RAD);
    var camRightX = -ratioRight;
    var camRightZ = 0.0;
    var camPlaneOriginX = camDirX + 0.5*camUpX - 0.5*camRightX;
    var camPlaneOriginY = camDirY + 0.5*camUpY - 0.5*camRightY;
    var camPlaneOriginZ = camDirZ + 0.5*camUpZ - 0.5*camRightZ;

    //render image
    var i,j;
    var frac_fx = 1/dest_width;
    var frac_fy = 1/dest_height;
    var fx = 0;
    var fy = 0;
    var min_y = 0;
    var max_y = 0;
    var res = 8;
    var x_res = (dest_width - 1) / res, y_res = (dest_height - 1) / res;
    var line_x1 = new Array(res+1);
    var line_y1 = new Array(res+1);
    var line_x2 = new Array(res+1);
    var line_y2 = new Array(res+1);
    draw_count = 0;
    for(i=0; i<res+1; i++){
      var fy = i/res;
      var line_i = 0;

      for(j=0; j<res+1; j++){
        var fx = j/res;

        /* LOOKUP Tabellen für acos und atan2? */
        /* Bringen nix vllt nur horizontal mit shear */
        var rayX = camPlaneOriginX + fx*camRightX - fy*camUpX;
        var rayY = camPlaneOriginY + fx*camRightY - fy*camUpY;
        var rayZ = camPlaneOriginZ + fx*camRightZ - fy*camUpZ;
        var rayNorm = 1.0/Math.sqrt(rayX*rayX + rayY*rayY + rayZ*rayZ);

        var theta = Math.acos(rayY*rayNorm);
        var phi = Math.atan2(rayZ,rayX);
        var theta_i = theta_fac*theta;
        var phi_i = phi_fac*phi;

        var y = theta_i;
        var x = phi_i + x_shift;
        line_x1[line_i] = x;
        line_y1[line_i] = y;

        /*var offset=4*(Math.floor(y / src_height * dest_height) * dest_width * 2 +
                Math.floor(x / src_width * dest_width) + dest_width);

        pixels[offset]     = 0xff;
        pixels[offset+1]   = 0xff;
        pixels[offset+2]   = 0xff;*/
        line_i++;
      }

      if(i > 0) {
        for(var line_i=0; line_i < line_x1.length-1; line_i++) {
          drawQuad(source.data, src_width, 0,
                   target.data, dest_width, 0,
                   line_x2[line_i], line_y2[line_i],
                   line_x1[line_i], line_y1[line_i],
                   line_x2[line_i+1], line_y2[line_i+1],
                   line_x1[line_i+1], line_y1[line_i+1],
                   line_i * x_res, (i - 1) * y_res, x_res, y_res);
        }
      }
      var t = line_x1;
      line_x1 = line_x2;
      line_x2 = t;
      var t = line_y1;
      line_y1 = line_y2;
      line_y2 = t;
    }

    //upload image data
    ctx.putImageData(target, 0, 0);
  }
}

function drawRoundedRect(ctx, ox, oy, w, h, radius){
  ctx.beginPath();
  ctx.moveTo(ox + radius,oy);
  ctx.lineTo(ox + w - radius,oy);
  ctx.arc(ox +w-radius,oy+ radius, radius,-Math.PI/2,0, false);
  ctx.lineTo(ox + w,oy + h - radius);
  ctx.arc(ox +w-radius,oy + h - radius, radius,0,Math.PI/2, false);
  ctx.lineTo(ox + radius,oy + h);
  ctx.arc(ox + radius,oy + h - radius, radius,Math.PI/2,Math.PI, false);
  ctx.lineTo(ox,oy + radius);
  ctx.arc(ox + radius,oy + radius, radius,Math.PI,3*Math.PI/2, false);
  ctx.fill();
}

function draw(){
  if(pano_canvas != null && pano_canvas.getContext != null){
    var ctx = pano_canvas.getContext("2d");

    if(target == null) {
      //clear canvas
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fillRect(0, 0, pano_canvas.width, pano_canvas.height);

      ctx = pano_canvas.getContext("2d");
      target = ctx.getImageData(0, 0, pano_canvas.width, pano_canvas.height);
    }

    //render paromana direct
    var startTime = new Date();
    renderPanorama(pano_canvas);
    var endTime = new Date();

    //draw info text
    if(displayInfo == true){
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      drawRoundedRect(ctx, 20, pano_canvas.height-60-20, 180, 60, 7);

      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.font="10pt helvetica";
      ctx.fillText("Canvas = " +  pano_canvas.width + "x" + pano_canvas.height,30,pano_canvas.height-60);
      ctx.fillText("Image size = " + img.width + "x" + img.height,30,pano_canvas.height-45);
      ctx.fillText("FPS = " + ((endTime.getTime()-startTime.getTime())).toFixed(1),30,pano_canvas.height-30);
    }
  }
}
