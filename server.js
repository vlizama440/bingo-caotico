'use strict';
const express=require('express');
const http=require('http');
const WebSocket=require('ws');
const crypto=require('crypto');
const path=require('path');
const app=express(),server=http.createServer(app);
const wss=new WebSocket.Server({server,maxPayload:4096});
const PORT=process.env.PORT||3000,MAX_PLAYERS=50;
app.disable('x-powered-by');
app.get('/',(_,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.get('/health',(_,res)=>res.status(200).send('ok'));
const sessions=new Map(),clients=new WeakMap();
const randomCard=()=>{const cols=[];for(let col=0;col<5;col++){const arr=Array.from({length:15},(_,i)=>col*15+i+1);for(let j=arr.length-1;j>0;j--){const k=crypto.randomInt(j+1);[arr[j],arr[k]]=[arr[k],arr[j]];}cols.push(arr.slice(0,5));}return Array.from({length:25},(_,i)=>i===12?0:cols[i%5][Math.floor(i/5)]);};
const patterns=[...Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>r*5+c)),...Array.from({length:5},(_,c)=>Array.from({length:5},(_,r)=>r*5+c)),[0,6,12,18,24],[4,8,12,16,20]];
const send=(ws,data)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));};
const publicPlayer=p=>({id:p.token,name:p.name,connected:p.ws?.readyState===WebSocket.OPEN,lines:p.lines,bingo:p.bingo});
function broadcast(s){const base={type:'state',room:s.code,started:s.started,last:s.drawn.at(-1)||null,players:s.players.size,maxPlayers:MAX_PLAYERS,winners:s.winners,gameOver:s.gameOver,spinning:s.spinning};send(s.host,{...base,drawn:s.drawn,role:'host',members:[...s.players.values()].map(publicPlayer)});for(const p of s.players.values())send(p.ws,{...base,role:'player',name:p.name,card:p.card,marked:p.marked,lines:p.lines,bingo:p.bingo,color:p.color,chip:p.chip});}
function validated(p,s){const drawn=new Set(s.drawn),marks=new Set(p.marked);return i=>p.card[i]===0||(drawn.has(p.card[i])&&marks.has(i));}
function report(p,s,kind){const valid=validated(p,s);if(kind==='card'){const missing=p.card.map((num,i)=>({num,i})).filter(({i})=>!valid(i));return {type:'checkResult',kind,name:p.name,valid:missing.length===0,completed:missing.length===0?1:0,missing:missing.map(x=>x.num),missingCount:missing.length};}const completed=patterns.filter(line=>line.every(valid));const closest=patterns.map(line=>line.filter(i=>!valid(i))).sort((a,b)=>a.length-b.length)[0];return {type:'checkResult',kind,name:p.name,valid:completed.length>0,completed:completed.length,missing:closest.map(i=>p.card[i]),missingCount:closest.length};}
function checkWins(p,s){const nr=patterns.filter(line=>line.every(validated(p,s))).length;if(nr>p.lines)s.winners.push({kind:'line',name:p.name,count:nr-p.lines,draw:s.drawn.length});p.lines=nr;if(!p.bingo&&p.card.every((_,i)=>validated(p,s)(i))){p.bingo=true;s.winners.push({kind:'bingo',name:p.name,draw:s.drawn.length});s.gameOver=true;}}
function finishSpin(s){if(!s.spinning||s.pendingNumber===null)return;clearTimeout(s.spinTimer);s.spinTimer=null;const n=s.pendingNumber;s.pendingNumber=null;s.spinning=false;s.drawn.push(n);for(const p of s.players.values())checkWins(p,s);broadcast(s);}
function handle(ws,msg){if(!msg||typeof msg!=='object')return;const t=msg.type;
 if(t==='create'){if(sessions.size>=850)return send(ws,{type:'error',message:'Hay demasiadas salas activas'});let code;do{code=String(crypto.randomInt(100,1000));}while(sessions.has(code));const token=crypto.randomBytes(24).toString('hex');const s={code,token,host:ws,players:new Map(),drawn:[],started:false,winners:[],gameOver:false,spinning:false,spinTimer:null,pendingNumber:null};sessions.set(code,s);clients.set(ws,{room:code,role:'host',token});send(ws,{type:'created',room:code,token});broadcast(s);return;}
 if(t==='resumeHost'){const s=sessions.get(String(msg.room||''));if(!s||s.token!==msg.token)return send(ws,{type:'error',message:'No se pudo recuperar esta sala'});s.host=ws;clients.set(ws,{room:s.code,role:'host',token:s.token});broadcast(s);return;}
 if(t==='join'){const s=sessions.get(String(msg.room||''));const name=String(msg.name||'').trim().slice(0,24);if(!s)return send(ws,{type:'error',message:'Sala no encontrada'});if(s.started)return send(ws,{type:'error',message:'La partida ya comenzó'});if(!name)return send(ws,{type:'error',message:'Escribe tu nombre'});if([...s.players.values()].some(p=>p.name.toLowerCase()===name.toLowerCase()))return send(ws,{type:'error',message:'Ese nombre ya está en uso'});if(s.players.size>=MAX_PLAYERS)return send(ws,{type:'error',message:'La sala está llena'});const token=crypto.randomBytes(24).toString('hex');const p={token,name,card:randomCard(),marked:[12],ws,lines:0,bingo:false,color:'violet',chip:'bean'};s.players.set(token,p);clients.set(ws,{room:s.code,role:'player',token});send(ws,{type:'joined',room:s.code,token});broadcast(s);return;}
 if(t==='resume'){const s=sessions.get(String(msg.room||'')),p=s?.players.get(String(msg.token||''));if(!p)return send(ws,{type:'error',message:'No se pudo recuperar tu cartón'});p.ws=ws;clients.set(ws,{room:s.code,role:'player',token:p.token});broadcast(s);return;}
 const info=clients.get(ws);if(!info)return send(ws,{type:'error',message:'Primero debes entrar a una sala'});const s=sessions.get(info.room);if(!s)return;
 if(info.role==='host'&&s.host===ws){
  if(t==='start'){if(s.started)return;if(s.players.size<1)return send(ws,{type:'error',message:'Debe haber al menos un jugador'});s.started=true;broadcast(s);}
  else if(t==='draw'){if(!s.started||s.gameOver||s.spinning)return;const left=Array.from({length:75},(_,i)=>i+1).filter(n=>!s.drawn.includes(n));if(!left.length)return;s.pendingNumber=left[crypto.randomInt(left.length)];s.spinning=true;broadcast(s);s.spinTimer=setTimeout(()=>finishSpin(s),2000);}
  else if(t==='stop'){if(!s.spinning)return;finishSpin(s);}
  else if(t==='check'){const p=s.players.get(String(msg.playerId||''));if(!p)return send(ws,{type:'error',message:'Jugador no encontrado'});const kind=msg.kind==='card'?'card':'line';send(ws,report(p,s,kind));}
  else if(t==='reset'){if(s.spinning)return send(ws,{type:'error',message:'Espera a que termine el sorteo'});s.drawn=[];s.started=false;s.gameOver=false;s.winners=[];for(const p of s.players.values()){p.card=randomCard();p.marked=[12];p.lines=0;p.bingo=false;}broadcast(s);}
  return;
 }
 if(info.role==='player'){const p=s.players.get(info.token);if(!p||p.ws!==ws)return;
  if(t==='shuffle'){if(s.started)return send(ws,{type:'error',message:'No puedes cambiar el cartón una vez iniciada la partida'});p.card=randomCard();p.marked=[12];broadcast(s);return;}
  if(t==='style'){if(s.started)return;if(['violet','blue','rose','green','orange'].includes(msg.color))p.color=msg.color;if(['bean','lentil','blue'].includes(msg.chip))p.chip=msg.chip;broadcast(s);return;}
  if(t==='mark'){if(!s.started||s.gameOver)return;const i=Number(msg.index);if(!Number.isInteger(i)||i<0||i>=25||i===12)return;if(p.marked.includes(i))p.marked=p.marked.filter(x=>x!==i);else p.marked.push(i);checkWins(p,s);broadcast(s);return;}
 }
}
wss.on('connection',ws=>{ws.on('message',raw=>{try{handle(ws,JSON.parse(raw.toString()))}catch(err){send(ws,{type:'error',message:'Mensaje inválido'})}});ws.on('close',()=>{const info=clients.get(ws);if(!info)return;const s=sessions.get(info.room);if(!s)return;if(info.role==='player'){const p=s.players.get(info.token);if(p?.ws===ws)p.ws=null;}if(info.role==='host'&&s.host===ws)s.host=null;broadcast(s);});});
server.listen(PORT,()=>console.log(`Bingo en puerto ${PORT}`));
