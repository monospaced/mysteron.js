/*global move: true*/

var mysteron = (function () {

  'use strict';

  var audio,
      canvas,
      osc,
      touchpad,
      nodes = {},
      ampRate = 0.1,
      ampDecay = 0.4,
      pitchRate = 0.2,
      maxGain = 0.2,
      minFreq = 16.35, // C0
      maxFreq = 4186.01, // C8
      mouseDown = 0,
      hasTouch = 'ontouchstart' in window || 'createTouch' in document,
      eventStart = hasTouch ? 'touchstart' : 'mousedown',
      eventMove = hasTouch ? 'touchmove' : 'mousemove',
      eventEnd = hasTouch ? 'touchend' : 'mouseup',
      ampTracker,
      pitchTracker;

  return {

    init: function () {

      var doc = document;

      try {
        audio = new window.webkitAudioContext() || window.AudioContext();
        osc = audio.createOscillator();
      } catch (e) {
        window.alert('No web audio oscillator support in this browser');
      }

      touchpad = doc.getElementsByTagName('body')[0];

      nodes.volume = audio.createGainNode();
      nodes.volume.gain.value = 0;

      osc.connect(nodes.volume);
      nodes.volume.connect(audio.destination);

      osc.noteOn(0);

      ampTracker = document.getElementById('amp');
      pitchTracker = document.getElementById('pitch');

      var e = {};

      e.pageY = ampTracker.offsetTop;
      e.pageX = ampTracker.offsetLeft;

      mysteron.start(e);

      setTimeout(function(){
        mysteron.stop();
      }, 200);

      touchpad.addEventListener(eventStart, mysteron.start, false);

      if (hasTouch) {
        doc.body.addEventListener('touchmove', function(e){
          e.preventDefault();
        });
      }

    },

    scale: function(value, oldMin, oldMax, newMin, newMax){
      return (value / ((oldMax - oldMin) / (newMax - newMin))) + newMin;
    },

    play: function(e){

      var now = audio.currentTime,
          amp = nodes.volume.gain,
          pitch = osc.frequency,
          pageX = e.pageX,
          pageY = e.pageY,
          x = mysteron.scale(pageX, 0, window.innerWidth, 0, maxGain),
          y = mysteron.scale(pageY, 0, window.innerHeight, minFreq, maxFreq);

      amp.cancelScheduledValues(now);
      amp.setValueAtTime(amp.value, now);
      amp.linearRampToValueAtTime(x, now + ampRate);

      move(ampTracker)
        .set('top', pageY)
        .duration(0)
        .end(function(){
          move(ampTracker)
            .set('left', pageX)
            .duration(ampRate * 1000)
            .end();
      });

      pitch.cancelScheduledValues(now);
      pitch.setValueAtTime(pitch.value, now);
      pitch.linearRampToValueAtTime(y, now + pitchRate);

      pitchTracker.style.display = 'block';

      move(pitchTracker)
        .set('left', pageX)
        .duration(0)
        .end(function(){
          move(pitchTracker)
            .set('top', pageY)
            .duration(pitchRate * 1000)
            .end();
      });

    },

    start: function(e){

      ++mouseDown;

      mysteron.play(e);

      touchpad.addEventListener(eventMove, mysteron.move, false);
      touchpad.addEventListener(eventEnd, mysteron.stop, false);

      if (hasTouch) {
        touchpad.addEventListener('touchcancel', mysteron.stop, false);
      }

    },

    move: function(e){

      if (mouseDown || hasTouch) {
        mysteron.play(e);
      }

    },

    stop: function(){

      --mouseDown;

      var now = audio.currentTime,
          amp = nodes.volume.gain;

      amp.cancelScheduledValues(now);
      amp.setValueAtTime(amp.value, now);
      amp.linearRampToValueAtTime(0, now + ampDecay);

      move(ampTracker)
        .set('left', 0)
        .duration(ampDecay * 1000)
        .end();

      pitchTracker.style.display = 'none';

      touchpad.removeEventListener(eventMove, mysteron.move, false);
      touchpad.removeEventListener(eventEnd, mysteron.stop, false);

      if (hasTouch) {
        touchpad.removeEventListener('touchcancel', mysteron.stop, false);
      }

    }

  };

}());

window.addEventListener('DOMContentLoaded', mysteron.init, true);
