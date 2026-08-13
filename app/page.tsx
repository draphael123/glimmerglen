"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./game.css";

type Resource = { wood: number; stone: number; food: number; mana: number; folk: number };
type Kind = "cottage" | "farm" | "lumber" | "quarry" | "well" | "shrine";
type Building = { id: number; kind: Kind; x: number; y: number };

const COLS = 12, ROWS = 8;
const BUILDINGS: Record<Kind, { name: string; icon: string; cost: Partial<Resource>; hint: string }> = {
  cottage: { name: "Moss Cottage", icon: "⌂", cost: { wood: 16, stone: 6 }, hint: "+2 folk · costs food" },
  farm: { name: "Moonwheat", icon: "♒", cost: { wood: 10 }, hint: "+food · loves magic" },
  lumber: { name: "Forester", icon: "♧", cost: { wood: 8, stone: 3 }, hint: "+wood near trees" },
  quarry: { name: "Stonecircle", icon: "◆", cost: { wood: 10 }, hint: "+stone near rock" },
  well: { name: "Wishing Well", icon: "◉", cost: { stone: 14 }, hint: "+food to nearby farms" },
  shrine: { name: "Bloom Shrine", icon: "✦", cost: { wood: 18, stone: 12 }, hint: "spreads magic nearby" },
};
const INITIAL: Resource = { wood: 52, stone: 30, food: 38, mana: 0, folk: 4 };
const blocked = new Set(["0,0","1,0","0,1","10,0","11,0","11,1","2,6","2,7","3,7","9,6","10,6","10,7","11,7","6,0"]);

function key(x:number,y:number){ return `${x},${y}`; }
function near(a:Building,b:Building,r=2){ return Math.hypot(a.x-b.x,a.y-b.y)<=r; }
function canPay(r:Resource,c:Partial<Resource>){ return Object.entries(c).every(([k,v])=>r[k as keyof Resource]>=v!); }

export default function Home() {
  const [resources,setResources]=useState(INITIAL);
  const [buildings,setBuildings]=useState<Building[]>([
    {id:1,kind:"cottage",x:5,y:4},{id:2,kind:"farm",x:4,y:4},{id:3,kind:"lumber",x:3,y:2}
  ]);
  const [selected,setSelected]=useState<Kind>("farm");
  const [day,setDay]=useState(1);
  const [paused,setPaused]=useState(false);
  const [message,setMessage]=useState("The glen is waiting. Grow a thriving enchanted town.");
  const [event,setEvent]=useState("A soft rain has blessed the valley.");
  const nextId=useRef(4);

  const isMagic=useCallback((x:number,y:number)=>buildings.some(b=>b.kind==="shrine"&&Math.hypot(b.x-x,b.y-y)<=2.3),[buildings]);
  const income=useMemo(()=>{
    let wood=1,stone=0,food=0,mana=0;
    buildings.forEach(b=>{
      if(b.kind==="lumber") wood+=4+(b.x<4?2:0);
      if(b.kind==="quarry") stone+=3+(b.x>8?2:0);
      if(b.kind==="farm") food+=4+(isMagic(b.x,b.y)?4:0)+(buildings.some(w=>w.kind==="well"&&near(b,w,2))?2:0);
      if(b.kind==="shrine") mana+=2;
      if(b.kind==="cottage") food-=1;
    });
    return {wood,stone,food,mana};
  },[buildings,isMagic]);

  useEffect(()=>{
    if(paused) return;
    const t=setInterval(()=>{
      setDay(d=>d+1);
      setResources(r=>({wood:r.wood+income.wood,stone:r.stone+income.stone,food:Math.max(0,r.food+income.food),mana:r.mana+income.mana,folk:r.folk}));
    },2200);
    return()=>clearInterval(t);
  },[paused,income]);

  useEffect(()=>{
    if(day===6) setEvent("Fireflies arrive. Shrines now hum with power.");
    if(day===12) setEvent("A wandering mason leaves a gift of stone.");
    if(day===12) setResources(r=>({...r,stone:r.stone+15}));
  },[day]);

  const place=(x:number,y:number)=>{
    if(blocked.has(key(x,y))||buildings.some(b=>b.x===x&&b.y===y)){ setMessage("That patch is already spoken for."); return; }
    const item=BUILDINGS[selected];
    if(!canPay(resources,item.cost)){ setMessage(`Not enough supplies for ${item.name}.`); return; }
    setResources(r=>{
      const n={...r}; Object.entries(item.cost).forEach(([k,v])=>n[k as keyof Resource]-=v!);
      if(selected==="cottage") n.folk+=2; return n;
    });
    setBuildings(bs=>[...bs,{id:nextId.current++,kind:selected,x,y}]);
    setMessage(`${item.name} raised. ${selected==="shrine"?"Watch the land bloom around it.":"The town grows."}`);
  };

  const restart=()=>{setResources(INITIAL);setBuildings([{id:1,kind:"cottage",x:5,y:4},{id:2,kind:"farm",x:4,y:4},{id:3,kind:"lumber",x:3,y:2}]);setDay(1);setMessage("A new glen awakens.");setEvent("A soft rain has blessed the valley.");nextId.current=4;};
  const won=resources.folk>=10&&resources.mana>=20&&resources.food>=60;
  const season=["Dewspring","Suncrest","Amberfall","Frostwane"][Math.floor((day-1)/8)%4];

  return <main className="game-shell">
    <header className="topbar">
      <div className="brand"><span className="crest">G</span><div><h1>Glimmerglen</h1><p>A tiny enchanted town</p></div></div>
      <div className="resources" aria-label="Town resources">
        <Resource icon="♧" label="Wood" value={resources.wood} rate={income.wood}/>
        <Resource icon="◆" label="Stone" value={resources.stone} rate={income.stone}/>
        <Resource icon="❧" label="Food" value={resources.food} rate={income.food}/>
        <Resource icon="✦" label="Mana" value={resources.mana} rate={income.mana}/>
        <Resource icon="♟" label="Folk" value={resources.folk}/>
      </div>
      <button className="day" onClick={()=>setPaused(p=>!p)} aria-label={paused?"Resume time":"Pause time"}>
        <span>{season}</span><b>Day {day}</b><i>{paused?"▶":"Ⅱ"}</i>
      </button>
    </header>

    <section className="play-area">
      <aside className="build-panel">
        <div className="panel-title"><span>Builder’s folio</span><small>Choose, then place</small></div>
        <div className="build-list">
          {(Object.keys(BUILDINGS) as Kind[]).map(kind=>{const b=BUILDINGS[kind];return <button key={kind} className={`build-card ${selected===kind?"selected":""}`} onClick={()=>setSelected(kind)}>
            <span className={`building-icon ${kind}`}>{b.icon}</span><span className="build-copy"><b>{b.name}</b><small>{b.hint}</small><em>{Object.entries(b.cost).map(([k,v])=>`${v} ${k}`).join(" · ")}</em></span>
          </button>})}
        </div>
        <div className="tip"><b>Old glen wisdom</b><p>Moonwheat inside a shrine’s glow yields twice as much food.</p></div>
      </aside>

      <div className="world-wrap">
        <div className="world-head"><div><span className="eyebrow">THE GREENWARD VALE</span><b>{message}</b></div><div className="legend"><i/> enchanted ground</div></div>
        <div className="map" style={{"--cols":COLS} as React.CSSProperties}>
          {Array.from({length:COLS*ROWS},(_,i)=>{const x=i%COLS,y=Math.floor(i/COLS);const building=buildings.find(b=>b.x===x&&b.y===y);const magic=isMagic(x,y);const edge=blocked.has(key(x,y));return <button key={i} className={`tile ${magic?"magic":""} ${edge?"wild":""} ${building?"occupied":""}`} onClick={()=>place(x,y)} aria-label={building?BUILDINGS[building.kind].name:`Build ${BUILDINGS[selected].name} at ${x+1}, ${y+1}`}>
            <span className="grass"/>{edge&&<span className={`scenery ${x>8?"rock":"tree"}`}>{x>8?"▲":"♣"}</span>}
            {building&&<span className={`structure ${building.kind}`}><i>{BUILDINGS[building.kind].icon}</i><small>{BUILDINGS[building.kind].name}</small></span>}
            {!building&&!edge&&<span className="place-mark">+</span>}
          </button>})}
          {Array.from({length:Math.min(resources.folk,8)},(_,i)=><span key={i} className={`villager v${i}`} title="Glimmerfolk">●<i/></span>)}
        </div>
        <div className="event-ribbon"><span>✧</span><div><small>Word from the waystone</small><b>{event}</b></div></div>
      </div>

      <aside className="quest-panel">
        <div className="chapter"><small>CHAPTER I</small><h2>Wake the<br/>sleeping vale</h2><p>Build a home where magic and mortal craft can flourish together.</p></div>
        <div className="goals">
          <Goal label="Welcome 10 folk" value={resources.folk} target={10}/>
          <Goal label="Store 60 food" value={resources.food} target={60}/>
          <Goal label="Gather 20 mana" value={resources.mana} target={20}/>
        </div>
        <div className="town-stats"><span><small>Buildings</small><b>{buildings.length}</b></span><span><small>Daily yield</small><b>+{income.wood+income.stone+income.food+income.mana}</b></span></div>
        <button className="restart" onClick={restart}>Begin a new glen</button>
      </aside>
    </section>
    {won&&<div className="victory"><div className="victory-card"><span>✦</span><small>THE VALE REMEMBERS</small><h2>Glimmerglen awakens</h2><p>Your folk have woven craft and magic into a thriving woodland haven.</p><button onClick={restart}>Grow another town</button></div></div>}
  </main>;
}

function Resource({icon,label,value,rate}:{icon:string,label:string,value:number,rate?:number}){return <div className="resource"><span>{icon}</span><div><small>{label}</small><b>{value}</b></div>{rate!==undefined&&<em className={rate<0?"negative":""}>{rate>=0?"+":""}{rate}/day</em>}</div>}
function Goal({label,value,target}:{label:string,value:number,target:number}){const done=value>=target;return <div className={`goal ${done?"done":""}`}><span>{done?"✓":""}</span><div><b>{label}</b><i><em style={{width:`${Math.min(100,value/target*100)}%`}}/></i></div><small>{Math.min(value,target)}/{target}</small></div>}
