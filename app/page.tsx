/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./game.css";

type Resource = { wood:number; stone:number; food:number; mana:number; folk:number };
type Kind = "cottage"|"farm"|"lumber"|"quarry"|"well"|"shrine"|"market"|"tower";
type Tool = Kind|"demolish";
type Building = { id:number; kind:Kind; x:number; y:number; level:number };
type Save = { resources:Resource; buildings:Building[]; day:number; renown:number; chapter:number };

const COLS=12, ROWS=8, SAVE_KEY="glimmerglen-save-v2";
const BUILDINGS:Record<Kind,{name:string;icon:string;cost:Partial<Resource>;hint:string;unlock:number;refund:Partial<Resource>}>= {
  cottage:{name:"Moss Cottage",icon:"⌂",cost:{wood:16,stone:6},refund:{wood:8,stone:3},hint:"Homes 2 folk · uses 1 food",unlock:1},
  farm:{name:"Moonwheat Field",icon:"≋",cost:{wood:10},refund:{wood:5},hint:"4 food · doubled by magic",unlock:1},
  lumber:{name:"Forester Lodge",icon:"♧",cost:{wood:8,stone:3},refund:{wood:4,stone:1},hint:"4 wood · +2 by forest",unlock:1},
  quarry:{name:"Stonecircle",icon:"◆",cost:{wood:10},refund:{wood:5},hint:"3 stone · +2 by crags",unlock:1},
  well:{name:"Wishing Well",icon:"◉",cost:{stone:14},refund:{stone:7},hint:"Adds 2 food to close farms",unlock:1},
  shrine:{name:"Bloom Shrine",icon:"✦",cost:{wood:18,stone:12},refund:{wood:9,stone:6},hint:"2 mana · enchants nearby land",unlock:1},
  market:{name:"Lantern Market",icon:"¤",cost:{wood:24,stone:10},refund:{wood:12,stone:5},hint:"Raises joy near cottages",unlock:2},
  tower:{name:"Starwatch Tower",icon:"☾",cost:{stone:28,mana:12},refund:{stone:14},hint:"5 mana · raises renown",unlock:3},
};
const START_BUILDINGS:Building[]=[{id:1,kind:"cottage",x:5,y:4,level:1},{id:2,kind:"farm",x:4,y:4,level:1},{id:3,kind:"lumber",x:3,y:2,level:1}];
const INITIAL:Resource={wood:52,stone:30,food:38,mana:0,folk:4};
const terrain:Record<string,"forest"|"crag"|"pond">={"0,0":"forest","1,0":"forest","0,1":"forest","6,0":"forest","2,6":"forest","2,7":"forest","3,7":"forest","10,0":"crag","11,0":"crag","11,1":"crag","9,6":"crag","10,6":"crag","10,7":"crag","11,7":"crag","1,5":"pond"};
const seasons=[{name:"Dewspring",food:1.2,wood:1},{name:"Suncrest",food:1.35,wood:.9},{name:"Amberfall",food:1,wood:1.3},{name:"Frostwane",food:.7,wood:1}];
const chapters=[
  {name:"Wake the sleeping vale",copy:"Build a home where magic and mortal craft flourish together.",goals:[["Welcome 10 folk","folk",10],["Store 60 food","food",60],["Gather 20 mana","mana",20]] as const},
  {name:"Light the woodland roads",copy:"A true town needs fellowship, trade, and warm lanterns after dusk.",goals:[["Welcome 16 folk","folk",16],["Earn 12 renown","renown",12],["Raise a Lantern Market","market",1]] as const},
  {name:"Read the crown of stars",copy:"Build a landmark worthy of the old stories and make the valley sing.",goals:[["Raise a Starwatch Tower","tower",1],["Gather 50 mana","mana",50],["Reach 85 joy","joy",85]] as const},
];

const key=(x:number,y:number)=>`${x},${y}`;
const near=(a:{x:number;y:number},b:{x:number;y:number},r=2)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
const canPay=(r:Resource,c:Partial<Resource>)=>Object.entries(c).every(([k,v])=>r[k as keyof Resource]>=v!);

export default function Home(){
  const [resources,setResources]=useState(INITIAL),[buildings,setBuildings]=useState<Building[]>(START_BUILDINGS);
  const [tool,setTool]=useState<Tool>("farm"),[day,setDay]=useState(1),[paused,setPaused]=useState(false);
  const [message,setMessage]=useState("The glen is waiting. Choose a craft from the folio."),[event,setEvent]=useState("A soft rain has blessed the valley.");
  const [renown,setRenown]=useState(0),[chapter,setChapter]=useState(0),[inspect,setInspect]=useState<number|null>(null),[saved,setSaved]=useState(false),[ready,setReady]=useState(false);
  const [choice,setChoice]=useState<null|"merchant"|"spirit">(null),nextId=useRef(4);

  useEffect(()=>{try{const raw=localStorage.getItem(SAVE_KEY);if(raw){const s:Save=JSON.parse(raw);setResources(s.resources);setBuildings(s.buildings);setDay(s.day);setRenown(s.renown);setChapter(s.chapter);nextId.current=Math.max(...s.buildings.map(b=>b.id),0)+1;setMessage("Welcome back. The glen remembered your care.");}}catch{/* Ignore a damaged local chronicle and begin fresh. */}setReady(true)},[]);
  useEffect(()=>{if(!ready)return;const t=setTimeout(()=>{localStorage.setItem(SAVE_KEY,JSON.stringify({resources,buildings,day,renown,chapter}));setSaved(true);setTimeout(()=>setSaved(false),900)},600);return()=>clearTimeout(t)},[resources,buildings,day,renown,chapter,ready]);

  const season=seasons[Math.floor((day-1)/8)%4];
  const isMagic=useCallback((x:number,y:number)=>buildings.some(b=>b.kind==="shrine"&&near({x,y},b,2.3)),[buildings]);
  const counts=useMemo(()=>Object.fromEntries(Object.keys(BUILDINGS).map(k=>[k,buildings.filter(b=>b.kind===k).length])) as Record<Kind,number>,[buildings]);
  const joy=useMemo(()=>Math.max(20,Math.min(100,66+counts.shrine*3+counts.market*8+counts.well*2-(resources.food===0?35:0)-Math.max(0,resources.folk-(2+counts.cottage*2))*6)),[counts,resources]);
  const income=useMemo(()=>{let wood=1,stone=0,food=0,mana=0,glory=0;buildings.forEach(b=>{const lv=1+(b.level-1)*.5;if(b.kind==="lumber")wood+=(4+(b.x<4?2:0))*lv;if(b.kind==="quarry")stone+=(3+(b.x>8?2:0))*lv;if(b.kind==="farm")food+=(4+(isMagic(b.x,b.y)?4:0)+(buildings.some(w=>w.kind==="well"&&near(b,w,2))?2:0))*lv;if(b.kind==="shrine")mana+=2*lv;if(b.kind==="tower"){mana+=5*lv;glory+=1}if(b.kind==="cottage")food-=1});return{wood:Math.floor(wood*season.wood),stone:Math.floor(stone),food:Math.floor(food*season.food),mana:Math.floor(mana),glory}},[buildings,isMagic,season]);

  useEffect(()=>{if(paused||choice)return;const t=setInterval(()=>{setDay(d=>d+1);setResources(r=>{const food=Math.max(0,r.food+income.food);return{wood:r.wood+income.wood,stone:r.stone+income.stone,food,mana:r.mana+income.mana,folk:food===0&&r.folk>2?r.folk-1:r.folk}});if(income.glory)setRenown(v=>v+income.glory)},2400);return()=>clearInterval(t)},[paused,choice,income]);
  useEffect(()=>{if(day===7)setChoice("merchant");if(day===15)setChoice("spirit");if(day%8===1&&day>1)setEvent(`${season.name} settles over the valley. The harvest rhythm has changed.`)},[day,season.name]);

  const value=(metric:string)=>metric==="renown"?renown:metric==="joy"?joy:metric in counts?counts[metric as Kind]:resources[metric as keyof Resource];
  const chapterDone=chapters[chapter].goals.every(g=>value(g[1])>=g[2]);
  useEffect(()=>{if(chapterDone&&chapter<2){setChapter(c=>c+1);setRenown(r=>r+5);setEvent("A new chapter opens in the town chronicle.");setMessage("The valley has taken notice. New craft is now unlocked.")}},[chapterDone,chapter]);

  const act=(x:number,y:number)=>{
    const existing=buildings.find(b=>b.x===x&&b.y===y),land=terrain[key(x,y)];
    if(existing){if(tool==="demolish"){const refund=BUILDINGS[existing.kind].refund;setBuildings(bs=>bs.filter(b=>b.id!==existing.id));setResources(r=>{const n={...r};Object.entries(refund).forEach(([k,v])=>n[k as keyof Resource]+=v!);if(existing.kind==="cottage")n.folk=Math.max(2,n.folk-2);return n});setMessage(`${BUILDINGS[existing.kind].name} cleared. Half its materials were recovered.`);setInspect(null)}else setInspect(existing.id);return}
    if(tool==="demolish"){setMessage("Choose a building to clear.");return}if(land){setMessage(`${land==="forest"?"Ancient roots":land==="crag"?"Standing stones":"The mirror pond"} protect this patch.`);return}
    const item=BUILDINGS[tool];if(item.unlock>chapter+1){setMessage(`Complete chapter ${item.unlock-1} to unlock ${item.name}.`);return}if(!canPay(resources,item.cost)){setMessage(`You still need supplies for ${item.name}.`);return}
    setResources(r=>{const n={...r};Object.entries(item.cost).forEach(([k,v])=>n[k as keyof Resource]-=v!);if(tool==="cottage")n.folk+=2;return n});setBuildings(bs=>[...bs,{id:nextId.current++,kind:tool,x,y,level:1}]);setRenown(r=>r+(tool==="tower"?4:1));setMessage(`${item.name} raised.${tool==="shrine"?" The earth answers with green light.":""}`);
  };
  const selectedBuilding=buildings.find(b=>b.id===inspect);
  const upgrade=()=>{if(!selectedBuilding)return;const cost={wood:12*selectedBuilding.level,stone:8*selectedBuilding.level};if(!canPay(resources,cost)){setMessage("The guild needs more wood and stone for that improvement.");return}setResources(r=>({...r,wood:r.wood-cost.wood,stone:r.stone-cost.stone}));setBuildings(bs=>bs.map(b=>b.id===selectedBuilding.id?{...b,level:Math.min(3,b.level+1)}:b));setRenown(r=>r+2);setMessage(`${BUILDINGS[selectedBuilding.kind].name} improved to rank ${Math.min(3,selectedBuilding.level+1)}.`)};
  const castBloom=()=>{if(resources.mana<15){setMessage("The rite needs 15 mana.");return}setResources(r=>({...r,mana:r.mana-15,food:r.food+28}));setEvent("The Bloom Rite ripens every field beneath a silver-green dawn.");setMessage("The valley answers: +28 food.")};
  const choose=(option:number)=>{if(choice==="merchant"){if(option===0&&resources.wood>=15){setResources(r=>({...r,wood:r.wood-15,stone:r.stone+22}));setEvent("The road merchant trades bright stone for seasoned timber.")}else{setResources(r=>({...r,food:r.food+18}));setRenown(r=>r+2);setEvent("The merchant feasts with the town and spreads its good name.")}}else{if(option===0){setResources(r=>({...r,mana:r.mana+16}));setEvent("The brook spirit leaves moonlight pooled in the wishing wells.")}else{setResources(r=>({...r,food:r.food+24}));setEvent("Wild berry hedges rise along the woodland roads.")}}setChoice(null)};
  const restart=()=>{localStorage.removeItem(SAVE_KEY);setResources(INITIAL);setBuildings(START_BUILDINGS);setDay(1);setRenown(0);setChapter(0);setInspect(null);setChoice(null);nextId.current=4;setMessage("A new glen awakens.");setEvent("A soft rain has blessed the valley.")};
  const finalWin=chapter===2&&chapterDone;

  return <main className="game-shell">
    <header className="topbar"><div className="brand"><span className="crest">G</span><div><h1>Glimmerglen</h1><p>A tiny enchanted town</p></div></div><div className="resources" aria-label="Town resources"><Resource icon="♧" label="Wood" value={resources.wood} rate={income.wood}/><Resource icon="◆" label="Stone" value={resources.stone} rate={income.stone}/><Resource icon="❧" label="Food" value={resources.food} rate={income.food}/><Resource icon="✦" label="Mana" value={resources.mana} rate={income.mana}/><Resource icon="♟" label="Folk" value={resources.folk}/></div><div className="status-pair"><span className="autosave">{saved?"Chronicle saved":"Joy "+joy+"%"}</span><button className="day" onClick={()=>setPaused(p=>!p)} aria-label={paused?"Resume time":"Pause time"}><span>{season.name}</span><b>Day {day}</b><i>{paused?"▶":"Ⅱ"}</i></button></div></header>
    <section className="play-area">
      <aside className="build-panel"><div className="panel-title"><span>Builder’s folio</span><small>Choose a craft, then a meadow</small></div><div className="build-list">{(Object.keys(BUILDINGS) as Kind[]).map(kind=>{const b=BUILDINGS[kind],locked=b.unlock>chapter+1;return <button key={kind} disabled={locked} className={`build-card ${tool===kind?"selected":""} ${locked?"locked":""}`} onClick={()=>setTool(kind)}><span className={`building-icon ${kind}`}>{locked?"·":b.icon}</span><span className="build-copy"><b>{b.name}</b><small>{locked?`Unlocks in chapter ${b.unlock}`:b.hint}</small><em>{Object.entries(b.cost).map(([k,v])=>`${v} ${k}`).join(" · ")}</em></span></button>})}</div><button className={`demolish ${tool==="demolish"?"active":""}`} onClick={()=>setTool("demolish")}>× Clear a building</button><div className="tip"><b>Old glen wisdom</b><p>Foresters thrive west by the trees. Stonecircles thrive east by the crags.</p></div></aside>
      <div className="world-wrap"><div className="world-head"><div><span className="eyebrow">THE GREENWARD VALE · RENOWN {renown}</span><b>{message}</b></div><button className="spell" onClick={castBloom} disabled={resources.mana<15}>✦ Bloom Rite <small>15 mana</small></button></div><div className="map" style={{"--cols":COLS} as React.CSSProperties}>{Array.from({length:COLS*ROWS},(_,i)=>{const x=i%COLS,y=Math.floor(i/COLS),building=buildings.find(b=>b.x===x&&b.y===y),magic=isMagic(x,y),land=terrain[key(x,y)];return <button key={i} className={`tile ${magic?"magic":""} ${land?"wild "+land:""} ${building?"occupied":""} ${tool==="demolish"&&building?"clearable":""}`} onClick={()=>act(x,y)} aria-label={building?`${BUILDINGS[building.kind].name}, rank ${building.level}`:land?land:`Build ${tool==="demolish"?"nothing":BUILDINGS[tool].name} at ${x+1}, ${y+1}`}><span className="grass"/>{land&&<span className={`scenery ${land}`}>{land==="crag"?"▲":land==="pond"?"≈":"♣"}</span>}{building&&<span className={`structure ${building.kind}`}><i>{BUILDINGS[building.kind].icon}</i><small>{building.level>1?`Rank ${building.level}`:BUILDINGS[building.kind].name}</small></span>}{!building&&!land&&<span className="place-mark">+</span>}</button>})}{Array.from({length:Math.min(resources.folk,10)},(_,i)=><span key={i} className={`villager v${i%8}`} title="Glimmerfolk">●<i/></span>)}</div><div className="event-ribbon"><span>✧</span><div><small>Word from the waystone</small><b>{event}</b></div></div></div>
      <aside className="quest-panel"><div className="chapter"><small>CHAPTER {chapter+1} OF 3</small><h2>{chapters[chapter].name}</h2><p>{chapters[chapter].copy}</p></div><div className="goals">{chapters[chapter].goals.map(g=><Goal key={g[0]} label={g[0]} value={value(g[1])} target={g[2]}/>)}</div><div className="town-stats"><span><small>Buildings</small><b>{buildings.length}</b></span><span><small>Joy</small><b>{joy}%</b></span><span><small>Renown</small><b>{renown}</b></span></div><div className="season-note"><b>{season.name}</b><span>Food ×{season.food} · Wood ×{season.wood}</span></div><button className="restart" onClick={restart}>Begin a new glen</button></aside>
    </section>
    {selectedBuilding&&<div className="inspect-card"><button className="close" onClick={()=>setInspect(null)}>×</button><span className={`building-icon ${selectedBuilding.kind}`}>{BUILDINGS[selectedBuilding.kind].icon}</span><small>TOWN LEDGER</small><h3>{BUILDINGS[selectedBuilding.kind].name}</h3><p>{BUILDINGS[selectedBuilding.kind].hint}</p><div className="rank">Rank {selectedBuilding.level} of 3</div><button onClick={upgrade} disabled={selectedBuilding.level>=3}>{selectedBuilding.level>=3?"Masterwork complete":`Improve · ${12*selectedBuilding.level} wood · ${8*selectedBuilding.level} stone`}</button></div>}
    {choice&&<div className="choice-layer"><div className="choice-card"><span>{choice==="merchant"?"¤":"✦"}</span><small>A TRAVELER AT THE WAYSTONE</small><h2>{choice==="merchant"?"The Lantern Merchant":"The Spirit of Stillwater"}</h2><p>{choice==="merchant"?"A road-worn trader offers a bargain, but seems even more interested in your supper fire.":"A river-bright spirit asks what blessing the young town needs most."}</p><button onClick={()=>choose(0)}>{choice==="merchant"?"Trade 15 wood for 22 stone":"Ask for 16 mana"}</button><button onClick={()=>choose(1)}>{choice==="merchant"?"Share supper: +18 food, +2 renown":"Ask for 24 food"}</button></div></div>}
    {finalWin&&<div className="victory"><div className="victory-card"><span>✦</span><small>THE VALE REMEMBERS</small><h2>Glimmerglen awakens</h2><p>Your folk have woven craft, fellowship, and old magic into a woodland haven worthy of legend.</p><div className="victory-stats"><b>{day}<small>days</small></b><b>{resources.folk}<small>folk</small></b><b>{renown}<small>renown</small></b></div><button onClick={restart}>Grow another town</button></div></div>}
  </main>
}
function Resource({icon,label,value,rate}:{icon:string;label:string;value:number;rate?:number}){return <div className="resource"><span>{icon}</span><div><small>{label}</small><b>{value}</b></div>{rate!==undefined&&<em className={rate<0?"negative":""}>{rate>=0?"+":""}{rate}/day</em>}</div>}
function Goal({label,value,target}:{label:string;value:number;target:number}){const done=value>=target;return <div className={`goal ${done?"done":""}`}><span>{done?"✓":""}</span><div><b>{label}</b><i><em style={{width:`${Math.min(100,value/target*100)}%`}}/></i></div><small>{Math.min(value,target)}/{target}</small></div>}
