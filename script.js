const FRAME = 20;
var ms=0, ps=0;
var gameTime = 0;
function frame() {
	// setTimeout(frame, 100);
	requestAnimationFrame(frame);
	ms = Date.now()-lastFrame;
	lastFrame = Date.now();

	let MS = ms;
	while(MS) {
		ms = min(MS, 1);
		ps = ms/FRAME;

		++gameTime;
		doFrame();
		MS -= ms;
	}

	ctx.save();
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.translate(game_ox, game_oy);
	ctx.scale(scale, scale);

	for(let i = allies.length-1; i >= 0; --i) {
		let ally = allies[i];
		ally.draw();
	}
	for(let enemy of enemies) {
		enemy.draw();
	}
	
	ctx.fillStyle = "black";
	var h = (innerHeight/scale - GAME_HEIGHT)/2;
	ctx.fillRect(-game_ox/scale, -game_oy/scale, innerWidth/scale, h-2);
	ctx.fillRect(-game_ox/scale, GAME_HEIGHT, innerWidth/scale, h);
	var n = 2/scale;
	ctx.lineWidth = n;
	ctx.strokeStyle = block;
	ctx.strokeRect(-n, -n, GAME_WIDTH+2*n, GAME_HEIGHT+2*n);
	
	ctx.fillStyle = getLeft();
	ctx.fillRect(-game_ox/scale, -game_oy/scale, innerWidth/scale, innerHeight/scale);
	ctx.fillStyle = getRight();
	ctx.fillRect(-game_ox/scale, -game_oy/scale, innerWidth/scale, innerHeight/scale);
	
	{
		ctx.fillStyle = keys.check("MouseLeft") ? "#e00": "#77f";
		var a = .2;
		var b = .4;
		var mx = (mouse_x-game_ox)/scale;
		var my = (mouse_y-game_oy)/scale;

		// var [player] = allies;
		// if(player) {
		// 	var s = player.s/2;
		// 	ctx.strokeStyle = "#55f";
		// 	ctx.lineWidth = .1;
		// 	ctx.beginPath();
		// 	ctx.moveTo(player.x+s, player.y+s);
		// 	ctx.lineTo(mx, my);
		// 	ctx.stroke();
		// }

		ctx.fillRect(mx-a, my-a, b, b);
	}
	

	ctx.font = `1px Arial`;
	ctx.fillStyle = 'white';
	ctx.fillText(points, 0, 1);

	allies  =  allies.filter(a => !a.dead);
	enemies = enemies.filter(a => !a.dead);
	ctx.restore();
}
function randomEnemy() {
	return weight({
		weight: 2,
		value: FastRunner
	}, {
		weight: 2,
		value: Swerve
	}, {
		weight: 5,
		value: Runner
	}, {
		weight: 2,
		value: PowerRunner
	}, {
		weight: .3,
		value: SpeedyRunner
	}, {
		weight: .15,
		value: SuperRunner
	});
}
var pointMax = 10;
var points = pointMax;
function doFrame() {
	if(lastSpawn) --lastSpawn;
	if(lastEnter) --lastEnter;

	if(gameTime % 10000 == 0) {
		points += pointMax;
	}
	for(let ally of allies) {
		ally.frame();
	}
	for(let enemy of enemies) {
		enemy.frame();
	}
	if(gameTime % 20 == 0) {
		if(rand() < .1 * ((points/pointMax)**3)) {
			var enemy = randomEnemy();
			enemies.push(new enemy);
			lastSpawn = pulseTime;
			points -= 1;
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
			if(Entity.isTouching(ally, enemy)) {
				ally.hit(enemy);
				enemy.hit(ally);
			}
		}
	}
}
var enemies = [];
var allies = [];
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
	hitbox = [this];
	hit(what) {
		what.hp -= this.atk;
		what.deadCheck();
	}
	deadCheck() {
		if(this.hp <= 0) {
			this.dead = 1;
		}
	}
	draw() {
		if(this.hp < this.xhp) {
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
    static hitbox(a, b) {
        return a.x + a.s > b.x
            && b.x + b.s > a.x
            && a.y + a.s > b.y
            && b.y + b.s > a.y
        ;
    };
	static isTouching(a, b) {
		for(let box of a.hitbox) {
			for(let bx of b.hitbox) {
				if(this.hitbox(box, bx)) {
					return 1;
				}
			}
		}
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
	spd = 0.13;
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

		if(this.lastShot) --this.lastShot;
		else{
			var mx = 0, my = 0;
			if(keys.check("ArrowRight")) ++mx;
			if(keys.check("ArrowLeft")) --mx;
			if(keys.check("ArrowDown")) ++my;
			if(keys.check("ArrowUp")) --my;

			if(keys.check("MouseLeft")) {
				let Mx = (mouse_x-game_ox)/scale;
				let My = (mouse_y-game_oy)/scale;
				let s = this.s/2;

				mx -= this.x + s - Mx;
				my -= this.y + s- My;
			}
			
			if(mx || my) {
				var mr = atan(my, mx);
				allies.push(new Bullet(this, mr));
				this.lastShot = 300;
			}
		}
	}
}
class Bullet extends Entity{
	c = "#55f";
	spd = 1;
	s = .5;
	time = 0;
	constructor(parent, r) {
		super();
		var s = (parent.s - this.s)/2;
		this.r = r;
		this.x = parent.x+s;
		this.y = parent.y+s;
	}
	tick() {
		this.ax += cos(this.r)*this.spd;
		this.ay += sin(this.r)*this.spd;
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
		this.x -= vx;
		this.y -= vy;
		var m = 20;
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

class Enemy extends Entity{
	x = GAME_WIDTH;
	spd = 0.03;
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
	}
}
class Runner extends Enemy{
	c = "#f22";
	tick() {
		this.ax -= this.spd;
	}
}
class FastRunner extends Runner{
	constructor() {
		super();
		this.spd *= 1.5;
	}
	c = "#f72";
}
class SpeedyRunner extends Runner{
	constructor() {
		super();
		this.spd *= 2;
	}
	c = "#ff5";
}
class SuperRunner extends Runner{
	constructor() {
		super();
		this.spd *= 2.5;
	}
	c = "#5ff";
}
class Swerve extends Enemy{
	constructor() {
		super();
		this.spd *= 1.2;
	}
	time = 0;
	tick() {
		++this.time;
		var m = 1000;
		var n = this.time % (m*2);
		n = abs(n - m);

		var r = n/m * PI + PI/2;
		this.ax = cos(r) * this.spd;
		this.ay = sin(r) * this.spd;
	}
	c = "#f5f";
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
}

var {sqrt, atan2: atan, cos, sin, min, abs, PI} = Math;
var rand = (max=1, min=0) => Math.random()*(max-min)+min;
var dist = (x, y) => sqrt(x**2 + y**2);

var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");

function getLeft() {
	var unit = lastEnter/pulseTime;
	unit = abs(unit*2-1);
	var left = ctx.createLinearGradient(0, 0, 7, 0);
	left.addColorStop(0, `hsl(${240+unit*10}, 66%, ${50+unit*10}%)`);
	left.addColorStop(1, "#0000");
	return left;
}

function getRight() {
	var unit = lastSpawn/pulseTime;
	unit = 1-abs(unit*2-1);
	var right = ctx.createLinearGradient(GAME_WIDTH-7, 0, GAME_WIDTH, 0);
	right.addColorStop(0, "#0000");
	right.addColorStop(1, `hsl(${unit*10}, 100%, ${50+unit*10}%)`);
	return right
}

var block = ctx.createLinearGradient(0, 0, GAME_WIDTH, 0);
block.addColorStop(0, "#55f");
block.addColorStop(1, "#f00");

onload = () => {
	document.body.appendChild(canvas);
	allies.push(new Player);
	onresize();
	lastFrame = Date.now();
	frame();
};
onresize = () => {
	canvas.width = innerWidth;
	canvas.height = innerHeight;
	scale = min(innerWidth/GAME_WIDTH, innerHeight/GAME_HEIGHT);
	game_ox = (innerWidth-GAME_WIDTH*scale)/2;
	game_oy = (innerHeight-GAME_HEIGHT*scale)/2;
}
onfocus = () => {
	lastFrame = Date.now();
	keys.clear();
}
onmousedown = ({button}) => {
	if(button == 0) keys.press("MouseLeft");
}
onmouseup = ({button}) => {
	if(button == 0) keys.release("MouseLeft");
}
var mouse_x = 0, mouse_y = 0;
onmousemove = ({x, y, movementX, movementY}) => {
	if (document.pointerLockElement === canvas) {
		mouse_x += movementX;
		mouse_y += movementY;
	}else{
		mouse_x = x;
		mouse_y = y;
	}
};
onmouseleave = () => {
	mouse_x = undefined;
	mouse_y = undefined;
};
oncontextmenu = e => {
	e.preventDefault();

	canvas.requestPointerLock();
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
	use(key) {
		if(super.get(key)) {
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
	//2 - check if the key is held
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

onkeydown = ({code}) => keys.press(code);
onkeyup = ({code}) => keys.release(code);

