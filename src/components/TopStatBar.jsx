import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";
import { MAX_ENERGY, MAX_NERVE } from "../data/constants";

function TopStatBar({label,val,max,color,regen}) {
  const pct=Math.min(100,Math.max(0,(val/max)*100));
  const full=Math.floor(val)>=max;
  return(
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <span style={{color:C.muted,fontSize:9,minWidth:46,letterSpacing:1}}>{label}</span>
      <div style={{...S.barW,height:14}}>
        <div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${color}88,${color})`,transition:"width 0.4s",boxShadow:`0 0 8px ${color}55`}}/>
        <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:700,textShadow:"0 0 4px #000"}}>{Math.floor(val)}/{max}</span>
      </div>
      <span style={{color:full?"#333":color,fontSize:8,minWidth:46}}>{full?"FULL":"+1 "+regen}</span>
    </div>
  );
}

export default TopStatBar;
