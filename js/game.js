var AlienFlock = function AlienFlock() {
  this.invulnrable = true;
  this.dx = 10; this.dy = 0;
  this.hit = 1; this.lastHit = 0;
  this.speed = 10;

  this.draw = function() {};

  this.die = function() {
    if(Game.board.nextLevel()) {
      Game.loadBoard(new GameBoard(Game.board.nextLevel())); 
    } else {
      Game.callbacks['win']();
    }
  }

  this.step = function(dt) { 
    if(this.hit && this.hit != this.lastHit) {
      this.lastHit = this.hit;
      this.dy = this.speed;
    } else {
      this.dy=0;
    }
    this.dx = this.speed * this.hit;

    var max = {}, cnt = 0;
    this.board.iterate(function() {
      if(this instanceof Alien)  {
        if(!max[this.x] || this.y > max[this.x]) {
          max[this.x] = this.y; 
        }
        cnt++;
      } 
    });

    if(cnt == 0) { this.die(); } 

    this.max_y = max;
    return true;
  };

}



var Alien = function Alien(opts) {
  this.flock = opts['flock'];
  this.frame = 0;
  this.mx = 0;
}

Alien.prototype.draw = function(canvas) {
  Sprites.draw(canvas,this.name,this.x,this.y,this.frame);
}

Alien.prototype.die = function() {
  GameAudio.play('die');
  this.flock.speed += 1;
  this.board.remove(this);
}

Alien.prototype.step = function(dt) {
  this.mx += dt * this.flock.dx;
  this.y += this.flock.dy;
  if(Math.abs(this.mx) > 10) {
    if(this.y == this.flock.max_y[this.x]) {
      this.fireSometimes();
    }
    this.x += this.mx;
    this.mx = 0;
    this.frame = (this.frame+1) % 2;
    if(this.x > Game.width - Sprites.map.alien1.w * 2) this.flock.hit = -1;
    if(this.x < Sprites.map.alien1.w) this.flock.hit = 1;
  }
  return true;
}

Alien.prototype.fireSometimes = function() {
      if(Math.random()*100 < 10) {
        this.board.addSprite('missile',this.x + this.w/2 - Sprites.map.missile.w/2,
                                      this.y + this.h, 
                                     { dy: 100 });
      }
}

var Player = function Player(opts) { 
  this.reloading = 0;
}

Player.prototype.draw = function(canvas) {
   Sprites.draw(canvas,'player',this.x,this.y);
}


Player.prototype.die = function() {
  GameAudio.play('die');
  Game.callbacks['die']();
}

Player.prototype.step = function(dt) {
  if(Game.keys['left']) { this.x -= 100 * dt; }
  if(Game.keys['right']) { this.x += 100 * dt; }

  if(this.x < 0) this.x = 0;
  if(this.x > Game.width-this.w) this.x = Game.width-this.w;

  this.reloading--;

  if(Game.keys['fire'] && this.reloading <= 0 && this.board.missiles < 3) {
    GameAudio.play('fire');
    this.board.addSprite('missile',
                          this.x + this.w/2 - Sprites.map.missile.w/2,
                          this.y-this.h,
                          { dy: -100, player: true });
    this.board.missiles++;
    this.reloading = 10;
  }
  return true;
}


var Missile = function Missile(opts) {
   this.dy = opts.dy;
   this.player = opts.player;
}

Missile.prototype.draw = function(canvas) {
   Sprites.draw(canvas,'missile',this.x,this.y);
}

Missile.prototype.step = function(dt) {
   this.y += this.dy * dt;

   var enemy = this.board.collide(this);
   if(enemy) { 
     enemy.die();
     return false;
   }
   return (this.y < 0 || this.y > Game.height) ? false : true;
}

Missile.prototype.die = function() {
  if(this.player) this.board.missiles--;
  if(this.board.missiles < 0) this.board.missiles=0;
   this.board.remove(this);
}

  this.iterate = function(func) {
     for(var i=0,len=this.objects.length;i<len;i++) {
       func.call(this.objects[i]);
     }
  }

  this.detect = function(func) {
    for(var i = 0,val=null, len=this.objects.length; i < len; i++) {
      if(func.call(this.objects[i])) return this.objects[i];
    }
    return false;
  }

  this.step = function(dt) { 
    this.removed_objs = [];
    this.iterate(function() { 
        if(!this.step(dt)) this.die();
    }); 

    for(var i=0,len=this.removed_objs.length;i<len;i++) {
      var idx = this.objects.indexOf(this.removed_objs[i]);
      if(idx != -1) this.objects.splice(idx,1);
    }
  };

  this.render = function(canvas) {
    canvas.clearRect(0,0,Game.width,Game.height);
    this.iterate(function() { this.draw(canvas); });
  }

  this.collision = function(o1,o2) {
    return !((o1.y+o1.h-1<o2.y) || (o1.y>o2.y+o2.h-1) ||
             (o1.x+o1.w-1<o2.x) || (o1.x>o2.x+o2.w-1));
  };

  this.collide = function(obj) {
    return this.detect(function() {
      if(obj != this && !this.invulnrable)
       return board.collision(obj,this) ? this : false;
    });
  }

  this.loadLevel = function(level) {
    this.objects = [];
    this.player = this.addSprite('player', // Sprite
                                 Game.width/2, // X
                                 Game.height - Sprites.map['player'].h - 10); // Y

    var flock = this.add(new AlienFlock());
    for(var y=0,rows=level.length;y<rows;y++) {
      for(var x=0,cols=level[y].length;x<cols;x++) {
        var alien = Sprites.map['alien' + level[y][x]];
        if(alien) { 
          this.addSprite('alien' + level[y][x], // Which Sprite
                         (alien.w+10)*x,  // X
                         alien.h*y,       // Y
                         { flock: flock }); // Options
        }
      }
    }
  }

  this.nextLevel = function() { 
    return Game.level_data[level_number + 1] ? (level_number + 1) : false 
  }
 
  this.loadLevel(Game.level_data[level_number]);


var GameAudio = new function() {
  this.load_queue = [];
  this.loading_sounds = 0;
  this.sounds = {};

  var channel_max = 10;		
  audio_channels = new Array();
  for (a=0;a<channel_max;a++) {	
    audio_channels[a] = new Array();
    audio_channels[a]['channel'] = new Audio(); 
    audio_channels[a]['finished'] = -1;	
  }

  this.load = function(files,callback) {
    var audioCallback = function() { GameAudio.finished(callback); }

    for(name in files) {
      var filename = files[name];
      this.loading_sounds++;
      var snd = new Audio();
      this.sounds[name] = snd;
      snd.addEventListener('canplaythrough',audioCallback,false);
      snd.src = filename;
      snd.load();
    }
  }

  this.finished = function(callback) {
    this.loading_sounds--;
    if(this.loading_sounds == 0) {
      callback();
    }
  }

  this.play = function(s) {
    for (a=0;a<audio_channels.length;a++) {
      thistime = new Date();
      if (audio_channels[a]['finished'] < thistime.getTime()) {	
        audio_channels[a]['finished'] = thistime.getTime() + this.sounds[s].duration*1000;
        audio_channels[a]['channel'].src = this.sounds[s].src;
        audio_channels[a]['channel'].load();
        audio_channels[a]['channel'].play();
        break;
      }
    }
  }
}
