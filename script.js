const FRAME = 20;
var ms=0, ps=0;
var gameTime = 0;
var msTillFrame = 0;
var tutorial = 0;
var tutorialPhase = 0;
var tutorialButton;
var showXP;

var BASE_HEALTH = 10;
var BASE_MAX_HEALTH = 10;


var saveData;
try{
    saveData = JSON.parse(localStorage.getItem("data")) || {};
}catch(err) {
    saveData = {};
    failedSave = true;
    console.log("failed to load savedata");
}
var failedSave;
saveData.save = function() {try{
    localStorage.setItem("data", JSON.stringify(saveData));
}catch(err) {
    if(!failedSave) {
        console.log("failed to save savedata");
    }
}};

if(!failedSave && !saveData.doneTutorial) {
	tutorial = 1;
}

function frame() {
	// setTimeout(frame, 100);
	if(IN_FOCUS) requestAnimationFrame(frame);
	ms = Date.now()-lastFrame;
	lastFrame = Date.now();
	var fps = 1000/ms;
	
	var hovers = [];
	if(document.pointerLockElement !== canvas) for(let button of buttons) {
		if(Entity.isTouching(button, mouse_hitbox())) {
			hovers.push(button);
		}
		button.hover = 0;
	}
	for(let ally of allies) {
		if(Entity.isTouching(ally, mouse_hitbox())) {
			hovers.push(ally);
		}
		ally.hover = 0;
	}
	var [hover] = hovers.sort((a, b)=>b.priority-a.priority);
	if(hover) {
		hover.hover = 1;
	}

	let MS = min(ms, FRAME);
	while(MS) {
		ms = min(MS, 1);
		ps = ms/FRAME;

		gameTime += ms;
		doFrame();
		MS -= ms;
		msTillFrame = MS;
	}

	ctx.save();
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.translate(game_ox, game_oy);
	ctx.scale(scale, scale);	

	if(document.pointerLockElement !== canvas) if(keys.check("MouseLeft", 1) || (__mousewas2 && mousetower && keys.check("MouseLeft", 0))) {
		var clicks = [];
		for(let button of buttons) {
			if(Entity.isTouching(button, mouse_hitbox())) {
				clicks.push(button);
			}
		}
		for(let ally of allies) {
			if(Entity.isTouching(ally, mouse_hitbox())) {
				clicks.push(ally);
			}
		}
		var [click] = clicks.sort((a, b)=>b.priority-a.priority);
		if(click) {
			click.click();
			keys.use("MouseLeft");
		}
	}
	
	if(keys.use("CapsLock")) {
		showXP = !showXP;
	}
	if(keys.get("MouseLeft") == 2) {
		__mousewas2 = 1;
	}else __mousewas2 = 0;

	if(keys.check("MouseRight") || keys.check("Escape")) {
		mousetower = undefined;
		selectedTower = undefined;
	}

	for(let particle of particles) {
		particle.draw();
	}
	var Ms = mouse_size;
	mouse_size = 0;
	for(let i = allies.length-1; i >= 0; --i) {
		let ally = allies[i];
		ally.draw();
	}
	for(let i = enemies.length-1; i >= 0; --i) {
		let enemy = enemies[i];
		enemy.draw();
	}
	
	ctx.fillStyle = "black";
	var h = (innerHeight/scale - GAME_HEIGHT)/2;
	ctx.fillRect(-game_ox/scale, -game_oy/scale, innerWidth/scale, h);
	ctx.fillRect(-game_ox/scale, GAME_HEIGHT, innerWidth/scale, h);
	var n = 2/scale;
	ctx.lineWidth = n;
	ctx.strokeStyle = block;
	ctx.strokeRect(-n, -n, GAME_WIDTH+2*n, GAME_HEIGHT+2*n);
	
	ctx.fillStyle = getLeft();
	ctx.fillRect(-game_ox/scale, -game_oy/scale, innerWidth/scale, innerHeight/scale);
	ctx.fillStyle = getRight();
	ctx.fillRect(-game_ox/scale, -game_oy/scale, innerWidth/scale, innerHeight/scale);

	if(tutorial) {
		if(tutorialPhase == 0) {
			buttons.length = 2;
			if(!buttons[1].hover) {
				buttons[1].hover = 1;
				buttons[1].forceText = ["Click this button"];
			}else{
				delete buttons[1].forceText;
			}
			if(mousetower && hotbartowers.includes(mousetower)) {
				buttons[1].forceText = ["Place it somewhere", "on the field"];
				tutorialPhase = 1;
			}
		}
		if(tutorialPhase == 1) {
			buttons[1].hover = 1;
			if(!mousetower) {
				allies[0].deadCheck();
				tutorialPhase = 2;
				allies[0].hover = 1;
				allies[0].frame();
				delete buttons[1].forceText;
			}
		}
		if(tutorialPhase == 2) {
			if(allies[0].statsButton) {
				if(!(allies[0].hover || allies[0].statsButton.hover)) {
					allies[0].statsButton.forceText = ["Level up this unit"];
					allies[0].hover = 1;
					allies[0].frame();
				}else{
					delete allies[0].statsButton.forceText;
				}
			}
			if(allies[0].hp == allies[0].xhp) {
				tutorialPhase = 3;
			}
		}
		if(tutorialPhase == 3) {
			if(allies[0].statsButton) {
				allies[0].statsButton.forceText = ["Click and drag this", "unit to move it"];
				allies[0].statsButton.priority = -2;
				allies[0].hover = 1;
				allies[0].frame();
			}
			if(allies[0] == mousetower) {
				delete allies[0].statsButton;
				tutorialPhase = 4;
				buttons.length = 2;
				buttons.push(new StartWave);
			}
		}
		if(tutorialPhase == 4) {
			buttons[2].hover = 1;
			if(inWave) {
				tutorialPhase = 5;
				for(let i = 1; i < hotbar.length; i++) {
					buttons.push(new TowerButton(i));
				}
			}
		}
		if(tutorialPhase == 5) {
			var [target] = enemies;
			if(target) {
				if(!target.statsButton) {
					var button = new StatsButton(target);
					target.levelupStats = () => {};
					target.func = target.tick;
					target.tick = () => {
						target.func();
						button.hover = 1;
					}
					target.statsButton = button;
					button.forceText = ["Don't let these", "in your base!"];
					button.hover = 1;
					buttons.push(button);
					button.priority = -2;
					tutorial = 0;
					saveData.doneTutorial = 1;
					saveData.save();
				}
			}
		}
	}
	if(document.pointerLockElement !== canvas) for(let button of buttons) {
		button.update();
		button.draw();
	}
	
	mouse_size = Ms;

	if(mousetower) {
		Bullet.position(mousetower, mouse_hitbox());
		mousetower.draw();
	}
	// else
	{
		ctx.fillStyle = keys.check("MouseLeft") ? "#e00": "#77f";
		var a = .35;
		var b = a*2;
		var mx = mouse_x;
		var my = mouse_y;

		// var [player] = allies;
		// if(player) {
		// 	var s = player.s;
		// 	var r = PI/2+atan(player.y+s - my, player.x+s - mx);
		// 	ctx.save();
		// 	ctx.translate(mx, my);
		// 	ctx.rotate(r);
		// 	ctx.translate(-mx, -my);
		// 	ctx.beginPath();
		// 	ctx.moveTo(mx-a, my-a);
		// 	ctx.lineTo(mx+a, my-a);
		// 	ctx.lineTo(mx, my+a);
		// 	ctx.closePath();

		// 	ctx.fill();
		// 	ctx.restore();
		// }else
		ctx.fillRect(mx-a, my-a, b, b);
	}

	ctx.font = "1px Arial";
	var txt = `Wave ${wave}`;
	var wid = ctx.measureText(txt).width*1.1;
	ctx.strokeStyle = "#000";
	ctx.fillStyle = "#fff";
	ctx.fillText(`Wave: ${wave}`, GAME_WIDTH-wid, 1);
	ctx.fillStyle = "#ff0";
	ctx.fillText(`${money}p`, .1, 1);
	ctx.fillStyle = "#0ff";
	ctx.fillText(`${100*BASE_HEALTH/BASE_MAX_HEALTH}%`, .1, 2.1);
	ctx.restore();
}
function randomEnemy() {
	var num = min(enemySets.length-1, floor(wave/5));
	return weight(...enemySets[num]);
}
var pointMax = 20;
var points = pointMax;
var waveTime = 0;
var wave = 1;
function doFrame() {
	if(lastSpawn) --lastSpawn;
	if(lastEnter) --lastEnter;

	for(let i = 0; i < hotbar.length; i++) {
		if(hotbar[i] && !hotbartowers[i]) {
			hotbartowers[i] = new hotbar[i];
		}
	}

	for(let ally of allies) {
		ally.frame();
	}
	for(let enemy of enemies) {
		enemy.frame();
	}
	for(let particle of particles) {
		particle.frame();
	}
	for(let t = gameTime - ms; t < gameTime; t++) {
		if(inWave) {
			++waveTime;
			if(enemies.length == 0 && (points < pointMax/2 && waveTime > 5000)) {
				points += pointMax;
				pointMax += 5;
				inWave -= 1;
				waveTime = 0;
				wave++;
				BASE_HEALTH += .5;
				if(BASE_HEALTH > BASE_MAX_HEALTH) {
					BASE_HEALTH = BASE_MAX_HEALTH;
				}
			}
			if(inWave) {
				if(wave == 20) {
					if(points) {
						points = 0;
						var boss = new Boss;
						boss.doLevelups();
						enemies.push(boss);
					}
				}else{
					if(rand() < .2 * ((points/pointMax)**3)) {
						var enemy = new (randomEnemy());
						enemy.doLevelups();
						enemies.push(enemy);
						lastSpawn = pulseTime;
						points -= enemy.xp;
					}
				}
			}
		}
		if(t % 10 == 0) {
			if(rand() < BASE_HEALTH/BASE_MAX_HEALTH) {
				var dust = new Particle();
				dust.r = rand(PI)-PI/2;
				dust.c = getLeftCol();
				dust.time *= 7.5;
				dust.spd *= rand(.3, .2)*.25;
				dust.y = rand(GAME_HEIGHT-dust.s);
				particles.push(dust);
			}
			
			var num = (inWave-1)/4;
			if(num < 0) num = 1;
			if(wave == 19 || wave == 20) {
				num = 1;
			}
			if(rand() < num) {
				var dust = new Particle();
				dust.r = rand(PI)+PI/2;
				dust.c = getRightCol();
				dust.x = GAME_WIDTH-dust.s;
				dust.time *= 7.5;
				dust.spd *= rand(.3, .2)*.25;
				dust.y = rand(GAME_HEIGHT-dust.s);
				particles.push(dust);
			}
		}
	}
	for(let enemy of enemies) {
		enemy.update();
	}
	for(let ally of allies) {
		ally.update();
		for(let enemy of enemies) {
			if(ally.dead) break;
			if(enemy.dead) continue;
			if(enemy.proj && ally.proj) continue;
			ally.register(enemy);
			enemy.register(ally);
			if(!Entity.rawTouching(ally, enemy)) continue;
			if(Entity.isTouching(ally, enemy)) {
				ally.hit(enemy);
				enemy.hit(ally);
			}
		}
	}
	for(let particle of particles) {
		particle.update();
	}
	if(BASE_HEALTH <= 0) {
		enemies.forEach(a => a.dead = 1);
		allies.forEach(a => a.dead = 1);
		money = totalMoney;
		wave = floor((wave - 1)/5)*5+1;
		inWave = 0;
		BASE_HEALTH = BASE_MAX_HEALTH;
	}
	particles.clean();
	allies.clean();
	enemies.clean();
	buttons.clean();
}
Array.prototype.clean = function() {
	this.forEach((a, i) => (a.dead && this.splice(i, 1)));
}
var __mousewas2;

var inWave = 0;
var mousetower;
var hotbartowers = [];
var hotbar = [];
var selectedTower;

var particles = [];
var enemies = [];
var allies = [];
var buttons = [];
var frct = f => (1-f**250)/(1-f);
const GAME_WIDTH = 16*4;
const GAME_HEIGHT = 9*4;
var scale;
var game_ox = 0;
var game_oy = 0;

var lastFrame;
var pulseTime = 350;
var lastSpawn = 0;
var lastEnter = 0;

class Entity{
	x = 0;
	y = 0;
	vx = 0;
	vy = 0;
	ax = 0;
	ay = 0;
	s = 1;
	f = 0.2;
	spd = 0;
	hp = 1;
	xhp = 1;
	atk = 1;
	c = "white";
	priority = 2;
	click() {}
	register(what) {}
	hit(what) {
		what.hp -= this.atk;
		if(!what.proj) {
			var num = new TextParticle(floor(this.atk*100)/100, what.dmgclr);
			num.x = what.x+what.s/2;
			num.y = what.y;
			particles.push(num);
		}
		what.deadCheck();
	}
	deadCheck() {
		if(this.hp <= 0) {
			this.dead = 1;
		}
		if(this.explode) {
			var m = this.dead? 15: 6;
			for(let i = 0; i < m; i++) {
				var dust = new Particle();
				Bullet.position(dust, this);
				dust.c = this.c;
				dust.spd *= rand(1, .3);
				dust.time *= rand(1, .8);
				dust.time = floor(dust.time);
				dust.s *= this.s;
				dust.spd *= this.s;

				var mr = atan(this.vy, this.vx);
				var md = dist(this.vy, this.vx);
				// md *= rand(.2, .1);
				dust.vx = cos(mr)*md;
				dust.vy = sin(mr)*md;

				particles.push(dust);
			}
		}
	}
	draw() {
		if(this.hp < this.xhp) {
			ctx.fillStyle = "black";
			ctx.fillRect(this.x, this.y, this.s, this.s);
			var n = 1/scale;
			ctx.lineWidth = n*2;
			ctx.strokeStyle = this.c;
			ctx.strokeRect(this.x+n, this.y+n, this.s-2*n, this.s-2*n);
			var h = this.hp/this.xhp;
			ctx.fillStyle = this.c;
			ctx.fillRect(this.x, this.y+this.s*(1-h), this.s, this.s*h);
		}else{
			ctx.fillStyle = this.c;
			ctx.fillRect(this.x, this.y, this.s, this.s);
		}
	}
	frame() {
		this.ax = 0;
		this.ay = 0;
		this.tick();
	}
	update() {
		if(this.dead) return;
		var {vx, vy} = this;

		this.vx += this.ax*ps;
		this.vy += this.ay*ps;

		var mx = (this.vx+vx)/2;
		var my = (this.vy+vy)/2;

		this.vx -= ps*this.f*mx;
		this.vy -= ps*this.f*my;

		this.x += ps*mx;
		this.y += ps*my;
		this.screenlock();
	}
	static squareDistance(a, b) {
		var s = (a.s - b.s)/2;
		return max(a.x - b.x + s, a.y - b.y + s);
	};
	static distance(a, b) {
		var s = (a.s - b.s)/2;
		return dist(a.x - b.x + s, a.y - b.y + s);
	};
	static rawDistance(a, b) {
		var s = (a.s - b.s)/2;
		return rawDist(a.x - b.x + s, a.y - b.y + s);
	};
	static radian(a, b) {
		var s = (b.s - a.s)/2;
		return atan(b.y - a.y + s, b.x - a.x + s);
	};
    static isTouching(a, b) {
		var aw = a.w||a.s;
		var bw = b.w||b.s;
		var ah = a.h||a.s;
		var bh = b.h||b.s;
        return a.x + aw > b.x
            && b.x + bw > a.x
            && a.y + ah > b.y
            && b.y + bh > a.y
        ;
    };
	static rawTouching(a, b) {
		return this.squareDistance(a, b) < (a.s+b.s)/2;
	}
	screenlock() {
		var {x, y, s} = this;
		var w = GAME_WIDTH-s;
		var h = GAME_HEIGHT-s;

		if(x < 0) this.x = 0;
		if(y < 0) this.y = 0;
		if(x > w) this.x = w;
		if(y > h) this.y = h;
	}
}
class Player extends Entity{
	type = "tower";
	spd = 0.13;
	explode = 1;
	c = "#55f";
	tick() {
		var mx = 0, my = 0;
		if(keys.check("KeyD")) ++mx;
		if(keys.check("KeyA")) --mx;
		if(keys.check("KeyS")) ++my;
		if(keys.check("KeyW")) --my;
		
		var md = dist(mx, my);
		if(md != 0) {
			var mr = atan(my, mx);
			md = min(md, 1);
			mx = cos(mr);
			my = sin(mr);
			this.ax += this.spd * mx * md;
			this.ay += this.spd * my * md;
		}

		if(this.lastShot) {
			this.lastShot -= ms;
			if(this.lastShot < 0) this.lastShot = 0;
		}else{
			var mx = 0, my = 0;
			if(keys.check("ArrowRight")) ++mx;
			if(keys.check("ArrowLeft")) --mx;
			if(keys.check("ArrowDown")) ++my;
			if(keys.check("ArrowUp")) --my;

			if(keys.check("MouseLeft")) {
				let Mx = mouse_x;
				let My = mouse_y;
				let s = this.s/2;

				mx -= this.x + s - Mx;
				my -= this.y + s - My;
			}
			
			if(mx || my) {
				var mr = atan(my, mx);
				allies.push(new Bullet(this, mr));
				this.lastShot = 300;
			}
		}
		// {
		// 	let Mx = mouse_x;
		// 	let My = mouse_y;
		// 	let s = this.s/2;

		// 	if (document.pointerLockElement == canvas) {
		// 		var dx = Mx - (this.x+s);
		// 		var dy = My - (this.y+s);
		// 		var mr = atan(dy, dx);
		// 		var md = dist(dy, dx);
		// 		md = min(md, 10);
		// 		mouse_x = this.x+s + cos(mr)*md;
		// 		mouse_y = this.y+s + sin(mr)*md;
		// 	}
		// }
	}
}
class Bullet extends Entity{
	proj = 1;
	type = "bullet";
	c = "#55f";
	spd = 1;
	s = .5;
	time = 0;
	explode = 1;
	constructor(parent, r) {
		super();
		this.r = r;
		this.c = parent.c;
		Bullet.position(this, parent);
	}
	static position(what, parent) {
		var s = (parent.s - what.s)/2;
		what.x = parent.x+s;
		what.y = parent.y+s;
	}
	deadCheck() {
		if(this.hp <= 0) {
			this.dead = 1;
		}
		if(this.explode) {
			var m = this.dead? 15: 6;
			for(let i = 0; i < m; i++) {
				var dust = new Particle();
				Bullet.position(dust, this);
				dust.c = this.c;
				dust.spd *= rand(1, .3);
				dust.time *= rand(1, .8);
				dust.time = floor(dust.time);

				var mr = atan(this.vy, this.vx);
				var md = dist(this.vy, this.vx);
				md *= rand(.2, .1);
				dust.vx = cos(mr)*md;
				dust.vy = sin(mr)*md;

				particles.push(dust);
			}
		}
	}
	tick() {
		this.ax += cos(this.r)*this.spd;
		this.ay += sin(this.r)*this.spd;
		if(rand()<.05){
			var dust = new Particle();
			Bullet.position(dust, this);
			dust.c = this.c;
			// dust.spd *= rand(1, .3);
			dust.time *= .6;
			dust.time = floor(dust.time);

			var mr = atan(this.vy, this.vx);
			var md = dist(this.vy, this.vx);
			md *= rand(.2, .1);
			dust.vx = cos(mr)*md;
			dust.vy = sin(mr)*md;

			particles.push(dust);
		}
	}
	screenlock() {
		var {x, y, s} = this;
		var w = GAME_WIDTH+s;
		var h = GAME_HEIGHT+s;

		if(x < -s) this.dead = 1;
		if(y < -s) this.dead = 1;
		if(x > w) this.dead = 1;
		if(y > h) this.dead = 1;
	}
	draw() {
		var {x, y, vx, vy} = this;
		var v = 2;
		vx /= v;
		vy /= v;
		this.x -= vx;
		this.y -= vy;
		var m = 10;
		var n = 1/m;
		this.hp = this.xhp;
		for(let i = 0; i < m; i++) {
			this.x += vx*n;
			this.y += vy*n;
			ctx.globalAlpha = i/m;
			super.draw();
		}
		ctx.globalAlpha = 1;

		this.x = x;
		this.y = y;
	}
}
var money = 100;
var totalMoney = money;
class Tower extends Entity{
	dmgclr = "red";
	timer = 'b/s';
	type = "tower";
	col = "#5f5";
	range = 20;
	fireRate = 200;
	lastShot = 0;
	inc = 1.8**.1;
	xp = 0;
	lxp = 20;
	lvl = 1;
	priority = 4;
	mult = 1;
	levelupStats() {
		this.fireRate /= this.inc;
		this.range *= this.inc;
		this.atk *= this.inc;
		this.xhp *= this.inc;
		this.hp = this.xhp;
		this.mult *= this.inc;
	}
	levelup() {
		var num = new TextParticle("Level up!", "yellow");
		num.x = this.x+this.s/2;
		num.y = this.y;
		num.time *= 3;
		num.spd *= .7;
		particles.push(num);

		this.levelupStats(this);
		
		this.xp -= this.lxp;
		this.lxp *= this.inc*this.inc;
		this.lvl += 1;
		
		var m = 25;
		for(let i = 0; i < m; i++) {
			var dust = new Particle();
			Bullet.position(dust, this);
			dust.c = "#fff";
			dust.spd *= rand(.7, .3);
			dust.time *= rand(2, 1.5);
			dust.time = floor(dust.time);
			particles.push(dust);
		}
	}
	hit(what) {
		super.hit(what);
		if(what.dead && what.xp) {
			this.xp += what.xp;
			if(this.xp >= this.lxp) {
				this.levelup();
			}
		}
	}
	deadCheck() {
		super.deadCheck();
		if(this.dead && this.selected) {
			document.exitPointerLock();
		}else if(this.hp > 0 && this.hp < this.xhp/2) {
			var text = new TextParticle("LOW HP!!!", "red");
			text.time *= 1.5;
			text.spd *= 1.3;
			text.s = 1.5;
			text.x = this.x+this.s/2;
			text.y = this.y;
			particles.push(text);
		}
	}
	draw(slot, hover) {
		this.up = false;
		this.down = false;

		var circle = !(hotbartowers.includes(this) && slot) && (!inWave || this.hover || this.statsButton || mousetower || this.selected);

		if(slot && !(this == mousetower) && hover) circle = 1;

		if(circle) {
			var mx = this.x + this.s/2;
			var my = this.y + this.s/2;
			ctx.lineWidth = 2/scale;
			ctx.strokeStyle = this.c;
			ctx.beginPath();
			ctx.arc(mx, my, this.range, 0, PI2);
			ctx.stroke();
		}
		var xp = (showXP || this.hover || keys.check("Tab") || this.statsButton?.hover || !inWave) && !(slot || hotbartowers.includes(this));
		if(this.lastShot || this.hover || this.statsButton?.hover) {
			var s = this.s/2;
			ctx.lineWidth = 2/scale;
			ctx.strokeStyle = this.c;
			ctx.fillStyle = this.c;
			var y = this.y-s*2;
			if(y < 0) {
				// if(xp) 
				y = this.y+s*5.2+1;
				// else y = this.y+s*3;

				this.down = true;
			}
			ctx.strokeRect(this.x-s, y, s*4, s);
			ctx.fillRect(this.x-s, y, s*4*(1-this.lastShot/this.fireRate), s);
		}
		if(xp) {
			var s = this.s/2;
			ctx.lineWidth = 2/scale;
			ctx.strokeStyle = "#7f0";
			ctx.fillStyle = "#7f0";
			var oy = 0;
			y = this.y+s*3;
			if(this.y+s*4.2+1 > GAME_HEIGHT) {
				this.up = true;
				y = this.y-s*2.2-1;
				// if(this.lastShot)
				{
					y -= s*2;
				}
			}
			ctx.strokeRect(this.x-s, y, s*4, s);
			ctx.fillRect(this.x-s, y, s*4*(this.xp/this.lxp), s);

			if(this.lvl > 0) {
				ctx.font = "1px Arial";
				var txt = "Lvl "+this.lvl;
				var wid = ctx.measureText(txt).width;
				ctx.fillText(txt, this.x+s-wid/2, y+s*1.2+1);
			}
			if(circle && this.statsButton) {
				var mx = this.x + this.s/2;
				var my = this.y + this.s/2;
				ctx.lineWidth = 2/scale;
				ctx.beginPath();
				ctx.arc(mx, my, this.statsButton.obj?.range, 0, PI2);
				ctx.stroke();
			}
		}
		super.draw();
	}
	controlled() {
		var mx = 0, my = 0;
		if(keys.check("ArrowRight")) ++mx;
		if(keys.check("ArrowLeft")) --mx;
		if(keys.check("ArrowDown")) ++my;
		if(keys.check("ArrowUp")) --my;

		if(keys.check("MouseLeft")) {
			let Mx = mouse_x;
			let My = mouse_y;
			let s = this.s/2;

			mx -= this.x + s - Mx;
			my -= this.y + s - My;
		}
		
		if(mx || my) {
			var mr = atan(my, mx);
			allies.push(new Bullet(this, mr));
			this.lastShot = this.fireRate;
		}
	}
	tick() {
		this.lastShot = round(this.lastShot);
		if (this.selected) {
			{
				if(this.lastShot) {
					this.lastShot -= ms;
					if(this.lastShot < 0) this.lastShot = 0;
				}else this.controlled();
			}
			if(document.pointerLockElement === canvas) {
				var Mx = mouse_x, My = mouse_y;
				var s = this.s/2;
				var dx = Mx - (this.x+s);
				var dy = My - (this.y+s);
				var mr = atan(dy, dx);
				var md = dist(dy, dx);
				md = min(md, this.range);
				mouse_x = this.x+s + cos(mr)*md;
				mouse_y = this.y+s + sin(mr)*md;
			}else{
				delete this.selected;
				document.exitPointerLock();
			}
			this.c = this.col;
		}else{
			if(this.hover) {
				this.c = "#fff";
			}else{
				this.c = this.col;
			}
			if(mousetower == this) {
				if(!keys.check("MouseLeft")) {
					mousetower = undefined;
				}
			}
			if(this.lastShot) {
				this.lastShot -= ms;
				if(this.lastShot < 0) this.lastShot = 0;
			}else{
				var {target} = this;
				if(target) {
					this.shoot(Entity.radian(this, target));
				}
			}
		}
		if(this.lastShot < 0) {
			this.lastShot = 0;
		}
		delete this.target;
		this.DIS = this.range*this.range;

		if((selectedTower == undefined || selectedTower == -1) && this.hover && !this.statsButton) {
			for(let button of buttons) if(button instanceof StatsButton) return;
			this.statsButton = new StatsButton(this);
			buttons.push(this.statsButton);
		}
		if(this.statsButton) {
			this.priority = 7;
		}else{
			this.priority = 4;
		}
	}
	register(enemy) {
		if(this.lastShot) return;

		var dis = Entity.rawDistance(this, enemy) - (enemy.s*enemy.s);
		if(dis < this.DIS) {
			this.DIS = dis;
			this.target = enemy;
		}
	}
	shoot(r) {
		if(!this.lastShot) {
			var {target} = this;
			var DIS = Entity.distance(this, target);
			target = {
				x: target.x + target.vx*DIS*.4,
				y: target.y + target.vy*DIS*.4,
				s: target.s
			};
			r = Entity.radian(this, target);

			var bullet = new Bullet(this, r);
			bullet.hit = what => this.hit(what);
			allies.push(bullet);
			this.lastShot = this.fireRate;
		}
	}
	click() {
		if(inWave) {
			canvas.requestPointerLock();
			this.selected = 1;
			mousetower = undefined;
			selectedTower = undefined;
		}else{
			mousetower = this;
			selectedTower = undefined;
		}
	}
	cost = 10;
}
class ShooterTower extends Tower{
	rot = 0;
	hp = 3;
	xhp = 3;
	range = 10;
	fireRate = 500;
	col = "#07f";
	name = "Shooter";
	towerType = "Bullet Tower";
	shoot(r) {
		super.shoot(r);
		this.rot = r;
	}
	register(enemy) {
		if(enemy.type != "enemy") return;
		super.register(enemy);
	}
	draw() {
		var {rot, x, y, s} = this;
		var mx = x+s/2;
		var my = y+s/2;
		
		ctx.save();
		ctx.translate(mx, my);
		ctx.rotate(rot);
		ctx.translate(-mx, -my);
		{
			ctx.fillStyle = this.c;
			var s = this.s/4;
			ctx.fillRect(this.x+s*2, this.y+s, s*4, s*2);
		}
		ctx.restore();
		super.draw(...arguments);
	}
}
class PushTower extends Tower{
	controlled() {
		document.exitPointerLock();
	}
	timer = 'p/s';
	atk = 1.5;
	fireRate = 100;
	hp = 1;
	xhp = 1;
	range = 7;
	col = "#72f";
	towerType = "Barrier";
	name = "Force Field";
	cost = 5;
	gainXp = 0;
	aim = 1;
	levelupStats() {
		var {range} = this;
		super.levelupStats(this);
		this.range = range;
	}
	shoot(r) {
		if(this.lastShot) return;

		var y = sin(r);
		var x = cos(r);
		x = sign(x);
		y = sign(y);
		if(this.y < this.range) {
			y = 1;
		}
		if(this.y+this.s > GAME_HEIGHT-this.range) {
			y = -1;
		}
		if(y == 0) y = 1;
		if(x == 0) x = 1;

		this.target.vx += x*this.atk*ps;
		this.target.vy += y*this.atk*ps;
		this.xp += this.gainXp * (1.8**(.1*wave));
		this.lastShot = this.fireRate;

		if(this.xp > this.lxp) {
			this.levelup();
		}
	}
}
class SpikeTower extends Tower{
	controlled() {
		document.exitPointerLock();
	}
	col = "#aac";
	timer = 'a/s';
	atk = 4;
	fireRate = 1000;
	range = 15;
	hp = 2;
	xhp = 2;
	towerType = "Trap";
	name = "Spike Trap";
	cost = 15;
	levelupStats() {
		var {range} = this;
		super.levelupStats(this);
		this.range = range;
	}
	shoot() {
		if(this.lastShot) return;
		var m = 12;
		for(let i = 0; i < m; i++) {
			var dust = new Particle();
			Bullet.position(dust, this.target);
			dust.c = this.c;

			particles.push(dust);
		}
		this.hit(this.target);
		this.lastShot = this.fireRate;
	}
	draw() {
		var {x, y, s} = this;
		var mx = x+s/2;
		var my = y+s/2;

		ctx.save();
		ctx.translate(mx, my);
		ctx.rotate(PI/4);
		ctx.translate(-mx, -my);
		ctx.fillStyle = this.c;
		ctx.fillRect(this.x, this.y, this.s, this.s);
		ctx.restore();
		
		super.draw(...arguments);
	}
}
class Bomb extends SpikeTower{
	controlled() {
		document.exitPointerLock();
	}
	name = "Bomb";
	col = "#325";
	fireRate = 4000;
	range = 10;
	cost = 15;
	atk = 1;
	hp = 1;
	xhp = 1;
	register(target) {
		if(this.lastShot) return;

		var dis = Entity.rawDistance(this, target) - (target.s*target.s);
		if(dis > this.DIS) return;
		var m = 12;
		for(let i = 0; i < m; i++) {
			var dust = new Particle();
			Bullet.position(dust, target);
			dust.c = this.c;

			particles.push(dust);
		}
		this.hit(target);
		this.used = 1;
	}
	tick() {
		super.tick();
		if(this.used) {
			this.lastShot = this.fireRate;
		}
		delete this.used;
	}
}


class Button{
	constructor(onclick) {
		if(onclick) {
			this.click = onclick;
		}
	}
	update() {
	}
	draw() {
		var {w, h}=this;
		w ||= this.s;
		h ||= this.s;
		ctx.fillStyle = this.c;
		ctx.fillRect(this.x, this.y, w, h);
	}
	hitbox = [this];
	x = 0;
	y = 0;
	s = 3;
}
class TowerButton extends Button{
	col = "#55f";
	constructor(id) {
		super();
		this.id = id;
		this.y = GAME_HEIGHT - this.s*1.5;
		this.x = this.s * (this.id + 1);
		if(this.id == -1) {
			this.priority = 0;
		}else{
			this.priority = 5;
		}
	}
	update() {
		this.col = this.tower?.col;
		if(this.tower?.cost > money) {
			if(selectedTower == this.id) {
				this.c = "#f5a";
			}else{
				if(this.hover) {
					this.c = "#f77";
				}else{
					this.c = "#f55";
				}
			}
		}else{
			if(selectedTower == this.id) {
				this.c = "#5af";
			}else{
				if(this.hover) {
					this.c = "#77f";
				}else{
					this.c = "#55f";
				}
			}
		}
		this.tower = hotbartowers[this.id];
		if(this.id == -1) {
			this.c = "#0000";
			this.y = 0;
			this.x = 0;
			delete this.s;
			this.w = GAME_WIDTH;
			this.h = GAME_HEIGHT;
		}
	}
	draw() {
		super.draw();
		var tower = this.tower;
		if(tower) {
			Bullet.position(tower, this);
			tower.c = tower.col;
			tower.draw(1, this.hover);
		}
		if(this.hover) {
			var s = this.s/2;
			ctx.fillStyle = this.col;
			ctx.beginPath();
			ctx.moveTo(this.x+s, this.y-s);
			ctx.lineTo(this.x, this.y-s*2.5);
			ctx.lineTo(this.x+s*2, this.y-s*2.5);

			if(!tower) {
				var {text} = this;
				if(!text) return;
			}
			ctx.fill();
			ctx.font = "1px Arial";
			if(!text) text = [
				tower.name,
				`${tower.towerType} (${tower.cost}p)`,
				`${round(100000/tower?.fireRate)/100} ${tower.timer}`,
				`${tower?.hp} hp ${tower?.atk} power`,
				`${tower?.range} range`
			];
			if(this.forceText) text = this.forceText;
			var wids = text.map(txt => ctx.measureText(txt).width);
			var padding = .5;
			var bubbleWidth = max(...wids)+padding*2;
			var bubbleHeight = (text.length+.5)*(1+padding);
			
			var y = this.y-s*2.5-bubbleHeight;
			ctx.fillRect(this.x+s-bubbleWidth/2, y, bubbleWidth, bubbleHeight);
			var l = text.length;
			ctx.fillStyle = "white";
			for(let i = 0; i < l; i++) {
				ctx.fillText(text[i], this.x+s-wids[i]/2, 1+padding*.5+y+i*(padding+1));
			}
		}
	}
	click() {
		if(this.id == -1) {
			var tower = hotbartowers[selectedTower];
			if(tower) {
				if(money < tower.cost) {
					selectedTower = undefined;
					mousetower = undefined;
					return;
				}
				Bullet.position(tower, mouse_hitbox());
				allies.push(tower);
				delete hotbartowers[selectedTower];
				
				if(keys.check("ShiftRight", 0) && keys.check("ShiftLeft", 0)) {
					selectedTower = this.id;
				}
				mousetower = hotbartowers[selectedTower];
				money -= tower.cost;
			}
		}else{
			selectedTower = this.id;
			mousetower = hotbartowers[selectedTower];
		}
	}
	
}
class StatsButton extends TowerButton{
	constructor(tower) {
		super();
		this.tower = tower;
	}
	update() {
		if((!this.hover && !this.tower.hover) || this.tower.dead) {
			this.dead = 1;
			delete this.tower.statsButton;
		}
		this.col = this.tower.col;
	}
	getCost() {
		return ceil(this.tower.cost/30 * (this.tower.lxp - this.tower.xp));
	}
	draw() {
		var cost = this.getCost();

		var tx = this.tower.x;
		var ty = this.tower.y;
		var ts = this.tower.s;
		var s = ts/2;
		if(this.tower.up) ty -= s * 6;
		else{
			ty -= s * 2;
		}

		var {tower} = this;
		ctx.font = "1px Arial";
		var stat = x => round(x*100)/100;
		if(tower) {
			let {fireRate, inc, atk, timer, range, xhp} = tower;
			var obj = {fireRate, inc, atk, timer, range, xhp};
			tower.levelupStats.call(obj);
		}
		this.obj = obj;
		var text = [
			`Level up (${cost}p)`,
			`${stat(tower?.atk)} -> ${stat(obj?.atk)} power`,
			`${stat(tower?.hp)} -> ${stat(obj?.xhp)} hp`,
			`${stat(tower?.range)} -> ${stat(obj?.range)} range`,
			`${round(100000/tower?.fireRate)/100} -> ${round(100000/obj?.fireRate)/100} ${tower.timer}`
		];
		if(this.forceText) text = this.forceText;
		var wids = text.map(txt => ctx.measureText(txt).width);
		var padding = .5;
		var bubbleWidth = max(...wids)+padding*2;
		var bubbleHeight = (text.length+.5)*(1+padding);

		ctx.fillStyle = (cost <= money)? this.col: "#f55";
		ctx.beginPath();
		
		var py = ty-s*2.5-bubbleHeight;
		if(py < 0 && !this.tower.down) {
			this.tower.down = 1;
			var pd = 1;
			ty -= s*2;
		}

		if(this.tower.down) {
			ctx.moveTo(tx+s, ty+s*11);
			ctx.lineTo(tx, ty+s*12.5);
			ctx.lineTo(tx+s*2, ty+s*12.5);
			this.y = ty+s*12.5;
		}else{
			ctx.moveTo(tx+s, ty-s);
			ctx.lineTo(tx, ty-s*2.5);
			ctx.lineTo(tx+s*2, ty-s*2.5);
		}
		ctx.fill();

		this.w = bubbleWidth;
		
		this.x = tx+s-bubbleWidth/2;
		if(!this.tower.down){
			this.y = ty-s*2.5-bubbleHeight;
			
			this.h = ty - this.y;
			if(this.tower.up) this.h += s * 6;
			else this.h += s*2;
		}

		ctx.fillRect(this.x, this.y, bubbleWidth, bubbleHeight);
		var l = text.length;
		ctx.fillStyle = "white";
		for(let i = 0; i < l; i++) {
			ctx.fillText(text[i], tx+s-wids[i]/2, 1+padding*.5+this.y+i*(padding+1));
		}

		if(this.tower.down) {
			this.h = this.y + bubbleHeight - ty - ts*2;
			this.y = this.tower.y + this.tower.s;
		}
		if(pd) this.h -= s*2;
	}
	click() {
		var cost = this.getCost();
		if(money >= cost) {
			this.tower.xp = this.tower.lxp;
			this.tower.levelup();
			money -= cost;
		}
	}
	priority = 5;
}
class StartWave extends TowerButton{
	constructor() {
		super();
		this.x = GAME_WIDTH - (this.s * 3);
	}
	col = "#f00";
	text = ["Start Wave"]
	update() {
		if(this.hover) {
			this.c = "#f22";
		}else{
			this.c = "#f00";
		}
	}
	click() {
		if(!inWave) {
			inWave = 5;
			waveTime = 0;
		}
	}
}

class Enemy extends Entity{
	dmgclr = '#f70'
	type = "enemy";
	xp = 1;
	x = GAME_WIDTH;
	explode = 1;
	spd = 0.03;
	inc = 1.8**.1;
	mult = 1;
	doLevelups() {
		for(let i = 1; i < wave; i++) {
			this.levelup();
		}
	}
	constructor() {
		super();
		this.y = rand(GAME_HEIGHT);
	}
	screenlock() {
		var {x, y, s} = this;
		var w = GAME_WIDTH-s;
		var h = GAME_HEIGHT-s;

		if(x < -s) {
			this.win();
		}
		if(y < 0) this.y = 0;
		if(this.inField) {
			if(x > w) this.x = w;
		}else{
			if(x < w) this.inField = 1;
		}
		if(y > h) this.y = h;
	}
	win() {
		this.dead = 1;
		lastEnter = pulseTime;
		--BASE_HEALTH;
	}
	deadCheck() {
		super.deadCheck();
		if(this.dead) {
			money += floor(this.xp * BASE_HEALTH/BASE_MAX_HEALTH)||1;
			totalMoney += floor(this.xp * BASE_HEALTH/BASE_MAX_HEALTH)||1;
		}
	}
	levelup() {
		this.atk *= this.inc;
		this.xhp *= this.inc;
		this.hp = this.xhp
		this.xp *= this.inc;
		this.mult *= this.inc;
	}
}
class Runner extends Enemy{
	c = "#f22";
	tick() {
		this.ax -= this.spd;
	}
	xp = 1;
}
class FastRunner extends Runner{
	constructor() {
		super();
		this.spd *= 1.5;
	}
	c = "#f72";
	xp = 2;
}
class SpeedyRunner extends Runner{
	constructor() {
		super();
		this.spd *= 3;
	}
	tick() {
		if(rand()<.05) {
			var dust = new Particle();
			dust.s = .75;
			Bullet.position(dust, this);
			dust.c = this.c;
			var m = .5;
			// dust.vx = -this.vx*m;
			// dust.vy = -this.vy*m;
			var s = (this.s-dust.s)/2;
			dust.y += rand(1, -1)*s;
			// dust.x += this.s/2;
			dust.time /= 2;
			dust.spd *= 1.2;
			particles.push(dust);
		}
		
		super.tick();
	}
	c = "#ff5";
	xp = 4;
}
class SuperRunner extends Runner{
	constructor() {
		super();
		this.spd *= 4;
	}
	tick() {
		if(rand()<.1) {
			var dust = new Particle();
			dust.s = .75;
			Bullet.position(dust, this);
			dust.c = this.c;
			var m = .5;
			// dust.vx = -this.vx*m;
			// dust.vy = -this.vy*m;
			var s = (this.s-dust.s)/2;
			dust.y += rand(1, -1)*s;
			// dust.x += this.s/2;
			dust.time /= 2;
			dust.spd *= 1.2;
			particles.push(dust);
		}
		
		super.tick();
	}
	c = "#5ff";
	xp = 6;
}
class Swerve extends Enemy{
	constructor() {
		super();
		this.spd *= 3;
	}
	time = 0;
	tick() {
		this.time += ms;
		var m = 1000;
		var n = this.time % (m*2);
		n = abs(n - m);

		var r = n/m * PI + PI/2;
		this.r = r;
		this.ax = cos(r) * this.spd;
		this.ay = sin(r) * this.spd;
	}
	draw() {
		if(this.time <= 0) return;
		
		var {r, x, y, s} = this;
		var mx = x+s/2;
		var my = y+s/2;
		ctx.save();
		ctx.translate(mx, my);
		ctx.rotate(r);
		ctx.translate(-mx, -my);
		super.draw();
		ctx.restore();
	}
	c = "#f5f";
	xp = 6;
}
class PowerRunner extends Runner{
	constructor() {
		super();
		this.spd *= 0.8;
	}
	hp = 2;
	xhp = 2;
	atk = 1;
	c = "#0a0";
	xp = 2;
}
class Shooter extends Runner{
	rot = PI;
	range = 5;
	fireRate = 500;
	atk = .35;
	xp = 4;
	col = "#ff0"
	levelup() {
		super.levelup();
		this.fireRate /= this.inc;
		this.range *= this.inc;
	}
	tick() {
		super.tick();
		this.lastShot = round(this.lastShot);
		if(this.lastShot) {
			this.lastShot -= ms;
			if(this.lastShot < 0) this.lastShot = 0;
		}else{
			var {target} = this;
			if(target) {
				this.shoot(Entity.radian(this, target));
			}
		}
		if(this.lastShot < 0) {
			this.lastShot = 0;
		}
		delete this.target;
		this.DIS = this.range*this.range;
	}
	register(enemy) {
		if(this.lastShot) return;
		if(enemy.type != "tower") return;

		var dis = Entity.rawDistance(this, enemy) - (enemy.s*enemy.s);
		if(dis < this.DIS) {
			this.DIS = dis;
			this.target = enemy;
		}
	}
	shoot(r) {
		if(!this.lastShot) {
			var bullet = new Bullet(this, r);
			bullet.hit = what => this.hit(what);
			enemies.push(bullet);
			this.lastShot = this.fireRate;
		}
		this.rot = r;
	}
	draw() {
		if(this.lastShot) {
			var s = this.s/2;
			ctx.lineWidth = 2/scale;
			ctx.strokeStyle = this.c;
			ctx.fillStyle = this.c;
			var y = this.y-s*2;

			ctx.strokeRect(this.x-s, y, s*4, s);
			ctx.fillRect(this.x-s, y, s*4*(1-this.lastShot/this.fireRate), s);
		}
		var {rot, x, y, s} = this;
		var mx = x+s/2;
		var my = y+s/2;
		
		ctx.save();
		ctx.translate(mx, my);
		ctx.rotate(rot);
		ctx.translate(-mx, -my);
		{
			ctx.fillStyle = this.c;
			var s = this.s/4;
			ctx.fillRect(this.x+s*2, this.y+s, s*4, s*2);
		}
		ctx.restore();
		super.draw();
	}
}
class Boss extends Enemy{
	hp = 300;
	xhp = 300;
	phase = 0;
	time = 0;
	xp = 0;
	gxp = 100;
	fireRate = 500;
	s = 4;
	atk = .5;
	c = "#0a0";
	rot = PI;
	win() {
		super.win();
		BASE_HEALTH = 0;
		money = 0;
	}
	deadCheck() {
		super.deadCheck();
		if(this.dead) {
			this.gxp *= this.mult;
			var arr = allies.filter(a => a.type == "tower");
			var xp = 10*this.gxp/arr.length;
			arr.forEach(a => {
				a.xp += xp;
				while(a.xp > a.lxp) a.levelup();
			});
			money += floor(this.gxp);
			totalMoney += floor(this.gxp);
		}else{
			money += floor(this.mult);
		}
	}
	shoot(r) {
		if(!this.lastShot) {
			var bullet = new Bullet(this, r);
			bullet.hit = what => this.hit(what);
			enemies.push(bullet);
			this.lastShot = this.fireRate;
		}
		this.rot = r;
	}
	constructor() {
		super();
		this.y = (GAME_HEIGHT-this.s)/2;
	}
	switch(toPhase, atTime) {
		if(this.time >= atTime) {
			this.phase = toPhase;
			this.time -= atTime;
		}
	}
	draw() {
		if(this.lastShot) {
			var s = this.s/2;
			ctx.lineWidth = 2/scale;
			ctx.strokeStyle = this.c;
			ctx.fillStyle = this.c;
			var y = this.y-s*2;

			ctx.strokeRect(this.x-s, y, s*4, s);
			ctx.fillRect(this.x-s, y, s*4*(1-this.lastShot/this.fireRate), s);
		}
		var {rot, x, y, s} = this;
		var mx = x+s/2;
		var my = y+s/2;
		
		ctx.save();
		ctx.translate(mx, my);
		ctx.rotate(rot);
		ctx.translate(-mx, -my);
		{
			ctx.fillStyle = this.c;
			var s = this.s/4;
			ctx.fillRect(this.x+s*2, this.y+s, s*4, s*2);
		}
		ctx.restore();
		super.draw();
	}
	tick() {
		this.lastShot = round(this.lastShot);
		if(this.lastShot) {
			this.lastShot -= ms;
			if(this.lastShot < 0) this.lastShot = 0;
		}
		this.time += ms;
		switch(this.phase) {
			case 0:
				this.ax = -this.spd;
				this.range = 25;
				this.shots = 10;
				this.switch(1, 3000);

				delete this.target;
				this.DIS = this.range*this.range;
				this.ignore = [];
			break;
			case 1:
				if(this.target) {
					var r = Entity.radian(this, this.target);
					var rd = rDis(r, this.rot);
					var uni = PI*ps/50;
					this.rd = rd;
					if(abs(rd) > uni) {
						this.rot -= sign(rd)*uni;
					}else{
						this.shoot(r);

						this.ignore.push(this.target);
						delete this.target;
						this.DIS = this.range*this.range;
						--this.shots;
					}
				}else if(this.ignore.length) {
					this.ignore = [];
				}
				if(this.shots == 0 || this.time > 10000) {
					this.phase = 2;
					this.time = 0;
				}
			break;
			case 2:
				var r = PI;
				var rd = rDis(r, this.rot);
				var uni = PI*ps/30;
				this.rd = rd;
				if(abs(rd) > uni) {
					this.rot -= sign(rd)*uni;
				}else{
					var o = rand(PI2);
					for(let i = 0; i < 3; i++) {
						var enemy = new Shooter;
						Bullet.position(enemy, this);
						enemy.spd *= 3/4;
						enemy.vx = sin(i*PI2/3+o)*1.2;
						enemy.vy = cos(i*PI2/3+o)*1.2;
						enemy.c = this.c;
						enemy.doLevelups();
						enemies.push(enemy);
					}
					this.phase = 3;
					this.time = 0;
				}
			break;
			case 3:
				this.ax = -this.spd;
				this.range = 25;
				this.shots = 10;
				this.switch(1, 1000);

				delete this.target;
				this.DIS = this.range*this.range;
				this.ignore = [];
			break;
		}
	}
	register(enemy) {
		if(this.ignore?.includes(enemy)) return;
		if(enemy.type != "tower") return;

		var dis = Entity.rawDistance(this, enemy) - (enemy.s*enemy.s);
		if(dis < this.DIS) {
			this.DIS = dis;
			this.target = enemy;
		}
	}
}

class Particle extends Entity{
	constructor() {
		super();
		this.rot = rand(PI2);
		this.r   = rand(PI2);
	}
	s = .5;
	spd = .03;
	time = 300;
	f = 0.03;
	tick() {
		if(!this.maxTime) {
			this.maxTime = this.time;
			if(this.time < msTillFrame) {
				this.dead = 1;
			}
		}
		this.rot += 0.1*ps;
		this.ax += cos(this.r)*this.spd;
		this.ay += sin(this.r)*this.spd;
		if(this.time > 0) {
			this.time -= ms;
		}
		if(this.time <= 0) {
			this.dead = 1;
		}
	}
	draw() {
		if(this.time <= 0) return;
		
		var {rot, x, y, s} = this;
		var mx = x+s/2;
		var my = y+s/2;
		ctx.save();
		ctx.translate(mx, my);
		ctx.rotate(rot);
		ctx.translate(-mx, -my);
		ctx.globalAlpha = this.time/this.maxTime;
		super.draw();
		ctx.globalAlpha = 1;
		ctx.restore();
	}
	screenlock() {
		var {x, y, s} = this;
		var w = GAME_WIDTH+s;
		var h = GAME_HEIGHT+s;

		if(x < -s) this.dead = 1;
		if(y < -s) this.dead = 1;
		if(x > w) this.dead = 1;
		if(y > h) this.dead = 1;
	}
}
class TextParticle extends Particle{
	constructor(text, c) {
		super();
		this.text = text;
		this.r = PI/2;
		if(c) this.c = c;
	}
	s = 1;
	c = 'red';
	draw() {
		ctx.font = this.s+'px Arial';
		var wid = ctx.measureText(this.text).width/2;
		ctx.fillStyle = this.c;
		ctx.fillText(this.text, this.x-wid, this.y);
	}
	tick() {
		if(!this.maxTime) {
			this.maxTime = this.time;
			if(this.time < msTillFrame) {
				this.dead = 1;
			}
		}
		if(this.time > 0) {
			this.time -= ms;
		}
		if(this.time <= 0) {
			this.dead = 1;
		}
		this.y -= this.spd*ps;
	}
}

var enemySets = [
	[{
		value: Runner,
		weight: 5
	}, {
		value: FastRunner,
		weight: 2
	}, {
		value: PowerRunner,
		weight: 1
	}],
	[{
		value: Runner,
		weight: 5
	}, {
		value: SpeedyRunner,
		weight: 1
	}, {
		value: FastRunner,
		weight: 5
	}, {
		value: PowerRunner,
		weight: 3
	}],
	[{
		value: SpeedyRunner,
		weight: 5
	}, {
		value: FastRunner,
		weight: 10
	}, {
		value: Swerve,
		weight: 2
	}, {
		value: SuperRunner,
		weight: 2
	}],
	[{
		value: SpeedyRunner,
		weight: 5
	}, {
		value: FastRunner,
		weight: 2
	}, {
		value: Swerve,
		weight: 2
	}, {
		value: SuperRunner,
		weight: 2
	}, {
		value: Shooter,
		weight: 5
	}]
];

var {sqrt, atan2: atan, cos, sin, min, abs, PI, floor, max, ceil, sign, round} = Math;
var PI2 = PI*2;
var rand = (max=1, min=0) => Math.random()*(max-min)+min;
var dist = (x, y) => sqrt(x*x + y*y);
var rawDist = (x, y) => (x*x + y*y);

var loop = (value, max) => (value % max + max) % max;
var rotate = (value, range) => {
    if(value > +range/2) value -= range;
    if(value < -range/2) value += range;
    return value;
};
var rDis = (a, b, c=(PI * 2)) => rotate(loop(b - a, c), c);

var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");

function getLeft() {
	var unit = lastEnter/pulseTime;
	unit = abs(unit*2-1);
	var left = ctx.createLinearGradient(0, 0, 7, 0);
	left.addColorStop(0, `hsl(${240+unit*10}, ${66*BASE_HEALTH/BASE_MAX_HEALTH}%, ${50+unit*10}%)`);
	left.addColorStop(1, `hsla(${240+unit*10}, ${66*BASE_HEALTH/BASE_MAX_HEALTH}%, 25%, 0)`);
	return left;
}
function getLeftCol() {
	return `hsl(${240}, ${66*BASE_HEALTH/BASE_MAX_HEALTH}%, 50%)`;
}

function getRight() {
	var boss = +(wave == 20 || wave == 19);
	var unit = lastSpawn/pulseTime;
	unit = 1-abs(unit*2-1);
	var right = ctx.createLinearGradient(GAME_WIDTH-7, 0, GAME_WIDTH, 0);
	right.addColorStop(0, `hsla(${265*boss}, 100%, 25%, 0)`);
	right.addColorStop(1, `hsl(${265*boss+unit*10}, 100%, ${50+unit*10}%)`);
	return right
}
function getRightCol() {
	var boss = +(wave == 20 || wave == 19);
	return `hsl(${265*boss}, 100%, 50%)`;
}

var block = ctx.createLinearGradient(0, 0, GAME_WIDTH, 0);
block.addColorStop(0, "#55f");
block.addColorStop(1, "#f00");

onload = () => {
	document.body.appendChild(canvas);
	// allies.push(new Player);
	onresize();
	lastFrame = Date.now();
	hotbar.push(ShooterTower, PushTower, SpikeTower, Bomb);
	if(tutorial) {
		buttons.push(new TowerButton(-1), new TowerButton(0));
		var tower = new ShooterTower;
		tower.x = 7;
		tower.y = 15;
		tower.hp = 1;
		allies.push(tower);
	}else{
		buttons.push(new TowerButton(-1), new TowerButton(0), new TowerButton(1), new TowerButton(2), new TowerButton(3), new StartWave());
	}
	frame();
};
onresize = () => {
	canvas.width = innerWidth;
	canvas.height = innerHeight;
	scale = min(innerWidth/GAME_WIDTH, innerHeight/GAME_HEIGHT);
	game_ox = (innerWidth-GAME_WIDTH*scale)/2;
	game_oy = (innerHeight-GAME_HEIGHT*scale)/2;
}
var IN_FOCUS = 1;
onblur = () => {
	keys.clear();
	IN_FOCUS = 0;
	cancelAnimationFrame(frame);
}
onfocus = () => {
	lastFrame = Date.now();
	keys.clear();
	IN_FOCUS = 1;
	requestAnimationFrame(frame);
}
onmousedown = ({button}) => {
	if(button == 0) keys.press("MouseLeft");
	if(button == 2) keys.press("MouseRight");
}
onmouseup = ({button}) => {
	if(button == 0) keys.release("MouseLeft");
	if(button == 2) keys.release("MouseRight");
}
var mouse_x = undefined, mouse_y = undefined;
var mouse_size = .35;
var mouse_hitbox = () => ({
	x: (mouse_x-mouse_size)||(-500),
	y: (mouse_y-mouse_size)||(-500),
	s: mouse_size*2
});
onmousemove = ({x, y, movementX, movementY}) => {
	if (document.pointerLockElement === canvas) {
		mouse_x += movementX/scale;
		mouse_y += movementY/scale;
	}else{
		mouse_x = (x-game_ox)/scale;
		mouse_y = (y-game_oy)/scale;
	}
};
onmouseout = ({x, y}) => {
	mouse_x = undefined;
	mouse_y = undefined;
};
oncontextmenu = e => {
	e.preventDefault();

	// canvas.requestPointerLock();
}

var keys = new (class Keys extends Map{
	press(key) {
		if(!super.get(key)) {
			super.set(key, 1);
		}else
		if(super.get(key) > 1) {
			super.set(key, 3);
		}
	}
	use(key, ver=3) {
		if(this.check(key, ver)) {
			super.set(key, 2);
			return 1;
		}
		return 0;
	}
	release(key) {
		super.delete(key);
	}
	get(key) {
		/**@type {number}*/
		var value = super.get(key);
		return value;
	}
	//0 - check if the key isn't pressed
	//1 - check if the key is pressed and unused
	//2 - check if the key is down
	//3 - check if the key is pressed and unused (includes auto-repress)
	check(key, ver=2) {
		if(ver == 0) return !super.get(key);
		if(ver == 1) return super.get(key) == 1;
		if(ver == 2) return super.get(key);
		if(ver == 3) return super.get(key) & 1;
	}
});

/**@param {{weight: number, value: any}[]} items*/
function weight(...items) {
	var max = 0;
	for(let item of items) {
		max += item.weight;
	}
	var num = rand(max);
	var weight = 0;
	for(let item of items) {
		weight += item.weight;
		if(num < weight) {
			return item.value;
		}
	}
}

var prevent = ["Tab"]
onkeydown = e => {
	if(prevent.includes(e.code)) {
		e.preventDefault();
	}
	keys.press(e.code);
}
onkeyup = ({code}) => keys.release(code);

