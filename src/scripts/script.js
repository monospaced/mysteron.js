/*global move: true*/

var mysteron = (function () {

  'use strict';

  var audio,
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
      tweaking = false,
      hasTouch = 'ontouchstart' in window || 'createTouch' in document,
      eventStart = hasTouch ? 'touchstart' : 'mousedown',
      eventMove = hasTouch ? 'touchmove' : 'mousemove',
      eventEnd = hasTouch ? 'touchend' : 'mouseup',
      ampTracker,
      pitchTracker,
      controls,
      toggle;

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
      controls = doc.getElementById('controls');
      toggle = doc.getElementById('toggle');

      nodes.volume = audio.createGainNode();
      nodes.volume.gain.value = 0;

      mysteron.connect();

      toggle.addEventListener('click', mysteron.flip, false);

      mysteron.tweak();

      mysteron.track();

      touchpad.addEventListener(eventStart, mysteron.start, false);

      if (hasTouch) {
        doc.body.addEventListener('touchmove', function(e){
          if (e.target.tagName !== 'INPUT') {
            e.preventDefault();
          }
        });
      }

      controls.addEventListener(eventStart, function(e){
        e.stopPropagation();
      }, false);

      toggle.addEventListener(eventStart, function(e){
        e.stopPropagation();
      }, false);

    },

    connect: function(){

      osc.connect(nodes.volume);
      nodes.volume.connect(audio.destination);

    },

    flip: function(e){

      e.preventDefault();

      var opacity = tweaking ? 0 : 0.8;

      move(controls)
        .set('visibility', 'visible')
        .set('opacity', opacity)
        .duration('0.25s')
        .end(function(){
          if (opacity === 0) {
            controls.setAttribute('style', '');
          }
          tweaking = !tweaking;
      });

    },

    tweak: function(){

      var doc = document,
          ampRateControl = doc.getElementById('ampRate'),
          ampDecayControl = doc.getElementById('ampDecay'),
          pitchRateControl = doc.getElementById('pitchRate'),
          oscControl = doc.getElementById('oscControl');

      ampRateControl.value = ampRate*100;
      ampDecayControl.value = ampDecay*100;
      pitchRateControl.value = pitchRate*100;

      ampRateControl.addEventListener('change', function(e){
          ampRate = this.value/100;
      });

      ampDecayControl.addEventListener('change', function(e){
          ampDecay = this.value/100;
      });

      pitchRateControl.addEventListener('change', function(e){
          pitchRate = this.value/100;
      });

      oscControl.addEventListener('change', function(e){
        if (e.target.checked) {
          osc.disconnect();
          // support both integer and string oscillator types
          try {
            // iOS still using old integers
            osc.type = e.target.value;
            // but Chrome will throw an error
          } catch(error){
            // so use new strings from id attribute
            osc.type = e.target.id;
          }
          mysteron.connect();
        }
      });

    },

    track: function(){

      var e = {},
          doc = document;

      ampTracker = doc.getElementById('amp');
      pitchTracker = doc.getElementById('pitch');

      e.pageY = ampTracker.offsetTop;
      e.pageX = ampTracker.offsetLeft;

      mysteron.start(e);

      setTimeout(function(){
        mysteron.stop();
      }, 200);

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

      osc.noteOn(0); // iOS 6 needs noteOn to be in a user input event to unmute audio

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
