'use strict';
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, maxPayload: 4096 });
const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 40;
app.disable('x-powered-by');
app.use(express.static('public'));
app.get('/health', (_, res) => res.status(200).send('ok'));
const sessions = new Map();
const clients = new WeakMap();
const code = () => String(crypto.randomInt(100000, 999999));
const pick = (arr, n) => {const a = [...arr]; for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];} return a.slice(0,n)};
function card(){ const c=[]; for(let col=0;col<5;col++){ const pool=Array.from({length:15},(_,i)=>col*15+i+1); c.push(pick(pool,5)); } const cells=Array.from({length:25},(_,i)=>i===12?0:c[i%5][Math.floor(i/5)]); return cells; }
function send(ws,data){ if(ws && ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(data)); }
function broadcast(s){ const base={type:'state',room:s.code,started:s.started,drawn:s.drawn,last:s.drawn.at(-1)||null,players:s.players.size,maxPlayers:MAX_PLAYERS,winners:s.winners,gameOver:s.gameOver}; send(s.host,{...base,role:'host',members:[...s.players.values()].map(p=>({name:p.name, connected:!!(p.ws && p.ws.readyState===WebSocket.OPEN), lines:p.lines, bingo:p.bingo}))}); for(const p of s.players.values())send(p.ws,{...base,role:'player',name:p.name,card:p.card,marked:p.marked,lines:p.lines,bingo:p.bingo,token:p.token}); }
function linesOf(p,s){ const marks=new Set(p.marked); const drawn=new Set(s.drawn); const ok=i=>p.card[i]===0 || (drawn.has(p.card[i])&&marks.has(i));const patterns=[];for(let r=0;r<5;r++)patterns.push(Array.from({length:5},(_,c)=>r*5+c));for(let c=0;c<5;c++)patterns.push(Array.from({length:5},(_,r)=>r*5+c));patterns.push([0,6,12,18,24],[4,8,12,16,20]);return patterns.filter(line=>line.every(ok)).length;}
function handle(ws,msg){if(!msg||typeof msg!=='object')return; const t=msg.type;
  if(t==='create'){ let room=code();while(sessions.has(room))room=code(); const token=crypto.randomBytes(24).toString('hex');const s={code:room,token,host:ws,players:new Map(),drawn:[],started:false,winners:[],gameOver:false};sessions.set(room,s);clients.set(ws,{room,role:'host',token});send(ws,{type:'created',room,token});broadcast(s);return;}
  if(t==='resumeHost'){const s=sessions.get(String(msg.room||''));if(!s || s.token!==msg.token)return send(ws,{type:'error',message:'No se pudo recuperar esta sala'});s.host=ws;clients.set(ws,{room:s.code,role:'host',token:s.token});broadcast(s);return;}
  if(t==='join'){const s=sessions.get(String(msg.room||''));const name=String(msg.name||'').trim().slice(0,24);if(!s)return send(ws,{type:'error',message:'Sala no encontrada'});if(s.started)return send(ws,{type:'error',message:'La partida ya comenzó'});if(!name)return send(ws,{type:'error',message:'Escribe tu nombre'});if([...s.players.values()].some(p=>p.name.toLowerCase()===name.toLowerCase()))return send(ws,{type:'error',message:'Ese nombre ya está en uso'});if(s.players.size>=MAX_PLAYERS)return send(ws,{type:'error',message:'La sala está llena'});const token=crypto.randomBytes(24).toString('hex');const p={token,name,card:card(),marked:[12],ws,lines:0,bingo:false};s.players.set(token,p);clients.set(ws,{room:s.code,role:'player',token});send(ws,{type:'joined',room:s.code,token});broadcast(s);return;}
  if(t==='resume'){const s=sessions.get(String(msg.room||''));const p=s?.players.get(String(msg.token||''));if(!p)return send(ws,{type:'error',message:'No se pudo recuperar tu cartón'});p.ws=ws;clients.set(ws,{room:s.code,role:'player',token:p.token});broadcast(s);return;}
  const info=clients.get(ws);if(!info)return send(ws,{type:'error',message:'Primero debes entrar a una sala'});const s=sessions.get(info.room);if(!s)return;
  if(info.role==='host' && s.host===ws){if(t==='start'){if(s.players.size<1)return send(ws,{type:'error',message:'Debe haber al menos un jugador'});s.started=true;broadcast(s);}else if(t==='draw'){if(!s.started||s.gameOver)return;const left=Array.from({length:75},(_,i)=>i+1).filter(n=>!s.drawn.includes(n));if(!left.length)return;s.drawn.push(left[crypto.randomInt(left.length)]);broadcast(s);}else if(t==='reset'){s.drawn=[];s.started=false;s.gameOver=false;s.winners=[];for(const p of s.players.values()){p.card=card();p.marked=[12];p.lines=0;p.bingo=false;}broadcast(s);}return;}
  if(info.role==='player'){const p=s.players.get(info.token);if(!p||p.ws!==ws||!s.started||s.gameOver)return;if(t==='mark'){const i=Number(msg.index);if(!Number.isInteger(i)||i<0||i>=25||i===12)return;const n=p.card[i];if(!s.drawn.includes(n))return send(ws,{type:'error',message:'Ese número todavía no ha salido'});if(p.marked.includes(i))p.marked=p.marked.filter(x=>x!==i);else p.marked.push(i);const old=p.lines;p.lines=linesOf(p,s);if(p.lines>old)s.winners.push({kind:'line',name:p.name,count:p.lines-atLeast(old,0),draw:s.drawn.length});const full=p.card.every((v,j)=>v===0||(s.drawn.includes(v)&&p.marked.includes(j)));if(full&&!p.bingo){p.bingo=true;s.winners.push({kind:'bingo',name:p.name,draw:s.drawn.length});s.gameOver=true;}broadcast(s);}}
}
function atLeast(a,b){return Math.max(a,b)}
wss.on('connection',ws=>{ws.on('message',raw=>{try{handle(ws,JSON.parse(raw.toString()))}catch(e){send(ws,{type:'error',message:'Mensaje inválido'})}});ws.on('close',()=>{const info=clients.get(ws);if(!info)return;const s=sessions.get(info.room);if(!s)return;if(info.role==='player'){const p=s.players.get(info.token);if(p && p.ws===ws)p.ws=null;}if(info.role==='host'&&s.host===ws)s.host=null;broadcast(s);});});
server.listen(PORT,()=>console.log(`Bingo en http://localhost:${PORT}`));
