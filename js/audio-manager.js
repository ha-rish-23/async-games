// Minimal AudioManager using Web Audio API
(function(window){
  class AudioManager{
    constructor(){
      try{this.ctx = new (window.AudioContext||window.webkitAudioContext)();}
      catch(e){this.ctx = null}
      this.musicGain = null;
      this.musicPlaying = false;
      this.musicInterval = null;
    }

    _playOscillator(freq, duration=0.12, type='sine', gain=0.08){
      if(!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g); g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + duration);
    }

    _playNote(freq, duration, type='square', gain=0.04, destination=null){
      if(!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      o.connect(g);
      if(destination) g.connect(destination);
      else g.connect(this.ctx.destination);
      o.start(this.ctx.currentTime);
      o.stop(this.ctx.currentTime + duration);
    }

    _playSequence(notes){
      if(!this.ctx) return;
      notes.forEach((note, i) => {
        setTimeout(() => {
          this._playOscillator(note.freq, note.dur || 0.1, note.type || 'sine', note.gain || 0.08);
        }, i * 100);
      });
    }

    click(){ this._playOscillator(880,0.06,'square',0.05); }
    blip(){ this._playOscillator(600,0.12,'sawtooth',0.06); }
    jump(){ this._playOscillator(440,0.08,'square',0.07); }
    land(){ this._playOscillator(220,0.05,'sine',0.04); }
    coin(){ this._playSequence([{freq:523,dur:0.08},{freq:659,dur:0.08},{freq:784,dur:0.12}]); }
    death(){ 
      this._playSequence([
        {freq:440,dur:0.1,type:'sawtooth',gain:0.12},
        {freq:330,dur:0.1,type:'sawtooth',gain:0.12},
        {freq:220,dur:0.3,type:'sine',gain:0.15}
      ]); 
    }
    explosion(){
      // Loud blast sound
      if(!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 80;
      g.gain.setValueAtTime(0.2, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + 0.4);
      // Add high frequency crack
      setTimeout(() => {
        this._playOscillator(1200, 0.05, 'square', 0.15);
      }, 10);
    }
    win(){ 
      this._playSequence([
        {freq:523,dur:0.1},{freq:659,dur:0.1},{freq:784,dur:0.1},
        {freq:1047,dur:0.25,gain:0.12}
      ]); 
    }
    levelComplete(){
      this._playSequence([
        {freq:659,dur:0.08},{freq:784,dur:0.08},{freq:880,dur:0.12,gain:0.1}
      ]);
    }

    startMusic(){
      if(!this.ctx || this.musicPlaying) return;
      
      // Resume audio context if suspended (browser autoplay policy)
      if(this.ctx.state === 'suspended'){
        this.ctx.resume();
      }
      
      this.musicPlaying = true;
      
      // Upbeat arcade melody pattern (repeats every 8 beats)
      const melody = [
        // Bar 1
        {note: 523, dur: 0.15}, // C5
        {note: 659, dur: 0.15}, // E5
        {note: 784, dur: 0.15}, // G5
        {note: 659, dur: 0.15}, // E5
        // Bar 2
        {note: 698, dur: 0.15}, // F5
        {note: 784, dur: 0.15}, // G5
        {note: 880, dur: 0.3},  // A5
        // Bar 3
        {note: 784, dur: 0.15}, // G5
        {note: 659, dur: 0.15}, // E5
        {note: 587, dur: 0.15}, // D5
        {note: 523, dur: 0.15}, // C5
        // Bar 4
        {note: 587, dur: 0.15}, // D5
        {note: 659, dur: 0.15}, // E5
        {note: 523, dur: 0.3}   // C5
      ];

      // Bass line
      const bass = [
        262, 262, 330, 330,  // C4, C4, E4, E4
        349, 349, 392, 392,  // F4, F4, G4, G4
        330, 330, 294, 294,  // E4, E4, D4, D4
        262, 262, 262, 262   // C4, C4, C4, C4
      ];

      let beatIndex = 0;
      const bpm = 140;
      const beatDuration = (60 / bpm) * 1000;

      this.musicInterval = setInterval(() => {
        if(!this.musicPlaying) return;
        
        const m = melody[beatIndex % melody.length];
        const b = bass[beatIndex % bass.length];
        
        // Play melody
        this._playNote(m.note, m.dur, 'square', 0.03);
        
        // Play bass (every other beat)
        if(beatIndex % 2 === 0){
          this._playNote(b, 0.2, 'sine', 0.04);
        }
        
        beatIndex++;
      }, beatDuration);
    }

    stopMusic(){
      this.musicPlaying = false;
      if(this.musicInterval){
        clearInterval(this.musicInterval);
        this.musicInterval = null;
      }
    }

    startMusic(){
      if(!this.ctx || this.musicPlaying) return;
      
      // Resume audio context if suspended (browser autoplay policy)
      if(this.ctx.state === 'suspended'){
        this.ctx.resume();
      }
      
      this.musicPlaying = true;
      
      // Upbeat arcade melody pattern (repeats every 8 beats)
      const melody = [
        // Bar 1
        {note: 523, dur: 0.15}, // C5
        {note: 659, dur: 0.15}, // E5
        {note: 784, dur: 0.15}, // G5
        {note: 659, dur: 0.15}, // E5
        // Bar 2
        {note: 698, dur: 0.15}, // F5
        {note: 784, dur: 0.15}, // G5
        {note: 880, dur: 0.3},  // A5
        // Bar 3
        {note: 784, dur: 0.15}, // G5
        {note: 659, dur: 0.15}, // E5
        {note: 587, dur: 0.15}, // D5
        {note: 523, dur: 0.15}, // C5
        // Bar 4
        {note: 587, dur: 0.15}, // D5
        {note: 659, dur: 0.15}, // E5
        {note: 523, dur: 0.3}   // C5
      ];

      // Bass line
      const bass = [
        262, 262, 330, 330,  // C4, C4, E4, E4
        349, 349, 392, 392,  // F4, F4, G4, G4
        330, 330, 294, 294,  // E4, E4, D4, D4
        262, 262, 262, 262   // C4, C4, C4, C4
      ];

      let beatIndex = 0;
      const bpm = 140;
      const beatDuration = (60 / bpm) * 1000;

      this.musicInterval = setInterval(() => {
        if(!this.musicPlaying) return;
        
        const m = melody[beatIndex % melody.length];
        const b = bass[beatIndex % bass.length];
        
        // Play melody
        this._playNote(m.note, m.dur, 'square', 0.03);
        
        // Play bass (every other beat)
        if(beatIndex % 2 === 0){
          this._playNote(b, 0.2, 'sine', 0.04);
        }
        
        beatIndex++;
      }, beatDuration);
    }

    stopMusic(){
      this.musicPlaying = false;
      if(this.musicInterval){
        clearInterval(this.musicInterval);
        this.musicInterval = null;
      }
    }
  }

  window.AudioManager = AudioManager;
})(window);
